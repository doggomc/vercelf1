import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
describe('cockpit briefing and navigation', () => {
  it('keeps the session panel free of the extra standby card and status copy', () => {
    expect(page).not.toContain('id="standbyDetails"');
    expect(page).not.toContain('id="standbyInfo"');
    expect(page).not.toContain('cockpit-controls-label');
    expect(page).toContain('id="watchSessionState"');
    expect(page).toContain('id="stageActions"');
  });
  it('uses matching pills and the selected livery colour for pressed controls', () => {
    expect(styles).toContain('height:36px; min-height:36px; padding:0 14px; border-radius:999px;');
    expect(styles).toContain('.wplayer-actions-main .btn[aria-pressed="true"]');
    expect(styles).toContain('background:var(--team, #e10600); border-color:var(--team, #e10600)');
    expect(styles).toContain('color:var(--team-ink, #fff)');
  });
  it('places three separate Others links after Discord', () => {
    const area=page.slice(page.indexOf('Live chat on Discord'),page.indexOf('</aside>',page.indexOf('Live chat on Discord')));
    expect(area).toContain('id="sideOthersTitle">Others');
    for(const href of ['/motorsports','/replays','/other-streams']) expect(area).toContain(`href="${href}"`);
  });
});
