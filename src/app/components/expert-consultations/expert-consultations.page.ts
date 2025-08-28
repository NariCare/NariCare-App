import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ConsultationService } from '../../services/consultation.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { Consultation, Expert } from '../../models/consultation.model';
import { User } from '../../models/user.model';
import { ConsultationBookingModalComponent } from '../consultation-booking-modal/consultation-booking-modal.component';

@Component({
  selector: 'app-expert-consultations',
  templateUrl: './expert-consultations.page.html',
  styleUrls: ['./expert-consultations.page.scss'],
})
export class ExpertConsultationsPage implements OnInit, OnDestroy {
  @Input() user: User | null = null;
  
  selectedTab: 'upcoming' | 'history' = 'upcoming';
  upcomingConsultations: Consultation[] = [];
  completedConsultations: Consultation[] = [];
  pastConsultations: Consultation[] = [];
  experts: Expert[] = [];
  
  // Loading states
  consultationsLoading = false;
  consultationsError: string | null = null;
  
  // Subscriptions
  private consultationSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private consultationService: ConsultationService,
    private authService: BackendAuthService
  ) { }

  ngOnInit() {
    // If user is not passed as input, get from auth service
    if (!this.user) {
      this.authService.currentUser$.subscribe(user => {
        this.user = user;
        if (user?.role === 'expert') {
          this.loadExpertConsultations();
        }
      });
    } else if (this.user?.role === 'expert') {
      this.loadExpertConsultations();
    }
    
    this.loadExperts();
  }
  
  ngOnDestroy() {
    if (this.consultationSubscription) {
      this.consultationSubscription.unsubscribe();
    }
  }

  private loadExpertConsultations() {
    if (!this.user?.uid) {
      console.warn('No expert user available for loading consultations');
      return;
    }
    
    this.consultationsLoading = true;
    this.consultationsError = null;
    
    try {
      // Get all expert consultations without status filter to handle both upcoming and history
      this.consultationSubscription = this.consultationService.getExpertConsultations().subscribe({
        next: (consultations) => {
          this.consultationsLoading = false;
          console.log('Loaded expert consultations:', consultations);
          
          const safeConsultations = Array.isArray(consultations) ? consultations : [];
          const now = new Date();
          
          // Filter upcoming consultations
          this.upcomingConsultations = safeConsultations.filter(consultation => {
            if (!consultation.scheduledAt && !consultation.scheduled_at) {
              return false;
            }
            
            try {
              const consultationDate = consultation.scheduledAt 
                ? new Date(consultation.scheduledAt)
                : new Date(consultation.scheduled_at);
              return consultationDate > now && consultation.status === 'scheduled';
            } catch (error) {
              console.error('Error processing consultation date:', error, consultation);
              return false;
            }
          });
          
          // Filter completed consultations
          this.completedConsultations = safeConsultations.filter(consultation => 
            consultation.status === 'completed'
          );
          
          // Filter past/cancelled consultations
          this.pastConsultations = safeConsultations.filter(consultation => {
            try {
              const consultationDate = consultation.scheduledAt 
                ? new Date(consultation.scheduledAt)
                : new Date(consultation.scheduled_at);
              return consultation.status === 'cancelled' || 
                     (consultationDate <= now && consultation.status !== 'completed' && consultation.status !== 'scheduled');
            } catch (error) {
              console.error('Error processing consultation date for past consultations:', error, consultation);
              return consultation.status === 'cancelled';
            }
          });
          
          console.log('Filtered consultations:', {
            upcoming: this.upcomingConsultations.length,
            completed: this.completedConsultations.length,
            past: this.pastConsultations.length
          });
        },
        error: (error) => {
          this.consultationsLoading = false;
          this.consultationsError = 'Unable to load consultations. Please try again.';
          this.upcomingConsultations = [];
          this.completedConsultations = [];
          this.pastConsultations = [];
          console.error('Error loading expert consultations:', error);
        }
      });
    } catch (error) {
      this.consultationsLoading = false;
      this.consultationsError = 'Failed to initialize consultation loading.';
      console.error('Consultation loading initialization error:', error);
    }
  }
  
  private loadExperts() {
    this.consultationService.getExperts().subscribe({
      next: (experts) => {
        this.experts = experts;
      },
      error: (error) => {
        console.error('Error loading experts:', error);
      }
    });
  }

  switchTab(tab: 'upcoming' | 'history') {
    this.selectedTab = tab;
  }

  getTabConsultations(): Consultation[] {
    switch (this.selectedTab) {
      case 'upcoming':
        return this.upcomingConsultations;
      case 'history':
        return [...this.completedConsultations, ...this.pastConsultations].sort((a, b) => {
          const dateA = new Date(a.scheduledAt || a.scheduled_at);
          const dateB = new Date(b.scheduledAt || b.scheduled_at);
          return dateB.getTime() - dateA.getTime(); // Sort by most recent first
        });
      default:
        return [];
    }
  }
  
  getClientName(consultation: Consultation): string {
    const firstName = consultation.user_first_name || '';
    const lastName = consultation.user_last_name || '';
    return `${firstName} ${lastName}`.trim() || consultation.user_email || 'Client';
  }
  
  async editConsultation(consultation: Consultation) {
    const modal = await this.modalController.create({
      component: ConsultationBookingModalComponent,
      componentProps: {
        consultation: consultation
      },
      cssClass: 'consultation-booking-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.updated) {
        this.loadExpertConsultations();
        this.showSuccessToast('Consultation updated successfully!');
      }
    });

    return await modal.present();
  }
  
  // Experts can join consultations at any time without restrictions
  async joinConsultation(consultation: Consultation) {
    const meetingLink = consultation.meeting_link || consultation.meetingLink;
    if (meetingLink) {
      // Update consultation status to in-progress if it's scheduled
      if (consultation.status === 'scheduled') {
        try {
          await this.consultationService.updateConsultationStatus(consultation.id, 'in-progress');
          console.log('Consultation marked as in-progress');
          this.loadExpertConsultations();
        } catch (error) {
          console.error('Error updating consultation status:', error);
        }
      }

      // Show join options
      const alert = await this.alertController.create({
        header: 'Join Consultation as Expert',
        message: 'Choose how to join your video consultation via JaaS (Jitsi as a Service). As an expert, you have unrestricted access to join at any time.',
        buttons: [
          {
            text: 'Open in Browser',
            cssClass: 'primary-button',
            handler: () => {
              window.open(meetingLink, '_blank');
            }
          },
          {
            text: 'Use In-App Call',
            handler: () => {
              this.router.navigate(['/video-call', consultation.id]);
            }
          },
          {
            text: 'Cancel',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    } else {
      this.showErrorToast('Meeting link not available for this consultation.');
    }
  }
  
  retryLoadConsultations() {
    this.loadExpertConsultations();
  }
  
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
  
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
