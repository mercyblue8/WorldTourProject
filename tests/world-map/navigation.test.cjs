const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false) {
  function element() {
    return {
      events: {}, attributes: {}, classes: new Set(), focused: false,
      addEventListener(name, fn) { this.events[name] = fn; },
      removeEventListener(name) { delete this.events[name]; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      focus() { this.focused = true; },
      classList: { add() { }, remove() { } },
    };
  }
  const svg = element();
  svg.viewBox = { baseVal: { width: 1672, height: 941 } };
  const properties = {};
  const frame = {
    style: { setProperty: (name, value) => properties[name] = value },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1672, height: 941 })
  };
  const arrival = element();
  const status = { textContent: '' };
  const elements = {
    '.world-map__regions': svg, '.world-map__frame': frame,
    '.continent-arrival': arrival, '.navigation-status': status
  };
  const document = { ...element(), body: element(), querySelector: selector => elements[selector] };
  const window = { ...element(), innerWidth: 1672, innerHeight: 941 };
  const timers = new Map();
  let id = 0;
  const visits = [];
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/world-map/js/navigation.js'), 'utf8'), {
    window, document, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimeout: key => timers.delete(key),
  });
  const controller = window.WorldTour.createContinentNavigation(document, href => visits.push(href));
  const path = {
    ...element(),
    getAttribute: () => './pages/continents/asia/index.html',
    getBBox: () => ({ x: 880, y: 40, width: 660, height: 500 }),
    closest() { return this; },
  };
  const click = () => svg.events.click({ target: path });
  const finish = () => arrival.events.animationend({ target: arrival, animationName: 'continent-reveal' });
  return { svg, arrival, document, window, path, properties, visits, timers, controller, click, finish };
}

test('Asia zooms toward its center and navigates once when the reveal completes', () => {
  const s = setup();
  s.click(); s.click();
  assert.deepEqual(s.visits, []);
  assert.equal(s.timers.size, 1);
  assert.equal(s.properties['--zoom-x'], '-374px');
  assert.equal(s.properties['--zoom-y'], '180.5px');
  s.finish(); s.finish();
  assert.deepEqual(s.visits, ['./pages/continents/asia/index.html']);
  assert.equal(s.timers.size, 0);
});

test('Escape cancels navigation, restores focus and permits retry', () => {
  const s = setup();
  s.click();
  s.document.events.keydown({ key: 'Escape' });
  s.finish();
  assert.equal(s.timers.size, 0);
  assert.deepEqual(s.visits, []);
  assert.equal(s.path.focused, true);
  s.click(); s.finish();
  assert.equal(s.visits.length, 1);
});

test('keyboard activation and reduced-motion fallback reach Asia', () => {
  const s = setup(true);
  let prevented = false;
  s.svg.events.keydown({ target: s.path, key: 'Enter', preventDefault() { prevented = true; } });
  const [timer] = s.timers.values();
  assert.equal(prevented, true);
  assert.equal(timer.ms, 250);
  timer.fn();
  assert.equal(s.visits.length, 1);
});

test('other continents do not navigate; page restoration resets the transition', () => {
  const s = setup();
  s.svg.events.click({ target: { closest: () => null } });
  assert.equal(s.timers.size, 0);
  s.click();
  s.window.events.pagehide();
  s.window.events.pageshow();
  s.finish();
  assert.deepEqual(s.visits, []);
  s.click(); s.finish();
  assert.equal(s.visits.length, 1);
  s.controller.destroy();
  assert.equal(Object.keys(s.svg.events).length, 0);
});
