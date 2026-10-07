(() => {
  const config = window.WorldTour.asia.config;
  document.title = config.title;
  document.querySelector('.continent-page__back').setAttribute('href', config.worldMapHref);
  window.WorldTour.createWorldMapReturn(config);
})();
