import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ConsultationService } from '../../services/consultation.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';
import { Consultation, Expert } from '../../models/consultation.model';
import { ConsultationBookingModalComponent } from '../../components/consultation-booking-modal/consultation-booking-modal.component';
import { BabyCreationModalComponent } from '../../components/baby-creation-modal/baby-creation-modal.component';
import { NotificationListComponent } from '../../components/notification-list/notification-list.component';
import { NotificationPreferencesComponent } from '../../components/notification-preferences/notification-preferences.component';
import { BabySelectionModalComponent } from '../../components/baby-selection-modal/baby-selection-modal.component';

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

  profileSections: any[] = [];

  constructor(
    private backendAuthService: BackendAuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private notificationService: NotificationService
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
    const accountItems: any[] = [
      { label: 'Personal Information', icon: 'person-outline', action: 'editProfile' }
    ];

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

    accountItems.push(
      { label: 'Add New Baby', icon: 'add-circle-outline', action: 'addBaby' },
      { label: 'Notifications', icon: 'notifications-outline', action: 'viewNotifications', badge: this.unreadNotificationCount },
      { label: 'Notification Settings', icon: 'settings-outline', action: 'notificationSettings' }
    );

    this.profileSections = [
      {
        title: 'Account',
        items: accountItems
      },
      {
        title: 'Support',
        items: [
          { label: 'Help Center', icon: 'help-circle-outline', action: 'help' },
          { label: 'Book Expert Consultation', icon: 'videocam-outline', action: 'bookConsultation' },
          { label: 'Contact Support', icon: 'mail-outline', action: 'contact' },
          { label: 'Privacy Policy', icon: 'shield-outline', action: 'privacy' }
        ]
      }
    ];
  }

  private loadUpcomingConsultations() {
    if (this.user) {
      this.consultationService.getUserConsultations(this.user.uid).subscribe(consultations => {
        // Filter for upcoming consultations only
        const now = new Date();
        this.upcomingConsultations = consultations.filter(consultation => 
          consultation.scheduledAt > now && consultation.status === 'scheduled'
        );
      });
    }
  }

  private loadExperts() {
    this.consultationService.getExperts().subscribe(experts => {
      this.experts = experts;
    });
  }

  handleAction(action: string, item?: any) {
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
      case 'notificationSettings':
        this.openNotificationSettings();
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
    const consultationTime = new Date(consultation.scheduledAt);
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
    this.router.navigate(['/personal-info']);
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
      this.router.navigate(['/tabs/growth/baby-detail', babyId]);
    }
  }

  async addBaby() {
    const modal = await this.modalController.create({
      component: BabyCreationModalComponent,
      cssClass: 'baby-creation-modal'
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
    console.log('Contact support');
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
}