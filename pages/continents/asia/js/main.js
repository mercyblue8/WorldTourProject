(() => {
  const config = window.WorldTour.asia.config;
  document.title = config.title;
  document.querySelector('.continent-page__back').setAttribute('href', config.worldMapHref);
  window.WorldTour.createWorldMapReturn(config);
  const navigation = window.WorldTour.createCountryNavigation(window.WorldTour.asia.destinations);
  const selection = window.WorldTour.createCountrySelection(window.WorldTour.asia.countries, document, {
    getAvailability: country => window.WorldTour.travelAvailability.country(country.id, window.WorldTour.asia.destinations[country.id], 'asia'),
    onActivate: (country, node) => navigation.activate(country.id, node),
  });
  window.WorldTour.createCountrySearch(window.WorldTour.asia.countries.countries, {
    aliases: config.searchAliases,
    onResults: ids => selection.highlightCountries(ids),
  });
})();
