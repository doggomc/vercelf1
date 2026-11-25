import { describe, it, expect } from 'vitest';
import { groupDirectoryChannels, retainFailedProviderFeeds } from '../src/lib/directory-reliability';
import type { OtherStreamItem } from '../src/lib/other-streams';
const feed = (key:string, provider:OtherStreamItem['provider'], title:string, alwaysLive = true):OtherStreamItem => ({key,provider,title,alwaysLive,id:key,category:'Sports',subtitle:'',tag:'',viewers:0,embedUrl:'',fallbackUrl:'',color:''});
describe('directory reliability', () => {
  it('retains stale feeds only for failed providers without duplicates', () => {
    const a=feed('a','ppv','Channel'), b=feed('b','strmfree','Channel'), c=feed('c','ppv','New');
    expect(retainFailedProviderFeeds([c],[a,b],['strmfree'])).toEqual([c,b]);
    expect(retainFailedProviderFeeds([b],[b],['strmfree'])).toEqual([b]);
  });
  it('groups exact 24/7 channel names but not events or different names', () => {
    const a=feed('a','ppv','Sky Sports'), b=feed('b','strmfree','Sky Sports'), c=feed('c','ppv','Sky Sports 2'), d=feed('d','ppv','Sky Sports',false), e=feed('e','strmfree','Sky Sports',false);
    expect(groupDirectoryChannels([a,b,c,d,e])).toEqual([[a,b],[c],[d],[e]]);
  });
});
