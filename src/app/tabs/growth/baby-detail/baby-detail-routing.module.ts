import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BabyDetailPage } from './baby-detail.page';

const routes: Routes = [
  {
    path: '',
    component: BabyDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BabyDetailPageRoutingModule {}