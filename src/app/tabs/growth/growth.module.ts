import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GrowthPageRoutingModule } from './growth-routing.module';
import { GrowthPage } from './growth.page';
import { WeightChartComponent } from '../../components/weight-chart/weight-chart.component';
import { TimelineModalComponent } from '../../components/timeline-modal/timeline-modal.component';
import { SpecificWeekModalComponent } from '../../components/specific-week-modal/specific-week-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    GrowthPageRoutingModule
  ],
  declarations: [GrowthPage, WeightChartComponent, TimelineModalComponent, SpecificWeekModalComponent]
})
export class GrowthPageModule {}