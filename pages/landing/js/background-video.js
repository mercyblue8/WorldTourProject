(() => {
  const app = window.WorldTour = window.WorldTour || {};

  // Owns playback only. Page lifecycle and user input belong to main.js.
  app.createBackgroundVideo = (videos, { segmentLength = 6, fadeLength = 0.65 } = {}) => {
    let active = 0;
    let segmentStart = 0;
    let playing = false;
    let starting = false;
    let transitioning = false;
    let generation = 0;
    let frame;
    let fadeTimer;
    let destroyed = false;

    function pause() {
      generation += 1;
      playing = false;
      starting = false;
      transitioning = false;
      cancelAnimationFrame(frame);
      clearTimeout(fadeTimer);
      videos.forEach(video => video.pause());
    }

    async function play() {
      if (destroyed || playing || starting) return;
      starting = true;
      const currentGeneration = generation;
      try {
        await videos[active].play();
        if (destroyed || currentGeneration !== generation) return;
        starting = false;
        playing = true;
        frame = requestAnimationFrame(tick);
      } catch {
        if (currentGeneration === generation) pause();
      }
    }

    async function crossfade() {
      transitioning = true;
      const currentGeneration = generation;
      const outgoing = videos[active];
      const incoming = videos[1 - active];
      const nextStart = segmentStart + segmentLength >= outgoing.duration - 0.1
        ? 0 : segmentStart + segmentLength;
      try {
        incoming.currentTime = nextStart;
        await incoming.play();
        if (!playing || currentGeneration !== generation) return;
        incoming.classList.add('is-visible');
        outgoing.classList.remove('is-visible');
        active = 1 - active;
        segmentStart = nextStart;
        fadeTimer = setTimeout(() => {
          outgoing.pause();
          transitioning = false;
        }, fadeLength * 1000);
      } catch {
        if (currentGeneration === generation) pause();
      }
    }

    function tick() {
      if (!playing) return;
      const current = videos[active];
      const boundary = Math.min(segmentStart + segmentLength, current.duration);
      if (!transitioning && current.currentTime >= boundary - fadeLength) void crossfade();
      frame = requestAnimationFrame(tick);
    }

    videos.forEach((video, index) => {
      video.muted = true;
      video.classList.toggle('is-visible', index === 0);
    });
    segmentStart = Math.floor(videos[0].currentTime / segmentLength) * segmentLength;

    return {
      play,
      pause,
      destroy() { destroyed = true; pause(); },
    };
  };
})();
