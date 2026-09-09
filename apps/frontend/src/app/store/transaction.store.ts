import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionSummary } from '@wa-finance/shared';

@Injectable({ providedIn: 'root' })
export class TransactionStore {
  // State
  readonly transactions    = signal<Transaction[]>([]);
  readonly monthTxs        = signal<Transaction[]>([]);  // all this-month txs for charts
  readonly today           = signal<TransactionSummary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  readonly month           = signal<TransactionSummary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  readonly loading         = signal(false);
  readonly totalCount      = signal(0);

  // Derived
  readonly recentTransactions = computed(() => this.transactions().slice(0, 5));

  readonly paymentBreakdown = computed(() => {
    const txs = this.transactions();
    return {
      CASH: txs.filter((t) => t.paymentMethod === 'CASH').reduce((s, t) => s + t.amount, 0),
      TRANSFER: txs.filter((t) => t.paymentMethod === 'TRANSFER').reduce((s, t) => s + t.amount, 0),
      QRIS: txs.filter((t) => t.paymentMethod === 'QRIS').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Mutations
  setTransactions(data: Transaction[], total: number) {
    this.transactions.set(data);
    this.totalCount.set(total);
  }

  setMonthTxs(data: Transaction[]) {
    this.monthTxs.set(data);
  }

  setToday(summary: TransactionSummary) {
    this.today.set(summary);
  }

  setMonth(summary: TransactionSummary) {
    this.month.set(summary);
  }

  addTransaction(t: Transaction) {
    this.transactions.update((prev) => [t, ...prev]);
  }

  removeTransaction(id: string) {
    this.transactions.update((prev) => prev.filter((t) => t.id !== id));
  }

  setLoading(val: boolean) {
    this.loading.set(val);
  }
}
