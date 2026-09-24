import { Component, Input, OnChanges } from '@angular/core';
import { MotherDetail, fmtWhen } from '../../../admin.models';

interface Field { label: string; value: string; }
interface Section { title: string; fields: Field[]; }

const HIDDEN = new Set(['id', 'userId', 'user_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);

/** "dueDate" / "due_date" -> "Due date". */
function humanize(key: string): string {
  const s = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function show(v: any): string {
  if (v == null || v === '') return '-';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.map(show).join(', ') : '-';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${humanize(k)}: ${show(x)}`).join('; ') || '-';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return fmtWhen(v.slice(0, 10));
  return String(v);
}

function fields(obj: any): Field[] {
  if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch { /* plain text answer */ } }
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return [{ label: 'Answer', value: show(obj) }];
  return Object.entries(obj).filter(([k]) => !HIDDEN.has(k)).map(([k, v]) => ({ label: humanize(k), value: show(v) }));
}

@Component({
  selector: 'app-pregnancy-overview',
  styleUrls: ['./tabs.scss'],
  template: `
    <div class="adm-stack">
      <section class="adm-card">
        <div class="adm-card-head"><h2>Pregnancy</h2></div>
        <div class="adm-tiles po-tiles">
          <div class="adm-tile orange"><span class="ic"><ion-icon name="heart-outline" aria-hidden="true"></ion-icon></span>
            <div><strong>{{ detail.profile.weeksPregnant ?? '-' }}</strong><span>Weeks pregnant</span></div></div>
          <div class="adm-tile pink"><span class="ic"><ion-icon name="calendar-outline" aria-hidden="true"></ion-icon></span>
            <div><strong class="po-date">{{ fmtWhen(detail.profile.dueDate) }}</strong><span>Due date</span></div></div>
          <div class="adm-tile"><span class="ic"><ion-icon name="happy-outline" aria-hidden="true"></ion-icon></span>
            <div><strong>{{ detail.counts.mood }}</strong><span>Mood check-ins</span></div></div>
          <div class="adm-tile green"><span class="ic"><ion-icon name="chatbubbles-outline" aria-hidden="true"></ion-icon></span>
            <div><strong>{{ detail.counts.aiQuestions }}</strong><span>AI questions</span></div></div>
        </div>
        <dl class="tab-dl po-dl" *ngIf="pregnancy.length">
          <ng-container *ngFor="let f of pregnancy"><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></ng-container>
        </dl>
        <p class="adm-empty" *ngIf="!pregnancy.length">No pregnancy details saved.</p>
      </section>

      <section class="adm-card">
        <div class="adm-card-head"><h2>Onboarding answers</h2></div>
        <p class="adm-empty" *ngIf="!onboarding.length">No onboarding answers saved.</p>
        <div class="po-section" *ngFor="let s of onboarding">
          <h3>{{ s.title }}</h3>
          <dl class="tab-dl"><ng-container *ngFor="let f of s.fields"><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></ng-container></dl>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .po-dl { margin-top: 14px; }
    .po-date { font-size: 16px !important; }
    .po-section + .po-section { margin-top: 18px; }
    .po-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  `]
})
export class PregnancyOverviewComponent implements OnChanges {
  @Input() detail!: MotherDetail;
  readonly fmtWhen = fmtWhen;
  pregnancy: Field[] = [];
  onboarding: Section[] = [];

  ngOnChanges(): void {
    this.pregnancy = this.detail.pregnancy ? fields(this.detail.pregnancy) : [];
    this.onboarding = (this.detail.onboarding || []).map(s => ({ title: humanize(s.section || 'Answers'), fields: fields(s.data) }));
  }
}
