import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
describe('cockpit session playback window', () => {
  it('hides Now playing until a stream is mounted and whenever playback is blocked', () => {
    const html = readFileSync(new URL('../cockpit.html', import.meta.url), 'utf8');
    expect(html).toMatch(/id="nowPlayingCard" hidden/);
    const onScreen = app.slice(app.indexOf('function setStreamOnScreen('), app.indexOf('function setStreamOnScreen(') + 600);
    expect(onScreen).toContain("card.hidden = !on || !stageBox?.querySelector('iframe, video')");
    const noStream = app.slice(app.indexOf('function showNoStream('), app.indexOf('function hideNoStream('));
    expect(noStream).toContain('setStreamOnScreen(false)');
    const load = app.slice(app.indexOf('function load()'), app.indexOf('let streamOverride ='));
    expect(load).toContain('if (card) card.hidden = true;');
  });
  it('gates every ordinary source after the explicit stream override and before loading any provider', () => {
    const load = app.slice(app.indexOf('function load()'), app.indexOf('let streamOverride ='));
    expect(load.indexOf('if (streamOverride.active && streamOverride.url)')).toBeLessThan(load.indexOf('if (!isStreamAvailable(currentSession))'));
    expect(load.indexOf('if (!isStreamAvailable(currentSession))')).toBeLessThan(load.indexOf('if (autoStreamsActive && !sources.some(sourceEnabled))'));
    expect(load).toContain('sessionWindowBlocked = true;');
    expect(load).toContain('showNoStream({ blocked: false });');
  });
  it('reconciles the ordinary player without closing user-opened multiview or pausing discovery', () => {
    const sync = app.slice(app.indexOf('function syncSessionPlaybackWindow()'), app.indexOf('// Background intervals'));
    expect(sync).toContain('streamOverride.active || isStreamAvailable(currentSession)');
    expect(sync).not.toContain('multiViewerControl.show(false)');
    expect(sync).toContain('sessionWindowBlocked && sourceConfigKnown');
    expect(app).toContain('syncActiveSession();\n  syncSessionPlaybackWindow();\n  if (!document.hidden) updateCurrentStreamButton();');
    expect(app).toContain('if (autoStreamsActive) scheduleAutoCheck();');
  });
  it('allows multiview to open outside a session window', () => {
    const open = app.slice(app.indexOf('function openMultiViewer()'), app.indexOf('function chooseMultiViewer()'));
    expect(open).not.toContain('if (!streamOverride.active && !isStreamAvailable(currentSession)) return;');
    expect(open).toContain('m?.show(true)');
  });
});
