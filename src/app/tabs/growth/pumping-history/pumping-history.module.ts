import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PumpingHistoryPageRoutingModule } from './pumping-history-routing.module';
import { PumpingHistoryPage } from './pumping-history.page';

@NgModule({
  imports: [CommonModule, IonicModule, PumpingHistoryPageRoutingModule],
  declarations: [PumpingHistoryPage]
})
export class PumpingHistoryPageModule {}
