import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  template: `
    <div class="login-page page-fade">
      <div class="login-card">
        <div class="brand-top">
          <div class="vault-chip num">FINCHAT LEDGER ENGINE</div>
          <h1 class="font-display">Terminal Kas & Ledger</h1>
          <p>Otentikasi akses akun pencatatan transaksi keuangan.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
          <div class="field-group">
            <label class="field-label">Nama Pengguna <span class="optional">(opsional)</span></label>
            <input class="field-input" formControlName="name" placeholder="Nama lengkap atau panggilan" />
          </div>

          <div class="field-group">
            <label class="field-label">Nomor WhatsApp / ID Akses</label>
            <input class="field-input num" formControlName="phone" placeholder="6281234567890" />
            <span class="field-hint">Format internasional tanpa tanda + (contoh: 6281234567890)</span>
          </div>

          @if (error()) {
            <div class="error-banner">
              <i class="bi bi-exclamation-triangle-fill"></i> {{ error() }}
            </div>
          }

          <button class="submit-btn" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="18" />
              <span>Verifikasi Akses...</span>
            } @else {
              <span>Buka Terminal Kas</span>
              <i class="bi bi-arrow-right"></i>
            }
          </button>
        </form>

        <div class="login-footer font-mono">
          SECURE VAULT GATEWAY • SYSTEM VERSION 2.4
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg); color: var(--text); padding: 24px; position: relative;
    }

    .login-card {
      width: min(420px, 100%); background: var(--surface); border: 1px solid var(--border-strong);
      border-radius: var(--r); padding: 36px 32px; box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; gap: 24px; position: relative;
    }

    .login-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--cobalt-bright), var(--amber-bright));
      border-radius: var(--r) var(--r) 0 0;
    }

    .brand-top { display: flex; flex-direction: column; gap: 6px; }
    .vault-chip {
      font-size: 0.65rem; font-weight: 800; color: var(--amber-bright); background: var(--amber-dim);
      padding: 3px 8px; border-radius: var(--r-xs); border: 1px solid rgba(245,158,11,0.3); align-self: flex-start;
    }
    .brand-top h1 { font-size: 1.6rem; font-weight: 900; color: var(--text); margin-top: 4px; }
    .brand-top p { font-size: 0.82rem; color: var(--muted); line-height: 1.4; }

    .login-form { display: flex; flex-direction: column; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.76rem; font-weight: 700; color: var(--text); }
    .optional { font-weight: 500; color: var(--subtle); }
    .field-input {
      height: 42px; padding: 0 14px; border-radius: var(--r-sm);
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text);
      font-size: 0.88rem; font-weight: 600; outline: none; transition: border-color 0.14s;
      &:focus { border-color: var(--cobalt-bright); }
    }
    .field-hint { font-size: 0.68rem; color: var(--subtle); }

    .error-banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: var(--red-dim); border: 1px solid rgba(244,63,94,0.3);
      border-radius: var(--r-sm); color: var(--red-bright); font-size: 0.78rem; font-weight: 600;
    }

    .submit-btn {
      height: 44px; margin-top: 6px; border-radius: var(--r-sm); border: 1px solid rgba(255,255,255,0.15);
      background: var(--cobalt); color: #FFF; font-weight: 800; font-family: var(--font);
      font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s ease;
      &:hover:not(:disabled) { background: var(--cobalt-bright); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    .login-footer {
      font-size: 0.64rem; color: var(--subtle); text-align: center; border-top: 1px solid var(--border);
      padding-top: 16px; letter-spacing: 0.05em;
    }
  `],
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    name: [''],
    phone: ['', [Validators.required, Validators.pattern(/^62\d{9,13}$/)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    this.api.post<{ token: string; user: any }>('auth/login', this.form.value).subscribe({
      next: ({ token, user }) => {
        this.auth.setAuth(token, user);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login gagal, coba lagi');
        this.loading.set(false);
      },
    });
  }
}
