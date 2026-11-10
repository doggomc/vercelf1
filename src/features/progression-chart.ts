import '../styles/progression.css';
import type { Progression, Series } from './standings-progression';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'} as Record<string,string>)[char]);

export function chartMarkup(rounds: number[], series: Series[], title: string): string {
  const max = Math.max(0, ...series.flatMap(s => s.values));
  const step = max <= 50 ? 10 : max <= 100 ? 20 : max <= 250 ? 50 : max <= 800 ? 100 : 200;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const x = (i: number) => rounds.length === 1 ? 345 : 40 + i * 610 / (rounds.length - 1);
  const y = (v: number) => 270 - v / top * 256;
  const grid = Array.from({length: top / step + 1}, (_,i) => { const v=i*step, at=y(v); return `<g><line x1="40" x2="650" y1="${at}" y2="${at}" stroke="rgba(255,255,255,.07)"/><text x="32" y="${at+4}" text-anchor="end" font-size="11" fill="#9298a6">${v}</text></g>`; }).join('');
  const stride = Math.max(1, Math.ceil(rounds.length / 10));
  const ticks = rounds.map((r,i) => i % stride === 0 || i === rounds.length-1 ? `<text x="${x(i)}" y="292" text-anchor="middle" font-size="11" fill="#9298a6">R${r}</text>` : '').join('');
  const lines = series.map(s => { const points=s.values.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '); const last=y(s.values[s.values.length-1]); return `<g><title>${esc(s.name)}: ${s.values[s.values.length-1]} points</title><polyline points="${points}" fill="none" stroke="${esc(s.color)}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" ${s.dashed?'stroke-dasharray="6 5"':''}/><circle cx="${x(rounds.length-1)}" cy="${last}" r="3.5" fill="${esc(s.color)}"/><text x="${x(rounds.length-1)+8}" y="${last+4}" font-size="12" font-weight="700" fill="#f5f6f8">${esc(s.label)}</text></g>`; }).join('');
  return `<svg viewBox="0 0 720 300" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${grid}${ticks}${lines}</svg>`;
}
export function renderProgression(data: Progression): void {
  for (const type of ['drivers','constructors'] as const) {
    const target=document.getElementById(`${type}Progression`), round=document.getElementById(`${type}ProgressionRound`);
    if (target) target.innerHTML=chartMarkup(data.rounds,data[type],`${type === 'drivers' ? 'Drivers' : 'Constructors'}: points progression`);
    if (round) round.textContent=`After round ${data.rounds[data.rounds.length-1]}`;
  }
}
