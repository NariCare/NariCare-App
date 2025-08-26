import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Consultation, Expert } from '../models/consultation.model';
import { Storage } from '@ionic/storage-angular';
import { ApiService, ExpertResponse, ConsultationResponse, CreateConsultationRequest } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {

  // No mock data - all data comes from API

  constructor(private storage: Storage, private apiService: ApiService) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
  }
  getExperts(): Observable<Expert[]> {
    return this.apiService.getExperts().pipe(
      map(response => {
        if (response.success && response.data && response.data.length > 0) {
          return response.data.map(expert => this.mapExpertResponseToExpert(expert));
        }
        // Return empty array if no data found
        return [];
      }),
      catchError(error => {
        console.error('Error loading experts from API:', error);
        // Re-throw error to be handled by UI
        throw error;
      })
    );
  }

  getExpert(expertId: string): Observable<Expert | undefined> {
    return this.apiService.getExpertById(expertId).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.mapExpertResponseToExpert(response.data);
        }
        return undefined;
      }),
      catchError(error => {
        console.error('Error loading expert from API:', error);
        // Re-throw error to be handled by UI
        throw error;
      })
    );
  }

  getUserConsultations(userId: string, status?: 'scheduled' | 'completed' | 'cancelled', upcoming?: boolean): Observable<Consultation[]> {
    console.log('Getting user consultations for userId:', userId, 'status:', status, 'upcoming:', upcoming);
    
    return this.apiService.getUserConsultations(status, upcoming).pipe(
      map(response => {
        console.log('getUserConsultations API response:', response);
        if (response.success && response.data && response.data.length > 0) {
          const consultations = response.data.map(consultation => {
            const mapped = this.mapConsultationResponseToConsultation(consultation);
            console.log('Mapped consultation:', { 
              original: consultation, 
              mapped: mapped,
              scheduledAt: mapped.scheduledAt,
              scheduled_at: mapped.scheduled_at
            });
            return mapped;
          });
          console.log('Final consultations array:', consultations);
          return consultations;
        }
        console.log('No consultations found in API response');
        // Return empty array if no consultations found
        return [];
      }),
      catchError(error => {
        console.error('Error loading consultations from API:', error);
        // Re-throw error to be handled by UI
        throw error;
      })
    );
  }

  async scheduleConsultation(consultation: Omit<Consultation, 'id'>): Promise<void> {
    const expertId = consultation.expert_id || consultation.expertId || '';
    const scheduledAt = consultation.scheduled_at || (consultation.scheduledAt ? consultation.scheduledAt.toISOString() : '');
    
    console.log('Scheduling consultation with:', {
      originalExpertId: expertId,
      scheduledAt,
      topic: consultation.topic,
      notes: consultation.notes
    });

    // Validate expert ID format
    if (!expertId) {
      throw new Error('Expert ID is required');
    }

    // Validate scheduled date
    if (!scheduledAt) {
      throw new Error('Scheduled date/time is required');
    }

    // Ensure scheduledAt is a valid ISO string
    let validScheduledAt: string;
    try {
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      validScheduledAt = date.toISOString();
    } catch (error) {
      throw new Error('Invalid scheduled date format');
    }

    // Check if expertId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const finalExpertId = uuidRegex.test(expertId) ? expertId : await this.resolveExpertId(expertId);

    console.log('Using expert ID:', finalExpertId);

    const consultationRequest: CreateConsultationRequest = {
      expertId: finalExpertId,
      scheduledAt: validScheduledAt,
      topic: consultation.topic,
      notes: consultation.notes,
      consultation_type: consultation.consultation_type || 'scheduled',
      meeting_link: consultation.meeting_link || consultation.meetingLink || undefined
    };

    console.log('Final consultation request:', consultationRequest);

    const response = await this.apiService.createConsultation(consultationRequest).toPromise();
    if (response?.success) {
      console.log('Consultation scheduled successfully:', response.data);
    } else {
      console.error('Consultation scheduling failed:', response);
      throw new Error(response?.error || 'Failed to schedule consultation');
    }
  }

  private async resolveExpertId(expertId: string): Promise<string> {
    // If the ID is not a UUID, we might need to look up the expert to get the proper UUID
    // or generate one if the backend expects it
    console.log('Resolving non-UUID expert ID:', expertId);
    
    // For now, try to use the ID as-is but log a warning
    // In a real scenario, you might need to:
    // 1. Query the expert by the non-UUID ID to get the UUID
    // 2. Or work with backend to handle non-UUID IDs
    console.warn('Expert ID is not in UUID format. Using as-is, but this may cause validation errors.');
    return expertId;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Mapping functions to convert API responses to frontend models
  private mapExpertResponseToExpert(expertResponse: ExpertResponse): Expert {
    return {
      id: expertResponse.id,
      user_id: expertResponse.user_id,
      first_name: expertResponse.first_name,
      last_name: expertResponse.last_name,
      email: expertResponse.email,
      credentials: expertResponse.credentials,
      specialties: expertResponse.specialties,
      bio: expertResponse.bio,
      profile_image: expertResponse.profile_image,
      years_of_experience: expertResponse.years_of_experience,
      rating: expertResponse.rating,
      total_consultations: expertResponse.total_consultations,
      pricing_per_session: expertResponse.pricing_per_session,
      available_from: expertResponse.available_from,
      available_to: expertResponse.available_to,
      timezone: expertResponse.timezone,
      created_at: expertResponse.created_at,
      updated_at: expertResponse.updated_at,
      // Legacy compatibility fields
      name: `${expertResponse.first_name} ${expertResponse.last_name}`,
      profileImage: expertResponse.profile_image,
      totalConsultations: expertResponse.total_consultations,
      availability: [] // Would need to be fetched separately
    };
  }

  private mapConsultationResponseToConsultation(consultationResponse: ConsultationResponse): Consultation {
    const scheduledAt = new Date(consultationResponse.scheduled_at);
    
    // Convert old Jitsi links to Whereby links if needed
    const originalMeetingLink = consultationResponse.meeting_link;
    let convertedMeetingLink = originalMeetingLink;
    
    if (originalMeetingLink && originalMeetingLink.includes('meet.jit.si')) {
      console.log('Converting old Jitsi link to Whereby:', originalMeetingLink);
      // Extract room name from Jitsi link and create Whereby equivalent
      const roomName = originalMeetingLink.split('/').pop()?.split('#')[0];
      if (roomName) {
        convertedMeetingLink = `https://whereby.com/${roomName}`;
        console.log('Converted to Whereby link:', convertedMeetingLink);
      }
    }
    
    return {
      id: consultationResponse.id,
      user_id: consultationResponse.user_id,
      expert_id: consultationResponse.expert_id,
      consultation_type: consultationResponse.consultation_type,
      status: consultationResponse.status,
      scheduled_at: consultationResponse.scheduled_at,
      actual_start_time: consultationResponse.actual_start_time,
      actual_end_time: consultationResponse.actual_end_time,
      topic: consultationResponse.topic,
      notes: consultationResponse.notes,
      meeting_link: convertedMeetingLink,
      expert_notes: consultationResponse.expert_notes,
      user_rating: consultationResponse.user_rating,
      user_feedback: consultationResponse.user_feedback,
      follow_up_required: consultationResponse.follow_up_required,
      created_at: consultationResponse.created_at,
      updated_at: consultationResponse.updated_at,
      user_first_name: consultationResponse.user_first_name,
      user_last_name: consultationResponse.user_last_name,
      user_email: consultationResponse.user_email,
      expert_first_name: consultationResponse.expert_first_name,
      expert_last_name: consultationResponse.expert_last_name,
      expert_email: consultationResponse.expert_email,
      expert_credentials: consultationResponse.expert_credentials,
      expert_rating: consultationResponse.expert_rating,
      expert_user_id: consultationResponse.expert_user_id,
      // Legacy compatibility fields
      userId: consultationResponse.user_id,
      expertId: consultationResponse.expert_id,
      type: consultationResponse.consultation_type,
      scheduledAt: scheduledAt,
      duration: 30, // Default duration, could be calculated from actual times
      meetingLink: convertedMeetingLink, // Legacy field using converted link
      followUpRequired: consultationResponse.follow_up_required,
      reminderSent: false // This field isn't in the API response
    };
  }

  async updateConsultation(id: string, updates: Partial<Consultation>): Promise<void> {
    const updateRequest = {
      scheduled_at: updates.scheduled_at || (updates.scheduledAt ? updates.scheduledAt.toISOString() : undefined),
      topic: updates.topic,
      notes: updates.notes,
      status: updates.status,
      expert_notes: updates.expert_notes,
      user_rating: updates.user_rating,
      user_feedback: updates.user_feedback,
      follow_up_required: updates.follow_up_required ?? updates.followUpRequired,
      actual_start_time: updates.actual_start_time,
      actual_end_time: updates.actual_end_time
    };

    const response = await this.apiService.updateConsultation(id, updateRequest).toPromise();
    if (response?.success) {
      console.log('Consultation updated successfully:', response.data);
    } else {
      throw new Error(response?.error || 'Failed to update consultation');
    }
  }

  async cancelConsultation(id: string): Promise<void> {
    const response = await this.apiService.cancelConsultation(id).toPromise();
    if (response?.success) {
      console.log('Consultation cancelled successfully:', response.data?.message);
    } else {
      throw new Error(response?.error || 'Failed to cancel consultation');
    }
  }
}