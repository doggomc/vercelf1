import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
describe('shared button feedback', () => {
  it.each(['app', 'layout', 'help', '404'])('loads on pages using %s styles', name => {
    expect(read(`src/styles/${name}.css`)).toContain("@import './button-motion.css'");
  });
  it('covers the standalone gallery and preserves disabled, reduced-motion and jelly controls', () => {
    expect(read('beertjie.html')).toContain('/src/styles/button-motion.css');
    const css = read('src/styles/button-motion.css');
    expect(css).toContain(':not(:disabled):not([aria-disabled="true"])');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain(':focus-visible');
    expect(css).toContain(':not(#ltSessionTabs .tab)');
    expect(css).toContain('scale: .985');
    expect(css.match(/a\.lt-btn/g)).toHaveLength(5);
    const liveTiming = read('live-timing.html');
    expect(liveTiming).toMatch(/class="lt-btn lt-btn-primary"[^>]*href="\/cockpit"/);
    expect(liveTiming).toMatch(/class="lt-btn lt-btn-glass"[^>]*href="\/standings"/);
    expect(liveTiming).toMatch(/class="lt-btn lt-btn-glass lt-btn-icon"/);
  });
});
