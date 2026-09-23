import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappService } from './whatsapp.service';
import { ParserService } from '../parser/parser.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PrismaService } from '../../prisma/prisma.service';

// whatsapp.service tarik Baileys (ESM) yang tidak bisa di-parse Jest —
// stub module agar suite tetap ringan tanpa socket asli.
jest.mock('./whatsapp.service', () => ({
  WhatsappService: jest.fn().mockImplementation(() => ({})),
}));

describe('WhatsappProcessor', () => {
  let processor: WhatsappProcessor;
  let wa: { sendMessage: jest.Mock };
  let transactions: { create: jest.Mock; voidLast: jest.Mock; getSummary: jest.Mock };
  let prisma: {
    user: { upsert: jest.Mock; findUnique: jest.Mock };
    category: { findMany: jest.Mock };
  };

  const FROM = '6281234567890@s.whatsapp.net';
  const job = (data: any) => ({ data }) as any;

  beforeEach(async () => {
    wa = { sendMessage: jest.fn() };
    transactions = { create: jest.fn(), voidLast: jest.fn(), getSummary: jest.fn() };
    prisma = {
      user: { upsert: jest.fn(), findUnique: jest.fn() },
      category: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappProcessor,
        ParserService, // parser asli: mapping command teruji end-to-end
        { provide: WhatsappService, useValue: wa },
        { provide: TransactionsService, useValue: transactions },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get<WhatsappProcessor>(WhatsappProcessor);
  });

  describe('TRANSACTION', () => {
    it('upsert user, teruskan messageId untuk idempotency, dan balas konfirmasi', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'u1', phone: '6281234567890' });
      transactions.create.mockResolvedValue({ id: 't1' });

      await processor.handle(job({ from: FROM, text: 'makan 20rb', pushName: 'Ilham', messageId: 'WA123' }));

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '6281234567890' },
        update: { name: 'Ilham' },
        create: { phone: '6281234567890', name: 'Ilham' },
      });
      expect(transactions.create).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ description: 'makan', amount: 20_000, messageId: 'WA123', source: 'WHATSAPP' }),
      );
      const reply = wa.sendMessage.mock.calls[0][1];
      expect(wa.sendMessage.mock.calls[0][0]).toBe(FROM);
      expect(reply).toContain('tercatat!');
      expect(reply).toContain('makan');
    });

    it('cantumkan nama kategori bila keyword cocok', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'u1', phone: '6281234567890' });
      prisma.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Makanan', keywords: ['makan'] },
      ]);
      transactions.create.mockResolvedValue({ id: 't1' });

      await processor.handle(job({ from: FROM, text: 'makan 20rb', pushName: null, messageId: 'WA124' }));

      expect(transactions.create).toHaveBeenCalledWith('u1', expect.objectContaining({ categoryId: 'c1' }));
      expect(wa.sendMessage.mock.calls[0][1]).toContain('Makanan');
    });
  });

  describe('COMMAND CANCEL', () => {
    it('void transaksi terakhir dan balas konfirmasi', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: '6281234567890' });
      transactions.voidLast.mockResolvedValue({ id: 't9', description: 'kopi', amount: 25_000 });

      await processor.handle(job({ from: FROM, text: '/batal', pushName: null, messageId: 'WA200' }));

      expect(transactions.voidLast).toHaveBeenCalledWith('u1', 60);
      const reply = wa.sendMessage.mock.calls[0][1];
      expect(reply).toContain('dibatalkan');
      expect(reply).toContain('kopi');
    });

    it('balas peringatan bila tidak ada transaksi aktif dalam window', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: '6281234567890' });
      transactions.voidLast.mockResolvedValue(null);

      await processor.handle(job({ from: FROM, text: '/hapus', pushName: null, messageId: 'WA201' }));

      expect(wa.sendMessage.mock.calls[0][1]).toContain('Tidak ada transaksi aktif');
    });

    it('balas peringatan bila user belum punya data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await processor.handle(job({ from: FROM, text: '/batal', pushName: null, messageId: 'WA202' }));

      expect(transactions.voidLast).not.toHaveBeenCalled();
      expect(wa.sendMessage.mock.calls[0][1]).toContain('Belum ada data');
    });
  });

  describe('COMMAND lain & UNKNOWN', () => {
    it('TOTAL balas ringkasan harian', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: '6281234567890' });
      transactions.getSummary.mockResolvedValue({ totalIncome: 100_000, totalExpense: 20_000, balance: 80_000 });

      await processor.handle(job({ from: FROM, text: '/total', pushName: null, messageId: 'WA300' }));

      expect(transactions.getSummary).toHaveBeenCalledTimes(1);
      expect(wa.sendMessage.mock.calls[0][1]).toContain('Total Hari Ini');
    });

    it('UNKNOWN balas panduan format', async () => {
      await processor.handle(job({ from: FROM, text: 'halo apa kabar', pushName: null, messageId: 'WA301' }));

      expect(transactions.create).not.toHaveBeenCalled();
      expect(wa.sendMessage.mock.calls[0][1]).toContain('Format tidak dikenali');
    });
  });
});
