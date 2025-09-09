import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OnboardingData, OnboardingProgress, OnboardingStepValidation, OnboardingDataMapping } from '../models/onboarding.model';
import { ApiService } from './api.service';
import { BackendAuthService } from './backend-auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private onboardingDataSubject = new BehaviorSubject<Partial<OnboardingData>>({
    completedSteps: [],
    isCompleted: false
  });

  private currentStepSubject = new BehaviorSubject<number>(1);
  private totalSteps = 5;

  public onboardingData$ = this.onboardingDataSubject.asObservable();
  public currentStep$ = this.currentStepSubject.asObservable();
  
  public progress$: Observable<OnboardingProgress> = combineLatest([
    this.onboardingData$,
    this.currentStep$
  ]).pipe(
    map(([data, currentStep]) => {
      // Filter completedSteps to only include valid steps (1-5)
      const validCompletedSteps = (data.completedSteps || []).filter(step => step >= 1 && step <= this.totalSteps);
      return {
        totalSteps: this.totalSteps,
        completedSteps: validCompletedSteps.length,
        currentStep,
        percentComplete: (validCompletedSteps.length / this.totalSteps) * 100,
        canProceed: this.canProceedOrComplete(currentStep, data)
      };
    })
  );

  private hasInitialized = false;
  private currentUserId: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: BackendAuthService
  ) {
    // Wait for user authentication before initializing data
    this.authService.currentUser$.subscribe(user => {
      if (user && user.uid && !user.uid.includes('mock')) {
        console.log('Real user authenticated, initializing onboarding data for:', user.uid);
        
        // Check if we need to switch users or first-time init
        const userChanged = this.currentUserId !== user.uid;
        this.currentUserId = user.uid;
        
        if (userChanged) {
          console.log('User changed or first login, reinitializing data');
          
          // Clean up any existing mock data immediately
          this.cleanupMockData();
          
          // Migrate any existing mock data
          this.migrateMockUserData(user.uid);
          
          // Initialize with the real user's data
          this.initializeFromStorage();
          this.prefillExistingData();
          this.hasInitialized = true;
        }
      } else if (user && user.uid.includes('mock')) {
        console.warn('Mock user detected, waiting for real authentication:', user.uid);
        this.currentUserId = null;
        this.hasInitialized = false;
      } else {
        console.log('No user authenticated, clearing onboarding data');
        this.currentUserId = null;
        this.hasInitialized = false;
        // Clear data when no user is logged in
        this.onboardingDataSubject.next({
          completedSteps: [],
          isCompleted: false
        });
      }
    });
  }

  // ============================================================================
  // INITIALIZATION & DATA MANAGEMENT
  // ============================================================================

  private getUserSpecificStorageKey(): string {
    // Use cached user ID if available and valid
    if (this.currentUserId && !this.currentUserId.includes('mock')) {
      return `naricare_onboarding_${this.currentUserId}`;
    }
    
    // Fallback to getting current user
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.uid;
    
    if (!userId) {
      console.warn('No authenticated user found when accessing onboarding storage');
      return 'naricare_onboarding_anonymous';
    }
    
    // Reject mock users
    if (userId.includes('mock')) {
      console.warn('Rejecting mock user for storage key:', userId);
      return 'naricare_onboarding_mock_rejected';
    }
    
    return `naricare_onboarding_${userId}`;
  }

  private isDevelopmentMode(): boolean {
    return !environment.production || window.location.hostname === 'localhost';
  }

  private cleanupMockData(): void {
    try {
      const allKeys = Object.keys(localStorage);
      const mockKeys = allKeys.filter(key => 
        key.includes('mock-user') || 
        key.includes('mock_user') ||
        key.includes('naricare_onboarding_mock') || 
        key.includes('onboarding_form_data_mock')
      );
      
      if (mockKeys.length > 0) {
        console.log('Cleaning up mock data:', mockKeys);
        mockKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log('Removed mock data key:', key);
        });
      }
    } catch (error) {
      console.warn('Error cleaning up mock data:', error);
    }
  }

  private migrateMockUserData(realUserId: string): void {
    try {
      // Look for any mock user data that might need to be migrated
      const allKeys = Object.keys(localStorage);
      const mockKeys = allKeys.filter(key => 
        key.includes('naricare_onboarding_mock') || 
        key.includes('onboarding_form_data_mock')
      );
      
      if (mockKeys.length > 0) {
        console.log('Found mock user data to migrate:', mockKeys);
        
        // Try to migrate the most recent mock data
        const realUserKey = `naricare_onboarding_${realUserId}`;
        const existingRealUserData = localStorage.getItem(realUserKey);
        
        // Only migrate if real user doesn't already have data
        if (!existingRealUserData) {
          const mockDataKey = mockKeys[0]; // Use first mock key found
          const mockData = localStorage.getItem(mockDataKey);
          
          if (mockData) {
            localStorage.setItem(realUserKey, mockData);
            console.log('Migrated mock user data to real user:', realUserId);
          }
        }
        
        // Clean up mock data
        mockKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log('Cleaned up mock data:', key);
        });
      }
    } catch (error) {
      console.warn('Error migrating mock user data:', error);
    }
  }

  private initializeFromStorage(): void {
    const storageKey = this.getUserSpecificStorageKey();
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        this.onboardingDataSubject.next(parsedData);
        console.log('Loaded onboarding data for user:', this.authService.getCurrentUser()?.uid);
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
        // If onboarding data exists, use it but ensure completion status is correct
        const backendData = { ...onboardingResponse.data };
        // Reset completion status - only set when user explicitly completes
        backendData.isCompleted = false;
        backendData.completedSteps = []; // Reset completed steps to prevent false progress
        delete backendData.completedAt;
        
        this.prefillDataWithoutCompletion(backendData);
        console.log('Loaded existing onboarding data from backend (completion status reset):', backendData);
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
            motherAge: userData.motherAge || userData.age || 25,
            city: userData.city || '',
            state: userData.state || '',
            employmentStatus: userData.employmentStatus || 'employed',
            languagesSpoken: userData.languages || [],
            motherMedicalConditions: userData.medicalConditions || [],
            motherMedicalConditionsOther: '',
            allergies: userData.allergies || '',
            hasNippleIssues: false,
            nippleIssuesDescription: '',
            breastfeedingDuration: userData.breastfeedingDuration || '1_year'
          };
        }

        // Pre-fill baby information if available
        if (babiesResponse?.success && babiesResponse.data?.length > 0) {
          const baby = babiesResponse.data[0]; // Use first baby
          if (!currentData.pregnancyInfo?.babyInfo) {
            currentData.pregnancyInfo = {
              motherType: 'new_mom',
              expectedDueDate: '',
              isFirstChild: userData.isFirstChild !== undefined ? userData.isFirstChild : true,
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

        this.prefillDataWithoutCompletion(currentData);
      }
    } catch (error) {
      console.error('Error prefilling onboarding data:', error);
    }
  }

  private prefillDataWithoutCompletion(data: Partial<OnboardingData>): void {
    const currentData = this.onboardingDataSubject.value;
    const updatedData = { 
      ...currentData, 
      ...data,
      // Ensure we don't mark any steps as completed during prefill
      completedSteps: [],
      isCompleted: false
    };
    
    // Save to localStorage without triggering completion logic using user-specific key
    const storageKey = this.getUserSpecificStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    this.onboardingDataSubject.next(updatedData);
  }

  // ============================================================================
  // DATA UPDATES & VALIDATION
  // ============================================================================

  updateOnboardingData(data: Partial<OnboardingData>): void {
    // Only proceed if we have a real user
    if (!this.currentUserId || this.currentUserId.includes('mock')) {
      console.warn('Skipping onboarding data update - no valid user authenticated');
      return;
    }
    
    const currentData = this.onboardingDataSubject.value;
    const updatedData = { ...currentData, ...data };
    
    // Save to localStorage with user-specific key
    const storageKey = this.getUserSpecificStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
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
        updatedData.formulaFeedingInfo = { ...updatedData.formulaFeedingInfo, ...stepData };
        break;
      case 4:
        updatedData.supportInfo = { ...updatedData.supportInfo, ...stepData };
        break;
      case 5:
        updatedData.challengesAndExpectationsInfo = { ...updatedData.challengesAndExpectationsInfo, ...stepData };
        break;
    }

    // Mark step as completed if valid and within range
    const validation = this.validateStep(step, updatedData);
    if (validation.isValid && step >= 1 && step <= this.totalSteps && !updatedData.completedSteps?.includes(step)) {
      updatedData.completedSteps = [...(updatedData.completedSteps || []), step];
    }

    this.updateOnboardingData(updatedData);
    
    // Auto-save to backend (fire and forget)
    this.autoSaveToBackend(updatedData);
  }

  private autoSaveToBackend(data: Partial<OnboardingData>): void {
    // Only auto-save if we have meaningful data
    if (!data.personalInfo && !data.pregnancyInfo && !data.formulaFeedingInfo) {
      return;
    }

    // Create a copy without completion flags for auto-save
    const autoSaveData = { ...data };
    delete autoSaveData.isCompleted;
    delete autoSaveData.completedAt;

    this.apiService.saveOnboardingData(autoSaveData).subscribe({
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
        // Skip formula feeding validation for pregnant mothers
        if (data.pregnancyInfo?.motherType === 'pregnant') {
          validation.isValid = true;
          return validation;
        }
        return this.validateFormulaFeedingInfo(data.formulaFeedingInfo, validation);
      case 4:
        return this.validateSupportInfo(data.supportInfo, validation);
      case 5:
        return this.validateChallengesAndExpectations(data.challengesAndExpectationsInfo, validation);
    }

    return validation;
  }

  // ============================================================================
  // CONDITIONAL VALIDATION LOGIC
  // ============================================================================

  private validatePersonalInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    const required = ['motherAge', 'city', 'state', 'employmentStatus', 'languagesSpoken', 'breastfeedingDuration'];
    
    required.forEach(field => {
      if (!data?.[field] && data?.[field] !== false) {
        validation.isValid = false;
        validation.requiredFields.push(field);
        validation.errors[field] = `${field} is required`;
      }
    });

    // Validate conditional fields
    if (data?.hasNippleIssues && !data?.nippleIssuesDescription) {
      validation.isValid = false;
      validation.errors['nippleIssuesDescription'] = 'Please describe the nipple issues';
    }

    return validation;
  }

  private validatePregnancyInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    if (!data?.motherType) {
      validation.isValid = false;
      validation.errors['motherType'] = 'Please select if you are pregnant or a new mother';
    }

    // Validate isFirstChild (this field appears in step 2 UI)
    if (data?.isFirstChild === undefined || data?.isFirstChild === null) {
      validation.isValid = false;
      validation.errors['isFirstChild'] = 'Please indicate if this is your first child';
    }

    // Conditional validation based on mother type
    if (data?.motherType === 'pregnant') {
      if (!data.expectedDueDate) {
        validation.isValid = false;
        validation.errors['expectedDueDate'] = 'Due date is required';
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

    return validation;
  }

  private validateFormulaFeedingInfo(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
    // Check main feeding method indicators
    if (data?.usesFormula === undefined) {
      validation.isValid = false;
      validation.errors['usesFormula'] = 'Please indicate if you use formula';
    }

    if (data?.usesBottles === undefined) {
      validation.isValid = false;
      validation.errors['usesBottles'] = 'Please indicate if you use bottles';
    }

    if (data?.usesPump === undefined) {
      validation.isValid = false;
      validation.errors['usesPump'] = 'Please indicate if you use a breast pump';
    }

    // Conditional validations
    if (data?.usesFormula && !data?.formulaDetails) {
      validation.isValid = false;
      validation.errors['formulaDetails'] = 'Please provide formula feeding details';
    }

    if (data?.usesBottles && !data?.bottleDetails) {
      validation.isValid = false;
      validation.errors['bottleDetails'] = 'Please provide bottle feeding details';
    }

    if (data?.usesPump && !data?.pumpingDetails) {
      validation.isValid = false;
      validation.errors['pumpingDetails'] = 'Please provide pumping details';
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

  private validateChallengesAndExpectations(data: any, validation: OnboardingStepValidation): OnboardingStepValidation {
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
      const storageKey = this.getUserSpecificStorageKey();
      localStorage.removeItem(storageKey);

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
    const storageKey = this.getUserSpecificStorageKey();
    localStorage.removeItem(storageKey);
    this.onboardingDataSubject.next({
      completedSteps: [],
      isCompleted: false
    });
    this.currentStepSubject.next(1);
  }

  // Clear all onboarding data when user logs out or switches
  clearAllOnboardingData(): void {
    // Clear current user's data
    this.resetOnboarding();
    
    // Also clear any orphaned data (optional cleanup)
    const allKeys = Object.keys(localStorage);
    const onboardingKeys = allKeys.filter(key => 
      key.startsWith('naricare_onboarding_') || key.startsWith('onboarding_form_data_')
    );
    onboardingKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Cleared all onboarding data from localStorage');
  }

  getCurrentData(): Partial<OnboardingData> {
    return this.onboardingDataSubject.value;
  }

  // Get conditional field requirements based on current data
  getConditionalRequirements(step: number): { [key: string]: boolean } {
    const data = this.onboardingDataSubject.value;
    
    switch (step) {
      case 1:
        return {
          requiresNippleDescription: data.personalInfo?.hasNippleIssues === true
        };
      case 2:
        return {
          requiresDueDate: data.pregnancyInfo?.motherType === 'pregnant',
          requiresBabyInfo: data.pregnancyInfo?.motherType === 'new_mom'
        };
      case 3:
        return {
          requiresFormulaDetails: data.formulaFeedingInfo?.usesFormula === true,
          requiresBottleDetails: data.formulaFeedingInfo?.usesBottles === true,
          requiresPumpingDetails: data.formulaFeedingInfo?.usesPump === true
        };
      default:
        return {};
    }
  }
}