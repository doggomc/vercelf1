import { describe, expect, it } from 'vitest';
import { schedule } from '../src/data/schedule';
import { grandPrixHref, grandPrixSlug, roundFlagCode } from '../src/pages/schedule-format';
import { readFileSync } from 'node:fs';
describe('Grand Prix pages', () => {
  it('assigns every round a unique clean URL', () => {
    const slugs = schedule.map(grandPrixSlug);
    expect(new Set(slugs).size).toBe(23);
    expect(grandPrixHref(schedule[0])).toBe('/grand-prix/2026/australian-grand-prix/');
    expect(grandPrixHref(schedule[15])).toContain('bahrain-grand-prix-in-malaysia');
  });
  it('links each schedule card and retains the quick timetable button', () => {
    const source = readFileSync('src/pages/schedule.ts', 'utf8');
    expect(source).toContain('href="${grandPrixHref(event)}"');
    expect(source).toContain('data-round-toggle="${event.round}"');
  });
  it('does not fetch future session results and reports unavailable data', () => {
    const source = readFileSync('src/pages/grand-prix.ts', 'utf8');
    expect(source).toContain('Date.now() < start');
    expect(source).toContain('Results are unavailable right now');
    expect(source).toContain('Results are not available yet');
  });
  it('uses vector flags and icons for the race header', () => {
    const template = readFileSync('grand-prix.html', 'utf8');
    const source = readFileSync('src/pages/grand-prix.ts', 'utf8');
    expect(template).not.toContain('🏆');
    expect(template).toContain('gp-winner-label"><svg');
    expect(source).toContain('assets/flags/vector/');
    expect(source).toContain('gpStatus');
    for (const event of schedule) expect(readFileSync(`assets/flags/vector/${roundFlagCode(event.round)}.svg`, 'utf8')).toContain('<svg');
  });
});
