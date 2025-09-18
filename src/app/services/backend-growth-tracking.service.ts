import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService, FeedRecordRequest, WeightRecordRequest, StoolRecordRequest, PumpingRecordRequest, DiaperChangeRequest } from './api.service';
import { 
  GrowthRecord, 
  WeightRecord, 
  StoolRecord,
  PumpingRecord,
  DiaperChangeRecord,
  BreastSide,
  SupplementType,
  LipstickShape,
  MotherMood,
  StoolColor,
  StoolTexture,
  StoolSize,
  PumpingSide
} from '../models/growth-tracking.model';

@Injectable({
  providedIn: 'root'
})
export class BackendGrowthTrackingService {
  // Local cache subjects for real-time updates
  private feedRecordsSubject = new BehaviorSubject<GrowthRecord[]>([]);
  private weightRecordsSubject = new BehaviorSubject<WeightRecord[]>([]);
  private stoolRecordsSubject = new BehaviorSubject<StoolRecord[]>([]);
  private pumpingRecordsSubject = new BehaviorSubject<PumpingRecord[]>([]);
  private diaperChangeRecordsSubject = new BehaviorSubject<DiaperChangeRecord[]>([]);

  // Available options (same as local service)
  readonly breastSideOptions: BreastSide[] = [
    { value: 'left', label: 'Left', icon: 'radio-button-on' },
    { value: 'right', label: 'Right', icon: 'radio-button-on' },
    { value: 'both', label: 'Both', icon: 'ellipse' }
  ];

  readonly supplementOptions: SupplementType[] = [
    { value: 'breastmilk', label: 'Breastmilk', icon: 'water' },
    { value: 'formula', label: 'Formula', icon: 'nutrition' }
  ];

  readonly lipstickShapeOptions: LipstickShape[] = [
    { value: 'rounded', label: 'Rounded', icon: 'ellipse' },
    { value: 'lipstick', label: 'Lipstick', icon: 'triangle' }
  ];

  readonly motherMoodOptions: MotherMood[] = [
    { value: 'relaxed', label: 'Relaxed', emoji: '😌', color: '#10b981' },
    { value: 'happy', label: 'Happy', emoji: '😊', color: '#059669' },
    { value: 'sad', label: 'Sad', emoji: '😢', color: '#6b7280' },
    { value: 'exhausted', label: 'Exhausted', emoji: '😴', color: '#f59e0b' },
    { value: 'anxious', label: 'Anxious', emoji: '😰', color: '#ef4444' }
  ];

  readonly stoolColorOptions: StoolColor[] = [
    { value: 'very-dark', label: 'Very dark', color: '#374151' },
    { value: 'dark-green', label: 'Dark green', color: '#059669' },
    { value: 'dark-brown', label: 'Dark brown', color: '#92400e' },
    { value: 'mustard-yellow', label: 'Mustard yellow', color: '#d97706' },
    { value: 'other', label: 'Other', color: '#ef4444' }
  ];

  readonly stoolTextureOptions: StoolTexture[] = [
    { value: 'liquid', label: 'Liquid', icon: 'water' },
    { value: 'pasty', label: 'Pasty', icon: 'ellipse' },
    { value: 'hard', label: 'Hard', icon: 'diamond' },
    { value: 'snotty', label: 'Snotty', icon: 'trail-sign' },
    { value: 'bloody', label: 'Bloody', icon: 'medical' }
  ];

  readonly stoolSizeOptions: StoolSize[] = [
    { value: 'coin', label: 'Coin', icon: 'ellipse-outline' },
    { value: 'tablespoon', label: 'Tablespoon', icon: 'ellipse' },
    { value: 'bigger', label: 'Bigger', icon: 'ellipse' }
  ];

  readonly pumpingSideOptions: PumpingSide[] = [
    { value: 'left', label: 'Left', icon: 'radio-button-on' },
    { value: 'right', label: 'Right', icon: 'radio-button-on' },
    { value: 'both', label: 'Both', icon: 'ellipse' }
  ];

  constructor(private apiService: ApiService) {}

  // ============================================================================
  // FEED TRACKING METHODS
  // ============================================================================

