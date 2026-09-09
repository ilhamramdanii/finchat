import { PaymentMethod } from './transaction.types';

export interface MonthlyReport {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  byPaymentMethod: PaymentMethodBreakdown;
}

export interface MonthlyBreakdown {
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface YearlyReport {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  byPaymentMethod: PaymentMethodBreakdown;
  monthly: MonthlyBreakdown[];
}

export interface RangeReport {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  byPaymentMethod: PaymentMethodBreakdown;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  type: 'EXPENSE' | 'INCOME';
  total: number;
  count: number;
  percentage: number;
}

export interface PaymentMethodBreakdown {
  CASH: number;
  TRANSFER: number;
  QRIS: number;
}

export interface DailyTotal {
  date: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
