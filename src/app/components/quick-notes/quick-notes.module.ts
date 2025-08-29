import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { QuickNotesComponent } from './quick-notes.component';
import { NotesManagerModalModule } from '../notes-manager-modal/notes-manager-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotesManagerModalModule
  ],
  declarations: [
    QuickNotesComponent
  ],
  exports: [
    QuickNotesComponent
  ]
})
export class QuickNotesModule { }