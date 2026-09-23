import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto, BulkUpdateKeywordsDto } from './dto/update-category.dto';
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

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    if (dto.name && dto.name !== category.name) {
      const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Nama kategori sudah digunakan');
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async bulkUpdateKeywords(dto: BulkUpdateKeywordsDto) {
    const operations = dto.updates.map((item) =>
      this.prisma.category.update({
        where: { id: item.id },
        data: { keywords: item.keywords },
      })
    );
    return this.prisma.$transaction(operations);
  }

  async delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
