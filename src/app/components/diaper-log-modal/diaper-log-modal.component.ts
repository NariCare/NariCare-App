import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { BackendGrowthService } from '../../services/backend-growth.service';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ChangeTypeOptions, DiaperChangeRecord, WetnessOptions } from '../../models/growth-tracking.model';
import { DiaperChangeRequest } from '../../services/api.service';
import { User, Baby } from '../../models/user.model';

@Component({
  selector: 'app-diaper-log-modal',
  templateUrl: './diaper-log-modal.component.html',
  styleUrls: ['./diaper-log-modal.component.scss']
})
export class DiaperLogModalComponent implements OnInit {
  @Input() selectedBaby?: Baby;

  diaperForm: FormGroup;
  user: User | null = null;
  currentStep = 1;
  totalSteps = 5;
  selectedBabyLocal: Baby | null = null;
  selectedChangeType: 'pee' | 'poop' | 'both' | null = null;
  selectedWetness: 'light' | 'medium' | 'heavy' | null = null;

  changeTypeOptions: ChangeTypeOptions[] = [
    { value: 'pee', label: 'Pee', icon: '💦', description: 'Wet diaper only' },
    { value: 'poop', label: 'Poop', icon: '💩', description: 'Dirty diaper only' },
    { value: 'both', label: 'Both', icon: '💦💩', description: 'Wet and dirty' }
  ];

  wetnessOptions: WetnessOptions[] = [
    { value: 'light', label: 'Light', description: '1 pee - barely wet' },
    { value: 'medium', label: 'Medium', description: '2 pees - moderately wet' },
    { value: 'heavy', label: 'Heavy', description: '3+ pees - soaked' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private backendGrowthService: BackendGrowthService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService
  ) {
    this.diaperForm = this.formBuilder.group({
      selectedBaby: ['', [Validators.required]],
      changeType: ['', [Validators.required]],
      wetness: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    // Try backend auth service first, fallback to legacy auth service
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies && user.babies.length > 0) {
        // Auto-select baby if passed as input or only one exists
        if (this.selectedBaby) {
          this.selectedBabyLocal = this.selectedBaby;
          this.diaperForm.patchValue({ selectedBaby: this.selectedBaby.id });
          this.currentStep = 2; // Skip baby selection step
        } else if (user.babies.length === 1) {
          this.selectedBabyLocal = user.babies[0];
          this.diaperForm.patchValue({ selectedBaby: user.babies[0].id });
          this.currentStep = 2; // Skip baby selection step
        }
      }
    });

    // Update total steps based on whether baby selection is needed
    this.updateTotalSteps();
  }

