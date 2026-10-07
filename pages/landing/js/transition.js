(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.createTransition = ({ onStart = () => {}, onRestore = () => {},
    navigate = url => window.location.assign(url) } = {}) => {
    const go = document.querySelector('.go-button');
    const film = document.querySelector('.loading-film');
    const scene = document.querySelector('.loading-scene');
    const back = document.querySelector('.transition-back');
    const dashboard = document.querySelector('.dashboard');
    const status = document.querySelector('.transition-status');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const arrival = document.querySelector('.map-arrival');
    const listeners = [];
    function on(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    }
    let busy = false;
    let arriving = false;
    let attempt = 0;
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    function restore({ resume = true, focus = true } = {}) {
      attempt += 1;
      timers.forEach(clearTimeout); timers = [];
      film.pause();
      document.body.classList.remove('entering', 'film-visible', 'film-ready', 'map-arriving');
      scene.setAttribute('aria-hidden', 'true');
      back.tabIndex = -1;
      dashboard.inert = false;
      go.disabled = false;
      go.textContent = 'GO';
      busy = false;
      arriving = false;
      status.hidden = true;
      if (focus) go.focus({ preventScroll: true });
      if (resume) onRestore();
    }

    on(go, 'click', async () => {
      if (busy) return;
      const currentAttempt = ++attempt;
      busy = true; go.disabled = true; go.textContent = '…';
      onStart();
      status.hidden = true;
      try {
        film.currentTime = 0;
        // Start from the user gesture; reveal only after playback is ready.
        await film.play();
        if (!busy || currentAttempt !== attempt) return;
        document.body.classList.add('entering');
        dashboard.inert = true;
        later(() => {
          scene.setAttribute('aria-hidden', 'false');
          document.body.classList.add('film-visible');
        }, reduced.matches ? 0 : 550);
        later(() => {
          document.body.classList.add('film-ready');
          back.tabIndex = 0;
          back.focus({ preventScroll: true });
        }, reduced.matches ? 180 : 1950);
      } catch {
        if (currentAttempt !== attempt) return;
        restore();
        status.textContent = '영상을 재생하지 못했어요. GO를 눌러 다시 시도해 주세요.';
        status.hidden = false;
      }
    });
    function openMap() {
      if (!arriving) return;
      arriving = false;
      timers.forEach(clearTimeout); timers = [];
      navigate('./selectWorldMap.html');
    }

    on(film, 'ended', () => {
      if (!busy || arriving) return;
      timers.forEach(clearTimeout); timers = [];
      arriving = true;
      back.tabIndex = -1;
      back.blur();
      document.body.classList.add('map-arriving');
      // Navigate after the preview reaches the destination page's exact framing.
      // The timer also handles browsers that skip transitionend in background tabs.
      later(openMap, reduced.matches ? 250 : 1400);
    });
    on(arrival, 'transitionend', event => {
      if (event.target === arrival && event.propertyName === 'opacity') openMap();
    });
    on(film, 'error', () => {
      if (!busy) return;
      restore();
      status.textContent = '영상을 불러오지 못했어요. 파일 또는 지원 형식을 확인해 주세요.';
      status.hidden = false;
    });
    on(back, 'click', () => {
      restore(); back.textContent = '처음으로 ↺';
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && busy) restore();
    });
    return {
      get isBusy() { return busy; },
      destroy() {
        listeners.forEach(remove => remove());
        restore({ resume: false, focus: false });
      },
    };
  };
})();

