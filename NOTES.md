# 지뢰찾기 — 작업 노트

> 동생 갤럭시용 지뢰찾기 웹게임. PWA로 설치 가능. GitHub Pages 배포.

## 한눈에 보기

- **플레이 URL**: https://whoawoo.github.io/minesweeper/
- **레포**: https://github.com/whoawoo/minesweeper
- **로컬 폴더**: `~/Documents/github/minesweeper/`
- **타겟**: 갤럭시 S26 Ultra 크롬 (모바일), 데스크탑 브라우저
- **배포 시작**: 2026-04-27

## 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 메인(다이얼로그 윈도우 + 설정 모달) / 출석체크(달력) / 게임 — 세 화면을 한 문서에 담음. `#scrollRoot`로 콘텐츠 감쌈 |
| `style.css` | Win95 클래식 베이스 + 6테마(`body.theme-*`) CSS 변수 + 출석체크 플랫 디자인(트로피/스탬프/inset 솔리드) |
| `script.js` | 게임 로직 + 입력 + 사운드 + 화면 전환 + 저장/이어하기 + 도장/달력/트로피 SVG + 테마 + PWA 등록 |
| `manifest.json` | PWA 메타데이터 (아이콘 `purpose: "any maskable"`) |
| `service-worker.js` | 오프라인 캐시 + 자동 갱신. **새 배포 때 `CACHE` 버전 숫자 올림** (현재 v60, 동시에 index.html의 `?v=N` 쿼리도 같이 올림) |
| `icon.svg` | 폭탄 벡터 (정중앙, 안전구역 반경 ≤150 — Galaxy 마스크 안 잘리게) |
| `icon-192.png`, `icon-512.png` | PWA용 PNG (rsvg-convert로 SVG에서 변환) |
| `bg-pattern*.svg` | 테마별 배경 패턴 (classic/forest/lavender/ocean/cherry/black) |
| `sounds/*.mp3` | 트로피 사운드. 12지 동물 12개 + `sounds/laugh/` 웃음 4개 |
| `preview-*.html` | 출석체크/트로피/테마/메인페이지 시안 데모 (production 영향 X) |

## 구현된 기능

### 게임 플레이
- 난이도 3종: 초보 8×8/17지뢰, 중수 16×16/54, 고수 16×30/103
- 첫 클릭은 항상 안전 (클릭 칸과 8이웃 빼고 지뢰 배치)
- 빈 칸 자동 펼치기 (flood fill)
- 타이머, 남은 지뢰 카운터 (3자리 LED)
- 스마일 상태: 🙂 기본 / 😯 누르는 중 / 😎 클리어 / 😵 패배
- 스마일 버튼 = 게임 도중에도 즉시 새 게임 리셋 (`pointerdown`으로 처리해 모바일 click 지연 회피)
- 셀 드래그아웃 시 click 취소 — 누른 칸 박스 밖으로 손가락 벗어나면 `suppressNextClick=true` + 스마일리 복귀. 잘못 누른 칸에서 빠져나갈 수 있음

### 게임 모드 (localStorage `mw:deductionMode`) — L 모드 / 라이토(추리) 모드
- **L 모드** (기본): 일반 무작위 배치. 도박수 가끔 발생
- **라이토 모드**: 보드 생성 후 솔버로 시뮬레이션해 추리만으로 풀리는지 검증. 안 되면 재생성 (최대 300회), 그래도 못 만들면 일반 보드 폴백
- 솔버: 기본 추론(`n - flagged == unrevealed → 모두 지뢰` / `minesLeft == 0 → 모두 안전`) + subset 추론(A.unknowns ⊂ B.unknowns일 때 차이 셀 결정 — 1-2-1, 1-1 패턴 처리)
- placeMines를 `placeMinesRandom` + `isSolvableNoGuess` 두 함수로 분리

### 클리어 연출 (localStorage `mw:clearEffect`)
- **컨페티** (기본): 스마일리에서 색종이 100개 폭발 + 헤일로 펄스(노→주→빨) + 스마일리 점프 + 별빛 크랙(고음 노이즈 20개 + 종소리 5음 무작위)
- **마크 경험치**: 깃발(지뢰) 셀에서 XP 오브가 솟아 스마일리로 빨려들어감. 도착마다 마크 XP 픽업 핑(B6~G7 사인+옥타브 배음, 디튠 ±3%, attack envelope) + 글로우 + 마지막 강한 딩 + "+EXP" 텍스트
- **발사 윈도우 1.2초 고정** (v60): 모든 오브를 1.2초 안에 균등 분산 (오브 개수에 무관). 이전엔 0.06초 stagger라 고수에서 ~13초까지 늘어났음. 셀당 오브 2개는 그대로, 깃발 셀 선택자는 `.cell.flagged`
- `#celebrationCanvas`, `#celebrationHalo`, `#celebrationLevelUp` 전역 오버레이. `handleWin()`에서 `playClearEffect()` 호출
- 사운드는 모두 Web Audio API로 합성 (외부 mp3 X)

### 저장 / 이어하기 (localStorage `mw:save`)
- 게임 첫 클릭 이후 매 액션(셀 공개/깃발/메뉴 복귀)마다 자동 저장
- `visibilitychange` / `pagehide`에서도 안전 저장 (PWA 백그라운드 대응)
- 메인 화면에 저장된 판 있으면 "▶ 이어하기 (난이도 · 시간)" 버튼 노출
- 승/패, 새 게임(스마일), 다른 난이도 시작, 출석체크 게임 시작 시 자동 삭제

### 출석체크 (localStorage `mw:stamps`)
- 메인 다이얼로그 본문 최상단에 **출석체크 카드** (`📅` 아이콘 + "출석체크" + LED 카운터)
  - LED는 트로피 ≥1이면 초록(`--led-fg-trophy`), 없으면 빨강(`--led-fg`)
- 카드 누르면 달력 화면 진입 (메뉴 버튼은 cal-frame 왼쪽 끝과 정렬, `.att-row` wrapper)
- 날짜 선택 (없으면 오늘) → "계속하기" → **중수 랜덤 게임**으로 진입 (`pendingStampDate` 보존)
- 날짜 클릭하면 inset 솔리드 + 살짝 어두워짐(filter brightness), 한 번 더 누르면 토글 해제
- 클리어 시 그 날짜에 도장. 패배 시 적립 X
- 미래 날짜는 `disabled`/회색, 오늘은 점선 outline
- **테마별 도장 SVG** (격일 교대로 stamp-a / stamp-b 클래스 부여):
  - 클래식: 폭탄 / 깃발
  - 포레스트: 솔잎 / 버섯
  - 라벤더: 꽃 / 나비
  - 오션: 물고기 / 파도
  - 체리: 벚꽃 / 하트
  - 미드나잇: 별 / 초승달
- 트로피 영역
  - 미달성: 🏆 + "N/M — 모두 채우면 트로피!" 진행도
  - 달성(1일~말일 전부 도장): **A1(컵)/B1(월계관)/C1(크라운) SVG** 월별 순환 (`(month-1) % 3`) + "M월 CLEAR!" 캡션 (CLEAR! 부분만 테마 액센트 컬러)
  - 트로피 누르면 1.3x 확대 + 사운드 재생 후 원복
- `countTrophies()` — 월별 도장 그룹화 후 그 달 말일 수와 비교해 누적 카운트
- 이어하기에 도장 대기 게임도 포함됨 (저장에 `pendingStampDate` 같이 들어감)
- cal-frame 윗변이 메인 다이얼로그 윗변과 같은 Y에 오도록 JS가 `--attendance-padding-top` 동적 계산 (`syncAttendanceTop()`)

### 테마 (localStorage `mw:theme`)
- 6 테마: classic / forest / lavender / ocean / cherry / midnight
- `body.theme-X` 클래스로 전환. 베이스(클래식)는 클래스 없음
- 각 테마는 CSS 변수(`--gray`, `--shadow`, `--bg`, `--title-bg`, `--led-bg/fg`, `--trophy-bg`, `--caption-fg/clear`, `--wk-bg/fg/divider` 등) + 배경 패턴 SVG로 정의

### 설정 모달 (그리드 디자인)
- 메인 다이얼로그 ⚙️ → 모달
- **테마**: 3열 컴팩트 타일 (스왓치 + 이름 세로) — 6개가 2행
- **클리어 화면 / 게임 모드**: 2열 페어 핀 (큰 이모지 + 라벨)
- `.theme-grid` / `.option-pair` 그리드, 공통 옵션 버튼은 `.theme-item` 클래스 (active 토글 공유)
- 모달 max-width 340px, padding 14px, section 간격 14px

