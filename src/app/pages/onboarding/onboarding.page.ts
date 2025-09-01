import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { OnboardingService } from '../../services/onboarding.service';
import { BackendAuthService } from '../../services/backend-auth.service';
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
        }
      })
    );
    
    // Subscribe to onboarding progress
    this.subscriptions.push(
      this.onboardingService.progress$.subscribe(progress => {
        this.progress = progress;
        this.updateConditionalRequirements();
      })
    );
    
    // Subscribe to onboarding data changes to update form
    this.subscriptions.push(
      this.onboardingService.onboardingData$.subscribe(data => {
        this.updateFormFromData(data);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
      babyName: [''],
      babyDateOfBirth: [new Date().toISOString()],
      babyGender: [''],
      babyBirthWeight: [null],
      babyBirthHeight: [null],
      deliveryType: [''],
      gestationalAge: [40],
      babyCurrentWeight: [null],
      weightCheckDate: [new Date().toISOString()],
      
      // Step 3: Breastfeeding Details
      experienceLevel: ['', [Validators.required]],
      currentlyBreastfeeding: [null],
      directFeedsPerDay: [null],
      latchQuality: [''],
      offersBothBreasts: [null],
      timePerBreast: [''],
      breastfeedingDuration: [''],
      peeCount24h: [null],
      poopCount24h: [null],
      
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
      notificationPreferences: this.formBuilder.group({
        articleUpdates: [true],
        consultationReminders: [true],
        groupMessages: [true],
        growthReminders: [true],
        expertMessages: [true],
        pumpingReminders: [false]
      }),
      topicsOfInterest: [[]]
    });

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
      // Restore form values
      this.onboardingForm.patchValue(savedData.formValues, { emitEvent: false });
      
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
      }, 100);
    }
  }

  previousStep(): void {
    this.onboardingService.previousStep();
  }

  goToStep(step: number): void {
    this.saveCurrentStepData();
    this.onboardingService.goToStep(step);
    
    // When reaching the final step, save all form data to ensure complete validation
    if (step === this.progress.totalSteps) {
      setTimeout(() => {
        this.saveAllFormDataToService();
      }, 100);
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
            babyInfo: {
              name: formValue.babyName,
              dateOfBirth: formValue.babyDateOfBirth,
              gender: formValue.babyGender,
              birthWeight: formValue.babyBirthWeight,
              birthHeight: formValue.babyBirthHeight,
              deliveryType: formValue.deliveryType,
              gestationalAge: formValue.gestationalAge,
              currentWeight: formValue.babyCurrentWeight,
              weightCheckDate: formValue.weightCheckDate
            }
          })
        };
      case 3:
        return {
          experienceLevel: formValue.experienceLevel,
          currentlyBreastfeeding: formValue.currentlyBreastfeeding,
          ...(formValue.currentlyBreastfeeding && {
            breastfeedingDetails: {
              directFeedsPerDay: formValue.directFeedsPerDay,
              latchQuality: formValue.latchQuality,
              offersBothBreasts: formValue.offersBothBreasts,
              timePerBreast: formValue.timePerBreast,
              breastfeedingDuration: formValue.breastfeedingDuration
            }
          }),
          babyOutput: {
            peeCount24h: formValue.peeCount24h,
            poopCount24h: formValue.poopCount24h
          }
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
          notificationPreferences: formValue.notificationPreferences,
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
      
      // Complete onboarding through service
      await this.onboardingService.completeOnboarding();

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

  isValueSelected(formControlName: string, value: string): boolean {
    const values = this.onboardingForm.get(formControlName)?.value || [];
    return values.includes(value);
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

}