const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reduced = false, decode, extraDestinations = {}) {
  const node = () => ({
    events: {}, attributes: {}, classList: { add() {}, remove() {} },
    addEventListener(name, fn) { this.events[name] = fn; },
    removeEventListener(name) { delete this.events[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    focus() { this.focused = true; },
  });
  const fields = {};
  const image = { ...node(), style: {}, decode };
  image.removeAttribute = name => { delete image[name]; };
  const content = {};
  const properties = {};
  const overlay = { ...node(), style: {
    setProperty(name, value) { properties[name] = value; },
    removeProperty(name) { delete properties[name]; },
  }, querySelector: name => name === '.country-portal__image' ? image
    : name === '.country-portal__content' ? content : fields[name] ||= {} };
  const frame = { style: { setProperty() {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1672, height: 941 }) };
  const svg = { ...node(), viewBox: { baseVal: { width: 1672, height: 941 } } };
  const back = node();
  const elements = { '.continent-page__frame': frame, '.country-regions': svg, '.country-portal': overlay, '.continent-page__back': back, '.country-announcement': {} };
  const document = { ...node(), body: node(), querySelector: name => elements[name] };
  const classes = new Set();
  document.body.classList = { add: name => classes.add(name), remove: name => classes.delete(name) };
  const window = { ...node(), innerWidth: 1672, innerHeight: 941 };
  const timers = new Map(); let id = 0;
  const visits = [];
  const context = vm.createContext({ window, document, matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; }, clearTimeout: key => timers.delete(key) });
  vm.runInContext(fs.readFileSync(require.resolve('../../pages/continents/common/js/country-navigation.js'), 'utf8'), context);
  const controller = window.WorldTour.createCountryNavigation({ JP: { href: '../../asia-countries/japan/index.html', title: 'Japan', name: '일본', eyebrow: 'ASIA / JAPAN', preview: { src: 'japan.png', position: 'left', background: '#123456' } }, ...extraDestinations }, href => visits.push(href));
  const japan = { ...node(), getBBox: () => ({ x: 1150, y: 300, width: 110, height: 182 }) };
  const finish = () => overlay.events.animationend({ target: overlay, animationName: 'country-portal-reveal' });
  return { controller, japan, finish, visits, timers, document, window, back, fields, classes, image, content, properties };
}

test('Japan starts a single zoom navigation; other countries retain selection', () => {
  const s = setup();
  assert.equal(s.controller.activate('KR', s.japan), false);
  assert.equal(s.controller.activate('JP', s.japan), true);
  s.controller.activate('JP', s.japan);
  assert.equal(s.timers.size, 1);
  assert.equal(s.back.inert, true);
  assert.equal(s.fields['.country-portal__title'].textContent, 'Japan');
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

test('completed preview remains painted on departure and resets on cached return', () => {
  const s = setup();
  s.controller.activate('JP', s.japan);
  s.finish();
  s.window.events.pagehide();
  assert.equal(s.classes.has('country-entering'), true);
  s.finish();
  assert.equal(s.visits.length, 1);
  s.window.events.pageshow();
  assert.equal(s.classes.has('country-entering'), false);
  assert.equal(s.back.inert, false);
});

test('preview decoding delays reveal and Escape cancels the pending reveal', async () => {
  let resolve;
  const s = setup(false, () => new Promise(done => { resolve = done; }));
  s.controller.activate('JP', s.japan);
  assert.equal(s.classes.has('country-entering'), false);
  s.document.events.keydown({ key: 'Escape' });
  resolve();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(s.classes.has('country-entering'), false);
  assert.equal(s.timers.size, 0);
  s.controller.activate('JP', s.japan);
  resolve();
  await Promise.resolve();
  assert.equal(s.classes.has('country-entering'), true);
  s.finish();
  assert.equal(s.visits.length, 1);
});

test('each destination supplies its image; missing preview clears the previous appearance', async () => {
  const s = setup(false, () => Promise.resolve(), {
    KR: { href: 'korea.html', title: 'Korea', name: '한국', preview: { src: 'korea.png' } },
    FR: { href: 'france.html', title: 'France', name: '프랑스' },
  });
  s.controller.activate('JP', s.japan);
  await Promise.resolve();
  assert.equal(s.image.src, 'japan.png');
  assert.equal(s.image.hidden, false);
  assert.equal(s.content.hidden, true);
  s.document.events.keydown({ key: 'Escape' });
  s.controller.activate('KR', s.japan);
  await Promise.resolve();
  assert.equal(s.image.src, 'korea.png');
  assert.equal(s.image.style.objectPosition, 'center');
  assert.equal(s.properties['--preview-background'], '#101413');
  s.document.events.keydown({ key: 'Escape' });
  s.controller.activate('FR', s.japan);
  assert.equal(s.image.hidden, true);
  assert.equal(s.content.hidden, false);
  assert.equal(s.fields['.country-portal__title'].textContent, 'France');
  assert.equal(s.image.src, undefined);
  assert.equal(s.properties['--preview-background'], undefined);
  s.finish();
  assert.deepEqual(s.visits, ['france.html']);
});

test('failed decoding uses the fallback and still navigates', async () => {
  const s = setup(false, () => Promise.reject(new Error('broken image')));
  s.controller.activate('JP', s.japan);
  await Promise.resolve();
  assert.equal(s.image.hidden, true);
  assert.equal(s.content.hidden, false);
  assert.equal(s.classes.has('country-entering'), true);
  s.finish();
  assert.equal(s.visits.length, 1);
});

test('timeout uses fallback and late decoding cannot replace it', async () => {
  let resolve;
  const s = setup(false, () => new Promise(done => { resolve = done; }));
  s.controller.activate('JP', s.japan);
  const [timeout] = s.timers.values();
  assert.equal(timeout.ms, 2000);
  timeout.fn();
  resolve();
  await Promise.resolve();
  assert.equal(s.image.hidden, true);
  assert.equal(s.content.hidden, false);
  assert.equal(s.classes.has('country-entering'), true);
  s.finish();
  assert.equal(s.visits.length, 1);
});

test('a cancelled decode cannot alter a later destination preview', async () => {
  const resolves = [];
  const s = setup(false, () => new Promise(done => resolves.push(done)), {
    KR: { href: 'korea.html', name: '한국', preview: { src: 'korea.png' } },
  });
  s.controller.activate('JP', s.japan);
  s.document.events.keydown({ key: 'Escape' });
  s.controller.activate('KR', s.japan);
  resolves[0]();
  await Promise.resolve();
  assert.equal(s.classes.has('country-entering'), false);
  assert.equal(s.image.hidden, true);
  resolves[1]();
  await Promise.resolve();
  assert.equal(s.image.src, 'korea.png');
  assert.equal(s.image.hidden, false);
  s.finish();
  assert.deepEqual(s.visits, ['korea.html']);
});
