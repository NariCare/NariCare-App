import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { GrowthTrackingService } from '../../../services/growth-tracking.service';
import { WHOGrowthChartService } from '../../../services/who-growth-chart.service';
import { WeightChartModalComponent } from '../../../components/weight-chart-modal/weight-chart-modal.component';
import { 
  GrowthRecord, 
  WeightRecord, 
  StoolRecord, 
  BreastSide,
  LipstickShape, 
  MotherMood,
  StoolColor,
  StoolTexture,
  StoolSize
} from '../../../models/growth-tracking.model';
import { User, Baby } from '../../../models/user.model';

@Component({
  selector: 'app-baby-detail',
  templateUrl: './baby-detail.page.html',
  styleUrls: ['./baby-detail.page.scss'],
})
export class BabyDetailPage implements OnInit {
  user: User | null = null;
  baby: Baby | null = null;
  babyId: string = '';
  selectedSubTab: 'weight-size' | 'feed-tracks' | 'stool-tracks' = 'weight-size';
  
  // Data observables
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  
  // Modal controls
  showAddRecordModal = false;
  showAddWeightModal = false;
  showAddStoolModal = false;
  
  // Forms
  addRecordForm: FormGroup; // Main form for feed tracking
  addWeightForm: FormGroup;
  addStoolForm: FormGroup;
  
  // Selection states
  selectedBreastSide: BreastSide | null = null;
  selectedLipstickShape: LipstickShape | null = null;
  selectedMotherMood: MotherMood | null = null;
  selectedStoolColor: StoolColor | null = null;
  selectedStoolTexture: StoolTexture | null = null;
  selectedStoolSize: StoolSize | null = null;

  // New feed form properties
  feedTypeOptions: any[] = [];
  selectedFeedTypes: ('direct' | 'expressed' | 'formula')[] = [];
  quantityPresets: any[] = [];
  painLevel: number = 0;
  
  // Options
  breastSideOptions: BreastSide[] = [];
  lipstickShapeOptions: LipstickShape[] = [];
  motherMoodOptions: MotherMood[] = [];
  stoolColorOptions: StoolColor[] = [];
  stoolTextureOptions: StoolTexture[] = [];
  stoolSizeOptions: StoolSize[] = [];
  
  // Summary and Warnings
  todaySummary: any = {};
  feedingWarnings: { type: 'red' | 'yellow', message: string }[] = [];

  // Voice input
  isRecording = false;
  isProcessingVoice = false;
  isRecordingWeight = false;
  isRecordingStool = false;
  isProcessingVoiceWeight = false;
  isProcessingVoiceStool = false;
  recognition: any;
  voiceTranscript = '';
  voiceTranscriptWeight = '';
  voiceTranscriptStool = '';
  extractedData: any = {};
  extractedDataWeight: any = {};
  extractedDataStool: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private growthService: GrowthTrackingService,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    // Initialize forms
    this.addRecordForm = this.formBuilder.group({ // Main form for feed tracking
      record_date: [new Date().toISOString(), [Validators.required]],
      feedTypes: this.formBuilder.array([], [Validators.required, Validators.minLength(1)]),
      directFeedingGroup: this.formBuilder.group({
        direct_feeding_start_time: [new Date().toTimeString().slice(0, 5)],
        direct_feeding_end_time: [new Date().toTimeString().slice(0, 5)],
        duration_minutes: [0, [Validators.min(0)]],
        pain_level: [0, [Validators.min(0), Validators.max(10)]],
        lipstick_shape: ['rounded'],
        mother_mood: [null],
      }),
      expressedMilkGroup: this.formBuilder.group({ ebm_quantity_ml: [0, [Validators.min(0)]] }),
      formulaGroup: this.formBuilder.group({ formula_quantity_ml: [0, [Validators.min(0)]] }),
      notes: [''],
    });
    
