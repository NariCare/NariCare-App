import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatbotMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot' | 'expert';
  timestamp: Date;
  isTyping?: boolean;
}

export interface ChatbotContext {
  userId: string;
  babyAge?: number;
  previousQueries: string[];
  currentTopic?: string;
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

  constructor(private http: HttpClient) {}

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
      const response = await this.getAIResponse(content);
      
      // Remove typing indicator
      const messagesWithoutTyping = this.messagesSubject.value.filter(m => m.id !== 'typing');
      
      const botResponse: ChatbotMessage = {
        id: this.generateId(),
        content: response,
        sender: 'bot',
        timestamp: new Date()
      };

      this.messagesSubject.next([...messagesWithoutTyping, botResponse]);
      this.context.previousQueries.push(content);
    } catch (error) {
      console.error('Error getting AI response:', error);
      this.handleAIError();
    }
  }

  private async getAIResponse(userQuery: string): Promise<string> {
    const prompt = this.buildPrompt(userQuery);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.openaiApiKey}`
    });

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a supportive AI assistant specialized in breastfeeding and infant care. Provide helpful, evidence-based advice while being empathetic and encouraging. Always recommend consulting healthcare professionals for serious concerns.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    };

    const response = await this.http.post<any>('https://api.openai.com/v1/chat/completions', body, { headers }).toPromise();
    return response.choices[0].message.content.trim();
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
      timestamp: new Date()
    };

    this.messagesSubject.next([...messagesWithoutTyping, errorMessage]);
  }

  requestExpertHelp(): void {
    const expertMessage: ChatbotMessage = {
      id: this.generateId(),
      content: "I've connected you with our expert team. They'll be with you shortly to provide personalized assistance.",
      sender: 'bot',
      timestamp: new Date()
    };

    this.messagesSubject.next([...this.messagesSubject.value, expertMessage]);
  }

  clearChat(): void {
    this.messagesSubject.next([]);
    this.context.previousQueries = [];
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}