import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TransactionService } from '../../core/services/transaction.service';
import { TransactionStore } from '../../store/transaction.store';
import { AuthStore } from '../../store/auth.store';
import { I18nService } from '../../core/services/i18n.service';
import { DateRangePickerComponent, DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatProgressBarModule, RouterLink, DateRangePickerComponent],
  template: `
<div class="dash page-fade">

  @if (store.loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ APPLE LARGE TITLE HEADER ══ -->
  <div class="dash-hdr">
    <div class="dh-left">
      <div class="dh-eyebrow num">{{ i18n.t().dashEyebrow }} • {{ periodLabel() }}</div>
      <h1 class="dh-title font-display">{{ i18n.t().dashTitle }}, {{ firstName() }}</h1>
    </div>
    <div class="dh-right">
      <div class="ctrl-group">
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

        @if (filterMode() === 'month') {
          <div class="sel-wrap">
            <i class="bi bi-calendar3 sel-ico"></i>
            <span>{{ periodLabel() }}</span>
            <i class="bi bi-chevron-down sel-caret"></i>
            <select class="overlay-select" [value]="selMonthKey()" (change)="onMonthChange($event)">
              @for (opt of monthOptions(); track opt.key) {
                <option [value]="opt.key">{{ opt.label }}</option>
              }
            </select>
          </div>
        }
        @if (filterMode() === 'custom') {
          <app-date-range-picker
            [startDate]="rangeStart()"
            [endDate]="rangeEnd()"
            (rangeChange)="onRangeChange($event)"
            (cleared)="clearDateRange()" />
        }
      </div>
      <a routerLink="/transactions" class="btn-action tap-target-44">
        <i class="bi bi-plus-lg"></i> <span>{{ i18n.t().recordCash }}</span>
      </a>
    </div>
  </div>

  <!-- ══ APPLE WALLET CARD STACK ══ -->
  <div class="wallet-section">
    <div class="wallet-grid">

      <!-- Apple Primary Titanium Card -->
      <div class="apple-wallet-card titanium-card">
        <div class="wc-top">
          <div class="wc-chip-box">
            <span class="wc-chip"></span>
            <span class="wc-brand font-display">FINCHAT VAULT</span>
          </div>
          <button class="eye-btn tap-target-44" (click)="toggleBalance()" [title]="balanceHidden() ? 'Show' : 'Hide'">
            <i class="bi" [class.bi-eye]="balanceHidden()" [class.bi-eye-slash]="!balanceHidden()"></i>
          </button>
        </div>

        <div class="wc-body">
          <div class="wc-lbl">{{ i18n.t().ledgerBalance }}</div>
          <div class="wc-balance num" [class.neg]="!balanceHidden() && store.month().balance < 0">
            @if (balanceHidden()) { <span class="masked">Rp •••••••••</span> }
            @else { {{ store.month().balance | currency:'IDR':'symbol':'1.0-0':'id' }} }
          </div>
        </div>

        <div class="wc-footer num">
          <div class="wc-user">
            <span class="wc-holder-lbl">{{ i18n.t().appleCardHolder }}</span>
            <span class="wc-holder-name">{{ auth.user()?.name ?? 'FINCHAT USER' | uppercase }}</span>
          </div>
          <div class="wc-card-num">{{ i18n.t().appleCardNumber }}</div>
        </div>
      </div>

      <!-- Quick Distribution Mini Cards -->
      <div class="wallet-pills-col">
        <div class="wallet-mini-card apple-card">
          <div class="wmc-left">
            <div class="wmc-ico cash-ico"><i class="bi bi-cash-stack"></i></div>
            <div>
              <span class="wmc-title">{{ i18n.t().cashBalance }}</span>
              <span class="wmc-val num">
                @if (balanceHidden()) { ••••••• }
                @else { {{ store.paymentBreakdown().CASH | currency:'IDR':'symbol':'1.0-0':'id' }} }
              </span>
            </div>
          </div>
          <span class="badge cash">CASH</span>
        </div>

        <div class="wallet-mini-card apple-card">
          <div class="wmc-left">
            <div class="wmc-ico bank-ico"><i class="bi bi-bank"></i></div>
            <div>
              <span class="wmc-title">{{ i18n.t().bankTransfer }}</span>
              <span class="wmc-val num">
                @if (balanceHidden()) { ••••••• }
                @else { {{ store.paymentBreakdown().TRANSFER | currency:'IDR':'symbol':'1.0-0':'id' }} }
              </span>
            </div>
          </div>
          <span class="badge transfer">TRANSFER</span>
        </div>

        <div class="wallet-mini-card apple-card">
          <div class="wmc-left">
            <div class="wmc-ico qris-ico"><i class="bi bi-qr-code-scan"></i></div>
            <div>
              <span class="wmc-title">{{ i18n.t().qrisBalance }}</span>
              <span class="wmc-val num">
                @if (balanceHidden()) { ••••••• }
                @else { {{ store.paymentBreakdown().QRIS | currency:'IDR':'symbol':'1.0-0':'id' }} }
              </span>
            </div>
          </div>
          <span class="badge qris">QRIS</span>
        </div>
      </div>

    </div>
  </div>

  <!-- ══ SUMMARY METRICS STRIP ══ -->
  <div class="metrics-strip">
    <div class="metric-card apple-card">
      <div class="mc-hdr"><i class="bi bi-arrow-down-left-circle-fill green-txt"></i> {{ i18n.t().income }}</div>
      <div class="mc-val green-txt num">
        @if (balanceHidden()) { ••••••• }
        @else { {{ store.month().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }} }
      </div>
    </div>
    <div class="metric-card apple-card">
      <div class="mc-hdr"><i class="bi bi-arrow-up-right-circle-fill red-txt"></i> {{ i18n.t().expense }}</div>
      <div class="mc-val red-txt num">
        @if (balanceHidden()) { ••••••• }
        @else { {{ store.month().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }} }
      </div>
    </div>
    <div class="metric-card apple-card full-mobile">
      <div class="mc-hdr"><i class="bi bi-calendar-check-fill amber-txt"></i> {{ i18n.t().dailyAverage }}</div>
      <div class="mc-val num">
        @if (balanceHidden()) { ••••••• }
        @else { {{ avgDailyExpense() | currency:'IDR':'symbol':'1.0-0':'id' }} }
      </div>
    </div>
  </div>

  <!-- ══ MAIN LAYOUT GRID ══ -->
  <div class="main-grid">

    <!-- ─ LEFT COLUMN ─ -->
    <div class="col-main">

      <!-- Cash Flow Line Chart -->
      <div class="panel apple-card">
        <div class="panel-hdr">
          <div>
            <h3 class="panel-title font-display">{{ i18n.t().cashFlowGraph }}</h3>
            <p class="panel-sub">{{ i18n.t().cashFlowSub }} ({{ periodLabel() }})</p>
          </div>
          <div class="cf-legend num">
            <button
              type="button"
              class="legend-btn"
              [class.active]="showIncomeFlow()"
              (click)="toggleIncomeFlow()"
            >
              <i class="bi" [class.bi-check-circle-fill]="showIncomeFlow()" [class.bi-circle]="!showIncomeFlow()" [class.green-txt]="showIncomeFlow()"></i>
              <span>{{ i18n.t().inFlow }}</span>
            </button>
            <button
              type="button"
              class="legend-btn"
              [class.active]="showExpenseFlow()"
              (click)="toggleExpenseFlow()"
            >
              <i class="bi" [class.bi-check-circle-fill]="showExpenseFlow()" [class.bi-circle]="!showExpenseFlow()" [class.red-txt]="showExpenseFlow()"></i>
              <span>{{ i18n.t().outFlow }}</span>
            </button>
          </div>
        </div>

        @if (store.loading()) {
          <div class="chart-container">
            <span class="skeleton" style="width: 100%; height: 140px; border-radius: var(--r-sm);"></span>
          </div>
        } @else {
          <div class="chart-container">
            <svg viewBox="0 0 560 140" preserveAspectRatio="none" class="cf-svg">
              <line x1="0" y1="35" x2="560" y2="35" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
              <line x1="0" y1="70" x2="560" y2="70" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
              <line x1="0" y1="105" x2="560" y2="105" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>
              @if (showIncomeFlow()) {
                <path [attr.d]="cashFlowData().iPath" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round"/>
              }
              @if (showExpenseFlow()) {
                <path [attr.d]="cashFlowData().ePath" fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/>
              }
            </svg>
            @if (!showIncomeFlow() && !showExpenseFlow()) {
              <div class="empty-chart-hint">{{ i18n.t().emptyChartHint }}</div>
            }
          </div>
        }
      </div>

      <!-- Recent Transactions Table -->
      <div class="panel apple-card">
        <div class="panel-hdr">
          <h3 class="panel-title font-display">{{ i18n.t().recentTransactions }}</h3>
          <a routerLink="/transactions" class="panel-link">{{ i18n.t().seeAll }} →</a>
        </div>

        <div class="tx-ledger">
          @if (store.loading()) {
            @for (i of [1,2,3,4]; track i) {
              <div class="tx-row">
                <div class="tx-col-type"><span class="skeleton" style="width: 32px; height: 18px;"></span></div>
                <div class="tx-col-info">
                  <span class="skeleton" style="width: 55%; height: 14px; margin-bottom: 4px;"></span>
                  <span class="skeleton" style="width: 35%; height: 10px;"></span>
                </div>
                <div class="tx-col-amount"><span class="skeleton" style="width: 80px; height: 16px;"></span></div>
              </div>
            }
          } @else {
            @for (tx of store.recentTransactions().slice(0, 5); track tx.id) {
              <div class="tx-row">
                <div class="tx-col-type">
                  <span class="badge" [class.income]="tx.type==='INCOME'" [class.expense]="tx.type==='EXPENSE'">
                    {{ tx.type==='INCOME' ? (i18n.currentLang()==='id'?'MASUK':'IN') : (i18n.currentLang()==='id'?'KELUAR':'OUT') }}
                  </span>
                </div>
                <div class="tx-col-info">
                  <div class="tx-title">{{ tx.description | titlecase }}</div>
                  <div class="tx-sub font-mono">
                    <span>{{ tx.date | date:'d MMM yyyy':'':i18n.currentLang() }}</span> • <span>{{ tx.paymentMethod }}</span>
                  </div>
                </div>
                <div class="tx-col-amount num" [class.income-color]="tx.type==='INCOME'" [class.expense-color]="tx.type==='EXPENSE'">
                  {{ tx.type==='INCOME' ? '+' : '-' }}{{ tx.amount | currency:'IDR':'symbol':'1.0-0':'id' }}
                </div>
              </div>
            }
          }
        </div>
      </div>

    </div>

    <!-- ─ RIGHT COLUMN ─ -->
    <div class="col-side">

      <!-- Financial Health Score -->
      <div class="panel apple-card">
        <div class="panel-hdr">
          <h3 class="panel-title font-display">{{ i18n.t().financialHealth }}</h3>
          <span class="badge" [class.income]="healthScore() >= 70" [class.amber]="healthScore() >= 50 && healthScore() < 70" [class.expense]="healthScore() < 50">
            {{ healthGrade() }}
          </span>
        </div>

        <div class="health-block">
          <div class="health-gauge">
            <div class="gauge-val font-display num">{{ healthScore() }}</div>
            <div class="gauge-lbl">/ 100</div>
          </div>
          <div class="health-progress-wrap">
            <div class="health-progress-bar" [style.width.%]="healthScore()" [class.bg-green]="healthScore()>=70" [class.bg-amber]="healthScore()>=50&&healthScore()<70" [class.bg-red]="healthScore()<50"></div>
          </div>
          <p class="health-advice">{{ healthSummary() }}</p>
        </div>
      </div>

      <!-- Expense Categories Breakdown -->
      <div class="panel apple-card">
        <div class="panel-hdr">
          <h3 class="panel-title font-display">{{ i18n.t().expenseDistribution }}</h3>
          <a routerLink="/reports" class="panel-link">{{ i18n.t().seeAll }}</a>
        </div>

        <div class="cat-list">
          @if (store.loading()) {
            <span class="skeleton" style="width: 100%; height: 32px; margin-bottom: 8px;"></span>
            <span class="skeleton" style="width: 100%; height: 32px;"></span>
          } @else if (topCategories().length === 0) {
            <div class="empty-cats">{{ i18n.t().noCategoryData }}</div>
          } @else {
            @for (c of topCategories(); track c.name) {
              <div class="cat-row">
                <div class="cat-meta">
                  <span class="cat-name">{{ c.name }}</span>
                  <span class="cat-pct num">{{ c.percentage }}%</span>
                </div>
                <div class="cat-bar-wrap">
                  <div class="cat-bar" [style.width.%]="c.percentage" [style.background-color]="c.color"></div>
                </div>
                <div class="cat-amt num">{{ c.amount | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
              </div>
            }
          }
        </div>
      </div>

    </div>

  </div>

</div>
  `,
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 16px; padding: 20px; max-width: 1180px; margin: 0 auto; width: 100%; }

    /* ── Apple Header Bar ── */
    .dash-hdr { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .dh-eyebrow { font-size: 0.68rem; font-weight: 700; color: var(--cobalt); letter-spacing: 0.05em; }
    .dh-title { font-size: 1.8rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; margin-top: 2px; }

    .dh-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ctrl-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

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

    .btn-action {
      display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 9px;
      background: var(--cobalt); color: #FFF; font-size: 0.84rem; font-weight: 600;
      transition: all 0.15s ease; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
      &:hover { background: var(--cobalt-bright); }
    }

    /* ── Apple Wallet Section ── */
    .wallet-section { width: 100%; }
    .wallet-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }

    .apple-wallet-card {
      border-radius: 20px; padding: 24px; position: relative; overflow: hidden;
      display: flex; flex-direction: column; justify-content: space-between; min-height: 190px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      &:hover { transform: translateY(-2px); }
    }

    .titanium-card {
      background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 50%, #0A84FF 160%);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
    }

    :root:not(.dark) .titanium-card {
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 70%, #0284C7 150%);
    }

    .wc-top { display: flex; justify-content: space-between; align-items: center; }
    .wc-chip-box { display: flex; align-items: center; gap: 8px; }
    .wc-chip {
      width: 28px; height: 20px; border-radius: 4px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.4);
    }
    .wc-brand { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; opacity: 0.9; }

    .wc-body { margin: 16px 0; }
    .wc-lbl { font-size: 0.72rem; letter-spacing: 0.04em; opacity: 0.75; font-weight: 600; margin-bottom: 4px; }
    .wc-balance { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: #FFFFFF; }
    .wc-balance.neg { color: #FF453A; }

    .wc-footer { display: flex; justify-content: space-between; align-items: flex-end; opacity: 0.85; }
    .wc-user { display: flex; flex-direction: column; gap: 2px; }
    .wc-holder-lbl { font-size: 0.58rem; letter-spacing: 0.06em; opacity: 0.65; }
    .wc-holder-name { font-size: 0.76rem; font-weight: 700; letter-spacing: 0.04em; }
    .wc-card-num { font-size: 0.75rem; letter-spacing: 0.1em; }

    .wallet-pills-col { display: flex; flex-direction: column; gap: 10px; justify-content: space-between; }
    .wallet-mini-card {
      padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
      border-radius: 14px;
    }
    .wmc-left { display: flex; align-items: center; gap: 12px; }
    .wmc-ico {
      width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
      &.cash-ico { background: var(--green-dim); color: var(--green); }
      &.bank-ico { background: var(--cobalt-dim); color: var(--cobalt); }
      &.qris-ico { background: var(--amber-dim); color: var(--amber); }
    }
    .wmc-title { font-size: 0.76rem; color: var(--subtle); font-weight: 600; display: block; }
    .wmc-val { font-size: 0.95rem; font-weight: 700; color: var(--text); }

    /* Metrics Strip */
    .metrics-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .metric-card { padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; }
    .mc-hdr { font-size: 0.76rem; font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .mc-val { font-size: 1.2rem; font-weight: 800; color: var(--text); }

    /* ── Main Grid ── */
    .main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
    .col-main, .col-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

    .panel { padding: 18px; background: var(--surface); display: flex; flex-direction: column; gap: 14px; }
    .panel-hdr { display: flex; justify-content: space-between; align-items: center; }
    .panel-title { font-size: 1rem; font-weight: 700; color: var(--text); }
    .panel-sub { font-size: 0.75rem; color: var(--subtle); margin-top: 2px; }
    .panel-link { font-size: 0.78rem; font-weight: 600; color: var(--cobalt); text-decoration: none; }

    .cf-legend { display: flex; align-items: center; gap: 8px; }
    .legend-btn {
      border: 1px solid var(--border); background: var(--surface-2); padding: 4px 10px; border-radius: 7px;
      font-size: 0.75rem; font-weight: 600; color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 5px;
      &.active { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
    }

    .chart-container { height: 140px; width: 100%; position: relative; }
    .cf-svg { width: 100%; height: 100%; }
    .empty-chart-hint {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 0.78rem; color: var(--subtle);
    }

    /* Recent Transactions List (Apple Inset Style) */
    .tx-ledger { display: flex; flex-direction: column; }
    .tx-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 0;
      border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: none; padding-bottom: 0; }
      &:first-child { padding-top: 0; }
    }
    .tx-col-type { flex-shrink: 0; }
    .tx-col-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .tx-title { font-size: 0.88rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-sub { font-size: 0.72rem; color: var(--subtle); }
    .tx-col-amount { font-size: 0.92rem; font-weight: 700; flex-shrink: 0; }

    /* Health Score */
    .health-block { display: flex; flex-direction: column; gap: 10px; }
    .health-gauge { display: flex; align-items: baseline; gap: 4px; }
    .gauge-val { font-size: 2rem; font-weight: 800; color: var(--text); }
    .gauge-lbl { font-size: 0.9rem; color: var(--subtle); font-weight: 600; }
    .health-progress-wrap { height: 8px; width: 100%; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
    .health-progress-bar { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
    .health-advice { font-size: 0.78rem; color: var(--muted); line-height: 1.4; }

    .bg-green { background: var(--green); }
    .bg-amber { background: var(--amber); }
    .bg-red { background: var(--red); }

    /* Categories List */
    .cat-list { display: flex; flex-direction: column; gap: 10px; }
    .cat-row { display: flex; flex-direction: column; gap: 4px; }
    .cat-meta { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; }
    .cat-name { color: var(--text); }
    .cat-pct { color: var(--subtle); }
    .cat-bar-wrap { height: 6px; width: 100%; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
    .cat-bar { height: 100%; border-radius: 99px; }
    .cat-amt { font-size: 0.74rem; color: var(--subtle); text-align: right; }
    .empty-cats { font-size: 0.78rem; color: var(--subtle); text-align: center; padding: 10px; }

    @media (max-width: 900px) {
      .wallet-grid { grid-template-columns: 1fr; }
      .main-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .dash { padding: 12px; gap: 12px; }
      .dh-title { font-size: 1.35rem; }
      .apple-wallet-card { padding: 18px; min-height: 170px; }
      .wc-balance { font-size: 1.8rem; }
      .metrics-strip { grid-template-columns: 1fr 1fr; }
      .metric-card.full-mobile { grid-column: span 2; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly store = inject(TransactionStore);
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nService);
  private readonly txService = inject(TransactionService);

  readonly filterMode = signal<'month' | 'year' | 'custom'>('month');
  readonly selMonthKey = signal<string>('');
  readonly rangeStart = signal<string>('');
  readonly rangeEnd = signal<string>('');

  readonly balanceHidden = signal(false);
  readonly showIncomeFlow = signal(true);
  readonly showExpenseFlow = signal(true);

  readonly firstName = computed(() => {
    const full = this.auth.user()?.name ?? 'User';
    return full.split(' ')[0];
  });

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

  readonly periodLabel = computed(() => {
    const mode = this.filterMode();
    if (mode === 'month') {
      const opt = this.monthOptions().find(o => o.key === this.selMonthKey());
      return opt ? opt.label : (this.i18n.currentLang() === 'id' ? 'Bulan Ini' : 'This Month');
    }
    if (mode === 'year') {
      return new Date().getFullYear().toString();
    }
    if (mode === 'custom') {
      if (this.rangeStart() && this.rangeEnd()) {
        return `${this.rangeStart()} - ${this.rangeEnd()}`;
      }
      return this.i18n.t().custom;
    }
    return '';
  });

  readonly savingsRate = computed(() => {
    const m = this.store.month();
    if (!m.totalIncome || m.totalIncome <= 0) return 0;
    const rate = Math.round(((m.totalIncome - m.totalExpense) / m.totalIncome) * 100);
    return Math.max(0, rate);
  });

  readonly avgDailyExpense = computed(() => {
    const exp = this.store.month().totalExpense;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round(exp / daysInMonth);
  });

  readonly healthScore = computed(() => {
    const m = this.store.month();
    if (!m.totalIncome || m.totalIncome === 0) return 50;
    const savings = ((m.totalIncome - m.totalExpense) / m.totalIncome) * 100;
    if (savings >= 40) return 92;
    if (savings >= 20) return 80;
    if (savings >= 0) return 65;
    return 35;
  });

  readonly healthGrade = computed(() => {
    const s = this.healthScore();
    if (s >= 80) return this.i18n.currentLang() === 'id' ? 'Sangat Baik' : 'Excellent';
    if (s >= 65) return this.i18n.currentLang() === 'id' ? 'Sehat' : 'Healthy';
    return this.i18n.currentLang() === 'id' ? 'Perhatian' : 'Warning';
  });

  readonly healthSummary = computed(() => {
    const s = this.healthScore();
    if (this.i18n.currentLang() === 'id') {
      if (s >= 80) return 'Arus kas sangat stabil dengan rasio tabungan optimal.';
      if (s >= 65) return 'Keuangan dalam batas aman, pertahankan efisiensi pengeluaran.';
      return 'Pengeluaran melebihi pemasukan bulan ini, kurangi pos pengeluaran tersier.';
    } else {
      if (s >= 80) return 'Cash flow is highly stable with optimal savings ratio.';
      if (s >= 65) return 'Finances within safe margins, maintain spending discipline.';
      return 'Expenses exceed income this period, limit non-essential expenses.';
    }
  });

  readonly topCategories = computed(() => {
    const txs = this.store.transactions();
    const map = new Map<string, { name: string; amount: number; color: string }>();
    let totalExp = 0;
    
    for (const t of txs) {
      if (t.type === 'EXPENSE') {
        const catName = t.category?.name ?? (this.i18n.currentLang() === 'id' ? 'Lain-lain' : 'Others');
        const catColor = t.category?.color ?? '#007AFF';
        const current = map.get(catName) ?? { name: catName, amount: 0, color: catColor };
        current.amount += t.amount;
        totalExp += t.amount;
        map.set(catName, current);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)
      .map(c => ({
        ...c,
        percentage: totalExp > 0 ? Math.round((c.amount / totalExp) * 100) : 0
      }));
  });

  readonly cashFlowData = computed(() => {
    const days = 30;
    let iPath = 'M 0 100';
    let ePath = 'M 0 110';
    
    for (let i = 1; i <= days; i++) {
      const x = (i / days) * 560;
      const yInc = 130 - (Math.sin(i * 0.3) * 35 + 45);
      const yExp = 130 - (Math.cos(i * 0.25) * 30 + 35);
      iPath += ` L ${x.toFixed(1)} ${yInc.toFixed(1)}`;
      ePath += ` L ${x.toFixed(1)} ${yExp.toFixed(1)}`;
    }
    return { iPath, ePath };
  });

  ngOnInit() {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.selMonthKey.set(key);
    this.loadData();
  }

  setMode(mode: 'month' | 'year' | 'custom') {
    this.filterMode.set(mode);
    this.loadData();
  }

  onMonthChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selMonthKey.set(val);
    this.loadData();
  }

  onRangeChange(range: DateRange) {
    this.rangeStart.set(range.start);
    this.rangeEnd.set(range.end);
    this.loadData();
  }

  clearDateRange() {
    this.rangeStart.set('');
    this.rangeEnd.set('');
  }

  toggleBalance() {
    this.balanceHidden.update(v => !v);
  }

  toggleIncomeFlow() {
    this.showIncomeFlow.update(v => !v);
  }

  toggleExpenseFlow() {
    this.showExpenseFlow.update(v => !v);
  }

  private loadData() {
    this.txService.getThisMonth().subscribe({
      next: (s) => this.store.setMonth(s),
    });
    this.txService.getAll({ limit: 100 }).subscribe({
      next: (res) => this.store.setTransactions(res.data, res.total),
    });
  }
}
