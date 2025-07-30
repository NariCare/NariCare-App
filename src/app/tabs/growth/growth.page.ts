import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { GrowthRecord, GrowthChart, WeightRecord, EmotionalState } from '../../models/growth-tracking.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-growth',
  templateUrl: './growth.page.html',
  styleUrls: ['./growth.page.scss'],
})
export class GrowthPage implements OnInit {
  user: User | null = null;
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  selectedChartType: 'weight' | 'height' | 'head-circumference' = 'weight';
  selectedTab = 'daily';
  showAddDailyRecordModal = false;
  showAddWeightModal = false;
  addRecordForm: FormGroup;
  addWeightForm: FormGroup;

  moodOptions = [
    { value: 'great', emoji: '😊', label: 'Great' },
    { value: 'good', emoji: '🙂', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'tired', emoji: '😴', label: 'Tired' },
    { value: 'worried', emoji: '😟', label: 'Worried' },
    { value: 'overwhelmed', emoji: '😰', label: 'Overwhelmed' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    this.addRecordForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      directFeedingSessions: ['', [Validators.required, Validators.min(0), Validators.max(20)]],
      avgFeedingDuration: ['', [Validators.required, Validators.min(5), Validators.max(60)]],
      pumpingSessions: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      totalPumpingOutput: ['', [Validators.required, Validators.min(0), Validators.max(2000)]],
      formulaIntake: ['', [Validators.required, Validators.min(0), Validators.max(1000)]],
      peeCount: ['', [Validators.required, Validators.min(0), Validators.max(30)]],
      poopCount: ['', [Validators.required, Validators.min(0), Validators.max(15)]],
      mood: [''],
      moodDescription: [''],
      notes: ['']
    });

    this.addWeightForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      weight: ['', [Validators.required, Validators.min(0.5), Validators.max(50)]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadGrowthData(user.babies[0].id);
        this.loadWeightData(user.babies[0].id);
      }
    });
  }

  private loadGrowthData(babyId: string) {
    this.growthRecords$ = this.growthService.getGrowthRecords(babyId);
  }

  private loadWeightData(babyId: string) {
    this.weightRecords$ = this.growthService.getWeightRecords(babyId);
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
  }

  onChartTypeChange(event: any) {
    this.selectedChartType = event.detail.value;
  }

  openAddDailyRecordModal() {
    this.showAddDailyRecordModal = true;
  }

  openAddWeightModal() {
    this.showAddWeightModal = true;
  }

  closeAddDailyRecordModal() {
    this.showAddDailyRecordModal = false;
    this.addRecordForm.reset({
      date: new Date().toISOString()
    });
  }

  closeAddWeightModal() {
    this.showAddWeightModal = false;
    this.addWeightForm.reset({
      date: new Date().toISOString()
    });
  }

  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.user.babies.length > 0) {
      try {
        const formValue = this.addRecordForm.value;
        
        // Create emotional state if mood is selected
        let emotionalState: EmotionalState | undefined;
        if (formValue.mood) {
          const selectedMood = this.moodOptions.find(m => m.value === formValue.mood);
          emotionalState = {
            mood: formValue.mood,
            emoji: selectedMood?.emoji || '😐',
            description: formValue.moodDescription
          };
        }

        const record: Omit<GrowthRecord, 'id'> = {
          babyId: this.user.babies[0].id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          directFeedingSessions: parseInt(formValue.directFeedingSessions),
          avgFeedingDuration: parseInt(formValue.avgFeedingDuration),
          pumpingSessions: parseInt(formValue.pumpingSessions),
          totalPumpingOutput: parseInt(formValue.totalPumpingOutput),
          formulaIntake: parseInt(formValue.formulaIntake),
          peeCount: parseInt(formValue.peeCount),
          poopCount: parseInt(formValue.poopCount),
          emotionalState,
          notes: formValue.notes,
          milestones: []
        };

        await this.growthService.addGrowthRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Daily record saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        this.closeAddDailyRecordModal();
      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save daily record. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  async saveWeightRecord() {
    if (this.addWeightForm.valid && this.user && this.user.babies.length > 0) {
      try {
        const formValue = this.addWeightForm.value;
        const record: Omit<WeightRecord, 'id'> = {
          babyId: this.user.babies[0].id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          weight: parseFloat(formValue.weight),
          notes: formValue.notes
        };

        await this.growthService.addWeightRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Weight record saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        this.closeAddWeightModal();
      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save weight record. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  getChartTitle(): string {
    switch (this.selectedChartType) {
      case 'weight': return 'Weight Progress';
      case 'height': return 'Feeding Sessions';
      case 'head-circumference': return 'Pumping Output';
      default: return 'Breastfeeding Progress';
    }
  }

  getChartUnit(): string {
    switch (this.selectedChartType) {
      case 'weight': return 'kg';
      case 'height': return 'sessions/day';
      case 'head-circumference': return 'ml/day';
      default: return '';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  calculateBabyAge(): string {
    if (!this.user || !this.user.babies.length) return '';
    
    const birthDate = new Date(this.user.babies[0].dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
    } else {
      const months = Math.floor(diffWeeks / 4);
      const remainingWeeks = diffWeeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    }
  }

  getErrorMessage(field: string): string {
    const control = this.addRecordForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return 'Value is too low';
    }
    if (control?.hasError('max')) {
      return 'Value is too high';
    }
    return '';
  }

  getMoodEmoji(mood: string): string {
    const moodOption = this.moodOptions.find(m => m.value === mood);
    return moodOption?.emoji || '😐';
  }

  getMoodLabel(mood: string): string {
    const moodOption = this.moodOptions.find(m => m.value === mood);
    return moodOption?.label || mood;
  }

  selectMood(mood: string) {
    this.addRecordForm.patchValue({ mood });
  }

  isMoodSelected(mood: string): boolean {
    return this.addRecordForm.get('mood')?.value === mood;
  }
}