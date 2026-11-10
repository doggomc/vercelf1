const NOTICE_KEY = 'freef1_notice_stripped_streams_v1';
let started = false;
/** Check before loading the optional popup, so returning visitors fetch nothing for it. */
export function initNotice(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  try { if (localStorage.getItem(NOTICE_KEY) === 'seen') return; } catch { try { if (sessionStorage.getItem(NOTICE_KEY) === 'seen') return; } catch { /* storage unavailable */ } }
  void import('./notice').then(m => m.showNotice(NOTICE_KEY)).catch(() => { started = false; });
}
