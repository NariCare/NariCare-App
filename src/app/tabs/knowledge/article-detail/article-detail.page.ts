import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { Article } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-article-detail-page',
  templateUrl: './article-detail.page.html',
  styleUrls: ['./article-detail.page.scss']
})
export class ArticleDetailPage implements OnInit {
  article$: Observable<Article | undefined>;
  articleId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService,
    private sanitizer: DomSanitizer
  ) {
    this.article$ = new Observable();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.articleId = params['id'];
      if (this.articleId) {
        this.article$ = this.knowledgeService.getArticle(this.articleId);
      }
    });
  }

  goBack() {
    this.router.navigate(['/tabs/knowledge']);
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

  loadVideo(media: any) {
    if (this.isVideoUrl(media.url)) {
      media.safeUrl = this.getSafeVideoEmbedUrl(media.url);
      media.loaded = true;
    }
  }

  isVideoUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  }

  getSafeVideoEmbedUrl(url: string): SafeResourceUrl {
    const embedUrl = this.getVideoEmbedUrl(url);
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVideoEmbedUrl(url: string): string {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return url;
  }

  getVideoThumbnail(url: string): string {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return 'https://via.placeholder.com/640x360?text=Video+Thumbnail';
  }

  openInNewTab(url: string) {
    window.open(url, '_blank');
  }

  renderContent(content: any): string {
    if (!content || !content.sections) return '';
    
    let html = '';
    
    content.sections.forEach((section: any) => {
      switch (section.type) {
        case 'text':
          html += `<p class="content-text">${section.content}</p>`;
          break;
        case 'heading':
          const level = section.level || 2;
          html += `<h${level} class="content-heading">${section.content}</h${level}>`;
          break;
        case 'list':
          const listType = section.style === 'numbered' ? 'ol' : 'ul';
          const listClass = section.style === 'numbered' ? 'content-list-numbered' : 'content-list-bullet';
          html += `<${listType} class="${listClass}">`;
          section.items.forEach((item: string) => {
            html += `<li>${item}</li>`;
          });
          html += `</${listType}>`;
          break;
        case 'callout':
          const calloutClass = `content-callout content-callout-${section.style}`;
          html += `<div class="${calloutClass}">`;
          if (section.title) {
            html += `<h4 class="callout-title">${section.title}</h4>`;
          }
          html += `<p class="callout-content">${section.content}</p>`;
          html += `</div>`;
          break;
        case 'table':
          html += `<div class="content-table-wrapper">`;
          html += `<table class="content-table">`;
          if (section.headers) {
            html += `<thead><tr>`;
            section.headers.forEach((header: string) => {
              html += `<th>${header}</th>`;
            });
            html += `</tr></thead>`;
          }
          html += `<tbody>`;
          section.rows.forEach((row: string[]) => {
            html += `<tr>`;
            row.forEach((cell: string) => {
              html += `<td>${cell}</td>`;
            });
            html += `</tr>`;
          });
          html += `</tbody></table></div>`;
          break;
        case 'media':
          if (section.media && section.media.length > 0) {
            html += `<div class="content-media">`;
            section.media.forEach((media: any) => {
              html += `<div class="media-item">`;
              
              if (this.isVideoUrl(media.url)) {
                // Video content
                html += `<div class="media-video" id="video-${media.url.replace(/[^a-zA-Z0-9]/g, '')}">`;
                if (!media.loaded) {
                  html += `<div class="video-thumbnail" onclick="loadVideo('${media.url}')">`;
                  html += `<img src="${this.getVideoThumbnail(media.url)}" alt="${media.title}" />`;
                  html += `<div class="video-play-button">`;
                  html += `<ion-icon name="play"></ion-icon>`;
                  html += `</div>`;
                  html += `</div>`;
                } else {
                  html += `<iframe src="${media.safeUrl}" frameborder="0" allowfullscreen></iframe>`;
                }
                html += `</div>`;
              } else {
                // Image content
                html += `<div class="media-image">`;
                html += `<img src="${media.url}" alt="${media.title}" />`;
                html += `</div>`;
              }
              
              html += `<div class="media-info">`;
              html += `<h4>${media.title}</h4>`;
              html += `<p>${media.description}</p>`;
              html += `<div class="media-actions">`;
              if (this.isVideoUrl(media.url)) {
                if (!media.loaded) {
                  html += `<button class="media-button primary" onclick="loadVideo('${media.url}')">`;
                  html += `<ion-icon name="play"></ion-icon> Play Video`;
                  html += `</button>`;
                } else {
                  html += `<button class="media-button secondary" onclick="openInNewTab('${media.url}')">`;
                  html += `<ion-icon name="open-outline"></ion-icon> Open in New Tab`;
                  html += `</button>`;
                }
              }
              html += `</div>`;
              html += `</div>`;
              html += `</div>`;
            });
            html += `</div>`;
          }
          break;
      }
    });
    
    return html;
  }
}