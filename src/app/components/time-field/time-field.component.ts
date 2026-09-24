import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DateOnlyUtil } from '../../shared/utils/date-only.util';

// 12-hour time picker on every device; form value stays 'HH:MM' (24h) for save/validation.
@Component({
  selector: 'app-time-field',
  template: `
    <button type="button" class="time-field-btn" [id]="inputId" [disabled]="disabled"
      aria-haspopup="dialog" [attr.aria-label]="(label ? label + ', ' : '') + (value ? display : placeholder)"
      (click)="open = true">
      <span [class.placeholder]="!value">{{ value ? display : placeholder }}</span>
    </button>
    <ion-modal class="time-field-modal" [isOpen]="open" (didDismiss)="close()">
      <ng-template>
        <ion-datetime presentation="time" hourCycle="h12" locale="en-US"
          [value]="value || null" [showDefaultButtons]="true"
          (ionChange)="pick($event.detail.value)"></ion-datetime>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    :host { display: block; flex: 1; width: 100%; }
    .time-field-btn {
      width: 100%; min-height: 48px; padding: 0; border: 0; background: transparent;
      color: inherit; text-align: left; cursor: pointer;
      font: inherit; font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums;
    }
    .time-field-btn:focus-visible { outline: none; }
    .time-field-btn:disabled { opacity: 0.5; cursor: default; }
    .placeholder { font-size: 1rem; font-weight: 400; color: #8a84ad; }
    ion-modal.time-field-modal {
      --width: fit-content; --height: fit-content; --border-radius: 16px;
      // !important beats Ionic rule that hides backdrop/shadow on stacked modals
      --backdrop-opacity: 0.4 !important; --box-shadow: 0 12px 32px rgba(45, 55, 72, 0.2) !important;
    }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeFieldComponent), multi: true }],
})
export class TimeFieldComponent implements ControlValueAccessor {
  private static nextId = 0;
  @Input() inputId = `time-field-${TimeFieldComponent.nextId++}`;
  @Input() label = '';
  @Input() placeholder = 'Select time';

  value = '';
  open = false;
  disabled = false;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  get display(): string { return DateOnlyUtil.to12Hour(this.value); }

  // Accepts 'HH:MM', 'HH:MM:SS' or full ISO ('2026-09-25T01:43:00'); returns 'HH:MM'.
  static toHHMM(v: unknown): string {
    const m = /(?:T|^)(\d{1,2}):(\d{2})/.exec(String(v ?? '').trim());
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  }

  pick(v: unknown): void {
    const hhmm = TimeFieldComponent.toHHMM(Array.isArray(v) ? v[0] : v);
    if (!hhmm || hhmm === this.value) return;
    this.value = hhmm;
    this.onChange(hhmm);
  }

  close(): void {
    this.open = false;
    this.onTouched();
  }

  writeValue(v: unknown): void { this.value = TimeFieldComponent.toHHMM(v); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
