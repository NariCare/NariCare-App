import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { 
  EmotionCheckinRecord, 
  EmotionalStruggle, 
  PositiveMoment, 
  ConcerningThought,
  EmotionCheckinSummary
} from '../models/emotion-checkin.model';

export interface CreateEmotionCheckinRequest {
  selectedStruggles: string[];
  selectedPositiveMoments: string[];
  selectedConcerningThoughts: string[];
  gratefulFor: string | null;
  proudOfToday: string | null;
  tomorrowGoal: string | null;
  additionalNotes: string | null;
}

export interface EmotionCheckinOptions {
  struggles: EmotionOption[];
  positiveMoments: EmotionOption[];
  concerningThoughts: ConcerningThoughtOption[];
}

export interface EmotionOption {
  id: string;
  text: string;
  emoji: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface ConcerningThoughtOption extends EmotionOption {
  severity: 'moderate' | 'high' | 'critical';
}

export interface BackendEmotionRecord {
  id: string;
  user_id: string;
  record_date: string;
  record_time: string;
  selected_struggles: string[];
  selected_positive_moments: string[];
  selected_concerning_thoughts: string[];
  grateful_for?: string;
  proud_of_today?: string;
  tomorrow_goal?: string;
  additional_notes?: string;
  crisis_alert_triggered: boolean;
  crisis_support_contacted: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmotionTrends {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overview: {
    totalCheckins: number;
    averageStruggleItems: number;
    averagePositiveItems: number;
    crisisAlertsTriggered: number;
    mostCommonStruggle: string;
    mostCommonPositive: string;
  };
  dailyTrends: DailyTrend[];
  categoryBreakdown: {
    struggles: Record<string, number>;
    positives: Record<string, number>;
  };
  wellnessScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
}

export interface DailyTrend {
  date: string;
  strugglesCount: number;
  positiveCount: number;
  concerningCount: number;
  overallMood: 'positive' | 'neutral' | 'struggling' | 'high_concern';
  wellnessScore: number;
}

export interface CrisisIntervention {
  triggered: boolean;
  message: string;
  resources: CrisisResource[];
}

export interface CrisisResource {
  type: 'hotline' | 'website' | 'app' | 'text';
  name: string;
  phone?: string;
  website?: string;
  description: string;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class BackendEmotionService {
  private readonly baseUrl = environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api');

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  private getAuthHeaders() {
    const token = this.apiService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get check-in options (struggles, positive moments, concerning thoughts)
   */
  getCheckinOptions(): Observable<EmotionCheckinOptions> {
    return this.http.get<{ success: boolean; data: EmotionCheckinOptions }>(
      `${this.baseUrl}/emotions/options`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response?.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to get check-in options');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create a new emotion check-in record
   */
  createEmotionCheckin(data: CreateEmotionCheckinRequest): Observable<{
    checkin: BackendEmotionRecord;
    crisisIntervention?: CrisisIntervention;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: BackendEmotionRecord;
      crisisIntervention?: CrisisIntervention;
    }>(
      `${this.baseUrl}/emotions/checkin`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response?.success && response.data) {
          return {
            checkin: response.data,
            crisisIntervention: response.crisisIntervention
          };
        }
        throw new Error(response?.message || 'Failed to create emotion check-in');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get emotion check-in records with pagination and filtering
   */
  getEmotionCheckins(options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<{
    checkins: EmotionCheckinRecord[];
    pagination: PaginationResponse;
  }> {
    
    let params = new HttpParams();
    
    if (options?.page) {
      params = params.set('page', options.page.toString());
    }
    if (options?.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options?.startDate) {
      params = params.set('startDate', options.startDate);
    }
    if (options?.endDate) {
      params = params.set('endDate', options.endDate);
    }
    if (options?.sortBy) {
      params = params.set('sortBy', options.sortBy);
    }
    if (options?.sortOrder) {
      params = params.set('sortOrder', options.sortOrder);
    }

    const url = `${this.baseUrl}/emotions/checkins`;
    const headers = this.getAuthHeaders();
    
    return this.http.get<{
      success: boolean;
      data: BackendEmotionRecord[];
      pagination: PaginationResponse;
    }>(url, { headers, params }).pipe(
      map(response => {
        if (response?.success && response.data) {
          return {
            checkins: response.data.map(record => this.transformBackendRecord(record)),
            pagination: response.pagination
          };
        }
        return { checkins: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get emotion trends and analytics
   */
  getEmotionTrends(days: number = 30): Observable<EmotionTrends> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<{
      success: boolean;
      data: EmotionTrends;
    }>(
      `${this.baseUrl}/emotions/trends`,
      { headers: this.getAuthHeaders(), params }
    ).pipe(
      map(response => {
        if (response?.success && response.data) {
          return response.data;
        }
        throw new Error('Failed to get emotion trends');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get crisis intervention records
   */
  getCrisisInterventions(): Observable<any[]> {
    return this.http.get<{
      success: boolean;
      data: any[];
    }>(
      `${this.baseUrl}/emotions/crisis-interventions`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update crisis intervention response
   */
  updateCrisisResponse(interventionId: string, response: 'accepted' | 'dismissed' | 'completed'): Observable<void> {
    return this.http.put<{
      success: boolean;
      message: string;
    }>(
      `${this.baseUrl}/emotions/crisis-interventions/${interventionId}/response`,
      { response },
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(result => {
        if (!result?.success) {
          throw new Error(result?.message || 'Failed to update crisis response');
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Transform backend emotion record to frontend format
   */
  private transformBackendRecord(backendRecord: BackendEmotionRecord): EmotionCheckinRecord {
    // Convert string array IDs back to full objects for frontend compatibility
    const selectedStruggles = backendRecord.selected_struggles.map(id => ({ id } as EmotionalStruggle));
    const selectedPositiveMoments = backendRecord.selected_positive_moments.map(id => ({ id } as PositiveMoment));
    const selectedConcerningThoughts = backendRecord.selected_concerning_thoughts.map(id => ({ id } as ConcerningThought));

    return {
      id: backendRecord.id,
      userId: backendRecord.user_id,
      date: new Date(backendRecord.record_date),
      time: backendRecord.record_time,
      selectedStruggles,
      selectedPositiveMoments,
      selectedConcerningThoughts,
      gratefulFor: backendRecord.grateful_for,
      proudOfToday: backendRecord.proud_of_today,
      tomorrowGoal: backendRecord.tomorrow_goal,
      additionalNotes: backendRecord.additional_notes,
      enteredViaVoice: false, // Not in backend record
      createdAt: new Date(backendRecord.created_at)
    };
  }

  /**
   * Convert frontend options to ID arrays for API
   */
  private extractOptionIds(options: { id: string }[]): string[] {
    return options.map(option => option.id);
  }

  /**
   * Get emotion summary (legacy method for backward compatibility)
   */
  getEmotionSummary(period: '7d' | '30d' | '90d' = '30d'): Observable<EmotionCheckinSummary> {
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period];

    return this.getEmotionTrends(days).pipe(
      map(trends => this.transformTrendsToSummary(trends)),
      catchError(this.handleError)
    );
  }

  /**
   * Transform trends data to legacy summary format
   */
  private transformTrendsToSummary(trends: EmotionTrends): EmotionCheckinSummary {
    return {
      totalCheckins: trends.overview.totalCheckins,
      lastCheckinDate: undefined, // Not available in trends
      strugglesFrequency: trends.categoryBreakdown.struggles,
      positiveMomentsFrequency: trends.categoryBreakdown.positives,
      concerningThoughtsCount: trends.overview.crisisAlertsTriggered,
      averageMoodTrend: this.mapRiskLevelToTrend(trends.riskLevel)
    };
  }

  /**
   * Map risk level to mood trend for backward compatibility
   */
  private mapRiskLevelToTrend(riskLevel: string): 'improving' | 'stable' | 'declining' {
    switch (riskLevel) {
      case 'low':
        return 'improving';
      case 'moderate':
        return 'stable';
      case 'high':
      case 'critical':
        return 'declining';
      default:
        return 'stable';
    }
  }

  /**
   * Handle service errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Backend Emotion Service Error:', error);
    let errorMessage = 'An error occurred';
    
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}