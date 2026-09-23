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
        <i class="bi bi-calendar3 rpp-ico"></i>
        <span class="rpp-range-from">{{ startDate ? fmt(startDate) : 'Mulai' }}</span>
        <i class="bi bi-arrow-right rpp-range-arrow"></i>
        <span class="rpp-range-to">{{ endDate ? fmt(endDate) : 'Selesai' }}</span>
      </button>

      @if (showPanel()) {
        <div class="dp-backdrop" (click)="closePanel()"></div>
        <div class="dp-panel apple-card">
          <div class="dp-panel-hdr">
            <div class="dp-from-to">
              <div class="dp-ft-item" [class.dp-ft-active]="phase()==='start'">
                <span class="dp-ft-label">DARI</span>
                <span class="dp-ft-val num">{{ startDate ? fmt(startDate) : '—' }}</span>
              </div>
              <i class="bi bi-arrow-right" style="color:var(--subtle);font-size:0.75rem"></i>
              <div class="dp-ft-item" [class.dp-ft-active]="phase()==='end'">
                <span class="dp-ft-label">SAMPAI</span>
                <span class="dp-ft-val num">{{ endDate ? fmt(endDate) : '—' }}</span>
              </div>
            </div>
            <div class="dp-cal-nav">
              <button class="dp-nav-btn tap-target-44" (click)="prev()"><i class="bi bi-chevron-left"></i></button>
              <span class="dp-cal-title font-display">{{ monthName() }}</span>
              <button class="dp-nav-btn tap-target-44" (click)="next()"><i class="bi bi-chevron-right"></i></button>
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
                <span class="dp-day-num num">{{ cell.day }}</span>
              </div>
            }
          </div>
          <div class="dp-footer">
            <button class="dp-footer-reset" (click)="onClear()">Reset</button>
            <span class="dp-night-count num">{{ nightCount() }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }
    .drp-wrap { position: relative; }

    .rpp-range-btn {
      height: 36px; padding: 0 12px; border-radius: 9px;
      border: 1px solid var(--border); background: var(--surface); color: var(--muted);
      font-size: 0.8rem; font-weight: 600; font-family: var(--font);
      cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;
      transition: all 0.14s ease;
      &:hover { border-color: var(--cobalt); color: var(--text); }
    }
    .rpp-ico { color: var(--cobalt); font-size: 0.85rem; }
    .rpp-range-from, .rpp-range-to { color: var(--text); font-weight: 700; }
    .rpp-range-arrow { font-size: 0.65rem; color: var(--subtle); }

    .dp-backdrop { position: fixed; inset: 0; z-index: 1040; cursor: default; }
    
    .dp-panel {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 1050;
      width: 310px; background: var(--surface); border-radius: 18px; overflow: hidden;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border-strong);
      animation: fadeUp 0.15s ease both;
    }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    
    .dp-panel-hdr  { padding: 14px 14px 0; }
    .dp-from-to    { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .dp-ft-item    { flex: 1; padding: 6px 10px; border-radius: 9px; background: var(--surface-2); border: 1px solid var(--border); }
    .dp-ft-active  { border-color: var(--cobalt) !important; background: var(--cobalt-dim) !important; }
    .dp-ft-label   { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; color: var(--subtle); display: block; margin-bottom: 2px; }
    .dp-ft-val     { font-size: 0.78rem; font-weight: 700; color: var(--text); }
    
    .dp-cal-nav    { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .dp-nav-btn    { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--surface-2); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; &:hover { background: var(--surface-hover); } }
    .dp-cal-title  { font-size: 0.9rem; font-weight: 700; color: var(--text); }
    
    .dp-dow-row    { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; padding-bottom: 6px; span { font-size: 0.64rem; font-weight: 600; color: var(--subtle); } }
    .dp-cal-grid   { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 8px 8px; gap: 2px; }
    
    .dp-cell {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 8px; transition: background 0.1s;
      &.dp-other-month .dp-day-num { opacity: 0.25; }
      &.dp-start .dp-day-num, &.dp-end .dp-day-num { background: var(--cobalt) !important; color: #FFFFFF !important; font-weight: 700; }
      &.dp-in-range  { background: var(--cobalt-dim); }
      &.dp-hover-end { background: var(--cobalt-dim); opacity: 0.8; }
      &:hover .dp-day-num { background: var(--surface-hover); }
    }
    .dp-day-num    { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 600; color: var(--text); transition: background 0.1s; }
    
    .dp-footer     { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 12px; border-top: 1px solid var(--border); }
    .dp-footer-reset { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); font-size: 0.74rem; font-weight: 600; padding: 4px 12px; cursor: pointer; font-family: var(--font); &:hover { border-color: var(--border-strong); color: var(--text); } }
    .dp-night-count  { font-size: 0.74rem; font-weight: 700; color: var(--cobalt); }

    /* Mobile / Small screen adaptation */
    @media (max-width: 640px) {
      .dp-panel {
        position: fixed; top: auto; bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        left: 14px; right: 14px; width: auto; max-width: 340px; margin: 0 auto;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      }
    }
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
