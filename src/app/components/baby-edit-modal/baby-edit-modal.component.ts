import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { Baby } from '../../models/user.model';

@Component({
  selector: 'app-baby-edit-modal',
  templateUrl: './baby-edit-modal.component.html',
  styleUrls: ['./baby-edit-modal.component.scss'],
})
export class BabyEditModalComponent implements OnInit {
  @Input() baby: Baby | null = null;
  babyForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private apiService: ApiService,
    private backendAuthService: BackendAuthService
  ) {
    this.babyForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      dateOfBirth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      birthWeight: ['', [Validators.required, Validators.min(0.5), Validators.max(10)]],
      birthHeight: ['', [Validators.required, Validators.min(20), Validators.max(80)]],
      currentWeight: ['', [Validators.min(0.5), Validators.max(50)]],
      currentHeight: ['', [Validators.min(20), Validators.max(150)]]
    });
  }

  ngOnInit() {
    if (this.baby) {
      this.populateForm();
    }
  }

  private populateForm() {
    if (this.baby) {
      const birthDate = this.baby.dateOfBirth 
        ? (this.baby.dateOfBirth instanceof Date 
          ? this.baby.dateOfBirth.toISOString() 
          : new Date(this.baby.dateOfBirth).toISOString())
        : '';

      this.babyForm.patchValue({
        name: this.baby.name || '',
        dateOfBirth: birthDate,
        gender: this.baby.gender || '',
        birthWeight: this.baby.birthWeight || '',
        birthHeight: this.baby.birthHeight || '',
        currentWeight: this.baby.currentWeight || '',
        currentHeight: this.baby.currentHeight || ''
      });
    }
  }

  async onSubmit() {
    if (this.babyForm.valid && this.baby) {
      const loading = await this.loadingController.create({
        message: 'Updating baby information...',
        translucent: true
      });
      await loading.present();

      try {
        const formValue = this.babyForm.value;
        const babyData = {
          name: formValue.name,
          dateOfBirth: this.formatDateForApi(formValue.dateOfBirth),
          gender: formValue.gender,
          birthWeight: formValue.birthWeight ? parseFloat(formValue.birthWeight) : undefined,
          birthHeight: formValue.birthHeight ? parseFloat(formValue.birthHeight) : undefined,
          currentWeight: formValue.currentWeight ? parseFloat(formValue.currentWeight) : undefined,
          currentHeight: formValue.currentHeight ? parseFloat(formValue.currentHeight) : undefined
        };

        // Remove undefined values
        Object.keys(babyData).forEach(key => {
          if (babyData[key as keyof typeof babyData] === undefined) {
            delete babyData[key as keyof typeof babyData];
          }
        });

        const response = await this.apiService.updateBaby(this.baby.id, babyData).toPromise();
        
        if (response?.success) {
          await loading.dismiss();
          
          const toast = await this.toastController.create({
            message: `${formValue.name}'s information has been updated successfully! 👶`,
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          // Refresh user data to include updated baby
          await this.refreshUserData();

          this.modalController.dismiss({ updated: true, baby: response.data });
        } else {
          throw new Error(response?.message || 'Failed to update baby information');
        }
      } catch (error: any) {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'Failed to update baby information. Please try again.',
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
    this.modalController.dismiss({ updated: false });
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
      birthHeight: 'Birth height',
      currentWeight: 'Current weight',
      currentHeight: 'Current height'
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

  async confirmDeleteBaby() {
    if (!this.baby) return;

    const alert = await this.alertController.create({
      header: 'Delete Baby',
      message: `Are you sure you want to delete ${this.baby.name}'s information? This action cannot be undone and will permanently remove all associated records including feeding logs, weight records, and growth tracking data.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteBaby();
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteBaby() {
    if (!this.baby) return;

    const loading = await this.loadingController.create({
      message: `Deleting ${this.baby.name}'s information...`,
      translucent: true
    });
    await loading.present();

    try {
      const response = await this.apiService.deleteBaby(this.baby.id).toPromise();
      
      if (response?.success) {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `${this.baby.name}'s information has been deleted successfully.`,
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Refresh user data to remove the deleted baby
        await this.refreshUserData();

        this.modalController.dismiss({ deleted: true, babyId: this.baby.id, navigateToGrowth: true });
      } else {
        throw new Error(response?.message || 'Failed to delete baby information');
      }
    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error.message || 'Failed to delete baby information. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }
}