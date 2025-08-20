import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { BackendAuthService } from './services/backend-auth.service';
import { NotificationService } from './services/notification.service';

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
    private notificationService: NotificationService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Initialize notification service when app starts
    this.backendAuthService.currentUser$.subscribe(user => {
      if (user) {
        this.notificationService.requestPermission(user.uid);
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
        await StatusBar.setBackgroundColor({ color: '#e91e63' });
        await SplashScreen.hide();
      } catch (error) {
        console.log('Capacitor plugins not available:', error);
      }
    }
  }

  private async checkAuthAndRedirect() {
    try {
      // Wait a moment for BackendAuthService to initialize
      setTimeout(() => {
        const currentUser = this.backendAuthService.getCurrentUser();
        
        // If we have a current user, redirect appropriately
        if (currentUser) {
          this.navigateBasedOnUser(currentUser);
        }
      }, 100);

      // Subscribe to auth state changes for future auth status updates
      this.backendAuthService.currentUser$.subscribe(user => {
        // Only auto-redirect on login, not on logout
        if (user) {
          this.navigateBasedOnUser(user);
        }
      });
    } catch (error) {
      console.log('Auth check error:', error);
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