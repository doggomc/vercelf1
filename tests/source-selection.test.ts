import { describe, expect, it, vi } from 'vitest';
import { syncSourceSelection } from '../src/features/source-selection';

describe('cockpit source selection', () => {
  it('updates selection in place without recreating buttons', () => {
    const make = (index: string) => ({ dataset:{sourceIndex:index}, classList:{toggle:vi.fn()}, setAttribute:vi.fn() });
    const a = make('0'), b = make('1');
    const container = {querySelectorAll: () => [a, b]} as unknown as HTMLElement;
    syncSourceSelection(container, 1);
    expect(a.classList.toggle).toHaveBeenCalledWith('active', false);
    expect(b.classList.toggle).toHaveBeenCalledWith('active', true);
    expect(b.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
    syncSourceSelection(container, 0);
    expect(a.classList.toggle).toHaveBeenLastCalledWith('active', true);
  });
});
