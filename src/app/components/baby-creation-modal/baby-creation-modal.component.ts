import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { BackendAuthService } from '../../services/backend-auth.service';

@Component({
  selector: 'app-baby-creation-modal',
  templateUrl: './baby-creation-modal.component.html',
  styleUrls: ['./baby-creation-modal.component.scss'],
})
export class BabyCreationModalComponent implements OnInit {
  @Input() existingBabies: any[] = []; // Pass existing babies for DOB defaulting
  
  babyForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private backendAuthService: BackendAuthService
  ) {
    this.babyForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      dateOfBirth: ['', [Validators.required, this.noFutureDateValidator]],
      gender: ['', [Validators.required]],
      birthWeight: ['', [Validators.required, Validators.min(0.5), Validators.max(10)]],
      birthHeight: ['', [Validators.required, Validators.min(20), Validators.max(80)]]
    });
  }

  ngOnInit() {
    this.initializeFormDefaults();
  }
  
  private initializeFormDefaults() {
    // If there are existing babies, default DOB and other common values from the first baby
    if (this.existingBabies && this.existingBabies.length > 0) {
      const firstBaby = this.existingBabies[0];
      
      // Default date of birth from first baby (for twins/triplets)
      if (firstBaby.dateOfBirth) {
        let defaultDate = firstBaby.dateOfBirth;
        // Convert to YYYY-MM-DD format for ion-input type="date"
        if (typeof defaultDate === 'string') {
          defaultDate = new Date(defaultDate).toISOString().split('T')[0];
        } else if (defaultDate instanceof Date) {
          defaultDate = defaultDate.toISOString().split('T')[0];
        }
        
        this.babyForm.patchValue({
          dateOfBirth: defaultDate
        });
      }
      
      console.log('Defaulted DOB and units from existing baby:', firstBaby.dateOfBirth);
    }
  }

  async onSubmit() {
    if (this.babyForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Adding baby...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.babyForm.value;
        const babyData = {
          name: formValue.name,
          dateOfBirth: this.formatDateForApi(formValue.dateOfBirth),
          gender: formValue.gender,
          birthWeight: parseFloat(formValue.birthWeight), // Always in kg
          birthHeight: parseFloat(formValue.birthHeight)  // Always in cm
        };

        const response = await this.apiService.createBaby(babyData).toPromise();
        
        if (response?.success) {
          await loading.dismiss();
          
          const toast = await this.toastController.create({
            message: `${formValue.name} has been added successfully! 👶`,
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          // Refresh user data to include new baby
          await this.refreshUserData();

          this.modalController.dismiss({ created: true, baby: response.data });
        } else {
          throw new Error(response?.message || 'Failed to create baby');
        }
      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Failed to add baby. Please try again.',
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

  private async refreshUserData() {
    try {
      const response = await this.apiService.getUserProfile().toPromise();
      if (response?.success && response.data) {
        // Update the current user in the auth service
        const user = this.backendAuthService.getCurrentUser();
        if (user) {
          // Update babies array with new data
          const updatedUser = { ...user };
          if (response.data.babies) {
            updatedUser.babies = response.data.babies.map((baby: any) => ({
              id: baby.id,
              name: baby.name,
              dateOfBirth: new Date(baby.dateOfBirth || baby.date_of_birth),
              gender: baby.gender,
              birthWeight: baby.birthWeight || baby.birth_weight,
              birthHeight: baby.birthHeight || baby.birth_height,
              currentWeight: baby.currentWeight || baby.current_weight,
              currentHeight: baby.currentHeight || baby.current_height
            }));
          }
          // Trigger user update
          this.backendAuthService['currentUserSubject'].next(updatedUser);
        }
      }
    } catch (error) {
      console.warn('Failed to refresh user data:', error);
    }
  }

  selectGender(gender: 'male' | 'female') {
    this.babyForm.patchValue({ gender });
  }

  close() {
    this.modalController.dismiss({ created: false });
  }

  private markFormGroupTouched() {
    Object.keys(this.babyForm.controls).forEach(key => {
      this.babyForm.get(key)?.markAsTouched();
    });
  }

  getErrorMessage(field: string): string {
    const control = this.babyForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (control?.hasError('futureDate')) {
      return 'Birth date cannot be in the future';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(field)} must be at least 1 character`;
    }
    if (control?.hasError('min')) {
      const min = control.errors?.['min']?.min;
      return `${this.getFieldLabel(field)} must be at least ${min}`;
    }
    if (control?.hasError('max')) {
      const max = control.errors?.['max']?.max;
      return `${this.getFieldLabel(field)} must be at most ${max}`;
    }
    return '';
  }

  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      name: 'Baby name',
      dateOfBirth: 'Date of birth',
      gender: 'Gender',
      birthWeight: 'Birth weight',
      birthHeight: 'Birth height'
    };
    return labels[field] || field;
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Custom validator to prevent future dates
  noFutureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
    
    if (selectedDate > today) {
      return { futureDate: { message: 'Birth date cannot be in the future' } };
    }
    
    return null;
  }

  private formatDateForApi(dateValue: string): string {
    // ion-input with type="date" returns YYYY-MM-DD format, which is perfect for API
    return dateValue;
  }
  
}