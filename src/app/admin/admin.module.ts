import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AdminGuard } from '../guards/admin.guard';
import { AdminShellComponent } from './shell/admin-shell.component';
import { AdminChartComponent } from './components/admin-chart.component';
import { AiReviewCardComponent } from './components/ai-review-card.component';
import { AdminDashboardPage } from './pages/dashboard/admin-dashboard.page';
import { AdminMothersPage } from './pages/mothers/admin-mothers.page';
import { AdminMotherPage } from './pages/mother/admin-mother.page';
import { AdminAiReviewPage } from './pages/ai-review/admin-ai-review.page';
import { BabyOverviewComponent } from './pages/mother/tabs/baby-overview.component';
import { FeedingTabComponent } from './pages/mother/tabs/feeding-tab.component';
import { GrowthTabComponent } from './pages/mother/tabs/growth-tab.component';
import { DiapersTabComponent } from './pages/mother/tabs/diapers-tab.component';
import { MoodTabComponent } from './pages/mother/tabs/mood-tab.component';
import { AiTabComponent } from './pages/mother/tabs/ai-tab.component';
import { EventsTabComponent } from './pages/mother/tabs/events-tab.component';
import { AccountTabComponent } from './pages/mother/tabs/account-tab.component';
import { PregnancyOverviewComponent } from './pages/mother/tabs/pregnancy-overview.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivateChild: [AdminGuard],
    children: [
      { path: '', component: AdminDashboardPage, title: 'Admin - Dashboard' },
      { path: 'mothers', component: AdminMothersPage, data: { segment: 'with_baby' }, title: 'Admin - Mothers with baby' },
      { path: 'pregnant', component: AdminMothersPage, data: { segment: 'pregnant' }, title: 'Admin - Pregnant mothers' },
      { path: 'mothers/:userId', component: AdminMotherPage, title: 'Admin - Mother profile' },
      { path: 'ai-review', component: AdminAiReviewPage, title: 'Admin - AI Ground Truth' },
      { path: '**', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [
    AdminShellComponent, AdminChartComponent, AiReviewCardComponent,
    AdminDashboardPage, AdminMothersPage, AdminMotherPage, AdminAiReviewPage,
    BabyOverviewComponent, FeedingTabComponent, GrowthTabComponent, DiapersTabComponent, MoodTabComponent,
    AiTabComponent, EventsTabComponent, AccountTabComponent, PregnancyOverviewComponent
  ]
})
export class AdminModule {}
