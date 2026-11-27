import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { isDirectStreamfreeSkyUrl } from '../src/lib/direct-streamfree';
import { applySourceConfig } from '../src/features/chips';
import type { StreamSource } from '../src/features/chip-types';

describe('direct stripped StreamFree Sky', () => {
  it('only accepts Sky F1 embeds on the two provider domains', () => {
    expect(isDirectStreamfreeSkyUrl('https://strmfree.st/embed/racing/skyf1')).toBe(true);
    expect(isDirectStreamfreeSkyUrl('https://streamfree.top/embed/racing/skyf11080p')).toBe(true);
    for (const url of ['https://f1admin.onrender.com/api/stream/strmfree-embed?variant=skyf1', 'https://evil.example/embed/racing/skyf1', 'http://strmfree.st/embed/racing/skyf1', 'https://strmfree.st/embed/racing/skyf12160p']) expect(isDirectStreamfreeSkyUrl(url)).toBe(false);
  });
  it('does not let a Race Control override change the stripped Sky source into a relay', () => {
    const direct='https://strmfree.st/embed/racing/skyf1';
    const sources: StreamSource[]=[{id:'sky-strmfree',label:'Sky HD',sandboxDirect:true,links:[{provider:'strmfree',url:direct}]}];
    let current=0;
    const host={sources,current:()=>current,setCurrent:(i:number)=>{current=i},usable:(s:StreamSource|undefined)=>!!s&&!s.hidden,normalize:()=>{current=0},render:()=>{},reload:()=>{}};
    applySourceConfig({overrides:{'sky-strmfree':{url:'https://f1admin.onrender.com/api/stream/strmfree-embed?variant=skyf1'}},relaysDisabled:false},host);
    expect(sources[0].links[0].url).toBe(direct);
    expect(sources[0].hidden).toBe(false);
    applySourceConfig({autoStreams:false,relaysDisabled:true,disabled:[]},host);
    expect(sources[0]).toMatchObject({id:'sky-strmfree',sandboxDirect:true,hidden:false});
    expect(sources[0].links[0].url).toBe(direct);
    applySourceConfig({autoStreams:false,relaysDisabled:true,disabled:['sky-strmfree']},host);
    expect(sources[0].hidden).toBe(true);
  });
  it('prefers a discovered sandboxed Sky source in auto mode without selecting another channel', () => {
    const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
    const block=app.slice(app.indexOf('function preferredSourceIndex()'),app.indexOf('function normalizeCurrentSource()'));
    const sources=[
      {id:'sky-strmfree',hidden:true},
      {id:'auto-news-sandbox',managedAuto:true,autoProvider:'strmfree',sandboxDirect:true,links:[{url:'https://strmfree.st/embed/news/channel'}]},
      {id:'auto-sky',managedAuto:true,autoProvider:'strmfree',links:[{url:'https://strmfree.st/embed/racing/skyf1'}]},
      {id:'auto-sky-sandbox',managedAuto:true,autoProvider:'strmfree',sandboxDirect:true,links:[{url:'https://strmfree.st/embed/racing/skyf1'}]},
    ];
    const context:any={sources,DEFAULT_SOURCE_ID:'sky-strmfree',sourceEnabled:(s:any)=>!s.hidden,isDirectStreamfreeSkyUrl};
    runInNewContext(ts.transpile(block,{target:ts.ScriptTarget.ES2022})+';globalThis.preferred=preferredSourceIndex;',context);
    expect(context.preferred()).toBe(3);
    sources[3].hidden=true;
    expect(context.preferred()).toBe(1);
  });
  it('creates the direct player without a sandbox and with no scrolling', () => {
    const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
    const block=app.slice(app.indexOf('function makeStreamIframe('),app.indexOf('function watchFrameNavigation('));
    const frame:any={attrs:{},setAttribute(k:string,v:string){this.attrs[k]=v;}};
    const context:any={document:{createElement:()=>frame},IFRAME_ALLOW:'autoplay; fullscreen',isStrippedEmbed:()=>false};
    runInNewContext(ts.transpile(block,{target:ts.ScriptTarget.ES2022})+';globalThis.make=makeStreamIframe;',context);
    context.make('https://strmfree.st/embed/racing/skyf1',undefined,true);
    expect(frame.src).toBe('https://strmfree.st/embed/racing/skyf1');
    expect(frame.attrs.sandbox).toBeUndefined();
    expect(frame.attrs.scrolling).toBe('no');
  });
});
