import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AfterViewChecked, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { ChatbotService, LegacyChatbotMessage } from '../../services/chatbot.service';
import { ChatbotMessageUI, VoiceMode, ChatAttachment } from '../../models/chatbot.model';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { BackendAuthService } from '../../services/backend-auth.service';
import { ExpertNotesService } from '../../services/expert-notes.service';
import { ChatRoom, ChatMessage } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { ExpertNote, ExpertLink } from '../../models/expert-notes.model';
import { VideoPlayerModalComponent } from '../../components/video-player-modal/video-player-modal.component';
import { CreateGroupModalComponent } from '../../components/create-group-modal/create-group-modal.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  selectedTab = 'groups';
  chatRooms$: Observable<ChatRoom[]>;
  chatbotMessages$: Observable<ChatbotMessageUI[]>;
  voiceMode$: Observable<VoiceMode>;
  messageText = '';
  currentUser: User | null = null;
  isRecording = false;
  recognition: any;
  autoSpeakEnabled = false;
  speechRate = 1;
  speechPitch = 1;
  naturalSpeechEnabled = true;
  showVoiceSettings = false;
  availableVoices: SpeechSynthesisVoice[] = [];
  selectedVoiceIndex = 0;
  isInitializing = false;
  expertBannerDismissed = false;
  
  // Expert notes integration
  showQuickAccess = false;
  quickAccessNotes: ExpertNote[] = [];
  quickAccessLinks: ExpertLink[] = [];

  constructor(
    private route: ActivatedRoute,
    private chatbotService: ChatbotService,
    private chatService: ChatService,
    private authService: AuthService,
    private backendAuthService: BackendAuthService,
    private expertNotesService: ExpertNotesService,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.chatRooms$ = this.chatService.getChatRooms();
    this.chatbotMessages$ = this.chatbotService.messages$;
    this.voiceMode$ = this.chatbotService.voiceMode$;
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    // Subscribe to both auth services - prefer backend auth if available
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Initialize chatbot if user is available and AI tab is selected
      if (user && this.selectedTab === 'ai') {
        this.initializeChatbot();
      }
    });

    // Auto-scroll when new messages arrive
    this.chatbotMessages$.subscribe(messages => {
      if (messages && messages.length > 0) {
        this.scrollToBottom();
      }
    });
    // Check if we should open AI chat directly
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'ai') {
        this.selectedTab = 'ai';
        if (this.currentUser) {
          this.initializeChatbot();
        }
      }
    });

    // Initialize speech rate from service
    this.speechRate = this.chatbotService.getSpeechRate();
    this.speechPitch = this.chatbotService.getSpeechPitch();
    this.naturalSpeechEnabled = this.chatbotService.getNaturalSpeechEnabled();
    
    // Load available voices
    this.loadAvailableVoices();
  }

  private loadAvailableVoices() {
    // Load voices immediately if available
    this.availableVoices = this.chatbotService.getVoicesByLanguage('en');
    
    // Set initial selected voice index
    const currentVoice = this.chatbotService.getSelectedVoice();
    if (currentVoice) {
      this.selectedVoiceIndex = this.availableVoices.findIndex(v => v.name === currentVoice.name);
      if (this.selectedVoiceIndex === -1) this.selectedVoiceIndex = 0;
    }
    
    // Some browsers load voices asynchronously
    if (this.availableVoices.length === 0 && 'speechSynthesis' in window) {
      setTimeout(() => {
        this.availableVoices = this.chatbotService.getVoicesByLanguage('en');
        if (this.availableVoices.length > 0 && currentVoice) {
          this.selectedVoiceIndex = this.availableVoices.findIndex(v => v.name === currentVoice.name);
          if (this.selectedVoiceIndex === -1) this.selectedVoiceIndex = 0;
        }
      }, 1000);
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
            breastfeedingGoals: 'exclusive', // Can be customized based on user preferences
            currentConcerns: [] // Can be populated from user profile or previous sessions
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

  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
    
    // Initialize chatbot when switching to AI tab
    if (this.selectedTab === 'ai' && this.currentUser) {
      this.initializeChatbot();
    }
  }

  private initializeSpeechRecognition() {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        this.isRecording = true;
      };
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.messageText = transcript;
        this.isRecording = false;
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
      };
      
      this.recognition.onend = () => {
        this.isRecording = false;
      };
    }
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
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
      if (this.selectedTab === 'ai') {
        await this.chatbotService.sendMessage(this.messageText);
        this.scrollToBottom();
      }
      this.messageText = '';
    }
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

    if (this.selectedTab === 'ai') {
      await this.chatbotService.sendMessage(messageContent, [attachment]);
    }
    
    this.scrollToBottom();
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

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

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
      case 'join_groups':
        this.selectedTab = 'groups';
        break;
      case 'expert_help':
        this.requestExpertHelp();
        break;
      default:
        await this.chatbotService.sendMessage(text);
    }
    this.scrollToBottom();
  }

  formatText(text: string): string {
    if (!text) return '';
    
    // Convert **bold** to <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  parseListItems(content: string): string[] {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•]\s*/, '').trim());
  }

  requestExpertHelp() {
    this.expertBannerDismissed = true; // Dismiss banner when clicked
    this.chatbotService.requestExpertHelp();
  }

  dismissExpertBanner() {
    this.expertBannerDismissed = true;
  }

  shouldShowExpertBanner(): boolean {
    // Don't show if user has dismissed it
    if (this.expertBannerDismissed) {
      return false;
    }

    const messages = this.chatbotService.getCurrentMessages();
    if (!messages || messages.length < 6) { // Increased minimum messages
      return false;
    }

    // Don't show if AI is currently typing or speaking
    const hasTyping = messages.some(m => m.isTyping);
    const hasPlaying = messages.some(m => m.isPlaying);
    if (hasTyping || hasPlaying) {
      return false;
    }

    // Don't show if the last message was from the user (conversation is still active)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'user') {
      return false;
    }

    // Check if there has been some back-and-forth conversation
    // Count user messages and bot messages (excluding welcome message)
    const userMessages = messages.filter(m => m.sender === 'user');
    const botMessages = messages.filter(m => m.sender === 'bot' && !m.isTyping);
    
    // Only show after at least 2 user messages and 3+ bot responses
    if (userMessages.length < 2 || botMessages.length < 3) {
      return false;
    }

    // Don't show if it's been less than 30 seconds since last bot message
    if (lastMessage && lastMessage.sender === 'bot') {
      const lastMessageTime = new Date(lastMessage.created_at || lastMessage.timestamp);
      const timeDiff = Date.now() - lastMessageTime.getTime();
      if (timeDiff < 30000) { // 30 seconds
        return false;
      }
    }

    // Only show after bot has responded and there's been a meaningful conversation
    return true;
  }

  async joinRoom(room: ChatRoom) {
    this.router.navigate(['/tabs/chat/room', room.id]);
  }
  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 300);
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

  // Voice chat methods
  setSpeechRate(rate: number): void {
    this.speechRate = rate;
    this.chatbotService.setSpeechRate(rate);
  }

  setSpeechPitch(pitch: number): void {
    this.speechPitch = pitch;
    this.chatbotService.setSpeechPitch(pitch);
  }

  onNaturalSpeechToggle(event: any): void {
    this.naturalSpeechEnabled = event.detail.checked;
    this.chatbotService.setNaturalSpeechEnabled(this.naturalSpeechEnabled);
  }

  toggleVoiceSettings(): void {
    this.showVoiceSettings = !this.showVoiceSettings;
    
    // Prevent body scroll when modal is open
    if (this.showVoiceSettings) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  onAutoSpeakToggle(event: any): void {
    this.autoSpeakEnabled = event.detail.checked;
    this.chatbotService.setAutoSpeakEnabled(this.autoSpeakEnabled);
  }

  toggleMessageSpeech(messageId: string, content: string): void {
    this.chatbotService.toggleMessageSpeech(messageId, content);
  }

  isSpeechSupported(): boolean {
    return this.chatbotService.isSpeechSupported();
  }

  // Voice Mode Methods
  toggleVoiceMode(): void {
    this.chatbotService.toggleVoiceMode();
  }

  isVoiceModeSupported(): boolean {
    return this.chatbotService.isVoiceModeSupported();
  }

  // Voice selection methods
  onVoiceSelectionChange(event: any): void {
    const selectedIndex = parseInt(event.detail.value);
    this.selectedVoiceIndex = selectedIndex;
    
    if (this.availableVoices[selectedIndex]) {
      this.chatbotService.setSelectedVoice(this.availableVoices[selectedIndex]);
      
      // Save preference to localStorage
      localStorage.setItem('selectedVoiceIndex', selectedIndex.toString());
    }
  }

  getVoiceDisplayName(voice: SpeechSynthesisVoice): string {
    return this.chatbotService.getVoiceDisplayName(voice);
  }

  testSelectedVoice(): void {
    const testText = this.chatbotService.getNaturalSpeechEnabled() ? 
      "Hi there! I'm your AI lactation assistant. I'm here to support you on your breastfeeding journey with gentle, caring guidance. How does my voice sound to you?" :
      "Hello! This is how I sound. I'm here to help you with breastfeeding questions.";
    this.chatbotService.speakMessage('test-voice', testText);
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

  ngAfterViewChecked() {
  }

  ngOnDestroy() {
    // Clean up speech synthesis when component is destroyed
    this.chatbotService.stopSpeaking();
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

  // ==================== EXPERT NOTES INTEGRATION ====================

  /**
   * Check if current user is an expert
   */
  isExpert(): boolean {
    return this.currentUser?.role === 'expert' || this.currentUser?.role === 'admin';
  }

  /**
   * Toggle quick access panel for experts
   */
  toggleQuickAccess() {
    if (!this.isExpert()) return;
    
    this.showQuickAccess = !this.showQuickAccess;
    
    if (this.showQuickAccess && this.quickAccessNotes.length === 0 && this.quickAccessLinks.length === 0) {
      this.loadQuickAccess();
    }
  }

  /**
   * Load quick access items for experts
   */
  private loadQuickAccess() {
    if (!this.isExpert()) return;

    this.expertNotesService.getQuickAccess(undefined, 'both')
      .subscribe({
        next: (response) => {
          this.quickAccessNotes = response.data.notes.slice(0, 3); // Show top 3
          this.quickAccessLinks = response.data.links.slice(0, 3); // Show top 3
        },
        error: (error) => {
          console.error('Error loading quick access for chat:', error);
        }
      });
  }

  /**
   * Insert note content into message textarea
   */
  async insertNoteIntoMessage(note: ExpertNote) {
    try {
      // Track usage
      await this.expertNotesService.useNote(note.id).toPromise();
      
      // Format content for chat
      const formattedContent = this.expertNotesService.formatForSharing(note, 'note');
      
      // Insert into message
      if (this.messageText.trim()) {
        this.messageText += '\n\n' + formattedContent;
      } else {
        this.messageText = formattedContent;
      }
      
      this.showQuickAccess = false;
      
      // Focus on textarea
      const textarea = document.querySelector('.message-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    } catch (error) {
      console.error('Error inserting note:', error);
    }
  }

  /**
   * Insert link into message textarea
   */
  async insertLinkIntoMessage(link: ExpertLink) {
    try {
      // Track usage
      await this.expertNotesService.accessLink(link.id).toPromise();
      
      // Format content for chat
      const formattedContent = this.expertNotesService.formatForSharing(link, 'link');
      
      // Insert into message
      if (this.messageText.trim()) {
        this.messageText += '\n\n' + formattedContent;
      } else {
        this.messageText = formattedContent;
      }
      
      this.showQuickAccess = false;
      
      // Focus on textarea
      const textarea = document.querySelector('.message-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    } catch (error) {
      console.error('Error inserting link:', error);
    }
  }

  /**
   * Get category label for display
   */
  getCategoryLabel(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.label || categoryKey;
  }

  /**
   * Get category icon
   */
  getCategoryIcon(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.icon || (type === 'note' ? 'document-text' : 'link');
  }

  /**
   * Get category color
   */
  getCategoryColor(categoryKey: string, type: 'note' | 'link'): string {
    const categoryInfo = this.expertNotesService.getCategoryInfo(categoryKey, type);
    return categoryInfo?.color || 'medium';
  }
}