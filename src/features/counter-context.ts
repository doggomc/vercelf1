type CounterContext = { kind: 'live' | 'replay' | 'other'; key: string; label: string } | null;
let context: CounterContext = null;
let socket: WebSocket | null = null;
let lastSent = '';
function send(): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const payload = context ? JSON.stringify({ type: 'context', ...context }) : JSON.stringify({ type: 'clear' });
  if (payload !== lastSent) { socket.send(payload); lastSent = payload; }
}
export function setCounterContext(value: CounterContext): void {
  if (JSON.stringify(value) === JSON.stringify(context)) return;
  context = value; send();
}
export function attachCounterSocket(value: WebSocket): void {
  socket = value; lastSent = ''; if (context) send();
}
