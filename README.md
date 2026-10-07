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
node --test tests/assets.test.cjs tests/landing/transition.test.cjs tests/landing/lifecycle.test.cjs tests/world-map/regions.test.cjs tests/world-map/navigation.test.cjs tests/world-map/return.test.cjs tests/world-map/countries.test.cjs
```

자원 경로, 영상 완료 후 이동, 취소, 재생 실패, 이벤트 정리, 배경 재생 조율,
대륙 영역 판정, 지도 초기화의 중복 방지를 검사합니다.
이 테스트는 브라우저 렌더링이나 실제 영상 디코딩 검사를 대신하지 않습니다.

수동 확인: GO → 영상 종료 → 지도 이동, Escape 취소, 브라우저 뒤로 가기,
대륙 Hover/Tab 강조, 서로 다른 화면 비율, 동작 줄이기 설정을 확인하세요.

## 아시아 페이지와 대륙 이동

세계지도에서 Asia를 클릭하거나 Tab으로 선택한 뒤 Enter/Space를 누르면
아시아 중심으로 약 1.5초간 확대·페이드하며 아시아 페이지로 이동합니다.
Escape로 전환을 취소할 수 있습니다. 동작 줄이기 설정에서는 확대 없이 짧게 페이드합니다.
아시아 페이지의 세계지도 링크로 돌아올 수 있습니다.

- `shared/data/continents.js`: 이동 가능한 대륙과 페이지 경로. 현재 아시아만 등록되어 있습니다.
- `pages/world-map/js/navigation.js`: 대륙 진입, 키보드, 취소, 복귀 처리.
- `pages/world-map/css/navigation.css`: 대륙 중심 확대와 아시아 미리보기 페이드.
- `pages/continents/common/css/layout.css`: 대륙 페이지 지도 배치와 뒤로가기 링크.
- `pages/continents/asia/index.html`: 아시아 지도 화면.
- `pages/continents/asia/assets/map.png`: 앞서 생성한 아시아 지도 시안.
- `pages/continents/asia/data/config.js`: 페이지 제목과 세계지도 복귀 경로.
- `pages/continents/asia/js/main.js`: 아시아 페이지 초기화.
- `pages/continents/asia/css/page.css`: 아시아 전용 스타일.
- `tests/world-map/navigation.test.cjs`: 진입, 중복 방지, 취소, 키보드, 복귀 검사.

아시아 페이지에서 국가별 Hover/Focus 강조와 클릭 선택을 지원합니다. 사진 패널은 아직 추가하지 않았습니다.
추가 설명은 `module-docs/06_아시아진입모듈.txt`를 참고하세요.

### 세계지도로 돌아오기

아시아 페이지의 `← 세계지도` 링크는 약 1.5초간 반대 방향으로 축소·페이드한 뒤 세계지도로 이동합니다.
세계지도 미리보기는 아시아 중심으로 확대된 상태에서 원래 배율로 돌아오므로 진입 효과와 연결됩니다.
Escape로 취소할 수 있으며, 동작 줄이기 설정에서는 짧은 페이드로 대체합니다.
Ctrl/Command 클릭과 새 탭 열기는 일반 링크 동작을 유지합니다.

- 공통 동작: `pages/continents/common/js/return-transition.js`
- 공통 효과: `pages/continents/common/css/return-transition.css`
- 아시아 확대 중심: `pages/continents/asia/data/config.js`의 `worldMapFocus`
- 검증: `tests/world-map/return.test.cjs`

세계지도 윤곽을 바꾸면 `worldMapFocus`도 해당 대륙의 새 중심에 맞춰 갱신하세요.

### 아시아 국가 선택

- 마우스 Hover 또는 Tab 포커스: 해당 국가 강조와 한글·영문 이름 표시.
- 클릭 또는 Enter/Space: 선택 유지. 다른 국가를 선택하면 기존 선택 해제.
- 같은 국가 재클릭, 바다 클릭 또는 Escape: 선택 해제.
- 작은 국가·지역은 지도 위 작은 포인트로 선택합니다.
- `pages/continents/common/js/selection.js`: 국가 SVG 생성과 선택 상태.
- `pages/continents/common/css/country.css`: Hover, 선택 효과, 국가명 안내.
- `pages/continents/asia/data/countries.js`: 50개 선택 항목의 이름·윤곽·포인트.
- `scripts/build-asia-regions.py`: 이미지 경계 추출과 수동 보정으로 데이터 재생성.
- `tests/world-map/countries.test.cjs`: 선택 상태, 키보드, 해제, 대표 좌표 판정.

윤곽은 생성된 지도 시안에 맞춘 UI 감지 영역이며 공식 지리 경계 데이터가 아닙니다.
특히 작은 국가와 도서 지역은 단순화된 윤곽 또는 포인트를 사용합니다.
원본 이미지 수정 없이 `python scripts/build-asia-regions.py`로 재생성할 수 있습니다.
Python, Pillow, NumPy가 필요하며 기존 build-map-regions.py의 윤곽 함수를 재사용합니다.

### 일본 페이지 진입

아시아 지도에서 Japan 클릭 또는 Enter/Space로 일본 위치를 향해 약 1.4초 확대하며
`pages/asia-countries/japan/index.html`로 이동합니다. Escape로 취소할 수 있습니다.
일본 페이지에는 Japan 제목과 아시아 지도 복귀 링크를 배치했습니다. 국가별 사진 콘텐츠는 이후 추가합니다.
다른 국가는 기존 선택 강조를 유지합니다.

- 목적지: `pages/continents/asia/data/destinations.js`
- 공통 진입: `pages/continents/common/js/country-navigation.js`
- 진입 효과: `pages/continents/common/css/country-navigation.css`
- 국가 첫 화면 스타일: `pages/countries/common/css/hero.css`
- 일본 화면: `pages/asia-countries/japan/` 아래 HTML, CSS, JS, data
- 테스트: `tests/world-map/country-navigation.test.cjs`

전체 검사: `node --test tests/assets.test.cjs tests/landing/*.test.cjs tests/world-map/*.test.cjs`

국가 페이지 폴더 규칙
- pages/asia-countries/japan/: 일본 전용 HTML, CSS, JS, data
- pages/countries/common/: 모든 대륙의 국가 페이지가 공유하는 스타일과 기능
- 이후 유럽 국가는 pages/europe-countries/ 아래에 추가합니다.

### 일본 페이지 도쿄 사진 슬라이더

첫 화면 아래 흰 배경에 Tokyo | 東京 제목과 사진 두 장을 표시합니다.
데스크톱에서는 두 장, 모바일에서는 한 장씩 보이며 가로 방향으로 순환합니다.
하단 막대형 표시, 이전/다음 버튼, 사진 클릭, 좌우 방향키, 마우스 드래그와 터치로 이동합니다.
활성 사진에 맞춰 위치 표시가 바뀝니다. 자동 재생은 하지 않습니다.
세로 스크롤은 유지하고 동작 줄이기 설정에서는 즉시 전환합니다.

- 공통 CSS: pages/countries/common/css/gallery.css
- 공통 JS: pages/countries/common/js/gallery.js
- 도쿄 섹션: pages/asia-countries/japan/index.html, css/page.css
- 사진: assets/images/tokyo-nightlife.png, tokyo-crossing.png (일본 페이지 기준)
- 검사: node --test tests/assets.test.cjs tests/world-map/gallery.test.cjs
