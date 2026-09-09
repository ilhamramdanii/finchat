import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repo: jest.Mocked<
    Pick<
      TransactionsRepository,
      'create' | 'findMany' | 'findById' | 'update' | 'delete' | 'getSummary'
    >
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getSummary: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create', () => {
    it('maps dto to a Prisma create input with defaults', async () => {
      repo.create.mockResolvedValue({ id: 't1' } as any);

      await service.create('u1', {
        type: 'EXPENSE',
        description: 'makan',
        amount: 50_000,
      } as any);

      const arg = repo.create.mock.calls[0][0];
      expect(arg.user).toEqual({ connect: { id: 'u1' } });
      expect(arg.type).toBe('EXPENSE');
      expect(arg.amount).toBe(50_000);
      expect(arg.paymentMethod).toBe('CASH'); // default
      expect(arg.source).toBe('MANUAL'); // default
      expect(arg.rawMessage).toBe('makan'); // falls back to description
      expect(arg.date).toBeInstanceOf(Date);
    });

    it('connects a category when categoryId provided', async () => {
      repo.create.mockResolvedValue({ id: 't1' } as any);

      await service.create('u1', {
        type: 'EXPENSE',
        description: 'kopi',
        amount: 25_000,
        categoryId: 'c1',
        paymentMethod: 'QRIS',
        source: 'WHATSAPP',
        rawMessage: 'kopi 25rb qris',
      } as any);

      const arg = repo.create.mock.calls[0][0];
      expect(arg.category).toEqual({ connect: { id: 'c1' } });
      expect(arg.paymentMethod).toBe('QRIS');
      expect(arg.source).toBe('WHATSAPP');
      expect(arg.rawMessage).toBe('kopi 25rb qris');
    });

    it('does not set category when categoryId absent', async () => {
      repo.create.mockResolvedValue({ id: 't1' } as any);
      await service.create('u1', {
        type: 'INCOME',
        description: 'gajian',
        amount: 5_000_000,
      } as any);
      expect(repo.create.mock.calls[0][0].category).toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('applies default pagination', async () => {
      repo.findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);
      await service.findMany('u1', {} as any);
      const arg = repo.findMany.mock.calls[0][0];
      expect(arg.page).toBe(1);
      expect(arg.limit).toBe(20);
      expect(arg.userId).toBe('u1');
    });

    it('converts date strings to Date objects', async () => {
      repo.findMany.mockResolvedValue({ data: [], total: 0, page: 2, limit: 5 } as any);
      await service.findMany('u1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 2,
        limit: 5,
        type: 'EXPENSE',
      } as any);
      const arg = repo.findMany.mock.calls[0][0];
      expect(arg.startDate).toBeInstanceOf(Date);
      expect(arg.endDate).toBeInstanceOf(Date);
      expect(arg.page).toBe(2);
      expect(arg.limit).toBe(5);
      expect(arg.type).toBe('EXPENSE');
    });
  });

  describe('findById', () => {
    it('returns the transaction when found', async () => {
      const tx = { id: 't1', userId: 'u1' };
      repo.findById.mockResolvedValue(tx as any);
      expect(await service.findById('t1', 'u1')).toBe(tx);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('t1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      repo.findById.mockResolvedValue({ id: 't1', userId: 'u1' } as any);
      repo.update.mockResolvedValue({ id: 't1' } as any);

      await service.update('t1', 'u1', { amount: 99_000, description: 'baru' });

      expect(repo.findById).toHaveBeenCalledWith('t1', 'u1');
      const data = repo.update.mock.calls[0][2];
      expect(data.amount).toBe(99_000);
      expect(data.description).toBe('baru');
    });

    it('disconnects category when categoryId set to null', async () => {
      repo.findById.mockResolvedValue({ id: 't1', userId: 'u1' } as any);
      repo.update.mockResolvedValue({ id: 't1' } as any);

      await service.update('t1', 'u1', { categoryId: null } as any);

      expect(repo.update.mock.calls[0][2].category).toEqual({ disconnect: true });
    });

    it('throws when transaction not owned', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('t1', 'u1', { amount: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('verifies ownership before deleting', async () => {
      repo.findById.mockResolvedValue({ id: 't1', userId: 'u1' } as any);
      repo.delete.mockResolvedValue({ count: 1 } as any);

      await service.delete('t1', 'u1');

      expect(repo.findById).toHaveBeenCalledWith('t1', 'u1');
      expect(repo.delete).toHaveBeenCalledWith('t1', 'u1');
    });

    it('throws and skips delete when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('t1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('date-range summaries', () => {
    it('getToday queries a single-day window', async () => {
      repo.getSummary.mockResolvedValue({ totalIncome: 0, totalExpense: 0, balance: 0 });
      await service.getToday('u1');
      const [, start, end] = repo.getSummary.mock.calls[0];
      expect((end as Date).getTime() - (start as Date).getTime()).toBe(86_400_000);
    });

    it('getThisMonth honors explicit month/year (1-based month)', async () => {
      repo.getSummary.mockResolvedValue({ totalIncome: 0, totalExpense: 0, balance: 0 });
      await service.getThisMonth('u1', 3, 2026);
      const [, start, end] = repo.getSummary.mock.calls[0];
      expect((start as Date).getMonth()).toBe(2); // March = index 2
      expect((start as Date).getFullYear()).toBe(2026);
      expect((end as Date).getMonth()).toBe(2);
    });
  });
});
