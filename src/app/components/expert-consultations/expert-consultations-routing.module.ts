import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ExpertConsultationsPage } from './expert-consultations.page';

const routes: Routes = [
  {
    path: '',
    component: ExpertConsultationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpertConsultationsPageRoutingModule {}
