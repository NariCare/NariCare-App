import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { GrowthRecord, WeightRecord, MoodType, StarPerformer } from '../../models/growth-tracking.model';
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
  recentRecords$: Observable<GrowthRecord[]> | null = null;
  selectedTab: 'daily' | 'weight' = 'daily';
  showAddRecordModal = false;
  showAddWeightModal = false;
  showVoiceInput = false;
  addRecordForm: FormGroup;
  addWeightForm: FormGroup;
  selectedMood: MoodType | null = null;
  moodOptions: MoodType[] = [];
  starPerformers: StarPerformer[] = [];
  isRecording = false;
  recognition: any;
  currentVoiceField = '';

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Daily tracking form
    this.addRecordForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      directFeedingSessions: ['', [Validators.required, Validators.min(0), Validators.max(20)]],
      avgFeedingDuration: ['', [Validators.required, Validators.min(5), Validators.max(120)]],
      pumpingSessions: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      totalPumpingOutput: ['', [Validators.required, Validators.min(0), Validators.max(2000)]],
      formulaIntake: ['', [Validators.required, Validators.min(0), Validators.max(1000)]],
      peeCount: ['', [Validators.required, Validators.min(0), Validators.max(20)]],
      poopCount: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      moodDescription: [''],
      notes: ['']
    });
    
    // Weight tracking form
    this.addWeightForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      weight: ['', [Validators.required, Validators.min(0.5), Validators.max(50)]],
      notes: ['']
    });
    
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadTrackingData(user.babies[0].id);
      }
    });
    
    this.moodOptions = this.growthService.getMoodOptions();
    this.loadStarPerformers();
  }

  private loadTrackingData(babyId: string) {
    this.growthRecords$ = this.growthService.getGrowthRecords(babyId);
    this.weightRecords$ = this.growthService.getWeightRecords(babyId);
    this.recentRecords$ = this.growthService.getRecentRecords(babyId, 3);
  }

  private async loadStarPerformers() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
    this.starPerformers = await this.growthService.calculateStarPerformers(weekStart);
  }

  private initializeSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        this.isRecording = true;
      };
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.processVoiceInput(transcript);
        this.isRecording = false;
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
      };
      
      this.recognition.onend = () => {
        this.isRecording = false;
      };
    }
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
  }

  openAddRecordModal() {
    this.showAddRecordModal = true;
  }

  openAddWeightModal() {
    this.showAddWeightModal = true;
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
    this.selectedMood = null;
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

  selectMood(mood: MoodType) {
    this.selectedMood = mood;
  }

  startVoiceInput(fieldName: string) {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.currentVoiceField = fieldName;
    this.recognition.start();
  }

  private processVoiceInput(transcript: string) {
    const text = transcript.toLowerCase().trim();
    
    // Extract numbers from voice input
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const value = numbers[0];
      
      if (this.currentVoiceField) {
        this.addRecordForm.patchValue({
          [this.currentVoiceField]: value
        });
        
        this.showToast(`Set ${this.currentVoiceField} to ${value}`, 'success');
      }
    } else {
      // For text fields like notes
      if (this.currentVoiceField === 'notes' || this.currentVoiceField === 'moodDescription') {
        this.addRecordForm.patchValue({
          [this.currentVoiceField]: transcript
        });
        
        this.showToast('Voice input recorded', 'success');
      }
    }
    
    this.currentVoiceField = '';
  }

  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.user.babies.length > 0) {
      try {
        const formValue = this.addRecordForm.value;
        const record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'> = {
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
          mood: this.selectedMood || undefined,
          moodDescription: formValue.moodDescription,
          notes: formValue.notes,
          enteredViaVoice: this.currentVoiceField !== ''
        };

        await this.growthService.addGrowthRecord(record);
        this.showToast('Daily record saved successfully!', 'success');

        this.closeAddRecordModal();
      } catch (error) {
        this.showToast('Failed to save record. Please try again.', 'danger');
      }
    }
  }

  async saveWeightRecord() {
    if (this.addWeightForm.valid && this.user && this.user.babies.length > 0) {
      try {
        const formValue = this.addWeightForm.value;
        const record: Omit<WeightRecord, 'id' | 'createdAt'> = {
          babyId: this.user.babies[0].id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          weight: parseFloat(formValue.weight),
          notes: formValue.notes
        };

        await this.growthService.addWeightRecord(record);
        this.showToast('Weight record saved successfully!', 'success');

        this.closeAddWeightModal();
      } catch (error) {
        this.showToast('Failed to save weight record. Please try again.', 'danger');
      }
    }
  }

  async showQuickLogOptions() {
    const alert = await this.alertController.create({
      header: 'Quick Log',
      message: 'What would you like to log quickly?',
      buttons: [
        {
          text: 'Feeding Session',
          handler: () => {
            this.quickLogFeeding();
          }
        },
        {
          text: 'Pumping Session',
          handler: () => {
            this.quickLogPumping();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  private async quickLogFeeding() {
    // Pre-fill form with common values for quick entry
    this.addRecordForm.patchValue({
      date: new Date().toISOString(),
      directFeedingSessions: 1,
      avgFeedingDuration: 20,
      pumpingSessions: 0,
      totalPumpingOutput: 0,
      formulaIntake: 0,
      peeCount: 1,
      poopCount: 0
    });
    
    this.openAddRecordModal();
  }

  private async quickLogPumping() {
    // Pre-fill form with common pumping values
    this.addRecordForm.patchValue({
      date: new Date().toISOString(),
      directFeedingSessions: 0,
      avgFeedingDuration: 0,
      pumpingSessions: 1,
      totalPumpingOutput: 120,
      formulaIntake: 0,
      peeCount: 0,
      poopCount: 0
    });
    
    this.openAddRecordModal();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'directFeedingSessions': 'Direct Feeding Sessions',
      'avgFeedingDuration': 'Average Duration',
      'pumpingSessions': 'Pumping Sessions',
      'totalPumpingOutput': 'Total Pumping Output',
      'formulaIntake': 'Formula Intake',
      'peeCount': 'Pee Count',
      'poopCount': 'Poop Count',
      'notes': 'Notes',
      'moodDescription': 'Mood Description'
    };
    
    return labels[fieldName] || fieldName;
  }

  isVoiceSupported(): boolean {
    return !!this.recognition;
  }

  getAddButtonText(): string {
    return this.selectedTab === 'daily' ? 'Add Daily Record' : 'Add Weight Record';
  }

  openAddModal() {
    if (this.selectedTab === 'daily') {
      this.openAddRecordModal();
    } else {
      this.openAddWeightModal();
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
}