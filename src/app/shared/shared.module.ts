import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { VideoPlayerModalComponent } from '../components/video-player-modal/video-player-modal.component';
import { TimelineModalComponent } from '../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../components/specific-week-modal/specific-week-modal.component';
import { ConsultationBookingModalComponent } from '../components/consultation-booking-modal/consultation-booking-modal.component';

@NgModule({
  declarations: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent,
    ConsultationBookingModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  exports: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent,
    ConsultationBookingModalComponent
  ]
})
export class SharedModule { }