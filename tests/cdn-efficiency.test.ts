import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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
  it('caches content-addressed fonts and clean directory routes', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const cache = (path: string) => config.headers.find((rule: {source: string}) => rule.source === path)?.headers.find((header: {key: string}) => header.key === 'Cache-Control')?.value;
    expect(cache('/font-cache/:path*')).toContain('immutable');
    expect(cache('/schedule')).toContain('max-age=60');
    expect(cache('/grand-prix/:year/:slug/')).toContain('max-age=60');
    expect(cache('/assets/:path*')).toContain('max-age=86400');
  });
});
