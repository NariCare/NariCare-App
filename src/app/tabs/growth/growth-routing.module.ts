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
    path: 'feeds/:babyId',
    loadChildren: () => import('./feeds-history/feeds-history.module').then(m => m.FeedsHistoryPageModule)
  },
  {
    path: 'pumping/:babyId',
    loadChildren: () => import('./pumping-history/pumping-history.module').then(m => m.PumpingHistoryPageModule)
  },
  {
    path: 'daily-summary/:babyId/day/:date',
    loadChildren: () => import('./daily-summary/day/day-details.module').then(m => m.DayDetailsPageModule)
  },
  {
    path: 'daily-summary/:babyId/history',
    loadChildren: () => import('./daily-summary/history/daily-history.module').then(m => m.DailyHistoryPageModule)
  },
  {
    path: 'daily-summary/:babyId',
    loadChildren: () => import('./daily-summary/daily-summary.module').then(m => m.DailySummaryPageModule)
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