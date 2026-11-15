import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('driver portrait hover fade', () => {
  it('crossfades the hover gradient instead of switching it abruptly', () => {
    const css = readFileSync('src/styles/layout.css', 'utf8');
    expect(css).toMatch(/\.driver-fade::after\s*\{[^}]*opacity:\s*0;\s*transition:\s*opacity/s);
    expect(css).toMatch(/\.driver-card:hover\s+\.driver-fade::after\s*\{\s*opacity:\s*1/);
    expect(css).not.toMatch(/\.driver-card:hover\s+\.driver-fade\s*\{/);
  });
});
