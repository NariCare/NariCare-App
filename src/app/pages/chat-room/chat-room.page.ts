import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatRoom, ChatMessage, ChatAttachment } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { VideoPlayerModalComponent } from '../../components/video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.page.html',
  styleUrls: ['./chat-room.page.scss'],
})
export class ChatRoomPage implements OnInit, AfterViewChecked {
  @ViewChild('groupMessagesContainer', { static: false }) groupMessagesContainer!: ElementRef;
  
  selectedRoom: ChatRoom | null = null;
  currentUser: User | null = null;
  groupMessageText = '';
  roomId: string = '';
  messages$: Observable<ChatMessage[]> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Get room ID from route parameters
    this.route.params.subscribe(params => {
      this.roomId = params['roomId'];
      if (this.roomId) {
        this.loadChatRoom();
      }
    });
  }

  ngAfterViewChecked() {
    // Auto-scroll to bottom when new messages arrive
    this.scrollToBottomGroup();
  }

  private loadChatRoom() {
    this.chatService.getChatRoom(this.roomId).subscribe(room => {
      if (room) {
        this.selectedRoom = room;
        this.messages$ = this.chatService.getMessages(this.roomId);
        
        // Join the room if user is not already a participant
        if (this.currentUser && !room.participants.includes(this.currentUser.uid)) {
          this.chatService.joinRoom(this.roomId, this.currentUser.uid);
        }
      } else {
        // Room not found, navigate back
        this.backToGroupList();
      }
    });
  }

  async sendGroupMessage() {
    if (this.groupMessageText.trim() && this.selectedRoom && this.currentUser) {
      const message: Omit<ChatMessage, 'id'> = {
        roomId: this.selectedRoom.id,
        senderId: this.currentUser.uid,
        senderName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        senderRole: 'user',
        message: this.groupMessageText.trim(),
        timestamp: new Date(),
        isEdited: false
      };
      
      await this.chatService.sendMessage(this.selectedRoom.id, message);
      this.groupMessageText = '';
      this.scrollToBottomGroup();
    }
  }

  onGroupKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.groupMessageText.trim()) {
        this.sendGroupMessage();
      }
    }
  }

  async openPhotoInput() {
    const alert = await this.alertController.create({
      header: 'Share Photo',
      message: 'Enter the URL of the photo you want to share',
      inputs: [
        {
          name: 'photoUrl',
          type: 'url',
          placeholder: 'https://example.com/photo.jpg'
        },
        {
          name: 'photoTitle',
          type: 'text',
          placeholder: 'Photo description (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Share',
          handler: (data) => {
            if (data.photoUrl && data.photoUrl.trim()) {
              this.sendAttachment('image', data.photoUrl.trim(), data.photoTitle?.trim());
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async openVideoLinkInput() {
    const alert = await this.alertController.create({
      header: 'Share Video Link',
      message: 'Share a helpful video with the group',
      inputs: [
        {
          name: 'videoUrl',
          type: 'url',
          placeholder: 'https://youtube.com/watch?v=...'
        },
        {
          name: 'videoTitle',
          type: 'text',
          placeholder: 'Video title (optional)'
        },
        {
          name: 'videoDescription',
          type: 'text',
          placeholder: 'Brief description (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Share',
          handler: (data) => {
            if (data.videoUrl && data.videoUrl.trim()) {
              this.sendAttachment('video', data.videoUrl.trim(), data.videoTitle?.trim(), data.videoDescription?.trim());
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async sendAttachment(type: 'image' | 'video', url: string, title?: string, description?: string) {
    const attachment: ChatAttachment = {
      id: this.generateId(),
      type,
      url,
      title,
      description,
      thumbnail: type === 'video' ? this.getYouTubeThumbnail(url) : undefined
    };

    const messageContent = type === 'image' ? 'Shared a photo' : `Shared a video: ${title || 'Video'}`;

    if (this.selectedRoom && this.currentUser) {
      const message: Omit<ChatMessage, 'id'> = {
        roomId: this.selectedRoom.id,
        senderId: this.currentUser.uid,
        senderName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        senderRole: 'user',
        message: messageContent,
        timestamp: new Date(),
        isEdited: false,
        attachments: [attachment]
      };
      
      await this.chatService.sendMessage(this.selectedRoom.id, message);
    }
    
    this.scrollToBottomGroup();
  }

  getYouTubeThumbnail(url: string): string {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  async openVideoModal(attachment: ChatAttachment) {
    const modal = await this.modalController.create({
      component: VideoPlayerModalComponent,
      componentProps: {
        videoUrl: attachment.url,
        title: attachment.title || 'Shared Video'
      },
      cssClass: 'video-modal'
    });
    return await modal.present();
  }

  private scrollToBottomGroup() {
    setTimeout(() => {
      if (this.groupMessagesContainer) {
        this.groupMessagesContainer.nativeElement.scrollTop = this.groupMessagesContainer.nativeElement.scrollHeight;
      }
    }, 300);
  }

  getMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  backToGroupList() {
    this.router.navigate(['/tabs/chat']);
  }
}