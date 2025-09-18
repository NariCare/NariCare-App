import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { BackendPumpingService, CreatePumpingRecordRequest } from '../../services/backend-pumping.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { PumpingRecord, PumpingSide } from '../../models/growth-tracking.model';
import { User, Baby } from '../../models/user.model';

interface PredefinedNote {
  id: string;
  text: string;
  indicator: 'red' | 'yellow';
}

@Component({
  selector: 'app-pumping-log-modal',
  templateUrl: './pumping-log-modal.component.html',
  styleUrls: ['./pumping-log-modal.component.scss']
})
export class PumpingLogModalComponent implements OnInit {

  pumpingForm: FormGroup;
  user: User | null = null;
  selectedPumpingSide: 'left' | 'right' | 'both' | null = null;
  isTimerMode = false;
  isTimerRunning = false;
  timerStartTime: Date | null = null;
  timerInterval: any;
  elapsedTime = 0;
  selectedPredefinedNotes: string[] = []; // Track selected predefined notes
  isSubmitting = false; // Track submission state
  
  // Date selection
  selectedDate: Date = new Date();
  showDatePicker = false;
  selectedDateOption = 'today';
  dateOptions: { label: string; value: string }[] = [];

  // Options
  pumpingSideOptions: PumpingSide[] = [];
  outputPresets = [30, 60, 90, 120];
  durationPresets = [5, 10, 15, 20, 30, 45];

  predefinedNotes: PredefinedNote[] = [
    { id: '1', text: 'Pain during or after pumping', indicator: 'red' },
    { id: '2', text: 'Areola being pulled into flange tunnel', indicator: 'red' },
    { id: '3', text: 'Nipple rubbing against the tunnel', indicator: 'yellow' },
    { id: '4', text: 'Uncomfortable every time you pump', indicator: 'yellow' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private backendPumpingService: BackendPumpingService,
    private backendAuthService: BackendAuthService
  ) {
    this.pumpingForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], [Validators.required]],
      time: [this.getCurrentTime(), [Validators.required]],
      pumpingSide: ['', [Validators.required]],
      totalOutput: [0, [Validators.required, Validators.min(0), Validators.max(500)]],
      duration: [0],
      startTime: [''],
      endTime: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    // Initialize date options
    this.initializeDateOptions();
    
    // Subscribe to backend auth first, fallback to Firebase auth
    this.backendAuthService.currentUser$.subscribe(backendUser => {
      if (backendUser) {
        this.user = backendUser;
      } else {
        // Fallback to Firebase auth for local users
        this.authService.currentUser$.subscribe(user => {
          this.user = user;
        });
      }
    });

    this.pumpingSideOptions = this.growthService.pumpingSideOptions;
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

  async closeModal() {
    this.stopTimer();
    await this.modalController.dismiss();
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
    this.pumpingForm.patchValue({ 
      date: selectedDate.toISOString().split('T')[0] 
    });
    this.showDatePicker = false;
  }

  onDateChange(event: any) {
    const selectedDateString = event.detail.value;
    this.selectedDate = new Date(selectedDateString);
    this.selectedDateOption = 'custom';
    this.showDatePicker = false;
    
    // Update the form with the selected date
    this.pumpingForm.patchValue({ 
      date: selectedDateString.split('T')[0]  // Ensure YYYY-MM-DD format
    });
    
    // Update the "Other" option to show the selected date
    this.updateDateOptionsWithCustomDate();
  }

  // Pumping side selection
  selectPumpingSide(side: 'left' | 'right' | 'both') {
    this.selectedPumpingSide = side;
    this.pumpingForm.patchValue({ pumpingSide: side });
  }

  // Output presets
  setOutput(quantity: number) {
    this.pumpingForm.patchValue({ totalOutput: quantity });
  }

  onOutputChange(event: any) {
    this.pumpingForm.patchValue({ totalOutput: event.detail.value });
  }

  // Duration presets
  setDuration(duration: number) {
    this.pumpingForm.patchValue({ duration: duration });
  }

  onDurationChange(event: any) {
    this.pumpingForm.patchValue({ duration: event.detail.value });
  }

  // Predefined notes
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
    const currentNotes = this.pumpingForm.get('notes')?.value || '';
    let newNotes = '';
    
    if (currentNotes.trim()) {
      newNotes = currentNotes + '\n- ' + noteText;
    } else {
      newNotes = noteText;
    }
    
