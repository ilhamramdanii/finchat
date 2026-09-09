import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReportService } from '../../core/services/report.service';
import { NotificationStore } from '../../store/notification.store';
import { MonthlyReport, YearlyReport, RangeReport, DailyTotal, MonthlyBreakdown } from '@wa-finance/shared';

type FilterMode = 'month' | 'year' | 'custom';
type AnyReport  = MonthlyReport | YearlyReport | RangeReport;

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, ReactiveFormsModule,
    MatFormFieldModule, MatSelectModule, MatProgressBarModule,
  ],
  template: `
<div class="page">

  @if (loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ PAGE BAR ══ -->
  <div class="r-top-bar">
    <div class="r-top-left">
      <div class="r-top-ico"><i class="bi bi-bar-chart-fill"></i></div>
      <div>
        <h1 class="r-top-title">Laporan Keuangan</h1>
        @if (report()) {
          <p class="r-top-sub">{{ reportLabel() }}</p>
        } @else {
          <p class="r-top-sub">Pilih periode untuk melihat laporan</p>
        }
      </div>
    </div>
    <div class="r-top-right">
      <!-- Mode selector -->
      <div class="r-mode-sel-wrap">
        <i class="bi bi-calendar3 r-mode-sel-ico"></i>
        <span class="r-mode-sel-label">{{ filterMode()==='month' ? 'Bulanan' : filterMode()==='year' ? 'Tahunan' : 'Custom' }}</span>
        <i class="bi bi-chevron-down r-mode-sel-caret"></i>
        <select class="r-mode-select" [value]="filterMode()" (change)="setMode($any($event.target).value)">
          <option value="month">Bulanan</option>
          <option value="year">Tahunan</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <form [formGroup]="form" (ngSubmit)="load()">
        <div class="r-period-pill">
          <i class="bi bi-calendar3 rpp-ico"></i>
          @if (filterMode() === 'month') {
            <mat-select formControlName="month" class="rpp-sel" [panelWidth]="150">
              @for (m of months; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
            <mat-select formControlName="year" class="rpp-sel rpp-yr" [panelWidth]="90">
              @for (y of years; track y) { <mat-option [value]="y">{{ y }}</mat-option> }
            </mat-select>
          } @else if (filterMode() === 'year') {
            <mat-select formControlName="year" class="rpp-sel" [panelWidth]="90">
              @for (y of years; track y) { <mat-option [value]="y">{{ y }}</mat-option> }
            </mat-select>
          } @else {
            <button type="button" class="rpp-range-btn" (click)="toggleDatePicker()">
              <span class="rpp-range-from">{{ displayRangeDate(form.value.startDate) }}</span>
              <span class="rpp-range-arrow">→</span>
              <span class="rpp-range-to">{{ displayRangeDate(form.value.endDate) }}</span>
            </button>
          }
          <button class="rpp-btn" type="submit" [disabled]="loading()">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </form>
      @if (report() && !loading()) {
        <button class="r-icon-btn" (click)="printPage()" title="Print"><i class="bi bi-printer"></i></button>
        <button class="r-icon-btn" (click)="exportDailyCSV()" title="Export CSV"><i class="bi bi-download"></i></button>
      }
    </div>
  </div>

  <!-- ══ HERO ══ -->
  <div class="r-hero-wrap">
    <div class="r-hero" [style.background]="heroBg()">
      <div class="r-hero-deco-1" [style.background]="heroDecoColor()"></div>
      <div class="r-hero-deco-2" [style.background]="heroDecoColor()"></div>

      <!-- Left: main content -->
      <div class="r-hero-main">
        @if (loading()) {
          <div class="sk-r-dark" style="width:130px;height:9px;border-radius:4px;margin-bottom:14px"></div>
          <div class="r-hero-balance-row" style="margin-bottom:22px">
            <div class="sk-r-dark" style="width:260px;height:40px;border-radius:8px"></div>
            <div class="sk-r-dark" style="width:86px;height:26px;border-radius:99px"></div>
          </div>
          <div class="r-hero-stats">
            @for (i of [1,2,3]; track i) {
              <div class="r-stat-pill">
                <div class="sk-r-dark" style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>
                <div>
                  <div class="sk-r-dark" style="width:64px;height:8px;border-radius:4px;margin-bottom:6px"></div>
                  <div class="sk-r-dark" style="width:100px;height:13px;border-radius:4px"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          @if (report(); as r) {
            <p class="r-hero-eyebrow-main">Total Saldo · {{ reportLabel() }}</p>
            <div class="r-hero-balance-row">
              <h1 class="r-hero-balance" [class.r-neg]="r.balance < 0">
                {{ r.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
              </h1>
              <span class="r-hero-chip" [class.r-chip-pos]="r.balance>=0" [class.r-chip-neg]="r.balance<0">
                <i class="bi" [class.bi-trending-up]="r.balance>=0" [class.bi-trending-down]="r.balance<0"></i>
                {{ r.balance >= 0 ? 'Surplus' : 'Defisit' }}
              </span>
            </div>
            <div class="r-hero-stats">
              <div class="r-stat-pill">
                <span class="r-stat-pill-dot r-dot-inc"></span>
                <div>
                  <div class="r-stat-pill-lbl">Pemasukan</div>
                  <div class="r-stat-pill-val">{{ r.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
                </div>
              </div>
              <div class="r-stat-pill">
                <span class="r-stat-pill-dot r-dot-exp"></span>
                <div>
                  <div class="r-stat-pill-lbl">Pengeluaran</div>
                  <div class="r-stat-pill-val">{{ r.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
                </div>
              </div>
              <div class="r-stat-pill">
                <span class="r-stat-pill-dot" [style.background]="savingsRate()>=0?'#2DD4BF':'#FC8181'"></span>
                <div>
                  <div class="r-stat-pill-lbl">Savings Rate</div>
                  <div class="r-stat-pill-val" [style.color]="savingsRate()>=0?'#5EEAD4':'#FC8181'">{{ savingsDisplayRate() }}</div>
                </div>
              </div>
            </div>
          } @else {
            <p class="r-hero-hint">{{ heroHint() }}</p>
          }
        }
      </div>

      <!-- Right: health score -->
      @if (loading()) {
        <div class="r-hero-score">
          <div class="sk-r-dark" style="width:80px;height:8px;border-radius:4px;margin:0 auto 16px"></div>
          <div class="sk-r-dark" style="width:100px;height:100px;border-radius:50%;margin:0 auto 14px"></div>
          <div class="sk-r-dark" style="width:90px;height:13px;border-radius:5px;margin:0 auto 8px"></div>
          <div class="sk-r-dark" style="width:130px;height:9px;border-radius:4px;margin:0 auto 4px"></div>
          <div class="sk-r-dark" style="width:100px;height:9px;border-radius:4px;margin:0 auto"></div>
        </div>
      } @else if (report()) {
        <div class="r-hero-score">
          <p class="r-score-eyebrow">Skor Kesehatan</p>
          <div class="r-hsb-inner">
            <svg viewBox="0 0 100 100" class="r-hsb-ring">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
              <circle cx="50" cy="50" r="40" fill="none"
                [attr.stroke]="healthColor()"
                stroke-width="8" stroke-linecap="round"
                [attr.stroke-dasharray]="heroRingDash()"
                stroke-dashoffset="62.8"
                transform="rotate(-90 50 50)"/>
            </svg>
            <div class="r-hsb-center">
              <span class="r-hsb-val">{{ healthScore() }}</span>
              <span class="r-hsb-sub">/100</span>
            </div>
          </div>
          <div class="r-hsb-label" [style.color]="healthColor()">{{ healthRating() }}</div>
          <div class="r-hsb-tip">{{ healthTip() }}</div>
        </div>
      }
    </div>
  </div>


  <!-- ══ MAIN GRID ══ -->
  <div class="main-grid">

    <!-- ─ LEFT COLUMN ─ -->
    <div class="col-main">

      @if (loading()) {
        <!-- Tab content skeleton -->
        <div style="display:flex;flex-direction:column;gap:14px">
          @for (i of [1,2,3]; track i) {
            <div class="card" style="padding:20px;display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                <div class="skeleton" style="width:28px;height:28px;border-radius:8px;flex-shrink:0"></div>
                <div class="skeleton" style="width:180px;height:14px;border-radius:5px"></div>
              </div>
              <div class="skeleton" style="width:100%;height:10px;border-radius:4px"></div>
              <div class="skeleton" style="width:100%;height:10px;border-radius:4px"></div>
              <div class="skeleton" style="width:75%;height:10px;border-radius:4px"></div>
              <div class="skeleton" style="width:100%;height:40px;border-radius:8px;margin-top:4px"></div>
            </div>
          }
        </div>
      } @else {
      @if (report(); as r) {

        <!-- ═ RINGKASAN ═ -->
        @if (tab() === 'overview') {
          <div class="tab-panel fade-in">

            <div class="card">
              <div class="section-hdr">
                <h3 class="section-title">Breakdown per Kategori</h3>
                <span class="view-all" (click)="tab.set('insights')" style="cursor:pointer">Detail →</span>
              </div>
              <div class="ov-cat-list">
                @for (cat of r.byCategory; track cat.categoryId) {
                  <div class="ov-cat-row">
                    <div class="ov-cat-ico"
                      [style.background]="glassHex(vibrantCatColor(cat.categoryName))"
                      [style.color]="vibrantCatColor(cat.categoryName)"
                      [style.border]="borderHex(vibrantCatColor(cat.categoryName))">
                      <i class="bi" [class]="catIcon(cat.categoryName)"></i>
                    </div>
                    <div class="ov-cat-info">
                      <div class="ov-cat-top">
                        <span class="ov-cat-name">{{ cat.categoryName }}</span>
                        <span class="ov-cat-right">
                          <span class="ov-cat-amount" [class.income-color]="cat.type==='INCOME'" [class.expense-color]="cat.type==='EXPENSE'">
                            {{ cat.total | currency:'IDR':'symbol':'1.0-0':'id' }}
                          </span>
                          <span class="ov-cat-pct">{{ cat.percentage }}%</span>
                        </span>
                      </div>
                      <div class="ov-cat-track">
                        <div class="ov-cat-fill" [style.width.%]="cat.percentage" [style.background]="cat.categoryColor || 'var(--emerald)'"></div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="cat-empty"><i class="bi bi-inbox"></i><p>Tidak ada data kategori</p></div>
                }
              </div>
            </div>

          </div>
        }

        <!-- ═ HARIAN ═ -->
        @if (tab() === 'daily') {
          <div class="tab-panel fade-in">

            <div class="card">
              <div class="section-hdr">
                <div class="shdr-left">
                  <div class="hd-ico emerald-ico"><i class="bi bi-bar-chart-fill"></i></div>
                  <h3 class="section-title">{{ filterMode() === 'year' ? 'Arus Kas Bulanan' : 'Arus Kas Harian' }}</h3>
                  <span class="card-count">{{ reportLabel() }}</span>
                </div>
                <div class="chart-legend">
                  <span class="legend-dot" style="background:var(--emerald)"></span><span class="legend-lbl">Pemasukan</span>
                  <span class="legend-dot" style="background:var(--red)"></span><span class="legend-lbl">Pengeluaran</span>
                </div>
              </div>
              @if (filterMode() === 'year') {
                <!-- ─ YEARLY: monthly bar chart ─ -->
                <div class="chart-wrap" (mousemove)="onDailyMove($event)" (mouseleave)="hoveredDay.set(-1)">
                  @if (monthlyChartBars().length > 0) {
                    <svg [attr.viewBox]="'0 0 ' + svgW + ' 158'" preserveAspectRatio="none" class="daily-svg">
                      <line x1="0" [attr.y1]="130 - barH(0,1)*0" [attr.x2]="svgW" y1="130" y2="130" stroke="var(--border)" stroke-width="0.8"/>
                      @for (b of monthlyChartBars(); track b.month) {
                        <rect [attr.x]="b.incX" [attr.y]="130-b.incH" [attr.width]="barW" [attr.height]="b.incH" rx="2" fill="var(--emerald)" opacity="0.9"/>
                        <rect [attr.x]="b.expX" [attr.y]="130-b.expH" [attr.width]="barW" [attr.height]="b.expH" rx="2" fill="var(--red)" opacity="0.8"/>
                        <text [attr.x]="b.incX + barW" y="148" text-anchor="middle" font-size="7.5" fill="var(--muted)">{{ b.label }}</text>
                      }
                    </svg>
                  } @else {
                    <div class="chart-empty"><i class="bi bi-bar-chart"></i><p>Data bulanan belum tersedia</p></div>
                  }
                </div>
              } @else {
                <!-- ─ MONTHLY/CUSTOM: daily bar chart ─ -->
                <div class="chart-wrap" (mousemove)="onDailyMove($event)" (mouseleave)="hoveredDay.set(-1)">
                  @if (daily().length > 0) {
                    <svg [attr.viewBox]="'0 0 ' + svgW + ' 158'" preserveAspectRatio="none" class="daily-svg">
                      <line x1="0" [attr.y1]="130 - barH(chartMax()*0.75,chartMax())" [attr.x2]="svgW" [attr.y2]="130 - barH(chartMax()*0.75,chartMax())" stroke="var(--border)" stroke-width="0.6"/>
                      <line x1="0" [attr.y1]="130 - barH(chartMax()*0.5, chartMax())" [attr.x2]="svgW" [attr.y2]="130 - barH(chartMax()*0.5, chartMax())" stroke="var(--border)" stroke-width="0.6"/>
                      <line x1="0" [attr.y1]="130 - barH(chartMax()*0.25,chartMax())" [attr.x2]="svgW" [attr.y2]="130 - barH(chartMax()*0.25,chartMax())" stroke="var(--border)" stroke-width="0.6"/>
                      <line x1="0" y1="130" [attr.x2]="svgW" y2="130" stroke="var(--border)" stroke-width="0.8"/>
                      @if (hoveredDay() >= 1) {
                        <rect [attr.x]="(hoveredDay()-1) * svgW / 31" y="0"
                              [attr.width]="svgW / 31" height="130"
                              fill="rgba(0,0,0,0.05)" rx="2"/>
                        <line [attr.x1]="(hoveredDay() - 0.5) * svgW / 31"
                              [attr.x2]="(hoveredDay() - 0.5) * svgW / 31"
                              y1="0" y2="130"
                              stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>
                      }
                      @for (b of dailyBars(); track b.day) {
                        <rect [attr.x]="b.incX" [attr.y]="130-b.incH" [attr.width]="barW" [attr.height]="b.incH" rx="2" fill="var(--emerald)"
                          [attr.opacity]="hoveredDay() < 1 || b.day === hoveredDay() ? '0.9' : '0.3'">
                        </rect>
                        <rect [attr.x]="b.expX" [attr.y]="130-b.expH" [attr.width]="barW" [attr.height]="b.expH" rx="2" fill="var(--red)"
                          [attr.opacity]="hoveredDay() < 1 || b.day === hoveredDay() ? '0.8' : '0.25'">
                        </rect>
                      }
                      @for (lbl of fixedXLabels(); track lbl.label) {
                        <text [attr.x]="lbl.x" y="148" text-anchor="middle" font-size="8" fill="var(--muted)">{{ lbl.label }}</text>
                      }
                    </svg>
                    @if (hoveredDay() >= 1) {
                      <div class="daily-tooltip"
                        [style.left]="((hoveredDay() - 0.5) / 31 * 100) + '%'"
                        [class.dtip-right]="hoveredDay() > 20">
                        <div class="dtip-date">{{ hoveredDayLabel() }}</div>
                        @if (hoveredDayEntry(); as entry) {
                          <div class="dtip-row">
                            <span class="dtip-dot" style="background:var(--emerald)"></span>
                            <span class="dtip-key">Pemasukan</span>
                            <span class="dtip-val" style="color:var(--emerald)">{{ entry.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                          </div>
                          <div class="dtip-row">
                            <span class="dtip-dot" style="background:var(--red)"></span>
                            <span class="dtip-key">Pengeluaran</span>
                            <span class="dtip-val" style="color:var(--red)">{{ entry.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                          </div>
                          <div class="dtip-net" [class.pos]="entry.balance>=0" [class.neg]="entry.balance<0">
                            Net: {{ entry.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
                          </div>
                        } @else {
                          <div class="dtip-empty">Tidak ada transaksi</div>
                        }
                      </div>
                    }
                  } @else {
                    <div class="chart-empty"><i class="bi bi-bar-chart"></i><p>Data harian belum tersedia</p></div>
                  }
                </div>
              }
            </div>

            @if (filterMode() === 'year') {
              <!-- ─ YEARLY breakdown table ─ -->
              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico blue-ico"><i class="bi bi-calendar-month-fill"></i></div>
                    <h3 class="section-title">Breakdown Per Bulan</h3>
                    <span class="card-count">{{ asYearly(report())?.year }}</span>
                  </div>
                  <button class="btn-exp-sm" (click)="exportDailyCSV()"><i class="bi bi-download"></i> CSV</button>
                </div>
                <div class="yearly-month-table">
                  <div class="ymt-head">
                    <span>Bulan</span><span>Pemasukan</span><span>Pengeluaran</span><span>Saldo</span>
                  </div>
                  @for (m of yearlyMonthlyBreakdown(); track m.month) {
                    <div class="ymt-row" [class.ymt-row-pos]="m.balance >= 0" [class.ymt-row-neg]="m.balance < 0">
                      <span class="ymt-month">{{ months[m.month - 1].label }}</span>
                      <div class="ymt-bar-cell">
                        <div class="ymt-bar-track"><div class="ymt-bar-fill ymt-inc" [style.width.%]="m.pctInc"></div></div>
                        <span class="ymt-val income-color">{{ m.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      </div>
                      <div class="ymt-bar-cell">
                        <div class="ymt-bar-track"><div class="ymt-bar-fill ymt-exp" [style.width.%]="m.pctExp"></div></div>
                        <span class="ymt-val expense-color">{{ m.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      </div>
                      <span class="ymt-val ymt-net" [class.income-color]="m.balance >= 0" [class.expense-color]="m.balance < 0">
                        {{ m.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
                      </span>
                    </div>
                  } @empty {
                    <div class="cat-empty"><i class="bi bi-calendar"></i><p>Tidak ada data</p></div>
                  }
                </div>
              </div>
            } @else {
            <div class="harian-grid">

              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico blue-ico"><i class="bi bi-calendar-week-fill"></i></div>
                    <h3 class="section-title">Ringkasan Mingguan</h3>
                  </div>
                </div>
                <div class="weekly-table">
                  <div class="wt-head">
                    <span>Periode</span><span>Pemasukan</span><span>Pengeluaran</span><span>Saldo</span>
                  </div>
                  @for (w of weeklyBreakdown(); track w.label) {
                    <div class="wt-row">
                      <span class="wt-label">{{ w.label }}</span>
                      <span class="wt-val income-color">{{ w.income | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      <span class="wt-val expense-color">{{ w.expense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      <span class="wt-val" [class.income-color]="w.balance>=0" [class.expense-color]="w.balance<0">
                        {{ w.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
                      </span>
                    </div>
                  } @empty {
                    <div class="cat-empty"><i class="bi bi-calendar"></i><p>Tidak ada data</p></div>
                  }
                </div>
              </div>

              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico amber-ico"><i class="bi bi-list-ul"></i></div>
                    <h3 class="section-title">Detail Per Hari</h3>
                    <span class="card-count">{{ daily().length }} hari</span>
                  </div>
                  <button class="btn-exp-sm" (click)="exportDailyCSV()"><i class="bi bi-download"></i> CSV</button>
                </div>
                <div class="daily-list">
                  @for (d of daily(); track d.date) {
                    <div class="daily-row">
                      <div class="daily-date">
                        <span class="daily-day">{{ dayName(d.date) }}</span>
                        <span class="daily-datenum">{{ formatDate(d.date) }}</span>
                      </div>
                      <div class="daily-bars-inline">
                        <div class="dbi-item">
                          <span class="dbi-dot" style="background:var(--emerald)"></span>
                          <div class="dbi-track"><div class="dbi-fill" style="background:var(--emerald)"
                            [style.width.%]="r.totalIncome>0?(d.totalIncome/r.totalIncome)*100:0"></div></div>
                        </div>
                        <div class="dbi-item">
                          <span class="dbi-dot" style="background:var(--red)"></span>
                          <div class="dbi-track"><div class="dbi-fill" style="background:var(--red)"
                            [style.width.%]="r.totalExpense>0?(d.totalExpense/r.totalExpense)*100:0"></div></div>
                        </div>
                      </div>
                      <div class="daily-amounts">
                        @if (d.totalIncome>0) { <span class="da-item income-color">+{{ d.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span> }
                        @if (d.totalExpense>0) { <span class="da-item expense-color">-{{ d.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span> }
                      </div>
                      <div class="daily-net" [class.income-color]="d.balance>=0" [class.expense-color]="d.balance<0">
                        {{ d.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
                      </div>
                    </div>
                  } @empty {
                    <div class="cat-empty"><i class="bi bi-calendar-x"></i><p>Tidak ada data harian</p></div>
                  }
                </div>
              </div>

            </div>
            }

          </div>
        }

        <!-- ═ KALENDER ═ -->
        @if (tab() === 'calendar') {
          <div class="tab-panel fade-in">

            @if (filterMode() === 'year') {
              <!-- ─ YEARLY: 12-month grid ─ -->
              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico emerald-ico"><i class="bi bi-calendar-range-fill"></i></div>
                    <h3 class="section-title">Kalender Tahunan</h3>
                    <span class="card-count">{{ asYearly(report())?.year }}</span>
                  </div>
                </div>
                <div class="yearly-cal-grid">
                  @for (m of yearlyMonthlyBreakdown(); track m.month) {
                    <div class="ycal-card" [class.ycal-pos]="m.balance >= 0" [class.ycal-neg]="m.balance < 0" [class.ycal-zero]="m.totalIncome === 0 && m.totalExpense === 0">
                      <div class="ycal-hdr">
                        <span class="ycal-month">{{ months[m.month - 1].label }}</span>
                        <span class="ycal-badge" [class.ycal-badge-pos]="m.balance >= 0" [class.ycal-badge-neg]="m.balance < 0">
                          {{ m.balance >= 0 ? '+' : '' }}{{ shortIDR(m.balance) }}
                        </span>
                      </div>
                      <div class="ycal-bars">
                        <div class="ycal-bar-row">
                          <span class="ycal-dot" style="background:var(--emerald)"></span>
                          <div class="ycal-track"><div class="ycal-fill ycal-inc" [style.width.%]="m.pctInc"></div></div>
                        </div>
                        <div class="ycal-bar-row">
                          <span class="ycal-dot" style="background:var(--red)"></span>
                          <div class="ycal-track"><div class="ycal-fill ycal-exp" [style.width.%]="m.pctExp"></div></div>
                        </div>
                      </div>
                      <div class="ycal-vals">
                        <span class="income-color">{{ m.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                        <span class="expense-color">{{ m.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @else if (filterMode() === 'custom') {
              <!-- ─ CUSTOM: redirect hint ─ -->
              <div class="card" style="padding:40px 24px;text-align:center;color:var(--subtle)">
                <i class="bi bi-calendar-range" style="font-size:2.5rem;display:block;margin-bottom:12px;color:var(--muted)"></i>
                <p style="font-size:0.9rem;font-weight:600;color:var(--text);margin-bottom:6px">Kalender tidak tersedia untuk Custom Range</p>
                <p style="font-size:0.8rem">Gunakan tab <strong>Harian</strong> untuk melihat data per tanggal dalam rentang yang dipilih.</p>
              </div>
            } @else {
              <!-- ─ MONTHLY: calendar grid ─ -->
              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico emerald-ico"><i class="bi bi-calendar3"></i></div>
                    <h3 class="section-title">Kalender Keuangan</h3>
                    <span class="card-count">{{ months[calMonth()-1].label }} {{ calYear() }}</span>
                  </div>
                  <div class="cal-legend">
                    <span class="cal-leg-item"><span class="cal-leg-dot" style="background:var(--emerald)"></span> Positif</span>
                    <span class="cal-leg-item"><span class="cal-leg-dot" style="background:var(--red)"></span> Negatif</span>
                  </div>
                </div>
                <div class="cal-body">
                  <div class="cal-grid">
                    @for (d of dayNames; track d) {
                      <div class="cal-day-hdr">{{ d }}</div>
                    }
                    @for (cell of calendarCells(); track $index) {
                      @if (cell.day === null) {
                        <div class="cal-cell empty-cell"></div>
                      } @else {
                        <div class="cal-cell"
                          [class.has-data]="!!cell.data"
                          [class.net-pos]="cell.data && cell.data.balance >= 0"
                          [class.net-neg]="cell.data && cell.data.balance < 0"
                          [class.today-cell]="isToday(calYear(), calMonth(), cell.day)"
                          [class.cal-selected]="calPopover()?.day === cell.day"
                          (mouseenter)="onCellEnter($event, cell.day, cell.data, calMonth(), calYear())"
                          (mouseleave)="onCellLeave()"
                          (click)="onCellClick($event, cell.day, cell.data, calMonth(), calYear())">
                          <div class="cal-top">
                            <span class="cal-dn" [class.today-dn]="isToday(calYear(), calMonth(), cell.day)">{{ cell.day }}</span>
                            @if (cell.data) {
                              <div class="cal-inds">
                                @if (cell.data.totalIncome > 0) { <span class="cal-ind ci-inc"></span> }
                                @if (cell.data.totalExpense > 0) { <span class="cal-ind ci-exp"></span> }
                              </div>
                            }
                          </div>
                          @if (cell.data) {
                            <span class="cal-net" [class.cn-pos]="cell.data.balance>=0" [class.cn-neg]="cell.data.balance<0">
                              {{ shortIDR(cell.data.balance) }}
                            </span>
                          }
                        </div>
                      }
                    }
                  </div>
                </div>
              </div>

              <div class="cal-summary-row">
                <div class="card cal-sum-card">
                  <div class="cs-ico" style="background:rgba(16,185,129,0.13);color:#10B981;border:1px solid rgba(16,185,129,0.28)"><i class="bi bi-calendar-check-fill"></i></div>
                  <div class="cs-body"><div class="cs-val">{{ activeDays() }}</div><div class="cs-lbl">Hari Aktif</div></div>
                </div>
                <div class="card cal-sum-card">
                  <div class="cs-ico" style="background:rgba(45,212,191,0.13);color:#2DD4BF;border:1px solid rgba(45,212,191,0.28)"><i class="bi bi-arrow-up-circle-fill"></i></div>
                  <div class="cs-body"><div class="cs-val">{{ incomedays() }}</div><div class="cs-lbl">Hari Pemasukan</div></div>
                </div>
                <div class="card cal-sum-card">
                  <div class="cs-ico" style="background:rgba(239,68,68,0.13);color:#EF4444;border:1px solid rgba(239,68,68,0.28)"><i class="bi bi-arrow-down-circle-fill"></i></div>
                  <div class="cs-body"><div class="cs-val">{{ expenseDays() }}</div><div class="cs-lbl">Hari Pengeluaran</div></div>
                </div>
                <div class="card cal-sum-card">
                  <div class="cs-ico" style="background:rgba(59,130,246,0.13);color:#3B82F6;border:1px solid rgba(59,130,246,0.28)"><i class="bi bi-trophy-fill"></i></div>
                  <div class="cs-body"><div class="cs-val">{{ bestDay() }}</div><div class="cs-lbl">Pemasukan Terbesar</div></div>
                </div>
              </div>
            }

          </div>
        }

        <!-- ═ INSIGHTS ═ -->
        @if (tab() === 'insights') {
          <div class="tab-panel fade-in">

            <div class="card health-banner">
              <div class="hb-left">
                <div class="hb-score-ring">
                  <svg viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" stroke-width="7"/>
                    <circle cx="40" cy="40" r="32" fill="none" [attr.stroke]="healthColor()"
                      stroke-width="7" stroke-linecap="round"
                      [attr.stroke-dasharray]="healthRingDash()" stroke-dashoffset="50.3" transform="rotate(-90 40 40)"/>
                  </svg>
                  <div class="hb-ring-center">
                    <span class="hb-ring-val">{{ healthScore() }}</span>
                    <span class="hb-ring-sub">/100</span>
                  </div>
                </div>
                <div>
                  <div class="hb-title">Skor Kesehatan Finansial</div>
                  <div class="hb-rating" [style.color]="healthColor()">{{ healthRating() }}</div>
                  <div class="hb-tip">{{ healthTip() }}</div>
                </div>
              </div>
              <div class="hb-metrics">
                <div class="hb-metric">
                  <span class="hm-lbl">Savings Rate</span>
                  <span class="hm-val" [class.income-color]="savingsRate()>=0" [class.expense-color]="savingsRate()<0">{{ savingsRate() }}%</span>
                </div>
                <div class="hb-metric">
                  <span class="hm-lbl">Rata-rata Harian</span>
                  <span class="hm-val expense-color">{{ avgDailyExpense() | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
                </div>
                <div class="hb-metric">
                  <span class="hm-lbl">Hari Aktif</span>
                  <span class="hm-val">{{ activeDays() }} hari</span>
                </div>
              </div>
            </div>

            <div class="insight-grid">
              <div class="card insight-card">
                <div class="ic-icon" style="background:rgba(239,68,68,0.13);color:#EF4444;border:1px solid rgba(239,68,68,0.28)"><i class="bi bi-fire"></i></div>
                <div class="ic-label">Kategori Terbesar</div>
                <div class="ic-value">{{ topExpenseCategory() }}</div>
                <div class="ic-sub">Pengeluaran tertinggi bulan ini</div>
              </div>
              <div class="card insight-card">
                <div class="ic-icon" style="background:rgba(245,158,11,0.13);color:#F59E0B;border:1px solid rgba(245,158,11,0.28)"><i class="bi bi-calculator-fill"></i></div>
                <div class="ic-label">Rata-rata per Hari</div>
                <div class="ic-value">{{ avgDailyExpense() | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
                <div class="ic-sub">Pengeluaran harian rata-rata</div>
              </div>
              <div class="card insight-card">
                <div class="ic-icon" style="background:rgba(16,185,129,0.13);color:#10B981;border:1px solid rgba(16,185,129,0.28)"><i class="bi bi-trophy-fill"></i></div>
                <div class="ic-label">Hari Terbaik</div>
                <div class="ic-value">{{ bestDay() }}</div>
                <div class="ic-sub">Pemasukan terbesar bulan ini</div>
              </div>
              <div class="card insight-card">
                <div class="ic-icon" style="background:rgba(59,130,246,0.13);color:#3B82F6;border:1px solid rgba(59,130,246,0.28)"><i class="bi bi-graph-up-arrow"></i></div>
                <div class="ic-label">Rasio Hemat</div>
                <div class="ic-value" [class.income-color]="savingsRate()>=0" [class.expense-color]="savingsRate()<0">{{ savingsRate() }}%</div>
                <div class="ic-sub">Persen pendapatan disimpan</div>
              </div>
            </div>

            <div class="insights-bottom">

              <div class="card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico red-ico"><i class="bi bi-pie-chart-fill"></i></div>
                    <h3 class="section-title">Analisis per Kategori</h3>
                  </div>
                  <button class="btn-exp-sm" (click)="exportCategoryCSV()"><i class="bi bi-download"></i> CSV</button>
                </div>
                <div class="ins-cat-list">
                  @for (cat of expenseCategories(); track cat.categoryId) {
                    <div class="ins-cat-row">
                      <div class="ins-cat-left">
                        <div class="cat-color-dot" [style.background]="cat.categoryColor"></div>
                        <div>
                          <div class="cat-name">{{ cat.categoryName }}</div>
                          <div class="cat-count-sub">{{ cat.count }} transaksi · {{ cat.percentage }}%</div>
                        </div>
                      </div>
                      <div class="ins-cat-mid">
                        <div class="ins-cat-track">
                          <div class="ins-cat-fill" [style.width.%]="cat.percentage" [style.background]="cat.categoryColor"></div>
                        </div>
                      </div>
                      <div class="ins-cat-right expense-color">{{ cat.total | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
                    </div>
                  } @empty {
                    <div class="cat-empty"><i class="bi bi-inbox"></i><p>Tidak ada pengeluaran</p></div>
                  }
                </div>
              </div>

              <div class="card tips-card">
                <div class="section-hdr">
                  <div class="shdr-left">
                    <div class="hd-ico emerald-ico"><i class="bi bi-lightbulb-fill"></i></div>
                    <h3 class="section-title">Tips Finansial</h3>
                  </div>
                </div>
                <div class="tips-list">
                  @for (tip of financialTips(); track tip.text) {
                    <div class="tip-item">
                      <div class="tip-ico" [style.background]="glassHex(tip.hex)" [style.color]="tip.hex" [style.border]="borderHex(tip.hex)"><i [class]="'bi ' + tip.icon"></i></div>
                      <div>
                        <div class="tip-title">{{ tip.title }}</div>
                        <div class="tip-text">{{ tip.text }}</div>
                      </div>
                    </div>
                  }
                </div>
              </div>

            </div>
          </div>
        }

      } @else if (!loading()) {
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-bar-chart-line"></i></div>
          <h3>Pilih periode untuk melihat laporan</h3>
          <p>{{ heroHint() }}</p>
        </div>
      }
      }

    </div>

    <!-- ─ RIGHT SIDEBAR ─ -->
    <div class="col-side">

      @if (loading()) {
        <!-- Sidebar skeleton: score card -->
        <div class="card score-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div class="skeleton" style="width:140px;height:14px;border-radius:5px"></div>
          </div>
          <div style="display:flex;justify-content:center;margin-bottom:16px">
            <div class="skeleton" style="width:140px;height:140px;border-radius:50%"></div>
          </div>
          <div class="skeleton" style="width:100%;height:52px;border-radius:10px"></div>
        </div>
        <!-- Sidebar skeleton: side-stats -->
        <div class="card side-stats">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <div class="skeleton" style="width:40px;height:40px;border-radius:12px;flex-shrink:0"></div>
            <div class="skeleton" style="width:120px;height:14px;border-radius:5px"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
            @for (i of [1,2,3]; track i) {
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="skeleton" style="width:70px;height:11px;border-radius:4px"></div>
                <div class="skeleton" style="width:100px;height:13px;border-radius:4px"></div>
              </div>
            }
          </div>
          <div class="skeleton" style="width:100%;height:40px;border-radius:10px"></div>
        </div>
        <!-- Sidebar skeleton: goals/payment -->
        <div class="card goals-card">
          <div class="section-hdr">
            <div class="skeleton" style="width:140px;height:14px;border-radius:5px"></div>
          </div>
          <div class="goals-list">
            @for (i of [1,2,3]; track i) {
              <div class="goal-item">
                <div class="skeleton" style="width:38px;height:38px;border-radius:11px;flex-shrink:0"></div>
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
        </div>
      } @else {
      @if (report(); as r) {

        <!-- Kesehatan Finansial (= Wallet Score) -->
        <div class="card score-card">
          <div class="score-hdr">
            <h3 class="score-title">Kesehatan Finansial</h3>
          </div>
          <div class="score-ring-wrap">
            <svg viewBox="0 0 140 140" class="score-svg">
              <circle cx="70" cy="70" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
              <circle cx="70" cy="70" r="52" fill="none"
                [attr.stroke]="healthColor()"
                stroke-width="10" stroke-linecap="round"
                [attr.stroke-dasharray]="scoreDash()"
                stroke-dashoffset="81.7"
                transform="rotate(-90 70 70)" class="score-arc"/>
            </svg>
            <div class="score-center">
              <span class="score-pct">{{ healthScore() }}</span>
              <span class="score-lbl">{{ healthRating() }}</span>
            </div>
          </div>
          <p class="score-insight">{{ healthTip() }}</p>
        </div>

        <!-- Ringkasan Periode (= Spending Insights) -->
        <div class="card side-stats">
          <div class="ss-hdr">
            <div class="ss-ico"><i class="bi bi-bar-chart-fill"></i></div>
            <h3 class="ss-title">Ringkasan Periode</h3>
          </div>
          <div class="ss-rows">
            <div class="ss-row">
              <span class="ss-lbl">Pemasukan</span>
              <span class="ss-val income-color">{{ r.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
            </div>
            <div class="ss-row">
              <span class="ss-lbl">Pengeluaran</span>
              <span class="ss-val expense-color">{{ r.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
            </div>
            <div class="ss-row ss-row-bold">
              <span class="ss-lbl">Saldo</span>
              <span class="ss-val" [class.income-color]="r.balance>=0" [class.expense-color]="r.balance<0">
                {{ r.balance | currency:'IDR':'symbol':'1.0-0':'id' }}
              </span>
            </div>
          </div>
          <button class="insights-btn" (click)="tab.set('insights')">
            Lihat Insights <i class="bi bi-arrow-right"></i>
          </button>
        </div>

        <!-- Metode Pembayaran (= Saving Goals) -->
        <div class="card goals-card">
          <div class="section-hdr">
            <h3 class="section-title">Metode Pembayaran</h3>
          </div>
          <div class="goals-list">
            <div class="goal-item">
              <div class="goal-ico" style="background:rgba(100,116,139,0.13);color:#64748B;border:1px solid rgba(100,116,139,0.28)"><i class="bi bi-cash-coin"></i></div>
              <div class="goal-body">
                <div class="goal-top2"><span class="goal-name2">Cash</span><span class="goal-pct2">{{ getPaymentPct('CASH') }}%</span></div>
                <div class="goal-bar2"><div class="goal-fill2" [style.width.%]="getPaymentPct('CASH')" style="background:#475569"></div></div>
                <span class="goal-rem">{{ getTxAmountByMethod('CASH') | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
              </div>
            </div>
            <div class="goal-item">
              <div class="goal-ico" style="background:rgba(59,130,246,0.13);color:#3B82F6;border:1px solid rgba(59,130,246,0.28)"><i class="bi bi-bank2"></i></div>
              <div class="goal-body">
                <div class="goal-top2"><span class="goal-name2">Transfer</span><span class="goal-pct2">{{ getPaymentPct('TRANSFER') }}%</span></div>
                <div class="goal-bar2"><div class="goal-fill2" [style.width.%]="getPaymentPct('TRANSFER')" style="background:var(--blue)"></div></div>
                <span class="goal-rem">{{ getTxAmountByMethod('TRANSFER') | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
              </div>
            </div>
            <div class="goal-item">
              <div class="goal-ico" style="background:rgba(217,119,6,0.13);color:#D97706;border:1px solid rgba(217,119,6,0.28)"><i class="bi bi-qr-code-scan"></i></div>
              <div class="goal-body">
                <div class="goal-top2"><span class="goal-name2">QRIS</span><span class="goal-pct2">{{ getPaymentPct('QRIS') }}%</span></div>
                <div class="goal-bar2"><div class="goal-fill2" [style.width.%]="getPaymentPct('QRIS')" style="background:var(--amber)"></div></div>
                <span class="goal-rem">{{ getTxAmountByMethod('QRIS') | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
              </div>
            </div>
          </div>
        </div>

      } @else if (!loading()) {
        <div class="card side-empty">
          <i class="bi bi-bar-chart-line"></i>
          <p>Muat laporan untuk melihat ringkasan</p>
        </div>
      }
      }

    </div>

  </div>

  <!-- ══ DATE RANGE PICKER PANEL ══ -->
  @if (showDatePicker() && filterMode() === 'custom') {
    <div class="dp-backdrop" (click)="closeDatePicker()"></div>
    <div class="dp-panel">
      <!-- Header: from/to display -->
      <div class="dp-panel-hdr">
        <div class="dp-from-to">
          <div class="dp-ft-item" [class.dp-ft-active]="pickerPhase() === 'start'">
            <span class="dp-ft-lbl">Dari</span>
            <span class="dp-ft-date">{{ displayRangeDate(form.value.startDate) }}</span>
          </div>
          <i class="bi bi-arrow-right dp-ft-arrow"></i>
          <div class="dp-ft-item" [class.dp-ft-active]="pickerPhase() === 'end'">
            <span class="dp-ft-lbl">Sampai</span>
            <span class="dp-ft-date">{{ displayRangeDate(form.value.endDate) }}</span>
          </div>
        </div>
        @if (nightCount() > 0) {
          <div class="dp-duration">{{ nightCount() }} hari</div>
        }
      </div>
      <!-- Month navigation -->
      <div class="dp-cal-nav">
        <button type="button" class="dp-nav-btn" (click)="pickerPrev()"><i class="bi bi-chevron-left"></i></button>
        <span class="dp-nav-label">{{ months[pickerMonth()-1].label }} {{ pickerYear() }}</span>
        <button type="button" class="dp-nav-btn" (click)="pickerNext()"><i class="bi bi-chevron-right"></i></button>
      </div>
      <!-- Calendar grid -->
      <div class="dp-cal-grid">
        @for (d of ['Sen','Sel','Rab','Kam','Jum','Sab','Min']; track d) {
          <div class="dp-day-hdr">{{ d }}</div>
        }
        @for (cell of pickerCells(); track $index) {
          @if (cell.day === null) {
            <div class="dp-cell dp-empty"></div>
          } @else {
            <div class="dp-cell"
              [class.dp-start]="isPickerStart(cell.dateStr!)"
              [class.dp-end]="isPickerEnd(cell.dateStr!)"
              [class.dp-in-range]="isPickerInRange(cell.dateStr!)"
              [class.dp-hover-end]="isPickerHoverEnd(cell.dateStr!)"
              [class.dp-today]="isToday(pickerYear(), pickerMonth(), cell.day)"
              (click)="onPickerDayClick(cell.dateStr!)"
              (mouseenter)="pickerHover.set(cell.dateStr)"
              (mouseleave)="pickerHover.set(null)">
              <span class="dp-day-num">{{ cell.day }}</span>
            </div>
          }
        }
      </div>
      <!-- Footer -->
      <div class="dp-footer">
        <button type="button" class="dp-reset-btn" (click)="clearDateRange()">Reset</button>
        <button type="button" class="dp-apply-btn" (click)="closeDatePicker(); load()">Tampilkan</button>
      </div>
    </div>
  }

  <!-- ══ CALENDAR POPOVER — outside animated containers so position:fixed works ══ -->
  @if (calPopover(); as pop) {
    <div class="cal-pop"
      [style.top.px]="pop.top"
      [style.left.px]="pop.left"
      (mouseenter)="onPopoverEnter()"
      (mouseleave)="onPopoverLeave()">
      <div class="cpop-hdr">
        <div class="cpop-ico"><i class="bi bi-calendar3"></i></div>
        <div>
          <div class="cpop-date">{{ pop.day }} {{ months[pop.month - 1].label }} {{ pop.year }}</div>
          @if (isToday(pop.year, pop.month, pop.day)) {
            <span class="cpop-today">Hari ini</span>
          }
        </div>
      </div>
      <div class="cpop-body">
        <div class="cpop-row">
          <span class="cpop-dot" style="background:var(--emerald)"></span>
          <span class="cpop-key">Pemasukan</span>
          <span class="cpop-val" style="color:var(--emerald)">{{ pop.data.totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
        </div>
        <div class="cpop-row">
          <span class="cpop-dot" style="background:var(--red)"></span>
          <span class="cpop-key">Pengeluaran</span>
          <span class="cpop-val" style="color:var(--red)">{{ pop.data.totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
        </div>
      </div>
      <div class="cpop-foot" [class.cpop-pos]="pop.data.balance>=0" [class.cpop-neg]="pop.data.balance<0">
        <span class="cpop-net-lbl">Net hari ini</span>
        <span class="cpop-net-val">{{ pop.data.balance | currency:'IDR':'symbol':'1.0-0':'id' }}</span>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
    @keyframes arcFill { from { stroke-dasharray:0 327; } }
    @keyframes barGrow { from { transform:scaleY(0); transform-origin:bottom; opacity:0; } to { transform:scaleY(1); transform-origin:bottom; opacity:1; } }
    .fade-in { animation: fadeUp 0.2s ease both; }

    .page { display:flex; flex-direction:column; min-height:100%; background:var(--bg); }
    .page-prog { margin:0; }

    /* ══ HERO SKELETON (dark bg) ══ */
    .sk-r-dark {
      background:linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 75%);
      background-size:800px 100%;
      animation:shimmer 1.4s infinite;
      display:block;
    }

    /* ══ HERO ══ */
    @keyframes heroIn { from { opacity:0; transform:translateY(14px) scale(0.98); } to { opacity:1; transform:none; } }
    .r-hero-wrap { padding:0 28px 20px; animation:heroIn 0.4s 0.05s ease both; }
    .r-hero {
      border-radius:20px; padding:22px 28px;
      display:flex; align-items:center; justify-content:space-between; gap:32px;
      position:relative; overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
      transition:background 0.5s ease;
    }
    /* subtle dot-grid texture */
    .r-hero::before {
      content:''; position:absolute; inset:0; border-radius:20px;
      background-image:radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
      background-size:22px 22px; pointer-events:none;
    }
    .r-hero-deco-1 {
      position:absolute; top:-80px; right:260px; width:280px; height:280px;
      border-radius:50%; background:radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%);
      pointer-events:none;
    }
    .r-hero-deco-2 {
      position:absolute; bottom:-100px; left:38%; width:260px; height:260px;
      border-radius:50%; background:radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
      pointer-events:none;
    }
    .r-hero-main { flex:1; min-width:0; position:relative; z-index:1; }

    /* ── Page bar (above hero) ── */
    .r-top-bar {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 28px; flex-wrap:wrap; gap:12px;
      border-bottom:1px solid var(--border);
      background:var(--surface);
    }
    .r-top-left { display:flex; align-items:center; gap:12px; }
    .r-top-ico {
      width:38px; height:38px; border-radius:11px; flex-shrink:0;
      background:var(--emerald-dim); border:1px solid rgba(16,185,129,0.2);
      display:flex; align-items:center; justify-content:center;
      font-size:0.9rem; color:var(--emerald-dark);
    }
    .r-top-title { font-size:1rem; font-weight:700; color:var(--text); margin:0; line-height:1.2; }
    .r-top-sub   { font-size:0.75rem; color:var(--muted); margin:2px 0 0; line-height:1; }
    .r-top-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

    .r-mode-sel-wrap {
      height:36px; padding:0 10px 0 12px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface);
      display:flex; align-items:center; gap:7px; position:relative;
      flex-shrink:0; cursor:pointer; transition:border-color 0.14s;
      &:hover { border-color:var(--emerald); }
    }
    .r-mode-sel-ico   { font-size:0.78rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .r-mode-sel-label { font-size:0.8rem; font-weight:600; color:var(--text); pointer-events:none; }
    .r-mode-sel-caret { font-size:0.6rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .r-mode-select {
      position:absolute; inset:0; opacity:0; width:100%; height:100%;
      cursor:pointer; appearance:none;
    }

    .rpp-date-input {
      background:none; border:none; color:var(--text); font-size:0.78rem; font-weight:600;
      font-family:var(--font); cursor:pointer; outline:none; padding:2px 0;
      &::-webkit-calendar-picker-indicator { opacity:0.5; cursor:pointer; }
    }
    .rpp-range-btn {
      display:flex; align-items:center; gap:6px;
      background:none; border:none; cursor:pointer; font-family:var(--font);
      padding:3px 6px; border-radius:7px; transition:background 0.12s;
      &:hover { background:var(--bg); }
    }
    .rpp-range-from, .rpp-range-to { font-size:0.8rem; font-weight:700; color:var(--text); white-space:nowrap; }
    .rpp-range-arrow { color:var(--muted); font-size:0.76rem; }

    /* ══ DATE RANGE PICKER PANEL ══ */
    .dp-backdrop {
      position:fixed; inset:0; z-index:300;
    }
    .dp-panel {
      position:fixed; z-index:301;
      top:68px; right:24px;
      width:300px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:20px; overflow:hidden;
      box-shadow:0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.10);
      animation:fadeUp 0.16s ease both;
    }
    .dp-panel-hdr {
      padding:18px 18px 14px;
      background:linear-gradient(135deg, #022c22 0%, #065f46 60%, #047857 100%);
    }
    .dp-from-to { display:flex; align-items:center; gap:10px; }
    .dp-ft-item {
      flex:1; padding:10px 12px; border-radius:10px; cursor:pointer;
      border:1.5px solid rgba(255,255,255,0.12); transition:all 0.15s;
      &.dp-ft-active { border-color:var(--emerald); background:rgba(16,185,129,0.18); }
    }
    .dp-ft-lbl  { display:block; font-size:0.6rem; font-weight:700; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; }
    .dp-ft-date { font-size:0.82rem; font-weight:700; color:#fff; }
    .dp-ft-arrow { color:rgba(255,255,255,0.3); font-size:0.85rem; flex-shrink:0; }
    .dp-duration {
      margin-top:10px; text-align:center;
      font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.55);
      letter-spacing:0.04em;
    }

    .dp-cal-nav {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px 6px;
    }
    .dp-nav-btn {
      width:28px; height:28px; border-radius:8px; border:1px solid var(--border);
      background:none; cursor:pointer; color:var(--muted);
      display:flex; align-items:center; justify-content:center; font-size:0.78rem;
      transition:all 0.12s;
      &:hover { background:var(--bg); color:var(--text); }
    }
    .dp-nav-label { font-size:0.87rem; font-weight:700; color:var(--text); }

    .dp-cal-grid {
      display:grid; grid-template-columns:repeat(7,1fr);
      padding:4px 10px 10px; gap:2px;
    }
    .dp-day-hdr {
      text-align:center; font-size:0.6rem; font-weight:700; color:var(--muted);
      padding:4px 0; letter-spacing:0.03em;
    }
    .dp-cell {
      display:flex; align-items:center; justify-content:center;
      aspect-ratio:1; cursor:pointer; position:relative;
      border-radius:8px; transition:background 0.1s;
      &.dp-empty { cursor:default; pointer-events:none; }
      &:not(.dp-empty):not(.dp-start):not(.dp-end):hover { background:rgba(16,185,129,0.10); }
      &.dp-in-range { background:rgba(16,185,129,0.12); border-radius:0; }
      &.dp-start {
        background:rgba(16,185,129,0.12); border-radius:8px 0 0 8px;
        .dp-day-num { background:var(--emerald); color:#0D0F12; }
      }
      &.dp-end {
        background:rgba(16,185,129,0.12); border-radius:0 8px 8px 0;
        .dp-day-num { background:var(--emerald); color:#0D0F12; }
      }
      &.dp-start.dp-end { border-radius:8px; }
      &.dp-hover-end .dp-day-num { background:rgba(16,185,129,0.3); }
      &.dp-today:not(.dp-start):not(.dp-end) .dp-day-num { border:1.5px solid var(--emerald); }
    }
    .dp-day-num {
      width:28px; height:28px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:0.78rem; font-weight:500; color:var(--text); position:relative; z-index:1;
      transition:background 0.1s;
    }
    .dp-footer {
      display:flex; align-items:center; gap:8px;
      padding:10px 14px; border-top:1px solid var(--border);
    }
    .dp-reset-btn {
      flex:1; padding:8px; border-radius:9px; border:1px solid var(--border);
      background:none; color:var(--muted); font-size:0.76rem; font-weight:600;
      cursor:pointer; font-family:var(--font); transition:all 0.12s;
      &:hover { background:var(--bg); color:var(--text); }
    }
    .dp-apply-btn {
      flex:1.5; padding:8px; border-radius:9px; border:none;
      background:var(--emerald); color:#0D0F12; font-size:0.78rem; font-weight:700;
      cursor:pointer; font-family:var(--font); transition:opacity 0.12s;
      &:hover { opacity:0.88; }
    }

    .r-period-pill {
      display:flex; align-items:center; gap:6px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:10px; padding:5px 8px 5px 12px;
      box-shadow:0 1px 4px rgba(15,23,42,0.06);
    }
    .rpp-ico { color:var(--muted); font-size:0.78rem; flex-shrink:0; }
    .rpp-sel { font-size:0.8rem; font-weight:600; border:none; background:none; color:var(--text); min-width:90px; }
    .rpp-yr  { min-width:58px; }
    .rpp-btn {
      height:30px; width:30px; flex-shrink:0; border-radius:8px;
      background:var(--emerald-dark); color:#fff; border:none;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      font-size:0.85rem; transition:background 0.14s;
      &:hover:not(:disabled) { background:#047857; }
      &:disabled { opacity:0.5; cursor:not-allowed; }
    }
    .r-icon-btn {
      width:34px; height:34px; border-radius:9px;
      background:var(--surface); border:1px solid var(--border);
      color:var(--muted); cursor:pointer;
      display:flex; align-items:center; justify-content:center; font-size:0.82rem;
      transition:all 0.14s; box-shadow:0 1px 4px rgba(15,23,42,0.06);
      &:hover { background:var(--emerald-dark); color:#fff; border-color:var(--emerald-dark); }
    }

    .r-hero-eyebrow-main {
      font-size:0.58rem; font-weight:600; color:rgba(255,255,255,0.35);
      letter-spacing:0.1em; text-transform:uppercase; margin:0 0 8px;
    }
    .r-hero-balance-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
    .r-hero-balance {
      font-size:2rem; font-weight:800; color:#fff;
      letter-spacing:-0.04em; line-height:1; font-family:var(--font-mono);
      text-shadow:0 2px 16px rgba(0,0,0,0.25);
      &.r-neg { color:#FCA5A5; }
    }
    .r-hero-chip {
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 13px; border-radius:99px; font-size:0.72rem; font-weight:700;
      &.r-chip-pos {
        background:rgba(45,212,191,0.15); color:#5EEAD4;
        border:1px solid rgba(45,212,191,0.3);
      }
      &.r-chip-neg {
        background:rgba(252,129,129,0.15); color:#FCA5A5;
        border:1px solid rgba(252,129,129,0.3);
      }
      i { font-size:0.9rem; }
    }
    .r-hero-hint { font-size:0.82rem; color:rgba(255,255,255,0.35); margin:0; line-height:1.7; }

    .r-hero-stats { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .r-stat-pill {
      display:flex; align-items:center; gap:9px;
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
      border-radius:10px; padding:8px 12px; backdrop-filter:blur(4px);
    }
    .r-stat-pill-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .r-dot-inc { background:#2DD4BF; box-shadow:0 0 6px rgba(45,212,191,0.5); }
    .r-dot-exp { background:#FC8181; box-shadow:0 0 6px rgba(252,129,129,0.5); }
    .r-stat-pill-lbl {
      font-size:0.58rem; font-weight:600; color:rgba(255,255,255,0.38);
      letter-spacing:0.06em; text-transform:uppercase; margin-bottom:3px;
    }
    .r-stat-pill-val { font-size:0.88rem; font-weight:700; color:#fff; letter-spacing:-0.02em; }

    .r-hero-score {
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.14);
      border-radius:16px; padding:16px 20px 14px; min-width:170px; text-align:center;
      backdrop-filter:blur(12px); flex-shrink:0; position:relative; z-index:1;
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .r-score-eyebrow {
      font-size:0.56rem; font-weight:700; color:rgba(255,255,255,0.35);
      text-transform:uppercase; letter-spacing:0.1em; margin:0 0 10px;
    }
    .r-hsb-inner  { position:relative; width:80px; height:80px; margin:0 auto 10px; }
    .r-hsb-ring   { width:100%; height:100%; }
    .r-hsb-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .r-hsb-val    { font-size:1.4rem; font-weight:800; color:#fff; line-height:1; letter-spacing:-0.03em; }
    .r-hsb-sub    { font-size:0.57rem; color:rgba(255,255,255,0.38); margin-top:1px; }
    .r-hsb-label  { font-size:0.75rem; font-weight:700; margin:0 0 5px; }
    .r-hsb-tip    { font-size:0.61rem; color:rgba(255,255,255,0.38); line-height:1.45; max-width:150px; }

    /* ══ MAIN GRID ══ */
    .main-grid {
      display:grid; grid-template-columns:1fr 300px;
      gap:18px; padding:0 28px 28px; align-items:start; flex:1;
    }
    .col-main { display:flex; flex-direction:column; gap:14px; animation:fadeUp 0.3s 0.05s ease both; }
    .col-side  { display:flex; flex-direction:column; gap:16px; }
    .col-side > *:nth-child(1) { animation:slideIn 0.3s 0.08s ease both; }
    .col-side > *:nth-child(2) { animation:slideIn 0.3s 0.14s ease both; }
    .col-side > *:nth-child(3) { animation:slideIn 0.3s 0.20s ease both; }

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
      padding:18px 22px 14px;
    }
    .shdr-left   { display:flex; align-items:center; gap:9px; }
    .section-title { font-size:1rem; font-weight:700; color:var(--text); letter-spacing:-0.02em; margin:0; line-height:1; }
    .card-count  { font-size:0.7rem; color:var(--subtle); line-height:1; }
    .view-all    { font-size:0.75rem; font-weight:600; color:var(--emerald); transition:opacity 0.14s; &:hover { opacity:0.7; } }
    .btn-exp-sm {
      height:28px; padding:0 10px; border-radius:7px;
      border:1px solid var(--border); background:var(--bg);
      color:var(--muted); font-size:0.72rem; font-weight:600; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.15s;
      &:hover { color:var(--emerald); border-color:var(--emerald); }
    }
    .hd-ico { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.82rem; flex-shrink:0; }
    .blue-ico    { background:rgba(59,130,246,0.13);  color:var(--blue);    border:1px solid rgba(59,130,246,0.28); }
    .amber-ico   { background:rgba(217,119,6,0.13);   color:var(--amber);   border:1px solid rgba(217,119,6,0.28); }
    .emerald-ico { background:rgba(16,185,129,0.13);  color:var(--emerald); border:1px solid rgba(16,185,129,0.28); }
    .red-ico     { background:rgba(239,68,68,0.13);   color:var(--red);     border:1px solid rgba(239,68,68,0.28); }

    /* ══ TAB NAV ══ */
    .tab-panel { display:flex; flex-direction:column; gap:14px; }

    /* ══ CATEGORY LIST ══ */
    .ov-cat-list { padding:6px 22px 18px; display:flex; flex-direction:column; gap:12px; }
    .ov-cat-row  { display:flex; align-items:center; gap:12px; }
    .ov-cat-ico  { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:0.85rem; }
    .ov-cat-info { flex:1; min-width:0; }
    .ov-cat-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
    .ov-cat-name { font-size:0.82rem; font-weight:600; color:var(--text); }
    .ov-cat-right  { display:flex; align-items:center; gap:8px; }
    .ov-cat-amount { font-size:0.82rem; font-weight:700; }
    .ov-cat-pct    { font-size:0.7rem; font-weight:700; color:var(--subtle); min-width:32px; text-align:right; }
    .ov-cat-track  { height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
    .ov-cat-fill   { height:100%; border-radius:2px; transition:width 0.5s ease; }

    /* ══ DAILY CHART ══ */
    .chart-legend { display:flex; align-items:center; gap:10px; font-size:0.72rem; color:var(--muted); font-weight:600; }
    .legend-dot   { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:3px; }
    .legend-lbl   { margin-right:6px; }
    .chart-wrap   { padding:12px 16px; overflow-x:auto; position:relative; cursor:crosshair; }
    .daily-tooltip {
      position:absolute; top:6px;
      transform:translateX(-50%);
      background:var(--surface); border:1px solid var(--border);
      border-radius:10px; padding:10px 14px;
      box-shadow:0 4px 20px rgba(15,23,42,0.12);
      pointer-events:none; z-index:20;
      min-width:195px; white-space:nowrap;
      &.dtip-right { transform:translateX(-90%); }
    }
    .dtip-date  { font-size:0.72rem; font-weight:700; color:var(--muted); margin-bottom:8px; letter-spacing:0.02em; }
    .dtip-empty { font-size:0.72rem; color:var(--subtle); font-style:italic; }
    .dtip-row   { display:flex; align-items:center; gap:7px; margin-top:5px; }
    .dtip-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .dtip-key   { font-size:0.72rem; color:var(--muted); flex:1; }
    .dtip-val   { font-size:0.78rem; font-weight:700; font-family:var(--font-mono); }
    .dtip-net   {
      margin-top:8px; padding-top:7px; border-top:1px solid var(--border);
      font-size:0.78rem; font-weight:700; font-family:var(--font-mono); text-align:right;
      &.pos { color:var(--emerald); }
      &.neg { color:var(--red); }
    }
    .daily-svg    {
      display:block; width:100%; min-width:500px; height:158px;
      rect { animation:barGrow 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
    }
    .chart-empty { padding:40px; text-align:center; color:var(--subtle);
      i { font-size:1.8rem; display:block; margin-bottom:8px; } p { font-size:0.82rem; }
    }

    /* ══ HARIAN GRID ══ */
    .harian-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

    .weekly-table {}
    .wt-head {
      display:grid; grid-template-columns:90px 1fr 1fr 1fr;
      padding:8px 22px; background:var(--bg);
      border-bottom:1px solid var(--border);
      font-size:0.68rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;
    }
    .wt-row {
      display:grid; grid-template-columns:90px 1fr 1fr 1fr;
      padding:10px 22px; border-bottom:1px solid var(--border); align-items:center;
      &:last-child { border-bottom:none; }
      &:hover { background:var(--bg); }
    }
    .wt-label { font-size:0.8rem; font-weight:700; color:var(--text); }
    .wt-val   { font-size:0.78rem; font-weight:600; }

    .daily-row {
      display:grid; grid-template-columns:80px 1fr auto auto;
      gap:10px; align-items:center;
      padding:8px 22px; border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
      &:hover { background:var(--bg); }
    }
    .daily-date    { display:flex; flex-direction:column; }
    .daily-day     { font-size:0.68rem; color:var(--muted); font-weight:600; text-transform:uppercase; }
    .daily-datenum { font-size:0.78rem; font-weight:700; color:var(--text); }
    .daily-bars-inline { display:flex; flex-direction:column; gap:4px; }
    .dbi-item  { display:flex; align-items:center; gap:5px; }
    .dbi-dot   { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
    .dbi-track { flex:1; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
    .dbi-fill  { height:100%; border-radius:2px; min-width:2px; transition:width 0.3s ease; }
    .daily-amounts { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
    .da-item   { font-size:0.7rem; font-weight:600; }
    .daily-net { font-size:0.8rem; font-weight:700; min-width:110px; text-align:right; }

    /* ══ CALENDAR ══ */
    .cal-body { padding:4px 20px 20px; }
    .cal-grid {
      display:grid; grid-template-columns:repeat(7,1fr);
      gap:5px;
    }
    .cal-day-hdr {
      text-align:center; font-size:0.6rem; font-weight:700;
      color:var(--subtle); text-transform:uppercase;
      padding:0 0 10px; letter-spacing:0.06em;
    }
    .cal-cell {
      border-radius:10px; border:1px solid var(--border);
      background:var(--surface);
      display:flex; flex-direction:column;
      padding:8px 8px 7px; gap:0;
      min-height:68px;
      transition:box-shadow 0.15s, border-color 0.15s, background 0.15s;
      position:relative;

      &.empty-cell { border-color:transparent; background:transparent; pointer-events:none; }
      &.has-data   { background:var(--bg); }
      &.net-pos    { border-color:rgba(16,185,129,0.22); background:rgba(16,185,129,0.04); }
      &.net-neg    { border-color:rgba(239,68,68,0.20);  background:rgba(239,68,68,0.03); }
      &.today-cell { border-color:var(--emerald); box-shadow:0 0 0 1px var(--emerald) inset; }
      &:not(.empty-cell):hover {
        box-shadow:0 4px 14px rgba(15,23,42,0.10);
        border-color:var(--muted); z-index:2;
      }
    }
    .cal-top {
      display:flex; align-items:flex-start; justify-content:space-between;
      margin-bottom:auto;
    }
    .cal-dn {
      font-size:0.8rem; font-weight:700; color:var(--text); line-height:1;
      &.today-dn {
        background:var(--emerald); color:#fff;
        width:22px; height:22px; border-radius:6px;
        display:flex; align-items:center; justify-content:center;
        font-size:0.72rem; flex-shrink:0;
      }
    }
    .cal-inds { display:flex; gap:3px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
    .cal-ind  { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
    .ci-inc   { background:var(--emerald); }
    .ci-exp   { background:var(--red); }
    .cal-net  {
      font-size:0.62rem; font-weight:700; line-height:1;
      margin-top:auto; padding-top:6px;
      &.cn-pos { color:var(--emerald); }
      &.cn-neg { color:var(--red); }
    }
    .cal-legend   { display:flex; gap:12px; align-items:center; }
    .cal-leg-item { display:flex; align-items:center; gap:5px; font-size:0.7rem; color:var(--muted); font-weight:500; }
    .cal-leg-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .cal-selected { box-shadow:0 0 0 2px var(--emerald) inset !important; border-color:var(--emerald) !important; }

    /* Calendar floating popover */
    .cal-pop {
      position:fixed; z-index:300;
      background:var(--surface); border:1px solid var(--border);
      border-radius:14px; overflow:hidden;
      box-shadow:0 8px 28px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.07);
      min-width:220px; pointer-events:all;
      animation:fadeUp 0.13s ease both;
    }
    .cpop-hdr {
      display:flex; align-items:center; gap:10px;
      padding:12px 14px 10px; border-bottom:1px solid var(--border);
    }
    .cpop-ico {
      width:30px; height:30px; border-radius:8px; flex-shrink:0;
      background:var(--bg); border:1px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      font-size:0.78rem; color:var(--muted);
    }
    .cpop-date  { font-size:0.8rem; font-weight:700; color:var(--text); line-height:1.2; }
    .cpop-today {
      display:inline-block; margin-top:3px;
      font-size:0.58rem; font-weight:700; padding:1px 6px; border-radius:99px;
      background:var(--blue-dim); color:var(--blue);
    }
    .cpop-body  { padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
    .cpop-row   { display:flex; align-items:center; gap:8px; }
    .cpop-dot   { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .cpop-key   { font-size:0.73rem; color:var(--muted); flex:1; }
    .cpop-val   { font-size:0.8rem; font-weight:700; font-family:var(--font-mono); }
    .cpop-foot  {
      display:flex; align-items:center; justify-content:space-between;
      padding:9px 14px; border-top:1px solid var(--border);
      &.cpop-pos { background:rgba(16,185,129,0.07); border-color:rgba(16,185,129,0.2); }
      &.cpop-neg { background:rgba(239,68,68,0.06);  border-color:rgba(239,68,68,0.18); }
    }
    .cpop-net-lbl { font-size:0.7rem; font-weight:600; color:var(--muted); }
    .cpop-net-val {
      font-size:0.82rem; font-weight:800; font-family:var(--font-mono);
      .cpop-pos & { color:var(--emerald); }
      .cpop-neg & { color:var(--red); }
    }

    /* ══ YEARLY CALENDAR GRID ══ */
    .yearly-cal-grid {
      display:grid; grid-template-columns:repeat(4,1fr); gap:12px; padding:16px 20px 20px;
    }
    .ycal-card {
      border-radius:12px; padding:12px; border:1px solid var(--border);
      background:var(--surface); transition:box-shadow 0.15s;
      &:hover { box-shadow:0 4px 14px rgba(15,23,42,0.08); }
      &.ycal-pos { border-color:rgba(16,185,129,0.25); background:rgba(16,185,129,0.04); }
      &.ycal-neg { border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.03); }
      &.ycal-zero { opacity:0.5; }
    }
    .ycal-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .ycal-month { font-size:0.82rem; font-weight:700; color:var(--text); }
    .ycal-badge {
      font-size:0.65rem; font-weight:700; padding:2px 7px; border-radius:99px; font-family:var(--font-mono);
      &.ycal-badge-pos { background:rgba(16,185,129,0.15); color:var(--emerald); }
      &.ycal-badge-neg { background:rgba(239,68,68,0.12); color:var(--red); }
    }
    .ycal-bars { display:flex; flex-direction:column; gap:5px; margin-bottom:8px; }
    .ycal-bar-row { display:flex; align-items:center; gap:6px; }
    .ycal-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .ycal-track { flex:1; height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
    .ycal-fill { height:100%; border-radius:2px; transition:width 0.5s ease; min-width:2px; }
    .ycal-inc { background:var(--emerald); }
    .ycal-exp { background:var(--red); }
    .ycal-vals { display:flex; flex-direction:column; gap:1px; }
    .ycal-vals span { font-size:0.66rem; font-weight:600; font-family:var(--font-mono); }

    /* ══ YEARLY MONTH TABLE ══ */
    .yearly-month-table { }
    .ymt-head {
      display:grid; grid-template-columns:100px 1fr 1fr 130px;
      gap:10px; padding:8px 22px; background:var(--bg);
      border-bottom:1px solid var(--border);
      font-size:0.67rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;
    }
    .ymt-row {
      display:grid; grid-template-columns:100px 1fr 1fr 130px;
      gap:10px; align-items:center; padding:10px 22px;
      border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
      &:hover { background:var(--bg); }
      &.ymt-row-pos { border-left:3px solid rgba(16,185,129,0.35); }
      &.ymt-row-neg { border-left:3px solid rgba(239,68,68,0.3); }
    }
    .ymt-month { font-size:0.82rem; font-weight:700; color:var(--text); }
    .ymt-bar-cell { display:flex; flex-direction:column; gap:4px; }
    .ymt-bar-track { height:5px; background:var(--border); border-radius:3px; overflow:hidden; }
    .ymt-bar-fill { height:100%; border-radius:3px; min-width:2px; transition:width 0.5s ease; }
    .ymt-inc { background:rgba(16,185,129,0.65); }
    .ymt-exp { background:rgba(239,68,68,0.6); }
    .ymt-val { font-size:0.77rem; font-weight:600; font-family:var(--font-mono); }
    .ymt-net { font-size:0.82rem; font-weight:700; text-align:right; }

    .cal-summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .cal-sum-card {
      padding:16px 18px; display:flex; align-items:center; gap:14px;
      transition:box-shadow 0.15s;
      &:hover { box-shadow:0 4px 16px rgba(15,23,42,0.09); }
    }
    .cs-ico  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.05rem; flex-shrink:0; }
    .cs-body { display:flex; flex-direction:column; gap:3px; min-width:0; }
    .cs-val  { font-size:1.45rem; font-weight:800; color:var(--text); letter-spacing:-0.03em; line-height:1; }
    .cs-lbl  { font-size:0.68rem; color:var(--muted); font-weight:500; white-space:nowrap; }

    /* ══ INSIGHTS ══ */
    .health-banner {
      display:flex; align-items:center; justify-content:space-between;
      padding:20px 24px; gap:16px; flex-wrap:wrap;
    }
    .hb-left { display:flex; align-items:center; gap:16px; }
    .hb-score-ring { position:relative; width:80px; height:80px; flex-shrink:0; }
    .hb-score-ring svg { width:100%; height:100%; }
    .hb-ring-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .hb-ring-val { font-size:1.3rem; font-weight:800; color:var(--text); line-height:1; }
    .hb-ring-sub { font-size:0.58rem; color:var(--muted); }
    .hb-title  { font-size:1rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; margin-bottom:3px; }
    .hb-rating { font-size:0.82rem; font-weight:700; margin-bottom:4px; }
    .hb-tip    { font-size:0.75rem; color:var(--muted); max-width:280px; }
    .hb-metrics { display:flex; gap:24px; }
    .hb-metric  { display:flex; flex-direction:column; }
    .hm-lbl { font-size:0.65rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px; }
    .hm-val { font-size:0.95rem; font-weight:500; color:var(--text); font-family:var(--font-mono); }

    .insight-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .insight-card { padding:18px 16px; display:flex; flex-direction:column; gap:6px;
      &:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(15,23,42,0.10); }
    }
    .ic-icon  { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; margin-bottom:2px; }
    .ic-label { font-size:0.68rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
    .ic-value { font-size:1rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; line-height:1.2; }
    .ic-sub   { font-size:0.65rem; color:var(--subtle); }

    .insights-bottom { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .ins-cat-row {
      display:grid; grid-template-columns:160px 1fr 130px;
      gap:12px; align-items:center;
      padding:10px 22px; border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
      &:hover { background:var(--bg); }
    }
    .ins-cat-left  { display:flex; align-items:center; gap:10px; }
    .ins-cat-track { height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
    .ins-cat-fill  { height:100%; border-radius:3px; min-width:3px; transition:width 0.4s ease; }
    .ins-cat-right { font-size:0.88rem; font-weight:500; text-align:right; font-family:var(--font-mono); }

    .tips-list { padding:12px 22px; display:flex; flex-direction:column; gap:12px; }
    .tip-item  { display:flex; align-items:flex-start; gap:12px; }
    .tip-ico   { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; }
    .tip-title { font-size:0.82rem; font-weight:700; color:var(--text); margin-bottom:2px; }
    .tip-text  { font-size:0.75rem; color:var(--muted); line-height:1.4; }

    /* ══ SIDEBAR CARDS ══ */
    .score-card { padding:20px; }
    .score-hdr  { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .score-title { font-size:1rem; font-weight:700; color:var(--text); letter-spacing:-0.02em; }
    .score-ring-wrap { position:relative; width:140px; height:140px; margin:0 auto 16px; }
    .score-svg   { width:100%; height:100%; }
    .score-arc   { animation:arcFill 1s ease 0.3s both; }
    .score-center {
      position:absolute; inset:0;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
    }
    .score-pct { font-size:1.8rem; font-weight:500; color:var(--text); letter-spacing:-0.04em; line-height:1; font-family:var(--font-mono); }
    .score-lbl { font-size:0.7rem; font-weight:700; color:var(--muted); margin-top:2px; }
    .score-insight {
      font-size:0.76rem; color:var(--muted); line-height:1.6;
      background:var(--bg); border-radius:10px; padding:10px 12px; margin:0;
    }

    .side-stats { padding:20px; }
    .ss-hdr  { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
    .ss-ico  {
      width:40px; height:40px; border-radius:12px;
      background:rgba(16,185,129,0.13); color:#10B981; border:1px solid rgba(16,185,129,0.28);
      display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;
    }
    .ss-title { font-size:0.95rem; font-weight:700; color:var(--text); }
    .ss-rows  { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
    .ss-row   { display:flex; justify-content:space-between; align-items:center; }
    .ss-row-bold .ss-lbl { font-weight:700; color:var(--text); }
    .ss-row-bold .ss-val { font-size:1rem; }
    .ss-row-bold { border-top:1px solid var(--border); padding-top:10px; margin-top:2px; }
    .ss-lbl { font-size:0.75rem; color:var(--muted); }
    .ss-val { font-size:0.85rem; font-weight:700; font-family:var(--font-mono); }
    .insights-btn {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; padding:11px;
      background:var(--emerald); color:#0D0F12;
      border-radius:10px; font-size:0.82rem; font-weight:700;
      border:none; cursor:pointer; font-family:var(--font);
      transition:opacity 0.14s; box-shadow:0 4px 14px rgba(45,212,191,0.3);
      &:hover { opacity:0.88; }
    }

    .goals-card {}
    .goals-list { padding:4px 22px 18px; display:flex; flex-direction:column; gap:14px; }
    .goal-item  { display:flex; align-items:center; gap:12px; }
    .goal-ico   {
      width:38px; height:38px; border-radius:11px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; font-size:0.95rem;
    }
    .goal-body  { flex:1; min-width:0; }
    .goal-top2  { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
    .goal-name2 { font-size:0.78rem; font-weight:600; color:var(--text); }
    .goal-pct2  { font-size:0.75rem; font-weight:700; color:var(--muted); font-family:var(--font-mono); }
    .goal-bar2  { height:5px; background:var(--border); border-radius:3px; overflow:hidden; margin-bottom:4px; }
    .goal-fill2 { height:100%; border-radius:3px; transition:width 0.7s ease; min-width:3px; }
    .goal-rem   { font-size:0.67rem; color:var(--subtle); }

    .side-empty { padding:32px 20px; text-align:center; color:var(--subtle);
      i { font-size:2rem; display:block; margin-bottom:10px; }
      p { font-size:0.8rem; }
    }

    /* ══ SHARED ══ */
    .income-color  { color:var(--emerald) !important; }
    .expense-color { color:var(--red)     !important; }
    .cat-color-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
    .cat-name      { font-size:0.84rem; font-weight:600; color:var(--text); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cat-count-sub { font-size:0.67rem; color:var(--muted); }
    .cat-empty {
      padding:32px 24px; text-align:center; color:var(--subtle);
      display:flex; flex-direction:column; align-items:center; gap:8px;
      i { font-size:1.8rem; } p { font-size:0.82rem; }
    }
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; text-align:center; }
    .empty-state h3 { font-size:1rem; font-weight:700; color:var(--text); margin-bottom:6px; }
    .empty-state p  { font-size:0.83rem; color:var(--muted); }

    @media (max-width: 1100px) {
      .main-grid         { grid-template-columns:1fr; }
      .col-side          { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
      .harian-grid       { grid-template-columns:1fr; }
      .insights-bottom   { grid-template-columns:1fr; }
      .yearly-cal-grid   { grid-template-columns:repeat(3,1fr); }
      .ymt-head, .ymt-row { grid-template-columns:80px 1fr 1fr 110px; }
    }
    @media (max-width: 760px) {
      .col-side          { grid-template-columns:1fr; }
      .insight-grid      { grid-template-columns:repeat(2,1fr); }
      .cal-summary-row   { grid-template-columns:repeat(2,1fr); }
      .yearly-cal-grid   { grid-template-columns:repeat(2,1fr); }
      .ymt-head, .ymt-row { grid-template-columns:70px 1fr 1fr; }
      .ymt-net           { display:none; }
      .r-hero-wrap     { padding:0 16px 16px; }
      .r-hero          { flex-direction:column; }
      .r-hero-score    { width:100%; min-width:unset; }
      .main-grid       { padding:0 16px 20px; }
    }
  `],
})
export class ReportsComponent implements OnInit {
  private readonly reportService  = inject(ReportService);
  private readonly notifStore     = inject(NotificationStore);
  private readonly fb = inject(FormBuilder);

