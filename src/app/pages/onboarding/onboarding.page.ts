import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { OnboardingService } from '../../services/onboarding.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ApiService } from '../../services/api.service';
import { OnboardingData, OnboardingOptions, OnboardingProgress } from '../../models/onboarding.model';
import { User } from '../../models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage implements OnInit, OnDestroy {
  onboardingForm: FormGroup;
  currentUser: User | null = null;
  progress: OnboardingProgress = {
    totalSteps: 5,
    completedSteps: 0,
    currentStep: 1,
    percentComplete: 0,
    canProceed: false
  };
  
  conditionalRequirements: { [key: string]: boolean } = {};
  options = OnboardingOptions;
  
  // Multiple babies support
  babies: FormGroup[] = [];
  existingBabies: any[] = [];
  newBabiesToCreate: any[] = []; // Track babies that need to be created via API
  
  // Template helper properties
  currentDate = new Date().toISOString();
  maxDate = '2026-12-31';
  minBirthDate = '2020-01-01';
  
  // Local storage key for onboarding data
  private readonly ONBOARDING_STORAGE_KEY = 'onboarding_form_data';
  
  private subscriptions: Subscription[] = [];

  private getUserSpecificStorageKey(): string {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.uid;
    
    if (!userId) {
      console.warn('No authenticated user found when accessing onboarding component storage');
      return `${this.ONBOARDING_STORAGE_KEY}_anonymous`;
    }
    
    // Log if we're using a mock user (for debugging)
    if (userId.includes('mock')) {
      console.log('Using mock user for onboarding storage:', userId);
    }
    
    return `${this.ONBOARDING_STORAGE_KEY}_${userId}`;
  }

  constructor(
    private formBuilder: FormBuilder,
    private onboardingService: OnboardingService,
    private authService: BackendAuthService,
    private apiService: ApiService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    // Subscribe to current user to prefill form
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.prefillUserInformation(user);
          this.loadExistingBabies();
        }
      })
    );
    
    // Subscribe to onboarding progress
    this.subscriptions.push(
      this.onboardingService.progress$.subscribe(progress => {
        this.progress = progress;
        this.updateConditionalRequirements();
        // Update progress state when step changes
        setTimeout(() => this.updateProgressState(), 100);
      })
    );
    
    // Subscribe to onboarding data changes to update form
    this.subscriptions.push(
      this.onboardingService.onboardingData$.subscribe(data => {
        // Only update from service if we don't have newer localStorage data
        const savedData = this.loadFormDataFromLocalStorage();
        if (!savedData || !savedData.timestamp) {
          this.updateFormFromData(data);
        }
      })
    );

    // Subscribe to form value changes to update progress and save to localStorage
    this.subscriptions.push(
      this.onboardingForm.valueChanges.subscribe(() => {
        this.updateProgressState();
        this.saveFormDataToLocalStorage();
      })
    );

    // Force reset if we detect invalid step state
    const savedData = this.loadFormDataFromLocalStorage();
    if (savedData?.progress?.currentStep > 5) {
      console.warn('Clearing corrupted localStorage data');
      this.clearLocalStorageData();
      this.onboardingService.resetOnboarding();
    }
    
    // Load localStorage form data immediately after subscriptions are set up
    this.loadAndRestoreFormData();
    setTimeout(() => {
      this.updateProgressState();
    }, 100);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ============================================================================
  // BABIES MANAGEMENT
  // ============================================================================

  async loadExistingBabies(): Promise<void> {
    try {
      const response = await this.apiService.getUserBabies().toPromise();
      if (response?.success && response.data) {
        this.existingBabies = response.data;
        console.log('Loaded existing babies:', this.existingBabies);
      }
    } catch (error) {
      console.error('Error loading existing babies:', error);
      // Continue with empty array if API fails
      this.existingBabies = [];
    }
  }

  selectExistingBaby(baby: any): void {
    // Add the existing baby to the form array
    const babyFormGroup = this.createBabyForm();
    
    // Comprehensive mapping of all possible field variations from API
    babyFormGroup.patchValue({
      // Basic information
      name: baby.name || baby.baby_name,
      gender: baby.gender,
      dateOfBirth: this.formatDateForInput(baby.dateOfBirth || baby.date_of_birth || baby.birth_date),
      birthWeight: baby.birthWeight || baby.birth_weight || baby.weight_at_birth,
      mostRecentWeight: baby.currentWeight || baby.current_weight || baby.latest_weight || baby.mostRecentWeight,
      dateOfMostRecentWeightCheck: this.formatDateForInput(baby.weightCheckDate || baby.weight_check_date || baby.last_weight_date || baby.dateOfMostRecentWeightCheck) || new Date().toISOString().split('T')[0],
      birthHeight: baby.birthHeight || baby.birth_height || baby.height_at_birth,
      deliveryType: baby.deliveryType || baby.delivery_type || baby.type_of_delivery,
      gestationalAge: baby.gestationalAge || baby.gestational_age || baby.gestational_weeks || 40,
      
      // Breastfeeding details (updated field names)
      directBreastfeedsIn24h: baby.directFeedsPerDay || baby.direct_feeds_per_day || baby.breastfeeds_per_day || baby.directBreastfeedsIn24h || 0,
      latchQuality: baby.latchQuality || baby.latch_quality || '',
      offersBothBreastsPerFeeding: baby.offersBothBreasts !== undefined ? baby.offersBothBreasts : 
                        (baby.offers_both_breasts !== undefined ? baby.offers_both_breasts : 
                        (baby.offersBothBreastsPerFeeding !== undefined ? baby.offersBothBreastsPerFeeding : false)),
      timePerBreast: baby.timePerBreast || baby.time_per_breast || baby.timeLatched || '',
      
      // Daily Output (updated field names)
      wetDiapersIn24h: baby.peeCount24h || baby.pee_count_24h || baby.wet_diapers || baby.wetDiapersIn24h || 0,
      dirtyDiapersIn24h: baby.poopCount24h || baby.poop_count_24h || baby.soiled_diapers || baby.dirtyDiapersIn24h || 0,
      
      // Medical information (updated field names)
      medicalConditions: baby.medicalConditions || baby.medical_conditions || baby.health_conditions || [],
      medicalConditionsOther: baby.medicalConditionsOther || '',
      hasBeenHospitalized: baby.hasBeenHospitalized !== undefined ? baby.hasBeenHospitalized : 
                           (baby.has_been_hospitalized !== undefined ? baby.has_been_hospitalized : false),
      hospitalizationReason: baby.hospitalizationReason || baby.hospitalization_reason || '',
      
      // Formula feeding (if available)
      formulaTimesPerDay: this.parseFormulaValue(baby.formulaTimesPerDay || baby.formula_times_per_day, 0),
      formulaAmountPerFeed: this.parseFormulaAmountValue(baby.formulaAmountPerFeed || baby.formula_amount_per_feed, 10),
      
      // Bottle feeding (if available)
      bottleFeedDuration: baby.bottleFeedDuration || baby.bottle_feed_duration || '',
      bottleBrand: baby.bottleBrand || baby.bottle_brand || '',
      pacedBottleFeeding: baby.pacedBottleFeeding !== undefined ? baby.pacedBottleFeeding : 
                         (baby.paced_bottle_feeding !== undefined ? baby.paced_bottle_feeding : null),
      
      existingBabyId: baby.id || baby._id // Track that this is an existing baby
    });

    this.babiesFormArray.push(babyFormGroup);
    
    // Force form update and change detection
    this.onboardingForm.updateValueAndValidity();
    
    console.log('Added existing baby to form with complete data mapping:', baby);
    console.log('Form values after adding baby:', babyFormGroup.value);
    console.log('Babies form array length:', this.babiesFormArray.length);
    
    // Update progress to trigger validation
    this.updateProgressState();
  }

  calculateBabyAge(dateOfBirth: string): string {
    if (!dateOfBirth) return '';
    
    const birthDate = new Date(dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  }


  formatDateForInput(dateString: string): string {
    if (!dateString) return new Date().toISOString();
    
    // Handle different date formats from API
    let date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date received:', dateString);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  }

  private parseFormulaValue(value: any, defaultValue: number): number {
    if (value === null || value === undefined) return defaultValue;
    
    // Handle string values like '8+' from radio buttons
    if (typeof value === 'string') {
      if (value === '8+' || value.includes('+')) return 8;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : Math.max(0, Math.min(8, parsed));
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      return Math.max(0, Math.min(8, value));
    }
    
    return defaultValue;
  }

  private parseFormulaAmountValue(value: any, defaultValue: number): number {
    if (value === null || value === undefined) return defaultValue;
    
    // Handle string values like '120ml+', '50ml' from radio buttons
    if (typeof value === 'string') {
      if (value.includes('+')) return 120;
      const numericValue = value.replace(/[^\d]/g, ''); // Remove 'ml' and other non-digits
      const parsed = parseInt(numericValue, 10);
      return isNaN(parsed) ? defaultValue : Math.max(10, Math.min(120, parsed));
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      return Math.max(10, Math.min(120, value));
    }
    
    return defaultValue;
  }

  async createNewBabiesViaAPI(): Promise<void> {
    console.log('Creating new babies via API...');
    const babyPromises: Promise<any>[] = [];
    
    // Iterate through all babies in the form array
    for (let i = 0; i < this.babiesFormArray.length; i++) {
      const babyData = this.babiesFormArray.at(i).value;
      
      // Only create babies that don't have existingBabyId (i.e., new babies)
      if (!babyData.existingBabyId) {
        console.log('Creating new baby:', babyData);
        
        const createBabyPromise = this.apiService.createBaby({
          name: babyData.name,
          dateOfBirth: babyData.dateOfBirth,
          gender: babyData.gender,
          birthWeight: babyData.birthWeight,
          birthHeight: babyData.birthHeight
        }).toPromise().then(response => {
          if (response?.success) {
            console.log('Successfully created baby:', response.data);
            return response.data;
          } else {
            throw new Error(`Failed to create baby: ${response?.message || 'Unknown error'}`);
          }
        });
        
        babyPromises.push(createBabyPromise);
      }
    }
    
    // Wait for all baby creation requests to complete
    if (babyPromises.length > 0) {
      try {
        const createdBabies = await Promise.all(babyPromises);
        console.log('All new babies created successfully:', createdBabies);
      } catch (error) {
        console.error('Error creating babies:', error);
        throw error; // Rethrow to be handled by the calling method
      }
    } else {
      console.log('No new babies to create');
    }
  }

  // ============================================================================
  // LOCAL STORAGE MANAGEMENT
  // ============================================================================

  private saveFormDataToLocalStorage(): void {
    try {
      const formData = {
        formValues: this.onboardingForm.value,
        progress: this.progress,
        timestamp: new Date().toISOString()
      };
      console.log('Saving form data to localStorage:', formData.formValues);
      if (formData.formValues.babies) {
        console.log('Saving babies data:', formData.formValues.babies);
      }
      const storageKey = this.getUserSpecificStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form data to local storage:', error);
    }
  }

  private loadFormDataFromLocalStorage(): any {
    try {
      const storageKey = this.getUserSpecificStorageKey();
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Check if data is not too old (e.g., older than 7 days)
        const savedTimestamp = new Date(parsedData.timestamp);
        const daysDiff = (new Date().getTime() - savedTimestamp.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff <= 7) {
          return parsedData;
        } else {
          // Remove old data
          this.clearLocalStorageData();
        }
      }
    } catch (error) {
      console.warn('Failed to load form data from local storage:', error);
      this.clearLocalStorageData();
    }
    return null;
  }

  private clearLocalStorageData(): void {
    try {
      const storageKey = this.getUserSpecificStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear local storage:', error);
    }
  }

  // Public method to clear saved form data (useful for testing or starting over)
  public clearSavedFormData(): void {
    this.clearLocalStorageData();
    // Reset form to initial values
    this.onboardingForm.reset();
    // Reset progress
    this.progress = {
      totalSteps: 5,
      completedSteps: 0,
      currentStep: 1,
      percentComplete: 0,
      canProceed: false
    };
    // Prefill user information again if available
    if (this.currentUser) {
      this.prefillUserInformation(this.currentUser);
    }
  }

  // ============================================================================
  // FORM INITIALIZATION & MANAGEMENT
  // ============================================================================

  private initializeForm(): void {
    this.onboardingForm = this.formBuilder.group({
      // Step 1: Mother's Personal Profile
      motherAge: [null, [Validators.required, Validators.min(15), Validators.max(50)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      employmentStatus: ['', [Validators.required]],
      languagesSpoken: [[], [Validators.required]],
      motherMedicalConditions: [[]],
      motherMedicalConditionsOther: [''],
      allergies: [''],
      hasNippleIssues: [false],
      nippleIssuesDescription: [''],
      isFirstChild: [null, [Validators.required]],
      breastfeedingDuration: ['', [Validators.required]],
      
      // Step 2: Pregnancy & Baby Information
      motherType: ['', [Validators.required]],
      expectedDueDate: [new Date().toISOString()],
      numberOfBabies: [1],
      babies: this.formBuilder.array([]),
      
      // Step 3: Formula & Feeding Methods
      usesFormula: [null],
      // Formula details are now per baby in the babies FormArray
      usesBottles: [null],
      bottleBrand: [''],
      bottleBrandOther: [''], // For "Other" bottle brand
      bottleFeedDuration: [''],
      usesPacedBottleFeeding: [null],
      bottleContents: [''],
      usesPump: [null],
      pumpBrand: [''],
      pumpBrandOther: [''], // For "Other" pump brand
      pumpType: [''],
      pumpsBothBreasts: [null],
      pumpSessionsPerDay: [3], // Default 3 sessions per day
      pumpMinutesPerSession: [15], // Default 15 minutes per session
      pumpAverageOutput: [50], // Default 50ml per session
      pumpTotalDailyOutput: [200], // Default 200ml total daily
      
      // Step 4: Support System & Demographics
      currentSupportSystem: ['', [Validators.required]],
      familyStructure: ['', [Validators.required]],
      educationLevel: ['', [Validators.required]],
      householdIncome: [''],
      
      // Step 5: Current Challenges & Expectations
      currentChallenges: [[], [Validators.required]],
      expectationsFromProgram: ['', [Validators.required]]
    });

    // Initialize with one baby by default
    this.addBaby();
    
    // Load saved data from local storage
    this.loadAndRestoreFormData();

    // Subscribe to form changes to auto-save to local storage
    this.subscriptions.push(
      this.onboardingForm.valueChanges.subscribe(() => {
        this.saveFormDataToLocalStorage();
      })
    );
  }

  private loadAndRestoreFormData(): void {
    const savedData = this.loadFormDataFromLocalStorage();
    if (savedData && savedData.formValues) {
      console.log('Loading form data from localStorage:', savedData.formValues);
      console.log('Current progress from localStorage:', savedData.progress);
      
      // First restore babies FormArray if it exists
      if (savedData.formValues.babies && Array.isArray(savedData.formValues.babies)) {
        console.log('Restoring babies data:', savedData.formValues.babies);
        
        // Clear existing babies
        while (this.babiesFormArray.length !== 0) {
          this.babiesFormArray.removeAt(0);
        }
        
        // Add saved babies
        savedData.formValues.babies.forEach((babyData: any, index: number) => {
          console.log(`Restoring baby ${index + 1}:`, babyData);
          const babyForm = this.createBabyForm();
          babyForm.patchValue(babyData, { emitEvent: false });
          this.babiesFormArray.push(babyForm);
        });
      }
      
      // Restore other form values (excluding babies since we handled it above)
      const { babies, ...otherFormValues } = savedData.formValues;
      this.onboardingForm.patchValue(otherFormValues, { emitEvent: false });
      
      // Restore progress if available, but validate currentStep
      if (savedData.progress) {
        this.progress = savedData.progress;
        // Ensure currentStep is within valid range (1-5)
        if (this.progress.currentStep > 5) {
          console.warn('Detected invalid currentStep:', this.progress.currentStep, 'Clearing localStorage and resetting to step 1');
          this.clearLocalStorageData();
          this.progress.currentStep = 1;
          this.progress.completedSteps = 0;
          this.onboardingService.resetOnboarding();
          return; // Exit early to prevent further processing of corrupted data
        }
        if (this.progress.currentStep < 1) {
          this.progress.currentStep = 1;
          console.log('Reset invalid currentStep to 1');
        }
      }
      
      // Update the onboarding service with restored data to synchronize validation state
      // Only process steps that have actual data to avoid marking empty steps as completed
      console.log('Saved form values:', savedData.formValues);
      
      // Only validate/update steps that have meaningful data
      if (savedData.formValues.motherAge || savedData.formValues.city) {
        const stepData = this.extractStepData(1, savedData.formValues);
        this.onboardingService.updateStepData(1, stepData);
      }
      
      if (savedData.formValues.motherType || savedData.formValues.babies?.length) {
        const stepData = this.extractStepData(2, savedData.formValues);
        this.onboardingService.updateStepData(2, stepData);
      }
      
      if (savedData.formValues.usesFormula !== null || savedData.formValues.usesBottles !== null || savedData.formValues.usesPump !== null) {
        const stepData = this.extractStepData(3, savedData.formValues);
        this.onboardingService.updateStepData(3, stepData);
      }
      
      if (savedData.formValues.currentSupportSystem || savedData.formValues.familyStructure) {
        const stepData = this.extractStepData(4, savedData.formValues);
        this.onboardingService.updateStepData(4, stepData);
      }
      
      if (savedData.formValues.currentChallenges?.length || savedData.formValues.expectationsFromProgram) {
        const stepData = this.extractStepData(5, savedData.formValues);
        this.onboardingService.updateStepData(5, stepData);
      }
      
      // Synchronize the current step with the service (ensure it's valid)
      const validCurrentStep = Math.min(Math.max(1, this.progress.currentStep), 5);
      this.onboardingService.goToStep(validCurrentStep);
      
      console.log('Restored onboarding form data from local storage and synchronized service state');
    }
  }

  private prefillUserInformation(user: User): void {
    if (!this.onboardingForm || !user) return;
    
    console.log('Prefilling user information with user data:', user);
    
    // Use setTimeout to ensure form is fully initialized
    setTimeout(() => {
      const currentFormValue = this.onboardingForm.value;
      const updates: any = {};
      
      // Prefill email if not already set
      if (!currentFormValue.email && user.email) {
        updates.email = user.email;
      }
      
      // Prefill phone number if not already set  
      if (!currentFormValue.phoneNumber && user.phoneNumber) {
        updates.phoneNumber = user.phoneNumber;
      }
      
      // Prefill full name if not already set
      if (!currentFormValue.fullName) {
        if (user.firstName && user.lastName) {
          updates.fullName = `${user.firstName} ${user.lastName}`.trim();
        } else if (user.firstName) {
          updates.fullName = user.firstName;
        }
      }
      
      // Auto-select mother type if available from registration and not already set
      console.log('Current motherType in form:', currentFormValue.motherType);
      console.log('User motherType (camelCase):', user.motherType);
      console.log('User mother_type (snake_case):', (user as any).mother_type);
      
      if (!currentFormValue.motherType) {
        // Handle both camelCase and snake_case field names from API
        const userMotherType = user.motherType || (user as any).mother_type;
        console.log('Detected userMotherType:', userMotherType);
        
        if (userMotherType) {
          updates.motherType = userMotherType;
          console.log('Auto-selecting mother type from profile:', userMotherType);
        } else if (user.babies && user.babies.length > 0) {
          // If user has babies but no explicit mother type, assume new mother
          updates.motherType = 'new_mom';
          console.log('Auto-selecting mother type as "new_mom" based on existing babies');
        }
      } else {
        console.log('Mother type already set in form, skipping auto-selection');
      }
      
      // Auto-fill due date for pregnant mothers if available and not already set
      const userDueDate = user.dueDate || (user as any).due_date;
      if (!currentFormValue.dueDate && userDueDate && (currentFormValue.motherType === 'pregnant' || updates.motherType === 'pregnant')) {
        updates.dueDate = new Date(userDueDate).toISOString();
        console.log('Auto-filling due date from profile:', userDueDate);
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log('Prefilling user information:', updates);
        this.onboardingForm.patchValue(updates);
      }
    }, 100);
  }

  private updateFormFromData(data: Partial<OnboardingData>): void {
    if (!data) {
      // If no onboarding data, try to prefill from current user
      if (this.currentUser) {
        this.prefillUserInformation(this.currentUser);
      }
      return;
    }
    
    // Update form with current data
    const formUpdate: any = {};
    
    // Personal Info (new structure)
    if (data.personalInfo) {
      formUpdate.motherAge = data.personalInfo.motherAge;
      formUpdate.city = data.personalInfo.city;
      formUpdate.state = data.personalInfo.state;
      formUpdate.employmentStatus = data.personalInfo.employmentStatus;
      formUpdate.languagesSpoken = data.personalInfo.languagesSpoken;
      formUpdate.motherMedicalConditions = data.personalInfo.motherMedicalConditions;
      formUpdate.motherMedicalConditionsOther = data.personalInfo.motherMedicalConditionsOther;
      formUpdate.allergies = data.personalInfo.allergies;
      formUpdate.hasNippleIssues = data.personalInfo.hasNippleIssues;
      formUpdate.nippleIssuesDescription = data.personalInfo.nippleIssuesDescription;
      formUpdate.breastfeedingDuration = data.personalInfo.breastfeedingDuration;
    }
    
    // Pregnancy Info
    if (data.pregnancyInfo) {
      formUpdate.motherType = data.pregnancyInfo.motherType;
      formUpdate.expectedDueDate = data.pregnancyInfo.expectedDueDate;
      formUpdate.isFirstChild = data.pregnancyInfo.isFirstChild;
      
      // Handle babies array (multiple babies support)
      if (data.pregnancyInfo.babies && Array.isArray(data.pregnancyInfo.babies) && data.pregnancyInfo.babies.length > 0) {
        // Clear existing babies from form
        const babiesFormArray = this.babiesFormArray;
        while (babiesFormArray.length !== 0) {
          babiesFormArray.removeAt(0);
        }
        
        // Add each baby from API data
        data.pregnancyInfo.babies.forEach((baby: any) => {
          const babyForm = this.createBabyForm();
          babyForm.patchValue({
            name: baby.name || '',
            dateOfBirth: baby.dateOfBirth ? new Date(baby.dateOfBirth).toISOString().split('T')[0] : '',
            gender: baby.gender || 'male',
            birthWeight: baby.birthWeight || '',
            mostRecentWeight: baby.mostRecentWeight || baby.currentWeight || '',
            dateOfMostRecentWeightCheck: baby.dateOfMostRecentWeightCheck ? new Date(baby.dateOfMostRecentWeightCheck).toISOString().split('T')[0] : (baby.weightCheckDate ? new Date(baby.weightCheckDate).toISOString().split('T')[0] : ''),
            birthHeight: baby.birthHeight || '',
            deliveryType: baby.deliveryType || '',
            gestationalAge: baby.gestationalAge || '',
            
            // Breastfeeding Details
            directBreastfeedsIn24h: baby.directBreastfeedsIn24h || 0,
            latchQuality: baby.latchQuality || '',
            offersBothBreastsPerFeeding: baby.offersBothBreastsPerFeeding,
            timePerBreast: baby.timePerBreast || baby.timeLatched || '',
            
            // Daily Output
            wetDiapersIn24h: baby.wetDiapersIn24h || 0,
            dirtyDiapersIn24h: baby.dirtyDiapersIn24h || 0,
            
            // Health Information
            medicalConditions: baby.medicalConditions || [],
            medicalConditionsOther: baby.medicalConditionsOther || '',
            hasBeenHospitalized: baby.hasBeenHospitalized,
            hospitalizationReason: baby.hospitalizationReason || '',
            
            // Formula Feeding Details (per baby)
            formulaBrand: baby.formulaBrand || '',
            formulaBrandOther: baby.formulaBrandOther || '',
            formulaTimesPerDay: baby.formulaTimesPerDay || 0,
            formulaAmountPerFeed: baby.formulaAmountPerFeed || 10,
            formulaReason: baby.formulaReason || '',
            formulaReasonOther: baby.formulaReasonOther || ''
          }, { emitEvent: false });
          
          // Store additional baby data that might not be in the form
          if (baby.existingBabyId) {
            babyForm.addControl('existingBabyId', this.formBuilder.control(baby.existingBabyId));
          }
          babiesFormArray.push(babyForm);
        });
      }
      // Fallback: handle single baby from babyInfo (backward compatibility)
      else if (data.pregnancyInfo.babyInfo) {
        const baby = data.pregnancyInfo.babyInfo;
        // Clear existing babies and add single baby
        const babiesFormArray = this.babiesFormArray;
        while (babiesFormArray.length !== 0) {
          babiesFormArray.removeAt(0);
        }
        
        const babyForm = this.createBabyForm();
        const extendedBaby = baby as any; // Type assertion to access new fields
        babyForm.patchValue({
          name: baby.name || '',
          dateOfBirth: baby.dateOfBirth ? new Date(baby.dateOfBirth).toISOString().split('T')[0] : '',
          gender: baby.gender || 'male',
          birthWeight: baby.birthWeight || '',
          mostRecentWeight: baby.currentWeight || extendedBaby.mostRecentWeight || '',
          dateOfMostRecentWeightCheck: baby.weightCheckDate ? new Date(baby.weightCheckDate).toISOString().split('T')[0] : 
            (extendedBaby.dateOfMostRecentWeightCheck ? new Date(extendedBaby.dateOfMostRecentWeightCheck).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0]),
          birthHeight: baby.birthHeight || '',
          deliveryType: baby.deliveryType || '',
          gestationalAge: baby.gestationalAge || '',
          
          // Breastfeeding Details
          directBreastfeedsIn24h: extendedBaby.directBreastfeedsIn24h || 0,
          latchQuality: extendedBaby.latchQuality || '',
          offersBothBreastsPerFeeding: extendedBaby.offersBothBreastsPerFeeding || false,
          timePerBreast: extendedBaby.timePerBreast || extendedBaby.timeLatched || '',
          
          // Daily Output
          wetDiapersIn24h: extendedBaby.wetDiapersIn24h || 0,
          dirtyDiapersIn24h: extendedBaby.dirtyDiapersIn24h || 0,
          
          // Health Information
          medicalConditions: extendedBaby.medicalConditions || [],
          medicalConditionsOther: extendedBaby.medicalConditionsOther || '',
          hasBeenHospitalized: extendedBaby.hasBeenHospitalized || false,
          hospitalizationReason: extendedBaby.hospitalizationReason || '',
          
          // Formula Feeding Details (per baby)
          formulaBrand: extendedBaby.formulaBrand || '',
          formulaBrandOther: extendedBaby.formulaBrandOther || '',
          formulaTimesPerDay: extendedBaby.formulaTimesPerDay || 0,
          formulaAmountPerFeed: extendedBaby.formulaAmountPerFeed || 10,
          formulaReason: extendedBaby.formulaReason || '',
          formulaReasonOther: extendedBaby.formulaReasonOther || ''
        }, { emitEvent: false });
        
        // Store additional baby data that might not be in the form
        if ((baby as any).existingBabyId) {
          babyForm.addControl('existingBabyId', this.formBuilder.control((baby as any).existingBabyId));
        }
        babiesFormArray.push(babyForm);
      }
    }
    
    // Formula Feeding Info (new structure)
    if (data.formulaFeedingInfo) {
      formUpdate.usesFormula = data.formulaFeedingInfo.usesFormula;
      formUpdate.usesBottles = data.formulaFeedingInfo.usesBottles;
      formUpdate.usesPump = data.formulaFeedingInfo.usesPump;
      
      // Formula details are now stored per baby, not in formulaDetails
      
      if (data.formulaFeedingInfo.bottleDetails) {
        formUpdate.bottleBrand = data.formulaFeedingInfo.bottleDetails.bottleBrand;
        formUpdate.bottleBrandOther = data.formulaFeedingInfo.bottleDetails.bottleBrandOther;
        formUpdate.bottleFeedDuration = data.formulaFeedingInfo.bottleDetails.feedDuration;
        formUpdate.usesPacedBottleFeeding = data.formulaFeedingInfo.bottleDetails.usesPacedBottleFeeding;
        formUpdate.bottleContents = data.formulaFeedingInfo.bottleDetails.bottleContents;
      }
      
      if (data.formulaFeedingInfo.pumpingDetails) {
        formUpdate.pumpBrand = data.formulaFeedingInfo.pumpingDetails.pumpBrand;
        formUpdate.pumpBrandOther = data.formulaFeedingInfo.pumpingDetails.pumpBrandOther;
        formUpdate.pumpType = data.formulaFeedingInfo.pumpingDetails.pumpType;
        formUpdate.pumpsBothBreasts = data.formulaFeedingInfo.pumpingDetails.pumpsBothBreasts;
        formUpdate.pumpSessionsPerDay = data.formulaFeedingInfo.pumpingDetails.sessionsPerDay;
        formUpdate.pumpMinutesPerSession = data.formulaFeedingInfo.pumpingDetails.minutesPerSession;
        formUpdate.pumpAverageOutput = data.formulaFeedingInfo.pumpingDetails.averageOutputMl;
        formUpdate.pumpTotalDailyOutput = data.formulaFeedingInfo.pumpingDetails.totalDailyOutput;
      }
    }
    
    
    // Support Info
    if (data.supportInfo) {
      formUpdate.educationLevel = data.supportInfo.educationLevel;
      formUpdate.familyStructure = data.supportInfo.familyStructure;
      formUpdate.householdIncome = data.supportInfo.householdIncome;
      formUpdate.currentSupportSystem = data.supportInfo.currentSupportSystem;
    }
    
    // Challenges and Expectations Info (new structure)
    if (data.challengesAndExpectationsInfo) {
      formUpdate.currentChallenges = data.challengesAndExpectationsInfo.currentChallenges;
      formUpdate.expectationsFromProgram = data.challengesAndExpectationsInfo.expectationsFromProgram;
    }
    
    this.onboardingForm.patchValue(formUpdate, { emitEvent: false });
  }

  private updateConditionalRequirements(): void {
    this.conditionalRequirements = this.onboardingService.getConditionalRequirements(this.progress.currentStep);
  }

  private updateProgressState(): void {
    // Validate current step and update canProceed
    const canProceed = this.validateCurrentStep();
    this.progress = {
      ...this.progress,
      canProceed
    };
  }

  private validateCurrentStep(): boolean {
    const step = this.progress.currentStep;
    const formValue = this.onboardingForm.value;

    switch (step) {
      case 1: // Mother's Personal Profile
        return !!(formValue.motherAge && formValue.city && formValue.state && 
                 formValue.employmentStatus && formValue.languagesSpoken?.length && 
                 formValue.breastfeedingDuration);
      
      case 2: // Pregnancy & Baby Information
        if (formValue.motherType === 'pregnant') {
          return !!(formValue.motherType && formValue.expectedDueDate && formValue.isFirstChild !== null);
        } else if (formValue.motherType === 'new_mom') {
          return !!(formValue.motherType && formValue.isFirstChild !== null && 
                   this.babiesFormArray.length > 0 && this.validateAllBabies());
        }
        return false;
      
      case 3: // Formula & Feeding Methods (skip for pregnant mothers)
        if (formValue.motherType === 'pregnant') {
          return true; // Skip validation for pregnant mothers
        }
        return !!(formValue.usesFormula !== null && formValue.usesBottles !== null && formValue.usesPump !== null);
      
      case 4: // Support System & Demographics
        return !!(formValue.currentSupportSystem && formValue.familyStructure && formValue.educationLevel);
      
      case 5: // Current Challenges & Expectations
        return !!(formValue.currentChallenges?.length && formValue.expectationsFromProgram?.trim());
      
      default:
        return false;
    }
  }

  private validateAllBabies(): boolean {
    for (let i = 0; i < this.babiesFormArray.length; i++) {
      const baby = this.babiesFormArray.at(i).value;
      if (!baby.name || !baby.dateOfBirth || !baby.gender || !baby.birthWeight || 
          !baby.mostRecentWeight || !baby.birthHeight || !baby.deliveryType || 
          !baby.gestationalAge || baby.directBreastfeedsIn24h === null || 
          !baby.latchQuality || baby.offersBothBreastsPerFeeding === null || 
          !baby.timePerBreast || baby.wetDiapersIn24h === null || 
          baby.dirtyDiapersIn24h === null || baby.hasBeenHospitalized === null) {
        return false;
      }
    }
    return true;
  }

  private updateBabiesFormulaData(formValue: any): void {
    // Update baby formula data when step 3 form changes
    // In step 3, each baby has individual formula fields within their baby form group
    // We need to ensure the babies array is properly maintained with their formula data
    console.log('Updating babies formula data from form value:', formValue);
    
    if (formValue.babies && formValue.babies.length > 0) {
      const babiesArray = this.babiesFormArray;
      
      // Ensure form array matches the data structure
      for (let i = 0; i < babiesArray.length && i < formValue.babies.length; i++) {
        const babyControl = babiesArray.at(i);
        const babyData = formValue.babies[i];
        
        if (babyData && babyControl) {
          // Update the baby form control with the current baby data to maintain sync
          const currentValue = babyControl.value;
          const updatedValue = {
            ...currentValue,
            // Keep all baby formula data as-is since it comes from step 3 baby forms
            formulaBrand: babyData.formulaBrand || currentValue.formulaBrand || '',
            formulaBrandOther: babyData.formulaBrandOther || currentValue.formulaBrandOther || '',
            formulaTimesPerDay: babyData.formulaTimesPerDay !== undefined ? babyData.formulaTimesPerDay : currentValue.formulaTimesPerDay,
            formulaAmountPerFeed: babyData.formulaAmountPerFeed !== undefined ? babyData.formulaAmountPerFeed : currentValue.formulaAmountPerFeed,
            formulaReason: babyData.formulaReason || currentValue.formulaReason || '',
            formulaReasonOther: babyData.formulaReasonOther || currentValue.formulaReasonOther || ''
          };
          
          // Only update if there are changes to prevent unnecessary form events
          if (JSON.stringify(currentValue) !== JSON.stringify(updatedValue)) {
            console.log(`Updating baby ${i + 1} formula data:`, updatedValue);
            babyControl.patchValue(updatedValue, { emitEvent: false });
          }
        }
      }
    }
  }

  private getFormulaDetailsFromBabies(babies: any[]): any {
    // Get formula details from babies that have formula information
    // This consolidates individual baby formula data into step 3 format for the service
    if (babies && babies.length > 0) {
      console.log('Extracting formula details from babies:', babies);
      
      // Find the first baby that has meaningful formula data
      const babyWithFormula = babies.find(baby => 
        baby && (
          baby.formulaBrand || 
          (baby.formulaTimesPerDay !== undefined && baby.formulaTimesPerDay > 0) ||
          (baby.formulaAmountPerFeed !== undefined && baby.formulaAmountPerFeed > 0) ||
          baby.formulaReason
        )
      );
      
      if (babyWithFormula) {
        const formulaDetails = {
          formulaBrand: babyWithFormula.formulaBrand || '',
          formulaBrandOther: babyWithFormula.formulaBrandOther || '',
          timesOfferedPerDay: babyWithFormula.formulaTimesPerDay || 0,
          amountPerFeed: babyWithFormula.formulaAmountPerFeed || 0,
          reasonForFormula: babyWithFormula.formulaReason || '',
          reasonForFormulaOther: babyWithFormula.formulaReasonOther || ''
        };
        
        console.log('Extracted formula details:', formulaDetails);
        return formulaDetails;
      }
    }
    
    console.log('No formula details found in babies');
    return null;
  }
  
  private hasFormulaInBabies(babies: any[]): boolean {
    if (!babies || babies.length === 0) return false;
    return babies.some(baby => 
      baby.formulaBrand || 
      (baby.formulaTimesPerDay && baby.formulaTimesPerDay > 0) ||
      (baby.formulaAmountPerFeed && baby.formulaAmountPerFeed > 0)
    );
  }
  
  private hasBottlesInBabies(babies: any[]): boolean {
    if (!babies || babies.length === 0) return false;
    return babies.some(baby => 
      baby.bottleBrand || 
      baby.bottleFeedDuration ||
      baby.bottleContents ||
      baby.usesPacedBottleFeeding !== null
    );
  }
  
  private hasPumpInBabies(babies: any[]): boolean {
    if (!babies || babies.length === 0) return false;
    return babies.some(baby => 
      baby.pumpBrand || 
      baby.pumpType ||
      (baby.pumpSessionsPerDay && baby.pumpSessionsPerDay > 0) ||
      (baby.pumpMinutesPerSession && baby.pumpMinutesPerSession > 0) ||
      (baby.pumpAverageOutput && baby.pumpAverageOutput > 0) ||
      (baby.pumpTotalDailyOutput && baby.pumpTotalDailyOutput > 0)
    );
  }

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================

  nextStep(): void {
    this.saveCurrentStepData();
    const success = this.onboardingService.nextStep();
    if (!success) {
      this.showValidationErrors();
    } else {
      // If we successfully moved to the final step, save all form data
      // The service will have updated the current step after nextStep() succeeds
      setTimeout(() => {
        if (this.progress.currentStep === this.progress.totalSteps) {
          this.saveAllFormDataToService();
        }
        this.updateProgressState(); // Update progress state after navigation
      }, 100);
    }
  }

  previousStep(): void {
    this.onboardingService.previousStep();
    setTimeout(() => this.updateProgressState(), 100); // Update progress state after navigation
  }

  goToStep(step: number): void {
    this.saveCurrentStepData();
    this.onboardingService.goToStep(step);
    
    // When reaching the final step, save all form data to ensure complete validation
    if (step === this.progress.totalSteps) {
      setTimeout(() => {
        this.saveAllFormDataToService();
        this.updateProgressState(); // Update progress state
      }, 100);
    } else {
      setTimeout(() => this.updateProgressState(), 100); // Update progress state for other steps
    }
  }

  private saveCurrentStepData(): void {
    const formValue = this.onboardingForm.value;
    const stepData = this.extractStepData(this.progress.currentStep, formValue);
    
    // Only save step data if it contains meaningful information
    if (this.hasStepData(this.progress.currentStep, formValue)) {
      this.onboardingService.updateStepData(this.progress.currentStep, stepData);
    }
  }
  
  private hasStepData(step: number, formValue: any): boolean {
    switch (step) {
      case 1: // Personal Info
        return !!(formValue.motherAge || formValue.city || formValue.state || 
                 formValue.employmentStatus || formValue.languagesSpoken?.length);
      case 2: // Pregnancy Info
        return !!(formValue.motherType || formValue.isFirstChild !== null || formValue.babies?.length);
      case 3: // Feeding Methods
        // Check if user answered feeding questions OR if we can auto-detect from baby data
        const hasFormDirectAnswers = !!(formValue.usesFormula !== null || formValue.usesBottles !== null || formValue.usesPump !== null);
        const hasFormBabyData = !!(this.hasFormulaInBabies(formValue.babies) || this.hasBottlesInBabies(formValue.babies) || this.hasPumpInBabies(formValue.babies));
        return hasFormDirectAnswers || hasFormBabyData;
      case 4: // Support & Demographics
        return !!(formValue.currentSupportSystem || formValue.familyStructure || formValue.educationLevel);
      case 5: // Challenges & Expectations
        return !!(formValue.currentChallenges?.length || formValue.expectationsFromProgram?.trim());
      default:
        return false;
    }
  }

  private saveAllFormDataToService(): void {
    const formValue = this.onboardingForm.value;
    // Save all steps that have meaningful data to ensure service has complete data
    for (let step = 1; step <= this.progress.totalSteps; step++) {
      if (this.hasStepData(step, formValue)) {
        const stepData = this.extractStepData(step, formValue);
        this.onboardingService.updateStepData(step, stepData);
      }
    }
    console.log('Saved meaningful form data to onboarding service');
  }

  private extractStepData(step: number, formValue: any): any {
    switch (step) {
      case 1:
        return {
          motherAge: formValue.motherAge,
          city: formValue.city,
          state: formValue.state,
          employmentStatus: formValue.employmentStatus,
          languagesSpoken: formValue.languagesSpoken,
          motherMedicalConditions: formValue.motherMedicalConditions,
          motherMedicalConditionsOther: formValue.motherMedicalConditionsOther,
          allergies: formValue.allergies,
          hasNippleIssues: formValue.hasNippleIssues,
          nippleIssuesDescription: formValue.nippleIssuesDescription,
          breastfeedingDuration: formValue.breastfeedingDuration
        };
      case 2:
        return {
          motherType: formValue.motherType,
          expectedDueDate: formValue.expectedDueDate,
          isFirstChild: formValue.isFirstChild,
          ...(formValue.motherType === 'new_mom' && {
            babies: formValue.babies || []
          })
        };
      case 3:
        // For pregnant mothers, return empty feeding data
        if (formValue.motherType === 'pregnant') {
          return {
            usesFormula: false,
            usesBottles: false,
            usesPump: false
          };
        }
        
        // Auto-detect feeding methods from baby data if not explicitly set
        const autoDetectedFormula = this.hasFormulaInBabies(formValue.babies);
        const autoDetectedBottles = this.hasBottlesInBabies(formValue.babies);
        const autoDetectedPump = this.hasPumpInBabies(formValue.babies);
        
        let stepData: any = {
          usesFormula: formValue.usesFormula !== null ? formValue.usesFormula : autoDetectedFormula,
          usesBottles: formValue.usesBottles !== null ? formValue.usesBottles : autoDetectedBottles,
          usesPump: formValue.usesPump !== null ? formValue.usesPump : autoDetectedPump
        };
        
        // Handle formula details - update all babies with current formula info from step 3
        if (stepData.usesFormula) {
          this.updateBabiesFormulaData(formValue);
          stepData.formulaDetails = this.getFormulaDetailsFromBabies(formValue.babies);
        }

        stepData = {
          ...stepData,
          ...(formValue.usesBottles && {
            bottleDetails: {
              bottleBrand: formValue.bottleBrand,
              bottleBrandOther: formValue.bottleBrandOther,
              feedDuration: formValue.bottleFeedDuration,
              usesPacedBottleFeeding: formValue.usesPacedBottleFeeding,
              bottleContents: formValue.bottleContents
            }
          }),
          usesPump: formValue.usesPump,
          ...(formValue.usesPump && {
            pumpingDetails: {
              pumpBrand: formValue.pumpBrand,
              pumpBrandOther: formValue.pumpBrandOther,
              pumpType: formValue.pumpType,
              pumpsBothBreasts: formValue.pumpsBothBreasts,
              sessionsPerDay: formValue.pumpSessionsPerDay,
              minutesPerSession: formValue.pumpMinutesPerSession,
              averageOutputMl: formValue.pumpAverageOutput,
              totalDailyOutput: formValue.pumpTotalDailyOutput
            }
          })
        };

        return stepData;
      case 4:
        return {
          currentSupportSystem: formValue.currentSupportSystem,
          familyStructure: formValue.familyStructure,
          educationLevel: formValue.educationLevel,
          householdIncome: formValue.householdIncome
        };
      case 5:
        return {
          currentChallenges: formValue.currentChallenges,
          expectationsFromProgram: formValue.expectationsFromProgram
        };
      default:
        return {};
    }
  }

  // ============================================================================
  // COMPLETION FLOW
  // ============================================================================

  async completeOnboarding(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Setting up your comprehensive profile...',
      translucent: true
    });
    await loading.present();

    try {
      // Save all form data to ensure service has complete data
      this.saveAllFormDataToService();
      
      // Save final step data
      this.saveCurrentStepData();
      
      // Create new babies via API before completing onboarding
      await this.createNewBabiesViaAPI();
      
      // Complete onboarding through service
      await this.onboardingService.completeOnboarding();

      // Refresh user profile to ensure latest onboarding status is reflected
      try {
        await this.authService.refreshUserProfile();
      } catch (refreshError) {
        console.warn('Failed to refresh user profile after onboarding completion:', refreshError);
        // Continue with navigation even if refresh fails
      }

      // Clear local storage data since onboarding is complete
      this.clearLocalStorageData();

      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: 'Welcome to NariCare! Your comprehensive assessment is complete. You can now schedule consultations with our experts.',
        duration: 4000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Navigate to dashboard
      this.router.navigate(['/tabs/dashboard']);

    } catch (error: any) {
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Onboarding Error',
        message: error.message || 'Failed to complete onboarding. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private async showValidationErrors(): Promise<void> {
    // Get current form data instead of relying on service data which might be outdated
    const formValue = this.onboardingForm.value;
    const currentData = {
      ...this.onboardingService.getCurrentData(),
      personalInfo: {
        ...this.onboardingService.getCurrentData().personalInfo,
        ...this.extractStepData(1, formValue)
      },
      pregnancyInfo: {
        ...this.onboardingService.getCurrentData().pregnancyInfo,
        ...this.extractStepData(2, formValue)
      },
      formulaFeedingInfo: {
        ...this.onboardingService.getCurrentData().formulaFeedingInfo,
        ...this.extractStepData(3, formValue)
      },
      supportInfo: {
        ...this.onboardingService.getCurrentData().supportInfo,
        ...this.extractStepData(4, formValue)
      },
      challengesAndExpectationsInfo: {
        ...this.onboardingService.getCurrentData().challengesAndExpectationsInfo,
        ...this.extractStepData(5, formValue)
      }
    };
    
    const validation = this.onboardingService.validateStep(this.progress.currentStep, currentData);
    
    if (!validation.isValid) {
      const alert = await this.alertController.create({
        header: 'Please Complete Required Fields',
        message: Object.values(validation.errors).join('\n'),
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  toggleArrayValue(formControlName: string, value: string): void {
    const currentValues = this.onboardingForm.get(formControlName)?.value || [];
    const index = currentValues.indexOf(value);
    
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(value);
    }
    
    this.onboardingForm.patchValue({ [formControlName]: currentValues });
  }

  isValueSelected(formControlName: string, value: string | boolean): boolean {
    const formValue = this.onboardingForm.get(formControlName)?.value;
    
    // Handle both arrays (multi-select) and single values
    if (Array.isArray(formValue)) {
      return formValue.includes(value);
    } else {
      return formValue === value;
    }
  }

  selectSingleValue(formControlName: string, value: string | boolean): void {
    this.onboardingForm.patchValue({ [formControlName]: value });
    // The form value changes subscription will handle updateProgressState()
  }

  // Conditional field visibility helpers
  shouldShowField(fieldName: string): boolean {
    switch (fieldName) {
      case 'nippleIssuesDescription':
        return this.onboardingForm.get('hasNippleIssues')?.value === true;
      case 'expectedDueDate':
        return this.onboardingForm.get('motherType')?.value === 'pregnant';
      case 'babyInfo':
        return this.onboardingForm.get('motherType')?.value === 'new_mom';
      case 'formulaDetails':
        return this.onboardingForm.get('usesFormula')?.value === true;
      case 'bottleDetails':
        return this.onboardingForm.get('usesBottles')?.value === true;
      case 'pumpingDetails':
        return this.onboardingForm.get('usesPump')?.value === true;
      case 'motherMedicalConditionsOther':
        return this.isValueSelected('motherMedicalConditions', 'Other');
      case 'hospitalizationReason':
        return true; // Will be handled per baby in template
      default:
        return true;
    }
  }

  shouldShowFormulaQuestions(): boolean {
    return this.onboardingForm.get('usesFormula')?.value === true;
  }

  shouldShowBottleQuestions(): boolean {
    return this.onboardingForm.get('usesBottles')?.value === true;
  }

  shouldShowPumpingQuestions(): boolean {
    return this.onboardingForm.get('usesPump')?.value === true;
  }

  shouldShowBabyHospitalizationReason(babyIndex: number): boolean {
    const baby = this.babiesFormArray.at(babyIndex);
    return baby?.get('hasBeenHospitalized')?.value === true;
  }

  // Helper methods for baby-specific array value handling
  isBabyValueSelected(babyIndex: number, fieldName: string, value: string): boolean {
    const baby = this.babiesFormArray.at(babyIndex);
    const fieldValue = baby?.get(fieldName)?.value;
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(value);
    }
    return fieldValue === value;
  }

  toggleBabyArrayValue(babyIndex: number, fieldName: string, value: string): void {
    const baby = this.babiesFormArray.at(babyIndex);
    const currentValue = baby?.get(fieldName)?.value || [];
    
    let newValue: string[];
    if (currentValue.includes(value)) {
      // Remove value
      newValue = currentValue.filter((item: string) => item !== value);
    } else {
      // Add value
      newValue = [...currentValue, value];
    }
    
    baby?.get(fieldName)?.setValue(newValue);
    
    // If "None" is selected, clear all other selections
    if (value === 'None' && newValue.includes('None')) {
      baby?.get(fieldName)?.setValue(['None']);
    } else if (newValue.includes('None') && value !== 'None') {
      // If something else is selected when "None" was already selected, remove "None"
      newValue = newValue.filter(item => item !== 'None');
      baby?.get(fieldName)?.setValue(newValue);
    }
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.onboardingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.onboardingForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'This field is required';
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('min')) {
      return 'Value is too low';
    }
    if (field?.hasError('max')) {
      return 'Value is too high';
    }
    return '';
  }

  // Step completion status helpers
  isStepCompleted(step: number): boolean {
    // Only mark steps as completed if they're before the current step
    return step < this.progress.currentStep;
  }

  canNavigateToStep(step: number): boolean {
    // Can navigate to current step or any completed step
    return step <= this.progress.currentStep;
  }

  getStepTitle(step: number): string {
    const titles = {
      1: `${this.currentUser?.firstName || 'Your'}'s Info`,
      2: 'Pregnancy & Baby Information',
      3: 'Feeding Methods', 
      4: 'Support & Demographics',
      5: 'Challenges & Expectations'
    };
    return titles[step as keyof typeof titles] || `Step ${step}`;
  }

  // Date picker helper methods
  getFormattedDate(fieldName: string): string {
    const value = this.onboardingForm.get(fieldName)?.value;
    if (!value) return '';
    
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  }

  // ============================================================================
  // MULTIPLE BABIES MANAGEMENT
  // ============================================================================

  get babiesFormArray(): FormArray {
    return this.onboardingForm.get('babies') as FormArray;
  }

  createBabyForm(): FormGroup {
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD for date input
    
    return this.formBuilder.group({
      name: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      birthWeight: [null, [Validators.required, Validators.min(0.5)]],
      mostRecentWeight: [null, [Validators.required, Validators.min(0.5)]],
      dateOfMostRecentWeightCheck: [today, Validators.required], // Default to current date
      birthHeight: [null, [Validators.required, Validators.min(30)]],
      deliveryType: ['', Validators.required],
      gestationalAge: [40, [Validators.required, Validators.min(20)]],
      
      // Breastfeeding Details (per baby)
      directBreastfeedsIn24h: [0, [Validators.required, Validators.min(0)]],
      latchQuality: ['', Validators.required],
      offersBothBreastsPerFeeding: [null, Validators.required],
      timePerBreast: ['', Validators.required], // Changed from timeLatched to match HTML
      
      // Daily Output (per baby)
      wetDiapersIn24h: [0, [Validators.required, Validators.min(0)]],
      dirtyDiapersIn24h: [0, [Validators.required, Validators.min(0)]],
      
      // Health Information (per baby)
      medicalConditions: [[]], // Array for multiple conditions
      medicalConditionsOther: [''], // Text field for "Other" conditions
      hasBeenHospitalized: [null, Validators.required],
      hospitalizationReason: [''],
      
      // Formula Feeding Details (per baby)
      formulaBrand: [''],
      formulaBrandOther: [''], // For "Other" formula brand
      formulaTimesPerDay: [0, [Validators.min(0)]],
      formulaAmountPerFeed: [10, [Validators.min(10)]],
      formulaReason: [''],
      formulaReasonOther: [''], // For "Other" formula reason
      
      // Bottle Feeding Details (per baby)
      bottleBrand: [''],
      bottleBrandOther: [''], // For "Other" bottle brand
      bottleFeedDuration: [''],
      usesPacedBottleFeeding: [null],
      bottleContents: [''],
      
      // Pumping Details (per baby)
      pumpBrand: [''],
      pumpBrandOther: [''], // For "Other" pump brand
      pumpType: [''],
      pumpsBothBreasts: [null],
      pumpSessionsPerDay: [3, [Validators.min(1)]],
      pumpMinutesPerSession: [15, [Validators.min(5)]],
      pumpAverageOutput: [50, [Validators.min(10)]],
      pumpTotalDailyOutput: [200, [Validators.min(50)]],
      
      existingBabyId: [null] // Track if this is an existing baby
    });
  }

  addBaby(): void {
    const babyForm = this.createBabyForm();
    
    // If this is not the first baby, copy data from first baby (except name)
    if (this.babiesFormArray.length > 0) {
      const firstBabyData = this.babiesFormArray.at(0).value;
      babyForm.patchValue({
        name: '', // Keep name empty
        dateOfBirth: firstBabyData.dateOfBirth,
        gender: firstBabyData.gender,
        birthWeight: firstBabyData.birthWeight,
        birthHeight: firstBabyData.birthHeight,
        deliveryType: firstBabyData.deliveryType,
        gestationalAge: firstBabyData.gestationalAge,
        currentWeight: firstBabyData.currentWeight,
        weightCheckDate: firstBabyData.weightCheckDate
      });
    }
    
    this.babiesFormArray.push(babyForm);
  }

  removeBaby(index: number): void {
    if (this.babiesFormArray.length > 1) {
      this.babiesFormArray.removeAt(index);
    }
  }

  getBabyNumber(index: number): string {
    if (this.babiesFormArray.length === 1) return '';
    return ` ${index + 1}`;
  }

  getBabyTitle(index: number): string {
    if (this.babiesFormArray.length === 1) return 'Baby Information';
    return `Baby ${index + 1} Information`;
  }

  updateBabyFormControl(babyIndex: number, controlName: string, value: any): void {
    const babyFormGroup = this.babiesFormArray.at(babyIndex) as FormGroup;
    if (babyFormGroup && babyFormGroup.get(controlName)) {
      babyFormGroup.get(controlName)!.setValue(value);
    }
  }

  goBack(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

}