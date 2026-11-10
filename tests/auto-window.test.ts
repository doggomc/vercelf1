import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const mv=readFileSync(new URL('../src/features/multiviewer.ts',import.meta.url),'utf8');
describe('auto discovery schedule',()=>{
  it('uses the backend schedule and does not poll legacy providers in auto mode',()=>{
    expect(app).toContain('const AUTO_RETRY_MS = 10 * 60_000');
    expect(app).toContain("window.reason === 'schedule-unavailable'");
    expect(app).toContain('if (document.hidden || autoStreamsActive || !sourceConfigKnown) return;');
    expect(app).toContain('if (!document.hidden && !autoStreamsActive && sourceConfigKnown) void loadProviderHealth();');
    expect(app).toContain('if (autoStreamsActive) scheduleAutoCheck();');
  });
  it('keeps hidden manual feeds out of the multiviewer',()=>{
    expect(mv).toContain('(s.weelo || s.weellzUrls?.length) && !s.hidden');
  });
});
