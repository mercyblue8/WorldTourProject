(() => {
  const config = window.WorldTour.japan;
  document.title = config.title;
  document.querySelector('.country-back').setAttribute('href', config.parentHref);
  window.WorldTour.playJapanIntro();
  document.querySelectorAll('.photo-gallery').forEach(gallery => window.WorldTour.createPhotoGallery(gallery));
})();
