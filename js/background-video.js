// 6초 구간을 두 플레이어로 교차 재생해 장면과 반복 경계를 부드럽게 연결합니다.
const videos = [...document.querySelectorAll('.background-video')];
const segmentLength = 6;
const fadeLength = 0.65;
let active = 0;
let segmentStart = 0;
let playing = false;
let transitioning = false;
let frame;
let fadeTimer;

function pause() {
  playing = false;
  cancelAnimationFrame(frame);
  videos.forEach(video => video.pause());
  clearTimeout(fadeTimer);
  transitioning = false;

}

async function play() {
  try {
    await videos[active].play();
    playing = true;

    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  } catch {
    pause(); // 다음 사용자 입력에서 자동 재생을 재시도합니다.
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
  const boundary = Math.min(segmentStart + segmentLength, current.duration);
  if (!transitioning && current.currentTime >= boundary - fadeLength) {
    void crossfade();
  }
  frame = requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  else void play();
});
window.addEventListener('pagehide', () => {
  pause();
  clearTimeout(fadeTimer);
});

videos.forEach(video => { video.muted = true; });


document.addEventListener('pointerdown', () => { if (!playing) void play(); });
document.addEventListener('keydown', () => { if (!playing) void play(); });
window.addEventListener('pageshow', () => { if (!playing) void play(); });
void play();
