import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { ApiService, FeedRecordRequest, WeightRecordRequest, StoolRecordRequest, PumpingRecordRequest, DiaperChangeRequest } from './api.service';
import { GrowthRecord } from '../models/growth-tracking.model';

@Injectable({
  providedIn: 'root'
})
export class BackendGrowthService {
  private recordsSubject = new BehaviorSubject<GrowthRecord[]>([]);
  
  constructor(private apiService: ApiService) {}

  /**
   * Add a new feed record to the backend
   */
  async addFeedRecord(record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    try {
      // Transform the frontend growth record to backend feed record format
      const feedData: FeedRecordRequest = {
        babyId: record.babyId,
        feedTypes: record.feedTypes as ('direct' | 'expressed' | 'formula')[],
        directFeedDetails: record.directFeedDetails ? {
          startTime: record.directFeedDetails.startTime,
          breastSide: record.directFeedDetails.breastSide,
          duration: record.directFeedDetails.duration,
          painLevel: record.directFeedDetails.painLevel
        } : undefined,
        expressedMilkDetails: record.expressedMilkDetails ? {
          quantity: record.expressedMilkDetails.quantity
        } : undefined,
        formulaDetails: record.formulaDetails ? {
          quantity: record.formulaDetails.quantity
        } : undefined,
        notes: record.notes
      };

      const response = await this.apiService.createCompleteFeedLog(feedData).toPromise();
      
      if (response?.success) {
        // Transform the backend response to frontend format
        const transformedData = this.transformBackendFeedRecord(response.data);
        // Optionally refresh local records
        await this.refreshFeedRecords(record.babyId);
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
   * Add a stool record to the backend
   */
  async addStoolRecord(record: StoolRecordRequest): Promise<any> {
    try {
      const response = await this.apiService.createStoolRecord(record).toPromise();
      
      if (response?.success) {
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
      const response = await this.apiService.createDiaperChangeRecord(record).toPromise();
      
      if (response?.success) {
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
    return this.apiService.getFeedRecords(babyId).pipe(
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
    );
  }

  /**
   * Get weight records for a specific baby from backend
   */
  getWeightRecords(babyId: string): Observable<any[]> {
    return this.apiService.getWeightRecords(babyId).pipe(
      map((response: any) => {
        if (response?.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching weight records:', error);
        return of([]);
      })
    );
  }

  /**
   * Get stool records for a specific baby from backend
   */
  getStoolRecords(babyId: string): Observable<any[]> {
    return this.apiService.getStoolRecords(babyId).pipe(
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
    );
  }

  /**
   * Get pumping records for a specific baby from backend
   */
  getPumpingRecords(babyId: string): Observable<any[]> {
    return this.apiService.getPumpingRecords(babyId).pipe(
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
    );
  }

  /**
   * Get diaper change records for a specific baby from backend
   * Note: This method is not yet implemented in the API service
   */
  getDiaperChangeRecords(babyId: string): Observable<any[]> {
    // TODO: Implement when backend endpoint is available
    console.warn('Diaper change records API not yet implemented');
    return of([]);
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
   * Refresh feed records for a baby (used after adding new record)
   */
  private async refreshFeedRecords(babyId: string): Promise<void> {
    try {
      const response = await this.apiService.getFeedRecords(babyId).toPromise();
      if (response?.success && response.data) {
        // Update local cache if needed
        console.log('Feed records refreshed for baby:', babyId);
      }
    } catch (error) {
      console.warn('Failed to refresh feed records:', error);
    }
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
        quantity: backendData.expressed_quantity
      } : undefined,
      formulaDetails: backendData.formula_quantity ? {
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