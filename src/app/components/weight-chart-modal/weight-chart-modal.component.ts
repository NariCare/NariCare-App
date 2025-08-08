import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { WeightRecord } from '../../models/growth-tracking.model';

@Component({
  selector: 'app-weight-chart-modal',
  templateUrl: './weight-chart-modal.component.html',
  styleUrls: ['./weight-chart-modal.component.scss']
})
export class WeightChartModalComponent implements OnInit {
  @Input() weightRecords: WeightRecord[] = [];
  @Input() babyGender: 'male' | 'female' = 'female';
  @Input() babyBirthDate: Date = new Date();
  @Input() babyName: string = 'Baby';

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('Weight Chart Modal initialized with:', {
      recordsCount: this.weightRecords.length,
      gender: this.babyGender,
      birthDate: this.babyBirthDate,
      name: this.babyName
    });
  }

  async closeModal() {
    await this.modalController.dismiss();
  }
}