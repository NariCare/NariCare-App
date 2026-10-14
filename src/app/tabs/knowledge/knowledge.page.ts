import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { ArticleCategory } from '../../models/knowledge-base.model';
import { illustrationForCategory } from './knowledge-illustrations';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.page.html',
  styleUrls: ['./knowledge.page.scss'],
})
export class KnowledgePage {
  categories$: Observable<ArticleCategory[]>;
  searchTerm = '';

  constructor(
    private knowledgeService: KnowledgeBaseService,
    private router: Router
  ) {
    this.categories$ = this.knowledgeService.getCategories();
  }

  illustrationFor(categoryId: string): string {
    return illustrationForCategory(categoryId);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.length > 2) {
      this.router.navigate(['/tabs/knowledge/search'], {
        queryParams: { q: this.searchTerm }
      });
    } else if (this.searchTerm.length === 0) {
      this.router.navigate(['/tabs/knowledge']);
    }
  }

  onSearchFocus() {
    this.router.navigate(['/tabs/knowledge/search']);
  }

  onCategorySelect(categoryId: string) {
    this.router.navigate(['/tabs/knowledge/category', categoryId]);
  }
}
