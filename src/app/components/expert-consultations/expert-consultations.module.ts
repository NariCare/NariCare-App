import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ExpertConsultationsPageRoutingModule } from './expert-consultations-routing.module';

import { ExpertConsultationsPage } from './expert-consultations.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpertConsultationsPageRoutingModule
  ],
  declarations: [ExpertConsultationsPage],
  exports: [ExpertConsultationsPage]
})
export class ExpertConsultationsPageModule {}
