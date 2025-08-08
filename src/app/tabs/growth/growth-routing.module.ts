import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GrowthPage } from './growth.page';

const routes: Routes = [
  {
    path: '',
    component: GrowthPage
  },
  {
    path: 'baby-detail/:id',
    loadChildren: () => import('./baby-detail/baby-detail.module').then(m => m.BabyDetailPageModule)
  },
  {
    path: 'timeline',
    loadChildren: () => import('./timeline/timeline.module').then(m => m.TimelinePageModule)
  },
  {
    path: 'timeline/week/:weekNumber',
    loadChildren: () => import('./specific-week/specific-week.module').then(m => m.SpecificWeekPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GrowthPageRoutingModule {}