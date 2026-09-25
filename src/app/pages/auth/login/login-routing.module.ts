import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginPage } from './login.page';

const routes: Routes = [
  { path: '', component: LoginPage, data: { portal: 'user' } },
  { path: 'admin', component: LoginPage, data: { portal: 'admin' } },
  { path: 'lc', component: LoginPage, data: { portal: 'lc' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginPageRoutingModule {}