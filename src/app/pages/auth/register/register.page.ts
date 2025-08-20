import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { BackendAuthService } from '../../../services/backend-auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private backendAuthService: BackendAuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''], // Optional
      whatsappSameAsPhone: [true], // Checkbox for WhatsApp same as phone
      whatsappNumber: [''], // Conditional WhatsApp number field
      motherType: [''], // Optional
      dueDate: [''], // Conditional - required for pregnant mothers
      birthDate: [''], // Conditional - required for new mothers
      babyGender: [''], // Conditional - required for new mothers
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      tierType: ['basic', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: [this.passwordMatchValidator, this.conditionalValidator] });
  }

  ngOnInit() {
    // Listen for motherType changes to trigger conditional validation
    this.registerForm.get('motherType')?.valueChanges.subscribe(() => {
      // Clear conditional fields when mother type changes
      this.registerForm.get('dueDate')?.setValue('');
      this.registerForm.get('birthDate')?.setValue('');
      this.registerForm.get('babyGender')?.setValue('');
      
      // Trigger validation update
      this.registerForm.updateValueAndValidity();
    });

    // Listen for phone number changes to auto-fill WhatsApp number
    this.registerForm.get('phoneNumber')?.valueChanges.subscribe((phoneNumber) => {
      const whatsappSameAsPhone = this.registerForm.get('whatsappSameAsPhone')?.value;
      if (whatsappSameAsPhone && phoneNumber) {
        this.registerForm.get('whatsappNumber')?.setValue(phoneNumber);
      }
    });

    // Listen for WhatsApp checkbox changes
    this.registerForm.get('whatsappSameAsPhone')?.valueChanges.subscribe((sameAsPhone) => {
      if (sameAsPhone) {
        const phoneNumber = this.registerForm.get('phoneNumber')?.value;
        this.registerForm.get('whatsappNumber')?.setValue(phoneNumber || '');
      } else {
        this.registerForm.get('whatsappNumber')?.setValue('');
      }
    });
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
    const birthDate = form.get('birthDate');
    const babyGender = form.get('babyGender');

    // Helper function to clear conditional errors while preserving other errors
    const clearConditionalError = (control: any) => {
      if (control?.hasError('conditionalRequired')) {
        const errors = { ...control.errors };
        delete errors.conditionalRequired;
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    };

    // Clear existing conditional errors first
    clearConditionalError(dueDate);
    clearConditionalError(birthDate);
    clearConditionalError(babyGender);

    // Apply conditional validation
    if (motherType === 'pregnant') {
      if (!dueDate?.value) {
        const errors = dueDate?.errors || {};
        dueDate?.setErrors({ ...errors, conditionalRequired: true });
      }
    } else if (motherType === 'new_mom') {
      if (!birthDate?.value) {
        const errors = birthDate?.errors || {};
        birthDate?.setErrors({ ...errors, conditionalRequired: true });
      }
      if (!babyGender?.value) {
        const errors = babyGender?.errors || {};
        babyGender?.setErrors({ ...errors, conditionalRequired: true });
      }
    }

    return null;
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
        const registrationData: any = {
          email: formValue.email,
          password: formValue.password,
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          phoneNumber: formValue.phoneNumber,
          motherType: formValue.motherType,
          tier: formValue.tierType
        };

        // Handle WhatsApp number
        if (formValue.whatsappSameAsPhone && formValue.phoneNumber) {
          registrationData.whatsappNumber = formValue.phoneNumber;
        } else if (!formValue.whatsappSameAsPhone && formValue.whatsappNumber) {
          registrationData.whatsappNumber = formValue.whatsappNumber;
        }

        // Add conditional fields based on mother type
        if (formValue.motherType === 'pregnant' && formValue.dueDate) {
          registrationData.dueDate = this.formatDateForApi(formValue.dueDate);
        } else if (formValue.motherType === 'new_mom') {
          if (formValue.birthDate) {
            registrationData.birthDate = this.formatDateForApi(formValue.birthDate);
          }
          if (formValue.babyGender) {
            registrationData.babyGender = formValue.babyGender;
          }
        }

        await this.backendAuthService.register(registrationData);
        
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
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('conditionalRequired')) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(field)} must be at least 6 characters`;
    }
    if (control?.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phoneNumber: 'Phone number',
      motherType: 'Mother type',
      dueDate: 'Due date',
      birthDate: 'Baby\'s birth date',
      babyGender: 'Baby\'s gender',
      password: 'Password',
      confirmPassword: 'Confirm password',
      tierType: 'Program type',
      agreeToTerms: 'Terms agreement'
    };
    return labels[field] || field;
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private formatDateForApi(dateValue: string): string {
    // ion-datetime returns ISO string, extract just the date part
    if (dateValue && dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    return dateValue;
  }
}