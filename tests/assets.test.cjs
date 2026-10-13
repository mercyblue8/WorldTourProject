const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
test('Asia destination routes and configured preview images exist relative to the page', () => {
  const pageDir = path.join(root, 'pages/continents/asia');
  const context = vm.createContext({ window: { WorldTour: { asia: {} } } });
  vm.runInContext(fs.readFileSync(path.join(pageDir, 'data/destinations.js'), 'utf8'), context);
  for (const destination of Object.values(context.window.WorldTour.asia.destinations)) {
    for (const reference of [destination.href, destination.preview?.src].filter(Boolean)) {
      assert.ok(fs.existsSync(path.resolve(pageDir, reference)), reference);
    }
  }
});
test('both entry pages reference existing local files in defer order', () => {
  for (const page of ['index.html', 'selectWorldMap.html', 'pages/continents/asia/index.html', 'pages/asia-countries/japan/index.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const [, reference] of html.matchAll(/(?:src|href)="(\.[^"#]+)"/g)) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(page), reference)), `${page}: ${reference}`);
    }
    const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1]);
    assert.ok(scripts.at(-1).endsWith('/js/main.js'));
    assert.doesNotMatch(html, /type="module"/);
  }
});
