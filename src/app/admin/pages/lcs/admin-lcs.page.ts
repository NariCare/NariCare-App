import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/operators';
import { AdminApiService } from '../../admin-api.service';
import { LC_MIN_PASSWORD, LcCreate, LcItem, fmtWhen, fullName, strongPassword } from '../../admin.models';

type Dialog = { kind: 'add' } | { kind: 'reset'; lc: LcItem } | { kind: 'status'; lc: LcItem };

const EMPTY_FORM = (): Required<LcCreate> => ({ firstName: '', lastName: '', email: '', phone: '', credentials: 'Lactation Consultant', password: '' });

@Component({
  selector: 'app-admin-lcs',
  templateUrl: './admin-lcs.page.html',
  styleUrls: ['./admin-lcs.page.scss']
})
export class AdminLcsPage implements OnInit, OnDestroy {
  @ViewChild('dialogEl') dialogEl?: ElementRef<HTMLElement>;
  readonly fmtWhen = fmtWhen;
  readonly fullName = fullName;
  readonly minPw = LC_MIN_PASSWORD;
  items: LcItem[] = [];
  total = 0;
  page = 1;
  limit = 20;
  includeInactive = true;
  loading = true;
  error = false;

  dialog: Dialog | null = null;
  form = EMPTY_FORM();
  password = '';
  showPw = false;
  saving = false;
  formError = '';
  copied = false;
  notice = '';
  private lastFocus: HTMLElement | null = null;
  private search$ = new Subject<string>();
  private reload$ = new BehaviorSubject<void>(undefined);
  private sub?: Subscription;
  searchText = '';

  constructor(private api: AdminApiService) {}

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }

  ngOnInit(): void {
    this.sub = combineLatest([this.search$.pipe(debounceTime(300), distinctUntilChanged(), startWith('')), this.reload$]).pipe(
      tap(([s]) => { this.searchText = s; this.loading = true; this.error = false; }),
      switchMap(([s]) => this.api.lcs({ search: s.trim() || undefined, page: this.page, limit: this.limit, includeInactive: this.includeInactive }).pipe(catchError(() => of(null))))
    ).subscribe(r => {
      this.loading = false;
      if (!r) { this.error = true; return; }
      this.items = r.items;
      this.total = r.total;
    });
  }

  onSearch(v: string): void { this.page = 1; this.search$.next(v); }
  toggleInactive(v: boolean): void { this.includeInactive = v; this.page = 1; this.reload$.next(); }
  go(p: number): void { this.page = p; this.reload$.next(); }
  reload(): void { this.reload$.next(); }

  openAdd(): void { this.form = EMPTY_FORM(); this.open({ kind: 'add' }); }
  openReset(lc: LcItem): void { this.password = ''; this.open({ kind: 'reset', lc }); }
  openStatus(lc: LcItem): void { this.open({ kind: 'status', lc }); }

  generate(): void {
    const pw = strongPassword();
    if (this.dialog?.kind === 'add') this.form.password = pw; else this.password = pw;
    this.showPw = true;
    this.copied = false;
  }

  async copy(value: string): Promise<void> {
    try { await navigator.clipboard.writeText(value); this.copied = true; } catch { this.formError = "Couldn't copy. Select the password and copy it manually."; }
  }

  submit(): void {
    if (!this.dialog || this.saving) return;
    this.formError = this.validate();
    if (this.formError) return;
    this.saving = true;
    const d = this.dialog;
    const req: Observable<unknown> = d.kind === 'add'
      ? this.api.createLc(this.payload())
      : d.kind === 'reset'
        ? this.api.resetLcPassword(d.lc.userId, this.password)
        : this.api.setLcStatus(d.lc.userId, d.lc.status === 'active' ? 'inactive' : 'active');
    req.subscribe({
      next: () => {
        this.saving = false;
        this.notice = d.kind === 'add' ? `${this.form.firstName} was added. Share the password with them securely.`
          : d.kind === 'reset' ? `Password reset for ${fullName(d.lc)}.`
            : `${fullName(d.lc)} is now ${d.lc.status === 'active' ? 'inactive' : 'active'}.`;
        this.close();
        this.reload();
      },
      error: (e: HttpErrorResponse) => { this.saving = false; this.formError = this.errorText(e); }
    });
  }

  close(): void {
    this.dialog = null;
    this.showPw = false;
    this.copied = false;
    this.formError = '';
    setTimeout(() => this.lastFocus?.focus());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.dialog && !this.saving) this.close(); }

  trackBy = (_: number, lc: LcItem) => lc.userId;

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private open(d: Dialog): void {
    this.lastFocus = document.activeElement as HTMLElement;
    this.dialog = d;
    this.formError = '';
    this.copied = false;
    this.showPw = false;
    setTimeout(() => (this.dialogEl?.nativeElement.querySelector('input, button.adm-btn') as HTMLElement | null)?.focus());
  }

  private payload(): LcCreate {
    const f = this.form;
    const body: LcCreate = { firstName: f.firstName.trim(), email: f.email.trim(), password: f.password };
    if (f.lastName.trim()) body.lastName = f.lastName.trim();
    if (f.phone.trim()) body.phone = f.phone.trim();
    body.credentials = f.credentials.trim() || 'Lactation Consultant';
    return body;
  }

  private validate(): string {
    const d = this.dialog!;
    if (d.kind === 'status') return '';
    if (d.kind === 'add') {
      if (!this.form.firstName.trim()) return 'First name is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) return 'Enter a valid email address.';
    }
    const pw = d.kind === 'add' ? this.form.password : this.password;
    return pw.length < LC_MIN_PASSWORD ? `Password must be at least ${LC_MIN_PASSWORD} characters.` : '';
  }

  private errorText(e: HttpErrorResponse): string {
    if (e.status === 409) return 'An account with this email already exists.';
    const b = e.error || {};
    const details = Array.isArray(b.details) ? b.details.map((x: any) => x.message).filter(Boolean).join('. ') : '';
    return details || b.message || b.error || "Couldn't save. Try again.";
  }
}
