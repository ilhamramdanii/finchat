import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsRepository } from './transactions.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('TransactionsRepository', () => {
  let repo: TransactionsRepository;
  let tx: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    groupBy: jest.Mock;
  };
  let prisma: { transaction: typeof tx; $transaction: jest.Mock };

  beforeEach(async () => {
    tx = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    };
    prisma = { transaction: tx, $transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get<TransactionsRepository>(TransactionsRepository);
  });

  describe('findMany', () => {
    it('default hanya ACTIVE', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await repo.findMany({ userId: 'u1', page: 1, limit: 20 });

      const where = prisma.transaction.findMany.mock.calls[0][0].where;
      expect(where).toEqual(expect.objectContaining({ userId: 'u1', status: 'ACTIVE' }));
    });

    it('includeVoided=true lepas filter status', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await repo.findMany({ userId: 'u1', page: 1, limit: 20, includeVoided: true });

      const where = prisma.transaction.findMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('status');
    });
  });

  describe('findById & findByMessageId', () => {
    it('findById kunci userId + ACTIVE', async () => {
      tx.findFirst.mockResolvedValue({ id: 't1' });

      await repo.findById('t1', 'u1');

      expect(tx.findFirst).toHaveBeenCalledWith({
        where: { id: 't1', userId: 'u1', status: 'ACTIVE' },
        include: { category: true },
      });
    });

    it('findByMessageId pakai unique key', async () => {
      tx.findUnique.mockResolvedValue({ id: 't1' });

      const res = await repo.findByMessageId('WA123');

      expect(tx.findUnique).toHaveBeenCalledWith({ where: { messageId: 'WA123' } });
      expect(res).toEqual({ id: 't1' });
    });
  });

  describe('voidLast', () => {
    it('update ACTIVE terbaru jadi VOIDED + voidedAt', async () => {
      tx.findFirst.mockResolvedValue({ id: 't9' });
      tx.update.mockResolvedValue({ id: 't9', status: 'VOIDED' });
      const since = new Date('2026-09-15T00:00:00Z');

      const res = await repo.voidLast('u1', since);

      expect(tx.findFirst).toHaveBeenCalledWith({
        where: { userId: 'u1', status: 'ACTIVE', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      });
      const updateArg = tx.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 't9' });
      expect(updateArg.data.status).toBe('VOIDED');
      expect(updateArg.data.voidedAt).toBeInstanceOf(Date);
      expect(updateArg.include).toEqual({ category: true });
      expect(res).toEqual({ id: 't9', status: 'VOIDED' });
    });

    it('null bila tidak ada transaksi dalam window', async () => {
      tx.findFirst.mockResolvedValue(null);

      expect(await repo.voidLast('u1', new Date())).toBeNull();
      expect(tx.update).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('agregasi hanya ACTIVE', async () => {
      tx.groupBy.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 100 } },
        { type: 'EXPENSE', _sum: { amount: 40 } },
      ]);
      const start = new Date('2026-09-01');
      const end = new Date('2026-09-30');

      const res = await repo.getSummary('u1', start, end);

      expect(tx.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { userId: 'u1', status: 'ACTIVE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      expect(res).toEqual({ totalIncome: 100, totalExpense: 40, balance: 60 });
    });
  });
});
