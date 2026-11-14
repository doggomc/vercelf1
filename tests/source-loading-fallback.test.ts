import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const app = readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
describe('cockpit startup fallback', () => {
  it('exits the loader with a useful message when the source chunk fails', () => {
    const block = app.slice(app.indexOf('function paintAutoSourceConfig('),app.indexOf('function scheduleAutoCheck('));
    expect(block).toContain('playerLoadToken === 0');
    expect(block).toContain('revision === autoApplyRevision');
    expect(block).toContain("title: 'Sources unavailable'");
    expect(block).toContain('Refresh the page to try again.');
    expect(block).toContain("!stageBox?.querySelector('iframe, video')");
  });
  it('restores message visibility when cycling stops mid-fade', () => {
    const block = app.slice(app.indexOf('function stopNS()'),app.indexOf('function startNS()'));
    expect(block).toContain("element.style.opacity = '1'");
    expect(block).toContain("element.style.transform = 'none'");
  });
  it('updates the empty auto-stream state after the schedule resolves or fails', () => {
    const block = app.slice(app.indexOf('async function refreshAutoStreams()'),app.indexOf('function applySourceConfig(payload)'));
    expect(block.match(/!autoEntries.length && !streamOverride.active/g)).toHaveLength(2);
  });
});
