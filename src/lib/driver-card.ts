import { portrait } from '../data/driver-portraits';
import type { StandingRow } from '../pages/driver-core';
import { esc, driverSlug } from './driver-format';
const TEAM_HEX: Record<string, string> = {
  McLaren: '#FF8000', Ferrari: '#DC0000', 'Red Bull': '#1E41FF', Mercedes: '#00D2BE',
  Williams: '#005AFF', 'Aston Martin': '#006F62', Alpine: '#FF0080', Haas: '#B6BABD',
  Audi: '#E62213', 'RB F1 Team': '#6692FF', 'Racing Bulls': '#6692FF', Cadillac: '#B4A07A',
};
import { NATIONALITY_FLAG } from '../data/driver-flags';
import { flagHtml } from '../data/flags';

/* Champion tint: Rerace washes the card in the team's colour from the floor up and
   leaves a faint plate number in the corner. Both are the team colour at low alpha,
   so a livery that flips mid-season flips the card with it. */
export function driverCard(row: StandingRow, index: number): string {
  const driver = row.Driver;
  const team = row.Constructors?.[0]?.name ?? '';
  const color = TEAM_HEX[team] ?? TEAM_HEX[team.replace(/ F1 Team$/, '')] ?? '#7e8188';
  const flag = NATIONALITY_FLAG[driver.nationality ?? ''] ?? '';
  const number = driver.permanentNumber ?? driver.code ?? '';
  const standing = row.position && row.points ? `P${row.position} · ${row.points} pts` : '—';
  const first = driver.givenName.trim();
  const last = driver.familyName.trim();
  const slug = driverSlug(driver);
  const delay = Math.min(index, 9);

  return `<a class="driver-card card card-hover rise" style="--team:${color};--rise-delay:${delay * 40}ms" href="/drivers/${esc(slug)}/" aria-label="${esc(`${first} ${last}`)}, ${esc(team)}, ${esc(standing)}">
      <div class="driver-portrait">
        <span class="driver-plate" aria-hidden="true">${esc(number)}</span>
        <img src="${esc(portrait(driver.driverId, 320))}" alt="${esc(`${first} ${last}`)}" width="320" height="920" loading="${index < 5 ? 'eager' : 'lazy'}" decoding="async">
        <span class="driver-fade" aria-hidden="true"></span>
      </div>
      <div class="driver-body">
        <div class="driver-meta">
          ${flag ? flagHtml(flag) : ''}
          <span class="driver-standing">${esc(standing)}</span>
        </div>
        <p class="driver-name"><span class="driver-first">${esc(first)}</span><span class="driver-last">${esc(last)}</span></p>
        <p class="driver-team"><span class="driver-swatch" aria-hidden="true" style="background:${esc(color)}"></span>${esc(team)}</p>
      </div>
    </a>`;
}

