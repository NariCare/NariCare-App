import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ArticleDetailPageRoutingModule } from './article-detail-routing.module';
import { ArticleDetailPage } from './article-detail.page';
import { VideoPlayerModalComponent } from '../../../components/video-player-modal/video-player-modal.component';
import { ArticleSpeechControlsComponent } from '../../../components/article-speech-controls/article-speech-controls.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ArticleDetailPageRoutingModule
  ],
  declarations: [ArticleDetailPage, VideoPlayerModalComponent, ArticleSpeechControlsComponent]
})
export class ArticleDetailPageModule {}