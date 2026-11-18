import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ROUND_FLAGS } from '../src/pages/schedule-format';

describe('CDN request efficiency', () => {
  it('does not prefetch navigation on hover or pointer down', () => {
    const shell = readFileSync('src/ui/shell.ts', 'utf8');
    expect(shell).not.toMatch(/rel\s*=\s*['"]prefetch['"]/);
    expect(shell).not.toMatch(/addEventListener\(['"]pointerover['"],\s*prefetch/);
    expect(shell).not.toMatch(/addEventListener\(['"]pointerdown['"],\s*prefetch/);
  });
  it('loads the session island as a versioned build chunk, not the unversioned script', () => {
    for (const file of ['src/ui/shell.ts', 'src/help.ts', 'src/404.ts']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain("import('");
      expect(source).not.toContain("'/island.js'");
    }
    expect(readFileSync('vite.config.ts', 'utf8')).toContain("entryFileNames: 'bundles/[name]-[hash].js'");
  });
  it('provides a content-addressed schedule flag atlas for every round', () => {
    const source = readFileSync('src/pages/schedule.ts', 'utf8');
    const path = source.match(/SCHEDULE_FLAG_ATLAS = '(\/assets\/flags\/schedule-flags-[a-f0-9]+\.png)'/)?.[1];
    expect(path && existsSync(`.${path}`)).toBe(true);
    const map = source.match(/FLAG_HEIGHTS: Record<string, number> = \{([^}]+)\}/)?.[1] || '';
    for (const code of ROUND_FLAGS) expect(map).toMatch(new RegExp(`\\b${code}:`));
    expect(source).toContain('loading="lazy"');
  });
  it('loads Weelo metadata from the configured backend rather than the frontend origin', () => {
    const source = readFileSync('src/features/catalogues.ts', 'utf8');
    expect(source).toContain('`${deps.backend}${WEELO_STATE}`');
    expect(readFileSync('src/config.ts', 'utf8')).toContain('https://f1admin.onrender.com');
  });
  it('caches content-addressed fonts and clean directory routes', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const cache = (path: string) => config.headers.find((rule: {source: string}) => rule.source === path)?.headers.find((header: {key: string}) => header.key === 'Cache-Control')?.value;
    expect(cache('/font-cache/:path*')).toContain('immutable');
    expect(cache('/schedule')).toContain('max-age=60');
    expect(cache('/grand-prix/:year/:slug/')).toContain('max-age=60');
    expect(cache('/assets/:path*')).toContain('max-age=86400');
  });
});
