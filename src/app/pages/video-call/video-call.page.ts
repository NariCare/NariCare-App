import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  participants: any[] = [];
  callEnded: boolean = false;
  callStartTime: Date | null = null;
  callEndTime: Date | null = null;
  jitsiInitialized: boolean = false;
  jitsiScriptLoaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private sanitizer: DomSanitizer // Not strictly needed for Jitsi API embedding, but good practice if using iframe src directly
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.meetingId = params.get('meetingId') || '';
      if (this.meetingId) {
        this.loadJitsiScript().then(() => {
          this.jitsiScriptLoaded = true;
          // Initialize Jitsi after script loads and DOM is ready
          setTimeout(() => {
            this.initializeJitsi();
          }, 100);
        }).catch(error => {
          console.error('Failed to load Jitsi script:', error);
          this.router.navigate(['/tabs/dashboard']); // Redirect on script load failure
        });
      } else {
        console.error('No meeting ID provided.');
        this.router.navigate(['/tabs/dashboard']); // Redirect if no meeting ID
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
      script.src = 'https://meet.jit.si/external_api.js';
      script.onload = () => resolve(true);
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  private initializeJitsi() {
    console.log('Initializing video call...');
    console.log('Container element available:', !!this.jitsiContainer?.nativeElement);
    
    if (!this.jitsiContainer?.nativeElement) {
      console.error('Video container element not available');
      return;
    }
    
    // Since Jitsi Meet public servers require authentication, we'll use a direct iframe approach
    // This provides a better user experience than the authentication dialogs
    this.initializeDirectVideoCall();
  }

  private initializeDirectVideoCall() {
    console.log('Initializing video call with guest-friendly service...');
    
    // Use Whereby.com for true guest access without authentication
    const meetingUrl = `https://whereby.com/${this.meetingId}`;
    
    // Create iframe for the video call
    const iframe = document.createElement('iframe');
    iframe.src = meetingUrl;
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
    
    console.log('Video call initialized successfully with Whereby');
    
    // Whereby provides automatic guest access - no complex event handling needed
    // Users can join immediately without authentication prompts
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