import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ConsultationService } from '../../services/consultation.service';
import { User } from '../../models/user.model';
import { Consultation, Expert } from '../../models/consultation.model';
import { ConsultationBookingModalComponent } from '../../components/consultation-booking-modal/consultation-booking-modal.component';
import { BabyCreationModalComponent } from '../../components/baby-creation-modal/baby-creation-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  upcomingConsultations: Consultation[] = [];
  experts: Expert[] = [];

  profileSections = [
    {
      title: 'Account',
      items: [
        { label: 'Personal Information', icon: 'person-outline', action: 'editProfile' },
        { label: 'Baby Information', icon: 'baby-outline', action: 'editBaby' },
        { label: 'Add New Baby', icon: 'add-circle-outline', action: 'addBaby' },
        { label: 'Notification Settings', icon: 'notifications-outline', action: 'notifications' }
      ]
    },
    {
      title: 'Subscription',
      items: [
        { label: 'Current Plan', icon: 'card-outline', action: 'subscription' },
        { label: 'Upgrade Plan', icon: 'arrow-up-outline', action: 'upgrade' },
        { label: 'Billing History', icon: 'receipt-outline', action: 'billing' }
      ]
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

  constructor(
    private backendAuthService: BackendAuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private consultationService: ConsultationService
  ) {}

  ngOnInit() {
    this.backendAuthService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadUpcomingConsultations();
      }
    });
    
    this.loadExperts();
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

  handleAction(action: string) {
    switch (action) {
      case 'editProfile':
        this.editProfile();
        break;
      case 'editBaby':
        this.editBaby();
        break;
      case 'addBaby':
        this.addBaby();
        break;
      case 'notifications':
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
    if (consultation.meetingLink) {
      // Extract the room name from the Jitsi meeting link
      const roomName = consultation.meetingLink.split('/').pop();
      // Navigate to the new video call page
      this.router.navigate(['/video-call', roomName]);
    }
  }

  private editProfile() {
    this.router.navigate(['/personal-info']);
  }

  private editBaby() {
    console.log('Edit baby information');
  }

  async addBaby() {
    const modal = await this.modalController.create({
      component: BabyCreationModalComponent,
      cssClass: 'baby-creation-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.created) {
        // Baby was created successfully, user data is already refreshed in the modal
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

  private openNotificationSettings() {
    console.log('Open notification settings');
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