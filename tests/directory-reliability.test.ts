import { describe, it, expect } from 'vitest';
import { retainFailedProviderFeeds } from '../src/lib/directory-reliability';
import type { OtherStreamItem } from '../src/lib/other-streams';
const feed = (key:string, provider:OtherStreamItem['provider'], title:string, alwaysLive = true):OtherStreamItem => ({key,provider,title,alwaysLive,id:key,category:'Sports',subtitle:'',tag:'',viewers:0,embedUrl:'',fallbackUrl:'',color:''});
describe('directory reliability', () => {
  it('retains stale feeds only for failed providers without duplicates', () => {
    const a=feed('a','ppv','Channel'), b=feed('b','strmfree','Channel'), c=feed('c','ppv','New');
    expect(retainFailedProviderFeeds([c],[a,b],['strmfree'])).toEqual([c,{...b,stale:true}]);
    expect(retainFailedProviderFeeds([b],[b],['strmfree'])).toEqual([b]);
  });
});
