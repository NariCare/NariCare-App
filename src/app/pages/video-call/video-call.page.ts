import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConsultationService } from '../../services/consultation.service';
import { Consultation } from '../../models/consultation.model';

// Declare JitsiMeetExternalAPI to avoid TypeScript errors
declare const JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.page.html',
  styleUrls: ['./video-call.page.scss'],
})
export class VideoCallPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('jitsiContainer', { static: true }) jitsiContainer!: ElementRef;

  jitsiAPI: any;
  meetingId: string = '';
  consultationId: string = '';
  consultation: Consultation | null = null;
  meetingUrl: string = '';
  jwtToken: string = '';
  participants: any[] = [];
  callEnded: boolean = false;
  callStartTime: Date | null = null;
  callEndTime: Date | null = null;
  jitsiInitialized: boolean = false;
  jitsiScriptLoaded: boolean = false;
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private sanitizer: DomSanitizer,
    private consultationService: ConsultationService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      // Check if we have a consultation ID or meeting ID (legacy)
      this.consultationId = params.get('consultationId') || '';
      this.meetingId = params.get('meetingId') || '';
      
      console.log('Video call parameters:', { consultationId: this.consultationId, meetingId: this.meetingId });
      
      if (this.consultationId) {
        // Fetch consultation data to get the proper meeting link
        console.log('Using consultation ID approach:', this.consultationId);
        this.loadConsultationAndInitialize();
      } else if (this.meetingId) {
        // Legacy support - reconstruct JaaS meeting URL from meetingId
        console.log('Using legacy meeting ID approach:', this.meetingId);
        this.meetingUrl = `https://8x8.vc/vpaas-magic-cookie-6f3fc0395bc447f38a2ceb30c7ac54d5/${this.meetingId}`;
        this.isLoading = false;
        this.initializeVideoCall();
      } else {
        console.error('No consultation ID or meeting ID provided.');
        this.router.navigate(['/tabs/dashboard']);
      }
    });
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit - jitsiContainer available:', !!this.jitsiContainer?.nativeElement);
  }

  private loadJitsiScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (typeof JitsiMeetExternalAPI !== 'undefined') {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      // Use JaaS (Jitsi as a Service) external API instead of public Jitsi
      script.src = 'https://8x8.vc/vpaas-magic-cookie-6f3fc0395bc447f38a2ceb30c7ac54d5/external_api.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  private async loadConsultationAndInitialize() {
    try {
      this.isLoading = true;
      
      // Get consultation by ID - we need the user ID, so we'll search through user consultations
      // This is a limitation of the current API structure
      this.consultationService.getUserConsultations('').subscribe({
        next: (consultations) => {
          const consultation = consultations.find(c => c.id === this.consultationId);
          if (consultation) {
            this.consultation = consultation;
            this.meetingUrl = consultation.meeting_link || consultation.meetingLink || '';
            this.jwtToken = consultation.jitsi_room_token || '';
            
            if (this.meetingUrl) {
              console.log('Using backend-generated meeting link:', this.meetingUrl);
              console.log('JWT token available:', !!this.jwtToken);
              this.initializeVideoCall();
            } else {
              console.error('No meeting link found in consultation');
              this.router.navigate(['/tabs/dashboard']);
            }
          } else {
            console.error('Consultation not found');
            this.router.navigate(['/tabs/dashboard']);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading consultation:', error);
          this.isLoading = false;
          this.router.navigate(['/tabs/dashboard']);
        }
      });
    } catch (error) {
      console.error('Error in loadConsultationAndInitialize:', error);
      this.isLoading = false;
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  private initializeVideoCall() {
    console.log('Initializing video call...');
    console.log('Container element available:', !!this.jitsiContainer?.nativeElement);
    console.log('Meeting URL:', this.meetingUrl);
    
    if (!this.jitsiContainer?.nativeElement) {
      console.error('Video container element not available');
      return;
    }
    
    if (!this.meetingUrl) {
      console.error('No meeting URL available');
      return;
    }
    
    // Use JaaS (Jitsi as a Service) by default, with iframe fallback for other services
    if (this.meetingUrl.includes('8x8.vc') || this.meetingUrl.includes('meet.jit.si') || this.meetingUrl.includes('jitsi')) {
      // For JaaS and Jitsi links, use API integration
      this.initializeJitsiCall();
    } else {
      // For unknown services, use iframe approach
      this.initializeDirectVideoCall();
    }
  }

  private initializeJitsiCall() {
    console.log('Initializing Jitsi call with backend-generated link:', this.meetingUrl);
    
    this.loadJitsiScript().then(() => {
      this.jitsiScriptLoaded = true;
      setTimeout(() => {
        this.setupJitsiAPI();
      }, 100);
    }).catch(error => {
      console.error('Failed to load Jitsi script:', error);
      // Fallback to iframe approach
      this.initializeDirectVideoCall();
    });
  }

  private setupJitsiAPI() {
    try {
      // Handle different meeting URL formats
      let roomName: string;
      let domain: string;
      let jwt: string | undefined;
      
      if (this.meetingUrl.includes('8x8.vc')) {
        // For JaaS URLs (8x8.vc)
        const url = new URL(this.meetingUrl);
        domain = '8x8.vc';
        // Extract room name from JaaS URL format: /vpaas-magic-cookie-xxx/RoomName
        const pathParts = url.pathname.split('/');
        roomName = pathParts[pathParts.length - 1]; // Get the last part as room name
        
        // Use JWT token from backend if available
        jwt = this.jwtToken || undefined;
        
        console.log('Setting up JaaS with:', { domain, roomName, hasJWT: !!jwt, jwtLength: jwt?.length });
      } else {
        // For standard Jitsi URLs
        const url = new URL(this.meetingUrl);
        roomName = url.pathname.substring(1); // Remove leading slash
        domain = url.hostname;
        console.log('Setting up standard Jitsi with:', { domain, roomName });
      }
      
      const options: any = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: this.jitsiContainer.nativeElement,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'settings', 'videoquality',
            'filmstrip', 'feedback', 'stats', 'shortcuts'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#474747',
          DISABLE_VIDEO_BACKGROUND: false
        }
      };
      
      // Add JWT if available (required for JaaS premium features)
      if (jwt) {
        options.jwt = jwt;
        console.log('Using JWT token for authenticated JaaS session');
      } else {
        console.log('No JWT token available - using guest access');
      }
      
      console.log('Initializing JitsiMeetExternalAPI with options:', {
        ...options,
        jwt: options.jwt ? '[JWT_TOKEN_PRESENT]' : undefined // Don't log actual JWT for security
      });
      this.jitsiAPI = new JitsiMeetExternalAPI(domain, options);
      
      // Set up event listeners
      this.jitsiAPI.addEventListener('videoConferenceJoined', this.onVideoConferenceJoined.bind(this));
      this.jitsiAPI.addEventListener('participantJoined', this.onParticipantJoined.bind(this));
      this.jitsiAPI.addEventListener('participantLeft', this.onParticipantLeft.bind(this));
      this.jitsiAPI.addEventListener('videoConferenceLeft', this.onVideoConferenceLeft.bind(this));
      this.jitsiAPI.addEventListener('readyToClose', this.onReadyToClose.bind(this));
      
      this.jitsiInitialized = true;
      this.callStartTime = new Date();
      
      console.log('JaaS/Jitsi API initialized successfully');
    } catch (error) {
      console.error('Error setting up JaaS/Jitsi API:', error);
      // Fallback to iframe approach
      this.initializeDirectVideoCall();
    }
  }

  private initializeDirectVideoCall() {
    console.log('Initializing video call with iframe approach...');
    console.log('Meeting URL:', this.meetingUrl);
    
    // Create iframe for the video call
    const iframe = document.createElement('iframe');
    iframe.src = this.meetingUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.allow = 'camera; microphone; display-capture; fullscreen; geolocation';
    iframe.allowFullscreen = true;
    
    // Add iframe to container
    this.jitsiContainer.nativeElement.innerHTML = '';
    this.jitsiContainer.nativeElement.appendChild(iframe);
    
    this.jitsiInitialized = true;
    this.callStartTime = new Date();
    
    console.log('Video call initialized successfully with iframe');
  }

  private onVideoConferenceJoined(event: any) {
    console.log('Video conference joined:', event);
    this.callStartTime = new Date();
    // Jitsi API's getParticipantsInfo() returns an object, convert to array
    this.participants = Object.values(this.jitsiAPI.getParticipantsInfo());
    console.log('Initial participants:', this.participants);
    this.callEnded = false;
  }

  private onParticipantJoined(event: any) {
    console.log('Participant joined:', event);
    // Add new participant if not already in list (event.participant is just ID)
    // Need to use getParticipantsInfo to get full participant object
    setTimeout(() => { // Small delay to allow Jitsi API to update its internal state
      this.participants = Object.values(this.jitsiAPI.getParticipantsInfo());
      console.log('Current participants:', this.participants);
    }, 500);
  }

  private onParticipantLeft(event: any) {
    console.log('Participant left:', event);
    this.participants = this.participants.filter(p => p.participantId !== event.participant.participantId);
    console.log('Current participants:', this.participants);

    // Infer call end if only current user or no one else is left
    // The 'videoConferenceLeft' event is more reliable for the current user leaving.
    // This is more for tracking other participants.
  }

  private onVideoConferenceLeft(event: any) {
    console.log('Video conference left:', event);
    this.endCallAndNavigate();
  }

  private onReadyToClose() {
    console.log('Jitsi iframe ready to close.');
    this.endCallAndNavigate();
  }

  private endCallAndNavigate() {
    if (this.callEnded) return; // Prevent multiple calls to end logic
    
    this.callEnded = true;
    this.callEndTime = new Date();
    
    if (this.jitsiAPI) {
      this.jitsiAPI.dispose(); // Clean up Jitsi instance
      this.jitsiAPI = null;
    }
    
    // Optionally, show a summary or prompt before navigating back
    console.log('Call ended. Navigating back to dashboard.');
    // The user can now see the summary on the page before clicking to return
  }

  ngOnDestroy() {
    if (this.jitsiAPI) {
      this.jitsiAPI.dispose(); // Ensure Jitsi instance is cleaned up on component destroy
    }
  }

  getCallDuration(): string {
    if (!this.callStartTime || !this.callEndTime) return 'N/A';
    const diffMs = this.callEndTime.getTime() - this.callStartTime.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}