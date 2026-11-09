import { afterEach, describe, expect, it, vi } from 'vitest';

describe('page interaction guard', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('blocks page copying, context menus, dragging and F12 while keeping editing usable', async () => {
    const handlers: Record<string, (event: any) => void> = {};
    class FakeElement {
      constructor(private isEditable = false) {}
      closest() { return this.isEditable ? this : null; }
    }
    vi.stubGlobal('Element', FakeElement);
    vi.stubGlobal('document', { addEventListener: (type: string, fn: (event: any) => void) => { handlers[type] = fn; } });
    await import('../src/interaction-guard');
    for (const type of ['copy', 'contextmenu', 'dragstart']) {
      const preventDefault = vi.fn();
      handlers[type]({ target: new FakeElement(), preventDefault });
      expect(preventDefault).toHaveBeenCalledOnce();
      preventDefault.mockClear();
      handlers[type]({ target: new FakeElement(true), preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
    }
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    handlers.keydown({ key: 'F12', preventDefault, stopImmediatePropagation });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
    preventDefault.mockClear();
    handlers.keydown({ key: 'F5', preventDefault, stopImmediatePropagation });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
