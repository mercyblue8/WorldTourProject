(() => {
  const config = window.WorldTour.asia.config;
  document.title = config.title;
  document.querySelector('.continent-page__back').setAttribute('href', config.worldMapHref);
  window.WorldTour.createWorldMapReturn(config);
  const navigation = window.WorldTour.createCountryNavigation(window.WorldTour.asia.destinations);
  window.WorldTour.createCountrySelection(window.WorldTour.asia.countries, document, {
    onActivate: (country, node) => navigation.activate(country.id, node),
  });
})();
