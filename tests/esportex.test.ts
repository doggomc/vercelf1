import {describe,it,expect} from 'vitest';
import {parseEsportexStreams,buildEsportexUrls,buildPrivateCockpitHref,parsePrivateCockpitParams,fetchAllOtherStreams} from '../src/lib/other-streams';
const now=Date.parse('2026-11-25T18:00:00Z');
const event=(extra:Record<string,unknown>={})=>({slug:'football-test',tag:'Team A vs Team B',league:'Football',kickoff:'2026-11-26 00:00',endTime:'2026-11-26 03:00',iframes:[{server:'FHD/iOS',url:'https://streams.esportex.site/player#cHB2LzMyODIz'},{server:'SD/iOS',url:'https://streams.esportex.site/player#cHB2LzMyODI0'}],...extra});
describe('EmbedSportex',()=>{
 it('uses the WIB schedule, only live non-F1 events and direct players, preserving fragments',()=>{
  const data={success:true,football:[event(),event({slug:'future',kickoff:'2026-11-26 03:00'}),event({slug:'ended',kickoff:'2026-11-25 20:00',endTime:'2026-11-25 23:00'}),event({slug:'f1',tag:'Qatar Grand Prix',league:'Formula 1'})]};
  const items=parseEsportexStreams(data,now);expect(items).toHaveLength(1);expect(items[0].embedUrl).toBe('https://streams.esportex.site/player#cHB2LzMyODIz');expect(items[0].startAt).toBe(Date.parse('2026-11-25T17:00:00Z'));
  const resolved=parsePrivateCockpitParams(new URL(buildPrivateCockpitHref(items[0]),'https://freef1.test').search);expect(resolved?.provider).toBe('esportex');expect(resolved?.embedUrl).toBe(items[0].embedUrl);
 });
 it('rejects spoofed players, additional parameters, unsafe ids and invalid responses',()=>{
  expect(buildEsportexUrls('s:../../bad')).toBeNull();expect(parsePrivateCockpitParams('?s=12&id=s%3A..%2Fbad')).toBeNull();
  expect(()=>parseEsportexStreams({success:false})).toThrow();
  const frames=['https://evil.test/player#abc','https://streams.esportex.site.evil.test/player#abc','https://streams.esportex.site/player?x=1#abc','https://streams.esportex.site/player#abc%2Fdef','http://streams.esportex.site/player#abc'].map(url=>({server:'HD',url}));
  expect(parseEsportexStreams({success:true,football:[event({iframes:frames})]},now)).toEqual([]);
 });
 it('fetches the catalogue once and isolates provider failure',async()=>{
  const requests:string[]=[];const fetchImpl:typeof fetch=async input=>{const url=String(input);requests.push(url);if(url==='https://api.esportex.site/api/streams')return new Response(JSON.stringify({success:true,football:[event({kickoff:'2020-01-01 00:00',endTime:'2099-01-01 00:00'})]}));throw Error('offline');};
  const result=await fetchAllOtherStreams({fetchImpl});expect(requests.filter(u=>u==='https://api.esportex.site/api/streams')).toHaveLength(1);expect(result.providerOk.esportex).toBe(true);expect(result.items.filter(i=>i.provider==='esportex')).toHaveLength(1);
 });
});
