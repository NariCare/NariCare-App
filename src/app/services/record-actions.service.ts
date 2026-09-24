import { Injectable } from '@angular/core';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular';
import { BackendGrowthService } from './backend-growth.service';
import { BackendPumpingService } from './backend-pumping.service';
import { BackendAuthService } from './backend-auth.service';
import { FeedLogModalComponent } from '../components/feed-log-modal/feed-log-modal.component';
import { PumpingLogModalComponent } from '../components/pumping-log-modal/pumping-log-modal.component';

type Action = 'edit' | 'delete' | undefined;
export type FeedKind = 'direct' | 'expressed' | 'formula';

/** Edit/Delete sheet for a logged feed or pumping record, shared by growth and See-all pages. */
@Injectable({ providedIn: 'root' })
export class RecordActionsService {
  constructor(
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private growthService: BackendGrowthService,
    private pumpingService: BackendPumpingService,
    private authService: BackendAuthService
  ) {}

  /** kind = the tapped line; deleting it keeps the log's other feed types. */
  async openFeedActions(record: any, babyId: string, kind?: FeedKind): Promise<void> {
    if (!record?.id) { return; }
    const action = await this.pickAction('Feed log');
    if (action === 'edit') {
      await this.openModal(FeedLogModalComponent, { editRecord: record, selectedBaby: this.babyFor(babyId) });
    } else if (action === 'delete') {
      const types: FeedKind[] = (record.feedTypes || record.feed_types || []).filter((t: FeedKind) => this.hasType(record, t));
      const onlyThis = kind && types.length > 1 && types.includes(kind);
      const label = { direct: 'direct feed', expressed: 'expressed milk', formula: 'formula' }[kind || 'direct'];
      const message = onlyThis ? `Only the ${label} entry is removed. The rest of this feed log stays.` : 'This feed log will be removed.';
      if (!(await this.confirmDelete(onlyThis ? `Delete ${label}?` : 'Delete this feed?', message))) { return; }
      if (onlyThis) {
        const rest = { ...record, feedTypes: types.filter(t => t !== kind) };
        if (kind === 'direct') rest.directFeedDetails = undefined;
        if (kind === 'expressed') rest.expressedMilkDetails = undefined;
        if (kind === 'formula') rest.formulaDetails = undefined;
        const day = String(record.recordDate || record.record_date || '').slice(0, 10);
        await this.run(() => this.growthService.updateFeedRecord(record.id, babyId, rest, day), 'Entry deleted', 'Could not delete the entry. Please try again.');
      } else {
        await this.run(() => this.growthService.deleteFeedRecord(record.id, babyId), 'Feed log deleted', 'Could not delete the feed log. Please try again.');
      }
    }
  }

  private hasType(r: any, t: FeedKind): boolean {
    return t === 'direct' ? !!r.directFeedDetails : t === 'expressed' ? !!r.expressedMilkDetails?.quantity : !!r.formulaDetails?.quantity;
  }

  async openPumpActions(record: any, babyId: string): Promise<void> {
    if (!record?.id) { return; }
    const action = await this.pickAction('Pumping session');
    if (action === 'edit') {
      await this.openModal(PumpingLogModalComponent, { editRecord: record, babyId });
    } else if (action === 'delete') {
      if (await this.confirmDelete('Delete this session?', 'This pumping session will be removed.')) {
        await this.run(async () => {
          await this.pumpingService.deletePumpingRecord(record.id).toPromise();
          this.growthService.refreshPumping(babyId);
        }, 'Pumping session deleted', 'Could not delete the session. Please try again.');
      }
    }
  }

  private babyFor(babyId: string): any {
    return this.authService.getCurrentUser()?.babies?.find((b: any) => b.id === babyId);
  }

  private async pickAction(header: string): Promise<Action> {
    const sheet = await this.actionSheetController.create({
      header,
      buttons: [
        { text: 'Edit', icon: 'create-outline', data: 'edit' },
        { text: 'Delete', icon: 'trash-outline', role: 'destructive', data: 'delete' },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    await sheet.present();
    const { data, role } = await sheet.onDidDismiss();
    return role === 'cancel' || role === 'backdrop' ? undefined : data;
  }

  private async confirmDelete(header: string, message: string): Promise<boolean> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  private async openModal(component: any, componentProps: Record<string, any>): Promise<void> {
    const modal = await this.modalController.create({ component, componentProps });
    await modal.present();
    await modal.onDidDismiss();
  }

  private async run(work: () => Promise<void>, success: string, failure: string): Promise<void> {
    try {
      await work();
      await this.toast(success, 'success');
    } catch (error) {
      console.error(failure, error);
      await this.toast(failure, 'danger');
    }
  }

  private async toast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, color, duration: 2500, position: 'top' });
    await toast.present();
  }
}
