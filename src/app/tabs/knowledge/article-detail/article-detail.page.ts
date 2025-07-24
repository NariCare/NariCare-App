import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { AuthService } from '../../../services/auth.service';
import { Article } from '../../../models/knowledge-base.model';
import { User } from '../../../models/user.model';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService,
    private authService: AuthService
  ) {
    this.article$ = new Observable();
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

  private checkBookmarkStatus() {
    if (this.user) {
      this.knowledgeService.getUserBookmarks(this.user.uid).subscribe(bookmarks => {
        this.isBookmarked = bookmarks.includes(this.articleId);
      });
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

  openVideo(url: string) {
    window.open(url, '_blank');
  }
}