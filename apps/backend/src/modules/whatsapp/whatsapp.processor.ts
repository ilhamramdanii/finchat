import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WA_QUEUE_NAME, WA_HELP_MESSAGE } from './whatsapp.constants';
import { WhatsappService, IncomingMessage } from './whatsapp.service';
import { ParserService } from '../parser/parser.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(WA_QUEUE_NAME)
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly wa: WhatsappService,
    private readonly parser: ParserService,
    private readonly transactions: TransactionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('process-message')
  async handle(job: Job<IncomingMessage>) {
    const { from, text, pushName, messageId } = job.data;
    this.logger.debug(`📨 Pesan dari ${from}: "${text}"`);

    const result = this.parser.parse(text);

    if (result.kind === 'COMMAND') {
      await this.handleCommand(from, result.command!);
      return;
    }

    if (result.kind === 'TRANSACTION' && result.transaction) {
      const t = result.transaction;

      // Upsert user berdasarkan nomor HP
      const phone = from.replace('@s.whatsapp.net', '');
      const user = await this.prisma.user.upsert({
        where: { phone },
        update: { name: pushName ?? undefined },
        create: { phone, name: pushName },
      });

      // Auto-detect kategori dari keywords
      const category = await this.detectCategory(t.description, t.type);

      await this.transactions.create(user.id, {
        type: t.type,
        description: t.description,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        categoryId: category?.id,
        rawMessage: t.rawMessage,
        source: 'WHATSAPP',
        messageId,
      });

      const emoji = t.type === 'INCOME' ? '✅ *Pemasukan*' : '✅ *Pengeluaran*';
      const methodEmoji: Record<string, string> = { CASH: '💵', TRANSFER: '🏦', QRIS: '📱' };

      const reply = [
        `${emoji} tercatat!`,
        `📝 ${t.description}`,
        `💰 Rp ${t.amount.toLocaleString('id-ID')}`,
        `${methodEmoji[t.paymentMethod] ?? '💳'} ${t.paymentMethod}`,
        category ? `🏷️ ${category.name}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await this.wa.sendMessage(from, reply);
      return;
    }

    // UNKNOWN
    await this.wa.sendMessage(
      from,
      `❓ Format tidak dikenali.\n\nKetik */bantuan* untuk melihat cara penggunaan.`,
    );
  }

  private async handleCommand(from: string, command: string) {
    const phone = from.replace('@s.whatsapp.net', '');
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      await this.wa.sendMessage(from, '⚠️ Belum ada data. Mulai dengan mencatat transaksi dulu.');
      return;
    }

    const now = new Date();

    if (command === 'HELP') {
      await this.wa.sendMessage(from, WA_HELP_MESSAGE);
      return;
    }

    if (command === 'CANCEL') {
      const voided = await this.transactions.voidLast(user.id, 60);
      await this.wa.sendMessage(
        from,
        voided
          ? `🗑️ Transaksi terakhir dibatalkan:\n📝 ${voided.description}\n💰 Rp ${voided.amount.toLocaleString('id-ID')}`
          : '⚠️ Tidak ada transaksi aktif dalam 60 menit terakhir untuk dibatalkan.',
      );
      return;
    }

    if (command === 'TOTAL') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 86_400_000);
      const summary = await this.transactions.getSummary(user.id, start, end);
      await this.wa.sendMessage(
        from,
        `📊 *Total Hari Ini*\n\n` +
          `🟢 Pemasukan: Rp ${summary.totalIncome.toLocaleString('id-ID')}\n` +
          `🔴 Pengeluaran: Rp ${summary.totalExpense.toLocaleString('id-ID')}\n` +
          `💼 Saldo: Rp ${summary.balance.toLocaleString('id-ID')}`,
      );
      return;
    }

    if (command === 'BALANCE' || command === 'REPORT') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const summary = await this.transactions.getSummary(user.id, start, end);
      const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      await this.wa.sendMessage(
        from,
        `📊 *Laporan ${monthName}*\n\n` +
          `🟢 Pemasukan: Rp ${summary.totalIncome.toLocaleString('id-ID')}\n` +
          `🔴 Pengeluaran: Rp ${summary.totalExpense.toLocaleString('id-ID')}\n` +
          `💼 Saldo: Rp ${summary.balance.toLocaleString('id-ID')}`,
      );
      return;
    }
  }

  private async detectCategory(description: string, type: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ type: type as any }, { type: 'BOTH' }],
      },
    });

    const lower = description.toLowerCase();
    for (const cat of categories) {
      if (cat.keywords.some((kw) => lower.includes(kw))) {
        return cat;
      }
    }
    return null;
  }
}
