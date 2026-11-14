import { afterEach, describe, expect, it, vi } from 'vitest';
import { initStandingsNavigationMotion } from '../src/features/standings-navigation-motion';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function setup(reduced = false) {
  vi.useFakeTimers();
  let click: (e:any)=>void = () => {};
  const add = vi.fn(), remove = vi.fn(), assign = vi.fn();
  const link = { target:'', origin:'https://example.com', pathname:'/drivers/leader/', href:'https://example.com/drivers/leader/', hasAttribute:()=>false, classList:{add,remove} };
  vi.stubGlobal('window', {addEventListener:vi.fn()});
  vi.stubGlobal('document', {addEventListener: (_:string,fn:any)=>{click=fn}});
  vi.stubGlobal('location', {origin:'https://example.com',assign});
  vi.stubGlobal('matchMedia', () => ({matches:reduced}));
  initStandingsNavigationMotion();
  const event = {defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,target:{closest:()=>link},preventDefault:vi.fn()};
  return { click, event, add, assign };
}
describe('championship profile navigation', () => {
  it('animates the chosen card before navigating', () => {
    const s=setup(); s.click(s.event); expect(s.event.preventDefault).toHaveBeenCalledOnce(); expect(s.add).toHaveBeenCalledWith('is-opening-profile');
    expect(s.assign).not.toHaveBeenCalled(); vi.advanceTimersByTime(360); expect(s.assign).toHaveBeenCalledWith('https://example.com/drivers/leader/');
  });
  it('does not delay reduced-motion or modified clicks', () => {
    const s=setup(true); s.click(s.event); expect(s.event.preventDefault).not.toHaveBeenCalled();
    const t=setup(); t.event.ctrlKey=true; t.click(t.event); expect(t.event.preventDefault).not.toHaveBeenCalled();
  });
});
