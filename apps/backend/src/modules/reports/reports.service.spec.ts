import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsRepository } from '../transactions/transactions.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    category: { findMany: jest.Mock };
    transaction: { findMany: jest.Mock };
  };
  let txRepo: {
    getSummary: jest.Mock;
    getByCategory: jest.Mock;
    getByPaymentMethod: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      category: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: { findMany: jest.fn().mockResolvedValue([]) },
    };
    txRepo = {
      getSummary: jest.fn().mockResolvedValue({ totalIncome: 0, totalExpense: 0, balance: 0 }),
      getByCategory: jest.fn().mockResolvedValue([]),
      getByPaymentMethod: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionsRepository, useValue: txRepo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('getMonthlyReport', () => {
    it('returns summary plus enriched category & payment breakdown', async () => {
      txRepo.getSummary.mockResolvedValue({
        totalIncome: 5_000_000,
        totalExpense: 2_000_000,
        balance: 3_000_000,
      });
      txRepo.getByCategory.mockResolvedValue([
        { categoryId: 'c1', type: 'EXPENSE', _sum: { amount: 1_000_000 }, _count: 4 },
      ]);
      txRepo.getByPaymentMethod.mockResolvedValue([
        { paymentMethod: 'CASH', type: 'EXPENSE', _sum: { amount: 1_500_000 } },
        { paymentMethod: 'QRIS', type: 'EXPENSE', _sum: { amount: 500_000 } },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Makan', color: '#FF0000' },
      ]);

      const report = await service.getMonthlyReport('u1', 3, 2026);

      expect(report.month).toBe(3);
      expect(report.year).toBe(2026);
      expect(report.totalIncome).toBe(5_000_000);
      expect(report.byCategory[0]).toMatchObject({
        categoryName: 'Makan',
        categoryColor: '#FF0000',
        total: 1_000_000,
        count: 4,
        percentage: 50, // 1M of 2M expense
      });
      expect(report.byPaymentMethod).toEqual({
        CASH: 1_500_000,
        TRANSFER: 0,
        QRIS: 500_000,
      });
    });

    it('queries the correct month window (1-based month → month-end)', async () => {
      await service.getMonthlyReport('u1', 2, 2026);
      const [, start, end] = txRepo.getSummary.mock.calls[0];
      expect((start as Date).getMonth()).toBe(1); // February index
      expect((start as Date).getDate()).toBe(1);
      expect((end as Date).getMonth()).toBe(1); // still February (last day)
      expect((end as Date).getDate()).toBe(28); // 2026 not a leap year
    });

    it('falls back to "Lainnya" for unknown categories and 0% when base is 0', async () => {
      txRepo.getSummary.mockResolvedValue({ totalIncome: 0, totalExpense: 0, balance: 0 });
      txRepo.getByCategory.mockResolvedValue([
        { categoryId: null, type: 'EXPENSE', _sum: { amount: 0 }, _count: 0 },
      ]);
      prisma.category.findMany.mockResolvedValue([]);

      const report = await service.getMonthlyReport('u1', 1, 2026);

      expect(report.byCategory[0].categoryName).toBe('Lainnya');
      expect(report.byCategory[0].categoryColor).toBe('#6B7280');
      expect(report.byCategory[0].percentage).toBe(0);
    });
  });

  describe('getYearlyReport', () => {
    it('includes a 12-month breakdown', async () => {
      const report = await service.getYearlyReport('u1', 2026);
      expect(report.year).toBe(2026);
      expect(report.monthly).toHaveLength(12);
      expect(report.monthly[0].month).toBe(1);
      expect(report.monthly[11].month).toBe(12);
      // 1 summary for the year + 12 monthly summaries
      expect(txRepo.getSummary).toHaveBeenCalledTimes(13);
    });
  });

  describe('getDailyTotals', () => {
    it('groups transactions by ISO day with income/expense/balance', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { date: new Date('2026-03-01T08:00:00Z'), amount: 100_000, type: 'INCOME' },
        { date: new Date('2026-03-01T10:00:00Z'), amount: 30_000, type: 'EXPENSE' },
        { date: new Date('2026-03-02T09:00:00Z'), amount: 20_000, type: 'EXPENSE' },
      ]);

      const totals = await service.getDailyTotals('u1', 3, 2026);

      expect(totals).toHaveLength(2);
      const day1 = totals.find((d) => d.date === '2026-03-01')!;
      expect(day1).toMatchObject({
        totalIncome: 100_000,
        totalExpense: 30_000,
        balance: 70_000,
      });
      const day2 = totals.find((d) => d.date === '2026-03-02')!;
      expect(day2).toMatchObject({ totalIncome: 0, totalExpense: 20_000, balance: -20_000 });
    });

    it('returns an empty array when there are no transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      expect(await service.getDailyTotals('u1', 3, 2026)).toEqual([]);
    });
  });

  describe('getReportByRange', () => {
    it('passes range dates through and echoes them back', async () => {
      const report = await service.getReportByRange('u1', '2026-01-01', '2026-01-31');
      expect(report.startDate).toBe('2026-01-01');
      expect(report.endDate).toBe('2026-01-31');
      const [, , end] = txRepo.getSummary.mock.calls[0];
      // end date is pushed to end-of-day
      expect((end as Date).getHours()).toBe(23);
    });
  });
});
