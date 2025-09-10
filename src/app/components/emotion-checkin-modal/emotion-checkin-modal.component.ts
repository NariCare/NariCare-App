import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { BackendEmotionService, CreateEmotionCheckinRequest } from '../../services/backend-emotion.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { 
  EmotionCheckinRecord, 
  EmotionalStruggle, 
  PositiveMoment, 
  ConcerningThought 
} from '../../models/emotion-checkin.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-emotion-checkin-modal',
  templateUrl: './emotion-checkin-modal.component.html',
  styleUrls: ['./emotion-checkin-modal.component.scss']
})
export class EmotionCheckinModalComponent implements OnInit {
  @Input() selectedBaby?: any; // Not used but kept for consistency

  emotionForm: FormGroup;
  user: User | null = null;
  currentStep = 1;
  totalSteps = 4;
  
  // Selection states
  selectedStruggles: EmotionalStruggle[] = [];
  selectedPositiveMoments: PositiveMoment[] = [];
  selectedConcerningThoughts: ConcerningThought[] = [];
  
  // Show crisis alert
  showCrisisAlert = false;
  
  // Settings
  isInSettings = false;
  previousStepBeforeSettings = 1; // Store where to return after settings
  preferencesLoaded = false; // Track if preferences have been loaded
  stepPreferences = {
    step1_struggles: true,
    step2_positive: true, 
    step3_concerning: true,
    step4_reflection: true
  };

  // Predefined options
  emotionalStruggles: EmotionalStruggle[] = [
    { id: 'tired', text: 'I feel exhausted and overwhelmed', emoji: '😴', category: 'physical' },
    { id: 'sad', text: 'I feel sad or down more than usual', emoji: '😢', category: 'emotional' },
    { id: 'anxious', text: 'I feel anxious or worried constantly', emoji: '😰', category: 'emotional' },
    { id: 'guilty', text: 'I feel guilty about my parenting', emoji: '😔', category: 'emotional' },
    { id: 'isolated', text: 'I feel disconnected from others', emoji: '😞', category: 'social' },
    { id: 'inadequate', text: 'I feel like I\'m not good enough as a mother', emoji: '😟', category: 'emotional' },
    { id: 'angry', text: 'I feel irritable or angry more often', emoji: '😠', category: 'emotional' },
    { id: 'hopeless', text: 'I feel hopeless about the future', emoji: '😰', category: 'emotional' },
    { id: 'physical-pain', text: 'I\'m experiencing physical discomfort', emoji: '😣', category: 'physical' },
    { id: 'sleep-deprived', text: 'I\'m struggling with lack of sleep', emoji: '😵', category: 'physical' },
    // New additions
    { id: 'sad-tearful', text: 'I feel sad or tearful often, without a clear reason', emoji: '😢', category: 'emotional' },
    { id: 'disconnected-baby', text: 'I feel disconnected from baby', emoji: '😶', category: 'emotional' },
    { id: 'unsupported', text: 'I feel unsupported or alone', emoji: '🙁', category: 'social' },
    { id: 'guilty-not-enough', text: 'I feel guilty or like I\'m not doing enough', emoji: '😔', category: 'emotional' },
    { id: 'feeding-dread', text: 'I feel fear or dread around feeding time', emoji: '😨', category: 'practical' },
    { id: 'milk-supply-worry', text: 'I worry constantly about my milk supply', emoji: '😟', category: 'practical' },
    { id: 'overwhelming-fatigue', text: 'Overwhelming fatigue, exhaustion, or postpartum depression impacting feeding', emoji: '😴', category: 'physical' },
    { id: 'feeding-anxiety', text: 'Anxiety or feeling unable to leave baby due to feeding concerns', emoji: '😰', category: 'practical' }
  ];

