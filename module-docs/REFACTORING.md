# 리팩토링 기록

구조 개선의 이유, 변경 범위와 검증 결과를 누적하는 문서입니다.
새 작업은 아래 기록 양식을 사용해 최신 항목부터 추가합니다. 기존 기록은 삭제하지 않고,
후속 변경이 있으면 새 항목에서 이전 결정을 어떻게 변경했는지 설명합니다.

## 기록 양식

```md
## YYYY-MM-DD — 작업 제목
- 배경 및 문제:
- 변경 내용:
- 공통 모듈 분리 여부와 이유:
- 주요 파일:
- 검증 명령 및 결과:
- 남은 확인 사항 / 확장 시 주의점:
```

## 2026-10-13 — 랜딩 지도 전환 시작 함수 정리

- 배경 및 문제: 영상 `ended` 이벤트 내부에 지도 전환 준비가 포함되어 있어 향후 다른 진입 경로가 추가되면 중복될 수 있었다.
- 변경 내용: `beginMapArrival()`로 영상 정지, 기존 타이머 정리, 중복 시작 방지, 지도 전환 클래스 적용과 이동 타이머 등록을 모았다. `ended`는 이 함수를 호출한다. 실제 페이지 이동은 기존 `openMap()`이 담당한다.
- 비동기 보호: 전환 시작 시 `attempt`를 갱신해 늦게 완료된 `play()`를 무시한다. 지도 전환 시작 이후의 영상 오류와 이동 완료 후 중복 이벤트도 무시한다. 복원 시 이동 상태를 초기화해 재시도할 수 있다.
- 공통 모듈 분리 여부와 이유: 랜딩 전용 동작이므로 `pages/landing/js/transition.js` 내부 함수로 분리했다. 외부 공개 API는 추가하지 않았다.
- 주요 파일: `pages/landing/js/transition.js`, `tests/landing/transition.test.cjs`
- 검증 명령 및 결과: `node --test tests/landing/*.test.cjs` — 10개 통과. 변경 코드의 `git diff --check` 통과. 중복 완료, 늦은 재생 완료, 영상 오류, 취소·복원과 기존 전환 동작을 확인했다.
- 후속 범위: 바로가기, 건너뛰기, 로딩 시간 제한, 버튼 노출 시점 변경은 이번에 포함하지 않았다. 실제 브라우저 시각 검증은 수행하지 않았다.

## 2026-10-13 — 국가 진입 미리보기의 일본 의존성 제거

### 배경 및 문제

공통 `country-navigation.js`가 `.tokyo-hero__image`를 조회하고 아시아 HTML이
일본 전용 CSS와 이미지를 직접 참조했다. 목적지만 추가해도 전환 중에는 일본 이미지가
나올 수 있었으며, 초기화 시 한 번 실행한 이미지 디코딩은 목적지별 교체를 지원하지 못했다.

### 변경 내용

- 아시아 HTML은 `country-portal__*` 클래스의 공통 미리보기 틀만 제공한다.
- 미리보기 전체 화면 배치와 이미지/대체 문구 스타일은 기존 공통 전환 CSS에서 관리한다.
- `destinations.js`에 국가별 `preview.src`, `preview.position`, `preview.background`를 둔다.
- 국가 선택 시 이전 이미지와 스타일을 초기화하고 새 이미지를 디코딩한 후 전환한다.
- 이미지 설정 누락, 디코딩 실패, 2초 대기 초과 또는 `decode()` 미지원 시 공통 배경과 국가명을 표시한다.
- 이미지가 준비되면 문구를 숨겨 기존 일본 이미지에 포함된 글자와 겹치지 않게 한다.
- Escape 취소, 페이지 복원 및 모듈 정리 시 준비 타이머도 해제한다.
  세대 번호와 완료 여부를 검사해 취소·시간 초과 후 도착한 비동기 결과를 무시한다.
- 기존 확대, 동작 줄이기, 이동 중 중복 입력 방지와 페이지 교체까지 미리보기를 유지하는 동작은 보존한다.

### 공통 모듈 분리 판단

전환과 미리보기 표시는 여러 국가에서 같은 방식으로 사용하므로
`pages/continents/common/`의 기존 JS/CSS를 확장했다.
국가별 이미지·표시 설정은 대륙의 목적지 데이터에 남겨 콘텐츠와 동작을 분리했다.
일본 본문 히어로와 연출은 해당 국가에서 관리하며 별도 범용 렌더러는 만들지 않았다.

### 주요 파일

- `pages/continents/common/js/country-navigation.js`: 이미지 준비, 대체 화면, 전환 수명 관리
- `pages/continents/common/css/country-navigation.css`: 공통 미리보기 스타일
- `pages/continents/asia/index.html`: 국가에 독립적인 미리보기 마크업
- `pages/continents/asia/data/destinations.js`: 일본 미리보기 설정
- `tests/world-map/country-navigation.test.cjs`: 목적지 교체, 실패, 시간 초과, 취소 경쟁 상태 검증
- `tests/assets.test.cjs`: 데이터에서 참조하는 경로의 실제 파일 존재 검증

### 국가 추가 시 설정 계약

```js
JP: {
  href: '../../asia-countries/japan/index.html',
  title: 'Japan',
  name: '일본',
  eyebrow: 'ASIA / JAPAN',
  preview: {
    src: '../../asia-countries/japan/assets/images/JapanMainPage.png',
    position: 'center',
    background: '#101413',
  },
}
```

- `href`와 `preview.src`는 데이터를 읽는 **대륙 HTML 기준 상대 경로**다.
- `preview`는 선택 사항이다. 생략 시 국가명 대체 화면으로 이동한다.
- `position` 기본값은 `center`, 배경 기본값은 `#101413`이다.
- 국가명을 `name`에 지정한다. `title` 생략 시 `name`을 제목으로 사용한다.
- 미리보기 자체는 장식용이며, 이동 안내는 기존 `aria-live` 영역이 담당한다.
- 새 미리보기에 공통 JS나 대륙 HTML 수정은 필요하지 않다.
  실제 목적지 페이지와 여행 가능 여부 설정은 별도로 갖춰야 한다.

### 검증

실행 명령:

```sh
node --test tests/assets.test.cjs tests/landing/*.test.cjs tests/world-map/*.test.cjs
git diff --check
```

자동 테스트 58개 통과. 이미지 변경, 미설정/실패 대체 화면, 준비 시간 제한,
취소된 요청과 다음 국가 요청의 경합, 기존 이동·복원 동작 및 실제 이미지 경로를 검증했다.
실제 브라우저에서 데스크톱/모바일 화면의 시각적 일치 여부는 별도 확인이 필요하다.