### 반응형 레이아웃 (3-tier 미디어쿼리)
- **폰** (default): 셀 캡 56px
- **태블릿 세로** (`min-width: 700px and orientation: portrait`): 셀 캡 72px
- **태블릿 가로** (`min-width: 1024px and orientation: landscape`): 셀 캡 80px + back-btn 좌상단 fixed + 보드 세로 가운데
- 셀 크기 계산은 `min(100vw, 100dvh)` / `max(100vw, 100dvh)` 사용 — 폰 회전해도 보드 사이즈 안 변함 (방향 무관 portrait 기준)
- 출석체크 배너 보이면 `:has(.stamp-banner:not(.hidden))`로 `--banner-offset: 50px` 적용해 보드 높이 보정

### 트로피 사운드
- 트로피 클릭 시 그 달의 동물 사운드 재생 (12지 매핑: 1=cow, 2=tiger, ..., 12=mouse)
- 20% 확률로 랜덤 웃음 사운드 대신 재생 (단 직전이 웃음이면 무조건 동물 — 연달아 웃음 방지)
- 모든 mp3는 ffmpeg afade out으로 페이드아웃 처리됨

### 입력
- **데스크탑**: 좌클릭=공개, 우클릭=깃발 (mousedown button===2로 처리, contextmenu와 분리)
- **모바일**: 탭=공개, 0.4초 롱프레스=깃발 (+진동)
- 핀치 줌 가능 (`touch-action: pinch-zoom`)
- 한 손가락 드래그 차단 → iOS 러버밴드 바운스 일체 X
- body 전역 `user-select:none + webkit-touch-callout:none` → 롱프레스 시 텍스트 선택 파란박스/돋보기/카피 메뉴 차단

### 사운드 (Web Audio API로 합성, 외부 파일 없음)
- 칸 공개: 짧은 사인파 비프
- 깃발 토글: 600→1100Hz square 팝
- 폭발: 노이즈 + 저음 사인파 폭격

### PWA
- `manifest.json` + `service-worker.js`
- "앱 설치"하면 standalone 모드로 풀스크린 (주소창 X)
- 오프라인 동작 (한 번 열어둔 자원은 캐시에서 로드)
- 새 버전 자동 갱신 (`controllerchange` 핸들러로 1회 자동 새로고침)

## 자주 쓰는 명령어

### 코드 수정 → 배포
```bash
cd ~/Documents/github/minesweeper
# 코드 수정
git add -A
git commit -m "수정 내용"
git push
# 30초~1분 뒤 GitHub Pages가 자동 재배포됨
```

### CSS/JS 즉시 반영시키고 싶을 때 (PWA 사용자)
`service-worker.js` 의 `const CACHE = "minesweeper-vN";` 에서 N을 +1.
HTML은 network-first라 즉시 반영되지만, CSS/JS는 cache-first라 캐시 버전 안 올리면 한 번 더 열어야 갱신됨.

### 아이콘 다시 만들기 (icon.svg 수정 후)
```bash
cd ~/Documents/github/minesweeper
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
```

## 알면 좋은 함정

### 1. PWA 캐시 강제 갱신
- `service-worker.js`를 변경하면 브라우저가 새 SW 감지 → install → activate → `clients.claim()` → `controllerchange` → 자동 새로고침 1회
- **단**, 사용자가 캐시된 옛날 `script.js`를 들고 있으면 `controllerchange` 핸들러가 안 깔려있을 수 있어 갱신이 막힘 → 그 한 번만 수동으로 클린 재설치 필요
- **추가로 PWA standalone에선 navigation이 거의 없어서 브라우저가 새 SW 자체를 자동 체크하지 않음** (Chrome 기본 24h). 와이파이 있어도 옛 버전 계속 받던 원인 → 커밋 `f72ed90` 에서 다음 3가지로 해결:
  - `register("./service-worker.js", { updateViaCache: "none" })` — SW 파일은 HTTP 캐시 무시하고 네트워크에서 받음
  - 등록 직후 즉시 `registration.update()` 1회
  - `visibilitychange`로 포어그라운드 복귀할 때마다 `update()`
- **localStorage(`mw:stamps`, `mw:save`)는 `caches.delete()`와 무관** — SW 캐시 청소해도 도장/이어하기는 안 사라짐. 진짜 날아가는 경우는 Chrome 사이트 설정 "삭제 및 재설정" 또는 일부 안드로이드의 PWA 제거

### 2. 갤럭시 PWA에서 pull-to-refresh 막기
- `overscroll-behavior: none` (CSS) → **갤럭시 standalone PWA에서 안 먹는 경우 있음**
- JS `touchmove preventDefault` → 갤럭시 PWA에서 무시되는 경우 있음
- **결국 정답**: `body { position: fixed; inset: 0; }` + `html, body { overflow: hidden }` + 안쪽 `#scrollRoot`가 실제 스크롤 담당
- 이렇게 하면 document 자체가 물리적으로 스크롤 불가 → pull-to-refresh가 발동할 자리가 없음
- 핀치 줌은 visual viewport에서 별도 처리되니 영향 없음

### 3. 모바일 롱프레스의 contextmenu
- 모바일 Chrome은 롱프레스 시 자체 `contextmenu` 이벤트도 발사함
- `contextmenu` 핸들러에서 깃발 토글하면 우리 타이머 깃발 + contextmenu 깃발 = **이중 토글 → 깜빡임**
- 해결: `contextmenu` 는 `preventDefault`만 하고, 데스크탑 우클릭은 `mousedown e.button === 2` 로 분리해서 처리

### 4. 셀 size + 반응형
- `#board` 의 `--cell-size` 를 `min(가로비, 세로비, 캡)` 로 계산. 캡은 폰 56 / 태블릿 세로 72 / 태블릿 가로 80
- `100dvh` 사용 (모바일 주소창 들락락 대응). `vh`만 쓰면 잘림
- 가로 여유분 48px = view 패딩(24) + game-frame 테두리·패딩(18) + board-frame 테두리(6). 32px 같이 줄이면 우측 오버플로 → game-stack `width:fit-content + max-width:100%` 조합과 만나 보드가 우측 쏠림
- `min(100vw, 100dvh)` / `max(100vw, 100dvh)` 사용 → 방향 무관 portrait 기준 사이즈 (폰 회전해도 보드 안 변함)

### 5. PWA 아이콘 잘림 (Android maskable)
- `manifest.json`에서 아이콘 `purpose: "any maskable"`로 선언
- Android(특히 Galaxy One UI)는 maskable 아이콘에 동그라미/스쿼클 마스크 자동 적용
- **safe zone**: 캔버스 중심에서 반경 0.4 (512px 기준 반경 ≈205) 안의 콘텐츠만 잘림 보장
- 보수적으로 콘텐츠 반경 ≤150 로 설계 → 어떤 마스크에도 안전
- **함정**: 한번 설치된 PWA의 홈 아이콘은 OS가 캐시함 → SVG/PNG 갱신해도 자동 반영 X. 새 아이콘 보려면 PWA 제거 → 재설치
- 이전 버그: 폭탄 cy=280 (캔버스 중심 256보다 24px 아래) → 하단 가시 y=445 → Galaxy에서 잘림. 정중앙 + 축소로 수정 (커밋 `e1bb0aa`)

### 6. 모바일에서 스마일 click 지연
- `click` 이벤트만 걸어두면 게임 도중 탭이 늦거나 다른 핸들러에 막혀서 새 게임 안 되는 경우 있음
- 해결: `pointerdown`에서 즉시 `init()` 호출 + 200ms 디바운스로 click 폴백과 중복 방지
- 사용자가 결과 화면(😎/😵)이 떠야만 리셋되는 줄 알았던 원인

### 7. ::after는 한 요소당 하나뿐 (display:none 중복 함정)
- `.cal-day.stamped::after` (빨간 동그라미) 위에 `body.theme-X .cal-day.stamp-a::after` (테마 SVG)를 덮어쓰려고 했는데, 둘 다 같은 ::after를 가리킴
- 처음에 안전하게 한답시고 `body.theme-X .cal-day.stamped::after { display: none }`을 추가했더니 — 같은 ::after가 통째로 사라져서 SVG도 안 보임
- **해결**: display:none 제거하고, stamp-a/b ::after 규칙에서 `border: none; border-radius: 0; inset: 14%; background-image: ...` 같은 속성을 명시적으로 덮어쓰기 (specificity로 stamped::after를 이김)

### 8. 테마의 `body.theme-X .cal-day` 색상 specificity
- `.cal-day.stamp-a, stamp-b { color: transparent }` (0,2,0)이 `body.theme-X .cal-day { color: ... }` (0,2,1)에 specificity로 짐
- 도장 칸인데 숫자가 그대로 보이던 버그
- **해결**: 각 테마의 `body.theme-X .cal-day.stamp-a, .stamp-b` 규칙에 `color: transparent` 명시

### 9. 메인 다이얼로그/cal-frame 윗변 Y 맞추기 (CSS calc 한계)
- 메인은 `justify-content: center` + `padding: 30/90` → 다이얼로그 위치가 뷰포트 따라 가변
- 출석체크 cal-frame 윗변을 같은 Y에 두려면 다이얼로그 실제 높이를 알아야 함 — CSS만으론 불가능
- **해결**: `showAttendance()` 시점에 `dialog.getBoundingClientRect().top` 측정 → `back-btn(40)+gap(12)=52` 보정해서 `--attendance-padding-top` 변수에 적용
- mainView가 보이는 동안만 측정 가능 (display:none 상태에선 0). showAttendance 직전에 항상 새로 측정

### 10. cal-frame과 back-btn 왼쪽 끝 정렬
- cal-frame은 max-width 360px로 가운데 정렬됨. back-btn은 `align-self: flex-start`라 view 왼쪽 가장자리에 붙음 → 데스크탑/넓은 뷰포트에서 어긋남
- **해결**: `.att-row` (max-width 360 + align-self:center) wrapper로 back-btn 감쌈 → cal-frame과 같은 max-width 컨테이너 안에 들어가니 왼쪽 끝 일치
- 게임 화면도 동일 패턴: `.game-stack { width: fit-content }`로 game-frame 폭에 맞춤 (game-frame은 보드 크기에 따라 가변)

### 11. 요일 헤더 box-shadow가 양쪽 그리드 밖으로 삐져나감
- `.cal-wkhead` 띠 효과는 `box-shadow: -2px 0 0 var(--wk-bg), 2px 0 0 var(--wk-bg)`로 셀 사이 4px 갭을 채움
- 그런데 첫 칸(일요일)의 왼쪽 그림자, 마지막 칸(토요일)의 오른쪽 그림자는 그리드 가장자리 밖으로 튀어나가 폭이 안 맞음
- **해결**: `.cal-wkhead.sun`은 오른쪽 그림자만, `.cal-wkhead.sat`은 왼쪽 그림자만 남김

### 12. iOS 러버밴드 바운스 / 스크롤
- `overscroll-behavior: contain`은 "바운스는 허용하고 바깥 전파만 막음" → 한 손 드래그하면 화면이 따라옴
- **해결**: `#scrollRoot { overflow: hidden; touch-action: pinch-zoom }` — 스크롤 컨텍스트 자체 제거 + 한 손가락 드래그 차단. 핀치 줌은 별도라 영향 X
- 모든 화면(메인/출석체크/게임)이 viewport 안에 들어가야 함 — 작은 폰 가로 모드는 비지원

### 13. 폰 회전 잠금 시도 (포기)
- manifest `"orientation": "portrait"` — iOS 16.4+ PWA에서만 동작, 사파리 탭에서 무시
- `screen.orientation.lock("portrait")` — 풀스크린/PWA에서만 동작, 일반 탭에서 거부
- CSS `transform: rotate(90deg)` — 콘텐츠가 옆으로 누워 보임 ("뒤집어진다"고 사용자 거부)
- 결국 회전 막는 코드 다 제거. 자연스럽게 reflow되도록 둠. 보드 셀 크기만 `min/max`로 방향 무관 portrait 사이즈 유지

### 14. 모바일 롱프레스 텍스트 선택 파란박스
- `.cell`에만 `user-select:none` 걸어도 iOS는 부모 컨텍스트 따라 무시할 수 있음
- **해결**: `body`에 전역 적용 — `-webkit-user-select: none + user-select: none + -webkit-touch-callout: none + -webkit-tap-highlight-color: transparent`
- 게임에 텍스트 입력이 없으므로 전역 차단해도 안전

