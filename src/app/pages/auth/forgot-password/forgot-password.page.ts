import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm: FormGroup;
  isSubmitted = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private apiService: ApiService
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {}

  get errorControl() {
    return this.forgotPasswordForm.controls;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  async onSubmit() {
    this.isSubmitted = true;
    
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      const loading = await this.loadingController.create({
        message: 'Sending reset link...'
      });
      await loading.present();

      const email = this.forgotPasswordForm.value.email;

      this.apiService.forgotPassword(email).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isLoading = false;
          
          if (response.success) {
            const toast = await this.toastController.create({
              message: response.message || 'Password reset link sent to your email',
              duration: 5000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
            
            // Navigate back to login after successful submission
            this.router.navigate(['/auth/login']);
          } else {
            const toast = await this.toastController.create({
              message: response.error || 'Failed to send reset link',
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