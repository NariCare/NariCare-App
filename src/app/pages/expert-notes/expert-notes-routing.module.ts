import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ExpertNotesPage } from './expert-notes.page';

const routes: Routes = [
  {
    path: '',
    component: ExpertNotesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpertNotesPageRoutingModule {}