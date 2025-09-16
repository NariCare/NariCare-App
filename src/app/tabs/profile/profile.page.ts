import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ApiService, ApiResponse } from '../../services/api.service';
import { ConsultationService } from '../../services/consultation.service';
import { NotificationService } from '../../services/notification.service';
import { TimezoneService } from '../../services/timezone.service';
import { User } from '../../models/user.model';
import { Consultation, Expert } from '../../models/consultation.model';
import { ConsultationBookingModalComponent } from '../../components/consultation-booking-modal/consultation-booking-modal.component';
import { BabyCreationModalComponent } from '../../components/baby-creation-modal/baby-creation-modal.component';
import { NotificationListComponent } from '../../components/notification-list/notification-list.component';
import { NotificationPreferencesComponent } from '../../components/notification-preferences/notification-preferences.component';
import { BabySelectionModalComponent } from '../../components/baby-selection-modal/baby-selection-modal.component';

// Version Info Interface
export interface VersionInfo {
  version: string;
  isBeta: boolean;
  buildNumber: number;
  releaseDate: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  upcomingConsultations: Consultation[] = [];
  experts: Expert[] = [];
  unreadNotificationCount = 0;
  versionInfo: VersionInfo | null = null;

  profileSections: any[] = [];

  constructor(
    private backendAuthService: BackendAuthService,
    private apiService: ApiService,
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private notificationService: NotificationService,
    private timezoneService: TimezoneService
  ) {}

  ngOnInit() {
    this.backendAuthService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadUpcomingConsultations();
        this.initializeNotifications();
        this.updateProfileSections();
      }
    });
    
    this.loadExperts();
    this.loadVersionInfo();
  }

  private initializeNotifications() {
    // Subscribe to unread notification count
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotificationCount = count;
      this.updateProfileSections(); // Update sections when notification count changes
    });

    // Load initial notifications
    this.notificationService.loadNotifications({ limit: 10 });
    this.notificationService.loadPreferences();
  }

  private updateProfileSections() {
    console.log('Profile Page - updateProfileSections called for user:', this.user);
    const accountItems: any[] = [
      { label: 'Personal Information', icon: 'person-outline', action: 'editProfile' }
    ];

    // Check if user is an expert
    const isExpert = this.user?.role === 'expert' || this.user?.role === 'admin';

    // Only add baby-related items for non-expert users
    if (!isExpert) {
      // Add individual baby entries
      if (this.user?.babies && this.user.babies.length > 0) {
        this.user.babies.forEach((baby, index) => {
          accountItems.push({
            label: `${baby.name}'s Information`,
            icon: 'baby-outline',
            customIcon: baby.gender === 'female' ? 'assets/Baby girl.svg' : 'assets/Baby boy.svg',
            action: 'editSpecificBaby',
            babyId: baby.id,
            babyIndex: index,
            babyGender: baby.gender
          });
        });
      }

      // Determine the add baby label based on existing babies
      const addBabyLabel = (this.user?.babies && this.user.babies.length > 0) 
        ? 'Add Another Baby' 
        : 'Add New Baby';

      accountItems.push({ label: addBabyLabel, icon: 'add-circle-outline', action: 'addBaby' });
    }

    // Add notifications for all users
    accountItems.push(
      { label: 'Notifications', icon: 'notifications-outline', action: 'viewNotifications', badge: this.unreadNotificationCount }
    );

    // Create support items based on user role
    const supportItems: any[] = [
      { label: 'Contact Support', icon: 'mail-outline', action: 'contact' },
      { label: 'Privacy Policy', icon: 'shield-outline', action: 'privacy' }
    ];

    // Only add help center and book consultation for non-expert users
    if (!isExpert) {
      supportItems.unshift(
        { label: 'Help Center', icon: 'help-circle-outline', action: 'help' },
        { label: 'Book Expert Consultation', icon: 'videocam-outline', action: 'bookConsultation' }
      );
    }

    this.profileSections = [
      {
        title: 'Account',
        items: accountItems
      },
      {
        title: 'Support',
        items: supportItems
      }
    ];
  }

  private loadUpcomingConsultations() {
    if (this.user) {
      this.consultationService.getUserConsultations(this.user.uid, 'scheduled', true).subscribe(consultations => {
        // Filter for upcoming consultations only
        const now = new Date();
        this.upcomingConsultations = consultations.filter(consultation => {
          const scheduledTime = new Date(consultation.scheduled_at || consultation.scheduledAt);
          return scheduledTime > now && consultation.status === 'scheduled';
        });
      });
    }
  }

  private loadExperts() {
    this.consultationService.getExperts().subscribe(experts => {
      this.experts = experts;
    });
  }

  private loadVersionInfo() {
    // First, try to get cached version from localStorage
    const cachedVersionInfo = localStorage.getItem('naricare_version_info');
    const cachedVersion = cachedVersionInfo ? JSON.parse(cachedVersionInfo) : null;

    // Set initial version (cached or fallback)
    this.versionInfo = cachedVersion || this.getFallbackVersionInfo();

    // Try to fetch latest version from API
    const headers = (this.apiService as any).getAuthHeaders();
    const baseUrl = (this.apiService as any).baseUrl;
    
    this.http.get<ApiResponse<VersionInfo>>(`${baseUrl}/version`, {
      headers
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const serverVersionInfo = response.data;
          
          // Check if version has changed
          const currentStoredVersion = localStorage.getItem('naricare_current_version');
          if (currentStoredVersion && currentStoredVersion !== serverVersionInfo.version) {
            // Version changed - check if force update is required
            if (serverVersionInfo.forceUpdate) {
              this.promptForAppUpdate(serverVersionInfo);
            } else {
              // Optional update available
              this.showUpdateAvailableNotification(serverVersionInfo);
            }
          }

          // Update current version and cache the version info
          this.versionInfo = serverVersionInfo;
          localStorage.setItem('naricare_version_info', JSON.stringify(serverVersionInfo));
          localStorage.setItem('naricare_current_version', serverVersionInfo.version);
        }
      },
      error: (error) => {
        console.log('Could not load version info from API, using cached/fallback data:', error);
        // Keep using cached or fallback version
        if (!cachedVersion) {
          // If no cached version, store the fallback
          localStorage.setItem('naricare_version_info', JSON.stringify(this.versionInfo));
          localStorage.setItem('naricare_current_version', this.versionInfo!.version);
        }
      }
    });
  }

  private getFallbackVersionInfo(): VersionInfo {
    return {
      version: '1.0.0',
      isBeta: true,
      buildNumber: 1,
      releaseDate: '2025-01-16',
      minSupportedVersion: '1.0.0',
      forceUpdate: false,
      updateMessage: 'Claude Edition - Made with ❤️ for mothers everywhere'
    };
  }

  private async promptForAppUpdate(versionInfo: VersionInfo) {
    const alert = await this.alertController.create({
      header: 'App Update Required',
      message: `A new version (v${versionInfo.version}) is available and required. ${versionInfo.updateMessage || 'Please update your app to continue.'}`,
      buttons: [
        {
          text: 'Update Now',
          role: 'confirm',
          handler: () => {
            // Redirect to app store or refresh for PWA
            if (this.isPWA()) {
              window.location.reload();
            } else {
              // For native apps, redirect to app store
              window.open('https://play.google.com/store/apps/details?id=com.naricare.app', '_system');
            }
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  private async showUpdateAvailableNotification(versionInfo: VersionInfo) {
    const toast = await this.toastController.create({
      message: `New version v${versionInfo.version} available! ${versionInfo.updateMessage || 'Update when convenient.'}`,
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Update',
          handler: () => {
            if (this.isPWA()) {
              window.location.reload();
            } else {
              window.open('https://play.google.com/store/apps/details?id=com.naricare.app', '_system');
            }
          }
        },
        {
          text: 'Later',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  private isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  handleAction(action: string, item?: any) {
    console.log('Profile Page - handleAction called with:', { action, item });
    console.log('Profile Page - Current profileSections:', this.profileSections);
    switch (action) {
      case 'editProfile':
        this.editProfile();
        break;
      case 'editBaby':
        this.editBaby();
        break;
      case 'editSpecificBaby':
        this.editSpecificBaby(item?.babyId);
        break;
      case 'addBaby':
        this.addBaby();
        break;
      case 'viewNotifications':
        this.openNotificationsList();
        break;
      case 'subscription':
        this.viewSubscription();
        break;
      case 'upgrade':
        this.upgradeSubscription();
        break;
      case 'bookConsultation':
        this.openConsultationBooking();
        break;
      case 'billing':
        this.viewBilling();
        break;
      case 'help':
        this.openHelp();
        break;
      case 'contact':
        this.contactSupport();
        break;
      case 'privacy':
        this.viewPrivacyPolicy();
        break;
    }
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

  getExpertName(expertId: string): string {
    const expert = this.experts.find(e => e.id === expertId);
    return expert?.name || 'Expert';
  }

  isConsultationReady(consultation: Consultation): boolean {
    const now = new Date();
    const consultationTime = new Date(consultation.scheduled_at || consultation.scheduledAt);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Allow joining 15 minutes before scheduled time
    return minutesDiff <= 15 && minutesDiff >= -30;
  }

  joinConsultation(consultation: Consultation) {
    const meetingLink = consultation.meeting_link || consultation.meetingLink;
    if (meetingLink) {
      // Navigate to the video call page with consultation ID
      this.router.navigate(['/video-call', consultation.id]);
    }
  }

  private editProfile() {
    console.log('Profile Page - editProfile method called');
    console.log('Profile Page - Current user:', this.user);
    console.log('Profile Page - Current route:', this.router.url);
    console.log('Profile Page - Navigating to personal-info');
    
    // Simple direct navigation first
    console.log('Profile Page - Attempting direct navigation to /personal-info');
    this.router.navigateByUrl('/personal-info').then(success => {
      console.log('Profile Page - Direct navigation result:', success);
      if (!success) {
        console.error('Profile Page - Direct navigation failed, trying alternative');
        // Alternative approach with manual URL change
        setTimeout(() => {
          console.log('Profile Page - Forcing navigation with location.href');
          window.location.href = '/personal-info';
        }, 100);
      }
    }).catch(error => {
      console.error('Profile Page - Navigation error:', error);
      // Force navigation
      window.location.href = '/personal-info';
    });
  }

  private async editBaby() {
    if (!this.user?.babies || this.user.babies.length === 0) {
      // No babies exist, redirect to add baby
      this.addBaby();
      return;
    }

    if (this.user.babies.length === 1) {
      // Only one baby, go directly to baby detail page
      this.router.navigate(['/tabs/growth/baby-detail', this.user.babies[0].id]);
      return;
    }

    // Multiple babies, show selection modal
    const modal = await this.modalController.create({
      component: BabySelectionModalComponent,
      cssClass: 'baby-selection-modal',
      componentProps: {
        babies: this.user.babies
      }
    });

    await modal.present();
  }

  private editSpecificBaby(babyId: string) {
    if (babyId) {
      // Check if baby still exists (in case of recent deletion)
      const babyExists = this.user?.babies?.find(b => b.id === babyId);
      if (babyExists) {
        this.router.navigate(['/tabs/growth/baby-detail', babyId]);
      } else {
        // Baby no longer exists, refresh profile sections
        this.updateProfileSections();
        this.showErrorToast('This baby information is no longer available.');
      }
    }
  }

  async addBaby() {
    const modal = await this.modalController.create({
      component: BabyCreationModalComponent,
      cssClass: 'baby-creation-modal',
      componentProps: {
        existingBabies: this.user?.babies || []
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.created) {
        // Baby was created successfully, user data is already refreshed in the modal
        this.updateProfileSections(); // Refresh profile sections to show baby information item
        this.showSuccessToast(`Baby added successfully! 👶`);
      }
    });

    return await modal.present();
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  async openNotificationsList() {
    const modal = await this.modalController.create({
      component: NotificationListComponent,
      presentingElement: await this.modalController.getTop()
    });

    await modal.present();
  }

  async openNotificationSettings() {
    const modal = await this.modalController.create({
      component: NotificationPreferencesComponent,
      presentingElement: await this.modalController.getTop()
    });

    await modal.present();
  }

  private viewSubscription() {
    console.log('View subscription');
  }

  private upgradeSubscription() {
    console.log('Upgrade subscription');
  }

  private viewBilling() {
    console.log('View billing history');
  }

  private openHelp() {
    console.log('Open help center');
  }

  private contactSupport() {
    // Redirect to NariCare WhatsApp business number
    const whatsappNumber = '918142144762';
    const message = encodeURIComponent('Hello, I need support with NariCare app');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  }

  private viewPrivacyPolicy() {
    console.log('View privacy policy');
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to sign out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Sign Out',
          handler: async () => {
            try {
              await this.backendAuthService.logout();
              const toast = await this.toastController.create({
                message: 'You have been signed out successfully.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } catch (error) {
              console.error('Logout error:', error);
              const toast = await this.toastController.create({
                message: 'Failed to sign out. Please try again.',
                duration: 3000,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getTierDisplay(): string {
    if (!this.user?.tier) return 'Basic';
    
    switch (this.user.tier.type) {
      case 'one-month': return '1-Month Program';
      case 'three-month': return '3-Month Program';
      default: return 'Basic';
    }
  }

  getTierColor(): string {
    if (!this.user?.tier) return 'medium';
    
    switch (this.user.tier.type) {
      case 'one-month': return 'warning';
      case 'three-month': return 'success';
      default: return 'medium';
    }
  }

  getConsultationsRemaining(): number {
    return this.user?.tier?.consultationsRemaining || 0;
  }

  formatJoinDate(): string {
    if (!this.user?.createdAt) return '';
    return new Date(this.user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }

  // Timezone-aware time display methods
  formatConsultationTime(consultation: Consultation): string {
    const utcTime = consultation.scheduled_at || consultation.scheduledAt;
    if (!utcTime) return '';
    
    const userTimezone = this.user?.timezone || this.timezoneService.getUserTimezone();
    return this.timezoneService.formatDateTime(utcTime, userTimezone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  formatConsultationTimeWithContext(consultation: Consultation): {
    userTime: string;
    expertTime?: string;
    display: string;
  } {
    const utcTime = consultation.scheduled_at || consultation.scheduledAt;
    if (!utcTime) {
      return {
        userTime: '',
        display: ''
      };
    }
    
    const userTimezone = this.user?.timezone || this.timezoneService.getUserTimezone();
    const expertTimezone = consultation.expert_timezone; // From backend response
    
    return this.timezoneService.formatConsultationTime(utcTime, userTimezone, expertTimezone);
  }

  formatConsultationDate(consultation: Consultation): string {
    const utcTime = consultation.scheduled_at || consultation.scheduledAt;
    if (!utcTime) return '';
    
    const userTimezone = this.user?.timezone || this.timezoneService.getUserTimezone();
    return this.timezoneService.formatDate(utcTime, userTimezone, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  formatConsultationTimeOnly(consultation: Consultation): string {
    const utcTime = consultation.scheduled_at || consultation.scheduledAt;
    if (!utcTime) return '';
    
    const userTimezone = this.user?.timezone || this.timezoneService.getUserTimezone();
    return this.timezoneService.formatTime(utcTime, userTimezone, {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  getConsultationStatus(consultation: Consultation): {
    text: string;
    color: string;
    canJoin: boolean;
  } {
    const now = new Date();
    const utcTime = consultation.scheduled_at || consultation.scheduledAt;
    const consultationTime = new Date(utcTime);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff <= 15 && minutesDiff >= -30) {
      return {
        text: 'Ready to join',
        color: 'success',
        canJoin: true
      };
    } else if (minutesDiff > 15) {
      const hours = Math.floor(minutesDiff / 60);
      const minutes = Math.floor(minutesDiff % 60);
      
      if (hours > 0) {
        return {
          text: `Starts in ${hours}h ${minutes}m`,
          color: 'primary',
          canJoin: false
        };
      } else {
        return {
          text: `Starts in ${Math.floor(minutesDiff)}m`,
          color: 'primary',
          canJoin: false
        };
      }
    } else {
      return {
        text: 'Ended',
        color: 'medium',
        canJoin: false
      };
    }
  }
}