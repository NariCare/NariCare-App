import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TimelinePageRoutingModule } from './timeline-routing.module';
import { TimelinePage } from './timeline.page';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TimelinePageRoutingModule,
    SharedModule
  ],
  declarations: [TimelinePage]
})
export class TimelinePageModule {}