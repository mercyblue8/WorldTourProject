(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.initJapanPhotoReveal = () => {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const photos = document.querySelector('.japan-photos');
    if (!photos) return;
    const items = photos.querySelectorAll('.japan-photos__item');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Reveal the entire row, including cards clipped by horizontal overflow.
        items.forEach(item => item.classList.remove('is-pending'));
        // Once revealed, scrolling back never hides the photos again.
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.15 });
    items.forEach(item => {
      item.classList.add('is-pending');
    });
    observer.observe(photos);
  };
})();
