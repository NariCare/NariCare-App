import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController, PopoverController } from '@ionic/angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { WebSocketChatService } from '../../services/websocket-chat.service';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { ChatRoom, ChatMessage, ChatAttachment } from '../../models/chat.model';
import { ChatMessage as SocketChatMessage, TypingUser } from '../../services/socket.service';
import { User } from '../../models/user.model';
import { ExpertNote, ExpertLink } from '../../models/expert-notes.model';
import { VideoPlayerModalComponent } from '../../components/video-player-modal/video-player-modal.component';
import { QuickNotesComponent } from '../../components/quick-notes/quick-notes.component';

@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.page.html',
  styleUrls: ['./chat-room.page.scss'],
})
export class ChatRoomPage implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('groupMessagesContainer', { static: false }) groupMessagesContainer!: ElementRef;
  
  selectedRoom: ChatRoom | null = null;
  currentUser: User | null = null;
  groupMessageText = '';
  roomId: string = '';
  messages$: Observable<ChatMessage[]> | null = null;
  
  // WebSocket chat properties
  private destroy$ = new Subject<void>();
  socketMessages: SocketChatMessage[] = [];
  isConnected = false;
  onlineUsers = 0;
  typingUsers: TypingUser[] = [];
  connectionError: string | null = null;
  isTyping = false;
  typingTimeout: any = null;
  
  // Scroll management
  private shouldAutoScroll = true;
  private lastMessageCount = 0;
  private isUserScrolling = false;
  private scrollTimeout: any = null;
  
  // Chat state observable
  chatState$ = this.webSocketChatService.chatState$;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private webSocketChatService: WebSocketChatService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService,
    private expertNotesService: ExpertNotesService,
    private alertController: AlertController,
    private modalController: ModalController,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    // Subscribe to auth state - prefer backend auth if available
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async user => {
      this.currentUser = user;
      
      // Initialize WebSocket chat when user becomes available and we have roomId
      if (user && this.roomId) {
        await this.initializeWebSocketChat();
      }
    });

    // Get room ID from route parameters
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(async params => {
      this.roomId = params['roomId'];
      
      // Initialize WebSocket chat if we have both user and roomId
      if (this.roomId && this.currentUser) {
        await this.initializeWebSocketChat();
      }
    });

    // Subscribe to chat state changes
    this.chatState$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(chatState => {
      const previousMessageCount = this.socketMessages.length;
      
      this.isConnected = chatState.isConnected;
      this.socketMessages = chatState.messages;
      this.onlineUsers = chatState.onlineUsers;
      this.typingUsers = chatState.typingUsers;
      this.connectionError = chatState.error;
      
      // Auto-scroll only if there are new messages and user is at bottom
      if (chatState.messages.length > previousMessageCount && this.shouldAutoScroll) {
        setTimeout(() => this.scrollToBottomGroup(), 100);
      }
    });
  }

  ngAfterViewChecked() {
    // Only auto-scroll when there are new messages and user is at bottom
    const currentMessageCount = this.socketMessages.length;
    
    if (currentMessageCount > this.lastMessageCount && this.shouldAutoScroll && !this.isUserScrolling) {
      this.scrollToBottomGroup();
    }
    
    this.lastMessageCount = currentMessageCount;
  }

  /**
   * Initialize WebSocket chat for the current room
   */
  private async initializeWebSocketChat(): Promise<void> {
    try {
      // Check if user is authenticated first
      if (!this.currentUser) {
        console.warn('User not authenticated, using fallback chat');
        this.loadChatRoomFallback();
        return;
      }

      // Ensure we're connected to WebSocket
      if (!this.webSocketChatService.isConnected) {
        const connected = await this.webSocketChatService.connect();
        if (!connected) {
          console.warn('Failed to connect to WebSocket, using fallback');
          this.loadChatRoomFallback();
          return;
        }
      }

      // Join the WebSocket room
      const joined = await this.webSocketChatService.joinRoom(this.roomId);
      if (!joined) {
        console.warn('Failed to join WebSocket room, using fallback');
        this.loadChatRoomFallback();
        return;
      }

      console.log('Successfully initialized WebSocket chat for room:', this.roomId);
    } catch (error) {
      console.error('Error initializing WebSocket chat:', error);
      this.loadChatRoomFallback();
    }
  }

  /**
   * Fallback to legacy chat service when WebSocket fails
   */
  private loadChatRoomFallback(): void {
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
    if (!this.groupMessageText.trim()) {
      return;
    }

    const messageText = this.groupMessageText.trim();
    this.groupMessageText = '';

    try {
      // Stop typing indicator
      this.stopTypingIndicator();

      // Choose ONE method to send message to avoid duplication
      // Priority: WebSocket > REST API
      
      if (this.isConnected && this.webSocketChatService.currentRoom === this.roomId) {
        // Send via WebSocket only - it will handle real-time updates
        console.log('Sending message via WebSocket');
        const success = await this.webSocketChatService.sendMessage(messageText);
        if (success) {
          this.scrollToBottomGroup();
          return;
        } else {
          console.warn('WebSocket send failed, falling back to REST API');
        }
      }

      // Fallback to REST API only if WebSocket is not available or failed
      if (this.selectedRoom && this.currentUser) {
        console.log('Sending message via REST API');
        const message: Omit<ChatMessage, 'id'> = {
          roomId: this.selectedRoom.id,
          senderId: this.currentUser.uid,
          senderName: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
          senderRole: 'user',
          message: messageText,
          timestamp: new Date(),
          isEdited: false
        };
        
        await this.chatService.sendMessage(this.selectedRoom.id, message);
        this.scrollToBottomGroup();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message text on error
      this.groupMessageText = messageText;
    }
  }

  onGroupKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.groupMessageText.trim()) {
        this.sendGroupMessage();
      }
    } else {
      // Start typing indicator for other keys
      this.startTypingIndicator();
    }
  }

  /**
   * Handle input events for typing indicators
   */
  onMessageInput() {
    this.startTypingIndicator();
  }

  /**
   * Start typing indicator
   */
  private startTypingIndicator(): void {
    if (!this.isConnected || !this.roomId) return;

    // Start typing if not already typing
    if (!this.isTyping) {
      this.isTyping = true;
      this.webSocketChatService.startTyping();
    }

    // Reset typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Auto-stop typing after 3 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.stopTypingIndicator();
    }, 3000);
  }

  /**
   * Stop typing indicator
   */
  private stopTypingIndicator(): void {
    if (this.isTyping) {
      this.isTyping = false;
      this.webSocketChatService.stopTyping();
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
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
        const element = this.groupMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
        this.shouldAutoScroll = true; // Reset after manual scroll to bottom
      }
    }, 100); // Reduced timeout for better responsiveness
  }

  /**
   * Check if user is near the bottom of the chat
   */
  private isUserAtBottom(): boolean {
    if (!this.groupMessagesContainer) return true;
    
    const element = this.groupMessagesContainer.nativeElement;
    const threshold = 100; // pixels from bottom
    return element.scrollHeight - element.clientHeight <= element.scrollTop + threshold;
  }

  /**
   * Handle scroll events to detect user scrolling
   */
  onScrollChat(event: any) {
    // Mark that user is actively scrolling
    this.isUserScrolling = true;
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Check if user is at bottom
    this.shouldAutoScroll = this.isUserAtBottom();
    
    // Reset scrolling flag after user stops scrolling
    this.scrollTimeout = setTimeout(() => {
      this.isUserScrolling = false;
    }, 150);
  }

  getMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  backToGroupList() {
    this.router.navigate(['/tabs/chat']);
  }

  /**
   * Lifecycle hook - cleanup
   */
  ngOnDestroy(): void {
    // Stop typing indicator
    this.stopTypingIndicator();

    // Clear scroll timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Leave WebSocket room
    this.webSocketChatService.leaveCurrentRoom();

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Retry WebSocket connection
   */
  async retryConnection(): Promise<void> {
    try {
      const success = await this.webSocketChatService.refreshConnection();
      if (success && this.roomId) {
        await this.webSocketChatService.joinRoom(this.roomId);
      }
    } catch (error) {
      console.error('Failed to retry connection:', error);
    }
  }

  /**
   * Get typing users display text
   */
  getTypingUsersText(): string {
    if (this.typingUsers.length === 0) return '';
    
    if (this.typingUsers.length === 1) {
      return `${this.typingUsers[0].userName} is typing...`;
    } else if (this.typingUsers.length === 2) {
      return `${this.typingUsers[0].userName} and ${this.typingUsers[1].userName} are typing...`;
    } else {
      return `${this.typingUsers.length} people are typing...`;
    }
  }

  /**
   * Format message timestamp
   */
  getSocketMessageTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: SocketChatMessage): boolean {
    return message.senderId === this.currentUser?.uid;
  }

  /**
   * Get connection status text
   */
  getConnectionStatusText(): string {
    if (this.isConnected) {
      return `Connected • ${this.onlineUsers} online`;
    } else if (this.connectionError) {
      return `Connection error: ${this.connectionError}`;
    } else {
      return 'Connecting...';
    }
  }

  /**
   * Get connection status color
   */
  getConnectionStatusColor(): string {
    return this.isConnected ? 'success' : 'danger';
  }

  /**
   * TrackBy function for message list performance
   */
  trackByMessageId(index: number, message: SocketChatMessage): string {
    return message.id;
  }

  /**
   * Check if current user is an expert
   */
  isExpert(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  /**
   * Open quick notes modal for experts to select notes/links to insert
   */
  async openQuickNotesModal() {
    if (!this.isExpert()) return;

    const modal = await this.modalController.create({
      component: QuickNotesComponent,
      componentProps: {
        user: this.currentUser,
        isSelectionMode: true
      },
      cssClass: 'quick-notes-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.selectedContent) {
        this.insertContentIntoMessage(result.data.selectedContent, result.data.contentType);
      }
    });

    return await modal.present();
  }

  /**
   * Insert selected note or link content into the message textarea
   */
  private insertContentIntoMessage(content: ExpertNote | ExpertLink, type: 'note' | 'link') {
    let textToInsert = '';

    if (type === 'note') {
      const note = content as ExpertNote;
      textToInsert = note.content;
    } else {
      const link = content as ExpertLink;
      textToInsert = `${link.title}: ${link.url}`;
      if (link.description) {
        textToInsert += ` - ${link.description}`;
      }
    }

    // Insert at current cursor position or append to existing text
    if (this.groupMessageText.trim()) {
      this.groupMessageText += '\n\n' + textToInsert;
    } else {
      this.groupMessageText = textToInsert;
    }

    // Update usage statistics
    if (type === 'note') {
      this.expertNotesService.copyNoteContent(content as ExpertNote);
    } else {
      // For links, we increment usage but don't actually open the link
      this.expertNotesService.incrementLinkUsage((content as ExpertLink).id).subscribe({
        error: (error) => console.warn('Failed to update link usage:', error)
      });
    }
  }
}