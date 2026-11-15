import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('centres driver result headings, values, and flag/name pairs', () => {
  const css = readFileSync('src/styles/layout.css', 'utf8');
  expect(css).toMatch(/\.dp-table th,\s*\.dp-table td,\s*\.dp-table \.t-num\s*\{\s*text-align:\s*center/);
  expect(css).toMatch(/\.dp-gp\s*\{[^}]*grid-template-columns:\s*20px minmax\(0, 1fr\) 20px/s);
  expect(css).toMatch(/\.dp-gp \.flag\s*\{\s*grid-column:\s*1/);
  expect(css).toMatch(/\.dp-gp > span\s*\{\s*grid-column:\s*2;\s*text-align:\s*center/);
});
