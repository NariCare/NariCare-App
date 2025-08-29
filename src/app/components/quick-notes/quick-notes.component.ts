import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Subscription, Observable } from 'rxjs';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { 
  ExpertNote, 
  ExpertLink, 
  QuickAccessResponse,
  CategoryInfo 
} from '../../models/expert-notes.model';
import { User } from '../../models/user.model';
import { NotesManagerModalComponent } from '../notes-manager-modal/notes-manager-modal.component';

@Component({
  selector: 'app-quick-notes',
  templateUrl: './quick-notes.component.html',
  styleUrls: ['./quick-notes.component.scss']
})
export class QuickNotesComponent implements OnInit, OnDestroy {
  @Input() user: User | null = null;
  
  quickNotes: ExpertNote[] = [];
  quickLinks: ExpertLink[] = [];
  recentlyUsed: Array<{item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}> = [];
  
  selectedTab: 'notes' | 'links' | 'recent' = 'notes';
  loading = false;
  error: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private expertNotesService: ExpertNotesService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadQuickAccess();
    this.subscribeToRecentlyUsed();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadQuickAccess() {
    this.loading = true;
    this.error = null;
    
    const subscription = this.expertNotesService.getQuickAccess(undefined, 'both')
      .subscribe({
        next: (response) => {
          this.quickNotes = response.data.notes;
          this.quickLinks = response.data.links;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading quick access:', error);
          this.error = 'Failed to load quick notes and links';
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

  handleRecentItemClick(recentItem: {item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}) {
    if (recentItem.type === 'note') {
      this.showNoteDetails(recentItem.item as ExpertNote);
    } else {
      this.showLinkDetails(recentItem.item as ExpertLink);
    }
  }

  async showNoteDetails(note: ExpertNote) {
    const alert = await this.alertController.create({
      header: note.title,
      message: `<div style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${note.content}</div>`,
      buttons: [
        {
          text: 'Copy',
          handler: () => {
            this.useNote(note);
          }
        },
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });
    
    await alert.present();
  }

  async showLinkDetails(link: ExpertLink) {
    const alert = await this.alertController.create({
      header: link.title,
      message: `
        <p><strong>URL:</strong> ${link.url}</p>
        ${link.description ? `<p><strong>Description:</strong> ${link.description}</p>` : ''}
        <p><strong>Category:</strong> ${this.getCategoryLabel(link.category, 'link')}</p>
        <p><strong>Used:</strong> ${link.click_count} times</p>
      `,
      buttons: [
        {
          text: 'Open Link',
          handler: () => {
            this.useLink(link);
          }
        },
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });
    
    await alert.present();
  }

  async openFullManager() {
    const modal = await this.modalController.create({
      component: NotesManagerModalComponent,
      cssClass: 'notes-manager-modal'
    });
    
    modal.onDidDismiss().then(() => {
      // Refresh quick access after modal closes
      this.loadQuickAccess();
    });
    
    await modal.present();
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

  refreshQuickAccess() {
    this.loadQuickAccess();
  }

  trackById(index: number, item: ExpertNote | ExpertLink): string {
    return item.id;
  }

  trackByRecentId(index: number, item: {item: ExpertNote | ExpertLink, type: 'note' | 'link', usedAt: Date}): string {
    return item.item.id + '_' + item.usedAt.getTime();
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