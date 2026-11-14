import { springProgress } from './session-jelly';

/** Animate only the selected chip's visual row, so wrapped and narrow source
 * lists retain their layout and no neighbor is displaced into another row. */
export function animateSourceJelly(selected: HTMLButtonElement | null): void {
  if (!selected || !selected.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof selected.animate !== 'function') return;
  const parent = selected.parentElement;
  if (!parent) return;
  const rect = selected.getBoundingClientRect();
  const siblings = Array.from(parent.children).filter((node): node is HTMLButtonElement => node instanceof HTMLButtonElement);
  const selectedIndex = siblings.indexOf(selected);
  const sameRow = siblings.filter(button => {
    const box = button.getBoundingClientRect();
    return Math.abs((box.top + box.height / 2) - (rect.top + rect.height / 2)) < 12;
  });
  const frames = Array.from({ length: 37 }, (_, i) => {
    const t = i * .7 / 36;
    const sx = 1 + .08 * springProgress(t, 580 * 1.24, .8, .55);
    const sy = 1 + .08 * springProgress(t - .05, 580 * .86, .95, .25);
    return { scale: `${sx} ${sy}` };
  });
  frames[frames.length - 1].scale = '1.08 1.08';
  selected.animate(frames, { duration: 700, easing: 'linear' });
  for (const button of sameRow) {
    if (button === selected || button.disabled || typeof button.animate !== 'function') continue;
    const index = siblings.indexOf(button);
    const dir = index < selectedIndex ? -1 : 1;
    const distance = Math.min(Math.abs(index - selectedIndex), 3);
    const amount = 5 * dir;
    // Neighbors briefly yield, then settle back into the wrapping layout.
    button.animate([
      { translate: '0px 0px' },
      { translate: `${amount}px 0px`, offset: .22 },
      { translate: '0px 0px' },
    ], { duration: 360, delay: 22 * distance, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  }
}
