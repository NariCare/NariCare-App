import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';

@Component({
  selector: 'app-baby-selection-modal',
  templateUrl: './baby-selection-modal.component.html',
  styleUrls: ['./baby-selection-modal.component.scss'],
})
export class BabySelectionModalComponent implements OnInit {
  @Input() babies: any[] = [];

  constructor(
    private modalController: ModalController,
    private router: Router
  ) {}

  ngOnInit() {}

  dismiss() {
    this.modalController.dismiss();
  }

  selectBaby(baby: any) {
    // Close modal and navigate to baby detail page
    this.modalController.dismiss();
    this.router.navigate(['/tabs/growth/baby-detail', baby.id]);
  }

  calculateAge(dateOfBirth: Date): string {
    return AgeCalculatorUtil.calculateBabyAge(dateOfBirth);
  }

  getGenderIcon(gender: string): string {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'male';
      case 'female':
        return 'female';
      default:
        return 'person';
    }
  }

  getGenderColor(gender: string): string {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'primary';
      case 'female':
        return 'secondary';
      default:
        return 'medium';
    }
  }
}