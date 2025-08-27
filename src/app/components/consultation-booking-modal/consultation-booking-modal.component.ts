import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConsultationService } from '../../services/consultation.service';
import { AuthService } from '../../services/auth.service';
import { Expert, Consultation } from '../../models/consultation.model';
import { User } from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-consultation-booking-modal',
  templateUrl: './consultation-booking-modal.component.html',
  styleUrls: ['./consultation-booking-modal.component.scss']
})
export class ConsultationBookingModalComponent implements OnInit {
  bookingForm: FormGroup;
  experts$: Observable<Expert[]>;
  user: User | null = null;
  selectedExpert: Expert | null = null;
  currentStep = 1;
  totalSteps = 3;
  minDate = new Date().toISOString();
  maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // Error handling properties
  expertsError: string | null = null;
  expertsLoading = true;
  hasExperts = false;

  // Edit mode properties
  @Input() consultation: Consultation | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    // Load experts with proper error handling
    this.experts$ = this.consultationService.getExperts().pipe(
      catchError(error => {
        console.error('Failed to load experts:', error);
        this.expertsError = 'Unable to load experts. Please check your connection and try again.';
        this.expertsLoading = false;
        this.hasExperts = false;
        return of([]);
      })
    );
    
    this.bookingForm = this.formBuilder.group({
      expertId: ['', [Validators.required]],
      scheduledDate: [new Date().toISOString(), [Validators.required]],
      scheduledTime: ['', [Validators.required]],
      topic: ['', [Validators.required]],
      notes: ['']
    });
  }

  ngOnInit() {
    // Check if we're in edit mode
    this.isEditMode = !!this.consultation;
    
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      
      // Initialize form with consultation data if editing
      if (this.isEditMode && this.consultation) {
        this.initializeFormForEditing();
      }
    });

    // Subscribe to experts to update loading states
    this.experts$.subscribe(experts => {
      this.expertsLoading = false;
      this.hasExperts = experts.length > 0;
      if (experts.length === 0 && !this.expertsError) {
        this.expertsError = 'No experts are currently available for consultation.';
      }
      
      // Set selected expert if editing
      if (this.isEditMode && this.consultation) {
        const expertId = this.consultation.expertId || this.consultation.expert_id;
        this.selectedExpert = experts.find(expert => expert.id === expertId) || null;
      }
    });
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  private initializeFormForEditing() {
    if (!this.consultation) return;
    
    const scheduledDate = this.consultation.scheduledAt || new Date(this.consultation.scheduled_at);
    const dateOnly = new Date(scheduledDate);
    const timeOnly = new Date(scheduledDate);
    
    // Format time as HH:mm
    const hours = timeOnly.getHours().toString().padStart(2, '0');
    const minutes = timeOnly.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    this.bookingForm.patchValue({
      expertId: this.consultation.expertId || this.consultation.expert_id,
      scheduledDate: dateOnly.toISOString(),
      scheduledTime: formattedTime,
      topic: this.consultation.topic,
      notes: this.consultation.notes || ''
    });
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedExpert;
      case 2:
        const dateTimeFields = ['scheduledDate', 'scheduledTime'];
        return this.validateFields(dateTimeFields);
      case 3:
        const topicFields = ['topic'];
        return this.validateFields(topicFields);
      default:
        return false;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    fieldNames.forEach(fieldName => {
      const control = this.bookingForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });
    return isValid;
  }

  selectExpert(expert: Expert) {
    this.selectedExpert = expert;
    this.bookingForm.patchValue({ expertId: expert.id });
  }

  getExpertImage(expert: Expert): string {
    return expert.profile_image || expert.profileImage || 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=300';
  }

  getExpertConsultations(expert: Expert): number {
    return expert.total_consultations || expert.totalConsultations || 0;
  }

  retryLoadExperts() {
    this.expertsError = null;
    this.expertsLoading = true;
    this.hasExperts = false;
    
    this.experts$ = this.consultationService.getExperts().pipe(
      catchError(error => {
        console.error('Failed to load experts:', error);
        this.expertsError = 'Unable to load experts. Please check your connection and try again.';
        this.expertsLoading = false;
        this.hasExperts = false;
        return of([]);
      })
    );

    // Re-subscribe to update loading states
    this.experts$.subscribe(experts => {
      this.expertsLoading = false;
      this.hasExperts = experts.length > 0;
      if (experts.length === 0 && !this.expertsError) {
        this.expertsError = 'No experts are currently available for consultation.';
      }
    });
  }

  async bookConsultation() {
    if (this.bookingForm.valid && this.user && this.selectedExpert) {
      const loading = await this.loadingController.create({
        message: this.isEditMode ? 'Updating your consultation...' : 'Booking your consultation...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.bookingForm.value;
        
        // Combine date and time
        const scheduledDateTime = new Date(formValue.scheduledDate);
        const [hours, minutes] = formValue.scheduledTime.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

        if (this.isEditMode && this.consultation) {
          // Update existing consultation
          const updates = {
            expert_id: this.selectedExpert.id,
            scheduled_at: scheduledDateTime.toISOString(),
            topic: formValue.topic,
            notes: formValue.notes,
            updated_at: new Date().toISOString()
          };

          await this.consultationService.updateConsultation(this.consultation.id, updates);
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: 'Consultation updated successfully!',
            duration: 4000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          await this.modalController.dismiss({ updated: true });

        } else {
          // Create new consultation
          // Generate unique meeting link using JaaS (Jitsi as a Service)
          const timestamp = Date.now().toString().slice(-8);
          const randomString = Math.random().toString(36).substring(2, 8);
          const meetingId = `naricare-${timestamp}-${randomString}`;
          const meetingLink = `https://8x8.vc/vpaas-magic-cookie-6f3fc0395bc447f38a2ceb30c7ac54d5/${meetingId}`;

          const consultation: Omit<Consultation, 'id'> = {
            user_id: this.user.uid,
            expert_id: this.selectedExpert.id,
            consultation_type: 'scheduled',
            status: 'scheduled',
            scheduled_at: scheduledDateTime.toISOString(),
            topic: formValue.topic,
            notes: formValue.notes,
            follow_up_required: false,
            meeting_link: meetingLink,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Legacy compatibility fields
            userId: this.user.uid,
            expertId: this.selectedExpert.id,
            type: 'scheduled',
            scheduledAt: scheduledDateTime,
            duration: 30,
            followUpRequired: false,
            reminderSent: false
          };

          await this.consultationService.scheduleConsultation(consultation);
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: 'Consultation booked successfully! You will receive a reminder before your appointment.',
            duration: 4000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          await this.modalController.dismiss({ booked: true });
        }

      } catch (error: any) {
        await loading.dismiss();
        
        let errorMessage = 'Failed to book consultation. Please try again.';
        
        // Handle detailed validation errors
        if (error.message) {
          try {
            // Try to parse if it's a JSON error with details
            const errorData = JSON.parse(error.message);
            if (errorData.details && Array.isArray(errorData.details)) {
              // Format validation errors nicely
              errorMessage = errorData.details.map((detail: any) => 
                `${detail.field}: ${detail.message}`
              ).join('\n');
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // If not JSON, use the error message as is
            errorMessage = error.message;
          }
        }

        const toast = await this.toastController.create({
          message: errorMessage,
          duration: 5000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.bookingForm.controls).forEach(key => {
      this.bookingForm.get(key)?.markAsTouched();
    });
  }

  getErrorMessage(field: string): string {
    const control = this.bookingForm.get(field);
    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    return '';
  }

  getAvailableTimeSlots(): string[] {
    if (!this.selectedExpert) return [];
    
    // Generate time slots based on expert availability
    // For demo purposes, return common consultation times
    return [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00', '18:30'
    ];
  }

  formatExpertSpecialties(specialties: string[]): string {
    return specialties.join(', ');
  }

  getExpertName(expert: Expert): string {
    if (expert.name) {
      return expert.name; // Legacy field
    }
    return `${expert.first_name || ''} ${expert.last_name || ''}`.trim();
  }

  getExpertCredentials(expert: Expert): string {
    return expert.credentials || '';
  }

  getExpertRatingStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    
    if (hasHalfStar) {
      stars.push('star-half');
    }
    
    while (stars.length < 5) {
      stars.push('star-outline');
    }
    
    return stars;
  }
}