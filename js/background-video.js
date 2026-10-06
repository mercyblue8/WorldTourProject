// 6초 구간을 두 플레이어로 교차 재생해 장면과 반복 경계를 부드럽게 연결합니다.
const videos = [...document.querySelectorAll('.background-video')];
const toggle = document.querySelector('.video-toggle');
const player = document.querySelector('.mini-player');
const progress = document.querySelector('.video-progress');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const segmentLength = 6;
const fadeLength = 0.65;
let active = 0;
let segmentStart = 0;
let playing = false;
let transitioning = false;
let frame;
let fadeTimer;

function updateControl() {
  const label = playing ? '배경 영상 일시정지' : '배경 영상 재생';
  toggle.classList.toggle('is-playing', playing);
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
}

function pause() {
  playing = false;
  cancelAnimationFrame(frame);
  videos.forEach(video => video.pause());
  updateControl();
}

async function play() {
  try {
    await videos[active].play();
    playing = true;
    updateControl();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  } catch {
    pause(); // 자동 재생이 차단되면 재생 버튼으로 시작할 수 있습니다.
  }
}

async function crossfade() {
  transitioning = true;
  const outgoing = videos[active];
  const incoming = videos[1 - active];
  const nextStart = segmentStart + segmentLength >= outgoing.duration - 0.1
    ? 0 : segmentStart + segmentLength;
  try {
    incoming.currentTime = nextStart;
    await incoming.play();
    if (!playing) {
      incoming.pause();
      transitioning = false;
      return;
    }
    incoming.classList.add('is-visible');
    outgoing.classList.remove('is-visible');
    active = 1 - active;
    segmentStart = nextStart;
    fadeTimer = setTimeout(() => {
      outgoing.pause();
      transitioning = false;
    }, fadeLength * 1000);
  } catch {
    transitioning = false;
    pause();
  }
}

function tick() {
  if (!playing) return;
  const current = videos[active];
  progress.value = Number.isFinite(current.duration) && current.duration > 0
    ? (current.currentTime / current.duration) * 100 : 0;
  const boundary = Math.min(segmentStart + segmentLength, current.duration);
  if (!transitioning && current.currentTime >= boundary - fadeLength) {
    void crossfade();
  }
  frame = requestAnimationFrame(tick);
}

toggle.addEventListener('click', () => playing ? pause() : void play());
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('pagehide', () => {
  pause();
  clearTimeout(fadeTimer);
});

videos.forEach(video => { video.muted = true; });
player.hidden = false;
updateControl();
if (!reducedMotion.matches) void play();
