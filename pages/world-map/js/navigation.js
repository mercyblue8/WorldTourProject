(() => {
  const app = window.WorldTour = window.WorldTour || {};

  app.createContinentNavigation = (root = document, navigate = href => window.location.assign(href)) => {
    const svg = root.querySelector('.world-map__regions');
    const frame = root.querySelector('.world-map__frame');
    const arrival = root.querySelector('.continent-arrival');
    const status = root.querySelector('.navigation-status');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = [];
    let destination = null;
    let selected = null;
    let timer;
    let navigated = false;

    function on(target, name, handler) {
      target.addEventListener(name, handler);
      listeners.push(() => target.removeEventListener(name, handler));
    }

    function reset() {
      clearTimeout(timer);
      destination = null;
      navigated = false;
      document.body.classList.remove('continent-entering');
      selected?.classList.remove('is-selected');
      svg.removeAttribute('aria-busy');
      status.textContent = '';
    }

    function finish() {
      if (!destination || navigated) return;
      navigated = true;
      clearTimeout(timer);
      navigate(destination);
    }

    function activate(path) {
      if (destination) return;
      destination = path.getAttribute('data-destination');
      selected = path;
      const box = path.getBBox();
      const bounds = frame.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      const x = (box.x + box.width / 2) / view.width;
      const y = (box.y + box.height / 2) / view.height;
      frame.style.setProperty('--zoom-origin', `${x * 100}% ${y * 100}%`);
      frame.style.setProperty('--zoom-x', `${window.innerWidth / 2 - (bounds.left + bounds.width * x)}px`);
      frame.style.setProperty('--zoom-y', `${window.innerHeight / 2 - (bounds.top + bounds.height * y)}px`);
      selected.classList.add('is-selected');
      svg.setAttribute('aria-busy', 'true');
      status.textContent = '아시아 지도로 이동합니다.';
      document.body.classList.add('continent-entering');
      timer = setTimeout(finish, reduced.matches ? 250 : 1750);
    }

    on(svg, 'click', event => {
      const path = event.target.closest('.continent[data-destination]');
      if (path) activate(path);
    });
    on(svg, 'keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const path = event.target.closest('.continent[data-destination]');
      if (!path) return;
      event.preventDefault();
      activate(path);
    });
    on(arrival, 'animationend', event => {
      if (event.target === arrival && event.animationName === 'continent-reveal') finish();
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && destination && !navigated) {
        reset();
        selected?.focus({ preventScroll: true });
      }
    });
    on(window, 'pagehide', reset);
    on(window, 'pageshow', reset);

    return {
      destroy() { reset(); listeners.forEach(remove => remove()); },
    };
  };
})();
