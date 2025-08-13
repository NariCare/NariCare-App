import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { GrowthRecord, FeedType, PainLevel } from '../../models/growth-tracking.model';
import { User, Baby } from '../../models/user.model';

@Component({
  selector: 'app-feed-log-modal',
  templateUrl: './feed-log-modal.component.html',
  styleUrls: ['./feed-log-modal.component.scss']
})
export class FeedLogModalComponent implements OnInit {
  @Input() prefilledData?: Partial<GrowthRecord>;
  @Input() isFastFeed: boolean = false;

  feedForm: FormGroup;
  user: User | null = null;
  currentStep = 1;
  totalSteps = 5;
  selectedBaby: Baby | null = null;
  selectedFeedTypes: ('direct' | 'expressed' | 'formula')[] = [];
  selectedBreastSide: 'left' | 'right' | 'both' | null = null;
  selectedPainLevel: number | null = null;

  // Options
  feedTypeOptions: FeedType[] = [
    {
      value: 'direct',
      label: 'Fed baby directly',
      icon: 'body',
      description: 'Breastfeeding session'
    },
    {
      value: 'expressed',
      label: 'Gave expressed breastmilk',
      icon: 'water',
      description: 'Bottle with pumped milk'
    },
    {
      value: 'formula',
      label: 'Gave formula',
      icon: 'nutrition',
      description: 'Formula feeding'
    }
  ] as const;

  breastSideOptions = [
    { value: 'left', label: 'Left', icon: 'radio-button-on' },
    { value: 'right', label: 'Right', icon: 'radio-button-on' },
    { value: 'both', label: 'Both', icon: 'ellipse' }
  ] as const;

  painLevelOptions: PainLevel[] = [
    { value: 0, emoji: '😌', label: 'No pain' },
    { value: 1, emoji: '😐', label: 'Mild' },
    { value: 2, emoji: '😟', label: 'Moderate' },
    { value: 3, emoji: '😣', label: 'Strong' },
    { value: 4, emoji: '😖', label: 'Severe' }
  ];

  ebmPresets = [30, 60, 90, 120];
  formulaPresets = [30, 60, 90, 120, 160];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private authService: AuthService
  ) {
    this.feedForm = this.formBuilder.group({
      selectedBaby: ['', [Validators.required]],
      feedTypes: [[], [Validators.required]],
      // Direct feeding fields
      startTime: [this.getCurrentTime()],
      breastSide: [''],
      duration: [15, [Validators.min(1), Validators.max(120)]],
      painLevel: [null],
      // Expressed milk fields
      ebmQuantity: [0, [Validators.min(0), Validators.max(300)]],
      // Formula fields
      formulaQuantity: [0, [Validators.min(0), Validators.max(300)]],
      // Notes
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        // Auto-select baby if only one exists
        if (user.babies.length === 1) {
          this.selectedBaby = user.babies[0];
          this.feedForm.patchValue({ selectedBaby: user.babies[0].id });
          this.currentStep = 2; // Skip baby selection step
        }
      }
    });

    // Apply prefilled data if provided (for fast feed)
    if (this.prefilledData) {
      this.applyPrefilledData();
    }

    // Set up form validation
    this.setupFormValidation();
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  private applyPrefilledData() {
    if (this.prefilledData && this.isFastFeed) {
      // Pre-select direct feeding for fast feed
      this.selectedFeedTypes = ['direct'];
      this.selectedBreastSide = 'both';
      this.selectedPainLevel = 0;
      
      this.feedForm.patchValue({
        feedTypes: ['direct'],
        breastSide: 'both',
        duration: 15,
        painLevel: 0
      });
    }
  }

  private setupFormValidation() {
    // Dynamic validation based on selected feed types
    this.feedForm.get('feedTypes')?.valueChanges.subscribe(feedTypes => {
      this.updateValidation(feedTypes);
    });
  }

  private updateValidation(feedTypes: string[]) {
    // Clear all conditional validators
    this.feedForm.get('breastSide')?.clearValidators();
    this.feedForm.get('duration')?.clearValidators();
    this.feedForm.get('ebmQuantity')?.clearValidators();
    this.feedForm.get('formulaQuantity')?.clearValidators();

    // Add validators based on selected feed types
    if (feedTypes.includes('direct')) {
      this.feedForm.get('breastSide')?.setValidators([Validators.required]);
      this.feedForm.get('duration')?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
    }

    if (feedTypes.includes('expressed')) {
      this.feedForm.get('ebmQuantity')?.setValidators([Validators.required, Validators.min(1), Validators.max(300)]);
    }

    if (feedTypes.includes('formula')) {
      this.feedForm.get('formulaQuantity')?.setValidators([Validators.required, Validators.min(1), Validators.max(300)]);
    }

    // Update form validation
    this.feedForm.get('breastSide')?.updateValueAndValidity();
    this.feedForm.get('duration')?.updateValueAndValidity();
    this.feedForm.get('ebmQuantity')?.updateValueAndValidity();
    this.feedForm.get('formulaQuantity')?.updateValueAndValidity();
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
        return !!this.selectedBaby;
      case 2:
        return this.selectedFeedTypes.length > 0;
      case 3:
        return this.validateConditionalSections();
      case 4:
        return true; // Notes are optional
      default:
        return false;
    }
  }

  validateConditionalSections(): boolean {
    let isValid = true;

    if (this.selectedFeedTypes.includes('direct')) {
      if (!this.selectedBreastSide || !this.feedForm.get('duration')?.valid) {
        isValid = false;
      }
    }

    if (this.selectedFeedTypes.includes('expressed')) {
      const ebmQuantity = this.feedForm.get('ebmQuantity')?.value;
      if (!ebmQuantity || ebmQuantity <= 0) {
        isValid = false;
      }
    }

    if (this.selectedFeedTypes.includes('formula')) {
      const formulaQuantity = this.feedForm.get('formulaQuantity')?.value;
      if (!formulaQuantity || formulaQuantity <= 0) {
        isValid = false;
      }
    }

    return isValid;
  }

  // Baby selection
  selectBaby(baby: Baby) {
    this.selectedBaby = baby;
    this.feedForm.patchValue({ selectedBaby: baby.id });
  }

  // Feed type selection
  toggleFeedType(feedType: 'direct' | 'expressed' | 'formula') {
    const index = this.selectedFeedTypes.indexOf(feedType);
    if (index > -1) {
      this.selectedFeedTypes.splice(index, 1);
    } else {
      this.selectedFeedTypes.push(feedType);
    }
    this.feedForm.patchValue({ feedTypes: this.selectedFeedTypes });
  }

  isFeedTypeSelected(feedType: 'direct' | 'expressed' | 'formula'): boolean {
    return this.selectedFeedTypes.includes(feedType);
  }

  // Breast side selection
  selectBreastSide(side: 'left' | 'right' | 'both') {
    this.selectedBreastSide = side;
    this.feedForm.patchValue({ breastSide: side });
  }

  // Pain level selection
  selectPainLevel(level: number) {
    this.selectedPainLevel = level;
    this.feedForm.patchValue({ painLevel: level });
  }

  // Quantity presets
  setEbmQuantity(quantity: number) {
    this.feedForm.patchValue({ ebmQuantity: quantity });
  }

  setFormulaQuantity(quantity: number) {
    this.feedForm.patchValue({ formulaQuantity: quantity });
  }

  // Form submission
  async saveFeedLog() {
    if (this.feedForm.valid && this.user && this.selectedBaby) {
      try {
        const formValue = this.feedForm.value;
        
        const record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'> = {
          babyId: this.selectedBaby.id,
          recordedBy: this.user.uid,
          date: new Date(),
          feedTypes: this.selectedFeedTypes as ('direct' | 'expressed' | 'formula')[],
          directFeedDetails: this.selectedFeedTypes.includes('direct') ? {
            startTime: formValue.startTime,
            breastSide: this.selectedBreastSide!,
            duration: formValue.duration,
            painLevel: this.selectedPainLevel
          } : undefined,
          expressedMilkDetails: this.selectedFeedTypes.includes('expressed') ? {
            quantity: formValue.ebmQuantity
          } : undefined,
          formulaDetails: this.selectedFeedTypes.includes('formula') ? {
            quantity: formValue.formulaQuantity
          } : undefined,
          notes: formValue.notes,
          enteredViaVoice: false
        };

        await this.growthService.addGrowthRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Feed log saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save feed log. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  canSave(): boolean {
    return this.feedForm.valid && this.selectedFeedTypes.length > 0 && this.validateConditionalSections();
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
}