  async addGrowthRecord(record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const feedData: FeedRecordRequest = {
        babyId: record.babyId,
        recordDate: record.date ? new Date(record.date).toISOString().split('T')[0] : undefined,
        feedTypes: record.feedTypes || ['direct'],
        directFeedDetails: record.directFeedDetails,
        expressedMilkDetails: record.expressedMilkDetails,
        formulaDetails: record.formulaDetails,
        notes: record.notes
      };

      const response = await this.apiService.createFeedRecord(feedData).toPromise();
      
      if (response?.success) {
        // Refresh local cache
        this.refreshFeedRecords(record.babyId);
      } else {
        throw new Error(response?.message || 'Failed to save feed record');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getGrowthRecords(babyId: string): Observable<GrowthRecord[]> {
    // Load from API and update local cache
    this.apiService.getFeedRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformFeedRecord);
          this.feedRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error loading feed records:', error);
      }
    });

    return this.feedRecordsSubject.pipe(
      map(records => records.filter(record => record.babyId === babyId))
    );
  }

  getRecentRecords(babyId: string, days: number = 3): Observable<GrowthRecord[]> {
    return this.getGrowthRecords(babyId).pipe(
      map(records => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return records.filter(record => record.date >= cutoffDate);
      })
    );
  }

  // ============================================================================
  // WEIGHT TRACKING METHODS
  // ============================================================================

  async addWeightRecord(record: Omit<WeightRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const weightData: WeightRecordRequest = {
        babyId: record.babyId,
        weight: record.weight,
        height: record.height,
        notes: record.notes
      };

      const response = await this.apiService.createWeightRecord(weightData).toPromise();
      
      if (response?.success) {
        // Refresh local cache
        this.refreshWeightRecords(record.babyId);
      } else {
        throw new Error(response?.message || 'Failed to save weight record');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getWeightRecords(babyId: string): Observable<WeightRecord[]> {
    // Load from API and update local cache
    this.apiService.getWeightRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformWeightRecord);
          this.weightRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error loading weight records:', error);
      }
    });

    return this.weightRecordsSubject.pipe(
      map(records => records.filter(record => record.babyId === babyId))
    );
  }

  // ============================================================================
  // STOOL TRACKING METHODS
  // ============================================================================

  async addStoolRecord(record: Omit<StoolRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const stoolData: StoolRecordRequest = {
        babyId: record.babyId,
        time: record.time,
        color: record.color,
        texture: record.texture,
        size: record.size,
        peeCount: record.peeCount,
        poopCount: record.poopCount,
        notes: record.notes
      };

      const response = await this.apiService.createStoolRecord(stoolData).toPromise();
      
      if (response?.success) {
        // Refresh local cache
        this.refreshStoolRecords(record.babyId);
      } else {
        throw new Error(response?.message || 'Failed to save stool record');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getStoolRecords(babyId: string): Observable<StoolRecord[]> {
    // Load from API and update local cache
    this.apiService.getStoolRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformStoolRecord);
          this.stoolRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error loading stool records:', error);
      }
    });

    return this.stoolRecordsSubject.pipe(
      map(records => records.filter(record => record.babyId === babyId))
    );
  }

  // ============================================================================
  // PUMPING TRACKING METHODS
  // ============================================================================

  async addPumpingRecord(record: Omit<PumpingRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const pumpingData: PumpingRecordRequest = {
        babyId: record.babyId,
        time: record.time,
        pumpingSide: record.pumpingSide,
        totalOutput: record.totalOutput,
        duration: record.duration,
        startTime: record.startTime,
        endTime: record.endTime,
        notes: record.notes
      };

      const response = await this.apiService.createPumpingRecord(pumpingData).toPromise();
      
      if (response?.success) {
        // Refresh local cache
        this.refreshPumpingRecords(record.babyId);
      } else {
        throw new Error(response?.message || 'Failed to save pumping record');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getPumpingRecords(babyId: string): Observable<PumpingRecord[]> {
    // Load from API and update local cache
    this.apiService.getPumpingRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformPumpingRecord);
          this.pumpingRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error loading pumping records:', error);
      }
    });

    return this.pumpingRecordsSubject.pipe(
      map(records => records.filter(record => record.babyId === babyId))
    );
  }

  // ============================================================================
  // DIAPER CHANGE TRACKING METHODS
  // ============================================================================

  async addDiaperChangeRecord(record: Omit<DiaperChangeRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const diaperData: DiaperChangeRequest = {
        babyId: record.babyId,
        recordDate: record.date ? new Date(record.date).toISOString().split('T')[0] : undefined,
        recordTime: record.time,
        changeType: record.type,
        wetnessLevel: record.wetness,
        notes: record.notes,
        enteredViaVoice: record.enteredViaVoice
      };

      const response = await this.apiService.createDiaperChange(diaperData).toPromise();
      
      if (response?.success) {
        // Refresh local cache
        this.refreshDiaperChangeRecords(record.babyId);
      } else {
        throw new Error(response?.message || 'Failed to save diaper change record');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getDiaperChangeRecords(babyId: string): Observable<DiaperChangeRecord[]> {
    // Load from API and update local cache
    this.apiService.getDiaperChanges(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformDiaperChangeRecord);
          this.diaperChangeRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error loading diaper change records:', error);
      }
    });

    return this.diaperChangeRecordsSubject.pipe(
      map(records => records.filter(record => record.babyId === babyId))
    );
  }

  // ============================================================================
  // SUMMARY METHODS
  // ============================================================================

  async getDailySummary(babyId: string, date?: Date): Promise<any> {
    try {
      const dateString = date ? date.toISOString().split('T')[0] : undefined;
      const response = await this.apiService.getDailySummary(babyId, dateString).toPromise();
      
      if (response?.success) {
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to get daily summary');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getWeeklySummary(babyId: string, weekStart?: Date): Promise<any> {
    try {
      const weekStartString = weekStart ? weekStart.toISOString().split('T')[0] : undefined;
      const response = await this.apiService.getWeeklySummary(babyId, weekStartString).toPromise();
      
      if (response?.success) {
        return response.data;
      } else {
        throw new Error(response?.message || 'Failed to get weekly summary');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getLastFeedingRecord(babyId: string): Promise<any> {
    try {
      const response = await this.apiService.getFeedRecords(babyId, 1).toPromise();
      
      if (response?.success && response.data && response.data.length > 0) {
        const lastRecord = this.transformFeedRecord(response.data[0]);
        return {
          time: lastRecord.directFeedDetails?.startTime || '--',
          date: lastRecord.date,
          breastSide: lastRecord.directFeedDetails?.breastSide || '--',
          duration: lastRecord.directFeedDetails?.duration || 0,
          painLevel: lastRecord.directFeedDetails?.painLevel || 0
        };
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting last feeding record:', error);
      return null;
    }
  }

  // ============================================================================
  // OPTION GETTERS (for compatibility with existing code)
  // ============================================================================

  getBreastSideOptions(): BreastSide[] {
    return this.breastSideOptions;
  }

  getSupplementOptions(): SupplementType[] {
    return this.supplementOptions;
  }

  getLipstickShapeOptions(): LipstickShape[] {
    return this.lipstickShapeOptions;
  }

  getMotherMoodOptions(): MotherMood[] {
    return this.motherMoodOptions;
  }

  getStoolColorOptions(): StoolColor[] {
    return this.stoolColorOptions;
  }

  getStoolTextureOptions(): StoolTexture[] {
    return this.stoolTextureOptions;
  }

  getStoolSizeOptions(): StoolSize[] {
    return this.stoolSizeOptions;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private refreshFeedRecords(babyId: string): void {
    this.apiService.getFeedRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformFeedRecord);
          this.feedRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error refreshing feed records:', error);
      }
    });
  }

  private refreshWeightRecords(babyId: string): void {
    this.apiService.getWeightRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformWeightRecord);
          this.weightRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error refreshing weight records:', error);
      }
    });
  }

  private refreshStoolRecords(babyId: string): void {
    this.apiService.getStoolRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformStoolRecord);
          this.stoolRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error refreshing stool records:', error);
      }
    });
  }

  private refreshPumpingRecords(babyId: string): void {
    this.apiService.getPumpingRecords(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformPumpingRecord);
          this.pumpingRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error refreshing pumping records:', error);
      }
    });
  }

  private refreshDiaperChangeRecords(babyId: string): void {
    this.apiService.getDiaperChanges(babyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const records = response.data.map(this.transformDiaperChangeRecord);
          this.diaperChangeRecordsSubject.next(records);
        }
      },
      error: (error) => {
        console.error('Error refreshing diaper change records:', error);
      }
    });
  }

  // Transform API data to frontend models
  private transformFeedRecord = (apiRecord: any): GrowthRecord => {
    return {
      id: apiRecord.id,
      babyId: apiRecord.baby_id || apiRecord.babyId,
      recordedBy: apiRecord.recorded_by || apiRecord.recordedBy,
      date: new Date(apiRecord.date || apiRecord.created_at),
      feedTypes: apiRecord.feed_types || apiRecord.feedTypes || ['direct'],
      directFeedDetails: apiRecord.direct_feed_details || apiRecord.directFeedDetails,
      expressedMilkDetails: apiRecord.expressed_milk_details || apiRecord.expressedMilkDetails,
      formulaDetails: apiRecord.formula_details || apiRecord.formulaDetails,
      notes: apiRecord.notes,
      enteredViaVoice: apiRecord.entered_via_voice || apiRecord.enteredViaVoice || false,
      createdAt: new Date(apiRecord.created_at || apiRecord.createdAt),
      updatedAt: new Date(apiRecord.updated_at || apiRecord.updatedAt || apiRecord.created_at)
    };
  };

  private transformWeightRecord = (apiRecord: any): WeightRecord => {
    return {
      id: apiRecord.id,
      babyId: apiRecord.baby_id || apiRecord.babyId,
      recordedBy: apiRecord.recorded_by || apiRecord.recordedBy,
      date: new Date(apiRecord.date || apiRecord.created_at),
      weight: apiRecord.weight,
      height: apiRecord.height,
      notes: apiRecord.notes,
      reminderSent: apiRecord.reminder_sent || apiRecord.reminderSent || false,
      enteredViaVoice: apiRecord.entered_via_voice || apiRecord.enteredViaVoice || false,
      createdAt: new Date(apiRecord.created_at || apiRecord.createdAt)
    };
  };

  private transformStoolRecord = (apiRecord: any): StoolRecord => {
    return {
      id: apiRecord.id,
      babyId: apiRecord.baby_id || apiRecord.babyId,
      recordedBy: apiRecord.recorded_by || apiRecord.recordedBy,
      date: new Date(apiRecord.date || apiRecord.created_at),
      time: apiRecord.time,
      color: apiRecord.color,
      texture: apiRecord.texture,
      size: apiRecord.size,
      peeCount: apiRecord.pee_count || apiRecord.peeCount,
      poopCount: apiRecord.poop_count || apiRecord.poopCount,
      notes: apiRecord.notes,
      enteredViaVoice: apiRecord.entered_via_voice || apiRecord.enteredViaVoice || false,
      createdAt: new Date(apiRecord.created_at || apiRecord.createdAt)
    };
  };

  private transformPumpingRecord = (apiRecord: any): PumpingRecord => {
    return {
      id: apiRecord.id,
      babyId: apiRecord.baby_id || apiRecord.babyId,
      recordedBy: apiRecord.recorded_by || apiRecord.recordedBy,
      date: new Date(apiRecord.date || apiRecord.created_at),
      time: apiRecord.time,
      pumpingSide: apiRecord.pumping_side || apiRecord.pumpingSide,
      totalOutput: apiRecord.total_output || apiRecord.totalOutput,
      duration: apiRecord.duration,
      startTime: apiRecord.start_time || apiRecord.startTime,
      endTime: apiRecord.end_time || apiRecord.endTime,
      notes: apiRecord.notes,
      enteredViaVoice: apiRecord.entered_via_voice || apiRecord.enteredViaVoice || false,
      createdAt: new Date(apiRecord.created_at || apiRecord.createdAt)
    };
  };

  private transformDiaperChangeRecord = (apiRecord: any): DiaperChangeRecord => {
    return {
      id: apiRecord.id,
      babyId: apiRecord.baby_id || apiRecord.babyId,
      recordedBy: apiRecord.recorded_by || apiRecord.recordedBy,
      date: new Date(apiRecord.date || apiRecord.created_at),
      time: apiRecord.time,
      type: apiRecord.type,
      wetness: apiRecord.wetness,
      notes: apiRecord.notes,
      enteredViaVoice: apiRecord.entered_via_voice || apiRecord.enteredViaVoice || false,
      createdAt: new Date(apiRecord.created_at || apiRecord.createdAt)
    };
  };

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  // ============================================================================
  // ANALYTICS INTEGRATION
  // ============================================================================

  private trackAnalyticsEvent(eventType: string, eventData: any): void {
    this.apiService.trackEvent({
      eventType,
      eventData,
      metadata: {
        userAgent: navigator.userAgent,
        platform: 'web',
        timestamp: new Date().toISOString()
      }
    }).subscribe({
      next: () => {
        console.log('Analytics event tracked:', eventType);
      },
      error: (error) => {
        console.warn('Failed to track analytics event:', error);
      }
    });
  }
}