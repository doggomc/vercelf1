import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('places the session countdown in player chrome, outside the video stage', () => {
  const html = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
  const bar = html.slice(html.indexOf('<div class="wplayer-bar">'), html.indexOf('<div class="wplayer-stage">'));
  expect(bar).toContain('id="watchSessionCountdown"');
  expect(html.match(/id="watchSessionCountdown"/g)).toHaveLength(1);
  expect(html).not.toContain('id="watchSessionSep"');
});
