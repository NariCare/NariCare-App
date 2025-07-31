import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BabyTimelineItem } from '../../models/baby-timeline.model';

@Component({
  selector: 'app-specific-week-modal',
  templateUrl: './specific-week-modal.component.html',
  styleUrls: ['./specific-week-modal.component.scss']
})
export class SpecificWeekModalComponent implements OnInit {
  @Input() weekItem: BabyTimelineItem | null = null;
  @Input() babyName: string = 'Baby';
  @Input() currentWeek: number = 0;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('Specific Week Modal Data:', this.weekItem);
  }

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

  isCurrentWeek(): boolean {
    return this.weekItem ? 
      this.currentWeek >= this.weekItem.weekStart && this.currentWeek <= this.weekItem.weekEnd : 
      false;
  }

  isCompletedWeek(): boolean {
    return this.weekItem ? this.currentWeek > this.weekItem.weekEnd : false;
  }

  isUpcomingWeek(): boolean {
    return this.weekItem ? this.currentWeek < this.weekItem.weekStart : false;
  }

  getWeeksUntil(): number {
    return this.weekItem ? this.weekItem.weekStart - this.currentWeek : 0;
  }

  calculateBabyAge(): string {
    if (!this.weekItem) return '';
    
    const weeks = this.weekItem.weekStart;
    
    if (weeks === 0) return 'At birth';
    if (weeks < 4) {
      return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
    } else if (weeks < 52) {
      const months = Math.floor(weeks / 4);
      const remainingWeeks = weeks % 4;
      return `${months} month${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}` : ''} old`;
    } else {
      const years = Math.floor(weeks / 52);
      const remainingWeeks = weeks % 52;
      const months = Math.floor(remainingWeeks / 4);
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} old`;
    }
  }
}