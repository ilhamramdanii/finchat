import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReportService } from '../../core/services/report.service';
import { NotificationStore } from '../../store/notification.store';
import { I18nService } from '../../core/services/i18n.service';
import { MonthlyReport, YearlyReport, RangeReport, DailyTotal } from '@wa-finance/shared';
import { DateRangePickerComponent, DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';

type FilterMode = 'month' | 'year' | 'custom';
type AnyReport  = MonthlyReport | YearlyReport | RangeReport;

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, ReactiveFormsModule,
    MatProgressBarModule, DateRangePickerComponent,
  ],
  template: `
<div class="page page-fade">

  @if (loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ APPLE LARGE TITLE HEADER ══ -->
  <div class="page-hdr">
    <div>
      <div class="hdr-eyebrow num">{{ i18n.t().reportTitle | uppercase }} • {{ reportLabel() }}</div>
      <h1 class="page-title font-display">{{ i18n.t().reportTitle }}</h1>
    </div>
    <div class="hdr-actions">
      <!-- Mode Segmented Control -->
      <div class="segmented-control">
        <button type="button" class="segmented-item" [class.active]="filterMode()==='month'" (click)="setMode('month')">
          {{ i18n.t().monthly }}
        </button>
        <button type="button" class="segmented-item" [class.active]="filterMode()==='year'" (click)="setMode('year')">
          {{ i18n.t().yearly }}
        </button>
        <button type="button" class="segmented-item" [class.active]="filterMode()==='custom'" (click)="setMode('custom')">
          {{ i18n.t().custom }}
        </button>
      </div>

      <!-- Month Selector (When in 'month' mode) -->
      @if (filterMode() === 'month') {
        <div class="sel-wrap apple-card">
          <i class="bi bi-calendar3 sel-ico"></i>
          <span>{{ reportLabel() }}</span>
          <i class="bi bi-chevron-down sel-caret"></i>
          <select class="overlay-select" [value]="selMonthKey()" (change)="onMonthSelect($event)">
            @for (opt of monthOptions(); track opt.key) {
              <option [value]="opt.key">{{ opt.label }}</option>
            }
          </select>
        </div>
      }

      <!-- Year Selector (When in 'year' mode) -->
      @if (filterMode() === 'year') {
        <div class="sel-wrap apple-card">
          <i class="bi bi-calendar-event sel-ico"></i>
          <span>{{ selYear() }}</span>
          <i class="bi bi-chevron-down sel-caret"></i>
          <select class="overlay-select" [value]="selYear()" (change)="onYearSelect($event)">
            @for (y of yearOptions; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </div>
      }

      <!-- Custom Date Range Picker (When in 'custom' mode) -->
      @if (filterMode() === 'custom') {
        <app-date-range-picker
          [startDate]="rangeStart()"
          [endDate]="rangeEnd()"
          (rangeChange)="onRangeChange($event)"
          (cleared)="clearDateRange()" />
      }

      @if (report() && !loading()) {
        <button class="btn-action-icon tap-target-44 apple-card" (click)="printPage()" [title]="i18n.t().print">
          <i class="bi bi-printer"></i>
        </button>
        <button class="btn-action-icon tap-target-44 apple-card" (click)="exportDailyCSV()" [title]="i18n.t().exportCsv">
          <i class="bi bi-download"></i>
        </button>
      }
    </div>
  </div>

  <!-- ══ APPLE SUMMARY CARDS (MATCHING OVERVIEW) ══ -->
  @if (report(); as r) {
    <div class="metrics-strip">
      <div class="metric-card apple-card">
        <div class="mc-hdr"><i class="bi bi-arrow-down-left-circle-fill green-txt"></i> {{ i18n.t().totalIncome }}</div>
        <div class="mc-val green-txt num">{{ r.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
      </div>
      <div class="metric-card apple-card">
        <div class="mc-hdr"><i class="bi bi-arrow-up-right-circle-fill red-txt"></i> {{ i18n.t().totalExpense }}</div>
        <div class="mc-val red-txt num">{{ r.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
      </div>
      <div class="metric-card apple-card full-mobile">
        <div class="mc-hdr"><i class="bi bi-wallet2 cobalt-color"></i> {{ i18n.t().netCashflow }}</div>
        <div class="mc-val num" [class.green-txt]="r.balance >= 0" [class.red-txt]="r.balance < 0">
          {{ r.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
        </div>
      </div>
    </div>
  }

  <!-- ══ REPORT MAIN PANELS ══ -->
  <div class="report-grid">

    <!-- Categories Breakdown Panel -->
    <div class="panel apple-card">
      <div class="panel-hdr">
        <h3 class="panel-title font-display">{{ i18n.t().categoryBreakdown }}</h3>
      </div>

      @if (loading()) {
        <div class="skeleton-list">
          <span class="skeleton" style="width:100%; height:40px; margin-bottom:8px;"></span>
          <span class="skeleton" style="width:100%; height:40px; margin-bottom:8px;"></span>
          <span class="skeleton" style="width:100%; height:40px;"></span>
        </div>
      } @else if (report()?.byCategory?.length) {
        <div class="cat-breakdown-list">
          @for (cat of report()!.byCategory; track cat.categoryId) {
            <div class="cat-item">
              <div class="cat-item-top">
                <span class="cat-badge-dot" [style.background-color]="cat.categoryColor || '#007AFF'"></span>
                <span class="cat-name">{{ cat.categoryName }}</span>
                <span class="cat-amt num" [class.green-txt]="cat.type==='INCOME'" [class.red-txt]="cat.type==='EXPENSE'">
                  {{ cat.total | currency:'IDR':'symbol':'1.0-0':'id' }}
                </span>
              </div>
              <div class="cat-bar-bg">
                <div class="cat-bar-fill" [style.width.%]="cat.percentage" [style.background-color]="cat.categoryColor || 'var(--cobalt)'"></div>
              </div>
              <span class="cat-pct num">{{ cat.percentage }}%</span>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <i class="bi bi-inbox"></i>
          <p>{{ i18n.t().noCategoryData }}</p>
        </div>
      }
    </div>

    <!-- Analytics & Daily Averages -->
    <div class="panel apple-card">
      <div class="panel-hdr">
        <h3 class="panel-title font-display">{{ i18n.t().tabAnalytics }}</h3>
      </div>

      <div class="analytics-stack">
        <div class="stat-row">
          <span class="sr-label">{{ i18n.t().savingsRate }}</span>
          <span class="sr-val num" [class.green-txt]="savingsRate()>=0">{{ savingsDisplayRate() }}</span>
        </div>
        <div class="stat-row">
          <span class="sr-label">{{ i18n.t().dailyAvg }}</span>
          <span class="sr-val num">{{ dailyAvgExpense() | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
        </div>
        <div class="stat-row">
          <span class="sr-label">{{ i18n.t().highestExpense }}</span>
          <span class="sr-val num red-txt">{{ peakExpense() | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
        </div>
      </div>
    </div>

  </div>

</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; padding: 20px; max-width: 1180px; margin: 0 auto; width: 100%; }

    /* ── Apple Large Title Header ── */
    .page-hdr { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .hdr-eyebrow { font-size: 0.68rem; font-weight: 700; color: var(--cobalt); letter-spacing: 0.05em; }
    .page-title { font-size: 1.8rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; margin-top: 2px; }

    .hdr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .sel-wrap {
      position: relative; display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 9px; background: var(--surface);
      border: 1px solid var(--border); font-size: 0.82rem; font-weight: 600; color: var(--text);
    }
    .sel-ico { color: var(--cobalt); }
    .sel-caret { font-size: 0.75rem; color: var(--subtle); }
    .overlay-select {
      position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }

    .btn-action-icon {
      width: 36px; height: 36px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
      background: var(--surface); color: var(--text); border: 1px solid var(--border); font-size: 0.95rem; cursor: pointer;
      transition: all 0.14s ease;
      &:hover { background: var(--surface-2); color: var(--cobalt); }
    }

    /* Metrics Strip */
    .metrics-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .metric-card { padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; }
    .mc-hdr { font-size: 0.76rem; font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .mc-val { font-size: 1.25rem; font-weight: 800; }
    .green-txt { color: var(--green) !important; }
    .red-txt { color: var(--red) !important; }
    .cobalt-color { color: var(--cobalt) !important; }

    /* Report Grid */
    .report-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; align-items: start; }
    .panel { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .panel-hdr { display: flex; justify-content: space-between; align-items: center; }
    .panel-title { font-size: 1rem; font-weight: 700; color: var(--text); }

    /* Category breakdown list */
    .cat-breakdown-list { display: flex; flex-direction: column; gap: 12px; }
    .cat-item { display: flex; flex-direction: column; gap: 4px; }
    .cat-item-top { display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 600; }
    .cat-badge-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .cat-name { color: var(--text); flex: 1; }
    .cat-amt { font-weight: 700; }
    .cat-bar-bg { height: 6px; width: 100%; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
    .cat-bar-fill { height: 100%; border-radius: 99px; }
    .cat-pct { font-size: 0.72rem; color: var(--subtle); text-align: right; }

    /* Analytics Stack */
    .analytics-stack { display: flex; flex-direction: column; gap: 12px; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border); &:last-child { border: none; padding: 0; } }
    .sr-label { font-size: 0.84rem; color: var(--muted); font-weight: 600; }
    .sr-val { font-size: 0.95rem; font-weight: 800; color: var(--text); }

    .empty-state { text-align: center; color: var(--subtle); padding: 30px 10px; font-size: 0.85rem; }

    @media (max-width: 900px) {
      .report-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .page { padding: 12px; gap: 12px; }
      .page-title { font-size: 1.35rem; }
      .metrics-strip { grid-template-columns: 1fr 1fr; }
      .metric-card.full-mobile { grid-column: span 2; }
    }
  `]
})
export class ReportsComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly reportService = inject(ReportService);
  private readonly notifStore = inject(NotificationStore);

  readonly loading = signal(false);
  readonly report = signal<AnyReport | null>(null);
  readonly filterMode = signal<FilterMode>('month');
  
  readonly selMonth = signal(new Date().getMonth() + 1);
  readonly selYear = signal(new Date().getFullYear());
  readonly selMonthKey = signal(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  readonly rangeStart = signal<string>('');
  readonly rangeEnd = signal<string>('');

  readonly yearOptions = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ];

  readonly monthOptions = computed(() => {
    const now = new Date();
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(this.i18n.currentLang() === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
      opts.push({ key, label });
    }
    return opts;
  });

  readonly reportLabel = computed(() => {
    const m = this.filterMode();
    if (m === 'month') {
      const opt = this.monthOptions().find(o => o.key === this.selMonthKey());
      return opt ? opt.label : (this.i18n.currentLang() === 'id' ? 'Bulan Ini' : 'This Month');
    }
    if (m === 'year') return String(this.selYear());
    if (m === 'custom') {
      if (this.rangeStart() && this.rangeEnd()) {
        return `${this.rangeStart()} - ${this.rangeEnd()}`;
      }
      return this.i18n.t().custom;
    }
    return '';
  });

  readonly savingsRate = computed(() => {
    const r = this.report();
    if (!r || !r.totalIncome || r.totalIncome <= 0) return 0;
    return Math.round(((r.totalIncome - r.totalExpense) / r.totalIncome) * 100);
  });

  readonly savingsDisplayRate = computed(() => `${this.savingsRate()}%`);

  readonly dailyAvgExpense = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return Math.round(r.totalExpense / 30);
  });

  readonly peakExpense = computed(() => {
    const r = this.report();
    if (!r || !r.byCategory?.length) return 0;
    return Math.max(...r.byCategory.filter(c => c.type === 'EXPENSE').map(c => c.total), 0);
  });

  ngOnInit() {
    this.load();
  }

  setMode(m: FilterMode) {
    this.filterMode.set(m);
    this.load();
  }

  onMonthSelect(event: Event) {
    const key = (event.target as HTMLSelectElement).value;
    this.selMonthKey.set(key);
    const [y, m] = key.split('-').map(Number);
    this.selYear.set(y);
    this.selMonth.set(m);
    this.load();
  }

  onYearSelect(event: Event) {
    const y = Number((event.target as HTMLSelectElement).value);
    this.selYear.set(y);
    this.load();
  }

  onRangeChange(range: DateRange) {
    this.rangeStart.set(range.start);
    this.rangeEnd.set(range.end);
    if (range.start && range.end) {
      this.load();
    }
  }

  clearDateRange() {
    this.rangeStart.set('');
    this.rangeEnd.set('');
    this.report.set(null);
  }

  load() {
    this.loading.set(true);
    const m = this.filterMode();
    if (m === 'month') {
      this.reportService.getMonthly(this.selMonth(), this.selYear()).subscribe({
        next: (res) => { this.report.set(res); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (m === 'year') {
      this.reportService.getYearly(this.selYear()).subscribe({
        next: (res) => { this.report.set(res); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (m === 'custom' && this.rangeStart() && this.rangeEnd()) {
      this.reportService.getByRange(this.rangeStart(), this.rangeEnd()).subscribe({
        next: (res: AnyReport) => { this.report.set(res); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  printPage() {
    window.print();
  }

  exportDailyCSV() {
    const r = this.report();
    if (!r) return;
    let csv = 'Kategori,Tipe,Total,Persentase\n';
    for (const c of r.byCategory) {
      csv += `"${c.categoryName}","${c.type}",${c.total},"${c.percentage}%"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report-${this.reportLabel()}.csv`;
    a.click();
  }
}
