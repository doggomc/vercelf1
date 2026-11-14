import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

class Element {
  tag: string; children: Element[] = []; parentElement: Element | null = null;
  dataset: Record<string,string> = {}; attrs: Record<string,string> = {};
  textContent = ''; hidden = false; className = ''; onclick: (event:any)=>void = () => {};
  isConnected = true; classList = { remove:()=>{}, add:()=>{} };
  constructor(tag = 'div') { this.tag = tag; }
  append(...nodes:Element[]) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes:Element[]) { this.children.forEach(c=>{c.parentElement=null}); this.children=[]; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(c=>c!==this); }
  setAttribute(key:string, value:string) { this.attrs[key] = value; }
  focus() {}
  querySelectorAll(selector:string): Element[] {
    const descendants = this.children.flatMap(c=>[c,...c.querySelectorAll('*')]);
    if (selector === '*') return descendants;
    if (selector === 'button[data-replay-session]') return descendants.filter(x=>x.tag==='button' && x.dataset.replaySession !== undefined);
    if (selector === 'button[data-replay-feed]') return descendants.filter(x=>x.tag==='button' && x.dataset.replayFeed !== undefined);
    if (selector.includes('button[aria-pressed="true"]')) return descendants.filter(x=>x.tag==='button' && x.attrs['aria-pressed']==='true');
    if (selector === 'iframe') return descendants.filter(x=>x.tag==='iframe');
    return [];
  }
  querySelector(selector:string) { return this.querySelectorAll(selector)[0] || null; }
}

describe('replay controls stability', () => {
  it('keeps the session and feed buttons in place when changing feed and ignores reselecting it', () => {
    const source=readFileSync(new URL('../src/pages/replay-cockpit.ts', import.meta.url),'utf8');
    const code=source.slice(source.indexOf('function display('),source.indexOf("$('reloadFeedBtn')"));
    const feed=[{label:'F1 TV',url:'https://weellz.live/replay?id=one'}, {label:'International Feed',url:'https://weellz.live/replay?id=two'}];
    const s1={key:'race',name:'Race',replay:{sources:feed}};
    const s2={key:'qual',name:'Qualifying',replay:{sources:feed}};
    const e={id:'f1-2026',title:'Grand Prix',country:'Brazil',season:2026,round:1,series:'f1',circuit:'Test',sessions:[s1,s2]};
    const weekend={events:[e]}; const nodes:Record<string,Element>={};
    const $=(id:string)=>nodes[id] ||= new Element();
    const controls=$('replayControls'), stage=$('stageBox');
    const context:any={event:e,session:s1,weekends:[weekend],sourceIndex:0,helpTimer:0,sessionControlsSignature:'',feedControlsSignature:'',feedButtons:null,
      sourceJellyModule:Promise.resolve({animateSourceJelly:()=>{}}), seriesNames:{f1:'F1'}, weekendTitle:()=> 'Grand Prix', safeSource:(v:string)=>v,
      setCounterContext:()=>{}, $, document:{getElementById:()=>null,createElement:(tag:string)=>new Element(tag)},
      window:{clearTimeout:()=>{},setTimeout:()=>1}, history:{replaceState:()=>{}}, URL, URLSearchParams };
    runInNewContext(ts.transpile(code,{target:ts.ScriptTarget.ES2022})+'\nglobalThis.display=display;',context);
    context.display();
    const sessions=controls.querySelectorAll('button[data-replay-session]');
    const feeds=controls.querySelectorAll('button[data-replay-feed]');
    const firstFrame=stage.querySelector('iframe');
    feeds[1].onclick({detail:1});
    expect(controls.querySelectorAll('button[data-replay-session]')[0]).toBe(sessions[0]);
    expect(controls.querySelectorAll('button[data-replay-feed]')[1]).toBe(feeds[1]);
    expect(feeds[1].attrs['aria-pressed']).toBe('true');
    const secondFrame=stage.querySelector('iframe'); expect(secondFrame).not.toBe(firstFrame);
    feeds[1].onclick({detail:1}); expect(stage.querySelector('iframe')).toBe(secondFrame);
    sessions[1].onclick({detail:1});
    expect(controls.querySelectorAll('button[data-replay-session]')[1]).toBe(sessions[1]);
    expect(sessions[1].attrs['aria-pressed']).toBe('true');
  });
});
