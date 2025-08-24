import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export interface PumpingRecord {
  id: string;
  baby_id: string;
  recorded_by: string;
  record_date: string;
  record_time: string;
  pumping_side: 'left' | 'right' | 'both';
  total_output: number;
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  notes?: string;
  entered_via_voice: boolean;
  created_at: string;
  updated_at: string;
  baby_name: string;
  first_name: string;
  last_name: string;
}

export interface CreatePumpingRecordRequest {
  babyId: string;
  recordDate?: string;
  recordTime?: string;
  pumpingSide: 'left' | 'right' | 'both';
  totalOutput: number;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  enteredViaVoice?: boolean;
}

export interface PumpingStats {
  total_sessions: number;
  total_output_ml: number;
  avg_output_per_session: number;
  avg_duration_minutes: number;
  left_sessions: number;
  right_sessions: number;
  both_sessions: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PumpingRecordsResponse {
  records: PumpingRecord[];
  pagination: PaginationResponse;
}

export interface TodaysSummary {
  date: string;
  summary: {
    total_sessions: number;
    total_output_ml: number;
    avg_output_per_session: number;
    avg_duration_minutes: number;
    left_sessions: number;
    right_sessions: number;
    both_sessions: number;
  };
  sessions: Array<{
    id: string;
    record_time: string;
    pumping_side: 'left' | 'right' | 'both';
    total_output: number;
    duration_minutes: number;
    baby_name: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class BackendPumpingService {
  private readonly baseUrl = environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api');
  private readonly endpoint = '/pumping-records';

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
   * Create a new pumping record
   */
  createPumpingRecord(data: CreatePumpingRecordRequest): Observable<PumpingRecord> {
    return this.http.post<{ success: boolean; message: string; data: PumpingRecord }>(
      `${this.baseUrl}${this.endpoint}`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get pumping records for a specific baby
   */
  getPumpingRecords(
    babyId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Observable<PumpingRecordsResponse> {
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

    return this.http.get<{ 
      success: boolean; 
      data: PumpingRecord[]; 
      pagination: PaginationResponse 
    }>(`${this.baseUrl}${this.endpoint}/baby/${babyId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      map(response => ({
        records: response.data,
        pagination: response.pagination
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single pumping record by ID
   */
  getPumpingRecord(id: string): Observable<PumpingRecord> {
    return this.http.get<{ success: boolean; data: PumpingRecord }>(
      `${this.baseUrl}${this.endpoint}/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing pumping record
   */
  updatePumpingRecord(id: string, data: Partial<CreatePumpingRecordRequest>): Observable<PumpingRecord> {
    return this.http.put<{ success: boolean; message: string; data: PumpingRecord }>(
      `${this.baseUrl}${this.endpoint}/${id}`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a pumping record
   */
  deletePumpingRecord(id: string): Observable<void> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}${this.endpoint}/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(() => void 0),
      catchError(this.handleError)
    );
  }

  /**
   * Get pumping statistics for a baby
   */
  getPumpingStats(babyId: string, startDate?: string, endDate?: string): Observable<PumpingStats> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<{ success: boolean; data: PumpingStats }>(
      `${this.baseUrl}${this.endpoint}/baby/${babyId}/stats`,
      { headers: this.getAuthHeaders(), params }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get recent pumping records for dashboard display
   */
  getRecentPumpingRecords(babyId: string, limit: number = 5): Observable<PumpingRecord[]> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<{ success: boolean; data: PumpingRecord[] }>(
      `${this.baseUrl}${this.endpoint}/baby/${babyId}/recent`,
      { headers: this.getAuthHeaders(), params }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get today's pumping summary
   */
  getTodaysSummary(babyId: string): Observable<TodaysSummary> {
    return this.http.get<{ success: boolean; data: TodaysSummary }>(
      `${this.baseUrl}${this.endpoint}/baby/${babyId}/today`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Backend Pumping Service Error:', error);
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