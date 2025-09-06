import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

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
    const now = new Date();
    const birth = new Date(dateOfBirth);
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
    } else if (diffWeeks < 8) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} old`;
    } else {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} old`;
    }
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