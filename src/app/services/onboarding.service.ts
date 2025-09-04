import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OnboardingData, OnboardingProgress, OnboardingStepValidation, OnboardingDataMapping } from '../models/onboarding.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private onboardingDataSubject = new BehaviorSubject<Partial<OnboardingData>>({
    completedSteps: [],
    isCompleted: false
  });

  private currentStepSubject = new BehaviorSubject<number>(1);
  private totalSteps = 7;

  public onboardingData$ = this.onboardingDataSubject.asObservable();
  public currentStep$ = this.currentStepSubject.asObservable();
  
  public progress$: Observable<OnboardingProgress> = combineLatest([
    this.onboardingData$,
    this.currentStep$
  ]).pipe(
    map(([data, currentStep]) => ({
      totalSteps: this.totalSteps,
      completedSteps: data.completedSteps?.length || 0,
      currentStep,
      percentComplete: ((data.completedSteps?.length || 0) / this.totalSteps) * 100,
      canProceed: this.canProceedOrComplete(currentStep, data)
    }))
  );

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.initializeFromStorage();
    this.prefillExistingData();
  }

  // ============================================================================
  // INITIALIZATION & DATA MANAGEMENT
  // ============================================================================

  private initializeFromStorage(): void {
    const savedData = localStorage.getItem('naricare_onboarding');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        this.onboardingDataSubject.next(parsedData);
      } catch (error) {
        console.error('Error parsing saved onboarding data:', error);
      }
    }
  }

  private async prefillExistingData(): Promise<void> {
    try {
      // First try to load existing onboarding data from backend
      const onboardingResponse = await this.apiService.getOnboardingData().toPromise();
      
      if (onboardingResponse?.success && onboardingResponse.data) {
        // If onboarding data exists, use it directly (same format as local storage)
        this.updateOnboardingData(onboardingResponse.data);
        console.log('Loaded existing onboarding data from backend:', onboardingResponse.data);
        return;
      }

      // If no onboarding data exists, prefill from user profile and baby data
      const [userResponse, babiesResponse] = await Promise.all([
        this.apiService.getUserProfile().toPromise(),
        this.apiService.getUserBabies().toPromise()
      ]);

      if (userResponse?.success && userResponse.data) {
        const userData = userResponse.data;
        const currentData = this.onboardingDataSubject.value;
        
        // Pre-fill personal information
        if (!currentData.personalInfo) {
          currentData.personalInfo = {
            email: userData.email || '',
            fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            phoneNumber: userData.phoneNumber || '',
            employmentStatus: userData.employmentStatus || 'employed',
            languagesSpoken: userData.languages || []
          };
        }

        // Pre-fill baby information if available
        if (babiesResponse?.success && babiesResponse.data?.length > 0) {
          const baby = babiesResponse.data[0]; // Use first baby
          if (!currentData.pregnancyInfo?.babyInfo) {
            currentData.pregnancyInfo = {
              motherType: 'new_mom',
              isFirstChild: babiesResponse.data.length === 1,
              babyInfo: {
                name: baby.name,
                dateOfBirth: baby.dateOfBirth,
                gender: baby.gender,
                birthWeight: baby.birthWeight,
                birthHeight: baby.birthHeight,
                deliveryType: baby.deliveryType || 'vaginal',
                gestationalAge: baby.gestationalAge || 40
              }
            };
          }
        }

        this.updateOnboardingData(currentData);
      }
    } catch (error) {
      console.error('Error prefilling onboarding data:', error);
    }
  }

  // ============================================================================
  // DATA UPDATES & VALIDATION
  // ============================================================================

  updateOnboardingData(data: Partial<OnboardingData>): void {
    const currentData = this.onboardingDataSubject.value;
    const updatedData = { ...currentData, ...data };
    
    // Save to localStorage
    localStorage.setItem('naricare_onboarding', JSON.stringify(updatedData));
    
    this.onboardingDataSubject.next(updatedData);
  }

  updateStepData(step: number, stepData: any): void {
    const currentData = this.onboardingDataSubject.value;
    let updatedData = { ...currentData };
    
    switch (step) {
      case 1:
        updatedData.personalInfo = { ...updatedData.personalInfo, ...stepData };
        break;
      case 2:
        updatedData.pregnancyInfo = { ...updatedData.pregnancyInfo, ...stepData };
        break;
      case 3:
        updatedData.breastfeedingInfo = { ...updatedData.breastfeedingInfo, ...stepData };
        break;
      case 4:
        updatedData.medicalInfo = { ...updatedData.medicalInfo, ...stepData };
        break;
      case 5:
        updatedData.feedingInfo = { ...updatedData.feedingInfo, ...stepData };
        break;
      case 6:
        updatedData.supportInfo = { ...updatedData.supportInfo, ...stepData };
        break;
      case 7:
        updatedData.preferencesInfo = { ...updatedData.preferencesInfo, ...stepData };
        break;
    }

    // Mark step as completed if valid
    const validation = this.validateStep(step, updatedData);
    if (validation.isValid && !updatedData.completedSteps?.includes(step)) {
      updatedData.completedSteps = [...(updatedData.completedSteps || []), step];
    }

    this.updateOnboardingData(updatedData);
    
    // Auto-save to backend (fire and forget)
    this.autoSaveToBackend(updatedData);
  }

  private autoSaveToBackend(data: Partial<OnboardingData>): void {
    // Only auto-save if we have meaningful data
    if (!data.personalInfo && !data.pregnancyInfo && !data.breastfeedingInfo) {
      return;
    }

    this.apiService.saveOnboardingData(data).subscribe({
      next: (response) => {
        if (response?.success) {
          console.log('Auto-saved onboarding data to backend');
        } else {
          if (response?.details && Array.isArray(response.details)) {
            const fieldErrors = response.details.map((detail: any) => 
              `${detail.path}: ${detail.msg}`
            );
            console.warn('Auto-save validation errors:', fieldErrors);
          } else {
            console.warn('Auto-save failed:', response?.error);
          }
        }
      },
      error: (error) => {
        console.warn('Auto-save error (non-critical):', error);
      }
    });
  }

  // ============================================================================
  // STEP NAVIGATION & VALIDATION
  // ============================================================================

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStepSubject.next(step);
    }
  }

  nextStep(): boolean {
    const currentStep = this.currentStepSubject.value;
    const data = this.onboardingDataSubject.value;
    
    if (this.canProceedToNextStep(currentStep, data) && currentStep < this.totalSteps) {
      this.currentStepSubject.next(currentStep + 1);
      return true;
    }
    return false;
  }

  previousStep(): void {
    const currentStep = this.currentStepSubject.value;
    if (currentStep > 1) {
      this.currentStepSubject.next(currentStep - 1);
    }
  }

  private canProceedToNextStep(step: number, data: Partial<OnboardingData>): boolean {
    const validation = this.validateStep(step, data);
    return validation.isValid;
  }

  private canProceedOrComplete(step: number, data: Partial<OnboardingData>): boolean {
    // If we're on the final step, check if ALL steps are valid (for completion)
    if (step === this.totalSteps) {
      return this.canCompleteOnboarding(data);
    }
    // Otherwise, just validate the current step (for navigation)
    return this.canProceedToNextStep(step, data);
  }

  private canCompleteOnboarding(data: Partial<OnboardingData>): boolean {
    // Validate all steps for completion
    for (let stepNum = 1; stepNum <= this.totalSteps; stepNum++) {
      const validation = this.validateStep(stepNum, data);
      if (!validation.isValid) {
        console.log(`Step ${stepNum} validation failed:`, validation.errors);
        return false;
      }
    }
    return true;
  }

  validateStep(step: number, data: Partial<OnboardingData>): OnboardingStepValidation {
    const validation: OnboardingStepValidation = {
      stepNumber: step,
      isValid: true,
      requiredFields: [],
      errors: {}
    };

    switch (step) {
      case 1:
        return this.validatePersonalInfo(data.personalInfo, validation);
      case 2:
        return this.validatePregnancyInfo(data.pregnancyInfo, validation);
      case 3:
        // Skip breastfeeding validation for pregnant mothers
        if (data.pregnancyInfo?.motherType === 'pregnant') {
          validation.isValid = true;
          return validation;
        }
        return this.validateBreastfeedingInfo(data.breastfeedingInfo, validation);
      case 4:
        return this.validateMedicalInfo(data.medicalInfo, validation);
      case 5:
        return this.validateFeedingInfo(data.feedingInfo, validation);
      case 6:
        return this.validateSupportInfo(data.supportInfo, validation);
      case 7:
        return this.validatePreferencesInfo(data.preferencesInfo, validation);
    }

    return validation;
  }

  // ============================================================================
  // CONDITIONAL VALIDATION LOGIC
  // ============================================================================

  private validatePersonalInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    const required = ['email', 'fullName', 'phoneNumber', 'employmentStatus'];
    
    required.forEach(field => {
      if (!data?.[field]) {
        validation.isValid = false;
        validation.requiredFields.push(field);
        validation.errors[field] = `${field} is required`;
      }
    });

    return validation;
  }

  private validatePregnancyInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    if (!data?.motherType) {
      validation.isValid = false;
      validation.errors['motherType'] = 'Please select if you are pregnant or a new mother';
    }

    // Conditional validation based on mother type
    if (data?.motherType === 'pregnant') {
      if (!data.dueDate) {
        validation.isValid = false;
        validation.errors['dueDate'] = 'Due date is required';
      }
    }

    if (data?.motherType === 'new_mom') {
      const babyRequired = ['name', 'dateOfBirth', 'gender', 'birthWeight', 'birthHeight'];
      babyRequired.forEach(field => {
        if (!data.babyInfo?.[field]) {
          validation.isValid = false;
          validation.errors[`baby_${field}`] = `Baby's ${field} is required`;
        }
      });
    }

    if (data?.isFirstChild === undefined) {
      validation.isValid = false;
      validation.errors['isFirstChild'] = 'Please indicate if this is your first child';
    }

    return validation;
  }

  private validateBreastfeedingInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    if (!data?.experienceLevel) {
      validation.isValid = false;
      validation.errors['experienceLevel'] = 'Please select your breastfeeding experience level';
    }

    if (data?.currentlyBreastfeeding === undefined) {
      validation.isValid = false;
      validation.errors['currentlyBreastfeeding'] = 'Please indicate if you are currently breastfeeding';
    }

    // Conditional validation for breastfeeding details
    if (data?.currentlyBreastfeeding) {
      const bfRequired = ['directFeedsPerDay', 'latchQuality', 'offersBothBreasts'];
      bfRequired.forEach(field => {
        if (data.breastfeedingDetails?.[field] === undefined || data.breastfeedingDetails?.[field] === null) {
          validation.isValid = false;
          validation.errors[field] = `${field} is required when currently breastfeeding`;
        }
      });
    }

    // Baby output is always required for assessment
    if (data?.babyOutput?.peeCount24h === undefined || data?.babyOutput?.poopCount24h === undefined) {
      validation.isValid = false;
      validation.errors['babyOutput'] = 'Baby\'s daily pee and poop count are required for assessment';
    }

    return validation;
  }

  private validateMedicalInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    // Medical conditions can be "None" so we just check if the field exists
    if (!data?.motherMedicalConditions || data.motherMedicalConditions.length === 0) {
      validation.isValid = false;
      validation.errors['motherMedicalConditions'] = 'Please select your medical conditions or "None"';
    }

    // Conditional validation for nipple issues
    if (data?.nippleAnatomicalIssues && !data?.nippleIssuesDescription) {
      validation.isValid = false;
      validation.errors['nippleIssuesDescription'] = 'Please describe the nipple anatomical issues';
    }

    // Conditional validation for baby hospitalization
    if (data?.babyHospitalized && !data?.babyHospitalizationReason) {
      validation.isValid = false;
      validation.errors['babyHospitalizationReason'] = 'Please provide the reason for hospitalization';
    }

    return validation;
  }

  private validateFeedingInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    // Check main feeding method indicators
    if (data?.usesFormula === undefined) {
      validation.isValid = false;
      validation.errors['usesFormula'] = 'Please indicate if you use formula';
    }

    if (data?.usesBottle === undefined) {
      validation.isValid = false;
      validation.errors['usesBottle'] = 'Please indicate if you use bottles';
    }

    if (data?.ownsPump === undefined) {
      validation.isValid = false;
      validation.errors['ownsPump'] = 'Please indicate if you own a breast pump';
    }

    // Conditional validations
    if (data?.usesFormula && !data?.formulaDetails) {
      validation.isValid = false;
      validation.errors['formulaDetails'] = 'Please provide formula feeding details';
    }

    if (data?.usesBottle && !data?.bottleDetails) {
      validation.isValid = false;
      validation.errors['bottleDetails'] = 'Please provide bottle feeding details';
    }

    if (data?.ownsPump && !data?.pumpingDetails) {
      validation.isValid = false;
      validation.errors['pumpingDetails'] = 'Please provide pumping details';
    }

    if (data?.usesBreastmilkSupplements && !data?.supplementsDetails) {
      validation.isValid = false;
      validation.errors['supplementsDetails'] = 'Please describe the breastmilk supplements used';
    }

    return validation;
  }

  private validateSupportInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    const required = ['currentSupportSystem', 'familyStructure', 'educationLevel'];
    
    required.forEach(field => {
      if (!data?.[field]) {
        validation.isValid = false;
        validation.errors[field] = `${field} is required`;
      }
    });

    return validation;
  }

  private validatePreferencesInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    if (!data?.currentChallenges || data.currentChallenges.length === 0) {
      validation.isValid = false;
      validation.errors['currentChallenges'] = 'Please select at least one current challenge';
    }

    if (!data?.expectationsFromProgram?.trim()) {
      validation.isValid = false;
      validation.errors['expectationsFromProgram'] = 'Please describe your expectations from the NariCare program';
    }

    return validation;
  }

  // ============================================================================
  // COMPLETION & DATA SYNC
  // ============================================================================

  async completeOnboarding(): Promise<void> {
    const data = this.onboardingDataSubject.value as OnboardingData;
    
    // Final validation
    let allValid = true;
    for (let step = 1; step <= this.totalSteps; step++) {
      const validation = this.validateStep(step, data);
      if (!validation.isValid) {
        allValid = false;
        throw new Error(`Step ${step} validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
    }

    if (!allValid) {
      throw new Error('Please complete all required fields before finishing onboarding');
    }

    try {
      // Save final onboarding data to backend in local storage format
      const saveResponse = await this.apiService.saveOnboardingData(data).toPromise();
      if (!saveResponse?.success) {
        // Handle validation errors with specific field information
        if (saveResponse?.details && Array.isArray(saveResponse.details)) {
          const fieldErrors = saveResponse.details.map((detail: any) => 
            `${detail.path}: ${detail.msg}`
          ).join('\n');
          throw new Error(`Validation failed:\n${fieldErrors}`);
        }
        throw new Error(saveResponse?.error || 'Failed to save onboarding data');
      }

      // Complete onboarding via API
      const completeResponse = await this.apiService.completeOnboarding().toPromise();
      if (!completeResponse?.success) {
        throw new Error(completeResponse?.error || 'Failed to complete onboarding');
      }

      console.log('Onboarding completed successfully:', completeResponse);
      
      // Mark onboarding as completed locally
      const completedData = {
        ...data,
        isCompleted: true,
        completedAt: new Date(),
        completedSteps: Array.from({ length: this.totalSteps }, (_, i) => i + 1)
      };

      this.updateOnboardingData(completedData);
      
      // Clear from localStorage as it's now synced
      localStorage.removeItem('naricare_onboarding');

    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  private async syncOnboardingData(data: OnboardingData): Promise<void> {
    try {
      // Save onboarding data to backend in local storage format
      const response = await this.apiService.saveOnboardingData(data).toPromise();
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to save onboarding data');
      }
      
      console.log('Onboarding data saved to backend:', response);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      throw error;
    }
  }




  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  isOnboardingCompleted(): boolean {
    const data = this.onboardingDataSubject.value;
    return data.isCompleted || false;
  }

  canScheduleConsultation(): boolean {
    return this.isOnboardingCompleted();
  }

  resetOnboarding(): void {
    localStorage.removeItem('naricare_onboarding');
    this.onboardingDataSubject.next({
      completedSteps: [],
      isCompleted: false
    });
    this.currentStepSubject.next(1);
  }

  getCurrentData(): Partial<OnboardingData> {
    return this.onboardingDataSubject.value;
  }

  // Get conditional field requirements based on current data
  getConditionalRequirements(step: number): { [key: string]: boolean } {
    const data = this.onboardingDataSubject.value;
    
    switch (step) {
      case 2:
        return {
          requiresDueDate: data.pregnancyInfo?.motherType === 'pregnant',
          requiresBabyInfo: data.pregnancyInfo?.motherType === 'new_mom'
        };
      case 3:
        return {
          requiresBreastfeedingDetails: data.breastfeedingInfo?.currentlyBreastfeeding === true
        };
      case 4:
        return {
          requiresNippleDescription: data.medicalInfo?.nippleAnatomicalIssues === true,
          requiresHospitalizationReason: data.medicalInfo?.babyHospitalized === true
        };
      case 5:
        return {
          requiresFormulaDetails: data.feedingInfo?.usesFormula === true,
          requiresBottleDetails: data.feedingInfo?.usesBottle === true,
          requiresPumpingDetails: data.feedingInfo?.ownsPump === true,
          requiresSupplementsDetails: data.feedingInfo?.usesBreastmilkSupplements === true
        };
      default:
        return {};
    }
  }
}