const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false) {
  const node = () => ({
    events: {}, attributes: {}, classList: { add() {}, remove() {} },
    addEventListener(name, fn) { this.events[name] = fn; },
    removeEventListener(name) { delete this.events[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    focus() { this.focused = true; },
  });
  const fields = {};
  const overlay = { ...node(), querySelector: name => fields[name] ||= {} };
  const frame = { style: { setProperty() {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1672, height: 941 }) };
  const svg = { ...node(), viewBox: { baseVal: { width: 1672, height: 941 } } };
  const back = node();
  const elements = { '.continent-page__frame': frame, '.country-regions': svg, '.country-portal': overlay, '.continent-page__back': back, '.country-announcement': {} };
  const document = { ...node(), body: node(), querySelector: name => elements[name] };
  const window = { ...node(), innerWidth: 1672, innerHeight: 941 };
  const timers = new Map(); let id = 0;
  const visits = [];
  const context = vm.createContext({ window, document, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; }, clearTimeout: key => timers.delete(key) });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/continents/common/js/country-navigation.js'), 'utf8'), context);
  const controller = window.WorldTour.createCountryNavigation({ JP: { href: '../../asia-countries/japan/index.html', title: 'Japan', name: '일본', eyebrow: 'ASIA / JAPAN' } }, href => visits.push(href));
  const japan = { ...node(), getBBox: () => ({ x: 1150, y: 300, width: 110, height: 182 }) };
  const finish = () => overlay.events.animationend({ target: overlay, animationName: 'country-portal-reveal' });
  return { controller, japan, finish, visits, timers, document, window, back, fields };
}

test('Japan starts a single zoom navigation; other countries retain selection', () => {
  const s = setup();
  assert.equal(s.controller.activate('KR', s.japan), false);
  assert.equal(s.controller.activate('JP', s.japan), true);
  s.controller.activate('JP', s.japan);
  assert.equal(s.timers.size, 1);
  assert.equal(s.back.inert, true);
  assert.equal(s.fields['.country-hero__title'].textContent, 'Japan');
  assert.deepEqual(s.visits, []);
  s.finish(); s.finish();
  assert.deepEqual(s.visits, ['../../asia-countries/japan/index.html']);
});

test('Escape cancels country navigation and restores controls; cached restoration permits retry', () => {
  const s = setup();
  s.controller.activate('JP', s.japan);
  s.document.events.keydown({ key: 'Escape' }); s.finish();
  assert.equal(s.visits.length, 0);
  assert.equal(s.back.inert, false);
  assert.equal(s.japan.focused, true);
  s.controller.activate('JP', s.japan);
  s.window.events.pagehide(); s.window.events.pageshow(); s.finish();
  assert.equal(s.visits.length, 0);
  s.controller.activate('JP', s.japan); s.finish();
  assert.equal(s.visits.length, 1);
});

test('reduced motion fallback navigates and destroy removes pending work', () => {
  const s = setup(true);
  s.controller.activate('JP', s.japan);
  const [timer] = s.timers.values();
  assert.equal(timer.ms, 250);
  timer.fn();
  assert.equal(s.visits.length, 1);
  s.controller.destroy();
  assert.equal(s.timers.size, 0);
});
