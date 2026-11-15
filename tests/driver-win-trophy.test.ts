import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('shows an accessible decorative gold trophy for wins without colouring the number red', () => {
  const source = readFileSync('src/pages/driver.ts', 'utf8');
  const css = readFileSync('src/styles/layout.css', 'utf8');
  expect(source).toMatch(/won \? '<svg class="dp-win-trophy"[^>]*aria-hidden="true"/);
  expect(css).toMatch(/\.dp-finish\.is-win\s*\{\s*color:\s*var\(--white\)/);
  expect(css).toMatch(/\.dp-win-trophy\s*\{[^}]*color:\s*#f5c84c/s);
});
