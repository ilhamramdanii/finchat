import { Injectable } from '@nestjs/common';

export type ParsedTransactionType = 'EXPENSE' | 'INCOME';
export type ParsedPaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export interface ParsedTransaction {
  description: string;
  amount: number;
  type: ParsedTransactionType;
  paymentMethod: ParsedPaymentMethod;
  rawMessage: string;
}

export type CommandType = 'TOTAL' | 'REPORT' | 'HELP' | 'BALANCE';

export interface ParseResult {
  kind: 'TRANSACTION' | 'COMMAND' | 'UNKNOWN';
  transaction?: ParsedTransaction;
  command?: CommandType;
}

// ── Keyword maps ─────────────────────────────────────────────────────────────

const INCOME_KEYWORDS = new Set([
  'gaji', 'gajian', 'salary', 'upah', 'honor', 'honorarium',
  'bonus', 'thr', 'insentif', 'reward', 'hadiah', 'cashback',
  'freelance', 'project', 'proyek', 'bayaran', 'fee',
  'dividen', 'saham', 'investasi', 'return', 'profit', 'cuan',
  'dapat', 'dapet', 'terima', 'masuk', 'pemasukan', 'income',
]);

const PAYMENT_METHOD_MAP: Record<string, ParsedPaymentMethod> = {
  cash: 'CASH', tunai: 'CASH', kontan: 'CASH',
  transfer: 'TRANSFER', tf: 'TRANSFER',
  bca: 'TRANSFER', mandiri: 'TRANSFER', bni: 'TRANSFER', bri: 'TRANSFER',
  bsi: 'TRANSFER', cimb: 'TRANSFER', permata: 'TRANSFER',
  dana: 'TRANSFER', ovo: 'TRANSFER',
  qris: 'QRIS', gopay: 'QRIS', shopeepay: 'QRIS',
  spay: 'QRIS', linkaja: 'QRIS', sakuku: 'QRIS',
};

const COMMAND_MAP: Record<string, CommandType> = {
  '/total': 'TOTAL', 'total': 'TOTAL',
  '/laporan': 'REPORT', 'laporan': 'REPORT', '/report': 'REPORT', 'report': 'REPORT',
  '/bantuan': 'HELP', 'bantuan': 'HELP', '/help': 'HELP', 'help': 'HELP',
  '/saldo': 'BALANCE', 'saldo': 'BALANCE', '/balance': 'BALANCE', 'balance': 'BALANCE',
};

@Injectable()
export class ParserService {
  parse(raw: string): ParseResult {
    const trimmed = raw.trim();

    // ── Command check ───────────────────────────────────────────────────────
    const command = COMMAND_MAP[trimmed.toLowerCase()];
    if (command) return { kind: 'COMMAND', command };

    const transaction = this.parseTransaction(trimmed);
    if (transaction) return { kind: 'TRANSACTION', transaction };

    return { kind: 'UNKNOWN' };
  }

  private parseTransaction(raw: string): ParsedTransaction | null {
    // Strip prefix /catat or catat
    const cleaned = raw.replace(/^\/?catat\s+/i, '').trim();

    // Detect explicit type prefix: +amount desc or -amount desc
    let forcedType: ParsedTransactionType | null = null;
    let workingStr = cleaned;

    if (/^\+/.test(workingStr)) {
      forcedType = 'INCOME';
      workingStr = workingStr.slice(1).trim();
    } else if (/^-/.test(workingStr)) {
      forcedType = 'EXPENSE';
      workingStr = workingStr.slice(1).trim();
    }

    // Extract payment method (last token if it matches)
    const tokens = workingStr.toLowerCase().split(/\s+/);
    let paymentMethod: ParsedPaymentMethod = 'CASH';
    const lastToken = tokens[tokens.length - 1];
    if (lastToken && PAYMENT_METHOD_MAP[lastToken]) {
      paymentMethod = PAYMENT_METHOD_MAP[lastToken];
      workingStr = workingStr.slice(0, workingStr.toLowerCase().lastIndexOf(lastToken)).trim();
    }

    // Extract amount — try: "desc amount" or "amount desc"
    const amountPattern = /(\d[\d.,]*(?:rb|k|jt|m)?)/i;

    const amountFirst = workingStr.match(/^(\d[\d.,]*(?:rb|k|jt|m)?)\s+(.+)$/i);
    const amountLast = workingStr.match(/^(.+?)\s+(\d[\d.,]*(?:rb|k|jt|m)?)$/i);

    let amount: number | null = null;
    let description = '';

    if (amountFirst) {
      amount = this.parseAmount(amountFirst[1]);
      description = amountFirst[2].trim();
    } else if (amountLast) {
      amount = this.parseAmount(amountLast[2]);
      description = amountLast[1].trim();
    }

    if (!amount || !description) return null;

    const type = forcedType ?? this.detectType(description);

    return {
      description,
      amount,
      type,
      paymentMethod,
      rawMessage: raw,
    };
  }

  parseAmount(raw: string): number {
    const lower = raw.toLowerCase().trim();
    const hasSuffix = /(rb|k|jt|m)$/.test(lower);

    // Dengan suffix (1.5jt) titik = desimal; tanpa suffix (50.000) titik = pemisah ribuan.
    const normalized = hasSuffix
      ? lower.replace(/,/g, '.')                      // 1,5jt → 1.5jt
      : lower.replace(/\./g, '').replace(/,/g, '.');  // 50.000 → 50000

    if (normalized.endsWith('jt') || normalized.endsWith('m')) {
      const base = parseFloat(normalized.replace(/jt|m/, ''));
      return Math.round(base * 1_000_000);
    }
    if (normalized.endsWith('rb') || normalized.endsWith('k')) {
      const base = parseFloat(normalized.replace(/rb|k/, ''));
      return Math.round(base * 1_000);
    }

    return Math.round(parseFloat(normalized)) || 0;
  }

  private detectType(description: string): ParsedTransactionType {
    const words = description.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (INCOME_KEYWORDS.has(word)) return 'INCOME';
    }
    return 'EXPENSE';
  }
}
