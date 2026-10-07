const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
test('both entry pages reference existing local files in defer order', () => {
  for (const page of ['index.html', 'selectWorldMap.html', 'pages/continents/asia/index.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const [, reference] of html.matchAll(/(?:src|href)="(\.[^"#]+)"/g)) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(page), reference)), `${page}: ${reference}`);
    }
    const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1]);
    assert.ok(scripts.at(-1).endsWith('/js/main.js'));
    assert.doesNotMatch(html, /type="module"/);
  }
});
