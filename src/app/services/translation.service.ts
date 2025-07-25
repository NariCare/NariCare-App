import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiKeyService } from './api-key.service';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string; // For speech synthesis
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<string>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private supportedLanguages: SupportedLanguage[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', speechCode: 'en-US' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', speechCode: 'pt-PT' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', speechCode: 'zh-CN' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', speechCode: 'ko-KR' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', speechCode: 'ta-IN' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', speechCode: 'te-IN' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', speechCode: 'kn-IN' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', speechCode: 'ml-IN' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', speechCode: 'mr-IN' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', speechCode: 'gu-IN' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', speechCode: 'bn-IN' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', speechCode: 'pa-IN' },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', speechCode: 'or-IN' },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', speechCode: 'as-IN' }
  ];

  private translationCache = new Map<string, TranslationResult>();

  constructor(
    private http: HttpClient,
    private apiKeyService: ApiKeyService
  ) {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      this.currentLanguageSubject.next(savedLanguage);
    }
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return this.supportedLanguages;
  }

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  setLanguage(languageCode: string): void {
    if (this.isLanguageSupported(languageCode)) {
      this.currentLanguageSubject.next(languageCode);
      localStorage.setItem('selectedLanguage', languageCode);
    }
  }

  getLanguageInfo(code: string): SupportedLanguage | undefined {
    return this.supportedLanguages.find(lang => lang.code === code);
  }

  isLanguageSupported(code: string): boolean {
    return this.supportedLanguages.some(lang => lang.code === code);
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en'): Promise<TranslationResult> {
    // Check cache first
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.substring(0, 50)}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey)!;
    }

    // If target language is the same as source, return original
    if (sourceLanguage === targetLanguage) {
      const result: TranslationResult = {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0
      };
      return result;
    }

    try {
      // Use OpenAI for translation if API key is available
      const apiKey = this.apiKeyService.getOpenAIKey();
      if (this.apiKeyService.isOpenAIKeyValid()) {
        return await this.translateWithOpenAI(text, targetLanguage, sourceLanguage);
      } else {
        // Fallback to mock translation
        return this.getMockTranslation(text, targetLanguage, sourceLanguage);
      }
    } catch (error) {
      console.error('Translation error:', error);
      return this.getMockTranslation(text, targetLanguage, sourceLanguage);
    }
  }

  private async translateWithOpenAI(text: string, targetLanguage: string, sourceLanguage: string): Promise<TranslationResult> {
    const targetLangInfo = this.getLanguageInfo(targetLanguage);
    const sourceLangInfo = this.getLanguageInfo(sourceLanguage);
    
    if (!targetLangInfo || !sourceLangInfo) {
      throw new Error('Unsupported language');
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKeyService.getOpenAIKey()}`
    });

    const prompt = `Translate the following ${sourceLangInfo.name} text about breastfeeding and baby care to ${targetLangInfo.name}. 
    Maintain the medical accuracy and caring tone. Preserve any formatting like **bold** text and bullet points.
    For Indian regional languages, use culturally appropriate terms and consider local customs around breastfeeding and childcare.
    
    Text to translate:
    ${text}`;

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional medical translator specializing in maternal and infant health content. Provide accurate, culturally appropriate translations while maintaining the supportive and caring tone.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: Math.min(4000, text.length * 2),
      temperature: 0.3
    };

    const response = await this.http.post<any>('https://api.openai.com/v1/chat/completions', body, { headers }).toPromise();
    const translatedText = response.choices[0].message.content.trim();

    const result: TranslationResult = {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.95
    };

    // Cache the result
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.substring(0, 50)}`;
    this.translationCache.set(cacheKey, result);

    return result;
  }

  private getMockTranslation(text: string, targetLanguage: string, sourceLanguage: string): TranslationResult {
    // Simple mock translations for common phrases
    const mockTranslations: { [key: string]: { [key: string]: string } } = {
      'es': {
        'Breastfeeding': 'Lactancia materna',
        'Baby': 'Bebé',
        'Milk supply': 'Suministro de leche',
        'Latch': 'Agarre',
        'Feeding': 'Alimentación',
        'Growth': 'Crecimiento',
        'Hello': 'Hola',
        'How are you?': '¿Cómo estás?'
      },
      'fr': {
        'Breastfeeding': 'Allaitement',
        'Baby': 'Bébé',
        'Milk supply': 'Production de lait',
        'Latch': 'Prise du sein',
        'Feeding': 'Alimentation',
        'Growth': 'Croissance',
        'Hello': 'Bonjour',
        'How are you?': 'Comment allez-vous?'
      },
      'hi': {
        'Breastfeeding': 'स्तनपान',
        'Baby': 'बच्चा',
        'Milk supply': 'दूध की आपूर्ति',
        'Latch': 'लैच',
        'Feeding': 'भोजन',
        'Growth': 'विकास',
        'Hello': 'नमस्ते',
        'How are you?': 'आप कैसे हैं?'
      },
      'ta': {
        'Breastfeeding': 'தாய்ப்பால் கொடுத்தல்',
        'Baby': 'குழந்தை',
        'Milk supply': 'பால் வழங்கல்',
        'Latch': 'பிடிப்பு',
        'Feeding': 'உணவு',
        'Growth': 'வளர்ச்சி',
        'Hello': 'வணக்கம்',
        'How are you?': 'நீங்கள் எப்படி இருக்கிறீர்கள்?'
      },
      'te': {
        'Breastfeeding': 'తల్లిపాలు ఇవ్వడం',
        'Baby': 'పిల్లవాడు',
        'Milk supply': 'పాల సరఫరా',
        'Latch': 'లాచ్',
        'Feeding': 'దాణా',
        'Growth': 'పెరుగుదల',
        'Hello': 'నమస్కారం',
        'How are you?': 'మీరు ఎలా ఉన్నారు?'
      },
      'kn': {
        'Breastfeeding': 'ಎದೆಹಾಲು ಕೊಡುವುದು',
        'Baby': 'ಮಗು',
        'Milk supply': 'ಹಾಲಿನ ಪೂರೈಕೆ',
        'Latch': 'ಲ್ಯಾಚ್',
        'Feeding': 'ಆಹಾರ',
        'Growth': 'ಬೆಳವಣಿಗೆ',
        'Hello': 'ನಮಸ್ಕಾರ',
        'How are you?': 'ನೀವು ಹೇಗಿದ್ದೀರಿ?'
      },
      'ml': {
        'Breastfeeding': 'മുലയൂട്ടൽ',
        'Baby': 'കുഞ്ഞ്',
        'Milk supply': 'പാൽ വിതരണം',
        'Latch': 'ലാച്ച്',
        'Feeding': 'ഭക്ഷണം',
        'Growth': 'വളർച്ച',
        'Hello': 'നമസ്കാരം',
        'How are you?': 'നിങ്ങൾ എങ്ങനെയുണ്ട്?'
      },
      'mr': {
        'Breastfeeding': 'स्तनपान',
        'Baby': 'बाळ',
        'Milk supply': 'दुधाचा पुरवठा',
        'Latch': 'लॅच',
        'Feeding': 'आहार',
        'Growth': 'वाढ',
        'Hello': 'नमस्कार',
        'How are you?': 'तुम्ही कसे आहात?'
      },
      'gu': {
        'Breastfeeding': 'સ્તનપાન',
        'Baby': 'બાળક',
        'Milk supply': 'દૂધનો પુરવઠો',
        'Latch': 'લેચ',
        'Feeding': 'ખોરાક',
        'Growth': 'વૃદ્ધિ',
        'Hello': 'નમસ્તે',
        'How are you?': 'તમે કેમ છો?'
      },
      'bn': {
        'Breastfeeding': 'বুকের দুধ খাওয়ানো',
        'Baby': 'শিশু',
        'Milk supply': 'দুধের সরবরাহ',
        'Latch': 'ল্যাচ',
        'Feeding': 'খাওয়ানো',
        'Growth': 'বৃদ্ধি',
        'Hello': 'নমস্কার',
        'How are you?': 'আপনি কেমন আছেন?'
      },
      'pa': {
        'Breastfeeding': 'ਛਾਤੀ ਦਾ ਦੁੱਧ ਪਿਲਾਉਣਾ',
        'Baby': 'ਬੱਚਾ',
        'Milk supply': 'ਦੁੱਧ ਦੀ ਸਪਲਾਈ',
        'Latch': 'ਲੈਚ',
        'Feeding': 'ਖੁਆਉਣਾ',
        'Growth': 'ਵਿਕਾਸ',
        'Hello': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
        'How are you?': 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?'
      }
    };

    let translatedText = text;
    const translations = mockTranslations[targetLanguage];
    
    if (translations) {
      Object.entries(translations).forEach(([english, translated]) => {
        const regex = new RegExp(english, 'gi');
        translatedText = translatedText.replace(regex, translated);
      });
    } else {
      translatedText = `[${targetLanguage.toUpperCase()}] ${text}`;
    }

    return {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.7
    };
  }

  async translateArticleContent(content: any, targetLanguage: string): Promise<any> {
    if (!content || !content.sections) {
      return content;
    }

    const translatedSections = await Promise.all(
      content.sections.map(async (section: any) => {
        const translatedSection = { ...section };

        if (section.content) {
          const translation = await this.translateText(section.content, targetLanguage);
          translatedSection.content = translation.translatedText;
        }

        if (section.title) {
          const titleTranslation = await this.translateText(section.title, targetLanguage);
          translatedSection.title = titleTranslation.translatedText;
        }

        if (section.items && Array.isArray(section.items)) {
          translatedSection.items = await Promise.all(
            section.items.map(async (item: string) => {
              const itemTranslation = await this.translateText(item, targetLanguage);
              return itemTranslation.translatedText;
            })
          );
        }

        return translatedSection;
      })
    );

    return {
      ...content,
      sections: translatedSections
    };
  }

  clearCache(): void {
    this.translationCache.clear();
  }

  getCacheSize(): number {
    return this.translationCache.size;
  }
}