  readonly loading    = signal(false);
  readonly report     = signal<AnyReport | null>(null);
  readonly daily      = signal<DailyTotal[]>([]);
  readonly tab        = signal<string>('overview');
  readonly hoveredDay = signal(-1);
  readonly calPopover = signal<{ day: number; data: DailyTotal; month: number; year: number; top: number; left: number } | null>(null);
  readonly calMonth   = signal(new Date().getMonth() + 1);
  readonly calYear    = signal(new Date().getFullYear());
  readonly filterMode = signal<FilterMode>('month');
  private  _calTimer: any;

  // Date range picker state
  readonly showDatePicker = signal(false);
  readonly pickerMonth    = signal(new Date().getMonth() + 1);
  readonly pickerYear     = signal(new Date().getFullYear());
  readonly pickerHover    = signal<string | null>(null);
  readonly pickerPhase    = signal<'start' | 'end'>('start');

  readonly svgW = 700;
  readonly barW = 8;

  readonly dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  readonly months = [
    { value: 1,  label: 'Januari'   }, { value: 2,  label: 'Februari' },
    { value: 3,  label: 'Maret'     }, { value: 4,  label: 'April'    },
    { value: 5,  label: 'Mei'       }, { value: 6,  label: 'Juni'     },
    { value: 7,  label: 'Juli'      }, { value: 8,  label: 'Agustus'  },
    { value: 9,  label: 'September' }, { value: 10, label: 'Oktober'  },
    { value: 11, label: 'November'  }, { value: 12, label: 'Desember' },
  ];
  readonly years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  readonly form = this.fb.group({
    month:     [new Date().getMonth() + 1],
    year:      [new Date().getFullYear()],
    startDate: [this.defaultRangeStart()],
    endDate:   [(() => { const d = new Date(); const p = (n: number) => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; })()],
  });

