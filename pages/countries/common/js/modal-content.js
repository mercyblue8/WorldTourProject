(() => {
  const app = window.WorldTour = window.WorldTour || {};

  // Content is plain data; never interpret descriptions as HTML.
  app.renderCountryModalContent = (dialog, card) => {
    if (!card?.title || !card.image?.src) return false;
    const context = dialog.querySelector('.country-modal__context');
    const image = dialog.querySelector('.country-modal__image');
    const details = dialog.querySelector('.country-modal__details');
    const content = dialog.querySelector('.country-modal__content');
    if (!context || !image || !details || !content) return false;
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    const fragment = document.createDocumentFragment();
    if (card.eyebrow) fragment.append(element('p', 'country-modal__eyebrow', card.eyebrow));
    const title = element('h2', 'country-modal__title', card.title);
    title.id = dialog.getAttribute('aria-labelledby');
    fragment.append(title);
    if (card.subtitle) fragment.append(element('p', 'country-modal__subtitle', card.subtitle));
    for (const section of card.sections || []) {
      const block = element('section', 'country-modal__section');
      block.append(element('h3', '', section.title));
      const list = element(section.type === 'numbered-list' ? 'ol' : 'ul');
      for (const item of section.items || []) {
        const row = element('li');
        if (item.label) row.append(element('strong', '', item.label), ': ');
        row.append(document.createTextNode(item.text || ''));
        for (const source of item.sources || []) {
          let url;
          try { url = new URL(source.href, document.baseURI); } catch { continue; }
          if (!['https:', 'http:'].includes(url.protocol)) continue;
          const link = element('a', '', source.label);
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          row.append(' ', link);
        }
        list.append(row);
      }
      block.append(list);
      fragment.append(block);
    }
    context.textContent = card.context || '';
    context.hidden = !card.context;
    image.src = card.image.src;
    image.alt = card.image.alt || '';
    details.replaceChildren(fragment);
    content.scrollTop = 0;
    dialog.scrollTop = 0;
    return true;
  };
})();
