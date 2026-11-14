import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionJelly, springProgress } from '../src/features/session-jelly';
afterEach(() => vi.unstubAllGlobals());
describe('live timing jelly session selector', () => {
  it('uses a damped spring that settles on the target', () => {
    expect(springProgress(0, 580, .9, .25)).toBe(0);
    expect(springProgress(.2, 580, .9, .25)).toBeGreaterThan(1);
    expect(springProgress(1, 580, .9, .25)).toBeCloseTo(1, 3);
  });
  it('swells the active chip, pushes neighbors and honors reduced motion', () => {
    vi.stubGlobal('document', { fonts: undefined });
    vi.stubGlobal('getComputedStyle', () => ({ direction:'ltr', transform:'none' }));
    vi.stubGlobal('matchMedia', () => ({ matches:true }));
    const make = (key:string, active:boolean) => ({ dataset:{sessionKey:key}, offsetWidth:100, classList:{contains:()=>active}, style:{transform:''}, animate:vi.fn() });
    const a=make('a',false), b=make('b',true), c=make('c',false);
    const group = { querySelectorAll:()=>[a,b,c], style:{setProperty:vi.fn()} } as unknown as HTMLElement;
    createSessionJelly(group).sync(true);
    expect(a.style.transform).toContain('translateX(-16px)');
    expect(b.style.transform).toContain('scale(1.2, 1.2)');
    expect(c.style.transform).toContain('translateX(16px)');
    expect(a.animate).not.toHaveBeenCalled();
  });
  it('animates a selection with spring keyframes and staggered neighbors', () => {
    vi.stubGlobal('document', { fonts: undefined });
    vi.stubGlobal('getComputedStyle', () => ({ direction:'ltr', transform:'none' }));
    vi.stubGlobal('matchMedia', () => ({ matches:false }));
    let selected = 'a';
    const make = (key:string) => ({ dataset:{sessionKey:key}, offsetWidth:100, classList:{contains:()=>key===selected}, style:{transform:''}, animate:vi.fn(() => ({ cancel:vi.fn(), onfinish:null, playState:'finished' })) });
    const a=make('a'), b=make('b'), c=make('c');
    const group = { querySelectorAll:()=>[a,b,c], style:{setProperty:vi.fn()} } as unknown as HTMLElement;
    const jelly = createSessionJelly(group); jelly.sync(true); selected='b'; jelly.sync();
    expect(b.animate).toHaveBeenCalledOnce();
    const [frames, options] = b.animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames.length).toBeGreaterThan(10); expect(options.delay).toBe(0);
    const [, neighbor] = a.animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(neighbor.delay).toBe(22);
  });

});