### 15. PWA 캐시 즉시 무효화 (?v= 쿼리 트릭)
- SW 캐시 버전 올려도 사용자 브라우저는 옛 CSS/JS를 cache-first로 바로 안 갱신
- **해결**: SW v 올릴 때마다 `index.html`의 `<link href="style.css?v=N">` / `<script src="script.js?v=N">`도 같이 올림
- 새 URL은 SW 캐시에 없으므로 강제 네트워크 fetch → 즉시 새 코드 적용

### 16. 출석체크 미션 중 `pendingStampDate` 보존
- 초기 구현: `handleLose()`와 `resetCurrentGame()`(스마일)에서 `pendingStampDate = null` → 지거나 재시작하면 미션 사라짐
- **버그**: 동생이 중수(16×16/40지뢰)를 한 번에 클리어 못 하고 재시도하니 도장이 영영 안 찍힘
- 해결 (커밋 `71b0b6e`): 두 함수 모두 `pendingStampDate` 유지. 같은 날짜로 클리어할 때까지 계속 도전 가능. `resetCurrentGame()`은 init 후 `showStampBannerIfPending()` 다시 호출해서 배너 복원
- 미션을 명시적으로 끝내는 곳만 클리어: `handleWin()`(addStamp 후), `startGame()`(메인에서 다른 난이도 선택), `startAttendanceGame()`(다른 날짜로 재진입)

## 안 한 것 / 추후 옵션

- 승리 효과음 (지금은 폭발음만 있음)
- 최고 기록 저장 (localStorage로 난이도별 best time)
- 다크/라이트 테마 토글
- ~~게임 진행 중 메뉴로 돌아가도 상태 유지~~ ✅ (저장/이어하기 구현됨)
- 더 정교한 7-segment 폰트 (지금은 monospace + 빨강)
- 다국어 (현재 한국어만)
- 출석체크: 트로피 획득 시 효과음/풀스크린 축하 연출
- 출석체크: 데이터 백업 (지금은 localStorage 단일 디바이스 — 캐시 삭제 시 도장 다 날아감)

## 디버깅 시 체크리스트

문제 생기면 순서대로:

1. 서버 코드 확인:
   ```bash
   curl -s https://whoawoo.github.io/minesweeper/index.html | head -20
   curl -s https://whoawoo.github.io/minesweeper/service-worker.js | grep CACHE
   ```
2. 클라이언트 캐시 비우기:
   - Chrome 메뉴 → 설정 → 사이트 설정 → minesweeper → "삭제 및 재설정"
   - 또는: PWA 아이콘 길게 → 제거 → Chrome에서 다시 방문 → 다시 설치
3. SW 상태 확인 (PC Chrome): `chrome://serviceworker-internals` 에서 minesweeper 항목 → Unregister 후 재방문

## 작업 흐름 요약 (시간순)

