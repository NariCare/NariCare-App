import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  feedingTag: string;
  isInclusive: boolean;
}

interface QuotesData {
  quotes: Quote[];
}

const STORAGE_KEY = 'quote_of_day';

// ponytail: backend swap point. Replace the http.get below with an API call
// once quotes move server-side; Quote interface + Observable shape stay the same.
@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private quotes$: Observable<Quote[]>;

  constructor(private http: HttpClient) {
    this.quotes$ = this.http.get<QuotesData>('/assets/data/quotes.json').pipe(
      map(data => (data.quotes || []).filter(q => q.isInclusive)),
      catchError(error => {
        console.error('Failed to load quotes:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  getQuoteOfTheDay(): Observable<Quote | null> {
    return this.quotes$.pipe(
      map(quotes => this.pickForToday(quotes))
    );
  }

  private pickForToday(quotes: Quote[]): Quote | null {
    if (!quotes.length) return null;

    const today = new Date().toISOString().split('T')[0];
    const cached = this.readCache();
    if (cached && cached.date === today) {
      const match = quotes.find(q => q.id === cached.id);
      if (match) return match;
    }

    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    this.writeCache(today, picked.id);
    return picked;
  }

  private readCache(): { date: string; id: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private writeCache(date: string, id: string): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, id }));
  }

  // Falls back to "NariCare" when author is missing or "Unknown".
  getAttribution(quote: Quote | null): string {
    if (!quote) return '';
    const author = quote.author && quote.author !== 'Unknown' ? quote.author : 'NariCare';
    return `- ${author}`;
  }
}
