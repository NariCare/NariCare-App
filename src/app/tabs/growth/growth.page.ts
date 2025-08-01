import { Component, OnInit } from '@angular/core';
import { ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { CDCGrowthChartService } from '../../services/cdc-growth-chart.service';
import { BabyTimelineService } from '../../services/baby-timeline.service';
import { GrowthRecord, WeightRecord, StoolRecord, MoodType, StoolColor, StoolTexture, StoolSize, StarPerformer } from '../../models/growth-tracking.model';
import { BabyTimelineData, BabyTimelineItem } from '../../models/baby-timeline.model';
import { User } from '../../models/user.model';
import { TimelineModalComponent } from 'src/app/components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from 'src/app/components/specific-week-modal/specific-week-modal.component';

@Component({
  selector: 'app-growth',
  templateUrl: './growth.page.html',
  styleUrls: ['./growth.page.scss'],
})
export class GrowthPage implements OnInit {
  @ViewChild('timelineScrollContainer', { static: false }) timelineScrollContainer!: ElementRef;
  
  user: User | null = null;
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  recentRecords$: Observable<GrowthRecord[]> | null = null;
  timelineData$: Observable<BabyTimelineData> | null = null;
  selectedTab: 'daily' | 'timeline' | 'weight' | 'stool' = 'daily';
  showAddRecordModal = false;
  showAddWeightModal = false;
  showAddStoolModal = false;
  addRecordForm: FormGroup;
  addWeightForm: FormGroup;
  addStoolForm: FormGroup;
  selectedMood: MoodType | null = null;
  selectedStoolColor: StoolColor | null = null;
  selectedStoolTexture: StoolTexture | null = null;
  selectedStoolSize: StoolSize | null = null;
  moodOptions: MoodType[] = [];
  stoolColorOptions: StoolColor[] = [];
  stoolTextureOptions: StoolTexture[] = [];
  stoolSizeOptions: StoolSize[] = [];
  starPerformers: StarPerformer[] = [];
  currentTimelineData: BabyTimelineData | null = null;
  isRecording = false;
  isProcessingVoice = false;
  recognition: any;
  voiceTranscript = '';
  extractedData: any = {};

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private cdcService: CDCGrowthChartService,
    private timelineService: BabyTimelineService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
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
      height: [''],
      notes: ['']
    });
    
    // Stool tracking form
    this.addStoolForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      time: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      notes: ['']
    });
    
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadTrackingData(user.babies[0].id);
        this.loadTimelineData(user.babies[0].dateOfBirth);
      }
    });
    
    // Subscribe to timeline data for synchronous access
    this.timelineData$?.subscribe(data => {
      this.currentTimelineData = data;
    });
    
    this.moodOptions = this.growthService.getMoodOptions();
    this.stoolColorOptions = this.growthService.getStoolColorOptions();
    this.stoolTextureOptions = this.growthService.getStoolTextureOptions();
    this.stoolSizeOptions = this.growthService.getStoolSizeOptions();
    this.loadStarPerformers();
  }

  private loadTrackingData(babyId: string) {
    this.growthRecords$ = this.growthService.getGrowthRecords(babyId);
    this.weightRecords$ = this.growthService.getWeightRecords(babyId);
    this.stoolRecords$ = this.growthService.getStoolRecords(babyId);
    this.recentRecords$ = this.growthService.getRecentRecords(babyId, 3);
  }

  private loadTimelineData(birthDate: Date) {
    this.timelineData$ = this.timelineService.getTimelineForBaby(birthDate);
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
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          this.voiceTranscript = finalTranscript.trim();
          this.processSmartVoiceInput(finalTranscript.trim());
        }
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

  openAddStoolModal() {
    this.showAddStoolModal = true;
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
    this.selectedMood = null;
    this.clearVoiceInput();
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

  closeAddStoolModal() {
    this.showAddStoolModal = false;
    this.selectedStoolColor = null;
    this.selectedStoolTexture = null;
    this.selectedStoolSize = null;
    this.addWeightForm.reset({
      date: new Date().toISOString()
    });
  }

  selectMood(mood: MoodType) {
    this.selectedMood = mood;
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

  private async processSmartVoiceInput(transcript: string) {
    this.isProcessingVoice = true;
    
    try {
      // Extract data from voice input
      const extracted = this.extractDataFromSpeech(transcript);
      this.extractedData = extracted;
      
      // Auto-fill form fields
      this.autoFillFormFields(extracted);
      
      // Show success message with what was extracted
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
    
    // Extract feeding duration
    const durationPatterns = [
      /(?:each|per|average|avg).*?(?:feed|feeding|session).*?(?:lasted|took|was).*?(\d+).*?(?:minutes?|mins?)/i,
      /(?:fed|feeding|nursed).*?(?:for|about|around).*?(\d+).*?(?:minutes?|mins?)/i,
      /(\d+).*?(?:minutes?|mins?).*?(?:each|per|average|avg)/i
    ];
    
    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const duration = parseInt(match[1]);
        if (duration >= 5 && duration <= 120) {
          extracted.avgFeedingDuration = duration;
          break;
        }
      }
    }
    
    // Extract pumping sessions
    const pumpingPatterns = [
      /(?:pumped|pumping).*?(\d+).*?(?:times|sessions?)/i,
      /(\d+).*?(?:pumping|pump).*?(?:sessions?|times)/i,
      /(?:did|had|completed).*?(\d+).*?(?:pump|pumping)/i
    ];
    
    for (const pattern of pumpingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const sessions = parseInt(match[1]);
        if (sessions >= 0 && sessions <= 10) {
          extracted.pumpingSessions = sessions;
          break;
        }
      }
    }
    
    // Extract pumping output
    const outputPatterns = [
      /(?:pumped|got|produced).*?(\d+).*?(?:ml|milliliters?|mls?)/i,
      /(?:total|altogether|combined).*?(\d+).*?(?:ml|milliliters?|mls?)/i,
      /(\d+).*?(?:ml|milliliters?|mls?).*?(?:total|pumped|output)/i
    ];
    
    for (const pattern of outputPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const output = parseInt(match[1]);
        if (output >= 0 && output <= 2000) {
          extracted.totalPumpingOutput = output;
          break;
        }
      }
    }
    
    // Extract formula intake
    const formulaPatterns = [
      /(?:formula|bottle).*?(\d+).*?(?:ml|milliliters?|mls?)/i,
      /(?:gave|fed).*?(\d+).*?(?:ml|milliliters?|mls?).*?(?:formula|bottle)/i,
      /(\d+).*?(?:ml|milliliters?|mls?).*?(?:formula|bottle)/i
    ];
    
    for (const pattern of formulaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const formula = parseInt(match[1]);
        if (formula >= 0 && formula <= 1000) {
          extracted.formulaIntake = formula;
          break;
        }
      }
    }
    
    // Extract pee count
    const peePatterns = [
      /(\d+).*?(?:wet|pee|pees|urine).*?(?:diapers?|nappies?)/i,
      /(?:wet|pee|pees|urine).*?(\d+).*?(?:diapers?|nappies?|times)/i,
      /(?:peed|urinated).*?(\d+).*?(?:times)/i
    ];
    
    for (const pattern of peePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const pees = parseInt(match[1]);
        if (pees >= 0 && pees <= 20) {
          extracted.peeCount = pees;
          break;
        }
      }
    }
    
    // Extract poop count
    const poopPatterns = [
      /(\d+).*?(?:dirty|poop|poops|bowel).*?(?:diapers?|nappies?|movements?)/i,
      /(?:dirty|poop|poops|bowel).*?(\d+).*?(?:diapers?|nappies?|times|movements?)/i,
      /(?:pooped|had).*?(\d+).*?(?:bowel movements?|poops?)/i
    ];
    
    for (const pattern of poopPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const poops = parseInt(match[1]);
        if (poops >= 0 && poops <= 10) {
          extracted.poopCount = poops;
          break;
        }
      }
    }
    
    // Extract mood
    const moodKeywords = {
      'great': ['great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'perfect'],
      'good': ['good', 'well', 'fine', 'nice', 'positive', 'happy'],
      'okay': ['okay', 'alright', 'decent', 'average', 'normal'],
      'tired': ['tired', 'exhausted', 'sleepy', 'worn out', 'drained'],
      'worried': ['worried', 'concerned', 'anxious', 'nervous', 'stressed'],
      'overwhelmed': ['overwhelmed', 'difficult', 'hard', 'challenging', 'tough']
    };
    
    for (const [moodValue, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const mood = this.moodOptions.find(m => m.value === moodValue);
        if (mood) {
          extracted.mood = mood;
          break;
        }
      }
    }
    
    // Extract notes (capture descriptive text)
    const notePatterns = [
      /(?:note|notes?|comment|comments?).*?[:\-]?\s*(.+)/i,
      /(?:today|yesterday).*?(was|felt|seemed|had).+/i
    ];
    
    for (const pattern of notePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 10) {
        extracted.notes = match[1].trim();
        break;
      }
    }
    
    // If no specific notes pattern, but transcript is descriptive, use it as notes
    if (!extracted.notes && text.length > 50 && !Object.keys(extracted).some(key => key !== 'notes')) {
      extracted.notes = transcript.trim();
    }
    
    return extracted;
  }
  
  private autoFillFormFields(extractedData: any) {
    const formUpdates: any = {};
    
    // Map extracted data to form fields
    if (extractedData.directFeedingSessions !== undefined) {
      formUpdates.directFeedingSessions = extractedData.directFeedingSessions;
    }
    
    if (extractedData.avgFeedingDuration !== undefined) {
      formUpdates.avgFeedingDuration = extractedData.avgFeedingDuration;
    }
    
    if (extractedData.pumpingSessions !== undefined) {
      formUpdates.pumpingSessions = extractedData.pumpingSessions;
    }
    
    if (extractedData.totalPumpingOutput !== undefined) {
      formUpdates.totalPumpingOutput = extractedData.totalPumpingOutput;
    }
    
    if (extractedData.formulaIntake !== undefined) {
      formUpdates.formulaIntake = extractedData.formulaIntake;
    }
    
    if (extractedData.peeCount !== undefined) {
      formUpdates.peeCount = extractedData.peeCount;
    }
    
    if (extractedData.poopCount !== undefined) {
      formUpdates.poopCount = extractedData.poopCount;
    }
    
    if (extractedData.notes !== undefined) {
      formUpdates.notes = extractedData.notes;
    }
    
    // Update form with extracted data
    if (Object.keys(formUpdates).length > 0) {
      this.addRecordForm.patchValue(formUpdates);
    }
    
    // Set mood if extracted
    if (extractedData.mood) {
      this.selectedMood = extractedData.mood;
    }
  }

  clearVoiceInput() {
    this.voiceTranscript = '';
    this.extractedData = {};
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
          enteredViaVoice: !!this.voiceTranscript
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
          height: formValue.height ? parseFloat(formValue.height) : undefined,
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

  async saveStoolRecord() {
    if (this.addStoolForm.valid && this.user && this.user.babies.length > 0 && 
        this.selectedStoolColor && this.selectedStoolTexture && this.selectedStoolSize) {
      try {
        const formValue = this.addStoolForm.value;
        const record: Omit<StoolRecord, 'id' | 'createdAt'> = {
          babyId: this.user.babies[0].id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          time: formValue.time,
          color: this.selectedStoolColor,
          texture: this.selectedStoolTexture,
          size: this.selectedStoolSize,
          notes: formValue.notes
        };

        await this.growthService.addStoolRecord(record);
        this.showToast('Stool record saved successfully!', 'success');

        this.closeAddStoolModal();
      } catch (error) {
        this.showToast('Failed to save stool record. Please try again.', 'danger');
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

  isVoiceSupported(): boolean {
    return !!this.recognition;
  }

  getAddButtonText(): string {
    switch (this.selectedTab) {
      case 'daily': return 'Add Daily Record';
      case 'weight': return 'Add Weight & Size';
      case 'stool': return 'Add Stool Track';
      default: return 'Add Record';
    }
  }

  openAddModal() {
    if (this.selectedTab === 'daily') {
      this.openAddRecordModal();
    } else if (this.selectedTab === 'weight') {
      this.openAddWeightModal();
    } else if (this.selectedTab === 'stool') {
      this.openAddStoolModal();
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

  getNewDate(): Date {
    return new Date();
  }

  getBabyGenderForChart(gender: 'male' | 'female' | 'other' | undefined): 'male' | 'female' {
    if (gender === 'male' || gender === 'female') {
      return gender;
    }
    return 'female';
  }

  getCategoryLabel(category: string): string {
    const categoryLabels: { [key: string]: string } = {
      'feeding': 'Feeding',
      'development': 'Development',
      'sleep': 'Sleep',
      'milestone': 'Milestone',
      'health': 'Health'
    };
    return categoryLabels[category] || category;
  }

  getCategoryColor(category: string): string {
    const categoryColors: { [key: string]: string } = {
      'feeding': 'primary',
      'development': 'success',
      'sleep': 'tertiary',
      'milestone': 'warning',
      'health': 'danger'
    };
    return categoryColors[category] || 'medium';
  }

  getCurrentWeek(): number {
    return this.currentTimelineData?.currentWeek || 0;
  }

  getTimelineProgress(): number {
    const currentWeek = this.getCurrentWeek();
    const maxWeeks = 52; // 1 year
    return Math.min((currentWeek / maxWeeks) * 100, 100);
  }

  getCurrentTimelineItem(): BabyTimelineItem | null {
    if (!this.currentTimelineData) return null;
    
    const currentWeek = this.currentTimelineData.currentWeek;
    return this.currentTimelineData.items.find(item => 
      currentWeek >= item.weekStart && currentWeek <= item.weekEnd
    ) || null;
  }

  getUpcomingTimelineItem(): BabyTimelineItem | null {
    if (!this.currentTimelineData) return null;
    
    const currentWeek = this.currentTimelineData.currentWeek;
    return this.currentTimelineData.items.find(item => 
      item.weekStart > currentWeek
    ) || null;
  }

  getWeeksUntilUpcoming(): number {
    const upcoming = this.getUpcomingTimelineItem();
    if (!upcoming || !this.currentTimelineData) return 0;
    
    return upcoming.weekStart - this.currentTimelineData.currentWeek;
  }

  // Timeline navigation methods
  openTimelineModal() {
    this.router.navigate(['/tabs/growth/timeline']);
  }

  openSpecificWeekModal(weekItem: BabyTimelineItem) {
    this.router.navigate(['/tabs/growth/timeline/week', weekItem.weekStart]);
  }

  scrollTimelineLeft() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }

  scrollTimelineRight() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }

  ngAfterViewInit() {
    // Auto-scroll to current week when view initializes
    setTimeout(() => {
      this.scrollToCurrentWeek();
    }, 500);
  }

  private scrollToCurrentWeek() {
    if (this.timelineScrollContainer) {
      const container = this.timelineScrollContainer.nativeElement;
      const currentWeekElement = container.querySelector('.week-marker-horizontal.current-week');
      
      if (currentWeekElement) {
        const containerWidth = container.offsetWidth;
        const elementLeft = (currentWeekElement as HTMLElement).offsetLeft;
        const elementWidth = (currentWeekElement as HTMLElement).offsetWidth;
        
        // Center the current week in the viewport
        const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }
}