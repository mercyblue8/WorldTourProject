(() => {
  const app = window.WorldTour;
  let background;
  let transition;

  function resumeBackground() {
    if (!document.hidden && !transition?.isBusy) void background?.play();
  }

  function init() {
    if (background) return;
    background = app.createBackgroundVideo([...document.querySelectorAll('.background-video')]);
    transition = app.createTransition({
      onStart: () => background.pause(),
      onRestore: resumeBackground,
    });
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('pointerdown', resumeBackground);
    document.addEventListener('keydown', resumeBackground);
    resumeBackground();
  }

  function handleVisibility() {
    if (document.hidden) background?.pause();
    else resumeBackground();
  }

  function destroy() {
    document.removeEventListener('visibilitychange', handleVisibility);
    document.removeEventListener('pointerdown', resumeBackground);
    document.removeEventListener('keydown', resumeBackground);
    transition?.destroy();
    background?.destroy();
    transition = null;
    background = null;
  }

  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', init);
  init();
})();
