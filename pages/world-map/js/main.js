(() => {
  const app = window.WorldTour = window.WorldTour || {};
  const svgNamespace = 'http://www.w3.org/2000/svg';

  app.initWorldMap = (root = document) => {
    const svg = root.querySelector('.world-map__regions');
    const data = app.continents;
    if (!svg || !data) return;
    svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
    const regions = data.regions.map(region => {
      const path = document.createElementNS(svgNamespace, 'path');
      const attributes = {
        class: 'continent', id: region.id, tabindex: '0', role: 'img',
        'aria-label': region.label, d: region.path,
      };
      Object.entries(attributes).forEach(([name, value]) => path.setAttribute(name, value));
      return path;
    });
    svg.replaceChildren(...regions);
  };

  app.initWorldMap();
})();
