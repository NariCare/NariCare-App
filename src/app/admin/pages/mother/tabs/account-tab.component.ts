import { Component, Input } from '@angular/core';
import { MotherDetail, fmtWhen } from '../../../admin.models';

@Component({
  selector: 'app-account-tab',
  styleUrls: ['./tabs.scss'],
  template: `
    <div class="adm-grid-2">
      <section class="adm-card">
        <div class="adm-card-head"><h2>Account</h2><span class="adm-badge grey">View only</span></div>
        <dl class="tab-dl" *ngIf="detail.account as a">
          <dt>Status</dt><dd><span class="adm-badge" [ngClass]="a.status">{{ a.status | titlecase }}</span></dd>
          <dt>Joined</dt><dd>{{ fmtWhen(a.joinedAt, 'd MMM y, h:mm a') }}</dd>
          <dt>Sign-in method</dt><dd>{{ (a.loginType | titlecase) || '-' }}</dd>
          <dt>Timezone</dt><dd>{{ a.timezone || '-' }}</dd>
          <dt>Plan</dt><dd>{{ a.tier ? tierLabel(a.tier.type) : '-' }}</dd>
          <dt>Plan dates</dt><dd>{{ a.tier ? fmtWhen(a.tier.startDate) + ' to ' + fmtWhen(a.tier.endDate) : '-' }}</dd>
          <dt>Onboarding</dt><dd>{{ a.onboardingCompleted ? 'Completed' : 'Not completed' }}</dd>
          <dt>Last recorded activity</dt><dd>{{ fmtWhen(a.lastActivityAt, 'd MMM y, h:mm a') }}</dd>
          <dt>Deleted on</dt><dd>{{ fmtWhen(a.deletedAt, 'd MMM y, h:mm a') }}</dd>
        </dl>
      </section>
      <section class="adm-card">
        <div class="adm-card-head"><h2>Contact</h2></div>
        <dl class="tab-dl" *ngIf="detail.profile as p">
          <dt>Email</dt><dd>{{ p.email || '-' }}</dd>
          <dt>Phone</dt><dd>{{ p.phone || '-' }}</dd>
          <dt>WhatsApp</dt><dd>{{ p.whatsapp || '-' }}</dd>
          <dt>Mother type</dt><dd>{{ p.motherType ? (p.motherType === 'new_mom' ? 'New mother' : (p.motherType | titlecase)) : '-' }}</dd>
        </dl>
        <div class="adm-card-head acc-counts"><h2>Saved records</h2></div>
        <dl class="tab-dl" *ngIf="detail.counts as c">
          <dt>Feeds</dt><dd>{{ c.feeds }}</dd>
          <dt>Pumping sessions</dt><dd>{{ c.pumps }}</dd>
          <dt>Diaper changes</dt><dd>{{ c.diapers }}</dd>
          <dt>Growth records</dt><dd>{{ c.growth }}</dd>
          <dt>Mood check-ins</dt><dd>{{ c.mood }}</dd>
          <dt>AI questions</dt><dd>{{ c.aiQuestions }}</dd>
        </dl>
      </section>
    </div>
  `,
  styles: ['.acc-counts { margin-top: 20px; }']
})
export class AccountTabComponent {
  @Input() detail!: MotherDetail;
  readonly fmtWhen = fmtWhen;

  tierLabel(t: string): string {
    return ({ basic: 'Basic', 'one-month': '1-Month program', 'three-month': '3-Month program' } as Record<string, string>)[t] || t || '-';
  }
}
