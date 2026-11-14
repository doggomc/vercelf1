import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindIslandHover } from '../src/features/island-hover';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('session island motion', () => {
  it('opens only on deliberate hover and delays closing, cancelling on re-entry', () => {
    vi.useFakeTimers(); vi.stubGlobal('window', globalThis);
    const listeners: Record<string, (event: {pointerType:string}) => void> = {};
    const classes = new Set<string>();
    const link = { addEventListener: (type:string, fn:any) => { listeners[type] = fn; }, classList: { add:(v:string)=>classes.add(v), remove:(v:string)=>classes.delete(v) } } as unknown as HTMLElement;
    let cancel = () => {};
    const close = () => { cancel(); link.classList.remove('is-expanded'); };
    cancel = bindIslandHover(link, close);
    expect(classes.has('is-expanded')).toBe(false);
    listeners.pointerenter({pointerType:'touch'}); expect(classes.has('is-expanded')).toBe(false);
    listeners.pointerenter({pointerType:'mouse'}); expect(classes.has('is-expanded')).toBe(true);
    listeners.pointerleave({pointerType:'mouse'}); vi.advanceTimersByTime(150);
    listeners.pointerenter({pointerType:'mouse'}); vi.advanceTimersByTime(500);
    expect(classes.has('is-expanded')).toBe(true);
    listeners.pointerleave({pointerType:'mouse'}); vi.advanceTimersByTime(240);
    expect(classes.has('is-expanded')).toBe(false);
  });
  it('animates the mobile position and respects reduced motion', () => {
    const css = readFileSync(new URL('../src/styles/session-island.css', import.meta.url), 'utf8');
    expect(css).toContain('transform .46s cubic-bezier');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.si-bar > span { transition: none !important; }');
    expect(css).not.toContain('.session-island:hover');
  });
});
