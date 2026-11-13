import { describe, expect, it, vi } from 'vitest';
import { attachCounterSocket, setCounterContext } from '../src/features/counter-context';

describe('counter session context', () => {
  it('uses the existing socket, deduplicates changes, and clears a session', () => {
    vi.stubGlobal('WebSocket', { OPEN: 1 });
    const send = vi.fn();
    setCounterContext({ kind:'replay', key:'2026:1:f1:race', label:'Race' });
    attachCounterSocket({ readyState:1, send } as unknown as WebSocket);
    expect(JSON.parse(send.mock.calls[0][0])).toMatchObject({ type:'context', kind:'replay', label:'Race' });
    setCounterContext({ kind:'replay', key:'2026:1:f1:race', label:'Race' });
    expect(send).toHaveBeenCalledTimes(1);
    setCounterContext(null);
    expect(JSON.parse(send.mock.calls[1][0])).toEqual({ type:'clear' });
    vi.unstubAllGlobals();
  });
});
