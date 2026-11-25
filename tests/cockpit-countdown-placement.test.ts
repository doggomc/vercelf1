import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('places the session countdown beneath the standby message inside the player', () => {
  const html = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
  const bar = html.slice(html.indexOf('<div class="wplayer-bar">'), html.indexOf('<div class="wplayer-stage">'));
  const message = html.indexOf('id="noStreamText"');
  const countdown = html.indexOf('id="standbyCountdown"');
  const actions = html.indexOf('id="nsActions"');
  expect(bar).not.toContain('id="watchSessionCountdown"');
  expect(countdown).toBeGreaterThan(message);
  expect(countdown).toBeLessThan(actions);
  expect(html.match(/id="watchSessionCountdown"/g)).toHaveLength(1);
});
