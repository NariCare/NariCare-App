import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ArticleSpeechService, ArticleSpeechState } from '../../services/article-speech.service';
import { TranslationService, SupportedLanguage } from '../../services/translation.service';
import { Article } from '../../models/knowledge-base.model';

@Component({
  selector: 'app-article-speech-controls',
  templateUrl: './article-speech-controls.component.html',
  styleUrls: ['./article-speech-controls.component.scss']
})
export class ArticleSpeechControlsComponent implements OnInit, OnDestroy {
  @Input() article!: Article;
  @Input() compact: boolean = false;

  speechState$: Observable<ArticleSpeechState>;
  supportedLanguages: SupportedLanguage[] = [];
  selectedLanguage = 'en';
  showLanguageSelector = false;
  showSpeechSettings = false;
  availableVoices: SpeechSynthesisVoice[] = [];
  
  private subscription = new Subscription();

  constructor(
    protected speechService: ArticleSpeechService,
    private translationService: TranslationService
  ) {
    this.speechState$ = this.speechService.speechState$;
    this.supportedLanguages = this.translationService.getSupportedLanguages();
  }

  ngOnInit() {
    this.subscription.add(
      this.translationService.currentLanguage$.subscribe(language => {
        this.selectedLanguage = language;
        this.loadVoicesForLanguage(language);
      })
    );

    this.subscription.add(
      this.speechState$.subscribe(state => {
        if (state.language !== this.selectedLanguage) {
          this.selectedLanguage = state.language;
          this.loadVoicesForLanguage(state.language);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadVoicesForLanguage(languageCode: string) {
    this.availableVoices = this.speechService.getAvailableVoicesForLanguage(languageCode);
  }

  async toggleSpeech() {
    const currentState = this.speechService.getSpeechState();
    
    if (currentState.isPlaying && currentState.currentArticleId === this.article.id) {
      if (currentState.isPaused) {
        this.speechService.resumeSpeech();
      } else {
        this.speechService.pauseSpeech();
      }
    } else {
      try {
        await this.speechService.startArticleSpeech(
          this.article.id, 
          this.article.content, 
          this.selectedLanguage
        );
      } catch (error) {
        console.error('Failed to start speech:', error);
      }
    }
  }

  stopSpeech() {
    this.speechService.stopSpeech();
  }

  onLanguageChange(languageCode: string) {
    this.selectedLanguage = languageCode;
    this.translationService.setLanguage(languageCode);
    this.speechService.setLanguage(languageCode);
    this.showLanguageSelector = false;
  }

  onPlaybackRateChange(rate: number) {
    this.speechService.setPlaybackRate(rate);
  }

  onVoiceChange(voiceName: string) {
    this.speechService.setVoice(voiceName);
  }

  toggleLanguageSelector() {
    this.showLanguageSelector = !this.showLanguageSelector;
    this.showSpeechSettings = false;
  }

  toggleSpeechSettings() {
    this.showSpeechSettings = !this.showSpeechSettings;
    this.showLanguageSelector = false;
  }

  getPlayButtonIcon(state: ArticleSpeechState): string {
    if (state.currentArticleId === this.article.id && state.isPlaying) {
      return state.isPaused ? 'play' : 'pause';
    }
    return 'play';
  }

  getPlayButtonText(state: ArticleSpeechState): string {
    if (state.currentArticleId === this.article.id && state.isPlaying) {
      return state.isPaused ? 'Resume' : 'Pause';
    }
    return 'Listen';
  }

  isCurrentArticle(state: ArticleSpeechState): boolean {
    return state.currentArticleId === this.article.id;
  }

  getProgressText(state: ArticleSpeechState): string {
    if (!this.isCurrentArticle(state) || !state.isPlaying) {
      return '';
    }
    return `Section ${state.currentSection + 1} of ${state.totalSections}`;
  }

  getSelectedLanguageInfo(): SupportedLanguage | undefined {
    return this.supportedLanguages.find(lang => lang.code === this.selectedLanguage);
  }

  isSpeechSupported(): boolean {
    return this.speechService.isSpeechSupported();
  }

  getVoiceDisplayName(voice: SpeechSynthesisVoice): string {
    return this.speechService.getVoiceDisplayName(voice);
  }
}