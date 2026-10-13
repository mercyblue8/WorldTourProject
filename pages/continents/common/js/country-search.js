(() => {
  const app = window.WorldTour = window.WorldTour || {};
  // Country data and highlighting are supplied by each continent page.
  app.createCountrySearch = (countries, { root = document, aliases = {}, onResults = () => {} } = {}) => {
    const form = root.querySelector('.country-search');
    const input = form.querySelector('.country-search__input');
    const status = form.querySelector('.country-search__status');
    const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    const entries = countries.map(country => ({ country,
      terms: [country.name, country.label, country.id, ...(aliases[country.id] || [])]
        .filter(Boolean).map(normalize),
    }));
    function update() {
      const query = normalize(input.value);
      const exact = query ? entries.filter(entry => entry.terms.includes(query)) : [];
      const needsMoreLetters = !exact.length && /^[a-z]+$/.test(query) && query.length < 3;
      const matches = !query || needsMoreLetters ? [] : exact.length ? exact
        : entries.filter(entry => entry.terms.some(term => term.includes(query)));
      onResults(matches.map(entry => entry.country.id));
      status.textContent = !query ? '' : needsMoreLetters ? '영문 부분 검색은 3글자 이상 입력해 주세요.' : matches.length
        ? `${matches.map(entry => entry.country.name).join(', ')} — 지도에 표시했습니다.`
        : '검색한 국가가 없습니다.';
      status.hidden = !query;
    }
    function inputChanged(event) { if (!event.isComposing) update(); }
    function submit(event) { event.preventDefault(); update(); }
    function keydown(event) {
      if (event.key === 'Escape' && !event.isComposing) {
        input.value = '';
        update();
      }
    }
    input.addEventListener('input', inputChanged);
    input.addEventListener('compositionend', update);
    input.addEventListener('keydown', keydown);
    form.addEventListener('submit', submit);
    update();
    return { destroy() {
      input.removeEventListener('input', inputChanged);
      input.removeEventListener('compositionend', update);
      input.removeEventListener('keydown', keydown);
      form.removeEventListener('submit', submit);
      onResults([]);
      status.textContent = '';
      status.hidden = true;
    } };
  };
})();
