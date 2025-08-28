import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { BackendAuthService } from './services/backend-auth.service';
import { NotificationService } from './services/notification.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private router: Router,
    private backendAuthService: BackendAuthService,
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Initialize push notification service when app starts
    this.pushNotificationService.initializePushNotifications();
    
    // Initialize notification service when user is authenticated
    this.backendAuthService.currentUser$.subscribe(user => {
      if (user) {
        this.notificationService.requestPermission();
        this.notificationService.receiveMessage();
      }
    });
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
        // No token found, redirect to login immediately
        const currentUrl = this.router.url;
        if (currentUrl === '/' || currentUrl.includes('/tabs/')) {
          this.router.navigate(['/auth/login'], { replaceUrl: true });
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
    
    // Don't redirect if already on the correct page or not on login/root page
    if (currentUrl.includes('/tabs/') || currentUrl.includes('/onboarding')) {
      return;
    }
    
    // Only redirect from login page or root page
    if (currentUrl === '/' || currentUrl.includes('/auth/login')) {
      // Navigate to dashboard (onboarding temporarily disabled)
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
  }
}