import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TimelinePageRoutingModule } from './timeline-routing.module';
import { TimelinePage } from './timeline.page';
import { VideoPlayerModalComponent } from '../../../components/video-player-modal/video-player-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TimelinePageRoutingModule
  ],
  declarations: [TimelinePage, VideoPlayerModalComponent]
})
export class TimelinePageModule {}