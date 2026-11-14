import { afterEach, describe, expect, it, vi } from 'vitest';
import { timingChangeMotion } from '../src/features/timing-change-motion';
afterEach(() => vi.unstubAllGlobals());
describe('timing value motion', () => {
  it('animates updates and cancels a previous animation on the same element', () => {
    vi.stubGlobal('document', {hidden:false}); vi.stubGlobal('matchMedia', () => ({matches:false}));
    const cancel = vi.fn(); const animate = vi.fn(() => ({cancel}));
    const el = {animate} as unknown as Element;
    timingChangeMotion(el); timingChangeMotion(el);
    expect(animate).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledOnce();
  });
  it('does nothing for initial paint, hidden tabs or reduced motion', () => {
    const animate = vi.fn(); const el = {animate} as unknown as Element;
    vi.stubGlobal('document', {hidden:false}); vi.stubGlobal('matchMedia', () => ({matches:true}));
    timingChangeMotion(el); timingChangeMotion(el,false);
    vi.stubGlobal('document', {hidden:true}); timingChangeMotion(el);
    expect(animate).not.toHaveBeenCalled();
  });
});
