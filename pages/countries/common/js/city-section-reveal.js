(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.initCitySectionReveal = (root = document) => {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const groups = new Map();
    root.querySelectorAll('.city-section').forEach(section => {
      const photos = section.querySelector('[data-city-section-cards]');
      if (!photos) return;
      groups.set(photos, section.querySelectorAll('.city-section__title, .country-photo-card'));
    });
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Reveal the title with the full row, including horizontally clipped cards.
        groups.get(entry.target)?.forEach(item => item.classList.remove('is-pending'));
        // Once revealed, scrolling back never hides the photos again.
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.15 });
    groups.forEach((items, photos) => {
      items.forEach(item => item.classList.add('is-pending'));
      observer.observe(photos);
    });
    return { destroy() {
      observer.disconnect();
      groups.forEach(items => items.forEach(item => item.classList.remove('is-pending')));
    } };
  };
})();
