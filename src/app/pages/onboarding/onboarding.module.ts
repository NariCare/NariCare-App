import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OnboardingPageRoutingModule } from './onboarding-routing.module';
import { OnboardingPage } from './onboarding.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    OnboardingPageRoutingModule
  ],
  declarations: [OnboardingPage]
})
export class OnboardingPageModule {}