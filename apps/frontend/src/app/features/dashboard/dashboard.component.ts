import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TransactionService } from '../../core/services/transaction.service';
import { TransactionStore } from '../../store/transaction.store';
import { AuthStore } from '../../store/auth.store';
import { DateRangePickerComponent, DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import { niceMax, fmtY, catmullRom } from '../../shared/utils/chart.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatProgressBarModule, MatButtonModule, RouterLink, DateRangePickerComponent],
  template: `
<div class="dash">

  @if (store.loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ GREETING BAR ══ -->
  <div class="g-bar">
    <div>
      <h1 class="greeting">Selamat {{ timeGreet() }}, {{ firstName() }} 👋</h1>
      <p class="greeting-sub">{{ healthInsight() }}</p>
    </div>
    <div class="g-bar-right">
      <div class="fmode-ctrl">
        <div class="fmode-select-wrap">
          <i class="bi bi-calendar3 fmode-sel-ico"></i>
          <span class="fmode-sel-label">{{ filterMode()==='month' ? 'Bulanan' : filterMode()==='year' ? 'Tahunan' : 'Custom' }}</span>
          <i class="bi bi-chevron-down fmode-sel-caret"></i>
          <select class="fmode-select" [value]="filterMode()" (change)="setMode($any($event.target).value)">
            <option value="month">Bulanan</option>
            <option value="year">Tahunan</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        @if (filterMode() === 'month') {
          <div class="month-pill">
            <i class="bi bi-calendar3"></i>
            <span class="month-text">{{ periodLabel() }}</span>
            <i class="bi bi-chevron-down month-caret"></i>
            <select class="month-select-overlay" [value]="selMonthKey()" (change)="onMonthChange($event)">
              @for (opt of monthOptions(); track opt.key) {
                <option [value]="opt.key">{{ opt.label }}</option>
              }
            </select>
          </div>
        }
        @if (filterMode() === 'year') {
          <div class="month-pill">
            <i class="bi bi-calendar3"></i>
            <span class="month-text">Tahun {{ selYear() }}</span>
            <i class="bi bi-chevron-down month-caret"></i>
            <select class="month-select-overlay" [value]="selYear()" (change)="onYearChange($event)">
              @for (y of yearOptions(); track y) { <option [value]="y">{{ y }}</option> }
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
      <a routerLink="/transactions" class="btn-ghost-sm">
        <i class="bi bi-arrow-left-right"></i> Transaksi
      </a>
      <a routerLink="/reports" class="btn-dark-sm">
        <i class="bi bi-bar-chart-fill"></i> Laporan
      </a>
    </div>
  </div>

  <!-- ══ HERO CARD ══ -->
  <div class="hero-wrap">
    @if (store.loading()) {
      <!-- Hero Skeleton -->
      <div class="sk-hero">
        <div class="sk-hero-deco-1"></div>
        <div class="sk-hero-deco-2"></div>
        <div class="sk-hero-left">
          <div class="sk-dark" style="width:140px;height:10px;border-radius:5px;margin-bottom:14px"></div>
          <div class="sk-dark" style="width:260px;height:40px;border-radius:8px;margin-bottom:20px"></div>
          <div style="display:flex;gap:28px">
            <div>
              <div class="sk-dark" style="width:60px;height:8px;border-radius:4px;margin-bottom:6px"></div>
              <div class="sk-dark" style="width:120px;height:16px;border-radius:5px"></div>
            </div>
            <div>
              <div class="sk-dark" style="width:60px;height:8px;border-radius:4px;margin-bottom:6px"></div>
              <div class="sk-dark" style="width:120px;height:16px;border-radius:5px"></div>
            </div>
          </div>
        </div>
        <div class="sk-hero-right">
          <div class="sk-dark" style="width:170px;height:120px;border-radius:16px;background:rgba(255,255,255,0.12)"></div>
        </div>
      </div>
    } @else {
      <div class="hero-card" [style.background]="heroBg()">
        <div class="hero-deco-1" [style.background]="heroDecoColor()"></div>
        <div class="hero-deco-2" [style.background]="heroDecoColor()"></div>

        <!-- Sparkline background -->
        @if (heroSparkline()) {
          <svg class="hero-spark" viewBox="0 0 240 64" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
                <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>
            <path [attr.d]="heroSparkline() + ' L 240,64 L 0,64 Z'" fill="url(#sparkGrad)"/>
            <path [attr.d]="heroSparkline()" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        }

        <div class="hero-left">
          <div class="hero-eyebrow-row">
            <p class="hero-eyebrow">Total Saldo {{ periodLabel() }}</p>
            <button class="eye-btn" (click)="toggleBalance()" [title]="balanceHidden() ? 'Tampilkan saldo' : 'Sembunyikan saldo'">
              <i class="bi" [class.bi-eye]="balanceHidden()" [class.bi-eye-slash]="!balanceHidden()"></i>
            </button>
          </div>
          <div class="hero-balance-row">
            <h2 class="hero-balance" [class.hero-neg]="!balanceHidden() && store.month().balance < 0">
              @if (balanceHidden()) { <span class="hero-masked">Rp ••••••</span> }
              @else { {{ store.month().balance | currency:'IDR':'symbol':'1.0-0':'id' }} }
            </h2>
            @if (!balanceHidden() && savingsRate() !== 0) {
              <span class="hero-rate-chip" [class.chip-pos]="savingsRate()>0" [class.chip-neg]="savingsRate()<0">
                <i class="bi" [class.bi-arrow-up-short]="savingsRate()>0" [class.bi-arrow-down-short]="savingsRate()<0"></i>
                {{ absVal(savingsRate()) }}% savings rate
              </span>
            }
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hs-dot hs-inc"></span>
              <div>
                <div class="hs-label">Pemasukan</div>
                <div class="hs-val">
                  @if (balanceHidden()) { ••••• }
                  @else { {{ store.month().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }} }
                </div>
              </div>
            </div>
            <div class="hero-stat">
              <span class="hs-dot hs-exp"></span>
              <div>
                <div class="hs-label">Pengeluaran</div>
                <div class="hs-val">
                  @if (balanceHidden()) { ••••• }
                  @else { {{ store.month().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }} }
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-right">
          <div class="hero-score-box">
            <div class="hsb-inner">
              <svg viewBox="0 0 80 80" class="hsb-ring">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="7"/>
                <circle cx="40" cy="40" r="32" fill="none"
                  [attr.stroke]="healthRingColor()"
                  stroke-width="7" stroke-linecap="round"
                  [attr.stroke-dasharray]="scoreDash()"
                  stroke-dashoffset="50.3"
                  transform="rotate(-90 40 40)"/>
              </svg>
              <div class="hsb-center">
                <span class="hsb-val">{{ healthScore() }}</span>
                <span class="hsb-sub">/100</span>
              </div>
            </div>
            <div class="hsb-label" [style.color]="healthRingColor()">{{ healthLabel() }}</div>
            <div class="hsb-tip">{{ shortHealthTip() }}</div>
          </div>
        </div>
      </div>
    }
  </div>

  <!-- ══ MAIN GRID ══ -->
  <div class="main-grid">

    <!-- ─ LEFT COLUMN ─ -->
    <div class="col-main">

      <!-- Cash Flow Chart -->
      <div class="card chart-card">
        <div class="chart-hdr">
          <div>
            <h3 class="chart-title">Arus Kas {{ periodLabel() }}</h3>
            <p class="chart-sub">Akumulasi pemasukan dan pengeluaran</p>
          </div>
        </div>

        @if (store.loading()) {
          <div class="chart-body">
            <div class="skeleton" style="width:100%;height:148px;border-radius:10px;margin-bottom:8px"></div>
          </div>
        } @else {
        @if (cashFlowData(); as cf) {
          <div class="chart-body">
            <div class="chart-area">
              <!-- Y-axis labels -->
              <div class="y-axis">
                @for (g of cf.grids; track g.label) {
                  <span [style.top.%]="g.yPct">{{ g.label }}</span>
                }
              </div>
              <!-- Chart -->
              <div class="cf-wrap">
                <svg viewBox="0 0 560 148" preserveAspectRatio="none" class="cf-svg"
                  (mousemove)="onChartMove($event, cf.iCoords.length)"
                  (mouseleave)="onChartLeave()">
                  <defs>
                    <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#2DD4BF" stop-opacity="0.18"/>
                      <stop offset="100%" stop-color="#2DD4BF" stop-opacity="0"/>
                    </linearGradient>
                    <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#EF4444" stop-opacity="0.12"/>
                      <stop offset="100%" stop-color="#EF4444" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <!-- dynamic grid lines -->
                  @for (g of cf.grids; track g.label) {
                    <line x1="0" [attr.y1]="g.yPct / 100 * 148" x2="560" [attr.y2]="g.yPct / 100 * 148"
                      stroke="var(--border)" stroke-width="0.6"/>
                  }
                  <path [attr.d]="cf.iArea" fill="url(#iGrad)"/>
                  <path [attr.d]="cf.iPath" fill="none" stroke="#2DD4BF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path [attr.d]="cf.eArea" fill="url(#eGrad)"/>
                  <path [attr.d]="cf.ePath" fill="none" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <!-- crosshair -->
                  @if (hoverIdx() >= 0) {
                    <line [attr.x1]="cf.iCoords[hoverIdx()].x" y1="0"
                          [attr.x2]="cf.iCoords[hoverIdx()].x" y2="148"
                          stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" opacity="0.35"/>
                  }
                  <!-- income dots: only on days with transactions + hovered -->
                  @for (pt of cf.iCoords; track $index) {
                    @if (cf.pts[$index].hasTx || hoverIdx() === $index) {
                      <circle [attr.cx]="pt.x" [attr.cy]="pt.y"
                        [attr.r]="hoverIdx() === $index ? 5 : 3"
                        fill="#2DD4BF" stroke="white"
                        [attr.stroke-width]="hoverIdx() === $index ? 2.5 : 1.5"/>
                    }
                  }
                  <!-- expense dots -->
                  @for (pt of cf.eCoords; track $index) {
                    @if (cf.pts[$index].hasTx || hoverIdx() === $index) {
                      <circle [attr.cx]="pt.x" [attr.cy]="pt.y"
                        [attr.r]="hoverIdx() === $index ? 5 : 3"
                        fill="#EF4444" stroke="white"
                        [attr.stroke-width]="hoverIdx() === $index ? 2.5 : 1.5"/>
                    }
                  }
                </svg>
                <!-- tooltip -->
                @if (hoverIdx() >= 0 && hoverIdx() < cf.pts.length) {
                  <div class="cf-tooltip"
                    [style.left]="(cf.iCoords[hoverIdx()].x / 560 * 100) + '%'"
                    [class.tip-right]="cf.iCoords[hoverIdx()].x / 560 > 0.65">
                    <div class="tip-date">{{ cf.pts[hoverIdx()].dateLabel }}</div>
                    @if (cf.pts[hoverIdx()].hasTx) {
                      <div class="tip-row">
                        <span class="tip-dot" style="background:#2DD4BF"></span>
                        <span class="tip-key">Pemasukan</span>
                        <span class="tip-val inc-val">{{ cf.pts[hoverIdx()].dailyI | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      </div>
                      <div class="tip-row">
                        <span class="tip-dot" style="background:#EF4444"></span>
                        <span class="tip-key">Pengeluaran</span>
                        <span class="tip-val exp-val">{{ cf.pts[hoverIdx()].dailyE | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      </div>
                    } @else {
                      <div class="tip-empty">Tidak ada transaksi</div>
                    }
                  </div>
                }
              </div>
            </div>
            <div class="cf-xaxis">
              @for (lbl of cf.labels; track $index) { <span>{{ lbl }}</span> }
            </div>
          </div>
          <div class="cf-legend">
            <span class="cf-dot" style="background:#2DD4BF"></span>
            <span class="cf-lbl">Pemasukan</span>
            <span class="cf-dot" style="background:#EF4444"></span>
            <span class="cf-lbl">Pengeluaran</span>
          </div>
        } @else {
          <div class="chart-placeholder">
            <i class="bi bi-activity"></i>
            <p>Tambahkan minimal 2 transaksi untuk melihat grafik</p>
          </div>
        }
        }
      </div>

      <!-- Bottom: Transactions + Quick Summary -->
      <div class="bottom-grid">

        <!-- Latest Transactions -->
        <div class="card">
          <div class="section-hdr">
            <h3 class="section-title">Transaksi Terbaru</h3>
            <a routerLink="/transactions" class="view-all">Lihat semua <i class="bi bi-arrow-right"></i></a>
          </div>

          @if (store.loading()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="sk-row">
                <div class="skeleton sk-circle"></div>
                <div class="sk-body">
                  <div class="skeleton sk-line" style="width:50%"></div>
                  <div class="skeleton sk-line" style="width:35%;height:10px;margin-top:6px"></div>
                </div>
                <div class="skeleton sk-line" style="width:80px;height:16px"></div>
              </div>
            }
          } @else {
            @for (tx of store.recentTransactions().slice(0,5); track tx.id; let last=$last) {
              <div class="tx-row" [class.tx-last]="last">
                <div class="tx-ico" [style.background]="txBg(tx)" [style.color]="txColor(tx)" [style.border]="txBorderStyle(tx)">
                  <i class="bi" [class]="txIcon(tx)"></i>
                </div>
                <div class="tx-body">
                  <div class="tx-name">{{ tx.description | titlecase }}</div>
                  <div class="tx-meta">
                    <span>{{ pmLabel(tx.paymentMethod) }}</span>
                    <span class="meta-dot">•</span>
                    <span>{{ tx.date | date:'d MMM yyyy':'':'id' }}</span>
                  </div>
                </div>
                <span class="tx-cat-pill"
                  [style.background]="txCatBg(tx)"
                  [style.color]="txCatColor(tx)">
                  {{ txCatLabel(tx) }}
                </span>
                <div class="tx-amount" [class.inc]="tx.type==='INCOME'" [class.exp]="tx.type==='EXPENSE'">
                  {{ tx.type==='INCOME'?'+':'−' }}{{ tx.amount | currency:'IDR':'symbol':'1.0-0':'id' }}
                </div>
              </div>
            } @empty {
              <div class="tx-empty">
                <i class="bi bi-inbox"></i><p>Belum ada transaksi</p>
              </div>
            }
          }
        </div>

        <!-- Quick Summary -->
        <div class="card quick-card">
          <div class="section-hdr">
            <h3 class="section-title">Ringkasan Cepat</h3>
          </div>
          @if (store.loading()) {
            <div class="qs-list">
              @for (i of [1,2,3,4]; track i) {
                <div class="qs-item">
                  <div class="skeleton" style="width:38px;height:38px;border-radius:12px;flex-shrink:0"></div>
                  <div style="flex:1">
                    <div class="skeleton" style="width:70%;height:11px;border-radius:4px;margin-bottom:7px"></div>
                    <div class="skeleton" style="width:50%;height:13px;border-radius:4px"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="qs-list">
              <div class="qs-item">
                <div class="qs-ico" style="background:rgba(16,185,129,0.13);color:#10B981;border:1px solid rgba(16,185,129,0.28)"><i class="bi bi-wallet-fill"></i></div>
                <span class="qs-label">Pemasukan {{ periodShortLabel() }}</span>
                <span class="qs-val income-color">
                  @if (balanceHidden()) { ••••• }
                  @else { {{ store.month().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }} }
                </span>
              </div>
              <div class="qs-item">
                <div class="qs-ico" style="background:rgba(239,68,68,0.13);color:#EF4444;border:1px solid rgba(239,68,68,0.28)"><i class="bi bi-lock-fill"></i></div>
                <span class="qs-label">Pengeluaran {{ periodShortLabel() }}</span>
                <span class="qs-val expense-color">
                  @if (balanceHidden()) { ••••• }
                  @else { {{ store.month().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }} }
                </span>
              </div>
              <div class="qs-item">
                <div class="qs-ico" style="background:rgba(59,130,246,0.13);color:#3B82F6;border:1px solid rgba(59,130,246,0.28)"><i class="bi bi-calculator-fill"></i></div>
                <span class="qs-label">Rata-rata Harian</span>
                <span class="qs-val">
                  @if (balanceHidden()) { ••••• }
                  @else { {{ avgDailyExpense() | currency:'IDR':'symbol':'1.0-0':'id' }} }
                </span>
              </div>
              <div class="qs-item">
                <div class="qs-ico" style="background:rgba(59,130,246,0.13);color:#3B82F6;border:1px solid rgba(59,130,246,0.28)"><i class="bi bi-calendar-fill"></i></div>
                <span class="qs-label">Hari Terboros</span>
                <span class="qs-val">{{ busiestDay() }}</span>
              </div>
            </div>
            @if (filterMode() === 'month' && daysLeft() >= 0) {
              <div class="qs-footer">
                <i class="bi bi-clock"></i>
                <span>{{ daysLeft() }} hari lagi memasuki {{ nextMonthName() }}</span>
              </div>
            }
          }
        </div>

      </div>
    </div>

    <!-- ─ RIGHT SIDEBAR ─ -->
    <div class="col-side">

      <!-- Category Donut -->
      <div class="card cat-card">
        <div class="section-hdr">
          <h3 class="section-title">Pengeluaran per Kategori</h3>
          <a routerLink="/reports" class="view-all">Semua →</a>
        </div>
        @if (store.loading()) {
          <div class="donut-wrap" style="display:flex;flex-direction:column;align-items:center;padding:4px 20px 20px">
            <div class="skeleton" style="width:140px;height:140px;border-radius:50%;margin-bottom:16px"></div>
            <div style="width:100%;display:flex;flex-direction:column;gap:10px">
              @for (i of [1,2,3,4]; track i) {
                <div style="display:flex;align-items:center;gap:7px">
                  <div class="skeleton" style="width:8px;height:8px;border-radius:2px;flex-shrink:0"></div>
                  <div class="skeleton" style="flex:1;height:11px;border-radius:4px"></div>
                  <div class="skeleton" style="width:30px;height:11px;border-radius:4px"></div>
                  <div class="skeleton" style="width:70px;height:11px;border-radius:4px"></div>
                </div>
              }
            </div>
          </div>
        } @else if (donutData().segs.length > 0) {
          <div class="donut-wrap">
            <div class="donut-ring-wrap">
              <svg viewBox="0 0 140 140" class="donut-svg">
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" stroke-width="18"/>
                @for (seg of donutData().segs; track seg.name) {
                  <circle cx="70" cy="70" r="54" fill="none"
                    [attr.stroke]="seg.color"
                    stroke-width="18"
                    [attr.stroke-dasharray]="seg.dasharray"
                    [attr.stroke-dashoffset]="seg.dashoffset"
                    transform="rotate(-90 70 70)"/>
                }
              </svg>
              <div class="donut-center">
                <span class="dc-lbl">Total</span>
                <span class="dc-val">{{ donutData().total | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
              </div>
            </div>
            <div class="donut-legend">
              @for (seg of donutData().segs; track seg.name) {
                <div class="dl-item">
                  <span class="dl-dot" [style.background]="seg.color"></span>
                  <span class="dl-name">{{ seg.name }}</span>
                  <span class="dl-pct">{{ seg.pct }}%</span>
                  <span class="dl-val">{{ seg.amount | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="donut-empty">
            <i class="bi bi-pie-chart"></i>
            <p>Belum ada data pengeluaran per kategori</p>
          </div>
        }
      </div>

      <!-- Insight Mingguan -->
      <div class="card insight-mini">
        @if (store.loading()) {
          <div class="im-hdr">
            <div class="skeleton" style="width:38px;height:38px;border-radius:11px;flex-shrink:0"></div>
            <div style="flex:1">
              <div class="skeleton" style="width:60%;height:13px;border-radius:4px"></div>
            </div>
          </div>
          <div class="skeleton" style="width:100%;height:11px;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="width:85%;height:11px;border-radius:4px;margin-bottom:16px"></div>
          <div class="skeleton" style="width:100%;height:38px;border-radius:10px"></div>
        } @else {
          <div class="im-hdr">
            <div class="im-ico"><i class="bi bi-lightbulb-fill"></i></div>
            <div>
              <div class="im-title">Insight Keuangan</div>
            </div>
          </div>
          <p class="im-text">{{ spendingInsight() }}</p>
          <a routerLink="/reports" class="insights-btn">
            Lihat Analisis <i class="bi bi-arrow-right"></i>
          </a>
        }
      </div>

      <!-- Saving Goals / Payment -->
      <div class="card goals-card">
        <div class="section-hdr">
          <h3 class="section-title">Tujuan &amp; Tabungan</h3>
        </div>
        @if (store.loading()) {
          <div class="goals-list">
            @for (i of [1,2,3]; track i) {
              <div class="goal-item">
                <div class="skeleton" style="width:36px;height:36px;border-radius:10px;flex-shrink:0"></div>
                <div class="goal-body">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <div class="skeleton" style="width:55%;height:11px;border-radius:4px"></div>
                    <div class="skeleton" style="width:24px;height:11px;border-radius:4px"></div>
                  </div>
                  <div class="skeleton" style="width:100%;height:5px;border-radius:3px;margin-bottom:5px"></div>
                  <div class="skeleton" style="width:45%;height:9px;border-radius:4px"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="goals-list">
            <div class="goal-item">
              <div class="goal-ico" style="background:rgba(16,185,129,0.13);color:#10B981;border:1px solid rgba(16,185,129,0.28)">
                <i class="bi bi-piggy-bank-fill"></i>
              </div>
              <div class="goal-body">
                <div class="goal-top">
                  <span class="goal-name">Tabungan Bulan Ini</span>
                  <span class="goal-pct">{{ clamp(savingsRate(),0,100) }}%</span>
                </div>
                <div class="goal-bar">
                  <div class="goal-fill"
                    [style.width.%]="clamp(savingsRate(),0,100)"
                    [style.background]="savingsRate()>=30?'var(--emerald)':savingsRate()>0?'var(--amber)':'var(--red)'"></div>
                </div>
                <span class="goal-sub">Target 30% dari pemasukan</span>
              </div>
            </div>

            @for (pm of paymentGoals(); track pm.name) {
              <div class="goal-item">
                <div class="goal-ico" [style.background]="glassHex(pm.hex)" [style.color]="pm.hex" [style.border]="borderHex(pm.hex)">
                  <i class="bi" [class]="pm.icon"></i>
                </div>
                <div class="goal-body">
                  <div class="goal-top">
                    <span class="goal-name">{{ pm.name }}</span>
                    <span class="goal-pct">{{ pm.pct }}%</span>
                  </div>
                  <div class="goal-bar">
                    <div class="goal-fill" [style.width.%]="pm.pct" [style.background]="pm.hex"></div>
                  </div>
                  <span class="goal-sub">{{ pm.amount | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
    @keyframes fadeUp   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
    @keyframes arcFill  { from { stroke-dasharray:0 210; } }
    @keyframes heroIn   { from { opacity:0; transform:translateY(16px) scale(0.98); } to { opacity:1; transform:none; } }

    .page-prog { margin:0; }
    .dash { display:flex; flex-direction:column; min-height:100%; background:var(--bg); }

    /* ══ GREETING BAR ══ */
    .g-bar {
      display:flex; align-items:center; justify-content:space-between;
      padding:28px 28px 12px; gap:16px; animation:fadeUp 0.3s ease both;
    }
    .greeting      { font-size:1.55rem; font-weight:800; color:var(--text); letter-spacing:-0.03em; margin-bottom:4px; }
    .greeting-sub  { font-size:0.8rem; color:var(--muted); }
    .g-bar-right   { display:flex; align-items:center; gap:10px; flex-shrink:0; }
    .month-pill {
      height:36px; padding:0 14px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface);
      color:var(--muted); font-size:0.8rem; font-weight:600;
      display:flex; align-items:center; gap:6px; white-space:nowrap;
      position:relative; cursor:pointer;
      transition:border-color 0.14s, color 0.14s;
      &:hover { border-color:var(--emerald); color:var(--text); }
    }
    .month-text { pointer-events:none; }
    .month-caret { font-size:0.6rem; pointer-events:none; }
    .month-select-overlay {
      position:absolute; inset:0; opacity:0;
      width:100%; height:100%; cursor:pointer;
    }
    .btn-ghost-sm {
      height:36px; padding:0 14px;
      border:1px solid var(--border); border-radius:10px;
      background:var(--surface); color:var(--muted);
      font-size:0.8rem; font-weight:600; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:7px;
      text-decoration:none; transition:all 0.14s; white-space:nowrap;
      &:hover { border-color:var(--text); color:var(--text); }
    }
    .btn-dark-sm {
      height:36px; padding:0 16px;
      border-radius:10px; border:none;
      background:var(--navy); color:#fff;
      font-size:0.8rem; font-weight:700; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:7px;
      text-decoration:none; transition:all 0.14s; white-space:nowrap;
      box-shadow:0 2px 8px rgba(15,23,42,0.15);
      &:hover { background:#1E293B; }
    }

    /* ══ HERO SKELETON ══ */
    .sk-hero {
      background:linear-gradient(135deg, #022c22 0%, #064e3b 40%, #065f46 70%, #047857 100%);
      border-radius:20px; padding:28px 32px;
      display:flex; align-items:center; justify-content:space-between; gap:24px;
      position:relative; overflow:hidden;
      box-shadow:0 12px 40px rgba(2,44,34,0.5), 0 0 0 1px rgba(16,185,129,0.2);
    }
    .sk-hero-deco-1 {
      position:absolute; top:-60px; right:200px;
      width:200px; height:200px; border-radius:50%;
      background:rgba(52,211,153,0.12); pointer-events:none;
    }
    .sk-hero-deco-2 {
      position:absolute; bottom:-80px; left:40%;
      width:180px; height:180px; border-radius:50%;
      background:rgba(16,185,129,0.08); pointer-events:none;
    }
    .sk-hero-left  { flex:1; min-width:0; position:relative; z-index:1; }
    .sk-hero-right { flex-shrink:0; position:relative; z-index:1; }
    .sk-dark {
      background:linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 75%);
      background-size:800px 100%;
      animation:shimmer 1.4s infinite;
      display:block;
    }

    /* ══ HERO CARD ══ */
    .hero-wrap { padding:0 28px 20px; animation:heroIn 0.4s 0.05s ease both; }
    .hero-card {
      border-radius:20px; padding:28px 32px;
      display:flex; align-items:center; justify-content:space-between; gap:24px;
      position:relative; overflow:hidden;
      box-shadow:0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
      transition:background 0.5s ease;
    }
    .hero-spark {
      position:absolute; bottom:0; left:100px; right:220px; height:80px;
      pointer-events:none; opacity:0.6;
    }
    .hero-deco-1 {
      position:absolute; top:-60px; right:200px;
      width:200px; height:200px; border-radius:50%;
      background:rgba(52,211,153,0.12); pointer-events:none;
    }
    .hero-deco-2 {
      position:absolute; bottom:-80px; left:40%;
      width:180px; height:180px; border-radius:50%;
      background:rgba(16,185,129,0.08); pointer-events:none;
    }

    .hero-left { flex:1; min-width:0; position:relative; z-index:1; }
    .hero-eyebrow-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .hero-eyebrow { font-size:0.75rem; font-weight:600; color:rgba(255,255,255,0.55); letter-spacing:0.06em; text-transform:uppercase; margin:0; }
    .eye-btn {
      width:26px; height:26px; flex-shrink:0;
      background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18);
      border-radius:7px; color:rgba(255,255,255,0.6);
      display:flex; align-items:center; justify-content:center;
      font-size:0.8rem; cursor:pointer;
      transition:all 0.14s;
      &:hover { background:rgba(255,255,255,0.22); color:#fff; }
    }
    .hero-masked { letter-spacing:0.08em; color:rgba(255,255,255,0.55); }
    .hero-balance-row { display:flex; align-items:center; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
    .hero-balance {
      font-size:2.6rem; font-weight:500; color:#fff;
      letter-spacing:-0.05em; line-height:1; font-family:var(--font-mono);
      &.hero-neg { color:#FC8181; }
    }
    .hero-rate-chip {
      display:inline-flex; align-items:center; gap:2px;
      padding:4px 12px; border-radius:99px;
      font-size:0.76rem; font-weight:700; font-family:var(--font-mono);
      &.chip-pos { background:rgba(45,212,191,0.2); color:#5EEAD4; }
      &.chip-neg { background:rgba(239,68,68,0.2); color:#FC8181; }
      i { font-size:1rem; }
    }
    .hero-stats { display:flex; gap:28px; }
    .hero-stat  { display:flex; align-items:center; gap:8px; }
    .hs-dot     { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .hs-inc     { background:#2DD4BF; }
    .hs-exp     { background:#EF4444; }
    .hs-label   { font-size:0.68rem; color:rgba(255,255,255,0.5); font-weight:500; margin-bottom:2px; }
    .hs-val     { font-size:0.9rem; font-weight:700; color:#fff; font-family:var(--font-mono); letter-spacing:-0.02em; }

    .hero-right { flex-shrink:0; position:relative; z-index:1; }
    .hero-score-box {
      background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.22);
      border-radius:16px; padding:16px 20px; min-width:170px; text-align:center;
      backdrop-filter:blur(10px);
    }
    .hsb-inner  { position:relative; width:80px; height:80px; margin:0 auto 8px; }
    .hsb-ring   { width:100%; height:100%; }
    .hsb-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .hsb-val    { font-size:1.4rem; font-weight:800; color:#fff; line-height:1; }
    .hsb-sub    { font-size:0.6rem; color:rgba(255,255,255,0.5); }
    .hsb-label  { font-size:0.82rem; font-weight:700; margin-bottom:6px; }
    .hsb-tip    { font-size:0.68rem; color:rgba(255,255,255,0.5); line-height:1.4; max-width:140px; }

    /* ══ MAIN GRID ══ */
    .main-grid {
      display:grid; grid-template-columns:1fr 300px;
      gap:18px; padding:0 28px 28px; align-items:start; flex:1;
    }
    .col-main { display:flex; flex-direction:column; gap:16px; animation:fadeUp 0.3s 0.1s ease both; }
    .col-side  { display:flex; flex-direction:column; gap:16px; }
    .col-side > *:nth-child(1) { animation:slideIn 0.3s 0.12s ease both; }
    .col-side > *:nth-child(2) { animation:slideIn 0.3s 0.18s ease both; }
    .col-side > *:nth-child(3) { animation:slideIn 0.3s 0.24s ease both; }

    /* ══ CARD BASE ══ */
    .card {
      background:var(--surface); border-radius:16px;
      border:1px solid var(--border);
      box-shadow:0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
      overflow:hidden;
    }

    /* ══ SECTION HEADER ══ */
    .section-hdr {
      display:flex; align-items:center; justify-content:space-between;
      padding:18px 20px 14px;
    }
    .section-title { font-size:0.96rem; font-weight:700; color:var(--text); letter-spacing:-0.02em; margin:0; line-height:1; }
    .view-all {
      font-size:0.75rem; font-weight:600; color:var(--emerald);
      text-decoration:none; display:flex; align-items:center; gap:4px;
      transition:opacity 0.14s; &:hover { opacity:0.7; }
    }

    /* ══ CHART CARD ══ */
    .chart-hdr   { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 20px 14px; }
    .chart-title { font-size:0.96rem; font-weight:700; color:var(--text); letter-spacing:-0.02em; margin-bottom:3px; }
    .chart-sub   { font-size:0.75rem; color:var(--muted); }
    .chart-body  { padding:0 20px 4px; }
    .chart-area  { display:flex; gap:0; align-items:stretch; }
    .y-axis {
      position:relative; width:36px; flex-shrink:0;
      span {
        position:absolute; right:6px;
        transform:translateY(-50%);
        font-size:0.6rem; color:var(--subtle); white-space:nowrap;
        font-family:var(--font-mono);
      }
    }
    .cf-wrap { position:relative; flex:1; min-width:0; }
    .cf-svg  { width:100%; height:148px; display:block; overflow:visible; cursor:crosshair; }
    .cf-tooltip {
      position:absolute; top:6px;
      transform:translateX(-50%);
      background:var(--surface); border:1px solid var(--border);
      border-radius:10px; padding:10px 14px;
      box-shadow:0 4px 20px rgba(15,23,42,0.12);
      pointer-events:none; z-index:20;
      min-width:190px; white-space:nowrap;
      &.tip-right { transform:translateX(-90%); }
    }
    .tip-date  { font-size:0.72rem; font-weight:700; color:var(--muted); margin-bottom:8px; letter-spacing:0.02em; }
    .tip-empty { font-size:0.72rem; color:var(--subtle); font-style:italic; }
    .tip-row  { display:flex; align-items:center; gap:7px; margin-top:5px; }
    .tip-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .tip-key  { font-size:0.72rem; color:var(--muted); flex:1; }
    .tip-val  { font-size:0.78rem; font-weight:700; font-family:var(--font-mono); }
    .inc-val  { color:#2DD4BF; }
    .exp-val  { color:#EF4444; }
    .cf-xaxis {
      display:flex; justify-content:space-between; padding:6px 0 10px;
      span { font-size:0.65rem; color:var(--subtle); }
    }
    .cf-legend {
      display:flex; align-items:center; gap:10px;
      padding:10px 20px 18px; justify-content:center;
    }
    .cf-dot  { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
    .cf-lbl  { font-size:0.75rem; color:var(--muted); font-weight:500; }
    .chart-placeholder {
      height:180px; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      color:var(--subtle); gap:10px; margin:0 20px;
      i { font-size:2rem; }
      p { font-size:0.78rem; text-align:center; max-width:200px; line-height:1.5; }
    }

    /* ══ BOTTOM GRID ══ */
    .bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

    /* ══ TRANSACTION ROWS ══ */
    .sk-row {
      display:flex; align-items:center; gap:12px; padding:12px 20px;
      border-bottom:1px solid var(--border); &:last-child { border:none; }
    }
    .sk-circle { width:42px; height:42px; border-radius:11px; flex-shrink:0; }
    .sk-body { flex:1; } .sk-line { height:14px; border-radius:4px; }

    .tx-row {
      display:flex; align-items:center; gap:12px; padding:12px 20px;
      border-bottom:1px solid var(--border); transition:background 0.12s;
      &:hover { background:rgba(15,23,42,0.02); }
      &.tx-last { border:none; }
    }
    .tx-ico {
      width:46px; height:46px; border-radius:14px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:1.1rem;
    }
    .tx-body  { flex:1; min-width:0; }
    .tx-name  { font-size:0.86rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
    .tx-meta  { display:flex; align-items:center; gap:4px; font-size:0.72rem; color:var(--muted); }
    .meta-dot { color:var(--subtle); }
    .tx-cat-pill {
      display:inline-flex; align-items:center;
      padding:4px 12px; border-radius:20px;
      font-size:0.74rem; font-weight:600;
      flex-shrink:0; white-space:nowrap;
    }
    .tx-amount {
      font-size:0.88rem; font-weight:700; font-family:var(--font-mono); flex-shrink:0;
      &.inc { color:var(--emerald); }
      &.exp { color:var(--red); }
    }
    .tx-empty { padding:32px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--subtle);
      i { font-size:1.8rem; } p { font-size:0.8rem; }
    }

    /* ══ QUICK CARD ══ */
    .quick-card {}
    .qs-list { padding:4px 20px 4px; display:flex; flex-direction:column; gap:4px; }
    .qs-item {
      display:flex; align-items:center; gap:12px;
      padding:10px 0;
      border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
    }
    .qs-ico  {
      width:38px; height:38px; border-radius:12px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:0.95rem;
    }
    .qs-label { flex:1; font-size:0.82rem; font-weight:500; color:var(--text); }
    .qs-val   { font-size:0.84rem; font-weight:700; color:var(--text); font-family:var(--font-mono); letter-spacing:-0.02em; flex-shrink:0; }
    .qs-footer {
      display:flex; align-items:center; gap:8px;
      margin:0 20px; padding:12px 0 16px;
      border-top:1px solid var(--border);
      font-size:0.8rem; color:var(--muted); font-weight:500;
      i { color:var(--subtle); font-size:0.9rem; }
    }

    /* ══ CATEGORY DONUT ══ */
    .cat-card {}
    .donut-wrap { padding:4px 20px 20px; }
    .donut-ring-wrap { position:relative; width:140px; height:140px; margin:0 auto 16px; }
    .donut-svg { width:100%; height:100%; }
    .donut-center {
      position:absolute; inset:0;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
    }
    .dc-lbl { font-size:0.62rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
    .dc-val { font-size:0.85rem; font-weight:700; color:var(--text); font-family:var(--font-mono); letter-spacing:-0.02em; text-align:center; line-height:1.3; }
    .donut-legend { display:flex; flex-direction:column; gap:8px; }
    .dl-item { display:flex; align-items:center; gap:7px; }
    .dl-dot  { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
    .dl-name { font-size:0.76rem; color:var(--text); font-weight:500; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dl-pct  { font-size:0.7rem; color:var(--muted); min-width:28px; text-align:right; }
    .dl-val  { font-size:0.72rem; font-weight:700; color:var(--text); font-family:var(--font-mono); min-width:70px; text-align:right; }
    .donut-empty { padding:24px 20px; text-align:center; color:var(--subtle);
      i { font-size:1.8rem; display:block; margin-bottom:8px; }
      p { font-size:0.8rem; }
    }

    /* ══ INSIGHT MINI ══ */
    .insight-mini { padding:20px; }
    .im-hdr  { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .im-ico  {
      width:38px; height:38px; border-radius:11px;
      background:rgba(217,119,6,0.13); color:#D97706; border:1px solid rgba(217,119,6,0.28);
      display:flex; align-items:center; justify-content:center; font-size:0.95rem; flex-shrink:0;
    }
    .im-title { font-size:0.9rem; font-weight:700; color:var(--text); }
    .im-text  { font-size:0.76rem; color:var(--muted); line-height:1.6; margin-bottom:16px; }
    .insights-btn {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; padding:10px;
      background:var(--emerald); color:#0D0F12;
      border-radius:10px; font-size:0.82rem; font-weight:700;
      text-decoration:none; font-family:var(--font);
      transition:opacity 0.14s; box-shadow:0 4px 14px rgba(45,212,191,0.3);
      &:hover { opacity:0.88; }
    }

    /* ══ GOALS CARD ══ */
    .goals-card {}
    .goals-list { padding:4px 20px 18px; display:flex; flex-direction:column; gap:12px; }
    .goal-item  { display:flex; align-items:center; gap:10px; }
    .goal-ico   {
      width:36px; height:36px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; font-size:0.9rem;
    }
    .goal-body  { flex:1; min-width:0; }
    .goal-top   { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    .goal-name  { font-size:0.76rem; font-weight:600; color:var(--text); }
    .goal-pct   { font-size:0.72rem; font-weight:700; color:var(--muted); font-family:var(--font-mono); }
    .goal-bar   { height:5px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:3px; }
    .goal-fill  { height:100%; border-radius:3px; transition:width 0.7s ease; min-width:3px; }
    .goal-sub   { font-size:0.65rem; color:var(--subtle); }

    /* Shared */
    .income-color  { color:var(--emerald) !important; }
    .expense-color { color:var(--red)     !important; }

    :host-context(body.dark) .tx-row:hover { background:rgba(255,255,255,0.03) !important; }
    :host-context(body.dark) .btn-dark-sm  { background:var(--emerald) !important; color:#0D0F12 !important; }
    :host-context(body.dark) .insights-btn { color:#0D0F12 !important; }
    :host-context(body.dark) .hero-card    { box-shadow:0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.12); }

    /* ══ FILTER MODE ══ */
    .fmode-ctrl { display:flex; flex-direction:row; align-items:center; gap:8px; }
    .fmode-select-wrap {
      height:36px; padding:0 10px 0 12px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface);
      display:flex; align-items:center; gap:7px; position:relative; cursor:pointer;
      transition:border-color 0.14s;
      &:hover { border-color:var(--emerald); }
    }
    .fmode-sel-ico   { font-size:0.78rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .fmode-sel-label { font-size:0.8rem; font-weight:600; color:var(--text); pointer-events:none; flex:1; }
    .fmode-sel-caret { font-size:0.6rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .fmode-select {
      position:absolute; inset:0; opacity:0; width:100%; height:100%;
      cursor:pointer; appearance:none;
    }

    /* ══ RANGE PICKER (host wraps shared component) ══ */
    app-date-range-picker { display:block; }

    @media (max-width: 1100px) {
      .main-grid   { grid-template-columns:1fr; }
      .bottom-grid { grid-template-columns:1fr; }
    }
    @media (max-width: 700px) {
      .g-bar       { padding:20px 16px 10px; flex-wrap:wrap; }
      .hero-wrap   { padding:0 16px 16px; }
      .hero-card   { flex-direction:column; }
      .hero-balance { font-size:1.8rem; }
      .main-grid   { padding:0 16px 20px; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  readonly store = inject(TransactionStore);
  readonly auth  = inject(AuthStore);
  private readonly txService = inject(TransactionService);

  readonly hoverIdx      = signal(-1);
  readonly balanceHidden = signal(localStorage.getItem('balance-hidden') === 'true');
  readonly selMonth      = signal(new Date().getMonth() + 1);
  readonly selYear       = signal(new Date().getFullYear());
  readonly filterMode    = signal<'month'|'year'|'custom'>('month');
  readonly rangeStart    = signal<string>('');
  readonly rangeEnd      = signal<string>('');

  toggleBalance() {
    this.balanceHidden.update(v => !v);
    localStorage.setItem('balance-hidden', String(this.balanceHidden()));
  }

  private readonly MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  monthLabel(): string {
    return `${this.MONTH_NAMES[this.selMonth() - 1]} ${this.selYear()}`;
  }

  periodLabel(): string {
    const mode = this.filterMode();
    if (mode === 'month') return this.monthLabel();
    if (mode === 'year')  return `Tahun ${this.selYear()}`;
    const s = this.rangeStart(), e = this.rangeEnd();
    if (!s || !e) return 'Pilih Rentang';
    return `${this.formatPillDate(s)} – ${this.formatPillDate(e)}`;
  }

  periodShortLabel(): string {
    const mode = this.filterMode();
    if (mode === 'month') return 'Bulan Ini';
    if (mode === 'year')  return 'Tahun Ini';
    return 'Periode Ini';
  }

  formatPillDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  yearOptions(): number[] {
    const now = new Date().getFullYear();
    return [now, now-1, now-2, now-3, now-4];
  }

  onYearChange(e: Event) {
    const y = parseInt((e.target as HTMLSelectElement).value);
    this.selYear.set(y);
    this.loadDashboard();
  }

  setMode(mode: 'month'|'year'|'custom') {
    this.filterMode.set(mode);
    if (mode !== 'custom') this.loadDashboard();
  }

  onRangeChange(range: DateRange) {
    this.rangeStart.set(range.start);
    this.rangeEnd.set(range.end);
    if (range.end) this.loadDashboard();
  }

  clearDateRange() {
    this.rangeStart.set('');
    this.rangeEnd.set('');
  }

  monthOptions(): { key: string; label: string }[] {
    const opts: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ key, label: `${this.MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
  }

  selMonthKey(): string {
    return `${this.selYear()}-${String(this.selMonth()).padStart(2, '0')}`;
  }

  onMonthChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    const [year, month] = val.split('-').map(Number);
    this.selYear.set(year);
    this.selMonth.set(month);
    this.loadDashboard(month, year);
  }

  onChartMove(e: MouseEvent, n: number) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    this.hoverIdx.set(Math.max(0, Math.min(Math.round(pct * (n - 1)), n - 1)));
  }
  onChartLeave() { this.hoverIdx.set(-1); }

  ngOnInit() {
    const now = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.rangeStart.set(`${y}-${pad(m)}-01`);
    this.rangeEnd.set(`${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`);
    this.loadDashboard();
  }

  loadDashboard(month?: number, year?: number) {
    this.store.setLoading(true);
    const mode = this.filterMode();
    const pad  = (n: number) => String(n).padStart(2, '0');
    let startDate: string, endDate: string;

    if (mode === 'month') {
      const m = month ?? this.selMonth();
      const y = year  ?? this.selYear();
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${y}-${pad(m)}-01`;
      endDate   = `${y}-${pad(m)}-${pad(lastDay)}`;
      this.txService.getThisMonth(m, y).subscribe(s => this.store.setMonth(s));
    } else if (mode === 'year') {
      const y = this.selYear();
      startDate = `${y}-01-01`;
      endDate   = `${y}-12-31`;
    } else {
      if (!this.rangeStart() || !this.rangeEnd()) { this.store.setLoading(false); return; }
      startDate = this.rangeStart();
      endDate   = this.rangeEnd();
    }

    this.txService.getToday().subscribe(s => this.store.setToday(s));
    this.txService.getAll({ limit: 10, startDate, endDate }).subscribe(result => {
      this.store.setTransactions(result.data, result.total);
      this.store.setLoading(false);
    });
    this.txService.getAll({ limit: 1000, startDate, endDate }).subscribe(result => {
      this.store.setMonthTxs(result.data);
      if (mode !== 'month') {
        const txs = result.data as any[];
        const totalIncome  = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        this.store.setMonth({ totalIncome, totalExpense, balance: totalIncome - totalExpense });
      }
    });
  }

  timeGreet(): string {
    const h = new Date().getHours();
    if (h < 11) return 'pagi';
    if (h < 15) return 'siang';
    if (h < 18) return 'sore';
    return 'malam';
  }

  firstName(): string {
    const name = this.auth.user()?.name;
    return name ? name.split(' ')[0] : 'Pengguna';
  }

  readonly savingsRate = computed(() => {
    const { totalIncome, totalExpense } = this.store.month();
    if (totalIncome === 0) return 0;
    return Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
  });

  readonly heroBg = computed(() => {
    const r = this.savingsRate();
    if (r > 0) return 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #065f46 70%, #047857 100%)';
    if (r < 0) return 'linear-gradient(135deg, #1a0505 0%, #3b0d0d 40%, #7f1d1d 70%, #991b1b 100%)';
    return     'linear-gradient(135deg, #0c1220 0%, #0f1f40 40%, #172554 70%, #1e3a8a 100%)';
  });

  readonly heroDecoColor = computed(() => {
    const r = this.savingsRate();
    if (r > 0) return 'rgba(52,211,153,0.13)';
    if (r < 0) return 'rgba(239,68,68,0.13)';
    return     'rgba(59,130,246,0.13)';
  });

  absVal(n: number): number { return Math.abs(n); }
  clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

  readonly healthScore = computed(() => this.clamp(Math.round(this.savingsRate() * 1.4 + 30), 0, 100));

  readonly healthRingColor = computed(() => {
    const s = this.healthScore();
    return s >= 80 ? '#2DD4BF' : s >= 60 ? '#3B82F6' : s >= 40 ? '#D97706' : '#EF4444';
  });

  readonly healthLabel = computed(() => {
    const s = this.healthScore();
    return s >= 80 ? 'Sangat Baik' : s >= 60 ? 'Baik' : s >= 40 ? 'Cukup' : 'Kurang';
  });

  readonly healthInsight = computed(() => {
    const s = this.healthScore();
    if (s >= 80) return 'Keuanganmu bulan ini terlihat sangat sehat!';
    if (s >= 60) return 'Keuanganmu cukup baik. Coba tingkatkan tabungan.';
    if (s >= 40) return 'Pengeluaran cukup tinggi. Tetap waspada!';
    return 'Pengeluaran melebihi pemasukan. Segera evaluasi.';
  });

  readonly shortHealthTip = computed(() => {
    const s = this.healthScore();
    if (s >= 80) return 'Pertahankan kebiasaan baikmu!';
    if (s >= 60) return 'Coba tingkatkan tabungan 5% lagi.';
    if (s >= 40) return 'Kurangi pengeluaran non-esensial.';
    return 'Segera evaluasi pola belanjamu.';
  });

  readonly scoreDash = computed(() => {
    const circ = 2 * Math.PI * 32;
    return `${(this.healthScore() / 100) * circ} ${circ}`;
  });

  avgDailyExpense(): number {
    const { totalExpense } = this.store.month();
    const mode = this.filterMode();
    if (mode === 'year') return Math.round(totalExpense / 365);
    if (mode === 'custom') {
      const s = this.rangeStart(), e = this.rangeEnd();
      if (!s || !e) return 0;
      const days = Math.ceil((new Date(e + 'T00:00:00').getTime() - new Date(s + 'T00:00:00').getTime()) / 86400000) + 1;
      return Math.round(totalExpense / (days || 1));
    }
    const now = new Date();
    const selM = this.selMonth() - 1;
    const selY = this.selYear();
    const isCurrentMonth = selY === now.getFullYear() && selM === now.getMonth();
    const divisor = isCurrentMonth ? now.getDate() : new Date(selY, selM + 1, 0).getDate();
    return Math.round(totalExpense / (divisor || 1));
  }

  daysLeft(): number {
    if (this.filterMode() !== 'month') return -1;
    const now = new Date();
    const selM = this.selMonth() - 1;
    const selY = this.selYear();
    if (selY !== now.getFullYear() || selM !== now.getMonth()) return -1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return daysInMonth - now.getDate();
  }

  busiestDay(): string {
    const txByDay = new Map<string, number>();
    for (const tx of this.store.recentTransactions()) {
      if (tx.type === 'EXPENSE') {
        const day = tx.date.slice(0, 10);
        txByDay.set(day, (txByDay.get(day) || 0) + tx.amount);
      }
    }
    if (!txByDay.size) return '-';
    const [date] = [...txByDay.entries()].sort((a, b) => b[1] - a[1])[0];
    const d = new Date(date);
    return `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;
  }

  readonly spendingInsight = computed(() => {
    const cats = this.donutData().segs;
    if (!cats.length) return 'Mulai catat pengeluaran untuk mendapatkan insight kategori terbesar.';
    const top = cats[0];
    return `Pengeluaran terbesar di kategori "${top.name}" sebesar ${top.pct}% dari total pengeluaran bulan ini.`;
  });

  paymentGoals(): { name: string; pct: number; amount: number; hex: string; icon: string }[] {
    const b = this.store.paymentBreakdown();
    const total = b.CASH + b.TRANSFER + b.QRIS;
    return [
      { name: 'Cash',     pct: total ? Math.round(b.CASH     / total * 100) : 0, amount: b.CASH,     hex: '#64748B', icon: 'bi-cash-coin' },
      { name: 'Transfer', pct: total ? Math.round(b.TRANSFER / total * 100) : 0, amount: b.TRANSFER, hex: '#3B82F6', icon: 'bi-bank2' },
      { name: 'QRIS',     pct: total ? Math.round(b.QRIS     / total * 100) : 0, amount: b.QRIS,     hex: '#D97706', icon: 'bi-qr-code-scan' },
    ].filter(p => p.amount > 0);
  }

  private readonly COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#14B8A6','#8B5CF6','#F97316','#06B6D4'];

  readonly donutData = computed((): { segs: { name: string; color: string; amount: number; pct: number; dasharray: string; dashoffset: number }[]; total: number } => {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const txs = this.store.recentTransactions().filter(t => t.type === 'EXPENSE');
    const map: Record<string, { amount: number; color: string }> = {};
    let ci = 0;
    for (const tx of txs) {
      const key = tx.category?.name ?? 'Lainnya';
      if (!map[key]) map[key] = { amount: 0, color: this.COLORS[ci++ % this.COLORS.length] };
      map[key].amount += tx.amount;
    }
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0);
    if (total === 0) return { segs: [], total: 0 };
    let offset = 0;
    const segs = Object.entries(map)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 6)
      .map(([name, { amount, color }]) => {
        const pct = amount / total;
        const dash = pct * circ;
        const seg = { name, color, amount, pct: Math.round(pct * 100), dasharray: `${dash} ${circ}`, dashoffset: -offset };
        offset += dash;
        return seg;
      });
    return { segs, total };
  });

  readonly cashFlowData = computed((): {
    iPath: string; iArea: string; ePath: string; eArea: string;
    iCoords: {x:number;y:number}[]; eCoords: {x:number;y:number}[];
    labels: string[];
    grids: { label: string; yPct: number }[];
    pts: { dateLabel: string; dailyI: number; dailyE: number; hasTx: boolean }[];
  } | null => {
    const mode = this.filterMode();
    if (mode === 'year')   return this.yearlyCashFlowData();
    if (mode === 'custom') return this.rangedCashFlowData();

    const now   = new Date();
    const year  = this.selYear();
    const month = this.selMonth() - 1;  // 0-indexed
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = isCurrentMonth ? now.getDate() : daysInMonth;
    if (today < 2) return null;

    const dailyMap = new Map<number, { income: number; expense: number }>();
    for (const tx of this.store.monthTxs()) {
      const d = new Date(tx.date);
      const day = d.getDate();
      const cur = dailyMap.get(day) ?? { income: 0, expense: 0 };
      if (tx.type === 'INCOME') cur.income += tx.amount;
      else cur.expense += tx.amount;
      dailyMap.set(day, cur);
    }

    let cumI = 0, cumE = 0;
    const rawPts: { dateLabel: string; dailyI: number; dailyE: number; hasTx: boolean; cumI: number; cumE: number }[] = [];
    for (let day = 1; day <= today; day++) {
      const v = dailyMap.get(day) ?? { income: 0, expense: 0 };
      cumI += v.income; cumE += v.expense;
      const dd = new Date(year, month, day);
      rawPts.push({
        dateLabel: dd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        dailyI: v.income, dailyE: v.expense,
        hasTx: v.income > 0 || v.expense > 0,
        cumI, cumE,
      });
    }

    return this.buildChartFromPts(rawPts, rawPts.map((_, i) => String(i + 1)), 5);
  });

  private yearlyCashFlowData(): ReturnType<DashboardComponent['cashFlowData']> {
    const year = this.selYear();
    const MN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    const monthMap = new Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
    for (const tx of this.store.monthTxs()) {
      const m = new Date(tx.date).getMonth();
      if (tx.type === 'INCOME') monthMap[m].income += tx.amount;
      else monthMap[m].expense += tx.amount;
    }
    let cumI = 0, cumE = 0;
    const rawPts = monthMap.map((v, i) => {
      cumI += v.income; cumE += v.expense;
      return { dateLabel: `${MN[i]} ${year}`, dailyI: v.income, dailyE: v.expense,
               hasTx: v.income > 0 || v.expense > 0, cumI, cumE };
    });
    return this.buildChartFromPts(rawPts, MN, 12);
  }

  private rangedCashFlowData(): ReturnType<DashboardComponent['cashFlowData']> {
    const startStr = this.rangeStart(), endStr = this.rangeEnd();
    if (!startStr || !endStr) return null;
    const startD = new Date(startStr + 'T00:00:00');
    const endD   = new Date(endStr   + 'T00:00:00');
    const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / 86400000) + 1;
    if (totalDays < 2) return null;

    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (const tx of this.store.monthTxs()) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const cur = dailyMap.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === 'INCOME') cur.income += tx.amount;
      else cur.expense += tx.amount;
      dailyMap.set(key, cur);
    }

    let cumI = 0, cumE = 0;
    const rawPts: { dateLabel: string; dailyI: number; dailyE: number; hasTx: boolean; cumI: number; cumE: number }[] = [];
    const xLabels: string[] = [];
    for (let d = 0; d < totalDays; d++) {
      const date = new Date(startD);
      date.setDate(date.getDate() + d);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const v = dailyMap.get(key) ?? { income: 0, expense: 0 };
      cumI += v.income; cumE += v.expense;
      rawPts.push({ dateLabel: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                    dailyI: v.income, dailyE: v.expense, hasTx: v.income > 0 || v.expense > 0, cumI, cumE });
      xLabels.push(`${date.getDate()}/${date.getMonth()+1}`);
    }
    return this.buildChartFromPts(rawPts, xLabels, 5);
  }

  private buildChartFromPts(
    rawPts: { dateLabel: string; dailyI: number; dailyE: number; hasTx: boolean; cumI: number; cumE: number }[],
    allLabels: string[], maxLabels: number
  ): ReturnType<DashboardComponent['cashFlowData']> {
    if (!rawPts.length) return null;
    const W = 560, H = 148, PY = 12;
    const iMaxV = niceMax(Math.max(...rawPts.map(p => p.cumI), 1));
    const eMaxV = niceMax(Math.max(...rawPts.map(p => p.cumE), 1));
    const toYI = (v: number) => H - PY - (v / iMaxV) * (H - PY * 2);
    const toYE = (v: number) => H - PY - (v / eMaxV) * (H - PY * 2);
    const n = rawPts.length;
    const iCoords = rawPts.map((p, i) => ({ x: (i / Math.max(n-1, 1)) * W, y: toYI(p.cumI) }));
    const eCoords = rawPts.map((p, i) => ({ x: (i / Math.max(n-1, 1)) * W, y: toYE(p.cumE) }));
    const iPath   = catmullRom(iCoords);
    const ePath   = catmullRom(eCoords);
    const iArea   = `${iPath} L ${W},${H} L 0,${H} Z`;
    const eArea   = `${ePath} L ${W},${H} L 0,${H} Z`;
    const grids = [0,1,2,3].map(i => {
      const val = (eMaxV / 3) * i;
      return { label: fmtY(val), yPct: (toYE(val) / H) * 100 };
    }).reverse();
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const labels: string[] = [];
    for (let i = 0; i < n; i++) {
      if (i % step === 0 || i === n - 1) { labels.push(allLabels[i]); if (labels.length >= maxLabels) break; }
    }
    return { iPath, iArea, ePath, eArea, iCoords, eCoords, labels, grids,
      pts: rawPts.map(({ dateLabel, dailyI, dailyE, hasTx }) => ({ dateLabel, dailyI, dailyE, hasTx })) };
  }

  readonly heroSparkline = computed((): string => {
    const txs = this.store.monthTxs();
    if (txs.length < 2) return '';
    const now = new Date();
    const today = now.getDate();
    const dailyMap = new Map<number, number>();
    for (const tx of txs) {
      const d = new Date(tx.date);
      const day = d.getDate();
      const delta = tx.type === 'INCOME' ? tx.amount : -tx.amount;
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + delta);
    }
    let cum = 0;
    const vals: number[] = [];
    for (let d = 1; d <= today; d++) { cum += dailyMap.get(d) ?? 0; vals.push(cum); }
    if (vals.length < 2) return '';
    const W = 240, H = 64;
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const coords = vals.map((v, i) => ({
      x: (i / (vals.length - 1)) * W,
      y: H - 4 - ((v - min) / range) * (H - 8),
    }));
    return catmullRom(coords);
  });

  txIcon(tx: any): string {
    const s = ((tx.category?.name ?? '') + tx.description).toLowerCase();
    if (tx.type === 'INCOME') return 'bi-wallet-fill';
    if (s.includes('makan') || s.includes('food') || s.includes('kopi') || s.includes('resto') || s.includes('soto') || s.includes('nasi')) return 'bi-cup-hot-fill';
    if (s.includes('bensin') || s.includes('bbm') || s.includes('pertalite') || s.includes('pertamax')) return 'bi-fuel-pump-fill';
    if (s.includes('transport') || s.includes('ojek') || s.includes('grab') || s.includes('gojek')) return 'bi-car-front-fill';
    if (s.includes('belanja') || s.includes('shop') || s.includes('beli') || s.includes('groceries') || s.includes('indomaret') || s.includes('alfamart')) return 'bi-cart-fill';
    if (s.includes('listrik') || s.includes('tagihan') || s.includes('bayar') || s.includes('token')) return 'bi-lightning-charge-fill';
    if (s.includes('hiburan') || s.includes('nonton') || s.includes('game')) return 'bi-controller';
    if (s.includes('sedekah') || s.includes('donasi') || s.includes('zakat') || s.includes('infaq')) return 'bi-heart-fill';
    if (s.includes('kesehatan') || s.includes('dokter') || s.includes('obat') || s.includes('klinik')) return 'bi-hospital-fill';
    return 'bi-receipt-cutoff';
  }

  pmLabel(pm: string): string {
    return { CASH: 'Cash', QRIS: 'QRIS', TRANSFER: 'Transfer' }[pm] ?? pm;
  }

  txCatLabel(tx: any): string {
    return tx.category?.name ?? (tx.type === 'INCOME' ? 'Pemasukan' : 'Lainnya');
  }

  txCatBg(tx: any): string {
    const hex = tx.category?.color ?? (tx.type === 'INCOME' ? '#10B981' : '#6366F1');
    return hex + '22';
  }

  txCatColor(tx: any): string {
    return tx.category?.color ?? (tx.type === 'INCOME' ? '#059669' : '#6366F1');
  }

  nextMonthName(): string {
    const d = new Date(this.selYear(), this.selMonth(), 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  private txSolidColor(tx: any): string {
    const s = ((tx.category?.name ?? '') + tx.description).toLowerCase();
    if (tx.type === 'INCOME') return '#059669';
    if (s.includes('makan') || s.includes('food') || s.includes('kopi') || s.includes('resto')) return '#10B981';
    if (s.includes('bensin') || s.includes('transport') || s.includes('ojek') || s.includes('grab')) return '#3B82F6';
    if (s.includes('belanja') || s.includes('shop') || s.includes('beli') || s.includes('groceries')) return '#8B5CF6';
    if (s.includes('listrik') || s.includes('tagihan') || s.includes('bayar')) return '#EF4444';
    if (s.includes('hiburan') || s.includes('nonton')) return '#F59E0B';
    if (s.includes('sedekah') || s.includes('donasi') || s.includes('zakat')) return '#10B981';
    return '#6366F1';
  }

  glassHex(hex: string, alpha = 0.13): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  borderHex(hex: string, alpha = 0.28): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `1px solid rgba(${r},${g},${b},${alpha})`;
  }
  txBg(tx: any): string          { return this.glassHex(this.txSolidColor(tx)); }
  txColor(tx: any): string       { return this.txSolidColor(tx); }
  txBorderStyle(tx: any): string { return this.borderHex(this.txSolidColor(tx)); }
}
