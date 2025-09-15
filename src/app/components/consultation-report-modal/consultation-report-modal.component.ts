import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Consultation } from '../../models/consultation.model';

@Component({
  selector: 'app-consultation-report-modal',
  templateUrl: './consultation-report-modal.component.html',
  styleUrls: ['./consultation-report-modal.component.scss'],
})
export class ConsultationReportModalComponent {
  @Input() consultation!: Consultation;
  @Input() expertName!: string;

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }

  formatDate(dateInput: string | Date): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  formatTime(dateInput: string | Date): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid time';
    }
  }

  formatTopic(topic: string): string {
    return topic?.replace(/-/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'General Consultation';
  }

  getFormattedNotes(): string {
    return this.consultation.expert_notes?.replace(/\n/g, '<br>') || '';
  }
}