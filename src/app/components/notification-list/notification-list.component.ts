import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { NotificationResponse } from '../../services/backend-notification.service';
import { NotificationPreferencesComponent } from '../notification-preferences/notification-preferences.component';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
})
export class NotificationListComponent implements OnInit, OnDestroy {
  notifications: NotificationResponse[] = [];
  isLoading = false;
  isRefreshing = false;
  hasMoreNotifications = true;
  currentPage = 1;
  pageSize = 20;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.subscribeToNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToNotifications() {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  loadNotifications() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.notificationService.loadNotifications({
      page: this.currentPage,
      limit: this.pageSize
    }).subscribe({
      next: (result) => {
        this.hasMoreNotifications = result.hasMore;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
        this.isLoading = false;
      }
    });
  }

  async refreshNotifications(event?: any) {
    this.isRefreshing = true;
    this.currentPage = 1;
    this.hasMoreNotifications = true;

    this.notificationService.loadNotifications({
      page: 1,
      limit: this.pageSize,
      append: false
    }).subscribe({
      next: (result) => {
        this.hasMoreNotifications = result.hasMore;
        this.isRefreshing = false;
        if (event) {
          event.target.complete();
        }
      },
      error: (error) => {
        console.error('Failed to refresh notifications:', error);
        this.isRefreshing = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  loadMoreNotifications(event: any) {
    if (!this.hasMoreNotifications || this.isLoading) {
      event.target.complete();
      return;
    }

    this.isLoading = true;
    this.currentPage++;
    
    // Load more notifications and append to existing list
    this.notificationService.loadNotifications({
      page: this.currentPage,
      limit: this.pageSize,
      append: true
    }).subscribe({
      next: (result) => {
        this.hasMoreNotifications = result.hasMore;
        this.isLoading = false;
        event.target.complete();
        
        // If no new notifications were loaded, show a message
        if (result.newCount === 0) {
          console.log('No more notifications to load');
        }
      },
      error: (error) => {
        console.error('Failed to load more notifications:', error);
        this.isLoading = false;
        this.currentPage--; // Reset page on error
        event.target.complete();
      }
    });
  }

  getNotificationIcon(type: string): string {
    const info = this.notificationService.getNotificationTypeInfo(type);
    return info.icon;
  }

  getNotificationTypeDisplayName(type: string): string {
    const info = this.notificationService.getNotificationTypeInfo(type);
    return info.displayName;
  }

  formatTime(timestamp: string): string {
    return this.notificationService.formatNotificationTime(timestamp);
  }

  getNotificationColor(type: string): string {
    const colorMap: Record<string, string> = {
      'weight_reminder': 'warning',
      'consultation_reminder': 'success',
      'article_update': 'primary',
      'feature_update': 'secondary',
      'expert_message': 'tertiary',
      'group_message': 'secondary',
      'general': 'medium'
    };

    return colorMap[type] || 'medium';
  }

  onNotificationClick(notification: NotificationResponse) {
    // Handle notification click - could navigate to specific screens
    // based on the notification type
    console.log('Notification clicked:', notification);
    
    // You could add navigation logic here based on the notification type
    // For example:
    // if (notification.notification_type === 'consultation_reminder') {
    //   this.router.navigate(['/tabs/dashboard']);
    // }
  }

  async openPreferences() {
    const modal = await this.modalController.create({
      component: NotificationPreferencesComponent,
      presentingElement: await this.modalController.getTop()
    });

    await modal.present();
  }

  close() {
    this.modalController.dismiss();
  }

  trackByNotificationId(index: number, notification: NotificationResponse): string {
    return notification.id;
  }

  getEmptyStateMessage(): string {
    return 'No notifications yet. When you receive notifications, they will appear here.';
  }

  getEmptyStateIcon(): string {
    return 'notifications-outline';
  }
}