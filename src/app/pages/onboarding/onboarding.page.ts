import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { OnboardingService } from '../../services/onboarding.service';
import { OnboardingData, OnboardingOptions, OnboardingProgress } from '../../models/onboarding.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage implements OnInit, OnDestroy {
  onboardingForm: FormGroup;
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
  
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private onboardingService: OnboardingService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.initializeForm();
  }

  ngOnInit() {
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
      dueDate: [''],
      isFirstChild: [null],
      babyName: [''],
      babyDateOfBirth: [''],
      babyGender: [''],
      babyBirthWeight: [null],
      babyBirthHeight: [null],
      deliveryType: [''],
      gestationalAge: [40],
      babyCurrentWeight: [null],
      weightCheckDate: [''],
      
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
  }

  private updateFormFromData(data: Partial<OnboardingData>): void {
    if (!data) return;
    
    // Update form with current data
    const formUpdate: any = {};
    
    // Personal Info
    if (data.personalInfo) {
      formUpdate.email = data.personalInfo.email;
      formUpdate.fullName = data.personalInfo.fullName;
      formUpdate.phoneNumber = data.personalInfo.phoneNumber;
      formUpdate.employmentStatus = data.personalInfo.employmentStatus;
      formUpdate.languagesSpoken = data.personalInfo.languagesSpoken;
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
    }
  }

  previousStep(): void {
    this.onboardingService.previousStep();
  }

  goToStep(step: number): void {
    this.saveCurrentStepData();
    this.onboardingService.goToStep(step);
  }

  private saveCurrentStepData(): void {
    const formValue = this.onboardingForm.value;
    const stepData = this.extractStepData(this.progress.currentStep, formValue);
    this.onboardingService.updateStepData(this.progress.currentStep, stepData);
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
      // Save final step data
      this.saveCurrentStepData();
      
      // Complete onboarding through service
      await this.onboardingService.completeOnboarding();

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
}