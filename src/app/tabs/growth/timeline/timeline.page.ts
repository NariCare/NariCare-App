import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { BabyTimelineService } from '../../../services/baby-timeline.service';
import { AuthService } from '../../../services/auth.service';
import { BabyTimelineData, BabyTimelineItem } from '../../../models/baby-timeline.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.page.html',
  styleUrls: ['./timeline.page.scss'],
})
export class TimelinePage implements OnInit {
  timelineData$: Observable<BabyTimelineData> | null = null;
  user: User | null = null;
  currentTimelineData: BabyTimelineData | null = null;

  constructor(
    private router: Router,
    private timelineService: BabyTimelineService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user && user.babies.length > 0) {
        this.loadTimelineData(user.babies[0].dateOfBirth);
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
    this.router.navigate(['/tabs/growth']);
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
    if (!this.user || !this.user.babies.length) return '';
    
    const birthDate = new Date(this.user.babies[0].dateOfBirth);
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
}