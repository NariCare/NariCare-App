import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { VideoPlayerModalComponent } from '../components/video-player-modal/video-player-modal.component';
import { TimelineModalComponent } from '../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../components/specific-week-modal/specific-week-modal.component';

@NgModule({
  declarations: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent
  ]
})
export class SharedModule { }