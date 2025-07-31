import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SpecificWeekPage } from './specific-week.page';

const routes: Routes = [
  {
    path: '',
    component: SpecificWeekPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SpecificWeekPageRoutingModule {}