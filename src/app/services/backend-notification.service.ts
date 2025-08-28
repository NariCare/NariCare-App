import { Injectable } from '@angular/core';
import { ApiService, ApiResponse } from './api.service';
import { Observable } from 'rxjs';
import { HttpParams, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Notification Interfaces
export interface NotificationResponse {
  id: string;
  user_id: string;
  notification_type: 'weight_reminder' | 'consultation_reminder' | 'article_update' | 'feature_update' | 'expert_message' | 'group_message' | 'general';
  title: string;
  body: string;
  scheduled_time: string;
  is_sent: boolean;
  sent_at?: string;
  delivery_status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
}

export interface NotificationPreferences {
  articleUpdates: boolean;
  callReminders: boolean;
  groupMessages: boolean;
  growthReminders: boolean;
  expertMessages: boolean;
}

export interface RegisterTokenRequest {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface SendNotificationRequest {
  userIds?: string[];
  title: string;
  body: string;
  type: string;
  scheduledTime?: string;
}

export interface NotificationStatsResponse {
  totalSent: number;
  totalScheduled: number;
  totalFailed: number;
  byType: Record<string, number>;
  period: {
    startDate: string;
    endDate: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BackendNotificationService {
  private readonly baseUrl = environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api');

  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  /**
   * Register push notification token
   */
  registerPushToken(tokenData: RegisterTokenRequest): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/notifications/register-token`,
      tokenData,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get user's notifications with optional filtering
   */
  getMyNotifications(options: {
    page?: number;
    limit?: number;
    type?: string;
    sent?: boolean;
  } = {}): Observable<ApiResponse<NotificationResponse[]>> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.type) params = params.set('type', options.type);
    if (options.sent !== undefined) params = params.set('sent', options.sent.toString());

    return this.http.get<ApiResponse<NotificationResponse[]>>(
      `${this.baseUrl}/notifications/my-notifications`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Update user notification preferences
   */
  updateNotificationPreferences(preferences: NotificationPreferences): Observable<ApiResponse<{ message: string }>> {
    return this.http.put<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/notifications/preferences`,
      preferences,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get user notification preferences
   */
  getNotificationPreferences(): Observable<ApiResponse<NotificationPreferences>> {
    return this.http.get<ApiResponse<NotificationPreferences>>(
      `${this.baseUrl}/notifications/preferences`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  // ============================================================================
  // ADMIN ENDPOINTS (if user has admin role)
  // ============================================================================

  /**
   * Send notification to specific users or all users (Admin only)
   */
  sendNotification(notificationData: SendNotificationRequest): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/notifications/send`,
      notificationData,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get scheduled notifications (Admin only)
   */
  getScheduledNotifications(options: {
    page?: number;
    limit?: number;
    type?: string;
    sent?: boolean;
  } = {}): Observable<ApiResponse<NotificationResponse[]>> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.type) params = params.set('type', options.type);
    if (options.sent !== undefined) params = params.set('sent', options.sent.toString());

    return this.http.get<ApiResponse<NotificationResponse[]>>(
      `${this.baseUrl}/notifications/scheduled`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get notification statistics (Admin only)
   */
  getNotificationStats(options: {
    startDate?: string;
    endDate?: string;
    type?: string;
  } = {}): Observable<ApiResponse<NotificationStatsResponse>> {
    let params = new HttpParams();
    
    if (options.startDate) params = params.set('startDate', options.startDate);
    if (options.endDate) params = params.set('endDate', options.endDate);
    if (options.type) params = params.set('type', options.type);

    return this.http.get<ApiResponse<NotificationStatsResponse>>(
      `${this.baseUrl}/notifications/stats`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getAuthHeaders(): HttpHeaders {
    const token = this.apiService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Get notification type display name
   */
  getNotificationTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      'weight_reminder': 'Weight Reminder',
      'consultation_reminder': 'Consultation Reminder',
      'article_update': 'New Article',
      'feature_update': 'Feature Update',
      'expert_message': 'Expert Message',
      'group_message': 'Group Message',
      'general': 'General Notification'
    };
    
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get notification type icon
   */
  getNotificationTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'weight_reminder': 'scale-outline',
      'consultation_reminder': 'calendar-outline',
      'article_update': 'document-text-outline',
      'feature_update': 'sparkles-outline',
      'expert_message': 'person-circle-outline',
      'group_message': 'chatbubbles-outline',
      'general': 'notifications-outline'
    };
    
    return iconMap[type] || 'notifications-outline';
  }

  /**
   * Format notification time for display
   */
  formatNotificationTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}