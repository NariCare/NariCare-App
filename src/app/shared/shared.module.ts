import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
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
import { EmotionCheckinModalComponent } from '../components/emotion-checkin-modal/emotion-checkin-modal.component';
import { BabyCreationModalComponent } from '../components/baby-creation-modal/baby-creation-modal.component';
import { WeightLogModalComponent } from '../components/weight-log-modal/weight-log-modal.component';
import { CreateGroupModalComponent } from '../components/create-group-modal/create-group-modal.component';
import { CustomIconComponent } from '../components/custom-icon/custom-icon.component';
import { AvailabilitySchedulerModalComponent } from '../components/availability-scheduler-modal/availability-scheduler-modal.component';

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
    DiaperLogModalComponent,
    EmotionCheckinModalComponent,
    BabyCreationModalComponent,
    WeightLogModalComponent,
    CreateGroupModalComponent,
    CustomIconComponent,
    AvailabilitySchedulerModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
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
    DiaperLogModalComponent,
    EmotionCheckinModalComponent,
    BabyCreationModalComponent,
    WeightLogModalComponent,
    CreateGroupModalComponent,
    CustomIconComponent,
    AvailabilitySchedulerModalComponent
  ]
})
export class SharedModule { }