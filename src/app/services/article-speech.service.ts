import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslationService } from './translation.service';

export interface ArticleSpeechState {
  isPlaying: boolean;
  currentArticleId: string | null;
  currentSection: number;
  totalSections: number;
  progress: number;
  isPaused: boolean;
  playbackRate: number;
  selectedVoice: string | null;
  language: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArticleSpeechService {
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  private speechStateSubject = new BehaviorSubject<ArticleSpeechState>({
    isPlaying: false,
    currentArticleId: null,
    currentSection: 0,
    totalSections: 0,
    progress: 0,
    isPaused: false,
    playbackRate: 1,
    selectedVoice: null,
    language: 'en'
  });

  public speechState$ = this.speechStateSubject.asObservable();

  private articleSections: string[] = [];
  private currentSectionIndex = 0;

  constructor(private translationService: TranslationService) {
    this.initializeSpeechSynthesis();
    this.loadPreferences();
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      this.loadVoices();
      
      if (this.speechSynthesis.onvoiceschanged !== undefined) {
        this.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (this.speechSynthesis) {
      this.availableVoices = this.speechSynthesis.getVoices();
      
      // Auto-select best voice for current language
      this.selectBestVoiceForLanguage(this.speechStateSubject.value.language);
    }
  }

  private loadPreferences() {
    const savedRate = localStorage.getItem('articleSpeechRate');
    const savedLanguage = localStorage.getItem('articleSpeechLanguage');
    const savedVoice = localStorage.getItem('articleSpeechVoice');

    this.updateSpeechState({
      playbackRate: savedRate ? parseFloat(savedRate) : 1,
      language: savedLanguage || 'en',
      selectedVoice: savedVoice
    });
  }

  async startArticleSpeech(articleId: string, articleContent: any, language: string = 'en'): Promise<void> {
    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not supported');
    }

    // Stop any current speech
    this.stopSpeech();

    // Translate content if needed
    let contentToSpeak = articleContent;
    if (language !== 'en') {
      contentToSpeak = await this.translationService.translateArticleContent(articleContent, language);
    }

    // Extract text sections from article content
    this.articleSections = this.extractTextSections(contentToSpeak);
    this.currentSectionIndex = 0;

    this.updateSpeechState({
      isPlaying: true,
      currentArticleId: articleId,
      currentSection: 0,
      totalSections: this.articleSections.length,
      progress: 0,
      isPaused: false,
      language
    });

    // Select appropriate voice for language
    this.selectBestVoiceForLanguage(language);

    // Start speaking from first section
    this.speakCurrentSection();
  }

  private extractTextSections(content: any): string[] {
    const sections: string[] = [];

    if (content && content.sections) {
      content.sections.forEach((section: any) => {
        if (section.type === 'text' && section.content) {
          sections.push(this.cleanTextForSpeech(section.content));
        } else if (section.type === 'heading' && section.content) {
          sections.push(`Section: ${this.cleanTextForSpeech(section.content)}`);
        } else if (section.type === 'list' && section.items) {
          const listText = section.items.map((item: string, index: number) => 
            `Point ${index + 1}: ${this.cleanTextForSpeech(item)}`
          ).join('. ');
          sections.push(listText);
        } else if (section.type === 'callout' && section.content) {
          const calloutText = section.title ? 
            `Important note: ${section.title}. ${this.cleanTextForSpeech(section.content)}` :
            `Important: ${this.cleanTextForSpeech(section.content)}`;
          sections.push(calloutText);
        }
      });
    }

    return sections.filter(section => section.trim().length > 0);
  }

  private cleanTextForSpeech(text: string): string {
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
    cleaned = cleaned.replace(/[-•]\s/g, ''); // Bullet points
    cleaned = cleaned.replace(/\n+/g, '. '); // Line breaks to pauses
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces
    cleaned = cleaned.replace(/([.!?])\s/g, '$1. '); // Natural pauses
    return cleaned.trim();
  }

  private speakCurrentSection(): void {
    if (!this.speechSynthesis || 
        this.currentSectionIndex >= this.articleSections.length ||
        !this.selectedVoice) {
      this.completeSpeech();
      return;
    }

    const sectionText = this.articleSections[this.currentSectionIndex];
    
    this.currentUtterance = new SpeechSynthesisUtterance(sectionText);
    this.currentUtterance.voice = this.selectedVoice;
    this.currentUtterance.rate = this.speechStateSubject.value.playbackRate;
    this.currentUtterance.pitch = 1;
    this.currentUtterance.volume = 1;

    this.currentUtterance.onstart = () => {
      this.updateSpeechState({
        currentSection: this.currentSectionIndex,
        progress: (this.currentSectionIndex / this.articleSections.length) * 100
      });
    };

    this.currentUtterance.onend = () => {
      this.currentSectionIndex++;
      
      if (this.currentSectionIndex < this.articleSections.length) {
        // Continue to next section after a brief pause
        setTimeout(() => {
          if (this.speechStateSubject.value.isPlaying && !this.speechStateSubject.value.isPaused) {
            this.speakCurrentSection();
          }
        }, 800);
      } else {
        this.completeSpeech();
      }
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.stopSpeech();
    };

    this.speechSynthesis.speak(this.currentUtterance);
  }

  pauseSpeech(): void {
    if (this.speechSynthesis && this.speechSynthesis.speaking) {
      this.speechSynthesis.pause();
      this.updateSpeechState({ isPaused: true });
    }
  }

  resumeSpeech(): void {
    if (this.speechSynthesis && this.speechSynthesis.paused) {
      this.speechSynthesis.resume();
      this.updateSpeechState({ isPaused: false });
    }
  }

  stopSpeech(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    
    this.currentUtterance = null;
    this.articleSections = [];
    this.currentSectionIndex = 0;
    
    this.updateSpeechState({
      isPlaying: false,
      currentArticleId: null,
      currentSection: 0,
      totalSections: 0,
      progress: 0,
      isPaused: false
    });
  }

  private completeSpeech(): void {
    this.updateSpeechState({
      isPlaying: false,
      progress: 100,
      isPaused: false
    });
    
    // Auto-reset after completion
    setTimeout(() => {
      this.updateSpeechState({
        currentArticleId: null,
        currentSection: 0,
        totalSections: 0,
        progress: 0
      });
    }, 2000);
  }

  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    this.updateSpeechState({ playbackRate: clampedRate });
    localStorage.setItem('articleSpeechRate', clampedRate.toString());

    // Update current utterance if speaking
    if (this.currentUtterance && this.speechSynthesis?.speaking) {
      this.currentUtterance.rate = clampedRate;
    }
  }

