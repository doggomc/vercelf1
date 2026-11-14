/** Small feedback on changed timing values, without reflow or continuous clock animation. */
const running = new WeakMap<Element, Animation>();
export function timingChangeMotion(el: Element | null, enabled = true): void {
  if (!el || !enabled || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof el.animate !== 'function') return;
  running.get(el)?.cancel();
  const animation = el.animate([
    { opacity: .55, transform: 'translateY(3px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  running.set(el, animation);
  animation.onfinish = () => { if (running.get(el) === animation) running.delete(el); };
}
