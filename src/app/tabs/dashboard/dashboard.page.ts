import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ChatbotService } from '../../services/chatbot.service';
import { BabyTimelineService } from '../../services/baby-timeline.service';
import { ConsultationService } from '../../services/consultation.service';
import { OnboardingService } from '../../services/onboarding.service';
import { InsightsService, TodaysInsights } from '../../services/insights.service';
import { BackendKnowledgeService } from '../../services/backend-knowledge.service';
import { Article } from '../../models/knowledge-base.model';
import { BabyTimelineItem, BabyTimelineData } from '../../models/baby-timeline.model';
import { User } from '../../models/user.model';
import { Consultation, Expert } from '../../models/consultation.model';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';
import { TimelineModalComponent } from '../../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../../components/specific-week-modal/specific-week-modal.component';
import { ConsultationBookingModalComponent } from '../../components/consultation-booking-modal/consultation-booking-modal.component';
import { AvailabilitySchedulerModalComponent } from '../../components/availability-scheduler-modal/availability-scheduler-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('timelineScrollContainer', { static: false }) timelineScrollContainer!: ElementRef;
  
  user: User | null = null;
  timelineData$: Observable<BabyTimelineData> | null = null;
  currentTimelineData: BabyTimelineData | null = null;
  upcomingConsultations: Consultation[] = [];
  allConsultations: Consultation[] = [];
  nonUpcomingConsultations: Consultation[] = [];
  experts: Expert[] = [];
  showOnboardingAction = false;
  
  // Insights data
  todaysInsights: TodaysInsights | null = null;
  
  // Learning data
  recentArticles: Article[] = [];
  bookmarkedArticles: Article[] = [];
  currentLearningProgress: any = null;
  
  // Error handling properties
  consultationsError: string | null = null;
  consultationsLoading = false;
  expertsError: string | null = null;
  expertsLoading = false;
  
  
  // Subscriptions
  private userSubscription: Subscription | null = null;
  
  // Cached quick actions
  private _quickActions: any[] | null = null;
  
  // Header collapse state
  isHeaderCollapsed = false;
  private lastScrollTop = 0;

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
    private authService: BackendAuthService,
    private router: Router,
    private chatbotService: ChatbotService,
    private timelineService: BabyTimelineService,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private onboardingService: OnboardingService,
    private insightsService: InsightsService,
    private knowledgeService: BackendKnowledgeService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Subscribe to user changes and store subscription for cleanup
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      // Reset cached actions when user changes
      this._quickActions = null;
      
      if (user && user.babies && user.babies.length > 0) {
        this.loadTimelineData(user.babies[0].dateOfBirth);
        this.loadTodaysInsights(user.babies[0]);
        this.loadLearningData();
        this.loadUpcomingConsultations();
      } else if (user) {
        // Load learning data and consultations even without baby data
        this.loadLearningData();
        this.loadUpcomingConsultations();
      }
      // Onboarding check temporarily disabled for API testing
    });
    
    this.loadExperts();
  }
  
  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  onContentScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    const scrollThreshold = 30; // Reduced threshold for quicker response
    
    console.log('Scroll event:', { scrollTop, lastScrollTop: this.lastScrollTop, isCollapsed: this.isHeaderCollapsed });
    
    if (scrollTop > scrollThreshold && scrollTop > this.lastScrollTop && !this.isHeaderCollapsed) {
      // Scrolling down - collapse header
      console.log('Collapsing header');
      this.isHeaderCollapsed = true;
    } else if ((scrollTop < this.lastScrollTop || scrollTop <= scrollThreshold) && this.isHeaderCollapsed) {
      // Scrolling up or near top - expand header
      console.log('Expanding header');
      this.isHeaderCollapsed = false;
    }
    
    this.lastScrollTop = Math.max(0, scrollTop); // Prevent negative scroll values
  }

  get quickActions() {
    // Cache the actions to prevent recalculation on every template access
    if (this._quickActions !== null) {
      return this._quickActions;
    }
    
    let actions: any[] = [];
    
    // Add onboarding action if not completed (highest priority)
    if (!this.user?.isOnboardingCompleted) {
      actions.push({
        title: 'Complete Your Profile',
        description: 'Finish setting up your profile to unlock all features',
        icon: 'person-add',
        action: 'openOnboarding',
        color: 'warning',
        priority: true
      });
    }
    
    // For experts, show expert-specific quick actions
    if (this.user?.role === 'expert') {
      actions.push(
        {
          title: 'My Schedule',
          description: 'Configure your availability for consultations',
          icon: 'calendar',
          action: 'setSchedule',
          color: 'primary',
          priority: true
        },
        {
          title: 'Notes & Links',
          description: 'Manage your saved notes and helpful links',
          icon: 'bookmark',
          action: 'openExpertNotes',
          color: 'secondary',
          priority: false
        },
        {
          title: 'Expert Resources',
          description: 'Access professional tools and guides',
          icon: 'library',
          action: 'expertResources',
          color: 'tertiary',
          priority: false
        }
      );
    } else {
      // Add regular user actions
      actions.push(...this.baseQuickActions);
    }
    
    this._quickActions = actions;
    return this._quickActions;
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
    if (!this.user || !this.user.uid) {
      console.warn('No user available for loading consultations');
      return;
    }
    
    // Skip loading for experts as it's handled by the expert consultations component
    if (this.user.role === 'expert') {
      return;
    }
    
    this.consultationsLoading = true;
    this.consultationsError = null;
    
    try {
      const consultationObservable = this.consultationService.getUserConsultations(this.user.uid);
      
      consultationObservable.subscribe({
        next: (consultations) => {
          this.consultationsLoading = false;
          console.log('Loaded consultations for role:', this.user?.role, consultations);
          
          // Safely handle consultations array
          const safeConsultations = Array.isArray(consultations) ? consultations : [];
          
          // Store all consultations
          this.allConsultations = safeConsultations;
          
          // Filter for upcoming consultations only
          const now = new Date();
          this.upcomingConsultations = safeConsultations.filter(consultation => {
            if (!consultation.scheduledAt && !consultation.scheduled_at) {
              return false;
            }
            
            try {
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
            } catch (error) {
              console.error('Error processing consultation date:', error, consultation);
              return false;
            }
          });
          
          // Filter out upcoming consultations from "My Consultations" section to avoid duplicates
          this.nonUpcomingConsultations = safeConsultations.filter(consultation => {
            if (!consultation.scheduledAt && !consultation.scheduled_at) {
              return true; // Include consultations without dates in history
            }
            
            try {
              const consultationDate = consultation.scheduledAt 
                ? consultation.scheduledAt 
                : new Date(consultation.scheduled_at);
              // Show completed, cancelled, or past scheduled consultations
              return !(consultationDate > now && consultation.status === 'scheduled');
            } catch (error) {
              console.error('Error processing consultation date for history:', error, consultation);
              return true; // Include in history if date processing fails
            }
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
    } catch (error) {
      this.consultationsLoading = false;
      this.consultationsError = 'Failed to initialize consultation loading.';
      console.error('Consultation loading initialization error:', error);
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

  private loadTodaysInsights(baby: any) {
    if (!baby || !baby.name || !baby.dateOfBirth) {
      console.warn('Baby data incomplete for insights generation');
      return;
    }

    this.insightsService.getTodaysInsights(
      baby.name,
      baby.dateOfBirth,
      null // TODO: Pass last growth entry when available
    ).subscribe({
      next: (insights) => {
        this.todaysInsights = insights;
        console.log('Loaded insights:', insights);
      },
      error: (error) => {
        console.error('Error loading insights:', error);
        this.todaysInsights = null;
      }
    });
  }

  handleQuickAction(action: string) {
    switch (action) {
      case 'openOnboarding':
        this.router.navigate(['/onboarding']);
        break;
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
      // Expert-specific actions
      case 'setSchedule':
        this.openAvailabilityScheduler();
        break;
      case 'openExpertNotes':
        this.router.navigate(['/expert-notes']);
        break;
      case 'manageClients':
        setTimeout(() => {
          const element = document.querySelector('app-expert-consultations');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        break;
      case 'expertResources':
        this.router.navigate(['/tabs/knowledge']);
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

  getTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else {
      return 'evening';
    }
  }

  getFirstName(): string {
    const firstName = this.user?.firstName || 'Mama';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  }

  getCurrentDay(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long'
    };
    return today.toLocaleDateString('en-US', options);
  }

  getCurrentDateOnly(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  }

  getBabyAgeOrDueDate(): string {
    // Priority 1: Baby data (if baby exists, use baby's birth date)
    if (this.user?.babies && this.user.babies.length > 0) {
      const baby = this.user.babies[0];
      
      if (baby.dateOfBirth) {
        return AgeCalculatorUtil.calculateBabyAge(baby.dateOfBirth);
      }
    }
    
    // Priority 2: Due date (if no baby data but due date exists)
    if (this.user?.dueDate) {
      const dueDate = new Date(this.user.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        // Still pregnant - show countdown to due date
        if (diffDays < 7) {
          return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        } else {
          const weeksUntilDue = Math.floor(diffDays / 7);
          const remainingDays = diffDays % 7;
          if (remainingDays === 0) {
            return `Due in ${weeksUntilDue} week${weeksUntilDue !== 1 ? 's' : ''}`;
          }
          return `Due in ${weeksUntilDue}w ${remainingDays}d`;
        }
      } else {
        // Past due date
        const daysPastDue = Math.abs(diffDays);
        if (daysPastDue < 7) {
          return `${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`;
        } else {
          const weeksPastDue = Math.floor(daysPastDue / 7);
          const remainingDays = daysPastDue % 7;
          if (remainingDays === 0) {
            return `${weeksPastDue} week${weeksPastDue !== 1 ? 's' : ''} overdue`;
          }
          return `${weeksPastDue}w ${remainingDays}d overdue`;
        }
      }
    }
    
    // No baby data and no due date
    return '';
  }

  getBabyAvatarImage(): string {
    if (!this.user?.babies || this.user.babies.length === 0) {
      return 'assets/images/baby-neutral.png'; // fallback image
    }

    const baby = this.user.babies[0];
    
    // Return appropriate baby image based on gender
    if (baby.gender === 'male') {
      return 'assets/images/baby-boy.png';
    } else if (baby.gender === 'female') {
      return 'assets/images/baby-girl.png';
    } else {
      return 'assets/images/baby-neutral.png';
    }
  }

  getBabyAgeInDays(): number {
    // Priority 1: Baby data (if baby exists, use baby's birth date)
    if (this.user?.babies && this.user.babies.length > 0) {
      const baby = this.user.babies[0];
      if (baby.dateOfBirth) {
        const birthDate = new Date(baby.dateOfBirth);
        const today = new Date();
        const diffTime = today.getTime() - birthDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }
    }
    
    // Priority 2: Due date - calculate pregnancy days
    if (this.user?.dueDate) {
      // Calculate how many days into pregnancy (assuming 40 weeks = 280 days)
      const dueDate = new Date(this.user.dueDate);
      const today = new Date();
      const pregnancyStartDate = new Date(dueDate.getTime() - (280 * 24 * 60 * 60 * 1000)); // 280 days before due date
      const diffTime = today.getTime() - pregnancyStartDate.getTime();
      const pregnancyDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, pregnancyDays);
    }
    
    return 0;
  }

  getStreakIcon(): string {
    // If baby exists, show flame (motherhood)
    if (this.user?.babies && this.user.babies.length > 0) {
      return 'flame';
    }
    
    // If pregnant (due date exists), show heart for pregnancy journey
    if (this.user?.dueDate) {
      return 'heart';
    }
    
    return 'flame'; // default
  }

  getStreakText(): string {
    // Priority 1: Baby data (motherhood journey)
    if (this.user?.babies && this.user.babies.length > 0) {
      const days = this.getBabyAgeInDays();
      return `${days} days of motherhood`;
    }
    
    // Priority 2: Pregnancy journey
    if (this.user?.dueDate) {
      const dueDate = new Date(this.user.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue > 0) {
        // Still pregnant - show countdown
        return `${daysUntilDue} days until motherhood`;
      } else {
        // Overdue - encouraging message
        const daysPastDue = Math.abs(daysUntilDue);
        return `Ready to meet your little one! ${daysPastDue} days past due`;
      }
    }
    
    return '';
  }

  hasUnreadNotifications(): boolean {
    // Placeholder for notification logic
    // This would typically check for unread messages, reminders, etc.
    return false; // Set to true to test the notification badge
  }

  showDateOptions() {
    // Placeholder for date picker or calendar functionality
    console.log('Show date options - could open calendar or date picker');
  }

  showNotifications() {
    // Navigate to notifications page or show notification modal
    console.log('Show notifications');
    // this.router.navigate(['/notifications']);
  }

  async openAvailabilityScheduler() {
    const modal = await this.modalController.create({
      component: AvailabilitySchedulerModalComponent,
      cssClass: 'availability-scheduler-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        // Show success message
        this.showSuccessToast('Availability updated successfully!');
      }
    });

    return await modal.present();
  }

  async openConsultationBooking() {
    // Check if user has completed onboarding
    if (!this.user?.isOnboardingCompleted) {
      await this.showOnboardingRequiredAlert();
      return;
    }

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

  private async showOnboardingRequiredAlert() {
    const alert = await this.alertController.create({
      header: 'Complete Your Profile First',
      message: 'Please complete the onboarding process before booking a consultation. This helps our experts provide you with personalized care.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Complete Profile',
          handler: () => {
            this.router.navigate(['/onboarding']);
          }
        }
      ]
    });

    await alert.present();
  }

  async editConsultation(consultation: Consultation) {
    // Check if user has completed onboarding
    if (!this.user?.isOnboardingCompleted) {
      await this.showOnboardingRequiredAlert();
      return;
    }

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
    
    // Experts can join 30 minutes early, users can join 15 minutes early
    const joinEarlyMinutes = this.user?.role === 'expert' ? 30 : 15;
    return minutesDiff <= joinEarlyMinutes && minutesDiff >= -30;
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

  // Expert-specific helper methods
  isExpert(): boolean {
    return this.user?.role === 'expert';
  }


  shouldHideSection(section: 'timeline' | 'booking' | 'learning' | 'insights'): boolean {
    if (!this.isExpert()) return false;
    
    return ['timeline', 'booking', 'learning', 'insights'].includes(section);
  }

  /**
   * Refresh today's insights (useful for testing or manual refresh)
   */
  refreshInsights() {
    if (this.user && this.user.babies && this.user.babies.length > 0) {
      this.loadTodaysInsights(this.user.babies[0]);
    }
  }

  /**
   * Navigate to consultation detail page
   */
  openConsultationDetail(consultation: Consultation) {
    this.router.navigate(['/consultation-detail', consultation.id]);
  }

  /**
   * Load learning-related data for the dashboard
   */
  private loadLearningData() {
    // Load recent articles for discovery
    this.knowledgeService.getRecentArticles(5).subscribe({
      next: (articles) => {
        this.recentArticles = articles;
      },
      error: (error) => {
        console.error('Error loading recent articles:', error);
        this.recentArticles = [];
      }
    });

    // Load bookmarked articles if user is authenticated
    if (this.user?.uid) {
      this.knowledgeService.getUserBookmarks(this.user.uid).subscribe({
        next: (bookmarkIds) => {
          // Load full article details for bookmarked articles (simplified approach)
          // In a real implementation, you might want to batch load these
          this.loadBookmarkedArticleDetails(bookmarkIds.slice(0, 3)); // Show top 3
        },
        error: (error) => {
          console.error('Error loading bookmarks:', error);
          this.bookmarkedArticles = [];
        }
      });
    }
  }

  private loadBookmarkedArticleDetails(bookmarkIds: string[]) {
    if (bookmarkIds.length === 0) {
      this.bookmarkedArticles = [];
      return;
    }

    // Load details for each bookmarked article
    const articlePromises = bookmarkIds.map(id => 
      this.knowledgeService.getArticle(id).toPromise()
    );

    Promise.all(articlePromises).then(articles => {
      this.bookmarkedArticles = articles.filter(article => article != null) as Article[];
    }).catch(error => {
      console.error('Error loading bookmarked article details:', error);
      this.bookmarkedArticles = [];
    });
  }

  /**
   * Get the current learning activity to display
   */
  getCurrentLearningActivity(): any {
    // Priority: bookmarked articles, then recent articles
    if (this.bookmarkedArticles.length > 0) {
      const article = this.bookmarkedArticles[0];
      return {
        type: 'bookmarked',
        title: article.title,
        description: `Continue reading • ${article.readTime} min read`,
        icon: 'bookmark',
        article: article,
        categoryColor: article.category.color
      };
    }

    if (this.recentArticles.length > 0) {
      const article = this.recentArticles[0];
      return {
        type: 'recent',
        title: article.title,
        description: `New article • ${article.readTime} min read • ${article.category.name}`,
        icon: 'library',
        article: article,
        categoryColor: article.category.color
      };
    }

    // Fallback
    return {
      type: 'general',
      title: 'Breastfeeding Basics',
      description: 'Start your learning journey with essential topics',
      icon: 'school',
      categoryColor: '#8383ed'
    };
  }

  /**
   * Handle continuing learning activity
   */
  continueLearning() {
    const activity = this.getCurrentLearningActivity();
    
    if (activity.article) {
      // Navigate to the specific article
      this.router.navigate(['/tabs/knowledge/article', activity.article.id]);
    } else {
      // Navigate to knowledge base
      this.router.navigate(['/tabs/knowledge']);
    }
  }

  /**
   * Check if user has any learning progress to continue
   */
  hasLearningProgress(): boolean {
    return this.bookmarkedArticles.length > 0 || this.recentArticles.length > 0;
  }

  /**
   * Get learning progress text
   */
  getLearningProgressText(): string {
    const bookmarkedCount = this.bookmarkedArticles.length;
    const totalRecentCount = this.recentArticles.length;
    
    if (bookmarkedCount > 0) {
      return `${bookmarkedCount} bookmarked article${bookmarkedCount > 1 ? 's' : ''} to continue`;
    }
    
    if (totalRecentCount > 0) {
      return `${totalRecentCount} new article${totalRecentCount > 1 ? 's' : ''} available`;
    }
    
    return 'Start your learning journey';
  }
}