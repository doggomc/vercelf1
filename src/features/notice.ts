import '../styles/outage.css';
import '../styles/notice.css';

/** A native modal gives the notice keyboard focus management and Escape-to-close. */
export function showNotice(key: string): void {
  try { if (localStorage.getItem(key) === 'seen') return; } catch { try { if (sessionStorage.getItem(key) === 'seen') return; } catch { /* storage unavailable */ } }
  if (document.getElementById('strippedNotice')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'strippedNotice';
  dialog.className = 'notice-dialog';
  dialog.setAttribute('aria-labelledby', 'strippedNoticeTitle');
  dialog.setAttribute('aria-describedby', 'strippedNoticeCopy');
  dialog.innerHTML = `<div class="outage-card notice-card">
    <h1 class="outage-title" id="strippedNoticeTitle">Notice</h1>
    <p class="outage-lead">Stripped streams disabled until further notice.</p>
    <p class="outage-copy" id="strippedNoticeCopy">We've been experiencing issues with the bandwidth and request limits of free providers. We make 0 revenue from the site and can't keep the site running with the stripped streams.</p>
    <div class="outage-actions">
      <a class="outage-btn outage-btn-primary" href="https://discord.gg/KYXHCAzhN4" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 2.9c-.2.4-.4.9-.6 1.3a18.3 18.3 0 0 0-5.5 0c-.2-.4-.4-.9-.6-1.3A19.7 19.7 0 0 0 3.7 4.4C.5 9-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3c.5-.6.9-1.3 1.2-2-.7-.2-1.3-.5-1.9-.9l.4-.3c3.9 1.8 8.2 1.8 12.1 0l.4.3c-.6.4-1.2.7-1.9.9.4.7.8 1.4 1.2 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.3-13.7zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg><span>Discord</span></a>
      <button class="outage-btn notice-close" type="button" autofocus>Close</button>
    </div>
  </div>`;
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.querySelector('button')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.remove(); if (previouslyFocused?.isConnected) previouslyFocused.focus(); }, { once: true });
  document.body.appendChild(dialog);
  try {
    dialog.showModal();
    try { localStorage.setItem(key, 'seen'); } catch { try { sessionStorage.setItem(key, 'seen'); } catch { /* no persistence available */ } }
  } catch { dialog.remove(); }
}
