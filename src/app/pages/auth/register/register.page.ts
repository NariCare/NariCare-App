import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  currentStep = 1;
  totalSteps = 2;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
      password: ['', [Validators.required, Validators.minLength(6)]],
      motherType: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      whatsappNumber: ['', [Validators.required]],
      dueDate: ['']
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      tierType: ['basic', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {}

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

  isPregnantMother(): boolean {
    return this.registerForm.get('motherType')?.value === 'pregnant';
  }

  isNewMother(): boolean {
    return this.registerForm.get('motherType')?.value === 'new_mom';
  }

  nextStep() {
    if (this.currentStep === 1) {
      const personalFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
      const isPersonalInfoValid = personalFields.every(field => this.registerForm.get(field)?.valid);
      
      if (isPersonalInfoValid) {
        this.currentStep = 2;
      } else {
        this.markFieldsAsTouched(personalFields);
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Creating your account...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.registerForm.value;
        await this.authService.register(formValue.email, formValue.password, {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          phoneNumber: formValue.phoneNumber,
          tier: { type: formValue.tierType } as any
        });
        
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
        const toast = await this.toastController.create({
          message: error.message || 'Registration failed. Please try again.',
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
      await this.authService.signInWithGoogle();
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
      await this.authService.signInWithFacebook();
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

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  private markFieldsAsTouched(fields: string[]) {
    fields.forEach(field => {
      this.registerForm.get(field)?.markAsTouched();
    });
  }

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 6 characters`;
    }
    if (control?.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }
}