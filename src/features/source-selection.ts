/** Update selected source in place so unrelated buttons and focus do not reset. */
export function syncSourceSelection(container: HTMLElement | null, index: number): void {
  container?.querySelectorAll<HTMLButtonElement>('button[data-source-index]').forEach(button => {
    const active = button.dataset.sourceIndex === String(index);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
