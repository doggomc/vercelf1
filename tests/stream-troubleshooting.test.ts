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
    expect(help).toContain('https://brave.com/download/');
    expect(help).toContain('HOW TO NOT REMOVE THEM');
    expect(help).toContain('DO NOT OPEN IT AND GO TO OUR WEBSITE');
  });
});

it('smoothly scrolls help-page links while respecting reduced motion', () => {
  const css = readFileSync(new URL('../src/styles/help.css', import.meta.url), 'utf8');
  expect(css).toMatch(/html\s*\{\s*scroll-behavior:\s*smooth/);
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?html\s*\{\s*scroll-behavior:\s*auto/);
});

it('keeps native disclosure controls and respects reduced motion when animating', () => {
  const animation = readFileSync(new URL('../src/features/help-accordions.ts', import.meta.url), 'utf8');
  expect(animation).toContain("prefers-reduced-motion: reduce");
  expect(animation).toContain('details.animate');
  expect(animation).toContain('details.open = targetOpen');
  expect(help).toContain('<details open>');
  expect(help).toContain('class="diagnostics-details"');
});
