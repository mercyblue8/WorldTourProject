(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.createContinentAvailability = (root = document) => {
    const svg = root.querySelector('.world-map__regions');
    const notice = root.querySelector('.travel-availability-status');
    if (!svg || !notice) return;
    const listeners = [];
    let hovered = null;
    let focused = null;
    const region = target => target?.closest?.('.continent') || null;
    const show = () => {
      const node = hovered || focused;
      notice.textContent = node ? app.travelAvailability.message(
        node.getAttribute('data-travel-label'), node.getAttribute('data-travel-available') === 'true') : '';
      notice.hidden = !node;
      notice.setAttribute('data-travel-available', node?.getAttribute('data-travel-available') || 'false');
    };
    const on = (target, name, handler) => {
      target.addEventListener(name, handler);
      listeners.push(() => target.removeEventListener(name, handler));
    };
    on(svg, 'pointerover', event => { hovered = region(event.target); show(); });
    on(svg, 'pointerout', event => { hovered = region(event.relatedTarget); show(); });
    on(svg, 'pointerleave', () => { hovered = null; show(); });
    on(svg, 'focusin', event => { focused = region(event.target); show(); });
    on(svg, 'focusout', event => { focused = region(event.relatedTarget); show(); });
    on(svg, 'click', event => { hovered = region(event.target); show(); });
    const reset = () => { hovered = focused = null; show(); };
    on(window, 'pagehide', reset);
    on(window, 'pageshow', reset);
    reset();
    return { destroy() { listeners.forEach(remove => remove()); reset(); } };
  };
})();
