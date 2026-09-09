import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsInt, IsOptional, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MonthlyQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
}

class YearlyQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
}

class RangeQueryDto {
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('monthly')
  getMonthly(@CurrentUser() user: any, @Query() q: MonthlyQueryDto) {
    const now = new Date();
    return this.service.getMonthlyReport(user.id, q.month ?? now.getMonth() + 1, q.year ?? now.getFullYear());
  }

  @Get('yearly')
  getYearly(@CurrentUser() user: any, @Query() q: YearlyQueryDto) {
    return this.service.getYearlyReport(user.id, q.year ?? new Date().getFullYear());
  }

  @Get('range')
  getRange(@CurrentUser() user: any, @Query() q: RangeQueryDto) {
    if (!q.startDate || !q.endDate) throw new BadRequestException('startDate and endDate are required');
    return this.service.getReportByRange(user.id, q.startDate, q.endDate);
  }

  @Get('daily')
  getDaily(@CurrentUser() user: any, @Query() q: MonthlyQueryDto) {
    const now = new Date();
    return this.service.getDailyTotals(user.id, q.month ?? now.getMonth() + 1, q.year ?? now.getFullYear());
  }

  @Get('daily-range')
  getDailyRange(@CurrentUser() user: any, @Query() q: RangeQueryDto) {
    if (!q.startDate || !q.endDate) throw new BadRequestException('startDate and endDate are required');
    return this.service.getDailyTotalsByRange(user.id, q.startDate, q.endDate);
  }
}
