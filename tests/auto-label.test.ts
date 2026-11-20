import { describe, expect, it } from 'vitest';
import { ppvDisplayLabel } from '../src/features/auto-label';
import { autoPpvMatchesSession } from '../src/features/session-guard';

describe('automatic PPV source labels', () => {
  it('shows broadcaster and quality without exposing the session name on the pill', () => {
    expect(ppvDisplayLabel('ppv', 'HD | Sky Sports F1')).toBe('Sky Sports F1 HD');
    expect(ppvDisplayLabel('ppv', 'HD | Sky Sport F1 · IT')).toBe('Sky Sports F1 HD · IT');
    expect(ppvDisplayLabel('ppv', 'HD | Apple TV (F1TV)')).toBe('Apple TV (F1TV) HD');
    expect(ppvDisplayLabel('ppv', 'PPV')).toBeNull();
    expect(ppvDisplayLabel('weelo', 'HD | Sky Sports F1')).toBeNull();
  });
  it('keeps session filtering based on the original event label and URL', () => {
    const event = 'Las Vegas Grand Prix - Practice 3';
    expect(autoPpvMatchesSession(event, 'https://taifood-blog.asia/embed/test', 'fp3')).toBe(true);
    expect(autoPpvMatchesSession(event, 'https://taifood-blog.asia/embed/test', 'fp2')).toBe(false);
  });
});
