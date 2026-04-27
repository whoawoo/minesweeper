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
| `index.html` | 메인 / 출석체크(달력) / 게임 — 세 화면을 한 문서에 담음. `#scrollRoot`로 콘텐츠 감쌈 |
| `style.css` | Win95 클래식 (회색 베벨/빨간 LED/9색 숫자) **+** 모던 일몰 그라데이션 출석체크 카드 / 황금 트로피 영역 |
| `script.js` | 게임 로직 + 입력 + 사운드 + 화면 전환 + 저장/이어하기 + 도장/달력/트로피 + PWA 등록 |
| `manifest.json` | PWA 메타데이터 (아이콘 `purpose: "any maskable"`) |
| `service-worker.js` | 오프라인 캐시 + 자동 갱신. **새 배포 때 `CACHE` 버전 숫자 올림** |
| `icon.svg` | 폭탄 벡터 (정중앙, 안전구역 반경 ≤150 — Galaxy 마스크 안 잘리게) |
| `icon-192.png`, `icon-512.png` | PWA용 PNG (rsvg-convert로 SVG에서 변환) |

## 구현된 기능

### 게임 플레이
- 난이도 3종: 초보 8×8/10지뢰, 중수 16×16/40, 고수 16×30/99
- 첫 클릭은 항상 안전 (클릭 칸과 8이웃 빼고 지뢰 배치)
- 빈 칸 자동 펼치기 (flood fill)
- 타이머, 남은 지뢰 카운터 (3자리 LED)
- 스마일 상태: 🙂 기본 / 😯 누르는 중 / 😎 클리어 / 😵 패배
- 스마일 버튼 = 게임 도중에도 즉시 새 게임 리셋 (`pointerdown`으로 처리해 모바일 click 지연 회피)

### 저장 / 이어하기 (localStorage `mw:save`)
- 게임 첫 클릭 이후 매 액션(셀 공개/깃발/메뉴 복귀)마다 자동 저장
- `visibilitychange` / `pagehide`에서도 안전 저장 (PWA 백그라운드 대응)
- 메인 화면에 저장된 판 있으면 "▶ 이어하기 (난이도 · 시간)" 버튼 노출
- 승/패, 새 게임(스마일), 다른 난이도 시작, 출석체크 게임 시작 시 자동 삭제

### 출석체크 (localStorage `mw:stamps`)
- 메인 타이틀 바로 아래 **출석체크 카드** (모던 일몰 그라데이션 — 일부러 Win95와 다른 결로 강조)
  - 좌측: 흰 원반 안 📅 / 가운데: "출석체크" + 설명 + 흰색 알약 도장 카운트 (트로피 ≥1이면 `🏆 N`도 표시)
- 카드 누르면 달력 화면 진입
- 날짜 선택 (없으면 오늘) → "계속하기" → **중수 랜덤 게임**으로 진입 (`pendingStampDate` 보존)
- 클리어 시 그 날짜에 도장(빨간 원). 패배 시 적립 X
- 미래 날짜는 `disabled`/회색, 오늘은 점선 outline
- 트로피 영역
  - 미달성: 흐릿한 🏆 + "N/M — 모두 채우면 트로피!" 진행도
  - 달성(1일~말일 전부 도장): 황금 그라데이션 + shimmer/bounce/twinkle 애니메이션 + "M월 완벽 출석!" 캡션
- `countTrophies()` — 월별 도장 그룹화 후 그 달 말일 수와 비교해 누적 카운트
- 이어하기에 도장 대기 게임도 포함됨 (저장에 `pendingStampDate` 같이 들어감)

### 입력
- **데스크탑**: 좌클릭=공개, 우클릭=깃발 (mousedown button===2로 처리, contextmenu와 분리)
- **모바일**: 탭=공개, 0.4초 롱프레스=깃발 (+진동)
- 핀치 줌 가능
- 두 손가락 팬: 줌 1배일 땐 `#scrollRoot`를 직접 스크롤, 줌 ≥ 1배일 땐 브라우저 visual viewport 팬에 위임
- 당겨서 새로고침 비활성화 (자세한 설명은 아래 함정 섹션)

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
- **단**, 사용자가 캐시된 옛날 `script.js`를 들고 있으면 `controllerchange` 핸들러가 안 깔려있을 수 있어 갱신이 막힘 → **이번 한 번만** 수동으로 클린 재설치 필요했음

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
- `#board` 의 `--cell-size` 를 `min(가로비, 세로비, 32px)` 로 계산
- `100dvh` 사용 (모바일 주소창 들락날락 대응). `vh`만 쓰면 잘림

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
