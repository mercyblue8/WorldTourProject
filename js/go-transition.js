(() => {
  const go = document.querySelector('.go-button');
  const film = document.querySelector('.loading-film');
  const scene = document.querySelector('.loading-scene');
  const back = document.querySelector('.transition-back');
  const dashboard = document.querySelector('.dashboard');
  const status = document.querySelector('.transition-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function restore() {
    timers.forEach(clearTimeout); timers = [];
    film.pause();
    document.body.classList.remove('entering', 'film-visible', 'film-ready');
    scene.setAttribute('aria-hidden', 'true');
    back.tabIndex = -1;
    dashboard.inert = false;
    go.disabled = false;
    go.textContent = 'GO';
    busy = false;
    status.hidden = true;
    go.focus({ preventScroll: true });
  }

  go.addEventListener('click', async () => {
    if (busy) return;
    busy = true; go.disabled = true; go.textContent = '…';
    status.hidden = true;
    try {
      film.currentTime = 0;
      // Start from the user gesture; reveal only after playback is ready.
      await film.play();
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
      restore();
      status.textContent = '영상을 재생하지 못했어요. GO를 눌러 다시 시도해 주세요.';
      status.hidden = false;
    }
  });
  film.addEventListener('ended', () => {
    back.textContent = '다시 보기 ↺';
    document.body.classList.add('film-ready');
  });
  film.addEventListener('error', () => {
    if (!busy) return;
    restore();
    status.textContent = '영상을 불러오지 못했어요. 파일 또는 지원 형식을 확인해 주세요.';
    status.hidden = false;
  });
  back.addEventListener('click', () => {
    restore(); back.textContent = '처음으로 ↺';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && busy) restore();
  });
})();

