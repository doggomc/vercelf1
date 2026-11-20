import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
describe('theater mode source labels', () => {
  it('wraps long titles and broadcaster labels inside the theater rail at every width', () => {
    expect(css).toMatch(/body\[data-page="cockpit"\]\.theater #watch \.wsource-list > button\.chip,[\s\S]*?max-width:\s*100%;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*anywhere;/);
    expect(css).toMatch(/body\[data-page="cockpit"\]\.theater #watch \.src-pill-title,[\s\S]*?\.src-pill-sub\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  });
});
