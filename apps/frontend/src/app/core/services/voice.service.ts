import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { VoiceParseResponse } from '@wa-finance/shared';

export type VoiceSupport = 'ok' | 'unsupported' | 'insecure-context';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(ApiService);

  support(): VoiceSupport {
    const w = window as any;
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      return 'unsupported';
    }
    // getUserMedia / SpeechRecognition butuh secure context.
    // localhost dihitung aman oleh browser; HTTP publik tidak.
    if (!window.isSecureContext) return 'insecure-context';
    return 'ok';
  }

  // Satu sesi dengar: resolve transcript final, reject dengan pesan Indonesia.
  listenOnce(lang = 'id-ID', timeoutMs = 15_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const w = window as any;
      const Rec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!Rec) {
        reject(new Error('Browser tidak mendukung voice command. Pakai Chrome/Edge atau ketik manual.'));
        return;
      }
      const rec = new Rec();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      let done = false;
      const timer = window.setTimeout(() => {
        if (!done) {
          done = true;
          try { rec.stop(); } catch { /* abaikan */ }
          reject(new Error('Waktu dengar habis (15 detik). Coba lagi dengan kalimat lebih pendek.'));
        }
      }, timeoutMs);

      rec.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript?.trim() ?? '';
        if (!done && text) {
          done = true;
          window.clearTimeout(timer);
          resolve(text);
        }
      };
      rec.onerror = (ev: any) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        reject(new Error(this.errorMessage(ev.error)));
      };
      rec.onend = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        reject(new Error('Tidak terdengar suara. Dekatkan mic lalu coba lagi.'));
      };
      try {
        rec.start();
      } catch {
        done = true;
        window.clearTimeout(timer);
        reject(new Error('Mic sedang dipakai aplikasi lain. Tutup lalu coba lagi.'));
      }
    });
  }

  parseVoice(text: string) {
    return this.api.post<VoiceParseResponse>('voice/parse', { text });
  }

  private errorMessage(code: string): string {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Izin mic ditolak. Klik ikon gembok di address bar lalu izinkan microphone.';
      case 'no-speech':
        return 'Tidak terdengar suara. Coba lagi.';
      case 'audio-capture':
        return 'Mic tidak ditemukan. Periksa perangkat microphone.';
      case 'network':
        return 'Gangguan jaringan ke layanan suara. Coba lagi.';
      default:
        return 'Voice command gagal. Ketik manual atau coba lagi.';
    }
  }
}