  positiveMoments: PositiveMoment[] = [
    { id: 'bonding', text: 'I felt a special connection with my baby', emoji: '🥰', category: 'bonding' },
    { id: 'successful-feed', text: 'I had a successful breastfeeding session', emoji: '🌟', category: 'achievement' },
    { id: 'support', text: 'I received helpful support from someone', emoji: '🤗', category: 'support' },
    { id: 'proud', text: 'I felt proud of my progress', emoji: '😊', category: 'personal' },
    { id: 'peaceful', text: 'I had a moment of peace and calm', emoji: '😌', category: 'personal' },
    { id: 'confident', text: 'I felt confident in my abilities', emoji: '💪', category: 'personal' },
    { id: 'grateful', text: 'I felt grateful for this journey', emoji: '🙏', category: 'personal' },
    { id: 'baby-milestone', text: 'My baby reached a new milestone', emoji: '🎉', category: 'bonding' },
    { id: 'self-care', text: 'I took time for self-care', emoji: '💆‍♀️', category: 'personal' },
    { id: 'community', text: 'I connected with other mothers', emoji: '👥', category: 'support' },
    // New positive additions
    { id: 'content-confident-mother', text: 'I feel content and confident in my role as a mother', emoji: '😊', category: 'personal' },
    { id: 'joy-feeding', text: 'I feel joy or peace when holding or feeding my baby', emoji: '💗', category: 'bonding' }
  ];

