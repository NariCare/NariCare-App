import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { 
  ExpertNote, 
  ExpertLink, 
  CreateNoteRequest, 
  CreateLinkRequest,
  NoteCategory,
  LinkCategory,
  NOTE_CATEGORIES,
  LINK_CATEGORIES 
} from '../../models/expert-notes.model';

@Component({
  selector: 'app-notes-manager-inline',
  templateUrl: './notes-manager-inline.component.html',
  styleUrls: ['./notes-manager-inline.component.scss']
})
export class NotesManagerInlineComponent implements OnInit, OnDestroy {
  selectedTab: 'notes' | 'links' = 'notes';
  
  // Notes data
  notes: ExpertNote[] = [];
  notesLoading = false;
  
  // Links data
  links: ExpertLink[] = [];
  linksLoading = false;
  
  // Search and filters
  searchQuery = '';
  selectedCategory = '';
  showFavoritesOnly = false;
  showSharedOnly = false;
  
  // Form state
  showNoteForm = false;
  showLinkForm = false;
  editingNote: ExpertNote | null = null;
  editingLink: ExpertLink | null = null;
  
  // Form data
  noteForm: CreateNoteRequest = {
    title: '',
    content: '',
    category: 'general',
    tags: [],
    isShared: false,
    isFavorite: false
  };
  
  linkForm: CreateLinkRequest = {
    title: '',
    url: '',
    description: '',
    category: 'general',
    tags: [],
    isShared: false,
    isFavorite: false
  };
  
  tagInput = '';
  
  // Available options
  noteCategories = NOTE_CATEGORIES;
  linkCategories = LINK_CATEGORIES;
  
  private subscriptions: Subscription[] = [];
  private searchTimeout: any;

