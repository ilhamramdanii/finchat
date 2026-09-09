import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DateRange { start: string; end: string; }

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drp-wrap">
      <button class="rpp-range-btn" (click)="togglePanel()">
        <span class="rpp-range-from">{{ startDate ? fmt(startDate) : 'Mulai' }}</span>
        <i class="bi bi-arrow-right rpp-range-arrow"></i>
        <span class="rpp-range-to">{{ endDate ? fmt(endDate) : 'Selesai' }}</span>
      </button>

      @if (showPanel()) {
        <div class="dp-backdrop" (click)="closePanel()"></div>
        <div class="dp-panel">
          <div class="dp-panel-hdr">
            <div class="dp-from-to">
              <div class="dp-ft-item" [class.dp-ft-active]="phase()==='start'">
                <span class="dp-ft-label">DARI</span>
                <span class="dp-ft-val">{{ startDate ? fmt(startDate) : '—' }}</span>
              </div>
              <i class="bi bi-arrow-right" style="color:rgba(255,255,255,0.4);font-size:0.75rem"></i>
              <div class="dp-ft-item" [class.dp-ft-active]="phase()==='end'">
                <span class="dp-ft-label">SAMPAI</span>
                <span class="dp-ft-val">{{ endDate ? fmt(endDate) : '—' }}</span>
              </div>
            </div>
            <div class="dp-cal-nav">
              <button class="dp-nav-btn" (click)="prev()"><i class="bi bi-chevron-left"></i></button>
              <span class="dp-cal-title">{{ monthName() }}</span>
              <button class="dp-nav-btn" (click)="next()"><i class="bi bi-chevron-right"></i></button>
            </div>
            <div class="dp-dow-row">
              @for (d of DOW; track d) { <span>{{ d }}</span> }
            </div>
          </div>
          <div class="dp-cal-grid">
            @for (cell of cells(); track cell.key) {
              <div class="dp-cell"
                [class.dp-other-month]="cell.otherMonth"
                [class.dp-start]="cell.dateStr === startDate"
                [class.dp-end]="cell.dateStr === endDate"
                [class.dp-in-range]="inRange(cell.dateStr)"
                [class.dp-hover-end]="isHoverEnd(cell.dateStr)"
                (mouseenter)="hover.set(cell.dateStr)"
                (mouseleave)="hover.set(null)"
                (click)="onDayClick(cell.dateStr)">
                <span class="dp-day-num">{{ cell.day }}</span>
              </div>
            }
          </div>
          <div class="dp-footer">
            <button class="dp-footer-reset" (click)="onClear()">Reset</button>
            <span class="dp-night-count">{{ nightCount() }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; position:relative; }
    .drp-wrap { position:relative; }

    .rpp-range-btn {
      height:36px; padding:0 14px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface); color:var(--muted);
      font-size:0.8rem; font-weight:600; font-family:var(--font);
      cursor:pointer; display:flex; align-items:center; gap:8px; white-space:nowrap;
      transition:border-color 0.14s, color 0.14s;
      &:hover { border-color:var(--emerald); color:var(--text); }
    }
    .rpp-range-from, .rpp-range-to { color:var(--text); font-weight:700; }
    .rpp-range-arrow { font-size:0.65rem; color:var(--muted); }

    .dp-backdrop { position:fixed; inset:0; z-index:300; cursor:default; }
    .dp-panel {
      position:absolute; top:44px; right:0; z-index:301;
      width:308px; background:#0D2B1F; border-radius:16px; overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.5); border:1px solid rgba(45,212,191,0.25);
      animation:fadeUp 0.15s ease both;
    }
    @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    .dp-panel-hdr  { padding:14px 14px 0; }
    .dp-from-to    { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
    .dp-ft-item    { flex:1; padding:7px 10px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); }
    .dp-ft-active  { border-color:var(--emerald) !important; background:rgba(45,212,191,0.1) !important; }
    .dp-ft-label   { font-size:0.58rem; font-weight:700; letter-spacing:0.08em; color:rgba(255,255,255,0.4); display:block; margin-bottom:2px; }
    .dp-ft-val     { font-size:0.78rem; font-weight:700; color:#fff; }
    .dp-cal-nav    { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .dp-nav-btn    { width:26px; height:26px; border-radius:7px; border:none; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.7); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.68rem; &:hover { background:rgba(255,255,255,0.14); } }
    .dp-cal-title  { font-size:0.84rem; font-weight:700; color:#fff; }
    .dp-dow-row    { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; padding-bottom:5px; span { font-size:0.58rem; font-weight:600; color:rgba(255,255,255,0.32); } }
    .dp-cal-grid   { display:grid; grid-template-columns:repeat(7,1fr); padding:0 6px 6px; gap:1px; }
    .dp-cell {
      aspect-ratio:1; display:flex; align-items:center; justify-content:center;
      cursor:pointer; border-radius:7px; transition:background 0.1s;
      &.dp-other-month .dp-day-num { opacity:0.22; }
      &.dp-start .dp-day-num, &.dp-end .dp-day-num { background:var(--emerald) !important; color:#0D0F12 !important; }
      &.dp-in-range  { background:rgba(45,212,191,0.12); }
      &.dp-hover-end { background:rgba(45,212,191,0.07); }
      &:hover .dp-day-num { background:rgba(255,255,255,0.1); }
    }
    .dp-day-num    { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.76rem; font-weight:600; color:#fff; transition:background 0.1s; }
    .dp-footer     { display:flex; align-items:center; justify-content:space-between; padding:8px 14px 12px; border-top:1px solid rgba(255,255,255,0.08); }
    .dp-footer-reset { background:none; border:1px solid rgba(255,255,255,0.15); border-radius:7px; color:rgba(255,255,255,0.5); font-size:0.72rem; font-weight:600; padding:4px 10px; cursor:pointer; font-family:var(--font); &:hover { border-color:rgba(255,255,255,0.3); color:#fff; } }
    .dp-night-count  { font-size:0.72rem; font-weight:700; color:var(--emerald); }
  `],
})
export class DateRangePickerComponent implements OnChanges {
  @Input() startDate = '';
  @Input() endDate   = '';
  @Output() rangeChange = new EventEmitter<DateRange>();
  @Output() cleared     = new EventEmitter<void>();

  readonly DOW = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  private readonly MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  readonly showPanel = signal(false);
  readonly month     = signal(new Date().getMonth() + 1);
  readonly year      = signal(new Date().getFullYear());
  readonly hover     = signal<string|null>(null);
  readonly phase     = signal<'start'|'end'>('start');

  ngOnChanges(changes: SimpleChanges) {
    if (changes['startDate']?.currentValue) {
      const d = new Date(changes['startDate'].currentValue + 'T00:00:00');
      this.month.set(d.getMonth() + 1);
      this.year.set(d.getFullYear());
    }
  }

  togglePanel() { this.showPanel.update(v => !v); }
  closePanel()  { this.showPanel.set(false); }

  monthName(): string { return `${this.MONTHS[this.month() - 1]} ${this.year()}`; }

  prev() {
    if (this.month() === 1) { this.month.set(12); this.year.update(y => y - 1); }
    else this.month.update(m => m - 1);
  }

  next() {
    if (this.month() === 12) { this.month.set(1); this.year.update(y => y + 1); }
    else this.month.update(m => m + 1);
  }

  cells(): { key: string; dateStr: string; day: number; otherMonth: boolean }[] {
    const m = this.month(), y = this.year();
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const result: { key: string; dateStr: string; day: number; otherMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d  = new Date(y, m - 1, i - firstDow + 1);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      result.push({ key: ds, dateStr: ds, day: d.getDate(), otherMonth: d.getMonth() !== m - 1 });
    }
    return result;
  }

  onDayClick(dateStr: string) {
    if (this.phase() === 'start') {
      this.phase.set('end');
      this.rangeChange.emit({ start: dateStr, end: '' });
    } else {
      const start = this.startDate;
      const [s, e] = dateStr < start ? [dateStr, start] : [start, dateStr];
      this.phase.set('start');
      this.showPanel.set(false);
      this.rangeChange.emit({ start: s, end: e });
    }
  }

  inRange(ds: string): boolean {
    const s = this.startDate, e = this.endDate;
    return !!s && !!e && ds > s && ds < e;
  }

  isHoverEnd(ds: string): boolean {
    const s = this.startDate, h = this.hover(), e = this.endDate;
    if (!s || e || !h || this.phase() !== 'end') return false;
    return ds > s && ds <= h;
  }

  nightCount(): string {
    const s = this.startDate, e = this.endDate;
    if (!s || !e) return '';
    const diff = Math.ceil((new Date(e + 'T00:00:00').getTime() - new Date(s + 'T00:00:00').getTime()) / 86400000);
    return diff > 0 ? `${diff} hari` : '';
  }

  fmt(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onClear() {
    this.phase.set('start');
    this.cleared.emit();
  }
}
