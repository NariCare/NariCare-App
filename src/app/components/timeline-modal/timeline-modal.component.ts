import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BabyTimelineData, BabyTimelineItem } from '../../models/baby-timeline.model';

@Component({
  selector: 'app-timeline-modal',
  templateUrl: './timeline-modal.component.html',
  styleUrls: ['./timeline-modal.component.scss']
})
export class TimelineModalComponent implements OnInit {
  @Input() timelineData: BabyTimelineData | null = null;
  @Input() babyName: string = 'Baby';

  constructor(private modalController: ModalController) {}

  ngOnInit() {}

  async closeModal() {
    await this.modalController.dismiss();
  }

  getCategoryLabel(category: string): string {
    const categoryLabels: { [key: string]: string } = {
      'feeding': 'Feeding',
      'development': 'Development',
      'sleep': 'Sleep',
      'milestone': 'Milestone',
      'health': 'Health'
    };
    return categoryLabels[category] || category;
  }

  getCategoryColor(category: string): string {
    const categoryColors: { [key: string]: string } = {
      'feeding': 'primary',
      'development': 'success',
      'sleep': 'tertiary',
      'milestone': 'warning',
      'health': 'danger'
    };
    return categoryColors[category] || 'medium';
  }

  calculateBabyAge(): string {
    if (!this.timelineData) return '';
    
    const weeks = this.timelineData.currentWeek;
    
    if (weeks < 4) {
      return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
    } else {
      const months = Math.floor(weeks / 4);
      const remainingWeeks = weeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    }
  }
}