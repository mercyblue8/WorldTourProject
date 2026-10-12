const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('numbered pages stop at the last photo with earlier photos visible and follow manual scrolling', () => {
  const node = () => ({ events: {}, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(k, fn) { this.events[k] = fn; },
    removeEventListener(k) { delete this.events[k]; } });
  const previous = node(), next = node(), window = node();
  const pageButtons = Array.from({ length: 5 }, node);
  const cards = Array.from({ length: 5 }, () => ({ getBoundingClientRect: () => ({ width: 340 }) }));
  const viewport = { ...node(), scrollLeft: 0, scrollWidth: 1780, clientWidth: 788,
    firstElementChild: cards[0], children: cards };
  const controls = { querySelector: s => s.includes('prev') ? previous : next };
  const context = vm.createContext({ window, matchMedia: () => ({ matches: true }),
    getComputedStyle: () => ({ columnGap: '20px' }), ResizeObserver: class { observe() {} disconnect() {} } });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/photo-navigation.js'), 'utf8'), context);
  const controller = window.WorldTour.createPhotoNavigation(viewport, controls, { pageButtons });
  const current = () => pageButtons.findIndex(button => button.attrs['aria-current'] === 'true');
  assert.equal(current(), 0);
  for (let index = 0; index < 5; index++) {
    pageButtons[index].events.click();
    assert.equal(current(), index);
    assert.equal(viewport.scrollLeft, index * 248);
    // The selected photo is fully visible at every stop.
    assert.ok(index * 360 >= viewport.scrollLeft);
    assert.ok(index * 360 + 340 <= viewport.scrollLeft + viewport.clientWidth);
  }
  pageButtons[4].events.click();
  assert.equal(viewport.scrollLeft, 992);
  assert.equal(viewport.scrollLeft + viewport.clientWidth, viewport.scrollWidth);
  assert.equal(current(), 4);
  assert.equal(next.disabled, true);
  previous.events.click();
  assert.equal(current(), 3);
  viewport.scrollLeft = 370;
  viewport.events.scroll();
  assert.equal(current(), 1);
  next.events.click();
  assert.equal(viewport.scrollLeft, 496);
  assert.equal(current(), 2);
  assert.equal(pageButtons.filter(button => button.attrs['aria-current'] === 'true').length, 1);
  controller.destroy();
  assert.ok(pageButtons.every(button => !button.events.click));
});

test('timed motion eases, accumulates clicks, reverses, and yields to manual input', () => {
  const node = () => ({ events: {}, addEventListener(k, fn) { this.events[k] = fn; }, removeEventListener(k) { delete this.events[k]; } });
  const previous = node(), next = node(), window = node();
  const card = { getBoundingClientRect: () => ({ width: 400 }) };
  const viewport = { ...node(), scrollLeft: 0, scrollWidth: 3000, clientWidth: 1000, firstElementChild: card, children: [card] };
  const controls = { querySelector: s => s.includes('prev') ? previous : next };
  let now = 0, id = 0;
  const frames = new Map();
  const advance = time => { now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); };
  const context = vm.createContext({ window, matchMedia: () => ({ matches: false }),
    performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key),
    getComputedStyle: () => ({ columnGap: '88px' }), ResizeObserver: class { observe() {} disconnect() {} } });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/photo-navigation.js'), 'utf8'), context);
  window.WorldTour.createPhotoNavigation(viewport, controls);
  next.events.click();
  advance(162.5);
  assert.equal(viewport.scrollLeft, 30.5);
  next.events.click();
  advance(812.5);
  assert.equal(viewport.scrollLeft, 976);
  previous.events.click();
  advance(1462.5);
  assert.equal(viewport.scrollLeft, 488);
  next.events.click();
  advance(1600);
  viewport.events.wheel();
  const stopped = viewport.scrollLeft;
  advance(2300);
  assert.equal(viewport.scrollLeft, stopped);
  assert.equal(frames.size, 0);
});

test('shared photo buttons clamp to edges, follow manual scrolling and resize, and clean up', () => {
  const node = () => ({ events: {}, addEventListener(k, fn) { this.events[k] = fn; }, removeEventListener(k) { delete this.events[k]; } });
  const previous = node(), next = node(), window = node();
  const controls = { querySelector: s => s.includes('prev') ? previous : next };
  const card = { getBoundingClientRect: () => ({ width: 400 }) };
  const viewport = { ...node(), scrollLeft: 0, scrollWidth: 2104, clientWidth: 1920,
    firstElementChild: card, children: [card],
    scrollTo(options) { this.last = options; this.scrollLeft = options.left; this.events.scroll(); } };
  let resize, disconnected = false;
  const context = vm.createContext({ window, matchMedia: () => ({ matches: true }),
    getComputedStyle: () => ({ columnGap: '88px' }),
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() { disconnected = true; } } });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/photo-navigation.js'), 'utf8'), context);
  const controller = window.WorldTour.createPhotoNavigation(viewport, controls);
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);
  next.events.click();
  assert.equal(viewport.scrollLeft, 184);
  assert.equal(next.disabled, true);
  previous.events.click();
  assert.equal(viewport.scrollLeft, 0);
  viewport.scrollLeft = 100; viewport.events.scroll();
  assert.equal(previous.disabled, false);
  viewport.clientWidth = 2400; resize();
  assert.equal(controls.hidden, true);
  controller.destroy();
  assert.equal(disconnected, true);
  assert.equal(Object.keys(next.events).length, 0);
});
