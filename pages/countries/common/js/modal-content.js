(() => {
  const app = window.WorldTour = window.WorldTour || {};
  const galleries = new WeakMap();

  // Content is plain data; never interpret descriptions as HTML.
  app.renderCountryModalContent = (dialog, card) => {
    if (!card?.title || !card.image?.src) return false;
    const context = dialog.querySelector('.country-modal__context');
    const image = dialog.querySelector('.country-modal__image');
    const details = dialog.querySelector('.country-modal__details');
    const content = dialog.querySelector('.country-modal__content');
    if (!context || !image || !details || !content) return false;
    galleries.get(dialog)?.destroy();
    galleries.delete(dialog);
    const galleryLayout = card.layout === 'gallery';
    dialog.classList.toggle('country-modal--gallery', galleryLayout);
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
    let viewport, controls;
    if (galleryLayout) {
      const gallery = element('section', 'country-modal__gallery');
      gallery.setAttribute('aria-label', `${card.title} 사진`);
      viewport = element('div', 'country-modal__gallery-track');
      viewport.id = `${title.id}-gallery`;
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-label', '사진 목록, 좌우로 스크롤하여 탐색');
      for (const photo of card.images?.length ? card.images : [card.image]) {
        const slide = element('figure', 'country-modal__slide');
        const picture = element('img', 'country-modal__gallery-image');
        picture.src = photo.src;
        picture.alt = photo.alt || '';
        picture.loading = 'lazy';
        slide.append(picture);
        viewport.append(slide);
      }
      controls = element('div', 'photo-navigation country-modal__gallery-controls');
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', '모달 사진 이동');
      for (const [direction, label] of [['prev', '이전 사진'], ['next', '다음 사진']]) {
        const button = element('button', 'photo-navigation__button');
        button.type = 'button';
        button.setAttribute('data-direction', direction);
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-controls', viewport.id);
        controls.append(button);
      }
      gallery.append(viewport, controls);
      fragment.append(gallery);
    }
    const description = galleryLayout ? element('div', 'country-modal__description') : fragment;
    if (galleryLayout) {
      description.tabIndex = 0;
      description.setAttribute('role', 'region');
      description.setAttribute('aria-label', `${card.title} 상세 설명`);
      fragment.append(description);
    }
    if (card.lead) description.append(element('p', 'country-modal__lead', card.lead));
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
      description.append(block);
    }
    context.textContent = card.context || '';
    context.hidden = !card.context;
    image.src = card.image.src;
    image.alt = card.image.alt || '';
    details.replaceChildren(fragment);
    if (viewport) galleries.set(dialog, app.createPhotoNavigation(viewport, controls));
    content.scrollTop = 0;
    dialog.scrollTop = 0;
    return true;
  };
})();
