const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false) {
  const makeElement = () => ({
    events: {}, disabled: false, textContent: '',
    addEventListener(type, fn) { this.events[type] = fn; },
    removeEventListener(type, fn) { if (this.events[type] === fn) delete this.events[type]; },
    setAttribute() {}, focus() {}, blur() {}, pause() {},
    play: async () => {},
  });
  const elements = Object.fromEntries([
    '.go-button', '.loading-film', '.loading-scene', '.transition-back',
    '.dashboard', '.transition-status', '.map-arrival',
  ].map(name => [name, makeElement()]));
  const classes = new Set();
  const document = {
    ...makeElement(),
    querySelector: name => elements[name],
    body: { classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
    } },
  };
  const visits = [];
  const window = { ...makeElement(), location: { assign: url => visits.push(url) } };
  const timers = new Map();
  let timerID = 0;
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/landing/js/transition.js'), 'utf8'), {
    document, window, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++timerID, { fn, ms }); return timerID; },
    clearTimeout: id => timers.delete(id),
  });
  const controller = window.WorldTour.createTransition();
  return { controller, elements, classes, document, window, visits, timers,
    start: () => elements['.go-button'].events.click(),
    end: () => elements['.loading-film'].events.ended(),
    finish: () => elements['.map-arrival'].events.transitionend({
      target: elements['.map-arrival'], propertyName: 'opacity',
    }),
  };
}

test('video must end before the zoom; navigation waits for the crossfade', async () => {
  const s = setup();
  await s.start();
  assert.equal(s.classes.has('map-arriving'), false);
  assert.deepEqual(s.visits, []);
  s.end();
  assert.equal(s.classes.has('map-arriving'), true);
  assert.deepEqual(s.visits, []);
  s.finish(); s.finish();
  assert.deepEqual(s.visits, ['./selectWorldMap.html']);
  assert.equal(s.timers.size, 0);
});

test('Escape cancels pending navigation and allows another GO', async () => {
  const s = setup();
  await s.start(); s.end();
  s.document.events.keydown({ key: 'Escape' });
  s.finish();
  assert.deepEqual(s.visits, []);
  assert.equal(s.timers.size, 0);
  assert.equal(s.elements['.go-button'].disabled, false);
  await s.start(); s.end(); s.finish();
  assert.equal(s.visits.length, 1);
});

test('reduced motion uses a short fallback and still opens the map', async () => {
  const s = setup(true);
  await s.start(); s.end();
  const [timer] = s.timers.values();
  assert.equal(timer.ms, 250);
  timer.fn();
  assert.deepEqual(s.visits, ['./selectWorldMap.html']);
});

test('failed playback restores GO without navigating', async () => {
  const s = setup();
  s.elements['.loading-film'].play = async () => { throw Error('playback failed'); };
  await s.start(); s.end(); s.finish();
  assert.equal(s.elements['.go-button'].disabled, false);
  assert.equal(s.elements['.transition-status'].hidden, false);
  assert.deepEqual(s.visits, []);
});

test('cancelled pending play does not restart transitions', async () => {
  const s = setup();
  let resolvePlay;
  s.elements['.loading-film'].play = () => new Promise(resolve => { resolvePlay = resolve; });
  const started = s.start();
  s.document.events.keydown({ key: 'Escape' });
  resolvePlay(); await started;
  assert.equal(s.classes.has('entering'), false);
  assert.equal(s.timers.size, 0);
});

test('destroy resets the page and removes listeners before reinitialization', async () => {
  const s = setup();
  await s.start(); s.end(); s.finish();
  s.controller.destroy();
  assert.equal(Object.keys(s.elements['.go-button'].events).length, 0);
  assert.equal(Object.keys(s.document.events).length, 0);
  s.window.WorldTour.createTransition();
  assert.equal(Object.keys(s.elements['.go-button'].events).length, 1);
  assert.equal(s.classes.size, 0);
  assert.equal(s.elements['.go-button'].disabled, false);
});
