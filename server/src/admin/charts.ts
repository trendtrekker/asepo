/**
 * Inline SVG chart rendering — no client-side JS charting library, no new
 * dependency. Matches the rest of the admin dashboard's philosophy (plain
 * server-rendered HTML, zero build step). Every function returns a raw SVG
 * string embedded straight into a page() body.
 */

import { escapeHtml } from './layout.js';

const NAVY = '#1B2C43';
const ACCENT = '#C2410C';
const MUTED = '#6B7280';
const LINE = '#E2DCD3';

export const DONUT_PALETTE = ['#C2410C', '#1B2C43', '#E8A87C', '#8593A8', '#D97757', '#3A4A63', '#B9B2A6'];

export function barChart(data: { label: string; value: number }[], opts: { width?: number; height?: number } = {}): string {
  const w = opts.width ?? 640;
  const h = opts.height ?? 220;
  const padLeft = 34, padBottom = 28, padTop = 10, padRight = 8;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = chartW / data.length;
  const barGap = barW * 0.32;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = padTop + chartH * (1 - f);
    return `<line x1="${padLeft}" y1="${y}" x2="${w - padRight}" y2="${y}" stroke="${LINE}" stroke-width="1" />
      <text x="${padLeft - 8}" y="${y + 4}" font-size="10" fill="${MUTED}" text-anchor="end" font-family="Calibri,Arial,sans-serif">${Math.round(max * f)}</text>`;
  }).join('');

  const bars = data.map((d, i) => {
    const barH = max === 0 ? 0 : (d.value / max) * chartH;
    const x = padLeft + i * barW + barGap / 2;
    const y = padTop + chartH - barH;
    const bw = barW - barGap;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" fill="${ACCENT}">
      <title>${escapeHtml(d.label)}: ${d.value}</title>
    </rect>
    ${i % Math.ceil(data.length / 10 || 1) === 0 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 8}" font-size="10" fill="${MUTED}" text-anchor="middle" font-family="Calibri,Arial,sans-serif">${escapeHtml(d.label)}</text>` : ''}`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">${gridLines}${bars}</svg>`;
}

export function donutChart(
  data: { label: string; value: number }[],
  opts: { size?: number; colors?: string[] } = {}
): string {
  const size = opts.size ?? 180;
  const colors = opts.colors ?? DONUT_PALETTE;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 4, inner = r * 0.6;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const startAngle = angle;
    const endAngle = angle + frac * Math.PI * 2;
    angle = endAngle;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + inner * Math.cos(endAngle), iy1 = cy + inner * Math.sin(endAngle);
    const ix2 = cx + inner * Math.cos(startAngle), iy2 = cy + inner * Math.sin(startAngle);
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z`;
    const color = colors[i % colors.length];
    return `<path d="${path}" fill="${color}"><title>${escapeHtml(d.label)}: ${d.value}</title></path>`;
  }).join('');

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${slices}</svg>`;
}

/** Small up/down/flat trend badge, e.g. "▲ 12%" in green or "▼ 4%" in red. */
export function trendBadge(pct: number | null): string {
  if (pct === null) return '';
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const color = flat ? MUTED : up ? '#166534' : '#991B1B';
  const bg = flat ? '#F1EFEA' : up ? '#DCFCE7' : '#FEE2E2';
  const arrow = flat ? '→' : up ? '↗' : '↘';
  return `<span class="trend" style="color:${color}; background:${bg}">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
}

export { NAVY, ACCENT, MUTED, LINE };
