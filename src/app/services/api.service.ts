import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// API Response Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  user: any;
  token: string;
  requiresTwoFactor?: boolean;
}

export interface RegisterResponse {
  user: any;
  token: string;
  message: string;
}

export interface TwoFactorResponse {
  success: boolean;
  message: string;
  token?: string;
}

// Growth Tracking Interfaces
export interface FeedRecordRequest {
  babyId: string;
  feedTypes: ('direct' | 'expressed' | 'formula')[];
  directFeedDetails?: {
    startTime: string;
    breastSide: 'left' | 'right' | 'both';
    duration: number;
    painLevel?: number;
  };
  expressedMilkDetails?: {
    quantity: number;
  };
  formulaDetails?: {
    quantity: number;
  };
  notes?: string;
}

export interface WeightRecordRequest {
  babyId: string;
  weight: number;
  height?: number;
  notes?: string;
}

export interface StoolRecordRequest {
  babyId: string;
  time: string;
  color: any;
  texture: any;
  size: any;
  peeCount?: number;
  poopCount?: number;
  notes?: string;
}

export interface PumpingRecordRequest {
  babyId: string;
  time: string;
  pumpingSide: 'left' | 'right' | 'both';
  totalOutput: number;
  duration?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface DiaperChangeRequest {
  babyId: string;
  time: string;
  type: 'pee' | 'poop' | 'both';
  wetness?: 'light' | 'medium' | 'heavy';
  notes?: string;
}

// Emotion Check-in Interface
export interface EmotionCheckinRequest {
  selectedStruggles: any[];
  selectedPositiveMoments: any[];
  selectedConcerningThoughts: any[];
  gratefulFor?: string;
  proudOfToday?: string;
  tomorrowGoal?: string;
  additionalNotes?: string;
}

// Chat Interfaces
export interface SendMessageRequest {
  message: string;
  attachments?: any[];
}

// Consultation Interface
export interface ConsultationRequest {
  expertId: string;
  scheduledAt: string;
  duration: number;
  topic: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.production ? 'https://api.naricare.app/api' : 'http://localhost:3000/api';
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load token from localStorage on service initialization
    const savedToken = localStorage.getItem('naricare_token');
    if (savedToken) {
      this.tokenSubject.next(savedToken);
    }
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    motherType?: 'pregnant' | 'new_mom';
    tier?: 'basic' | 'one-month' | 'three-month';
  }): Observable<ApiResponse<RegisterResponse>> {
    return this.http.post<ApiResponse<RegisterResponse>>(`${this.baseUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            this.setToken(response.data.token);
          }
        }),
        catchError(this.handleError)
      );
  }

  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            this.setToken(response.data.token);
          }
        }),
        catchError(this.handleError)
      );
  }

  enable2FA(method: 'email' = 'email'): Observable<ApiResponse<TwoFactorResponse>> {
    return this.http.post<ApiResponse<TwoFactorResponse>>(`${this.baseUrl}/auth/2fa/enable`, { method }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  verify2FA(email: string, otp: string): Observable<ApiResponse<TwoFactorResponse>> {
    return this.http.post<ApiResponse<TwoFactorResponse>>(`${this.baseUrl}/auth/verify-otp`, { email, otp })
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            this.setToken(response.data.token);
          }
        }),
        catchError(this.handleError)
      );
  }

  resendOTP(email: string): Observable<ApiResponse<TwoFactorResponse>> {
    return this.http.post<ApiResponse<TwoFactorResponse>>(`${this.baseUrl}/auth/resend-otp`, { email })
      .pipe(catchError(this.handleError));
  }

  disable2FA(otp: string): Observable<ApiResponse<TwoFactorResponse>> {
    return this.http.post<ApiResponse<TwoFactorResponse>>(`${this.baseUrl}/auth/2fa/disable`, { otp }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  refreshToken(): Observable<ApiResponse<{ token: string }>> {
    return this.http.post<ApiResponse<{ token: string }>>(`${this.baseUrl}/auth/refresh`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.success && response.data?.token) {
          this.setToken(response.data.token);
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.clearToken();
      }),
      catchError(this.handleError)
    );
  }

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  getUserProfile(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/users/profile`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateUserProfile(updates: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/users/profile`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateNotificationPreferences(preferences: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/users/notifications`, preferences, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // BABY MANAGEMENT ENDPOINTS
  // ============================================================================

  createBaby(babyData: {
    name: string;
    dateOfBirth: string;
    gender: 'male' | 'female';
    birthWeight: number;
    birthHeight: number;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/babies`, babyData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getUserBabies(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/babies`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getBabyById(babyId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/babies/${babyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateBaby(babyId: string, updates: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/babies/${babyId}`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  deleteBaby(babyId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/babies/${babyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // GROWTH TRACKING ENDPOINTS
  // ============================================================================

  createFeedRecord(feedData: FeedRecordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/growth-records`, feedData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getFeedRecords(babyId: string, limit: number = 20): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('babyId', babyId)
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/growth-records`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  createWeightRecord(weightData: WeightRecordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/weight-records`, weightData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getWeightRecords(babyId: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('babyId', babyId);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/weight-records`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  createStoolRecord(stoolData: StoolRecordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/stool-records`, stoolData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getStoolRecords(babyId: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('babyId', babyId);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/stool-records`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  createPumpingRecord(pumpingData: PumpingRecordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/pumping-records`, pumpingData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getPumpingRecords(babyId: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('babyId', babyId);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/pumping-records`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  createDiaperChangeRecord(diaperData: DiaperChangeRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/diaper-changes`, diaperData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getDiaperChangeRecords(babyId: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('babyId', babyId);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/diaper-changes`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getDailySummary(babyId: string, date?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('babyId', babyId);
    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/tracker/daily-summary`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getWeeklySummary(babyId: string, weekStart?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('babyId', babyId);
    if (weekStart) {
      params = params.set('weekStart', weekStart);
    }

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/tracker/weekly-summary`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // EMOTION CHECK-IN ENDPOINTS
  // ============================================================================

  createEmotionCheckin(checkinData: EmotionCheckinRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/emotions/checkins`, checkinData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getEmotionCheckins(limit: number = 10): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/emotions/checkins`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getEmotionSummary(period: '7d' | '30d' | '90d' = '30d'): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/emotions/summary`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // KNOWLEDGE BASE ENDPOINTS
  // ============================================================================

  getKnowledgeCategories(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/knowledge/categories`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getArticles(options?: {
    category?: string;
    featured?: boolean;
    limit?: number;
    page?: number;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.category) params = params.set('category', options.category);
    if (options?.featured !== undefined) params = params.set('featured', options.featured.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.page) params = params.set('page', options.page.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/knowledge/articles`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getArticleById(articleId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/knowledge/articles/${articleId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  searchArticles(query: string, options?: {
    category?: string;
    difficulty?: string;
    limit?: number;
  }): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('q', query);
    
    if (options?.category) params = params.set('category', options.category);
    if (options?.difficulty) params = params.set('difficulty', options.difficulty);
    if (options?.limit) params = params.set('limit', options.limit.toString());

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/knowledge/articles/search`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  bookmarkArticle(articleId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/knowledge/bookmarks`, { articleId }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  removeBookmark(articleId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/knowledge/bookmarks/${articleId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getUserBookmarks(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/knowledge/bookmarks`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // CHAT SYSTEM ENDPOINTS
  // ============================================================================

  getChatRooms(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/chat/rooms`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getChatRoom(roomId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/chat/rooms/${roomId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  joinChatRoom(roomId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chat/rooms/${roomId}/join`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  leaveChatRoom(roomId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chat/rooms/${roomId}/leave`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  sendMessage(roomId: string, messageData: SendMessageRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chat/rooms/${roomId}/messages`, messageData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getMessages(roomId: string, limit: number = 50, before?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (before) params = params.set('before', before);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/chat/rooms/${roomId}/messages`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // EXPERT SYSTEM ENDPOINTS
  // ============================================================================

  getExperts(options?: {
    specialty?: string;
    limit?: number;
    available?: boolean;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.specialty) params = params.set('specialty', options.specialty);
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.available !== undefined) params = params.set('available', options.available.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/experts`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getExpertById(expertId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/experts/${expertId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getExpertAvailability(expertId: string, date: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/experts/${expertId}/availability`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // CONSULTATION ENDPOINTS
  // ============================================================================

  bookConsultation(consultationData: ConsultationRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/consultations`, consultationData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getUserConsultations(status?: 'scheduled' | 'completed' | 'cancelled'): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/consultations`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getConsultationById(consultationId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/consultations/${consultationId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateConsultation(consultationId: string, updates: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/consultations/${consultationId}`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  cancelConsultation(consultationId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/consultations/${consultationId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // TIMELINE & MILESTONES ENDPOINTS
  // ============================================================================

  getTimelineItems(options?: {
    category?: string;
    weekStart?: number;
    weekEnd?: number;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.category) params = params.set('category', options.category);
    if (options?.weekStart !== undefined) params = params.set('weekStart', options.weekStart.toString());
    if (options?.weekEnd !== undefined) params = params.set('weekEnd', options.weekEnd.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/timeline/items`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getBabyTimeline(babyId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/timeline/baby/${babyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  markTimelineItemCompleted(babyId: string, timelineItemId: string, notes?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/timeline/baby/${babyId}/progress`, {
      timelineItemId,
      notes
    }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  unmarkTimelineItem(babyId: string, timelineItemId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/timeline/baby/${babyId}/progress/${timelineItemId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getMilestoneSummary(babyId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/timeline/baby/${babyId}/milestones`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  searchTimelineItems(searchTerm: string, options?: {
    category?: string;
    weekRange?: string;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams().set('q', searchTerm);
    
    if (options?.category) params = params.set('category', options.category);
    if (options?.weekRange) params = params.set('weekRange', options.weekRange);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/timeline/search`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // NOTIFICATION ENDPOINTS
  // ============================================================================

  sendPushNotification(notificationData: {
    title: string;
    body: string;
    type: string;
    data?: any;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/notifications/send`, notificationData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  scheduleNotification(notificationData: {
    title: string;
    body: string;
    type: string;
    scheduledFor: string;
    data?: any;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/notifications/schedule`, notificationData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getUserNotifications(options?: {
    limit?: number;
    unread?: boolean;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.unread !== undefined) params = params.set('unread', options.unread.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/notifications`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  markNotificationRead(notificationId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/notifications/${notificationId}/read`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  trackEvent(eventData: {
    eventType: string;
    eventData?: any;
    metadata?: any;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/analytics/events`, eventData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getDashboardAnalytics(period: '7d' | '30d' | '90d' = '7d'): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/dashboard`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getFeatureUsage(period: '7d' | '30d' | '90d' = '30d'): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/features`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/../health`)
      .pipe(catchError(this.handleError));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private setToken(token: string): void {
    localStorage.setItem('naricare_token', token);
    this.tokenSubject.next(token);
  }

  private clearToken(): void {
    localStorage.removeItem('naricare_token');
    this.tokenSubject.next(null);
  }

  private handleError = (error: any): Observable<never> => {
    console.error('API Error:', error);
    
    // Handle specific error cases
    if (error.status === 401) {
      // Unauthorized - clear token and redirect to login
      this.clearToken();
    }
    
    if (error.status === 403) {
      // Forbidden - user doesn't have permission
      console.warn('Access forbidden:', error.error?.message);
    }
    
    if (error.status === 429) {
      // Rate limited
      console.warn('Rate limit exceeded:', error.error?.message);
    }
    
    // Return user-friendly error message
    const errorMessage = error.error?.message || error.message || 'An unexpected error occurred';
    return throwError(() => new Error(errorMessage));
  };

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ============================================================================

  // Quick method to get user's complete data
  getUserCompleteData(): Observable<{
    profile: any;
    babies: any[];
    recentRecords: any[];
    notifications: any[];
  }> {
    return this.getUserProfile().pipe(
      map(profileResponse => {
        if (!profileResponse.success) {
          throw new Error('Failed to get user profile');
        }
        return profileResponse.data;
      }),
      // You could expand this to fetch additional data in parallel
      catchError(this.handleError)
    );
  }

  // Quick method to get baby's complete tracking data
  getBabyCompleteData(babyId: string): Observable<{
    baby: any;
    feedRecords: any[];
    weightRecords: any[];
    stoolRecords: any[];
    timeline: any;
    dailySummary: any;
  }> {
    // This would typically use forkJoin to fetch all data in parallel
    return this.getBabyById(babyId).pipe(
      map(response => {
        if (!response.success) {
          throw new Error('Failed to get baby data');
        }
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  // Quick method to create a complete feed log
  createCompleteFeedLog(feedData: FeedRecordRequest): Observable<ApiResponse<any>> {
    return this.createFeedRecord(feedData).pipe(
      tap(response => {
        if (response.success) {
          // Track analytics event
          this.trackEvent({
            eventType: 'feed_logged',
            eventData: {
              babyId: feedData.babyId,
              feedTypes: feedData.feedTypes,
              entryMethod: 'manual'
            }
          }).subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }
}