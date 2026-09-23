import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { filter, map, catchError, take } from 'rxjs/operators';
import { ApiService, FeedRecordRequest, WeightRecordRequest, StoolRecordRequest, PumpingRecordRequest, DiaperChangeRequest, DiaperChangeRecord, DiaperChangeStats } from './api.service';
import { GrowthRecord } from '../models/growth-tracking.model';
import { DateOnlyUtil } from '../shared/utils/date-only.util';

// undefined = not loaded yet (show skeleton); array = loaded (empty array = empty state).
type CacheState = any[] | undefined;

@Injectable({
  providedIn: 'root'
})
export class BackendGrowthService {
  // Single source of truth per "type:babyId". Reads return the subject so the
  // list paints instantly on revisit and every open screen updates the moment a
  // write pushes fresh data in - no component-level cache, no manual reload.
  private cacheSubjects = new Map<string, BehaviorSubject<CacheState>>();
  private cacheBuilders = new Map<string, () => Observable<any[]>>();
  private inFlight = new Set<string>();

  constructor(private apiService: ApiService) {}

  private subjectFor(key: string): BehaviorSubject<CacheState> {
    let subject = this.cacheSubjects.get(key);
    if (!subject) {
      subject = new BehaviorSubject<CacheState>(undefined);
      this.cacheSubjects.set(key, subject);
    }
    return subject;
  }

  /**
   * Reactive cached read. Returns the per-key subject (skeleton -> data). Fires
   * the HTTP fetch once on first access; later subscribers get the last value
   * immediately, and any refresh() pushes new data to all of them.
   */
  private cached(type: string, babyId: string, build: () => Observable<any[]>): Observable<any[]> {
    const key = `${type}:${babyId}`;
    this.cacheBuilders.set(key, build);
    const subject = this.subjectFor(key);
    if (subject.value === undefined && !this.inFlight.has(key)) {
      this.fetchInto(key, build);
    }
    // Hide the skeleton sentinel from consumers: only emit real arrays.
    return subject.asObservable().pipe(filter((v): v is any[] => v !== undefined));
  }

  // One-shot read for internal async callers. The cached observable is subject-
  // backed and never completes, so take(1) is required or toPromise() would hang.
  private firstValue(obs: Observable<any[]>): Promise<any[] | undefined> {
    return obs.pipe(take(1)).toPromise();
  }

  private fetchInto(key: string, build: () => Observable<any[]>): void {
    this.inFlight.add(key);
    build().subscribe({
      next: data => {
        this.subjectFor(key).next(data || []);
        this.inFlight.delete(key);
      },
      error: err => {
        console.error(`Failed to load ${key}:`, err);
        // Emit empty so the skeleton clears instead of spinning forever.
        this.subjectFor(key).next([]);
        this.inFlight.delete(key);
      }
    });
  }

  // Re-fetch a single key and push into its live subject (updates open screens).
  private refresh(type: string, babyId: string): void {
    const key = `${type}:${babyId}`;
    const build = this.cacheBuilders.get(key);
    if (build) { this.fetchInto(key, build); }
  }

  // Re-fetch every cached key of a type (used when the write has no babyId to
  // hand, e.g. diaper update/delete keyed only by recordId).
  private refreshType(type: string): void {
    for (const key of Array.from(this.cacheSubjects.keys())) {
      if (key.startsWith(`${type}:`)) {
        const build = this.cacheBuilders.get(key);
        if (build) { this.fetchInto(key, build); }
      }
    }
  }

  // Optimistically prepend a record to a cached list so the UI reflects the save
  // instantly; the follow-up refresh() reconciles with the server copy.
  private prepend(type: string, babyId: string, record: any): void {
    if (!record) { return; }
    const subject = this.cacheSubjects.get(`${type}:${babyId}`);
    if (subject && subject.value !== undefined) {
      subject.next([record, ...subject.value]);
    }
  }

