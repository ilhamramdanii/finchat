import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WA_QUEUE_NAME } from './whatsapp.constants';
import { WhatsappService } from './whatsapp.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { ParserModule } from '../parser/parser.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: WA_QUEUE_NAME }),
    ParserModule,
    TransactionsModule,
  ],
  providers: [WhatsappService, WhatsappProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