    this.pumpingForm.patchValue({ notes: newNotes });
  }

  private removeNoteFromText(noteText: string) {
    const currentNotes = this.pumpingForm.get('notes')?.value || '';
    
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
    
    this.pumpingForm.patchValue({ notes: updatedNotes });
  }

  // Timer functionality

  startTimer() {
    if (this.isTimerRunning) return;

    this.isTimerRunning = true;
    this.timerStartTime = new Date();
    this.elapsedTime = 0;
    
    const startTime = this.getCurrentTime();
    this.pumpingForm.patchValue({ startTime });

    this.timerInterval = setInterval(() => {
      if (this.timerStartTime) {
        this.elapsedTime = Math.floor((new Date().getTime() - this.timerStartTime.getTime()) / 1000);
      }
    }, 1000);
  }

  stopTimer() {
    if (!this.isTimerRunning) return;

    this.isTimerRunning = false;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.timerStartTime) {
      const endTime = this.getCurrentTime();
      // Round to nearest minute, but ensure minimum of 1 minute for very short sessions
      const durationMinutes = Math.max(1, Math.round(this.elapsedTime / 60));
      
      this.pumpingForm.patchValue({ 
        endTime,
        duration: durationMinutes
      });
    }
  }

  getTimerDisplay(): string {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Form submission
  async savePumpingLog() {
    if (this.pumpingForm.valid && this.user && this.selectedPumpingSide && !this.isSubmitting) {
      this.isSubmitting = true; // Prevent multiple submissions
      
      try {
        const formValue = this.pumpingForm.value;
        
        // Try backend API first, fallback to local storage
        const backendUser = this.backendAuthService.getCurrentUser();
        const isBackendAuth = !!backendUser;
        
        if (isBackendAuth) {
          // Use backend API - require at least one baby from API
          const firstBaby = this.user.babies?.[0];
          if (!firstBaby?.id) {
            throw new Error('Please add your baby information first before logging pumping sessions.');
          }
          
          // Calculate startTime and endTime based on recordTime and duration
          const timeCalculation = this.calculateStartEndTime(formValue.time, formValue.duration);
          
          const requestData: CreatePumpingRecordRequest = {
            babyId: firstBaby.id,
            recordDate: formValue.date,
            recordTime: formValue.time,
            pumpingSide: this.selectedPumpingSide,
            totalOutput: formValue.totalOutput,
            durationMinutes: formValue.duration ?? undefined,
            startTime: timeCalculation.startTime,
            endTime: timeCalculation.endTime,
            notes: formValue.notes || '',
            enteredViaVoice: false
          };

          await this.backendPumpingService.createPumpingRecord(requestData).toPromise();
        } else {
          // Use local storage (legacy) - use baby-123 fallback for local storage compatibility
          const record: Omit<PumpingRecord, 'id' | 'createdAt'> = {
            babyId: this.user.babies[0]?.id || 'baby-123',
            recordedBy: this.user.uid,
            date: new Date(formValue.date),
            time: formValue.time,
            pumpingSide: this.selectedPumpingSide,
            totalOutput: formValue.totalOutput,
            duration: formValue.duration ?? undefined,
            startTime: formValue.startTime || undefined,
            endTime: formValue.endTime || undefined,
            notes: formValue.notes || '',
            enteredViaVoice: false
          };

          await this.growthService.addPumpingRecord(record);
        }
        
        const toast = await this.toastController.create({
          message: 'Pumping log saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
        console.error('Error saving pumping log:', error);
        this.isSubmitting = false; // Re-enable submission on error
        
        const toast = await this.toastController.create({
          message: 'Failed to save pumping log. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  canSave(): boolean {
    const totalOutputValue = this.pumpingForm.get('totalOutput')?.value;
    const basicValidation = this.pumpingForm.valid && 
                           !!this.selectedPumpingSide && 
                           (totalOutputValue >= 0); // Allow 0ml and above
    
    // For backend users, also check if babies are available
    const isBackendAuth = !!this.backendAuthService.getCurrentUser();
    if (isBackendAuth) {
      return basicValidation && this.user?.babies?.length > 0;
    }
    
    return basicValidation;
  }

  private calculateStartEndTime(recordTime: string, durationMinutes: number): { startTime: string; endTime: string } {
    if (!recordTime) {
      return { startTime: '', endTime: '' };
    }

    // Parse the record time (format: "HH:MM")
    const [hours, minutes] = recordTime.split(':').map(Number);
    
    // Create start time (same as record time)
    const startTime = recordTime;
    
    // Calculate end time by adding duration
    let endHours = hours;
    let endMinutes = minutes + (durationMinutes || 0);
    
    // Handle minute overflow
    if (endMinutes >= 60) {
      endHours += Math.floor(endMinutes / 60);
      endMinutes = endMinutes % 60;
    }
    
    // Handle hour overflow (24-hour format)
    if (endHours >= 24) {
      endHours = endHours % 24;
    }
    
    // Format end time as "HH:MM"
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    return { startTime, endTime };
  }
}