(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.playJapanIntro = async () => {
    const title = document.querySelector('.japan-intro');
    if (!title || title.dataset.played) return;
    title.dataset.played = 'true';
    let cancelled = false;
    let timer;
    const hide = () => {
      cancelled = true;
      title.hidden = true;
      clearTimeout(timer);
      title.removeEventListener('animationend', ended);
      window.removeEventListener('pagehide', hide);
    };
    const ended = event => {
      if (event.target === title && event.animationName === 'japan-intro-exit') hide();
    };
    window.addEventListener('pagehide', hide);
    // Wait for the bundled font so letters don't change shape during the reveal.
    let fontTimeout;
    try {
      await Promise.race([
        document.fonts.load('500 180px "Abhaya Libre"'),
        new Promise(resolve => { fontTimeout = setTimeout(resolve, 2500); }),
      ]);
    } catch {
      // The serif fallback still completes the one-time introduction.
    } finally {
      clearTimeout(fontTimeout);
    }
    if (cancelled) return;
    const letters = Array.from(title.textContent);
    title.replaceChildren(...letters.map((letter, index) => {
      const span = document.createElement('span');
      span.className = 'japan-intro__letter';
      span.textContent = letter;
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--letter', index);
      return span;
    }));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 1600 : 250 + (letters.length - 1) * 110 + 800 + 600;
    title.style.setProperty('--exit-delay', `${delay}ms`);
    title.addEventListener('animationend', ended);
    title.hidden = false;
    timer = setTimeout(hide, delay + 900);
  };
})();
