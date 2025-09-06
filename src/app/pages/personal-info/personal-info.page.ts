import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackendAuthService } from '../../services/backend-auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.page.html',
  styleUrls: ['./personal-info.page.scss'],
})
export class PersonalInfoPage implements OnInit, OnDestroy {
  personalInfoForm: FormGroup;
  user: User | null = null;
  private subscriptions = new Subscription();
  
  motherTypes = [
    { value: 'pregnant', label: 'Expecting Mother' },
    { value: 'new_mom', label: 'New Mother' }
  ];
  
  tierTypes = [
    { value: 'basic', label: 'Basic (Free)' },
    { value: 'one-month', label: '1-Month Program' },
    { value: 'three-month', label: '3-Month Program' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private backendAuthService: BackendAuthService
  ) {
    this.personalInfoForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      whatsappNumber: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      motherType: [''],
      dueDate: [''],
      tierType: ['basic']
    });
  }

  async ngOnInit() {
    // Refresh user profile to ensure latest data is loaded
    try {
      await this.backendAuthService.refreshUserProfile();
    } catch (error) {
      console.warn('Failed to refresh user profile:', error);
    }
    
    this.loadUserData();
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  private loadUserData() {
    this.subscriptions.add(
      this.backendAuthService.currentUser$.subscribe(user => {
        this.user = user;
        if (user) {
          this.populateForm(user);
        }
      })
    );
  }
  
  private populateForm(user: User) {
    console.log('Populating form with user data:', {
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      dueDate: user.dueDate,
      motherType: user.motherType
    });
    
    this.personalInfoForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      whatsappNumber: user.whatsappNumber || '',
      motherType: user.motherType || '',
      dueDate: user.dueDate ? user.dueDate.toISOString().split('T')[0] : '',
      tierType: user.tier?.type || 'basic'
    });
    
    console.log('Form values after patching:', {
      phoneNumber: this.personalInfoForm.get('phoneNumber')?.value,
      whatsappNumber: this.personalInfoForm.get('whatsappNumber')?.value,
      dueDate: this.personalInfoForm.get('dueDate')?.value,
      motherType: this.personalInfoForm.get('motherType')?.value
    });
    
    // Reset the form's dirty state after populating with saved data
    this.personalInfoForm.markAsPristine();
    this.personalInfoForm.markAsUntouched();
  }
  
  async onSubmit() {
    if (this.personalInfoForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Updating your information...',
        translucent: true
      });
      await loading.present();
      
      try {
        const formValue = this.personalInfoForm.value;
        const updateData = {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          phoneNumber: formValue.phoneNumber,
          whatsappNumber: formValue.whatsappNumber,
          motherType: formValue.motherType,
          dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined
        };
        
        await this.backendAuthService.updateUserProfile(updateData);
        await loading.dismiss();
        
        // Reset form dirty state after successful save
        this.personalInfoForm.markAsPristine();
        this.personalInfoForm.markAsUntouched();
        
        const toast = await this.toastController.create({
          message: '✅ Personal information updated successfully!',
          duration: 3000,
          color: 'success',
          position: 'top',
          cssClass: 'success-toast',
          buttons: [{
            text: '×',
            role: 'cancel'
          }]
        });
        await toast.present();
        
        this.router.navigate(['/tabs/profile']);
        
      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Failed to update information. Please try again.',
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
  
  async goBack() {
    if (this.personalInfoForm.dirty) {
      const alert = await this.alertController.create({
        header: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to go back?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Discard Changes',
            handler: () => {
              this.router.navigate(['/tabs/profile']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/tabs/profile']);
    }
  }
  
  private markFormGroupTouched() {
    Object.keys(this.personalInfoForm.controls).forEach(key => {
      this.personalInfoForm.get(key)?.markAsTouched();
    });
  }
  
  getErrorMessage(field: string): string {
    const control = this.personalInfoForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(field)} must be at least 2 characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid phone number';
    }
    return '';
  }
  
  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      whatsappNumber: 'WhatsApp Number',
      motherType: 'Mother Type',
      dueDate: 'Due Date',
      tierType: 'Subscription Tier'
    };
    return labels[field] || field;
  }
  
  getTierDisplay(): string {
    const tierType = this.personalInfoForm.get('tierType')?.value;
    const tier = this.tierTypes.find(t => t.value === tierType);
    return tier?.label || 'Basic (Free)';
  }
  
  isTierUpgradeable(): boolean {
    const currentTier = this.user?.tier?.type || 'basic';
    return currentTier === 'basic';
  }
  
  handleAction(action: string) {
    switch (action) {
      case 'upgrade':
        console.log('Navigate to upgrade subscription');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }
}
