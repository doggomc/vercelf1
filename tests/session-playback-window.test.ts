import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
describe('cockpit session playback window', () => {
  it('gates every ordinary source after the explicit stream override and before loading any provider', () => {
    const load = app.slice(app.indexOf('function load()'), app.indexOf('let streamOverride ='));
    expect(load.indexOf('if (streamOverride.active && streamOverride.url)')).toBeLessThan(load.indexOf('if (!isStreamAvailable(currentSession))'));
    expect(load.indexOf('if (!isStreamAvailable(currentSession))')).toBeLessThan(load.indexOf('if (autoStreamsActive && !sources.some(sourceEnabled))'));
    expect(load).toContain('sessionWindowBlocked = true;');
    expect(load).toContain('showNoStream({ blocked: false });');
  });
  it('reconciles an open player and multiview without pausing discovery, including when hidden', () => {
    const sync = app.slice(app.indexOf('function syncSessionPlaybackWindow()'), app.indexOf('// Background intervals'));
    expect(sync).toContain('streamOverride.active || isStreamAvailable(currentSession)');
    expect(sync).toContain('multiViewerControl?.isOpen?.()');
    expect(sync).toContain('sessionWindowBlocked && sourceConfigKnown');
    expect(app).toContain('syncActiveSession();\n  syncSessionPlaybackWindow();\n  if (!document.hidden) updateCurrentStreamButton();');
    expect(app).toContain('if (autoStreamsActive) scheduleAutoCheck();');
  });
  it('does not let a delayed multiview load open outside the session window', () => {
    const open = app.slice(app.indexOf('function openMultiViewer()'), app.indexOf('function chooseMultiViewer()'));
    expect(open).toContain('if (!streamOverride.active && !isStreamAvailable(currentSession)) return;');
    expect(open).toContain('if (streamOverride.active || isStreamAvailable(currentSession)) m?.show(true);');
  });
});
