import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NotesLinksQuickComponent } from './notes-links-quick.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [
    NotesLinksQuickComponent
  ],
  exports: [
    NotesLinksQuickComponent
  ]
})
export class NotesLinksQuickModule { }