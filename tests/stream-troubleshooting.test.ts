import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const help = readFileSync(new URL('../help.html', import.meta.url), 'utf8');
const cockpit = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
describe('stream troubleshooting guide', () => {
  it('links the cockpit to the independently visible help guide', () => {
    expect(cockpit).toContain('href="/help#streams-help"');
    expect(help).toContain('id="streams-help"');
    expect(help.indexOf('id="streams-help"')).toBeLessThan(help.indexOf('id="helpRequestPanel"'));
  });
  it('provides Cloudflare official downloads and realistic playback guidance', () => {
    for (const host of ['1111-releases.cloudflareclient.com/win/latest','1111-releases.cloudflareclient.com/mac/latest','play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone','apps.apple.com/us/app/id1423538627','pkg.cloudflareclient.com']) expect(help).toContain(host);
    expect(help).toContain('7 Mbps'); expect(help).toContain('14 Mbps');
    expect(help).toContain('not guaranteed'); expect(help).toContain('Stripped StreamFree');
    expect(help).toContain('locally stored support-ticket access key');
  });
});
