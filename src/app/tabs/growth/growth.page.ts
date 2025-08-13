import { Component, OnInit } from '@angular/core';
import { ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { WHOGrowthChartService } from '../../services/who-growth-chart.service';
import { BabyTimelineService } from '../../services/baby-timeline.service';
import { GrowthRecord, WeightRecord, StoolRecord, BreastSide, SupplementType, LipstickShape, MotherMood, StoolColor, StoolTexture, StoolSize, StarPerformer } from '../../models/growth-tracking.model';
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
  selectedBaby: any = null;
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  weightRecords$: Observable<WeightRecord[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  recentRecords$: Observable<GrowthRecord[]> | null = null;
  timelineData$: Observable<BabyTimelineData> | null = null;
  selectedMainTab: 'my-babies' | 'breastfeeding-history' = 'my-babies';
  showAddRecordModal = false;
  showAddWeightModal = false;
  showAddStoolModal = false;
  showBabySelector = false;
  addRecordForm: FormGroup;
  addWeightForm: FormGroup;
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
  painLevel: number = 0;
  lastTrack: any = null;
  dailySummary: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private whoService: WHOGrowthChartService,
    private timelineService: BabyTimelineService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
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
      peeCount: ['', [Validators.min(0), Validators.max(20)]],
      poopCount: ['', [Validators.min(0), Validators.max(15)]],
      notes: ['']
    });
    
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        // Set first baby as default selected baby
        this.selectedBaby = user.babies[0];
        this.loadTrackingData(this.selectedBaby.id);
        this.loadTimelineData(this.selectedBaby.dateOfBirth);
        this.loadSummaryData(this.selectedBaby.id);
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

  private async loadSummaryData(babyId: string) {
    this.lastTrack = await this.growthService.getLastFeedingRecord(babyId);
    this.dailySummary = await this.growthService.getDailySummary(babyId);
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
    this.openAddRecordModal();
  }

  onWeightSize() {
    this.openAddWeightModal();
  }

  onPoo() {
    this.openAddStoolModal();
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

  openAddWeightModal() {
    this.showAddWeightModal = true;
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

  closeAddWeightModal() {
    this.showAddWeightModal = false;
    this.clearVoiceInputWeight();
    this.addWeightForm.reset({
      date: new Date().toISOString()
    });
  }

  closeAddStoolModal() {
    this.showAddStoolModal = false;
    this.selectedStoolColor = null;
    this.selectedStoolTexture = null;
    this.selectedStoolSize = null;
    this.clearVoiceInputStool();
    this.addStoolForm.reset({
      date: new Date().toISOString(),
      time: new Date().toTimeString().slice(0, 5)
    });
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

  clearVoiceInputWeight() {
    this.voiceTranscriptWeight = '';
    this.extractedDataWeight = {};
  }

  clearVoiceInputStool() {
    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
  }

  private extractWeightDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract weight
    const weightPatterns = [
      /(?:weighs?|weight|is).*?(\d+(?:\.\d+)?).*?(?:kg|kilograms?|kilos?)/i,
      /(\d+(?:\.\d+)?).*?(?:kg|kilograms?|kilos?)/i,
      /(?:baby|child).*?(\d+(?:\.\d+)?).*?(?:kg|kilograms?)/i
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
    
    // Extract height/length
    const heightPatterns = [
      /(?:height|length|tall|long).*?(\d+(?:\.\d+)?).*?(?:cm|centimeters?)/i,
      /(\d+(?:\.\d+)?).*?(?:cm|centimeters?).*?(?:tall|long|height|length)/i,
      /(?:measures?|is).*?(\d+(?:\.\d+)?).*?(?:cm|centimeters?)/i
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
    
    // Extract notes
    if (text.length > 20 && !Object.keys(extracted).some(key => key !== 'notes')) {
      extracted.notes = transcript.trim();
    }
    
    return extracted;
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

  private autoFillWeightFormFields(extractedData: any) {
    const formUpdates: any = {};
    
    if (extractedData.weight !== undefined) {
      formUpdates.weight = extractedData.weight;
    }
    
    if (extractedData.height !== undefined) {
      formUpdates.height = extractedData.height;
    }
    
    if (extractedData.notes !== undefined) {
      formUpdates.notes = extractedData.notes;
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

  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.selectedBaby) {
      try {
        const formValue = this.addRecordForm.value;
        // Use the new FeedLogModalComponent instead
        await this.openFeedLogModal();
      } catch (error) {
        this.showToast('Failed to save record. Please try again.', 'danger');
      }
    }
  }

  async saveWeightRecord() {
    if (this.addWeightForm.valid && this.user && this.selectedBab
  }
}y) {
      try {
        const formValue = this.addWeightForm.value;
        const record: Omit<WeightRecord, 'id' | 'createdAt'> = {
          babyId: this.selectedBaby.id,
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

  private async quickLogPumping() {
    // For now, use the same form - could be extended later
    this.addRecordForm.patchValue({
      date: new Date().toISOString(),
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5), // 15 minutes later
      painLevel: 0
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  calculateBabyAge(): string {
    if (!this.selectedBaby) return '';
    
    const birthDate = new Date(this.selectedBaby.dateOfBirth);
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
  async openFeedLogModal(isFastFeed: boolean = false) {
    if (!this.selectedBaby) {
      this.showToast('Please select a baby first', 'warning');
      return;
    }
    return this.dailySummary?.avgPainLevel || 0;
  }

  async openFeedLogModal(isFastFeed: boolean = false) {
    if (!this.selectedBaby) {
      this.showToast('Please select a baby first', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: FeedLogModalComponent,
      componentProps: {
        prefilledData: { babyId: this.selectedBaby.id },
        isFastFeed: isFastFeed
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

  getCategoryLabel(category: string): string {
    const categoryLabels: { [key: string]: string } = {
      'feeding': 'Feeding',
    };
    return categoryLabels[category] || category;
  }
}