  private updateTotalSteps() {
    if (this.user && this.user.babies.length <= 1) {
      this.totalSteps = 4; // Skip baby selection step
    } else {
      this.totalSteps = 5; // Include baby selection step
    }
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
        return !!this.selectedBabyLocal;
      case 2:
        return !!this.selectedChangeType;
      case 3:
        // Wetness is only required if change type is 'pee' or 'both'
        if (this.selectedChangeType === 'pee' || this.selectedChangeType === 'both') {
          return !!this.selectedWetness;
        }
        return true; // Skip wetness for 'poop' only
      case 4:
        return true; // Notes are optional
      default:
        return false;
    }
  }

  // Baby selection
  selectBaby(baby: Baby) {
    this.selectedBabyLocal = baby;
    this.diaperForm.patchValue({ selectedBaby: baby.id });
  }

  // Change type selection
  selectChangeType(type: 'pee' | 'poop' | 'both') {
    this.selectedChangeType = type;
    this.diaperForm.patchValue({ changeType: type });
    
    // Reset wetness if changing to poop only
    if (type === 'poop') {
      this.selectedWetness = null;
      this.diaperForm.patchValue({ wetness: '' });
    }
  }

  // Wetness selection
  selectWetness(wetness: 'light' | 'medium' | 'heavy') {
    this.selectedWetness = wetness;
    this.diaperForm.patchValue({ wetness: wetness });
  }

  // Check if wetness step should be shown
  shouldShowWetnessStep(): boolean {
    return this.selectedChangeType === 'pee' || this.selectedChangeType === 'both';
  }

  // Skip wetness step if not needed
  skipWetnessStep() {
    if (!this.shouldShowWetnessStep()) {
      this.currentStep++; // Skip to notes step
    }
  }

  // Form submission
  async saveDiaperLog() {
    if (this.diaperForm.valid && this.user && this.selectedBabyLocal && this.selectedChangeType) {
      try {
        const formValue = this.diaperForm.value;
        
        // Transform to backend API format
        const record: DiaperChangeRequest = {
          babyId: this.selectedBabyLocal.id,
          recordDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          recordTime: new Date().toTimeString().slice(0, 5), // HH:MM format
          changeType: this.selectedChangeType,
          wetnessLevel: this.selectedWetness || undefined,
          notes: formValue.notes || undefined,
          enteredViaVoice: false
        };

        // Try backend service first, fallback to local storage
        const isBackendUser = this.backendAuthService.getCurrentUser();
        
        if (isBackendUser) {
          await this.backendGrowthService.addDiaperChangeRecord(record);
        } else {
          // Convert back to legacy format for local storage
          const legacyRecord: Omit<DiaperChangeRecord, 'id' | 'createdAt'> = {
            babyId: this.selectedBabyLocal.id,
            recordedBy: this.user.uid,
            date: new Date(),
            time: new Date().toTimeString().slice(0, 5),
            type: this.selectedChangeType,
            wetness: this.selectedWetness || undefined,
            notes: formValue.notes,
            enteredViaVoice: false
          };
          await this.growthService.addDiaperChangeRecord(legacyRecord);
        }
        
        const toast = await this.toastController.create({
          message: 'Diaper change logged successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error: any) {
        console.error('Error saving diaper log:', error);
        
        let errorMessage = 'Failed to save diaper log. Please try again.';
        if (error?.message) {
          errorMessage = error.message;
        }
        
        const toast = await this.toastController.create({
          message: errorMessage,
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  canSave(): boolean {
    return this.diaperForm.valid && 
           !!this.selectedBabyLocal && 
           !!this.selectedChangeType &&
           (this.shouldShowWetnessStep() ? !!this.selectedWetness : true);
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  calculateBabyAge(baby: Baby): string {
    const birthDate = new Date(baby.dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
    } else if (diffWeeks < 52) {
      const months = Math.floor(diffWeeks / 4);
      const remainingWeeks = diffWeeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    } else {
      const years = Math.floor(diffWeeks / 52);
      const remainingWeeks = diffWeeks % 52;
      const months = Math.floor(remainingWeeks / 4);
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} old`;
    }
  }

  public getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  getUserBabiesLength(): number {
    return this.user && this.user.babies ? this.user.babies.length : 0;
  }

  getFlexValue(): string {
    return this.getUserBabiesLength() > 1 ? '2' : '1';
  }

  getNotesStepCondition(): boolean {
    return (this.currentStep === 3 && !this.shouldShowWetnessStep()) || 
           (this.currentStep === 4 && this.shouldShowWetnessStep());
  }

  getReviewStepCondition(): boolean {
    return (this.currentStep === 4 && !this.shouldShowWetnessStep()) || 
           (this.currentStep === 5 && this.shouldShowWetnessStep());
  }

  canSaveCheck(): boolean {
    return this.canSave();
  }

  getChangeTypeIcon(): string {
    const changeType = this.changeTypeOptions.find(opt => opt.value === this.selectedChangeType);
    return changeType ? changeType.icon : '';
  }

  getChangeTypeLabel(): string {
    const changeType = this.changeTypeOptions.find(opt => opt.value === this.selectedChangeType);
    return changeType ? changeType.label : '';
  }
}