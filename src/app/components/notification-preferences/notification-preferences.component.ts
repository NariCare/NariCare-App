import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { NotificationService } from '../../services/notification.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { NotificationPreferences } from '../../services/backend-notification.service';
import { BackendAuthService } from '../../services/backend-auth.service';

@Component({
  selector: 'app-notification-preferences',
  templateUrl: './notification-preferences.component.html',
  styleUrls: ['./notification-preferences.component.scss'],
})
export class NotificationPreferencesComponent implements OnInit {
  preferences: NotificationPreferences = {
    articleUpdates: true,
    callReminders: true,
    groupMessages: true,
    growthReminders: true,
    expertMessages: true
  };

  isLoading = false;
  tokenStatus: any = {};
  user: any = null;

  constructor(
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private authService: BackendAuthService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadPreferences();
    this.loadTokenStatus();
  }

  private loadUserData() {
    this.user = this.authService.getCurrentUser();
  }

  private loadPreferences() {
    const currentPreferences = this.notificationService.getPreferences();
    if (currentPreferences) {
      this.preferences = { ...currentPreferences };
    } else {
      this.notificationService.loadPreferences();
    }

    // Subscribe to preference changes
    this.notificationService.preferences$.subscribe(prefs => {
      if (prefs) {
        this.preferences = { ...prefs };
      }
    });
  }

  async onPreferenceChange(key: keyof NotificationPreferences, value: boolean) {
    this.preferences[key] = value;
    await this.savePreferences();
  }

  async savePreferences() {
    if (this.isLoading) return;

    const loading = await this.loadingController.create({
      message: 'Saving preferences...',
      duration: 2000
    });

    await loading.present();
    this.isLoading = true;

    this.notificationService.updatePreferences(this.preferences).subscribe({
      next: (success) => {
        this.isLoading = false;
        loading.dismiss();
        if (!success) {
          // Revert changes if save failed
          this.loadPreferences();
        }
      },
      error: () => {
        this.isLoading = false;
        loading.dismiss();
        // Revert changes if save failed
        this.loadPreferences();
      }
    });
  }

  private loadTokenStatus() {
    this.tokenStatus = this.pushNotificationService.getTokenRegistrationStatus();
  }

  async refreshPushToken() {
    const loading = await this.loadingController.create({
      message: 'Refreshing notification token...',
      duration: 3000
    });

    await loading.present();

    try {
      await this.notificationService.refreshPushToken();
      // Reload token status after refresh
      this.loadTokenStatus();
    } catch (error) {
      console.error('Failed to refresh push token:', error);
    } finally {
      loading.dismiss();
    }
  }

  close() {
    this.modalController.dismiss();
  }

  getPreferenceDescription(key: keyof NotificationPreferences): string {
    const descriptions = {
      articleUpdates: 'Get notified when new articles are published',
      callReminders: 'Receive reminders for upcoming consultations',
      groupMessages: 'Get notified of new messages in community groups',
      growthReminders: 'Reminders to track your baby\'s weight and growth',
      expertMessages: 'Direct messages from lactation experts'
    };

    return descriptions[key] || '';
  }

  getPreferenceTitle(key: keyof NotificationPreferences): string {
    const titles = {
      articleUpdates: 'Article Updates',
      callReminders: 'Consultation Reminders',
      groupMessages: 'Community Messages',
      growthReminders: 'Growth Tracking Reminders',
      expertMessages: 'Expert Messages'
    };

    return titles[key] || key;
  }

  shouldShowNotificationOption(key: keyof NotificationPreferences): boolean {
    // For experts, only show relevant notifications
    if (this.user?.role === 'expert') {
      return key === 'callReminders' || key === 'groupMessages';
    }
    
    // For non-experts (users), show all notifications
    return true;
  }
}