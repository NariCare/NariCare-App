import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { 
  PushNotifications, 
  PushNotificationSchema, 
  ActionPerformed,
  Token 
} from '@capacitor/push-notifications';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { BackendNotificationService } from './backend-notification.service';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: any };
  type?: 'consultation' | 'chat' | 'general' | 'reminder';
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private messaging: any;
  private fcmToken: string | null = null;
  private notificationSubject = new BehaviorSubject<PushNotificationSchema | null>(null);
  public notification$ = this.notificationSubject.asObservable();
  
  // Token management properties
  private lastRegisteredToken: string | null = null;
  private lastRegistrationDate: Date | null = null;
  private readonly TOKEN_REFRESH_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly TOKEN_STORAGE_KEY = 'fcm_last_token';
  private readonly REGISTRATION_DATE_KEY = 'fcm_last_registration';

  constructor(
    private backendNotificationService: BackendNotificationService,
    private router: Router,
    private toastController: ToastController
  ) {
    this.loadStoredTokenData();
    this.initializePushNotifications();
  }

  async initializePushNotifications() {
    if (Capacitor.isNativePlatform()) {
      await this.initializeNativePushNotifications();
    } else {
      await this.initializeWebPushNotifications();
    }
  }

  // ============================================================================
  // NATIVE PUSH NOTIFICATIONS (iOS & Android)
  // ============================================================================
  
  private async initializeNativePushNotifications() {
    console.log('Initializing native push notifications');

    // Request permission to use push notifications
    const result = await PushNotifications.requestPermissions();
    
    if (result.receive === 'granted') {
      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
      
      // Setup listeners
      this.setupNativeListeners();
    } else {
      console.warn('Push notification permission not granted');
    }
  }

  private setupNativeListeners() {
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      this.fcmToken = token.value;
      this.sendTokenToServer(token.value);
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received: ', notification);
      this.handleForegroundNotification(notification);
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed', notification);
      this.handleNotificationAction(notification);
    });
  }

  // ============================================================================
  // WEB PUSH NOTIFICATIONS (Firebase Cloud Messaging)
  // ============================================================================

  private async initializeWebPushNotifications() {
    console.log('Initializing web push notifications');

    try {
      // Initialize Firebase app
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Web notification permission granted.');
        
        // Check if VAPID key is configured
        if (!environment.firebase.vapidKey || environment.firebase.vapidKey === 'YOUR_VAPID_KEY_HERE') {
          console.warn('VAPID key not configured. Web push notifications may not work properly.');
          this.showToast('Push notifications not fully configured', 'warning');
          return;
        }
        
        // Get FCM token
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey // VAPID key from environment
        });
        
        if (token) {
          console.log('FCM Token:', token);
          this.fcmToken = token;
          this.sendTokenToServer(token);
        } else {
          console.warn('Failed to get FCM token');
        }

        // Handle foreground messages
        onMessage(this.messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          this.handleForegroundWebMessage(payload);
        });

      } else {
        console.warn('Web notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing web push notifications:', error);
    }
  }

  // ============================================================================
  // NOTIFICATION HANDLERS
  // ============================================================================

  private handleForegroundNotification(notification: PushNotificationSchema) {
    // Handle notification received while app is in foreground
    console.log('Handling foreground notification:', notification);
    
    // Emit notification to subscribers
    this.notificationSubject.next(notification);
    
    // Show in-app notification
    this.showInAppNotification(notification.title || '', notification.body || '');
  }

  private handleForegroundWebMessage(payload: any) {
    // Handle web FCM message in foreground
    console.log('Handling web foreground message:', payload);
    
    const { notification } = payload;
    if (notification) {
      this.showInAppNotification(notification.title, notification.body);
    }
  }

  private handleNotificationAction(action: ActionPerformed) {
    const data = action.notification.data;
    const type = data?.type || 'general';
    
    // Navigate based on notification type
    switch (type) {
      case 'consultation':
        this.navigateToConsultation(data?.consultationId);
        break;
      case 'chat':
        this.navigateToChat(data?.chatId);
        break;
      case 'reminder':
        this.handleReminder(data);
        break;
      default:
        this.navigateToHome();
        break;
    }
  }

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  private navigateToConsultation(consultationId?: string) {
    if (consultationId) {
      this.router.navigate(['/video-call', consultationId]);
    } else {
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  private navigateToChat(chatId?: string) {
    if (chatId) {
      this.router.navigate(['/chat-room', chatId]);
    } else {
      this.router.navigate(['/tabs/chat']);
    }
  }

  private navigateToHome() {
    this.router.navigate(['/tabs/dashboard']);
  }

  private navigateToGrowth() {
    this.router.navigate(['/tabs/growth']);
  }

  private navigateToKnowledge() {
    this.router.navigate(['/tabs/knowledge']);
  }

  private handleReminder(data: any) {
    // Handle specific reminder actions based on type
    console.log('Handling reminder:', data);
    
    const reminderType = data?.reminderType || data?.type;
    
    switch (reminderType) {
      case 'weight_reminder':
      case 'growth_reminder':
        this.navigateToGrowth();
        break;
      case 'consultation_reminder':
        if (data?.consultationId) {
          this.navigateToConsultation(data.consultationId);
        } else {
          this.navigateToHome();
        }
        break;
      case 'article_update':
        this.navigateToKnowledge();
        break;
      default:
        this.navigateToHome();
        break;
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async sendTokenToServer(token: string, forceUpdate = false) {
    try {
      console.log('Checking if token registration is needed:', token);
      
      // Check if we need to register this token
      if (!this.shouldRegisterToken(token, forceUpdate)) {
        console.log('Token already registered and up to date, skipping API call');
        return;
      }

      console.log('Sending FCM token to backend server:', token);
      const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
      
      this.backendNotificationService.registerPushToken({
        token,
        platform
      }).subscribe({
        next: (response) => {
          console.log('Token registered successfully:', response);
          if (response.success) {
            // Store successful registration
            this.lastRegisteredToken = token;
            this.lastRegistrationDate = new Date();
            this.storeTokenData(token, this.lastRegistrationDate);
            
            if (forceUpdate) {
              this.showToast('Push notification token refreshed successfully', 'success');
            } else {
              this.showToast('Push notifications enabled successfully', 'success');
            }
          }
        },
        error: (error) => {
          console.error('Failed to register push token:', error);
          this.showToast('Failed to enable push notifications', 'danger');
          // Don't update stored data on failure
        }
      });
      
    } catch (error) {
      console.error('Error sending token to server:', error);
      this.showToast('Failed to enable push notifications', 'danger');
    }
  }

  private async showInAppNotification(title: string, body: string) {
    // Show custom in-app notification using Ionic Toast
    console.log(`In-app notification: ${title} - ${body}`);
    
    const toast = await this.toastController.create({
      header: title,
      message: body,
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'View',
          handler: () => {
            // Navigate to notifications page or relevant screen
            this.router.navigate(['/tabs/profile/notifications']);
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

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getFCMToken(): string | null {
    return this.fcmToken;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Method to manually trigger token registration (useful for settings page)
  async forceTokenRegistration() {
    if (this.fcmToken) {
      await this.sendTokenToServer(this.fcmToken, true); // Force update = true
    } else {
      console.warn('No FCM token available for registration');
      this.showToast('No notification token available. Please restart the app.', 'warning');
    }
  }

  async refreshToken() {
    if (Capacitor.isNativePlatform()) {
      // For native platforms, re-register
      await PushNotifications.register();
    } else if (this.messaging) {
      // For web, get new token
      try {
        const token = await getToken(this.messaging);
        this.fcmToken = token;
        this.sendTokenToServer(token);
      } catch (error) {
        console.error('Error refreshing FCM token:', error);
      }
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true; // Native platforms support push notifications
    } else {
      return 'Notification' in window && 'serviceWorker' in navigator;
    }
  }

  // ============================================================================
  // TOKEN MANAGEMENT METHODS
  // ============================================================================

  /**
   * Load stored token data from localStorage
   */
  private loadStoredTokenData(): void {
    try {
      const storedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      const storedDate = localStorage.getItem(this.REGISTRATION_DATE_KEY);
      
      if (storedToken && storedDate) {
        this.lastRegisteredToken = storedToken;
        this.lastRegistrationDate = new Date(storedDate);
        console.log('Loaded stored token data:', {
          token: storedToken.substring(0, 20) + '...',
          date: this.lastRegistrationDate
        });
      }
    } catch (error) {
      console.warn('Failed to load stored token data:', error);
      this.clearStoredTokenData();
    }
  }

  /**
   * Store token data to localStorage
   */
  private storeTokenData(token: string, date: Date): void {
    try {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, token);
      localStorage.setItem(this.REGISTRATION_DATE_KEY, date.toISOString());
      console.log('Stored token registration data');
    } catch (error) {
      console.error('Failed to store token data:', error);
    }
  }

  /**
   * Clear stored token data
   */
  private clearStoredTokenData(): void {
    localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    localStorage.removeItem(this.REGISTRATION_DATE_KEY);
    this.lastRegisteredToken = null;
    this.lastRegistrationDate = null;
    console.log('Cleared stored token data');
  }

  /**
   * Determine if token should be registered with backend
   */
  private shouldRegisterToken(newToken: string, forceUpdate: boolean): boolean {
    // Always register if forced
    if (forceUpdate) {
      console.log('Force update requested');
      return true;
    }
    
    // Register if no previous registration data
    if (!this.lastRegisteredToken || !this.lastRegistrationDate) {
      console.log('No previous registration found');
      return true;
    }
    
    // Register if token has changed
    if (this.lastRegisteredToken !== newToken) {
      console.log('Token has changed, need to register');
      return true;
    }
    
    // Register if too much time has passed (30 days)
    const timeDiff = Date.now() - this.lastRegistrationDate.getTime();
    if (timeDiff > this.TOKEN_REFRESH_INTERVAL) {
      const daysPassed = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
      console.log(`Token is ${daysPassed} days old, refreshing registration`);
      return true;
    }
    
    console.log('Token is current and recently registered');
    return false;
  }

  /**
   * Get token registration status for debugging
   */
  getTokenRegistrationStatus(): {
    hasToken: boolean;
    lastRegisteredToken: string | null;
    lastRegistrationDate: Date | null;
    daysSinceRegistration: number | null;
    needsRefresh: boolean;
  } {
    const daysSinceRegistration = this.lastRegistrationDate 
      ? Math.floor((Date.now() - this.lastRegistrationDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    
    const needsRefresh = this.lastRegistrationDate 
      ? (Date.now() - this.lastRegistrationDate.getTime()) > this.TOKEN_REFRESH_INTERVAL
      : true;

    return {
      hasToken: !!this.fcmToken,
      lastRegisteredToken: this.lastRegisteredToken,
      lastRegistrationDate: this.lastRegistrationDate,
      daysSinceRegistration,
      needsRefresh
    };
  }

  /**
   * Clear token data (call this on logout)
   */
  clearTokenData(): void {
    this.clearStoredTokenData();
    this.fcmToken = null;
    console.log('Cleared all notification token data');
  }

  // Get notification permission status
  async getPermissionStatus(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const result = await PushNotifications.checkPermissions();
      return result.receive;
    } else {
      return Notification.permission;
    }
  }
}