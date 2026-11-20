import { describe, expect, it } from 'vitest';
import { autoPpvMatchesSession } from '../src/features/session-guard';

describe('cockpit source chip presentation', () => {
  it('uses the provider first and quality last without duplicate status tags', async () => {
    const { sourceChipDisplay } = await import('../src/features/auto-label');
    const auto = (id: string, label: string, tag: string) => sourceChipDisplay({ id: 'auto', label, managedAuto: true, autoProvider: id, autoTag: tag, links: [] });
    expect(auto('strmfree', 'Sky Sports F1', 'FHD')).toEqual({provider:'STREAMFREE', title:'Sky Sports F1',quality:'FHD',is4k:false});
    expect(auto('ppv', 'Las Vegas - Practice 3', 'HD | Sky Sports F1')).toEqual({provider:'PPV', title:'Sky Sports F1',quality:'HD',is4k:false});
    expect(auto('ppv', 'Las Vegas - Practice 3', 'HD | Apple TV (F1TV)')).toEqual({provider:'PPV', title:'Apple TV (F1TV)',quality:'HD',is4k:false});
    expect(auto('weelo', 'International Feed', 'Weelo · Upcoming')).toEqual({provider:'RACINGLAP', title:'International Feed',quality:'',is4k:false});
    expect(auto('embdlol', 'f1atvp', 'EMB')).toEqual({provider:'EMB', title:'Apple TV',quality:'',is4k:false});
    expect(auto('embdlol', 'F1 Apple TV', 'EMB').title).toBe('Apple TV');
    expect(auto('embdlol', 'Sky F1 UHD', 'EMB').is4k).toBe(true);
    expect(auto('bintv', 'Sky Sports F1 · 4K HEVC', 'BinTV').is4k).toBe(true);
    expect(auto('bintv', 'Sky Sports F1 · English', 'BinTV').title).toBe('Sky Sports F1 · English');
  });
  it('labels manual and custom sources without inventing a quality', async () => {
    const { sourceChipDisplay } = await import('../src/features/auto-label');
    expect(sourceChipDisplay({id:'weelo-max', label:'Max Verstappen', weelo:'x', links:[]}).provider).toBe('RACINGLAP');
    expect(sourceChipDisplay({id:'emb-uhd', label:'F1 UHD 4K',gated:true, links:[]}).provider).toBe('EMB');
    expect(sourceChipDisplay({id:'x',label:'My feed',managedCustom:true,links:[]}).quality).toBe('');
  });
});

it('retains the event label for session matching', () => {
  expect(autoPpvMatchesSession('Las Vegas Grand Prix - Practice 3', 'https://taifood-blog.asia/embed/test', 'fp3')).toBe(true);
  expect(autoPpvMatchesSession('Las Vegas Grand Prix - Practice 3', 'https://taifood-blog.asia/embed/test', 'fp2')).toBe(false);
});
