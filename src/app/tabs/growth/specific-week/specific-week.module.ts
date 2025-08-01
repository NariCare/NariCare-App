import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SpecificWeekPageRoutingModule } from './specific-week-routing.module';
import { SpecificWeekPage } from './specific-week.page';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SpecificWeekPageRoutingModule,
    SharedModule
  ],
  declarations: [SpecificWeekPage]
})
export class SpecificWeekPageModule {}