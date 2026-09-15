import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export type TimeBlock = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Midnight';

export interface SelfCareTip {
  id: string;
  category: string;
  title: string;
  text: string;
  timeOfDay: TimeBlock;
}

interface SelfCareTipsData {
  tips: SelfCareTip[];
}

// ponytail: backend swap point, same as QuoteService. Replace http.get once
// tips move server-side; SelfCareTip interface + Observable shape stay the same.
@Injectable({
  providedIn: 'root'
})
export class SelfCareService {
  private tips$: Observable<SelfCareTip[]>;

  constructor(private http: HttpClient) {
    this.tips$ = this.http.get<SelfCareTipsData>('/assets/data/self-care-tips.json').pipe(
      map(data => data.tips || []),
      catchError(error => {
        console.error('Failed to load self-care tips:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  getTipsData(): Observable<SelfCareTip[]> {
    return this.tips$;
  }

  // Random pick within the block, not day-locked: caller re-invokes on block change / app resume.
  pickTip(tips: SelfCareTip[], block: TimeBlock): SelfCareTip | null {
    const matching = tips.filter(t => t.timeOfDay === block);
    if (!matching.length) return null;
    return matching[Math.floor(Math.random() * matching.length)];
  }
}
