import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ChatRoom } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { CreateGroupModalComponent } from '../../components/create-group-modal/create-group-modal.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  selectedTab = 'groups';
  chatRooms$: Observable<ChatRoom[]>;
  currentUser: User | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.chatRooms$ = this.chatService.getChatRooms();
  }

  ngOnInit() {
    // Subscribe to both auth services - prefer backend auth if available
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Check if we should open AI chat directly
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'ai') {
        this.selectedTab = 'ai';
      }
    });
  }

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
  }

  async joinRoom(room: ChatRoom) {
    this.router.navigate(['/tabs/chat/room', room.id]);
  }

  getRoomIcon(topic: string): string {
    switch (topic.toLowerCase()) {
      case 'newborn': return 'baby';
      case 'pumping': return 'water';
      case 'nutrition': return 'nutrition';
      case 'sleep': return 'moon';
      default: return 'chatbubbles';
    }
  }

  getTopicIcon(topic: string): string {
    const topicIcons: { [key: string]: string } = {
      'Newborn Care': 'baby',
      'Pumping Tips': 'water',
      'Sleep Training': 'moon',
      'Nutrition': 'nutrition',
      'Working Moms': 'briefcase',
      'Twins & Multiples': 'people'
    };
    return topicIcons[topic] || 'chatbubbles';
  }

  /**
   * Check if current user can create groups (expert or admin only)
   */
  canCreateGroups(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  /**
   * Open create group modal
   */
  async openCreateGroupModal() {
    if (!this.canCreateGroups()) {
      const alert = await this.alertController.create({
        header: 'Access Denied',
        message: 'Only experts and administrators can create groups.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const modal = await this.modalController.create({
      component: CreateGroupModalComponent,
      cssClass: 'create-group-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.created && result.data?.room) {
        // Refresh the chat rooms list
        this.chatRooms$ = this.chatService.getChatRooms();
        
        // Optionally navigate to the newly created room
        this.router.navigate(['/tabs/chat/room', result.data.room.id]);
      }
    });

    return await modal.present();
  }

}