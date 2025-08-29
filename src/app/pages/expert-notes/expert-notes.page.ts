import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackendAuthService } from '../../services/backend-auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-expert-notes',
  templateUrl: './expert-notes.page.html',
  styleUrls: ['./expert-notes.page.scss'],
})
export class ExpertNotesPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: BackendAuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Check user permissions
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (!this.isExpert()) {
          this.router.navigate(['/tabs/dashboard']);
          this.showErrorToast('Access denied. Only experts and admins can access this page.');
          return;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  isExpert(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  refreshData() {
    // The NotesManagerInlineComponent will handle its own refresh
    // This method is kept for the refresh button in the header
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}