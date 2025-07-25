import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { AuthService } from '../../../services/auth.service';
import { Article } from '../../../models/knowledge-base.model';
import { User } from '../../../models/user.model';
import { VideoPlayerModalComponent } from '../../../components/video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-article-detail',
  templateUrl: './article-detail.page.html',
  styleUrls: ['./article-detail.page.scss']
})
export class ArticleDetailPage implements OnInit {
  article$: Observable<Article | undefined>;
  articleId: string = '';
  user: User | null = null;
  isBookmarked = false;
  isReading = false;
  speechSynthesis: SpeechSynthesis | null = null;
  currentUtterance: SpeechSynthesisUtterance | null = null;
  readingSpeed = 1;
  selectedVoice: SpeechSynthesisVoice | null = null;
  availableVoices: SpeechSynthesisVoice[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    this.article$ = new Observable();
    this.initializeSpeechSynthesis();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.route.params.subscribe(params => {
      this.articleId = params['id'];
      if (this.articleId) {
        this.article$ = this.knowledgeService.getArticle(this.articleId);
        this.checkBookmarkStatus();
      }
    });
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      
      // Load voices
      this.loadVoices();
      
      // Some browsers load voices asynchronously
      if (this.speechSynthesis.onvoiceschanged !== undefined) {
        this.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (this.speechSynthesis) {
      this.availableVoices = this.speechSynthesis.getVoices();
      // Prefer English voices
      this.selectedVoice = this.availableVoices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || this.availableVoices.find(voice => 
        voice.lang.startsWith('en')
      ) || this.availableVoices[0] || null;
    }
  }
  private checkBookmarkStatus() {
    if (this.user) {
      this.knowledgeService.getUserBookmarks(this.user.uid).subscribe(bookmarks => {
        this.isBookmarked = bookmarks.includes(this.articleId);
      });
    }
  }

  async toggleReading() {
    if (!this.speechSynthesis) {
      const toast = await this.toastController.create({
        message: 'Text-to-speech is not supported in this browser',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.isReading) {
      this.stopReading();
    } else {
      this.startReading();
    }
  }

  private async startReading() {
    this.article$.subscribe(article => {
      if (article && this.speechSynthesis) {
        const textToRead = this.extractTextFromArticle(article);
        
        this.currentUtterance = new SpeechSynthesisUtterance(textToRead);
        this.currentUtterance.rate = this.readingSpeed;
        this.currentUtterance.pitch = 1;
        this.currentUtterance.volume = 1;
        
        if (this.selectedVoice) {
          this.currentUtterance.voice = this.selectedVoice;
        }
        
        this.currentUtterance.onstart = () => {
          this.isReading = true;
        };
        
        this.currentUtterance.onend = () => {
          this.isReading = false;
          this.currentUtterance = null;
        };
        
        this.currentUtterance.onerror = () => {
          this.isReading = false;
          this.currentUtterance = null;
        };
        
        this.speechSynthesis.speak(this.currentUtterance);
      }
    }).unsubscribe();
  }

  private stopReading() {
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.isReading = false;
      this.currentUtterance = null;
    }
  }

  private extractTextFromArticle(article: Article): string {
    let text = `${article.title}. `;
    
    if (article.content?.sections) {
      article.content.sections.forEach(section => {
        if (section.type === 'text' && section.content) {
          text += `${section.content} `;
        } else if (section.type === 'heading' && section.content) {
          text += `${section.content}. `;
        } else if (section.type === 'list' && section.items) {
          section.items.forEach(item => {
            text += `${item}. `;
          });
        } else if (section.type === 'callout' && section.content) {
          text += `Important: ${section.content} `;
        }
      });
    }
    
    // Clean up the text
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n/g, ' ').trim();
  }

  adjustReadingSpeed(speed: number) {
    this.readingSpeed = speed;
    if (this.currentUtterance && this.speechSynthesis) {
      // Restart reading with new speed
      const wasReading = this.isReading;
      this.stopReading();
      if (wasReading) {
        setTimeout(() => this.startReading(), 100);
      }
    }
  }
  goBack() {
    this.router.navigate(['/tabs/knowledge']);
  }

  async toggleBookmark() {
    if (!this.user) return;

    try {
      if (this.isBookmarked) {
        await this.knowledgeService.removeBookmark(this.articleId, this.user.uid);
        this.isBookmarked = false;
      } else {
        await this.knowledgeService.bookmarkArticle(this.articleId, this.user.uid);
        this.isBookmarked = true;
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  }

  shareArticle() {
    if (navigator.share) {
      navigator.share({
        title: 'NariCare Article',
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
    }
  }

  getCalloutIcon(style: string): string {
    switch (style) {
      case 'info': return 'information-circle';
      case 'warning': return 'warning';
      case 'success': return 'checkmark-circle';
      case 'danger': return 'alert-circle';
      default: return 'information-circle';
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  }

  formatReadTime(minutes: number): string {
    return `${minutes} min read`;
  }

  getVideoEmbedUrl(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        return url;
      }
      
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    
    return url;
  }

  onTagClick(tag: string) {
    this.router.navigate(['/tabs/knowledge/search'], { 
      queryParams: { tag: tag } 
    });
  }

  ngOnDestroy() {
    // Clean up speech synthesis when component is destroyed
    this.stopReading();
  }
}