(() => {
  const config = window.WorldTour.japan;
  document.title = config.title;
  document.querySelector('.country-back').setAttribute('href', config.parentHref);
})();
