import {describe,it,expect} from 'vitest';
import {parseMotorsports,countdownText} from '../src/lib/motorsports';
import {parsePrivateCockpitParams} from '../src/lib/other-streams';
const event=(id:string,key:string,name:string,state='upcoming')=>({id,series:{key,name},weekend:'Qatar Grand Prix',session:key==='show'?'The F1 Show':'Race',start:'2026-11-27T13:00:00Z',end:'2026-11-27T14:00:00Z',state});
const wrap=(field:string,events:any[])=>({api:'racinglap',version:1,[field]:events});
describe('motorsports schedule',()=>{
 it('includes every non-F1 series, joins exact event IDs to validated direct cockpits, and preserves times',()=>{
  const schedule=wrap('events',[event('f1e','f1','Formula 1'),event('f2e','f2','Formula 2'),event('f1ae','f1a','F1 Academy'),event('showe','show','Show')]);
  const stream=(e:any)=>({...e,channels:[{name:'World Feed',language:'en',embed:'https://weellz.live/beta?stream=abcd1234'}]});
  const streams=wrap('events',[stream(event('f2e','f2','Formula 2')),stream(event('showe','show','Show')),stream(event('f1e','f1','Formula 1'))]);
  const result=parseMotorsports(schedule,streams);expect(result.map(e=>e.series)).toEqual(['Formula 2','F1 Academy','Show']);expect(result[0].start).toBe(Date.parse('2026-11-27T13:00:00Z'));
  expect(result[0].feeds[0].url).toBe('https://weellz.live/beta?stream=abcd1234');expect(result[1].feeds).toHaveLength(0);
  for(const e of [result[0],result[2]]) {const parsed=parsePrivateCockpitParams(new URL(e.feeds[0].href,'https://example.test').search);expect(parsed?.embedUrl).toBe(e.feeds[0].url);expect(parsed?.status).toBe('scheduled');}
 });
 it('rejects malformed API responses, untrusted streams and mismatched events',()=>{
  expect(()=>parseMotorsports({},null)).toThrow();
  const e=event('x','f2','Formula 2');const channels=[{embed:'https://evil.test/beta?stream=abcd1234'},{embed:'https://weellz.live/beta?stream=abcd1234&extra=1'}];
  expect(parseMotorsports(wrap('events',[e]),wrap('events',[{...e,channels}]))[0].feeds).toEqual([]);
  expect(parseMotorsports(wrap('events',[e]),wrap('events',[{...e,series:{key:'f3'},channels:[{embed:'https://weellz.live/beta?stream=abcd1234'}]}]))[0].feeds).toEqual([]);
 });
 it('ticks locally without claiming live before the API confirms it',()=>{
  const e=parseMotorsports(wrap('events',[event('x','f2','Formula 2')]),null)[0];
  expect(countdownText(e,e.start-61000)).toBe('IN 00:01:01');expect(countdownText(e,e.start)).toBe('AWAITING LIVE STATUS');expect(countdownText({...e,state:'live'},e.start)).toBe('LIVE NOW');expect(countdownText({...e,state:'finished'},e.start)).toBe('FINISHED');
 });
});

it('adds Other Streams motorsport and every live non-F1 RacingLap category without mixing their schedules',async()=>{
 const {motorsportDirectoryItems}=await import('../src/lib/motorsports');
 const base={key:'a',provider:'ppv' as const,id:'x',title:'Race',category:'Formula 2',subtitle:'',tag:'PPV',viewers:0,alwaysLive:false,embedUrl:'https://example.test',fallbackUrl:'https://example.test',color:'#000',status:'live' as const};
 const result=motorsportDirectoryItems([base,{...base,key:'b',title:'Football',category:'Football'},{...base,key:'c',provider:'weelo',title:'The F1 Show',category:'Shows'},{...base,key:'d',provider:'weelo',title:'F1 Academy',category:'F1 Academy'},{...base,key:'e',status:'scheduled'}]);
 expect(result.map(x=>x.key)).toEqual(['a','c','d']);expect(result[0].category).toBe('Motorsport');
});

it('reuses the RacingLap request and leaves the remaining directory sources independent',async()=>{
 const {fetchAllOtherStreams}=await import('../src/lib/other-streams');const requests:string[]=[];
 const fetchImpl:typeof fetch=async input=>{const url=String(input);requests.push(url);if(url.includes('zlive.st/embed/manifest.json'))return new Response(JSON.stringify({channels:[]}));throw Error('offline');};
 const result=await fetchAllOtherStreams({fetchImpl,skipRacingLap:true,forceRefresh:true});
 expect(requests.filter(url=>url.includes('racinglap.net')||url.includes('weelo.live'))).toEqual([]);
 expect(requests.filter(url=>url.includes('zlive.st/embed/manifest.json'))).toHaveLength(1);
 expect(result.providerOk.zlive).toBe(true);
});

it('orders live and upcoming sessions before finished without mutating the source', async () => {
 const {orderMotorsportEvents}=await import('../src/lib/motorsports');
 const original=parseMotorsports(wrap('events',[event('finished','f2','Formula 2','finished'),event('upcoming','f2','Formula 2','upcoming'),event('live','f2','Formula 2','live')]),null);
 expect(orderMotorsportEvents(original).map(e=>e.id)).toEqual(['live','upcoming','finished']);
 expect(original.map(e=>e.id)).toEqual(['finished','upcoming','live']);
});
