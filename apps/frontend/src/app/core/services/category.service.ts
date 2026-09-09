import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Category } from '@wa-finance/shared';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  getAll(type?: 'EXPENSE' | 'INCOME' | 'BOTH') {
    return this.api.get<Category[]>('categories', type ? { type } : undefined);
  }
}
