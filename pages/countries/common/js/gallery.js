(() => {
  const app = window.WorldTour = window.WorldTour || {};
  app.createPhotoGallery = gallery => {
    const viewport = gallery.querySelector('.photo-gallery__viewport');
    const track = gallery.querySelector('.photo-gallery__track');
    const originals = [...track.children];
    const dots = [...gallery.querySelectorAll('[data-slide]')];
    const status = gallery.querySelector('.photo-gallery__status');
    const count = originals.length;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = [];
    let index = 0, position = 1, step = 0, busy = false, timer, drag = null, suppressClick = false;
    function clone(slide) {
      const copy = slide.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.tabIndex = -1;
      return copy;
    }
    const copies = [clone(originals[count - 1]), ...originals.map(clone)];
    track.prepend(copies[0]);
    track.append(...copies.slice(1));

    function draw(instant = false, offset = 0) {
      track.style.transition = instant ? 'none' : '';
      track.style.transform = `translateX(${-position * step + offset}px)`;
      if (instant) { void track.offsetWidth; track.style.transition = ''; }
    }
    function update() {
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      status.textContent = `사진 ${index + 1} / ${count}`;
      originals.forEach((slide, i) => { slide.tabIndex = i === index ? 0 : -1; });
    }
    function settle() {
      clearTimeout(timer);
      busy = false;
      position = index + 1;
      draw(true);
    }
    function move(direction) {
      if (busy || count < 2) return;
      busy = true;
      position += direction;
      index = (index + direction + count) % count;
      update();
      draw(reduced.matches);
      if (reduced.matches) settle();
      else timer = setTimeout(settle, 600);
    }
    function goTo(next) {
      if (next === index || busy) return;
      move(next > index ? 1 : -1);
    }
    function on(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    }
    function resize() {
      drag = null;
      viewport.classList.remove('is-dragging');
      step = originals[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
      settle();
    }
    on(track, 'transitionend', event => { if (event.target === track && event.propertyName === 'transform') settle(); });
    on(gallery, 'click', event => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
      const arrow = event.target.closest('[data-direction]');
      const dot = event.target.closest('[data-slide]');
      const photo = event.target.closest('[data-index]');
      if (arrow) move(Number(arrow.dataset.direction));
      else if (dot) goTo(Number(dot.dataset.slide));
      else if (photo) goTo(Number(photo.dataset.index));
    });
    on(gallery, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') goTo(0);
      else if (event.key === 'End') goTo(count - 1);
      else move(event.key === 'ArrowRight' ? 1 : -1);
    });
    on(viewport, 'pointerdown', event => {
      if (event.button !== 0 || busy) return;
      suppressClick = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, active: false };
    });
    on(viewport, 'pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.active && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
      if (!drag.active && Math.abs(dx) > 8) {
        drag.active = true;
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add('is-dragging');
      }
      if (drag.active) { drag.dx = dx; draw(true, dx); }
    });
    function endDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const previous = drag;
      drag = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (!previous.active) return;
      suppressClick = true;
      if (event.type !== 'pointercancel' && Math.abs(previous.dx) > Math.min(60, step * .15)) move(previous.dx < 0 ? 1 : -1);
      else draw(reduced.matches);
    }
    on(viewport, 'pointerup', endDrag);
    on(viewport, 'pointercancel', endDrag);
    on(viewport, 'dragstart', event => event.preventDefault());
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    update(); resize();
    return { get index() { return index; }, destroy() { clearTimeout(timer); observer.disconnect(); listeners.forEach(remove => remove()); copies.forEach(copy => copy.remove()); track.style.transform = ''; } };
  };
})();
