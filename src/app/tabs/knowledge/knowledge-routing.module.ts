import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { KnowledgePage } from './knowledge.page';

const routes: Routes = [
  {
    path: '',
    component: KnowledgePage
  },
  {
    path: 'article/:id',
    loadChildren: () => import('./article-detail/article-detail.module').then(m => m.ArticleDetailPageModule)
  },
  {
    path: 'category/:id',
    loadChildren: () => import('./category-detail/category-detail.module').then(m => m.CategoryDetailPageModule)
  },
  {
    path: 'search',
    loadChildren: () => import('./search/search.module').then(m => m.SearchPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KnowledgePageRoutingModule {}