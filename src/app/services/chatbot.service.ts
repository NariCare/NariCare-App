import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiKeyService } from './api-key.service';

export interface ChatbotMessage {
  id: string;
  content: string;
  formattedContent?: ChatbotContent;
  sender: 'user' | 'bot' | 'expert';
  timestamp: Date;
  isTyping?: boolean;
  followUpOptions?: FollowUpOption[];
  isPlaying?: boolean;
  audioUrl?: string;
}

export interface ChatbotContent {
  text: string;
  media?: MediaContent[];
  formatting?: ContentFormatting;
}

export interface MediaContent {
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface ContentFormatting {
  hasBulletPoints?: boolean;
  hasBoldText?: boolean;
  sections?: ContentSection[];
}

export interface ContentSection {
  title?: string;
  content: string;
  type: 'text' | 'list' | 'callout';
}

export interface FollowUpOption {
  id: string;
  text: string;
  action: string;
}

export interface ChatbotContext {
  userId: string;
  babyAge?: number;
  previousQueries: string[];
  currentTopic?: string;
}

export interface VoiceMode {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  autoListen: boolean;
  conversationFlow: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private messagesSubject = new BehaviorSubject<ChatbotMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  private context: ChatbotContext = {
    userId: '',
    previousQueries: []
  };

  // Voice mode state
  private voiceModeSubject = new BehaviorSubject<VoiceMode>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    autoListen: true,
    conversationFlow: true
  });
  public voiceMode$ = this.voiceModeSubject.asObservable();
  // Speech synthesis properties
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private speechRate = 1;
  private speechPitch = 1;

  // Speech recognition properties
  private recognition: any = null;
  private isRecognitionActive = false;
  private silenceTimer: any = null;
  private voiceModeTimeout: any = null;
  constructor(
    private http: HttpClient,
    private apiKeyService: ApiKeyService
  ) {
    this.initializeSpeechSynthesis();
    this.initializeSpeechRecognition();
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      
      // Load voices
      this.loadVoices();
      
      // Some browsers load voices asynchronously
      if (this.speechSynthesis.onvoiceschanged !== undefined) {
        this.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private initializeSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      this.recognition.onstart = () => {
        this.updateVoiceMode({ isListening: true });
        console.log('Voice recognition started');
      };
      
      this.recognition.onresult = (event: any) => {
        this.handleSpeechResult(event);
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.updateVoiceMode({ isListening: false });
        
        // Auto-restart if in voice mode and error is not fatal
        if (this.voiceModeSubject.value.isActive && event.error !== 'not-allowed') {
          setTimeout(() => this.startListening(), 1000);
        }
      };
      
      this.recognition.onend = () => {
        this.updateVoiceMode({ isListening: false });
        
        // Auto-restart listening if voice mode is active and not manually stopped
        if (this.voiceModeSubject.value.isActive && this.isRecognitionActive) {
          setTimeout(() => this.startListening(), 500);
        }
      };
    }
  }
  private loadVoices() {
    if (this.speechSynthesis) {
      this.availableVoices = this.speechSynthesis.getVoices();
      // Prefer female English voices for a more nurturing feel
      this.selectedVoice = this.availableVoices.find(voice => 
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('susan')
        )
      ) || this.availableVoices.find(voice => 
        voice.lang.startsWith('en')
      ) || this.availableVoices[0] || null;
    }
  }

  initializeChat(userId: string, babyAge?: number): void {
    this.context = {
      userId,
      babyAge,
      previousQueries: []
    };

    const welcomeMessage: ChatbotMessage = {
      id: this.generateId(),
      content: `Hi! I'm here to help you with breastfeeding and baby care questions. ${babyAge ? `I see your baby is ${babyAge} weeks old.` : ''} What would you like to know about today?`,
      sender: 'bot',
      timestamp: new Date()
    };

    this.messagesSubject.next([welcomeMessage]);
  }

  async sendMessage(content: string): Promise<void> {
    const userMessage: ChatbotMessage = {
      id: this.generateId(),
      content,
      sender: 'user',
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);

    // Show typing indicator
    const typingMessage: ChatbotMessage = {
      id: 'typing',
      content: 'Thinking...',
      sender: 'bot',
      timestamp: new Date(),
      isTyping: true
    };
    this.messagesSubject.next([...this.messagesSubject.value, typingMessage]);

    try {
      const response = await this.getStructuredAIResponse(content);
      
      // Remove typing indicator
      const messagesWithoutTyping = this.messagesSubject.value.filter(m => m.id !== 'typing');
      
      const botResponse: ChatbotMessage = {
        id: this.generateId(),
        content: response.text,
        formattedContent: response,
        sender: 'bot',
        timestamp: new Date(),
        followUpOptions: this.generateFollowUpOptions(content),
        isPlaying: false
      };

      this.messagesSubject.next([...messagesWithoutTyping, botResponse]);
      this.context.previousQueries.push(content);
      
      // Auto-speak bot response if speech is enabled
      setTimeout(() => {
        this.speakMessage(botResponse.id, response.text);
      }, 500);
    } catch (error) {
      console.error('Error getting AI response:', error);
      this.handleAIError();
    }
  }

  private handleSpeechResult(event: any) {
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Clear any existing silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    
    // If we have a final result, process it
    if (finalTranscript.trim()) {
      this.processFinalTranscript(finalTranscript.trim());
    }
    
    // Set a timer to detect end of speech
    if (interimTranscript.trim() || finalTranscript.trim()) {
      this.silenceTimer = setTimeout(() => {
        if (interimTranscript.trim() && !finalTranscript.trim()) {
          this.processFinalTranscript(interimTranscript.trim());
        }
      }, 2000); // 2 seconds of silence
    }
  }
  
  private async processFinalTranscript(transcript: string) {
    if (transcript.length < 2) return; // Ignore very short utterances
    
    console.log('Processing voice input:', transcript);
    
    // Stop listening temporarily while processing
    this.stopListening();
    
    // Send the message
    await this.sendMessage(transcript);
  }
  private async getAIResponse(userQuery: string): Promise<any> {
  }
  private async getStructuredAIResponse(userQuery: string): Promise<ChatbotContent> {
    const prompt = this.buildPrompt(userQuery);
    
    const apiKey = this.apiKeyService.getOpenAIKey();
    if (!this.apiKeyService.isOpenAIKeyValid()) {
      console.warn('OpenAI API key is not properly configured');
      return this.getMockResponse(userQuery);
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });

    const body = {
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are a supportive AI assistant specialized in breastfeeding and infant care. 
          
          RESPONSE FORMAT REQUIREMENTS:
          - Structure your response in clear, digestible sections
          - Use bullet points for lists and tips
          - Keep paragraphs short (2-3 sentences max)
          - Use **bold text** for important points
          - Include practical, actionable advice
          - Always be empathetic and encouraging
          - Recommend consulting healthcare professionals for serious concerns
          
          If the response is long, break it into sections with clear headings.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    try {
      const response = await this.http.post<any>('https://api.openai.com/v1/chat/completions', body, { headers }).toPromise();
      const rawContent = response.choices[0].message.content.trim();
      
      return this.parseStructuredContent(rawContent);
    } catch (error) {
      // Fallback to mock response if API fails
      return this.getMockResponse(userQuery);
    }
  }

  private parseStructuredContent(content: string): ChatbotContent {
    const sections: ContentSection[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentSection: ContentSection | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if it's a heading (starts with #)
      if (trimmedLine.startsWith('#')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmedLine.replace(/^#+\s*/, ''),
          content: '',
          type: 'text'
        };
      }
      // Check if it's a bullet point
      else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        if (!currentSection) {
          currentSection = { content: '', type: 'list' };
        }
        if (currentSection.type !== 'list') {
          sections.push(currentSection);
          currentSection = { content: '', type: 'list' };
        }
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
      // Regular text
      else if (trimmedLine) {
        if (!currentSection) {
          currentSection = { content: '', type: 'text' };
        }
        if (currentSection.type === 'list') {
          sections.push(currentSection);
          currentSection = { content: '', type: 'text' };
        }
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }

    return {
      text: content,
      formatting: {
        hasBulletPoints: content.includes('-') || content.includes('•'),
        hasBoldText: content.includes('**'),
        sections: sections.length > 1 ? sections : undefined
      }
    };
  }

  private getMockResponse(userQuery: string): any {
    const mockResponses = {
      'latch': {
        text: `**Getting a Good Latch**\n\nA proper latch is essential for comfortable breastfeeding. Here are the key steps:\n\n**Positioning Tips:**\n- Support your baby's neck and shoulders\n- Bring baby to breast, not breast to baby\n- Wait for baby to open mouth wide\n- Ensure baby takes good portion of areola\n\n**Signs of Good Latch:**\n- No pain after initial few seconds\n- You can hear swallowing sounds\n- Baby's lips are flanged outward\n\nIf you're experiencing persistent pain, please consult a lactation consultant.`,
        formatting: {
          hasBulletPoints: true,
          hasBoldText: true,
          sections: [
            {
              title: 'Getting a Good Latch',
              content: 'A proper latch is essential for comfortable breastfeeding. Here are the key steps:',
              type: 'text'
            },
            {
              title: 'Positioning Tips',
              content: '- Support your baby\'s neck and shoulders\n- Bring baby to breast, not breast to baby\n- Wait for baby to open mouth wide\n- Ensure baby takes good portion of areola',
              type: 'list'
            },
            {
              title: 'Signs of Good Latch',
              content: '- No pain after initial few seconds\n- You can hear swallowing sounds\n- Baby\'s lips are flanged outward',
              type: 'list'
            }
          ]
        }
      },
      'supply': {
        text: `**Increasing Milk Supply**\n\nMilk supply concerns are common. Here's how to boost production:\n\n**Natural Ways to Increase Supply:**\n- Nurse frequently (8-12 times per day)\n- Ensure proper latch and positioning\n- Stay hydrated and eat nutritious meals\n- Get adequate rest when possible\n- Try skin-to-skin contact\n\n**When to Seek Help:**\n- Baby isn't gaining weight appropriately\n- Fewer than 6 wet diapers per day after day 5\n- You're concerned about supply\n\nRemember, most mothers produce enough milk for their babies. Trust your body!`,
        formatting: {
          hasBulletPoints: true,
          hasBoldText: true,
          sections: [
            {
              title: 'Increasing Milk Supply',
              content: 'Milk supply concerns are common. Here\'s how to boost production:',
              type: 'text'
            },
            {
              title: 'Natural Ways to Increase Supply',
              content: '- Nurse frequently (8-12 times per day)\n- Ensure proper latch and positioning\n- Stay hydrated and eat nutritious meals\n- Get adequate rest when possible\n- Try skin-to-skin contact',
              type: 'list'
            }
          ]
        }
      }
    };

    // Simple keyword matching for mock responses
    const query = userQuery.toLowerCase();
    if (query.includes('latch') || query.includes('position')) {
      return mockResponses.latch;
    } else if (query.includes('supply') || query.includes('milk') || query.includes('production')) {
      return mockResponses.supply;
    }

    // Default response
    return {
      text: `Thank you for your question about "${userQuery}". I'm here to help with breastfeeding and baby care concerns.\n\n**Common Topics I Can Help With:**\n- Latching and positioning\n- Milk supply concerns\n- Feeding schedules\n- Common challenges\n- Baby's growth and development\n\nPlease feel free to ask me anything specific, and I'll provide detailed, helpful guidance.`,
      formatting: {
        hasBulletPoints: true,
        hasBoldText: true
      }
    };
  }

  private generateFollowUpOptions(userQuery: string): FollowUpOption[] {
    const query = userQuery.toLowerCase();
    
    if (query.includes('latch') || query.includes('position')) {
      return [
        { id: '1', text: 'Show me positioning techniques', action: 'positioning' },
        { id: '2', text: 'What if baby won\'t latch?', action: 'latch_problems' },
        { id: '3', text: 'Connect with expert', action: 'expert_help' }
      ];
    } else if (query.includes('supply') || query.includes('milk')) {
      return [
        { id: '1', text: 'Foods that boost supply', action: 'supply_foods' },
        { id: '2', text: 'Pumping tips', action: 'pumping' },
        { id: '3', text: 'When to worry about supply', action: 'supply_concerns' }
      ];
    }

    return [
      { id: '1', text: 'Browse knowledge base', action: 'knowledge_base' },
      { id: '2', text: 'Join mom groups', action: 'join_groups' },
      { id: '3', text: 'Talk to expert', action: 'expert_help' }
    ];
  }

  private buildPrompt(userQuery: string): string {
    let prompt = `Question: ${userQuery}\n\n`;
    
    if (this.context.babyAge) {
      prompt += `Baby's age: ${this.context.babyAge} weeks\n`;
    }
    
    if (this.context.previousQueries.length > 0) {
      prompt += `Previous questions: ${this.context.previousQueries.slice(-3).join(', ')}\n`;
    }
    
    prompt += '\nPlease provide a helpful response focusing on breastfeeding and baby care.';
    return prompt;
  }

  private handleAIError(): void {
    const messagesWithoutTyping = this.messagesSubject.value.filter(m => m.id !== 'typing');
    
    const errorMessage: ChatbotMessage = {
      id: this.generateId(),
      content: "I'm having trouble processing your question right now. Would you like me to connect you with one of our lactation experts for personalized help?",
      sender: 'bot',
      timestamp: new Date(),
      isPlaying: false
    };

    this.messagesSubject.next([...messagesWithoutTyping, errorMessage]);
    
    // Speak error message
    setTimeout(() => {
      this.speakMessage(errorMessage.id, errorMessage.content);
    }, 500);
  }

  requestExpertHelp(): void {
    const expertMessage: ChatbotMessage = {
      id: this.generateId(),
      content: "I've connected you with our expert team. They'll be with you shortly to provide personalized assistance.",
      sender: 'bot',
      timestamp: new Date(),
      isPlaying: false
    };

    this.messagesSubject.next([...this.messagesSubject.value, expertMessage]);
    
    // Speak expert help message
    setTimeout(() => {
      this.speakMessage(expertMessage.id, expertMessage.content);
    }, 500);
  }

  // Voice chat methods
  async speakMessage(messageId: string, text: string): Promise<void> {
    if (!this.speechSynthesis || !this.selectedVoice) {
      console.warn('Speech synthesis not available');
      return;
    }

    // Stop any current speech
    this.stopSpeaking();

    // Clean text for better speech
    const cleanText = this.cleanTextForSpeech(text);
    
    this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance.voice = this.selectedVoice;
    this.currentUtterance.rate = this.speechRate;
    this.currentUtterance.pitch = this.speechPitch;
    this.currentUtterance.volume = 1;

    // Update message playing state
    this.updateMessagePlayingState(messageId, true);
    this.updateVoiceMode({ isSpeaking: true });

    this.currentUtterance.onstart = () => {
      this.updateMessagePlayingState(messageId, true);
      this.updateVoiceMode({ isSpeaking: true });
    };

    this.currentUtterance.onend = () => {
      this.updateMessagePlayingState(messageId, false);
      this.updateVoiceMode({ isSpeaking: false });
      this.currentUtterance = null;
      
      // Auto-resume listening in voice mode after speaking
      if (this.voiceModeSubject.value.isActive && this.voiceModeSubject.value.autoListen) {
        setTimeout(() => {
          this.startListening();
        }, 1000);
      }
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.updateMessagePlayingState(messageId, false);
      this.updateVoiceMode({ isSpeaking: false });
      this.currentUtterance = null;
    };

    this.speechSynthesis.speak(this.currentUtterance);
  }

  stopSpeaking(): void {
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      
      // Update all messages to not playing
      const messages = this.messagesSubject.value.map(msg => ({
        ...msg,
        isPlaying: false
      }));
      this.messagesSubject.next(messages);
      
      this.updateVoiceMode({ isSpeaking: false });
      this.currentUtterance = null;
    }
  }

  // Voice Mode Methods
  toggleVoiceMode(): void {
    const currentMode = this.voiceModeSubject.value;
    
    if (currentMode.isActive) {
      this.deactivateVoiceMode();
    } else {
      this.activateVoiceMode();
    }
  }
  
  activateVoiceMode(): void {
    if (!this.recognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    this.updateVoiceMode({ 
      isActive: true,
      autoListen: true,
      conversationFlow: true
    });
    
    // Start listening
    this.startListening();
    
    // Add welcome message for voice mode
    const welcomeMessage: ChatbotMessage = {
      id: this.generateId(),
      content: "Voice mode activated! I'm listening. You can speak naturally and I'll respond with voice. Say 'stop voice mode' to exit.",
      sender: 'bot',
      timestamp: new Date(),
      isPlaying: false
    };
    
    this.messagesSubject.next([...this.messagesSubject.value, welcomeMessage]);
    
    // Speak the welcome message
    setTimeout(() => {
      this.speakMessage(welcomeMessage.id, welcomeMessage.content);
    }, 500);
  }
  
  deactivateVoiceMode(): void {
    this.updateVoiceMode({ 
      isActive: false,
      isListening: false,
      isSpeaking: false
    });
    
    this.stopListening();
    this.stopSpeaking();
    
    // Clear any timers
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    if (this.voiceModeTimeout) {
      clearTimeout(this.voiceModeTimeout);
    }
  }
  
  startListening(): void {
    if (!this.recognition || !this.voiceModeSubject.value.isActive) return;
    
    try {
      this.isRecognitionActive = true;
      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
  
  stopListening(): void {
    if (!this.recognition) return;
    
    try {
      this.isRecognitionActive = false;
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
  
  private updateVoiceMode(updates: Partial<VoiceMode>): void {
    const currentMode = this.voiceModeSubject.value;
    this.voiceModeSubject.next({ ...currentMode, ...updates });
  }
  
  getVoiceMode(): VoiceMode {
    return this.voiceModeSubject.value;
  }
  
  isVoiceModeSupported(): boolean {
    return !!(this.recognition && this.speechSynthesis);
  }
  toggleMessageSpeech(messageId: string, text: string): void {
    const message = this.messagesSubject.value.find(m => m.id === messageId);
    if (message?.isPlaying) {
      this.stopSpeaking();
    } else {
      this.speakMessage(messageId, text);
    }
  }

  private updateMessagePlayingState(messageId: string, isPlaying: boolean): void {
    const messages = this.messagesSubject.value.map(msg => ({
      ...msg,
      isPlaying: msg.id === messageId ? isPlaying : false
    }));
    this.messagesSubject.next(messages);
  }

  private cleanTextForSpeech(text: string): string {
    // Remove markdown formatting
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
    cleaned = cleaned.replace(/[-•]\s/g, ''); // Bullet points
    cleaned = cleaned.replace(/\n+/g, '. '); // Line breaks to pauses
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces
    cleaned = cleaned.trim();
    
    // Add natural pauses
    cleaned = cleaned.replace(/([.!?])\s/g, '$1 ... ');
    
    return cleaned;
  }

  // Voice settings
  setSpeechRate(rate: number): void {
    this.speechRate = Math.max(0.5, Math.min(2, rate));
  }

  setSpeechPitch(pitch: number): void {
    this.speechPitch = Math.max(0.5, Math.min(2, pitch));
  }

  getSpeechRate(): number {
    return this.speechRate;
  }

  getSpeechPitch(): number {
    return this.speechPitch;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  setSelectedVoice(voice: SpeechSynthesisVoice): void {
    this.selectedVoice = voice;
  }

  getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  isSpeechSupported(): boolean {
    return !!this.speechSynthesis;
  }
  clearChat(): void {
    this.messagesSubject.next([]);
    this.context.previousQueries = [];
    this.stopSpeaking();
    this.deactivateVoiceMode();
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}