  private defaultRangeStart(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  }

  private todayStr(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const t = params.get('tab');
      if (t) this.tab.set(t);
    });
    this.form.valueChanges.subscribe(v => {
      if (v.month) this.calMonth.set(v.month);
      if (v.year)  this.calYear.set(v.year);
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.daily.set([]);
    const { month, year, startDate, endDate } = this.form.value;
    const mode = this.filterMode();
    const onErr = (ctx: string) => {
      this.loading.set(false);
      this.notifStore.push(`Gagal memuat laporan ${ctx}. Coba lagi.`, 'error');
    };

    if (mode === 'month') {
      this.reportService.getMonthly(month!, year!).subscribe({
        next:  r => { this.report.set(r); this.loading.set(false); },
        error: () => onErr('bulanan'),
      });
      this.reportService.getDaily(month!, year!).subscribe({
        next: d => this.daily.set(d), error: () => {},
      });
    } else if (mode === 'year') {
      this.reportService.getYearly(year!).subscribe({
        next:  r => { this.report.set(r); this.loading.set(false); },
        error: () => onErr('tahunan'),
      });
    } else {
      if (!startDate || !endDate) { this.loading.set(false); return; }
      this.reportService.getByRange(startDate, endDate).subscribe({
        next:  r => { this.report.set(r); this.loading.set(false); },
        error: () => onErr('rentang custom'),
      });
      this.reportService.getDailyRange(startDate, endDate).subscribe({
        next: d => this.daily.set(d), error: () => {},
      });
    }
  }

  setMode(mode: FilterMode) {
    this.filterMode.set(mode);
    this.report.set(null);
    this.daily.set([]);
    this.showDatePicker.set(false);
    this.load();
  }

  /* ── Date range picker ── */
  toggleDatePicker() {
    this.showDatePicker.update(v => !v);
    if (this.showDatePicker()) this.pickerPhase.set('start');
  }
  closeDatePicker() { this.showDatePicker.set(false); }

  pickerPrev() {
    let m = this.pickerMonth() - 1, y = this.pickerYear();
    if (m < 1) { m = 12; y--; }
    this.pickerMonth.set(m); this.pickerYear.set(y);
  }
  pickerNext() {
    let m = this.pickerMonth() + 1, y = this.pickerYear();
    if (m > 12) { m = 1; y++; }
    this.pickerMonth.set(m); this.pickerYear.set(y);
  }

  pickerCells(): Array<{ day: number | null; dateStr: string | null }> {
    const m = this.pickerMonth(), y = this.pickerYear();
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const pad = (n: number) => String(n).padStart(2, '0');
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, dateStr: null });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ day: d, dateStr: `${y}-${pad(m)}-${pad(d)}` });
    return cells;
  }

  onPickerDayClick(dateStr: string) {
    if (this.pickerPhase() === 'start') {
      this.form.patchValue({ startDate: dateStr, endDate: '' });
      this.pickerPhase.set('end');
    } else {
      const start = this.form.value.startDate || '';
      if (dateStr < start) {
        this.form.patchValue({ startDate: dateStr, endDate: start });
      } else {
        this.form.patchValue({ endDate: dateStr });
      }
      this.pickerPhase.set('start');
      this.showDatePicker.set(false);
      this.load();
    }
  }

  isPickerStart(dateStr: string):   boolean { return dateStr === (this.form.value.startDate || ''); }
  isPickerEnd(dateStr: string):     boolean { return !!this.form.value.endDate && dateStr === this.form.value.endDate; }
  isPickerInRange(dateStr: string): boolean {
    const s = this.form.value.startDate || '';
    const e = this.pickerPhase() === 'end'
      ? (this.pickerHover() || this.form.value.endDate || '')
      : (this.form.value.endDate || '');
    return !!s && dateStr > s && dateStr < e;
  }
  isPickerHoverEnd(dateStr: string): boolean {
    return this.pickerPhase() === 'end' && dateStr === this.pickerHover() && !this.isPickerEnd(dateStr);
  }

  nightCount(): number {
    const s = this.form.value.startDate, e = this.form.value.endDate;
    if (!s || !e) return 0;
    return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000);
  }

  displayRangeDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '–';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${this.months[d.getMonth()].label.slice(0, 3)} ${d.getFullYear()}`;
  }

  clearDateRange() {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    this.form.patchValue({
      startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
      endDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    });
    this.pickerPhase.set('start');
  }

  heroHint(): string {
    const mode = this.filterMode();
    if (mode === 'year')   return 'Pilih tahun, lalu klik tombol refresh untuk memuat laporan.';
    if (mode === 'custom') return 'Pilih rentang tanggal, lalu klik tombol refresh untuk memuat laporan.';
    return 'Pilih bulan dan tahun, lalu klik tombol refresh untuk memuat laporan.';
  }

  // Helper typed accessors
  asMonthly(r: AnyReport | null): MonthlyReport | null {
    return r && 'month' in r ? r as MonthlyReport : null;
  }
  asYearly(r: AnyReport | null): YearlyReport | null {
    return r && 'monthly' in r ? r as YearlyReport : null;
  }
  asRange(r: AnyReport | null): RangeReport | null {
    return r && 'startDate' in r ? r as RangeReport : null;
  }
  reportLabel(): string {
    const r = this.report();
    const mode = this.filterMode();
    if (!r) return '';
    if (mode === 'month') { const m = r as MonthlyReport; return `${this.months[m.month-1].label} ${m.year}`; }
    if (mode === 'year')  { return String((r as YearlyReport).year); }
    const rr = r as RangeReport;
    return `${rr.startDate} – ${rr.endDate}`;
  }

  /* ── Payment methods ── */
  getPaymentPct(method: 'CASH' | 'TRANSFER' | 'QRIS'): number {
    const r = this.report();
    if (!r) return 0;
    const total = r.byPaymentMethod.CASH + r.byPaymentMethod.TRANSFER + r.byPaymentMethod.QRIS;
    return total === 0 ? 0 : Math.round((r.byPaymentMethod[method] / total) * 100);
  }

  getTxAmountByMethod(method: 'CASH' | 'TRANSFER' | 'QRIS'): number {
    const r = this.report();
    if (!r) return 0;
    return r.byPaymentMethod[method] ?? 0;
  }

  /* ── Savings ── */
  savingsRate(): number {
    const r = this.report();
    if (!r || r.totalIncome === 0) return 0;
    return Math.round(((r.totalIncome - r.totalExpense) / r.totalIncome) * 100);
  }

  savingsDisplayRate(): string {
    const rate = this.savingsRate();
    if (rate > 999) return '999%+';
    if (rate < -999) return 'Defisit';
    return rate + '%';
  }

  heroBg(): string {
    const r = this.savingsRate();
    if (r > 0)  return 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #065f46 70%, #047857 100%)';
    if (r < 0)  return 'linear-gradient(135deg, #1a0505 0%, #3b0d0d 40%, #7f1d1d 70%, #991b1b 100%)';
    return      'linear-gradient(135deg, #0c1220 0%, #0f1f40 40%, #172554 70%, #1e3a8a 100%)';
  }

  heroDecoColor(): string {
    const r = this.savingsRate();
    if (r > 0)  return 'rgba(52,211,153,0.13)';
    if (r < 0)  return 'rgba(239,68,68,0.13)';
    return      'rgba(59,130,246,0.13)';
  }

  onDailyMove(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const pct = e.offsetX / el.clientWidth;
    this.hoveredDay.set(Math.min(31, Math.max(1, Math.floor(pct * 31) + 1)));
  }

  hoveredDayEntry(): DailyTotal | null {
    const day = this.hoveredDay();
    if (day < 1) return null;
    const r = this.report();
    if (!r) return null;
    const m = this.asMonthly(r);
    if (m) {
      const mStr = String(m.month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return this.daily().find(x => x.date.startsWith(`${m.year}-${mStr}-${dStr}`)) ?? null;
    }
    return this.daily().find(x => new Date(x.date).getDate() === day) ?? null;
  }

  hoveredDayLabel(): string {
    const day = this.hoveredDay();
    const r = this.report();
    if (!r || day < 1) return '';
    const m = this.asMonthly(r);
    if (m) return `${day} ${this.months[m.month - 1].label} ${m.year}`;
    const entry = this.hoveredDayEntry();
    if (entry) return this.formatDate(entry.date);
    return String(day);
  }

  monthlyChartBars(): Array<{ month: number; label: string; inc: number; exp: number; incH: number; expH: number; incX: number; expX: number }> {
    const yr = this.asYearly(this.report());
    if (!yr) return [];
    const monthly = yr.monthly;
    const max = Math.max(...monthly.map(m => Math.max(m.totalIncome, m.totalExpense)), 1);
    const slotW = this.svgW / 12;
    const gap = 2;
    const chartH = 100;
    return monthly.map((m, i) => {
      const slot = i * slotW;
      const incH = this.barH(m.totalIncome, max, chartH);
      const expH = this.barH(m.totalExpense, max, chartH);
      const incX = slot + (slotW - 2 * this.barW - gap) / 2;
      const expX = incX + this.barW + gap;
      return { month: m.month, label: this.months[m.month - 1].label.slice(0, 3), inc: m.totalIncome, exp: m.totalExpense, incH, expH, incX, expX };
    });
  }

  yearlyMonthlyBreakdown(): Array<MonthlyBreakdown & { pctInc: number; pctExp: number }> {
    const yr = this.asYearly(this.report());
    if (!yr) return [];
    const maxInc = Math.max(...yr.monthly.map(m => m.totalIncome), 1);
    const maxExp = Math.max(...yr.monthly.map(m => m.totalExpense), 1);
    return yr.monthly.map(m => ({
      ...m,
      pctInc: Math.round((m.totalIncome / maxInc) * 100),
      pctExp: Math.round((m.totalExpense / maxExp) * 100),
    }));
  }

  /* ── Sidebar score ring ── */
  scoreDash(): string {
    const circ = 2 * Math.PI * 52;
    return `${(this.healthScore() / 100) * circ} ${circ}`;
  }

  /* ── Daily bar chart ── */
  chartMax(): number {
    const d = this.daily();
    if (!d.length) return 1;
    return Math.max(...d.map(x => Math.max(x.totalIncome, x.totalExpense)), 1);
  }

  dailyBars(): Array<{ day: number; inc: number; exp: number; incH: number; expH: number; incX: number; expX: number }> {
    const data = this.daily();
    const max  = this.chartMax();
    const slotW = this.svgW / 31;
    const gap = 2;
    const chartH = 100;
    return data.map(d => {
      const day = new Date(d.date).getDate();
      const slot = (day - 1) * slotW;
      const incH = this.barH(d.totalIncome, max, chartH);
      const expH = this.barH(d.totalExpense, max, chartH);
      const incX = slot + (slotW - 2 * this.barW - gap) / 2;
      const expX = incX + this.barW + gap;
      return { day, inc: d.totalIncome, exp: d.totalExpense, incH, expH, incX, expX };
    });
  }

  barH(val: number, max: number, chartH = 100): number {
    if (max === 0) return 0;
    return Math.max(2, Math.round((val / max) * chartH));
  }

  fixedXLabels(): { x: number; label: string }[] {
    const slotW = this.svgW / 31;
    return [1, 5, 10, 15, 20, 25, 30].map(day => ({
      x: (day - 1) * slotW + slotW / 2,
      label: String(day),
    }));
  }

  /* ── Weekly breakdown ── */
  weeklyBreakdown(): Array<{ label: string; income: number; expense: number; balance: number }> {
    const daily = this.daily();
    if (!daily.length) return [];
    const chunks = [
      { label: 'Minggu 1', range: [1, 7] },
      { label: 'Minggu 2', range: [8, 14] },
      { label: 'Minggu 3', range: [15, 21] },
      { label: 'Minggu 4', range: [22, 28] },
      { label: 'Minggu 5', range: [29, 31] },
    ];
    return chunks.reduce<Array<{ label: string; income: number; expense: number; balance: number }>>((acc, c) => {
      const rows = daily.filter(d => { const day = new Date(d.date).getDate(); return day >= c.range[0] && day <= c.range[1]; });
      if (!rows.length) return acc;
      acc.push({
        label: c.label,
        income:  rows.reduce((s, r) => s + r.totalIncome, 0),
        expense: rows.reduce((s, r) => s + r.totalExpense, 0),
        balance: rows.reduce((s, r) => s + r.balance, 0),
      });
      return acc;
    }, []);
  }

  /* ── Calendar ── */
  calendarCells(): Array<{ day: number | null; data: DailyTotal | null }> {
    const month = this.calMonth();
    const year  = this.calYear();
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const offset = (firstDay + 6) % 7;
    const cells: Array<{ day: number | null; data: DailyTotal | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, data: null });
    const m = this.asMonthly(this.report());
    const dataMatch = m && m.month === month && m.year === year;
    const daily = dataMatch ? this.daily() : [];
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      const data = daily.find(x => x.date.startsWith(dateStr)) ?? null;
      cells.push({ day: d, data });
    }
    return cells;
  }

  isToday(year: number, month: number, day: number): boolean {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
  }

  private _setCalPopover(e: MouseEvent, day: number, data: DailyTotal, month: number, year: number) {
    const cell    = e.currentTarget as HTMLElement;
    const rect    = cell.getBoundingClientRect();
    const popW    = 228, popH = 150;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth  - rect.left;
    const top  = spaceBelow >= popH + 8 ? rect.bottom + 6 : rect.top - popH - 6;
    const left = spaceRight >= popW + 8  ? rect.left       : rect.right - popW;
    this.calPopover.set({ day, data, month, year, top, left });
  }

  onCellEnter(e: MouseEvent, day: number, data: DailyTotal | null, month: number, year: number) {
    clearTimeout(this._calTimer);
    if (!data) return;
    this._setCalPopover(e, day, data, month, year);
  }

  onCellLeave() {
    this._calTimer = setTimeout(() => this.calPopover.set(null), 160);
  }

  onCellClick(e: MouseEvent, day: number, data: DailyTotal | null, month: number, year: number) {
    e.stopPropagation();
    if (!data) return;
    if (this.calPopover()?.day === day) { this.calPopover.set(null); return; }
    clearTimeout(this._calTimer);
    this._setCalPopover(e, day, data, month, year);
  }

  onPopoverEnter() { clearTimeout(this._calTimer); }
  onPopoverLeave() { this.calPopover.set(null); }

  activeDays():  number { return this.daily().filter(d => d.totalIncome > 0 || d.totalExpense > 0).length; }
  incomedays():  number { return this.daily().filter(d => d.totalIncome > 0).length; }
  expenseDays(): number { return this.daily().filter(d => d.totalExpense > 0).length; }

  bestDay(): string {
    const daily = this.daily();
    if (!daily.length) return '-';
    const best = daily.reduce((a, b) => b.totalIncome > a.totalIncome ? b : a);
    if (best.totalIncome === 0) return '-';
    const d = new Date(best.date);
    return `${d.getDate()} ${this.months[d.getMonth()].label}`;
  }

  /* ── Insights ── */
  healthScore(): number {
    const r = this.report();
    if (!r) return 0;
    const rate = this.savingsRate();
    if (rate >= 30) return Math.min(100, 70 + rate);
    if (rate >= 15) return 50 + rate;
    if (rate >= 0)  return 30 + rate * 2;
    return Math.max(0, 30 + rate);
  }

  healthColor(): string {
    const s = this.healthScore();
    if (s >= 70) return 'var(--emerald)';
    if (s >= 50) return 'var(--blue)';
    if (s >= 30) return 'var(--amber)';
    return 'var(--red)';
  }

  healthRating(): string {
    const s = this.healthScore();
    if (s >= 70) return 'Sangat Baik';
    if (s >= 50) return 'Baik';
    if (s >= 30) return 'Cukup';
    return 'Perlu Perhatian';
  }

  healthTip(): string {
    const s = this.healthScore();
    if (s >= 70) return 'Keuangan Anda dalam kondisi prima. Pertahankan pola pengeluaran ini!';
    if (s >= 50) return 'Keuangan Anda cukup sehat. Coba tingkatkan tabungan 5% lagi.';
    if (s >= 30) return 'Pengeluaran mendekati pemasukan. Coba kurangi pengeluaran tidak perlu.';
    return 'Pengeluaran melebihi pemasukan. Segera evaluasi pola belanja Anda.';
  }

  healthRingDash(): string {
    const circ = 201.1; // r=32 used by sidebar ring
    const filled = (this.healthScore() / 100) * circ;
    return `${filled} ${circ}`;
  }

  heroRingDash(): string {
    const circ = 251.3; // r=40 used by hero ring
    const filled = (this.healthScore() / 100) * circ;
    return `${filled} ${circ}`;
  }

  topExpenseCategory(): string {
    const r = this.report();
    if (!r) return '-';
    const exp = r.byCategory.filter(c => c.type === 'EXPENSE').sort((a, b) => b.total - a.total);
    return exp[0]?.categoryName ?? 'Tidak ada';
  }

  avgDailyExpense(): number {
    const r = this.report();
    if (!r) return 0;
    const m = this.asMonthly(r);
    if (m) {
      const days = new Date(m.year, m.month, 0).getDate();
      return Math.round(r.totalExpense / days);
    }
    const active = Math.max(1, this.activeDays() || 1);
    return Math.round(r.totalExpense / active);
  }

  expenseCategories() {
    const r = this.report();
    if (!r) return [];
    return r.byCategory.filter(c => c.type === 'EXPENSE').sort((a, b) => b.total - a.total);
  }

  financialTips(): Array<{ icon: string; hex: string; title: string; text: string }> {
    const r = this.report();
    const tips: Array<{ icon: string; hex: string; title: string; text: string }> = [];
    if (!r) return tips;
    const rate = this.savingsRate();
    if (rate < 0) {
      tips.push({ icon: 'bi-exclamation-triangle-fill', hex: '#EF4444', title: 'Defisit Anggaran', text: `Pengeluaran melebihi pemasukan sebesar ${this.formatIDR(r.totalExpense - r.totalIncome)}. Evaluasi segera.` });
    } else if (rate < 15) {
      tips.push({ icon: 'bi-piggy-bank-fill', hex: '#D97706', title: 'Tingkatkan Tabungan', text: `Savings rate Anda ${rate}%. Target ideal adalah 20% dari pemasukan.` });
    } else {
      tips.push({ icon: 'bi-check-circle-fill', hex: '#10B981', title: 'Savings Rate Baik', text: `Anda berhasil menabung ${rate}% dari pemasukan bulan ini. Pertahankan!` });
    }
    const topCat = r.byCategory.filter(c => c.type === 'EXPENSE').sort((a, b) => b.total - a.total)[0];
    if (topCat) {
      tips.push({ icon: 'bi-tag-fill', hex: '#3B82F6', title: `Terbesar: ${topCat.categoryName}`, text: `Kategori ini menyumbang ${topCat.percentage}% dari total pengeluaran (${this.formatIDR(topCat.total)}).` });
    }
    const avgDaily = this.avgDailyExpense();
    tips.push({ icon: 'bi-calendar-day', hex: '#D97706', title: 'Pengeluaran Harian', text: `Rata-rata pengeluaran Anda ${this.formatIDR(avgDaily)}/hari. ${avgDaily > 100000 ? 'Coba kurangi 10% untuk hasil lebih baik.' : 'Pengeluaran harian Anda cukup terkontrol.'}` });
    return tips;
  }

  /* ── Helpers ── */
  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate()} ${this.months[d.getMonth()].label}`;
  }

  dayName(dateStr: string): string {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[new Date(dateStr).getDay()];
  }

  shortIDR(val: number): string {
    const abs = Math.abs(val);
    const prefix = val < 0 ? '-' : '+';
    if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000)     return `${prefix}${(abs / 1_000).toFixed(0)}rb`;
    return `${prefix}${abs}`;
  }

  formatIDR(val: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  /* ── Export ── */
  exportDailyCSV() {
    const r = this.report();
    if (!r) return;
    const m = this.asMonthly(r);
    const header = ['Tanggal', 'Pemasukan', 'Pengeluaran', 'Saldo'];
    const rows = this.daily().map(d => [d.date.split('T')[0], d.totalIncome, d.totalExpense, d.balance]);
    this.downloadCSV([header, ...rows], m ? `harian-${m.year}-${m.month}` : 'harian-custom');
  }

  exportCategoryCSV() {
    const r = this.report();
    if (!r) return;
    const m = this.asMonthly(r);
    const header = ['Kategori', 'Tipe', 'Total', 'Jumlah Transaksi', 'Persentase'];
    const rows = r.byCategory.map(c => [c.categoryName, c.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran', c.total, c.count, c.percentage + '%']);
    this.downloadCSV([header, ...rows], m ? `kategori-${m.year}-${m.month}` : 'kategori-custom');
  }

  printPage() { window.print(); }

  glassHex(hex: string, alpha = 0.13): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  borderHex(hex: string): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `1px solid rgba(${r},${g},${b},0.28)`;
  }

  private readonly CAT_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#14B8A6','#8B5CF6','#F97316','#06B6D4'];

  vibrantCatColor(name: string): string {
    const s = (name ?? '').toLowerCase();
    if (s.includes('makan') || s.includes('food') || s.includes('kopi') || s.includes('resto')) return '#F97316';
    if (s.includes('bensin') || s.includes('bbm') || s.includes('transport')) return '#3B82F6';
    if (s.includes('belanja') || s.includes('groceries') || s.includes('supermarket')) return '#8B5CF6';
    if (s.includes('listrik') || s.includes('tagihan') || s.includes('bayar')) return '#EF4444';
    if (s.includes('hiburan') || s.includes('game') || s.includes('streaming')) return '#EC4899';
    if (s.includes('kesehatan') || s.includes('medis') || s.includes('dokter')) return '#14B8A6';
    if (s.includes('sedekah') || s.includes('donasi') || s.includes('zakat')) return '#10B981';
    if (s.includes('gaji') || s.includes('pendapatan') || s.includes('income')) return '#059669';
    if (s.includes('pendidikan') || s.includes('sekolah')) return '#06B6D4';
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return this.CAT_COLORS[hash % this.CAT_COLORS.length];
  }

  catIcon(name: string): string {
    const s = (name ?? '').toLowerCase();
    if (s.includes('makan') || s.includes('food') || s.includes('kopi') || s.includes('resto') || s.includes('minuman')) return 'bi-cup-hot-fill';
    if (s.includes('bensin') || s.includes('bbm') || s.includes('bahan bakar')) return 'bi-fuel-pump-fill';
    if (s.includes('transport') || s.includes('ojek') || s.includes('kendaraan')) return 'bi-car-front-fill';
    if (s.includes('belanja') || s.includes('groceries') || s.includes('supermarket')) return 'bi-cart-fill';
    if (s.includes('listrik') || s.includes('tagihan') || s.includes('utilitas') || s.includes('bayar')) return 'bi-lightning-charge-fill';
    if (s.includes('hiburan') || s.includes('game') || s.includes('streaming')) return 'bi-controller';
    if (s.includes('kesehatan') || s.includes('medis') || s.includes('dokter') || s.includes('obat')) return 'bi-hospital-fill';
    if (s.includes('sedekah') || s.includes('donasi') || s.includes('zakat') || s.includes('infaq')) return 'bi-heart-fill';
    if (s.includes('gaji') || s.includes('pendapatan') || s.includes('salary') || s.includes('income')) return 'bi-wallet-fill';
    if (s.includes('pendidikan') || s.includes('sekolah') || s.includes('kursus')) return 'bi-book-fill';
    if (s.includes('lainnya') || s.includes('other')) return 'bi-grid-fill';
    return 'bi-tag-fill';
  }

  private downloadCSV(rows: (string | number)[][], filename: string) {
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
}
