const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const window = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/world-map/data/continents.js'), 'utf8'), { window });
const data = window.WorldTour.continents;

function contains(path, x, y) {
  return path.split('Z').some(loop => {
    const points = [...loop.matchAll(/(\d+),(\d+)/g)].map(match => [Number(match[1]), Number(match[2])]);
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

test('continent centers and Greenland hit the right region; oceans hit none', () => {
  assert.equal(data.regions.length, 7);
  const samples = [
    [300, 225, 'north-america'], [450, 520, 'south-america'], [825, 221, 'europe'],
    [775, 412, 'africa'], [1215, 265, 'asia'], [1380, 625, 'oceania'],
    [830, 847, 'antarctica'], [540, 120, 'north-america'],
    [600, 500, null], [1100, 680, null], [50, 700, null],
  ];
  for (const [x, y, id] of samples) {
    const hits = Array.from(data.regions).filter(region => contains(region.path, x, y)).map(region => region.id);
    assert.deepEqual(hits, id ? [id] : [], `${x}, ${y}`);
  }
});

test('map initialization creates seven accessible paths without duplicates', () => {
  const element = () => ({
    attributes: {}, children: [],
    setAttribute(key, value) { this.attributes[key] = value; },
    replaceChildren(...children) { this.children = children; },
  });
  const svg = element();
  const document = {
    querySelector: () => svg,
    createElementNS(namespace, name) {
      assert.equal(namespace, 'http://www.w3.org/2000/svg');
      assert.equal(name, 'path');
      return element();
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/world-map/js/main.js'), 'utf8'), { window, document });
  window.WorldTour.initWorldMap();
  assert.equal(svg.children.length, 7);
  assert.equal(svg.attributes.viewBox, '0 0 1672 941');
  assert.equal(new Set(svg.children.map(path => path.attributes.id)).size, 7);
  for (const path of svg.children) {
    assert.equal(path.attributes.tabindex, '0');
    assert.ok(path.attributes['aria-label']);
  }
});
