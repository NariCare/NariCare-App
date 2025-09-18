import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { BackendGrowthService } from '../../services/backend-growth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { AuthService } from '../../services/auth.service';
import { GrowthRecord, FeedType, PainLevel } from '../../models/growth-tracking.model';
import { User, Baby } from '../../models/user.model';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';

interface PredefinedNote {
  id: string;
  text: string;
  indicator: 'red' | 'yellow';
}

interface FeedTypeOption {
  value: 'direct' | 'expressed' | 'formula';
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-feed-log-modal',
  templateUrl: './feed-log-modal.component.html',
  styleUrls: ['./feed-log-modal.component.scss']
})
export class FeedLogModalComponent implements OnInit {
  @Input() prefilledData?: Partial<GrowthRecord>;
  @Input() isFastFeed: boolean = false;
  @Input() selectedBaby?: Baby;

  feedForm: FormGroup;
  user: User | null = null;
  selectedFeedTypes: ('direct' | 'expressed' | 'formula')[] = [];
  selectedBreastSide: 'left' | 'right' | 'both' | null = null;
  selectedPainLevel: number | null = 0;
  selectedPredefinedNotes: string[] = []; // Track selected predefined notes
  isSubmitting = false; // Track submission state
  
  // Date selection
  selectedDate: Date = new Date();
  showDatePicker = false;
  selectedDateOption = 'today';
  dateOptions: { label: string; value: string }[] = [];

  // Options
  feedTypeOptions: FeedTypeOption[] = [
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
  ];

  breastSideOptions: { value: 'left' | 'right' | 'both'; label: string; icon: string }[] = [
    { value: 'left', label: 'Left', icon: 'radio-button-on' },
    { value: 'right', label: 'Right', icon: 'radio-button-on' },
    { value: 'both', label: 'Both', icon: 'ellipse' }
  ]

  painLevelOptions: PainLevel[] = [
    { value: 0, emoji: '😌', label: 'No pain' },
    { value: 1, emoji: '😐', label: 'Mild' },
    { value: 2, emoji: '😟', label: 'Moderate' },
    { value: 3, emoji: '😣', label: 'Strong' },
    { value: 4, emoji: '😖', label: 'Severe' }
  ];

  ebmPresets = [30, 60, 90, 120, 150];
  formulaPresets = [30, 60, 90, 120, 150, 200];
  durationPresets = [5, 10, 15, 20, 30, 45, 60];

  babyRelatedNotes: PredefinedNote[] = [
    { id: '4', text: 'Baby frequently falls asleep at breast or hard to wake to feed', indicator: 'red' },
    { id: '5', text: 'Persistent hunger cues (rooting, hand sucking) or baby still hungry after feeds', indicator: 'yellow' },
    { id: '12', text: 'Extreme fussiness or persistent crying not soothed by feeding', indicator: 'yellow' },
    { id: '13', text: 'Baby never appearing satisfied after feeds', indicator: 'yellow' }
  ];

  motherRelatedNotes: PredefinedNote[] = [
    { id: '11', text: 'No breast fullness or milk \'coming in\' signs by day 4-5 postpartum', indicator: 'red' },
    { id: '6', text: 'Severe nipple pain persisting through feeds', indicator: 'red' },
    { id: '7', text: 'Cracked, bleeding, blistered, or discolored nipples', indicator: 'yellow' },
    { id: '8', text: 'Severe, unrelieved engorgement preventing latch', indicator: 'red' },
    { id: '9', text: 'Red, tender, warm breasts with fever/chills (possible mastitis)', indicator: 'red' },
    { id: '10', text: 'Open breast sores not healing', indicator: 'yellow' }
  ];