  setLanguage(languageCode: string): void {
    this.updateSpeechState({ language: languageCode });
    this.selectBestVoiceForLanguage(languageCode);
    localStorage.setItem('articleSpeechLanguage', languageCode);
  }

  private selectBestVoiceForLanguage(languageCode: string): void {
    const langInfo = this.translationService.getLanguageInfo(languageCode);
    if (!langInfo) return;

    const voicesForLanguage = this.availableVoices.filter(voice => 
      voice.lang.toLowerCase().startsWith(langInfo.speechCode.toLowerCase().substring(0, 2))
    );

    if (voicesForLanguage.length > 0) {
      // Prefer female voices for healthcare content
      const femaleVoice = voicesForLanguage.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        ['samantha', 'karen', 'susan', 'victoria', 'allison', 'ava', 'zoe', 'zira', 'hazel'].some(name => 
          voice.name.toLowerCase().includes(name)
        )
      );

      this.selectedVoice = femaleVoice || voicesForLanguage[0];
      this.updateSpeechState({ selectedVoice: this.selectedVoice.name });
      localStorage.setItem('articleSpeechVoice', this.selectedVoice.name);
    }
  }

  getAvailableVoicesForLanguage(languageCode: string): SpeechSynthesisVoice[] {
    const langInfo = this.translationService.getLanguageInfo(languageCode);
    if (!langInfo) return [];

    return this.availableVoices.filter(voice => 
      voice.lang.toLowerCase().startsWith(langInfo.speechCode.toLowerCase().substring(0, 2))
    );
  }

  setVoice(voiceName: string): void {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      this.updateSpeechState({ selectedVoice: voiceName });
      localStorage.setItem('articleSpeechVoice', voiceName);
    }
  }

  skipToSection(sectionIndex: number): void {
    if (sectionIndex >= 0 && sectionIndex < this.articleSections.length) {
      this.stopSpeech();
      this.currentSectionIndex = sectionIndex;
      
      if (this.speechStateSubject.value.isPlaying) {
        this.speakCurrentSection();
      }
    }
  }

  private updateSpeechState(updates: Partial<ArticleSpeechState>): void {
    const currentState = this.speechStateSubject.value;
    this.speechStateSubject.next({ ...currentState, ...updates });
  }

  getSpeechState(): ArticleSpeechState {
    return this.speechStateSubject.value;
  }

  isSpeechSupported(): boolean {
    return !!this.speechSynthesis;
  }

  getVoiceDisplayName(voice: SpeechSynthesisVoice): string {
    let name = voice.name.replace(/^(Microsoft|Google|Apple)\s+/, '');
    
    if (voice.name.toLowerCase().includes('neural') || voice.name.toLowerCase().includes('premium')) {
      name += ' ⭐';
    }
    
    return name;
  }
}