import { describe, it, expect } from 'vitest';
import { staleSession, canonicalSessionSlug, autoPpvMatchesSession } from '../src/features/session-guard';

describe('stale PPV / taifood entries', () => {
  const practice = 'https://taifood-blog.asia/embed/mexico-city-grand-prix---practice-3-31385';
  const quali = 'https://taifood-blog.asia/embed/so-paulo-grand-prix---qualifying-31854';
  const race = 'https://taifood-blog.asia/embed/mexico-city-grand-prix---race-31407';
  const path = 'https://taifood-blog.asia/embed/f1/2026/mexico/race';
  it('skips an address that names another session', () => {
    expect(staleSession(practice, 'race')).toBe(true);
    expect(staleSession(race, 'practice-3')).toBe(true);
    expect(staleSession(race, 'fp3')).toBe(true);
    expect(staleSession(practice, 'qualifying')).toBe(true);
  });
  it('keeps the address for the session being watched, including fp1/fp2/fp3 schedule slugs', () => {
    expect(staleSession(race, 'race')).toBe(false);
    expect(staleSession(practice, 'practice-3')).toBe(false);
    expect(staleSession(practice, 'fp3')).toBe(false);
    expect(staleSession(quali, 'qualifying')).toBe(false);
    expect(canonicalSessionSlug('Practice 3')).toBe('fp3');
    expect(canonicalSessionSlug('fp3')).toBe('fp3');
  });
  it('keeps an address that names no session at all', () => {
    expect(staleSession(path, 'race')).toBe(false);
  });
});


describe('automatic PPV session visibility', () => {
  const names = ['Practice 1','Practice 2','Practice 3','Qualifying','Race'];
  const slugs = ['fp1','fp2','fp3','qualifying','race'];
  for (let i=0;i<names.length;i++) {
    it(`shows only ${names[i]} while it is selected`, () => {
      for (let j=0;j<names.length;j++) {
        const url = `https://taifood-blog.asia/embed/las-vegas-grand-prix---${names[j].toLowerCase().replaceAll(' ','-')}-12345`;
        expect(autoPpvMatchesSession(`Las Vegas Grand Prix - ${names[j]}`, url, slugs[i])).toBe(i === j);
        expect(autoPpvMatchesSession('', `https://taifood-blog.asia/embed/f1/2026/las-vegas/${slugs[j]}`, slugs[i])).toBe(i === j);
      }
    });
  }
  it('distinguishes sprint qualifying from sprint and normal qualifying', () => {
    expect(autoPpvMatchesSession('Sprint Qualifying','', 'sprint-qualifying')).toBe(true);
    expect(autoPpvMatchesSession('Sprint Qualifying','', 'qualifying')).toBe(false);
    expect(autoPpvMatchesSession('Sprint Qualifying','', 'sprint')).toBe(false);
    expect(autoPpvMatchesSession('Sprint','', 'sprint')).toBe(true);
  });
  it('does not guess when the provider gives no identifiable session', () => {
    expect(autoPpvMatchesSession('F1 Sky Sports','https://taifood-blog.asia/embed/sky-f1','fp1')).toBe(false);
  });
});
