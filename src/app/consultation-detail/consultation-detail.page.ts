import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Consultation } from '../models/consultation.model';
import { ConsultationService } from '../services/consultation.service';
import { ApiService } from '../services/api.service';
import { BackendAuthService } from '../services/backend-auth.service';
import { User } from '../models/user.model';
import { ExpertNotesService } from '../services/expert-notes.service';
import { ExpertNote, ExpertLink } from '../models/expert-notes.model';
import { QuickNotesComponent } from '../components/quick-notes/quick-notes.component';

@Component({
  selector: 'app-consultation-detail',
  templateUrl: './consultation-detail.page.html',
  styleUrls: ['./consultation-detail.page.scss'],
})
export class ConsultationDetailPage implements OnInit, OnDestroy {
  consultationId: string = '';
  consultation: Consultation | null = null;
  onboardingData: any = null;
  currentUser: User | null = null;
  selectedTab: 'onboarding' | 'report' = 'onboarding';
  loading = false;
  
  // Expert notes editing state
  isEditingExpertNotes = false;
  expertNotesContent = '';
  expertNotesSaving = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private consultationService: ConsultationService,
    private apiService: ApiService,
    private authService: BackendAuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private expertNotesService: ExpertNotesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Get consultation ID from route params
    this.consultationId = this.route.snapshot.paramMap.get('id') || '';
    
