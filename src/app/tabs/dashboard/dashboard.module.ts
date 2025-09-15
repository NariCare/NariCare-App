import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { SharedModule } from '../../shared/shared.module';
import { ExpertConsultationsPageModule } from '../../components/expert-consultations/expert-consultations.module';
import { ConsultationReportModalComponent } from '../../components/consultation-report-modal/consultation-report-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardPageRoutingModule,
    SharedModule,
    ExpertConsultationsPageModule
  ],
  declarations: [
    DashboardPage,
    ConsultationReportModalComponent
  ],
  providers: []
})
export class DashboardPageModule {}