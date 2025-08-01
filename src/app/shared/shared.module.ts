import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { VideoPlayerModalComponent } from '../components/video-player-modal/video-player-modal.component';

@NgModule({
  declarations: [
    VideoPlayerModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    VideoPlayerModalComponent
  ]
})
export class SharedModule { }