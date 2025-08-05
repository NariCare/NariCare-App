import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
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

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private consultationService: ConsultationService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.experts$ = this.consultationService.getExperts();
    
    this.bookingForm = this.formBuilder.group({
      expertId: ['', [Validators.required]],
      scheduledDate: [new Date().toISOString(), [Validators.required]],
      scheduledTime: ['', [Validators.required]],
      topic: ['', [Validators.required]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  async closeModal() {
    await this.modalController.dismiss();
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

  async bookConsultation() {
    if (this.bookingForm.valid && this.user && this.selectedExpert) {
      const loading = await this.loadingController.create({
        message: 'Booking your consultation...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.bookingForm.value;
        
        // Combine date and time
        const scheduledDateTime = new Date(formValue.scheduledDate);
        const [hours, minutes] = formValue.scheduledTime.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

        // Generate unique meeting link
        const meetingId = uuidv4();
        const meetingLink = `https://meet.jit.si/naricare-consultation-${meetingId}`;

        const consultation: Omit<Consultation, 'id'> = {
          userId: this.user.uid,
          expertId: this.selectedExpert.id,
          type: 'scheduled',
          status: 'scheduled',
          scheduledAt: scheduledDateTime,
          duration: 30, // Default 30 minutes
          topic: formValue.topic,
          notes: formValue.notes,
          followUpRequired: false,
          meetingLink: meetingLink,
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

      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Failed to book consultation. Please try again.',
          duration: 3000,
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