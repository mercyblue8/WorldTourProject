const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const window = {};
  const makeNode = () => ({
    attributes: {}, children: [], events: {}, hidden: false, textContent: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, callback) { this.events[name] = callback; },
    removeEventListener(name) { delete this.events[name]; },
    closest() { return this.attributes['data-country'] ? this : null; },
  });
  const nodes = Object.fromEntries(['.country-regions', '.country-info', '.country-info__name', '.country-info__state', '.country-announcement'].map(name => [name, makeNode()]));
  const document = { querySelector: name => nodes[name], createElementNS: () => makeNode() };
  const context = vm.createContext({ window, document });
  for (const file of ['../../pages/continents/asia/data/countries.js', '../../pages/continents/common/js/selection.js']) {
    vm.runInContext(fs.readFileSync(require.resolve(file), 'utf8'), context);
  }
  const data = window.WorldTour.asia.countries;
  const controller = window.WorldTour.createCountrySelection(data);
  const svg = nodes['.country-regions'];
  const country = id => svg.children.find(node => node.getAttribute('data-country') === id);
  return { nodes, data, controller, svg, country };
}

test('countries render as named keyboard buttons and microstates have markers', () => {
  const s = setup();
  assert.equal(s.svg.children.length, 50);
  assert.equal(new Set(s.data.countries.map(country => country.id)).size, 50);
  for (const node of s.svg.children) {
    assert.equal(node.getAttribute('role'), 'button');
    assert.equal(node.getAttribute('tabindex'), '0');
    assert.equal(node.getAttribute('aria-pressed'), 'false');
    assert.ok(node.getAttribute('aria-label'));
  }
  assert.equal(s.country('SG').children.length, 2);
  assert.equal(s.country('KR').children.length, 1);
});

test('hover previews a name; click persists selection and switches exclusively', () => {
  const s = setup();
  s.svg.events.pointerover({ target: s.country('KR') });
  assert.match(s.nodes['.country-info__name'].textContent, /대한민국/);
  assert.equal(s.controller.selectedCountry, null);
  s.svg.events.click({ target: s.country('KR') });
  s.svg.events.pointerleave();
  assert.equal(s.controller.selectedCountry, 'KR');
  assert.equal(s.country('KR').getAttribute('aria-pressed'), 'true');
  assert.equal(s.nodes['.country-info__state'].textContent, '선택됨');
  s.svg.events.click({ target: s.country('JP') });
  assert.equal(s.country('KR').getAttribute('aria-pressed'), 'false');
  assert.equal(s.country('JP').getAttribute('aria-pressed'), 'true');
  s.svg.events.click({ target: s.country('JP') });
  assert.equal(s.controller.selectedCountry, null);
  assert.equal(s.nodes['.country-info'].hidden, true);
});

test('keyboard, Escape, sea click and cleanup clear selection correctly', () => {
  const s = setup();
  s.svg.events.keydown({ target: s.country('CN'), key: 'Enter', preventDefault() {} });
  assert.equal(s.controller.selectedCountry, 'CN');
  s.svg.events.keydown({ target: s.country('CN'), key: 'Escape' });
  assert.equal(s.controller.selectedCountry, null);
  s.svg.events.keydown({ target: s.country('SG'), key: ' ', preventDefault() {} });
  assert.equal(s.controller.selectedCountry, 'SG');
  s.svg.events.click({ target: s.svg });
  assert.equal(s.controller.selectedCountry, null);
  s.controller.destroy();
  assert.equal(s.svg.children.length, 0);
  assert.equal(Object.keys(s.svg.events).length, 0);
});

function contains(path, x, y) {
  let winding = 0;
  for (const loop of path.split('Z')) {
    const points = [...loop.matchAll(/(\d+),(\d+)/g)].map(match => [+match[1], +match[2]]);
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      const cross = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
      if (ay <= y && by > y && cross > 0) winding++;
      if (ay > y && by <= y && cross < 0) winding--;
    }
  }
  return winding !== 0;
}

test('representative country coordinates hit exactly one area and ocean is excluded', () => {
  const { data } = setup();
  const cases = [[1130,400,'KR'],[1232,380,'JP'],[940,400,'CN'],[900,180,'RU'],
    [680,550,'IN'],[600,250,'KZ'],[890,315,'MN'],[1091,513,'TW'],[704,663,'LK'],
    [750,650,null],[1300,550,null],[300,700,null]];
  for (const [x,y,expected] of cases) {
    const hits = Array.from(data.countries).filter(country => country.path && contains(country.path,x,y)).map(country => country.id);
    assert.deepEqual(hits, expected ? [expected] : [], `${x},${y}`);
  }
});
