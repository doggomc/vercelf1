import { describe, expect, it } from 'vitest';
import { MAX_TILES, describeFeed, focusLayout, initialFeedIds, isMultiviewWeeloSource, layout, strippedPlayerUrl, tileUrl } from '../src/features/multiviewer';

describe('multiviewer geometry & feed classification', () => {
  it('only allows Weelo-backed feeds in multiview', () => {
    expect(isMultiviewWeeloSource({})).toBe(false); // Sky HD and other non-Weelo relays
    expect(isMultiviewWeeloSource({ weelo: 'sky-weelo' })).toBe(true);
    expect(isMultiviewWeeloSource({ weellzUrls: ['https://weellz.live/beta?stream=test'] })).toBe(true);
    expect(isMultiviewWeeloSource({ weelo: 'test', hidden: true })).toBe(false);
  });

  it('starts only the selected available feed or restores a valid saved grid', () => {
    const feeds = [
      { id: 'sky', live: true }, { id: 'kimi', live: false }, { id: 'max', live: true },
    ] as any;
    expect(initialFeedIds(feeds, undefined, 'max')).toEqual(['max']);
    expect(initialFeedIds(feeds, [], 'missing')).toEqual(['sky']);
    expect(initialFeedIds(feeds, ['missing', 'kimi', 'kimi', 'max'], 'sky')).toEqual(['kimi', 'max']);
    expect(initialFeedIds([], [], 'missing')).toEqual([]);
  });

  it('builds muted and unmuted weellz.live and stripped relay tile URLs cleanly', () => {
    expect(tileUrl('abc123', false)).toBe('https://weellz.live/beta?stream=abc123&autoplay=1&mute=0');
    expect(tileUrl('abc123', true)).toBe('https://weellz.live/beta?stream=abc123&autoplay=1&mute=1');
    expect(tileUrl('abc123', true, 'https://weellz.live/beta?stream=xyz')).toBe(
      'https://weellz.live/beta?stream=xyz&autoplay=1&mute=1',
    );
    const strippedBase = strippedPlayerUrl('dflgjhacdfahpgchehacbdacoekfacieee', 'https://f1admin.onrender.com');
    expect(tileUrl('dflgjhacdfahpgchehacbdacoekfacieee', false, strippedBase)).toBe(
      'https://f1admin.onrender.com/api/stream/weellz-embed?stream=dflgjhacdfahpgchehacbdacoekfacieee&v=2&autoplay=1&mute=0',
    );
  });

  it('lays out 1..9 tiles as 16:9 boxes within bounds and 9 tiles as 3x3', () => {
    for (let n = 1; n <= MAX_TILES; n++) {
      const boxes = layout(n, 1424, 836);
      expect(boxes).toHaveLength(n);
      for (const b of boxes) {
        expect(b.w / b.h).toBeCloseTo(16 / 9, 2);
        expect(b.x).toBeGreaterThanOrEqual(-0.5);
        expect(b.y).toBeGreaterThanOrEqual(-0.5);
        expect(b.x + b.w).toBeLessThanOrEqual(1424.5);
        expect(b.y + b.h).toBeLessThanOrEqual(836.5);
      }
    }

    const nine = layout(9, 1424, 836);
    expect(new Set(nine.map((b) => Math.round(b.x))).size).toBe(3);
    expect(new Set(nine.map((b) => Math.round(b.y))).size).toBe(3);
  });

  it('lays out Focus mode with one big hero player and smaller companion tiles', () => {
    const desk = focusLayout(3, 1424, 836);
    expect(desk).toHaveLength(3);
    expect(desk[0].w).toBeGreaterThan(desk[1].w * 2);
    expect(desk[1].x).toBeGreaterThan(desk[0].x + desk[0].w);
    expect(desk[1].w).toBeCloseTo(desk[2].w, 2);
    for (const b of desk) expect(b.w / b.h).toBeCloseTo(16 / 9, 2);

    const deskMany = focusLayout(7, 1424, 836);
    expect(deskMany).toHaveLength(7);
    expect(new Set(deskMany.slice(1).map((b) => Math.round(b.x))).size).toBe(2);

    const mobile = focusLayout(3, 378, 780);
    expect(mobile).toHaveLength(3);
    expect(mobile[0].y).toBe(0);
    expect(mobile[1].y).toBeGreaterThan(mobile[0].h);
    expect(mobile[0].w).toBeGreaterThan(mobile[1].w);
  });

  it('classifies broadcast, driver onboard, and pit wall feeds with clean titles and driver portrait keys', () => {
    expect(describeFeed({ id: 'weelo-skyweelo', label: 'Sky Sports (weelo)', special: 'feed' })).toMatchObject({
      title: 'Sky Sports F1',
      category: 'broadcast',
      badgeKind: 'sky',
    });
    expect(describeFeed({ id: 'weelo-intl', label: 'International Feed', special: 'feed' })).toMatchObject({
      title: 'International Feed',
      subtitle: 'Multi-audio',
      category: 'broadcast',
      badgeKind: 'f1',
    });
    expect(describeFeed({ id: 'weelo-max', label: 'Max Verstappen', special: 'onboard' })).toMatchObject({
      title: 'Max Verstappen',
      subtitle: 'Onboard',
      category: 'onboard',
      driverKey: 'verstappen',
      badgeKind: 'driver',
    });
    expect(describeFeed({ id: 'weelo-drivers', label: 'Drivers Track', special: 'onboard' })).toMatchObject({
      title: 'Driver Tracker',
      category: 'data',
      badgeKind: 'tracker',
    });
    expect(describeFeed({ id: 'weelo-data', label: 'Data Channel', special: 'data' })).toMatchObject({
      title: 'Data Channel',
      category: 'data',
      badgeKind: 'data',
    });
    expect(describeFeed({ id: 'weelo-stripped-max', label: 'Max Verstappen', special: 'onboard', stripped: true })).toMatchObject({
      title: 'Max Verstappen',
      subtitle: 'Onboard · Stripped',
      category: 'onboard',
      driverKey: 'verstappen',
      badgeKind: 'driver',
    });
    expect(describeFeed({ id: 'weelo-stripped-skyweelo', label: 'Sky Sports (weelo)', special: 'feed', stripped: true })).toMatchObject({
      title: 'Sky Sports F1',
      subtitle: 'UK · English · Stripped',
      category: 'broadcast',
      badgeKind: 'sky',
    });
  });
});
