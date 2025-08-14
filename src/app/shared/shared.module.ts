import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { VideoPlayerModalComponent } from '../components/video-player-modal/video-player-modal.component';
import { TimelineModalComponent } from '../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../components/specific-week-modal/specific-week-modal.component';
import { ConsultationBookingModalComponent } from '../components/consultation-booking-modal/consultation-booking-modal.component';
import { GroupChatMessagesComponent } from '../components/group-chat-messages/group-chat-messages.component';
import { WeightChartComponent } from '../components/weight-chart/weight-chart.component';
import { WeightChartModalComponent } from '../components/weight-chart-modal/weight-chart-modal.component';
import { FeedLogModalComponent } from '../components/feed-log-modal/feed-log-modal.component';
import { PumpingLogModalComponent } from '../components/pumping-log-modal/pumping-log-modal.component';
import { DiaperLogModalComponent } from '../components/diaper-log-modal/diaper-log-modal.component';

@NgModule({
  declarations: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent,
    ConsultationBookingModalComponent,
    GroupChatMessagesComponent,
    WeightChartComponent,
    WeightChartModalComponent,
    FeedLogModalComponent,
    PumpingLogModalComponent,
    DiaperLogModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    VideoPlayerModalComponent,
    TimelineModalComponent,
    SpecificWeekModalComponent,
    ConsultationBookingModalComponent,
    GroupChatMessagesComponent,
    WeightChartComponent,
    WeightChartModalComponent,
    FeedLogModalComponent,
    PumpingLogModalComponent,
    DiaperLogModalComponent
  ]
})
export class SharedModule { }