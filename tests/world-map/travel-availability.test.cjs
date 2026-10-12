const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const load = (context, file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const node = () => ({ attributes: {}, events: {}, children: [],
  setAttribute(k, v) { this.attributes[k] = String(v); },
  getAttribute(k) { return this.attributes[k]; },
  addEventListener(k, fn) { this.events[k] = fn; },
  removeEventListener(k) { delete this.events[k]; },
  replaceChildren(...children) { this.children = children; },
  append(...children) { this.children.push(...children); },
});
function setup() {
  const window = node();
  const context = vm.createContext({ window });
  for (const file of ['shared/data/travel-availability.js', 'shared/js/travel-availability.js', 'shared/data/continents.js']) load(context, file);
  return { context, window, app: window.WorldTour };
}

test('availability requires configuration and a route, and respects the parent continent', () => {
  const { app } = setup();
  const service = app.travelAvailability;
  assert.equal(service.continent('asia').available, true);
  assert.equal(service.continent('europe', { href: 'europe.html' }).available, false);
  app.travelAvailabilityConfig.continents.europe.available = true;
  assert.equal(service.continent('europe').available, false);
  assert.equal(service.continent('europe', { href: 'europe.html' }).available, true);
  assert.equal(service.continent('missing').available, false);
  assert.equal(service.country('JP', { href: 'japan.html' }).available, true);
  assert.equal(service.country('JP').available, false);
  assert.equal(service.country('KR', { href: 'korea.html' }).available, false);
  assert.equal(service.country('missing', { href: 'unknown.html' }, 'asia').available, false);
  app.travelAvailabilityConfig.continents.asia.available = false;
  assert.equal(service.country('JP', { href: 'japan.html' }).available, false);
  assert.equal(service.message('아시아', true), '현재 아시아는 여행하실 수 있습니다.');
  assert.equal(service.message('유럽', false), '현재 유럽은 여행하실 수 없습니다.');
});

test('world map renders config states and hover/focus notices clear and clean up', () => {
  const { context, window, app } = setup();
  const svg = node(), notice = node();
  const document = { querySelector: s => s === '.world-map__regions' ? svg : notice,
    createElementNS: () => { const n = node(); n.closest = () => n; return n; } };
  context.document = document;
  load(context, 'pages/world-map/data/continents.js');
  load(context, 'pages/world-map/js/availability.js');
  load(context, 'pages/world-map/js/main.js');
  const asia = svg.children.find(n => n.getAttribute('id') === 'asia');
  const europe = svg.children.find(n => n.getAttribute('id') === 'europe');
  assert.equal(asia.getAttribute('data-travel-available'), 'true');
  assert.equal(europe.getAttribute('aria-disabled'), 'true');
  assert.equal(europe.getAttribute('data-destination'), undefined);
  svg.events.pointerover({ target: asia });
  assert.equal(notice.textContent, '현재 아시아는 여행하실 수 있습니다.');
  svg.events.pointerover({ target: europe });
  assert.equal(notice.textContent, '현재 유럽은 여행하실 수 없습니다.');
  svg.events.pointerout({ relatedTarget: null });
  assert.equal(notice.hidden, true);
  svg.events.focusin({ target: asia });
  svg.events.pointerleave();
  assert.equal(notice.hidden, false);
  svg.events.focusout({ relatedTarget: null });
  assert.equal(notice.hidden, true);
  svg.events.click({ target: europe });
  assert.equal(notice.hidden, false);
  window.events.pageshow();
  assert.equal(notice.hidden, true);
  app.worldMapAvailability.destroy();
  assert.equal(Object.keys(svg.events).length, 0);
  assert.equal(Object.keys(window.events).length, 0);
  app.travelAvailabilityConfig.continents.asia.available = false;
  app.initWorldMap();
  assert.equal(svg.children.find(n => n.getAttribute('id') === 'asia').getAttribute('data-destination'), undefined);
});

test('unavailable country clicks and keyboard activation cannot invoke navigation', () => {
  const { context, app } = setup();
  const fields = Object.fromEntries(['.country-regions', '.country-info', '.country-info__name', '.country-info__state', '.country-announcement'].map(s => [s, node()]));
  context.document = { querySelector: s => fields[s], createElementNS: () => {
    const n = node(); n.closest = () => n; return n;
  } };
  load(context, 'pages/continents/asia/data/countries.js');
  load(context, 'pages/continents/common/js/selection.js');
  const visits = [];
  app.createCountrySelection(app.asia.countries, context.document, {
    getAvailability: country => app.travelAvailability.country(country.id, { href: 'country.html' }, 'asia'),
    onActivate: country => { visits.push(country.id); return true; },
  });
  assert.equal(Object.keys(app.travelAvailabilityConfig.countries).length, app.asia.countries.countries.length);
  const svg = fields['.country-regions'];
  const kr = svg.children.find(n => n.getAttribute('data-country') === 'KR');
  const jp = svg.children.find(n => n.getAttribute('data-country') === 'JP');
  assert.equal(kr.getAttribute('aria-disabled'), 'true');
  svg.events.click({ target: kr });
  svg.events.keydown({ target: kr, key: 'Enter', preventDefault() {} });
  assert.deepEqual(visits, []);
  assert.match(fields['.country-announcement'].textContent, /여행하실 수 없습니다/);
  svg.events.click({ target: jp });
  assert.deepEqual(visits, ['JP']);
});
