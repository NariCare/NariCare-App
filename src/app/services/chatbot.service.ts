import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatbotMessage {
  id: string;
  content: string;
  formattedContent?: ChatbotContent;
  sender: 'user' | 'bot' | 'expert';
  timestamp: Date;
  isTyping?: boolean;
  followUpOptions?: FollowUpOption[];
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
      const response = await this.getStructuredAIResponse(content);
      
      // Remove typing indicator
      const messagesWithoutTyping = this.messagesSubject.value.filter(m => m.id !== 'typing');
      
      const botResponse: ChatbotMessage = {
        id: this.generateId(),
        content: response.text,
        formattedContent: response,
        sender: 'bot',
        timestamp: new Date(),
        followUpOptions: this.generateFollowUpOptions(content)
      };

      this.messagesSubject.next([...messagesWithoutTyping, botResponse]);
      this.context.previousQueries.push(content);
    } catch (error) {
      console.error('Error getting AI response:', error);
      this.handleAIError();
    }
  }

  private async getAIResponse(userQuery: string): Promise<string> {
  }
  private async getStructuredAIResponse(userQuery: string): Promise<ChatbotContent> {
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

  private getMockResponse(userQuery: string): ChatbotContent {
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