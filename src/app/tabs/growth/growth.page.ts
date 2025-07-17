import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { GrowthTrackingService } from '../../services/growth-tracking.service';
import { AuthService } from '../../services/auth.service';
import { GrowthRecord, GrowthChart } from '../../models/growth-tracking.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-growth',
  templateUrl: './growth.page.html',
  styleUrls: ['./growth.page.scss'],
})
export class GrowthPage implements OnInit {
  user: User | null = null;
  growthRecords$: Observable<GrowthRecord[]> | null = null;
  selectedChartType: 'weight' | 'height' | 'head-circumference' = 'weight';
  showAddRecordModal = false;
  addRecordForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private growthService: GrowthTrackingService,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    this.addRecordForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      weight: ['', [Validators.required, Validators.min(0.5), Validators.max(50)]],
      height: ['', [Validators.required, Validators.min(20), Validators.max(150)]],
      headCircumference: [''],
      feedingFrequency: ['', [Validators.required, Validators.min(1), Validators.max(20)]],
      sleepHours: ['', [Validators.required, Validators.min(0), Validators.max(24)]],
      diaperChanges: ['', [Validators.required, Validators.min(0), Validators.max(30)]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadGrowthData(user.babies[0].id);
      }
    });
  }

  private loadGrowthData(babyId: string) {
    this.growthRecords$ = this.growthService.getGrowthRecords(babyId);
  }

  onChartTypeChange(event: any) {
    this.selectedChartType = event.detail.value;
  }

  openAddRecordModal() {
    this.showAddRecordModal = true;
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
    this.addRecordForm.reset({
      date: new Date().toISOString()
    });
  }

  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.user.babies.length > 0) {
      try {
        const formValue = this.addRecordForm.value;
        const record: Omit<GrowthRecord, 'id'> = {
          babyId: this.user.babies[0].id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          weight: parseFloat(formValue.weight),
          height: parseFloat(formValue.height),
          headCircumference: formValue.headCircumference ? parseFloat(formValue.headCircumference) : undefined,
          feedingFrequency: parseInt(formValue.feedingFrequency),
          sleepHours: parseFloat(formValue.sleepHours),
          diaperChanges: parseInt(formValue.diaperChanges),
          notes: formValue.notes,
          milestones: []
        };

        await this.growthService.addGrowthRecord(record);
        
        const toast = await this.toastController.create({
          message: 'Growth record saved successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        this.closeAddRecordModal();
      } catch (error) {
        const toast = await this.toastController.create({
          message: 'Failed to save growth record. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    }
  }

  getChartTitle(): string {
    switch (this.selectedChartType) {
      case 'weight': return 'Weight Progress';
      case 'height': return 'Height Progress';
      case 'head-circumference': return 'Head Circumference';
      default: return 'Growth Progress';
    }
  }

  getChartUnit(): string {
    switch (this.selectedChartType) {
      case 'weight': return 'kg';
      case 'height': return 'cm';
      case 'head-circumference': return 'cm';
      default: return '';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  calculateBabyAge(): string {
    if (!this.user || !this.user.babies.length) return '';
    
    const birthDate = new Date(this.user.babies[0].dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
    } else {
      const months = Math.floor(diffWeeks / 4);
      const remainingWeeks = diffWeeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    }
  }

  getErrorMessage(field: string): string {
    const control = this.addRecordForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return 'Value is too low';
    }
    if (control?.hasError('max')) {
      return 'Value is too high';
    }
    return '';
  }
}