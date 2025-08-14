import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { DiaperChangeRecord } from '../../models/growth-tracking.model';
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

  changeTypeOptions = [
    { value: 'pee', label: 'Pee', icon: '💦', description: 'Wet diaper only' },
    { value: 'poop', label: 'Poop', icon: '💩', description: 'Dirty diaper only' },
    { value: 'both', label: 'Both', icon: '💦💩', description: 'Wet and dirty' }
  ];

  wetnessOptions = [
    { value: 'light', label: 'Light', description: '1 pee - barely wet' },
    { value: 'medium', label: 'Medium', description: '2 pees - moderately wet' },
    { value: 'heavy', label: 'Heavy', description: '3+ pees - soaked' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private authService: AuthService
  ) {
    this.diaperForm = this.formBuilder.group({
      selectedBaby: ['', [Validators.required]],
      changeType: ['', [Validators.required]],
      wetness: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
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
        
        const record: Omit<DiaperChangeRecord, 'id' | 'createdAt'> = {
          babyId: this.selectedBabyLocal.id,
          recordedBy: this.user.uid,
          date: new Date(),
          time: new Date().toTimeString().slice(0, 5),
          type: this.selectedChangeType,
          wetness: this.selectedWetness || undefined,
          notes: formValue.notes,
          enteredViaVoice: false
        };

        await this.growthService.addDiaperChangeRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Diaper change logged successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save diaper log. Please try again.',
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

  private getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }
}