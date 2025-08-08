import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Baby } from '../../models/user.model';
import { WeightRecord } from '../../models/growth-tracking.model';

@Component({
  selector: 'app-weight-chart-modal',
  templateUrl: './weight-chart-modal.component.html',
  styleUrls: ['./weight-chart-modal.component.scss']
})
export class WeightChartModalComponent implements OnInit {
  @Input() baby: Baby | null = null;
  @Input() weightRecords: WeightRecord[] = [];

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('Weight Chart Modal - Baby:', this.baby);
    console.log('Weight Chart Modal - Records:', this.weightRecords);
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  getBabyAge(): string {
    if (!this.baby) return '';
    
    const birthDate = new Date(this.baby.dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
    } else if (diffWeeks < 52) {
      const months = Math.floor(diffWeeks / 4);
      const remainingWeeks = diffWeeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    } else {
      const years = Math.floor(diffWeeks / 52);
      const remainingWeeks = diffWeeks % 52;
      const months = Math.floor(remainingWeeks / 4);
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} old`;
    }
  }
}