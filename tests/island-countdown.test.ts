import { describe, expect, it } from 'vitest';
import { islandRelativeTime } from '../src/features/island-countdown';
describe('compact island countdown', () => {
  it('rounds days up until twelve hours remain', () => {
    expect(islandRelativeTime(40 * 3600)).toBe('in 2 days');
    expect(islandRelativeTime(24 * 3600)).toBe('in 1 day');
    expect(islandRelativeTime(12 * 3600 + 1)).toBe('in 1 day');
    expect(islandRelativeTime(12 * 3600)).toBe('in 12 hr');
    expect(islandRelativeTime(3601)).toBe('in 2 hr');
    expect(islandRelativeTime(3599)).toBe('in 60 min');
  });
});
