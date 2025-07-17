import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GrowthPage } from './growth.page';

const routes: Routes = [
  {
    path: '',
    component: GrowthPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GrowthPageRoutingModule {}