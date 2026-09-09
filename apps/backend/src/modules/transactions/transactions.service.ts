import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { PaymentMethod, TransactionSource } from '@prisma/client';

interface CreateRawOptions extends CreateTransactionDto {
  rawMessage?: string;
  source?: TransactionSource;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly repo: TransactionsRepository) {}

  async create(userId: string, dto: CreateRawOptions) {
    return this.repo.create({
      user: { connect: { id: userId } },
      type: dto.type,
      description: dto.description,
      amount: dto.amount,
      paymentMethod: (dto.paymentMethod as PaymentMethod) ?? 'CASH',
      source: dto.source ?? 'MANUAL',
      rawMessage: dto.rawMessage ?? dto.description,
      date: dto.date ? new Date(dto.date) : new Date(),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
    });
  }

  async findMany(userId: string, filter: FilterTransactionDto) {
    return this.repo.findMany({
      userId,
      type: filter.type,
      categoryId: filter.categoryId,
      paymentMethod: filter.paymentMethod,
      startDate: filter.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter.endDate ? new Date(filter.endDate) : undefined,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    });
  }

  async findById(id: string, userId: string) {
    const t = await this.repo.findById(id, userId);
    if (!t) throw new NotFoundException('Transaksi tidak ditemukan');
    return t;
  }

  async update(id: string, userId: string, dto: Partial<CreateTransactionDto>) {
    await this.findById(id, userId);
    return this.repo.update(id, userId, {
      ...(dto.type        && { type: dto.type }),
      ...(dto.description && { description: dto.description }),
      ...(dto.amount      && { amount: dto.amount }),
      ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod as PaymentMethod }),
      ...(dto.date        && { date: new Date(dto.date) }),
      ...(dto.categoryId !== undefined && {
        category: dto.categoryId
          ? { connect: { id: dto.categoryId } }
          : { disconnect: true },
      }),
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return this.repo.delete(id, userId);
  }

  async getToday(userId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86_400_000);
    return this.repo.getSummary(userId, start, end);
  }

  async getThisMonth(userId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month !== undefined ? month - 1 : now.getMonth();
    const y = year ?? now.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59);
    return this.repo.getSummary(userId, start, end);
  }

  async getSummary(userId: string, start: Date, end: Date) {
    return this.repo.getSummary(userId, start, end);
  }
}
