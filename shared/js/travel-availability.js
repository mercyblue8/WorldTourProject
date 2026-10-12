(() => {
  const app = window.WorldTour = window.WorldTour || {};
  const config = () => app.travelAvailabilityConfig || {};
  const hasRoute = destination => typeof destination?.href === 'string' && destination.href.trim().length > 0;
  app.travelAvailability = {
    continent(id, destination = app.continentPages?.[id]) {
      const entry = config().continents?.[id];
      return { label: entry?.label || id, available: entry?.available === true && hasRoute(destination) };
    },
    country(id, destination, continentId) {
      const entry = config().countries?.[id];
      const parent = config().continents?.[entry?.continent || continentId];
      return { label: entry?.label || id,
        available: parent?.available === true && entry?.available === true && hasRoute(destination) };
    },
    message(label, available) {
      const last = label.charCodeAt(label.length - 1) - 0xac00;
      const particle = last >= 0 && last <= 11171 && last % 28 !== 0 ? '은' : '는';
      return `현재 ${label}${particle} 여행하실 수 ${available ? '있습니다' : '없습니다'}.`;
    },
  };
})();
