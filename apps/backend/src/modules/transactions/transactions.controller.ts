import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findMany(@CurrentUser() user: any, @Query() filter: FilterTransactionDto) {
    return this.service.findMany(user.id, filter);
  }

  @Get('today')
  getToday(@CurrentUser() user: any) {
    return this.service.getToday(user.id);
  }

  @Get('month')
  getThisMonth(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.getThisMonth(user.id, month ? Number(month) : undefined, year ? Number(year) : undefined);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findById(id, user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateTransactionDto>) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(id, user.id);
  }
}