    // Subscribe to current user
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    if (this.consultationId) {
      this.loadConsultationDetails();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadConsultationDetails() {
    const loading = await this.loadingController.create({
      message: 'Loading consultation details...'
    });
    await loading.present();

    try {
      // Load consultation details
      const consultationResponse = await this.consultationService.getConsultationById(this.consultationId).toPromise();
      
      if (consultationResponse?.success && consultationResponse.data) {
        this.consultation = consultationResponse.data;
        
        // Load onboarding data for the user in this consultation
        await this.loadOnboardingData();
      } else {
        throw new Error('Failed to load consultation details');
      }
    } catch (error) {
      console.error('Error loading consultation details:', error);
      const toast = await this.toastController.create({
        message: 'Failed to load consultation details',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  private async loadOnboardingData() {
    if (!this.consultation) return;

    try {
      let onboardingResponse;
      
      // Load onboarding data based on user role
      if (this.currentUser?.role === 'expert') {
        // Expert viewing user's onboarding data - check multiple possible user ID fields
        const userId = this.consultation.user_id || this.consultation.userId;
        
        console.log('Expert loading onboarding data:', {
          consultation: this.consultation,
          userId: userId,
          userIdField: this.consultation.user_id,
          userIdAlt: this.consultation.userId,
          expertId: this.consultation.expert_id,
          expertUserId: this.consultation.expert_user_id
        });
        
        if (userId) {
          onboardingResponse = await this.apiService.getUserOnboardingData(
            userId, 
            true // Include expert notes
          ).toPromise();
        } else {
          console.error('No user ID found in consultation for expert to load onboarding data');
          return;
        }
      } else {
        // User viewing their own onboarding data
        onboardingResponse = await this.apiService.getOnboardingData(true).toPromise();
      }

      if (onboardingResponse?.success && onboardingResponse.data) {
        // Use setTimeout to ensure proper zone handling
        setTimeout(() => {
          this.onboardingData = onboardingResponse.data;
          console.log('Setting onboarding data in setTimeout:', this.onboardingData);
          // Initialize expert notes content for editing
          this.expertNotesContent = this.onboardingData.expertNotes || '';
          // Trigger change detection
          this.cdr.detectChanges();
        }, 0);
      }
    } catch (error) {
      console.warn('Could not load onboarding data:', error);
    }
  }

  selectTab(tab: 'onboarding' | 'report') {
    this.selectedTab = tab;
  }

  onSegmentChange(event: any) {
    this.selectedTab = event.detail.value;
  }

  goBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  getConsultationStatusColor(): string {
    if (!this.consultation) return 'medium';
    
    switch (this.consultation.status) {
      case 'scheduled': return 'primary';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getConsultationStatusText(): string {
    if (!this.consultation) return 'Unknown';
    
    switch (this.consultation.status) {
      case 'scheduled': return 'Scheduled';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid date';
    }
  }

  getExpertName(): string {
    if (!this.consultation) return 'Expert';
    
    if (this.consultation.expert_first_name && this.consultation.expert_last_name) {
      return `${this.consultation.expert_first_name} ${this.consultation.expert_last_name}`;
    }
    
    return 'Expert';
  }

  getUserName(): string {
    if (!this.consultation) return 'User';
    
    if (this.consultation.user_first_name && this.consultation.user_last_name) {
      return `${this.consultation.user_first_name} ${this.consultation.user_last_name}`;
    }
    
    return 'User';
  }

  // Helper methods for onboarding data display
  getPersonalInfo(): any {
    return this.onboardingData?.personalInfo || {};
  }

  getBabies(): any[] {
    return this.onboardingData?.pregnancyInfo?.babies || [];
  }

  getPregnancyInfo(): any {
    return this.onboardingData?.pregnancyInfo || {};
  }

  getBreastfeedingInfo(): any {
    return this.onboardingData?.breastfeedingInfo || {};
  }

  getMedicalInfo(): any {
    return this.onboardingData?.medicalInfo || {};
  }

  getFeedingInfo(): any {
    return this.onboardingData?.feedingInfo || {};
  }

  getSupportInfo(): any {
    return this.onboardingData?.supportInfo || {};
  }

  getPreferencesInfo(): any {
    return this.onboardingData?.preferencesInfo || {};
  }

  hasExpertNotes(): boolean {
    return !!(this.consultation?.expert_notes || this.onboardingData?.expertNotes);
  }

  getExpertNotes(): string {
    return this.consultation?.expert_notes || this.onboardingData?.expertNotes || '';
  }

  getExpertNotesDate(): string {
    if (this.onboardingData?.expertNotesUpdatedAt) {
      return this.formatDate(this.onboardingData.expertNotesUpdatedAt);
    }
    return '';
  }

  getExpertNotesAuthor(): string {
    return this.onboardingData?.expertNotesUpdatedBy || 'Expert';
  }

  getFormattedExpertNotes(): string {
    const notes = this.getExpertNotes();
    return notes.replace(/\n/g, '<br>');
  }

  isScheduled(): boolean {
    return this.consultation?.status === 'scheduled';
  }

  isCompleted(): boolean {
    return this.consultation?.status === 'completed';
  }

  isCancelled(): boolean {
    return this.consultation?.status === 'cancelled';
  }

  hasUserFeedback(): boolean {
    return this.isCompleted() && !!(this.consultation?.user_rating || this.consultation?.user_feedback);
  }

  /**
   * Toggle expert notes editing mode
   */
  toggleExpertNotesEdit() {
    if (this.currentUser?.role !== 'expert') return;
    
    if (this.isEditingExpertNotes) {
      // Cancel editing - revert to original content
      this.expertNotesContent = this.getExpertNotes();
    }
    
    this.isEditingExpertNotes = !this.isEditingExpertNotes;
  }

  /**
   * Start editing expert notes
   */
  startEditingExpertNotes() {
    if (this.currentUser?.role !== 'expert') return;
    
    this.expertNotesContent = this.getExpertNotes();
    this.isEditingExpertNotes = true;
  }

  /**
   * Open quick notes modal for experts to select notes/links to insert
   */
  async openQuickNotesModal() {
    if (this.currentUser?.role !== 'expert') return;

    const modal = await this.modalController.create({
      component: QuickNotesComponent,
      componentProps: {
        user: this.currentUser,
        isSelectionMode: true
      },
      cssClass: 'quick-notes-modal'
    });

    modal.onDidDismiss().then((result) => {
      console.log('Quick notes modal result:', result);
      
      if (result.data && result.data.selectedContent) {
        const selectedContent = result.data.selectedContent;
        const contentType = result.data.contentType;
        
        console.log('Selected content:', selectedContent);
        console.log('Content type:', contentType);
        
        let textToInsert = '';
        
        if (contentType === 'note') {
          const note = selectedContent as ExpertNote;
          textToInsert = note.content || note.title || '';
        } else {
          const link = selectedContent as ExpertLink;
          textToInsert = `${link.title || 'Link'}: ${link.url || ''}`;
        }
        
        console.log('Text to insert:', textToInsert);
        
        // Insert content into the textarea
        this.insertQuickNoteContent(textToInsert);
      }
    });

    await modal.present();
  }

  /**
   * Insert quick note content into the expert notes textarea
   */
  private insertQuickNoteContent(content: string) {
    // Start editing mode if not already
    if (!this.isEditingExpertNotes) {
      this.startEditingExpertNotes();
    }
    
    // Combine current content with selected content
    this.expertNotesContent = this.expertNotesContent 
      ? `${this.expertNotesContent}\n\n${content}` 
      : content;
  }

  /**
   * Save expert notes to backend
   */
  async saveExpertNotes() {
    if (!this.consultation || !this.currentUser || this.expertNotesSaving) return;

    this.expertNotesSaving = true;

    try {
      // Get the user ID from consultation for API call
      const userId = this.consultation.user_id || this.consultation.userId;
      
      if (!userId) {
        throw new Error('No user ID available for saving notes');
      }

      // Save expert notes via API
      const response = await this.apiService.updateExpertNotes(userId, this.expertNotesContent).toPromise();
      
      if (response?.success) {
        // Update local data
        if (this.onboardingData) {
          this.onboardingData.expertNotes = this.expertNotesContent;
          this.onboardingData.expertNotesUpdatedAt = new Date().toISOString();
          this.onboardingData.expertNotesUpdatedBy = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
        
        // Exit editing mode
        this.isEditingExpertNotes = false;
        
        const toast = await this.toastController.create({
          message: 'Expert notes saved successfully',
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      } else {
        throw new Error(response?.message || 'Failed to save expert notes');
      }
    } catch (error) {
      console.error('Error saving expert notes:', error);
      const toast = await this.toastController.create({
        message: 'Failed to save expert notes. Please try again.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.expertNotesSaving = false;
    }
  }

  /**
   * Format raw backend values to user-friendly text
   */
  formatValue(value: any, field?: string): string {
    if (!value) return 'Not specified';
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      return value.map(item => this.formatSingleValue(item, field)).join(', ');
    }
    
    return this.formatSingleValue(value, field);
  }

  private formatSingleValue(value: string, field?: string): string {
    if (!value) return 'Not specified';
    
    // Special formatting for specific fields
    switch (field) {
      case 'work_status':
        return this.formatWorkStatus(value);
      case 'education_level':
        return this.formatEducationLevel(value);
      case 'feeding_method':
        return this.formatFeedingMethod(value);
      case 'birth_type':
        return this.formatBirthType(value);
      case 'return_to_work':
        return this.formatReturnToWork(value);
      case 'household_income':
        return this.formatHouseholdIncome(value);
      default:
        // Generic formatting - replace underscores and capitalize
        return value.replace(/_/g, ' ')
                   .replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  private formatWorkStatus(status: string): string {
    const statusMap: {[key: string]: string} = {
      'employed': 'Employed',
      'unemployed': 'Unemployed',
      'maternity_leave': 'Maternity Leave',
      'student': 'Student'
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatEducationLevel(level: string): string {
    const levelMap: {[key: string]: string} = {
      'high_school': 'High School',
      'some_college': 'Some College',
      'bachelors': 'Bachelor\'s Degree',
      'masters': 'Master\'s Degree',
      'doctorate': 'Doctorate',
      'trade_school': 'Trade School'
    };
    return levelMap[level] || level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatFeedingMethod(method: string): string {
    const methodMap: {[key: string]: string} = {
      'exclusive_breastfeeding': 'Exclusive Breastfeeding',
      'exclusive_formula': 'Exclusive Formula',
      'combination_feeding': 'Combination Feeding',
      'pumping_only': 'Pumping Only'
    };
    return methodMap[method] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatBirthType(type: string): string {
    const typeMap: {[key: string]: string} = {
      'vaginal': 'Vaginal Delivery',
      'c_section': 'C-Section',
      'assisted': 'Assisted Delivery'
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatReturnToWork(timeline: string): string {
    const timelineMap: {[key: string]: string} = {
      '3_months': '3 Months',
      '6_months': '6 Months',
      '1_year': '1 Year',
      'not_planning': 'Not Planning to Return',
      'already_working': 'Already Working'
    };
    return timelineMap[timeline] || timeline.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatHouseholdIncome(income: string): string {
    const incomeMap: {[key: string]: string} = {
      '6l_10l': '6-10 Lakhs',
      '10l_15l': '10-15 Lakhs',
      '15l_20l': '15-20 Lakhs',
      '20l_plus': '20+ Lakhs',
      'under_3l': 'Under 3 Lakhs',
      '3l_6l': '3-6 Lakhs'
    };
    return incomeMap[income] || income.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format boolean values to Yes/No
   */
  formatBoolean(value: boolean): string {
    return value ? 'Yes' : 'No';
  }

  /**
   * Format support level (1-10) with descriptive text
   */
  formatSupportLevel(level: number): string {
    if (!level) return 'Not specified';
    
    const descriptions: {[key: number]: string} = {
      1: 'Very Low', 2: 'Low', 3: 'Low', 4: 'Moderate', 5: 'Moderate',
      6: 'Good', 7: 'Good', 8: 'Very Good', 9: 'Excellent', 10: 'Excellent'
    };
    
    return `${level}/10 (${descriptions[level] || 'Moderate'})`;
  }
}