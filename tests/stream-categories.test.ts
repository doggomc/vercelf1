import { describe, expect, it } from 'vitest';
import { compareStreamCategories, streamCategory } from '../src/lib/stream-categories';

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

describe('category chip order', () => {
  it('keeps Motorsport first and Kids last regardless of counts', () => {
    const entries: Array<[string,number]> = [['Kids',999],['Sports',12],['Football',30],['Motorsport',1],['Hockey',12]];
    expect(entries.sort(compareStreamCategories).map(([name]) => name)).toEqual(['Motorsport','Football','Hockey','Sports','Kids']);
  });
  it('keeps the order sensible when either special category is absent', () => {
    const entries: Array<[string,number]> = [['Kids',10],['Sports',1]];
    expect(entries.sort(compareStreamCategories).map(([name]) => name)).toEqual(['Sports','Kids']);
  });
});

it('recognises common broadcaster names in uncategorised feeds', () => {
  expect(streamCategory('24/7 Channels', 'Eurosport 1')).toBe('Sports');
  expect(streamCategory('Other', 'TNT Sports 1')).toBe('Sports');
  expect(streamCategory('24/7 Channels', 'Cartoon Network')).toBe('24/7 Channels');
});
