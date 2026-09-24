import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, Subject, combineLatest, concat, merge, of } from 'rxjs';
import { catchError, debounceTime, filter, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { BackendGrowthService } from './backend-growth.service';
import { DateOnlyUtil } from '../shared/utils/date-only.util';
import { DailySummaryRange, DailySummaryResponse, DayTimeline, DayTimelineResponse, TodaySummaryState } from '../models/daily-summary.model';

const LOADING: TodaySummaryState = { loading: true, error: false, day: null };

@Injectable({ providedIn: 'root' })
export class TrackerSummaryService {
  private readonly baseUrl = environment.apiUrl || (environment.production ? 'https://beta-api.naricare.com/api' : 'http://localhost:3000/api');
  private todays = new Map<string, Observable<TodaySummaryState>>();
  private retry$ = new Subject<string>();

  constructor(private http: HttpClient, private apiService: ApiService, private growth: BackendGrowthService) {}

  getDailySummary(babyId: string, from: string, to: string): Observable<DailySummaryRange> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.apiService.getToken()}` });
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<DailySummaryResponse>(`${this.baseUrl}/tracker/daily-summary/${babyId}`, { headers, params }).pipe(
      map(res => {
        if (!res?.success || !res.data) throw new Error('Daily summary request failed');
        return { ...res.data, days: res.data.days || [] };
      })
    );
  }

  getDayTimeline(babyId: string, date: string): Observable<DayTimeline> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.apiService.getToken()}` });
    const params = new HttpParams().set('date', date);
    return this.http.get<DayTimelineResponse>(`${this.baseUrl}/tracker/day-timeline/${babyId}`, { headers, params }).pipe(
      map(res => {
        if (!res?.success || !res.data) throw new Error('Day timeline request failed');
        return { ...res.data, events: res.data.events || [] };
      })
    );
  }

  /** Today's summary for entry cards; refetches whenever feed, pump or diaper records change. */
  today$(babyId: string): Observable<TodaySummaryState> {
    let obs = this.todays.get(babyId);
    if (!obs) {
      const records$ = combineLatest([
        this.growth.getFeedRecords(babyId),
        this.growth.getPumpingRecords(babyId),
        this.growth.getDiaperChangeRecords(babyId)
      ]).pipe(debounceTime(150), map(() => false));
      const retry$ = this.retry$.pipe(filter(id => id === babyId), map(() => true));
      obs = merge(records$, retry$).pipe(
        switchMap(showLoading => {
          const d = DateOnlyUtil.formatLocalDate();
          return concat(showLoading ? of(LOADING) : EMPTY, this.getDailySummary(babyId, d, d).pipe(
            map(r => ({ loading: false, error: false, day: r.days.find(x => x.date === d) || null })),
            catchError(() => of({ loading: false, error: true, day: null }))
          ));
        }),
        startWith(LOADING),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.todays.set(babyId, obs);
    }
    return obs;
  }

  retryToday(babyId: string): void { this.retry$.next(babyId); }
}
