/* Place cached roster cards in the initial HTML so browsers discover images before API calls.
   The browser replaces them with fresh standings when available; no stale points are shown. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { driverCard } from '../src/lib/driver-card';
import { DRIVER_PORTRAIT } from '../src/data/driver-portraits';
import { PORTRAIT_ALIAS } from '../src/data/portraits';
import { teams, TEAM_CAR, TEAM_LOGO } from '../src/data/teams';
import { slugify } from '../src/data/slugs';
import type { DriverRef, StandingRow } from '../src/pages/driver-core';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function driverMarkup(): string {
  const cached = JSON.parse(readFileSync(resolve(import.meta.dirname, '../benchmarks/driver-grid.json'), 'utf8')) as { drivers: DriverRef[] };
  return cached.drivers.map((driver, index) => {
    const image = DRIVER_PORTRAIT[PORTRAIT_ALIAS[driver.driverId] ?? driver.driverId];
    const team = teams.find(t => 'logo' in t && t.logo === image?.split('/')[0]);
    const row: StandingRow = { Driver: driver, position: '', points: '', wins: '', Constructors: team ? [{ name: team.name, constructorId: team.id }] : [] };
    return driverCard(row, index);
  }).join('');
}

function teamMarkup(): string {
  return teams.filter(t => t.id !== 'default').map((team, index) => {
    const slug = slugify(team.name);
    const logo = 'logo' in team ? team.logo : '';
    const loading = index < 6 ? 'eager' : 'lazy';
    return `<a class="tm-card card card-hover rise" href="/teams/${esc(slug)}/" style="--team:${esc(team.color)};--rise-delay:${Math.min(index, 10) * 35}ms" aria-label="${esc(team.name)}, 2026 constructor">
      <div class="tm-head"><div class="tm-id"><span class="tm-logo-box">${logo ? `<img class="tm-logo" src="${esc(TEAM_LOGO(logo, 96))}" alt="" width="56" height="56" loading="${loading}" decoding="async">` : ''}</span><div><p class="tm-name">${esc(team.name)}</p><p class="tm-meta num">2026 constructor</p></div></div></div>
      ${logo ? `<img class="tm-car" src="${esc(TEAM_CAR(logo, 480))}" alt="${esc(team.name)} 2026 car" width="480" height="106" loading="${loading}" decoding="async">` : ''}<div class="tm-drivers"></div></a>`;
  }).join('');
}

export function gridPrerender(): Plugin {
  return {
    name: 'freef1-roster-prerender',
    transformIndexHtml(html, ctx) {
      if (ctx.path === '/drivers.html') {
        return html.replace('<div class="driver-grid" id="driverGrid" aria-busy="true"></div>', `<div class="driver-grid" id="driverGrid" aria-busy="true">${driverMarkup()}</div>`)
          .replace('Loading the 2026 grid…', 'Showing cached driver list · updating standings…');
      }
      if (ctx.path === '/teams.html') return html.replace('<div class="tm-grid" id="teamList" aria-busy="true"></div>', `<div class="tm-grid" id="teamList" aria-busy="true">${teamMarkup()}</div>`);
      return html;
    },
  };
}
