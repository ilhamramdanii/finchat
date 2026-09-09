import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { NotificationStore } from '../../store/notification.store';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">

      <!-- ── Sidebar ── -->
      <aside class="sidebar" [class.collapsed]="collapsed()">

        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="brand-mark">
            <span class="brand-mono">WA</span>
          </div>
          @if (!collapsed()) {
            <div class="brand-text">
              <span class="brand-name">WA Finance</span>
              <span class="brand-tag">Personal Tracker</span>
            </div>
          }
        </div>

        <!-- Nav -->
        <nav class="sidebar-nav">

          <!-- Dashboard -->
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"
            (mouseenter)="showTip($event, 'Dashboard')" (mouseleave)="hideTip()">
            <span class="nav-icon"><i class="bi bi-house-fill"></i></span>
            @if (!collapsed()) { <span class="nav-label">Dashboard</span> }
          </a>

          <!-- Transaksi -->
          <a class="nav-item" routerLink="/transactions" routerLinkActive="active"
            (mouseenter)="showTip($event, 'Transaksi')" (mouseleave)="hideTip()">
            <span class="nav-icon"><i class="bi bi-arrow-left-right"></i></span>
            @if (!collapsed()) { <span class="nav-label">Transaksi</span> }
          </a>

          <!-- Laporan + sub-menu -->
          <div class="nav-group">
            <a class="nav-item" routerLink="/reports" routerLinkActive="active"
              [routerLinkActiveOptions]="{exact: false}"
              (mouseenter)="showTip($event, 'Laporan')" (mouseleave)="hideTip()">
              <span class="nav-icon"><i class="bi bi-bar-chart-fill"></i></span>
              @if (!collapsed()) {
                <span class="nav-label">Laporan</span>
                @if (isOnReports()) {
                  <i class="bi bi-chevron-down nav-chevron"></i>
                } @else {
                  <i class="bi bi-chevron-right nav-chevron"></i>
                }
              }
            </a>

            <!-- Sub-menu: always visible when on /reports -->
            @if (isOnReports()) {
              <div class="sub-nav">
                <a class="sub-item" routerLink="/reports" [queryParams]="{tab:'overview'}"
                  [class.active]="currentTab()==='overview'"
                  (mouseenter)="showTip($event, 'Ringkasan')" (mouseleave)="hideTip()">
                  <span class="sub-icon"><i class="bi bi-grid-1x2"></i></span>
                  @if (!collapsed()) { Ringkasan }
                </a>
                <a class="sub-item" routerLink="/reports" [queryParams]="{tab:'daily'}"
                  [class.active]="currentTab()==='daily'"
                  (mouseenter)="showTip($event, 'Harian')" (mouseleave)="hideTip()">
                  <span class="sub-icon"><i class="bi bi-bar-chart"></i></span>
                  @if (!collapsed()) { Harian }
                </a>
                <a class="sub-item" routerLink="/reports" [queryParams]="{tab:'calendar'}"
                  [class.active]="currentTab()==='calendar'"
                  (mouseenter)="showTip($event, 'Kalender')" (mouseleave)="hideTip()">
                  <span class="sub-icon"><i class="bi bi-calendar3"></i></span>
                  @if (!collapsed()) { Kalender }
                </a>
                <a class="sub-item" routerLink="/reports" [queryParams]="{tab:'insights'}"
                  [class.active]="currentTab()==='insights'"
                  (mouseenter)="showTip($event, 'Insights')" (mouseleave)="hideTip()">
                  <span class="sub-icon"><i class="bi bi-lightbulb"></i></span>
                  @if (!collapsed()) { Insights }
                </a>
              </div>
            }
          </div>

        </nav>

        <!-- Footer -->
        <div class="sidebar-footer" [class.footer-col]="collapsed()">
          <div class="user-row" [class.row-center]="collapsed()">
            <div class="user-avatar">
              {{ auth.user()?.name ? auth.user()!.name![0].toUpperCase() : 'U' }}
            </div>
            @if (!collapsed()) {
              <div class="user-meta">
                <span class="user-name">{{ auth.user()?.name ?? 'Pengguna' }}</span>
                <span class="user-phone">{{ auth.user()?.phone }}</span>
              </div>
            }
          </div>
          <button class="logout-btn" (click)="logout()" title="Keluar">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>

      <!-- ── Content ── -->
      <div class="content-wrap">
        <div class="g-topbar">
          <button class="toggle-btn" (click)="toggleSidebar()">
            <i class="bi bi-list"></i>
          </button>
          <div class="g-spacer"></div>

          <!-- Notification -->
          <div class="notif-wrap">
            <button class="notif-btn" (click)="toggleNotif()" title="Notifikasi">
              <i class="bi bi-bell-fill"></i>
              @if (notifStore.unreadCount() > 0) {
                <span class="notif-dot">
                  @if (notifStore.unreadCount() < 10) { {{ notifStore.unreadCount() }} }
                </span>
              }
            </button>
            @if (notifOpen()) {
              <div class="notif-backdrop" (click)="notifOpen.set(false)"></div>
              <div class="notif-panel">
                <div class="notif-hdr">
                  <span class="notif-hdr-title">Notifikasi</span>
                  <div class="notif-hdr-actions">
                    @if (notifStore.notifications().length > 0) {
                      <span class="notif-clear" (click)="notifStore.clear()">Hapus semua</span>
                    }
                  </div>
                </div>
                @if (notifStore.notifications().length === 0) {
                  <div class="notif-empty">
                    <i class="bi bi-bell-slash"></i>
                    <p>Belum ada notifikasi</p>
                  </div>
                } @else {
                  <div class="notif-list">
                    @for (n of notifStore.notifications(); track n.id) {
                      <div class="notif-item" [class.unread]="!n.read" [class.notif-success]="n.type==='success'" [class.notif-error]="n.type==='error'" [class.notif-info]="n.type==='info'">
                        <span class="notif-icon">
                          @if (n.type === 'success') { <i class="bi bi-check-circle-fill"></i> }
                          @else if (n.type === 'error') { <i class="bi bi-x-circle-fill"></i> }
                          @else { <i class="bi bi-info-circle-fill"></i> }
                        </span>
                        <div class="notif-body">
                          <span class="notif-msg">{{ n.message }}</span>
                          <span class="notif-time">{{ relativeTime(n.time) }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <button class="theme-btn" (click)="toggleDark()">
            @if (dark()) { <i class="bi bi-sun-fill"></i> }
            @else         { <i class="bi bi-moon-stars-fill"></i> }
          </button>
        </div>
        <main class="shell-main">
          <router-outlet />
        </main>
      </div>

      <!-- ── Nav tooltip (fixed, outside sidebar overflow) ── -->
      @if (tip(); as t) {
        <div class="nav-tip" [style.top.px]="t.top" [style.left.px]="t.left">
          {{ t.label }}
        </div>
      }

    </div>
  `,
  styles: [`
    .shell { display:flex; height:100vh; overflow:hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width:230px; flex-shrink:0;
      background:var(--surface);
      border-right:1px solid var(--border);
      display:flex; flex-direction:column;
      overflow:hidden;
      transition:width 0.24s cubic-bezier(0.4,0,0.2,1);
      position:relative; z-index:20;
    }
    .sidebar.collapsed { width:58px; }

    /* Brand */
    .sidebar-brand {
      display:flex; align-items:center; gap:11px;
      padding:20px 16px 18px;
      min-height:68px; overflow:hidden;
      border-bottom:1px solid var(--border);
    }
    .brand-mark {
      width:36px; height:36px; flex-shrink:0;
      background:linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%);
      border-radius:10px;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(45,212,191,0.28);
    }
    .brand-mono { font-size:0.72rem; font-weight:900; color:#0D0F12; letter-spacing:-0.04em; font-family:var(--font-mono); }
    .brand-text { display:flex; flex-direction:column; line-height:1; white-space:nowrap; }
    .brand-name { font-size:0.9rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; }
    .brand-tag  { font-size:0.58rem; color:var(--subtle); margin-top:3px; font-weight:500; letter-spacing:0.04em; text-transform:uppercase; }

    /* Nav */
    .sidebar-nav {
      flex:1; padding:12px 10px 8px;
      display:flex; flex-direction:column; gap:2px;
      overflow-y:auto; overflow-x:hidden;
    }

    .nav-group { display:flex; flex-direction:column; }

    .nav-item {
      display:flex; align-items:center; gap:10px;
      padding:10px 12px; border-radius:10px;
      color:var(--muted); font-size:0.84rem; font-weight:500;
      transition:background 0.14s, color 0.14s, box-shadow 0.14s;
      cursor:pointer; white-space:nowrap; overflow:hidden;
      text-decoration:none; position:relative;
      &:hover { background:var(--bg); color:var(--text); }
      &.active {
        background:transparent; color:var(--emerald); font-weight:700;
        box-shadow:inset 2px 0 0 var(--emerald);
      }
    }
    .collapsed .nav-item {
      justify-content:center; padding:10px;
      &.active { box-shadow:none; background:var(--emerald-dim); }
    }
    .nav-icon    { width:18px; text-align:center; font-size:0.95rem; flex-shrink:0; }
    .nav-label   { flex:1; }
    .nav-chevron { font-size:0.6rem; color:var(--subtle); flex-shrink:0; }

    /* Sub-menu */
    .sub-nav {
      display:flex; flex-direction:column; gap:1px;
      padding:2px 0 4px; overflow:hidden;
      animation:subIn 0.18s ease both;
    }
    @keyframes subIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }

    .sub-item {
      display:flex; align-items:center; gap:9px;
      padding:7px 12px 7px 34px;
      border-radius:8px;
      color:var(--muted); font-size:0.8rem; font-weight:500;
      transition:all 0.14s; cursor:pointer; text-decoration:none;
      white-space:nowrap; overflow:hidden;
      &:hover { background:var(--bg); color:var(--text); }
      &.active { color:var(--emerald); font-weight:700; background:var(--emerald-dim); }
    }
    .sub-icon { width:14px; text-align:center; font-size:0.8rem; flex-shrink:0; }
    .collapsed .sub-item {
      justify-content:center; padding:7px 10px;
    }

    /* Footer */
    .sidebar-footer {
      padding:12px 10px; border-top:1px solid var(--border);
      display:flex; align-items:center; gap:6px; overflow:hidden;
    }
    .footer-col { flex-direction:column; padding:8px 6px; gap:6px; }
    .user-row   { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
    .row-center { justify-content:center; }
    .user-avatar {
      width:32px; height:32px; flex-shrink:0;
      background:linear-gradient(135deg, #10B981, #059669);
      border-radius:9px;
      display:flex; align-items:center; justify-content:center;
      font-size:0.72rem; font-weight:800; color:white;
    }
    .user-meta  { display:flex; flex-direction:column; min-width:0; overflow:hidden; }
    .user-name  { font-size:0.76rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .user-phone { font-size:0.6rem; color:var(--subtle); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .logout-btn {
      width:30px; height:30px; flex-shrink:0; border-radius:8px;
      background:none; border:none; color:var(--subtle); font-size:0.85rem;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all 0.14s;
      &:hover { background:var(--red-dim); color:var(--red); }
    }
    .footer-col .logout-btn { width:100%; border-radius:7px; }

    /* ── Content ── */
    .content-wrap { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
    .g-topbar {
      height:48px; flex-shrink:0;
      background:var(--surface); border-bottom:1px solid var(--border);
      display:flex; align-items:center; padding:0 20px; gap:8px;
    }
    .toggle-btn {
      width:32px; height:32px; background:none; border:1px solid var(--border);
      border-radius:8px; color:var(--muted); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:1rem; transition:all 0.14s; flex-shrink:0;
      &:hover { background:var(--bg); color:var(--text); }
    }
    .g-spacer { flex:1; }
    .theme-btn {
      width:32px; height:32px; background:none; border:none;
      border-radius:8px; color:var(--muted); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:0.88rem; transition:all 0.14s; flex-shrink:0;
      &:hover { background:var(--emerald-dim); color:var(--emerald); }
    }

    /* ── Notification ── */
    .notif-wrap { position:relative; flex-shrink:0; }
    .notif-btn {
      width:32px; height:32px; background:none; border:none;
      border-radius:8px; color:var(--muted); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:0.88rem; transition:all 0.14s; position:relative;
      &:hover { background:var(--bg); color:var(--text); }
    }
    .notif-dot {
      position:absolute; top:4px; right:4px;
      min-width:16px; height:16px; border-radius:8px;
      background:#EF4444; border:1.5px solid var(--surface);
      pointer-events:none;
      font-size:0.55rem; font-weight:800; color:#fff;
      display:flex; align-items:center; justify-content:center;
      padding:0 3px;
    }
    .notif-backdrop {
      position:fixed; inset:0; z-index:98;
    }
    .notif-panel {
      position:absolute; top:calc(100% + 10px); right:0;
      width:320px; z-index:99;
      background:var(--surface); border:1px solid var(--border);
      border-radius:16px; overflow:hidden;
      box-shadow:0 8px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06);
      animation:notifIn 0.18s cubic-bezier(0.4,0,0.2,1) both;
    }
    @keyframes notifIn {
      from { opacity:0; transform:translateY(-6px) scale(0.97); }
      to   { opacity:1; transform:none; }
    }
    .notif-hdr {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px 12px; border-bottom:1px solid var(--border);
    }
    .notif-hdr-title { font-size:0.9rem; font-weight:700; color:var(--text); }
    .notif-hdr-actions { display:flex; align-items:center; gap:10px; }
    .notif-clear {
      font-size:0.72rem; font-weight:600; color:var(--red); cursor:pointer;
      &:hover { opacity:0.7; }
    }
    .notif-empty {
      padding:36px 20px; display:flex; flex-direction:column;
      align-items:center; gap:8px; color:var(--subtle); text-align:center;
      i { font-size:1.8rem; }
      p { font-size:0.78rem; line-height:1.5; }
    }
    .notif-list {
      max-height:360px; overflow-y:auto;
    }
    .notif-item {
      display:flex; align-items:flex-start; gap:10px;
      padding:12px 16px; border-bottom:1px solid var(--border);
      transition:background 0.12s;
      &:last-child { border-bottom:none; }
      &.unread { background:rgba(45,212,191,0.04); }
    }
    .notif-icon {
      font-size:1rem; flex-shrink:0; margin-top:1px;
    }
    .notif-success .notif-icon { color:#10B981; }
    .notif-error   .notif-icon { color:#EF4444; }
    .notif-info    .notif-icon { color:#3B82F6; }
    .notif-body { display:flex; flex-direction:column; gap:3px; min-width:0; }
    .notif-msg  { font-size:0.8rem; font-weight:500; color:var(--text); line-height:1.4; }
    .notif-time { font-size:0.68rem; color:var(--subtle); }

    .shell-main { flex:1; overflow-y:auto; overflow-x:hidden; background:var(--bg); }

    /* ── Nav tooltip ── */
    .nav-tip {
      position:fixed; z-index:200;
      transform:translateY(-50%);
      background:#1E293B; color:#fff;
      font-size:0.76rem; font-weight:600;
      padding:5px 11px; border-radius:8px;
      white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 16px rgba(0,0,0,0.18);
      animation:tipIn 0.12s ease both;
    }
    @keyframes tipIn {
      from { opacity:0; transform:translateY(-50%) translateX(-4px); }
      to   { opacity:1; transform:translateY(-50%) translateX(0); }
    }

    /* Dark mode overrides */
    body.dark .sidebar .nav-item.active {
      background:transparent !important; color:var(--emerald) !important;
      box-shadow:inset 2px 0 0 var(--emerald) !important;
    }
    body.dark .collapsed .sidebar .nav-item.active {
      background:var(--emerald-dim) !important; box-shadow:none !important;
    }
  `],
})
export class ShellComponent implements OnInit {
  readonly auth       = inject(AuthStore);
  readonly notifStore = inject(NotificationStore);
  private readonly router = inject(Router);

  readonly collapsed   = signal(false);
  readonly dark        = signal(false);
  readonly notifOpen   = signal(false);
  readonly tip         = signal<{ label: string; top: number; left: number } | null>(null);
  private readonly url = signal('');

  ngOnInit() {
    if (localStorage.getItem('sidebar-collapsed') === 'true') this.collapsed.set(true);
    if (localStorage.getItem('dark-mode') === 'true') {
      this.dark.set(true);
      document.body.classList.add('dark');
    }
    this.url.set(this.router.url);
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) this.url.set(e.urlAfterRedirects);
    });
  }

  isOnReports(): boolean {
    return this.url().startsWith('/reports');
  }

  currentTab(): string {
    const m = this.url().match(/[?&]tab=([^&]+)/);
    return m ? m[1] : 'overview';
  }

  showTip(e: MouseEvent, label: string) {
    if (!this.collapsed()) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.tip.set({ label, top: rect.top + rect.height / 2, left: 66 });
  }

  hideTip() { this.tip.set(null); }

  toggleSidebar() {
    this.tip.set(null);
    this.collapsed.update(v => !v);
    localStorage.setItem('sidebar-collapsed', String(this.collapsed()));
  }

  toggleNotif() {
    this.notifOpen.update(v => !v);
    if (this.notifOpen()) this.notifStore.markAllRead();
  }

  relativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  toggleDark() {
    this.dark.update(v => !v);
    document.body.classList.toggle('dark', this.dark());
    localStorage.setItem('dark-mode', String(this.dark()));
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
