/** JellyRadio-style spring motion for the existing Live Timing session tabs. */
const SWELL = 0.2;
const BARGE = 6;
const SHRINK = 0.05;
const STIFFNESS = 580;
const BOUNCE = 0.25;
const STAGGER = 22;
const DURATION = 750;

// Unit step response of a damped spring. x/y use different mass and damping,
// which produces the characteristic squash-and-stretch rather than a zoom.
export function springProgress(seconds: number, stiffness: number, mass: number, bounce: number): number {
  if (seconds <= 0) return 0;
  const zeta = Math.min(0.999, Math.max(0.05, 1 - bounce));
  const omega = Math.sqrt(stiffness / mass);
  const root = Math.sqrt(1 - zeta * zeta);
  const damped = omega * root;
  return 1 - Math.exp(-zeta * omega * seconds) * (Math.cos(damped * seconds) + zeta / root * Math.sin(damped * seconds));
}
type Pose = { x: number; sx: number; sy: number };
const transform = (p: Pose) => `translateX(${p.x}px) scale(${p.sx}, ${p.sy})`;

export function createSessionJelly(group: HTMLElement | null) {
  let selected = '';
  let animations = new WeakMap<HTMLButtonElement, Animation>();
  const buttons = () => Array.from(group?.querySelectorAll<HTMLButtonElement>('[data-session-key]') || []);
  function sync(instant = false): void {
    if (!group) return;
    const items = buttons();
    const at = items.findIndex(b => b.classList.contains('active'));
    if (at < 0) return;
    const key = items[at].dataset.sessionKey || '';
    if (!instant && selected === key) return;
    selected = key;
    const maxWidth = Math.max(...items.map(b => b.offsetWidth));
    group.style.setProperty('--jr-pad-x', `${Math.ceil(maxWidth * SWELL * 1.3 / 2 + BARGE) + 2}px`);
    const push = items[at].offsetWidth * SWELL / 2 + BARGE;
    const rtl = getComputedStyle(group).direction === 'rtl';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    items.forEach((button, i) => {
      const far = Math.abs(i - at);
      const scale = i === at ? 1 + SWELL : 1 - SHRINK;
      const target: Pose = { x: Math.sign(i - at) * (rtl ? -1 : 1) * push, sx: scale, sy: scale };
      let from: Pose = { x: 0, sx: 1, sy: 1 };
      try {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(button).transform);
        from = { x: matrix.m41, sx: matrix.m11, sy: matrix.m22 };
      } catch { /* no matrix API: start from a neutral pose */ }
      const previous = animations.get(button);
      const inFlight = previous?.playState === 'running' || previous?.pending === true;
      previous?.cancel();
      button.style.transform = transform(target);
      if (instant || reduced || typeof button.animate !== 'function') return;
      const k = STIFFNESS * (1 - .12 * Math.min(far, 3));
      const lerp = (start: number, end: number, p: number) => start + (end - start) * p;
      const frames = Array.from({ length: 46 }, (_, j) => {
        const t = DURATION * j / 45 / 1000;
        return { transform: transform({
          x: lerp(from.x, target.x, springProgress(t, k, .9, BOUNCE)),
          sx: lerp(from.sx, target.sx, springProgress(t, k * 1.24, .8, BOUNCE + .3)),
          sy: lerp(from.sy, target.sy, springProgress(t - .05, k * .86, .95, BOUNCE)),
        }) };
      });
      // Settle exactly at the target, even on browsers that round the samples.
      frames[frames.length - 1].transform = transform(target);
      const animation = button.animate(frames, { duration: DURATION, delay: inFlight ? 0 : far * STAGGER, fill: 'both', easing: 'linear' });
      animations.set(button, animation);
      animation.onfinish = () => { if (animations.get(button) === animation) { animation.cancel(); animations.delete(button); } };
    });
  }
  if (group && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => sync(true)).observe(group);
  document.fonts?.ready.then(() => sync(true));
  return { sync };
}
