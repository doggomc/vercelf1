import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
describe('cockpit briefing and navigation', () => {
  it('keeps standby status in the controls panel without a separate standby card', () => {
    expect(page).not.toContain('id="standbyDetails"');
    expect(page.indexOf('id="standbyInfo"')).toBeGreaterThan(page.indexOf('id="watchSessionState"'));
    expect(page.indexOf('id="standbyInfo"')).toBeLessThan(page.indexOf('id="stageActions"'));
    expect(app).toContain('Refresh this page then to check feeds.');
  });
  it('places three separate Others links after Discord', () => {
    const area=page.slice(page.indexOf('Live chat on Discord'),page.indexOf('</aside>',page.indexOf('Live chat on Discord')));
    expect(area).toContain('id="sideOthersTitle">Others');
    for(const href of ['/motorsports','/replays','/other-streams']) expect(area).toContain(`href="${href}"`);
  });
});
