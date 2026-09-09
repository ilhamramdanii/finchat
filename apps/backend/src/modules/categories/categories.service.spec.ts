import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('returns all categories ordered (no type filter)', async () => {
      const cats = [{ id: 'c1' }];
      prisma.category.findMany.mockResolvedValue(cats);

      const result = await service.findAll();

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      expect(result).toBe(cats);
    });

    it('filters by type when provided', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await service.findAll('INCOME');
      expect(prisma.category.findMany.mock.calls[0][0].where).toEqual({ type: 'INCOME' });
    });
  });

  describe('create', () => {
    it('creates a category when name is unique', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      const created = { id: 'c1', name: 'Makan' };
      prisma.category.create.mockResolvedValue(created);

      const dto = { name: 'Makan', type: 'EXPENSE' as const };
      const result = await service.create(dto);

      expect(prisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toBe(created);
    });

    it('throws ConflictException when name already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', name: 'Makan' });

      await expect(
        service.create({ name: 'Makan', type: 'EXPENSE' as const }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes by id', async () => {
      prisma.category.delete.mockResolvedValue({ id: 'c1' });
      await service.delete('c1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
