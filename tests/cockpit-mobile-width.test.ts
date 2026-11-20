import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
describe('cockpit mobile source sizing', () => {
  it('constrains the nested grid and wraps long source names instead of widening the page', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)\s*\{\s*body\[data-page="cockpit"\] \.watch-main\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/body\[data-page="cockpit"\] #watch \.wsource-list > button\.chip,[\s\S]*?max-width:\s*100%;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*anywhere;/);
  });
});
