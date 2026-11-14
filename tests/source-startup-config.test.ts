import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
describe('source configuration startup and live updates', () => {
  it('does not expose default sources before the config or offline fallback', () => {
    expect(app).toContain('sourceConfigKnown && Boolean(s) && !disabledSourceIds.has(s.id)');
    expect(app).toContain('Checking available sources…');
    expect(app).toMatch(/sourceConfigKnown = true;\s*renderButtons\(\{ quiet: true \}\);\s*void loadCatalogues/);
  });
  it('applies disabled IDs and repaints before lazy source configuration', () => {
    const start = app.indexOf('function applySourceConfig(payload)');
    const end = app.indexOf('function applySiteConfig(', start);
    const block = app.slice(start, end);
    expect(block.indexOf('disabledSourceIds = new Set<string>')).toBeLessThan(block.indexOf('renderButtons({ quiet: true })'));
    expect(block.indexOf('renderButtons({ quiet: true })')).toBeLessThan(block.indexOf('paintAutoSourceConfig('));
  });
});
