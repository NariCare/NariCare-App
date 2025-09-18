import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// API Response Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    type?: string;
    value?: any;
    msg: string;
    path: string;
    location?: string;
  }>;
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

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// Growth Tracking Interfaces
export interface FeedRecordRequest {
  babyId: string;
  recordDate?: string; // Optional, defaults to today
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
  date?: string; // ISO date string for when the measurement was taken
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
  recordDate?: string; // Optional, defaults to today
  recordTime?: string; // Optional, defaults to current time
  changeType: 'pee' | 'poop' | 'both';
  wetnessLevel?: 'light' | 'medium' | 'heavy';
  notes?: string;
  enteredViaVoice?: boolean;
}

export interface DiaperChangeRecord {
  id: string;
  baby_id: string;
  recorded_by: string;
  record_date: string;
  record_time: string;
  change_type: 'pee' | 'poop' | 'both';
  wetness_level?: 'light' | 'medium' | 'heavy';
  notes?: string;
  entered_via_voice: boolean;
  created_at: string;
  updated_at: string;
  baby_name: string;
  first_name: string;
  last_name: string;
}

export interface DiaperChangeStats {
  total_changes: number;
  pee_only_changes: number;
  poop_only_changes: number;
  both_changes: number;
  light_wetness: number;
  medium_wetness: number;
  heavy_wetness: number;
  period: {
    startDate: string;
    endDate: string;
  };
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

export interface CreateRoomRequest {
  name: string;
  description: string;
  roomType: 'general' | 'consultation';
  topic?: string;
  isPrivate: boolean;
  maxParticipants: number;
  participants?: string[]; // User IDs to add as initial participants
}

export interface SearchUsersResponse {
  users: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Consultation Interfaces
export interface ConsultationRequest {
  expertId: string;
  scheduledAt: string;
  topic: string;
  notes?: string;
  durationType?: 'scheduled';
}

export interface ConsultationResponse {
  id: string;
  user_id: string;
  expert_id: string;
  consultation_type: 'scheduled' | 'on-demand';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  actual_start_time?: string;
  actual_end_time?: string;
  topic: string;
  notes?: string;
  meeting_link?: string;
  jitsi_room_token?: string;
  expert_notes?: string;
  user_rating?: number;
  user_feedback?: string;
  follow_up_required: boolean;
  created_at: string;
  updated_at: string;
  // Timezone information
  user_timezone?: string;
  expert_timezone?: string;
  user_current_timezone?: string;
  expert_current_timezone?: string;
  // User information
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  // Expert information
  expert_first_name?: string;
  expert_last_name?: string;
  expert_email?: string;
  expert_credentials?: string;
  expert_rating?: number;
  expert_user_id?: string;
}

export interface ConsultationUpdateRequest {
  scheduledAt?: string;
  topic?: string;
  notes?: string;
  userRating?: number;
  userFeedback?: string;
}

export interface ConsultationStatsResponse {
  overview: {
    total_consultations: number;
    completed_consultations: number;
    cancelled_consultations: number;
    scheduled_consultations: number;
    average_rating: number;
    avg_duration_minutes: number;
  };
  topTopics: Array<{
    topic: string;
    count: number;
  }>;
  expertPerformance?: {
    avg_rating: number;
    positive_ratings: number;
    negative_ratings: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

// Additional consultation interfaces from backend documentation
export interface ExpertResponse {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  credentials?: string;
  specialties: string[];
  bio?: string;
  profile_image?: string;
  years_of_experience?: number;
  rating: number;
  total_consultations: number;
  pricing_per_session?: number;
  available_from?: string;
  available_to?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  expert_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  consultation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateAvailabilityRequest {
  availability: {
    dayOfWeek: number;    // 0=Sunday, 1=Monday, ..., 6=Saturday
    startTime: string;    // HH:MM format (24-hour)
    endTime: string;      // HH:MM format (24-hour)
    isAvailable: boolean; // boolean
  }[];
}

export interface CreateConsultationRequest {
  expertId: string;
  scheduledAt: string;
  topic: string;
  notes?: string;
  consultation_type?: 'scheduled' | 'on-demand';
  meeting_link?: string;
}

export interface UpdateConsultationRequest {
  scheduled_at?: string;
  topic?: string;
  notes?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  expert_notes?: string;
  user_rating?: number;
  user_feedback?: string;
  follow_up_required?: boolean;
  actual_start_time?: string;
  actual_end_time?: string;
}

export interface RescheduleConsultationRequest {
  new_scheduled_at: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api');
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
    whatsappNumber?: string;
    motherType?: 'pregnant' | 'new_mom';
    dueDate?: string;
    birthDate?: string;
    babyGender?: 'male' | 'female' | 'other';
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

  forgotPassword(email: string): Observable<ApiResponse<ForgotPasswordResponse>> {
    return this.http.post<ApiResponse<ForgotPasswordResponse>>(`${this.baseUrl}/auth/request-password-reset`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<ApiResponse<ResetPasswordResponse>> {
    return this.http.post<ApiResponse<ResetPasswordResponse>>(`${this.baseUrl}/auth/reset-password`, { 
      token, 
      newPassword, 
      confirmPassword 
    }).pipe(catchError(this.handleError));
  }

  validateResetToken(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/auth/validate-reset-token`, { token })
      .pipe(catchError(this.handleError));
  }

  resendOTP(email: string): Observable<ApiResponse<TwoFactorResponse>> {
    return this.http.post<ApiResponse<TwoFactorResponse>>(`${this.baseUrl}/auth/resend-otp`, { email })
      .pipe(catchError(this.handleError));
  }

  socialAuth(socialAuthData: {
    provider: 'google' | 'facebook';
    accessToken: string;
    idToken: string; // Preferred for security
  }): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/social`, socialAuthData)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            this.setToken(response.data.token);
          }
        }),
        catchError(this.handleError)
      );
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
        this.clearUserDataFromStorage();
      }),
      catchError((error) => {
        // Even if the logout API call fails, clear local data
        this.clearUserDataFromStorage();
        return this.handleError(error);
      })
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

