const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type) { [...(listeners.get(type) || [])].forEach(fn => fn({})); },
  };
}

test('landing coordinates video pause, cancel, visibility and cached-page restoration', () => {
  const document = { ...target(), hidden: false, querySelectorAll: () => [] };
  const calls = { play: 0, pause: 0, videoDestroy: 0, transitionDestroy: 0, init: 0 };
  let transition;
  let hooks;
  const window = { ...target(), WorldTour: {
    createBackgroundVideo() {
      calls.init++;
      return {
        play: () => calls.play++, pause: () => calls.pause++,
        destroy: () => calls.videoDestroy++,
      };
    },
    createTransition(options) {
      hooks = options;
      transition = { isBusy: false, destroy: () => calls.transitionDestroy++ };
      return transition;
    },
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/landing/js/main.js'), 'utf8'), { document, window });
  window.emit('pageshow');
  assert.equal(calls.init, 1);
  transition.isBusy = true;
  hooks.onStart();
  assert.equal(calls.pause, 1);
  const playsBeforeLoading = calls.play;
  document.emit('pointerdown'); document.emit('keydown'); document.emit('visibilitychange');
  assert.equal(calls.play, playsBeforeLoading, 'loading must keep background paused');
  transition.isBusy = false;
  hooks.onRestore();
  assert.equal(calls.play, playsBeforeLoading + 1);
  document.hidden = true;
  document.emit('visibilitychange');
  assert.equal(calls.pause, 2);
  document.hidden = false;
  document.emit('visibilitychange');
  assert.equal(calls.play, playsBeforeLoading + 2);
  window.emit('pagehide');
  assert.equal(calls.videoDestroy, 1);
  assert.equal(calls.transitionDestroy, 1);
  for (const handlers of document.listeners.values()) assert.equal(handlers.size, 0);
  window.emit('pageshow');
  assert.equal(calls.init, 2);
  for (const handlers of document.listeners.values()) assert.equal(handlers.size, 1);
});

test('background crossfade, pause and destroy clear playback work', async () => {
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  const videos = [0, 1].map(() => ({
    currentTime: 0, duration: 20, playCount: 0, pauseCount: 0,
    classes: new Set(),
    classList: { add() {}, remove() {}, toggle() {} },
    async play() { this.playCount++; },
    pause() { this.pauseCount++; },
  }));
  const window = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../../pages/landing/js/background-video.js'), 'utf8'), {
    window,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { timers.set(++id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const controller = window.WorldTour.createBackgroundVideo(videos);
  await controller.play();
  await controller.play();
  assert.equal(videos[0].playCount, 1, 'play is idempotent');
  videos[0].currentTime = 5.5;
  const [frameID, tick] = frames.entries().next().value;
  frames.delete(frameID); tick();
  await new Promise(setImmediate);
  assert.equal(videos[1].currentTime, 6);
  assert.equal(videos[1].playCount, 1);
  assert.equal(timers.size, 1);
  controller.pause();
  assert.equal(frames.size, 0);
  assert.equal(timers.size, 0);
  assert.ok(videos.every(video => video.pauseCount > 0));
  controller.destroy();
  await controller.play();
  assert.equal(frames.size, 0);
});
