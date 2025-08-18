import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { Article } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-article-detail',
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.scss']
})
export class ArticleDetailComponent implements OnInit {
  article$: Observable<Article | undefined>;
  articleId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService
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
              html += `<div class="media-thumbnail">`;
              html += `<img src="${media.thumbnail}" alt="${media.title}" />`;
              html += `<div class="media-play-button">`;
              html += `<ion-icon name="play"></ion-icon>`;
              html += `</div>`;
              html += `</div>`;
              html += `<div class="media-info">`;
              html += `<h4>${media.title}</h4>`;
              html += `<p>${media.description}</p>`;
              html += `<a href="${media.url}" target="_blank" class="media-link">Watch Video</a>`;
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