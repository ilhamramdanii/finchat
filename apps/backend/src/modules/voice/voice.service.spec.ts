import { Test, TestingModule } from '@nestjs/testing';
import { VoiceService } from './voice.service';
import { ParserModule } from '../parser/parser.module';

describe('VoiceService', () => {
  let service: VoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ParserModule],
      providers: [VoiceService],
    }).compile();
    service = module.get<VoiceService>(VoiceService);
  });

  it('parse terbilang memakai parser yang sama dengan jalur WA', () => {
    const out = service.parse('makan dua puluh ribu pakai qris');
    expect(out.transcript).toBe('makan dua puluh ribu pakai qris');
    expect(out.normalized).toBe('makan 20rb pakai qris');
    expect(out.result.kind).toBe('TRANSACTION');
    expect(out.result.transaction?.amount).toBe(20_000);
    expect(out.result.transaction?.paymentMethod).toBe('QRIS');
  });

  it('meneruskan command tanpa akses DB', () => {
    const out = service.parse('total');
    expect(out.result.kind).toBe('COMMAND');
    expect(out.result.command).toBe('TOTAL');
  });

  it('melewatkan teks tak dikenal sebagai UNKNOWN', () => {
    expect(service.parse('halo apa kabar').result.kind).toBe('UNKNOWN');
  });
});
