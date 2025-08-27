import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatbotService } from '../../services/chatbot.service';
import { BabyTimelineService } from '../../services/baby-timeline.service';
import { ConsultationService } from '../../services/consultation.service';
import { OnboardingService } from '../../services/onboarding.service';
import { BabyTimelineItem, BabyTimelineData } from '../../models/baby-timeline.model';
import { User } from '../../models/user.model';
import { Consultation, Expert } from '../../models/consultation.model';
import { TimelineModalComponent } from '../../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../../components/specific-week-modal/specific-week-modal.component';
import { ConsultationBookingModalComponent } from '../../components/consultation-booking-modal/consultation-booking-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit {
  @ViewChild('timelineScrollContainer', { static: false }) timelineScrollContainer!: ElementRef;
  
  user: User | null = null;
  timelineData$: Observable<BabyTimelineData> | null = null;
  currentTimelineData: BabyTimelineData | null = null;
  upcomingConsultations: Consultation[] = [];
  allConsultations: Consultation[] = [];
  nonUpcomingConsultations: Consultation[] = [];
  experts: Expert[] = [];
  showOnboardingAction = false;
  
  // Error handling properties
  consultationsError: string | null = null;
  consultationsLoading = false;
  expertsError: string | null = null;
  expertsLoading = false;

  baseQuickActions = [
    {
      title: 'Ask AI Assistant',
      description: 'Get instant help with breastfeeding questions',
      icon: 'chatbox-ellipses',
      action: 'openChatbot',
      color: 'primary',
      priority: false
    },
    {
      title: 'Track Growth',
      description: 'Log your baby\'s latest measurements',
      icon: 'trending-up',
      action: 'trackGrowth',
      color: 'success',
      priority: false
    },
    {
      title: 'Browse Articles',
      description: 'Explore our knowledge base',
      icon: 'library',
      action: 'browseKnowledge',
      color: 'tertiary',
      priority: false
    },
    {
      title: 'Join Chat',
      description: 'Connect with other mothers',
      icon: 'chatbubbles',
      action: 'joinChat',
      color: 'secondary',
      priority: false
    }
  ];


  constructor(
    private authService: AuthService,
    private router: Router,
    private chatbotService: ChatbotService,
    private timelineService: BabyTimelineService,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private onboardingService: OnboardingService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadTimelineData(user.babies[0].dateOfBirth);
        this.loadUpcomingConsultations();
      }
      // Onboarding check temporarily disabled for API testing
    });
    
    this.loadExperts();
  }

  get quickActions() {
    return this.baseQuickActions;
  }

  ngAfterViewInit() {
    // Auto-scroll to current week when view initializes
    setTimeout(() => {
      this.scrollToCurrentWeek();
    }, 500);
  }

  private loadTimelineData(birthDate: Date) {
    this.timelineData$ = this.timelineService.getTimelineForBaby(birthDate);
    this.timelineData$?.subscribe(data => {
      this.currentTimelineData = data;
    });
  }

  private loadUpcomingConsultations() {
    if (this.user) {
      this.consultationsLoading = true;
      this.consultationsError = null;
      
      // Load different consultations based on user role
      const consultationObservable = this.user.role === 'expert' 
        ? this.consultationService.getExpertConsultations('scheduled', true)
        : this.consultationService.getUserConsultations(this.user.uid);
      
      consultationObservable.subscribe({
        next: (consultations) => {
          this.consultationsLoading = false;
          console.log('Loaded consultations for role:', this.user?.role, consultations);
          
          // Store all consultations
          this.allConsultations = consultations;
          
          // Filter for upcoming consultations only
          const now = new Date();
          this.upcomingConsultations = consultations.filter(consultation => {
            const consultationDate = consultation.scheduledAt 
              ? consultation.scheduledAt 
              : new Date(consultation.scheduled_at);
            console.log('Checking consultation:', { 
              topic: consultation.topic, 
              consultationDate, 
              now, 
              status: consultation.status,
              isUpcoming: consultationDate > now && consultation.status === 'scheduled'
            });
            return consultationDate > now && consultation.status === 'scheduled';
          });
          
          // Filter out upcoming consultations from "My Consultations" section to avoid duplicates
          this.nonUpcomingConsultations = consultations.filter(consultation => {
            const consultationDate = consultation.scheduledAt 
              ? consultation.scheduledAt 
              : new Date(consultation.scheduled_at);
            // Show completed, cancelled, or past scheduled consultations
            return !(consultationDate > now && consultation.status === 'scheduled');
          });
          
          console.log('Filtered upcoming consultations:', this.upcomingConsultations);
          console.log('Filtered non-upcoming consultations:', this.nonUpcomingConsultations);
        },
        error: (error) => {
          this.consultationsLoading = false;
          this.consultationsError = 'Unable to load consultations. Please try again.';
          this.upcomingConsultations = [];
          this.nonUpcomingConsultations = [];
          console.error('Error loading consultations:', error);
        }
      });
    }
  }

  private loadExperts() {
    this.expertsLoading = true;
    this.expertsError = null;
    
    this.consultationService.getExperts().subscribe({
      next: (experts) => {
        this.expertsLoading = false;
        this.experts = experts;
      },
      error: (error) => {
        this.expertsLoading = false;
        this.expertsError = 'Unable to load experts.';
        this.experts = [];
        console.error('Error loading experts:', error);
      }
    });
  }

  handleQuickAction(action: string) {
    switch (action) {
      case 'openChatbot':
        this.openChatbot();
        break;
      case 'trackGrowth':
        this.router.navigate(['/tabs/growth']);
        break;
      case 'browseKnowledge':
        this.router.navigate(['/tabs/knowledge']);
        break;
      case 'joinChat':
        this.router.navigate(['/tabs/chat']);
        break;
    }
  }

  openChatbot() {
    // Initialize chatbot and navigate to chat
    if (this.user) {
      const babyAge = this.user.babies.length > 0 ? 
        this.calculateBabyAge(this.user.babies[0].dateOfBirth) : undefined;
      this.chatbotService.initializeChat(this.user.uid, babyAge);
    }
    this.router.navigate(['/tabs/chat'], { queryParams: { tab: 'ai' } });
  }

  private calculateBabyAge(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    const firstName = this.user?.firstName || 'there';
    
    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 17) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  }

  async openConsultationBooking() {
    const modal = await this.modalController.create({
      component: ConsultationBookingModalComponent,
      cssClass: 'consultation-booking-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.booked) {
        // Refresh consultations list
        this.loadUpcomingConsultations();
        // Show success message
        this.showSuccessToast('Consultation booked successfully!');
      }
    });

    return await modal.present();
  }

  async editConsultation(consultation: Consultation) {
    const modal = await this.modalController.create({
      component: ConsultationBookingModalComponent,
      componentProps: {
        consultation: consultation
      },
      cssClass: 'consultation-booking-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.updated) {
        // Refresh consultations list
        this.loadUpcomingConsultations();
        // Show success message
        this.showSuccessToast('Consultation updated successfully!');
      }
    });

    return await modal.present();
  }

  retryLoadConsultations() {
    this.loadUpcomingConsultations();
  }

  retryLoadExperts() {
    this.loadExperts();
  }

  viewAllConsultations() {
    // Navigate to dedicated consultations page (to be implemented)
    // this.router.navigate(['/consultations']);
    console.log('Navigate to all consultations page - to be implemented');
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  getExpertName(expertId: string): string {
    const expert = this.experts.find(e => e.id === expertId);
    if (!expert) return 'Expert';
    
    if (expert.name) {
      return expert.name; // Legacy field
    }
    return `${expert.first_name || ''} ${expert.last_name || ''}`.trim() || 'Expert';
  }

  getClientName(consultation: Consultation): string {
    // Get client name from consultation user information
    const firstName = consultation.user_first_name || '';
    const lastName = consultation.user_last_name || '';
    return `${firstName} ${lastName}`.trim() || consultation.user_email || 'Client';
  }

  isConsultationReady(consultation: Consultation): boolean {
    const now = new Date();
    const consultationTime = consultation.scheduledAt 
      ? new Date(consultation.scheduledAt)
      : new Date(consultation.scheduled_at);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Allow joining 15 minutes before scheduled time
    return minutesDiff <= 15 && minutesDiff >= -30;
  }

  async joinConsultation(consultation: Consultation) {
    const meetingLink = consultation.meeting_link || consultation.meetingLink;
    if (meetingLink) {
      // Check if user is expert and can start/join consultation
      if (this.user?.role === 'expert') {
        const statusInfo = this.consultationService.getExpertConsultationStatusDisplay(consultation);
        
        if (statusInfo.canStart && consultation.status === 'scheduled') {
          // Expert can start the consultation - update status to in-progress
          try {
            await this.consultationService.updateConsultationStatus(consultation.id, 'in-progress');
            console.log('Consultation marked as in-progress');
            // Refresh consultations to show updated status
            this.loadUpcomingConsultations();
          } catch (error) {
            console.error('Error updating consultation status:', error);
          }
        }
      }

      // Show options for joining the consultation
      const isExpert = this.user?.role === 'expert';
      const alert = await this.alertController.create({
        header: isExpert ? 'Join Consultation as Expert' : 'Join Consultation',
        message: `Choose how to join your video consultation via JaaS (Jitsi as a Service).${
          isExpert ? ' As an expert, you can join 30 minutes early.' : ''
        }`,
        buttons: [
          {
            text: 'Open in Browser',
            cssClass: 'primary-button',
            handler: () => {
              // Open directly in browser - works great with JaaS
              window.open(meetingLink, '_blank');
            }
          },
          {
            text: 'Use In-App Call',
            handler: () => {
              // Navigate to the video call page with consultation ID
              this.router.navigate(['/video-call', consultation.id]);
            }
          },
          {
            text: 'Cancel',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    }
  }

  getTierDisplay(): string {
    if (!this.user?.tier) return 'Basic';
    
    switch (this.user.tier.type) {
      case 'one-month': return '1-Month Program';
      case 'three-month': return '3-Month Program';
      default: return 'Basic';
    }
  }

  navigateToProfile() {
    this.router.navigate(['/tabs/profile']);
  }

  // Timeline methods
  getCurrentWeek(): number {
    return this.currentTimelineData?.currentWeek || 0;
  }

  getCurrentTimelineItem(): BabyTimelineItem | null {
    if (!this.currentTimelineData) return null;
    
    const currentWeek = this.currentTimelineData.currentWeek;
    return this.currentTimelineData.items.find(item => 
      currentWeek >= item.weekStart && currentWeek <= item.weekEnd
    ) || null;
  }

  getUpcomingTimelineItem(): BabyTimelineItem | null {
    if (!this.currentTimelineData) return null;
    
    const currentWeek = this.currentTimelineData.currentWeek;
    return this.currentTimelineData.items.find(item => 
      item.weekStart > currentWeek
    ) || null;
  }

  getWeeksUntilUpcoming(): number {
    const upcoming = this.getUpcomingTimelineItem();
    if (!upcoming || !this.currentTimelineData) return 0;
    
    return upcoming.weekStart - this.currentTimelineData.currentWeek;
  }

  // New timeline UX methods
  getVisibleTimelineItems(timelineData: BabyTimelineData): BabyTimelineItem[] {
    // Show current week and next 3-4 items for clean UX
    const currentWeek = timelineData.currentWeek;
    const allItems = timelineData.allWeeks || [];
    
    // Find current item and show it plus next few items
    const currentIndex = allItems.findIndex(item => 
      currentWeek >= item.weekStart && currentWeek <= item.weekEnd
    );
    
    if (currentIndex >= 0) {
      // Show current item plus next 2 items
      return allItems.slice(currentIndex, currentIndex + 2);
    } else {
      // If no current item found, show first 2 items
      return allItems.slice(0, 2);
    }
  }

  getWeekDisplay(item: BabyTimelineItem): string {
    if (item.weekStart === 0) return 'Birth';
    if (item.weekStart === item.weekEnd) return `${item.weekStart}w`;
    return `${item.weekStart}-${item.weekEnd}w`;
  }

  isCurrentWeek(item: BabyTimelineItem, currentWeek: number): boolean {
    return currentWeek >= item.weekStart && currentWeek <= item.weekEnd;
  }

  isCompletedWeek(item: BabyTimelineItem, currentWeek: number): boolean {
    return currentWeek > item.weekEnd;
  }

  isUpcomingWeek(item: BabyTimelineItem, currentWeek: number): boolean {
    return currentWeek < item.weekStart;
  }

  hasTimelineAccess(): boolean {
    // Check if user has access to timeline feature
    return this.user?.tier?.features?.includes('timeline') || 
           this.user?.tier?.type !== 'basic' || 
           true; // For demo, always show timeline
  }

  openFullTimeline() {
    this.router.navigate(['/tabs/growth/timeline']);
  }

  async openTimelineModal() {
    const modal = await this.modalController.create({
      component: TimelineModalComponent,
      componentProps: {
        timelineData: this.currentTimelineData,
        babyName: this.user?.babies[0]?.name || 'Baby'
      },
      cssClass: 'timeline-modal'
    });
    return await modal.present();
  }

  async openSpecificWeekModal(weekItem: BabyTimelineItem) {
    const modal = await this.modalController.create({
      component: SpecificWeekModalComponent,
      componentProps: {
        weekItem: weekItem,
        babyName: this.user?.babies[0]?.name || 'Baby',
        currentWeek: this.getCurrentWeek()
      },
      cssClass: 'specific-week-modal'
    });
    return await modal.present();
  }

  scrollTimelineLeft() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }

  scrollTimelineRight() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }

  private scrollToCurrentWeek() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      const currentWeekElement = container.querySelector('.week-marker-horizontal.current-week');
      
      if (currentWeekElement) {
        const containerWidth = container.offsetWidth;
        const elementLeft = (currentWeekElement as HTMLElement).offsetLeft;
        const elementWidth = (currentWeekElement as HTMLElement).offsetWidth;
        
        // Center the current week in the viewport
        const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }
}