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

  // Keyboard handling
  private keyboardVisible = false;
  private lastKeyboardHeight = 0;

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
        this.scrollToBottom();
      }
    });

  }

  ngAfterViewInit() {
    this.setupKeyboardHandling();
  }

  ngOnDestroy() {
  }

  private setupKeyboardHandling() {
    // Enhanced keyboard handling for mobile devices
    if (typeof window !== 'undefined') {
      // Focus and blur events are more reliable for keyboard detection
      setTimeout(() => {
        const textarea = document.querySelector('.message-textarea');
        if (textarea) {
          textarea.addEventListener('focus', () => {
            // Keyboard is about to show
            setTimeout(() => {
              this.handleKeyboardShow();
            }, 300); // Wait for keyboard animation
          });

          textarea.addEventListener('blur', () => {
            // Keyboard is about to hide
            setTimeout(() => {
              this.handleKeyboardHide();
            }, 100);
          });
        }
      }, 1000);

      // Backup detection using visual viewport (more accurate)
      if ('visualViewport' in window) {
        let initialHeight = (window as any).visualViewport.height;
        
        (window as any).visualViewport.addEventListener('resize', () => {
          const currentHeight = (window as any).visualViewport.height;
          const heightDiff = initialHeight - currentHeight;
          
          // Only trigger if height difference is significant (keyboard-related)
          if (heightDiff > 150 && !this.keyboardVisible) {
            this.handleKeyboardShow();
          } else if (heightDiff < 50 && this.keyboardVisible) {
            this.handleKeyboardHide();
          }
        });
      }
    }
  }

  private handleKeyboardShow() {
    if (!this.keyboardVisible && typeof window !== 'undefined') {
      this.keyboardVisible = true;
      
      // Calculate keyboard height
      const windowHeight = window.innerHeight;
      const viewportHeight = (window as any).visualViewport?.height || windowHeight;
      const keyboardHeight = windowHeight - viewportHeight;
      
      // Store the height for consistency
      this.lastKeyboardHeight = Math.max(keyboardHeight, 300); // Minimum 300px
      
      // Add keyboard-visible class to body
      document.body.classList.add('keyboard-visible');
      
      // Adjust input container to stay above keyboard
      this.adjustInputForKeyboard(this.lastKeyboardHeight);
    }
  }

  private handleKeyboardHide() {
    if (this.keyboardVisible) {
      this.keyboardVisible = false;
      this.lastKeyboardHeight = 0;
      
      // Remove keyboard-visible class
      document.body.classList.remove('keyboard-visible');
      this.resetInputPosition();
    }
  }

  private adjustInputForKeyboard(keyboardHeight: number) {
    const inputContainer = this.messageInputContainer?.nativeElement;
    if (inputContainer) {
      // Use a conservative offset - just enough to clear the keyboard
      const safeOffset = Math.min(keyboardHeight - 60, 240); // Reduced max to 240px
      
      // Move input above keyboard with safe offset
      inputContainer.style.transform = `translateY(-${safeOffset}px)`;
      inputContainer.style.transition = 'transform 0.25s ease-out';
    }

    // Hide expert banner when keyboard is open to prevent overlap
    const expertBanner = document.querySelector('.expert-help-banner') as HTMLElement;
    if (expertBanner) {
      expertBanner.style.position = 'absolute';
      expertBanner.style.top = '-1000px'; // Move off screen
      expertBanner.style.zIndex = '-1';
    }

    // Adjust messages container to prevent content from being hidden
    if (this.messagesContainer) {
      const messagesElement = this.messagesContainer.nativeElement;
      const paddingOffset = Math.min(keyboardHeight + 40, 280); // Reduced max padding
      messagesElement.style.paddingBottom = `${paddingOffset}px`;
      messagesElement.style.transition = 'padding-bottom 0.25s ease-out';
      
      // Delay scroll to ensure layout is updated
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }

  private resetInputPosition() {
    const inputContainer = this.messageInputContainer?.nativeElement;
    if (inputContainer) {
      // Force reset to original position
      inputContainer.style.transform = 'translateY(0px)';
      inputContainer.style.transition = 'transform 0.25s ease-out';
    }

    if (this.messagesContainer) {
      const messagesElement = this.messagesContainer.nativeElement;
      messagesElement.style.paddingBottom = '10rem';
      messagesElement.style.transition = 'padding-bottom 0.25s ease-out';
    }

    // Ensure banner is visible when keyboard closes
    const expertBanner = document.querySelector('.expert-help-banner') as HTMLElement;
    if (expertBanner) {
      expertBanner.style.position = 'static';
      expertBanner.style.zIndex = '1';
    }
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
      await this.chatbotService.sendMessage(this.messageText);
      this.scrollToBottom();
      this.messageText = '';
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 300);
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