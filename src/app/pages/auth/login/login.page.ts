import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ModalController } from '@ionic/angular';
import { BackendAuthService } from '../../../services/backend-auth.service';
import { ApiService } from '../../../services/api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  otpForm: FormGroup;
  showPassword = false;
  show2FA = false;
  pendingEmail = '';
  showBetaTag = false;
  private subscriptions = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private backendAuthService: BackendAuthService,
    private apiService: ApiService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    
    this.otpForm = this.formBuilder.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    // Check if user is already authenticated and redirect
    this.checkAuthenticationStatus();
    
    // Listen for 2FA requirement
    this.subscriptions.add(
      this.backendAuthService.twoFactorRequired$.subscribe(required => {
        this.show2FA = required;
        if (required) {
          this.pendingEmail = this.backendAuthService.getPendingEmail();
        }
      })
    );

    // Check API version for Beta tag
    this.checkApiVersion();
  }

  private checkAuthenticationStatus() {
    // Check current user and redirect if already authenticated
    const currentUser = this.backendAuthService.getCurrentUser();
    if (currentUser) {
      this.redirectAuthenticatedUser(currentUser);
    }
    
    // Also listen for auth state changes
    this.subscriptions.add(
      this.backendAuthService.currentUser$.subscribe(user => {
        if (user) {
          this.redirectAuthenticatedUser(user);
        }
      })
    );
  }

  private redirectAuthenticatedUser(user: any) {
    // Navigate based on onboarding status
    if (true || user.isOnboardingCompleted) {
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    } else {
      this.router.navigate(['/onboarding'], { replaceUrl: true });
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Signing in...',
        translucent: true
      });
      await loading.present();

      try {
        const { email, password } = this.loginForm.value;
        await this.backendAuthService.login(email, password);
        await loading.dismiss();
      } catch (error: any) {
        console.log(error);
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Login failed. Please try again.',
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }

  async onSubmitOTP() {
    if (this.otpForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Verifying OTP...',
        translucent: true
      });
      await loading.present();

      try {
        const { otp } = this.otpForm.value;
        await this.backendAuthService.verify2FA(otp);
        await loading.dismiss();
      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'OTP verification failed. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    } else {
      this.markOTPFormTouched();
    }
  }

  async resendOTP() {
    const loading = await this.loadingController.create({
      message: 'Resending OTP...',
      translucent: true
    });
    await loading.present();

    try {
      await this.backendAuthService.resendOTP();
      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: 'OTP sent successfully to your email.',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Failed to resend OTP. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  goBackToLogin() {
    this.show2FA = false;
    this.otpForm.reset();
  }

  async signInWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Signing in with Google...',
      translucent: true
    });
    await loading.present();

    try {
      await this.backendAuthService.signInWithGoogle();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Google sign-in not available. Please use email/password.',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    }
  }

  async signInWithFacebook() {
    const loading = await this.loadingController.create({
      message: 'Signing in with Facebook...',
      translucent: true
    });
    await loading.present();

    try {
      await this.backendAuthService.signInWithFacebook();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Facebook sign-in not available. Please use email/password.',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private markOTPFormTouched() {
    Object.keys(this.otpForm.controls).forEach(key => {
      this.otpForm.get(key)?.markAsTouched();
    });
  }

  private checkApiVersion() {
    this.apiService.getVersion().subscribe({
      next: (response) => {
        if (response.success && response.data?.isBeta) {
          this.showBetaTag = true;
        }
      },
      error: (error) => {
        // Silently fail - Beta tag is not critical for login functionality
        console.log('Could not fetch version info:', error);
      }
    });
  }

  getErrorMessage(field: string, formType: 'login' | 'otp' = 'login'): string {
    const form = formType === 'login' ? this.loginForm : this.otpForm;
    const control = form.get(field);
    
    if (control?.hasError('required')) {
      return field === 'otp' ? 'OTP is required' : `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      if (field === 'otp') {
        return 'OTP must be 6 digits';
      }
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 6 characters`;
    }
    if (control?.hasError('maxlength')) {
      if (field === 'otp') {
        return 'OTP must be 6 digits';
      }
    }
    return '';
  }
}