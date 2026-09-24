import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PumpingHistoryPage } from './pumping-history.page';

const routes: Routes = [{ path: '', component: PumpingHistoryPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PumpingHistoryPageRoutingModule {}
