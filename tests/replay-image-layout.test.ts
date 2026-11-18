import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('replay artwork', () => {
  it('fades the featured image and keeps artwork inside a rounded clipping surface', () => {
    const css = readFileSync(new URL('../src/styles/replays.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.rp-feature img\s*\{[^}]*mask-image:\s*linear-gradient\(to right,\s*transparent/);
    expect(css).toMatch(/\.rp-card-heading\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*10px/);
    expect(css).toMatch(/\.rp-circuit\s*\{[^}]*z-index:\s*0/);
    expect(css).toMatch(/\.rp-card-heading::after\s*\{[^}]*z-index:\s*1/);
  });
});
