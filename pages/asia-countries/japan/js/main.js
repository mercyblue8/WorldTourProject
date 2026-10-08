(() => {
  const config = window.WorldTour.japan;
  document.title = config.title;
  document.querySelector('.country-back').setAttribute('href', config.parentHref);
  const hero = document.querySelector('.tokyo-hero__image');
  // Start the lettering only after the destination's hero is ready to paint.
  const ready = hero.decode ? hero.decode().catch(() => {}) : Promise.resolve();
  ready.then(() => window.WorldTour.playJapanIntro());
  window.WorldTour.initJapanPhotoReveal();
  window.WorldTour.createPhotoNavigation(
    document.querySelector('.japan-photos'),
    document.querySelector('.photo-navigation')
  );
})();
