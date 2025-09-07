import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { BackendNotificationService, NotificationResponse, NotificationPreferences } from './backend-notification.service';
import { PushNotificationService } from './push-notification.service';
import { BackendAuthService } from './backend-auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private currentMessage = new BehaviorSubject<any>(null);
  private notifications = new BehaviorSubject<NotificationResponse[]>([]);
  private unreadCount = new BehaviorSubject<number>(0);
  private preferences = new BehaviorSubject<NotificationPreferences | null>(null);

  public currentMessage$ = this.currentMessage.asObservable();
  public notifications$ = this.notifications.asObservable();
  public unreadCount$ = this.unreadCount.asObservable();
  public preferences$ = this.preferences.asObservable();

  constructor(
    private backendNotificationService: BackendNotificationService,
    private pushNotificationService: PushNotificationService,
    private authService: BackendAuthService,
    private toastController: ToastController
  ) {
    this.initializeNotificationService();
  }

  private initializeNotificationService() {
    // Subscribe to push notifications
    this.pushNotificationService.notification$.subscribe(notification => {
      if (notification) {
        this.currentMessage.next(notification);
        // Refresh notifications list when new notification is received
        this.loadNotifications();
      }
    });

    // Load initial data when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadNotifications();
        this.loadPreferences();
      } else {
        // Clear data when user logs out
        this.notifications.next([]);
        this.unreadCount.next(0);
        this.preferences.next(null);
      }
    });
  }

  async requestPermission(userId?: string): Promise<void> {
    try {
      // The push notification service handles token registration
      console.log('Push notification permission will be handled by PushNotificationService');
    } catch (error) {
      console.error('Unable to get permission to notify.', error);
    }
  }

  receiveMessage(): void {
    // This is now handled by the PushNotificationService
    // Subscribe to the push notification service's messages
    this.pushNotificationService.notification$.subscribe(payload => {
      if (payload) {
        console.log('New message received via push service: ', payload);
        this.currentMessage.next(payload);
        this.showNotificationToast(payload);
      }
    });
  }

  private async showNotificationToast(payload: any): Promise<void> {
    const toast = await this.toastController.create({
      header: payload.title || payload.notification?.title || 'New Notification',
      message: payload.body || payload.notification?.body || 'You have a new message',
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'View',
          handler: () => {
            // Navigate to notifications page or handle based on notification type
            this.handleNotificationAction(payload);
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  private handleNotificationAction(payload: any) {
    // Handle notification tap - this could navigate to specific screens
    // based on the notification type
    const type = payload.data?.type || payload.type;
    console.log('Handling notification action for type:', type);
    // The push notification service already handles navigation
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT METHODS
  // ============================================================================

  /**
   * Load notifications from backend
   */
  loadNotifications(options: {
    page?: number;
    limit?: number;
    type?: string;
    sent?: boolean;
  } = {}): void {
    this.backendNotificationService.getMyNotifications(options).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications.next(response.data);
          // Count unread notifications (assuming is_sent=true means it was delivered)
          const unread = response.data.filter(n => n.is_sent && !n.sent_at).length;
          this.unreadCount.next(unread);
        }
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
      }
    });
  }

  /**
   * Load user notification preferences
   */
  loadPreferences(): void {
    this.backendNotificationService.getNotificationPreferences().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Map API response to frontend interface
          const mappedPreferences = this.mapApiResponseToPreferences(response.data);
          this.preferences.next(mappedPreferences);
        }
      },
      error: (error) => {
        console.error('Failed to load notification preferences:', error);
      }
    });
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: NotificationPreferences): Observable<boolean> {
    return new Observable(observer => {
      // Map frontend preferences to API format
      const apiPreferences = this.mapPreferencesToApiFormat(preferences);
      
      this.backendNotificationService.updateNotificationPreferences(apiPreferences).subscribe({
        next: (response) => {
          if (response.success) {
            this.preferences.next(preferences);
            this.showToast('Notification preferences updated successfully', 'success');
            observer.next(true);
          } else {
            observer.next(false);
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Failed to update preferences:', error);
          this.showToast('Failed to update notification preferences', 'danger');
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Get current notifications
   */
  getNotifications(): NotificationResponse[] {
    return this.notifications.value;
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences.value;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.unreadCount.value;
  }

  /**
   * Force refresh of push notification token
   */
  async refreshPushToken(): Promise<void> {
    try {
      await this.pushNotificationService.forceTokenRegistration();
      this.showToast('Push notification token refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh push token:', error);
      this.showToast('Failed to refresh notification token', 'danger');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Get notification type display information
   */
  getNotificationTypeInfo(type: string): { displayName: string; icon: string } {
    return {
      displayName: this.backendNotificationService.getNotificationTypeDisplayName(type),
      icon: this.backendNotificationService.getNotificationTypeIcon(type)
    };
  }

  /**
   * Format notification time for display
   */
  formatNotificationTime(timestamp: string): string {
    return this.backendNotificationService.formatNotificationTime(timestamp);
  }

  // ============================================================================
  // DEPRECATED METHODS (for backward compatibility)
  // ============================================================================

  /**
   * @deprecated Use loadNotifications() instead
   */
  async scheduleNotification(userId: string, type: string, title: string, body: string, scheduledTime: Date): Promise<void> {
    console.warn('scheduleNotification is deprecated. Backend notifications are handled server-side.');
  }

  // ============================================================================
  // MAPPING METHODS
  // ============================================================================

  /**
   * Map API response (snake_case) to frontend interface (camelCase)
   */
  private mapApiResponseToPreferences(apiData: any): NotificationPreferences {
    return {
      articleUpdates: this.convertToBoolean(apiData.article_updates),
      callReminders: this.convertToBoolean(apiData.call_reminders),
      groupMessages: this.convertToBoolean(apiData.group_messages),
      growthReminders: this.convertToBoolean(apiData.growth_reminders),
      expertMessages: this.convertToBoolean(apiData.expert_messages)
    };
  }

  /**
   * Map frontend preferences (camelCase) to API format (snake_case)
   */
  private mapPreferencesToApiFormat(preferences: NotificationPreferences): any {
    return {
      article_updates: preferences.articleUpdates ? 1 : 0,
      call_reminders: preferences.callReminders ? 1 : 0,
      group_messages: preferences.groupMessages ? 1 : 0,
      growth_reminders: preferences.growthReminders ? 1 : 0,
      expert_messages: preferences.expertMessages ? 1 : 0
    };
  }

  /**
   * Convert API value (1, 0, null) to boolean
   */
  private convertToBoolean(value: any): boolean {
    if (value === null || value === undefined) {
      return false; // Default to false for null values
    }
    return value === 1 || value === true;
  }
}