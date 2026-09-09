import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionType, PaymentMethod } from '@prisma/client';

export interface FindManyOptions {
  userId: string;
  type?: TransactionType;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TransactionCreateInput) {
    return this.prisma.transaction.create({ data, include: { category: true } });
  }

  async findMany(opts: FindManyOptions) {
    const where: Prisma.TransactionWhereInput = {
      userId: opts.userId,
      ...(opts.type && { type: opts.type }),
      ...(opts.categoryId && { categoryId: opts.categoryId }),
      ...(opts.paymentMethod && { paymentMethod: opts.paymentMethod }),
      ...(opts.startDate || opts.endDate
        ? {
            date: {
              ...(opts.startDate && { gte: opts.startDate }),
              ...(opts.endDate && { lte: opts.endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page: opts.page, limit: opts.limit };
  }

  async findById(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  async update(id: string, userId: string, data: Prisma.TransactionUpdateInput) {
    return this.prisma.transaction.update({ where: { id }, data, include: { category: true } });
  }

  async delete(id: string, userId: string) {
    return this.prisma.transaction.deleteMany({ where: { id, userId } });
  }

  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const result = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });

    const totalIncome = result.find((r) => r.type === 'INCOME')?._sum.amount ?? 0;
    const totalExpense = result.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0;

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }

  async getByPaymentMethod(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.transaction.groupBy({
      by: ['paymentMethod', 'type'],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });
  }

  async getByCategory(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { userId, date: { gte: startDate, lte: endDate }, categoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
    });
  }
}
