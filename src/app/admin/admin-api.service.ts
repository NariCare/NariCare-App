import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
import { DailySummaryRange, DayTimeline } from '../models/daily-summary.model';
import {
  AiPair, AiReviewPage, AiReviewUpdate, ApiEnvelope, DashboardData, DateRange, DiaperItem, EventPage, FeedItem,
  GrowthRecord, MoodItem, MotherDetail, MotherListItem, MotherListQuery, Paged, PumpItem, ReviewTab, last30
} from './admin.models';

type Params = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly baseUrl = (environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api')) + '/admin';
  /** Shell date range shared by dashboard and record tabs. */
  readonly range$ = new BehaviorSubject<DateRange>(last30());

  constructor(private http: HttpClient, private apiService: ApiService) {}

  dashboard(r: DateRange): Observable<DashboardData> { return this.get('/dashboard', { ...r }); }

  mothers(q: MotherListQuery): Observable<Paged<MotherListItem>> { return this.get('/mothers', { ...q }); }

  mother(userId: string): Observable<MotherDetail> { return this.get(`/mothers/${userId}`); }

  dailySummary(babyId: string, from: string, to: string): Observable<DailySummaryRange> {
    return this.get<DailySummaryRange>(`/babies/${babyId}/daily-summary`, { from, to }).pipe(map(d => ({ ...d, days: d.days || [] })));
  }

  dayTimeline(babyId: string, date: string): Observable<DayTimeline> { return this.get(`/babies/${babyId}/day-timeline`, { date }); }

  growth(babyId: string): Observable<{ records: GrowthRecord[] }> { return this.get(`/babies/${babyId}/growth`); }

  feeds(babyId: string, r: DateRange): Observable<{ items: FeedItem[] }> { return this.get(`/babies/${babyId}/feeds`, { ...r }); }

  diapers(babyId: string, r: DateRange): Observable<{ items: DiaperItem[] }> { return this.get(`/babies/${babyId}/diapers`, { ...r }); }

  pumps(babyId: string, r: DateRange): Observable<{ items: PumpItem[] }> { return this.get(`/babies/${babyId}/pumps`, { ...r }); }

  mood(userId: string, r: DateRange): Observable<{ items: MoodItem[] }> { return this.get(`/mothers/${userId}/mood`, { ...r }); }

  events(userId: string, before?: string | null, limit = 50): Observable<EventPage> { return this.get(`/mothers/${userId}/events`, { before, limit }); }

  aiConversations(userId: string, page = 1, limit = 20): Observable<Paged<AiPair>> {
    return this.get(`/mothers/${userId}/ai-conversations`, { page, limit });
  }

  aiReviews(status: ReviewTab, category: string | null, flag: string | null, page = 1, limit = 20): Observable<AiReviewPage> {
    return this.get('/ai-reviews', { status, category, flag, page, limit });
  }

  review(answerId: string, body: AiReviewUpdate): Observable<AiPair> {
    return this.http.put<ApiEnvelope<AiPair>>(`${this.baseUrl}/ai-reviews/${answerId}`, body, { headers: this.headers() }).pipe(map(unwrap));
  }

  private get<T>(path: string, params: Params = {}): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') p = p.set(k, String(v));
    return this.http.get<ApiEnvelope<T>>(this.baseUrl + path, { headers: this.headers(), params: p }).pipe(map(unwrap));
  }

  private headers(): HttpHeaders { return new HttpHeaders({ Authorization: `Bearer ${this.apiService.getToken()}` }); }
}

function unwrap<T>(res: ApiEnvelope<T>): T {
  // Shared auth middleware sends `error`, admin routes send `message`
  if (!res?.success) throw new Error(res?.message || (res as any)?.error || 'Admin request failed');
  return res.data;
}
