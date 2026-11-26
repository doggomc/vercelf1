import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
describe('cockpit briefing and navigation', () => {
  it('keeps the session panel free of the extra standby card and status copy', () => {
    expect(page).not.toContain('id="standbyDetails"');
    expect(page).not.toContain('id="standbyInfo"');
    expect(page).not.toContain('cockpit-controls-label');
    expect(page).toContain('id="watchSessionState"');
    expect(page).toContain('id="stageActions"');
  });
  it('places three separate Others links after Discord', () => {
    const area=page.slice(page.indexOf('Live chat on Discord'),page.indexOf('</aside>',page.indexOf('Live chat on Discord')));
    expect(area).toContain('id="sideOthersTitle">Others');
    for(const href of ['/motorsports','/replays','/other-streams']) expect(area).toContain(`href="${href}"`);
  });
});
