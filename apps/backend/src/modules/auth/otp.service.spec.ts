import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpService, { provide: ConfigService, useValue: { get: () => 'test' } }],
    }).compile();
    service = module.get<OtpService>(OtpService);
  });

  it('request + verify roundtrip sekali pakai', () => {
    const { devCode } = service.request('6281234567890');
    expect(devCode).toMatch(/^\d{6}$/);
    expect(service.verify('6281234567890', devCode!)).toBe(true);
    expect(service.verify('6281234567890', devCode!)).toBe(false); // sudah invalidate
  });

  it('reject kode salah', () => {
    service.request('6281234567890');
    expect(service.verify('6281234567890', '000000')).toBe(false);
  });

  it('rate limit setelah 3 request dalam window', () => {
    service.request('6289999999999');
    service.request('6289999999999');
    service.request('6289999999999');
    expect(() => service.request('6289999999999')).toThrow();
  });

  it('tolak kode kedaluwarsa (TTL 300s)', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    const t0 = Date.now();
    nowSpy.mockReturnValue(t0);
    const { devCode } = service.request('6281234567890');

    nowSpy.mockReturnValue(t0 + 301_000); // lewat TTL
    expect(service.verify('6281234567890', devCode!)).toBe(false);
    nowSpy.mockRestore();
  });

  it('tolak verify tanpa request lebih dulu', () => {
    expect(service.verify('6280000000000', '123456')).toBe(false);
  });
});
