import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Run the production tab-rendering and SignalR-update blocks with a small DOM mock.
function setup() {
  const source = readFileSync(new URL('../src/pages/live-timing.ts', import.meta.url), 'utf8');
  const tabsCode = source.slice(source.indexOf("let sessionTabsSignature = ''"), source.indexOf("$('ltSessionTabs')?.addEventListener"));
  const updateCode = source.slice(source.indexOf('let f1PaintScheduled = false;'), source.indexOf("f1Client.addEventListener('status'"));
  const buttons: any[] = [];
  const tabs = {
    get childElementCount() { return buttons.length; },
    set innerHTML(html: string) {
      buttons.length = 0;
      for (const match of html.matchAll(/<button class="tab ([^"]*)"[^>]*aria-selected="([^"]*)" data-session-key="([^"]*)"/g)) {
        const button: any = { dataset: { sessionKey: match[3] }, selected: match[2], active: match[1].includes('active') };
        button.classList = { toggle: (_: string, active: boolean) => { button.active = active; } };
        button.setAttribute = (_: string, value: string) => { button.selected = value; };
        buttons.push(button);
      }
    },
    querySelectorAll: () => buttons,
  };
  const bar = { hidden: true };
  const handlers: Record<string, () => void> = {};
  const f1Client = { state: { SessionInfo: {}, live: false }, addEventListener: (name: string, fn: () => void) => { handlers[name] = fn; } };
  const context: any = { f1Client, weekendSessions: [{ session_key: 1, session_name: 'Practice' }, { session_key: 2, session_name: 'Race' }], pinnedSessionKey: 2, activeSnap: null,
    $: (id: string) => id === 'ltSessionsBar' ? bar : tabs,
    snapshotFromF1State: (state: any) => ({ isLive: state.live }), esc: (s: string) => s,
    paintSnapshot: (snap: unknown) => { context.activeSnap = snap; }, window: { setTimeout: (fn: () => void) => fn() },
  };
  runInNewContext(ts.transpile(tabsCode + '\n' + updateCode, { target: ts.ScriptTarget.ES2022 }) + '\nglobalThis.renderTabs = renderSessionTabs;', context);
  return { context, handlers, buttons, bar };
}

describe('live timing initial tab selection', () => {
  it('keeps the selected OpenF1 session when a non-live SignalR update arrives during initial loading', () => {
    const { context, handlers, buttons } = setup();
    context.renderTabs(2);
    expect(buttons.map(b => b.active)).toEqual([false, true]);
    handlers.update();
    expect(buttons.map(b => b.active)).toEqual([false, true]);
    expect(buttons[1].selected).toBe('true');
    expect(context.activeSnap).toBeNull();
  });
  it('selects live when appropriate and keeps it selected after the live session ends', () => {
    const { context, handlers, buttons } = setup();
    context.pinnedSessionKey = null; context.f1Client.state.live = true;
    handlers.update();
    expect(context.pinnedSessionKey).toBe('live');
    expect(buttons.map(b => b.active)).toEqual([true, false, false]);
    context.f1Client.state.live = false; handlers.update();
    expect(buttons.map(b => b.active)).toEqual([true, false, false]);
  });
});
