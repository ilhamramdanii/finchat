import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">

      <!-- ── Mobile Overlay Backdrop ── -->
      @if (mobileOpen()) {
        <div class="mobile-backdrop" (click)="closeMobileMenu()"></div>
      }

      <!-- ── macOS Inspired Vibrant Sidebar ── -->
      <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
        <div class="sidebar-header">
          <div class="brand-block">
            <span class="brand-symbol">
              <i class="bi bi-wallet-fill"></i>
            </span>
            @if (!collapsed()) {
              <div class="brand-meta">
                <span class="brand-title">FinChat</span>
                <span class="brand-sub num">{{ i18n.t().brandSub }}</span>
              </div>
            }
          </div>
          <button class="mobile-close-btn" (click)="closeMobileMenu()" [title]="i18n.t().cancel">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" (click)="closeMobileMenu()">
            <span class="nav-icon"><i class="bi bi-square-grid-2x2-fill"></i></span>
            <span class="nav-label">{{ i18n.t().navOverview }}</span>
          </a>

          <a class="nav-item" routerLink="/transactions" routerLinkActive="active" (click)="closeMobileMenu()">
            <span class="nav-icon"><i class="bi bi-tray-fill"></i></span>
            <span class="nav-label">{{ i18n.t().navLedger }}</span>
          </a>

          <a class="nav-item" routerLink="/reports" routerLinkActive="active" (click)="closeMobileMenu()">
            <span class="nav-icon"><i class="bi bi-chart-pie-fill"></i></span>
            <span class="nav-label">{{ i18n.t().navReports }}</span>
          </a>

          <a class="nav-item" routerLink="/profile" routerLinkActive="active" (click)="closeMobileMenu()">
            <span class="nav-icon"><i class="bi bi-person-crop-circle-fill"></i></span>
            <span class="nav-label">{{ i18n.t().navAccount }}</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-block">
            <div class="user-avatar">
              {{ auth.user()?.name ? auth.user()!.name![0].toUpperCase() : 'U' }}
            </div>
            <div class="user-info">
              <span class="user-name">{{ auth.user()?.name ?? 'User' }}</span>
              <span class="user-phone num">{{ auth.user()?.phone }}</span>
            </div>
          </div>
          <button class="logout-btn tap-target-44" (click)="logout()" [title]="i18n.t().logoutConfirm">
            <i class="bi bi-rectangle-portrait-and-arrow-right"></i>
          </button>
        </div>
      </aside>

      <!-- ── Main Content Area ── -->
      <div class="content-wrap">
        <!-- Apple macOS / iOS Topbar Bar -->
        <header class="topbar liquid-glass">
          <button class="toggle-btn tap-target-44" (click)="toggleSidebar()" title="Toggle Sidebar">
            <i class="bi bi-sidebar-reverse"></i>
          </button>

          <div class="topbar-title font-display">
            <span class="topbar-chip">FinChat</span>
          </div>

          <div class="topbar-spacer"></div>

          <!-- Language Segmented Switch in Topbar -->
          <div class="lang-pill" (click)="toggleLang()" [title]="'Switch language to ' + (i18n.currentLang() === 'id' ? 'English' : 'Bahasa Indonesia')">
            <span class="lang-flag">{{ i18n.currentLang() === 'id' ? '🇮🇩' : '🇬🇧' }}</span>
            <span class="lang-code">{{ i18n.currentLang().toUpperCase() }}</span>
          </div>

          <!-- Apple Notification Bell Icon -->
          <div class="notif-wrap">
            <button class="notif-btn tap-target-44" (click)="toggleNotifPopover()" [title]="i18n.t().notifications">
              <i class="bi bi-bell-fill"></i>
              <span class="notif-dot"></span>
            </button>

            @if (showNotifs()) {
              <div class="notif-backdrop" (click)="showNotifs.set(false)"></div>
              <div class="notif-popover apple-card">
                <div class="notif-pop-hdr">
                  <span class="notif-pop-title font-display">{{ i18n.t().notificationsTitle }}</span>
                  <span class="badge income">Active</span>
                </div>
                <div class="notif-pop-list">
                  <div class="notif-item">
                    <div class="notif-ico-box"><i class="bi bi-shield-check"></i></div>
                    <div class="notif-item-content">
                      <span class="notif-item-title">{{ i18n.currentLang() === 'id' ? 'Sistem Terhubung' : 'System Connected' }}</span>
                      <span class="notif-item-desc">{{ i18n.currentLang() === 'id' ? 'WhatsApp FinChat Bot aktif sinkronisasi.' : 'WhatsApp FinChat Bot active sync.' }}</span>
                    </div>
                  </div>
                  <div class="notif-item">
                    <div class="notif-ico-box cobalt-ico"><i class="bi bi-check2-circle"></i></div>
                    <div class="notif-item-content">
                      <span class="notif-item-title">{{ i18n.currentLang() === 'id' ? 'Audit Kas Siap' : 'Ledger Audit Ready' }}</span>
                      <span class="notif-item-desc">{{ i18n.currentLang() === 'id' ? 'Laporan periode bulanan telah dikalkulasi.' : 'Monthly summary calculated.' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <button class="logout-top-btn tap-target-44" (click)="logout()" [title]="i18n.t().logout">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </header>

        <!-- Main Viewport -->
        <main class="shell-main">
          <router-outlet />
        </main>

        <!-- ── Apple Liquid Glass Mobile Tab Bar ── -->
        <nav class="mobile-bottom-bar liquid-glass">
          <a routerLink="/dashboard" routerLinkActive="active" class="mbar-item tap-target-44">
            <div class="mbar-icon-wrap">
              <i class="bi bi-square-grid-2x2-fill"></i>
            </div>
            <span>{{ i18n.t().navOverview }}</span>
          </a>
          <a routerLink="/transactions" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="mbar-item tap-target-44">
            <div class="mbar-icon-wrap">
              <i class="bi bi-tray-fill"></i>
            </div>
            <span>{{ i18n.t().navLedger }}</span>
          </a>
          <a routerLink="/transactions" [queryParams]="{action:'new'}" class="mbar-item mbar-center tap-target-44" [title]="i18n.t().newTransaction">
            <div class="mbar-action-pill">
              <i class="bi bi-plus-lg"></i>
            </div>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="mbar-item tap-target-44">
            <div class="mbar-icon-wrap">
              <i class="bi bi-chart-pie-fill"></i>
            </div>
            <span>{{ i18n.t().navReports }}</span>
          </a>
          <a routerLink="/profile" routerLinkActive="active" class="mbar-item tap-target-44">
            <div class="mbar-icon-wrap">
              <i class="bi bi-person-crop-circle-fill"></i>
            </div>
            <span>{{ i18n.t().navAccount }}</span>
          </a>
        </nav>
      </div>

    </div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; width: 100vw; overflow: hidden; position: relative; background: var(--bg); }

    /* ── Apple macOS Sidebar ── */
    .sidebar {
      width: 230px; flex-shrink: 0; background: var(--surface-translucent);
      backdrop-filter: blur(25px) saturate(190%);
      -webkit-backdrop-filter: blur(25px) saturate(190%);
      border-right: 1px solid var(--border); display: flex; flex-direction: column;
      transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; z-index: 100;
    }
    .sidebar.collapsed { width: 68px; }
    .sidebar.collapsed .brand-meta,
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .user-info { display: none !important; }

    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 16px; height: 60px; border-bottom: 1px solid var(--border);
    }
    .brand-block { display: flex; align-items: center; gap: 10px; }
    .brand-symbol {
      width: 32px; height: 32px; border-radius: 9px; background: var(--cobalt);
      color: #FFF; font-size: 1rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
    }
    .brand-meta { display: flex; flex-direction: column; line-height: 1.1; }
    .brand-title { font-size: 1rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .brand-sub { font-size: 0.58rem; color: var(--subtle); font-weight: 600; letter-spacing: 0.04em; margin-top: 2px; }

    .mobile-close-btn { display: none; background: none; border: none; font-size: 1.2rem; color: var(--muted); cursor: pointer; }

    .sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px;
      color: var(--muted); font-size: 0.88rem; font-weight: 500; text-decoration: none;
      transition: all 0.15s ease;
      &:hover { background: var(--surface-2); color: var(--text); }
      &.active {
        background: var(--cobalt); color: #FFFFFF; font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.28);
      }
    }
    .nav-icon { font-size: 1.05rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

    .sidebar-footer {
      padding: 12px 14px; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      background: var(--surface-2);
    }
    .user-block { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: var(--cobalt-dim); color: var(--cobalt);
      font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; min-width: 0; }
    .user-name { font-size: 0.82rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-phone { font-size: 0.68rem; color: var(--subtle); }

    .logout-btn {
      background: none; border: none; color: var(--subtle); cursor: pointer; font-size: 1.05rem;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      transition: all 0.14s ease;
      &:hover { color: var(--red); background: var(--red-dim); }
    }

    /* ── Content Wrap ── */
    .content-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; position: relative; }
    .topbar {
      height: 52px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 16px; gap: 10px; flex-shrink: 0; z-index: 10;
    }
    .toggle-btn {
      border-radius: var(--r-sm); border: none;
      background: transparent; color: var(--muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
      transition: all 0.14s ease;
      &:hover { color: var(--text); background: var(--surface-2); }
    }

    .topbar-title { font-size: 1rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .topbar-chip { font-size: 0.72rem; font-weight: 700; color: var(--cobalt); background: var(--cobalt-dim); padding: 3px 8px; border-radius: 6px; }

    .topbar-spacer { flex: 1; }

    .lang-pill {
      display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 14px;
      background: var(--surface-2); border: 1px solid var(--border); cursor: pointer;
      font-size: 0.75rem; font-weight: 700; color: var(--text);
      transition: transform 0.15s ease, background-color 0.15s ease;
      &:active { transform: scale(0.94); }
      &:hover { background: var(--surface-hover); }
    }
    .lang-flag { font-size: 0.9rem; }
    .lang-code { letter-spacing: 0.05em; font-family: var(--font-mono); }

    /* Notif Bell */
    .notif-wrap { position: relative; }
    .notif-btn {
      border-radius: var(--r-sm); border: none; position: relative;
      background: transparent; color: var(--muted); cursor: pointer;
      font-size: 1.15rem; transition: all 0.14s ease;
      &:hover { color: var(--cobalt); background: var(--surface-2); }
    }
    .notif-dot {
      position: absolute; top: 10px; right: 12px; width: 7px; height: 7px; border-radius: 50%;
      background: var(--cobalt); border: 2px solid var(--surface);
    }
    .notif-backdrop { position: fixed; inset: 0; z-index: 1010; }
    .notif-popover {
      position: absolute; top: calc(100% + 10px); right: -10px; width: 300px;
      background: var(--surface); border: 1px solid var(--border-strong);
      padding: 14px; border-radius: 16px; box-shadow: var(--shadow-lg); z-index: 1020;
      animation: fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .notif-pop-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .notif-pop-title { font-size: 0.88rem; font-weight: 700; color: var(--text); }
    .notif-pop-list { display: flex; flex-direction: column; gap: 8px; }
    .notif-item { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid var(--border); &:last-child { border: none; } }
    .notif-ico-box {
      width: 28px; height: 28px; border-radius: 50%; background: var(--green-dim); color: var(--green);
      display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;
      &.cobalt-ico { background: var(--cobalt-dim); color: var(--cobalt); }
    }
    .notif-item-content { display: flex; flex-direction: column; gap: 2px; }
    .notif-item-title { font-size: 0.78rem; font-weight: 700; color: var(--text); }
    .notif-item-desc { font-size: 0.7rem; color: var(--subtle); line-height: 1.3; }

    .logout-top-btn {
      background: none; border: none; color: var(--muted); cursor: pointer;
      font-size: 1.15rem; border-radius: var(--r-sm);
      display: flex; align-items: center; justify-content: center; transition: all 0.14s ease;
      &:hover { color: var(--red); background: var(--red-dim); }
    }

    .shell-main { flex: 1; overflow-y: auto; background: var(--bg); position: relative; }

    .mobile-backdrop { display: none; }
    .mobile-bottom-bar { display: none; }

    /* ── Mobile Layout (<768px) ── */
    @media (max-width: 768px) {
      .topbar { height: 48px; padding: 0 10px; gap: 6px; }
      .topbar-title { font-size: 0.9rem; }
      .logout-top-btn { display: none; }

      .sidebar {
        position: fixed; top: 0; bottom: 0; left: 0; width: 260px !important; z-index: 1050;
        transform: translateX(-100%); box-shadow: var(--shadow-lg);
      }
      .sidebar.mobile-open { transform: translateX(0) !important; }
      
      .sidebar.collapsed .brand-meta,
      .sidebar.collapsed .nav-label,
      .sidebar.collapsed .user-info { display: flex !important; }
      
      .mobile-close-btn { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; }
      .mobile-backdrop {
        display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1040; animation: fadeIn 0.18s ease both;
      }

      .shell-main { padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }

      .mobile-bottom-bar {
        display: flex; position: fixed;
        bottom: calc(10px + env(safe-area-inset-bottom, 0px));
        left: 12px; right: 12px; height: 58px;
        border-radius: 26px;
        z-index: 1020; justify-content: space-around; align-items: center; padding: 0 4px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0,0,0,0.06);
      }

      .mbar-item {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
        color: var(--subtle); font-size: 0.65rem; font-weight: 500; text-decoration: none;
        transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        -webkit-tap-highlight-color: transparent;

        .mbar-icon-wrap {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 24px; border-radius: 12px;
          transition: all 0.15s ease;
          i { font-size: 1.25rem; }
        }

        &.active {
          color: var(--cobalt); font-weight: 600;
          .mbar-icon-wrap {
            color: var(--cobalt);
            transform: translateY(-1px);
          }
        }

        &:active { transform: scale(0.92); }
      }

      .mbar-center {
        flex: 0 0 52px;
        .mbar-action-pill {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--cobalt);
          color: #FFF;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
          box-shadow: 0 4px 14px rgba(0, 122, 255, 0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        &:active .mbar-action-pill {
          transform: scale(0.92);
        }
      }
    }
  `],
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthStore);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly showNotifs = signal(false);

  ngOnInit() {
    if (localStorage.getItem('sidebar-collapsed') === 'true') this.collapsed.set(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.applyTheme(true);
    } else {
      this.applyTheme(false);
    }
  }

  private applyTheme(isDark: boolean) {
    if (isDark) {
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
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.mobileOpen.update(v => !v);
    } else {
      this.collapsed.update(v => !v);
      localStorage.setItem('sidebar-collapsed', String(this.collapsed()));
    }
  }

  closeMobileMenu() {
    this.mobileOpen.set(false);
  }

  toggleLang() {
    this.i18n.toggle();
  }

  toggleNotifPopover() {
    this.showNotifs.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
