import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BabyTimelineData, BabyTimelineItem } from '../../models/baby-timeline.model';
import { VideoPlayerModalComponent } from '../video-player-modal/video-player-modal.component';
import { AgeCalculatorUtil } from '../../shared/utils/age-calculator.util';

@Component({
  selector: 'app-timeline-modal',
  templateUrl: './timeline-modal.component.html',
  styleUrls: ['./timeline-modal.component.scss']
})
export class TimelineModalComponent implements OnInit {
  @Input() timelineData: BabyTimelineData | null = null;
  @Input() babyName: string = 'Baby';

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('Timeline Modal Data:', this.timelineData);
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

  calculateBabyAge(): string {
    if (!this.timelineData) return '';
    
    const weeks = this.timelineData.currentWeek;
    
    if (weeks === 0) return 'At birth';
    
    // Convert weeks to approximate date and use centralized utility
    const birthDate = new Date();
    birthDate.setDate(birthDate.getDate() - weeks * 7);
    
    return AgeCalculatorUtil.calculateBabyAge(birthDate);
  }

  scrollToCurrentWeek() {
    // Scroll to current week card
    const currentWeekElement = document.querySelector('.week-card.current-week');
    if (currentWeekElement) {
      currentWeekElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }

  ionViewDidEnter() {
    // Auto-scroll to current week when modal opens
    setTimeout(() => {
      this.scrollToCurrentWeek();
    }, 300);
  }

  async openVideo(videoUrl: string, title?: string) {
    const modal = await this.modalController.create({
      component: VideoPlayerModalComponent,
      componentProps: {
        videoUrl: videoUrl,
        title: title || 'Milestone Video'
      },
      cssClass: 'video-modal'
    });
    return await modal.present();
  }
}