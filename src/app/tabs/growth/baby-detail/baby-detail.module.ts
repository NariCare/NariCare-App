import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BabyDetailPageRoutingModule } from './baby-detail-routing.module';
import { BabyDetailPage } from './baby-detail.page';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BabyDetailPageRoutingModule,
    SharedModule
  ],
  declarations: [BabyDetailPage]
})
export class BabyDetailPageModule {}