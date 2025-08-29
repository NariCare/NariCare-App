import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExpertNotesPageRoutingModule } from './expert-notes-routing.module';
import { ExpertNotesPage } from './expert-notes.page';
import { QuickNotesModule } from '../../components/quick-notes/quick-notes.module';
import { NotesManagerInlineComponent } from '../../components/notes-manager-inline/notes-manager-inline.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpertNotesPageRoutingModule,
    QuickNotesModule
  ],
  declarations: [
    ExpertNotesPage,
    NotesManagerInlineComponent
  ]
})
export class ExpertNotesPageModule {}