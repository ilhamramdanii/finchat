import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { TransactionStore } from '../../store/transaction.store';
import { I18nService } from '../../core/services/i18n.service';
import { Category, Transaction } from '@wa-finance/shared';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker/date-range-picker.component';
import { VoiceInputComponent, VoiceFormPrefill } from './voice-input.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, ReactiveFormsModule,
    MatProgressBarModule, MatSnackBarModule,
    DateRangePickerComponent, VoiceInputComponent,
  ],
  template: `
<div class="page page-fade">

  @if (store.loading()) { <mat-progress-bar mode="indeterminate" class="page-prog" /> }

  <!-- ══ APPLE LARGE TITLE HEADER ══ -->
  <div class="page-hdr">
    <div>
      <div class="hdr-eyebrow num">{{ i18n.t().txEyebrow }}</div>
      <h1 class="page-title font-display">{{ i18n.t().txTitle }}</h1>
    </div>
    <button class="btn-create tap-target-44" (click)="openAdd()">
      <i class="bi bi-plus-lg"></i>
      <span>{{ i18n.t().recordCash }}</span>
    </button>
  </div>

  <!-- ══ APPLE SUMMARY CARDS (MATCHING OVERVIEW) ══ -->
  <div class="metrics-strip">
    <div class="metric-card apple-card">
      <div class="mc-hdr"><i class="bi bi-arrow-down-left-circle-fill green-txt"></i> {{ i18n.t().income }}</div>
      <div class="mc-val green-txt num">{{ periodSummary().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
    </div>
    <div class="metric-card apple-card">
      <div class="mc-hdr"><i class="bi bi-arrow-up-right-circle-fill red-txt"></i> {{ i18n.t().expense }}</div>
      <div class="mc-val red-txt num">{{ periodSummary().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
    </div>
    <div class="metric-card apple-card full-mobile">
      <div class="mc-hdr"><i class="bi bi-wallet2 cobalt-color"></i> {{ i18n.t().netBalance }}</div>
      <div class="mc-val num" [class.green-txt]="periodSummary().balance >= 0" [class.red-txt]="periodSummary().balance < 0">
        {{ periodSummary().balance | currency:'IDR':'symbol':'1.0-0':'id' }}
      </div>
    </div>
  </div>

  <div class="page-body">

    <!-- ══ TOOLBAR & FILTERS (Apple Segmented Control & Search) ══ -->
    <div class="toolbar">
      <div class="search-input-wrap apple-card">
        <i class="bi bi-search search-ico"></i>
        <input class="search-input" [placeholder]="i18n.t().searchPlaceholder"
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)" />
        @if (searchQuery()) {
          <button class="search-clear-btn tap-target-44" (click)="searchQuery.set('')"><i class="bi bi-x-circle-fill"></i></button>
        }
      </div>

      <div class="segmented-control">
        <button class="segmented-item" [class.active]="typeFilter() === 'ALL'" (click)="typeFilter.set('ALL')">{{ i18n.t().all }}</button>
        <button class="segmented-item" [class.active]="typeFilter() === 'INCOME'" (click)="typeFilter.set('INCOME')">{{ i18n.t().inFlow }}</button>
        <button class="segmented-item" [class.active]="typeFilter() === 'EXPENSE'" (click)="typeFilter.set('EXPENSE')">{{ i18n.t().outFlow }}</button>
      </div>
    </div>

    <!-- ══ APPLE INSET GROUPED LIST ══ -->
    @if (store.loading() && !store.transactions().length) {
      <div class="ledger-panel apple-card">
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="ledger-row">
            <div class="col-type"><span class="skeleton" style="width: 32px; height: 18px;"></span></div>
            <div class="col-main">
              <span class="skeleton" style="width: 50%; height: 14px; margin-bottom: 4px;"></span>
              <span class="skeleton" style="width: 30%; height: 10px;"></span>
            </div>
            <div class="col-amount"><span class="skeleton" style="width: 75px; height: 16px;"></span></div>
          </div>
        }
      </div>
    } @else if (groupedTransactions().length > 0) {
      @for (group of groupedTransactions(); track group.dateKey) {
        <div class="ledger-group">
          <div class="group-date-label num">{{ group.label }}</div>
          <div class="ledger-panel apple-card">
            @for (tx of group.items; track tx.id) {
              <div class="ledger-row" (click)="toggleRowActions(tx.id)" [class.expanded]="activeRowId() === tx.id">
                <div class="col-type">
                  <span class="badge" [class.income]="tx.type==='INCOME'" [class.expense]="tx.type==='EXPENSE'">
                    {{ tx.type==='INCOME' ? (i18n.currentLang()==='id'?'MASUK':'IN') : (i18n.currentLang()==='id'?'KELUAR':'OUT') }}
                  </span>
                </div>
                <div class="col-main">
                  <div class="tx-name">{{ tx.description | titlecase }}</div>
                  <div class="tx-meta num">
                    <span class="badge" [class.cash]="tx.paymentMethod==='CASH'" [class.transfer]="tx.paymentMethod==='TRANSFER'" [class.qris]="tx.paymentMethod==='QRIS'">
                      {{ tx.paymentMethod }}
                    </span>
                    @if (tx.category) { <span class="cat-tag">• {{ tx.category.name }}</span> }
                  </div>
                </div>
                <div class="col-amount num" [class.income-color]="tx.type==='INCOME'" [class.expense-color]="tx.type==='EXPENSE'">
                  {{ tx.type==='INCOME' ? '+' : '-' }}{{ tx.amount | currency:'IDR':'symbol':'1.0-0':'id' }}
                </div>
                <i class="bi bi-chevron-right row-chevron"></i>
                @if (activeRowId() === tx.id) {
                  <div class="col-actions fade-in" (click)="$event.stopPropagation()">
                    <button class="row-btn tap-target-44" (click)="openEdit(tx)" [title]="i18n.t().editTransaction"><i class="bi bi-pencil-fill"></i></button>
                    <button class="row-btn del tap-target-44" (click)="delete(tx)" [title]="i18n.t().delete"><i class="bi bi-trash-fill"></i></button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    } @else if (!store.loading()) {
      <div class="empty-card apple-card">
        <i class="bi bi-tray"></i>
        <p>{{ i18n.t().emptyTransactions }}</p>
      </div>
    }

  </div>

  <!-- ══ APPLE BOTTOM SHEET / MODAL WITH AUTO SCROLL/VIEWPORT FIX ══ -->
  @if (formOpen()) {
    <div class="modal-backdrop" (click)="resetAdd()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-grabber"></div>
        <div class="modal-hdr">
          <span class="modal-title font-display">{{ editingTx() ? i18n.t().editTransaction : i18n.t().newTransaction }}</span>
          <button class="modal-close tap-target-44" type="button" (click)="resetAdd()"><i class="bi bi-x-circle-fill"></i></button>
        </div>

        <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="modal-form">
          <div class="segmented-control type-segment">
            <button type="button" class="segmented-item"
              [class.active]="addForm.get('type')?.value === 'EXPENSE'"
              (click)="addForm.get('type')!.setValue('EXPENSE')">
              <i class="bi bi-arrow-up-right-circle-fill red-txt"></i> {{ i18n.t().expense }}
            </button>
            <button type="button" class="segmented-item"
              [class.active]="addForm.get('type')?.value === 'INCOME'"
              (click)="addForm.get('type')!.setValue('INCOME')">
              <i class="bi bi-arrow-down-left-circle-fill green-txt"></i> {{ i18n.t().income }}
            </button>
          </div>

          <div class="form-field">
            <label class="field-lbl">{{ i18n.t().txDescription }}</label>
            <input #descInput class="field-inp" formControlName="description" [placeholder]="i18n.currentLang()==='id'?'Contoh: Belanja Bensin':'e.g. Groceries'" autocomplete="off" />
            <app-voice-input (useAsForm)="onVoiceForm($event)" />
          </div>

          <div class="form-field">
            <label class="field-lbl">{{ i18n.t().txAmount }}</label>
            <input class="field-inp num" type="number" formControlName="amount" placeholder="50000" min="1" />
          </div>

          <div class="form-grid-2">
            <div class="form-field">
              <label class="field-lbl">{{ i18n.t().paymentMethod }}</label>
              <select class="field-sel" formControlName="paymentMethod">
                <option value="CASH">CASH</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
            <div class="form-field">
              <label class="field-lbl">{{ i18n.t().txDate }}</label>
              <input class="field-inp" type="date" formControlName="date" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel tap-target-44" type="button" (click)="resetAdd()">{{ i18n.t().cancel }}</button>
            <button class="btn-submit tap-target-44" type="submit" [disabled]="addForm.invalid || store.loading()">
              {{ editingTx() ? i18n.t().save : i18n.t().save }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; padding: 20px; max-width: 1180px; margin: 0 auto; width: 100%; }
    
    .page-hdr { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .hdr-eyebrow { font-size: 0.68rem; font-weight: 700; color: var(--cobalt); letter-spacing: 0.05em; }
    .page-title { font-size: 1.8rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }

    .btn-create {
      padding: 0 16px; border-radius: 9px; background: var(--cobalt); color: #FFF;
      border: none; font-size: 0.84rem; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
      transition: all 0.15s ease; &:hover { background: var(--cobalt-bright); }
    }

    /* Metrics Strip matching Overview */
    .metrics-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .metric-card { padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; }
    .mc-hdr { font-size: 0.76rem; font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .mc-val { font-size: 1.25rem; font-weight: 800; }
    .green-txt { color: var(--green) !important; }
    .red-txt { color: var(--red) !important; }
    .cobalt-color { color: var(--cobalt) !important; }

    .page-body { display: flex; flex-direction: column; gap: 16px; }
    
    /* Toolbar */
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .search-input-wrap {
      display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border-radius: 9px;
      flex: 1; min-width: 240px;
    }
    .search-ico { color: var(--subtle); font-size: 0.88rem; }
    .search-input { border: none; background: none; outline: none; font-size: 0.86rem; color: var(--text); width: 100%; }
    .search-clear-btn { background: none; border: none; color: var(--subtle); cursor: pointer; font-size: 1.05rem; }

    /* Apple Grouped Inset List */
    .ledger-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
    .group-date-label { font-size: 0.74rem; font-weight: 700; color: var(--subtle); padding: 0 4px; }
    .ledger-panel { display: flex; flex-direction: column; }
    
    .ledger-row {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-bottom: 1px solid var(--border); position: relative; cursor: pointer;
      transition: background-color 0.14s ease;
      &:last-child { border-bottom: none; }
      &:hover { background: var(--surface-2); }
      &.expanded { background: var(--surface-2); }
    }

    .col-type { flex-shrink: 0; }
    .col-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .tx-name { font-size: 0.9rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-meta { font-size: 0.72rem; color: var(--subtle); display: flex; align-items: center; gap: 6px; }
    .cat-tag { color: var(--muted); font-weight: 600; }

    .col-amount { font-size: 0.95rem; font-weight: 700; flex-shrink: 0; }
    .row-chevron { color: var(--subtle); font-size: 0.75rem; margin-left: 4px; }

    .col-actions {
      position: absolute; right: 12px; display: flex; gap: 6px; align-items: center;
      background: var(--surface); padding: 2px 6px; border-radius: 8px; box-shadow: var(--shadow-md);
      border: 1px solid var(--border);
    }
    .row-btn {
      background: none; border: none; font-size: 0.9rem; color: var(--muted); cursor: pointer;
      border-radius: 6px; transition: all 0.14s ease;
      &:hover { color: var(--cobalt); }
      &.del:hover { color: var(--red); }
    }

    .empty-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
      padding: 40px 20px; text-align: center; color: var(--subtle);
      i { font-size: 2.2rem; }
      p { font-size: 0.85rem; font-weight: 500; }
    }

    /* Modal / Bottom Sheet Form */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1050;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal-box {
      width: min(440px, 100%); background: var(--surface); border-radius: 20px;
      border: 1px solid var(--border-strong); padding: 22px; box-shadow: var(--shadow-lg);
      max-height: 90vh; overflow-y: auto;
    }
    .modal-grabber { display: none; }
    .modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .modal-title { font-size: 1.1rem; font-weight: 800; color: var(--text); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--subtle); font-size: 1.2rem; }

    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .type-segment { width: 100%; display: flex; }
    .type-segment .segmented-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; }

    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .field-lbl { font-size: 0.76rem; font-weight: 600; color: var(--muted); }
    .field-inp, .field-sel {
      height: 40px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text); font-size: 0.88rem; outline: none; font-weight: 600;
      &:focus { border-color: var(--cobalt); }
    }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
    .btn-cancel {
      padding: 0 16px; border-radius: 9px; border: 1px solid var(--border);
      background: transparent; color: var(--muted); font-weight: 600; cursor: pointer;
    }
    .btn-submit {
      padding: 0 20px; border-radius: 9px; border: none;
      background: var(--cobalt); color: #FFF; font-weight: 600; cursor: pointer;
      &:disabled { opacity: 0.5; }
    }

    @media (max-width: 640px) {
      .page { padding: 12px; gap: 12px; }
      .page-title { font-size: 1.35rem; }
      .metrics-strip { grid-template-columns: 1fr 1fr; }
      .metric-card.full-mobile { grid-column: span 2; }

      .modal-backdrop {
        align-items: flex-end; padding: 0;
      }
      .modal-box {
        width: 100%; border-radius: 22px 22px 0 0; border-bottom: none;
        padding: 16px 18px calc(24px + env(safe-area-inset-bottom, 0px));
        max-height: 85vh;
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .modal-grabber {
        display: block; width: 36px; height: 5px; border-radius: 99px;
        background: var(--subtle); opacity: 0.4; margin: 0 auto 12px auto;
      }
    }
  `]
})
export class TransactionsComponent implements OnInit {
  readonly store = inject(TransactionStore);
  readonly i18n = inject(I18nService);
  private readonly txService = inject(TransactionService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly searchQuery = signal('');
  readonly typeFilter = signal<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  readonly activeRowId = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);

