import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const mv=readFileSync(new URL('../src/features/multiviewer.ts',import.meta.url),'utf8');
describe('auto discovery schedule',()=>{
  it('uses the backend schedule and does not poll legacy providers in auto mode',()=>{
    expect(app).toContain('autoStreamsActive && !document.hidden && Date.now() >= autoNextCheckAt');
    expect(app).toContain('window.nextCheckAt - window.serverTime');
    expect(app).toContain('autoNextCheckAt = Date.now() + 60_000');
    expect(app).not.toContain('setTimeout(() => void refreshAutoStreams()');
    expect(app).not.toContain('}, WEELO_REFRESH_INTERVAL_MS)');
    expect(app).toContain("window.reason === 'schedule-unavailable'");
    expect(app).toContain('if (!document.hidden && !autoStreamsActive && sourceConfigKnown) void loadProviderHealth();');
    expect(app).toContain('if (autoStreamsActive) scheduleAutoCheck();');
  });
  it('accepts only valid TimStreams players in the auto discovery response',()=>{
    const start=app.indexOf('      const hosts: Record<string, string[]> =',app.indexOf('async function refreshAutoStreams()'));
    const end=app.indexOf('      // Do not unmount',start);
    const block=app.slice(start,end);
    const rows=[
      {id:'auto-timstreams-0123456789abcdef',provider:'timstreams',label:'Sky Sports F1',url:'https://shoewiki.click/sky-1'},
      {id:'auto-timstreams-0123456789abcdef',provider:'timstreams',label:'bad',url:'https://shoewiki.click.evil.test/sky-1'},
      {id:'auto-timstreams-0123456789abcdef',provider:'timstreams',label:'bad',url:'https://shoewiki.click/sky-1?x=1'},
    ];
    const ctx:any={json:{streams:rows},URL};
    runInNewContext(ts.transpile(block+';globalThis.accepted=nextEntries;', {target:ts.ScriptTarget.ES2022}),ctx);
    expect(ctx.accepted).toHaveLength(1);
    expect(ctx.accepted[0].label).toBe('Sky Sports F1');
  });
  it('keeps hidden manual feeds out of the multiviewer',()=>{
    expect(mv).toContain('(s.weelo || s.weellzUrls?.length) && !s.hidden');
  });
});
