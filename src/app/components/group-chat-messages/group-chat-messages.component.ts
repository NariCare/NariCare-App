import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Observable } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage, ChatRoom, MessageAttachment } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { VideoPlayerModalComponent } from '../video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-group-chat-messages',
  templateUrl: './group-chat-messages.component.html',
  styleUrls: ['./group-chat-messages.component.scss']
})
export class GroupChatMessagesComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() room: ChatRoom | null = null;
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  
  messages$: Observable<ChatMessage[]> | null = null;
  user: User | null = null;
  shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['room'] && this.room) {
      this.loadMessages();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private loadMessages() {
    if (this.room) {
      this.messages$ = this.chatService.getMessages(this.room.id);
      this.shouldScrollToBottom = true;
    }
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  isOwnMessage(message: ChatMessage): boolean {
    return this.user ? message.senderId === this.user.uid : false;
  }

  getMessageTime(timestamp: Date): string {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  getSenderInitials(senderName: string): string {
    return senderName.split(' ').map(name => name.charAt(0)).join('').toUpperCase();
  }

  getSenderRoleColor(role: string): string {
    switch (role) {
      case 'expert': return '#8383ed';
      case 'moderator': return '#ff9800';
      default: return '#26a69a';
    }
  }

  getSenderRoleIcon(role: string): string {
    switch (role) {
      case 'expert': return 'medical';
      case 'moderator': return 'shield-checkmark';
      default: return 'person';
    }
  }

  formatMessageContent(content: string): string {
    // Basic text formatting for group messages
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  isNewDay(currentIndex: number, messages: ChatMessage[], currentTimestamp: Date): boolean {
    if (currentIndex === 0) return true;
    if (!messages[currentIndex - 1]) return true;
    
    const currentDate = new Date(currentTimestamp).toDateString();
    const previousDate = new Date(messages[currentIndex - 1].timestamp).toDateString();
    
    return currentDate !== previousDate;
  }

  async openVideoModal(attachment: MessageAttachment) {
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

  getYouTubeThumbnail(url: string): string {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  }
}