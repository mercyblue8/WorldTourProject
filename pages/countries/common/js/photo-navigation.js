(() => {
  const app = window.WorldTour = window.WorldTour || {};
  // The viewport's direct children are the cards; no country-specific selectors.
  app.createPhotoNavigation = (viewport, controls, { duration = 650 } = {}) => {
    if (!viewport || !controls) return;
    const previous = controls.querySelector('[data-direction="prev"]');
    const next = controls.querySelector('[data-direction="next"]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = null;
    let destination = viewport.scrollLeft;
    const cancel = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      destination = viewport.scrollLeft;
    };
    const maximum = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const sync = () => {
      const max = maximum();
      controls.hidden = max <= 1;
      previous.disabled = viewport.scrollLeft <= 1;
      next.disabled = viewport.scrollLeft >= max - 1;
    };
    const move = direction => {
      const card = viewport.firstElementChild;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(viewport).columnGap) || 0;
      const step = card.getBoundingClientRect().width + gap;
      const left = Math.max(0, Math.min(maximum(), (frame !== null ? destination : viewport.scrollLeft) + direction * step));
      cancel();
      destination = left;
      const from = viewport.scrollLeft;
      if (reduced.matches || duration <= 0 || Math.abs(left - from) < 1) {
        viewport.scrollLeft = left;
        sync();
        return;
      }
      const started = performance.now();
      const tick = now => {
        const progress = Math.min(1, Math.max(0, (now - started) / duration));
        // Gentle acceleration followed by a gradual stop, without bounce.
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        viewport.scrollLeft = from + (left - from) * eased;
        sync();
        if (progress < 1) frame = requestAnimationFrame(tick);
        else frame = null;
      };
      frame = requestAnimationFrame(tick);
    };
    const backward = () => { if (!previous.disabled) move(-1); };
    const forward = () => { if (!next.disabled) move(1); };
    previous.addEventListener('click', backward);
    next.addEventListener('click', forward);
    viewport.addEventListener('scroll', sync, { passive: true });
    const interruptEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
    interruptEvents.forEach(event => viewport.addEventListener(event, cancel, { passive: true }));
    window.addEventListener('pagehide', cancel);
    window.addEventListener('pageshow', sync);
    const resize = new ResizeObserver(() => { cancel(); sync(); });
    resize.observe(viewport);
    Array.from(viewport.children).forEach(card => resize.observe(card));
    sync();
    return {
      refresh: sync,
      destroy() {
        cancel();
        resize.disconnect();
        previous.removeEventListener('click', backward);
        next.removeEventListener('click', forward);
        viewport.removeEventListener('scroll', sync);
        interruptEvents.forEach(event => viewport.removeEventListener(event, cancel));
        window.removeEventListener('pagehide', cancel);
        window.removeEventListener('pageshow', sync);
      },
    };
  };
})();
