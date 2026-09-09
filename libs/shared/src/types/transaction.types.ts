import { Category } from './category.types';

export type TransactionType = 'EXPENSE' | 'INCOME';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export type TransactionSource = 'WHATSAPP' | 'MANUAL' | 'IMPORT';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string | null;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  source: TransactionSource;
  rawMessage: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface CreateTransactionDto {
  type: TransactionType;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  date?: string;
}

export interface FilterTransactionDto {
  type?: TransactionType;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
