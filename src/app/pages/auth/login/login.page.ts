import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {}

  async onSubmit() {
    if (this.loginForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Signing in...',
        translucent: true
      });
      await loading.present();

      try {
        const { email, password } = this.loginForm.value;
        await this.authService.login(email, password);
        await loading.dismiss();
      } catch (error: any) {
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

  async signInWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Signing in with Google...',
      translucent: true
    });
    await loading.present();

    try {
      await this.authService.signInWithGoogle();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Google sign-in failed. Please try again.',
        duration: 3000,
        color: 'danger',
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
      await this.authService.signInWithFacebook();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Facebook sign-in failed. Please try again.',
        duration: 3000,
        color: 'danger',
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

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 6 characters`;
    }
    return '';
  }
}