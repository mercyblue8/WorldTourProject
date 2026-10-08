const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false) {
  const element = () => ({
    events: {}, attributes: {},
    addEventListener(name, fn) { this.events[name] = fn; },
    removeEventListener(name) { delete this.events[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    focus() { this.focused = true; },
    classList: { add() { }, remove() { } },
  });
  const back = element(), overlay = element(), frame = element();
  const styles = {};
  frame.style = { setProperty: (key, value) => styles[key] = value };
  frame.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1672, height: 941 });
  const nodes = { '.continent-page__back': back, '.world-return': overlay, '.world-return__frame': frame };
  const document = { ...element(), body: element(), querySelector: selector => nodes[selector] };
  const window = { ...element(), innerWidth: 1672, innerHeight: 941 };
  const timers = new Map();
  let id = 0;
  const visits = [];
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/continents/common/js/return-transition.js'), 'utf8'), {
    document, window, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  window.WorldTour.createWorldMapReturn({ worldMapHref: '../../../selectWorldMap.html', worldMapFocus: { x: .75, y: .3 } }, href => visits.push(href));
  const click = (extra = {}) => back.events.click({ button: 0, preventDefault() { }, ...extra });
  const finish = () => frame.events.animationend({ target: frame, animationName: 'world-return-zoom' });
  return { back, frame, overlay, document, window, timers, visits, styles, click, finish };
}

test('return zoom waits for completion and prevents duplicate navigation', () => {
  const s = setup();
  s.click(); s.click();
  assert.equal(s.styles['--return-x'], '-418px');
  assert.equal(s.timers.size, 1);
  assert.deepEqual(s.visits, []);
  s.finish(); s.finish();
  assert.deepEqual(s.visits, ['../../../selectWorldMap.html']);
  assert.equal(s.timers.size, 0);
});

test('Escape and cached-page restoration cancel stale return navigation', () => {
  const s = setup();
  s.click(); s.document.events.keydown({ key: 'Escape' }); s.finish();
  assert.equal(s.visits.length, 0);
  assert.equal(s.back.focused, true);
  s.click(); s.window.events.pagehide(); s.window.events.pageshow(); s.finish();
  assert.equal(s.visits.length, 0);
  s.click(); s.finish();
  assert.equal(s.visits.length, 1);
});

test('reduced-motion fade completes without a zoom animation', () => {
  const s = setup(true);
  s.click();
  assert.equal([...s.timers.values()][0].ms, 250);
  s.overlay.events.animationend({ target: s.overlay, animationName: 'world-return-reveal' });
  assert.equal(s.visits.length, 1);
});

test('modified clicks retain normal link behavior; timer supports skipped animation events', () => {
  const s = setup();
  s.click({ ctrlKey: true, preventDefault() { assert.fail('modified link intercepted'); } });
  assert.equal(s.timers.size, 0);
  s.click();[...s.timers.values()][0].fn();
  assert.equal(s.visits.length, 1);
});
