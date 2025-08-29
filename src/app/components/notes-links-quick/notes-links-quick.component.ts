import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-notes-links-quick',
  templateUrl: './notes-links-quick.component.html',
  styleUrls: ['./notes-links-quick.component.scss']
})
export class NotesLinksQuickComponent implements OnInit {
  @Input() user: User | null = null;

  notesCount = 0;
  linksCount = 0;
  recentCount = 0;
  loading = true;

  constructor(
    private router: Router,
    private expertNotesService: ExpertNotesService
  ) {}

  ngOnInit() {
    this.loadCounts();
  }

  private loadCounts() {
    this.loading = true;
    
    // Load quick access to get counts
    this.expertNotesService.getQuickAccess(undefined, 'both')
      .subscribe({
        next: (response) => {
          this.notesCount = response.data.notes.length;
          this.linksCount = response.data.links.length;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notes/links counts:', error);
          this.loading = false;
        }
      });

    // Get recently used count
    this.expertNotesService.recentlyUsed$.subscribe(items => {
      this.recentCount = items.length;
    });
  }

  navigateToExpertNotes() {
    this.router.navigate(['/expert-notes']);
  }

  isExpert(): boolean {
    return this.user?.role === 'expert' || this.user?.role === 'admin';
  }
}