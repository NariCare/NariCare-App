import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    // Initialize notification service when app starts
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.notificationService.requestPermission(user.uid);
        this.notificationService.receiveMessage();
      }
    });
  }

  async initializeApp() {
    await this.platform.ready();
    
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
}