import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TransactionsRepository } from '../transactions/transactions.repository';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, TransactionsRepository],
})
export class ReportsModule {}
