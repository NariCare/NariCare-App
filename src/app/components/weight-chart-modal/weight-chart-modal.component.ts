import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GrowthKind, Sex } from '../../shared/utils/who-lms.util';

@Component({
  selector: 'app-weight-chart-modal',
  templateUrl: './weight-chart-modal.component.html',
  styleUrls: ['./weight-chart-modal.component.scss']
})
export class WeightChartModalComponent {
  @Input() weightRecords: any[] = [];
  @Input() babyGender: Sex = 'female';
  @Input() babyBirthDate: Date | string = new Date();
  @Input() babyBirthWeight: number | null = null;
  @Input() babyBirthHeight: number | null = null;
  @Input() babyName = '';
  @Input() kind: GrowthKind = 'weight';

  constructor(private modalController: ModalController) {}

  onKindChange(ev: Event) {
    const v = (ev as CustomEvent).detail?.value;
    if (v === 'weight' || v === 'height') this.kind = v;
  }

  async closeModal() {
    await this.modalController.dismiss();
  }
}
