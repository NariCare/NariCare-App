import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FeedsHistoryPage } from './feeds-history.page';

const routes: Routes = [{ path: '', component: FeedsHistoryPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FeedsHistoryPageRoutingModule {}
