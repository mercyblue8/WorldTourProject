const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false, font = Promise.resolve()) {
  const eventNode = () => ({
    events: {}, style: { setProperty(key, value) { this[key] = value; } },
    addEventListener(key, fn) { this.events[key] = fn; },
    removeEventListener(key) { delete this.events[key]; },
    setAttribute() {},
  });
  const title = { ...eventNode(), dataset: {}, hidden: true, textContent: 'Japan | Tradition Meets Culture',
    replaceChildren(...children) { this.children = children; } };
  const window = eventNode();
  const timers = new Map(); let id = 0;
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/asia-countries/japan/js/intro.js'), 'utf8'), {
    window, document: { querySelector: () => title, fonts: { load: () => font }, createElement: eventNode },
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { window, title, timers, play: window.WorldTour.playJapanIntro };
}

test('intro reveals exact text and disappears once without replay', async () => {
  const s = setup(); await s.play();
  assert.equal(s.title.hidden, false);
  assert.equal(s.title.children.map(child => child.textContent).join(''), 'Japan | Tradition Meets Culture');
  const delay = 250 + 30 * 110 + 800 + 600;
  assert.equal(s.title.style['--exit-delay'], `${delay}ms`);
  s.title.events.animationend({ target: s.title, animationName: 'japan-intro-exit' });
  assert.equal(s.title.hidden, true);
  assert.equal(s.timers.size, 0);
  await s.play();
  assert.equal(s.title.hidden, true);
});

test('leaving during font load never reveals the title later', async () => {
  let ready;
  const s = setup(false, new Promise(resolve => { ready = resolve; }));
  const pending = s.play();
  s.window.events.pagehide();
  ready(); await pending;
  assert.equal(s.title.hidden, true);
  assert.equal(s.timers.size, 0);
});

test('reduced motion uses a shorter hold and fallback still hides the title', async () => {
  const s = setup(true); await s.play();
  assert.equal(s.title.style['--exit-delay'], '1600ms');
  [...s.timers.values()][0].fn();
  assert.equal(s.title.hidden, true);
});
