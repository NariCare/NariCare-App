import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as Highcharts from 'highcharts';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable, firstValueFrom } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { BackendAuthService } from '../../../services/backend-auth.service';
import { GrowthTrackingService } from '../../../services/growth-tracking.service';
import { BackendGrowthService, HistoryType } from '../../../services/backend-growth.service';
import { ActivityLog, ActivityRow, recordAt, timeAgo, toFeedLog } from '../../../components/activity-log/activity-log.component';
import { WHOGrowthChartService } from '../../../services/who-growth-chart.service';
import { WeightChartModalComponent } from '../../../components/weight-chart-modal/weight-chart-modal.component';
import { FeedLogModalComponent } from '../../../components/feed-log-modal/feed-log-modal.component';
import { DiaperLogModalComponent } from '../../../components/diaper-log-modal/diaper-log-modal.component';
import { WeightLogModalComponent } from '../../../components/weight-log-modal/weight-log-modal.component';
import { BabyEditModalComponent } from '../../../components/baby-edit-modal/baby-edit-modal.component';
import { 
  GrowthRecord,
  StoolRecord,
  DiaperChangeRecord,
  BreastSide,
  SupplementType,
  LipstickShape,
  MotherMood,
  StoolColor,
  StoolTexture,
  StoolSize
} from '../../../models/growth-tracking.model';
import { User, Baby } from '../../../models/user.model';
import { PumpingRecord } from '../../../models/growth-tracking.model';
import { AgeCalculatorUtil } from '../../../shared/utils/age-calculator.util';
import { DateOnlyUtil } from '../../../shared/utils/date-only.util';
import { whoPercentile, formatPercentile, whoCurve, GrowthKind } from '../../../shared/utils/who-lms.util';
import { formatDate } from '@angular/common';
import { TrackerSummaryService } from '../../../services/tracker-summary.service';
import { ActiveBabyService } from '../../../services/active-baby.service';

interface ChartSeries { path: string; pts: { x: number; y: number }[]; tag: { x: number; y: number; w: number; text: string } }
export interface GrowthChart { weight?: ChartSeries; height?: ChartSeries; ticks: { x: number; label: string; anchor: string }[]; label: string }

// Chart plot box in viewBox units (320 x 150); right gutter holds the end-value tags
const PLOT = { left: 8, right: 252, top: 14, bottom: 116 };
const kg = (v: any) => { const n = parseFloat((+v).toFixed(2)); return Number.isInteger(n) ? n.toFixed(1) : String(n); };
const cm = (v: any) => String(parseFloat((+v).toFixed(1)));

