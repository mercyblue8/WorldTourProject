# World Tour

세계 여행 포트폴리오를 위한 정적 웹사이트입니다. `index.html`을 브라우저로 열면 실행됩니다.
설치, 서버, 빌드 없이 사용할 수 있으며 `selectWorldMap.html`도 직접 열 수 있습니다.

## 화면 흐름

1. 첫 화면: 배경 영상과 `Feel your freedom` 문구, GO 버튼.
2. GO 클릭: 배경 영상을 일시정지하고 로딩 영상을 재생.
3. 로딩 종료: 약 1.1초의 확대·페이드 후 세계지도 페이지로 이동.
4. 세계지도: 이미지 비율을 유지하며 전체 표시. 대륙 Hover 또는 Tab 포커스 시 강조.

Escape 또는 처음으로 버튼으로 로딩을 취소하면 배경 영상이 다시 재생됩니다.
동작 줄이기 설정에서는 확대 효과를 줄이고 지도 전환을 짧은 페이드로 처리합니다.

## 폴더 구조

```text
WorldTour/
├── index.html
├── selectWorldMap.html
├── pages/
│   ├── landing/
│   │   ├── css/
│   │   │   ├── page.css
│   │   │   ├── background-video.css
│   │   │   └── transition.css
│   │   ├── js/
│   │   │   ├── main.js
│   │   │   ├── background-video.js
│   │   │   └── transition.js
│   │   └── videos/
│   │       ├── background.mp4
│   │       └── loading.mp4
│   └── world-map/
│       ├── css/
│       │   ├── page.css
│       │   └── continent.css
│       ├── js/main.js
│       └── data/continents.js
├── shared/
│   ├── css/base.css
│   ├── css/tokens.css
│   └── images/world-map-dark-en.png
├── scripts/build-map-regions.py
├── tests/
│   ├── assets.test.cjs
│   ├── landing/
│   │   ├── transition.test.cjs
│   │   └── lifecycle.test.cjs
│   └── world-map/regions.test.cjs
└── design/
    ├── concepts/          # 초기 지도 시안
    └── generated/         # 생성 이미지 원본, 프롬프트, 검증 자료
```

## 책임과 의존성

- HTML은 구조와 자원 연결을 담당합니다. 각 페이지는 필요한 CSS/JS만 불러옵니다.
- `shared/css`는 기본 스타일과 공통 색상을 제공합니다. 그 뒤 페이지 CSS를 불러옵니다.
- `landing/main.js`가 배경 재생과 전환 모듈을 초기화하고 연결합니다.
- `createBackgroundVideo()`는 `play()`, `pause()`, `destroy()`를 제공합니다.
- `createTransition()`은 `onStart`, `onRestore`, `navigate`를 주입받고 `isBusy`, `destroy()`를 제공합니다.
- `pagehide`에서 영상·타이머·페이지 이벤트를 정리하고 `pageshow`에서 다시 초기화합니다.
- 지도는 `continents.js` 데이터 로딩 후 `main.js`가 SVG 영역을 생성합니다. Hover/Focus 효과는 CSS가 담당합니다.
- 지도 이미지 한 개를 첫 화면의 전환 미리보기와 지도 페이지가 함께 사용합니다.
- `design/`은 제작 기록입니다. 실행 페이지는 이 폴더를 참조하지 않습니다.

로컬 HTML 실행을 유지하기 위해 일반 `defer` 스크립트와 `window.WorldTour` 네임스페이스를 사용합니다.
모듈 내부 변수는 함수 스코프에 숨겨져 있으며 ES module import나 fetch를 사용하지 않습니다.
스크립트 순서는 landing에서 `background-video → transition → main`, 지도에서 `continents → main`입니다.

## 수정할 위치

| 변경 사항 | 파일 |
|---|---|
| 첫 화면 문구와 버튼 구조 | `index.html` |
| 첫 화면 배치·문구 애니메이션 | `pages/landing/css/page.css` |
| 배경 영상 | `pages/landing/videos/background.mp4` |
| 배경 영상 반복·교차 재생 | `pages/landing/js/background-video.js` |
| 로딩 영상 | `pages/landing/videos/loading.mp4` |
| GO 동작·오류·취소·페이지 이동 | `pages/landing/js/transition.js` |
| 확대·페이드 효과 | `pages/landing/css/transition.css` |
| 지도 비율·여백 | `pages/world-map/css/page.css` |
| 대륙 밝기·테두리·Glow | `pages/world-map/css/continent.css` |
| 대륙 표시 데이터 | `pages/world-map/data/continents.js` |
| 공통 지도 이미지 | `shared/images/world-map-dark-en.png` |
| 공통 배경색 등 | `shared/css/tokens.css` |

전환 길이를 변경할 때 `transition.css`의 1100ms와 `transition.js`의 1400ms 보조 타이머를 함께 확인하세요.
실제 이동은 opacity의 `transitionend`를 기준으로 하며, 보조 타이머는 그 이벤트가 생략될 때 사용합니다.
배경 교차 재생의 `fadeLength`와 `background-video.css`의 opacity 전환 길이도 함께 맞춰야 합니다.

## 지도 데이터 재생성

브라우저 실행에는 Python이 필요하지 않습니다. 윤곽을 재생성할 때만 Python, Pillow, NumPy가 필요합니다.

```sh
python scripts/build-map-regions.py
```

입력은 `shared/images/world-map-dark-en.png`, 출력은 `pages/world-map/data/continents.js`입니다.
HTML이나 원본 이미지는 수정하지 않습니다. 생성된 path는 직접 편집하지 않는 것을 권장합니다.
현재 추출 규칙은 이 지도의 색상과 좌표에 맞춰져 있습니다. 지도 디자인을 바꾸면 추출 규칙도 검토하세요.
이미지 비율을 바꾸면 HTML의 이미지 크기와 지도 `page.css`의 비율도 함께 변경해야 합니다.

## 검증

Node.js가 설치된 환경에서 실행합니다. 추가 패키지는 필요하지 않습니다.

```sh
node --test tests/assets.test.cjs tests/landing/transition.test.cjs tests/landing/lifecycle.test.cjs tests/world-map/regions.test.cjs
```

자원 경로, 영상 완료 후 이동, 취소, 재생 실패, 이벤트 정리, 배경 재생 조율,
대륙 영역 판정, 지도 초기화의 중복 방지를 검사합니다.
이 테스트는 브라우저 렌더링이나 실제 영상 디코딩 검사를 대신하지 않습니다.

수동 확인: GO → 영상 종료 → 지도 이동, Escape 취소, 브라우저 뒤로 가기,
대륙 Hover/Tab 강조, 서로 다른 화면 비율, 동작 줄이기 설정을 확인하세요.
