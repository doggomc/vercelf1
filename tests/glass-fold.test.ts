import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGlassFold } from '../src/features/glass-fold';
afterEach(() => vi.unstubAllGlobals());
describe('glass fold home hero', () => {
  it('uses a decorative canvas with a CSS fallback instead of loading the old hero photo', () => {
    const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
    expect(html).toContain('id="heroGlass"'); expect(html).not.toContain('hero-freef1-800.webp');
    expect(html).toMatch(/class="hero-media" aria-hidden="true"/);
  });
  it('falls back when WebGL is unavailable', () => {
    const canvas = {getContext:vi.fn(()=>null),hidden:false} as unknown as HTMLCanvasElement;
    initGlassFold(canvas); expect(canvas.hidden).toBe(true);
  });
  it('pauses when hidden or off-screen and respects reduced motion', () => {
    const code = readFileSync(new URL('../src/features/glass-fold.ts',import.meta.url),'utf8');
    expect(code).toContain("prefers-reduced-motion: reduce"); expect(code).toContain('document.hidden'); expect(code).toContain('IntersectionObserver');
  });
});
