import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { VoiceService } from '../../core/services/voice.service';
import { TransactionService } from '../../core/services/transaction.service';
import { TransactionSummary, VoiceParseResult } from '@wa-finance/shared';

export interface VoiceFormPrefill {
  description: string;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS';
  type: 'INCOME' | 'EXPENSE';
  transcript: string;
}

type Status = 'idle' | 'listening' | 'loading' | 'preview' | 'command' | 'error';

const HELP_TEXT = [
  'Contoh ucapan suara:',
  '• "makan siang dua puluh lima ribu qris"',
  '• "gaji lima juta transfer"',
  '• "kopi dua belas ribu gopay"',
  'Perintah ringkasan: "total", "laporan", "saldo", "bantuan".',
].join('\n');

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
  <div class="voice-hud-wrap">
    @if (status() === 'idle' || status() === 'error') {
      <button type="button" class="mic-trigger-btn" (click)="start()" title="Pencatatan Suara">
        <span class="mic-dot"><i class="bi bi-mic-fill"></i></span>
        <span>Voice Command</span>
      </button>
      @if (status() === 'error') {
        <p class="voice-err">{{ errorMsg() }}</p>
      }
    }

    @if (status() === 'listening') {
      <div class="hud-status listening">
        <div class="hud-pulser">
          <span class="pulse-ring p1"></span>
          <span class="pulse-ring p2"></span>
        </div>
        <span class="hud-txt">Mendengarkan ucapan...</span>
        <button type="button" class="hud-cancel" (click)="cancel()">Batal</button>
      </div>
    }

    @if (status() === 'loading') {
      <div class="hud-status loading">
        <i class="bi bi-arrow-repeat spin"></i>
        <span class="hud-txt">Memproses kalimat...</span>
      </div>
    }

    @if (status() === 'preview' && parsed()?.transaction) {
      <div class="slip-card fade-in">
        <div class="slip-top">
          <span class="type-tag" [class.inc]="parsed()!.transaction!.type === 'INCOME'" [class.exp]="parsed()!.transaction!.type === 'EXPENSE'">
            {{ parsed()!.transaction!.type === 'INCOME' ? '+ IN' : '- OUT' }}
          </span>
          <span class="method-tag num">{{ pmLabel(parsed()!.transaction!.paymentMethod) }}</span>
        </div>

        <div class="slip-transcript">“{{ transcript() }}”</div>

        <div class="slip-main">
          <div class="slip-desc">{{ parsed()!.transaction!.description }}</div>
          <div class="slip-val num">{{ parsed()!.transaction!.amount | currency:'IDR':'symbol':'1.0-0':'id' }}</div>
        </div>

        <div class="slip-footer">
          <button type="button" class="btn-subtle" (click)="reset()">Ulangi</button>
          <button type="button" class="btn-confirm" (click)="use()"><i class="bi bi-check2"></i> Gunakan</button>
        </div>
      </div>
    }

    @if (status() === 'preview' && parsed()?.kind === 'UNKNOWN') {
      <div class="slip-card error-slip fade-in">
        <div class="slip-transcript">“{{ transcript() }}”</div>
        <p class="voice-err">Format tidak terdeteksi. Gunakan format: deskripsi + nominal + metode (contoh: "makan dua puluh ribu qris").</p>
        <div class="slip-footer">
          <button type="button" class="btn-subtle" (click)="reset()">Coba Lagi</button>
        </div>
      </div>
    }

    @if (status() === 'command') {
      <div class="slip-card command-slip fade-in">
        <div class="slip-transcript">“{{ transcript() }}”</div>
        @if (command() === 'HELP') {
          <pre class="help-content">{{ helpText }}</pre>
        } @else {
          <div class="summary-matrix num">
            <div><span>Pemasukan</span><b class="inc-txt">{{ summary().totalIncome | currency:'IDR':'symbol':'1.0-0':'id' }}</b></div>
            <div><span>Pengeluaran</span><b class="exp-txt">{{ summary().totalExpense | currency:'IDR':'symbol':'1.0-0':'id' }}</b></div>
            <div><span>Saldo Bersih</span><b>{{ summary().balance | currency:'IDR':'symbol':'1.0-0':'id' }}</b></div>
          </div>
        }
        <div class="slip-footer">
          <button type="button" class="btn-subtle" (click)="reset()">Tutup</button>
        </div>
      </div>
    }
  </div>
  `,
  styles: [`
    .voice-hud-wrap { display: flex; flex-direction: column; gap: 8px; }

    .mic-trigger-btn {
      display: inline-flex; align-items: center; gap: 8px;
      height: 34px; padding: 0 14px; border-radius: var(--r-sm);
      background: var(--surface-2); border: 1px solid var(--border-strong);
      color: var(--text); font-size: 0.78rem; font-weight: 700; font-family: var(--font);
      cursor: pointer; transition: all 0.14s ease;
      &:hover { background: var(--surface-hover); border-color: var(--cobalt-bright); }
    }
    .mic-dot { color: var(--cobalt-bright); font-size: 0.85rem; }

    .hud-status {
      display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px;
      border-radius: var(--r-sm); background: var(--surface-2); border: 1px solid var(--border-strong);
      color: var(--text); font-size: 0.8rem; font-weight: 600;
    }
    .hud-txt { flex: 1; font-size: 0.78rem; color: var(--text); }
    .hud-cancel { background: none; border: none; color: var(--red-bright); font-weight: 700; cursor: pointer; font-size: 0.76rem; }

    .hud-pulser { display: flex; align-items: center; gap: 4px; }
    .pulse-ring { width: 8px; height: 8px; border-radius: 50%; background: var(--cobalt-bright); animation: pulse 0.8s infinite alternate; }
    .p2 { animation-delay: 0.3s; }
    @keyframes pulse { 0% { opacity: 0.3; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1.2); } }

    /* Physical Slip Preview */
    .slip-card {
      background: var(--surface-2); border: 1px solid var(--border-strong);
      border-radius: var(--r-sm); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
      box-shadow: var(--shadow-sm);
    }
    .slip-top { display: flex; justify-content: space-between; align-items: center; }
    .type-tag {
      font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: var(--r-xs); font-family: var(--font-mono);
      &.inc { background: var(--green-dim); color: var(--green-bright); }
      &.exp { background: var(--red-dim); color: var(--red-bright); }
    }
    .method-tag { font-size: 0.7rem; font-weight: 700; color: var(--muted); }
    .slip-transcript { font-size: 0.78rem; font-style: italic; color: var(--muted); }
    .slip-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .slip-desc { font-size: 0.92rem; font-weight: 800; color: var(--text); }
    .slip-val { font-size: 1.1rem; font-weight: 800; color: var(--cobalt-bright); }

    .slip-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .btn-subtle {
      height: 32px; padding: 0 12px; border-radius: var(--r-xs); background: transparent;
      border: 1px solid var(--border); color: var(--muted); font-size: 0.76rem; font-weight: 700; cursor: pointer;
      &:hover { background: var(--surface); color: var(--text); }
    }
    .btn-confirm {
      height: 32px; padding: 0 14px; border-radius: var(--r-xs); background: var(--cobalt);
      border: none; color: #FFF; font-size: 0.76rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;
      &:hover { background: var(--cobalt-bright); }
    }

    .summary-matrix { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 0.76rem; }
    .summary-matrix div { display: flex; flex-direction: column; gap: 2px; }
    .summary-matrix span { font-size: 0.64rem; color: var(--subtle); font-weight: 700; text-transform: uppercase; }
    .inc-txt { color: var(--green-bright); }
    .exp-txt { color: var(--red-bright); }
    .help-content { font-size: 0.74rem; color: var(--text); white-space: pre-wrap; font-family: var(--font-mono); margin: 0; }
    .voice-err { font-size: 0.76rem; color: var(--red-bright); font-weight: 600; margin: 0; }
    .spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class VoiceInputComponent {
  @Output() useAsForm = new EventEmitter<VoiceFormPrefill>();

  private readonly voice = inject(VoiceService);
  private readonly txService = inject(TransactionService);

  readonly status = signal<Status>('idle');
  readonly transcript = signal('');
  readonly normalized = signal('');
  readonly parsed = signal<VoiceParseResult | null>(null);
  readonly command = signal<string | null>(null);
  readonly summary = signal<TransactionSummary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  readonly errorMsg = signal('');
  readonly helpText = HELP_TEXT;

  private cancelled = false;

  async start() {
    const support = this.voice.support();
    if (support === 'unsupported') {
      this.fail('Browser tidak mendukung voice input.');
      return;
    }
    if (support === 'insecure-context') {
      this.fail('Mic butuh konteks HTTPS / localhost.');
      return;
    }
    this.cancelled = false;
    this.status.set('listening');
    try {
      const text = await this.voice.listenOnce('id-ID');
      if (this.cancelled) return;
      this.status.set('loading');
      this.transcript.set(text);
      this.voice.parseVoice(text).subscribe({
        next: (res) => {
          if (this.cancelled) return;
          this.normalized.set(res.normalized);
          this.parsed.set(res.result);
          if (res.result.kind === 'COMMAND' && res.result.command) {
            this.runCommand(res.result.command);
          } else {
            this.status.set('preview');
          }
        },
        error: () => {
          if (!this.cancelled) this.fail('Gagal memproses suara.');
        },
      });
    } catch (e: any) {
      if (!this.cancelled) this.fail(e?.message ?? 'Suara tidak terdeteksi.');
    }
  }

  cancel() {
    this.cancelled = true;
    this.status.set('idle');
  }

  reset() {
    this.cancelled = true;
    this.transcript.set('');
    this.normalized.set('');
    this.parsed.set(null);
    this.command.set(null);
    this.status.set('idle');
  }

  use() {
    const t = this.parsed()?.transaction;
    if (!t) return;
    this.useAsForm.emit({
      description: t.description,
      amount: t.amount,
      paymentMethod: t.paymentMethod,
      type: t.type,
      transcript: this.transcript(),
    });
    this.reset();
  }

  pmLabel(pm: string): string {
    return pm === 'CASH' ? 'CASH' : pm === 'TRANSFER' ? 'TRANSFER' : 'QRIS';
  }

  private runCommand(cmd: string) {
    this.command.set(cmd);
    if (cmd === 'HELP') {
      this.status.set('command');
      return;
    }
    const req$ = cmd === 'TOTAL' ? this.txService.getToday() : this.txService.getThisMonth();
    req$.subscribe({
      next: (s) => {
        this.summary.set(s);
        this.status.set('command');
      },
      error: () => this.fail('Gagal mengambil ringkasan.'),
    });
  }

  private fail(msg: string) {
    this.errorMsg.set(msg);
    this.status.set('error');
  }
}
