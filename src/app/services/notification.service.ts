import { Injectable } from '@angular/core';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private currentMessage = new BehaviorSubject<any>(null);

  constructor(
    private afMessaging: AngularFireMessaging,
    private firestore: AngularFirestore,
    private toastController: ToastController
  ) {}

  async requestPermission(userId: string): Promise<void> {
    try {
      const token = await this.afMessaging.requestToken.toPromise();
      if (token) {
        await this.saveTokenToFirestore(token, userId);
      }
    } catch (error) {
      console.error('Unable to get permission to notify.', error);
    }
  }

  private async saveTokenToFirestore(token: string, userId: string): Promise<void> {
    await this.firestore.doc(`users/${userId}`).update({
      fcmToken: token
    });
  }

  receiveMessage(): void {
    this.afMessaging.messages.subscribe(
      (payload) => {
        console.log('New message received. ', payload);
        this.currentMessage.next(payload);
        this.showNotificationToast(payload);
      }
    );
  }

  private async showNotificationToast(payload: any): Promise<void> {
    const toast = await this.toastController.create({
      header: payload.notification?.title || 'New Notification',
      message: payload.notification?.body || 'You have a new message',
      duration: 5000,
      position: 'top',
      buttons: [
        {
          text: 'View',
          handler: () => {
            // Handle notification tap
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async scheduleNotification(userId: string, type: string, title: string, body: string, scheduledTime: Date): Promise<void> {
    const notification = {
      userId,
      type,
      title,
      body,
      scheduledTime,
      sent: false,
      createdAt: new Date()
    };

    await this.firestore.collection('scheduled-notifications').add(notification);
  }
}