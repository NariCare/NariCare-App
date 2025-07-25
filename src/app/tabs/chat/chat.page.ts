import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  isRecording = false;
  recognition: any;
  showVoiceSettings = false;
  autoSpeakEnabled = true;
  speechRate = 1;

  constructor(
    private route: ActivatedRoute,
    private chatbotService: ChatbotService,
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {
    this.chatRooms$ = this.chatService.getChatRooms();
    this.chatbotMessages$ = this.chatbotService.messages$;
    this.initializeSpeechRecognition();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Initialize chatbot if user is available and AI tab is selected
      if (user && this.selectedTab === 'ai') {
        this.initializeChatbot();
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
  }

  private initializeChatbot() {
    if (this.currentUser) {
      const babyAge = this.currentUser.babies.length > 0 ? 
        this.calculateBabyAge(this.currentUser.babies[0].dateOfBirth) : undefined;
      this.chatbotService.initializeChat(this.currentUser.uid, babyAge);
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
      } else {
        // Handle group chat message
        console.log('Sending group message:', this.messageText);
      }
      this.messageText = '';
      this.scrollToBottom();
    }
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

  // Voice chat methods
  toggleVoiceSettings(): void {
    this.showVoiceSettings = !this.showVoiceSettings;
  }

  setSpeechRate(rate: number): void {
    this.speechRate = rate;
    this.chatbotService.setSpeechRate(rate);
  }

  onAutoSpeakToggle(event: any): void {
    this.autoSpeakEnabled = event.detail.checked;
    // You can store this preference in local storage or user settings
    localStorage.setItem('autoSpeakEnabled', this.autoSpeakEnabled.toString());
  }

  toggleMessageSpeech(messageId: string, content: string): void {
    this.chatbotService.toggleMessageSpeech(messageId, content);
  }

  isSpeechSupported(): boolean {
    return this.chatbotService.isSpeechSupported();
  }
}