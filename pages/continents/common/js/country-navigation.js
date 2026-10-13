(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.createCountryNavigation = (destinations, navigate = href => window.location.assign(href)) => {
    const frame = document.querySelector('.continent-page__frame');
    const svg = document.querySelector('.country-regions');
    const overlay = document.querySelector('.country-portal');
    const back = document.querySelector('.continent-page__back');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let destination = null;
    let activeNode = null;
    let timer;
    let previewTimer;
    let navigated = false;
    let generation = 0;
    const preview = overlay.querySelector('.country-portal__image');
    const content = overlay.querySelector('.country-portal__content');
    const listeners = [];

    function clearPreview() {
      preview.hidden = true;
      preview.removeAttribute('src');
      preview.style.objectPosition = 'center';
      overlay.style.removeProperty('--preview-background');
      content.hidden = false;
    }

    function preparePreview(settings, current, start) {
      clearPreview();
      if (!settings?.src || !preview.decode) { start(); return; }
      preview.style.objectPosition = settings.position || 'center';
      overlay.style.setProperty('--preview-background', settings.background || '#101413');
      preview.src = settings.src;
      let settled = false;
      const ready = success => {
        if (settled || current !== generation || !destination) return;
        settled = true;
        clearTimeout(previewTimer);
        if (success) {
          preview.hidden = false;
          content.hidden = true;
        } else clearPreview();
        start();
      };
      // A slow or broken image must not block navigation indefinitely.
      previewTimer = setTimeout(() => ready(false), 2000);
      preview.decode().then(() => ready(true), () => ready(false));
    }

    function on(target, event, handler) {
      target.addEventListener(event, handler);
      listeners.push(() => target.removeEventListener(event, handler));
    }
    function reset() {
      generation++;
      clearTimeout(timer);
      clearTimeout(previewTimer);
      clearPreview();
      destination = null;
      navigated = false;
      document.body.classList.remove('country-entering');
      activeNode?.classList.remove('is-entering');
      svg.removeAttribute('aria-busy');
      back.inert = false;
    }
    function finish() {
      if (!destination || navigated) return;
      navigated = true;
      clearTimeout(timer);
      navigate(destination.href);
    }
    function activate(id, node) {
      if (destination) return true;
      const next = destinations[id];
      if (!next) return false;
      if (app.travelAvailability && !app.travelAvailability.country(id, next).available) return false;
      destination = next;
      activeNode = node;
      const box = node.getBBox();
      const bounds = frame.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      const x = (box.x + box.width / 2) / view.width;
      const y = (box.y + box.height / 2) / view.height;
      frame.style.setProperty('--country-origin', `${x * 100}% ${y * 100}%`);
      frame.style.setProperty('--country-x', `${window.innerWidth / 2 - (bounds.left + bounds.width * x)}px`);
      frame.style.setProperty('--country-y', `${window.innerHeight / 2 - (bounds.top + bounds.height * y)}px`);
      for (const [selector, text] of [
        ['.country-portal__title', next.title || next.name],
        ['.country-portal__name', next.name],
        ['.country-portal__eyebrow', next.eyebrow || ''],
      ]) {
        const field = overlay.querySelector(selector);
        if (field) field.textContent = text;
      }
      document.querySelector('.country-announcement').textContent = `${next.name} 페이지로 이동합니다.`;
      node.classList.add('is-entering');
      svg.setAttribute('aria-busy', 'true');
      back.inert = true;
      const current = ++generation;
      const start = () => {
        if (current !== generation || !destination) return;
        document.body.classList.add('country-entering');
        timer = setTimeout(finish, reduced.matches ? 250 : 1650);
      };
      preparePreview(next.preview, current, start);
      return true;
    }
    on(overlay, 'animationend', event => {
      if (event.target === overlay && event.animationName === 'country-portal-reveal') finish();
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && destination && !navigated) {
        reset();
        activeNode?.focus({ preventScroll: true });
      }
    });
    // Keep the final preview painted until the next document replaces this one.
    // pageshow resets it when this document is restored from the back/forward cache.
    on(window, 'pagehide', () => {
      if (navigated) clearTimeout(timer);
      else reset();
    });
    on(window, 'pageshow', reset);
    return { activate, destroy() { reset(); listeners.forEach(remove => remove()); } };
  };
})();
