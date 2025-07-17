import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { KnowledgePage } from './knowledge.page';

const routes: Routes = [
  {
    path: '',
    component: KnowledgePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KnowledgePageRoutingModule {}