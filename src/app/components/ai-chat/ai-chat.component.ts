import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
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
  @ViewChild('messageTextarea', { static: false }) messageTextarea!: ElementRef;
  private keyboardListeners: PluginListenerHandle[] = [];

  chatbotMessages$: Observable<ChatbotMessageUI[]>;
  messageText = '';
  currentUser: User | null = null;
  isInitializing = false;
  expertBannerDismissed = false;
  showDisclaimer = true;
  private isComposing = false;
  private initializedForUser: string | null = null;
  
  // Expert notes integration
  showQuickAccess = false;
  quickAccessNotes: ExpertNote[] = [];
  quickAccessLinks: ExpertLink[] = [];

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
      
      // Initialize once per user; currentUser$ re-emits on profile refresh and used to re-run init
      if (user && user.uid !== this.initializedForUser) {
        this.initializedForUser = user.uid;
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
    this.fullHeight = window.innerHeight; // keyboard-closed height, before any focus
    // Layout is CSS; body.keyboard-open only flips once per focus/keyboard change, never per keystroke.
    if (Capacitor.isNativePlatform()) {
      Keyboard.addListener('keyboardWillShow', () => this.setKeyboardOpen(true)).then(h => this.keyboardListeners.push(h));
      Keyboard.addListener('keyboardWillHide', () => this.setKeyboardOpen(false)).then(h => this.keyboardListeners.push(h));
    }
  }

  ngOnDestroy() {
    this.keyboardListeners.forEach(h => h.remove());
    window.removeEventListener('resize', this.onWindowResize);
    this.setKeyboardOpen(false);
  }

  onComposerFocus() {
    this.fullHeight = Math.max(this.fullHeight, window.innerHeight);
    // Keyboard may already be up (refocus right after sending), so the shrink happened before this focus
    this.sawShrink = window.innerHeight < this.fullHeight - 150;
    window.addEventListener('resize', this.onWindowResize);
    this.setKeyboardOpen(true);
    this.scrollToBottom(); // once per focus, after the viewport settles
  }

  onComposerBlur() {
    window.removeEventListener('resize', this.onWindowResize);
    this.sawShrink = false;
    this.setKeyboardOpen(false);
  }

  // Android back button hides the keyboard without blurring; resize fires once per keyboard show/hide, not per keystroke
  private fullHeight = 0;
  private sawShrink = false; // iOS Safari never shrinks the layout viewport, so it keeps relying on blur
  private onWindowResize = () => {
    const shrunk = window.innerHeight < this.fullHeight - 150;
    if (shrunk) this.sawShrink = true;
    if (this.sawShrink) this.setKeyboardOpen(shrunk);
  };

  private setKeyboardOpen(open: boolean) {
    document.body.classList.toggle('keyboard-open', open);
  }

  private async initializeChatbot() {
    if (this.currentUser) {
      this.isInitializing = true;
      
      try {
        const babyAge = this.currentUser.babies?.length ? 
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
        const babyAge = this.currentUser.babies?.length ? 
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

  // Weeks since birth, or undefined when unknown, in the future (due date) or past the API's 0-260 range
  private calculateBabyAge(birthDate: Date | string): number | undefined {
    const born = new Date(birthDate);
    if (isNaN(born.getTime())) return undefined;
    const weeks = Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return weeks >= 0 && weeks <= 260 ? weeks : undefined;
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

  onCompositionStart() {
    this.isComposing = true;
  }

  onCompositionEnd() {
    this.isComposing = false;
    this.resizeMessageTextarea();
  }

  onMessageInput() {
    // Resizing the textarea mid-composition reverses committed text on Android IMEs.
    if (this.isComposing) {
      return;
    }
    this.resizeMessageTextarea();
  }

  private resizeMessageTextarea() {
    const host = this.messageTextarea?.nativeElement as HTMLElement | undefined;
    const textarea = host?.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement | undefined;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  private resetMessageTextarea() {
    const host = this.messageTextarea?.nativeElement as HTMLElement | undefined;
    const textarea = host?.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement | undefined;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  async sendMessage() {
    if (this.messageText.trim()) {
      const messageToSend = this.messageText.trim();
      this.messageText = ''; // Clear input immediately
      this.resetMessageTextarea();
      
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