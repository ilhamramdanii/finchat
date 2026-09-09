import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Transaction, CreateTransactionDto, FilterTransactionDto, TransactionSummary } from '@wa-finance/shared';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly api = inject(ApiService);

  getAll(filter?: FilterTransactionDto) {
    return this.api.get<PaginatedResult<Transaction>>('transactions', filter as any);
  }

  getToday() {
    return this.api.get<TransactionSummary>('transactions/today');
  }

  getThisMonth(month?: number, year?: number) {
    const params: Record<string, any> = {};
    if (month !== undefined) params['month'] = month;
    if (year  !== undefined) params['year']  = year;
    return this.api.get<TransactionSummary>('transactions/month', Object.keys(params).length ? params : undefined);
  }

  create(dto: CreateTransactionDto) {
    return this.api.post<Transaction>('transactions', dto);
  }

  update(id: string, dto: Partial<CreateTransactionDto>) {
    return this.api.patch<Transaction>(`transactions/${id}`, dto);
  }

  delete(id: string) {
    return this.api.delete<void>(`transactions/${id}`);
  }
}
