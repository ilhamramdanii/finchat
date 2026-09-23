export type CategoryType = 'EXPENSE' | 'INCOME' | 'BOTH';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  keywords: string[];
  icon: string | null;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: CategoryType;
  keywords?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  type?: CategoryType;
  keywords?: string[];
  icon?: string;
  color?: string;
}

export interface BulkUpdateKeywordsDto {
  updates: {
    id: string;
    keywords: string[];
  }[];
}
