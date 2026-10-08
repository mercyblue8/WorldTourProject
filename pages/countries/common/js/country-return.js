(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.createCountryReturn = (config, navigate = href => window.location.assign(href)) => {
    const back = document.querySelector('.country-back');
    const content = document.querySelector('main');
    if (!back) return;
    back.textContent = 'Return';
    back.href = config.parentHref;
    const overlay = document.createElement('div');
    overlay.className = 'country-return-preview';
    overlay.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.alt = '';
    image.src = config.parentMapImage;
    overlay.append(image);
    document.body.append(overlay);
    const ready = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const originalInert = content.inert;
    const listeners = [];
    let busy = false, navigated = false, generation = 0, timer;
    const on = (target, name, handler) => {
      target.addEventListener(name, handler);
      listeners.push(() => target.removeEventListener(name, handler));
    };
    const reset = () => {
      generation++;
      clearTimeout(timer);
      busy = navigated = false;
      content.inert = originalInert;
      back.removeAttribute('aria-disabled');
      document.body.classList.remove('country-returning');
    };
    const finish = () => {
      if (!busy || navigated) return;
      navigated = true;
      clearTimeout(timer);
      navigate(config.parentHref);
    };
    on(back, 'click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (busy) return;
      busy = true;
      back.setAttribute('aria-disabled', 'true');
      const current = ++generation;
      ready.then(() => {
        if (current !== generation) return;
        content.inert = true;
        document.body.classList.add('country-returning');
        timer = setTimeout(finish, reduced.matches ? 300 : 1100);
      });
    });
    on(overlay, 'animationend', event => {
      if (event.target === overlay && event.animationName === 'country-return-reveal') finish();
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && busy && !navigated) {
        reset();
        back.focus({ preventScroll: true });
      }
    });
    // Preserve the completed map preview until the destination replaces it.
    on(window, 'pagehide', () => { if (!navigated) reset(); });
    on(window, 'pageshow', reset);
    return { destroy() { reset(); listeners.forEach(remove => remove()); overlay.remove(); } };
  };
})();
