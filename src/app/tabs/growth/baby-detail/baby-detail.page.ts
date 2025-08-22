import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { BackendAuthService } from '../../../services/backend-auth.service';
import { GrowthTrackingService } from '../../../services/growth-tracking.service';
import { BackendGrowthService } from '../../../services/backend-growth.service';
import { WHOGrowthChartService } from '../../../services/who-growth-chart.service';
import { WeightChartModalComponent } from '../../../components/weight-chart-modal/weight-chart-modal.component';
import { FeedLogModalComponent } from '../../../components/feed-log-modal/feed-log-modal.component';
import { DiaperLogModalComponent } from '../../../components/diaper-log-modal/diaper-log-modal.component';
import { 
  GrowthRecord, 
  WeightRecord, 
  StoolRecord,
  DiaperChangeRecord,
  BreastSide,
  SupplementType,
  LipstickShape,
  MotherMood,
  StoolColor,
  StoolTexture,
  StoolSize
} from '../../../models/growth-tracking.model';
import { User, Baby } from '../../../models/user.model';
import { PumpingRecord } from '../../../models/growth-tracking.model';

@Component({
  selector: 'app-baby-detail',
  templateUrl: './baby-detail.page.html',
  styleUrls: ['./baby-detail.page.scss'],
})
export class BabyDetailPage implements OnInit {
  user: User | null = null;
  baby: Baby | null = null;
  babyId: string = '';
  selectedSubTab: 'weight-size' | 'feed-tracks' | 'diaper-change' | 'stool-tracks' = 'weight-size';
  
