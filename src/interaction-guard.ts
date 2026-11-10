import { initNotice } from './features/notice-loader';
initNotice();
/* Best-effort deterrent only: browser source and DevTools remain accessible. */
(() => {
  const editable = (target: EventTarget | null): boolean =>
    target instanceof Element && !!target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])');

  document.addEventListener('contextmenu', event => {
    if (!editable(event.target)) event.preventDefault();
  }, true);
  document.addEventListener('copy', event => {
    if (!editable(event.target)) event.preventDefault();
  }, true);
  document.addEventListener('dragstart', event => {
    if (!editable(event.target)) event.preventDefault();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'F12' && event.keyCode !== 123) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();

export {};
