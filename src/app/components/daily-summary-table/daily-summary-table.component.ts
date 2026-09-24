import { Component, EventEmitter, Input, Output } from '@angular/core';
import { formatDate } from '@angular/common';
import { DateOnlyUtil } from '../../shared/utils/date-only.util';
import { DailySummaryDay, PUMPING_DEFINITION, fmtAvg } from '../../models/daily-summary.model';

interface Row { day: DailySummaryDay; top: string; bottom: string; cells: string[]; aria: string; }

@Component({
  selector: 'app-daily-summary-table',
  templateUrl: './daily-summary-table.component.html',
  styleUrls: ['./daily-summary-table.component.scss']
})
export class DailySummaryTableComponent {
  @Input() loading = false;
  @Input() selected: string | null = null;
  @Output() dayTap = new EventEmitter<DailySummaryDay>();

  readonly definition = PUMPING_DEFINITION;
  readonly headers = [
    { short: 'Direct', full: 'Direct feeds' },
    { short: 'Avg', full: 'Average direct feed duration' },
    { short: 'Pump*', full: 'Pumping sessions' },
    { short: 'Pumped', full: 'Pumped output in mL' },
    { short: 'Formula', full: 'Formula intake in mL' },
    { short: 'Pee', full: 'Wet diapers' }
  ];
  rows: Row[] = [];

  @Input() set days(days: DailySummaryDay[] | null) {
    const today = DateOnlyUtil.formatLocalDate();
    this.rows = (days || []).map(d => {
      const date = DateOnlyUtil.parseLocalDate(d.date);
      const cells = d.hasData
        ? [String(d.feeding.directSessions), fmtAvg(d.feeding.averageDurationMinutes), String(d.pumping.sessions),
          `${d.pumping.outputMl} mL`, `${d.feeding.formulaMl} mL`, String(d.diapers.pee)]
        : this.headers.map(() => '-');
      const label = formatDate(date, 'EEEE d MMMM', 'en-US');
      const aria = `${label}${d.hasData ? '' : ', nothing logged'}. Open day details`;
      return {
        day: d,
        top: d.date === today ? 'Today' : formatDate(date, 'EEE', 'en-US'),
        bottom: formatDate(date, 'd MMM', 'en-US'),
        cells,
        aria
      };
    });
  }

  trackRow(_: number, r: Row): string { return r.day.date; }
}
