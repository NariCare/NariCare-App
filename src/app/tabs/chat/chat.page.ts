import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { ChatbotService, ChatbotMessage } from '../../services/chatbot.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatRoom } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  
  selectedTab = 'groups';
  chatRooms$: Observable<ChatRoom[]>;
  chatbotMessages$: Observable<ChatbotMessage[]>;
  messageText = '';
  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private chatbotService: ChatbotService,
    private chatService: ChatService,
    private authService: AuthService
  ) {
    this.chatRooms$ = this.chatService.getChatRooms();
    this.chatbotMessages$ = this.chatbotService.messages$;
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
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

  async sendMessage() {
    if (this.messageText.trim()) {
      if (this.selectedTab === 'ai') {
        await this.chatbotService.sendMessage(this.messageText);
      } else {
        // Handle group chat message
        console.log('Sending group message:', this.messageText);
      }
      this.messageText = '';
      this.scrollToBottom();
    }
  }

  requestExpertHelp() {
    this.chatbotService.requestExpertHelp();
  }

  joinRoom(room: ChatRoom) {
    if (this.currentUser) {
      this.chatService.joinRoom(room.id, this.currentUser.uid);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
}