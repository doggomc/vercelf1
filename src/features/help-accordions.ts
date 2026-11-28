/** Animate native disclosure widgets without sacrificing their keyboard semantics. */
export function initHelpAccordions(root: ParentNode = document): void {
  for (const details of root.querySelectorAll<HTMLDetailsElement>('.stream-guide-details details, .diagnostics-details')) {
    const summary = details.querySelector<HTMLElement>('summary');
    if (!summary) continue;
    let running: Animation | null = null;
    let targetOpen = details.open;
    let previousOverflow = '';

    summary.addEventListener('click', (event: MouseEvent) => {
      // Native behaviour remains the fallback, including for reduced motion.
      if (typeof details.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      const opening = running ? !targetOpen : !details.open;
      const start = details.getBoundingClientRect().height;
      if (running) running.cancel();
      else previousOverflow = details.style.overflow;
      targetOpen = opening;
      // Measure the full natural height with the panel open; the animation starts
      // from the previous rendered height even if the user reverses mid-flight.
      details.open = true;
      const end = opening ? details.scrollHeight + (details.offsetHeight - details.clientHeight) : summary.offsetHeight + (details.offsetHeight - details.clientHeight);
      details.style.overflow = 'hidden';
      const animation = details.animate([{height: `${start}px`}, {height: `${end}px`}], {
        duration: opening ? 320 : 260,
        easing: opening ? 'cubic-bezier(.22, 1, .36, 1)' : 'cubic-bezier(.4, 0, .2, 1)',
      });
      running = animation;
      animation.finished.then(() => {
        if (running !== animation) return;
        details.open = targetOpen;
        details.style.overflow = previousOverflow;
        running = null;
      }).catch(() => { /* A quick second click replaced this animation. */ });
    });
  }
}
