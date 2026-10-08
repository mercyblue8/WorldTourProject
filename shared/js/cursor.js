(() => {
  const root = document.documentElement;
  const reset = () => root.removeAttribute('data-cursor-state');
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (event.target.closest('button:disabled, [aria-disabled="true"]')) return;
    root.setAttribute('data-cursor-state', 'pressed');
  }, true);
  document.addEventListener('dragstart', () => root.setAttribute('data-cursor-state', 'drag'));
  for (const event of ['pointerup', 'pointercancel', 'dragend', 'drop']) {
    document.addEventListener(event, reset, true);
  }
  for (const event of ['blur', 'pagehide', 'pageshow']) window.addEventListener(event, reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
