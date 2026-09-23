import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Category, CreateCategoryDto, UpdateCategoryDto, BulkUpdateKeywordsDto } from '@wa-finance/shared';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  getAll(type?: 'EXPENSE' | 'INCOME' | 'BOTH') {
    return this.api.get<Category[]>('categories', type ? { type } : undefined);
  }

  create(dto: CreateCategoryDto) {
    return this.api.post<Category>('categories', dto);
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.api.put<Category>(`categories/${id}`, dto);
  }

  bulkUpdateKeywords(dto: BulkUpdateKeywordsDto) {
    return this.api.put<Category[]>('categories/bulk-keywords', dto);
  }

  delete(id: string) {
    return this.api.delete<{ id: string }>(`categories/${id}`);
  }
}
