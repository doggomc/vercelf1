/** Pointer grace keeps an expanding capsule from flickering at its moving edge. */
export function bindIslandHover(link: HTMLElement, close: () => void): () => void {
  let timer: number | undefined;
  const cancel = () => { window.clearTimeout(timer); timer = undefined; };
  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    cancel(); link.classList.add('is-expanded');
  });
  link.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    cancel(); timer = window.setTimeout(close, 240);
  });
  return cancel;
}
