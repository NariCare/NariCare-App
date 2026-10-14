import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { DailySummaryPage } from './daily-summary.page';
import { DailySummaryChartComponent } from '../../../components/daily-summary-chart/daily-summary-chart.component';

@NgModule({
  imports: [CommonModule, IonicModule, SharedModule, RouterModule.forChild([{ path: '', component: DailySummaryPage }])],
  declarations: [DailySummaryPage, DailySummaryChartComponent]
})
export class DailySummaryPageModule {}