export type GrowthRange = '6M' | '1Y' | '3Y' | '5Y' | 'All';
interface GrowthPt { at: number; w: number | null; h: number | null }
interface Spark { line: string; area: string; end: { x: number; y: number } }
export interface GrowthData { pts: GrowthPt[]; spark: Partial<Record<GrowthKind, Spark>> }
export interface GrowthChartView { w: [number, number][]; h: [number, number][]; label: string }
const RANGE_MONTHS: Record<GrowthRange, number> = { '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60, All: 0 };
const DAY_MS = 864e5, MONTH_MS = 30.4375 * DAY_MS;
const WEIGHT_COLOR = '#e0679a', HEIGHT_COLOR = '#6464d3';

/** Sparkline paths in a 64 x 28 box: line, closed area, end dot. Undefined under 2 values. */
function sparkline(vals: number[]): Spark | undefined {
  if (vals.length < 2) return undefined;
  const W = 64, H = 28, P = 3, lo = Math.min(...vals), hi = Math.max(...vals);
  const xy = vals.map((v, i) => ({
    x: +(P + (i / (vals.length - 1)) * (W - 2 * P)).toFixed(1),
    y: +(hi === lo ? H / 2 : H - P - ((v - lo) / (hi - lo)) * (H - 2 * P)).toFixed(1)
  }));
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const end = xy[xy.length - 1];
  return { line, area: `${line} L${end.x} ${H} L${xy[0].x} ${H} Z`, end };
}

interface WeekBar { x: number; y: number; w: number; h: number; v: number; cls: string }
export interface WeekChart { days: { x: number; label: string; today: boolean; bars: WeekBar[] }[]; legend: { cls: string; label: string }[]; label: string; total: number }
export interface StatCard { value: string; sub: string; empty?: boolean }
export interface TrackerOverview { updated: string; last: StatCard; today: StatCard; week: WeekChart }
interface WeekSeries { cls: string; label: string; count: (r: any) => number }

// Bar chart plot box in the same 320 x 150 viewBox as the growth chart; top leaves room for value labels
const WEEK = { left: 8, right: 312, top: 24, bottom: 116 };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const agoValue = (at: Date, timed: boolean) => (timed ? timeAgo(at) : formatDate(at, 'd MMM', 'en-US'));
const feedTime = (r: any): string | undefined => r.time || [r.directFeedDetails?.startTime, r.expressedMilkDetails?.startTime, r.formulaDetails?.startTime].filter(Boolean).sort()[0];
const diaperType = (r: any): string => r.change_type || r.type || r.changeType;

@Component({
  selector: 'app-baby-detail',
  templateUrl: './baby-detail.page.html',
  styleUrls: ['./baby-detail.page.scss', './baby-detail-growth.scss'],
})
export class BabyDetailPage implements OnInit, OnDestroy {
  user: User | null = null;
  baby: Baby | null = null;
  babyId: string = '';
  selectedSubTab: 'weight-size' | 'feed-tracks' | 'diaper-change' | 'pumping-tracks' | 'stool-tracks' = 'weight-size';
  
  // Data observables. The template shows a skeleton while `| async` is still null.
  growthRecords$: Observable<any[]> | null = null;
  weightRecords$: Observable<any[]> | null = null;
  stoolRecords$: Observable<StoolRecord[]> | null = null;
  diaperChangeRecords$: Observable<any[]> | null = null;
  pumpingRecords$: Observable<any[]> | null = null;
  private loadedBabyId: string | null = null;
  feedLog$: Observable<ActivityLog> | null = null;
  diaperLog$: Observable<ActivityLog> | null = null;
  weightLog$: Observable<ActivityLog> | null = null;
  growthChart$: Observable<GrowthChart | null> | null = null;
  growthData$: Observable<GrowthData> | null = null;
  readonly growthKinds = ['weight', 'height'] as const;
  readonly growthRanges: GrowthRange[] = ['6M', '1Y', '3Y', '5Y', 'All'];
  growthRange: GrowthRange = 'All';
  showWhoMedian = false;
  showAllGrowth = false;
  showAllLog = { feed: false, diaper: false };
  showGrowthInfo = false;
  growthChartView: GrowthChartView | null = null;
  private growthPts: GrowthPt[] = [];
  private hc?: Highcharts.Chart;
  private hcEl?: HTMLElement;
  private hcResize?: ResizeObserver;
  feedOverview$: Observable<TrackerOverview> | null = null;
  diaperOverview$: Observable<TrackerOverview> | null = null;
  hasMore: Partial<Record<HistoryType, Observable<boolean>>> = {};
  loadingOlder: Partial<Record<HistoryType, boolean>> = {};

  // Modal controls
  showAddRecordModal = false;
  showAddWeightModal = false;
  showAddStoolModal = false;
  showAddPumpingModal = false;
  showAddDiaperModal = false;
  
  // Forms
  addRecordForm: FormGroup;
  addStoolForm: FormGroup;
  
  // Selection states
  selectedBreastSide: BreastSide | null = null;
  selectedSupplement: SupplementType | null = null;
  selectedLipstickShape: LipstickShape | null = null;
  selectedMotherMood: MotherMood | null = null;
  selectedStoolColor: StoolColor | null = null;
  selectedStoolTexture: StoolTexture | null = null;
  selectedStoolSize: StoolSize | null = null;
  painLevel: number = 0;
  
  // Options
  breastSideOptions: BreastSide[] = [];
  supplementOptions: SupplementType[] = [];
  lipstickShapeOptions: LipstickShape[] = [];
  motherMoodOptions: MotherMood[] = [];
  stoolColorOptions: StoolColor[] = [];
  stoolTextureOptions: StoolTexture[] = [];
  stoolSizeOptions: StoolSize[] = [];
  
  // Voice input
  isRecording = false;
  isProcessingVoice = false;
  isRecordingStool = false;
  isProcessingVoiceStool = false;
  recognition: any;
  voiceTranscript = '';
  voiceTranscriptStool = '';
  extractedData: any = {};
  extractedDataStool: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private backendAuthService: BackendAuthService,
    private growthService: GrowthTrackingService,
    private backendGrowthService: BackendGrowthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private zone: NgZone,
    public trackerSummary: TrackerSummaryService,
    private activeBaby: ActiveBabyService
  ) {
    // Initialize forms
    this.addRecordForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      startTime: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      endTime: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      painLevel: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
      notes: [''],
      directFeedingSessions: [0],
      avgFeedingDuration: [0],
      pumpingSessions: [0],
      totalPumpingOutput: [0],
      formulaIntake: [0],
      peeCount: [0],
      poopCount: [0],
      moodDescription: ['']
    });
    
    
    this.addStoolForm = this.formBuilder.group({
      date: [new Date().toISOString(), [Validators.required]],
      time: [new Date().toTimeString().slice(0, 5), [Validators.required]],
      peeCount: ['', [Validators.min(0), Validators.max(20)]],
      poopCount: ['', [Validators.min(0), Validators.max(15)]],
      notes: ['']
    });
    
    this.initializeSpeechRecognition();
  }

  openDailySummary(): void { this.router.navigate(['/tabs/growth/daily-summary', this.babyId]); }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.babyId = params['id'];
      console.log('Baby Detail Page - Route param baby ID:', this.babyId);
      
      // Validate that we have a proper baby ID and this is the correct route
      // Special case: if someone accidentally navigated here with 'personal-info', redirect properly
      if (this.babyId === 'personal-info') {
        console.warn('Baby Detail Page - Detected personal-info route, redirecting to correct page');
        this.router.navigate(['/personal-info'], { replaceUrl: true });
        return;
      }
      
      if (!this.babyId || this.babyId === 'undefined' || this.babyId === 'null') {
        console.warn('Baby Detail Page - Invalid baby ID detected, redirecting to growth page:', this.babyId);
        this.router.navigate(['/tabs/growth'], { replaceUrl: true });
        return;
      }
      
      if (this.babyId) {
        this.activeBaby.set(this.babyId); // My Journey follows the last baby opened
        this.loadBabyData();
      }
    });
    
    // Try backend auth service first, fallback to legacy auth service
    const authService = this.backendAuthService.getCurrentUser() ? this.backendAuthService : this.authService;
    
    authService.currentUser$.subscribe(user => {
      console.log('Baby Detail Page - User loaded:', user);
      console.log('Baby Detail Page - Looking for baby ID:', this.babyId);
      
      this.user = user;
      if (user && this.babyId && this.babyId !== 'undefined' && this.babyId !== 'null') {
        if (user.babies && Array.isArray(user.babies)) {
          console.log('Baby Detail Page - Available babies:', user.babies.map(b => ({ id: b.id, name: b.name })));
          this.baby = user.babies.find(b => b.id === this.babyId) || null;
          
          if (this.baby) {
            console.log('Baby Detail Page - Found baby:', this.baby);
          } else {
            // Stale/mismatched baby id (e.g. pregnant mom with no matching baby).
            // Route straight to growth; its empty state carries the message.
            console.warn(`Baby with ID ${this.babyId} not found in user's babies list`);
            this.router.navigate(['/tabs/growth'], { replaceUrl: true });
          }
        } else {
          console.warn('Baby Detail Page - User has no babies array or it\'s not an array');
          this.router.navigate(['/tabs/growth'], { replaceUrl: true });
        }
      } else if (this.babyId && (this.babyId === 'undefined' || this.babyId === 'null')) {
        console.warn('Baby Detail Page - Invalid baby ID detected, redirecting immediately');
        this.router.navigate(['/tabs/growth'], { replaceUrl: true });
      } else {
        console.warn('Baby Detail Page - No user or baby ID');
      }
    });
    
    // Load options
    this.breastSideOptions = this.growthService.getBreastSideOptions();
    this.supplementOptions = this.growthService.getSupplementOptions();
    this.lipstickShapeOptions = this.growthService.getLipstickShapeOptions();
    this.motherMoodOptions = this.growthService.getMotherMoodOptions();
    this.stoolColorOptions = this.growthService.getStoolColorOptions();
    this.stoolTextureOptions = this.growthService.getStoolTextureOptions();
    this.stoolSizeOptions = this.growthService.getStoolSizeOptions();
  }

  private loadBabyData() {
    if (!this.babyId) {
      return;
    }
    // Guard against re-creating the observables on every route/user emission,
    // which is what caused the empty-state to flash before data loaded.
    if (this.loadedBabyId === this.babyId) {
      return;
    }
    this.loadedBabyId = this.babyId;

    // Check if user is using backend services
    const isBackendUser = this.backendAuthService.getCurrentUser();

    // The service owns caching (one reactive subject per record type); writes push
    // fresh data through the same stream, so no manual rebuild is needed after a save.
    if (isBackendUser) {
      this.growthRecords$ = this.backendGrowthService.getFeedRecords(this.babyId);
      this.weightRecords$ = this.backendGrowthService.getWeightRecords(this.babyId).pipe(
        tap(records => this.cacheLatestWeight(records))
      );
      this.stoolRecords$ = this.backendGrowthService.getStoolRecords(this.babyId);
      this.diaperChangeRecords$ = this.backendGrowthService.getDiaperChangeRecords(this.babyId);
      this.pumpingRecords$ = this.backendGrowthService.getPumpingRecords(this.babyId);
    } else {
      // Fallback to local services
      this.growthRecords$ = this.growthService.getGrowthRecords(this.babyId);
      this.weightRecords$ = this.growthService.getWeightRecords(this.babyId).pipe(
        tap(records => this.cacheLatestWeight(records))
      );
      this.stoolRecords$ = this.growthService.getStoolRecords(this.babyId);
      this.diaperChangeRecords$ = this.growthService.getDiaperChangeRecords(this.babyId);
      this.pumpingRecords$ = this.growthService.getPumpingRecords(this.babyId);
    }

    this.feedLog$ = this.growthRecords$.pipe(map(toFeedLog));
    this.diaperLog$ = this.diaperChangeRecords$.pipe(map(records => this.toDiaperLog(records)));
    this.weightLog$ = this.weightRecords$.pipe(map(records => this.toWeightLog(records)));
    // this.growthChart$ = this.weightRecords$.pipe(map(records => this.toGrowthChart(records)));
    this.growthData$ = this.weightRecords$.pipe(
      map(records => this.toGrowthData(records)),
      tap(d => { this.growthPts = d.pts; this.refreshGrowthChart(); })
    );
    // Stats use the loaded page (30 newest records), which covers today and the last 7 days in normal use
    this.feedOverview$ = this.growthRecords$.pipe(map(records => this.toFeedOverview(records)));
    this.diaperOverview$ = this.diaperChangeRecords$.pipe(map(records => this.toDiaperOverview(records)));
    if (isBackendUser) {
      this.hasMore = {
        feed: this.backendGrowthService.hasMore$('feed', this.babyId),
        diaper: this.backendGrowthService.hasMore$('diaper', this.babyId),
        weight: this.backendGrowthService.hasMore$('weight', this.babyId)
      };
    }
  }

  async loadOlder(type: HistoryType): Promise<void> {
    this.loadingOlder[type] = true;
    try {
      if (type === 'feed') await this.backendGrowthService.loadMoreFeeds(this.babyId);
      else if (type === 'diaper') await this.backendGrowthService.loadMoreDiapers(this.babyId);
      else await this.backendGrowthService.loadMoreWeights(this.babyId);
    } finally {
      this.loadingOlder[type] = false;
    }
  }

  private toDiaperLog(records: any[]): ActivityLog {
    const rows: ActivityRow[] = (records || []).map(r => {
      const time = r.record_time || r.time;
      const wetness = r.wetness_level || r.wetness || r.wetnessLevel;
      // Compact rows only show the value, so it carries type + wetness
      const type = this.getDiaperChangeType(r);
      return {
        icon: 'assets/Diaper change.svg', iconAlt: 'Diaper change',
        at: recordAt(r.record_date || r.date, time), time: time ? DateOnlyUtil.to12Hour(time) : undefined,
        value: wetness ? `${type} · ${wetness[0].toUpperCase()}${wetness.slice(1)}` : type
      };
    }).sort((a, b) => b.at.getTime() - a.at.getTime());
    return { rows, summary: rows.length ? `Last change ${timeAgo(rows[0].at, !!rows[0].time)} · ${rows[0].value}` : '' };
  }

  /** Per-day counts for the last 7 local days (today rightmost), one bar per series. */
  private toWeekBars(records: any[], dayOf: (r: any) => Date, series: WeekSeries[], noun: string): WeekChart {
    const now = new Date();
    const days = [6, 5, 4, 3, 2, 1, 0].map(i => new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    const keys = days.map(d => DateOnlyUtil.formatLocalDate(d));
    const sums = days.map(() => series.map(() => 0));
    let total = 0;
    for (const r of records || []) {
      const i = keys.indexOf(DateOnlyUtil.formatLocalDate(dayOf(r)));
      if (i < 0) continue;
      total++;
      series.forEach((s, j) => (sums[i][j] += s.count(r)));
    }
    const max = Math.max(1, ...sums.flat());
    const slot = (WEEK.right - WEEK.left) / 7, bw = series.length > 1 ? 12 : 20, gap = 3;
    const group = series.length * bw + (series.length - 1) * gap;
    const labels = days.map((d, i) => (i === 6 ? 'Today' : formatDate(d, 'EEE', 'en-US')));
    return {
      total,
      legend: series.map(s => ({ cls: s.cls, label: s.label })),
      days: days.map((_, i) => {
        const cx = WEEK.left + slot * (i + 0.5);
        const bars = series.map((s, j) => {
          const v = sums[i][j], h = v ? Math.max(3, (v / max) * (WEEK.bottom - WEEK.top)) : 2;
          return { x: +(cx - group / 2 + j * (bw + gap)).toFixed(1), y: +(WEEK.bottom - h).toFixed(1), w: bw, h: +h.toFixed(1), v, cls: v ? s.cls : 'zero' };
        });
        return { x: +cx.toFixed(1), label: labels[i], today: i === 6, bars };
      }),
      label: `${noun} per day, last 7 days: ${labels.map((l, i) => `${l} ${series.map((s, j) => `${sums[i][j]} ${s.label.toLowerCase()}`).join(', ')}`).join('; ')}.`
    };
  }

  private toFeedOverview(records: any[]): TrackerOverview {
    const list = (records || [])
      .filter(r => r.directFeedDetails || r.expressedMilkDetails?.quantity || r.formulaDetails?.quantity)
      .map(r => ({ r, t: feedTime(r), at: recordAt(r.recordDate || r.date, feedTime(r)) }))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    const week = this.toWeekBars(list, x => x.at, [{ cls: 'primary', label: 'Feeds', count: () => 1 }], 'Feeds');
    const today = list.filter(x => DateOnlyUtil.isSameLocalDay(x.at, new Date()));
    const ml = today.reduce((n, x) => n + (+x.r.expressedMilkDetails?.quantity || 0) + (+x.r.formulaDetails?.quantity || 0), 0);
    const min = today.reduce((n, x) => n + (+x.r.directFeedDetails?.duration || 0), 0);
    const todayCard = today.length
      ? { value: plural(today.length, 'feed'), sub: [ml && `${ml} mL`, min && `${min} min`].filter(Boolean).join(' · ') }
      : { value: 'No feeds today', sub: '', empty: true };
    const last = list[0];
    if (!last) return { updated: '', last: { value: 'No feeds yet', sub: '', empty: true }, today: todayCard, week };
    const side = list.find(x => x.r.directFeedDetails?.breastSide)?.r.directFeedDetails.breastSide;
    const date = formatDate(last.at, 'dd MMM yyyy', 'en-US');
    return { updated: date, last: { value: agoValue(last.at, !!last.t), sub: side ? `Last side: ${side}` : date }, today: todayCard, week };
  }

  private toDiaperOverview(records: any[]): TrackerOverview {
    const wet = (r: any) => (['pee', 'both'].includes(diaperType(r)) ? 1 : 0);
    const dirty = (r: any) => (['poop', 'both'].includes(diaperType(r)) ? 1 : 0);
    const list = (records || [])
      .map(r => ({ r, t: r.record_time || r.time, at: recordAt(r.record_date || r.date, r.record_time || r.time) }))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    const week = this.toWeekBars(list, x => x.at, [
      { cls: 'primary', label: 'Pee', count: x => wet(x.r) },
      { cls: 'lavender', label: 'Poop', count: x => dirty(x.r) }
    ], 'Diaper changes');
    const today = list.filter(x => DateOnlyUtil.isSameLocalDay(x.at, new Date()));
    const todayCard = today.length
      ? { value: plural(today.length, 'change'), sub: `${today.reduce((n, x) => n + wet(x.r), 0)} pee · ${today.reduce((n, x) => n + dirty(x.r), 0)} poop` }
      : { value: 'No changes today', sub: '', empty: true };
    const last = list[0];
    if (!last) return { updated: '', last: { value: 'No changes yet', sub: '', empty: true }, today: todayCard, week };
    const type = ({ pee: 'Pee', poop: 'Poop', both: 'Both' } as Record<string, string>)[diaperType(last.r)] || '--';
    const wetness: string = last.r.wetness_level || last.r.wetness || last.r.wetnessLevel || '';
    return {
      updated: formatDate(last.at, 'dd MMM yyyy', 'en-US'),
      last: { value: agoValue(last.at, !!last.t), sub: wetness ? `${type} · ${wetness[0].toUpperCase()}${wetness.slice(1)}` : type },
      today: todayCard, week
    };
  }

  private toWeightLog(records: any[]): ActivityLog {
    const rows: ActivityRow[] = (records || []).map(r => {
      // No time column on weight_records: save time orders same-day entries, newest first
      const saved = r.created_at ? new Date(r.created_at) : null;
      const time = saved && !isNaN(saved.getTime()) ? DateOnlyUtil.formatLocalTime(saved) : undefined;
      return {
        icon: 'assets/Weight.svg', iconAlt: 'Growth', at: recordAt(r.record_date || r.date, time),
        time: time ? DateOnlyUtil.to12Hour(time) : undefined, label: r.notes || undefined,
        value: [r.weight != null && `${r.weight} kg`, r.height && `${r.height} cm`].filter(Boolean).join(' · ')
      };
    });
    // Birth weight lives on the baby profile, not in weight_records.
    if (this.baby?.birthWeight && this.baby.dateOfBirth) {
      const bh = this.baby.birthHeight;
      rows.push({ icon: 'assets/Weight.svg', iconAlt: 'Birth', at: recordAt(this.baby.dateOfBirth), label: 'Birth record', value: `${this.baby.birthWeight} kg${bh ? ` · ${bh} cm` : ''}` });
    }
    rows.sort((a, b) => b.at.getTime() - a.at.getTime());
    return { rows, summary: rows.length ? `Latest ${rows[0].value}` : '' };
  }

  /* Previous SVG chart builder, replaced by the Highcharts growth history chart; kept for reuse
  // Weight + height line chart geometry; each series has its own y scale. Null when under 2 points.
  private toGrowthChart(records: any[]): GrowthChart | null {
    const pts = (records || []).map(r => ({ at: recordAt(r.record_date || r.date).getTime(), w: +r.weight || 0, h: +r.height || 0 }));
    const b = this.baby;
    if (b?.dateOfBirth && (b.birthWeight || b.birthHeight)) pts.push({ at: recordAt(b.dateOfBirth).getTime(), w: +b.birthWeight || 0, h: +b.birthHeight || 0 });
    const valid = pts.filter(p => !isNaN(p.at)).sort((a, c) => a.at - c.at);
    const ws = valid.filter(p => p.w), hs = valid.filter(p => p.h);
    if (ws.length < 2 && hs.length < 2) return null;
    const t0 = valid[0].at, span = valid[valid.length - 1].at - t0 || 1;
    const X = (at: number) => PLOT.left + ((at - t0) / span) * (PLOT.right - PLOT.left);
    const series = (list: typeof valid, key: 'w' | 'h', text: (v: number) => string): ChartSeries | undefined => {
      if (!list.length) return undefined;
      const vals = list.map(p => p[key]), lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12 || 1;
      const Y = (v: number) => PLOT.bottom - ((v - lo + pad) / (hi - lo + 2 * pad)) * (PLOT.bottom - PLOT.top);
      const xy = list.map(p => ({ x: +X(p.at).toFixed(1), y: +Y(p[key]).toFixed(1) }));
      const last = xy[xy.length - 1], label = text(vals[vals.length - 1]), w = label.length * 6.4 + 12;
      return { pts: xy, path: xy.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '), tag: { x: Math.min(last.x + 8, 318 - w), y: last.y, w, text: label } };
    };
    const weight = series(ws, 'w', v => `${kg(v)} kg`), height = series(hs, 'h', v => `${cm(v)} cm`);
    // Keep the two end tags from overlapping and inside the plot
    const clamp = (y: number) => Math.min(PLOT.bottom, Math.max(PLOT.top, y));
    if (weight) weight.tag.y = clamp(weight.tag.y);
    if (height) height.tag.y = clamp(height.tag.y);
    if (weight && height && Math.abs(weight.tag.y - height.tag.y) < 20) {
      const [top, bottom] = weight.tag.y <= height.tag.y ? [weight, height] : [height, weight];
      const mid = clamp((top.tag.y + bottom.tag.y) / 2);
      top.tag.y = Math.min(Math.max(PLOT.top, mid - 10), PLOT.bottom - 20);
      bottom.tag.y = top.tag.y + 20;
    }
    const fmt = span > 730 * 864e5 ? 'yyyy' : span > 300 * 864e5 ? 'MMM yy' : 'd MMM';
    const ticks = [0, 1, 2, 3].map(i => ({
      x: +(PLOT.left + (i / 3) * (PLOT.right - PLOT.left)).toFixed(1),
      label: formatDate(t0 + (i / 3) * span, fmt, 'en-US'),
      anchor: i === 0 ? 'start' : i === 3 ? 'end' : 'middle'
    }));
    const latest = [weight && `weight ${weight.tag.text}`, height && `height ${height.tag.text}`].filter(Boolean).join(', ');
    const range = `${formatDate(t0, 'd MMM y', 'en-US')} to ${formatDate(t0 + span, 'd MMM y', 'en-US')}`;
    return { weight, height, ticks, label: `Growth chart from ${range}. Latest ${latest}.` };
  }
  */

  goBack() {
    this.router.navigate(['/tabs/growth']);
  }

  onSubTabChange(event: any) {
    this.selectedSubTab = event.detail.value;
  }

  onEditClick() {
    // Check if this is the edit button in the header (for baby info) or tab-specific edit
    this.openBabyEditModal();
  }

  onAddRecordClick() {
    // Open appropriate modal based on current sub-tab
    switch (this.selectedSubTab) {
      case 'weight-size':
        this.openAddWeightModal();
        break;
      case 'feed-tracks':
        this.openAddRecordModal();
        break;
      case 'stool-tracks':
        this.openAddStoolModal();
        break;
      case 'diaper-change':
        this.openAddDiaperModal();
        break;
      // case 'pumping-tracks':
      //   this.openAddPumpingModal();
      //   break;
    }
  }

  // Modal controls
  openAddRecordModal() {
    this.openFeedLogModal();
  }

  async openAddWeightModal() {
    const modal = await this.modalController.create({
      component: WeightLogModalComponent,
      componentProps: {
        selectedBaby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        // Immediately update the baby's current weight in the UI
        // newWeight is undefined on height-only saves
        if (result.data.babyId && result.data.newWeight != null && this.baby?.id === result.data.babyId) {
          this.baby.currentWeight = result.data.newWeight;
        }
        
        // Also refresh baby data in the background
        this.loadBabyData();
      }
    });

    return await modal.present();
  }

  openAddStoolModal() {
    this.showAddStoolModal = true;
  }

  openAddDiaperModal() {
    this.openDiaperLogModal();
  }

  closeAddRecordModal() {
    this.showAddRecordModal = false;
    this.resetRecordForm();
  }

  closeAddWeightModal() {
    this.showAddWeightModal = false;
  }

  closeAddStoolModal() {
    this.showAddStoolModal = false;
    this.resetStoolForm();
  }

  closeAddDiaperModal() {
    this.showAddDiaperModal = false;
  }

  openAddPumpingModal() {
    this.showAddPumpingModal = true;
  }

  closeAddPumpingModal() {
    this.showAddPumpingModal = false;
  }

  async openBabyEditModal() {
    const modal = await this.modalController.create({
      component: BabyEditModalComponent,
      componentProps: {
        baby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.updated) {
        // Baby info was updated, reload user data will refresh the baby info
        this.loadBabyData();
        
        // If weight log was created, also reload weight records to show in the chart
        if (result.data?.weightLogCreated) {
          this.loadBabyData();
          // Show additional toast for weight log
          setTimeout(() => {
            this.showToast('Growth chart updated with new measurement', 'success');
          }, 1500);
        }
        
        this.showToast('Baby information updated successfully!', 'success');
      } else if (result.data?.deleted) {
        // Baby was deleted, redirect to growth page
        this.showToast('Baby information deleted successfully.', 'success');
        // Use replace to avoid back navigation issues
        this.router.navigate(['/tabs/growth'], { replaceUrl: true });
      }
    });

    return await modal.present();
  }

  private resetRecordForm() {
    this.selectedBreastSide = null;
    this.selectedSupplement = null;
    this.selectedLipstickShape = null;
    this.selectedMotherMood = null;
    this.painLevel = 0;
    this.clearVoiceInput();
    this.addRecordForm.reset({
      date: new Date().toISOString(),
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date().toTimeString().slice(0, 5),
      painLevel: 0
    });
  }


  private resetStoolForm() {
    this.selectedStoolColor = null;
    this.selectedStoolTexture = null;
    this.selectedStoolSize = null;
    this.clearVoiceInputStool();
    this.addStoolForm.reset({
      date: new Date().toISOString(),
      time: new Date().toTimeString().slice(0, 5)
    });
  }

  // Selection methods
  selectBreastSide(side: BreastSide) {
    this.selectedBreastSide = side;
  }

  selectSupplement(supplement: SupplementType) {
    this.selectedSupplement = supplement;
  }

  selectLipstickShape(shape: LipstickShape) {
    this.selectedLipstickShape = shape;
  }

  selectMotherMood(mood: MotherMood) {
    this.selectedMotherMood = mood;
  }

  setPainLevel(level: number | { lower: number; upper: number }) {
    const painValue = typeof level === 'number' ? level : level.lower || 0;
    this.painLevel = painValue;
    this.addRecordForm.patchValue({ painLevel: painValue });
  }

  selectStoolColor(color: StoolColor) {
    this.selectedStoolColor = color;
  }

  selectStoolTexture(texture: StoolTexture) {
    this.selectedStoolTexture = texture;
  }

  selectStoolSize(size: StoolSize) {
    this.selectedStoolSize = size;
  }

  // Save methods
  async saveGrowthRecord() {
    if (this.addRecordForm.valid && this.user && this.baby) {
      try {
        await this.openFeedLogModal();
      } catch (error) {
        this.showToast('Failed to save record. Please try again.', 'danger');
      }
    }
  }


  async saveStoolRecord() {
    if (this.addStoolForm.valid && this.user && this.baby && 
        this.selectedStoolColor && this.selectedStoolTexture && this.selectedStoolSize) {
      try {
        const formValue = this.addStoolForm.value;
        const record: Omit<StoolRecord, 'id' | 'createdAt'> = {
          babyId: this.baby.id,
          recordedBy: this.user.uid,
          date: new Date(formValue.date),
          time: formValue.time,
          color: this.selectedStoolColor,
          texture: this.selectedStoolTexture,
          size: this.selectedStoolSize,
          peeCount: formValue.peeCount ? parseInt(formValue.peeCount) : undefined,
          poopCount: formValue.poopCount ? parseInt(formValue.poopCount) : undefined,
          notes: formValue.notes,
          enteredViaVoice: !!this.voiceTranscriptStool
        };

        await this.growthService.addStoolRecord(record);
        this.showToast('Stool record saved successfully!', 'success');
        this.closeAddStoolModal();
      } catch (error) {
        this.showToast('Failed to save stool record. Please try again.', 'danger');
      }
    }
  }

  async openWeightChartModal(kind: GrowthKind = 'weight') {
    if (!this.baby) {
      this.showToast('Baby data not available', 'warning');
      return;
    }

    // If weightRecords$ is null, try to load the data first
    if (!this.weightRecords$) {
      this.loadBabyData();
      if (!this.weightRecords$) {
        this.showToast('Unable to load weight data', 'warning');
        return;
      }
    }

    try {
      // Read the current records once; an open subscription reopened the chart on every cache refresh
      const weightRecords = await firstValueFrom(this.weightRecords$);
      const modal = await this.modalController.create({
        component: WeightChartModalComponent,
        componentProps: {
          weightRecords: weightRecords || [],
          babyGender: this.baby!.gender,
          babyBirthDate: this.baby!.dateOfBirth,
          babyBirthWeight: this.baby!.birthWeight ?? null,
          babyBirthHeight: this.baby!.birthHeight ?? null,
          babyName: this.baby!.name,
          kind
        },
        cssClass: 'weight-chart-modal'
      });
      await modal.present();
    } catch (error) {
      console.error('Error opening weight chart modal:', error);
      this.showToast('Error loading weight chart', 'danger');
    }
  }

  async openFeedLogModal() {
    const modal = await this.modalController.create({
      component: FeedLogModalComponent,
      componentProps: {
        prefilledData: this.baby ? { babyId: this.baby.id } : undefined,
        isFastFeed: false,
        selectedBaby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadBabyData();
        this.loadBabyData();
      }
    });

    return await modal.present();
  }

  async openDiaperLogModal() {
    const modal = await this.modalController.create({
      component: DiaperLogModalComponent,
      componentProps: {
        selectedBaby: this.baby
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data?.saved) {
        this.loadBabyData();
      }
    });

    return await modal.present();
  }

  // Helper methods
  calculateBabyAge(): string {
    if (!this.baby || !this.baby.dateOfBirth) {
      console.warn('calculateBabyAge: No baby or dateOfBirth available');
      return 'Unknown';
    }
    
    try {
      return AgeCalculatorUtil.calculateBabyAge(this.baby.dateOfBirth);
    } catch (error) {
      console.error('Error calculating baby age:', error);
      return 'Calculation error';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatBirthDate(): string {
    if (!this.baby || !this.baby.dateOfBirth) {
      console.warn('formatBirthDate: No baby or dateOfBirth available');
      return 'Birth date unknown';
    }
    try {
      // recordAt keeps date-only DOBs on their local day (no UTC shift)
      return formatDate(recordAt(this.baby.dateOfBirth), 'dd MMM yyyy', 'en-US');
    } catch (error) {
      console.error('Error formatting birth date:', error);
      return 'Invalid date';
    }
  }

  latestRecord: any = null;
  latestWeightRecord: any = null;
  latestHeightRecord: any = null;
  latestHeight: number | null = null;
  prevWeightRecord: any = null;
  prevHeightRecord: any = null;

  private cacheLatestWeight(records: any[] | null): void {
    // Same order as the list: record day, then save time, newest first
    const key = (r: any) => [String(r.record_date || r.date || '').slice(0, 10), String(r.created_at || '')];
    const sorted = [...(records || [])].sort((a, b) => {
      const [da, ca] = key(a), [db, cb] = key(b);
      return db.localeCompare(da) || new Date(cb).getTime() - new Date(ca).getTime();
    });
    this.latestRecord = sorted[0] ?? null;
    this.latestWeightRecord = sorted.find(r => r.weight) ?? null;
    this.latestHeightRecord = sorted.find(r => r.height) ?? null;
    this.prevWeightRecord = sorted.filter(r => r.weight)[1] ?? null;
    this.prevHeightRecord = sorted.filter(r => r.height)[1] ?? null;
    this.latestHeight = this.latestHeightRecord?.height ?? null;
  }

  private formatRecordDate(r: any): string {
    const raw = r?.record_date || r?.date;
    if (!raw) { return ''; }
    const d = recordAt(raw);
    return isNaN(d.getTime()) ? '' : formatDate(d, 'dd MMM yyyy', 'en-US');
  }

  // Date of the most recent weight/height measurement, e.g. "22 Sep 2026".
  getLatestGrowthDate(): string { return this.formatRecordDate(this.latestRecord); }
  getLatestWeightDate(): string { return this.formatRecordDate(this.latestWeightRecord); }
  getLatestHeightDate(): string { return this.formatRecordDate(this.latestHeightRecord); }

  // "35.0 kg" -> { n: '35.0', u: 'kg' } so the unit can be styled smaller
  valueParts(v: string): { n: string; u: string } {
    const m = /^(.*?)\s*(kg|cm|ago|feeds?|changes?)$/.exec(v || ''); // small unit after the big number
    return m ? { n: m[1], u: m[2] } : { n: v || '--', u: '' };
  }

  // Compact card meta, e.g. { date: '23 Sep', pct: '50th', delta: '+0.3 kg' }
  growthStatMeta(kind: 'weight' | 'height'): { date: string; pct: string; delta: string; up: boolean } {
    const r = kind === 'weight' ? this.latestWeightRecord : this.latestHeightRecord;
    const prev = kind === 'weight' ? this.prevWeightRecord : this.prevHeightRecord;
    const raw = r?.record_date || r?.date;
    const at = raw ? recordAt(raw) : null;
    if (!at || isNaN(at.getTime())) { return { date: '', pct: '', delta: '', up: false }; }
    const date = formatDate(at, at.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM yyyy', 'en-US');
    const value = +r[kind];
    let pct = '';
    const b = this.baby, sex = b?.gender;
    if (b?.dateOfBirth && (sex === 'male' || sex === 'female')) {
      const dob = recordAt(b.dateOfBirth);
      const ageDays = Math.round((at.getTime() - dob.getTime()) / 86400000); // round absorbs DST hour shifts
      const p = ageDays >= 0 ? whoPercentile(kind, sex, ageDays, value) : null;
      pct = p == null ? '' : formatPercentile(p);
    }
    const diff = prev ? value - +prev[kind] : NaN;
    const unit = kind === 'weight' ? 'kg' : 'cm';
    const tiny = kind === 'weight' ? 0.05 : 0.5; // no "+0 cm since last" line
    const delta = isNaN(diff) || Math.abs(diff) < tiny ? '' : `${diff >= 0 ? '+' : '-'}${kind === 'weight' ? kg(Math.abs(diff)) : cm(Math.abs(diff))} ${unit}`;
    return { date, pct, delta, up: diff > 0 };
  }

  /** Baby age in fractional months today, null without a valid DOB. */
  private babyAgeMonths(): number | null {
    const dob = this.baby?.dateOfBirth ? recordAt(this.baby.dateOfBirth).getTime() : NaN;
    return isNaN(dob) ? null : (Date.now() - dob) / MONTH_MS;
  }

  // WHO standards cover 0-60 months and need a known sex
  get whoAvailable(): boolean {
    const age = this.babyAgeMonths(), sex = this.baby?.gender;
    return age != null && age <= 60 && (sex === 'male' || sex === 'female');
  }

  private toGrowthData(records: any[]): GrowthData {
    const num = (v: any) => (+v > 0 ? +v : null);
    const pts: GrowthPt[] = (records || []).map(r => ({ at: recordAt(r.record_date || r.date).getTime(), w: num(r.weight), h: num(r.height) }));
    const b = this.baby, age = this.babyAgeMonths();
    // Birth point squashes the axis for babies over 5 years, so it is skipped there
    if (b?.dateOfBirth && age != null && age <= 60 && (num(b.birthWeight) || num(b.birthHeight))) {
      pts.push({ at: recordAt(b.dateOfBirth).getTime(), w: num(b.birthWeight), h: num(b.birthHeight) });
    }
    const sorted = pts.filter(p => !isNaN(p.at)).sort((a, c) => a.at - c.at);
    const last8 = (key: 'w' | 'h') => sorted.filter(p => p[key] != null).slice(-8).map(p => p[key] as number);
    return { pts: sorted, spark: { weight: sparkline(last8('w')), height: sparkline(last8('h')) } };
  }

  setGrowthRange(r: GrowthRange): void {
    this.growthRange = r;
    this.refreshGrowthChart();
  }

  toggleWhoMedian(): void {
    this.showWhoMedian = !this.showWhoMedian;
    this.renderGrowthChart();
  }

  private refreshGrowthChart(): void {
    const months = RANGE_MONTHS[this.growthRange];
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setMonth(from.getMonth() - months);
    const pts = months ? this.growthPts.filter(p => p.at >= from.getTime()) : this.growthPts;
    const w = pts.filter(p => p.w != null).map(p => [p.at, p.w] as [number, number]);
    const h = pts.filter(p => p.h != null).map(p => [p.at, p.h] as [number, number]);
    if (!w.length && !h.length) {
      this.growthChartView = null;
    } else {
      const d = (t: number) => formatDate(t, 'd MMM y', 'en-US');
      const latest = [w.length && `weight ${kg(w[w.length - 1][1])} kg`, h.length && `height ${cm(h[h.length - 1][1])} cm`].filter(Boolean).join(', ');
      this.growthChartView = { w, h, label: `Growth chart from ${d(pts[0].at)} to ${d(pts[pts.length - 1].at)}. Latest ${latest}.` };
    }
    this.renderGrowthChart();
  }

  // Container appears/disappears with the range and sub-tab; render on attach, destroy on detach
  @ViewChild('growthHc') set growthHc(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement;
    if (el === this.hcEl) return;
    this.destroyGrowthChart();
    this.hcEl = el;
    if (!el) return;
    this.zone.runOutsideAngular(() => {
      this.hcResize = new ResizeObserver(() => this.hc?.reflow());
      this.hcResize.observe(el);
    });
    this.renderGrowthChart();
  }

  /** WHO median sampled across [x0, x1], clipped to 0-60 months from DOB. */
  private whoMedian(kind: GrowthKind, x0: number, x1: number): [number, number][] {
    const sex = this.baby?.gender as 'male' | 'female';
    const dob = recordAt(this.baby!.dateOfBirth).getTime();
    const lo = Math.max(x0, dob), hi = Math.min(x1, dob + 60 * MONTH_MS);
    if (hi <= lo) return [];
    const grid = whoCurve(kind, sex, 50, 60, 0.25);
    const at = (t: number) => {
      const m = (t - dob) / MONTH_MS / 0.25, i = Math.min(Math.floor(m), grid.length - 2), f = m - i;
      return +(grid[i].value + (grid[i + 1].value - grid[i].value) * f).toFixed(2);
    };
    return Array.from({ length: 25 }, (_, i) => { const t = lo + ((hi - lo) * i) / 24; return [t, at(t)] as [number, number]; });
  }

  private renderGrowthChart(): void {
    this.hc?.destroy();
    this.hc = undefined;
    const el = this.hcEl, v = this.growthChartView;
    if (!el || !v) return;
    const xs = [...v.w, ...v.h].map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const muted = '#5f5890';
    const fill = (rgb: string): Highcharts.GradientColorObject => ({
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [[0, `rgba(${rgb},0.22)`], [1, `rgba(${rgb},0)`]]
    });
    // Only the newest point carries a value pill; weight sits above its point, height below
    const withTag = (data: [number, number][], text: string, bg: string, border: string, ink: string, dy: number) =>
      data.map((p, i): Highcharts.PointOptionsObject => i < data.length - 1 ? { x: p[0], y: p[1] } : {
        x: p[0], y: p[1],
        dataLabels: {
          enabled: true, format: text, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 9,
          padding: 4, y: dy, crop: false, overflow: 'justify', allowOverlap: true,
          style: { color: ink, fontSize: '11px', fontWeight: '700', textOutline: 'none' }
        }
      });
    const series: Highcharts.SeriesOptionsType[] = [];
    if (v.w.length) {
      series.push({ type: 'area', name: 'Weight', yAxis: 0, color: WEIGHT_COLOR, fillColor: fill('224,103,154'), tooltip: { valueSuffix: ' kg' },
        data: withTag(v.w, `${kg(v.w[v.w.length - 1][1])} kg`, '#fdf0f5', WEIGHT_COLOR, '#a3285f', -10) });
    }
    if (v.h.length) {
      series.push({ type: 'area', name: 'Height', yAxis: 1, color: HEIGHT_COLOR, fillColor: fill('100,100,211'), tooltip: { valueSuffix: ' cm' },
        data: withTag(v.h, `${cm(v.h[v.h.length - 1][1])} cm`, '#f4f2fe', HEIGHT_COLOR, '#4f4598', 28) });
    }
    if (this.showWhoMedian && this.whoAvailable) {
      const who = (kind: GrowthKind, yAxis: number, color: string): Highcharts.SeriesOptionsType => ({
        type: 'line', name: `WHO 50th ${kind}`, yAxis, color, dashStyle: 'ShortDash', lineWidth: 1.5,
        marker: { enabled: false }, enableMouseTracking: false, data: this.whoMedian(kind, x0, x1)
      });
      if (v.w.length) series.push(who('weight', 0, WEIGHT_COLOR));
      if (v.h.length) series.push(who('height', 1, HEIGHT_COLOR));
    }
    const axisLabels = { style: { color: muted, fontSize: '11px' } };
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.zone.runOutsideAngular(() => {
      this.hc = Highcharts.chart(el, {
        chart: { height: 220, spacing: [16, 4, 8, 6], backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { enabled: false },
        accessibility: { enabled: false }, // container carries role="img" + summary; records list is the table view
        xAxis: {
          type: 'datetime', minRange: 7 * DAY_MS, tickLength: 0, lineColor: '#e6e3f6',
          crosshair: { color: '#d9d4f5' },
          labels: { ...axisLabels, format: x1 - x0 > 730 * DAY_MS ? '{value:%Y}' : '{value:%e %b}' }
        },
        yAxis: [
          { title: { text: null }, gridLineColor: '#eeecf8', tickAmount: 4, showEmpty: false, labels: { ...axisLabels, format: '{value} kg' } },
          { title: { text: null }, opposite: true, gridLineWidth: 0, tickAmount: 4, showEmpty: false, labels: { ...axisLabels, format: '{value} cm' } }
        ],
        tooltip: { shared: true, xDateFormat: '%e %b %Y', borderRadius: 10, borderColor: '#ece9fb', backgroundColor: '#ffffff', style: { color: '#2d3748', fontSize: '12px' } },
        plotOptions: {
          series: { animation: !still, marker: { enabled: true, symbol: 'circle', radius: 4, lineWidth: 2, lineColor: '#ffffff' }, states: { hover: { lineWidthPlus: 0 } } },
          area: { threshold: null, lineWidth: 2 }
        },
        series
      });
    });
  }

  private destroyGrowthChart(): void {
    this.hcResize?.disconnect();
    this.hcResize = undefined;
    this.hc?.destroy();
    this.hc = undefined;
    this.hcEl = undefined;
  }

  ngOnDestroy(): void {
    this.destroyGrowthChart();
  }

  getCurrentWeight(): string {
    if (!this.baby) {
      console.warn('getCurrentWeight: No baby available');
      return '--';
    }
    const weight = this.latestWeightRecord?.weight || this.baby.currentWeight || this.baby.birthWeight;
    return weight ? `${kg(weight)} kg` : '--';
  }

  getCurrentHeight(): string {
    if (!this.baby) {
      console.warn('getCurrentHeight: No baby available');
      return '--';
    }
    const height = this.latestHeight || this.baby.currentHeight || this.baby.birthHeight;
    return height ? `${cm(height)} cm` : '--';
  }

  getRecordTime(record: any): string {
    // Prefer the direct feed start time, then any method's start time.
    const startTime = record.directFeedDetails?.startTime || record.direct_start_time
      || record.expressedMilkDetails?.startTime || record.expressed_start_time
      || record.formulaDetails?.startTime || record.formula_start_time;
    return DateOnlyUtil.to12Hour(startTime);
  }

  getRecordDate(record: any): string {
    // Handle both transformed API data and local data
    const date = record.date || record.record_date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getStoolTime(record: StoolRecord): string {
    return DateOnlyUtil.to12Hour(record.time);
  }

  getStoolDate(record: StoolRecord): string {
    return this.formatDate(record.date);
  }

  getDiaperChangeTime(record: any): string {
    return DateOnlyUtil.to12Hour(record.record_time || record.time);
  }

  getDiaperChangeDate(record: any): string {
    // Handle both API format (record_date) and local format (date)
    const date = record.record_date || record.date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getDiaperChangeType(record: any): string {
    // Handle both API format (change_type) and local format (type)
    const type = record.change_type || record.type || record.changeType;
    switch (type) {
      case 'pee': return 'Pee';
      case 'poop': return 'Poop';
      case 'both': return 'Pee & Poop';
      default: return '--';
    }
  }

  getChangeTypeEmoji(type: any): string {
    switch (type) {
      case 'pee': return '💦';
      case 'poop': return '💩';
      case 'both': return '💦💩';
      default: return '💧';
    }
  }

  getDiaperChangeRecordedBy(record: any): string {
    // For API records, combine first_name and last_name
    if (record.first_name || record.last_name) {
      return `${record.first_name || ''} ${record.last_name || ''}`.trim();
    }
    
    // For local records, use recordedBy if available
    return record.recordedBy || 'Unknown';
  }

  getFeedRecordedBy(record: any): string {
    // For API records, combine firstName and lastName
    if (record.firstName || record.lastName) {
      return `${record.firstName || ''} ${record.lastName || ''}`.trim();
    }
    
    // For local records, use recordedBy if available
    return record.recordedBy || 'Unknown';
  }

  getFeedTypes(record: any): string[] {
    // Handle transformed API data
    if (record.feedTypes && Array.isArray(record.feedTypes)) {
      return record.feedTypes;
    }
    
    // Handle raw API data or local data
    const types: string[] = [];
    if (record.direct_start_time || record.directFeedDetails?.startTime) {
      types.push('direct');
    }
    if (record.expressed_quantity || record.expressedMilkDetails?.quantity) {
      types.push('expressed');
    }
    if (record.formula_quantity || record.formulaDetails?.quantity) {
      types.push('formula');
    }
    
    return types;
  }

  getFeedDuration(record: any): number | null {
    // Handle transformed API data
    if (record.directFeedDetails?.duration) {
      return record.directFeedDetails.duration;
    }
    
    // Handle raw API data
    if (record.direct_duration) {
      return record.direct_duration;
    }
    
    return null;
  }

  getFeedPainLevel(record: any): number | null {
    // Handle transformed API data
    if (record.directFeedDetails?.painLevel !== undefined) {
      return record.directFeedDetails.painLevel;
    }
    
    // Handle raw API data
    if (record.direct_pain_level !== undefined) {
      return record.direct_pain_level;
    }
    
    return null;
  }

  getExpressedVolume(record: any): number | null {
    // Handle transformed API data
    if (record.expressedMilkDetails?.quantity !== undefined) {
      return record.expressedMilkDetails.quantity;
    }

    // Handle raw API data
    if (record.expressed_milk_quantity !== undefined) {
      return record.expressed_milk_quantity;
    }

    return null;
  }

  getFormulaVolume(record: any): number | null {
    // Handle transformed API data
    if (record.formulaDetails?.quantity !== undefined) {
      return record.formulaDetails.quantity;
    }

    // Handle raw API data
    if (record.formula_quantity !== undefined) {
      return record.formula_quantity;
    }

    return null;
  }

  getBreastSide(record: any): string | null {
    // Handle transformed API data
    if (record.directFeedDetails?.breastSide) {
      return record.directFeedDetails.breastSide;
    }
    
    // Handle raw API data
    if (record.direct_breast_side) {
      return record.direct_breast_side;
    }
    
    return null;
  }

  // Pumping helper methods
  getPumpingTime(record: any): string {
    // Handle both API format (record_time) and local format (time)
    const time = record.record_time || record.time;
    if (!time) return '--';
    
    // If time is in HH:MM:SS format, convert to HH:MM
    if (typeof time === 'string' && time.includes(':')) {
      return time.slice(0, 5); // Takes HH:MM from HH:MM:SS
    }
    
    return time;
  }

  getPumpingDate(record: any): string {
    // Handle both API format (record_date) and local format (date)
    const date = record.record_date || record.date;
    return date ? this.formatDate(new Date(date)) : '--';
  }

  getPumpingSide(record: any): string {
    // Handle both API format (pumping_side) and local format (pumpingSide)
    return record.pumping_side || record.pumpingSide || '--';
  }

  getPumpingOutput(record: any): number {
    // Handle both API format (total_output) and local format (totalOutput)
    return record.total_output || record.totalOutput || 0;
  }

  getPumpingDuration(record: any): number {
    // Handle both API format (duration_minutes) and local format (duration)
    return record.duration_minutes || record.duration || 0;
  }

  // Voice input methods
  private initializeSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        if (this.isProcessingVoice) {
          this.isRecording = true;
        } else if (this.isProcessingVoiceStool) {
          this.isRecordingStool = true;
        }
      };
      
      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          if (this.isProcessingVoice) {
            this.voiceTranscript = finalTranscript.trim();
            this.processSmartVoiceInput(finalTranscript.trim());
          } else if (this.isProcessingVoiceStool) {
            this.processSmartVoiceInputStool(finalTranscript.trim());
          }
        }
        this.isRecording = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
        this.isRecordingStool = false;
      };
      
      this.recognition.onend = () => {
        this.isRecording = false;
        this.isRecordingStool = false;
      };
    }
  }

  startSmartVoiceInput() {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.voiceTranscript = '';
    this.extractedData = {};
    this.isProcessingVoice = true;
    this.recognition.start();
  }


  startSmartVoiceInputStool() {
    if (!this.recognition) {
      this.showToast('Speech recognition not supported in this browser', 'warning');
      return;
    }

    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
    this.isProcessingVoiceStool = true;
    this.isRecordingStool = true;
    this.recognition.start();
  }

  private async processSmartVoiceInput(transcript: string) {
    this.isProcessingVoice = true;
    
    try {
      const extracted = this.extractDataFromSpeech(transcript);
      this.extractedData = extracted;
      this.autoFillFormFields(extracted);
      
      const extractedFields = Object.keys(extracted).filter(key => extracted[key] !== null && extracted[key] !== undefined);
      if (extractedFields.length > 0) {
        this.showToast(`Auto-filled ${extractedFields.length} field(s) from voice input`, 'success');
      } else {
        this.showToast('Voice recorded. Please review and fill remaining fields manually.', 'warning');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      this.showToast('Voice input processed. Please review and fill fields manually.', 'warning');
    } finally {
      this.isProcessingVoice = false;
    }
  }


  private async processSmartVoiceInputStool(transcript: string) {
    this.isProcessingVoiceStool = true;
    this.isRecordingStool = false;
    
    try {
      const extracted = this.extractStoolDataFromSpeech(transcript);
      this.extractedDataStool = extracted;
      this.voiceTranscriptStool = transcript;
      this.autoFillStoolFormFields(extracted);
      
      const extractedFields = Object.keys(extracted).filter(key => extracted[key] !== null && extracted[key] !== undefined);
      if (extractedFields.length > 0) {
        this.showToast(`Auto-filled ${extractedFields.length} field(s) from voice input`, 'success');
      } else {
        this.showToast('Voice recorded. Please review and fill remaining fields manually.', 'warning');
      }
    } catch (error) {
      console.error('Error processing stool voice input:', error);
      this.showToast('Voice input processed. Please review and fill fields manually.', 'warning');
    } finally {
      this.isProcessingVoiceStool = false;
    }
  }

  private extractDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract feeding sessions
    const feedingPatterns = [
      /(?:fed|feed|feeding|nursed|nursing|breastfed|breastfeeding).*?(\d+).*?(?:times|sessions?|feeds?)/i,
      /(\d+).*?(?:feeding|nursing|breastfeeding).*?(?:sessions?|times|feeds?)/i,
      /(?:had|did|completed).*?(\d+).*?(?:feeds?|nursing|feeding)/i
    ];
    
    for (const pattern of feedingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const sessions = parseInt(match[1]);
        if (sessions >= 1 && sessions <= 20) {
          extracted.directFeedingSessions = sessions;
          break;
        }
      }
    }
    
    // Extract mood
    const moodKeywords = {
      'relaxed': ['relaxed', 'calm', 'peaceful', 'serene'],
      'happy': ['happy', 'good', 'well', 'fine', 'positive'],
      'sad': ['sad', 'down', 'low', 'upset'],
      'exhausted': ['exhausted', 'tired', 'worn out', 'drained'],
      'anxious': ['anxious', 'worried', 'nervous', 'stressed']
    };
    
    for (const [moodValue, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const mood = this.motherMoodOptions.find(m => m.value === moodValue);
        if (mood) {
          extracted.mood = mood;
          break;
        }
      }
    }
    
    return extracted;
  }


  private extractStoolDataFromSpeech(transcript: string): any {
    const text = transcript.toLowerCase().trim();
    const extracted: any = {};
    
    // Extract color
    const colorKeywords = {
      'very-dark': ['very dark', 'black', 'very black'],
      'dark-green': ['dark green', 'green', 'greenish'],
      'dark-brown': ['dark brown', 'brown', 'brownish'],
      'mustard-yellow': ['mustard', 'yellow', 'mustard yellow', 'yellowish']
    };
    
    for (const [colorValue, keywords] of Object.entries(colorKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const color = this.stoolColorOptions.find(c => c.value === colorValue);
        if (color) {
          extracted.color = color;
          break;
        }
      }
    }
    
    // Extract texture
    const textureKeywords = {
      'liquid': ['liquid', 'watery', 'runny'],
      'pasty': ['pasty', 'soft', 'mushy'],
      'hard': ['hard', 'firm', 'solid']
    };
    
    for (const [textureValue, keywords] of Object.entries(textureKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        const texture = this.stoolTextureOptions.find(t => t.value === textureValue);
        if (texture) {
          extracted.texture = texture;
          break;
        }
      }
    }
    
    return extracted;
  }

  private autoFillFormFields(extractedData: any) {
    const formUpdates: any = {};
    
    if (extractedData.directFeedingSessions !== undefined) {
      formUpdates.directFeedingSessions = extractedData.directFeedingSessions;
    }
    
    if (extractedData.notes !== undefined) {
      formUpdates.notes = extractedData.notes;
    }
    
    if (Object.keys(formUpdates).length > 0) {
      this.addRecordForm.patchValue(formUpdates);
    }
    
    if (extractedData.mood) {
      this.selectedMotherMood = extractedData.mood;
    }
  }


  private autoFillStoolFormFields(extractedData: any) {
    if (extractedData.color) {
      this.selectedStoolColor = extractedData.color;
    }
    
    if (extractedData.texture) {
      this.selectedStoolTexture = extractedData.texture;
    }
  }

  clearVoiceInput() {
    this.voiceTranscript = '';
    this.extractedData = {};
  }


  clearVoiceInputStool() {
    this.voiceTranscriptStool = '';
    this.extractedDataStool = {};
  }

  getVoiceInputSummary(): string {
    const extractedFields = Object.keys(this.extractedData).filter(key => 
      this.extractedData[key] !== null && this.extractedData[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }


  getVoiceInputSummaryStool(): string {
    const extractedFields = Object.keys(this.extractedDataStool).filter(key => 
      this.extractedDataStool[key] !== null && this.extractedDataStool[key] !== undefined
    );
    
    if (extractedFields.length === 0) {
      return 'No data extracted from voice input';
    }
    
    return `Auto-filled ${extractedFields.length} field(s): ${extractedFields.join(', ')}`;
  }

  isVoiceSupported(): boolean {
    return !!this.recognition;
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  getErrorMessage(field: string): string {
    const control = this.addRecordForm.get(field) || this.addStoolForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return 'Value is too low';
    }
    if (control?.hasError('max')) {
      return 'Value is too high';
    }
    return '';
  }
}