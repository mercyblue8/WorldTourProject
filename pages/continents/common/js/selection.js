(() => {
  const app = window.WorldTour = window.WorldTour || {};
  const namespace = 'http://www.w3.org/2000/svg';

  app.createCountrySelection = (data, root = document, { onActivate = () => false } = {}) => {
    const svg = root.querySelector('.country-regions');
    const info = root.querySelector('.country-info');
    const name = root.querySelector('.country-info__name');
    const state = root.querySelector('.country-info__state');
    const announcement = root.querySelector('.country-announcement');
    const countries = new Map(data.countries.map(country => [country.id, country]));
    const nodes = new Map();
    const listeners = [];
    let selected = null;

    function element(tag, attributes) {
      const node = document.createElementNS(namespace, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      return node;
    }

    svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
    const regions = data.countries.map(country => {
      const group = element('g', {
        class: 'country-region', 'data-country': country.id,
        tabindex: '0', role: 'button', 'aria-pressed': 'false',
        'aria-label': `${country.name} · ${country.label}`,
      });
      if (country.marker) {
        const [cx, cy] = country.marker;
        group.append(
          element('circle', { class: 'country-marker-hit', cx, cy, r: 5 }),
          element('circle', { class: 'country-marker', cx, cy, r: 2.5 }),
        );
      } else {
        group.append(element('path', { class: 'country-shape', d: country.path }));
      }
      nodes.set(country.id, group);
      return group;
    });
    svg.replaceChildren(...regions);

    function show(id) {
      const country = countries.get(id);
      info.hidden = !country;
      name.textContent = country ? `${country.name} · ${country.label}` : '';
      state.textContent = country ? (id === selected ? '선택됨' : '클릭하여 선택') : '';
    }

    function choose(id) {
      if (id && onActivate(countries.get(id), nodes.get(id))) return;
      if (selected) nodes.get(selected).setAttribute('aria-pressed', 'false');
      selected = id === selected ? null : id;
      if (selected) nodes.get(selected).setAttribute('aria-pressed', 'true');
      show(selected);
      announcement.textContent = selected ? `${countries.get(selected).name} 선택됨` : '국가 선택이 해제되었습니다.';
    }

    function getCountry(event) {
      return event.target.closest('[data-country]')?.getAttribute('data-country');
    }

    function on(name, handler) {
      svg.addEventListener(name, handler);
      listeners.push(() => svg.removeEventListener(name, handler));
    }
    on('pointerover', event => show(getCountry(event) || selected));
    on('pointerleave', () => show(selected));
    on('focusin', event => show(getCountry(event) || selected));
    on('focusout', () => show(selected));
    on('click', event => {
      const id = getCountry(event);
      if (id) choose(id);
      else if (selected) choose(selected);
    });
    on('keydown', event => {
      const id = getCountry(event);
      if ((event.key === 'Enter' || event.key === ' ') && id) {
        event.preventDefault();
        choose(id);
      } else if (event.key === 'Escape' && selected) {
        choose(selected);
      }
    });

    return {
      get selectedCountry() { return selected; },
      destroy() {
        listeners.forEach(remove => remove());
        svg.replaceChildren();
        selected = null;
        show(null);
      },
    };
  };
})();
