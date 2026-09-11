import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { BackendAuthService } from '../../../services/backend-auth.service';
import { ApiService } from '../../../services/api.service';

interface StepDefinition {
  id: string;
  title: string;
  controls: string[];
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  currentStep = 0;
  submitting = false;

  steps: StepDefinition[] = [
    { id: 'welcome', title: 'Welcome to NariCare', controls: [] },
    { id: 'name', title: 'What should we call you?', controls: ['fullName'] },
    { id: 'phone', title: 'Phone number', controls: ['phoneNumber'] },
    { id: 'email', title: 'Your email address', controls: ['email'] },
    { id: 'password', title: 'Create a password', controls: ['password', 'confirmPassword'] },
    { id: 'stage', title: 'Where are you in your journey?', controls: ['motherType'] },
    { id: 'date', title: '', controls: ['dueDate', 'deliveryDate'] },
    { id: 'goals', title: 'What do you want to focus on?', controls: ['goals'] },
    { id: 'finish', title: 'Almost there', controls: ['tierType', 'agreeToTerms'] }
  ];

  goalsOptions = [
    { key: 'learn_basics', label: 'Learn the basics of breastfeeding', icon: 'Feed.svg' },
    { key: 'feeding_help', label: 'Get help with feeding pain or problems', icon: 'Fed directly.svg' },
    { key: 'track_feeds', label: 'Track my baby\u2019s feeds and growth', icon: 'Tracker.svg' }
  ];

  motherTypes = [
    { key: 'pregnant', label: 'I\u2019m pregnant', icon: 'Mother_icon.svg' },
    { key: 'new_mom', label: 'I\u2019m a new mother', icon: 'Baby boy.svg' }
  ];

  countryCodeOptions = ['+91', '+1', '+44', '+61', '+971', '+65'];
  selectedCountryCode = '+91';

