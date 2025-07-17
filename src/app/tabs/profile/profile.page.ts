import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  user: User | null = null;

  profileSections = [
    {
      title: 'Account',
      items: [
        { label: 'Personal Information', icon: 'person-outline', action: 'editProfile' },
        { label: 'Baby Information', icon: 'baby-outline', action: 'editBaby' },
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
        { label: 'Contact Support', icon: 'mail-outline', action: 'contact' },
        { label: 'Privacy Policy', icon: 'shield-outline', action: 'privacy' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
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
      case 'notifications':
        this.openNotificationSettings();
        break;
      case 'subscription':
        this.viewSubscription();
        break;
      case 'upgrade':
        this.upgradeSubscription();
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

  private editProfile() {
    console.log('Edit profile');
  }

  private editBaby() {
    console.log('Edit baby information');
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
              await this.authService.logout();
              const toast = await this.toastController.create({
                message: 'You have been signed out successfully.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } catch (error) {
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