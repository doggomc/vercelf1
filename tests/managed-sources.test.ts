import { describe, it, expect } from 'vitest';
import { parseSiteConfig } from '../src/types/site-config';
import { applySourceConfig } from '../src/features/chips';
import type { StreamSource } from '../src/features/chip-types';

describe('managed cockpit sources', () => {
  it('validates custom links and bounds untrusted configuration', () => {
    const result = parseSiteConfig({ sources: { disabled: [], custom: [
      { id:'custom-valid', label:'Extra', url:'https://example.com/player', tab:'other' },
      { id:'custom-bad', label:'Bad', url:'http://example.com', tab:'en' },
      { id:'sky-uk', label:'Spoof', url:'https://example.com', tab:'en' },
      { id:'custom-credentials', label:'Bad', url:'https://user:pass@example.com', tab:'en' }
    ], order:['custom-valid','sky-uk','custom-valid'] } });
    expect(result?.sources?.custom).toEqual([{ id:'custom-valid', label:'Extra', url:'https://example.com/player', tab:'other' }]);
    expect(result?.sources?.order).toEqual(['custom-valid','sky-uk']);
  });
  it('adds, reorders, updates and removes sources without losing the selected feed', () => {
    const sources: StreamSource[] = [{id:'first',label:'First',links:[{url:'https://example.com/a'}]}, {id:'second',label:'Second',links:[{url:'https://example.com/b'}]}];
    let index=1, reloads=0, renders=0;
    const host = { sources, current:()=>index, setCurrent:(i:number)=>{index=i}, usable:(s:StreamSource|undefined)=>!!s&&!s.hidden, normalize:()=>{index=sources.findIndex(s=>!s.hidden)}, render:()=>{renders++}, reload:()=>{reloads++} };
    const custom={ id:'custom-managed-test', label:'Extra', url:'https://example.com/player', tab:'en' };
    applySourceConfig({ disabled:[], custom:[custom], order:['custom-managed-test','second','first'], overrides:{} },host);
    expect(sources.map(s=>s.id)).toEqual(['custom-managed-test','second','first']);
    expect(sources[index].id).toBe('second'); expect(reloads).toBe(0);
    applySourceConfig({ disabled:['second'], custom:[custom], order:['custom-managed-test','second','first'], overrides:{} },host);
    expect(sources[index].id).toBe('custom-managed-test'); expect(reloads).toBe(1);
    applySourceConfig({ disabled:['second'], custom:[{...custom,url:'https://example.com/new'}], order:['custom-managed-test','second','first'], overrides:{} },host);
    expect(reloads).toBe(2);
    applySourceConfig({ disabled:['second'], custom:[], order:[], overrides:{} },host);
    expect(sources[index].id).toBe('first'); expect(reloads).toBe(3); expect(renders).toBe(4);
  });
});
