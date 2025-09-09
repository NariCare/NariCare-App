import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { BabyTimelineService } from '../../../services/baby-timeline.service';
import { AuthService } from '../../../services/auth.service';
import { BabyTimelineItem } from '../../../models/baby-timeline.model';
import { User } from '../../../models/user.model';
import { VideoPlayerModalComponent } from '../../../components/video-player-modal/video-player-modal.component';
import { AgeCalculatorUtil } from '../../../shared/utils/age-calculator.util';

@Component({
  selector: 'app-specific-week',
  templateUrl: './specific-week.page.html',
  styleUrls: ['./specific-week.page.scss'],
})
export class SpecificWeekPage implements OnInit {
  weekItem: BabyTimelineItem | null = null;
  user: User | null = null;
  currentWeek: number = 0;
  weekNumber: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private timelineService: BabyTimelineService,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.calculateCurrentWeek(user.babies[0].dateOfBirth);
      }
    });

    this.route.params.subscribe(params => {
      this.weekNumber = parseInt(params['weekNumber']);
      this.loadWeekData();
    });
  }

  private calculateCurrentWeek(birthDate: Date) {
    this.currentWeek = AgeCalculatorUtil.calculateAgeInWeeks(birthDate);
  }

  private loadWeekData() {
    const allItems = this.timelineService.getAllTimelineItems();
    this.weekItem = allItems.find(item => item.weekStart === this.weekNumber) || null;
  }

  goBack() {
    this.router.navigate(['/tabs/growth/timeline']);
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
    return this.weekNumber === this.currentWeek;
  }

  isCompletedWeek(): boolean {
    return this.currentWeek > this.weekNumber;
  }

  isUpcomingWeek(): boolean {
    return this.currentWeek < this.weekNumber;
  }

  getWeeksUntil(): number {
    return this.weekNumber - this.currentWeek;
  }

  calculateBabyAge(): string {
    const weeks = this.weekNumber;
    
    if (weeks === 0) return 'At birth';
    
    // Convert weeks to approximate date and use centralized utility
    const birthDate = new Date();
    birthDate.setDate(birthDate.getDate() - weeks * 7);
    
    return AgeCalculatorUtil.calculateBabyAge(birthDate);
  }

  getCategoryDisplayName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'social': 'Social',
      'language': 'Language',
      'cognitive': 'Cognitive',
      'movement': 'Movement'
    };
    return categoryNames[category] || category;
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