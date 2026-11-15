import { describe, expect, it } from 'vitest';
import { streamCategory } from '../src/lib/stream-categories';

describe('stream categories', () => {
  it('combines provider league labels into clear sport categories', () => {
    for (const value of ['Soccer', 'Football', 'UEFA Nations League']) expect(streamCategory(value, 'Teams')).toBe('Football');
    for (const value of ['NFL', 'American Football']) expect(streamCategory(value, 'Teams')).toBe('American Football');
    for (const value of ['NBA', 'NCAAM', 'Basketball']) expect(streamCategory(value, 'Teams')).toBe('Basketball');
    expect(streamCategory('NHL', 'Teams')).toBe('Hockey');
    expect(streamCategory('Formula 2', 'Feature race')).toBe('Motorsport');
    expect(streamCategory('Fighting', 'UFC')).toBe('Combat Sports');
  });
  it('uses clear channel names but avoids guessing general sports channels', () => {
    expect(streamCategory('Sports', 'NFL Network')).toBe('American Football');
    expect(streamCategory('Sports', 'Sky Sports Cricket')).toBe('Cricket');
    expect(streamCategory('Sports', 'TSN 4')).toBe('Sports');
    expect(streamCategory('Sports', 'Sky Sports Racing')).toBe('Sports');
  });
});
