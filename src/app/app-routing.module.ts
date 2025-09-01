import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthPageModule)
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./pages/onboarding/onboarding.module').then(m => m.OnboardingPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'video-call/:consultationId',
    loadChildren: () => import('./pages/video-call/video-call.module').then(m => m.VideoCallPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'video-call-legacy/:meetingId',
    loadChildren: () => import('./pages/video-call/video-call.module').then(m => m.VideoCallPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'personal-info',
    loadChildren: () => import('./pages/personal-info/personal-info.module').then(m => m.PersonalInfoPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'expert-notes',
    loadChildren: () => import('./pages/expert-notes/expert-notes.module').then(m => m.ExpertNotesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'expert-consultations',
    loadChildren: () => import('./components/expert-consultations/expert-consultations.module').then( m => m.ExpertConsultationsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'consultation-detail/:id',
    loadChildren: () => import('./consultation-detail/consultation-detail.module').then( m => m.ConsultationDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }