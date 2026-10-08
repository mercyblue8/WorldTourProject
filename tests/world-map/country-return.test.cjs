const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false) {
  const node = () => ({ events: {}, children: [], attrs: {}, inert: false,
    addEventListener(k, fn) { this.events[k] = fn; }, removeEventListener(k) { delete this.events[k]; },
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    append(child) { this.children.push(child); }, remove() {}, focus() {} });
  const back = node(), main = node(), body = node(), window = node();
  const classes = new Set(); body.classList = { add: k => classes.add(k), remove: k => classes.delete(k) };
  const document = { ...node(), body, createElement: node, querySelector: s => s === 'main' ? main : back };
  const timers = new Map(), visits = []; let id = 0;
  const context = vm.createContext({ window, document, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, {fn, ms}); return id; }, clearTimeout: i => timers.delete(i) });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/country-return.js'), 'utf8'), context);
  window.WorldTour.createCountryReturn({ parentHref: '/asia', parentMapImage: '/map.png' }, href => visits.push(href));
  const overlay = body.children[0];
  const click = (extra = {}) => back.events.click({button: 0, preventDefault() {}, ...extra});
  const finish = () => overlay.events.animationend({target: overlay, animationName: 'country-return-reveal'});
  return { back, main, document, window, classes, timers, visits, click, finish };
}

test('Return waits for fade, navigates once, preserves preview and resets on cached return', async () => {
  const s = setup();
  assert.equal(s.back.textContent, 'Return');
  s.click(); s.click(); await Promise.resolve();
  assert.equal(s.main.inert, true);
  assert.equal(s.visits.length, 0);
  s.finish(); s.finish();
  assert.deepEqual(s.visits, ['/asia']);
  s.window.events.pagehide();
  assert.equal(s.classes.has('country-returning'), true);
  s.window.events.pageshow();
  assert.equal(s.classes.has('country-returning'), false);
  assert.equal(s.main.inert, false);
});

test('modified click stays native; Escape cancels pending start; reduced motion has a fallback', async () => {
  const s = setup(true);
  s.click({ctrlKey: true}); await Promise.resolve();
  assert.equal(s.timers.size, 0);
  s.click(); s.document.events.keydown({key: 'Escape'}); await Promise.resolve();
  assert.equal(s.timers.size, 0);
  s.click(); await Promise.resolve();
  const timer = [...s.timers.values()][0];
  assert.equal(timer.ms, 300);
  timer.fn();
  assert.deepEqual(s.visits, ['/asia']);
});
