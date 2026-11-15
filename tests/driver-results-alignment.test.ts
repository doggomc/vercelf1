import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('matches the reference results table, with aligned flags and right-aligned numbers', () => {
  const css = readFileSync('src/styles/layout.css', 'utf8');
  expect(css).toMatch(/body\[data-page="driver"\] \.dp-table th\s*\{[^}]*text-transform:\s*none/s);
  expect(css).toMatch(/body\[data-page="driver"\] \.dp-table \.t-num\s*\{\s*text-align:\s*right/);
  expect(css).toMatch(/body\[data-page="driver"\] \.dp-gp\s*\{[^}]*justify-content:\s*flex-start/s);
  expect(css).toMatch(/body\[data-page="driver"\] \.dp-gp \.flag\s*\{\s*width:\s*20px/);
});
