import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { TransactionStore } from '../../store/transaction.store';
import { NotificationStore } from '../../store/notification.store';
import { Category, Transaction } from '@wa-finance/shared';
import { DateRangePickerComponent, DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, ReactiveFormsModule,
    MatProgressBarModule, MatSnackBarModule,
    DateRangePickerComponent,
  ],
  template: `
<div class="page">

  @if (store.loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ PAGE HEADER ══ -->
  <div class="page-hdr">
    <div>
      <h1 class="page-title">Transaksi</h1>
      <p class="page-sub">Semua aktivitas keuangan Anda</p>
    </div>
  </div>

  <!-- ══ STATS STRIP ══ -->
  <div class="stats-strip">
    <div class="stat-card">
      <div class="stat-label"><span class="stat-dot exp-dot"></span> Pengeluaran</div>
      <div class="stat-val expense-color">{{ periodSummary().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
      <div class="stat-sub">{{ periodLabel() }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><span class="stat-dot inc-dot"></span> Pemasukan</div>
      <div class="stat-val income-color">{{ periodSummary().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
      <div class="stat-sub">{{ periodLabel() }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Saldo Bersih</div>
      <div class="stat-val" [class.income-color]="periodSummary().balance >= 0" [class.expense-color]="periodSummary().balance < 0">
        {{ periodSummary().balance | currency:'IDR':'symbol':'1.0-0':'id' }}
      </div>
      <div class="stat-sub">{{ periodLabel() }}</div>
    </div>
  </div>

  <div class="page-body">

    <!-- ══ SEARCH + FILTER ══ -->
    <div class="search-row">
      <div class="search-box">
        <i class="bi bi-search search-ico"></i>
        <input class="search-input" placeholder="Cari transaksi..."
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)" />
        @if (searchQuery()) {
          <button class="search-clear" (click)="searchQuery.set('')"><i class="bi bi-x"></i></button>
        }
      </div>
    </div>

    <div class="filter-pills">
      <button class="filter-pill" [class.active]="typeFilter() === 'ALL'"      (click)="typeFilter.set('ALL')">Semua</button>
      <button class="filter-pill" [class.active]="typeFilter() === 'INCOME'"   (click)="typeFilter.set('INCOME')">
        <span class="pill-dot inc-dot"></span> Pemasukan
      </button>
      <button class="filter-pill" [class.active]="typeFilter() === 'EXPENSE'"  (click)="typeFilter.set('EXPENSE')">
        <span class="pill-dot exp-dot"></span> Pengeluaran
      </button>

      <!-- mode select -->
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
        <div class="pill-period pill-month">
          <i class="bi bi-calendar3"></i>
          <span>{{ periodLabel() }}</span>
          <i class="bi bi-chevron-down" style="font-size:0.6rem;opacity:0.6"></i>
          <select class="month-select-overlay" [value]="selMonthKey()" (change)="onMonthChange($event)">
            @for (opt of monthOptions(); track opt.key) {
              <option [value]="opt.key">{{ opt.label }}</option>
            }
          </select>
        </div>
      }
      @if (filterMode() === 'year') {
        <div class="pill-period pill-month">
          <i class="bi bi-calendar3"></i>
          <span>Tahun {{ selYear() }}</span>
          <i class="bi bi-chevron-down" style="font-size:0.6rem;opacity:0.6"></i>
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

      <div class="pill-spacer"></div>
      <span class="tx-count-chip">{{ filteredTxs().length }} transaksi</span>
    </div>

    <!-- ══ TRANSACTION FEED ══ -->
    @if (store.loading() && !store.transactions().length) {
      <!-- Skeleton: pagination count area -->
      <div style="display:flex;align-items:center;justify-content:flex-end;padding:4px 0">
        <div class="skeleton" style="width:110px;height:26px;border-radius:99px"></div>
      </div>
      <div class="card feed-card">
        @for (i of [1,2,3,4,5,6,7,8]; track i) {
          <div class="sk-row">
            <div class="skeleton sk-circle"></div>
            <div class="sk-body">
              <div class="skeleton sk-line" style="width:55%"></div>
              <div class="skeleton sk-line" style="width:35%;height:10px;margin-top:6px"></div>
            </div>
            <div class="skeleton sk-line" style="width:36px;height:10px"></div>
            <div class="skeleton sk-line" style="width:90px;height:16px"></div>
            <div class="skeleton sk-line" style="width:28px;height:28px;border-radius:8px"></div>
          </div>
        }
      </div>
    } @else if (groupedTransactions().length > 0) {
      @for (group of groupedTransactions(); track group.dateKey) {
        <div class="tx-group fade-in">
          <div class="group-hdr">{{ group.label }}</div>
          <div class="card feed-card">
            @for (tx of group.items; track tx.id; let last=$last) {
              <div class="tx-row" [class.tx-last]="last" [class.tx-del-mode]="deletingId() === tx.id">
                <div class="tx-ico" [style.background]="txBg(tx)" [style.color]="txColor(tx)" [style.border]="txBorderStyle(tx)">
                  <i class="bi" [class]="txIcon(tx)"></i>
                </div>
                <div class="tx-body">
                  <div class="tx-name">{{ tx.description | titlecase }}</div>
                  <div class="tx-meta">
                    {{ pmLabel(tx.paymentMethod) }}
                    @if (tx.category) { <span class="meta-sep">·</span> {{ tx.category.name }} }
                  </div>
                </div>
                <div class="tx-time">{{ formatTime(tx.date) }}</div>
                <div class="tx-amount" [class.inc]="tx.type==='INCOME'" [class.exp]="tx.type==='EXPENSE'">
                  {{ tx.type==='INCOME' ? '+' : '-' }}{{ tx.amount | currency:'IDR':'symbol':'1.0-0':'id' }}
                </div>
                <div class="tx-side">
                  <i class="bi bi-chevron-right tx-chevron"></i>
                  <button class="tx-act tx-edit" (click)="openEdit(tx); $event.stopPropagation()" [disabled]="store.loading()" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="tx-act tx-del" (click)="delete(tx); $event.stopPropagation()" [disabled]="store.loading()" title="Hapus">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (hasMore()) {
        <button class="load-more-btn" (click)="loadMore()" [disabled]="store.loading()">
          @if (store.loading()) { <i class="bi bi-arrow-repeat spin"></i> }
          Muat Lebih Banyak
        </button>
      } @else if (groupedTransactions().length > 0) {
        <p class="feed-end">Tidak ada transaksi lainnya</p>
      }

    } @else if (!store.loading()) {
      <div class="card feed-empty">
        <i class="bi bi-inbox"></i>
        <p>Tidak ada transaksi {{ typeFilter() !== 'ALL' ? 'untuk filter ini' : '' }}</p>
        <button class="fab-inline" (click)="openAdd()">
          <i class="bi bi-plus-lg"></i> Tambah Transaksi
        </button>
      </div>
    }

  </div>

  <!-- ══ FAB ══ -->
  <button class="fab" (click)="openAdd()">
    <i class="bi bi-plus-lg"></i>
    <span>Catat Transaksi</span>
  </button>

  <!-- ══ MODAL ══ -->
  @if (formOpen()) {
    <div class="modal-backdrop" (click)="resetAdd()">
      <div class="modal-box" (click)="$event.stopPropagation()">

        <div class="modal-hdr">
          <div class="modal-title-row">
            <div class="modal-icon">
              <i class="bi" [class.bi-pencil]="editingTx()" [class.bi-plus-lg]="!editingTx()"></i>
            </div>
            <span class="modal-title">{{ editingTx() ? 'Edit Transaksi' : 'Catat Transaksi' }}</span>
          </div>
          <button class="modal-close" type="button" (click)="resetAdd()"><i class="bi bi-x-lg"></i></button>
        </div>

        <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="modal-form">

          <div class="type-toggle">
            <button type="button" class="type-btn"
              [class.t-exp]="addForm.get('type')?.value === 'EXPENSE'"
              (click)="addForm.get('type')!.setValue('EXPENSE')">
              <i class="bi bi-arrow-up-right-circle-fill"></i> Pengeluaran
            </button>
            <button type="button" class="type-btn"
              [class.t-inc]="addForm.get('type')?.value === 'INCOME'"
              (click)="addForm.get('type')!.setValue('INCOME')">
              <i class="bi bi-arrow-down-left-circle-fill"></i> Pemasukan
            </button>
          </div>

          <div class="mf-group">
            <label class="mf-label">Deskripsi</label>
            <input class="mf-input" formControlName="description" placeholder="Contoh: makan siang" autocomplete="off" />
          </div>

          <div class="mf-group">
            <label class="mf-label">Jumlah (Rp)</label>
            <input class="mf-input" type="number" formControlName="amount" placeholder="20000" min="1" />
          </div>

          <div class="mf-2col">
            <div class="mf-group">
              <label class="mf-label">Metode Bayar</label>
              <select class="mf-select" formControlName="paymentMethod">
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
            <div class="mf-group">
              <label class="mf-label">Tanggal</label>
              <input class="mf-input" type="date" formControlName="date" />
            </div>
          </div>

          <div class="mf-group">
            <label class="mf-label">Kategori <span class="mf-opt">(opsional)</span></label>
            <select class="mf-select" formControlName="categoryId">
              <option value="">— Tanpa kategori —</option>
              @for (cat of filteredCategories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" type="button" (click)="resetAdd()">Batal</button>
            <button class="btn-emerald" type="submit" [disabled]="addForm.invalid || store.loading()">
              @if (store.loading()) { <i class="bi bi-arrow-repeat spin"></i> }
              @else { <i class="bi" [class.bi-check-lg]="!editingTx()" [class.bi-floppy]="editingTx()"></i> }
              {{ editingTx() ? 'Perbarui' : 'Simpan' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes modalIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
    .fade-in { animation: fadeUp 0.2s ease both; }
    .spin { animation: spin 0.8s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .page { display:flex; flex-direction:column; min-height:100%; background:var(--bg); }
    .page-prog { margin:0; }

    /* ══ HEADER ══ */
    .page-hdr { padding:28px 28px 16px; animation:fadeUp 0.25s ease both; }
    .page-title { font-size:1.9rem; font-weight:800; color:var(--text); letter-spacing:-0.04em; margin-bottom:4px; }
    .page-sub   { font-size:0.82rem; color:var(--muted); }

    /* ══ STATS STRIP ══ */
    .stats-strip {
      display:grid; grid-template-columns:repeat(3,1fr); gap:12px;
      padding:0 28px 16px; animation:fadeUp 0.25s 0.04s ease both;
    }
    .stat-card {
      background:var(--surface); border-radius:14px;
      border:1px solid var(--border);
      box-shadow:0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
      padding:18px 20px;
    }
    .stat-label { font-size:0.72rem; font-weight:600; color:var(--muted); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    .stat-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .inc-dot    { background:var(--emerald); }
    .exp-dot    { background:var(--red); }
    .stat-val   { font-size:1.4rem; font-weight:500; color:var(--text); letter-spacing:-0.04em; font-family:var(--font-mono); margin-bottom:4px; }
    .stat-sub   { font-size:0.68rem; color:var(--subtle); }

    /* ══ PAGE BODY ══ */
    .page-body { padding:0 28px 100px; display:flex; flex-direction:column; gap:10px; }

    /* ══ SEARCH ══ */
    .search-row { animation:fadeUp 0.25s 0.08s ease both; }
    .search-box {
      display:flex; align-items:center; gap:10px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:12px; padding:0 14px; height:46px;
      box-shadow:0 1px 3px rgba(15,23,42,0.04);
      transition:border-color 0.14s;
      &:focus-within { border-color:var(--emerald); }
    }
    .search-ico   { color:var(--muted); font-size:0.9rem; flex-shrink:0; }
    .search-input {
      flex:1; border:none; background:none; color:var(--text);
      font-size:0.85rem; font-family:var(--font);
      &:focus { outline:none; }
      &::placeholder { color:var(--subtle); }
    }
    .search-clear {
      width:24px; height:24px; border-radius:50%; border:none; background:var(--bg);
      color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center;
      font-size:0.8rem; flex-shrink:0; transition:all 0.14s;
      &:hover { background:var(--border); color:var(--text); }
    }

    /* ══ FILTER PILLS ══ */
    .filter-pills {
      display:flex; align-items:center; gap:6px; flex-wrap:wrap;
      animation:fadeUp 0.25s 0.10s ease both;
    }
    .filter-pill {
      height:36px; padding:0 14px; border-radius:99px;
      border:1.5px solid var(--border); background:var(--surface);
      color:var(--muted); font-size:0.8rem; font-weight:600; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.14s;
      &:hover { border-color:var(--text); color:var(--text); }
      &.active { background:var(--emerald); border-color:var(--emerald); color:#0D0F12; }
    }
    .pill-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .pill-period {
      height:36px; padding:0 14px; border-radius:99px;
      border:1.5px solid var(--border); background:var(--surface);
      color:var(--muted); font-size:0.8rem; font-weight:600;
      display:flex; align-items:center; gap:6px;
    }
    .pill-month {
      position:relative; cursor:pointer;
      transition:border-color 0.14s, color 0.14s;
      &:hover { border-color:var(--emerald); color:var(--text); }
    }
    .month-select-overlay {
      position:absolute; inset:0; opacity:0;
      width:100%; height:100%; cursor:pointer;
    }
    .pill-spacer { flex:1; }

    /* ══ FILTER MODE SELECT ══ */
    .fmode-select-wrap {
      height:36px; padding:0 10px 0 12px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface);
      display:flex; align-items:center; gap:7px; position:relative;
      flex-shrink:0; cursor:pointer; transition:border-color 0.14s;
      &:hover { border-color:var(--emerald); }
    }
    .fmode-sel-ico   { font-size:0.78rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .fmode-sel-label { font-size:0.8rem; font-weight:600; color:var(--text); pointer-events:none; }
    .fmode-sel-caret { font-size:0.6rem; color:var(--muted); pointer-events:none; flex-shrink:0; }
    .fmode-select {
      position:absolute; inset:0; opacity:0; width:100%; height:100%;
      cursor:pointer; appearance:none;
    }

    /* shared date-range-picker host */
    app-date-range-picker { display:block; }
    .tx-count-chip {
      font-size:0.7rem; font-weight:700; color:var(--emerald);
      background:var(--emerald-dim); border-radius:99px; padding:4px 12px; flex-shrink:0;
    }

    /* ══ SKELETON ══ */
    .sk-row {
      display:flex; align-items:center; gap:14px; padding:14px 20px;
      border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
    }
    .sk-circle { width:44px; height:44px; border-radius:13px; flex-shrink:0; }
    .sk-body   { flex:1; }
    .sk-line   { height:14px; border-radius:4px; }

    /* ══ TRANSACTION FEED ══ */
    .tx-group  { display:flex; flex-direction:column; gap:6px; }
    .group-hdr { font-size:0.82rem; font-weight:700; color:var(--muted); padding:0 4px; }

    .feed-card {
      background:var(--surface); border-radius:16px;
      border:1px solid var(--border);
      box-shadow:0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
      overflow:hidden;
    }

    .tx-row {
      display:flex; align-items:center; gap:12px;
      padding:13px 16px; border-bottom:1px solid var(--border);
      transition:background 0.12s; cursor:pointer;
      &.tx-last   { border-bottom:none; }
      &:hover { background:rgba(15,23,42,0.02); }
      &:hover .tx-act     { opacity:1; pointer-events:auto; }
      &:hover .tx-chevron { opacity:0; }
    }
    .tx-ico {
      width:44px; height:44px; border-radius:13px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; font-size:1.1rem;
    }
    .tx-body   { flex:1; min-width:0; }
    .tx-name   { font-size:0.86rem; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
    .tx-meta   { font-size:0.72rem; color:var(--muted); display:flex; align-items:center; gap:4px; }
    .meta-sep  { color:var(--border); }
    .tx-time   { font-size:0.72rem; color:var(--subtle); flex-shrink:0; min-width:36px; text-align:center; }
    .tx-amount { font-size:0.9rem; font-weight:700; font-family:var(--font-mono); flex-shrink:0; min-width:110px; text-align:right;
      &.inc { color:var(--emerald); }
      &.exp { color:var(--red); }
    }
    .tx-side {
      position:relative; flex-shrink:0;
      width:60px; display:flex; align-items:center; justify-content:flex-end;
    }
    .tx-chevron {
      font-size:0.72rem; color:var(--subtle);
      transition:opacity 0.14s; position:absolute; right:0;
    }
    .tx-act {
      width:28px; height:28px; border-radius:8px; border:none; background:none;
      font-size:0.78rem; cursor:pointer; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none; transition:opacity 0.14s; color:var(--subtle);
      &:disabled { cursor:not-allowed; }
    }
    .tx-edit:hover { background:var(--blue-dim); color:var(--blue); }
    .tx-del:hover  { background:var(--red-dim);  color:var(--red); }

    .feed-empty {
      padding:56px 24px; text-align:center;
      display:flex; flex-direction:column; align-items:center; gap:12px; color:var(--subtle);
      i { font-size:2.2rem; }
      p { font-size:0.82rem; }
    }

    .feed-end { text-align:center; font-size:0.78rem; color:var(--subtle); padding:16px 0 8px; }

    .load-more-btn {
      width:100%; padding:12px; border-radius:12px;
      border:1.5px dashed var(--border); background:none;
      color:var(--muted); font-size:0.82rem; font-weight:600; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
      transition:all 0.14s;
      &:hover { border-color:var(--emerald); color:var(--emerald); background:var(--emerald-dim); }
      &:disabled { opacity:0.5; cursor:not-allowed; }
    }

    /* ══ FAB ══ */
    .fab {
      position:fixed; bottom:28px; right:28px; z-index:200;
      height:52px; padding:0 24px;
      background:var(--emerald); color:#0D0F12;
      border:none; border-radius:99px;
      font-size:0.9rem; font-weight:800; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:8px;
      box-shadow:0 6px 24px rgba(45,212,191,0.45), 0 2px 8px rgba(45,212,191,0.2);
      transition:all 0.2s;
      i { font-size:1rem; }
      &:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(45,212,191,0.55); }
      &:active { transform:scale(0.97); }
    }

    .fab-inline {
      height:40px; padding:0 20px; border-radius:10px;
      background:var(--emerald); color:#0D0F12; border:none;
      font-size:0.84rem; font-weight:700; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:6px;
      transition:opacity 0.14s;
      &:hover { opacity:0.88; }
    }

    /* ══ MODAL ══ */
    .modal-backdrop {
      position:fixed; inset:0; background:rgba(15,23,42,0.45);
      backdrop-filter:blur(3px); z-index:1000;
    }
    .modal-box {
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      width:min(460px, 92vw);
      background:var(--surface); border-radius:18px;
      border:1px solid var(--border); box-shadow:0 24px 64px rgba(15,23,42,0.2);
      animation:modalIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both;
      overflow:hidden;
    }
    .modal-hdr {
      display:flex; align-items:center; justify-content:space-between;
      padding:18px 20px 16px; border-bottom:1px solid var(--border);
    }
    .modal-title-row { display:flex; align-items:center; gap:10px; }
    .modal-icon {
      width:32px; height:32px; border-radius:9px;
      background:var(--emerald-dim); color:var(--emerald);
      display:flex; align-items:center; justify-content:center; font-size:0.9rem;
    }
    .modal-title { font-size:1rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; }
    .modal-close {
      width:30px; height:30px; border-radius:8px; border:none; background:none;
      color:var(--subtle); cursor:pointer; font-size:0.78rem;
      display:flex; align-items:center; justify-content:center; transition:all 0.14s;
      &:hover { background:var(--red-dim); color:var(--red); }
    }
    .modal-form   { padding:20px; display:flex; flex-direction:column; gap:14px; }
    .modal-footer { display:flex; justify-content:flex-end; gap:8px; padding-top:4px; }

    .type-toggle { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .type-btn {
      padding:10px; border-radius:10px; border:1.5px solid var(--border);
      background:var(--bg); color:var(--muted); font-size:0.82rem; font-weight:600;
      font-family:var(--font); cursor:pointer; display:flex; align-items:center;
      justify-content:center; gap:6px; transition:all 0.15s;
      &:hover   { border-color:var(--text); color:var(--text); }
      &.t-exp   { background:var(--red-dim); border-color:var(--red); color:var(--red); }
      &.t-inc   { background:var(--emerald-dim); border-color:var(--emerald); color:var(--emerald); }
    }

    .mf-group  { display:flex; flex-direction:column; gap:5px; }
    .mf-2col   { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .mf-label  { font-size:0.72rem; font-weight:700; color:var(--muted); letter-spacing:0.02em; }
    .mf-opt    { font-weight:500; color:var(--subtle); }
    .mf-input, .mf-select {
      height:40px; padding:0 12px;
      border:1.5px solid var(--border); border-radius:9px;
      background:var(--bg); color:var(--text);
      font-size:0.85rem; font-family:var(--font); width:100%; transition:border-color 0.14s;
      &:focus { outline:none; border-color:var(--emerald); }
    }

    .btn-emerald {
      height:40px; padding:0 20px;
      background:var(--emerald); color:#0D0F12;
      border:none; border-radius:10px;
      font-size:0.84rem; font-weight:700; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:7px;
      transition:opacity 0.14s; white-space:nowrap;
      &:hover:not(:disabled) { opacity:0.88; }
      &:disabled { opacity:0.45; cursor:not-allowed; }
    }
    .btn-ghost {
      height:40px; padding:0 16px;
      background:transparent; color:var(--muted);
      border:1px solid var(--border); border-radius:10px;
      font-size:0.82rem; font-weight:600; font-family:var(--font);
      cursor:pointer; transition:background 0.14s;
      &:hover { background:var(--bg); color:var(--text); }
    }

    /* Shared */
    .income-color  { color:var(--emerald) !important; }
    .expense-color { color:var(--red)     !important; }

    :host-context(body.dark) .tx-row:hover { background:rgba(255,255,255,0.03) !important; }
    :host-context(body.dark) .mf-input,
    :host-context(body.dark) .mf-select { background:rgba(255,255,255,0.05) !important; border-color:var(--border) !important; }

    @media (max-width: 700px) {
      .stats-strip { grid-template-columns:1fr; }
      .page-hdr, .page-body { padding-left:16px; padding-right:16px; }
      .stats-strip { padding:0 16px 16px; }
      .fab { bottom:20px; right:16px; }
    }
  `],
})
export class TransactionsComponent implements OnInit {
  readonly store = inject(TransactionStore);
  private readonly txService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly notifStore = inject(NotificationStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  private readonly MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  readonly selMonth    = signal(new Date().getMonth() + 1);
  readonly selYear     = signal(new Date().getFullYear());
  readonly filterMode  = signal<'month'|'year'|'custom'>('month');
  readonly rangeStart  = signal<string>('');
  readonly rangeEnd    = signal<string>('');
  readonly periodSummary  = signal<{ totalIncome: number; totalExpense: number; balance: number }>({ totalIncome: 0, totalExpense: 0, balance: 0 });

  readonly formOpen      = signal(false);
  readonly editingTx     = signal<Transaction | null>(null);
  readonly typeFilter    = signal<string>('ALL');
  readonly searchQuery   = signal<string>('');
  readonly deletingId    = signal<string | null>(null);
  readonly allCategories = signal<Category[]>([]);
  readonly formType      = signal<string>('EXPENSE');

  monthLabel()  { return `${this.MONTH_NAMES[this.selMonth()-1]} ${this.selYear()}`; }
  selMonthKey() { return `${this.selYear()}-${String(this.selMonth()).padStart(2,'0')}`; }

  periodLabel(): string {
    const mode = this.filterMode();
    if (mode === 'month') return this.monthLabel();
    if (mode === 'year')  return `Tahun ${this.selYear()}`;
    const s = this.rangeStart(), e = this.rangeEnd();
    if (!s || !e) return 'Pilih Rentang';
    return `${this.formatPillDate(s)} – ${this.formatPillDate(e)}`;
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

  setMode(mode: 'month'|'year'|'custom') {
    this.filterMode.set(mode);
    this.currentPage = 1;
    this.store.setTransactions([], 0);
    if (mode !== 'custom') this.load();
  }

  onYearChange(e: Event) {
    const y = parseInt((e.target as HTMLSelectElement).value);
    this.selYear.set(y);
    this.currentPage = 1;
    this.store.setTransactions([], 0);
    this.load();
  }

  onRangeChange(range: DateRange) {
    this.rangeStart.set(range.start);
    this.rangeEnd.set(range.end);
    if (range.end) {
      this.currentPage = 1;
      this.store.setTransactions([], 0);
      this.load();
    }
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
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      opts.push({ key, label: `${this.MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return opts;
  }

  onMonthChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    const [year, month] = val.split('-').map(Number);
    this.selYear.set(year);
    this.selMonth.set(month);
    this.currentPage = 1;
    this.store.setTransactions([], 0);
    this.load();
  }

  private currentPage = 1;
  private readonly pageSize = 50;
  readonly hasMore = signal(false);

  readonly addForm = this.fb.group({
    type:          ['EXPENSE', Validators.required],
    description:   ['', Validators.required],
    amount:        [null as number | null, [Validators.required, Validators.min(1)]],
    paymentMethod: ['CASH', Validators.required],
    categoryId:    [''],
    date:          [new Date().toISOString().slice(0, 10)],
  });

  readonly filteredCategories = computed(() =>
    this.allCategories().filter(c => c.type === this.formType() || c.type === 'BOTH')
  );

  readonly filteredTxs = computed(() => {
    let txs = this.store.transactions();
    const type = this.typeFilter();
    const q = this.searchQuery().toLowerCase().trim();
    if (type !== 'ALL') txs = txs.filter(t => t.type === type);
    if (q) txs = txs.filter(t => t.description.toLowerCase().includes(q));
    return txs;
  });

  readonly groupedTransactions = computed(() => {
    const txs = this.filteredTxs();
    if (!txs.length) return [];

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const groups = new Map<string, Transaction[]>();
    for (const tx of txs) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const d = new Date(key + 'T00:00:00');
        d.setHours(0, 0, 0, 0);
        let label: string;
        if (d.getTime() === today.getTime())
          label = `Hari Ini · ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        else if (d.getTime() === yesterday.getTime())
          label = `Kemarin · ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        else
          label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        return { label, dateKey: key, items };
      });
  });

  ngOnInit() {
    const now = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.rangeStart.set(`${y}-${pad(m)}-01`);
    this.rangeEnd.set(`${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`);

    this.categoryService.getAll().subscribe(cats => this.allCategories.set(cats));
    this.addForm.get('type')!.valueChanges.subscribe(v => {
      this.formType.set(v ?? 'EXPENSE');
      this.addForm.get('categoryId')!.setValue('');
    });
    this.load();
  }

  private load(append = false) {
    const pad  = (n: number) => String(n).padStart(2, '0');
    const mode = this.filterMode();
    let startDate: string, endDate: string;

    if (mode === 'month') {
      const m = this.selMonth(), y = this.selYear();
      const lastDay = new Date(y, m, 0).getDate();
      startDate = `${y}-${pad(m)}-01`;
      endDate   = `${y}-${pad(m)}-${pad(lastDay)}`;
    } else if (mode === 'year') {
      const y = this.selYear();
      startDate = `${y}-01-01`;
      endDate   = `${y}-12-31`;
    } else {
      if (!this.rangeStart() || !this.rangeEnd()) { this.store.setLoading(false); return; }
      startDate = this.rangeStart();
      endDate   = this.rangeEnd();
    }

    this.store.setLoading(true);
    this.txService.getAll({ page: this.currentPage, limit: this.pageSize, startDate, endDate }).subscribe({
      next: (result) => {
        if (append) {
          this.store.setTransactions([...this.store.transactions(), ...result.data], result.total);
        } else {
          this.store.setTransactions(result.data, result.total);
        }
        this.hasMore.set(this.store.transactions().length < result.total);
        this.store.setLoading(false);
        // compute period summary from fetched data (may be partial for paginated, but fine for top summary)
        const txs = this.store.transactions() as any[];
        const totalIncome  = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        this.periodSummary.set({ totalIncome, totalExpense, balance: totalIncome - totalExpense });
      },
      error: () => this.store.setLoading(false),
    });

    // For monthly mode, also fetch official summary from API
    if (mode === 'month') {
      this.txService.getThisMonth(this.selMonth(), this.selYear()).subscribe(s => {
        this.store.setMonth(s);
        this.periodSummary.set(s);
      });
    }
  }

  loadMore() {
    this.currentPage++;
    this.load(true);
  }

  openAdd() {
    this.editingTx.set(null);
    this.formType.set('EXPENSE');
    this.formOpen.set(true);
  }

  openEdit(tx: Transaction) {
    const d = new Date(tx.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    this.formType.set(tx.type);
    this.addForm.patchValue({
      type:          tx.type,
      description:   tx.description,
      amount:        tx.amount,
      paymentMethod: tx.paymentMethod,
      categoryId:    tx.category?.id ?? '',
      date:          dateStr,
    });
    this.editingTx.set(tx);
    this.formOpen.set(true);
  }

  submitAdd() {
    if (this.addForm.invalid) return;
    this.store.setLoading(true);
    const v = this.addForm.value;
    const payload = {
      type:          v.type as 'INCOME' | 'EXPENSE',
      description:   v.description!,
      amount:        v.amount!,
      paymentMethod: v.paymentMethod as any,
      categoryId:    v.categoryId || undefined,
      date:          v.date || undefined,
    };
    const editing = this.editingTx();
    const req$ = editing
      ? this.txService.update(editing.id, payload)
      : this.txService.create(payload);
    req$.subscribe({
      next: (saved) => {
        const msg = editing ? 'Transaksi diperbarui' : 'Transaksi berhasil ditambahkan';
        this.snack.open(msg, 'Tutup', { duration: 3000 });
        this.notifStore.push(msg, 'success');
        this.resetAdd();
        this.currentPage = 1;
        this.load();
      },
      error: () => {
        const msg = 'Gagal menyimpan transaksi';
        this.store.setLoading(false);
        this.snack.open(msg, 'Tutup', { duration: 3000 });
        this.notifStore.push(msg, 'error');
      },
    });
  }

  resetAdd() {
    this.addForm.reset({ type: 'EXPENSE', description: '', amount: null, paymentMethod: 'CASH', categoryId: '', date: new Date().toISOString().slice(0, 10) });
    this.editingTx.set(null);
    this.formOpen.set(false);
  }

  delete(tx: Transaction) {
    if (!confirm(`Hapus transaksi "${tx.description}"?`)) return;
    this.store.setLoading(true);
    this.txService.delete(tx.id).subscribe({
      next: () => {
        this.store.removeTransaction(tx.id);
        this.store.setLoading(false);
        this.load();
        const msg = `Transaksi "${tx.description}" dihapus`;
        this.snack.open('Transaksi dihapus', 'Tutup', { duration: 3000 });
        this.notifStore.push(msg, 'info');
      },
      error: () => {
        this.store.setLoading(false);
        const msg = 'Gagal menghapus transaksi';
        this.snack.open(msg, 'Tutup', { duration: 3000 });
        this.notifStore.push(msg, 'error');
      },
    });
  }

  formatTime(date: string): string {
    const d = new Date(date);
    const h = d.getHours(), m = d.getMinutes();
    if (h === 0 && m === 0) return '—';
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  pmLabel(pm: string): string {
    return pm === 'CASH' ? 'Cash' : pm === 'TRANSFER' ? 'Transfer' : 'QRIS';
  }

  txIcon(tx: Transaction): string {
    const s = ((tx.category?.name ?? '') + tx.description).toLowerCase();
    if (tx.type === 'INCOME') return 'bi-wallet-fill';
    if (s.includes('makan') || s.includes('food') || s.includes('soto') || s.includes('kopi') || s.includes('resto') || s.includes('nasi')) return 'bi-cup-hot-fill';
    if (s.includes('bensin') || s.includes('bbm') || s.includes('pertalite') || s.includes('pertamax')) return 'bi-fuel-pump-fill';
    if (s.includes('transport') || s.includes('ojek') || s.includes('grab') || s.includes('gojek')) return 'bi-car-front-fill';
    if (s.includes('belanja') || s.includes('shop') || s.includes('alfamart') || s.includes('indomaret') || s.includes('groceries')) return 'bi-cart-fill';
    if (s.includes('listrik') || s.includes('tagihan') || s.includes('bayar') || s.includes('token')) return 'bi-lightning-charge-fill';
    if (s.includes('hiburan') || s.includes('nonton') || s.includes('game')) return 'bi-controller';
    if (s.includes('hadiah') || s.includes('gift')) return 'bi-gift-fill';
    if (s.includes('sedekah') || s.includes('donasi') || s.includes('zakat') || s.includes('infaq')) return 'bi-heart-fill';
    if (s.includes('kesehatan') || s.includes('dokter') || s.includes('obat') || s.includes('klinik')) return 'bi-hospital-fill';
    return 'bi-receipt-cutoff';
  }

  private glassHex(hex: string, alpha = 0.13): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  private borderHex(hex: string): string {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `1px solid rgba(${r},${g},${b},0.28)`;
  }

  private txSolidColor(tx: Transaction): string {
    const s = ((tx.category?.name ?? '') + tx.description).toLowerCase();
    if (tx.type === 'INCOME') return '#059669';
    if (s.includes('makan') || s.includes('food') || s.includes('kopi') || s.includes('soto')) return '#10B981';
    if (s.includes('bensin') || s.includes('transport') || s.includes('ojek')) return '#3B82F6';
    if (s.includes('listrik') || s.includes('tagihan')) return '#EF4444';
    if (s.includes('belanja') || s.includes('alfamart') || s.includes('indomaret')) return '#8B5CF6';
    if (s.includes('hadiah')) return '#EC4899';
    if (s.includes('sedekah') || s.includes('donasi')) return '#10B981';
    return '#6366F1';
  }

  txBg(tx: Transaction): string          { return this.glassHex(this.txSolidColor(tx)); }
  txColor(tx: Transaction): string       { return this.txSolidColor(tx); }
  txBorderStyle(tx: Transaction): string { return this.borderHex(this.txSolidColor(tx)); }
}
