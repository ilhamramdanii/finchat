export function niceMax(v: number): number {
  if (v <= 0) return 3_000_000;
  const units = [1e6, 5e5, 2e5, 1e5, 5e4, 1e4];
  for (const u of units) {
    const r = Math.ceil(v / u) * u;
    if (r >= v) return r;
  }
  return Math.ceil(v / 1000) * 1000;
}

export function fmtY(v: number): string {
  if (v === 0) return '0';
  if (v >= 1_000_000) {
    const jt = v / 1_000_000;
    return `${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
  }
  return `${Math.round(v / 1000)}rb`;
}

export function catmullRom(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}