  concerningThoughts: ConcerningThought[] = [
    { id: 'harm-thoughts', text: 'I\'ve thought of harming myself or my baby', emoji: '🚨', severity: 'critical' },
    { id: 'baby-better-off', text: 'I think my baby would be better off without me', emoji: '💔', severity: 'critical' },
    { id: 'escape-thoughts', text: 'I have thoughts of running away or escaping', emoji: '🏃‍♀️', severity: 'high' },
    { id: 'failure-thoughts', text: 'I constantly think I\'m failing as a mother', emoji: '😞', severity: 'moderate' },
    { id: 'intrusive-thoughts', text: 'I have scary thoughts I can\'t control', emoji: '😨', severity: 'high' },
    { id: 'regret-baby', text: 'I regret having my baby', emoji: '😔', severity: 'high' },
    // New concerning thoughts additions
    { id: 'intrusive-scary-thoughts', text: 'I\'ve had intrusive or scary thoughts I don\'t want to have', emoji: '⚠️', severity: 'high' },
    { id: 'no-interest', text: 'I have no interest in my baby or daily life', emoji: '🕳️', severity: 'critical' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private backendEmotionService: BackendEmotionService,
    private backendAuthService: BackendAuthService,
    private storage: Storage,
    private cdr: ChangeDetectorRef
  ) {
    this.emotionForm = this.formBuilder.group({
      gratefulFor: [''],
      proudOfToday: [''],
      tomorrowGoal: [''],
      additionalNotes: ['']
    });
  }

  async ngOnInit() {
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
    
    // Initialize storage and load preferences
    await this.initializeStorage();
    await this.loadStepPreferences();
    this.updateTotalSteps();
    this.initializeToFirstEnabledStep();
  }
  
  private async initializeStorage() {
    await this.storage.create();
  }
  
  private async loadStepPreferences() {
    try {
      const savedPreferences = await this.storage.get('emotion_checkin_preferences');
      if (savedPreferences) {
        this.stepPreferences = { ...this.stepPreferences, ...savedPreferences };
      }
      console.log('Step preferences loaded:', this.stepPreferences);
      this.preferencesLoaded = true;
      this.cdr.detectChanges(); // Force change detection after loading preferences
    } catch (error) {
      console.error('Error loading step preferences:', error);
      this.preferencesLoaded = true; // Still mark as loaded even if there was an error
    }
  }
  
  private async saveStepPreferences() {
    try {
      await this.storage.set('emotion_checkin_preferences', this.stepPreferences);
      
      const toast = await this.toastController.create({
        message: 'Settings saved successfully!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (error) {
      console.error('Error saving step preferences:', error);
      
      const toast = await this.toastController.create({
        message: 'Failed to save settings. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }
  
  goToSettings() {
    this.previousStepBeforeSettings = this.currentStep;
    this.isInSettings = true;
  }
  
  exitSettings() {
    this.isInSettings = false;
    this.currentStep = this.previousStepBeforeSettings;
  }
  
  isInSettingsMode(): boolean {
    return this.isInSettings;
  }
  
  async saveSettings() {
    // Ensure at least one step is enabled
    const enabledSteps = Object.values(this.stepPreferences).filter(enabled => enabled).length;
    
    if (enabledSteps === 0) {
      const toast = await this.toastController.create({
        message: 'At least one step must remain enabled.',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }
    
    await this.saveStepPreferences();
    this.updateTotalSteps();
    this.adjustCurrentStepIfNeeded();
    
    // Return to the first enabled step after saving
    this.initializeToFirstEnabledStep();
    this.isInSettings = false;
  }
  
  private updateTotalSteps() {
    const enabledSteps = Object.values(this.stepPreferences).filter(enabled => enabled).length;
    this.totalSteps = Math.max(1, enabledSteps); // Ensure at least 1 step
  }
  
  private adjustCurrentStepIfNeeded() {
    // If current step is disabled, move to next enabled step
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    let targetStep = this.currentStep;
    
    for (let i = this.currentStep - 1; i < stepKeys.length; i++) {
      if (this.stepPreferences[stepKeys[i] as keyof typeof this.stepPreferences]) {
        targetStep = i + 1;
        break;
      }
    }
    
    this.currentStep = targetStep;
  }
  
  private initializeToFirstEnabledStep() {
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    
    for (let i = 0; i < stepKeys.length; i++) {
      if (this.stepPreferences[stepKeys[i] as keyof typeof this.stepPreferences]) {
        this.currentStep = i + 1;
        break;
      }
    }
  }

  async closeModal() {
    if (this.showCrisisAlert) {
      const alert = await this.alertController.create({
        header: 'Are you sure?',
        message: 'We noticed you selected some concerning thoughts. Please consider reaching out for support before closing.',
        buttons: [
          {
            text: 'Get Help Now',
            handler: () => {
              this.showCrisisSupport();
            }
          },
          {
            text: 'Close Anyway',
            role: 'destructive',
            handler: () => {
              this.modalController.dismiss();
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.modalController.dismiss();
    }
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep = this.getNextEnabledStep(this.currentStep);
      
      // Check for crisis alert when moving past concerning thoughts step
      if (this.currentStep === 4 && this.selectedConcerningThoughts.length > 0) {
        this.showCrisisAlert = true;
        this.showCrisisSupport();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep = this.getPreviousEnabledStep(this.currentStep);
    }
  }
  
  private getNextEnabledStep(currentStep: number): number {
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    
    for (let i = currentStep; i < stepKeys.length; i++) {
      if (this.stepPreferences[stepKeys[i] as keyof typeof this.stepPreferences]) {
        return i + 1;
      }
    }
    
    // If no next enabled step found, return current step (shouldn't happen in normal flow)
    return currentStep;
  }
  
  private getPreviousEnabledStep(currentStep: number): number {
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    
    for (let i = currentStep - 2; i >= 0; i--) {
      if (this.stepPreferences[stepKeys[i] as keyof typeof this.stepPreferences]) {
        return i + 1;
      }
    }
    
    // If no previous enabled step found, return 1
    return 1;
  }

  private validateCurrentStep(): boolean {
    // All steps are optional, so always return true
    // Users can proceed even without selecting anything
    return true;
  }
  
  // Helper methods for template
  shouldShowStep(stepNumber: number): boolean {
    if (this.isInSettings) return false; // Don't show regular steps in settings mode
    
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    const stepKey = stepKeys[stepNumber - 1] as keyof typeof this.stepPreferences;
    return this.currentStep === stepNumber && this.stepPreferences[stepKey];
  }
  
  getEnabledStepsCount(): number {
    if (this.isInSettings) return 1; // Settings is just 1 "step"
    return Object.values(this.stepPreferences).filter(enabled => enabled).length;
  }
  
  getCurrentStepNumber(): number {
    if (this.isInSettings) return 1; // Settings is always step 1 when shown
    
    // Calculate the actual step number based on enabled steps
    const stepKeys = ['step1_struggles', 'step2_positive', 'step3_concerning', 'step4_reflection'];
    let enabledStepCount = 0;
    
    for (let i = 0; i < stepKeys.length; i++) {
      if (this.stepPreferences[stepKeys[i] as keyof typeof this.stepPreferences]) {
        enabledStepCount++;
        if (i + 1 === this.currentStep) {
          return enabledStepCount;
        }
      }
    }
    
    return enabledStepCount;
  }

  // Selection methods for struggles
  toggleStruggle(struggle: EmotionalStruggle) {
    const index = this.selectedStruggles.findIndex(s => s.id === struggle.id);
    if (index > -1) {
      this.selectedStruggles.splice(index, 1);
    } else {
      this.selectedStruggles.push(struggle);
    }
  }

  isStruggleSelected(struggle: EmotionalStruggle): boolean {
    return this.selectedStruggles.some(s => s.id === struggle.id);
  }

  // Selection methods for positive moments
  togglePositiveMoment(moment: PositiveMoment) {
    const index = this.selectedPositiveMoments.findIndex(m => m.id === moment.id);
    if (index > -1) {
      this.selectedPositiveMoments.splice(index, 1);
    } else {
      this.selectedPositiveMoments.push(moment);
    }
  }

  isPositiveMomentSelected(moment: PositiveMoment): boolean {
    return this.selectedPositiveMoments.some(m => m.id === moment.id);
  }

  // Selection methods for concerning thoughts
  toggleConcerningThought(thought: ConcerningThought) {
    const index = this.selectedConcerningThoughts.findIndex(t => t.id === thought.id);
    if (index > -1) {
      this.selectedConcerningThoughts.splice(index, 1);
    } else {
      this.selectedConcerningThoughts.push(thought);
      
      // Immediately show crisis support if critical thought is selected
      if (thought.severity === 'critical') {
        this.showCrisisAlert = true;
        setTimeout(() => {
          this.showCrisisSupport();
        }, 500);
      }
    }
  }

  isConcerningThoughtSelected(thought: ConcerningThought): boolean {
    return this.selectedConcerningThoughts.some(t => t.id === thought.id);
  }

  private async showCrisisSupport() {
    return;
    const alert = await this.alertController.create({
      header: 'Immediate Support Recommended',
      message: 'Your responses indicate you may be experiencing thoughts that require immediate attention. Please know you are not alone, and help is available. Reaching out is a sign of incredible strength.',
      buttons: [
        {
          text: 'Call Crisis Hotline',
          handler: () => {
            window.open('tel:988', '_system'); // US National Suicide Prevention Lifeline
          }
        },
        {
          text: 'Call Emergency Services',
          handler: () => {
            window.open('tel:911', '_system');
          }
        },
        {
          text: 'Find Local Resources',
          handler: () => {
            window.open('https://www.postpartum.net/get-help/locations/', '_blank');
          }
        },
        {
          text: 'Continue Check-in',
          role: 'cancel'
        }
      ],
      cssClass: 'crisis-alert'
    });
    await alert.present();
  }

  private async showCrisisSupportFromAPI(crisisIntervention: any) {
    const buttons: any[] = [];

    // Add buttons for each resource provided by the API
    crisisIntervention.resources.forEach((resource: any) => {
      if (resource.type === 'hotline' && resource.phone) {
        buttons.push({
          text: `📞 ${resource.name}`,
          handler: () => {
            window.open(`tel:${resource.phone}`, '_system');
          }
        });
      } else if (resource.website) {
        buttons.push({
          text: `🌐 ${resource.name}`,
          handler: () => {
            window.open(resource.website, '_blank');
          }
        });
      }
    });

    // Add continue button
    buttons.push({
      text: 'Continue Check-in',
      role: 'cancel'
    });

    const alert = await this.alertController.create({
      header: '🤗 We\'re Here for You',
      message: crisisIntervention.message,
      buttons: buttons,
      cssClass: 'crisis-alert'
    });
    await alert.present();
  }

  // Form submission
  async saveEmotionCheckin() {
    if (this.user) {
      try {
        const formValue = this.emotionForm.value;
        
        // Try backend API first, fallback to local storage
        const backendUser = this.backendAuthService.getCurrentUser();
        const isBackendAuth = !!backendUser;
        
        if (isBackendAuth) {
          // Use backend API - convert objects to ID arrays, pass null for empty fields
          const requestData: CreateEmotionCheckinRequest = {
            selectedStruggles: this.selectedStruggles.length > 0 ? this.selectedStruggles.map(s => s.id) : [],
            selectedPositiveMoments: this.selectedPositiveMoments.length > 0 ? this.selectedPositiveMoments.map(p => p.id) : [],
            selectedConcerningThoughts: this.selectedConcerningThoughts.length > 0 ? this.selectedConcerningThoughts.map(c => c.id) : [],
            gratefulFor: formValue.gratefulFor && formValue.gratefulFor.trim() ? formValue.gratefulFor.trim() : null,
            proudOfToday: formValue.proudOfToday && formValue.proudOfToday.trim() ? formValue.proudOfToday.trim() : null,
            tomorrowGoal: formValue.tomorrowGoal && formValue.tomorrowGoal.trim() ? formValue.tomorrowGoal.trim() : null,
            additionalNotes: formValue.additionalNotes && formValue.additionalNotes.trim() ? formValue.additionalNotes.trim() : null
          };

          const result = await this.backendEmotionService.createEmotionCheckin(requestData).toPromise();
          
          // Handle crisis intervention if triggered
          if (result.crisisIntervention?.triggered) {
            this.showCrisisAlert = true;
            await this.showCrisisSupportFromAPI(result.crisisIntervention);
          }
        } else {
          // Use local storage (legacy)
          const record: Omit<EmotionCheckinRecord, 'id' | 'createdAt'> = {
            userId: this.user.uid,
            date: new Date(),
            time: new Date().toTimeString().slice(0, 5),
            selectedStruggles: this.selectedStruggles,
            selectedPositiveMoments: this.selectedPositiveMoments,
            selectedConcerningThoughts: this.selectedConcerningThoughts,
            gratefulFor: formValue.gratefulFor,
            proudOfToday: formValue.proudOfToday,
            tomorrowGoal: formValue.tomorrowGoal,
            additionalNotes: formValue.additionalNotes,
            enteredViaVoice: false
          };

          await this.growthService.addEmotionCheckinRecord(record);
        }
        
        const toast = await this.toastController.create({
          message: 'Emotion check-in saved successfully! Thank you for taking care of yourself. 💕',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        await this.modalController.dismiss({ saved: true });

      } catch (error) {
        console.error('Error saving emotion check-in:', error);
        const toast = await this.toastController.create({
          message: 'Failed to save emotion check-in. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  canSave(): boolean {
    // Allow saving even if nothing is selected - sometimes that's meaningful too
    return true;
  }

  getProgressPercentage(): number {
    const currentStepNumber = this.getCurrentStepNumber();
    const totalEnabledSteps = this.getEnabledStepsCount();
    return totalEnabledSteps > 0 ? (currentStepNumber / totalEnabledSteps) * 100 : 0;
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  }

  getSelectedCount(type: 'struggles' | 'positive' | 'concerning'): number {
    switch (type) {
      case 'struggles':
        return this.selectedStruggles.length;
      case 'positive':
        return this.selectedPositiveMoments.length;
      case 'concerning':
        return this.selectedConcerningThoughts.length;
      default:
        return 0;
    }
  }

  hasCriticalThoughts(): boolean {
    return this.selectedConcerningThoughts.some(t => t.severity === 'critical');
  }
}