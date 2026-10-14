import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DayDetailsPage } from './day-details.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: DayDetailsPage }])],
  declarations: [DayDetailsPage]
})
export class DayDetailsPageModule {}
