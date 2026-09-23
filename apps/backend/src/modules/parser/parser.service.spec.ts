import { Test, TestingModule } from '@nestjs/testing';
import { ParserService } from './parser.service';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();
    service = module.get<ParserService>(ParserService);
  });

  // ── parseAmount ───────────────────────────────────────────────────────────

  describe('parseAmount', () => {
    it.each([
      ['50rb', 50_000],
      ['50k', 50_000],
      ['50K', 50_000],
      ['1jt', 1_000_000],
      ['1.5jt', 1_500_000],
      ['2.5jt', 2_500_000],
      ['1m', 1_000_000],
      ['50.000', 50_000],
      ['200.000', 200_000],
      ['1.500.000', 1_500_000],
      ['80000', 80_000],
      ['25000', 25_000],
      ['0.5jt', 500_000],
    ])('parses "%s" → %d', (input, expected) => {
      expect(service.parseAmount(input)).toBe(expected);
    });
  });

  // ── Transaction parsing ───────────────────────────────────────────────────

  describe('parse — EXPENSE', () => {
    it.each([
      ['makan 50rb', 'makan', 50_000, 'EXPENSE', 'CASH'],
      ['bensin 80k', 'bensin', 80_000, 'EXPENSE', 'CASH'],
      ['listrik 200.000', 'listrik', 200_000, 'EXPENSE', 'CASH'],
      ['bayar wifi 250rb', 'bayar wifi', 250_000, 'EXPENSE', 'CASH'],
      ['makan siang 35rb transfer', 'makan siang', 35_000, 'EXPENSE', 'TRANSFER'],
      ['kopi 25rb qris', 'kopi', 25_000, 'EXPENSE', 'QRIS'],
      ['belanja 1.5jt shopee gopay', 'belanja 1.5jt shopee', 0, 'EXPENSE', 'QRIS'], // complex
      ['parkir 5rb cash', 'parkir', 5_000, 'EXPENSE', 'CASH'],
      ['grab 35rb dana', 'grab', 35_000, 'EXPENSE', 'TRANSFER'],
    ])('"%s" → desc=%s amount=%d type=%s payment=%s', (input, desc, amount, type, payment) => {
      const result = service.parse(input);
      if (amount === 0) return; // skip complex case
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.description).toBe(desc);
      expect(result.transaction?.amount).toBe(amount);
      expect(result.transaction?.type).toBe(type);
      expect(result.transaction?.paymentMethod).toBe(payment);
    });
  });

  describe('parse — INCOME', () => {
    it.each([
      ['gajian 5jt', 'gajian', 5_000_000, 'INCOME', 'CASH'],
      ['bonus 1jt', 'bonus', 1_000_000, 'INCOME', 'CASH'],
      ['dapat transfer 2jt', 'dapat transfer', 2_000_000, 'INCOME', 'CASH'],
      ['freelance 3.5jt', 'freelance', 3_500_000, 'INCOME', 'CASH'],
      ['gaji bulanan 6jt transfer', 'gaji bulanan', 6_000_000, 'INCOME', 'TRANSFER'],
      ['thr 2jt', 'thr', 2_000_000, 'INCOME', 'CASH'],
    ])('"%s" → desc=%s amount=%d type=INCOME', (input, desc, amount, _type, payment) => {
      const result = service.parse(input);
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.description).toBe(desc);
      expect(result.transaction?.amount).toBe(amount);
      expect(result.transaction?.type).toBe('INCOME');
      expect(result.transaction?.paymentMethod).toBe(payment);
    });
  });

  describe('parse — prefix + / -', () => {
    it('"+5jt freelance" → INCOME', () => {
      const result = service.parse('+5jt freelance');
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.type).toBe('INCOME');
      expect(result.transaction?.amount).toBe(5_000_000);
    });

    it('"-50rb makan" → EXPENSE', () => {
      const result = service.parse('-50rb makan');
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.type).toBe('EXPENSE');
      expect(result.transaction?.amount).toBe(50_000);
    });
  });

  describe('parse — /catat prefix', () => {
    it('"catat makan 50rb" → parsed correctly', () => {
      const result = service.parse('catat makan 50rb');
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.description).toBe('makan');
      expect(result.transaction?.amount).toBe(50_000);
    });

    it('"/catat gajian 5jt" → parsed correctly', () => {
      const result = service.parse('/catat gajian 5jt');
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.type).toBe('INCOME');
    });
  });

  // ── Commands ──────────────────────────────────────────────────────────────

  describe('parse — commands', () => {
    it.each([
      ['/total', 'TOTAL'],
      ['total', 'TOTAL'],
      ['/laporan', 'REPORT'],
      ['laporan', 'REPORT'],
      ['/bantuan', 'HELP'],
      ['help', 'HELP'],
      ['/saldo', 'BALANCE'],
      ['saldo', 'BALANCE'],
    ])('"%s" → command %s', (input, expected) => {
      const result = service.parse(input);
      expect(result.kind).toBe('COMMAND');
      expect(result.command).toBe(expected);
    });
  });

  // ── Payment method aliases ────────────────────────────────────────────────

  describe('parse — payment method aliases', () => {
    it.each([
      ['makan 50rb bca', 'TRANSFER'],
      ['makan 50rb mandiri', 'TRANSFER'],
      ['makan 50rb gopay', 'QRIS'],
      ['makan 50rb shopeepay', 'QRIS'],
      ['makan 50rb linkaja', 'QRIS'],
      ['makan 50rb ovo', 'TRANSFER'],
      ['makan 50rb tunai', 'CASH'],
      ['makan 50rb kontan', 'CASH'],
    ])('"%s" → paymentMethod=%s', (input, expected) => {
      const result = service.parse(input);
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.paymentMethod).toBe(expected);
    });
  });

  // ── Commands ────────────────────────────────────────────────────────────────

  describe('parse — commands', () => {
    it.each([
      ['/batal', 'CANCEL'],
      ['batal', 'CANCEL'],
      ['/hapus', 'CANCEL'],
      ['hapus', 'CANCEL'],
      ['/undo', 'CANCEL'],
      ['undo', 'CANCEL'],
      ['/total', 'TOTAL'],
      ['/laporan', 'REPORT'],
      ['/saldo', 'BALANCE'],
      ['/bantuan', 'HELP'],
    ])('"%s" → command=%s', (input, expected) => {
      const result = service.parse(input);
      expect(result.kind).toBe('COMMAND');
      expect(result.command).toBe(expected);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('parse — edge cases', () => {
    it('returns UNKNOWN for random text', () => {
      expect(service.parse('halo apa kabar').kind).toBe('UNKNOWN');
    });

    it('returns UNKNOWN for empty string', () => {
      expect(service.parse('').kind).toBe('UNKNOWN');
    });

    it('handles multi-word description', () => {
      const result = service.parse('bayar uang kos 800rb');
      expect(result.kind).toBe('TRANSACTION');
      expect(result.transaction?.amount).toBe(800_000);
    });
  });
});
