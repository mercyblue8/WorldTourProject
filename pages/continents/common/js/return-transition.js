(() => {
  const app = window.WorldTour = window.WorldTour || {};

  app.createWorldMapReturn = (config, navigate = href => window.location.assign(href)) => {
    const back = document.querySelector('.continent-page__back');
    const overlay = document.querySelector('.world-return');
    const frame = document.querySelector('.world-return__frame');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let busy = false;
    let navigated = false;
    let timer;
    const listeners = [];

    function on(target, name, handler) {
      target.addEventListener(name, handler);
      listeners.push(() => target.removeEventListener(name, handler));
    }

    function reset() {
      clearTimeout(timer);
      busy = false;
      navigated = false;
      document.body.classList.remove('world-returning');
      back.removeAttribute('aria-disabled');
    }

    function finish() {
      if (!busy || navigated) return;
      navigated = true;
      clearTimeout(timer);
      navigate(config.worldMapHref);
    }

    on(back, 'click', event => {
      // Preserve native open-in-new-tab / modified-click behavior.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (busy) return;
      busy = true;
      const { x, y } = config.worldMapFocus;
      const bounds = frame.getBoundingClientRect();
      frame.style.setProperty('--return-origin', `${x * 100}% ${y * 100}%`);
      frame.style.setProperty('--return-x', `${window.innerWidth / 2 - (bounds.left + bounds.width * x)}px`);
      frame.style.setProperty('--return-y', `${window.innerHeight / 2 - (bounds.top + bounds.height * y)}px`);
      back.setAttribute('aria-disabled', 'true');
      document.body.classList.add('world-returning');
      timer = setTimeout(finish, reduced.matches ? 250 : 1750);
    });
    on(frame, 'animationend', event => {
      if (event.target === frame && event.animationName === 'world-return-zoom') finish();
    });
    on(overlay, 'animationend', event => {
      if (reduced.matches && event.target === overlay && event.animationName === 'world-return-reveal') finish();
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && busy && !navigated) {
        reset();
        back.focus({ preventScroll: true });
      }
    });
    on(window, 'pagehide', reset);
    on(window, 'pageshow', reset);

    return { destroy() { reset(); listeners.forEach(remove => remove()); } };
  };
})();
