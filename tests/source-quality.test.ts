import { describe, it, expect } from 'vitest';
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
