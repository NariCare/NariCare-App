import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { User } from '../../models/user.model';
import { ExpertNote, ExpertLink } from '../../models/expert-notes.model';

@Component({
  selector: 'app-expert-notes',
  templateUrl: './expert-notes.page.html',
  styleUrls: ['./expert-notes.page.scss'],
})
export class ExpertNotesPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  quickAccessNotes: ExpertNote[] = [];
  quickAccessLinks: ExpertLink[] = [];
  recentlyUsed: Array<{item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}> = [];
  
  selectedTab: 'quick' | 'manage' = 'quick';
  loading = false;
  error: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: BackendAuthService,
    private expertNotesService: ExpertNotesService,
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
        this.loadQuickAccess();
        this.subscribeToRecentlyUsed();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  isExpert(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  private loadQuickAccess() {
    this.loading = true;
    this.error = null;
    
    const subscription = this.expertNotesService.getQuickAccess(undefined, 'both')
      .subscribe({
        next: (response) => {
          this.quickAccessNotes = response.data.notes;
          this.quickAccessLinks = response.data.links;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading quick access:', error);
          this.error = 'Failed to load notes and links';
          this.loading = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }

  private subscribeToRecentlyUsed() {
    const subscription = this.expertNotesService.recentlyUsed$
      .subscribe(items => {
        this.recentlyUsed = items;
      });
    
    this.subscriptions.push(subscription);
  }

  async useNote(note: ExpertNote) {
    try {
      const copied = await this.expertNotesService.copyNoteContent(note);
      if (copied) {
        await this.showSuccessToast('Note copied to clipboard');
      } else {
        await this.showErrorToast('Failed to copy note');
      }
    } catch (error) {
      console.error('Error using note:', error);
      await this.showErrorToast('Failed to use note');
    }
  }

  async useLink(link: ExpertLink) {
    try {
      await this.expertNotesService.openLink(link);
      await this.showSuccessToast('Link opened in new tab');
    } catch (error) {
      console.error('Error using link:', error);
      await this.showErrorToast('Failed to open link');
    }
  }

  async useRecentItem(recentItem: {item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}) {
    if (recentItem.type === 'note') {
      await this.useNote(recentItem.item as ExpertNote);
    } else {
      await this.useLink(recentItem.item as ExpertLink);
    }
  }

  getCategoryLabel(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.label || categoryKey;
  }

  getCategoryIcon(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.icon || 'document-text';
  }

  getCategoryColor(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.color || 'medium';
  }

  formatUsageCount(count: number, type: 'note' | 'link'): string {
    if (count === 0) return type === 'note' ? 'Never used' : 'Never clicked';
    if (count === 1) return type === 'note' ? 'Used once' : 'Clicked once';
    return type === 'note' ? `Used ${count} times` : `Clicked ${count} times`;
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  getRecentItemPreview(recentItem: {item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}): string {
    if (recentItem.type === 'note') {
      const note = recentItem.item as ExpertNote;
      return note.content?.substring(0, 60) + (note.content?.length > 60 ? '...' : '');
    } else {
      const link = recentItem.item as ExpertLink;
      return link.url?.substring(0, 60) + (link.url?.length > 60 ? '...' : '');
    }
  }

  refreshData() {
    this.loadQuickAccess();
  }

  trackById(index: number, item: ExpertNote | ExpertLink): string {
    return item.id;
  }

  trackByRecentId(index: number, item: {item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}): string {
    return item.item.id + '_' + item.usedAt.getTime();
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