  // Combined array for backward compatibility
  predefinedNotes: PredefinedNote[] = [...this.babyRelatedNotes, ...this.motherRelatedNotes];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private backendGrowthService: BackendGrowthService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService
  ) {
    this.feedForm = this.formBuilder.group({
      selectedBaby: ['', [Validators.required]],
      date: [new Date().toISOString().split('T')[0], [Validators.required]],
      feedTypes: [[], [Validators.required]],
      // Direct feeding fields
      startTime: [this.getCurrentTime()],
      breastSide: [''],
      duration: [15, [Validators.min(1), Validators.max(120)]],
      painLevel: [0, [Validators.min(0), Validators.max(4)]],
      // Expressed milk fields
      ebmQuantity: [0, [Validators.min(1), Validators.max(500)]],
      // Formula fields
      formulaQuantity: [0, [Validators.min(1), Validators.max(500)]],
      // Notes
      notes: ['']
    });
  }

  ngOnInit() {
    // Initialize date options
    this.initializeDateOptions();
    
    // Try backend auth service first, fallback to legacy auth service
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies && user.babies.length > 0) {
        // Auto-select baby if passed as input or only one exists
        if (this.selectedBaby) {
          this.feedForm.patchValue({ selectedBaby: this.selectedBaby.id });
        } else if (user.babies.length === 1) {
          this.selectedBaby = user.babies[0];
          this.feedForm.patchValue({ selectedBaby: user.babies[0].id });
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

  getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  getDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    
    if (this.isSameDate(date, today)) {
      return `Today, ${this.formatDateDisplay(date)}`;
    } else if (this.isSameDate(date, yesterday)) {
      return `Yesterday, ${this.formatDateDisplay(date)}`;
    } else if (this.isSameDate(date, dayBefore)) {
      return `Day Before, ${this.formatDateDisplay(date)}`;
    } else {
      return this.formatDateDisplay(date);
    }
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  private initializeDateOptions() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    
    this.dateOptions = [
      { 
        label: `Today, ${this.formatDateDisplay(today)}`, 
        value: 'today' 
      },
      { 
        label: `Yesterday, ${this.formatDateDisplay(yesterday)}`, 
        value: 'yesterday' 
      },
      { 
        label: `Day Before, ${this.formatDateDisplay(dayBefore)}`, 
        value: 'dayBefore' 
      },
      { 
        label: 'Other', 
        value: 'other' 
      }
    ];
  }

  private updateDateOptionsWithCustomDate() {
    // Find and update the "Other" option to show the selected custom date
    const otherOptionIndex = this.dateOptions.findIndex(option => option.value === 'other');
    if (otherOptionIndex !== -1) {
      this.dateOptions[otherOptionIndex] = {
        label: this.formatDateDisplay(this.selectedDate),
        value: 'custom'
      };
    }
  }

  // Date selection methods
  selectDateOption(option: string) {
    this.selectedDateOption = option;
    
    const today = new Date();
    let selectedDate: Date;
    
    switch (option) {
      case 'today':
        selectedDate = new Date(today);
        break;
      case 'yesterday':
        selectedDate = new Date(today);
        selectedDate.setDate(selectedDate.getDate() - 1);
        break;
      case 'dayBefore':
        selectedDate = new Date(today);
        selectedDate.setDate(selectedDate.getDate() - 2);
        break;
      case 'other':
        this.showDatePicker = true;
        // Reset the Other option if it was previously a custom date
        this.resetOtherOption();
        return;
      case 'custom':
        // If clicking on a custom date option, don't change anything
        return;
      default:
        selectedDate = new Date(today);
    }
    
    this.selectedDate = selectedDate;
    this.feedForm.patchValue({ 
      date: selectedDate.toISOString().split('T')[0] 
    });
    this.showDatePicker = false;
  }

  private resetOtherOption() {
    // Reset the "Other" option back to its original state
    const customOptionIndex = this.dateOptions.findIndex(option => option.value === 'custom');
    if (customOptionIndex !== -1) {
      this.dateOptions[customOptionIndex] = {
        label: 'Other',
        value: 'other'
      };
    }
  }

  onDateChange(event: any) {
    const selectedDateString = event.detail.value;
    this.selectedDate = new Date(selectedDateString);
    this.selectedDateOption = 'custom';
    this.showDatePicker = false;
    
    // Update the form with the selected date
    this.feedForm.patchValue({ 
      date: selectedDateString.split('T')[0]  // Ensure YYYY-MM-DD format
    });
    
    // Update the "Other" option to show the selected date
    this.updateDateOptionsWithCustomDate();
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
      this.feedForm.get('ebmQuantity')?.setValidators([Validators.required, Validators.min(1), Validators.max(500)]);
    }

    if (feedTypes.includes('formula')) {
      this.feedForm.get('formulaQuantity')?.setValidators([Validators.required, Validators.min(1), Validators.max(500)]);
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

  // Removed step-based navigation methods
  // Form validation is now handled by canSave() method

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

  setDuration(duration: number) {
    this.feedForm.patchValue({ duration: duration });
  }

  // Form submission
  async saveFeedLog() {
    if (this.feedForm.valid && this.user && this.selectedBaby && !this.isSubmitting) {
      this.isSubmitting = true; // Prevent multiple submissions
      
      try {
        const formValue = this.feedForm.value;
        
        const record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'> = {
          babyId: this.selectedBaby.id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          feedTypes: this.selectedFeedTypes as ('direct' | 'expressed' | 'formula')[],
          directFeedDetails: this.selectedFeedTypes.includes('direct') ? {
            startTime: formValue.startTime,
            breastSide: this.selectedBreastSide!,
            duration: formValue.duration,
            painLevel: this.selectedPainLevel
          } : undefined,
          expressedMilkDetails: this.selectedFeedTypes.includes('expressed') ? {
            startTime: formValue.startTime,
            quantity: formValue.ebmQuantity
          } : undefined,
          formulaDetails: this.selectedFeedTypes.includes('formula') ? {
            startTime: formValue.startTime,
            quantity: formValue.formulaQuantity
          } : undefined,
          notes: formValue.notes,
          enteredViaVoice: false
        };

        // Try backend service first, fallback to local storage
        const isBackendUser = this.backendAuthService.getCurrentUser();
        
        if (isBackendUser) {
          await this.backendGrowthService.addFeedRecord(record);
        } else {
          await this.growthService.addGrowthRecord(record);
        }
        
        const toast = await this.toastController.create({
          message: 'Feed log saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error: any) {
        console.error('Error saving feed log:', error);
        this.isSubmitting = false; // Re-enable submission on error
        
        let errorMessage = 'Failed to save feed log. Please try again.';
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

  shouldShowBabySelection(): boolean {
    // Hide baby selection if:
    // 1. No user or no babies
    // 2. Only one baby (auto-selected)
    // 3. Baby already pre-selected via input
    if (!this.user || !this.user.babies || this.user.babies.length === 0) {
      return false;
    }
    
    if (this.user.babies.length === 1) {
      return false;
    }
    
    // If a baby was passed as input (@Input selectedBaby), don't show selection
    if (this.selectedBaby) {
      return false;
    }
    
    return true;
  }

  canSave(): boolean {
    // Check if baby is selected (required)
    if (!this.selectedBaby) {
      return false;
    }
    
    // Check if at least one feed type is selected
    if (this.selectedFeedTypes.length === 0) {
      return false;
    }
    
    // Validate conditional sections based on selected feed types
    return this.validateConditionalSections();
  }

  calculateBabyAge(baby: Baby): string {
    return AgeCalculatorUtil.calculateBabyAge(baby.dateOfBirth);
  }

  appendPredefinedNote(note: PredefinedNote) {
    const isSelected = this.selectedPredefinedNotes.includes(note.id);
    
    if (isSelected) {
      // Remove the note
      this.selectedPredefinedNotes = this.selectedPredefinedNotes.filter(id => id !== note.id);
      this.removeNoteFromText(note.text);
    } else {
      // Add the note
      this.selectedPredefinedNotes.push(note.id);
      this.addNoteToText(note.text);
    }
  }

  private addNoteToText(noteText: string) {
    const currentNotes = this.feedForm.get('notes')?.value || '';
    let newNotes = '';
    
    if (currentNotes.trim()) {
      newNotes = currentNotes + '\n- ' + noteText;
    } else {
      newNotes = noteText;
    }
    
    this.feedForm.patchValue({ notes: newNotes });
  }

  private removeNoteFromText(noteText: string) {
    const currentNotes = this.feedForm.get('notes')?.value || '';
    
    // Remove the note text from the notes
    const noteVariations = [
      noteText,
      '- ' + noteText,
      '\n- ' + noteText,
      '\n' + noteText
    ];
    
    let updatedNotes = currentNotes;
    
    for (const variation of noteVariations) {
      updatedNotes = updatedNotes.replace(variation, '');
    }
    
    // Clean up any extra line breaks
    updatedNotes = updatedNotes.replace(/\n\n+/g, '\n').trim();
    
    this.feedForm.patchValue({ notes: updatedNotes });
  }

  isPredefinedNoteSelected(note: PredefinedNote): boolean {
    return this.selectedPredefinedNotes.includes(note.id);
  }

  getFeedingIconType(feedType: string): 'breast' | 'expressed' | 'formula' {
    switch (feedType) {
      case 'direct':
        return 'breast';
      case 'expressed':
        return 'expressed';
      case 'formula':
        return 'formula';
      default:
        return 'breast';
    }
  }
}