    this.addWeightForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      weight: ['', [Validators.required, Validators.min(0.5), Validators.max(50)]],
      height: [''],
      notes: ['']
    });
    
    this.addStoolForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      time: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      peeCount: ['', [Validators.min(0), Validators.max(20)]],
      poopCount: ['', [Validators.min(0), Validators.max(15)]],
      notes: ['']
    });
    
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.babyId = params['id'];
      if (this.babyId) {
        this.loadBabyData();
      }
    });
    
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && this.babyId) {
        this.baby = user.babies.find(b => b.id === this.babyId) || null;
      }
    });

    this.updateTodaySummaryAndWarnings();
    
    // Load options
    this.breastSideOptions = this.growthService.getBreastSideOptions();
    this.feedTypeOptions = this.growthService.getFeedTypeOptions();
    this.lipstickShapeOptions = this.growthService.getLipstickShapeOptions();
    this.motherMoodOptions = this.growthService.getMotherMoodOptions();
    this.stoolColorOptions = this.growthService.getStoolColorOptions();
    this.stoolTextureOptions = this.growthService.getStoolTextureOptions();
    this.stoolSizeOptions = this.growthService.getStoolSizeOptions();
  }

  // Load baby's tracking data
  private loadBabyData() {
    if (this.babyId) {
      this.growthRecords$ = this.growthService.getGrowthRecords(this.babyId);
      this.weightRecords$ = this.growthService.getWeightRecords(this.babyId);
      this.stoolRecords$ = this.growthService.getStoolRecords(this.babyId);
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/tabs/growth']);
  }

  onSubTabChange(event: any) {
    this.selectedSubTab = event.detail.value;
  }

  onEditClick() {
    // Open appropriate modal based on current sub-tab or default to feed
    switch (this.selectedSubTab) {
      case 'weight-size':
        this.openAddWeightModal(); // This will open the weight modal
        break;
      case 'feed-tracks':
        this.openAddRecordModal();
        break;
      case 'stool-tracks':
        this.openAddStoolModal();
        break;
      default:
        this.openAddRecordModal(); // Default to feed modal
    }
  }

  // Modal controls
  openAddRecordModal() {
    this.showAddRecordModal = true;
  }

  openAddWeightModal() {
    this.showAddWeightModal = true;
  }

  openAddStoolModal() {
    this.showAddStoolModal = true;
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
    this.resetRecordForm();
  }

  closeAddWeightModal() {
    this.showAddWeightModal = false;
    this.resetWeightForm();
  }

  closeAddStoolModal() {
    this.showAddStoolModal = false;
    this.resetStoolForm();
  }

  private resetRecordForm() {
    this.selectedFeedTypes = [];
    this.selectedBreastSide = null;
    this.selectedLipstickShape = null;
    this.selectedMotherMood = null;
    this.painLevel = 0;
    this.clearVoiceInput();
    this.addRecordForm.reset({
      record_date: new Date().toISOString(),
      feedTypes: [],
      directFeedingGroup: {
        direct_feeding_start_time: new Date().toTimeString().slice(0, 5),
        direct_feeding_end_time: new Date().toTimeString().slice(0, 5),
        duration_minutes: 0, pain_level: 0, lipstick_shape: 'rounded', mother_mood: null
      },
      expressedMilkGroup: { ebm_quantity_ml: 0 },
      formulaGroup: { formula_quantity_ml: 0 },
      notes: ''
    });
  }

  private resetWeightForm() {
    this.clearVoiceInputWeight();
    this.addWeightForm.reset({
      date: new Date().toISOString()
    });
  }

  private resetStoolForm() {
    this.selectedStoolColor = null;
    this.selectedStoolTexture = null;
    this.selectedStoolSize = null;
    this.clearVoiceInputStool();
    this.addStoolForm.reset({
      date: new Date().toISOString(),
      time: new Date().toTimeString().slice(0, 5)
    });
  }

  onFeedTypeToggle(type: 'direct' | 'expressed' | 'formula', isChecked: boolean) {
    if (isChecked) {
      if (!this.selectedFeedTypes.includes(type)) {
        this.selectedFeedTypes.push(type);
      }
    } else {
      this.selectedFeedTypes = this.selectedFeedTypes.filter(t => t !== type);
    }
    this.addRecordForm.get('feedTypes')?.setValue(this.selectedFeedTypes);
    this.addRecordForm.get('feedTypes')?.markAsDirty(); // Mark as dirty to trigger validation
    this.addRecordForm.get('feedTypes')?.markAsTouched(); // Mark as touched
  }

  selectBreastSide(side: BreastSide) {
    this.selectedBreastSide = side;
  }

  setQuantity(groupName: string, controlName: string, quantity: number) {
    this.addRecordForm.get(groupName)?.get(controlName)?.setValue(quantity);
  }

  selectLipstickShape(shape: LipstickShape) {
    this.selectedLipstickShape = shape;
  }

  selectMotherMood(mood: MotherMood) {
    this.selectedMotherMood = mood;
  }

  setPainLevel(level: number | { lower: number; upper: number }) {
    const painValue = typeof level === 'number' ? level : level.lower || 0;
    this.painLevel = painValue;
    this.addRecordForm.patchValue({ painLevel: painValue });
  }

  selectStoolColor(color: StoolColor) {
    this.selectedStoolColor = color;
  }

  selectStoolTexture(texture: StoolTexture) {
    this.selectedStoolTexture = texture;
  }

  selectStoolSize(size: StoolSize) {
    this.selectedStoolSize = size;
  }

  // Save methods
  async saveGrowthRecord() { // Updated save method
    if (this.addRecordForm.valid && this.user && this.baby && this.selectedFeedTypes.length > 0) {
      try {
        const formValue = this.addRecordForm.value;
        const record: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'> = { // Construct GrowthRecord
          babyId: this.baby.id,
          recordedBy: this.user.uid,
          record_date: new Date(formValue.record_date),
          feed_types: this.selectedFeedTypes,
          
          direct_feeding_start_time: formValue.directFeedingGroup.direct_feeding_start_time,
          direct_feeding_end_time: formValue.directFeedingGroup.direct_feeding_end_time,
          breast_side: this.selectedBreastSide?.value,
          duration_minutes: formValue.directFeedingGroup.duration_minutes,
          pain_level: formValue.directFeedingGroup.pain_level,
          lipstick_shape: formValue.directFeedingGroup.lipstick_shape,
          mother_mood: formValue.directFeedingGroup.mother_mood,
          ebm_quantity_ml: formValue.expressedMilkGroup.ebm_quantity_ml,
          formula_quantity_ml: formValue.formulaGroup.formula_quantity_ml,
          peeCount: formValue.peeCount,
          poopCount: formValue.poopCount,
          moodDescription: formValue.moodDescription,
          notes: formValue.notes,
          enteredViaVoice: !!this.voiceTranscript
        };

        await this.growthService.addGrowthRecord(record);
        this.showToast('Daily record saved successfully!', 'success');
        this.closeAddRecordModal();
        this.updateTodaySummaryAndWarnings(); // Update summary after saving
      } catch (error) {
        this.showToast('Failed to save record. Please try again.', 'danger');
      }
    }
  }

  async saveWeightRecord() {
    if (this.addWeightForm.valid && this.user && this.baby) {
      try {
        const formValue = this.addWeightForm.value;
        const record: Omit<WeightRecord, 'id' | 'createdAt'> = {
          babyId: this.baby.id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          weight: parseFloat(formValue.weight),
          height: formValue.height ? parseFloat(formValue.height) : undefined,
          notes: formValue.notes,
          enteredViaVoice: !!this.voiceTranscriptWeight
        };

        await this.growthService.addWeightRecord(record);
        this.showToast('Weight record saved successfully!', 'success');
        this.closeAddWeightModal();
      } catch (error) {
        this.showToast('Failed to save weight record. Please try again.', 'danger');
      }
    }
  }

  async saveStoolRecord() {
    if (this.addStoolForm.valid && this.user && this.baby && 
        this.selectedStoolColor && this.selectedStoolTexture && this.selectedStoolSize) {
      try {
        const formValue = this.addStoolForm.value;
        const record: Omit<StoolRecord, 'id' | 'createdAt'> = {
          babyId: this.baby.id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          time: formValue.time,
          color: this.selectedStoolColor,
          texture: this.selectedStoolTexture,
          size: this.selectedStoolSize,
          peeCount: formValue.peeCount ? parseInt(formValue.peeCount) : undefined,
          poopCount: formValue.poopCount ? parseInt(formValue.poopCount) : undefined,
          notes: formValue.notes,
          enteredViaVoice: !!this.voiceTranscriptStool
        };

        await this.growthService.addStoolRecord(record);
        this.showToast('Stool record saved successfully!', 'success');
        this.closeAddStoolModal();
      } catch (error) {
        this.showToast('Failed to save stool record. Please try again.', 'danger');
      }
    }
  }

  // Summary and Warnings
  async updateTodaySummaryAndWarnings() {
    if (!this.baby) return;
    this.todaySummary = await this.growthService.getDailySummary(this.baby.id);
    const recentDirectFeeds = await this.growthService.getRecentFeedingData(this.baby.id);
    this.checkFeedingWarnings(recentDirectFeeds, this.todaySummary);
  }

  checkFeedingWarnings(recentDirectFeeds: GrowthRecord[], summary: any) {
    this.feedingWarnings = [];

    // 1. Feeding fewer than 8 times per 24 hours or skipping night feeds
    if (summary.totalDirectFeeds < 8) {
      this.feedingWarnings.push({
        type: 'red',
        message: 'Feeding fewer than 8 times per 24 hours. May indicate insufficient milk intake; urgent assessment needed to prevent dehydration & weight loss.'
      });
    }
    // Note: Skipping night feeds is harder to detect without more complex time-based logic.

    // 2. Feeding more than 12 times per 24 hours without satisfaction
    if (summary.totalDirectFeeds > 12) {
      this.feedingWarnings.push({
        type: 'yellow',
        message: 'Feeding more than 12 times per 24 hours. Could signal ineffective milk transfer or low milk supply; monitor closely.'
      });
    }

    // 3. Nursing sessions consistently <5–10 minutes or >50–60 minutes
    const shortSessions = recentDirectFeeds.filter(r => r.duration_minutes && r.duration_minutes < 10);
    const longSessions = recentDirectFeeds.filter(r => r.duration_minutes && r.duration_minutes > 50);
    if (shortSessions.length > 0 && shortSessions.length >= recentDirectFeeds.length * 0.5) { // More than 50% are short
      this.feedingWarnings.push({
        type: 'yellow',
        message: 'Many nursing sessions are consistently very short (<10 minutes). May indicate poor latch or low milk transfer.'
      });
    }
    if (longSessions.length > 0 && longSessions.length >= recentDirectFeeds.length * 0.5) { // More than 50% are long
      this.feedingWarnings.push({
        type: 'yellow',
        message: 'Many nursing sessions are consistently very long (>50 minutes). May indicate poor latch or low milk transfer.'
      });
    }

    // 4. Baby frequently falls asleep at breast or hard to wake to feed
    // This requires subjective input, cannot be directly derived from current data.
    // Could be added as a checkbox in the form. For now, just a placeholder.
    // if (this.addRecordForm.get('babyFallsAsleep')?.value) { // Example if we add this field
    //   this.feedingWarnings.push({
    //     type: 'red',
    //     message: 'Baby frequently falls asleep at breast or is hard to wake to feed. May indicate fatigue from underfeeding or low intake; immediate assessment advised.'
    //   });
    // }

    // 5. Persistent hunger cues (rooting, hand sucking) or baby still hungry after feeds
    // This also requires subjective input.
    // if (this.addRecordForm.get('persistentHunger')?.value) { // Example if we add this field
    //   this.feedingWarnings.push({
    //     type: 'yellow',
    //     message: 'Baby shows persistent hunger cues or seems hungry after feeds. Sign baby may not be satisfied; evaluate feeding and latch.'
    //   });
    // }
  }

  async openWeightChartModal() {
    if (!this.baby || !this.weightRecords$) return;

    this.weightRecords$.subscribe(async (weightRecords) => {
      const modal = await this.modalController.create({
        component: WeightChartModalComponent,
        componentProps: {
          weightRecords: weightRecords,
          babyGender: this.baby!.gender,
          babyBirthDate: this.baby!.dateOfBirth,
          babyName: this.baby!.name
        },
        cssClass: 'weight-chart-modal'
      });
      await modal.present();
    }).unsubscribe();
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

  isVoiceSupported(): boolean { // Check if speech recognition is available
    return !!this.recognition;
  }

  // Helper methods
  calculateBabyAge(): string {
    if (!this.baby) return '';
    
    const birthDate = new Date(this.baby.dateOfBirth); // Assuming baby.dateOfBirth is a Date object
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ${remainingDays > 0 ? `and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''} old`;
    } else if (diffWeeks < 52) {
      const months = Math.floor(diffWeeks / 4);
      const remainingWeeks = diffWeeks % 4;
      return `${months} month${months !== 1 ? 's' : ''} ${remainingWeeks > 0 ? `and ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    } else {
      const years = Math.floor(diffWeeks / 52);
      const remainingWeeks = diffWeeks % 52;
      const months = Math.floor(remainingWeeks / 4);
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} old`;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatBirthDate(): string {
    if (!this.baby) return '';
    return new Date(this.baby.dateOfBirth).toLocaleDateString('en-US', { // Assuming baby.dateOfBirth is a Date object
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getCurrentWeight(): string {
    if (!this.baby) return '--';
    return `${this.baby.currentWeight || this.baby.birthWeight}kg`;
  }

  getCurrentHeight(): string {
    if (!this.baby) return '--';
    return `${this.baby.currentHeight || this.baby.birthHeight}cm`;
  }

  getRecordTime(record: GrowthRecord): string {
    return record.direct_feeding_start_time || '';
  }

  getRecordDate(record: GrowthRecord): string {
    return this.formatDate(record.record_date);
  }

  getStoolTime(record: StoolRecord): string {
    return record.time;
  }

  getStoolDate(record: StoolRecord): string {
    return this.formatDate(record.date);
  }

  getStoolColorDisplay(color: StoolColor): string {
    return color.label;
  }

  getStoolTextureDisplay(texture: StoolTexture): string {
    return texture.label;
  }

  getStoolSizeDisplay(size: StoolSize): string {
    return size.label;
  }

  // Voice input methods
  private initializeSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        if (this.isProcessingVoice) {
          this.isRecording = true;
        } else if (this.isProcessingVoiceWeight) { // For weight modal
          this.isRecordingWeight = true;
        } else if (this.isProcessingVoiceStool) {
          this.isRecordingStool = true;
        }
      };
      
      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          if (this.isProcessingVoice) {
            this.voiceTranscript = finalTranscript.trim(); // For feed modal
            this.processSmartVoiceInput(finalTranscript.trim());
          } else if (this.isProcessingVoiceWeight) {
            this.processSmartVoiceInputWeight(finalTranscript.trim());
          } else if (this.isProcessingVoiceStool) {
            this.processSmartVoiceInputStool(finalTranscript.trim());
          }
        }
        this.isRecording = false;
        this.isRecordingWeight = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
        this.isRecordingWeight = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onend = () => {
        this.isRecording = false;
        this.isRecordingWeight = false;
        this.isRecordingStool = false;
      };
    }
  }

  startSmartVoiceInput() {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.voiceTranscript = '';
    this.extractedData = {};
    this.isProcessingVoice = true;
    this.recognition.start();
  }

  startSmartVoiceInputWeight() {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.voiceTranscriptWeight = '';
    this.extractedDataWeight = {};
    this.isProcessingVoiceWeight = true;
    this.isRecordingWeight = true;
    this.recognition.start();
  }

  startSmartVoiceInputStool() {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
    this.isProcessingVoiceStool = true;
    this.isRecordingStool = true;
    this.recognition.start();
  }

  private async processSmartVoiceInput(transcript: string) {
    this.isProcessingVoice = true;
    
    try {
      const extracted = this.extractDataFromSpeech(transcript);
      this.extractedData = extracted;
      this.autoFillFormFields(extracted);
      
      const extractedFields = Object.keys(extracted).filter(key => extracted[key] !== null && extracted[key] !== undefined);
      if (extractedFields.length > 0) {
        this.showToast(`Auto-filled ${extractedFields.length} field(s) from voice input`, 'success');
      } else {
        this.showToast('Voice recorded. Please review and fill remaining fields manually.', 'warning');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      this.showToast('Voice input processed. Please review and fill fields manually.', 'warning');
    } finally {
      this.isProcessingVoice = false;
    }
  }

  private async processSmartVoiceInputWeight(transcript: string) {
    this.isProcessingVoiceWeight = true;
    this.isRecordingWeight = false;
    
    try {
      const extracted = this.extractWeightDataFromSpeech(transcript);
      this.extractedDataWeight = extracted;
      this.voiceTranscriptWeight = transcript;
      this.autoFillWeightFormFields(extracted);
      
      const extractedFields = Object.keys(extracted).filter(key => extracted[key] !== null && extracted[key] !== undefined);
      if (extractedFields.length > 0) {
        this.showToast(`Auto-filled ${extractedFields.length} field(s) from voice input`, 'success');
      } else {
        this.showToast('Voice recorded. Please review and fill remaining fields manually.', 'warning');
      }
    } catch (error) {
      console.error('Error processing weight voice input:', error);
      this.showToast('Voice input processed. Please review and fill fields manually.', 'warning');
    } finally {
      this.isProcessingVoiceWeight = false;
    }
  }

  private async processSmartVoiceInputStool(transcript: string) {
    this.isProcessingVoiceStool = true;
    this.isRecordingStool = false;
    
    try {
      const extracted = this.extractStoolDataFromSpeech(transcript);
      this.extractedDataStool = extracted;
      this.voiceTranscriptStool = transcript;
      this.autoFillStoolFormFields(extracted);
      
      const extractedFields = Object.keys(extracted).filter(key => extracted[key] !== null && extracted[key] !== undefined);
      if (extractedFields.length > 0) {
        this.showToast(`Auto-filled ${extractedFields.length} field(s) from voice input`, 'success');
      } else {
        this.showToast('Voice recorded. Please review and fill remaining fields manually.', 'warning');
      }
    } catch (error) {
      console.error('Error processing stool voice input:', error);
      this.showToast('Voice input processed. Please review and fill fields manually.', 'warning');
    } finally {
      this.isProcessingVoiceStool = false;
    }
  }

  private extractDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract direct feeding sessions (assuming this is the primary "feed" action)
    const feedingPatterns = [
      /(?:fed|feed|feeding|nursed|nursing|breastfed|breastfeeding).*?(\d+).*?(?:times|sessions?|feeds?)/i,
      /(\d+).*?(?:feeding|nursing|breastfeeding).*?(?:sessions?|times|feeds?)/i,
      /(?:had|did|completed).*?(\d+).*?(?:feeds?|nursing|feeding)/i
    ];
    
    for (const pattern of feedingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const sessions = parseInt(match[1]); // This is now just a count, not directly used for form field
        if (sessions >= 1 && sessions <= 20) {
          extracted.directFeedingSessions = sessions;
          break;
        }
      }
    }
    
    // Extract mother's mood
    const moodKeywords = {
      'relaxed': ['relaxed', 'calm', 'peaceful', 'serene'],
      'happy': ['happy', 'good', 'well', 'fine', 'positive'],
      'sad': ['sad', 'down', 'low', 'upset'],
      'exhausted': ['exhausted', 'tired', 'worn out', 'drained'],
      'anxious': ['anxious', 'worried', 'nervous', 'stressed']
    };
    
    for (const [moodValue, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const mood = this.motherMoodOptions.find(m => m.value === moodValue);
        if (mood) { // Assign to extracted.mood
          extracted.mood = mood;
          break;
        }
      }
    }
    
    return extracted;
  }

  private extractWeightDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract weight (kg)
    const weightPatterns = [
      /(?:weighs?|weight|is)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?)/i,
      /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?)/i
    ];
    
    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const weight = parseFloat(match[1]);
        if (weight >= 0.5 && weight <= 50) {
          extracted.weight = weight;
          break;
        }
      }
    }
    
    // Extract height (cm)
    const heightPatterns = [
      /(?:height|length|tall|long)\s*(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/i,
      /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)\s*(?:tall|long|height|length)/i
    ];
    
    for (const pattern of heightPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const height = parseFloat(match[1]);
        if (height >= 20 && height <= 150) {
          extracted.height = height;
          break;
        }
      }
    }
    
    return extracted;
  }

  private extractStoolDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract color
    const colorKeywords = {
      'very-dark': ['very dark', 'black', 'very black'],
      'dark-green': ['dark green', 'green', 'greenish'],
      'dark-brown': ['dark brown', 'brown', 'brownish'],
      'mustard-yellow': ['mustard', 'yellow', 'mustard yellow', 'yellowish']
    };
    
    for (const [colorValue, keywords] of Object.entries(colorKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const color = this.stoolColorOptions.find(c => c.value === colorValue);
        if (color) {
          extracted.color = color;
          break;
        }
      }
    }
    
    // Extract texture
    const textureKeywords = {
      'liquid': ['liquid', 'watery', 'runny'],
      'pasty': ['pasty', 'soft', 'mushy'],
      'hard': ['hard', 'firm', 'solid']
    };
    
    for (const [textureValue, keywords] of Object.entries(textureKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const texture = this.stoolTextureOptions.find(t => t.value === textureValue);
        if (texture) {
          extracted.texture = texture;
          break;
        }
      }
    }
    
    return extracted;
  }

  private autoFillFormFields(extractedData: any) {
    // Auto-fill feed types
    if (extractedData.directFeedingSessions) {
      this.onFeedTypeToggle('direct', true);
      this.addRecordForm.get('directFeedingGroup.direct_feeding_start_time')?.setValue(new Date().toTimeString().slice(0, 5));
      this.addRecordForm.get('directFeedingGroup.direct_feeding_end_time')?.setValue(new Date().toTimeString().slice(0, 5));
      this.addRecordForm.get('directFeedingGroup.duration_minutes')?.setValue(20); // Default duration
    }

    // Auto-fill mood
    if (extractedData.mood) {
      this.selectedMotherMood = extractedData.mood;
      this.addRecordForm.get('directFeedingGroup.mother_mood')?.setValue(extractedData.mood);
    }

    // Auto-fill notes
    if (extractedData.notes) {
      this.addRecordForm.get('notes')?.setValue(extractedData.notes);
    }
  }

  private autoFillWeightFormFields(extractedData: any) {
    const formUpdates: any = {};
    
    if (extractedData.weight !== undefined) {
      formUpdates.weight = extractedData.weight;
    }
    
    if (extractedData.height !== undefined) {
      formUpdates.height = extractedData.height;
    }
    
    if (Object.keys(formUpdates).length > 0) {
      this.addWeightForm.patchValue(formUpdates);
    }
  }

  private autoFillStoolFormFields(extractedData: any) {
    if (extractedData.color) {
      this.selectedStoolColor = extractedData.color;
    }
    
    if (extractedData.texture) {
      this.selectedStoolTexture = extractedData.texture;
    }
  }

  clearVoiceInput() {
    this.voiceTranscript = '';
    this.extractedData = {};
    this.selectedFeedTypes = []; // Clear feed types selected by voice
    this.addRecordForm.get('feedTypes')?.setValue([]);
    this.addRecordForm.get('directFeedingGroup')?.reset();
    this.addRecordForm.get('expressedMilkGroup')?.reset();
    this.addRecordForm.get('formulaGroup')?.reset();
    this.addRecordForm.get('notes')?.reset();
  }

  clearVoiceInputWeight() {
    this.voiceTranscriptWeight = '';
    this.extractedDataWeight = {};
  }

  clearVoiceInputStool() {
    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
  }

  getVoiceInputSummary(): string {
    const extractedFields = [];
    if (this.extractedData.directFeedingSessions) extractedFields.push('Direct Feeds');
    if (this.extractedData.mood) extractedFields.push('Mood');
    if (this.extractedData.notes) extractedFields.push('Notes');
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  getVoiceInputSummaryWeight(): string {
    const extractedFields = [];
    if (this.extractedDataWeight.weight !== undefined) extractedFields.push('Weight');
    if (this.extractedDataWeight.height !== undefined) extractedFields.push('Height');
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  getVoiceInputSummaryStool(): string {
    const extractedFields = [];
    if (this.extractedDataStool.color) extractedFields.push('Color');
    if (this.extractedDataStool.texture) extractedFields.push('Texture');
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  getErrorMessage(field: string): string {
    const control = this.addRecordForm.get(field) || this.addWeightForm.get(field) || this.addStoolForm.get(field);
    // Check nested form groups for errors
    if (!control) {
      const directGroup = this.addRecordForm.get('directFeedingGroup');
      const expressedGroup = this.addRecordForm.get('expressedMilkGroup');
      const formulaGroup = this.addRecordForm.get('formulaGroup');

      if (directGroup?.get(field)?.hasError('required')) return 'This field is required';
      if (expressedGroup?.get(field)?.hasError('required')) return 'This field is required';
      if (formulaGroup?.get(field)?.hasError('required')) return 'This field is required';
    }

    if (control?.hasError('required') || control?.hasError('minlength')) { // minlength for feedTypes array
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