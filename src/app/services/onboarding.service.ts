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
        // If onboarding data exists, transform it back to frontend format
        const backendData = onboardingResponse.data;
        const frontendData = this.transformFromBackendFormat(backendData);
        this.updateOnboardingData(frontendData);
        console.log('Loaded existing onboarding data from backend:', frontendData);
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

    try {
      const backendData = this.transformToBackendFormat(data as OnboardingData);
      this.apiService.saveOnboardingData(backendData).subscribe({
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
    } catch (error) {
      console.warn('Auto-save transformation error:', error);
    }
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
      // Transform data to backend format and save with completion flag
      const backendData = this.transformToBackendFormat(data);
      backendData.complete_onboarding = true;

      // Save final onboarding data to backend
      const saveResponse = await this.apiService.saveOnboardingData(backendData).toPromise();
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
    // Transform data to backend API format and save
    const backendData = this.transformToBackendFormat(data);
    
    try {
      // Save onboarding data to backend
      const response = await this.apiService.saveOnboardingData(backendData).toPromise();
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to save onboarding data');
      }
      
      console.log('Onboarding data saved to backend:', response);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      throw error;
    }
  }

  private async syncUserProfile(data: OnboardingData): Promise<void> {
    const [firstName, ...lastNameParts] = data.personalInfo.fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    const profileUpdate = {
      firstName,
      lastName,
      phoneNumber: data.personalInfo.phoneNumber,
      employmentStatus: data.personalInfo.employmentStatus,
      languages: data.personalInfo.languagesSpoken,
      medicalConditions: data.medicalInfo.motherMedicalConditions,
      allergies: data.medicalInfo.allergies,
      isOnboardingCompleted: true
    };

    await this.apiService.updateUserProfile(profileUpdate).toPromise();
  }

  private async syncBabyProfile(data: OnboardingData): Promise<void> {
    if (!data.pregnancyInfo.babyInfo) return;

    // Handle gender conversion - API only accepts 'male' | 'female'
    const apiGender: 'male' | 'female' = data.pregnancyInfo.babyInfo.gender === 'other' 
      ? 'male' // Default to male if 'other' is selected
      : data.pregnancyInfo.babyInfo.gender as 'male' | 'female';

    const babyData = {
      name: data.pregnancyInfo.babyInfo.name,
      dateOfBirth: data.pregnancyInfo.babyInfo.dateOfBirth,
      gender: apiGender,
      birthWeight: data.pregnancyInfo.babyInfo.birthWeight,
      birthHeight: data.pregnancyInfo.babyInfo.birthHeight
    };

    await this.apiService.createBaby(babyData).toPromise();
  }

  private async syncGrowthRecords(data: OnboardingData): Promise<void> {
    // If baby has current weight different from birth weight, create a growth record
    if (data.pregnancyInfo.babyInfo?.currentWeight && 
        data.pregnancyInfo.babyInfo.currentWeight !== data.pregnancyInfo.babyInfo.birthWeight) {
      
      // First get or create the baby to get babyId
      const babiesResponse = await this.apiService.getUserBabies().toPromise();
      if (babiesResponse?.success && babiesResponse.data.length > 0) {
        const babyId = babiesResponse.data[0].id;
        
        const weightRecord = {
          babyId,
          weight: data.pregnancyInfo.babyInfo.currentWeight,
          notes: 'Weight from onboarding assessment'
        };

        await this.apiService.createWeightRecord(weightRecord).toPromise();
      }
    }
  }

  private async syncNotificationPreferences(data: OnboardingData): Promise<void> {
    await this.apiService.updateNotificationPreferences(data.preferencesInfo.notificationPreferences).toPromise();
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  private transformToBackendFormat(data: OnboardingData): any {
    const [firstName, ...lastNameParts] = data.personalInfo.fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    return {
      personal_info: {
        first_name: firstName,
        last_name: lastName,
        age: this.calculateMotherAge(data.pregnancyInfo.babyInfo?.dateOfBirth), // Calculate mother's age, not baby's
        location: '', // Not collected in frontend
        occupation: data.personalInfo.employmentStatus,
        education_level: data.supportInfo.educationLevel,
        marital_status: this.mapFamilyStructureToMaritalStatus(data.supportInfo.familyStructure),
        family_size: data.supportInfo.familyStructure === 'nuclear' ? 3 : 4, // Estimate
        previous_children: data.pregnancyInfo.isFirstChild ? 0 : 1,
        primary_language: data.personalInfo.languagesSpoken?.[0] || 'English'
      },

      pregnancy_info: {
        gestational_age_weeks: data.pregnancyInfo.babyInfo?.gestationalAge || null,
        birth_date: data.pregnancyInfo.babyInfo?.dateOfBirth || data.pregnancyInfo.dueDate || null,
        birth_type: this.mapDeliveryType(data.pregnancyInfo.babyInfo?.deliveryType),
        birth_weight: data.pregnancyInfo.babyInfo?.birthWeight || null,
        apgar_score: 9, // Default healthy score since not collected in frontend
        pregnancy_complications: [],
        labor_complications: [],
        medications_during_pregnancy: [],
        prenatal_care: true // Assume true
      },

      breastfeeding_info: {
        previous_experience: data.breastfeedingInfo.experienceLevel === 'experienced',
        previous_duration_months: data.breastfeedingInfo.experienceLevel === 'experienced' ? 6 : 0,
        breastfeeding_goals: this.mapBreastfeedingGoals(data.preferencesInfo.milkSupplyGoals),
        main_concerns: data.preferencesInfo.currentChallenges || [],
        current_challenges: data.preferencesInfo.currentChallenges || [],
        pain_level: 0, // Not collected in frontend
        confidence_level: data.breastfeedingInfo.experienceLevel === 'experienced' ? 8 : 5,
        support_received: [data.supportInfo.currentSupportSystem]
      },

      medical_info: {
        medical_conditions: data.medicalInfo.motherMedicalConditions || [],
        current_medications: [], // Not collected in frontend
        allergies: data.medicalInfo.allergies ? [data.medicalInfo.allergies] : [],
        previous_surgeries: [],
        breast_surgeries: data.medicalInfo.nippleAnatomicalIssues ? ['nipple_correction'] : [],
        hormonal_conditions: [],
        mental_health_history: [],
        family_medical_history: []
      },

      feeding_info: {
        current_feeding_method: this.mapFeedingMethod(data.feedingInfo, data.breastfeedingInfo),
        feeding_frequency_per_day: data.breastfeedingInfo.breastfeedingDetails?.directFeedsPerDay || 8,
        feeding_duration_minutes: this.mapTimePerBreast(data.breastfeedingInfo.breastfeedingDetails?.timePerBreast),
        night_feedings_count: Math.floor((data.breastfeedingInfo.breastfeedingDetails?.directFeedsPerDay || 8) / 4),
        formula_supplements: data.feedingInfo.usesFormula || false,
        vitamin_supplements: data.feedingInfo.usesBreastmilkSupplements || false,
        pumping_frequency: data.feedingInfo.pumpingDetails?.sessionsPerDay || 0,
        milk_supply_concerns: data.preferencesInfo.currentChallenges?.includes('Low milk supply') || false,
        weight_gain_concerns: data.preferencesInfo.currentChallenges?.includes('Baby weight concerns') || false
      },

      support_info: {
        partner_support_level: this.mapSupportLevel(data.supportInfo.currentSupportSystem),
        family_support_level: this.mapSupportLevel(data.supportInfo.currentSupportSystem),
        friend_support_level: 5, // Default
        professional_support: ['lactation_consultant'], // Default
        work_status: this.mapEmploymentStatus(data.personalInfo.employmentStatus),
        return_to_work_timeline: '3_months', // Default
        childcare_arrangements: [data.supportInfo.familyStructure],
        main_support_person: 'partner' // Default
      },

      preferences_info: {
        preferred_communication_method: 'app_notifications',
        best_contact_times: ['morning', 'evening'],
        consultation_preferences: ['video_calls', 'chat'],
        privacy_level: 'private',
        data_sharing_consent: true,
        research_participation_consent: false,
        emergency_contact: {
          name: 'Emergency Contact',
          phone: '+1234567890',
          relationship: 'family'
        }
      },

      complete_onboarding: false // Will be set to true when completing
    };
  }

  private calculateAge(birthDateString?: string): number | null {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    const ageInWeeks = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return Math.floor(ageInWeeks / 52); // Convert weeks to years (approximately)
  }

  private calculateMotherAge(babyBirthDateString?: string): number {
    // Since we don't collect mother's birth date, we'll estimate based on common birthing age
    // Most mothers are between 25-35 when giving birth
    if (!babyBirthDateString) {
      return 28; // Default reasonable age
    }
    
    // Add estimated age at birth (average 28) to baby's current age
    const today = new Date();
    const babyBirthDate = new Date(babyBirthDateString);
    const yearsSinceBirth = Math.floor((today.getTime() - babyBirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    return Math.max(18, 28 + yearsSinceBirth); // Minimum age 18, estimated mother age
  }

  private mapFamilyStructureToMaritalStatus(familyStructure: string): string {
    switch (familyStructure) {
      case 'single_parent': return 'single';
      case 'nuclear': return 'married';
      case 'extended': return 'married';
      default: return 'married';
    }
  }

  private mapDeliveryType(deliveryType?: string): string {
    switch (deliveryType) {
      case 'c_section': return 'cesarean';
      case 'assisted': return 'assisted';
      case 'vaginal': return 'vaginal';
      default: return 'vaginal';
    }
  }

  private mapBreastfeedingGoals(milkSupplyGoals?: string): string[] {
    if (!milkSupplyGoals) return ['exclusive_breastfeeding_6_months'];
    if (milkSupplyGoals.includes('exclusive')) return ['exclusive_breastfeeding_6_months'];
    return ['continue_until_1_year'];
  }

  private mapFeedingMethod(feedingInfo: any, breastfeedingInfo: any): string {
    if (!breastfeedingInfo.currentlyBreastfeeding) return 'exclusive_formula';
    if (feedingInfo.usesFormula) return 'mixed_feeding';
    if (feedingInfo.ownsPump && feedingInfo.pumpingDetails?.sessionsPerDay > 0) return 'exclusive_pumping';
    return 'exclusive_breastfeeding';
  }

  private mapTimePerBreast(timePerBreast?: string): number {
    switch (timePerBreast) {
      case '5_min': return 5;
      case '10_min': return 10;
      case '15_min': return 15;
      case '20_min': return 20;
      case 'varies': return 15;
      default: return 15;
    }
  }

  private mapSupportLevel(supportSystem: string): number {
    if (supportSystem.toLowerCase().includes('excellent') || supportSystem.toLowerCase().includes('great')) return 9;
    if (supportSystem.toLowerCase().includes('good')) return 7;
    if (supportSystem.toLowerCase().includes('some')) return 5;
    if (supportSystem.toLowerCase().includes('limited')) return 3;
    return 6; // Default moderate support
  }

  private mapEmploymentStatus(employmentStatus: string): string {
    switch (employmentStatus) {
      case 'employed': return 'maternity_leave';
      case 'unemployed': return 'not_working';
      case 'student': return 'student';
      case 'maternity_leave': return 'maternity_leave';
      default: return 'maternity_leave';
    }
  }

  private transformFromBackendFormat(backendData: any): Partial<OnboardingData> {
    const personalInfo = backendData.personal_info || {};
    const pregnancyInfo = backendData.pregnancy_info || {};
    const breastfeedingInfo = backendData.breastfeeding_info || {};
    const medicalInfo = backendData.medical_info || {};
    const feedingInfo = backendData.feeding_info || {};
    const supportInfo = backendData.support_info || {};
    const preferencesInfo = backendData.preferences_info || {};

    return {
      personalInfo: {
        email: personalInfo.email || '',
        fullName: `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim(),
        phoneNumber: personalInfo.phone_number || '',
        employmentStatus: this.reverseMapEmploymentStatus(supportInfo.work_status),
        languagesSpoken: personalInfo.primary_language ? [personalInfo.primary_language] : []
      },
      pregnancyInfo: {
        motherType: pregnancyInfo.birth_date ? 'new_mom' : 'pregnant',
        dueDate: pregnancyInfo.birth_date || undefined,
        isFirstChild: personalInfo.previous_children === 0,
        babyInfo: pregnancyInfo.birth_date ? {
          name: '', // Not stored in backend format
          dateOfBirth: pregnancyInfo.birth_date,
          gender: (pregnancyInfo.birth_type === 'cesarean' ? 'female' : 'male') as 'male' | 'female' | 'other',
          birthWeight: pregnancyInfo.birth_weight || 0,
          birthHeight: 50, // Default
          deliveryType: this.reverseMapDeliveryType(pregnancyInfo.birth_type),
          gestationalAge: pregnancyInfo.gestational_age_weeks || 40
        } : undefined
      },
      breastfeedingInfo: {
        experienceLevel: breastfeedingInfo.previous_experience ? 'experienced' : 'first_time',
        currentlyBreastfeeding: feedingInfo.current_feeding_method !== 'exclusive_formula',
        breastfeedingDetails: {
          directFeedsPerDay: feedingInfo.feeding_frequency_per_day || 8,
          latchQuality: 'deep', // Default
          offersBothBreasts: true, // Default
          timePerBreast: this.reverseMapTimePerBreast(feedingInfo.feeding_duration_minutes),
          breastfeedingDuration: '6-12 months'
        },
        babyOutput: {
          peeCount24h: 6, // Default
          poopCount24h: 3 // Default
        }
      },
      medicalInfo: {
        motherMedicalConditions: medicalInfo.medical_conditions || [],
        motherMedicalConditionsOther: '',
        allergies: medicalInfo.allergies ? medicalInfo.allergies.join(', ') : '',
        nippleAnatomicalIssues: medicalInfo.breast_surgeries && medicalInfo.breast_surgeries.length > 0,
        nippleIssuesDescription: '',
        babyMedicalConditions: '',
        babyHospitalized: false,
        babyHospitalizationReason: ''
      },
      feedingInfo: {
        usesFormula: feedingInfo.formula_supplements || false,
        usesBottle: feedingInfo.pumping_frequency > 0,
        ownsPump: feedingInfo.pumping_frequency > 0,
        pumpingDetails: feedingInfo.pumping_frequency > 0 ? {
          pumpType: 'electric_double',
          sessionsPerDay: feedingInfo.pumping_frequency,
          averageOutput: 150, // Default
          pumpingDuration: 20, // Default
          storageMethod: ['Refrigerator (fresh milk)']
        } : undefined,
        usesBreastmilkSupplements: feedingInfo.vitamin_supplements || false
      },
      supportInfo: {
        currentSupportSystem: `Partner support level: ${supportInfo.partner_support_level}/10`,
        familyStructure: this.reverseMapFamilyStructure(supportInfo.childcare_arrangements),
        educationLevel: personalInfo.education_level || 'bachelors',
        householdIncome: '50k_75k' // Default
      },
      preferencesInfo: {
        currentChallenges: breastfeedingInfo.current_challenges || [],
        expectationsFromProgram: 'Looking forward to expert guidance and support',
        milkSupplyGoals: breastfeedingInfo.breastfeeding_goals ? breastfeedingInfo.breastfeeding_goals.join(', ') : '',
        notificationPreferences: {
          articleUpdates: true,
          consultationReminders: true,
          groupMessages: true,
          growthReminders: true,
          expertMessages: true,
          pumpingReminders: false
        },
        topicsOfInterest: ['Newborn care basics', 'Pumping and storage']
      },
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
      isCompleted: backendData.completed_at ? true : false,
      completedAt: backendData.completed_at ? new Date(backendData.completed_at) : undefined
    };
  }

  private reverseMapEmploymentStatus(workStatus: string): 'employed' | 'unemployed' | 'maternity_leave' | 'student' {
    switch (workStatus) {
      case 'maternity_leave': return 'employed';
      case 'not_working': return 'unemployed';
      case 'student': return 'student';
      case 'working_part_time': return 'employed';
      case 'working_full_time': return 'employed';
      default: return 'employed';
    }
  }

  private reverseMapDeliveryType(birthType: string): 'vaginal' | 'c_section' | 'assisted' {
    switch (birthType) {
      case 'cesarean': return 'c_section';
      case 'assisted': return 'assisted';
      case 'vbac': return 'vaginal';
      default: return 'vaginal';
    }
  }

  private reverseMapTimePerBreast(duration: number): '5_min' | '10_min' | '15_min' | '20_min' | 'varies' {
    if (duration <= 5) return '5_min';
    if (duration <= 10) return '10_min';
    if (duration <= 15) return '15_min';
    if (duration <= 20) return '20_min';
    return 'varies';
  }

  private reverseMapFamilyStructure(childcareArrangements: string[]): 'nuclear' | 'extended' | 'single_parent' | 'other' {
    if (!childcareArrangements || childcareArrangements.length === 0) return 'nuclear';
    const arrangement = childcareArrangements[0];
    if (arrangement.includes('extended')) return 'extended';
    if (arrangement.includes('single')) return 'single_parent';
    return 'nuclear';
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