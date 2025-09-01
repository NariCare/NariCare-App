import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConsultationDetailPageRoutingModule } from './consultation-detail-routing.module';
import { QuickNotesModule } from '../components/quick-notes/quick-notes.module';

import { ConsultationDetailPage } from './consultation-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConsultationDetailPageRoutingModule,
    QuickNotesModule
  ],
  declarations: [ConsultationDetailPage]
})
export class ConsultationDetailPageModule {}
