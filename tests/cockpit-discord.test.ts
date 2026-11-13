import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Discord link in private cockpit controls', () => {
  it.each(['private-cockpit.html', 'replay-cockpit.html'])('keeps the Discord button alongside player controls in %s', name => {
    const html = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
    const actions = html.match(/<div class="wplayer-actions-main" id="stageActions">([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect(actions).toContain('id="reloadFeedBtn"');
    expect(actions).toContain('id="backStreamsBtn"');
    expect(actions).toContain('href="https://discord.gg/KYXHCAzhN4"');
    expect(actions).toContain('target="_blank"');
    expect(actions).toContain('rel="noopener noreferrer"');
    expect(actions).toContain('aria-label="Join FreeF1 on Discord"');
    expect(actions).toContain('<span>Discord</span>');
  });
  it('keeps replay controls scrollable without bringing back the Open player button', () => {
    const html = readFileSync(new URL('../replay-cockpit.html', import.meta.url), 'utf8');
    expect(html).toContain('overflow-y: auto');
    expect(html).not.toMatch(/>\s*Open player\s*</i);
  });
});

describe('replay cockpit session rail', () => {
  it('places session and feed controls in a responsive right-hand rail', () => {
    const html = readFileSync(new URL('../replay-cockpit.html', import.meta.url), 'utf8');
    expect(html).toMatch(/<aside class="replay-rail"[\s\S]*id="replayControls"[\s\S]*<\/aside>/);
    expect(html).toContain('grid-template-columns: minmax(0, 1fr) 300px');
    expect(html).toContain('@media (max-width: 1000px)');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(html).toContain('overflow-y: auto');
  });
});