  searchUsers(query?: string, limit: number = 20): Observable<ApiResponse<SearchUsersResponse>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (query) params = params.set('q', query);

    return this.http.get<ApiResponse<SearchUsersResponse>>(`${this.baseUrl}/users/search`, {
      headers: this.getAuthHeaders(),
      params
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
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/feed`, feedData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getFeedRecords(babyId: string, limit: number = 20): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/recent/${babyId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  createWeightRecord(weightData: WeightRecordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/tracker/weight`, weightData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getWeightRecords(babyId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/tracker/weight/${babyId}`, {
      headers: this.getAuthHeaders()
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

  // ============================================================================
  // DIAPER CHANGE ENDPOINTS
  // ============================================================================

  createDiaperChange(diaperData: DiaperChangeRequest): Observable<ApiResponse<DiaperChangeRecord>> {
    return this.http.post<ApiResponse<DiaperChangeRecord>>(`${this.baseUrl}/diaper-changes`, diaperData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getDiaperChanges(babyId: string, options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    changeType?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Observable<ApiResponse<DiaperChangeRecord[]>> {
    let params = new HttpParams();
    
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.startDate) params = params.set('startDate', options.startDate);
    if (options?.endDate) params = params.set('endDate', options.endDate);
    if (options?.changeType) params = params.set('changeType', options.changeType);
    if (options?.sortBy) params = params.set('sortBy', options.sortBy);
    if (options?.sortOrder) params = params.set('sortOrder', options.sortOrder);

    return this.http.get<ApiResponse<DiaperChangeRecord[]>>(`${this.baseUrl}/diaper-changes/baby/${babyId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getDiaperChange(id: string): Observable<ApiResponse<DiaperChangeRecord>> {
    return this.http.get<ApiResponse<DiaperChangeRecord>>(`${this.baseUrl}/diaper-changes/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateDiaperChange(id: string, diaperData: Partial<DiaperChangeRequest>): Observable<ApiResponse<DiaperChangeRecord>> {
    return this.http.put<ApiResponse<DiaperChangeRecord>>(`${this.baseUrl}/diaper-changes/${id}`, diaperData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  deleteDiaperChange(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/diaper-changes/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getDiaperChangeStats(babyId: string, startDate?: string, endDate?: string): Observable<ApiResponse<DiaperChangeStats>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ApiResponse<DiaperChangeStats>>(`${this.baseUrl}/diaper-changes/baby/${babyId}/stats`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getRecentDiaperChanges(babyId: string, limit: number = 5): Observable<ApiResponse<DiaperChangeRecord[]>> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ApiResponse<DiaperChangeRecord[]>>(`${this.baseUrl}/diaper-changes/baby/${babyId}/recent`, {
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
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/chat/rooms/${roomId}/join`;
    
    console.log('Joining chat room:', {
      roomId,
      url,
      headers: headers.keys().map(key => ({ key, value: headers.get(key) })),
      hasAuthHeader: headers.has('Authorization'),
      authValue: headers.get('Authorization')?.substring(0, 20) + '...'
    });
    
    return this.http.post<ApiResponse<any>>(url, {}, {
      headers
    }).pipe(
      tap(response => console.log('Join room response:', response)),
      catchError(error => {
        console.error('Join room error:', error);
        return this.handleError(error);
      })
    );
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

  createChatRoom(roomData: CreateRoomRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chat/rooms`, roomData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // EXPERT SYSTEM ENDPOINTS
  // ============================================================================

  getExperts(options?: {
    specialty?: string;
    limit?: number;
    available?: boolean;
  }): Observable<ApiResponse<ExpertResponse[]>> {
    let params = new HttpParams();
    
    if (options?.specialty) params = params.set('specialty', options.specialty);
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.available !== undefined) params = params.set('available', options.available.toString());

    console.log('Getting experts from /experts endpoint');

    return this.http.get<ApiResponse<ExpertResponse[]>>(`${this.baseUrl}/experts`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getExpertById(expertId: string): Observable<ApiResponse<ExpertResponse>> {
    return this.http.get<ApiResponse<ExpertResponse>>(`${this.baseUrl}/experts/${expertId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getExpertAvailability(expertId: string, date: string): Observable<ApiResponse<AvailabilitySlot[]>> {
    const params = new HttpParams().set('date', date);

    return this.http.get<ApiResponse<AvailabilitySlot[]>>(`${this.baseUrl}/experts/${expertId}/availability`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getMyExpertAvailability(): Observable<ApiResponse<AvailabilitySlot[]>> {
    return this.http.get<ApiResponse<AvailabilitySlot[]>>(`${this.baseUrl}/experts/profile/me/availability`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateExpertAvailability(availabilityData: UpdateAvailabilityRequest): Observable<ApiResponse<{ message: string }>> {
    return this.http.put<ApiResponse<{ message: string }>>(`${this.baseUrl}/experts/profile/me/availability`, availabilityData, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // ============================================================================
  // CONSULTATION ENDPOINTS
  // ============================================================================

  // Consultation management
  getUserConsultations(status?: 'scheduled' | 'completed' | 'cancelled', upcoming?: boolean, page?: number, limit?: number): Observable<ApiResponse<ConsultationResponse[]>> {
    let params = new HttpParams();
    
    if (status) params = params.set('status', status);
    if (upcoming !== undefined) params = params.set('upcoming', upcoming.toString());
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());

    console.log('Getting user consultations from /consultations/my-consultations endpoint');
    
    return this.http.get<ApiResponse<ConsultationResponse[]>>(`${this.baseUrl}/consultations/my-consultations`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getConsultationById(consultationId: string): Observable<ApiResponse<ConsultationResponse>> {
    return this.http.get<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations/${consultationId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  createConsultation(consultation: CreateConsultationRequest): Observable<ApiResponse<ConsultationResponse>> {
    console.log('Creating consultation with request:', consultation);
    
    return this.http.post<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations`, consultation, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateConsultation(consultationId: string, updates: UpdateConsultationRequest): Observable<ApiResponse<ConsultationResponse>> {
    return this.http.put<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations/${consultationId}`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  cancelConsultation(consultationId: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/consultations/${consultationId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  rescheduleConsultation(consultationId: string, reschedule: RescheduleConsultationRequest): Observable<ApiResponse<ConsultationResponse>> {
    return this.http.put<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations/${consultationId}/reschedule`, reschedule, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Expert consultation management
  getExpertConsultations(status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled', upcoming?: boolean, page?: number, limit?: number): Observable<ApiResponse<ConsultationResponse[]>> {
    let params = new HttpParams();
    
    if (status) params = params.set('status', status);
    if (upcoming !== undefined) params = params.set('upcoming', upcoming.toString());
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());

    console.log('Getting expert consultations from /consultations/expert/my-consultations endpoint');
    
    return this.http.get<ApiResponse<ConsultationResponse[]>>(`${this.baseUrl}/consultations/expert/my-consultations`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  // Start consultation - changes status from scheduled to in_progress
  startConsultation(consultationId: string): Observable<ApiResponse<ConsultationResponse>> {
    return this.http.put<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations/${consultationId}/start`, 
      {}, 
      {
        headers: this.getAuthHeaders()
      }
    ).pipe(catchError(this.handleError));
  }

  // Complete consultation - changes status from in_progress to completed
  completeConsultation(consultationId: string, expertNotes: string, followUpRequired: boolean): Observable<ApiResponse<ConsultationResponse>> {
    return this.http.put<ApiResponse<ConsultationResponse>>(`${this.baseUrl}/consultations/${consultationId}/complete`, 
      { 
        expertNotes: expertNotes,
        followUpRequired: followUpRequired
      }, 
      {
        headers: this.getAuthHeaders()
      }
    ).pipe(catchError(this.handleError));
  }

  getConsultationStats(period?: '7d' | '30d' | '90d'): Observable<ApiResponse<ConsultationStatsResponse>> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);

    return this.http.get<ApiResponse<ConsultationStatsResponse>>(`${this.baseUrl}/consultations/stats`, {
      headers: this.getAuthHeaders(),
      params
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

  getVersion(): Observable<ApiResponse<{ version: string; isBeta: boolean; environment: string }>> {
    return this.http.get<ApiResponse<{ version: string; isBeta: boolean; environment: string }>>(`${this.baseUrl}/version`)
      .pipe(catchError(this.handleError));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenSubject.value;
    console.log('Auth headers debug:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 10) + '...'
    });
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

  // Public method to clear all user data (for use by other services)
  public clearAllUserData(): void {
    this.clearUserDataFromStorage();
  }

  // Clear all user-related data from localStorage
  private clearUserDataFromStorage(): void {
    // Clear authentication token
    localStorage.removeItem('naricare_token');
    
    // Clear chatbot settings (these are user preferences)
    localStorage.removeItem('speechRate');
    localStorage.removeItem('speechPitch');
    localStorage.removeItem('naturalSpeechEnabled');
    localStorage.removeItem('autoSpeakEnabled');
    
    // Clear notification token data
    localStorage.removeItem('fcm_last_token');
    localStorage.removeItem('fcm_last_registration');
    
    // Clear onboarding form data
    localStorage.removeItem('onboarding_form_data');
    
    // Clear any other user-specific data keys
    // Note: We could also clear all localStorage, but that might remove non-app data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('naricare_') || key.startsWith('speech') || key.includes('user_') || key.includes('onboarding'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
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
    
    // Extract error message from API response
    let errorMessage = 'An unexpected error occurred';
    
    console.log('Full error object:', error);
    console.log('error.error:', error.error);
    console.log('error.status:', error.status);
    
    if (error.error) {
      // Check for API response structure - prioritize 'error' field first since that's what your API uses
      if (error.error.error) {
        // API error format: { success: false, error: "Error message" }
        errorMessage = error.error.error;
      } else if (error.error.message) {
        // Alternative API error format: { success: false, message: "Error message" }
        errorMessage = error.error.message;
      } else if (typeof error.error === 'string') {
        // Direct string error
        errorMessage = error.error;
      } else if (error.error.errors && Array.isArray(error.error.errors)) {
        // Validation errors array: { errors: [{ message: "Field error" }] }
        const firstError = error.error.errors[0];
        errorMessage = firstError.message || firstError.msg || JSON.stringify(firstError);
      } else if (error.message) {
        // Fallback to HTTP error message
        errorMessage = error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle network errors - only override if we don't have a specific error message
    if (error.status === 0 && errorMessage === 'An unexpected error occurred') {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.status === 404 && errorMessage === 'An unexpected error occurred') {
      errorMessage = 'The requested resource was not found.';
    }
    
    // Don't override 500 errors if we already extracted a specific error message
    
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
  // CHATBOT ENDPOINTS
  // ============================================================================

  startChatbotConversation(data: {
    babyAgeWeeks?: number;
    context?: {
      breastfeedingGoals?: string;
      previousChallenges?: string[];
      currentConcerns?: string[];
      recentChallenges?: string[];
    };
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chatbot/conversation`, data, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  sendChatbotMessage(conversationId: string, message: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chatbot/conversation/${conversationId}/message`, 
      { message }, 
      {
        headers: this.getAuthHeaders()
      }
    ).pipe(catchError(this.handleError));
  }

  getChatbotMessages(conversationId: string, options?: {
    limit?: number;
    offset?: number;
    order?: 'ASC' | 'DESC';
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.offset) params = params.set('offset', options.offset.toString());
    if (options?.order) params = params.set('order', options.order);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/chatbot/conversation/${conversationId}/messages`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getChatbotConversations(options?: {
    limit?: number;
    offset?: number;
    isActive?: 'true' | 'false' | 'all';
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.offset) params = params.set('offset', options.offset.toString());
    if (options?.isActive) params = params.set('isActive', options.isActive);

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/chatbot/conversations`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  updateChatbotConversation(conversationId: string, data: {
    babyAgeWeeks?: number;
    context?: {
      breastfeedingGoals?: string;
      previousChallenges?: string[];
      currentConcerns?: string[];
      recentChallenges?: string[];
    };
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/chatbot/conversation/${conversationId}`, data, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  endChatbotConversation(conversationId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/chatbot/conversation/${conversationId}/end`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  searchChatbotConversations(query: string, options?: {
    limit?: number;
    offset?: number;
  }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams().set('q', query);
    
    if (options?.limit) params = params.set('limit', options.limit.toString());
    if (options?.offset) params = params.set('offset', options.offset.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/chatbot/search`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
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

  // ============================================================================
  // ONBOARDING ENDPOINTS
  // ============================================================================

  getOnboardingSchema(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/onboarding/schema`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getOnboardingData(includeExpertNotes: boolean = false): Observable<ApiResponse<any>> {
    const params = includeExpertNotes ? new HttpParams().set('includeExpertNotes', 'true') : new HttpParams();
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/onboarding/data`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  saveOnboardingData(data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/onboarding/data`, data, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  completeOnboarding(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/onboarding/complete`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getOnboardingStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/onboarding/status`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  syncOnboardingData(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/onboarding/sync`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  // Expert-only onboarding endpoints
  getUserOnboardingData(userId: string, includeExpertNotes: boolean = false): Observable<ApiResponse<any>> {
    const params = includeExpertNotes ? new HttpParams().set('includeExpertNotes', 'true') : new HttpParams();
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/onboarding/data/${userId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  updateExpertNotes(userId: string, notes: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/onboarding/expert-notes/${userId}`, { notes }, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  getOnboardingSummary(userId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/onboarding/summary/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }
}
