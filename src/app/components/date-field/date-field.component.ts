import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// One NariCare calendar everywhere (same ion-datetime look as the log modals); form value stays 'YYYY-MM-DD'.
@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [IonicModule],
  template: `
    <button type="button" class="date-field-btn" [id]="inputId" [disabled]="disabled"
      aria-haspopup="dialog" [attr.aria-label]="(label ? label + ', ' : '') + (value ? display : placeholder)"
      (click)="open = true">
      <span [class.placeholder]="!value">{{ value ? display : placeholder }}</span>
      <ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>
    </button>
    <ion-modal class="date-field-modal" [isOpen]="open" (didDismiss)="close()">
      <ng-template>
        <ion-datetime presentation="date" locale="en-IN"
          [value]="value || null" [min]="min || undefined" [max]="max || undefined"
          (ionChange)="pick($event.detail.value)"></ion-datetime>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    :host { display: block; flex: 1; width: 100%; }
    .date-field-btn {
      width: 100%; min-height: 48px; padding: 0; border: 0; background: transparent;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      color: inherit; text-align: left; cursor: pointer; font: inherit; font-size: 1rem;
    }
    .date-field-btn ion-icon { font-size: 1rem; opacity: 0.6; flex-shrink: 0; }
    .date-field-btn:focus-visible { outline: none; }
    .date-field-btn:disabled { opacity: 0.5; cursor: default; }
    .placeholder { color: #8a84ad; }
    ion-modal.date-field-modal {
      --width: fit-content; --height: fit-content; --border-radius: 16px;
      // !important beats Ionic rule that hides backdrop/shadow on stacked modals (same as app-time-field)
      --backdrop-opacity: 0.4 !important; --box-shadow: 0 12px 32px rgba(45, 55, 72, 0.2) !important;
    }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }],
})
export class DateFieldComponent implements ControlValueAccessor {
  private static nextId = 0;
  @Input() inputId = `date-field-${DateFieldComponent.nextId++}`;
  @Input() label = '';
  @Input() placeholder = 'Select date';
  @Input() min = '';
  @Input() max = '';

  value = '';
  open = false;
  disabled = false;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // '2026-09-26' -> '26 Sep 2026'; parsed as local parts so the day never shifts across timezones
  get display(): string {
    const [y, m, d] = this.value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Accepts 'YYYY-MM-DD' or ISO ('2026-09-26T00:00:00'); returns 'YYYY-MM-DD' or ''.
  static toYMD(v: unknown): string {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v ?? '').trim());
    return m ? m[1] : '';
  }

  // Tapping a day applies and closes, like the log calendars; month/year paging doesn't emit ionChange
  pick(v: unknown): void {
    const ymd = DateFieldComponent.toYMD(Array.isArray(v) ? v[0] : v);
    if (ymd && ymd !== this.value) {
      this.value = ymd;
      this.onChange(ymd);
    }
    this.open = false;
  }

  close(): void {
    this.open = false;
    this.onTouched();
  }

  writeValue(v: unknown): void { this.value = DateFieldComponent.toYMD(v); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
