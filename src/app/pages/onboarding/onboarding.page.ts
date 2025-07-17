import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Baby } from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
})
export class OnboardingPage implements OnInit {
  currentStep = 1;
  totalSteps = 3;
  onboardingForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.onboardingForm = this.formBuilder.group({
      // Baby Information
      babyName: ['', [Validators.required]],
      babyGender: ['', [Validators.required]],
      dateOfBirth: [new Date().toISOString(), [Validators.required]],
      birthWeight: ['', [Validators.required, Validators.min(0.5), Validators.max(10)]],
      birthHeight: ['', [Validators.required, Validators.min(20), Validators.max(70)]],
      
      // Breastfeeding Experience
      breastfeedingExperience: ['', [Validators.required]],
      currentChallenges: [[]],
      feedingSchedule: ['', [Validators.required]],
      
      // Preferences
      notificationPreferences: this.formBuilder.group({
        articleUpdates: [true],
        callReminders: [true],
        groupMessages: [true],
        growthReminders: [true],
        expertMessages: [true]
      }),
      preferredTopics: [[]]
    });
  }

  ngOnInit() {}

  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        const babyFields = ['babyName', 'babyGender', 'dateOfBirth', 'birthWeight', 'birthHeight'];
        return this.validateFields(babyFields);
      case 2:
        const experienceFields = ['breastfeedingExperience', 'feedingSchedule'];
        return this.validateFields(experienceFields);
      case 3:
        return true; // Preferences are optional
      default:
        return false;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    fieldNames.forEach(fieldName => {
      const control = this.onboardingForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });
    return isValid;
  }

  async completeOnboarding() {
    if (this.onboardingForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Setting up your profile...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.onboardingForm.value;
        
        // Create baby object
        const baby: Baby = {
          id: uuidv4(),
          name: formValue.babyName,
          dateOfBirth: new Date(formValue.dateOfBirth),
          gender: formValue.babyGender,
          birthWeight: parseFloat(formValue.birthWeight),
          birthHeight: parseFloat(formValue.birthHeight)
        };

        // Update user profile
        await this.authService.updateUserProfile({
          babies: [baby],
          notificationPreferences: formValue.notificationPreferences,
          isOnboardingCompleted: true
        });

        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: 'Welcome to NariCare! Your profile has been set up successfully.',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        this.router.navigate(['/tabs/dashboard']);

      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Failed to complete onboarding. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.onboardingForm.controls).forEach(key => {
      this.onboardingForm.get(key)?.markAsTouched();
    });
  }

  toggleChallenge(challenge: string) {
    const currentChallenges = this.onboardingForm.get('currentChallenges')?.value || [];
    const index = currentChallenges.indexOf(challenge);
    
    if (index > -1) {
      currentChallenges.splice(index, 1);
    } else {
      currentChallenges.push(challenge);
    }
    
    this.onboardingForm.patchValue({ currentChallenges });
  }

  toggleTopic(topic: string) {
    const currentTopics = this.onboardingForm.get('preferredTopics')?.value || [];
    const index = currentTopics.indexOf(topic);
    
    if (index > -1) {
      currentTopics.splice(index, 1);
    } else {
      currentTopics.push(topic);
    }
    
    this.onboardingForm.patchValue({ preferredTopics: currentTopics });
  }

  isChallengeSelected(challenge: string): boolean {
    const challenges = this.onboardingForm.get('currentChallenges')?.value || [];
    return challenges.includes(challenge);
  }

  isTopicSelected(topic: string): boolean {
    const topics = this.onboardingForm.get('preferredTopics')?.value || [];
    return topics.includes(topic);
  }

  getErrorMessage(field: string): string {
    const control = this.onboardingForm.get(field);
    if (control?.hasError('required')) {
      return `This field is required`;
    }
    if (control?.hasError('min')) {
      return `Value is too low`;
    }
    if (control?.hasError('max')) {
      return `Value is too high`;
    }
    return '';
  }
}