  // Data observables
  growthRecords$: Observable<any[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  diaperChangeRecords$: Observable<any[]> | null = null;
  
  // Modal controls
  showAddRecordModal = false;
  showAddWeightModal = false;
  showAddStoolModal = false;
  showAddDiaperModal = false;
  showAddPumpingModal = false;
  
  // Forms
  addRecordForm: FormGroup;
  addWeightForm: FormGroup;
  addStoolForm: FormGroup;
  
  // Selection states
  selectedBreastSide: BreastSide | null = null;
  selectedSupplement: SupplementType | null = null;
  selectedLipstickShape: LipstickShape | null = null;
  selectedMotherMood: MotherMood | null = null;
  selectedStoolColor: StoolColor | null = null;
  selectedStoolTexture: StoolTexture | null = null;
  selectedStoolSize: StoolSize | null = null;
  painLevel: number = 0;
  
  // Options
  breastSideOptions: BreastSide[] = [];
  supplementOptions: SupplementType[] = [];
  lipstickShapeOptions: LipstickShape[] = [];
  motherMoodOptions: MotherMood[] = [];
  stoolColorOptions: StoolColor[] = [];
  stoolTextureOptions: StoolTexture[] = [];
  stoolSizeOptions: StoolSize[] = [];
  
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
    private backendAuthService: BackendAuthService,
    private growthService: GrowthTrackingService,
    private backendGrowthService: BackendGrowthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    // Initialize forms
    this.addRecordForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      startTime: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      endTime: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      painLevel: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      notes: [''],
      directFeedingSessions: [0],
      avgFeedingDuration: [0],
      pumpingSessions: [0],
      totalPumpingOutput: [0],
      formulaIntake: [0],
      peeCount: [0],
      poopCount: [0],
      moodDescription: ['']
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
    
    // Try backend auth service first, fallback to legacy auth service
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      console.log('Baby Detail Page - User loaded:', user);
      console.log('Baby Detail Page - Looking for baby ID:', this.babyId);
      
      this.user = user;
      if (user && this.babyId) {
        if (user.babies && Array.isArray(user.babies)) {
          console.log('Baby Detail Page - Available babies:', user.babies.map(b => ({ id: b.id, name: b.name })));
          this.baby = user.babies.find(b => b.id === this.babyId) || null;
          
          if (this.baby) {
            console.log('Baby Detail Page - Found baby:', this.baby);
          } else {
            console.warn(`Baby with ID ${this.babyId} not found in user's babies list`);
            this.showToast('Baby not found. Returning to growth page.', 'warning');
            setTimeout(() => {
              this.router.navigate(['/tabs/growth']);
            }, 2000);
          }
        } else {
          console.warn('Baby Detail Page - User has no babies array or it\'s not an array');
          this.showToast('No babies found. Please add a baby first.', 'warning');
          setTimeout(() => {
            this.router.navigate(['/tabs/growth']);
          }, 2000);
        }
      } else {
        console.warn('Baby Detail Page - No user or baby ID');
      }
    });
    
    // Load options
    this.breastSideOptions = this.growthService.getBreastSideOptions();
    this.supplementOptions = this.growthService.getSupplementOptions();
    this.lipstickShapeOptions = this.growthService.getLipstickShapeOptions();
    this.motherMoodOptions = this.growthService.getMotherMoodOptions();
    this.stoolColorOptions = this.growthService.getStoolColorOptions();
    this.stoolTextureOptions = this.growthService.getStoolTextureOptions();
    this.stoolSizeOptions = this.growthService.getStoolSizeOptions();
  }

  private loadBabyData() {
    if (this.babyId) {
      // Check if user is using backend services
      const isBackendUser = this.backendAuthService.getCurrentUser();
      
      if (isBackendUser) {
        // Use backend services for all data
        this.growthRecords$ = this.backendGrowthService.getFeedRecords(this.babyId);
        this.weightRecords$ = this.backendGrowthService.getWeightRecords(this.babyId);
        this.stoolRecords$ = this.backendGrowthService.getStoolRecords(this.babyId);
        this.diaperChangeRecords$ = this.backendGrowthService.getDiaperChangeRecords(this.babyId);
      } else {
        // Fallback to local services
        this.growthRecords$ = this.growthService.getGrowthRecords(this.babyId);
        this.weightRecords$ = this.growthService.getWeightRecords(this.babyId);
        this.stoolRecords$ = this.growthService.getStoolRecords(this.babyId);
        this.diaperChangeRecords$ = this.growthService.getDiaperChangeRecords(this.babyId);
      }
    }
  }

  goBack() {
    this.router.navigate(['/tabs/growth']);
  }

  onSubTabChange(event: any) {
    this.selectedSubTab = event.detail.value;
  }

  onEditClick() {
    // Open appropriate modal based on current sub-tab
    switch (this.selectedSubTab) {
      case 'weight-size':
        this.openAddWeightModal();
        break;
      case 'feed-tracks':
        this.openAddRecordModal();
        break;
      case 'stool-tracks':
        this.openAddStoolModal();
        break;
      case 'diaper-change':
        this.openAddDiaperModal();
        break;
    }
  }

  // Modal controls
  openAddRecordModal() {
    this.openFeedLogModal();
  }

  openAddWeightModal() {
    this.showAddWeightModal = true;
  }

  openAddStoolModal() {
    this.showAddStoolModal = true;
  }

  openAddDiaperModal() {
    this.openDiaperLogModal();
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

  closeAddDiaperModal() {
    this.showAddDiaperModal = false;
  }

  openAddPumpingModal() {
    this.showAddPumpingModal = true;
  }

  closeAddPumpingModal() {
    this.showAddPumpingModal = false;
  }

  private resetRecordForm() {
    this.selectedBreastSide = null;
    this.selectedSupplement = null;
    this.selectedLipstickShape = null;
    this.selectedMotherMood = null;
    this.painLevel = 0;
    this.clearVoiceInput();
    this.addRecordForm.reset({
      date: new Date().toISOString(),
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date().toTimeString().slice(0, 5),
      painLevel: 0
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

  // Selection methods
  selectBreastSide(side: BreastSide) {
    this.selectedBreastSide = side;
  }

  selectSupplement(supplement: SupplementType) {
    this.selectedSupplement = supplement;
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
  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.baby) {
      try {
        await this.openFeedLogModal();
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

  async openFeedLogModal() {
    const modal = await this.modalController.create({
      component: FeedLogModalComponent,
      componentProps: {
        prefilledData: this.baby ? { babyId: this.baby.id } : undefined,
        isFastFeed: false,
        selectedBaby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadBabyData();
        this.loadBabyData();
      }
    });

    return await modal.present();
  }

  async openDiaperLogModal() {
    const modal = await this.modalController.create({
      component: DiaperLogModalComponent,
      componentProps: {
        selectedBaby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadBabyData();
      }
    });

    return await modal.present();
  }

  // Helper methods
  calculateBabyAge(): string {
    if (!this.baby || !this.baby.dateOfBirth) {
      console.warn('calculateBabyAge: No baby or dateOfBirth available');
      return 'Age unknown';
    }
    
    try {
      const birthDate = new Date(this.baby.dateOfBirth);
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
    } catch (error) {
      console.error('Error calculating baby age:', error);
      return 'Age calculation error';
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
    if (!this.baby || !this.baby.dateOfBirth) {
      console.warn('formatBirthDate: No baby or dateOfBirth available');
      return 'Birth date unknown';
    }
    try {
      return new Date(this.baby.dateOfBirth).toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting birth date:', error);
      return 'Invalid date';
    }
  }

  getCurrentWeight(): string {
    if (!this.baby) {
      console.warn('getCurrentWeight: No baby available');
      return '--';
    }
    const weight = this.baby.currentWeight || this.baby.birthWeight;
    return weight ? `${weight}kg` : '--';
  }

  getCurrentHeight(): string {
    if (!this.baby) {
      console.warn('getCurrentHeight: No baby available');
      return '--';
    }
    const height = this.baby.currentHeight || this.baby.birthHeight;
    return height ? `${height}cm` : '--';
  }

  getRecordTime(record: any): string {
    // Handle transformed API data and local data
    const startTime = record.directFeedDetails?.startTime || record.direct_start_time;
    if (!startTime) return '--';
    
    // If time is in HH:MM:SS format, convert to HH:MM
    if (typeof startTime === 'string' && startTime.includes(':')) {
      return startTime.slice(0, 5); // Takes HH:MM from HH:MM:SS
    }
    
    return startTime;
  }

  getRecordDate(record: any): string {
    // Handle both transformed API data and local data
    const date = record.date || record.record_date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getStoolTime(record: StoolRecord): string {
    return record.time;
  }

  getStoolDate(record: StoolRecord): string {
    return this.formatDate(record.date);
  }

  getDiaperChangeTime(record: any): string {
    // Handle both API format (record_time) and local format (time)
    const time = record.record_time || record.time;
    if (!time) return '--';
    
    // If time is in HH:MM:SS format, convert to HH:MM
    if (typeof time === 'string' && time.includes(':')) {
      return time.slice(0, 5); // Takes HH:MM from HH:MM:SS
    }
    
    return time;
  }

  getDiaperChangeDate(record: any): string {
    // Handle both API format (record_date) and local format (date)
    const date = record.record_date || record.date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getDiaperChangeType(record: any): string {
    // Handle both API format (change_type) and local format (type)
    const type = record.change_type || record.type || record.changeType;
    switch (type) {
      case 'pee': return 'Wet';
      case 'poop': return 'Dirty';
      case 'both': return 'Wet & Dirty';
      default: return '--';
    }
  }

  getChangeTypeEmoji(type: any): string {
    switch (type) {
      case 'pee': return '💦';
      case 'poop': return '💩';
      case 'both': return '💦💩';
      default: return '💧';
    }
  }

  getDiaperChangeRecordedBy(record: any): string {
    // For API records, combine first_name and last_name
    if (record.first_name || record.last_name) {
      return `${record.first_name || ''} ${record.last_name || ''}`.trim();
    }
    
    // For local records, use recordedBy if available
    return record.recordedBy || 'Unknown';
  }

  getFeedRecordedBy(record: any): string {
    // For API records, combine firstName and lastName
    if (record.firstName || record.lastName) {
      return `${record.firstName || ''} ${record.lastName || ''}`.trim();
    }
    
    // For local records, use recordedBy if available
    return record.recordedBy || 'Unknown';
  }

  getFeedTypes(record: any): string[] {
    // Handle transformed API data
    if (record.feedTypes && Array.isArray(record.feedTypes)) {
      return record.feedTypes;
    }
    
    // Handle raw API data or local data
    const types: string[] = [];
    if (record.direct_start_time || record.directFeedDetails?.startTime) {
      types.push('direct');
    }
    if (record.expressed_quantity || record.expressedMilkDetails?.quantity) {
      types.push('expressed');
    }
    if (record.formula_quantity || record.formulaDetails?.quantity) {
      types.push('formula');
    }
    
    return types;
  }

  getFeedDuration(record: any): number | null {
    // Handle transformed API data
    if (record.directFeedDetails?.duration) {
      return record.directFeedDetails.duration;
    }
    
    // Handle raw API data
    if (record.direct_duration) {
      return record.direct_duration;
    }
    
    return null;
  }

  getFeedPainLevel(record: any): number | null {
    // Handle transformed API data
    if (record.directFeedDetails?.painLevel !== undefined) {
      return record.directFeedDetails.painLevel;
    }
    
    // Handle raw API data
    if (record.direct_pain_level !== undefined) {
      return record.direct_pain_level;
    }
    
    return null;
  }

  getBreastSide(record: any): string | null {
    // Handle transformed API data
    if (record.directFeedDetails?.breastSide) {
      return record.directFeedDetails.breastSide;
    }
    
    // Handle raw API data
    if (record.direct_breast_side) {
      return record.direct_breast_side;
    }
    
    return null;
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
        } else if (this.isProcessingVoiceWeight) {
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
            this.voiceTranscript = finalTranscript.trim();
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
    
    // Extract feeding sessions
    const feedingPatterns = [
      /(?:fed|feed|feeding|nursed|nursing|breastfed|breastfeeding).*?(\d+).*?(?:times|sessions?|feeds?)/i,
      /(\d+).*?(?:feeding|nursing|breastfeeding).*?(?:sessions?|times|feeds?)/i,
      /(?:had|did|completed).*?(\d+).*?(?:feeds?|nursing|feeding)/i
    ];
    
    for (const pattern of feedingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const sessions = parseInt(match[1]);
        if (sessions >= 1 && sessions <= 20) {
          extracted.directFeedingSessions = sessions;
          break;
        }
      }
    }
    
    // Extract mood
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
        if (mood) {
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
    
    // Extract weight
    const weightPatterns = [
      /(?:weighs?|weight|is).*?(\d+(?:\.\d+)?).*?(?:kg|kilograms?|kilos?)/i,
      /(\d+(?:\.\d+)?).*?(?:kg|kilograms?|kilos?)/i
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
    
    // Extract height
    const heightPatterns = [
      /(?:height|length|tall|long).*?(\d+(?:\.\d+)?).*?(?:cm|centimeters?)/i,
      /(\d+(?:\.\d+)?).*?(?:cm|centimeters?).*?(?:tall|long|height|length)/i
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
    const formUpdates: any = {};
    
    if (extractedData.directFeedingSessions !== undefined) {
      formUpdates.directFeedingSessions = extractedData.directFeedingSessions;
    }
    
    if (extractedData.notes !== undefined) {
      formUpdates.notes = extractedData.notes;
    }
    
    if (Object.keys(formUpdates).length > 0) {
      this.addRecordForm.patchValue(formUpdates);
    }
    
    if (extractedData.mood) {
      this.selectedMotherMood = extractedData.mood;
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
    const extractedFields = Object.keys(this.extractedData).filter(key => 
      this.extractedData[key] !== null && this.extractedData[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  getVoiceInputSummaryWeight(): string {
    const extractedFields = Object.keys(this.extractedDataWeight).filter(key => 
      this.extractedDataWeight[key] !== null && this.extractedDataWeight[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  getVoiceInputSummaryStool(): string {
    const extractedFields = Object.keys(this.extractedDataStool).filter(key => 
      this.extractedDataStool[key] !== null && this.extractedDataStool[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  isVoiceSupported(): boolean {
    return !!this.recognition;
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

  getErrorMessage(field: string): string {
    const control = this.addRecordForm.get(field) || this.addWeightForm.get(field) || this.addStoolForm.get(field);
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