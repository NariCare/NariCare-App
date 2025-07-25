import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-video-player-modal',
  templateUrl: './video-player-modal.component.html',
  styleUrls: ['./video-player-modal.component.scss']
})
export class VideoPlayerModalComponent implements OnInit {
  @Input() videoUrl: string = '';
  @Input() title: string = 'Video';
  
  safeVideoUrl: SafeResourceUrl = '';
  isYouTube = false;
  embedUrl = '';

  constructor(
    private modalController: ModalController,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.processVideoUrl();
  }

  private processVideoUrl() {
    if (this.videoUrl.includes('youtube.com') || this.videoUrl.includes('youtu.be')) {
      this.isYouTube = true;
      this.embedUrl = this.getYouTubeEmbedUrl(this.videoUrl);
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.embedUrl);
    } else {
      // For other video URLs, try to use them directly
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl);
    }
  }

  private getYouTubeEmbedUrl(url: string): string {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      return url; // Already an embed URL
    }
    
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }

  async closeModal() {
    await this.modalController.dismiss();
  }

  openInBrowser() {
    window.open(this.videoUrl, '_blank');
  }
}