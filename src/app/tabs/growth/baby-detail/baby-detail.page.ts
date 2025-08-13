import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { GrowthTrackingService } from '../../../services/growth-tracking.service';
import { WHOGrowthChartService } from '../../../services/who-growth-chart.service';
import { WeightChartModalComponent } from '../../../components/weight-chart-modal/weight-chart-modal.component';
import { FeedLogModalComponent } from '../../../components/feed-log-modal/feed-log-modal.component';
import { 
  GrowthRecord, 
  WeightRecord, 
  StoolRecord,
  BreastSide,
  SupplementType,
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
    private growthService: GrowthTrackingService,
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
    
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && this.babyId) {
        this.baby = user.babies.find(b => b.id === this.babyId) || null;
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
      this.growthRecords$ = this.growthService.getGrowthRecords(this.babyId);
      this.weightRecords$ = this.growthService.getWeightRecords(this.babyId);
      this.stoolRecords$ = this.growthService.getStoolRecords(this.babyId);
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
        isFastFeed: false
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

  // Helper methods
  calculateBabyAge(): string {
    if (!this.baby) return '';
    
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
    return new Date(this.baby.dateOfBirth).toLocaleDateString('en-US', {
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
    return record.directFeedDetails?.startTime || '--';
  }

  getRecordDate(record: GrowthRecord): string {
    return this.formatDate(record.date);
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