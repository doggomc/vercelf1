import { describe, expect, it } from 'vitest';
import { sourceTier, sourceFallbackOrder } from '../src/features/source-groups';

describe('primary and backup sources', () => {
  const sources = [
    { id: 'sky-f1-uk', links: [{ provider: 'cdnlivetv' }] },
    { id: 'wikisport', links: [{ provider: 'wikisport' }] },
    { id: 'ppv', links: [{ provider: 'ppv' }] },
    { id: 'sky-uk', links: [{ provider: 'strmfree' }] },
    { id: 'weelo-max', special: 'onboard', links: [{ provider: 'weelo' }] },
    { id: 'emb-dazn', lang: 'other', links: [] },
    { id: 'custom-test', managedCustom: true, links: [{ provider: 'custom' }] },
    { id: 'emb-fullhd1', hidden: true, links: [] },
  ];
  it('keeps provider tiers stable even when Race Control changes a URL', () => {
    expect(sourceTier(sources[0])).toBe('backup');
    expect(sourceTier(sources[1])).toBe('backup');
    expect(sourceTier(sources[2])).toBe('main');
    expect(sourceTier(sources[3])).toBe('main');
    expect(sourceTier(sources[4])).toBe('main');
    expect(sourceTier(sources[5])).toBe('main');
    expect(sourceTier(sources[6])).toBe('custom');
    expect(sourceTier({ ...sources[2], links: [{ provider: 'custom' }], base: { links: [{ provider: 'ppv' }] } })).toBe('main');
  });
  it('tries the selected source first, then mains, then custom, then backups', () => {
    expect(sourceFallbackOrder(sources, 1)).toEqual([1, 2, 3, 6, 0]);
    expect(sourceFallbackOrder(sources, 3)).toEqual([3, 2, 6, 0, 1]);
    expect(sourceFallbackOrder(sources, 7)).toEqual([]);
    expect(sourceFallbackOrder(sources, 5)).toEqual([5]);
  });
});
