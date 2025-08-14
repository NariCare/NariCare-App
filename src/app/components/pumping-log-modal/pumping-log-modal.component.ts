import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { PumpingRecord, PumpingSide } from '../../models/growth-tracking.model';
import { User, Baby } from '../../models/user.model';

@Component({
  selector: 'app-pumping-log-modal',
  templateUrl: './pumping-log-modal.component.html',
  styleUrls: ['./pumping-log-modal.component.scss']
})
export class PumpingLogModalComponent implements OnInit {
  @Input() selectedBaby?: Baby;

  pumpingForm: FormGroup;
  user: User | null = null;
  selectedPumpingSide: 'left' | 'right' | 'both' | null = null;
  isTimerMode = false;
  isTimerRunning = false;
  timerStartTime: Date | null = null;
  timerInterval: any;
  elapsedTime = 0;

  // Options
  pumpingSideOptions: PumpingSide[] = [];
  outputPresets = [30, 60, 90, 120];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: GrowthTrackingService,
    private authService: AuthService
  ) {
    this.pumpingForm = this.formBuilder.group({
      time: [this.getCurrentTime(), [Validators.required]],
      pumpingSide: ['', [Validators.required]],
      totalOutput: [0, [Validators.required, Validators.min(1), Validators.max(500)]],
      duration: [0],
      startTime: [''],
      endTime: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.pumpingSideOptions = this.growthService.pumpingSideOptions;
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  async closeModal() {
    this.stopTimer();
    await this.modalController.dismiss();
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
      const durationMinutes = Math.floor(this.elapsedTime / 60);
      
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
    if (this.pumpingForm.valid && this.user && this.selectedBaby && this.selectedPumpingSide) {
      try {
        const formValue = this.pumpingForm.value;
        
        const record: Omit<PumpingRecord, 'id' | 'createdAt'> = {
          babyId: this.selectedBaby.id,
          recordedBy: this.user.uid,
          date: new Date(),
          time: formValue.time,
          pumpingSide: this.selectedPumpingSide,
          totalOutput: formValue.totalOutput,
          duration: formValue.duration || undefined,
          startTime: formValue.startTime || undefined,
          endTime: formValue.endTime || undefined,
          notes: formValue.notes,
          enteredViaVoice: false
        };

        await this.growthService.addPumpingRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Pumping log saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
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
    return this.pumpingForm.valid && 
           !!this.selectedPumpingSide && 
           this.pumpingForm.get('totalOutput')?.value > 0;
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