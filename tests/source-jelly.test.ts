import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { animateSourceJelly } from '../src/features/source-jelly';
afterEach(() => vi.unstubAllGlobals());
describe('source jelly controls', () => {
  it('animates the selected chip and only the neighboring chips on the same row', () => {
    class Button {
      isConnected = true; disabled = false; parentElement: any; top = 0;
      animate = vi.fn(); getBoundingClientRect() { return { top:this.top, height:36 }; }
    }
    vi.stubGlobal('HTMLButtonElement', Button);
    vi.stubGlobal('matchMedia', () => ({ matches:false }));
    const a=new Button(), b=new Button(), c=new Button(); c.top=80;
    const parent={children:[a,b,c]}; a.parentElement=b.parentElement=c.parentElement=parent;
    animateSourceJelly(b as unknown as HTMLButtonElement);
    expect(b.animate).toHaveBeenCalledOnce(); expect(a.animate).toHaveBeenCalledOnce(); expect(c.animate).not.toHaveBeenCalled();
    expect((b.animate.mock.calls[0] as any)[0].at(-1)).toEqual({scale:'1.08 1.08'});
  });
  it('does not animate when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches:true }));
    const button={isConnected:true, animate:vi.fn()};
    animateSourceJelly(button as unknown as HTMLButtonElement);
    expect(button.animate).not.toHaveBeenCalled();
  });
  it('connects the animation to both cockpit source selectors', () => {
    const read = (p:string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
    expect(read('src/app.ts')).toContain('bounceSelectedSource(click.detail === 0)');
    expect(read('src/pages/replay-cockpit.ts')).toMatch(/display\('session',\s*click\.detail\s*===\s*0\)/);
    expect(read('src/pages/replay-cockpit.ts')).toMatch(/display\('feed',\s*click\.detail\s*===\s*0\)/);
    const css = read('src/styles/source-jelly.css');
    expect(css).toContain('#links > button.chip.active');
    expect(css).toContain('.replay-buttons button[aria-pressed="true"]');
    expect(css).toContain('.src-pill-tag.is-4k { background: #facc15; color: #392800; }');
    expect(css).toContain('.src-pill-tag.is-stripped { background: #b6ead6; color: #07513a; }');
  });
});
