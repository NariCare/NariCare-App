import { Component, OnInit } from '@angular/core';
import { ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { BackendGrowthService } from '../../services/backend-growth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { BackendPumpingService } from '../../services/backend-pumping.service';
import { BackendEmotionService } from '../../services/backend-emotion.service';
import { WHOGrowthChartService } from '../../services/who-growth-chart.service';
import { BabyTimelineService } from '../../services/baby-timeline.service';
import { GrowthRecord, WeightRecord, StoolRecord, BreastSide, SupplementType, LipstickShape, MotherMood, StoolColor, StoolTexture, StoolSize, StarPerformer, DiaperChangeRecord } from '../../models/growth-tracking.model';
import { BabyTimelineData, BabyTimelineItem } from '../../models/baby-timeline.model';
import { User, Baby } from '../../models/user.model';
import { TimelineModalComponent } from 'src/app/components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from 'src/app/components/specific-week-modal/specific-week-modal.component';
import { FeedLogModalComponent } from 'src/app/components/feed-log-modal/feed-log-modal.component';
import { DiaperLogModalComponent } from 'src/app/components/diaper-log-modal/diaper-log-modal.component';
import { EmotionCheckinModalComponent } from 'src/app/components/emotion-checkin-modal/emotion-checkin-modal.component';
import { PumpingLogModalComponent } from 'src/app/components/pumping-log-modal/pumping-log-modal.component';
import { WeightLogModalComponent } from 'src/app/components/weight-log-modal/weight-log-modal.component';
import { BabyCreationModalComponent } from 'src/app/components/baby-creation-modal/baby-creation-modal.component';
import { ApiService } from '../../services/api.service';


@Component({
  selector: 'app-growth',
  templateUrl: './growth.page.html',
  styleUrls: ['./growth.page.scss'],
})
export class GrowthPage implements OnInit {
  @ViewChild('timelineScrollContainer', { static: false }) timelineScrollContainer!: ElementRef;
  
  user: User | null = null;
  selectedBaby: any = null;
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  diaperChangeRecords$: Observable<DiaperChangeRecord[]> | null = null;
  recentRecords$: Observable<GrowthRecord[]> | null = null;
  pumpingRecords$: Observable<any[]> | null = null;
  pumpingRecords: any[] = [];
  emotionRecords$: Observable<any[]> | null = null;
  emotionRecords: any[] = [];
  timelineData$: Observable<BabyTimelineData> | null = null;
  selectedMainTab: 'my-babies' | 'mothers-journey' = 'my-babies';
  showAddRecordModal = false;
  showAddStoolModal = false;
  showDiaperLogModal = false;
  showAddPumpingModal = false;
  showEmotionCheckinModal = false;
  showBabySelector = false;
  addRecordForm: FormGroup;
  addStoolForm: FormGroup;
  selectedBreastSide: BreastSide | null = null;
  selectedSupplement: SupplementType | null = null;
  selectedLipstickShape: LipstickShape | null = null;
  selectedMotherMood: MotherMood | null = null;
  selectedStoolColor: StoolColor | null = null;
  selectedStoolTexture: StoolTexture | null = null;
  selectedStoolSize: StoolSize | null = null;
  breastSideOptions: BreastSide[] = [];
  supplementOptions: SupplementType[] = [];
  lipstickShapeOptions: LipstickShape[] = [];
  motherMoodOptions: MotherMood[] = [];
  stoolColorOptions: StoolColor[] = [];
  stoolTextureOptions: StoolTexture[] = [];
  stoolSizeOptions: StoolSize[] = [];
  starPerformers: StarPerformer[] = [];
  currentTimelineData: BabyTimelineData | null = null;
  isRecording = false;
  isProcessingVoice = false;
  isRecordingStool = false;
  isProcessingVoiceStool = false;
  recognition: any;
  voiceTranscript = '';
  voiceTranscriptStool = '';
  extractedData: any = {};
  extractedDataStool: any = {};
  painLevel: number = 0;
  lastTrack: any = null;
  dailySummary: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private backendGrowthService: BackendGrowthService,
    private backendAuthService: BackendAuthService,
    private backendPumpingService: BackendPumpingService,
    private backendEmotionService: BackendEmotionService,
    private whoService: WHOGrowthChartService,
    private timelineService: BabyTimelineService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router,
    private apiService: ApiService
  ) {
    // Daily tracking form
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
    
    // Stool tracking form
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
    this.backendAuthService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        // Load babies from API to ensure we have the latest data
        this.loadUserBabies();
        // Load pumping data (baby-independent)
        this.loadPumpingData();
        // Load emotion check-in data
        this.loadEmotionData();
      }
    });
    
    // Subscribe to timeline data for synchronous access
    this.timelineData$?.subscribe(data => {
      this.currentTimelineData = data;
    });
    
    this.breastSideOptions = this.growthService.getBreastSideOptions();
    this.supplementOptions = this.growthService.getSupplementOptions();
    this.lipstickShapeOptions = this.growthService.getLipstickShapeOptions();
    this.motherMoodOptions = this.growthService.getMotherMoodOptions();
    this.stoolColorOptions = this.growthService.getStoolColorOptions();
    this.stoolTextureOptions = this.growthService.getStoolTextureOptions();
    this.stoolSizeOptions = this.growthService.getStoolSizeOptions();
  }

  // Custom validator for decimal places
  decimalPlacesValidator(maxDecimals: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value == null || value === '') return null;
      
      const valueStr = value.toString();
      const decimalIndex = valueStr.indexOf('.');
      
      if (decimalIndex === -1) return null; // No decimal point, valid
      
      const decimalPart = valueStr.substring(decimalIndex + 1);
      if (decimalPart.length > maxDecimals) {
        return { maxDecimals: { actualDecimals: decimalPart.length, maxDecimals } };
      }
      
      return null;
    };
  }

  private async loadSummaryData(babyId: string) {
    // Use backend service if user is authenticated with backend, otherwise use local service
    const isBackendUser = this.backendAuthService.getCurrentUser();
    
    if (isBackendUser) {
      this.lastTrack = await this.backendGrowthService.getLastFeedingRecord(babyId);
      this.dailySummary = await this.backendGrowthService.getDailySummary(babyId);
    } else {
      this.lastTrack = await this.growthService.getLastFeedingRecord(babyId);
      this.dailySummary = await this.growthService.getDailySummary(babyId);
    }
  }

  private loadTrackingData(babyId: string) {
    // Use backend service if user is authenticated with backend, otherwise use local service
    const isBackendUser = this.backendAuthService.getCurrentUser();
    
    if (isBackendUser) {
      this.growthRecords$ = this.backendGrowthService.getFeedRecords(babyId);
      this.weightRecords$ = this.backendGrowthService.getWeightRecords(babyId);
      this.stoolRecords$ = this.backendGrowthService.getStoolRecords(babyId);
      // For recent records, we'll use the same feed records observable for now
      this.recentRecords$ = this.backendGrowthService.getFeedRecords(babyId);
    } else {
      this.growthRecords$ = this.growthService.getGrowthRecords(babyId);
      this.weightRecords$ = this.growthService.getWeightRecords(babyId);
      this.stoolRecords$ = this.growthService.getStoolRecords(babyId);
      this.recentRecords$ = this.growthService.getRecentRecords(babyId, 3);
    }
  }

  private loadTimelineData(birthDate: Date) {
    this.timelineData$ = this.timelineService.getTimelineForBaby(birthDate);
  }

  private async loadUserBabies() {
    try {
      const response = await this.apiService.getUserBabies().toPromise();
      if (response?.success && response.data) {
        // Update the user object with babies from API
        if (this.user) {
          this.user.babies = response.data.map((baby: any) => ({
            id: baby.id,
            name: baby.name,
            dateOfBirth: new Date(baby.dateOfBirth || baby.date_of_birth),
            gender: baby.gender,
            birthWeight: baby.birthWeight || baby.birth_weight,
            birthHeight: baby.birthHeight || baby.birth_height,
            currentWeight: baby.currentWeight || baby.current_weight,
            currentHeight: baby.currentHeight || baby.current_height
          }));

          // If we have babies and no selected baby, select the first one
          if (this.user.babies.length > 0 && !this.selectedBaby) {
            this.selectedBaby = this.user.babies[0];
            this.loadTrackingData(this.selectedBaby.id);
            this.loadTimelineData(this.selectedBaby.dateOfBirth);
            this.loadSummaryData(this.selectedBaby.id);
          }
          
          // Reload pumping data now that we have valid baby IDs
          this.loadPumpingData();
        }
      }
    } catch (error) {
      console.warn('Failed to load user babies:', error);
    }
  }

  private loadPumpingData() {
    // Check if user is using backend services
    const isBackendUser = this.backendAuthService.getCurrentUser();
    
    if (isBackendUser) {
      // Use backend service - require at least one baby from API
      const firstBaby = this.user?.babies?.[0];
      if (firstBaby?.id) {
        this.pumpingRecords$ = this.backendPumpingService.getPumpingRecords(firstBaby.id).pipe(
          map(response => {
            const records = response.records || [];
            this.pumpingRecords = records; // Store records for synchronous access
            return records;
          })
        );
        // Subscribe to update local records
        this.pumpingRecords$.subscribe();
      } else {
        // If no baby available, show empty list
        console.log('No babies available. Pumping data will load after baby information is added.');
        this.pumpingRecords = [];
        this.pumpingRecords$ = new Observable(subscriber => subscriber.next([]));
      }
    } else {
      // Use local service - fallback to 'baby-123' for local storage compatibility
      const babyId = this.user?.babies?.[0]?.id || 'baby-123';
      this.pumpingRecords$ = this.growthService.getPumpingRecords(babyId).pipe(
        map(records => {
          this.pumpingRecords = records || [];
          return records;
        })
      );
      // Subscribe to update local records
      this.pumpingRecords$.subscribe();
    }
  }

  private loadEmotionData() {
    // Check if user is using backend services
    const isBackendUser = this.backendAuthService.getCurrentUser();
    
    if (isBackendUser) {
      // Use backend emotion service
      this.emotionRecords$ = this.backendEmotionService.getEmotionCheckins().pipe(
        map((response: any) => {
          const records = response.checkins || [];
          this.emotionRecords = records; // Store records for synchronous access
          return records;
        }),
        catchError(error => {
          console.error('Error loading emotion data:', error);
          this.emotionRecords = []; // Clear on error
          return of([]);
        })
      );
      
      // Subscribe to update local records
      this.emotionRecords$.subscribe();
    } else {
      // For local users, return empty array (no local emotion storage implemented)
      this.emotionRecords = [];
      this.emotionRecords$ = of([]);
    }
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
        if (this.isProcessingVoice) {
          this.isRecording = true;
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
          } else if (this.isProcessingVoiceStool) {
            this.processSmartVoiceInputStool(finalTranscript.trim());
          }
        }
        this.isRecording = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onend = () => {
        this.isRecording = false;
        this.isRecordingStool = false;
      };
    }
  }

  onMainTabChange(event: any) {
    this.selectedMainTab = event.detail.value;
  }

  // Action button handlers
  onFastFeed() {
    // Pre-fill form for quick entry
    this.addRecordForm.patchValue({
      date: new Date().toISOString(),
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5), // 15 minutes later
      painLevel: 0,
      directFeedingSessions: 1,
      avgFeedingDuration: 15
    });
    this.openAddRecordModal();
  }

  onFeed() {
    this.openFeedLogModal();
  }

  async onWeightSize() {
    const modal = await this.modalController.create({
      component: WeightLogModalComponent,
      componentProps: {
        // selectedBaby: this.selectedBaby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        // Refresh data if needed
        console.log('Weight record saved successfully');
      }
    });

    return await modal.present();
  }

  onPoo() {
    this.showDiaperLogModal = true;
  }

  onEmotionCheckin() {
    this.openEmotionCheckinModal();
  }

  selectBaby(baby: any) {
    // Navigate to detailed baby page
    this.router.navigate(['/tabs/growth/baby-detail', baby.id]);
  }

  navigateToDetailedTracker() {
    if (this.selectedBaby) {
      this.router.navigate(['/tabs/growth/baby-detail', this.selectedBaby.id]);
    }
  }

  // Baby selection methods
  openBabySelector() {
    this.showBabySelector = true;
  }

  closeBabySelector() {
    this.showBabySelector = false;
  }

  openAddRecordModal() {
    this.showAddRecordModal = true;
  }

  openAddStoolModal() {
    this.showAddStoolModal = true;
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
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

  closeAddStoolModal() {
    this.showDiaperLogModal = false;
  }

  closeDiaperLogModal() {
    this.showDiaperLogModal = false;
  }

  openAddPumpingModal() {
    this.showAddPumpingModal = true;
  }

  closeAddPumpingModal() {
    this.showAddPumpingModal = false;
  }

  async openEmotionCheckinModal() {
    const modal = await this.modalController.create({
      component: EmotionCheckinModalComponent,
      cssClass: 'emotion-checkin-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.showToast('Emotion check-in saved. Thank you for taking care of yourself! 💕', 'success');
        // Reload emotion data to reflect new check-in
        this.loadEmotionData();
      }
    });

    return await modal.present();
  }

  closeEmotionCheckinModal() {
    this.showEmotionCheckinModal = false;
  }

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
        const mood = this.motherMoodOptions.find(m => m.value === moodValue);
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
      this.selectedMotherMood = extractedData.mood;
    }
  }

  clearVoiceInput() {
    this.voiceTranscript = '';
    this.extractedData = {};
  }


  clearVoiceInputStool() {
    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
  }


  private extractStoolDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract color
    const colorKeywords = {
      'very-dark': ['very dark', 'black', 'very black', 'dark black'],
      'dark-green': ['dark green', 'green', 'greenish'],
      'dark-brown': ['dark brown', 'brown', 'brownish'],
      'mustard-yellow': ['mustard', 'yellow', 'mustard yellow', 'yellowish'],
      'other': ['red', 'orange', 'unusual', 'different', 'strange']
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
      'liquid': ['liquid', 'watery', 'runny', 'loose'],
      'pasty': ['pasty', 'soft', 'mushy', 'creamy'],
      'hard': ['hard', 'firm', 'solid', 'dry'],
      'snotty': ['snotty', 'mucus', 'slimy', 'stringy'],
      'bloody': ['bloody', 'blood', 'red streaks', 'bleeding']
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
    
    // Extract size
    const sizeKeywords = {
      'coin': ['coin', 'small', 'tiny', 'little'],
      'tablespoon': ['tablespoon', 'medium', 'normal', 'average'],
      'bigger': ['bigger', 'large', 'big', 'huge']
    };
    
    for (const [sizeValue, keywords] of Object.entries(sizeKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const size = this.stoolSizeOptions.find(s => s.value === sizeValue);
        if (size) {
          extracted.size = size;
          break;
        }
      }
    }
    
    // Extract notes
    if (text.length > 20 && !Object.keys(extracted).some(key => key !== 'notes')) {
      extracted.notes = transcript.trim();
    }
    
    return extracted;
  }


  private autoFillStoolFormFields(extractedData: any) {
    if (extractedData.color) {
      this.selectedStoolColor = extractedData.color;
    }
    
    if (extractedData.texture) {
      this.selectedStoolTexture = extractedData.texture;
    }
    
    if (extractedData.size) {
      this.selectedStoolSize = extractedData.size;
    }
    
    const formUpdates: any = {};
    
    if (extractedData.notes) {
      formUpdates.notes = extractedData.notes;
    }
    
    if (extractedData.peeCount !== undefined) {
      formUpdates.peeCount = extractedData.peeCount;
    }
    
    if (extractedData.poopCount !== undefined) {
      formUpdates.poopCount = extractedData.poopCount;
    }
    
    if (Object.keys(formUpdates).length > 0) {
      this.addStoolForm.patchValue(formUpdates);
    }
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


  getVoiceInputSummaryStool(): string {
    const extractedFields = Object.keys(this.extractedDataStool).filter(key => 
      this.extractedDataStool[key] !== null && this.extractedDataStool[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.selectedBaby) {
      try {
        const formValue = this.addRecordForm.value;
        // Use the new FeedLogModalComponent instead
        // await this.openFeedLogModal();
      } catch (error) {
        this.showToast('Failed to save record. Please try again.', 'danger');
      }
    }
  }


  async saveStoolRecord() {
    if (this.addStoolForm.valid && this.user && this.selectedBaby && 
        this.selectedStoolColor && this.selectedStoolTexture && this.selectedStoolSize) {
      try {
        const formValue = this.addStoolForm.value;
        const record: Omit<StoolRecord, 'id' | 'createdAt'> = {
          babyId: this.selectedBaby.id,
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
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date(Date.now() + 20 * 60000).toTimeString().slice(0, 5), // 20 minutes later
      painLevel: 0
    });
    
    this.openAddRecordModal();
  }

  public async quickLogPumping() {
    this.openAddPumpingModal();
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
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

  getMotherMoodEmoji(mood: string): string {
    const moodOption = this.motherMoodOptions.find(m => m.value === mood);
    return moodOption?.emoji || '😊';
  }

  getMotherMoodLabel(mood: string): string {
    const moodOption = this.motherMoodOptions.find(m => m.value === mood);
    return moodOption?.label || mood;
  }

  calculateBabyAgeForBaby(birthDate: Date): string {
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


  calculateBabyAge(baby?: Baby): string {
    const targetBaby = baby || this.selectedBaby;
    if (!targetBaby) return '';
    
    const birthDate = new Date(targetBaby.dateOfBirth);
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


  getLastTrackTime(): string {
    if (!this.lastTrack) return '--';
    return this.lastTrack.time;
  }

  getLastTrackDate(): string {
    if (!this.lastTrack) return '--';
    return this.formatDate(this.lastTrack.date);
  }

  getLastTrackBreastSide(): string {
    if (!this.lastTrack) return '--';
    return this.lastTrack.breastSide;
  }

  getDailySummaryTracks(): number {
    return this.dailySummary?.totalDirectFeeds || 0;
  }

  getDailySummaryPain(): number {
    return this.dailySummary?.avgPainLevel || 0;
  }

  // Pumping helper methods
  getLastPumpTime(): string {
    // Get the most recent pumping record
    const records = this.pumpingRecords || [];
    if (records.length === 0) return '--';
    
    const lastPump = records[0];
    const time = lastPump.record_time || lastPump.time;
    return time ? time.slice(0, 5) : '--';
  }

  getLastPumpSide(): string {
    const records = this.pumpingRecords || [];
    if (records.length === 0) return '--';
    
    const lastPump = records[0];
    return lastPump.pumping_side || lastPump.pumpingSide || '--';
  }

  getLastPumpOutput(): number {
    const records = this.pumpingRecords || [];
    if (records.length === 0) return 0;
    
    const lastPump = records[0];
    return lastPump.total_output || lastPump.totalOutput || 0;
  }

  getPumpDailySessions(): number {
    // Calculate today's sessions from pumping records
    const today = new Date().toDateString();
    const records = this.pumpingRecords || [];
    
    const todayRecords = records.filter((record: any) => {
      const recordDate = record.record_date || record.date;
      return recordDate && new Date(recordDate).toDateString() === today;
    });
    
    return todayRecords.length;
  }

  getPumpDailyOutput(): number {
    // Calculate today's total output from pumping records
    const today = new Date().toDateString();
    const records = this.pumpingRecords || [];
    
    const todayRecords = records.filter((record: any) => {
      const recordDate = record.record_date || record.date;
      return recordDate && new Date(recordDate).toDateString() === today;
    });
    
    return todayRecords.reduce((total: number, record: any) => {
      return total + (record.total_output || record.totalOutput || 0);
    }, 0);
  }

  // Pumping record display helpers (reused from baby-detail page)
  getPumpingTime(record: any): string {
    const time = record.record_time || record.time;
    if (!time) return '--';
    
    if (typeof time === 'string' && time.includes(':')) {
      return time.slice(0, 5);
    }
    
    return time;
  }

  getPumpingDate(record: any): string {
    const date = record.record_date || record.date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getPumpingSide(record: any): string {
    return record.pumping_side || record.pumpingSide || '--';
  }

  getPumpingOutput(record: any): number {
    return record.total_output || record.totalOutput || 0;
  }

  getPumpingDuration(record: any): number {
    return record.duration_minutes || record.duration || 0;
  }

  getEmotionCheckinsCount(): number {
    // Calculate current week's emotion check-ins
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get records from local property
    const records = this.emotionRecords || [];
    
    const thisWeekRecords = records.filter((record: any) => {
      const checkinDate = new Date(record.checkin_date || record.date);
      return checkinDate >= weekStart && checkinDate <= weekEnd;
    });
    
    return thisWeekRecords.length;
  }

  getLastEmotionCheckinDate(): string {
    const records = this.emotionRecords || [];
    if (records.length === 0) return 'No check-ins yet';
    
    // Sort by date descending to get latest
    const sortedRecords = records.sort((a: any, b: any) => {
      const dateA = new Date(a.checkin_date || a.date);
      const dateB = new Date(b.checkin_date || b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastRecord = sortedRecords[0];
    const lastDate = new Date(lastRecord.checkin_date || lastRecord.date);
    
    // Format date relative to today
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return this.formatDate(lastDate);
  }

  getRecentEmotionCheckins(): any[] {
    const records = this.emotionRecords || [];
    
    // Sort by date descending and take latest 3
    return records
      .sort((a: any, b: any) => {
        const dateA = new Date(a.checkin_date || a.date);
        const dateB = new Date(b.checkin_date || b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  }

  getEmotionCheckinMood(record: any): string {
    // Try to get overall mood or return default
    return record.overall_mood || record.overallMood || 'Neutral';
  }

  getEmotionCheckinDate(record: any): string {
    const date = record.checkin_date || record.date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getEmotionCheckinTime(record: any): string {
    const date = new Date(record.checkin_date || record.date);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  async openFeedLogModal(isFastFeed: boolean = false) {
    if (!this.selectedBaby) {
      this.showToast('Please select a baby first', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: FeedLogModalComponent,
      componentProps: {
        // prefilledData: { babyId: this.selectedBaby.id },
        // isFastFeed: isFastFeed
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadTrackingData(this.selectedBaby.id);
        this.loadSummaryData(this.selectedBaby.id);
      }
    });

    return await modal.present();
  }

  async openDiaperLogModal() {
    // if (!this.selectedBaby) {
    //   this.showToast('Please select a baby first', 'warning');
    //   return;
    // }

    const modal = await this.modalController.create({
      component: DiaperLogModalComponent,
      // componentProps: {
      //   selectedBaby: this.selectedBaby
      // }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadTrackingData(this.selectedBaby.id);
        this.loadSummaryData(this.selectedBaby.id);
      }
    });

    return await modal.present();
  }

  async openPumpLogModal() {

    const modal = await this.modalController.create({
      component: PumpingLogModalComponent,
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadTrackingData(this.selectedBaby.id);
        this.loadSummaryData(this.selectedBaby.id);
      }
    });

    return await modal.present();
  }

  getCategoryLabel(category: string): string {
    const categoryLabels: { [key: string]: string } = {
      'feeding': 'Feeding',
    };
    return categoryLabels[category] || category;
  }

  async openAddBabyModal() {
    const modal = await this.modalController.create({
      component: BabyCreationModalComponent,
      cssClass: 'baby-creation-modal',
      componentProps: {
        existingBabies: this.user?.babies || []
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.created) {
        // Baby was created successfully, reload babies from API
        this.showToast('Baby added successfully! 👶', 'success');
        
        // Reload babies from API to get the latest data
        this.loadUserBabies();
      }
    });

    return await modal.present();
  }

  getBabyIconUrl(gender: string): string {
    return gender === 'female' ? 'assets/Baby girl.svg' : 'assets/Baby boy.svg';
  }
}