import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage implements OnInit {
  resetPasswordForm: FormGroup;
  token: string = '';
  showPassword = false;
  showConfirmPassword = false;
  isSubmitted = false;
  isLoading = false;
  isValidToken = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private apiService: ApiService
  ) {
    this.resetPasswordForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Get token from query params
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      
      if (this.token) {
        // Show form directly - token validation can be done on submit
        this.isValidToken = true;
      } else {
        this.showInvalidTokenError();
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword.hasError('passwordMismatch')) {
        delete confirmPassword.errors!['passwordMismatch'];
        if (Object.keys(confirmPassword.errors!).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null;
  }

  async validateToken() {
    const loading = await this.loadingController.create({
      message: 'Validating reset token...'
    });
    await loading.present();

    this.apiService.validateResetToken(this.token).subscribe({
      next: async (response) => {
        await loading.dismiss();
        if (response.success) {
          this.isValidToken = true;
        } else {
          this.showInvalidTokenError();
        }
      },
      error: async (error) => {
        await loading.dismiss();
        this.showInvalidTokenError();
      }
    });
  }

  async showInvalidTokenError() {
    const toast = await this.toastController.create({
      message: 'Invalid or expired reset token. Please request a new password reset.',
      duration: 5000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
    
    // Redirect to forgot password page
    setTimeout(() => {
      this.router.navigate(['/auth/forgot-password']);
    }, 2000);
  }

  get errorControl() {
    return this.resetPasswordForm.controls;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('minlength')) {
      return 'Password must be at least 8 characters long';
    }
    if (field?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    this.isSubmitted = true;
    
    if (this.resetPasswordForm.valid && this.isValidToken) {
      this.isLoading = true;
      const loading = await this.loadingController.create({
        message: 'Resetting password...'
      });
      await loading.present();

      const { newPassword, confirmPassword } = this.resetPasswordForm.value;

      this.apiService.resetPassword(this.token, newPassword, confirmPassword).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isLoading = false;
          
          if (response.success) {
            const toast = await this.toastController.create({
              message: response.message || 'Password reset successfully!',
              duration: 3000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
            
            // Navigate to login page
            this.router.navigate(['/auth/login']);
          } else {
            const toast = await this.toastController.create({
              message: response.error || 'Failed to reset password',
              duration: 3000,
              color: 'danger',
              position: 'top'
            });
            await toast.present();
          }
        },
        error: async (error) => {
          await loading.dismiss();
          this.isLoading = false;
          
          const toast = await this.toastController.create({
            message: error.error?.message || 'An error occurred. Please try again.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
    }
  }

  goBackToLogin() {
    this.router.navigate(['/auth/login']);
  }
}