import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <!-- Left panel – branding -->
      <div class="login-left">
        <div class="left-content">
          <div class="brand-mark">
            <div class="brand-icon-lg"><i class="bi bi-wallet2"></i></div>
            <span class="brand-title">WA Finance</span>
          </div>

          <div class="hero-text">
            <h1>Catat keuanganmu<br>lewat WhatsApp</h1>
            <p>Kirim pesan ke diri sendiri, bot langsung mencatat. Lihat ringkasan di dashboard kapan saja.</p>
          </div>

          <ul class="feature-list">
            <li>
              <div class="feat-icon"><i class="bi bi-chat-dots-fill"></i></div>
              <span>Ketik <strong>makan 20rb qris</strong> — langsung tercatat</span>
            </li>
            <li>
              <div class="feat-icon"><i class="bi bi-pie-chart-fill"></i></div>
              <span>Laporan bulanan otomatis per kategori</span>
            </li>
            <li>
              <div class="feat-icon"><i class="bi bi-shield-check-fill"></i></div>
              <span>Data hanya milik kamu, tidak dibagikan</span>
            </li>
          </ul>
        </div>

        <!-- Decorative blobs -->
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>

      <!-- Right panel – form -->
      <div class="login-right">
        <div class="form-card">
          <div class="form-header">
            <h2>Masuk</h2>
            <p>Gunakan nomor WhatsApp yang sama dengan bot</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
            <div class="field-group">
              <label class="field-label">Nama <span class="optional">(opsional)</span></label>
              <mat-form-field appearance="outline" class="field">
                <input matInput formControlName="name" placeholder="Nama kamu" />
              </mat-form-field>
            </div>

            <div class="field-group">
              <label class="field-label">Nomor WhatsApp</label>
              <mat-form-field appearance="outline" class="field">
                <input matInput formControlName="phone" placeholder="6281234567890" />
                <mat-hint>Format internasional tanpa tanda +</mat-hint>
                @if (form.controls['phone'].invalid && form.controls['phone'].touched) {
                  <mat-error>Format: 62 diikuti 9–12 digit</mat-error>
                }
              </mat-form-field>
            </div>

            @if (error()) {
              <div class="error-banner">
                <i class="bi bi-exclamation-triangle-fill"></i>
                {{ error() }}
              </div>
            }

            <button
              class="submit-btn"
              type="submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="18" />
                <span>Memproses...</span>
              } @else {
                <span>Masuk</span>
                <i class="bi bi-arrow-right"></i>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      min-height: 100vh;
    }

    /* ── Left panel ───────────────────── */
    .login-left {
      flex: 1;
      background: var(--navy);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }

    .left-content {
      position: relative;
      z-index: 2;
      max-width: 400px;
    }

    .brand-mark {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 48px;
    }

    .brand-icon-lg {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: white;
      box-shadow: 0 4px 14px rgba(16,185,129,0.4);
    }

    .brand-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.02em;
    }

    .hero-text {
      margin-bottom: 40px;

      h1 {
        font-size: 2.2rem;
        font-weight: 800;
        color: white;
        line-height: 1.2;
        letter-spacing: -0.03em;
        margin-bottom: 16px;
      }

      p {
        font-size: 0.95rem;
        color: rgba(255,255,255,0.5);
        line-height: 1.6;
      }
    }

    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 16px;

      li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        font-size: 0.875rem;
        color: rgba(255,255,255,0.6);
        line-height: 1.4;

        strong { color: rgba(255,255,255,0.9); }
      }
    }

    .feat-icon {
      width: 28px;
      height: 28px;
      background: rgba(16,185,129,0.15);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      color: var(--emerald);
      flex-shrink: 0;
    }

    /* Decorative blobs */
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.18;
      pointer-events: none;
    }
    .blob-1 {
      width: 400px; height: 400px;
      background: var(--emerald);
      top: -100px; right: -100px;
    }
    .blob-2 {
      width: 300px; height: 300px;
      background: #3B82F6;
      bottom: -80px; left: -80px;
    }

    /* ── Right panel ──────────────────── */
    .login-right {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      background: var(--bg);
    }

    .form-card {
      width: 100%;
      max-width: 360px;
    }

    .form-header {
      margin-bottom: 32px;

      h2 {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--text);
        letter-spacing: -0.03em;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.875rem;
        color: var(--muted);
      }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 4px;
    }

    .field-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
      letter-spacing: 0.01em;

      .optional {
        font-weight: 400;
        color: var(--muted);
      }
    }

    .field { width: 100%; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--red-dim);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: var(--r-sm);
      color: var(--red);
      font-size: 0.85rem;
      font-weight: 500;
      margin-top: 4px;
    }

    .submit-btn {
      width: 100%;
      height: 42px;
      background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
      border: none;
      border-radius: var(--r-sm);
      color: white;
      font-size: 0.9rem;
      font-weight: 700;
      font-family: var(--font);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
      transition: opacity 0.15s;
      box-shadow: 0 3px 12px rgba(16,185,129,0.3);

      &:hover:not(:disabled) { opacity: 0.9; }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      mat-spinner { --mdc-circular-progress-active-indicator-color: white; }
    }

    @media (max-width: 768px) {
      .login-page { flex-direction: column; }
      .login-left { min-height: 220px; flex: none; padding: 32px; }
      .hero-text h1 { font-size: 1.5rem; }
      .feature-list { display: none; }
      .login-right { width: 100%; padding: 32px 24px; }
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
