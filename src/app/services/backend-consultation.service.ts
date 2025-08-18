import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService, ConsultationRequest } from './api.service';
import { Consultation, Expert } from '../models/consultation.model';

@Injectable({
  providedIn: 'root'
})
export class BackendConsultationService {
  private expertsSubject = new BehaviorSubject<Expert[]>([]);
  private consultationsSubject = new BehaviorSubject<Consultation[]>([]);

  constructor(private apiService: ApiService) {
    this.loadExperts();
    this.loadUserConsultations();
  }

  // ============================================================================
  // EXPERT METHODS
  // ============================================================================

  getExperts(): Observable<Expert[]> {
    return this.expertsSubject.asObservable();
  }

  getExpert(expertId: string): Observable<Expert | undefined> {
    // First check local cache
    const cachedExpert = this.expertsSubject.value.find(e => e.id === expertId);
    if (cachedExpert) {
      return of(cachedExpert);
    }

    // If not in cache, fetch from API
    return this.apiService.getExpertById(expertId).pipe(
      map(response => {
        if (response.success && response.data) {
          const expert = this.transformExpert(response.data);
          
          // Add to local cache
          const currentExperts = this.expertsSubject.value;
          this.expertsSubject.next([...currentExperts, expert]);
          
          return expert;
        }
        return undefined;
      }),
      catchError((error) => {
        console.error('Error loading expert:', error);
        return of(undefined);
      })
    );
  }

