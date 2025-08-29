import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NotesManagerModalComponent } from './notes-manager-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [
    NotesManagerModalComponent
  ],
  exports: [
    NotesManagerModalComponent
  ]
})
export class NotesManagerModalModule { }