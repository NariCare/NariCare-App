import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { LegalDoc, LegalBlock, PRIVACY_POLICY, TERMS_OF_SERVICE } from './legal-content';

@Component({
  selector: 'app-legal-doc-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './legal-doc-modal.component.html',
  styleUrls: ['./legal-doc-modal.component.scss']
})
export class LegalDocModalComponent {
  @Input() doc: 'privacy' | 'terms' = 'privacy';

  constructor(private modalController: ModalController) {}

  get content(): LegalDoc {
    return this.doc === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY;
  }

  // Template narrowing helper for the block union.
  b(block: LegalBlock): any {
    return block;
  }

  close() {
    this.modalController.dismiss();
  }
}
