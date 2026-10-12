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
      const destination = app.continentPages?.[region.id];
      const availability = app.travelAvailability?.continent(region.id, destination);
      if (availability) {
        attributes['data-travel-available'] = String(availability.available);
        attributes['data-travel-label'] = availability.label;
        attributes['aria-label'] = app.travelAvailability.message(availability.label, availability.available);
        attributes['aria-disabled'] = String(!availability.available);
        attributes.role = 'button';
      }
      if (destination && (!availability || availability.available)) {
        attributes.role = 'link';
        attributes['aria-label'] = `${availability?.label || destination.label} — 대륙 지도 열기`;
        attributes['data-destination'] = destination.href;
      }
      Object.entries(attributes).forEach(([name, value]) => path.setAttribute(name, value));
      return path;
    });
    svg.replaceChildren(...regions);
    app.worldMapNavigation?.destroy();
    app.worldMapAvailability?.destroy();
    if (app.createContinentNavigation) app.worldMapNavigation = app.createContinentNavigation(root);
    if (app.createContinentAvailability) app.worldMapAvailability = app.createContinentAvailability(root);
  };

  app.initWorldMap();
})();
