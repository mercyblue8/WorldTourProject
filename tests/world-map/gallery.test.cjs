const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const node = (dataset = {}) => ({
    dataset, events: {}, attributes: {}, style: {}, children: [],
    classList: { add() {}, remove() {} },
    addEventListener(type, fn) { this.events[type] = fn; },
    removeEventListener(type) { delete this.events[type]; },
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    cloneNode() { return node(this.dataset); },
    prepend(child) { this.children.unshift(child); },
    append(...children) { this.children.push(...children); },
    remove() {},
    closest(selector) { return selector === '[data-direction]' && this.dataset.direction ? this : null; },
    getBoundingClientRect: () => ({ width: 400 }),
    setPointerCapture() {}, hasPointerCapture: () => false,
  });
  const gallery = node(), viewport = node(), track = node();
  track.children = [node({ index: '0' }), node({ index: '1' })];
  const dots = [node(), node()], status = node();
  gallery.querySelector = selector => ({ '.photo-gallery__viewport': viewport, '.photo-gallery__track': track, '.photo-gallery__status': status })[selector];
  gallery.querySelectorAll = () => dots;
  const window = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/gallery.js'), 'utf8'), {
    window, matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ columnGap: '40px' }),
    ResizeObserver: class { observe() {} disconnect() {} }, setTimeout, clearTimeout,
  });
  const controller = window.WorldTour.createPhotoGallery(gallery);
  const move = direction => gallery.events.click({ target: node({ direction: String(direction) }) });
  return { controller, gallery, viewport, track, dots, status, move };
}

test('gallery cycles in both directions and marks the current photo', () => {
  const s = setup();
  assert.equal(s.track.children.length, 5);
  assert.equal(s.controller.index, 0);
  s.move(1);
  assert.equal(s.controller.index, 1);
  assert.equal(s.dots[1].attributes['aria-current'], 'true');
  assert.equal(s.dots[0].attributes['aria-current'], undefined);
  assert.equal(s.status.textContent, '사진 2 / 2');
  s.move(1);
  assert.equal(s.controller.index, 0);
  assert.equal(s.track.style.transform, 'translateX(-440px)');
  s.move(-1);
  assert.equal(s.controller.index, 1);
  s.controller.destroy();
});

test('keyboard and horizontal gestures navigate while vertical scrolling is preserved', () => {
  const s = setup();
  s.gallery.events.keydown({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(s.controller.index, 1);
  const down = { button: 0, pointerId: 1, clientX: 200, clientY: 100 };
  s.viewport.events.pointerdown(down);
  s.viewport.events.pointermove({ pointerId: 1, clientX: 195, clientY: 180 });
  s.viewport.events.pointerup({ type: 'pointerup', pointerId: 1 });
  assert.equal(s.controller.index, 1);
  s.viewport.events.pointerdown(down);
  s.viewport.events.pointermove({ pointerId: 1, clientX: 80, clientY: 100 });
  s.viewport.events.pointerup({ type: 'pointerup', pointerId: 1 });
  assert.equal(s.controller.index, 0);
  s.controller.destroy();
});
