// Voice command shared contracts.
// NOTE: tipe hasil parse diduplikasi minimal di sini agar arah dependensi
// tetap benar: shared <- backend, shared <- frontend. Jangan import dari
// apps/backend di file ini.

export type VoiceTransactionType = 'EXPENSE' | 'INCOME';

export type VoicePaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export interface VoiceParsedTransaction {
  description: string;
  amount: number;
  type: VoiceTransactionType;
  paymentMethod: VoicePaymentMethod;
  rawMessage: string;
}

export type VoiceCommandKind = 'TOTAL' | 'REPORT' | 'HELP' | 'BALANCE';

export type VoiceParseKind = 'TRANSACTION' | 'COMMAND' | 'UNKNOWN';

export interface VoiceParseResult {
  kind: VoiceParseKind;
  transaction?: VoiceParsedTransaction;
  command?: VoiceCommandKind;
}

export interface VoiceParseRequest {
  text: string;
}

export interface VoiceParseResponse {
  transcript: string;
  normalized: string;
  result: VoiceParseResult;
}
