import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatbotMessageUI, ChatAttachment } from '../../models/chatbot.model';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { User } from '../../models/user.model';
import { ExpertNote, ExpertLink } from '../../models/expert-notes.model';
import { VideoPlayerModalComponent } from '../video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChild('messageInputContainer', { static: false }) messageInputContainer!: ElementRef;

  chatbotMessages$: Observable<ChatbotMessageUI[]>;
  messageText = '';
  currentUser: User | null = null;
  isInitializing = false;
  expertBannerDismissed = false;
  showDisclaimer = true;
  
  // Expert notes integration
  showQuickAccess = false;
  quickAccessNotes: ExpertNote[] = [];
  quickAccessLinks: ExpertLink[] = [];

  // Keyboard handling (web only; native uses Capacitor resize:body)
  private viewportResizeHandler?: () => void;

  // ponytail: display-only timestamp for the static welcome bubble
  readonly welcomeTime = new Date();

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService,
    private expertNotesService: ExpertNotesService,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.chatbotMessages$ = this.chatbotService.messages$;
  }

  ngOnInit() {
    // Check if disclaimer was previously hidden
    const disclaimerHidden = localStorage.getItem('naricare_disclaimer_hidden');
    if (disclaimerHidden === 'true') {
      this.showDisclaimer = false;
    }

    // Subscribe to auth services - prefer backend auth if available
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Initialize chatbot if user is available
      if (user) {
        this.initializeChatbot();
      }
    });

    // Auto-scroll when new messages arrive
    this.chatbotMessages$.subscribe(messages => {
      if (messages && messages.length > 0) {
        // Always scroll to bottom for new messages, including typing indicators
        this.scrollToBottom();
        
        // If the latest message is a typing indicator, ensure it's visible immediately
        const latestMessage = messages[messages.length - 1];
        if (latestMessage?.isTyping) {
          // Force scroll after a brief delay to ensure DOM is updated
          setTimeout(() => {
            this.scrollToBottomImmediate();
          }, 50);
        }
      }
    });

  }

  ngAfterViewInit() {
    this.setupKeyboardHandling();
  }

  ngOnDestroy() {
    if (this.viewportResizeHandler && (window as any).visualViewport) {
      (window as any).visualViewport.removeEventListener('resize', this.viewportResizeHandler);
    }
  }

  // The composer is a normal flex child of the chat column, so when the keyboard
  // shrinks the viewport (Capacitor resize:"body" on native, visualViewport on
  // web) the layout already keeps it above the keyboard. We only need to keep
  // the latest messages in view; no manual transform (that pushed the in-flow
  // input up into the middle and left a gap below it).
  private setupKeyboardHandling() {
    const vv = (window as any).visualViewport;
    if (!vv) return;

    // Primary keyboard handling is CSS: the viewport meta uses
    // interactive-widget=resizes-content, so the layout (100dvh/100%) shrinks
    // when the keyboard opens and the flex column keeps the messages in view.
    // This is a fallback for browsers that do not resize the layout: cap the
    // outer chat wrapper (the real height owner) to the visible viewport.
    this.viewportResizeHandler = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      const outer = document.querySelector('.chat-container') as HTMLElement | null;
      const layoutResizes = Math.abs(window.innerHeight - vv.height) < 40; // browser already shrank layout
      if (overlap > 80 && !layoutResizes) {
        document.body.classList.add('keyboard-visible');
        outer?.style.setProperty('height', `${vv.height}px`);
        setTimeout(() => this.scrollToBottom(), 50);
      } else {
        document.body.classList.remove('keyboard-visible');
        outer?.style.removeProperty('height');
        if (overlap > 80) { setTimeout(() => this.scrollToBottom(), 50); }
      }
    };

    vv.addEventListener('resize', this.viewportResizeHandler);
  }

  private async initializeChatbot() {
    if (this.currentUser) {
      this.isInitializing = true;
      
      try {
        const babyAge = this.currentUser.babies.length > 0 ? 
          this.calculateBabyAge(this.currentUser.babies[0].dateOfBirth) : undefined;
        
        // Try to use backend API first
        if (this.backendAuthService.isAuthenticated()) {
          await this.chatbotService.initializeChatWithBackend(babyAge, {
            breastfeedingGoals: 'exclusive',
            currentConcerns: []
          });
        } else {
          // Fallback to legacy initialization
          this.chatbotService.initializeChat(this.currentUser.uid, babyAge);
        }
        
      } catch (error) {
        console.error('Failed to initialize chatbot:', error);
        // Fallback to legacy initialization
        const babyAge = this.currentUser.babies.length > 0 ? 
          this.calculateBabyAge(this.currentUser.babies[0].dateOfBirth) : undefined;
        this.chatbotService.initializeChat(this.currentUser.uid, babyAge);
      } finally {
        // Hide loading state after initialization
        setTimeout(() => {
          this.isInitializing = false;
        }, 1500);
      }
    }
  }

  private calculateBabyAge(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  }


  // Message handling methods
  async openAttachmentMenu() {
    const alert = await this.alertController.create({
      header: 'Add Attachment',
      message: 'Choose what you want to share',
      buttons: [
        {
          text: '📷 Photo',
          handler: () => {
            this.openPhotoInput();
          }
        },
        {
          text: '🎥 Video',
          handler: () => {
            this.openVideoLinkInput();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
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
    await this.chatbotService.sendMessage(messageContent, [attachment]);
    this.scrollToBottom();
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.messageText.trim()) {
        this.sendMessage();
      }
    }
  }

  async sendMessage() {
    if (this.messageText.trim()) {
      const messageToSend = this.messageText.trim();
      this.messageText = ''; // Clear input immediately
      
      try {
        await this.chatbotService.sendMessage(messageToSend);
        this.scrollToBottom();
      } catch (error) {
        // If there's an error, we could optionally restore the message
        console.error('Failed to send message:', error);
      }
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 300);
  }

  private scrollToBottomImmediate() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
      
      // Ensure smooth scrolling behavior
      element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  // Message formatting and utility methods
  formatText(text: string): string {
    if (!text) return '';
    
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  parseListItems(content: string): string[] {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•]\s*/, '').trim());
  }

  getMessageTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  hasMultipleTypingMessages(): boolean {
    const currentMessages = this.chatbotService.getCurrentMessages();
    const typingMessages = currentMessages.filter(m => m.isTyping);
    return typingMessages.length > 1;
  }

  hasMessages(): boolean {
    const currentMessages = this.chatbotService.getCurrentMessages();
    return currentMessages && currentMessages.length > 0;
  }

  // Expert help methods
  async handleFollowUpAction(action: string, text: string) {
    switch (action) {
      case 'positioning':
        await this.chatbotService.sendMessage('Show me different breastfeeding positions');
        break;
      case 'latch_problems':
        await this.chatbotService.sendMessage('My baby won\'t latch properly, what should I do?');
        break;
      case 'supply_foods':
        await this.chatbotService.sendMessage('What foods can help increase my milk supply?');
        break;
      case 'pumping':
        await this.chatbotService.sendMessage('Give me tips for effective pumping');
        break;
      case 'knowledge_base':
        this.router.navigate(['/tabs/knowledge']);
        break;
      case 'expert_help':
        this.requestExpertHelp();
        break;
      default:
        await this.chatbotService.sendMessage(text);
    }
    this.scrollToBottom();
  }

  requestExpertHelp() {
    this.expertBannerDismissed = true;
    this.chatbotService.requestExpertHelp();
  }

  dismissExpertBanner() {
    this.expertBannerDismissed = true;
  }

  hideDisclaimer() {
    this.showDisclaimer = false;
    localStorage.setItem('naricare_disclaimer_hidden', 'true');
  }

  shouldShowExpertBanner(): boolean {
    if (this.expertBannerDismissed) {
      return false;
    }

    const messages = this.chatbotService.getCurrentMessages();
    if (!messages || messages.length < 6) {
      return false;
    }

    const hasTyping = messages.some(m => m.isTyping);
    const hasPlaying = messages.some(m => m.isPlaying);
    if (hasTyping || hasPlaying) {
      return false;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'user') {
      return false;
    }

    const userMessages = messages.filter(m => m.sender === 'user');
    const botMessages = messages.filter(m => m.sender === 'bot' && !m.isTyping);
    
    if (userMessages.length < 2 || botMessages.length < 3) {
      return false;
    }

    if (lastMessage && lastMessage.sender === 'bot') {
      const lastMessageTime = new Date(lastMessage.created_at || lastMessage.timestamp);
      const timeDiff = Date.now() - lastMessageTime.getTime();
      if (timeDiff < 30000) {
        return false;
      }
    }

    return true;
  }

  // Expert notes methods
  isExpert(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  toggleQuickAccess() {
    if (!this.isExpert()) return;
    
    this.showQuickAccess = !this.showQuickAccess;
    
    if (this.showQuickAccess && this.quickAccessNotes.length === 0 && this.quickAccessLinks.length === 0) {
      this.loadQuickAccess();
    }
  }

  private loadQuickAccess() {
    if (!this.isExpert()) return;

    this.expertNotesService.getQuickAccess(undefined, 'both')
      .subscribe({
        next: (response) => {
          this.quickAccessNotes = response.data.notes.slice(0, 3);
          this.quickAccessLinks = response.data.links.slice(0, 3);
        },
        error: (error) => {
          console.error('Error loading quick access for chat:', error);
        }
      });
  }

  async insertNoteIntoMessage(note: ExpertNote) {
    try {
      await this.expertNotesService.useNote(note.id).toPromise();
      const formattedContent = this.expertNotesService.formatForSharing(note, 'note');
      
      if (this.messageText.trim()) {
        this.messageText += '\n\n' + formattedContent;
      } else {
        this.messageText = formattedContent;
      }
      
      this.showQuickAccess = false;
      
      const textarea = document.querySelector('.message-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    } catch (error) {
      console.error('Error inserting note:', error);
    }
  }

  async insertLinkIntoMessage(link: ExpertLink) {
    try {
      await this.expertNotesService.accessLink(link.id).toPromise();
      const formattedContent = this.expertNotesService.formatForSharing(link, 'link');
      
      if (this.messageText.trim()) {
        this.messageText += '\n\n' + formattedContent;
      } else {
        this.messageText = formattedContent;
      }
      
      this.showQuickAccess = false;
      
      const textarea = document.querySelector('.message-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    } catch (error) {
      console.error('Error inserting link:', error);
    }
  }

  getCategoryLabel(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.label || categoryKey;
  }

  getCategoryIcon(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.icon || (type === 'note' ? 'document-text' : 'link');
  }

  getCategoryColor(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.color || 'medium';
  }
}