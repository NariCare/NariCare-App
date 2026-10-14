import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FeedsHistoryPageRoutingModule } from './feeds-history-routing.module';
import { FeedsHistoryPage } from './feeds-history.page';

@NgModule({
  imports: [CommonModule, IonicModule, FeedsHistoryPageRoutingModule],
  declarations: [FeedsHistoryPage]
})
export class FeedsHistoryPageModule {}