  constructor(
    private formBuilder: FormBuilder,
    private backendAuthService: BackendAuthService,
    private apiService: ApiService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, this.nameInputValidator]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, this.emailValidator]],
      phoneNumber: ['', [Validators.required, this.phoneNumberValidator]],
      whatsappSameAsPhone: [true],
      whatsappNumber: ['', [this.phoneNumberValidator]],
      motherType: [''],
      dueDate: [''],
      deliveryDate: [''],
      goals: [[], [this.minOneGoalValidator]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      tierType: ['basic', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: [this.passwordMatchValidator, this.conditionalValidator] });
  }

  ngOnInit() {
    this.registerForm.get('fullName')?.valueChanges.subscribe((fullName) => {
      if (fullName && fullName.trim().includes(' ')) {
        const first = this.extractFirstName(fullName);
        const last = this.extractLastName(fullName);

        if (this.registerForm.get('firstName')?.value !== first) {
          this.registerForm.get('firstName')?.setValue(first, { emitEvent: false });
        }
        if (this.registerForm.get('lastName')?.value !== last) {
          this.registerForm.get('lastName')?.setValue(last, { emitEvent: false });
        }
      }
    });

    this.registerForm.get('motherType')?.valueChanges.subscribe(() => {
      this.registerForm.get('dueDate')?.setValue('');
      this.registerForm.get('deliveryDate')?.setValue('');
      this.registerForm.updateValueAndValidity();
    });

    this.registerForm.get('phoneNumber')?.valueChanges.subscribe((phoneNumber) => {
      const whatsappSameAsPhone = this.registerForm.get('whatsappSameAsPhone')?.value;
      if (whatsappSameAsPhone && phoneNumber) {
        this.registerForm.get('whatsappNumber')?.setValue(phoneNumber);
      }
    });

    this.registerForm.get('whatsappSameAsPhone')?.valueChanges.subscribe((sameAsPhone) => {
      if (sameAsPhone) {
        const phoneNumber = this.registerForm.get('phoneNumber')?.value;
        this.registerForm.get('whatsappNumber')?.setValue(phoneNumber || '');
      } else {
        this.registerForm.get('whatsappNumber')?.setValue('');
      }
    });
  }

  get stepCount(): number {
    return this.steps.length;
  }

  get progressPercent(): number {
    return (this.currentStep / (this.steps.length - 1)) * 100;
  }

  get isWelcomeStep(): boolean {
    return this.currentStep === 0;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  get stepTitle(): string {
    return this.steps[this.currentStep].title;
  }

  get isPregnant(): boolean {
    return this.registerForm.get('motherType')?.value === 'pregnant';
  }

  get selectedGoals(): string[] {
    return this.registerForm.get('goals')?.value || [];
  }

  isStepValid(stepIndex: number): boolean {
    const step = this.steps[stepIndex];
    switch (step.id) {
      case 'welcome':
        return true;
      case 'name':
        return this.isControlValid('fullName');
      case 'phone':
        return this.isControlValid('phoneNumber');
      case 'email':
        return this.isControlValid('email');
      case 'password':
        return this.isControlValid('password') && this.isControlValid('confirmPassword');
      case 'stage':
        return Boolean(this.registerForm.get('motherType')?.value);
      case 'date':
        return this.isPregnant
          ? this.isControlValid('dueDate')
          : this.isControlValid('deliveryDate');
      case 'goals':
        return Boolean(this.selectedGoals.length);
      case 'finish':
        return this.isControlValid('tierType') && Boolean(this.registerForm.get('agreeToTerms')?.value);
      default:
        return true;
    }
  }

  canGoNext(): boolean {
    return this.isStepValid(this.currentStep) && !this.isWelcomeStep && !this.submitting;
  }

  canGoBack(): boolean {
    return this.currentStep > 0 && !this.submitting;
  }

  nextStep() {
    if (!this.isStepValid(this.currentStep)) {
      this.markStepFieldsTouched(this.currentStep);
      return;
    }
    if (!this.isLastStep) {
      this.currentStep += 1;
    } else {
      this.onSubmit();
    }
  }

  goToStep(stepIndex: number) {
    if (stepIndex >= 0 && stepIndex < this.steps.length && !this.submitting) {
      this.currentStep = stepIndex;
    }
  }

  backStep() {
    if (this.canGoBack()) {
      this.currentStep -= 1;
    }
  }

  selectMotherType(key: string) {
    this.registerForm.get('motherType')?.setValue(key);
  }

  toggleGoal(key: string) {
    const goals = [...this.selectedGoals];
    const index = goals.indexOf(key);
    if (index >= 0) {
      goals.splice(index, 1);
    } else {
      goals.push(key);
    }
    this.registerForm.get('goals')?.setValue(goals);
    this.registerForm.get('goals')?.markAsTouched();
  }

  onCountryChange(event: any) {
    this.selectedCountryCode = event.detail.value;
    this.registerForm.get('phoneNumber')?.updateValueAndValidity();
    this.registerForm.get('whatsappNumber')?.updateValueAndValidity();
  }

  emailValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const email = value.trim();

    if (email.length > 254) {
      return { invalidEmail: true };
    }

    const atIndex = email.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === email.length - 1) {
      return { invalidEmail: true };
    }

    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);

    if (local.length > 64) {
      return { invalidEmail: true };
    }

    if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) {
      return { invalidEmail: true };
    }
    if (local.startsWith('.') || local.endsWith('.') || /\.{2,}/.test(local)) {
      return { invalidEmail: true };
    }

    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(domain)) {
      return { invalidEmail: true };
    }

    const tld = domain.split('.').pop() || '';
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
      return { invalidEmail: true };
    }

    return null;
  }

  phoneNumberValidator = (control: any): { [key: string]: boolean } | null => {
    const value = control.value;
    if (!value) return null;

    const digitsOnly = value.replace(/\D/g, '');
    const isIndia = this.selectedCountryCode === '+91';

    if (!/^\d+$/.test(digitsOnly)) {
      return { invalidFormat: true };
    }

    if (isIndia) {
      if (digitsOnly.length !== 10) {
        return { indRequiredTenDigits: true };
      }
      if (!/^[6-9]/.test(digitsOnly)) {
        return { indMustStartWith69: true };
      }
      return null;
    }

    if (digitsOnly.length < 10) {
      return { tooShort: true };
    }

    if (digitsOnly.length > 15) {
      return { tooLong: true };
    }

    return null;
  };

  nameInputValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const name = `${value}`;
    const trimmed = name.trim();

    if (!trimmed) {
      return { required: true };
    }

    const normalized = trimmed.replace(/[ \t\r\n]+/g, ' ');
    const words = normalized.split(/[\s]+/).filter(Boolean);

    if (words.length < 2) {
      return { requireFullName: true };
    }

    if (!/^[\p{L}]+(?:[ \-'][\p{L}]+)*$/u.test(normalized)) {
      return { invalidCharacters: true };
    }

    if (normalized.length > 50) {
      return { nameTooLong: true };
    }

    return null;
  }

  extractFirstName(fullName: string): string {
    const parts = `${fullName}`.trim().replace(/[ \t\r\n]+/g, ' ').split(' ');
    return parts.slice(0, -1).join(' ') || '';
  }

  extractLastName(fullName: string): string {
    const parts = `${fullName}`.trim().replace(/[ \t\r\n]+/g, ' ').split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  minOneGoalValidator(control: any) {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { noGoals: true };
    }
    return null;
  }

  passwordStrengthValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    if (/\s/.test(value)) {
      return { passwordContainsSpace: true };
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    if (hasUpperCase && hasLowerCase && hasNumber) {
      return null;
    }

    return { passwordStrength: true };
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
    } else if (confirmPassword?.hasError('mismatch')) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  conditionalValidator(form: FormGroup) {
    const motherType = form.get('motherType')?.value;
    const dueDate = form.get('dueDate');
    const deliveryDate = form.get('deliveryDate');

    const clearConditionalError = (control: any, errorType: string) => {
      if (control?.hasError(errorType)) {
        const errors = { ...control.errors };
        delete errors[errorType];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    };

    clearConditionalError(dueDate, 'conditionalRequired');
    clearConditionalError(dueDate, 'pastDate');
    clearConditionalError(deliveryDate, 'conditionalRequired');
    clearConditionalError(deliveryDate, 'futureDate');

    if (motherType === 'pregnant') {
      if (!dueDate?.value) {
        const errors = dueDate?.errors || {};
        dueDate?.setErrors({ ...errors, conditionalRequired: true });
      } else {
        const selectedDate = new Date(dueDate.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          const errors = dueDate?.errors || {};
          dueDate?.setErrors({ ...errors, pastDate: true });
        }
      }
    } else if (motherType === 'new_mom') {
      if (!deliveryDate?.value) {
        const errors = deliveryDate?.errors || {};
        deliveryDate?.setErrors({ ...errors, conditionalRequired: true });
      } else {
        const selectedDate = new Date(deliveryDate.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          const errors = deliveryDate?.errors || {};
          deliveryDate?.setErrors({ ...errors, futureDate: true });
        }
      }
    }

    return null;
  }

  async onSubmit() {
    if (this.registerForm.valid && !this.submitting) {
      this.submitting = true;
      const loading = await this.loadingController.create({
        message: 'Creating your account...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.registerForm.value;
        const registrationData: any = {
          email: formValue.email,
          password: formValue.password,
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          phoneNumber: formValue.phoneNumber,
          countryCode: this.selectedCountryCode,
          motherType: formValue.motherType,
          tier: formValue.tierType
        };

        if (formValue.whatsappSameAsPhone && formValue.phoneNumber) {
          registrationData.whatsappNumber = formValue.phoneNumber;
        } else if (!formValue.whatsappSameAsPhone && formValue.whatsappNumber) {
          registrationData.whatsappNumber = formValue.whatsappNumber;
        }

        if (formValue.motherType === 'pregnant' && formValue.dueDate) {
          registrationData.dueDate = this.formatDateForApi(formValue.dueDate);
        }

        const isNewMom = formValue.motherType === 'new_mom' && formValue.deliveryDate;

        await this.backendAuthService.register(registrationData);

        if (isNewMom) {
          await this.persistNewMomOnboarding(formValue.deliveryDate, formValue.goals);
        } else if (formValue.motherType === 'pregnant' && Array.isArray(formValue.goals) && formValue.goals.length > 0) {
          await this.persistPregnantOnboarding(formValue.goals);
        }

        await loading.dismiss();

        const toast = await this.toastController.create({
          message: 'Account created successfully! Welcome to NariCare.',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

      } catch (error: any) {
        await loading.dismiss();

        let errorMessage = 'Registration failed. Please try again.';

        if (error.error && error.error.details && Array.isArray(error.error.details)) {
          const validationErrors = error.error.details.map((detail: any) => detail.message).join(', ');
          errorMessage = validationErrors;
        } else if (error.message) {
          errorMessage = error.message;
        }

        const toast = await this.toastController.create({
          message: errorMessage,
          duration: 4000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      } finally {
        this.submitting = false;
      }
    } else {
      this.markStepFieldsTouched(this.currentStep);
    }
  }

  private async persistPregnantOnboarding(goals: string[]) {
    try {
      await firstValueFrom(this.apiService.saveOnboardingData({
        pregnancyInfo: {
          motherType: 'pregnant',
          expectedDueDate: this.registerForm.get('dueDate')?.value || null
        },
        challengesAndExpectationsInfo: {
          breastfeedingGoals: goals
        }
      }));
    } catch {
      // Registration already succeeded; onboarding data is best-effort.
    }
  }

  private async persistNewMomOnboarding(deliveryDate: string, goals: string[]) {
    try {
      await firstValueFrom(this.apiService.saveOnboardingData({
        pregnancyInfo: {
          motherType: 'new_mom',
          babies: [{
            dateOfBirth: this.formatDateForApi(deliveryDate)
          }]
        },
        challengesAndExpectationsInfo: {
          currentChallenges: goals
        }
      }));
    } catch {
      // Registration already succeeded; onboarding data is best-effort.
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  navigateToLogin() {
    this.router.navigate(['/auth/login']);
  }

  async signInWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Signing up with Google...',
      translucent: true
    });
    await loading.present();

    try {
      await this.backendAuthService.signInWithGoogle();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Google sign-up failed. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  async signInWithFacebook() {
    const loading = await this.loadingController.create({
      message: 'Signing up with Facebook...',
      translucent: true
    });
    await loading.present();

    try {
      await this.backendAuthService.signInWithFacebook();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Facebook sign-up failed. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  private markStepFieldsTouched(stepIndex: number) {
    this.steps[stepIndex].controls.forEach(field => {
      this.registerForm.get(field)?.markAsTouched();
    });
  }

  isControlValid(field: string): boolean {
    const control = this.registerForm.get(field);
    return Boolean(control?.value) && control?.valid === true;
  }

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('conditionalRequired')) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('requireFullName')) {
      return 'Please enter your full name (first and last name)';
    }
    if (control?.hasError('invalidCharacters')) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    if (control?.hasError('nameTooLong')) {
      return 'Name cannot exceed 50 characters';
    }
    if (control?.hasError('pastDate')) {
      return 'Due date cannot be in the past';
    }
    if (control?.hasError('futureDate')) {
      return 'Delivery date cannot be in the future';
    }
    if (control?.hasError('invalidEmail')) {
      return 'Please enter a valid email address with proper domain (e.g., user@example.com)';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(field)} must be at least 8 characters`;
    }
    if (control?.hasError('passwordContainsSpace')) {
      return 'Password cannot contain spaces';
    }
    if (control?.hasError('passwordStrength')) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    if (control?.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    if (control?.hasError('invalidFormat')) {
      return 'Phone number must contain only digits';
    }
    if (control?.hasError('indRequiredTenDigits')) {
      return 'Indian phone numbers must be exactly 10 digits';
    }
    if (control?.hasError('indMustStartWith69')) {
      return 'Indian mobile numbers must start with 6, 7, 8, or 9';
    }
    if (control?.hasError('tooShort')) {
      return 'Phone number must be at least 10 digits';
    }
    if (control?.hasError('tooLong')) {
      return 'Phone number cannot exceed 15 digits';
    }
    if (control?.hasError('noGoals')) {
      return 'Select at least one goal to continue';
    }
    return '';
  }

  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Full name',
      lastName: 'Last name',
      fullName: 'Full name',
      email: 'Email',
      phoneNumber: 'Phone number',
      whatsappNumber: 'WhatsApp number',
      motherType: 'Mother type',
      dueDate: 'Due date',
      deliveryDate: 'Delivery date',
      password: 'Password',
      confirmPassword: 'Confirm password',
      tierType: 'Program type',
      agreeToTerms: 'Terms agreement'
    };
    return labels[field] || field;
  }

  formatPhoneNumber(event: any, fieldName: string) {
    const value = event.detail.value;

    const digitsOnly = value.replace(/\D/g, '');

    const maxDigits = this.selectedCountryCode === '+91' ? 10 : 15;

    const limitedDigits = digitsOnly.substring(0, maxDigits);

    this.registerForm.get(fieldName)?.setValue(limitedDigits, { emitEvent: false });
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getMaxDueDate(): string {
    const max = new Date();
    max.setFullYear(max.getFullYear() + 1);
    return max.toISOString().split('T')[0];
  }

  getMinDeliveryDate(): string {
    const min = new Date();
    min.setFullYear(min.getFullYear() - 3);
    return min.toISOString().split('T')[0];
  }

  onDateSelect(event: any, fieldName: string) {
    const value = event.detail.value;
    this.registerForm.get(fieldName)?.setValue(value);
    this.registerForm.get(fieldName)?.markAsTouched();
  }

  formatDisplayDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getGoalsLabel(keys: string[]): string {
    return keys
      .map(key => this.goalsOptions.find(goal => goal.key === key)?.label || key)
      .join(', ');
  }

  private formatDateForApi(dateValue: string): string {
    if (!dateValue) return dateValue;
    return dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  }
}