  /**
   * Add a new feed record to the backend
   */
  async addFeedRecord(record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    try {
      // Transform the frontend growth record to backend feed record format
      const feedData: FeedRecordRequest = {
        babyId: record.babyId,
        recordDate: record.date ? DateOnlyUtil.formatLocalDate(new Date(record.date)) : undefined,
        feedTypes: record.feedTypes as ('direct' | 'expressed' | 'formula')[],
        directFeedDetails: record.directFeedDetails ? {
          startTime: record.directFeedDetails.startTime,
          breastSide: record.directFeedDetails.breastSide,
          duration: record.directFeedDetails.duration,
          painLevel: record.directFeedDetails.painLevel
        } : undefined,
        expressedMilkDetails: record.expressedMilkDetails ? {
          startTime: record.expressedMilkDetails.startTime,
          quantity: record.expressedMilkDetails.quantity
        } : undefined,
        formulaDetails: record.formulaDetails ? {
          startTime: record.formulaDetails.startTime,
          quantity: record.formulaDetails.quantity
        } : undefined,
        notes: record.notes
      };

      const response = await this.apiService.createCompleteFeedLog(feedData).toPromise();
      
      if (response?.success) {
        // Transform the backend response to frontend format
        const transformedData = this.transformBackendFeedRecord(response.data);
        // Show it immediately, then reconcile with the server list.
        this.prepend('feed', record.babyId, transformedData);
        this.refresh('feed', record.babyId);
        return transformedData;
      } else {
        throw new Error(response?.message || 'Failed to save feed record');
      }
    } catch (error: any) {
      console.error('Error adding feed record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Add a weight record to the backend
   */
  async addWeightRecord(record: WeightRecordRequest): Promise<any> {
    try {
      const response = await this.apiService.createWeightRecord(record).toPromise();
      
      if (response?.success) {
        this.refresh('weight', record.babyId);
        // After successfully adding a weight record, refresh baby data to update current weight
        await this.refreshBabyCurrentWeight(record.babyId);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to save weight record');
      }
    } catch (error: any) {
      console.error('Error adding weight record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get the most recent weight record for a baby and update current weight
   */
  private async refreshBabyCurrentWeight(babyId: string): Promise<void> {
    try {
      const weightRecords = await this.firstValue(this.getWeightRecords(babyId));
      if (weightRecords && weightRecords.length > 0) {
        // Sort weight records by date descending to get most recent
        const sortedRecords = weightRecords.sort((a: any, b: any) => {
          const dateA = new Date(a.record_date || a.date);
          const dateB = new Date(b.record_date || b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        const mostRecentWeight = sortedRecords[0];
        console.log('Most recent weight for baby', babyId, ':', mostRecentWeight.weight);
        
        // Note: The backend should ideally update the baby's current_weight automatically
        // For now, we'll rely on the growth page to refresh baby data
      }
    } catch (error) {
      console.warn('Failed to refresh baby current weight:', error);
    }
  }

  /**
   * Add a stool record to the backend
   */
  async addStoolRecord(record: StoolRecordRequest): Promise<any> {
    try {
      const response = await this.apiService.createStoolRecord(record).toPromise();

      if (response?.success) {
        this.prepend('stool', record.babyId, response.data);
        this.refresh('stool', record.babyId);
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to save stool record');
      }
    } catch (error: any) {
      console.error('Error adding stool record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Add a pumping record to the backend
   */
  async addPumpingRecord(record: PumpingRecordRequest): Promise<any> {
    try {
      const response = await this.apiService.createPumpingRecord(record).toPromise();

      if (response?.success) {
        if (record.babyId) {
          this.prepend('pumping', record.babyId, response.data);
          this.refresh('pumping', record.babyId);
        }
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to save pumping record');
      }
    } catch (error: any) {
      console.error('Error adding pumping record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Add a diaper change record to the backend
   */
  async addDiaperChangeRecord(record: DiaperChangeRequest): Promise<any> {
    try {
      const response = await this.apiService.createDiaperChange(record).toPromise();

      if (response?.success) {
        if (record.babyId) {
          this.prepend('diaper', record.babyId, response.data);
          this.refresh('diaper', record.babyId);
        }
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to save diaper change record');
      }
    } catch (error: any) {
      console.error('Error adding diaper change record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get feed records for a specific baby from backend
   */
  getFeedRecords(babyId: string): Observable<any[]> {
    return this.cached('feed', babyId, () => this.apiService.getFeedRecords(babyId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          // Transform each feed record from backend format to frontend format
          return response.data.map((record: any) => this.transformBackendFeedRecord(record));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching feed records:', error);
        return of([]);
      })
    ));
  }

  /**
   * Get weight records for a specific baby from backend
   */
  getWeightRecords(babyId: string): Observable<any[]> {
    return this.cached('weight', babyId, () => this.apiService.getWeightRecords(babyId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          // Sort weight records by date descending (most recent first)
          return response.data.sort((a: any, b: any) => {
            const dateA = new Date(a.record_date || a.date);
            const dateB = new Date(b.record_date || b.date);
            return dateB.getTime() - dateA.getTime();
          });
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching weight records:', error);
        return of([]);
      })
    ));
  }

  /**
   * Get the most recent weight for a specific baby
   */
  async getMostRecentWeight(babyId: string): Promise<number | null> {
    try {
      const weightRecords = await this.firstValue(this.getWeightRecords(babyId));
      if (weightRecords && weightRecords.length > 0) {
        // Records are already sorted by date descending, so first one is most recent
        return weightRecords[0].weight;
      }
      return null;
    } catch (error) {
      console.error('Error getting most recent weight:', error);
      return null;
    }
  }

  /**
   * Get stool records for a specific baby from backend
   */
  getStoolRecords(babyId: string): Observable<any[]> {
    return this.cached('stool', babyId, () => this.apiService.getStoolRecords(babyId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching stool records:', error);
        return of([]);
      })
    ));
  }

  /**
   * Get pumping records for a specific baby from backend
   */
  getPumpingRecords(babyId: string): Observable<any[]> {
    return this.cached('pumping', babyId, () => this.apiService.getPumpingRecords(babyId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching pumping records:', error);
        return of([]);
      })
    ));
  }

  /**
   * Refresh the shared pumping cache so open screens (growth dashboard,
   * baby-detail) reflect a new session saved via BackendPumpingService.
   */
  refreshPumping(babyId: string): void {
    this.refresh('pumping', babyId);
  }

  /**
   * Get diaper change records for a specific baby from backend
   */
  getDiaperChangeRecords(babyId: string, page?: number, limit?: number): Observable<DiaperChangeRecord[]> {
    const build = () => this.apiService.getDiaperChanges(babyId, { page, limit }).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching diaper change records:', error);
        return of([]);
      })
    );
    // Only cache the default unpaged list (the baby-detail view); paged calls bypass.
    if (page === undefined && limit === undefined) {
      return this.cached('diaper', babyId, build);
    }
    return build();
  }

  /**
   * Get a specific diaper change record by ID
   */
  getDiaperChangeRecord(recordId: string): Observable<DiaperChangeRecord | null> {
    return this.apiService.getDiaperChange(recordId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching diaper change record:', error);
        return of(null);
      })
    );
  }

  /**
   * Update a diaper change record
   */
  async updateDiaperChangeRecord(recordId: string, record: Partial<DiaperChangeRequest>): Promise<DiaperChangeRecord> {
    try {
      const response = await this.apiService.updateDiaperChange(recordId, record).toPromise();

      if (response?.success) {
        this.refreshType('diaper');
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to update diaper change record');
      }
    } catch (error: any) {
      console.error('Error updating diaper change record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Delete a diaper change record
   */
  async deleteDiaperChangeRecord(recordId: string): Promise<boolean> {
    try {
      const response = await this.apiService.deleteDiaperChange(recordId).toPromise();

      if (response?.success) {
        this.refreshType('diaper');
        return true;
      } else {
        throw new Error(response?.message || 'Failed to delete diaper change record');
      }
    } catch (error: any) {
      console.error('Error deleting diaper change record:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get diaper change statistics for a specific baby
   */
  getDiaperChangeStats(babyId: string, startDate?: string, endDate?: string): Observable<DiaperChangeStats | null> {
    return this.apiService.getDiaperChangeStats(babyId, startDate, endDate).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching diaper change stats:', error);
        return of(null);
      })
    );
  }

  /**
   * Get recent diaper changes for a specific baby
   */
  getRecentDiaperChanges(babyId: string, limit?: number): Observable<DiaperChangeRecord[]> {
    return this.apiService.getRecentDiaperChanges(babyId, limit).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching recent diaper changes:', error);
        return of([]);
      })
    );
  }

  /**
   * Get complete baby data including all growth records
   */
  getBabyCompleteData(babyId: string): Observable<any> {
    return this.apiService.getBabyCompleteData(babyId).pipe(
      map((response: any) => {
        // getBabyCompleteData returns the data directly, not wrapped in ApiResponse
        if (response) {
          return response;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching baby complete data:', error);
        return of(null);
      })
    );
  }

  /**
   * Transform backend feed record response to frontend format
   */
  private transformBackendFeedRecord(backendData: any): any {
    if (!backendData) return null;

    return {
      id: backendData.id,
      babyId: backendData.baby_id,
      recordedBy: backendData.recorded_by,
      date: new Date(backendData.record_date),
      feedTypes: this.determineFeedTypes(backendData),
      directFeedDetails: backendData.direct_start_time ? {
        startTime: backendData.direct_start_time?.slice(0, 5), // Remove seconds
        breastSide: backendData.direct_breast_side,
        duration: backendData.direct_duration,
        painLevel: backendData.direct_pain_level
      } : undefined,
      expressedMilkDetails: backendData.expressed_quantity ? {
        startTime: backendData.expressed_start_time?.slice(0, 5),
        quantity: backendData.expressed_quantity
      } : undefined,
      formulaDetails: backendData.formula_quantity ? {
        startTime: backendData.formula_start_time?.slice(0, 5),
        quantity: backendData.formula_quantity
      } : undefined,
      notes: backendData.notes,
      enteredViaVoice: Boolean(backendData.entered_via_voice),
      createdAt: new Date(backendData.created_at),
      updatedAt: new Date(backendData.updated_at),
      // Additional fields from backend
      babyName: backendData.baby_name,
      firstName: backendData.first_name,
      lastName: backendData.last_name
    };
  }

  /**
   * Determine feed types from backend data structure
   */
  private determineFeedTypes(backendData: any): ('direct' | 'expressed' | 'formula')[] {
    const feedTypes: ('direct' | 'expressed' | 'formula')[] = [];
    
    if (backendData.direct_start_time) {
      feedTypes.push('direct');
    }
    if (backendData.expressed_quantity) {
      feedTypes.push('expressed');
    }
    if (backendData.formula_quantity) {
      feedTypes.push('formula');
    }
    
    return feedTypes;
  }

  /**
   * Get last feeding record for a baby
   */
  async getLastFeedingRecord(babyId: string): Promise<any> {
    try {
      const feedRecords = await this.firstValue(this.getFeedRecords(babyId));
      
      if (!feedRecords || feedRecords.length === 0) {
        return null;
      }

      // Filter for direct feeding records and get the most recent one
      const directFeeds = feedRecords.filter(record => 
        record.feedTypes && record.feedTypes.includes('direct') && record.directFeedDetails
      );

      if (directFeeds.length === 0) {
        return null;
      }

      // Sort by date and get the most recent
      const lastRecord = directFeeds.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      return {
        time: lastRecord.directFeedDetails?.startTime || '--',
        date: lastRecord.date,
        breastSide: lastRecord.directFeedDetails?.breastSide || '--',
        duration: lastRecord.directFeedDetails?.duration || 0,
        painLevel: lastRecord.directFeedDetails?.painLevel || 0
      };
    } catch (error) {
      console.error('Error getting last feeding record:', error);
      return null;
    }
  }

  /**
   * Get daily summary for a baby (last 24 hours)
   */
  async getDailySummary(babyId: string): Promise<any> {
    try {
      const feedRecords = await this.firstValue(this.getFeedRecords(babyId));
      
      if (!feedRecords || feedRecords.length === 0) {
        return {
          totalDirectFeeds: 0,
          totalExpressedFeeds: 0,
          totalFormulaFeeds: 0,
          totalExpressedMl: 0,
          totalFormulaMl: 0,
          avgPainLevel: 0,
          recordsCount: 0
        };
      }

      // Filter records from last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const dailyRecords = feedRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= yesterday;
      });

      // Calculate totals
      const totalDirectFeeds = dailyRecords.filter(record => 
        record.feedTypes?.includes('direct')
      ).length;

      const totalExpressedFeeds = dailyRecords.filter(record => 
        record.feedTypes?.includes('expressed')
      ).length;

      const totalFormulaFeeds = dailyRecords.filter(record => 
        record.feedTypes?.includes('formula')
      ).length;

      const totalExpressedMl = dailyRecords
        .filter(record => record.feedTypes?.includes('expressed'))
        .reduce((sum, record) => sum + (record.expressedMilkDetails?.quantity || 0), 0);

      const totalFormulaMl = dailyRecords
        .filter(record => record.feedTypes?.includes('formula'))
        .reduce((sum, record) => sum + (record.formulaDetails?.quantity || 0), 0);

      // Calculate average pain level
      const painLevels = dailyRecords
        .map(record => record.directFeedDetails?.painLevel)
        .filter(level => level !== undefined && level !== null) as number[];
      
      const avgPainLevel = painLevels.length > 0 ? 
        Math.round(painLevels.reduce((sum, level) => sum + level, 0) / painLevels.length) : 0;

      return {
        totalDirectFeeds,
        totalExpressedFeeds,
        totalFormulaFeeds,
        totalExpressedMl,
        totalFormulaMl,
        avgPainLevel,
        recordsCount: dailyRecords.length
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return {
        totalDirectFeeds: 0,
        totalExpressedFeeds: 0,
        totalFormulaFeeds: 0,
        totalExpressedMl: 0,
        totalFormulaMl: 0,
        avgPainLevel: 0,
        recordsCount: 0
      };
    }
  }

  /**
   * Extract error message from API response
   */
  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      if (error.error.error) {
        return error.error.error;
      } else if (error.error.message) {
        return error.error.message;
      } else if (typeof error.error === 'string') {
        return error.error;
      }
    }
    
    switch (error?.status) {
      case 0:
        return 'Network error. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}