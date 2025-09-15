import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackendAuthService } from '../../services/backend-auth.service';
import { TimezoneService, TimezoneOption } from '../../services/timezone.service';
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
  
  // Timezone properties
  timezoneOptions: TimezoneOption[] = [];
  detectedTimezone: string = '';
  
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
    private activatedRoute: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private backendAuthService: BackendAuthService,
    private timezoneService: TimezoneService
  ) {
    this.personalInfoForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [this.phoneNumberValidator]],
      whatsappNumber: ['', [this.phoneNumberValidator]],
      motherType: [''],
      dueDate: [''],
      tierType: ['basic'],
      timezone: ['']
    });
  }

  phoneNumberValidator(control: any) {
    const value = control.value;
    if (!value) return null; // Allow empty for optional fields
    
    // Remove any non-digit characters for validation
    const digitsOnly = value.replace(/\D/g, '');
    
    // Check if it contains only digits (after cleaning)
    if (!/^\d+$/.test(digitsOnly)) {
      return { invalidFormat: true };
    }
    
    // Check length (10 digits for most phone numbers)
    if (digitsOnly.length < 10) {
      return { tooShort: true };
    }
    
    if (digitsOnly.length > 15) { // International standard max length
      return { tooLong: true };
    }
    
    return null; // Valid
  }

  async ngOnInit() {
    console.log('Personal Info Page - Initializing...');
    console.log('Personal Info Page - Current URL:', window.location.href);
    console.log('Personal Info Page - Route params:', this.activatedRoute.snapshot.queryParams);
    
    // Initialize timezone settings
    this.initializeTimezoneSettings();
    
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
    console.log('Personal Info - Populating form with user data:', {
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      dueDate: user.dueDate,
      motherType: user.motherType,
      timezone: user.timezone
    });
    
    console.log('Personal Info - Full user object:', user);
    
    // Handle due date more safely
    let formattedDueDate = '';
    if (user.dueDate) {
      try {
        const date = new Date(user.dueDate);
        if (!isNaN(date.getTime())) {
          formattedDueDate = date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Error formatting due date:', error);
      }
    }
    
    this.personalInfoForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      whatsappNumber: user.whatsappNumber || '',
      motherType: user.motherType || '',
      dueDate: formattedDueDate,
      tierType: user.tier?.type || 'basic',
      timezone: user.timezone || this.detectedTimezone
    });
    
    console.log('Form values after patching:', {
      phoneNumber: this.personalInfoForm.get('phoneNumber')?.value,
      whatsappNumber: this.personalInfoForm.get('whatsappNumber')?.value,
      dueDate: this.personalInfoForm.get('dueDate')?.value,
      motherType: this.personalInfoForm.get('motherType')?.value,
      timezone: this.personalInfoForm.get('timezone')?.value
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
          dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
          timezone: formValue.timezone
        };
        
        await this.backendAuthService.updateUserProfile(updateData);
        await loading.dismiss();
        
        // If timezone was updated, clear the auto-update flag
        if (updateData.timezone) {
          localStorage.removeItem('timezone_auto_updated');
        }
        
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
    if (control?.hasError('invalidFormat')) {
      return 'Phone number must contain only digits';
    }
    if (control?.hasError('tooShort')) {
      return 'Phone number must be at least 10 digits';
    }
    if (control?.hasError('tooLong')) {
      return 'Phone number cannot exceed 15 digits';
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

  // Timezone-related methods
  private initializeTimezoneSettings() {
    // Get common timezones
    this.timezoneOptions = this.timezoneService.getCommonTimezones();
    
    // Detect user's timezone
    this.detectedTimezone = this.timezoneService.getUserTimezone();
    
    console.log('Detected timezone:', this.detectedTimezone);
    console.log('Available timezones:', this.timezoneOptions.length);
  }

  useDetectedTimezone() {
    this.personalInfoForm.patchValue({ timezone: this.detectedTimezone });
    this.personalInfoForm.markAsDirty();
    
    // Clear the auto-update flag so future timezone changes can be detected
    localStorage.removeItem('timezone_auto_updated');
  }

  compareTimezones(tz1: string, tz2: string): boolean {
    return tz1 === tz2;
  }

  getTimezoneDisplayName(timezone: string): string {
    return this.timezoneService.getTimezoneDisplayName(timezone);
  }

  getCurrentTimezoneDisplay(): string {
    const selectedTimezone = this.personalInfoForm.get('timezone')?.value;
    if (!selectedTimezone) return '';
    
    const timezoneOption = this.timezoneOptions.find(tz => tz.value === selectedTimezone);
    if (timezoneOption) {
      const now = new Date();
      const timeInTimezone = this.timezoneService.formatTime(now, selectedTimezone, {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      return `${timezoneOption.label} - Current time: ${timeInTimezone}`;
    }
    return this.timezoneService.getTimezoneDisplayName(selectedTimezone);
  }

  shouldShowDetectedTimezone(): boolean {
    const currentTimezone = this.personalInfoForm.get('timezone')?.value;
    
    // Only show if we have a detected timezone and it's different from the current one
    if (!this.detectedTimezone) return false;
    
    // Use the new equivalent comparison method
    return !this.timezoneService.areTimezonesEquivalent(this.detectedTimezone, currentTimezone);
  }

  formatPhoneNumber(event: any, fieldName: string) {
    let value = event.detail.value;
    
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Limit to 15 digits (international standard)
    const limitedDigits = digitsOnly.substring(0, 15);
    
    // Update the form control with digits only (no formatting for now)
    // This ensures the backend receives clean phone numbers
    this.personalInfoForm.get(fieldName)?.setValue(limitedDigits, { emitEvent: false });
  }
}
