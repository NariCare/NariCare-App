import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { BackendAuthService } from './services/backend-auth.service';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { TimezoneService } from './services/timezone.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  private lastUserTimezone: string | null = null;

  constructor(
    private platform: Platform,
    private router: Router,
    private backendAuthService: BackendAuthService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
    private timezoneService: TimezoneService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Initialize push notification service when app starts
    this.pushNotificationService.initializePushNotifications();
    
    // Initialize timezone detection
    this.initializeTimezone();
    
    // Initialize notification service when user is authenticated
    this.backendAuthService.currentUser$.subscribe(user => {
      if (user) {
        this.notificationService.requestPermission();
        this.notificationService.receiveMessage();
        
        // Update user's timezone if not set or if it's different from detected
        this.updateUserTimezoneIfNeeded(user);
      }
    });
  }

  private initializeTimezone() {
    // Detect and log user's timezone on app start
    const detectedTimezone = this.timezoneService.getUserTimezone();
    console.log('App initialized with timezone:', detectedTimezone);
    
    // Store detected timezone in localStorage for quick access
    localStorage.setItem('detected_timezone', detectedTimezone);
  }

  private async updateUserTimezoneIfNeeded(user: any) {
    const detectedTimezone = this.timezoneService.getUserTimezone();
    
    // Prevent duplicate calls for the same user timezone state
    if (this.lastUserTimezone === (user.timezone || 'undefined')) {
      return;
    }
    
    this.lastUserTimezone = user.timezone || 'undefined';
    
    // Only auto-update timezone if:
    // 1. User doesn't have a timezone set at all AND
    // 2. We haven't already attempted an auto-update in this session AND
    // 3. User is not currently on the personal-info page (to avoid conflicts)
    const hasAttemptedUpdate = localStorage.getItem('timezone_auto_updated') === 'true';
    const currentUrl = this.router.url;
    const isOnPersonalInfoPage = currentUrl.includes('/personal-info');
    
    if (!user.timezone && !hasAttemptedUpdate && !isOnPersonalInfoPage) {
      try {
        console.log('Auto-updating user timezone to:', detectedTimezone);
        await this.backendAuthService.updateUserProfile({ 
          timezone: detectedTimezone 
        });
        console.log('User timezone auto-updated successfully');
        
        // Mark that we've attempted an auto-update to prevent repeated calls
        localStorage.setItem('timezone_auto_updated', 'true');
      } catch (error) {
        console.warn('Failed to auto-update user timezone:', error);
        // Still mark as attempted to avoid retrying repeatedly
        localStorage.setItem('timezone_auto_updated', 'true');
      }
    }
  }

  async initializeApp() {
    await this.platform.ready();
    
    // Check authentication status and redirect accordingly
    await this.checkAuthAndRedirect();
    
    // Only use Capacitor plugins if running on a device
    if (this.platform.is('capacitor')) {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');
        
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#8383ed' });
        await SplashScreen.hide();
      } catch (error) {
        console.log('Capacitor plugins not available:', error);
      }
    }
  }

  private async checkAuthAndRedirect() {
    try {
      // Check localStorage directly for immediate token verification
      const hasToken = localStorage.getItem('naricare_token');
      
      if (hasToken) {
        // Wait for BackendAuthService to initialize and validate the token
        const checkAuth = async () => {
          const currentUser = this.backendAuthService.getCurrentUser();
          if (currentUser) {
            this.navigateBasedOnUser(currentUser);
          } else {
            // Wait a bit longer for initialization
            setTimeout(() => {
              const user = this.backendAuthService.getCurrentUser();
              if (user) {
                this.navigateBasedOnUser(user);
              } else {
                // Token exists but user not loaded, redirect to login
                this.router.navigate(['/auth/login'], { replaceUrl: true });
              }
            }, 500);
          }
        };
        
        await checkAuth();
      } else {
        // No token found, redirect to login only if not on auth pages
        const currentUrl = this.router.url;
        const windowUrl = window.location.href;
        const actualPath = window.location.pathname;
        const isAuthPage = actualPath.includes('/auth/');
        
        console.log('No token found - router currentUrl:', currentUrl);
        console.log('No token found - actual path:', actualPath);
        console.log('No token found - windowUrl:', windowUrl);
        console.log('No token found - isAuthPage:', isAuthPage);
        
        // Don't redirect if already on auth pages (login, register, forgot-password, reset-password)
        if (!isAuthPage && (actualPath === '/' || actualPath.includes('/tabs/'))) {
          console.log('Redirecting to login because not on auth page');
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        } else {
          console.log('Not redirecting - staying on current page');
        }
      }

      // Subscribe to auth state changes for future auth status updates
      this.backendAuthService.currentUser$.subscribe(user => {
        // Only auto-redirect on login, not on logout
        if (user) {
          this.navigateBasedOnUser(user);
        }
      });
    } catch (error) {
      console.log('Auth check error:', error);
      // On error, redirect to login
      this.router.navigate(['/auth/login'], { replaceUrl: true });
    }
  }

  private navigateBasedOnUser(user: any) {
    const currentUrl = this.router.url;
    
    // Don't redirect if already on legitimate app pages
    if (currentUrl.includes('/tabs/') || 
        currentUrl.includes('/onboarding') ||
        currentUrl.includes('/personal-info') ||
        currentUrl.includes('/expert-notes') ||
        currentUrl.includes('/expert-consultations') ||
        currentUrl.includes('/consultation-detail') ||
        currentUrl.includes('/video-call')) {
      return;
    }
    
    // Only redirect from login page or root page
    if (currentUrl === '/' || currentUrl.includes('/auth/login')) {
      // Navigate to dashboard (onboarding temporarily disabled)
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
  }
}