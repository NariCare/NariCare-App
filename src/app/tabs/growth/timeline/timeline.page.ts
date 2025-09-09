import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { BabyTimelineService } from '../../../services/baby-timeline.service';
import { AuthService } from '../../../services/auth.service';
import { BabyTimelineData, BabyTimelineItem } from '../../../models/baby-timeline.model';
import { User } from '../../../models/user.model';
import { VideoPlayerModalComponent } from '../../../components/video-player-modal/video-player-modal.component';
import { AgeCalculatorUtil } from '../../../shared/utils/age-calculator.util';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.page.html',
  styleUrls: ['./timeline.page.scss'],
})
export class TimelinePage implements OnInit {
  timelineData$: Observable<BabyTimelineData> | null = null;
  user: User | null = null;
  selectedBaby: any = null;
  currentTimelineData: BabyTimelineData | null = null;
  showBabySelector = false;

  constructor(
    private router: Router,
    private timelineService: BabyTimelineService,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        // Set first baby as default selected baby
        this.selectedBaby = user.babies[0];
        this.loadTimelineData(this.selectedBaby.dateOfBirth);
      }
    });
  }

  private loadTimelineData(birthDate: Date) {
    this.timelineData$ = this.timelineService.getTimelineForBaby(birthDate);
    this.timelineData$?.subscribe(data => {
      this.currentTimelineData = data;
    });
  }

  goBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  openSpecificWeek(weekItem: BabyTimelineItem) {
    this.router.navigate(['/tabs/growth/timeline/week', weekItem.weekStart]);
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
    if (!this.selectedBaby) return '';
    return AgeCalculatorUtil.calculateBabyAge(this.selectedBaby.dateOfBirth);
  }

  calculateBabyAgeForBaby(birthDate: Date): string {
    return AgeCalculatorUtil.calculateBabyAge(birthDate);
  }

  // Baby selection methods
  openBabySelector() {
    if (this.user && this.user.babies && this.user.babies.length > 1) {
      this.showBabySelector = true;
    }
  }

  closeBabySelector() {
    this.showBabySelector = false;
  }

  selectBaby(baby: any) {
    this.selectedBaby = baby;
    this.loadTimelineData(baby.dateOfBirth);
    this.closeBabySelector();
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  calculateBabyAgeForBabyDuplicate(birthDate: Date): string {
    return AgeCalculatorUtil.calculateBabyAge(birthDate);
  }

  scrollToCurrentWeek() {
    const currentWeekElement = document.querySelector('.week-card.current-week');
    if (currentWeekElement) {
      currentWeekElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }

  ionViewDidEnter() {
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