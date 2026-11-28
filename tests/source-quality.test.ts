import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validSdUrl } from '../src/features/source-quality';
describe('published SD variants', () => {
  it('accepts only same-player PPV 540p variants', () => {
    const hd='https://taifood-blog.asia/embed/f1/race';
    expect(validSdUrl('ppv', hd, hd+'_540p')).toBe(hd+'_540p');
    expect(validSdUrl('ppv', hd, 'https://taifood-blog.asia/embed/f1/other_540p')).toBe('');
    expect(validSdUrl('ppv', hd, 'https://evil.test/embed/f1/race_540p')).toBe('');
  });
  it('only accepts validated EMB embeds', () => {
    expect(validSdUrl('embdlol','https://embdlol.st/embed/hd','https://embdlol.st/embed/sd')).toBe('https://embdlol.st/embed/sd');
    expect(validSdUrl('embdlol','https://embdlol.st/embed/hd','https://evil.test/embed/sd')).toBe('');
    expect(validSdUrl('embdlol','https://embdlol.st/embed/hd','https://embdlol.st/embed/sd?x=1')).toBe('');
  });
});

it('uses the same white selected source style inside the quality control', () => {
  const css = readFileSync(new URL('../src/styles/source-jelly.css', import.meta.url), 'utf8');
  expect(css).toMatch(/#links \.source-choice > button\.chip\.active,[\s\S]*?background:\s*#f5f5f5;\s*color:\s*#18181b/);
});


it('shows the source dot on standard 4K buttons as well', () => {
  const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
  const jelly = readFileSync(new URL('../src/styles/source-jelly.css', import.meta.url), 'utf8');
  expect(css).toContain('.wsource-list button.chip:not(.chip-special)::before');
  expect(jelly).toContain('.wsource-list button.chip.active:not(.chip-special)::before');
});