  constructor(
    private expertNotesService: ExpertNotesService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadNotes();
    this.loadLinks();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // ==================== LOADING METHODS ====================

  private loadNotes() {
    this.notesLoading = true;
    
    const params: any = {
      search: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      isFavorite: this.showFavoritesOnly || undefined,
      isShared: this.showSharedOnly || undefined,
      limit: 50
    };

    const subscription = this.expertNotesService.getNotes(params)
      .subscribe({
        next: (response) => {
          this.notes = response.data;
          this.notesLoading = false;
        },
        error: (error) => {
          console.error('Error loading notes:', error);
          this.showErrorToast('Failed to load notes');
          this.notesLoading = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }

  private loadLinks() {
    this.linksLoading = true;
    
    const params: any = {
      search: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      isFavorite: this.showFavoritesOnly || undefined,
      isShared: this.showSharedOnly || undefined,
      limit: 50
    };

    const subscription = this.expertNotesService.getLinks(params)
      .subscribe({
        next: (response) => {
          this.links = response.data;
          this.linksLoading = false;
        },
        error: (error) => {
          console.error('Error loading links:', error);
          this.showErrorToast('Failed to load links');
          this.linksLoading = false;
        }
      });
    
    this.subscriptions.push(subscription);
  }

  // ==================== SEARCH AND FILTER METHODS ====================

  onSearchChange() {
    // Debounce search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  applyFilters() {
    if (this.selectedTab === 'notes') {
      this.loadNotes();
    } else {
      this.loadLinks();
    }
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.showFavoritesOnly = false;
    this.showSharedOnly = false;
    this.applyFilters();
  }

  onTabChange() {
    this.resetForm();
  }

  // ==================== FORM METHODS ====================

  startCreateNote() {
    this.resetNoteForm();
    this.showNoteForm = true;
  }

  startEditNote(note: ExpertNote) {
    this.editingNote = note;
    this.noteForm = {
      title: note.title,
      content: note.content,
      category: note.category,
      tags: [...note.tags],
      isShared: note.is_shared,
      isFavorite: note.is_favorite
    };
    this.showNoteForm = true;
  }

  startCreateLink() {
    this.resetLinkForm();
    this.showLinkForm = true;
  }

  startEditLink(link: ExpertLink) {
    this.editingLink = link;
    this.linkForm = {
      title: link.title,
      url: link.url,
      description: link.description,
      category: link.category,
      tags: [...link.tags],
      isShared: link.is_shared,
      isFavorite: link.is_favorite
    };
    this.showLinkForm = true;
  }

  resetForm() {
    this.showNoteForm = false;
    this.showLinkForm = false;
    this.editingNote = null;
    this.editingLink = null;
    this.resetNoteForm();
    this.resetLinkForm();
  }

  private resetNoteForm() {
    this.noteForm = {
      title: '',
      content: '',
      category: 'general',
      tags: [],
      isShared: false,
      isFavorite: false
    };
    this.tagInput = '';
  }

  private resetLinkForm() {
    this.linkForm = {
      title: '',
      url: '',
      description: '',
      category: 'general',
      tags: [],
      isShared: false,
      isFavorite: false
    };
    this.tagInput = '';
  }

  // ==================== TAG MANAGEMENT ====================

  addTag(formType: 'note' | 'link') {
    if (!this.tagInput.trim()) return;
    
    const form = formType === 'note' ? this.noteForm : this.linkForm;
    const tag = this.tagInput.trim().toLowerCase();
    
    if (!form.tags.includes(tag)) {
      form.tags.push(tag);
    }
    
    this.tagInput = '';
  }

  removeTag(tag: string, formType: 'note' | 'link') {
    const form = formType === 'note' ? this.noteForm : this.linkForm;
    form.tags = form.tags.filter(t => t !== tag);
  }

  onTagInputKeypress(event: KeyboardEvent, formType: 'note' | 'link') {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag(formType);
    }
  }

  // ==================== CRUD OPERATIONS ====================

  async saveNote() {
    if (!this.noteForm.title.trim() || !this.noteForm.content.trim()) {
      await this.showErrorToast('Title and content are required');
      return;
    }

    try {
      if (this.editingNote) {
        // Update existing note
        await this.expertNotesService.updateNote(this.editingNote.id, this.noteForm).toPromise();
        await this.showSuccessToast('Note updated successfully');
      } else {
        // Create new note
        await this.expertNotesService.createNote(this.noteForm).toPromise();
        await this.showSuccessToast('Note created successfully');
      }
      
      this.resetForm();
      this.loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      await this.showErrorToast('Failed to save note');
    }
  }

  async saveLink() {
    if (!this.linkForm.title.trim() || !this.linkForm.url.trim()) {
      await this.showErrorToast('Title and URL are required');
      return;
    }

    try {
      if (this.editingLink) {
        // Update existing link
        await this.expertNotesService.updateLink(this.editingLink.id, this.linkForm).toPromise();
        await this.showSuccessToast('Link updated successfully');
      } else {
        // Create new link
        await this.expertNotesService.createLink(this.linkForm).toPromise();
        await this.showSuccessToast('Link created successfully');
      }
      
      this.resetForm();
      this.loadLinks();
    } catch (error) {
      console.error('Error saving link:', error);
      await this.showErrorToast('Failed to save link');
    }
  }

  async deleteNote(note: ExpertNote) {
    const alert = await this.alertController.create({
      header: 'Delete Note',
      message: `Are you sure you want to delete "${note.title}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.expertNotesService.deleteNote(note.id).toPromise();
              await this.showSuccessToast('Note deleted successfully');
              this.loadNotes();
            } catch (error) {
              console.error('Error deleting note:', error);
              await this.showErrorToast('Failed to delete note');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteLink(link: ExpertLink) {
    const alert = await this.alertController.create({
      header: 'Delete Link',
      message: `Are you sure you want to delete "${link.title}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.expertNotesService.deleteLink(link.id).toPromise();
              await this.showSuccessToast('Link deleted successfully');
              this.loadLinks();
            } catch (error) {
              console.error('Error deleting link:', error);
              await this.showErrorToast('Failed to delete link');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async useNote(note: ExpertNote) {
    try {
      const copied = await this.expertNotesService.copyNoteContent(note);
      if (copied) {
        await this.showSuccessToast('Note copied to clipboard');
        this.loadNotes(); // Refresh to update usage count
      }
    } catch (error) {
      console.error('Error using note:', error);
      await this.showErrorToast('Failed to copy note');
    }
  }

  async useLink(link: ExpertLink) {
    try {
      await this.expertNotesService.openLink(link);
      await this.showSuccessToast('Link opened');
      this.loadLinks(); // Refresh to update click count
    } catch (error) {
      console.error('Error opening link:', error);
      await this.showErrorToast('Failed to open link');
    }
  }

  // ==================== UTILITY METHODS ====================

  getCategoryLabel(categoryKey: string, type: 'note' | 'link'): string {
    const categories = type === 'note' ? this.noteCategories : this.linkCategories;
    const category = categories.find(cat => cat.key === categoryKey);
    return category?.label || categoryKey;
  }

  getCategoryIcon(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.icon || 'document-text';
  }

  getCategoryColor(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.color || 'medium';
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