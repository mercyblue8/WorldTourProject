(() => {
  const app = window.WorldTour = window.WorldTour || {};

  // Native dialog provides focus containment and makes the background inert.
  app.createCountryModal = (dialog, root = document) => {
    if (!dialog) return;
    const triggers = Array.from(root.querySelectorAll('[data-country-modal]'))
      .filter(trigger => trigger.getAttribute('data-country-modal') === dialog.id);
    const listeners = [];
    let opener = null;
    let saved = null;
    let backdropPressed = false;
    let closing = false;
    let closeTimer;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resetClosing = () => {
      clearTimeout(closeTimer);
      closing = false;
      dialog.classList.remove('is-closing');
    };
    const on = (target, type, handler) => {
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    };
    const restore = () => {
      if (!saved) return;
      const { x, y, styles, rootOverflowY } = saved;
      saved = null;
      Object.assign(document.body.style, styles);
      document.documentElement.style.overflowY = rootOverflowY;
      window.scrollTo({ left: x, top: y, behavior: 'instant' });
      opener?.focus({ preventScroll: true });
      opener = null;
      backdropPressed = false;
    };
    const finishClose = () => {
      resetClosing();
      if (dialog.open) dialog.close();
      restore();
    };
    const close = () => {
      if (!dialog.open || reduced.matches) { finishClose(); return; }
      if (closing) return;
      closing = true;
      dialog.classList.add('is-closing');
      // Keep the dialog modal until both the panel and backdrop have faded.
      const duration = parseFloat(getComputedStyle(dialog).getPropertyValue('--modal-exit-ms')) || 300;
      closeTimer = setTimeout(finishClose, duration + 100);
    };
    const open = trigger => {
      if (dialog.open) return;
      const style = document.body.style;
      const styles = {};
      for (const key of ['position', 'top', 'left', 'width', 'overflow']) styles[key] = style[key];
      const page = document.documentElement;
      const x = window.scrollX, y = window.scrollY;
      const rootOverflowY = page.style.overflowY;
      const hasScrollbar = page.scrollHeight > page.clientHeight;
      dialog.showModal();
      opener = trigger;
      saved = { x, y, styles, rootOverflowY };
      // Fixing the body removes its scroll height. Keep the existing scrollbar
      // track so the viewport and card layout retain their original width.
      if (hasScrollbar) page.style.overflowY = 'scroll';
      Object.assign(style, {
        position: 'fixed', top: `${-saved.y}px`, left: `${-saved.x}px`, width: '100%', overflow: 'hidden',
      });
    };
    const outside = event => {
      const box = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < box.left || event.clientX > box.right
        || event.clientY < box.top || event.clientY > box.bottom);
    };
    triggers.forEach(trigger => on(trigger, 'click', () => open(trigger)));
    dialog.querySelectorAll('[data-modal-close]').forEach(button => on(button, 'click', close));
    on(dialog, 'cancel', event => { event.preventDefault(); close(); });
    on(dialog, 'close', () => { if (!dialog.open) { resetClosing(); restore(); } });
    on(dialog, 'animationend', event => {
      if (closing && event.target === dialog && !event.pseudoElement
        && event.animationName === 'country-modal-exit') finishClose();
    });
    on(dialog, 'pointerdown', event => { backdropPressed = outside(event); });
    on(dialog, 'pointercancel', () => { backdropPressed = false; });
    on(dialog, 'click', event => {
      if (backdropPressed && outside(event)) close();
      backdropPressed = false;
    });
    on(window, 'pagehide', finishClose);
    return { close, destroy() { finishClose(); listeners.forEach(remove => remove()); } };
  };
})();
