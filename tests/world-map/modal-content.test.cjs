const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

function setup() {
  const node = tag => ({ tag, children: [], textContent: '',
    setAttribute(key, value) { this[key] = value; },
    append(...children) { this.children.push(...children.flatMap(child => child.tag === '#fragment' ? child.children : [child])); },
    replaceChildren(...children) { this.children = []; this.append(...children); },
  });
  const fields = Object.fromEntries(['context', 'image', 'details', 'content'].map(key => ['.country-modal__' + key, node('div')]));
  const classes = new Set();
  const dialog = { classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } }, querySelector: key => fields[key], getAttribute: () => 'modal-title' };
  const document = { createElement: node, createDocumentFragment: () => node('#fragment'),
    createTextNode: text => ({ tag: '#text', textContent: text }), baseURI: 'https://example.com/japan/' };
  const window = {};
  const context = vm.createContext({ window, document, URL });
  for (const file of ['pages/asia-countries/japan/data/config.js', 'pages/asia-countries/japan/data/modal-cards.js', 'pages/countries/common/js/modal-content.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  let galleryDestroyed = 0;
  window.WorldTour.createPhotoNavigation = () => ({ destroy() { galleryDestroyed++; } });
  return { fields, dialog, classes, galleryDestroyed: () => galleryDestroyed, cards: window.WorldTour.japan.modalCards, render: card => window.WorldTour.renderCountryModalContent(dialog, card) };
}
const flatten = node => [node, ...(node.children || []).flatMap(child => typeof child === 'string' ? [] : flatten(child))];

test('Disney gallery precedes descriptions and is cleaned up when returning to a normal card', () => {
  const s = setup();
  s.render(s.cards['tokyo-disneyland']);
  assert.ok(s.classes.has('country-modal--gallery'));
  const children = s.fields['.country-modal__details'].children;
  const galleryIndex = children.findIndex(n => n.className === 'country-modal__gallery');
  const leadIndex = children.findIndex(n => n.className === 'country-modal__description');
  assert.ok(galleryIndex > 0 && galleryIndex < leadIndex);
  assert.equal(children[leadIndex].tabIndex, 0);
  assert.ok(flatten(children[leadIndex]).some(n => n.className === 'country-modal__lead'));
  assert.equal(flatten(children[leadIndex]).filter(n => n.tag === 'img').length, 0);
  const galleryNodes = flatten(children[galleryIndex]);
  assert.equal(galleryNodes.filter(n => n.tag === 'img').length, 5);
  assert.equal(galleryNodes.filter(n => n.tag === 'button').length, 2);
  s.render(s.cards['shibuya-crossing']);
  assert.equal(s.galleryDestroyed(), 1);
  assert.equal(s.classes.has('country-modal--gallery'), false);
  assert.equal(flatten(s.fields['.country-modal__details']).filter(n => n.className === 'country-modal__gallery').length, 0);
});

test('shared modal switches from Shibuya to WARP without stale sections and resets scrolling', () => {
  const s = setup();
  assert.equal(s.render(s.cards['shibuya-crossing']), true);
  let nodes = flatten(s.fields['.country-modal__details']);
  assert.equal(nodes.filter(n => n.tag === 'section').length, 4);
  assert.equal(nodes.filter(n => n.tag === 'li').length, 11);
  assert.equal(nodes.filter(n => n.tag === 'a').length, 4);
  assert.equal(nodes.find(n => n.tag === 'h2').id, 'modal-title');
  s.fields['.country-modal__content'].scrollTop = 500;
  assert.equal(s.render(s.cards['shinjuku-warp']), true);
  nodes = flatten(s.fields['.country-modal__details']);
  assert.equal(nodes.find(n => n.tag === 'h2').textContent, '신주쿠 클럽 워프');
  assert.equal(nodes.filter(n => n.tag === 'section').length, 3);
  assert.equal(nodes.filter(n => n.tag === 'a').length, 1);
  assert.equal(nodes.find(n => n.tag === 'a').href, 'https://warp-shinjuku.jp/');
  assert.equal(nodes.find(n => n.className === 'country-modal__lead').textContent, s.cards['shinjuku-warp'].lead);
  assert.equal(s.fields['.country-modal__image'].src, './assets/images/tokyo-nightlife.png');
  assert.equal(s.fields['.country-modal__content'].scrollTop, 0);
  assert.equal(s.render(undefined), false);
  assert.equal(nodes.find(n => n.tag === 'h2').textContent, '신주쿠 클럽 워프');
});

test('optional text is cleared, descriptions stay literal, and unsupported source URLs are omitted', () => {
  const s = setup();
  s.render(s.cards['shibuya-crossing']);
  s.render({ title: '<b>Title</b>', image: { src: 'photo.png' }, sections: [
    { title: 'Info', type: 'bullet-list', items: [{ text: '<img onerror=bad>', sources: [
      { label: 'bad', href: 'javascript:alert(1)' }, { label: 'source', href: 'https://example.com/' },
    ] }] },
  ] });
  const nodes = flatten(s.fields['.country-modal__details']);
  assert.equal(s.fields['.country-modal__context'].hidden, true);
  assert.equal(s.fields['.country-modal__context'].textContent, '');
  assert.equal(nodes.find(n => n.tag === 'h2').textContent, '<b>Title</b>');
  assert.ok(nodes.some(n => n.textContent === '<img onerror=bad>'));
  assert.equal(nodes.filter(n => n.tag === 'a').length, 1);
  assert.equal(nodes.find(n => n.tag === 'a').rel, 'noopener noreferrer');
});

test('every connected Japan card has data and an existing image', () => {
  const s = setup();
  const html = fs.readFileSync(path.join(root, 'pages/asia-countries/japan/index.html'), 'utf8');
  const ids = [...html.matchAll(/data-modal-card="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ['shibuya-crossing', 'shinjuku-warp', 'tokyo-disneyland']);
  for (const id of ids) {
    assert.ok(s.cards[id]);
    assert.ok(fs.existsSync(path.resolve(root, 'pages/asia-countries/japan', s.cards[id].image.src)));
  }
});
