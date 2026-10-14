import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const KEY = 'naricare_active_baby';

/** Remembers which baby the Track screens show, across pages and reloads. */
@Injectable({ providedIn: 'root' })
export class ActiveBabyService {
  readonly activeBabyId$ = new BehaviorSubject<string | null>(read());

  set(id: string): void {
    try { localStorage.setItem(KEY, id); } catch {}
    this.activeBabyId$.next(id);
  }

  private clear(): void {
    try { localStorage.removeItem(KEY); } catch {}
    this.activeBabyId$.next(null);
  }

  /** Stored baby if still on the account, else the newest one. */
  resolve<T extends { id: string; createdAt?: any; created_at?: any }>(babies: T[]): T | undefined {
    const stored = babies.find(b => b.id === this.activeBabyId$.value);
    if (stored) return stored;
    if (this.activeBabyId$.value) this.clear(); // stored baby was deleted or archived
    if (!babies.length) return undefined;
    const time = (b: T) => new Date(b.createdAt || b.created_at || 0).getTime() || 0;
    return babies.some(time) ? babies.reduce((a, b) => (time(b) > time(a) ? b : a)) : babies[babies.length - 1];
  }
}

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