1. ~~9×9 빈 보드 렌더링~~ ✅
2. ~~지뢰 배치 + 첫 클릭 안전 + flood fill~~ ✅
3. ~~터치/마우스 입력 매핑 (롱프레스 = 깃발)~~ ✅
4. ~~난이도 선택, 타이머, 남은 지뢰, 승패 판정~~ ✅
5. ~~Win95 클래식 디자인 (LED, 스마일, 베벨)~~ ✅
6. ~~배경 회색으로, 메인 페이지 분리~~ ✅
7. ~~사운드 (Web Audio 합성)~~ ✅
8. ~~반응형 다듬기~~ ✅
9. ~~GitHub Pages 배포~~ ✅
10. ~~PWA 변환 (manifest + SW + 아이콘)~~ ✅
11. ~~핀치 줌 활성화~~ ✅
12. ~~폭탄 빨간 배경 제거~~ ✅
13. ~~pull-to-refresh 차단~~ ✅
14. ~~두 손가락 팬 (줌 안 했을 때도 화면 이동)~~ ✅
15. ~~저장/이어하기 (localStorage `mw:save`)~~ ✅
16. ~~출석체크 시스템 (달력 + 도장 + 트로피)~~ ✅
17. ~~스마일 새 게임을 게임 도중에도 즉시 리셋되게 (`pointerdown`)~~ ✅
18. ~~출석체크 카드 시각 강조 (모던 그라데이션, 메인 최상단)~~ ✅
19. ~~트로피 영역 강조 (황금 그라데이션 + 애니메이션 + 진행도)~~ ✅
20. ~~PWA 아이콘 safe zone 안으로 재배치 (Galaxy 하단 잘림 수정)~~ ✅
21. ~~출석체크 도장이 안 찍히던 버그 수정 (지거나 스마일 재시작해도 `pendingStampDate` 유지)~~ ✅
22. ~~PWA 자동 갱신 신뢰성 (updateViaCache:'none' + 등록 시·포어그라운드 복귀 시 update())~~ ✅
23. ~~메인 다이얼로그 윈도우 + 설정 모달 (테마 6종 선택)~~ ✅
24. ~~6 테마 시스템 (CSS 변수 + body.theme-* 클래스 + 배경 패턴 SVG)~~ ✅
25. ~~트로피 SVG 일러스트 (A1 컵 / B1 월계관 / C1 크라운) 월별 순환~~ ✅
26. ~~트로피 사운드 (12지 동물 + 20% 랜덤 웃음, 직전 웃음이면 무조건 동물)~~ ✅
27. ~~출석체크 플랫 디자인 (Win95 베벨 제거, border-radius)~~ ✅
28. ~~테마별 도장 SVG 격일 교대 (stamp-a / stamp-b)~~ ✅
29. ~~트로피 영역에 inset 솔리드 + cal-grid/header 동일 강도 통일~~ ✅
30. ~~날짜 선택 표시: 테두리 → inset 솔리드, 다시 누르면 토글 해제~~ ✅
31. ~~메뉴/계속하기 버튼 살짝 둥글게 (border-radius 4)~~ ✅
32. ~~메뉴 버튼을 cal-frame/game-frame 왼쪽 끝과 정렬 (.att-row / .game-stack wrapper)~~ ✅
33. ~~출석체크 cal-frame 윗변을 메인 다이얼로그 윗변과 맞춤 (JS 측정)~~ ✅
34. ~~지뢰 개수 상향 (초보 10→17, 중수 40→54, 고수 99→103)~~ ✅
35. ~~반응형 3-tier (폰 56 / 태블릿 세로 72 / 태블릿 가로 80) + back-btn fixed top-left in 태블릿 가로~~ ✅
36. ~~출석체크 배너 표시 시 보드 높이 50px 보정 (`:has()` 선택자 + `--banner-offset`)~~ ✅
37. ~~iOS 러버밴드 바운스 차단 (overflow:hidden + touch-action:pinch-zoom)~~ ✅
38. ~~보드 우측 정렬 버그 수정 (가로 여유분 32→48px)~~ ✅
39. ~~승리 클리어 연출 통합 (컨페티+헤일로+종소리 / 마크 경험치 + 설정에서 선택)~~ ✅
40. ~~셀 드래그아웃 시 click 취소 (잘못 누른 칸에서 빠져나가기)~~ ✅
41. ~~게임 모드 (L 모드 / 라이토 추리 모드) — no-guess 솔버 (기본 추론 + subset 추론)~~ ✅
42. ~~body 전역 user-select:none — 롱프레스 텍스트 선택 파란박스 차단~~ ✅
43. ~~보드 셀 크기 방향 무관 portrait 기준 (`min/max(100vw, 100dvh)`)~~ ✅
44. ~~설정 모달 그리드 디자인 (테마 3열 / 페어 2열, 모달 너비 340)~~ ✅
45. ~~폰 회전 잠금 시도 후 포기 — manifest/JS lock/CSS rotate 다 한계, 자연 reflow로 둠~~ ✅
46. ~~마크 클리어 XP 오브 복구: 깃발 셀 선택자 `.cell.flag` → `.cell.flagged` (도입 때부터 잘못된 셀렉터로 빈 NodeList → 오브/사운드 미동작)~~ ✅
47. ~~마크 클리어 발사 윈도우 1.2초 고정: 오브당 0.06초 stagger → 1.2초 안에 균등 분산. 난이도 무관 ~1.9초 마무리 (이전 중수 ~5.5초, 고수 ~13초)~~ ✅
