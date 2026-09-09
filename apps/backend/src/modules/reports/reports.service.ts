import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsRepository } from '../transactions/transactions.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txRepo: TransactionsRepository,
  ) {}

  private async enrichCategories(byCategory: any[], summary: { totalIncome: number; totalExpense: number }) {
    const categoryIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return byCategory.map((row) => {
      const cat = categoryMap.get(row.categoryId ?? '');
      const total = row._sum.amount ?? 0;
      const base = row.type === 'INCOME' ? summary.totalIncome : summary.totalExpense;
      return {
        categoryId: row.categoryId,
        categoryName: cat?.name ?? 'Lainnya',
        categoryColor: cat?.color ?? '#6B7280',
        type: row.type,
        total,
        count: row._count,
        percentage: base > 0 ? Math.round((total / base) * 100) : 0,
      };
    });
  }

  private buildPaymentBreakdown(byPayment: any[]) {
    const breakdown: Record<string, number> = { CASH: 0, TRANSFER: 0, QRIS: 0 };
    for (const row of byPayment) {
      breakdown[row.paymentMethod] = (breakdown[row.paymentMethod] ?? 0) + (row._sum.amount ?? 0);
    }
    return breakdown as { CASH: number; TRANSFER: number; QRIS: number };
  }

  private async buildDailyTotals(userId: string, start: Date, end: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, amount: true, type: true },
      orderBy: { date: 'asc' },
    });
    const dailyMap = new Map<string, { totalIncome: number; totalExpense: number }>();
    for (const t of transactions) {
      const key = t.date.toISOString().slice(0, 10);
      const existing = dailyMap.get(key) ?? { totalIncome: 0, totalExpense: 0 };
      if (t.type === 'INCOME') existing.totalIncome += t.amount;
      else existing.totalExpense += t.amount;
      dailyMap.set(key, existing);
    }
    return Array.from(dailyMap.entries()).map(([date, vals]) => ({
      date, ...vals, balance: vals.totalIncome - vals.totalExpense,
    }));
  }

  async getMonthlyReport(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    const [summary, byCategory, byPayment] = await Promise.all([
      this.txRepo.getSummary(userId, start, end),
      this.txRepo.getByCategory(userId, start, end),
      this.txRepo.getByPaymentMethod(userId, start, end),
    ]);
    return {
      month, year, ...summary,
      byCategory: await this.enrichCategories(byCategory, summary),
      byPaymentMethod: this.buildPaymentBreakdown(byPayment),
    };
  }

  async getYearlyReport(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31, 23, 59, 59);
    const [summary, byCategory, byPayment] = await Promise.all([
      this.txRepo.getSummary(userId, start, end),
      this.txRepo.getByCategory(userId, start, end),
      this.txRepo.getByPaymentMethod(userId, start, end),
    ]);
    const monthly = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        this.txRepo.getSummary(userId, new Date(year, i, 1), new Date(year, i + 1, 0, 23, 59, 59))
          .then(s => ({ month: i + 1, ...s }))
      )
    );
    return {
      year, ...summary,
      byCategory: await this.enrichCategories(byCategory, summary),
      byPaymentMethod: this.buildPaymentBreakdown(byPayment),
      monthly,
    };
  }

  async getReportByRange(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end   = new Date(endDate + 'T23:59:59');
    const [summary, byCategory, byPayment] = await Promise.all([
      this.txRepo.getSummary(userId, start, end),
      this.txRepo.getByCategory(userId, start, end),
      this.txRepo.getByPaymentMethod(userId, start, end),
    ]);
    return {
      startDate, endDate, ...summary,
      byCategory: await this.enrichCategories(byCategory, summary),
      byPaymentMethod: this.buildPaymentBreakdown(byPayment),
    };
  }

  async getDailyTotals(userId: string, month: number, year: number) {
    return this.buildDailyTotals(userId, new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59));
  }

  async getDailyTotalsByRange(userId: string, startDate: string, endDate: string) {
    return this.buildDailyTotals(userId, new Date(startDate), new Date(endDate + 'T23:59:59'));
  }
}
