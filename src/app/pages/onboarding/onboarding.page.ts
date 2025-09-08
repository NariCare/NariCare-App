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
    totalSteps: 7,
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
        this.updateFormFromData(data);
      })
    );

    // Subscribe to form value changes to update progress
    this.subscriptions.push(
      this.onboardingForm.valueChanges.subscribe(() => {
        this.updateProgressState();
      })
    );

    // Initial progress state update
    setTimeout(() => this.updateProgressState(), 200);
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
      birthHeight: baby.birthHeight || baby.birth_height || baby.height_at_birth,
      deliveryType: baby.deliveryType || baby.delivery_type || baby.type_of_delivery,
      gestationalAge: baby.gestationalAge || baby.gestational_age || baby.gestational_weeks || 40,
      currentWeight: baby.currentWeight || baby.current_weight || baby.latest_weight,
      weightCheckDate: this.formatDateForInput(baby.weightCheckDate || baby.weight_check_date || baby.last_weight_date),
      
      // Breastfeeding details (if available from previous data)
      directFeedsPerDay: baby.directFeedsPerDay || baby.direct_feeds_per_day || baby.breastfeeds_per_day || 0,
      peeCount24h: baby.peeCount24h || baby.pee_count_24h || baby.wet_diapers || 0,
      poopCount24h: baby.poopCount24h || baby.poop_count_24h || baby.soiled_diapers || 0,
      latchQuality: baby.latchQuality || baby.latch_quality || '',
      offersBothBreasts: baby.offersBothBreasts !== undefined ? baby.offersBothBreasts : 
                        (baby.offers_both_breasts !== undefined ? baby.offers_both_breasts : null),
      timePerBreast: baby.timePerBreast || baby.time_per_breast || '',
      
      // Medical information (if available)
      medicalConditions: baby.medicalConditions || baby.medical_conditions || baby.health_conditions || '',
      hasBeenHospitalized: baby.hasBeenHospitalized !== undefined ? baby.hasBeenHospitalized : 
                           (baby.has_been_hospitalized !== undefined ? baby.has_been_hospitalized : null),
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

  shouldShowFormulaQuestions(): boolean {
    // Show formula questions if user selected they use formula in step 5
    return this.onboardingForm.get('usesFormula')?.value === true;
  }

  shouldShowBottleQuestions(): boolean {
    // Show bottle questions if user selected they use bottles in step 5
    return this.onboardingForm.get('usesBottle')?.value === true;
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
      localStorage.setItem(this.ONBOARDING_STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form data to local storage:', error);
    }
  }

  private loadFormDataFromLocalStorage(): any {
    try {
      const savedData = localStorage.getItem(this.ONBOARDING_STORAGE_KEY);
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
      localStorage.removeItem(this.ONBOARDING_STORAGE_KEY);
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
      totalSteps: 7,
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
      // Step 1: Personal Information
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      employmentStatus: ['', [Validators.required]],
      languagesSpoken: [[]],
      
      // Step 2: Pregnancy & Birth Information
      motherType: ['', [Validators.required]],
      dueDate: [new Date().toISOString()],
      isFirstChild: [null],
      numberOfBabies: [1],
      babies: this.formBuilder.array([]),
      
      // Step 3: Breastfeeding Details
      experienceLevel: ['', [Validators.required]],
      currentlyBreastfeeding: [null],
      breastfeedingDuration: [''],
      
      // Step 4: Medical & Health Information
      motherMedicalConditions: [[]],
      motherMedicalConditionsOther: [''],
      allergies: [''],
      nippleAnatomicalIssues: [false],
      nippleIssuesDescription: [''],
      babyMedicalConditions: [''],
      babyHospitalized: [false],
      babyHospitalizationReason: [''],
      
      // Step 5: Feeding & Pumping
      usesFormula: [null],
      formulaType: [''],
      formulaAmountPerFeed: [null],
      formulaFeedsPerDay: [null],
      formulaReason: [''],
      usesBottle: [null],
      bottleType: [''],
      bottleAmountPerFeed: [null],
      bottleFeedsPerDay: [null],
      bottleContentType: [''],
      ownsPump: [null],
      pumpType: [''],
      pumpSessionsPerDay: [null],
      pumpAverageOutput: [null],
      pumpSessionDuration: [null],
      storageMethod: [[]],
      usesBreastmilkSupplements: [false],
      supplementsDetails: [''],
      
      // Step 6: Support System & Demographics
      currentSupportSystem: ['', [Validators.required]],
      familyStructure: ['', [Validators.required]],
      educationLevel: ['', [Validators.required]],
      householdIncome: [''],
      
      // Step 7: Preferences & Goals
      currentChallenges: [[]],
      expectationsFromProgram: ['', [Validators.required]],
      milkSupplyGoals: [''],
      topicsOfInterest: [[]]
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
      // First restore babies FormArray if it exists
      if (savedData.formValues.babies && Array.isArray(savedData.formValues.babies)) {
        // Clear existing babies
        while (this.babiesFormArray.length !== 0) {
          this.babiesFormArray.removeAt(0);
        }
        
        // Add saved babies
        savedData.formValues.babies.forEach((babyData: any) => {
          const babyForm = this.createBabyForm();
          babyForm.patchValue(babyData, { emitEvent: false });
          this.babiesFormArray.push(babyForm);
        });
      }
      
      // Restore other form values (excluding babies since we handled it above)
      const { babies, ...otherFormValues } = savedData.formValues;
      this.onboardingForm.patchValue(otherFormValues, { emitEvent: false });
      
      // Restore progress if available
      if (savedData.progress) {
        this.progress = savedData.progress;
      }
      
      // Update the onboarding service with restored data to synchronize validation state
      // Extract and save all step data to ensure service state matches form state
      for (let step = 1; step <= this.progress.totalSteps; step++) {
        const stepData = this.extractStepData(step, savedData.formValues);
        this.onboardingService.updateStepData(step, stepData);
      }
      
      console.log('Restored onboarding form data from local storage and synchronized service state');
    }
  }

  private prefillUserInformation(user: User): void {
    if (!this.onboardingForm || !user) return;
    
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
    
    // Personal Info
    if (data.personalInfo) {
      formUpdate.email = data.personalInfo.email || this.currentUser?.email;
      formUpdate.fullName = data.personalInfo.fullName || 
        (this.currentUser?.firstName && this.currentUser?.lastName ? 
         `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim() : 
         this.currentUser?.firstName);
      formUpdate.phoneNumber = data.personalInfo.phoneNumber || this.currentUser?.phoneNumber;
      formUpdate.employmentStatus = data.personalInfo.employmentStatus;
      formUpdate.languagesSpoken = data.personalInfo.languagesSpoken;
    } else if (this.currentUser) {
      // If personalInfo doesn't exist, prefill from current user
      formUpdate.email = this.currentUser.email;
      if (this.currentUser.firstName && this.currentUser.lastName) {
        formUpdate.fullName = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
      } else if (this.currentUser.firstName) {
        formUpdate.fullName = this.currentUser.firstName;
      }
      if (this.currentUser.phoneNumber) {
        formUpdate.phoneNumber = this.currentUser.phoneNumber;
      }
    }
    
    // Pregnancy Info
    if (data.pregnancyInfo) {
      formUpdate.motherType = data.pregnancyInfo.motherType;
      formUpdate.dueDate = data.pregnancyInfo.dueDate;
      formUpdate.isFirstChild = data.pregnancyInfo.isFirstChild;
      
      if (data.pregnancyInfo.babyInfo) {
        const baby = data.pregnancyInfo.babyInfo;
        formUpdate.babyName = baby.name;
        formUpdate.babyDateOfBirth = baby.dateOfBirth;
        formUpdate.babyGender = baby.gender;
        formUpdate.babyBirthWeight = baby.birthWeight;
        formUpdate.babyBirthHeight = baby.birthHeight;
        formUpdate.deliveryType = baby.deliveryType;
        formUpdate.gestationalAge = baby.gestationalAge;
        formUpdate.babyCurrentWeight = baby.currentWeight;
        formUpdate.weightCheckDate = baby.weightCheckDate;
      }
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
      case 1: // Personal Information
        return !!(formValue.firstName && formValue.lastName && formValue.email && formValue.languagesSpoken?.length);
      
      case 2: // Pregnancy & Birth Information
        if (formValue.motherType === 'pregnant') {
          return !!(formValue.motherType && formValue.dueDate);
        } else if (formValue.motherType === 'new_mom') {
          return !!(formValue.motherType && formValue.birthDate && formValue.gender && 
                   formValue.birthWeight && formValue.birthHeight);
        }
        return false;
      
      case 3: // Breastfeeding Assessment (only for new mothers)
        if (formValue.motherType === 'new_mom') {
          return !!(formValue.experienceLevel && 
                   (formValue.currentlyBreastfeeding !== null && formValue.currentlyBreastfeeding !== undefined));
        }
        return true; // Skip validation for pregnant mothers
      
      case 4: // Health Information
        return !!(formValue.motherMedicalConditions?.length || formValue.motherMedicalConditions?.length === 0) && 
               !!(formValue.babyMedicalConditions?.length || formValue.babyMedicalConditions?.length === 0);
      
      case 5: // Feeding Methods
        return true; // This step is mostly optional selections
      
      case 6: // Social & Economic Background
        return !!(formValue.familyStructure && formValue.educationLevel);
      
      case 7: // Goals & Expectations
        return !!(formValue.expectationsFromProgram?.length && formValue.topicsOfInterest?.length);
      
      default:
        return false;
    }
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
    this.onboardingService.updateStepData(this.progress.currentStep, stepData);
  }

  private saveAllFormDataToService(): void {
    const formValue = this.onboardingForm.value;
    // Save all steps to ensure service has complete data
    for (let step = 1; step <= this.progress.totalSteps; step++) {
      const stepData = this.extractStepData(step, formValue);
      this.onboardingService.updateStepData(step, stepData);
    }
    console.log('Saved all form data to onboarding service');
  }

  private extractStepData(step: number, formValue: any): any {
    switch (step) {
      case 1:
        return {
          email: formValue.email,
          fullName: formValue.fullName,
          phoneNumber: formValue.phoneNumber,
          employmentStatus: formValue.employmentStatus,
          languagesSpoken: formValue.languagesSpoken
        };
      case 2:
        return {
          motherType: formValue.motherType,
          dueDate: formValue.dueDate,
          isFirstChild: formValue.isFirstChild,
          ...(formValue.motherType === 'new_mom' && {
            babies: formValue.babies || [],
            // Keep babyInfo for backward compatibility (use first baby)
            babyInfo: formValue.babies && formValue.babies.length > 0 ? formValue.babies[0] : null
          })
        };
      case 3:
        // For pregnant mothers, return empty breastfeeding data
        if (formValue.motherType === 'pregnant') {
          return {
            experienceLevel: null,
            currentlyBreastfeeding: false,
            breastfeedingDuration: null
          };
        }
        
        return {
          experienceLevel: formValue.experienceLevel,
          currentlyBreastfeeding: formValue.currentlyBreastfeeding,
          breastfeedingDuration: formValue.breastfeedingDuration
        };
      case 4:
        return {
          motherMedicalConditions: formValue.motherMedicalConditions,
          motherMedicalConditionsOther: formValue.motherMedicalConditionsOther,
          allergies: formValue.allergies,
          nippleAnatomicalIssues: formValue.nippleAnatomicalIssues,
          nippleIssuesDescription: formValue.nippleIssuesDescription,
          babyMedicalConditions: formValue.babyMedicalConditions,
          babyHospitalized: formValue.babyHospitalized,
          babyHospitalizationReason: formValue.babyHospitalizationReason
        };
      case 5:
        return {
          usesFormula: formValue.usesFormula,
          ...(formValue.usesFormula && {
            formulaDetails: {
              formulaType: formValue.formulaType,
              amountPerFeed: formValue.formulaAmountPerFeed,
              feedsPerDay: formValue.formulaFeedsPerDay,
              reasonForFormula: formValue.formulaReason
            }
          }),
          usesBottle: formValue.usesBottle,
          ...(formValue.usesBottle && {
            bottleDetails: {
              bottleType: formValue.bottleType,
              amountPerFeed: formValue.bottleAmountPerFeed,
              feedsPerDay: formValue.bottleFeedsPerDay,
              contentType: formValue.bottleContentType
            }
          }),
          ownsPump: formValue.ownsPump,
          ...(formValue.ownsPump && {
            pumpingDetails: {
              pumpType: formValue.pumpType,
              sessionsPerDay: formValue.pumpSessionsPerDay,
              averageOutput: formValue.pumpAverageOutput,
              pumpingDuration: formValue.pumpSessionDuration,
              storageMethod: formValue.storageMethod
            }
          }),
          usesBreastmilkSupplements: formValue.usesBreastmilkSupplements,
          supplementsDetails: formValue.supplementsDetails
        };
      case 6:
        return {
          currentSupportSystem: formValue.currentSupportSystem,
          familyStructure: formValue.familyStructure,
          educationLevel: formValue.educationLevel,
          householdIncome: formValue.householdIncome
        };
      case 7:
        return {
          currentChallenges: formValue.currentChallenges,
          expectationsFromProgram: formValue.expectationsFromProgram,
          milkSupplyGoals: formValue.milkSupplyGoals,
          topicsOfInterest: formValue.topicsOfInterest
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
    const validation = this.onboardingService.validateStep(this.progress.currentStep, this.onboardingService.getCurrentData());
    
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
      case 'dueDate':
        return this.onboardingForm.get('motherType')?.value === 'pregnant';
      case 'babyInfo':
        return this.onboardingForm.get('motherType')?.value === 'new_mom';
      case 'breastfeedingDetails':
        return this.onboardingForm.get('currentlyBreastfeeding')?.value === true;
      case 'nippleIssuesDescription':
        return this.onboardingForm.get('nippleAnatomicalIssues')?.value === true;
      case 'babyHospitalizationReason':
        return this.onboardingForm.get('babyHospitalized')?.value === true;
      case 'formulaDetails':
        return this.onboardingForm.get('usesFormula')?.value === true;
      case 'bottleDetails':
        return this.onboardingForm.get('usesBottle')?.value === true;
      case 'pumpingDetails':
        return this.onboardingForm.get('ownsPump')?.value === true;
      case 'supplementsDetails':
        return this.onboardingForm.get('usesBreastmilkSupplements')?.value === true;
      case 'motherMedicalConditionsOther':
        return this.isValueSelected('motherMedicalConditions', 'Other');
      default:
        return true;
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
    const completedSteps = this.onboardingService.getCurrentData().completedSteps || [];
    return completedSteps.includes(step);
  }

  canNavigateToStep(step: number): boolean {
    // Can navigate to current step or any completed step
    return step <= this.progress.currentStep || this.isStepCompleted(step);
  }

  getStepTitle(step: number): string {
    const titles = {
      1: 'Personal Information',
      2: 'Pregnancy & Birth Details',
      3: 'Breastfeeding Assessment', 
      4: 'Medical History',
      5: 'Feeding Methods',
      6: 'Support & Demographics',
      7: 'Goals & Preferences'
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
    return this.formBuilder.group({
      name: ['', Validators.required],
      dateOfBirth: [new Date().toISOString(), Validators.required],
      gender: ['', Validators.required],
      birthWeight: [null, [Validators.required, Validators.min(0.5)]],
      birthHeight: [null, [Validators.required, Validators.min(30)]],
      deliveryType: ['', Validators.required],
      gestationalAge: [40, [Validators.required, Validators.min(20)]],
      currentWeight: [null],
      weightCheckDate: [new Date().toISOString()],
      
      // Baby-specific breastfeeding and health questions
      directFeedsPerDay: [0],
      peeCount24h: [0],
      poopCount24h: [0],
      latchQuality: ['', Validators.required],
      offersBothBreasts: [null, Validators.required],
      timePerBreast: ['', Validators.required],
      medicalConditions: [''],
      hasBeenHospitalized: [null, Validators.required],
      hospitalizationReason: [''],
      
      // Formula feeding questions (if applicable)
      formulaTimesPerDay: [0],
      formulaAmountPerFeed: [10],
      
      // Bottle feeding questions (if applicable)
      bottleFeedDuration: [''],
      bottleBrand: [''],
      pacedBottleFeeding: [null],
      
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

}