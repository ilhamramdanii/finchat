import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStore } from '../../store/auth.store';
import { ApiService } from '../../core/services/api.service';
import { CategoryService } from '../../core/services/category.service';
import { I18nService } from '../../core/services/i18n.service';
import { Category } from '@wa-finance/shared';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
<div class="page page-fade">
  <!-- ══ APPLE LARGE TITLE HEADER ══ -->
  <div class="page-hdr">
    <div>
      <div class="hdr-eyebrow num">{{ i18n.t().profileEyebrow }}</div>
      <h1 class="page-title font-display">{{ i18n.t().profileTitle }}</h1>
    </div>
  </div>

  <div class="page-body">
    <!-- ══ PROFILE CARD ══ -->
    <div class="panel profile-card apple-card">
      <div class="avatar-large font-display">
        {{ userInitial() }}
      </div>
      <div class="user-detail">
        <h2 class="user-name font-display">{{ auth.user()?.name ?? 'User' }}</h2>
        <span class="user-phone num"><i class="bi bi-whatsapp"></i> +{{ auth.user()?.phone }}</span>
        <span class="badge income"><i class="bi bi-check-circle-fill"></i> {{ i18n.t().userStatusActive }}</span>
      </div>
    </div>

    <!-- ══ APP PREFERENCES & APPEARANCE ══ -->
    <div class="panel apple-card">
      <div class="panel-hdr">
        <h3 class="panel-title font-display">{{ i18n.t().appPreferences }}</h3>
      </div>

      <!-- Theme Mode (Light / Dark / Auto) -->
      <div class="pref-row">
        <div class="pref-info">
          <span class="pref-label"><i class="bi bi-circle-half"></i> {{ i18n.t().themeMode }}</span>
          <span class="pref-desc">{{ i18n.currentLang() === 'id' ? 'Sesuaikan tampilan visual dengan mata Anda.' : 'Customize visual theme appearance.' }}</span>
        </div>
        <div class="segmented-control">
          <button type="button" class="segmented-item" [class.active]="theme() === 'light'" (click)="setTheme('light')">
            <i class="bi bi-sun-fill"></i> {{ i18n.t().lightMode }}
          </button>
          <button type="button" class="segmented-item" [class.active]="theme() === 'dark'" (click)="setTheme('dark')">
            <i class="bi bi-moon-stars-fill"></i> {{ i18n.t().darkMode }}
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Language Selector -->
      <div class="pref-row">
        <div class="pref-info">
          <span class="pref-label"><i class="bi bi-translate"></i> {{ i18n.t().systemLanguage }}</span>
          <span class="pref-desc">{{ i18n.currentLang() === 'id' ? 'Bahasa antarmuka di seluruh aplikasi.' : 'Interface language across application.' }}</span>
        </div>
        <div class="segmented-control">
          <button type="button" class="segmented-item" [class.active]="i18n.currentLang() === 'id'" (click)="setLanguage('id')">
            🇮🇩 Bahasa Indonesia
          </button>
          <button type="button" class="segmented-item" [class.active]="i18n.currentLang() === 'en'" (click)="setLanguage('en')">
            🇬🇧 English
          </button>
        </div>
      </div>
    </div>

    <!-- ══ EDIT PROFILE FORM ══ -->
    <div class="panel apple-card">
      <div class="panel-hdr">
        <h3 class="panel-title font-display">{{ i18n.t().editAccountInfo }}</h3>
      </div>

      <form [formGroup]="form" (ngSubmit)="saveProfile()" class="profile-form">
        <div class="form-field">
          <label class="field-lbl">{{ i18n.t().fullName }}</label>
          <input class="field-inp" formControlName="name" [placeholder]="i18n.t().namePlaceholder" />
        </div>

        <div class="form-field">
          <label class="field-lbl">{{ i18n.t().waNumber }}</label>
          <input class="field-inp num" [value]="userPhoneWithPlus()" disabled />
          <span class="field-hint">{{ i18n.t().waHint }}</span>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-submit tap-target-44" [disabled]="form.invalid || loading()">
            <i class="bi bi-floppy-fill"></i>
            <span>{{ loading() ? i18n.t().saving : i18n.t().saveChanges }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ══ BULK CATEGORY & KEYWORDS MANAGER ══ -->
    <div class="panel apple-card">
      <div class="panel-hdr cat-hdr">
        <div>
          <h3 class="panel-title font-display">{{ i18n.t().categoriesManager }}</h3>
          <p class="panel-desc">{{ i18n.t().categoriesDesc }}</p>
        </div>
        <button class="btn-create-cat tap-target-44" (click)="openAddCategoryModal()">
          <i class="bi bi-plus-lg"></i>
          <span>{{ i18n.t().newCategory }}</span>
        </button>
      </div>

      <div class="category-list">
        @if (categoriesLoading()) {
          @for (i of [1,2,3]; track i) {
            <div class="category-item">
              <div class="cat-top">
                <div class="cat-info">
                  <span class="skeleton" style="width: 12px; height: 12px; border-radius: 50%;"></span>
                  <span class="skeleton" style="width: 120px; height: 16px;"></span>
                  <span class="skeleton" style="width: 50px; height: 14px;"></span>
                </div>
                <span class="skeleton" style="width: 80px; height: 26px;"></span>
              </div>
              <div class="keywords-wrap">
                <div class="chip-container">
                  <span class="skeleton" style="width: 60px; height: 22px; border-radius: 4px;"></span>
                  <span class="skeleton" style="width: 75px; height: 22px; border-radius: 4px;"></span>
                  <span class="skeleton" style="width: 55px; height: 22px; border-radius: 4px;"></span>
                </div>
              </div>
            </div>
          }
        } @else {
          <div *ngFor="let cat of categories()" class="category-item">
            <div class="cat-top">
              <div class="cat-info">
                <span class="cat-dot" [style.background-color]="cat.color"></span>
                <span class="cat-name font-display">{{ cat.name }}</span>
                <span class="badge" [ngClass]="cat.type === 'INCOME' ? 'income' : 'expense'">{{ cat.type }}</span>
              </div>
              <div class="cat-actions">
                <button class="btn-save-kw" (click)="saveCategoryKeywords(cat)" [disabled]="isCatSaving(cat.id)">
                  <i class="bi bi-check2"></i>
                  <span>{{ isCatSaving(cat.id) ? i18n.t().saving : i18n.t().save }}</span>
                </button>
              </div>
            </div>

            <!-- Keywords Chip List -->
            <div class="keywords-wrap">
              <div class="chip-container">
                <span *ngFor="let kw of cat.keywords; let idx = index" class="kw-chip">
                  <span>{{ kw }}</span>
                  <i class="bi bi-x-circle-fill remove-kw" (click)="removeKeyword(cat, idx)"></i>
                </span>
                <input
                  #kwInput
                  type="text"
                  class="field-inp kw-inp"
                  [placeholder]="i18n.currentLang() === 'id' ? '+ Tambah kata kunci (Enter)...' : '+ Add keyword (Enter)...'"
                  (keydown.enter)="addKeyword(cat, kwInput); $event.preventDefault()"
                />
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- ══ APP INFORMATION ══ -->
    <div class="panel info-panel num apple-card">
      <div class="info-row">
        <span>{{ i18n.t().systemVersion }}</span>
        <b>FinChat v2.4 (HIG Edition)</b>
      </div>
      <div class="info-row">
        <span>{{ i18n.t().systemLanguage }}</span>
        <b>{{ i18n.currentLang() === 'en' ? 'English (US)' : 'Bahasa Indonesia' }}</b>
      </div>
    </div>

    <!-- ══ LOGOUT BUTTON ══ -->
    <div class="logout-wrap">
      <button class="btn-logout tap-target-44" (click)="logout()">
        <i class="bi bi-box-arrow-right"></i>
        <span>{{ i18n.t().signOut }}</span>
      </button>
    </div>
  </div>

  <!-- ══ ADD CATEGORY MODAL / BOTTOM SHEET ══ -->
  <div *ngIf="showAddModal()" class="modal-backdrop" (click)="showAddModal.set(false)">
    <div class="modal-box" (click)="$event.stopPropagation()">
      <div class="modal-hdr">
        <h3 class="modal-title font-display">{{ i18n.t().newCategory }}</h3>
        <button class="modal-close tap-target-44" (click)="showAddModal.set(false)"><i class="bi bi-x-circle-fill"></i></button>
      </div>

      <form [formGroup]="catForm" (ngSubmit)="submitNewCategory()" class="modal-form">
        <div class="form-field">
          <label class="field-lbl">{{ i18n.t().categoryName }}</label>
          <input class="field-inp" formControlName="name" [placeholder]="i18n.currentLang() === 'id' ? 'Contoh: Hiburan, Tagihan...' : 'e.g. Entertainment, Utilities...'" />
        </div>

        <div class="form-field">
          <label class="field-lbl">{{ i18n.t().txType }}</label>
          <select class="field-inp" formControlName="type">
            <option value="EXPENSE">EXPENSE ({{ i18n.t().expense }})</option>
            <option value="INCOME">INCOME ({{ i18n.t().income }})</option>
            <option value="BOTH">BOTH ({{ i18n.t().both }})</option>
          </select>
        </div>

        <div class="form-field">
          <label class="field-lbl">{{ i18n.t().indicatorColor }}</label>
          <input type="color" class="field-color" formControlName="color" />
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel tap-target-44" (click)="showAddModal.set(false)">{{ i18n.t().cancel }}</button>
          <button type="submit" class="btn-submit tap-target-44" [disabled]="catForm.invalid">{{ i18n.t().save }}</button>
        </div>
      </form>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 18px; padding: 20px; max-width: 900px; margin: 0 auto; width: 100%; }
    
    .page-hdr { display: flex; align-items: center; justify-content: space-between; }
    .hdr-eyebrow { font-size: 0.68rem; font-weight: 700; color: var(--cobalt); letter-spacing: 0.05em; }
    .page-title { font-size: 1.8rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }

    .page-body { display: flex; flex-direction: column; gap: 16px; }

    .panel { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .panel-hdr { margin-bottom: 4px; }
    .panel-hdr.cat-hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .panel-title { font-size: 1rem; font-weight: 700; color: var(--text); }
    .panel-desc { font-size: 0.76rem; color: var(--subtle); margin-top: 2px; }

    /* Preferences */
    .pref-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .pref-info { display: flex; flex-direction: column; gap: 2px; }
    .pref-label { font-size: 0.88rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
    .pref-desc { font-size: 0.72rem; color: var(--subtle); }
    .divider { height: 1px; background: var(--border); width: 100%; }

    /* Profile Header Card */
    .profile-card { display: flex; align-items: center; gap: 16px; }
    .avatar-large {
      width: 56px; height: 56px; border-radius: 50%; background: var(--cobalt); color: #FFF;
      font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
    }
    .user-detail { display: flex; flex-direction: column; gap: 4px; }
    .user-name { font-size: 1.2rem; font-weight: 700; color: var(--text); }
    .user-phone { font-size: 0.82rem; color: var(--subtle); display: flex; align-items: center; gap: 6px; }

    /* Form */
    .profile-form { display: flex; flex-direction: column; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .field-lbl { font-size: 0.76rem; font-weight: 600; color: var(--muted); }
    .field-inp {
      height: 40px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text); font-size: 0.88rem; outline: none; font-weight: 600;
      &:focus { border-color: var(--cobalt); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .field-color { height: 38px; width: 64px; padding: 2px; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; }
    .field-hint { font-size: 0.72rem; color: var(--subtle); }

    .form-actions { display: flex; justify-content: flex-end; margin-top: 4px; }
    .btn-submit {
      padding: 0 18px; border-radius: 9px; border: none;
      background: var(--cobalt); color: #FFF; font-weight: 600; font-size: 0.84rem; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;
      &:hover:not(:disabled) { background: var(--cobalt-bright); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* Category List & Chips */
    .btn-create-cat {
      padding: 0 14px; border-radius: 9px; border: none;
      background: var(--cobalt); color: #FFF; font-weight: 600; font-size: 0.82rem;
      cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.15s ease; &:hover { background: var(--cobalt-bright); }
    }
    .category-list { display: flex; flex-direction: column; gap: 10px; }
    .category-item {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
    }
    .cat-top { display: flex; justify-content: space-between; align-items: center; }
    .cat-info { display: flex; align-items: center; gap: 8px; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .cat-name { font-size: 0.9rem; font-weight: 700; color: var(--text); }
    .btn-save-kw {
      padding: 4px 10px; border-radius: 6px; border: none;
      background: var(--green-dim); color: var(--green); font-size: 0.74rem; font-weight: 600;
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.14s ease;
      &:hover:not(:disabled) { background: var(--green); color: #FFF; }
      &:disabled { opacity: 0.5; }
    }

    .keywords-wrap { display: flex; flex-direction: column; gap: 8px; }
    .chip-container { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .kw-chip {
      background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
      padding: 3px 8px; font-size: 0.75rem; font-weight: 600; color: var(--text);
      display: inline-flex; align-items: center; gap: 6px;
    }
    .remove-kw { cursor: pointer; color: var(--subtle); font-size: 0.85rem; &:hover { color: var(--red); } }
    .kw-inp { height: 32px; font-size: 0.78rem; padding: 0 10px; width: 220px; }

    /* Modal & iOS Bottom Sheet on Mobile */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      z-index: 1050; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal-box {
      width: min(440px, 100%); background: var(--surface); border-radius: var(--r);
      border: 1px solid var(--border-strong); padding: 22px; box-shadow: var(--shadow-lg);
    }
    .modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .modal-title { font-size: 1.1rem; font-weight: 800; color: var(--text); }
    .modal-close { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--subtle); }
    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
    .btn-cancel { padding: 0 16px; border-radius: 9px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; }

    /* Info */
    .info-panel { display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border); &:last-child { border: none; padding: 0; } }
    .info-row span { color: var(--subtle); }
    .info-row b { color: var(--text); }

    .logout-wrap { margin-top: 4px; }
    .btn-logout {
      width: 100%; border-radius: 9px; border: none;
      background: var(--red-dim); color: var(--red); font-size: 0.88rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.14s ease; &:hover { background: var(--red); color: #FFF; }
    }

    @media (max-width: 640px) {
      .page { padding: 12px; gap: 12px; }
      .page-title { font-size: 1.35rem; }
      .profile-card { padding: 16px; gap: 14px; }
      .avatar-large { width: 50px; height: 50px; font-size: 1.4rem; }
      .panel { padding: 14px; }
      .panel-hdr.cat-hdr { flex-direction: column; align-items: flex-start; }
      .btn-create-cat { width: 100%; justify-content: center; }

      .modal-backdrop { align-items: flex-end; padding: 0; }
      .modal-box {
        width: 100%; border-radius: 20px 20px 0 0; border-bottom: none;
        padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px));
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    }
  `],
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  private readonly catService = inject(CategoryService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly categoriesLoading = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly savingCategoryIds = signal<Set<string>>(new Set());
  readonly showAddModal = signal(false);
  readonly theme = signal<'light' | 'dark'>('light');

  readonly form = this.fb.group({
    name: [this.auth.user()?.name ?? '', Validators.required],
  });

  readonly catForm = this.fb.group({
    name: ['', Validators.required],
    type: ['EXPENSE', Validators.required],
    color: ['#007AFF', Validators.required],
  });

  ngOnInit() {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.theme.set(savedTheme);
    this.loadCategories();
  }

  setTheme(m: 'light' | 'dark') {
    this.theme.set(m);
    localStorage.setItem('theme', m);
    if (m === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    }
    this.snack.open(m === 'dark' ? 'Dark theme enabled' : 'Light theme enabled', 'OK', { duration: 2000 });
  }

  setLanguage(l: 'id' | 'en') {
    this.i18n.setLanguage(l);
    this.snack.open(l === 'en' ? 'Language switched to English' : 'Bahasa diganti ke Indonesia', 'OK', { duration: 2500 });
  }

  loadCategories() {
    this.categoriesLoading.set(true);
    this.catService.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Gagal memuat kategori' : 'Failed to load categories', 'OK', { duration: 3000 });
      },
    });
  }

  userInitial(): string {
    const name = this.auth.user()?.name ?? 'User';
    return name[0].toUpperCase();
  }

  userPhoneWithPlus(): string {
    return '+' + (this.auth.user()?.phone ?? '');
  }

  isCatSaving(id: string): boolean {
    return this.savingCategoryIds().has(id);
  }

  addKeyword(cat: Category, inputEl: HTMLInputElement) {
    const val = inputEl.value.trim().toLowerCase();
    if (!val) return;
    if (!cat.keywords.includes(val)) {
      cat.keywords.push(val);
    }
    inputEl.value = '';
  }

  removeKeyword(cat: Category, index: number) {
    cat.keywords.splice(index, 1);
  }

  saveCategoryKeywords(cat: Category) {
    this.savingCategoryIds.update((s) => new Set(s).add(cat.id));
    this.catService.update(cat.id, { keywords: cat.keywords }).subscribe({
      next: () => {
        this.savingCategoryIds.update((s) => {
          const next = new Set(s);
          next.delete(cat.id);
          return next;
        });
        this.snack.open(this.i18n.currentLang() === 'id' ? `Keyword "${cat.name}" tersimpan` : `Keywords for "${cat.name}" saved`, 'OK', { duration: 2500 });
      },
      error: () => {
        this.savingCategoryIds.update((s) => {
          const next = new Set(s);
          next.delete(cat.id);
          return next;
        });
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Gagal menyimpan keyword' : 'Failed to save keywords', 'OK', { duration: 3000 });
      },
    });
  }

  openAddCategoryModal() {
    this.catForm.reset({
      type: 'EXPENSE',
      color: '#007AFF',
    });
    this.showAddModal.set(true);
  }

  submitNewCategory() {
    if (this.catForm.invalid) return;
    const val = this.catForm.value;
    this.catService.create({
      name: val.name!,
      type: val.type as any,
      color: val.color || '#007AFF',
      keywords: [],
    }).subscribe({
      next: (newCat) => {
        this.categories.update(list => [...list, newCat]);
        this.showAddModal.set(false);
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Kategori berhasil ditambahkan' : 'Category created successfully', 'OK', { duration: 2500 });
      },
      error: () => {
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Gagal menambah kategori' : 'Failed to create category', 'OK', { duration: 3000 });
      }
    });
  }

  saveProfile() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.api.patch('/auth/profile', { name: this.form.value.name }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.auth.updateUserName(res.name ?? this.form.value.name);
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Profil berhasil diperbarui' : 'Profile updated successfully', 'OK', { duration: 2500 });
      },
      error: () => {
        this.loading.set(false);
        this.snack.open(this.i18n.currentLang() === 'id' ? 'Gagal memperbarui profil' : 'Failed to update profile', 'OK', { duration: 3000 });
      },
    });
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}
