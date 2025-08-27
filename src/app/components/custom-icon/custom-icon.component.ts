import { Component, Input, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../services/icon.service';

@Component({
  selector: 'app-custom-icon',
  templateUrl: './custom-icon.component.html',
  styleUrls: ['./custom-icon.component.scss'],
})
export class CustomIconComponent implements OnInit {
  @Input() name!: string;
  @Input() size: string = '24px';
  @Input() color?: string;
  @Input() babyGender?: 'male' | 'female';
  @Input() feedingType?: 'breast' | 'expressed' | 'formula';
  @Input() trackerType?: 'weight' | 'feed' | 'emotional';

  iconSvg: SafeHtml = '';

  constructor(private iconService: IconService) {}

  ngOnInit() {
    console.log('CustomIconComponent ngOnInit:', {
      name: this.name,
      babyGender: this.babyGender,
      feedingType: this.feedingType,
      trackerType: this.trackerType
    });
    this.loadIcon();
  }

  private loadIcon() {
    let iconObservable;

    console.log('CustomIconComponent loadIcon called with:', {
      babyGender: this.babyGender,
      feedingType: this.feedingType,
      trackerType: this.trackerType,
      name: this.name
    });

    if (this.babyGender) {
      console.log('Loading baby icon for gender:', this.babyGender);
      iconObservable = this.iconService.getBabyIcon(this.babyGender);
    } else if (this.feedingType) {
      iconObservable = this.iconService.getFeedingIcon(this.feedingType);
    } else if (this.trackerType) {
      iconObservable = this.iconService.getTrackerIcon(this.trackerType);
    } else if (this.name) {
      iconObservable = this.iconService.getIcon(this.name);
    }

    if (iconObservable) {
      iconObservable.subscribe({
        next: (svg) => {
          console.log('Icon loaded successfully:', svg);
          this.iconSvg = svg;
        },
        error: (error) => {
          console.error('Error loading icon:', error);
        }
      });
    } else {
      console.warn('No icon observable created - no matching input provided');
    }
  }
}
