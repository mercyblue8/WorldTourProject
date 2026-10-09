const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = true) {
  const node = () => ({
    events: new Map(),
    addEventListener(type, handler) {
      if (!this.events.has(type)) this.events.set(type, new Set());
      this.events.get(type).add(handler);
    },
    removeEventListener(type, handler) { this.events.get(type)?.delete(handler); },
    emit(type, event = {}) { this.events.get(type)?.forEach(handler => handler(event)); },
  });
  let focused = 0;
  const trigger = { ...node(), getAttribute: () => 'place', focus: () => focused++ };
  const other = { ...node(), getAttribute: () => 'other' };
  const button = node();
  const classes = new Set();
  const dialog = {
    ...node(), id: 'place', open: false,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    showModal() { this.open = true; },
    close() { this.open = false; this.emit('close'); },
    querySelectorAll: () => [button],
    getBoundingClientRect: () => ({ left: 100, right: 800, top: 50, bottom: 700 }),
  };
  const style = { position: '', top: '', left: '', width: '90%', overflow: '' };
  const page = { style: { overflowY: 'auto' }, scrollHeight: 2000, clientHeight: 900 };
  const document = { body: { style }, documentElement: page, querySelectorAll: () => [trigger, other] };
  const scrolls = [];
  const window = { ...node(), scrollX: 0, scrollY: 850, scrollTo: value => scrolls.push(value) };
  const timers = new Map();
  let timerId = 0;
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/countries/common/js/modal.js'), 'utf8'), {
    window, document, matchMedia: () => ({ matches: reduced }),
    getComputedStyle: () => ({ getPropertyValue: () => '300' }),
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  const controller = window.WorldTour.createCountryModal(dialog);
  return { trigger, other, button, dialog, style, page, window, scrolls, controller, timers, classes, focused: () => focused };
}

test('animated close preserves modal state until panel exit ends and ignores repeated close requests', () => {
  const s = setup(false);
  s.trigger.emit('click');
  s.button.emit('click');
  s.button.emit('click');
  assert.equal(s.dialog.open, true);
  assert.equal(s.style.position, 'fixed');
  assert.equal(s.focused(), 0);
  assert.equal(s.timers.size, 1);
  assert.ok(s.classes.has('is-closing'));
  s.dialog.emit('animationend', { target: s.dialog, animationName: 'country-modal-enter' });
  assert.equal(s.dialog.open, true);
  s.dialog.emit('animationend', { target: s.dialog, animationName: 'country-modal-exit' });
  assert.equal(s.dialog.open, false);
  assert.equal(s.focused(), 1);
  assert.equal(s.timers.size, 0);
  assert.equal(s.classes.has('is-closing'), false);
  s.trigger.emit('click');
  assert.equal(s.dialog.open, true);
});

test('fallback finishes closing when animation events are missing and departure clears pending exit', () => {
  const s = setup(false);
  s.trigger.emit('click');
  s.controller.close();
  const timer = [...s.timers.values()][0];
  assert.equal(timer.ms, 400);
  timer.fn();
  assert.equal(s.dialog.open, false);
  assert.equal(s.style.position, '');
  s.trigger.emit('click');
  s.controller.close();
  s.window.emit('pagehide');
  assert.equal(s.dialog.open, false);
  assert.equal(s.timers.size, 0);
  assert.equal(s.classes.size, 0);
});

test('modal locks scroll, ignores unrelated triggers and restores scroll/style/focus on close and reopen', () => {
  const s = setup();
  s.other.emit('click');
  assert.equal(s.dialog.open, false);
  s.trigger.emit('click');
  s.trigger.emit('click');
  assert.equal(s.dialog.open, true);
  assert.equal(s.style.position, 'fixed');
  assert.equal(s.style.top, '-850px');
  assert.equal(s.page.style.overflowY, 'scroll');
  s.button.emit('click');
  assert.equal(s.dialog.open, false);
  assert.equal(s.style.position, '');
  assert.equal(s.style.width, '90%');
  assert.equal(s.page.style.overflowY, 'auto');
  assert.equal(s.scrolls[0].top, 850);
  assert.equal(s.focused(), 1);
  s.trigger.emit('click');
  let prevented = false;
  s.dialog.emit('cancel', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(s.dialog.open, false);
  assert.equal(s.focused(), 2);
});

test('short pages do not gain a scrollbar when a modal opens', () => {
  const s = setup();
  s.page.scrollHeight = s.page.clientHeight;
  s.trigger.emit('click');
  assert.equal(s.page.style.overflowY, 'auto');
  s.controller.close();
  assert.equal(s.page.style.overflowY, 'auto');
});

test('only a gesture starting and ending on the backdrop closes the modal', () => {
  const s = setup();
  const outside = { target: s.dialog, clientX: 10, clientY: 10 };
  const inside = { target: s.dialog, clientX: 300, clientY: 300 };
  s.trigger.emit('click');
  s.dialog.emit('pointerdown', inside);
  s.dialog.emit('click', outside);
  assert.equal(s.dialog.open, true);
  s.dialog.emit('pointerdown', outside);
  s.dialog.emit('click', inside);
  assert.equal(s.dialog.open, true);
  s.dialog.emit('pointerdown', outside);
  s.dialog.emit('pointercancel');
  s.dialog.emit('click', outside);
  assert.equal(s.dialog.open, true);
  s.dialog.emit('pointerdown', outside);
  s.dialog.emit('click', outside);
  assert.equal(s.dialog.open, false);
});

test('page departure and destroy release the scroll lock and event handlers', () => {
  const s = setup();
  s.trigger.emit('click');
  s.window.emit('pagehide');
  assert.equal(s.dialog.open, false);
  assert.equal(s.style.position, '');
  s.trigger.emit('click');
  s.controller.destroy();
  assert.equal(s.dialog.open, false);
  for (const target of [s.trigger, s.button, s.dialog, s.window]) {
    assert.equal([...target.events.values()].reduce((count, handlers) => count + handlers.size, 0), 0);
  }
  s.trigger.emit('click');
  assert.equal(s.dialog.open, false);
});