  readonly addForm = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    type: ['EXPENSE', Validators.required],
    paymentMethod: ['CASH', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    categoryId: [''],
  });

  readonly periodSummary = computed(() => {
    return {
      totalIncome: this.store.month().totalIncome,
      totalExpense: this.store.month().totalExpense,
      balance: this.store.month().balance,
    };
  });

  readonly filteredTransactions = computed(() => {
    let list = this.store.transactions();
    const q = this.searchQuery().toLowerCase().trim();
    const tf = this.typeFilter();

    if (tf !== 'ALL') {
      list = list.filter(t => t.type === tf);
    }
    if (q) {
      list = list.filter(t => t.description?.toLowerCase().includes(q) || t.category?.name?.toLowerCase().includes(q));
    }
    return list;
  });

  readonly groupedTransactions = computed(() => {
    const list = this.filteredTransactions();
    const groups: { [k: string]: { dateKey: string; label: string; items: Transaction[] } } = {};

    for (const tx of list) {
      const d = new Date(tx.date);
      const dateKey = tx.date ? tx.date.substring(0, 10) : 'unknown';
      const label = d.toLocaleDateString(this.i18n.currentLang() === 'id' ? 'id-ID' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = { dateKey, label, items: [] };
      }
      groups[dateKey].items.push(tx);
    }

    return Object.values(groups);
  });

  ngOnInit() {
    this.loadList();
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openAdd();
      }
    });
  }

  loadList() {
    this.store.setLoading(true);
    this.txService.getAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.store.setTransactions(res.data, res.total);
        this.store.setLoading(false);
      },
      error: () => this.store.setLoading(false),
    });
    this.txService.getThisMonth().subscribe({
      next: (s) => this.store.setMonth(s),
    });
  }

  toggleRowActions(id: string) {
    this.activeRowId.update(cur => cur === id ? null : id);
  }

  openAdd() {
    this.editingTx.set(null);
    this.addForm.reset({
      type: 'EXPENSE',
      paymentMethod: 'CASH',
      date: new Date().toISOString().substring(0, 10),
    });
    this.formOpen.set(true);
  }

  openEdit(tx: Transaction) {
    this.editingTx.set(tx);
    this.addForm.patchValue({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      paymentMethod: tx.paymentMethod,
      date: tx.date ? tx.date.substring(0, 10) : '',
      categoryId: tx.categoryId ?? '',
    });
    this.formOpen.set(true);
  }

  resetAdd() {
    this.formOpen.set(false);
    this.editingTx.set(null);
  }

  onVoiceForm(pref: VoiceFormPrefill) {
    if (pref.description) this.addForm.patchValue({ description: pref.description });
    if (pref.amount) this.addForm.patchValue({ amount: pref.amount });
    if (pref.type) this.addForm.patchValue({ type: pref.type });
  }

  submitAdd() {
    if (this.addForm.invalid) return;
    const val = this.addForm.value;
    const payload = {
      description: val.description!,
      amount: Number(val.amount!),
      type: val.type as any,
      paymentMethod: val.paymentMethod as any,
      date: val.date ? new Date(val.date).toISOString() : new Date().toISOString(),
      categoryId: val.categoryId || undefined,
    };

    if (this.editingTx()) {
      this.txService.update(this.editingTx()!.id, payload).subscribe({
        next: () => {
          this.loadList();
          this.snack.open(this.i18n.currentLang() === 'id' ? 'Transaksi diperbarui' : 'Transaction updated', 'OK', { duration: 2500 });
        }
      });
    } else {
      this.txService.create(payload).subscribe({
        next: () => {
          this.loadList();
          this.snack.open(this.i18n.currentLang() === 'id' ? 'Transaksi dicatat' : 'Transaction added', 'OK', { duration: 2500 });
        }
      });
    }
    this.resetAdd();
  }

  delete(tx: Transaction) {
    if (confirm(this.i18n.currentLang() === 'id' ? `Hapus transaksi "${tx.description}"?` : `Delete transaction "${tx.description}"?`)) {
      this.txService.delete(tx.id).subscribe({
        next: () => {
          this.store.removeTransaction(tx.id);
          this.snack.open(this.i18n.currentLang() === 'id' ? 'Transaksi dihapus' : 'Transaction deleted', 'OK', { duration: 2500 });
        }
      });
    }
  }
}
