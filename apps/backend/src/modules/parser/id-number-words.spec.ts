import { normalizeIdNumberWords } from './id-number-words';
import { ParserService } from './parser.service';

// Matriks acceptance voice command Bahasa Indonesia (plan T2).
// Bagian 1: normalizer terbilang → digit. Bagian 2: parse end-to-end.

describe('normalizeIdNumberWords', () => {
  it.each([
    ['makan dua puluh ribu', 'makan 20rb'],
    ['kopi lima belas ribu gopay', 'kopi 15rb gopay'],
    ['bensin lima puluh ribu tunai', 'bensin 50rb tunai'],
    ['gaji lima juta transfer', 'gaji 5jt transfer'],
    ['gaji satu koma lima juta bca', 'gaji 1.5jt bca'],
    ['dapat bonus dua setengah juta', 'dapat bonus 2.5jt'],
    ['seribu parkir', '1rb parkir'],
    ['sejuta proyek', '1jt proyek'],
    ['setengah juta sedekah', '500rb sedekah'],
    ['tiga ratus lima puluh ribu belanja', '350rb belanja'],
    ['seratus dua puluh lima ribu token listrik', '125rb token listrik'],
    ['sekitar dua puluh ribuan makan', '20rb makan'],
    ['dua puluh rebu makan', '20rb makan'],
    ['+lima puluh ribu fee proyek', '+50rb fee proyek'],
    ['catat makan siang dua puluh ribu', 'catat makan siang 20rb'],
    // Regresi: input digit/command existing tidak berubah makna.
    ['makan 20rb qris', 'makan 20rb qris'],
    ['makan 50.000', 'makan 50.000'],
    ['+5jt freelance', '+5jt freelance'],
    ['-50rb makan', '-50rb makan'],
    ['total', 'total'],
    ['halo apa kabar', 'halo apa kabar'],
    ['', ''],
  ])('"%s" → "%s"', (input, expected) => {
    expect(normalizeIdNumberWords(input)).toBe(expected);
  });
});

describe('ParserService — voice (terbilang)', () => {
  const service = new ParserService();

  it.each([
    ['makan dua puluh ribu', 'makan', 20_000, 'EXPENSE', 'CASH'],
    ['makan dua puluh ribu pakai qris', 'makan', 20_000, 'EXPENSE', 'QRIS'],
    ['kopi lima belas ribu gopay', 'kopi', 15_000, 'EXPENSE', 'QRIS'],
    ['bensin lima puluh ribu tunai', 'bensin', 50_000, 'EXPENSE', 'CASH'],
    ['gaji lima juta transfer', 'gaji', 5_000_000, 'INCOME', 'TRANSFER'],
    ['gaji satu koma lima juta bca', 'gaji', 1_500_000, 'INCOME', 'TRANSFER'],
    ['dapat bonus dua setengah juta', 'dapat bonus', 2_500_000, 'INCOME', 'CASH'],
    ['seribu parkir', 'parkir', 1_000, 'EXPENSE', 'CASH'],
    ['tiga ratus lima puluh ribu belanja', 'belanja', 350_000, 'EXPENSE', 'CASH'],
    ['habis tiga puluh ribu buat ojek online dana', 'habis buat ojek online', 30_000, 'EXPENSE', 'TRANSFER'],
    ['catat makan siang dua puluh ribu', 'makan siang', 20_000, 'EXPENSE', 'CASH'],
    ['+lima puluh ribu fee proyek', 'fee proyek', 50_000, 'INCOME', 'CASH'],
  ])('"%s" → %s %d %s %s', (input, desc, amount, type, payment) => {
    const result = service.parse(input);
    expect(result.kind).toBe('TRANSACTION');
    expect(result.transaction?.description).toBe(desc);
    expect(result.transaction?.amount).toBe(amount);
    expect(result.transaction?.type).toBe(type);
    expect(result.transaction?.paymentMethod).toBe(payment);
  });

  it.each([
    ['dua puluh ribu', 'UNKNOWN'],
    ['makan', 'UNKNOWN'],
    ['', 'UNKNOWN'],
  ])('"%s" → %s (butuh amount+deskripsi)', (input, expected) => {
    expect(service.parse(input).kind).toBe(expected);
  });
});
