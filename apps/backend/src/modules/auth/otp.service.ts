import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';

interface OtpEntry {
  hash: string;
  expiresAt: number;
}

interface RateEntry {
  timestamps: number[];
}

/**
 * OTP store: in-memory default (single instance).
 * Naik ke Redis (SETNX + TTL) saat horizontal scale — interface request/verify tetap sama.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly codes = new Map<string, OtpEntry>();
  private readonly rates = new Map<string, RateEntry>();

  private readonly ttlMs: number;
  private readonly maxPerWindow: number;
  private readonly windowMs: number;
  private readonly exposeDevCode: boolean;

  constructor(private readonly config: ConfigService) {
    this.ttlMs = parseInt(process.env.OTP_TTL_SEC ?? '300', 10) * 1000;
    this.maxPerWindow = parseInt(process.env.OTP_MAX_PER_WINDOW ?? '3', 10);
    this.windowMs = parseInt(process.env.OTP_WINDOW_SEC ?? '900', 10) * 1000;
    const env = this.config.get<string>('nodeEnv') ?? 'development';
    this.exposeDevCode = env !== 'production';
  }

  private hash(code: string, phone: string): string {
    return createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  private checkRateLimit(phone: string): void {
    const now = Date.now();
    const entry = this.rates.get(phone) ?? { timestamps: [] };
    entry.timestamps = entry.timestamps.filter((t) => now - t < this.windowMs);
    if (entry.timestamps.length >= this.maxPerWindow) {
      const retryAfter = Math.ceil((this.windowMs - (now - entry.timestamps[0])) / 1000);
      const err: any = new Error(`Terlalu banyak permintaan OTP. Coba lagi dalam ${retryAfter} detik.`);
      err.status = 429;
      throw err;
    }
    entry.timestamps.push(now);
    this.rates.set(phone, entry);
  }

  request(phone: string): { expiresInSec: number; devCode: string | null } {
    this.checkRateLimit(phone);
    const code = String(randomInt(100000, 999999));
    this.codes.set(phone, { hash: this.hash(code, phone), expiresAt: Date.now() + this.ttlMs });
    this.logger.debug(`OTP untuk ${phone} dibuat, TTL ${this.ttlMs / 1000}s`);
    return { expiresInSec: Math.floor(this.ttlMs / 1000), devCode: this.exposeDevCode ? code : null };
  }

  verify(phone: string, code: string): boolean {
    const entry = this.codes.get(phone);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.codes.delete(phone);
      return false;
    }
    const ok = entry.hash === this.hash(code, phone);
    if (ok) this.codes.delete(phone); // atomic invalidate sekali pakai
    return ok;
  }
}