  getExpertAvailability(expertId: string, date: Date): Observable<any> {
    const dateString = date.toISOString().split('T')[0];
    
    return this.apiService.getExpertAvailability(expertId, dateString).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error loading expert availability:', error);
        return of(null);
      })
    );
  }

  // ============================================================================
  // CONSULTATION METHODS
  // ============================================================================

  getUserConsultations(userId: string): Observable<Consultation[]> {
    return this.consultationsSubject.asObservable();
  }

  getConsultationById(consultationId: string): Observable<Consultation | undefined> {
    return this.consultationsSubject.pipe(
      map(consultations => consultations.find(c => c.id === consultationId))
    );
  }

  async scheduleConsultation(consultation: Omit<Consultation, 'id'>): Promise<void> {
    try {
      const consultationData: ConsultationRequest = {
        expertId: consultation.expertId,
        scheduledAt: consultation.scheduledAt.toISOString(),
        duration: consultation.duration,
        topic: consultation.topic,
        notes: consultation.notes
      };

      const response = await this.apiService.bookConsultation(consultationData).toPromise();
      
      if (response?.success && response.data) {
        const newConsultation = this.transformConsultation(response.data);
        
        // Add to local cache
        const currentConsultations = this.consultationsSubject.value;
        this.consultationsSubject.next([...currentConsultations, newConsultation]);
      } else {
        throw new Error(response?.message || 'Failed to schedule consultation');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async updateConsultation(id: string, updates: Partial<Consultation>): Promise<void> {
    try {
      const response = await this.apiService.updateConsultation(id, updates).toPromise();
      
      if (response?.success) {
        // Update local cache
        const currentConsultations = this.consultationsSubject.value;
        const updatedConsultations = currentConsultations.map(consultation => 
          consultation.id === id ? { ...consultation, ...updates } : consultation
        );
        this.consultationsSubject.next(updatedConsultations);
      } else {
        throw new Error(response?.message || 'Failed to update consultation');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async cancelConsultation(id: string): Promise<void> {
    try {
      const response = await this.apiService.cancelConsultation(id).toPromise();
      
      if (response?.success) {
        // Update local cache
        const currentConsultations = this.consultationsSubject.value;
        const updatedConsultations = currentConsultations.map(consultation => 
          consultation.id === id ? { ...consultation, status: 'cancelled' as const } : consultation
        );
        this.consultationsSubject.next(updatedConsultations);
      } else {
        throw new Error(response?.message || 'Failed to cancel consultation');
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private loadExperts(): void {
    this.apiService.getExperts().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const experts = response.data.map(this.transformExpert);
          this.expertsSubject.next(experts);
        }
      },
      error: (error) => {
        console.error('Error loading experts:', error);
      }
    });
  }

  private loadUserConsultations(): void {
    if (this.apiService.isAuthenticated()) {
      this.apiService.getUserConsultations().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const consultations = response.data.map(this.transformConsultation);
            this.consultationsSubject.next(consultations);
          }
        },
        error: (error) => {
          console.error('Error loading user consultations:', error);
        }
      });
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  private transformExpert = (apiExpert: any): Expert => {
    return {
      id: apiExpert.id,
      name: apiExpert.name,
      credentials: apiExpert.credentials,
      specialties: apiExpert.specialties || [],
      bio: apiExpert.bio,
      profileImage: apiExpert.profile_image || apiExpert.profileImage,
      rating: apiExpert.rating || 5.0,
      totalConsultations: apiExpert.total_consultations || apiExpert.totalConsultations || 0,
      availability: apiExpert.availability || []
    };
  };

  private transformConsultation = (apiConsultation: any): Consultation => {
    return {
      id: apiConsultation.id,
      userId: apiConsultation.user_id || apiConsultation.userId,
      expertId: apiConsultation.expert_id || apiConsultation.expertId,
      type: apiConsultation.type || 'scheduled',
      status: apiConsultation.status || 'scheduled',
      scheduledAt: new Date(apiConsultation.scheduled_at || apiConsultation.scheduledAt),
      duration: apiConsultation.duration || 30,
      topic: apiConsultation.topic,
      notes: apiConsultation.notes,
      followUpRequired: apiConsultation.follow_up_required || apiConsultation.followUpRequired || false,
      meetingLink: apiConsultation.meeting_link || apiConsultation.meetingLink,
      reminderSent: apiConsultation.reminder_sent || apiConsultation.reminderSent || false
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
  // UTILITY METHODS
  // ============================================================================

  // Method to refresh all data
  refreshData(): void {
    this.loadExperts();
    this.loadUserConsultations();
  }

  // Method to get available time slots for an expert on a specific date
  getAvailableTimeSlots(expertId: string, date: Date): Observable<string[]> {
    return this.getExpertAvailability(expertId, date).pipe(
      map(availability => {
        if (availability && availability.timeSlots) {
          return availability.timeSlots;
        }
        
        // Fallback to default time slots
        return [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
          '17:00', '17:30', '18:00', '18:30'
        ];
      })
    );
  }

  // Method to check if a consultation can be joined (within 15 minutes of start time)
  canJoinConsultation(consultation: Consultation): boolean {
    const now = new Date();
    const consultationTime = new Date(consultation.scheduledAt);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Allow joining 15 minutes before scheduled time and up to 30 minutes after
    return minutesDiff <= 15 && minutesDiff >= -30;
  }

  // Method to get consultation status display
  getConsultationStatusDisplay(consultation: Consultation): {
    text: string;
    color: string;
    canJoin: boolean;
  } {
    const now = new Date();
    const consultationTime = new Date(consultation.scheduledAt);
    const timeDiff = consultationTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (consultation.status === 'completed') {
      return { text: 'Completed', color: 'success', canJoin: false };
    }

    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: 'danger', canJoin: false };
    }

    if (minutesDiff <= 15 && minutesDiff >= -30) {
      return { text: 'Join Call', color: 'primary', canJoin: true };
    }

    if (minutesDiff > 15) {
      const hours = Math.floor(minutesDiff / 60);
      const minutes = Math.floor(minutesDiff % 60);
      
      if (hours > 0) {
        return { text: `In ${hours}h ${minutes}m`, color: 'medium', canJoin: false };
      } else {
        return { text: `In ${minutes}m`, color: 'warning', canJoin: false };
      }
    }

    return { text: 'Missed', color: 'danger', canJoin: false };
  }
}