import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { BackendGrowthService } from '../../services/backend-growth.service';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ChangeTypeOptions, DiaperChangeRecord, WetnessOptions } from '../../models/growth-tracking.model';

interface PredefinedNote {
  id: string;
  text: string;
  indicator: 'red' | 'yellow';
}
import { DiaperChangeRequest } from '../../services/api.service';
import { User, Baby } from '../../models/user.model';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';

@Component({
  selector: 'app-diaper-log-modal',
  templateUrl: './diaper-log-modal.component.html',
  styleUrls: ['./diaper-log-modal.component.scss']
})
export class DiaperLogModalComponent implements OnInit {
  @Input() selectedBaby?: Baby;

  diaperForm: FormGroup;
  user: User | null = null;
  selectedBabyLocal: Baby | null = null;
  selectedChangeType: 'pee' | 'poop' | 'both' | null = null;
  selectedWetness: 'light' | 'medium' | 'heavy' | null = null;
  selectedPredefinedNotes: string[] = []; // Track selected predefined notes
  isSubmitting = false; // Track submission state

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

  predefinedNotes: PredefinedNote[] = [
    { id: '1', text: 'No wet diapers after day 2', indicator: 'red' },
    { id: '2', text: 'Fewer than 6 wet diapers per day after day 7', indicator: 'red' },
    { id: '3', text: 'Fewer than 3–4 stools per day after day 3', indicator: 'red' },
    { id: '4', text: 'Dark concentrated urine or brick dust after day 2-3', indicator: 'red' },
    { id: '5', text: 'Stools not yellow/seedy by day 5–6', indicator: 'red' },
    { id: '6', text: 'Persistent dark stools or no stools in 24 hrs in the first month', indicator: 'red' },
    { id: '7', text: 'Signs of dehydration (dry mouth, sunken fontanelle, cool limbs)', indicator: 'red' }
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
        } else if (user.babies.length === 1) {
          this.selectedBabyLocal = user.babies[0];
          this.diaperForm.patchValue({ selectedBaby: user.babies[0].id });
        }
      }
    });

  }


  async closeModal() {
    await this.modalController.dismiss();
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


  // Form submission
  async saveDiaperLog() {
    if (this.diaperForm.valid && this.user && this.selectedBabyLocal && this.selectedChangeType && !this.isSubmitting) {
      this.isSubmitting = true; // Prevent multiple submissions
      
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
        this.isSubmitting = false; // Re-enable submission on error
        
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

  isPredefinedNoteSelected(note: PredefinedNote): boolean {
    return this.selectedPredefinedNotes.includes(note.id);
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
    const currentNotes = this.diaperForm.get('notes')?.value || '';
    let newNotes = '';
    
    if (currentNotes.trim()) {
      newNotes = currentNotes + '\n- ' + noteText;
    } else {
      newNotes = noteText;
    }
    
    this.diaperForm.patchValue({ notes: newNotes });
  }

  private removeNoteFromText(noteText: string) {
    const currentNotes = this.diaperForm.get('notes')?.value || '';
    
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
    
    // Clean up extra newlines
    updatedNotes = updatedNotes.replace(/\n\n+/g, '\n').trim();
    
    this.diaperForm.patchValue({ notes: updatedNotes });
  }


  calculateBabyAge(baby: Baby): string {
    return AgeCalculatorUtil.calculateBabyAge(baby.dateOfBirth);
  }

  public getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
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