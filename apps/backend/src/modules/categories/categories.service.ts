import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: CategoryType) {
    return this.prisma.category.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Kategori sudah ada');

    return this.prisma.category.create({ data: dto });
  }

  async delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
