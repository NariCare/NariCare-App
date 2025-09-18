import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { BackendGrowthService } from '../../services/backend-growth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { AuthService } from '../../services/auth.service';
import { WeightRecord } from '../../models/growth-tracking.model';
import { WeightRecordRequest } from '../../services/api.service';
import { User, Baby } from '../../models/user.model';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';

interface PredefinedWeightNote {
  id: string;
  text: string;
  indicator: 'red' | 'yellow';
}

@Component({
  selector: 'app-weight-log-modal',
  templateUrl: './weight-log-modal.component.html',
  styleUrls: ['./weight-log-modal.component.scss']
})
export class WeightLogModalComponent implements OnInit {
  @Input() prefilledData?: Partial<WeightRecord>;
  @Input() selectedBaby?: Baby;

  weightForm: FormGroup;
  user: User | null = null;
  selectedWeightBaby: Baby | null = null;
  selectedPredefinedWeightNotes: string[] = [];
  isSubmitting = false; // Track submission state

  weightPredefinedNotes: PredefinedWeightNote[] = [
    { id: '1', text: 'Growth spurt period', indicator: 'yellow' },
    { id: '2', text: 'Post feeding weight', indicator: 'yellow' },
    { id: '3', text: 'Pre feeding weight', indicator: 'yellow' },
    { id: '4', text: 'Weekly check-up', indicator: 'yellow' },
    { id: '5', text: 'Slow weight gain', indicator: 'red' },
    { id: '6', text: 'Rapid weight gain', indicator: 'red' },
    { id: '7', text: 'Doctor recommended', indicator: 'yellow' },
    { id: '8', text: 'Home scale measurement', indicator: 'yellow' },
    { id: '9', text: 'Clinical scale measurement', indicator: 'yellow' },
    { id: '10', text: 'Weight loss concern', indicator: 'red' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private backendGrowthService: BackendGrowthService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService
  ) {
    this.weightForm = this.formBuilder.group({
      selectedBaby: ['', [Validators.required]],
      date: [this.getCurrentDate()],
      time: [this.getCurrentTime()],
      weight: ['', [Validators.required, this.weightValidator]],
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
          this.selectedWeightBaby = this.selectedBaby;
          this.weightForm.patchValue({ selectedBaby: this.selectedBaby.id });
        } else if (user.babies.length === 1) {
          this.selectedWeightBaby = user.babies[0];
          this.weightForm.patchValue({ selectedBaby: user.babies[0].id });
        }
      }
    });

    // Apply prefilled data if provided
    if (this.prefilledData) {
      this.applyPrefilledData();
    }
  }

  getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  private applyPrefilledData() {
    if (this.prefilledData) {
      const updates: any = {};
      
      if (this.prefilledData.weight) {
        updates.weight = this.prefilledData.weight;
      }
      
      if (this.prefilledData.notes) {
        updates.notes = this.prefilledData.notes;
      }
      
      if (this.prefilledData.date) {
        updates.date = new Date(this.prefilledData.date).toISOString().split('T')[0];
        updates.time = new Date(this.prefilledData.date).toTimeString().slice(0, 5);
      }
      
      this.weightForm.patchValue(updates);
    }
  }

  private weightValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const weight = parseFloat(value);
    if (isNaN(weight) || weight < 0.001 || weight > 50) {
      return { invalidWeight: true };
    }
    
    return null;
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  // Baby selection methods
  shouldShowBabySelectionForWeight(): boolean {
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

  selectWeightBaby(baby: Baby): void {
    this.selectedWeightBaby = baby;
    this.weightForm.patchValue({ selectedBaby: baby.id });
  }

  getSelectedWeightBaby(): Baby | null {
    if (this.selectedWeightBaby) {
      return this.selectedWeightBaby;
    }
    
    if (this.user?.babies?.length === 1) {
      return this.user.babies[0];
    }
    
    return null;
  }

  // Predefined notes methods
  appendPredefinedWeightNote(note: PredefinedWeightNote): void {
    const isSelected = this.selectedPredefinedWeightNotes.includes(note.id);
    
    if (isSelected) {
      // Remove the note
      this.selectedPredefinedWeightNotes = this.selectedPredefinedWeightNotes.filter(id => id !== note.id);
      this.removeWeightNoteFromText(note.text);
    } else {
      // Add the note
      this.selectedPredefinedWeightNotes.push(note.id);
      this.addWeightNoteToText(note.text);
    }
  }

  private addWeightNoteToText(noteText: string): void {
    const currentNotes = this.weightForm.get('notes')?.value || '';
    let newNotes = '';
    
    if (currentNotes.trim()) {
      newNotes = currentNotes + '\n- ' + noteText;
    } else {
      newNotes = '- ' + noteText;
    }
    
    this.weightForm.patchValue({ notes: newNotes });
  }

  private removeWeightNoteFromText(noteText: string): void {
    const currentNotes = this.weightForm.get('notes')?.value || '';
    
    // Remove the specific note text
    let updatedNotes = currentNotes
      .replace(`- ${noteText}`, '')
      .replace(`\n- ${noteText}`, '')
      .replace(noteText, '');
    
    // Clean up extra newlines
    updatedNotes = updatedNotes.replace(/\n\n+/g, '\n').trim();
    
    this.weightForm.patchValue({ notes: updatedNotes });
  }

  isPredefinedWeightNoteSelected(note: PredefinedWeightNote): boolean {
    return this.selectedPredefinedWeightNotes.includes(note.id);
  }

  calculateBabyAge(baby?: Baby): string {
    const targetBaby = baby || this.getSelectedWeightBaby();
    if (!targetBaby) return '';
    
    return AgeCalculatorUtil.calculateBabyAge(targetBaby.dateOfBirth);
  }

  canSave(): boolean {
    const selectedBaby = this.getSelectedWeightBaby();
    if (!selectedBaby) {
      return false;
    }
    
    const weightValue = this.weightForm.get('weight')?.value;
    if (!weightValue || this.weightForm.get('weight')?.invalid) {
      return false;
    }
    
    return true;
  }

  async saveWeightRecord() {
    if (this.weightForm.valid && this.user && !this.isSubmitting) {
      this.isSubmitting = true; // Prevent multiple submissions
      
      const selectedBaby = this.getSelectedWeightBaby();
      if (!selectedBaby) {
        this.isSubmitting = false;
        return;
      }

      try {
        const formValue = this.weightForm.value;
        
        // Combine date and time into a single Date object
        const dateTimeString = `${formValue.date}T${formValue.time}:00`;
        const recordDate = new Date(dateTimeString);
        
        const record: WeightRecordRequest = {
          babyId: selectedBaby.id,
          weight: parseFloat(formValue.weight),
          notes: formValue.notes || '',
        };

        // Use backend service for authenticated users
        const isBackendUser = this.backendAuthService.getCurrentUser();
        
        if (isBackendUser) {
          const response = await this.backendGrowthService.addWeightRecord(record);
          console.log('Weight record saved successfully:', response);
        } else {
          throw new Error('Backend authentication required to save weight records');
        }
        
        const toast = await this.toastController.create({
          message: 'Weight record saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ 
          saved: true, 
          babyId: selectedBaby.id,
          newWeight: parseFloat(formValue.weight)
        });

      } catch (error: any) {
        console.error('Error saving weight record:', error);
        this.isSubmitting = false; // Re-enable submission on error
        
        let errorMessage = 'Failed to save weight record. Please try again.';
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
}