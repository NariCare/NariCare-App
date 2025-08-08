import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GrowthPageRoutingModule } from './growth-routing.module';
import { GrowthPage } from './growth.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    GrowthPageRoutingModule,
    SharedModule
  ],
  declarations: [GrowthPage]
})
export class GrowthPageModule {}