import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { Article, ArticleCategory } from '../../../models/knowledge-base.model';
import { illustrationForCategory } from '../knowledge-illustrations';

@Component({
  selector: 'app-category-detail',
  templateUrl: './category-detail.page.html',
  styleUrls: ['./category-detail.page.scss']
})
export class CategoryDetailPage implements OnInit {
  category$: Observable<ArticleCategory | undefined>;
  articles$: Observable<Article[]>;
  categoryId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private knowledgeService: KnowledgeBaseService
  ) {
    this.category$ = new Observable();
    this.articles$ = new Observable();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.categoryId = params['id'];
      if (this.categoryId) {
        this.loadCategoryData();
      }
    });
  }

  private loadCategoryData() {
    // Get category details
    this.category$ = this.knowledgeService.getCategories().pipe(
      map(categories => categories.find(cat => cat.id === this.categoryId))
    );

    // Get articles for this category
    this.articles$ = this.knowledgeService.getArticlesByCategory(this.categoryId);
  }

  goBack() {
    this.router.navigate(['/tabs/knowledge']);
  }

  onArticleSelect(article: Article) {
    this.router.navigate(['/tabs/knowledge/article', article.id]);
  }

  illustrationFor(categoryId: string): string {
    return illustrationForCategory(categoryId);
  }
}