const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const node = () => ({ events: {}, value: '',
    addEventListener(type, fn) { this.events[type] = fn; },
    removeEventListener(type) { delete this.events[type]; },
  });
  const input = node();
  const status = node();
  const form = node();
  form.querySelector = selector => selector === '.country-search__input' ? input : status;
  const document = { querySelector: () => form };
  const window = {};
  const context = vm.createContext({ window, document });
  for (const path of ['../../pages/continents/asia/data/config.js', '../../pages/continents/asia/data/countries.js', '../../pages/continents/common/js/country-search.js']) {
    vm.runInContext(fs.readFileSync(require.resolve(path), 'utf8'), context);
  }
  let matches;
  const controller = window.WorldTour.createCountrySearch(window.WorldTour.asia.countries.countries, {
    aliases: window.WorldTour.asia.config.searchAliases,
    onResults: ids => { matches = Array.from(ids); },
  });
  return { input, status, form, controller, get matches() { return matches; },
    search(value) { input.value = value; input.events.input({}); },
  };
}

test('search matches Korean, English and country codes regardless of case or spaces', () => {
  const s = setup();
  for (const query of ['일본', ' JAPAN ', 'jp', '일 본']) {
    s.search(query);
    assert.deepEqual(s.matches, ['JP']);
  }
  s.search('한국');
  assert.deepEqual(s.matches, ['KR']);
  s.search('싱가포르');
  assert.deepEqual(s.matches, ['SG']);
});

test('partial queries can highlight multiple matches; exact names take priority', () => {
  const s = setup();
  s.search('인도');
  assert.deepEqual(s.matches, ['IN']);
  s.search('korea');
  assert.ok(s.matches.includes('KR'));
  assert.ok(s.matches.includes('KP'));
  assert.equal(s.matches.length, 2);
});

test('English partial search requires three letters while exact codes and Korean remain available', () => {
  const s = setup();
  s.search('jap');
  assert.deepEqual(s.matches, ['JP']);
  for (const query of ['ja', 'j', ' J A ']) {
    s.search(query);
    assert.deepEqual(s.matches, []);
    assert.match(s.status.textContent, /3글자 이상/);
  }
  s.search('JP');
  assert.deepEqual(s.matches, ['JP']);
  s.search('일');
  assert.ok(s.matches.includes('JP'));
});

test('no match, empty input and Escape clear highlights; Enter does not submit navigation', () => {
  const s = setup();
  s.search('일본');
  s.search('없는국가');
  assert.deepEqual(s.matches, []);
  assert.equal(s.status.textContent, '검색한 국가가 없습니다.');
  s.search('');
  assert.equal(s.status.hidden, true);
  s.search('일본');
  s.input.events.keydown({ key: 'Escape' });
  assert.equal(s.input.value, '');
  assert.deepEqual(s.matches, []);
  let prevented = false;
  s.form.events.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('Korean composition waits for completion and destroy clears listeners and highlights', () => {
  const s = setup();
  s.input.value = '일본';
  s.input.events.input({ isComposing: true });
  assert.deepEqual(s.matches, []);
  s.input.events.compositionend();
  assert.deepEqual(s.matches, ['JP']);
  s.controller.destroy();
  assert.deepEqual(s.matches, []);
  assert.equal(Object.keys(s.input.events).length, 0);
  assert.equal(Object.keys(s.form.events).length, 0);
});
