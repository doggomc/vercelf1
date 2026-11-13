import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('counter page classification', () => {
  it.each([['home', false, 'home'], ['private-cockpit', true, 'replay-cockpit']])('sends one page category only when the server supports it', async (page, replay, expected) => {
    const source: any = { hidden:true, dataset:{}, getAttribute:()=> 'true', setAttribute:vi.fn() };
    const count: any = { textContent:'' }; let socket: any;
    vi.stubGlobal('document', { body:{dataset:{page},classList:{contains:()=>replay}}, querySelector:()=>({content:'wss://freef1-viewer-counter.calvinbotha1julie.workers.dev/ws'}), getElementById:(id:string)=>id==='viewerCounter'?source:count });
    vi.stubGlobal('window', {location:{href:'https://freef1-live.vercel.app'}, addEventListener:vi.fn(), setTimeout, clearTimeout});
    class Socket {
      static CONNECTING=0; static OPEN=1; static CLOSING=2; readyState=1; events:Record<string, Function>={}; send=vi.fn();
      constructor(){ socket=this; } addEventListener(name:string, fn:Function){this.events[name]=fn;}
    }
    vi.stubGlobal('WebSocket', Socket);
    await import('../src/viewer-counter');
    socket.events.message({data:JSON.stringify({type:'count',count:2})});
    expect(socket.send).not.toHaveBeenCalled();
    socket.events.message({data:JSON.stringify({type:'capabilities',pages:true,contexts:false})});
    expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({type:'page',page:expected});
  });
});
