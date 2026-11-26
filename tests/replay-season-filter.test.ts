import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('replay archive defaults', () => {
  it('defaults to F1 and 2026 with an accessible season selector', () => {
    const page = readFileSync(new URL('../replays.html', import.meta.url), 'utf8');
    const script = readFileSync(new URL('../src/pages/replays.ts', import.meta.url), 'utf8');
    expect(page).toContain('for="seasonFilter"');
    expect(page).toContain('id="seasonFilter"');
    expect(script).toContain("let filter = 'f1'");
    expect(script).toContain('? requestedSeason : 2026');
    expect(script).toContain('weekends.filter(w=>w.season===season)');
  });
});
