// 2단계+: 지뢰 배치 + 난이도 선택 + 새 게임 버튼

const DIFFICULTIES = {
  beginner:     { rows: 8,  cols: 8,  mines: 17 },
  intermediate: { rows: 16, cols: 16, mines: 54 },
  expert:       { rows: 30, cols: 16, mines: 103 },
};

let ROWS, COLS, MINES;
let currentDifficulty = "beginner";

const boardEl = document.getElementById("board");
const newGameBtn = document.getElementById("newGame");
const mineCountEl = document.getElementById("mineCount");
const timerEl = document.getElementById("timer");
const mainView = document.getElementById("mainView");
const gameView = document.getElementById("gameView");
const menuBackBtn = document.getElementById("menuBack");
const attendanceView = document.getElementById("attendanceView");
const attendanceBtn = document.getElementById("attendanceBtn");
const attendanceBackBtn = document.getElementById("attendanceBack");
const attendanceContinueBtn = document.getElementById("attendanceContinue");
const attendanceInfoEl = document.getElementById("attendanceInfo");
const calMonthLabel = document.getElementById("calMonthLabel");
const calPrevBtn = document.getElementById("calPrev");
const calNextBtn = document.getElementById("calNext");
const calGridEl = document.getElementById("calGrid");
const calTrophyRow = document.getElementById("calTrophyRow");
const resumeBtn = document.getElementById("resumeBtn");
const resumeInfoEl = document.getElementById("resumeInfo");
const stampBannerEl = document.getElementById("stampBanner");

// localStorage 키
const SAVE_KEY = "mw:save";
const STAMPS_KEY = "mw:stamps";
const LEVEL_NAMES = { beginner: "초보", intermediate: "중수", expert: "고수" };

const SMILEY_DEFAULT = "🙂";
const SMILEY_PRESS = "😯";
const SMILEY_LOSE = "😵";
const SMILEY_WIN = "😎";

// 트로피 사운드: 옵션 2 절기 기반 매핑 (양력 1월=소, 2월=호랑이, ...)
const TROPHY_MONTH_ANIMAL = {
  1: "cow", 2: "tiger", 3: "rabbit", 4: "dragon",
  5: "snake", 6: "horse", 7: "sheep", 8: "monkey",
  9: "rooster", 10: "dog", 11: "pig", 12: "mouse",
};
const TROPHY_MONTH_EN = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};
const TROPHY_LAUGH_FILES = ["sitcom", "crazy", "sinister", "evil"];
const TROPHY_LAUGH_CHANCE = 0.2;
let trophyLastWasLaugh = false;

// 월별로 A1(컵) → B1(월계관) → C1(크라운) 순환 (1,4,7,10월=A1 / 2,5,8,11월=B1 / 3,6,9,12월=C1)
const TROPHY_SVG_A1 = `<svg class="trophy-svg" viewBox="0 0 110 110">
  <rect x="30" y="92" width="50" height="9" fill="#5a2810" rx="2"/>
  <rect x="34" y="84" width="42" height="9" fill="#7a3810" rx="1.5"/>
  <rect x="38" y="80" width="34" height="2" fill="#b07028"/>
  <rect x="48" y="68" width="14" height="14" fill="#d4a040"/>
  <ellipse cx="55" cy="68" rx="9" ry="2.5" fill="#a07820"/>
  <ellipse cx="55" cy="80" rx="10" ry="2.5" fill="#a07820"/>
  <path d="M 28 30 Q 10 36 10 50 Q 10 64 28 66" stroke="#8a5418" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M 28 30 Q 14 36 14 50 Q 14 64 28 66" stroke="#f4c840" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 82 30 Q 100 36 100 50 Q 100 64 82 66" stroke="#8a5418" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M 82 30 Q 96 36 96 50 Q 96 64 82 66" stroke="#f4c840" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 26 22 L 26 50 Q 26 70 55 70 Q 84 70 84 50 L 84 22 Z" fill="#f4c840" stroke="#6a3818" stroke-width="2.4" stroke-linejoin="round"/>
  <line x1="30" y1="50" x2="80" y2="50" stroke="#a07820" stroke-width="1"/>
  <line x1="32" y1="56" x2="78" y2="56" stroke="#a07820" stroke-width="1"/>
  <polygon points="55,32 58,40 67,40 60,46 62,55 55,49 48,55 50,46 43,40 52,40" fill="#b03228" stroke="#6a1808" stroke-width="1.2"/>
  <ellipse cx="55" cy="22" rx="29" ry="4.5" fill="#fce088" stroke="#6a3818" stroke-width="2"/>
  <ellipse cx="55" cy="22" rx="29" ry="2" fill="#fff5d0"/>
</svg>`;

const TROPHY_SVG_B1 = `<svg class="trophy-svg" viewBox="-18 -10 146 130">
  <g transform="translate(55 50)">
    <g>
      <ellipse cx="-32" cy="0" rx="9" ry="4" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-30 -32 0)"/>
      <ellipse cx="-30" cy="-14" rx="9" ry="4" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-55 -30 -14)"/>
      <ellipse cx="-22" cy="-26" rx="8" ry="3.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-75 -22 -26)"/>
      <ellipse cx="-8" cy="-32" rx="7" ry="3" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-95 -8 -32)"/>
      <ellipse cx="-30" cy="14" rx="9" ry="4" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-130 -30 14)"/>
      <ellipse cx="-22" cy="26" rx="8" ry="3.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-150 -22 26)"/>
      <ellipse cx="-10" cy="33" rx="7" ry="3" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-170 -10 33)"/>
      <circle cx="-26" cy="-6" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
      <circle cx="-18" cy="-22" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
      <circle cx="-22" cy="20" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
    </g>
    <g transform="scale(-1 1)">
      <ellipse cx="-32" cy="0" rx="9" ry="4" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-30 -32 0)"/>
      <ellipse cx="-30" cy="-14" rx="9" ry="4" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-55 -30 -14)"/>
      <ellipse cx="-22" cy="-26" rx="8" ry="3.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-75 -22 -26)"/>
      <ellipse cx="-8" cy="-32" rx="7" ry="3" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-95 -8 -32)"/>
      <ellipse cx="-30" cy="14" rx="9" ry="4" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-130 -30 14)"/>
      <ellipse cx="-22" cy="26" rx="8" ry="3.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8" transform="rotate(-150 -22 26)"/>
      <ellipse cx="-10" cy="33" rx="7" ry="3" fill="#6a9038" stroke="#3a5018" stroke-width="0.8" transform="rotate(-170 -10 33)"/>
      <circle cx="-26" cy="-6" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
      <circle cx="-18" cy="-22" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
      <circle cx="-22" cy="20" r="2" fill="#b03228" stroke="#6a1808" stroke-width="0.6"/>
    </g>
  </g>
  <circle cx="55" cy="50" r="16" fill="#f4c840" stroke="#6a3818" stroke-width="2"/>
  <circle cx="55" cy="50" r="12" fill="none" stroke="#a07820" stroke-width="0.8"/>
  <polygon points="55,40 58,48 66,48 60,53 62,62 55,57 48,62 50,53 44,48 52,48" fill="#b03228" stroke="#6a1808" stroke-width="1"/>
  <path d="M 38 84 L 55 76 L 72 84 L 64 92 L 55 88 L 46 92 Z" fill="#b03228" stroke="#6a1808" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

const TROPHY_SVG_C1 = `<svg class="trophy-svg" viewBox="0 0 110 110">
  <rect x="18" y="86" width="74" height="6" fill="#7a1810" rx="2"/>
  <rect x="20" y="78" width="70" height="9" fill="#a07820" rx="1.5"/>
  <path d="M 22 78 L 14 30 L 32 56 L 44 18 L 55 56 L 66 18 L 78 56 L 96 30 L 88 78 Z" fill="#f4c840" stroke="#6a3818" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M 22 78 L 18 56 L 30 68 L 44 32 L 55 70 L 66 32 L 80 68 L 92 56 L 88 78 Z" fill="#f8d860"/>
  <path d="M 24 64 Q 55 70 86 64" stroke="#a07820" stroke-width="1" fill="none"/>
  <path d="M 26 72 Q 55 76 84 72" stroke="#a07820" stroke-width="1" fill="none"/>
  <ellipse cx="55" cy="68" rx="6.5" ry="5" fill="#b03228" stroke="#6a1808" stroke-width="1.3"/>
  <ellipse cx="53" cy="66" rx="2" ry="1.5" fill="#fff" opacity="0.6"/>
  <circle cx="32" cy="64" r="3.5" fill="#3a6090" stroke="#1a3060" stroke-width="1"/>
  <circle cx="78" cy="64" r="3.5" fill="#3a6090" stroke="#1a3060" stroke-width="1"/>
  <circle cx="22" cy="74" r="2.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8"/>
  <circle cx="88" cy="74" r="2.5" fill="#5a8030" stroke="#3a5018" stroke-width="0.8"/>
  <circle cx="14" cy="30" r="4" fill="#fce088" stroke="#6a3818" stroke-width="1.5"/>
  <circle cx="44" cy="18" r="4" fill="#fce088" stroke="#6a3818" stroke-width="1.5"/>
  <circle cx="66" cy="18" r="4" fill="#fce088" stroke="#6a3818" stroke-width="1.5"/>
  <circle cx="96" cy="30" r="4" fill="#fce088" stroke="#6a3818" stroke-width="1.5"/>
  <circle cx="28" cy="80" r="1.6" fill="#fff5d0" stroke="#8a5418" stroke-width="0.5"/>
  <circle cx="40" cy="80" r="1.6" fill="#fff5d0" stroke="#8a5418" stroke-width="0.5"/>
  <circle cx="55" cy="80" r="1.8" fill="#fff5d0" stroke="#8a5418" stroke-width="0.6"/>
  <circle cx="70" cy="80" r="1.6" fill="#fff5d0" stroke="#8a5418" stroke-width="0.5"/>
  <circle cx="82" cy="80" r="1.6" fill="#fff5d0" stroke="#8a5418" stroke-width="0.5"/>
</svg>`;

const TROPHY_SVGS = [TROPHY_SVG_A1, TROPHY_SVG_B1, TROPHY_SVG_C1];

const trophyAudioCache = {};
function playTrophyFile(path, onEnd) {
  let a = trophyAudioCache[path];
  if (!a) {
    a = new Audio(path);
    a.preload = "auto";
    trophyAudioCache[path] = a;
  }
  try {
    a.currentTime = 0;
    a.onended = onEnd || null;
    a.play().catch(() => { onEnd && onEnd(); });
  } catch (e) { onEnd && onEnd(); }
}
function playTrophySound(month, onEnd) {
  // 5번 중 한 번꼴(20%)로 랜덤 웃음, 단 직전이 웃음이었으면 무조건 동물
  if (!trophyLastWasLaugh && Math.random() < TROPHY_LAUGH_CHANCE) {
    trophyLastWasLaugh = true;
    const name = TROPHY_LAUGH_FILES[Math.floor(Math.random() * TROPHY_LAUGH_FILES.length)];
    playTrophyFile(`./sounds/laugh/${name}.mp3`, onEnd);
  } else {
    trophyLastWasLaugh = false;
    const name = TROPHY_MONTH_ANIMAL[month];
    if (!name) { onEnd && onEnd(); return; }
    playTrophyFile(`./sounds/${name}.mp3`, onEnd);
  }
}

// ---- 사운드: Web Audio API로 합성 (외부 파일 X) ----
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playClick() {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 900;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

function playFlag() {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.09);
}

function playBoom() {
  const ctx = getAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;

  // 노이즈 부분 (폭발의 "쾅~~")
  const bufferSize = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 800;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.5);

  // 저음 부분 (폭발의 "쿵")
  const boom = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(140, t0);
  boom.frequency.exponentialRampToValueAtTime(40, t0 + 0.4);
  boomGain.gain.setValueAtTime(0.4, t0);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
  boom.connect(boomGain).connect(ctx.destination);
  boom.start(t0);
  boom.stop(t0 + 0.4);
}

function smileyPress() {
  if (gameOver) return;
  newGameBtn.textContent = SMILEY_PRESS;
}
function smileyRelease() {
  if (gameOver) return;
  newGameBtn.textContent = SMILEY_DEFAULT;
}

// 게임 상태
let cells = [];      // 2차원 배열: cells[r][c] = { isMine, isRevealed, isFlagged, adjacent }
let cellEls = [];    // 2차원 배열: 화면에 그려진 div 요소들
let minesPlaced = false;
let gameOver = false;
let timerInterval = null;
let elapsedSeconds = 0;
// 출석체크에서 들어왔을 때, 이 게임을 클리어하면 도장 찍을 날짜 (yyyy-mm-dd)
let pendingStampDate = null;

function init() {
  const cfg = DIFFICULTIES[currentDifficulty];
  ROWS = cfg.rows;
  COLS = cfg.cols;
  MINES = cfg.mines;
  boardEl.style.setProperty("--rows", ROWS);
  boardEl.style.setProperty("--cols", COLS);

  cells = [];
  cellEls = [];
  minesPlaced = false;
  gameOver = false;
  boardEl.innerHTML = "";

  stopTimer();
  elapsedSeconds = 0;
  timerEl.textContent = formatLed(0);
  mineCountEl.textContent = formatLed(MINES);
  newGameBtn.textContent = SMILEY_DEFAULT;

  for (let r = 0; r < ROWS; r++) {
    cells[r] = [];
    cellEls[r] = [];
    for (let c = 0; c < COLS; c++) {
      cells[r][c] = {
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacent: 0,
      };
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.row = r;
      el.dataset.col = c;
      attachInputHandlers(el, r, c);
      boardEl.appendChild(el);
      cellEls[r][c] = el;
    }
  }
}

// 첫 클릭이 일어난 뒤에 호출 — 클릭한 칸과 그 이웃 8칸은 지뢰에서 제외
// 무작위 지뢰 배치 (3x3 안전구역 제외). 재시도 가능하도록 isMine/adjacent 초기화 포함.
function placeMinesRandom(safeR, safeC) {
  // 초기화
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells[r][c].isMine = false;
      cells[r][c].adjacent = 0;
    }
  }
  const safeSet = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr;
      const nc = safeC + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        safeSet.add(nr * COLS + nc);
      }
    }
  }
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!safeSet.has(r * COLS + c)) candidates.push([r, c]);
    }
  }
  // Fisher-Yates 셔플
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mineCount = Math.min(MINES, candidates.length);
  for (let i = 0; i < mineCount; i++) {
    const [r, c] = candidates[i];
    cells[r][c].isMine = true;
  }
  // 인접 지뢰 수
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c].isMine) continue;
      cells[r][c].adjacent = countAdjacentMines(r, c);
    }
  }
}

// 라이토(추리) 모드 솔버: 도박수 없이 순수 논리만으로 풀리는지 시뮬레이션.
// 기본 추론 + subset 추론 (1-2-1 같은 패턴).
function isSolvableNoGuess(firstR, firstC) {
  const revealed = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  const flagged  = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));

  function getNbrs(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc]);
      }
    }
    return out;
  }
  function flood(startR, startC) {
    const queue = [[startR, startC]];
    while (queue.length) {
      const [r, c] = queue.shift();
      if (revealed[r][c]) continue;
      revealed[r][c] = true;
      if (cells[r][c].adjacent === 0) {
        for (const [nr, nc] of getNbrs(r, c)) {
          if (!cells[nr][nc].isMine && !revealed[nr][nc]) queue.push([nr, nc]);
        }
      }
    }
  }
  flood(firstR, firstC);

  let changed = true;
  while (changed) {
    changed = false;
    // 1) 기본 추론: n - flagged == unrevealed → 모두 지뢰 / minesLeft == 0 → 모두 안전
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!revealed[r][c] || cells[r][c].isMine) continue;
        const n = cells[r][c].adjacent;
        if (n === 0) continue;
        const unknowns = [];
        let flaggedCount = 0;
        for (const [nr, nc] of getNbrs(r, c)) {
          if (!revealed[nr][nc]) {
            if (flagged[nr][nc]) flaggedCount++;
            else unknowns.push([nr, nc]);
          }
        }
        if (unknowns.length === 0) continue;
        const minesLeft = n - flaggedCount;
        if (minesLeft === 0) {
          for (const [nr, nc] of unknowns) flood(nr, nc);
          changed = true;
        } else if (minesLeft === unknowns.length) {
          for (const [nr, nc] of unknowns) flagged[nr][nc] = true;
          changed = true;
        }
      }
    }
    if (changed) continue;

    // 2) Subset 추론: A.unknowns ⊂ B.unknowns 일 때, 차이 셀들의 지뢰 개수 결정 가능하면 사용
    const constraints = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!revealed[r][c] || cells[r][c].isMine) continue;
        const n = cells[r][c].adjacent;
        if (n === 0) continue;
        const unknowns = [];
        let flaggedCount = 0;
        for (const [nr, nc] of getNbrs(r, c)) {
          if (!revealed[nr][nc]) {
            if (flagged[nr][nc]) flaggedCount++;
            else unknowns.push(nr * COLS + nc);
          }
        }
        if (unknowns.length === 0) continue;
        constraints.push({ minesLeft: n - flaggedCount, unknowns: new Set(unknowns) });
      }
    }
    outer: for (const A of constraints) {
      for (const B of constraints) {
        if (A === B) continue;
        if (A.unknowns.size >= B.unknowns.size) continue;
        let isSubset = true;
        for (const u of A.unknowns) if (!B.unknowns.has(u)) { isSubset = false; break; }
        if (!isSubset) continue;
        const diff = [];
        for (const u of B.unknowns) if (!A.unknowns.has(u)) diff.push(u);
        if (diff.length === 0) continue;
        const diffMines = B.minesLeft - A.minesLeft;
        if (diffMines === 0) {
          for (const idx of diff) flood(Math.floor(idx / COLS), idx % COLS);
          changed = true;
          break outer;
        } else if (diffMines === diff.length) {
          for (const idx of diff) flagged[Math.floor(idx / COLS)][idx % COLS] = true;
          changed = true;
          break outer;
        }
      }
    }
  }

  // 모든 비-지뢰 칸이 공개됐는가?
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!cells[r][c].isMine && !revealed[r][c]) return false;
    }
  }
  return true;
}

function placeMines(safeR, safeC) {
  if (deductionMode === "on") {
    const MAX_ATTEMPTS = 300;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      placeMinesRandom(safeR, safeC);
      if (isSolvableNoGuess(safeR, safeC)) {
        minesPlaced = true;
        return;
      }
    }
    // 300회 안에 못 만들면 일반 보드로 폴백 (지뢰 밀도가 너무 높을 때)
  }
  placeMinesRandom(safeR, safeC);
  minesPlaced = true;
}

function countAdjacentMines(r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && cells[nr][nc].isMine) {
        count++;
      }
    }
  }
  return count;
}

function onCellClick(r, c) {
  if (gameOver) return;
  const cell = cells[r][c];
  if (cell.isRevealed || cell.isFlagged) return;

  playClick();

  if (!minesPlaced) {
    placeMines(r, c);
    startTimer();
  }

  reveal(r, c);

  if (!gameOver && checkWin()) {
    handleWin();
  } else if (!gameOver) {
    saveGame();
  }
}

function onFlagToggle(r, c) {
  if (gameOver) return;
  const cell = cells[r][c];
  if (cell.isRevealed) return; // 이미 열린 칸엔 깃발 못 꽂음
  cell.isFlagged = !cell.isFlagged;
  renderCell(r, c);
  updateMineCount();
  playFlag();
  saveGame();
}

const LONG_PRESS_MS = 400;

// 두 손가락 제스처가 진행 중이면 셀 탭을 무시한다 (두 손가락 팬/핀치 줌 → 셀 공개 X)
let multiTouchActive = false;
let activePressTimer = null;

function attachInputHandlers(el, r, c) {
  let suppressNextClick = false;

  // 우클릭 메뉴는 항상 차단 (모바일 롱프레스 시에도 떠서 깃발 동작이랑 부딪힘)
  el.addEventListener("contextmenu", (e) => e.preventDefault());

  // 데스크탑 좌클릭 누르는 동안 스마일 = 😯
  // (contextmenu와 분리하기 위해 우클릭은 여기서 깃발 처리)
  el.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      smileyPress();
    } else if (e.button === 2) {
      e.preventDefault();
      onFlagToggle(r, c);
    }
  });

  // 롱프레스 = 깃발 (모바일). 손 닿는 동안 스마일도 😯
  el.addEventListener("touchstart", (e) => {
    // 두 번째 이상의 손가락은 셀 동작 트리거 X (팬/핀치 줌 제스처)
    if (e.touches.length > 1) return;
    smileyPress();
    if (activePressTimer) clearTimeout(activePressTimer);
    activePressTimer = setTimeout(() => {
      activePressTimer = null;
      onFlagToggle(r, c);
      suppressNextClick = true;
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }, { passive: true });

  const cancel = () => {
    if (activePressTimer) {
      clearTimeout(activePressTimer);
      activePressTimer = null;
    }
  };
  el.addEventListener("touchend", cancel, { passive: true });
  el.addEventListener("touchcancel", cancel, { passive: true });
  // 손가락이 누른 칸 밖으로 벗어나면 클릭/롱프레스 모두 취소 (잘못 눌렀을 때 빠져나갈 수 있게)
  el.addEventListener("touchmove", (e) => {
    cancel();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const rect = el.getBoundingClientRect();
    const inside = t.clientX >= rect.left && t.clientX <= rect.right &&
                   t.clientY >= rect.top && t.clientY <= rect.bottom;
    if (!inside) {
      suppressNextClick = true;
      smileyRelease();
    }
  }, { passive: true });

  // 일반 탭/클릭 = 공개 (단, 직전에 롱프레스 일어났거나 두 손가락 제스처면 무시)
  el.addEventListener("click", () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (multiTouchActive) return;
    onCellClick(r, c);
  });
}

// ---- 두 손가락 팬: 핀치 줌 안 했을 때도 두 손가락으로 화면을 스크롤 ----
// 핀치 줌 중일 땐 브라우저 visual viewport 팬에 맡기고 가만히 있는다 (preventDefault X).
let twoFinger = null;

window.addEventListener("touchstart", (e) => {
  if (e.touches.length >= 2) {
    multiTouchActive = true;
    // 첫 손가락이 걸어 둔 롱프레스 타이머 취소 (두 손가락 떴으면 깃발 의도 아님)
    if (activePressTimer) {
      clearTimeout(activePressTimer);
      activePressTimer = null;
    }
    smileyRelease();
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const avgX = (a.clientX + b.clientX) / 2;
      const avgY = (a.clientY + b.clientY) / 2;
      twoFinger = {
        startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startAvgX: avgX,
        startAvgY: avgY,
        lastX: avgX,
        lastY: avgY,
        mode: null, // 'pan' or 'pinch' — 처음 몇 px 움직임으로 결정
      };
    }
  }
}, { passive: true, capture: true });

window.addEventListener("touchmove", (e) => {
  if (!twoFinger || e.touches.length !== 2) return;
  const [a, b] = e.touches;
  const avgX = (a.clientX + b.clientX) / 2;
  const avgY = (a.clientY + b.clientY) / 2;
  const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  if (twoFinger.mode === null) {
    const distDelta = Math.abs(dist - twoFinger.startDist);
    const panDelta = Math.hypot(avgX - twoFinger.startAvgX, avgY - twoFinger.startAvgY);
    if (panDelta > 8 && panDelta >= distDelta) {
      twoFinger.mode = "pan";
    } else if (distDelta > 8) {
      twoFinger.mode = "pinch";
    }
  }

  if (twoFinger.mode === "pan") {
    // 핀치 줌 중이면 visual viewport 팬을 브라우저에 맡긴다
    const scale = (window.visualViewport && window.visualViewport.scale) || 1;
    if (scale <= 1.01) {
      e.preventDefault();
      const root = document.getElementById("scrollRoot");
      if (root) {
        root.scrollTop -= (avgY - twoFinger.lastY);
        root.scrollLeft -= (avgX - twoFinger.lastX);
      }
    }
    twoFinger.lastX = avgX;
    twoFinger.lastY = avgY;
  }
}, { passive: false, capture: true });

function endTwoFinger(e) {
  if (e.touches.length < 2) twoFinger = null;
  if (e.touches.length === 0) {
    // 손가락이 다 떨어진 직후에 합성된 click이 떨어질 수 있어 잠깐 가드 유지
    setTimeout(() => { multiTouchActive = false; }, 50);
  }
}
window.addEventListener("touchend", endTwoFinger, { passive: true, capture: true });
window.addEventListener("touchcancel", endTwoFinger, { passive: true, capture: true });

// 스택 기반 flood fill — 0인 칸을 만나면 이웃을 계속 펼친다
function reveal(startR, startC) {
  const stack = [[startR, startC]];
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const cell = cells[r][c];
    if (cell.isRevealed || cell.isFlagged) continue;

    cell.isRevealed = true;
    renderCell(r, c);

    if (cell.isMine) {
      handleLose();
      return;
    }

    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !cells[nr][nc].isRevealed) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }
}

function revealAllMines() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c].isMine) {
        cells[r][c].isRevealed = true;
        renderCell(r, c);
      }
    }
  }
}

function flagAllMines() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r][c];
      if (cell.isMine && !cell.isFlagged) {
        cell.isFlagged = true;
        renderCell(r, c);
      }
    }
  }
}

function handleLose() {
  gameOver = true;
  stopTimer();
  revealAllMines();
  newGameBtn.textContent = SMILEY_LOSE;
  playBoom();
  // 도장 미적립이지만 pendingStampDate는 유지 — 스마일로 재시도해서 클리어하면 도장 적립
  clearSave();
}

function handleWin() {
  gameOver = true;
  stopTimer();
  flagAllMines();
  updateMineCount();
  newGameBtn.textContent = SMILEY_WIN;
  playClearEffect();
  if (pendingStampDate) {
    addStamp(pendingStampDate);
    showStampToast(pendingStampDate);
    pendingStampDate = null;
    // 토스트는 그대로 두기 — 다음 게임 시작/메뉴 전환 시 자연스레 사라짐
  }
  clearSave();
}

function checkWin() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r][c];
      if (!cell.isMine && !cell.isRevealed) return false;
    }
  }
  return true;
}

function updateMineCount() {
  let flagged = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c].isFlagged) flagged++;
    }
  }
  mineCountEl.textContent = formatLed(MINES - flagged);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    timerEl.textContent = formatLed(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// 클래식 LED 디스플레이용 3자리 포맷 (음수 허용, 999/-99 클램프)
function formatLed(n) {
  if (n < 0) {
    const abs = Math.min(Math.abs(n), 99);
    return "-" + abs.toString().padStart(2, "0");
  }
  return Math.min(n, 999).toString().padStart(3, "0");
}

function renderCell(r, c) {
  const el = cellEls[r][c];
  const cell = cells[r][c];
  el.className = "cell";
  el.textContent = "";

  if (cell.isRevealed) {
    el.classList.add("revealed");
    if (cell.isMine) {
      el.classList.add("mine");
      el.innerHTML = '<svg class="mine-icon" viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><g fill="#000"><rect x="7" y="1" width="2" height="2"/><rect x="7" y="13" width="2" height="2"/><rect x="1" y="7" width="2" height="2"/><rect x="13" y="7" width="2" height="2"/><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/><rect x="5" y="3" width="6" height="10"/><rect x="3" y="5" width="10" height="6"/></g><rect x="5" y="5" width="2" height="2" fill="#fff"/></svg>';
    } else if (cell.adjacent > 0) {
      el.textContent = cell.adjacent;
      el.classList.add(`n${cell.adjacent}`);
    }
  } else if (cell.isFlagged) {
    el.classList.add("flagged");
    el.textContent = "🚩";
  }
}

// ---- 저장/복원/이어하기 (localStorage) ----
function saveGame() {
  // 첫 클릭 전에는 저장 의미 X (지뢰 배치 전)
  if (gameOver || !minesPlaced) return;
  try {
    const data = {
      difficulty: currentDifficulty,
      cells: cells.map((row) =>
        row.map((c) => ({
          isMine: c.isMine,
          isRevealed: c.isRevealed,
          isFlagged: c.isFlagged,
          adjacent: c.adjacent,
        }))
      ),
      elapsedSeconds,
      pendingStampDate,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !DIFFICULTIES[s.difficulty] || !Array.isArray(s.cells)) return null;
    return s;
  } catch (e) {
    return null;
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  refreshResumeButton();
}

function refreshResumeButton() {
  const s = loadSave();
  if (s) {
    const name = LEVEL_NAMES[s.difficulty] || s.difficulty;
    resumeInfoEl.textContent = `${name} · ${formatLed(s.elapsedSeconds || 0)}${s.pendingStampDate ? " · 📅" : ""}`;
    resumeBtn.classList.remove("hidden");
  } else {
    resumeBtn.classList.add("hidden");
  }
}

function resumeGame() {
  const s = loadSave();
  if (!s) return;
  currentDifficulty = s.difficulty;
  hideAllViews();
  gameView.classList.remove("hidden");
  init(); // DOM 새로 깔고
  // 저장된 상태 덮어쓰기
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (s.cells[r] && s.cells[r][c]) {
        cells[r][c] = s.cells[r][c];
        renderCell(r, c);
      }
    }
  }
  minesPlaced = true;
  elapsedSeconds = s.elapsedSeconds || 0;
  timerEl.textContent = formatLed(elapsedSeconds);
  pendingStampDate = s.pendingStampDate || null;
  showStampBannerIfPending();
  updateMineCount();
  startTimer();
}

// ---- 출석체크: 도장 ----
function loadStamps() {
  try { return JSON.parse(localStorage.getItem(STAMPS_KEY) || "{}") || {}; }
  catch (e) { return {}; }
}
function saveStamps(stamps) {
  try { localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps)); } catch (e) {}
}
function addStamp(dateStr) {
  const stamps = loadStamps();
  stamps[dateStr] = true;
  saveStamps(stamps);
  refreshAttendanceInfo();
}

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayStr() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

function countTrophies() {
  const stamps = loadStamps();
  const monthCounts = {};
  for (const ds of Object.keys(stamps)) {
    const key = ds.slice(0, 7); // "YYYY-MM"
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  }
  let count = 0;
  for (const key of Object.keys(monthCounts)) {
    const [y, m] = key.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate(); // m은 1-based 그대로 넣으면 해당 달 말일이 나옴
    if (monthCounts[key] >= lastDay) count++;
  }
  return count;
}

function refreshAttendanceInfo() {
  const stamps = loadStamps();
  const total = Object.keys(stamps).length;
  const trophies = countTrophies();
  // LED 표시: 도장 개수(3자리). 트로피 1개 이상이면 초록 LED, 없으면 빨강
  attendanceInfoEl.textContent = formatLed(total);
  attendanceInfoEl.classList.toggle("has-trophy", trophies > 0);
}

// ---- 달력 렌더링 ----
let calYear, calMonth; // 현재 표시 중인 달
let selectedDate = null; // 'yyyy-mm-dd' 또는 null

function renderCalendar() {
  const stamps = loadStamps();
  const today = todayStr();

  calMonthLabel.textContent = `${calYear}년 ${calMonth + 1}월`;

  // 트로피: 이번 달 1일 ~ 말일까지 모두 도장 찍혔는가? + 진행도
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  let stampedDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (stamps[ymd(calYear, calMonth, d)]) stampedDays++;
  }
  const allStamped = stampedDays >= lastDay;
  calTrophyRow.classList.toggle("earned", allStamped);
  if (allStamped) {
    const m = calMonth + 1;
    const svg = TROPHY_SVGS[(m - 1) % 3];
    calTrophyRow.innerHTML =
      svg +
      `<div class="trophy-caption">${m}월 <span class="clear-text">CLEAR!</span><small>${TROPHY_MONTH_EN[m]} ${calYear}</small></div>`;
    const trophyEl = calTrophyRow.querySelector(".trophy-svg");
    const onTap = (e) => {
      e.preventDefault();
      trophyEl.classList.add("enlarged");
      playTrophySound(m, () => trophyEl.classList.remove("enlarged"));
    };
    trophyEl.addEventListener("click", onTap);
    trophyEl.addEventListener("touchstart", onTap, { passive: false });
  } else {
    calTrophyRow.innerHTML =
      `<span class="cal-trophy-empty">🏆</span>` +
      `<span class="cal-trophy-progress"><strong>${stampedDays}</strong> / ${lastDay} — 모두 채우면 트로피!</span>`;
  }

  // 그리드
  calGridEl.innerHTML = "";
  const wkNames = ["일", "월", "화", "수", "목", "금", "토"];
  wkNames.forEach((n, i) => {
    const h = document.createElement("div");
    h.className = "cal-wkhead" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
    h.textContent = n;
    calGridEl.appendChild(h);
  });

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-blank";
    calGridEl.appendChild(blank);
  }

  for (let d = 1; d <= lastDay; d++) {
    const ds = ymd(calYear, calMonth, d);
    const cell = document.createElement("button");
    cell.className = "cal-day";
    cell.type = "button";
    cell.textContent = d;
    cell.dataset.date = ds;

    if (stamps[ds]) {
      cell.classList.add("stamped");
      cell.classList.add((d - 1) % 2 === 0 ? "stamp-a" : "stamp-b");
    }
    if (ds > today) {
      cell.classList.add("future");
      cell.disabled = true;
    }
    if (ds === today) cell.classList.add("today");
    if (ds === selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", () => {
      if (cell.disabled) return;
      selectedDate = (selectedDate === ds) ? null : ds;
      renderCalendar();
    });
    calGridEl.appendChild(cell);
  }

}

// 메인 다이얼로그 윗변 Y를 측정해서 출석체크 cal-frame 윗변이 같은 위치에 오도록 padding 보정.
// mainView가 보이는 동안만 측정 가능 (다른 화면일 땐 마지막 측정값 유지).
function syncAttendanceTop() {
  const dialog = document.querySelector(".dialog-window");
  if (!dialog) return;
  const dialogRect = dialog.getBoundingClientRect();
  if (dialogRect.height === 0) return; // mainView 숨김 상태 — 측정 불가
  const mainRect = mainView.getBoundingClientRect();
  if (mainRect.height === 0) return;
  // 다이얼로그 top이 mainView 안에서 어디 있는지
  const dialogTopInView = dialogRect.top - mainRect.top;
  // 출석체크에서 cal-frame은 back-btn(min-height 40) + gap 12 = 52px 만큼 padding 아래에서 시작
  const padding = Math.max(30, dialogTopInView - 52);
  document.documentElement.style.setProperty("--attendance-padding-top", `${padding}px`);
}

function showAttendance() {
  // mainView가 아직 보이는 지금 측정 (hideAllViews 호출 전)
  syncAttendanceTop();
  const t = todayStr();
  if (calYear === undefined) {
    const d = new Date();
    calYear = d.getFullYear();
    calMonth = d.getMonth();
  }
  selectedDate = null;
  hideAllViews();
  attendanceView.classList.remove("hidden");
  renderCalendar();
}

function startAttendanceGame() {
  // 선택 안 했으면 오늘로
  const date = selectedDate || todayStr();
  // 미래는 어차피 disabled라 안 들어옴. 이미 도장 있는 날도 그냥 게임은 시작 (덮어써도 무해)
  pendingStampDate = date;
  currentDifficulty = "intermediate";
  clearSave();
  hideAllViews();
  gameView.classList.remove("hidden");
  init();
  showStampBannerIfPending();
}

function showStampBannerIfPending() {
  if (!pendingStampDate) {
    hideStampBanner();
    return;
  }
  const [, m, d] = pendingStampDate.split("-");
  stampBannerEl.textContent = `📅 클리어하면 ${parseInt(m)}월 ${parseInt(d)}일에 도장!`;
  stampBannerEl.classList.remove("hidden");
}
function hideStampBanner() {
  stampBannerEl.classList.add("hidden");
  stampBannerEl.textContent = "";
}

function showStampToast(dateStr) {
  const [, m, d] = dateStr.split("-");
  stampBannerEl.textContent = `🎉 ${parseInt(m)}월 ${parseInt(d)}일 도장 적립!`;
  stampBannerEl.classList.remove("hidden");
}

// ---- 화면 전환 ----
function hideAllViews() {
  mainView.classList.add("hidden");
  gameView.classList.add("hidden");
  attendanceView.classList.add("hidden");
}

function showMain() {
  // 게임 중에 메뉴로 가면 자동 저장 (이어하기 가능하게)
  if (!gameOver && minesPlaced) saveGame();
  stopTimer();
  hideAllViews();
  mainView.classList.remove("hidden");
  refreshResumeButton();
  refreshAttendanceInfo();
}

function startGame(level) {
  currentDifficulty = level;
  pendingStampDate = null;
  clearSave();
  hideAllViews();
  gameView.classList.remove("hidden");
  hideStampBanner();
  init();
}

// 메인 화면의 난이도 버튼들 (data-level 있는 것만)
mainView.querySelectorAll(".menu-btn[data-level]").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.level));
});

// 이어하기 / 출석체크 버튼
resumeBtn.addEventListener("click", resumeGame);
attendanceBtn.addEventListener("click", showAttendance);

// 출석체크 화면 컨트롤
attendanceBackBtn.addEventListener("click", showMain);
calPrevBtn.addEventListener("click", () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  selectedDate = null;
  renderCalendar();
});
calNextBtn.addEventListener("click", () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  selectedDate = null;
  renderCalendar();
});
attendanceContinueBtn.addEventListener("click", startAttendanceGame);

// 게임 화면 → 메인 복귀
menuBackBtn.addEventListener("click", showMain);

// 스마일 버튼 = 같은 난이도로 새 게임 (도장 대기/저장도 초기화)
// 게임 도중에도 즉시 리셋되도록 pointerdown으로 처리 (click은 모바일에서 늦거나 가려지는 경우가 있음)
let smileyResetting = false;
function resetCurrentGame() {
  if (smileyResetting) return; // pointerdown + click 중복 방지
  smileyResetting = true;
  setTimeout(() => { smileyResetting = false; }, 200);
  // pendingStampDate는 유지 — 출석체크 미션 중 스마일 누르면 같은 날짜로 재도전
  clearSave();
  init();
  showStampBannerIfPending();
}
newGameBtn.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  resetCurrentGame();
});
newGameBtn.addEventListener("click", resetCurrentGame); // pointerdown 미지원 환경 폴백

// 손/마우스를 떼면 스마일 복귀 (어디서 떼든 동작하도록 document에 부착)
document.addEventListener("mouseup", smileyRelease);
document.addEventListener("touchend", smileyRelease);
document.addEventListener("touchcancel", smileyRelease);

// 백그라운드 전환 시 안전하게 자동 저장
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !gameOver && minesPlaced) saveGame();
});
window.addEventListener("pagehide", () => {
  if (!gameOver && minesPlaced) saveGame();
});

// 초기 표시: 메인 화면, 이어하기/도장 카운트 갱신
refreshResumeButton();
refreshAttendanceInfo();

// ---- 설정 모달 + 테마 선택 ----
const THEME_KEY = "mw:theme";
const THEME_CLASSES = ["theme-forest", "theme-lavender", "theme-ocean", "theme-cherry", "theme-midnight"];
function applyTheme(theme) {
  document.body.classList.remove(...THEME_CLASSES);
  if (theme && theme !== "classic") {
    document.body.classList.add(`theme-${theme}`);
  }
  document.querySelectorAll(".theme-item").forEach((x) => {
    x.classList.toggle("active", x.dataset.theme === theme);
  });
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || "classic"; }
  catch (e) { return "classic"; }
}
applyTheme(loadTheme());

const settingsModal = document.getElementById("settingsModal");
document.getElementById("openSettings").addEventListener("click", () => {
  settingsModal.classList.remove("hidden");
});
document.getElementById("closeSettings").addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.classList.add("hidden");
});
document.querySelectorAll(".theme-item[data-theme]").forEach((btn) => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});

// ---- 설정: 클리어 화면 선택 ----
const CLEAR_EFFECT_KEY = "mw:clearEffect";
const CLEAR_EFFECTS = ["confetti", "minecraft"];
const CLEAR_EFFECT_DEFAULT = "confetti";
function loadClearEffect() {
  try {
    const v = localStorage.getItem(CLEAR_EFFECT_KEY);
    return CLEAR_EFFECTS.includes(v) ? v : CLEAR_EFFECT_DEFAULT;
  } catch (e) { return CLEAR_EFFECT_DEFAULT; }
}
function applyClearEffect(name) {
  if (!CLEAR_EFFECTS.includes(name)) name = CLEAR_EFFECT_DEFAULT;
  clearEffect = name;
  document.querySelectorAll("[data-clear-effect]").forEach((x) => {
    x.classList.toggle("active", x.dataset.clearEffect === name);
  });
  try { localStorage.setItem(CLEAR_EFFECT_KEY, name); } catch (e) {}
}
let clearEffect = loadClearEffect();
applyClearEffect(clearEffect);
document.querySelectorAll("[data-clear-effect]").forEach((btn) => {
  btn.addEventListener("click", () => applyClearEffect(btn.dataset.clearEffect));
});

// ---- 설정: 게임 모드 (L 모드 = 도박수 가능 / 라이토 모드 = 추리만) ----
const DEDUCTION_KEY = "mw:deductionMode";
const DEDUCTION_MODES = ["off", "on"];
const DEDUCTION_DEFAULT = "off";
function loadDeductionMode() {
  try {
    const v = localStorage.getItem(DEDUCTION_KEY);
    return DEDUCTION_MODES.includes(v) ? v : DEDUCTION_DEFAULT;
  } catch (e) { return DEDUCTION_DEFAULT; }
}
function applyDeductionMode(mode) {
  if (!DEDUCTION_MODES.includes(mode)) mode = DEDUCTION_DEFAULT;
  deductionMode = mode;
  document.querySelectorAll("[data-deduction-mode]").forEach((x) => {
    x.classList.toggle("active", x.dataset.deductionMode === mode);
  });
  try { localStorage.setItem(DEDUCTION_KEY, mode); } catch (e) {}
}
let deductionMode = loadDeductionMode();
applyDeductionMode(deductionMode);
document.querySelectorAll("[data-deduction-mode]").forEach((btn) => {
  btn.addEventListener("click", () => applyDeductionMode(btn.dataset.deductionMode));
});

// ---- 클리어 연출 (승리 시) ----
const celebCanvas = document.getElementById("celebrationCanvas");
const celebCtx = celebCanvas ? celebCanvas.getContext("2d") : null;
const celebHaloEl = document.getElementById("celebrationHalo");
const celebLevelUpEl = document.getElementById("celebrationLevelUp");
let celebConfettiAnim = null;
function celebResize() {
  if (!celebCanvas) return;
  celebCanvas.width = window.innerWidth;
  celebCanvas.height = window.innerHeight;
}
celebResize();
window.addEventListener("resize", celebResize);

function celebTone({ freq, duration = 0.2, type = "sine", volume = 0.18, start = 0 }) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(volume, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + duration);
}
function celebNoiseBurst({ volume = 0.15, duration = 0.025, start = 0, freq = 6000, type = "highpass" } = {}) {
  const ctx = getAudio();
  if (!ctx) return;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = ctx.createGain();
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(volume, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filter); filter.connect(g); g.connect(ctx.destination);
  src.start(t0);
}
function celebCrackle(duration = 1.0, count = 20, start = 0) {
  for (let i = 0; i < count; i++) {
    celebNoiseBurst({
      volume: 0.08 + Math.random() * 0.1,
      duration: 0.025,
      start: start + Math.random() * duration,
      freq: 4000 + Math.random() * 4000,
    });
  }
}

// 컨페티 (스마일리에서 색종이 폭발)
function fxConfetti() {
  if (!celebCtx) return;
  if (celebConfettiAnim) cancelAnimationFrame(celebConfettiAnim);
  const sm = newGameBtn.getBoundingClientRect();
  const cx = sm.left + sm.width / 2;
  const cy = sm.top + sm.height / 2;
  const colors = ["#ff2020", "#ff8800", "#ffd700", "#00c000", "#00aaff", "#aa00ff", "#ff60a0"];
  const ps = [];
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 7;
    ps.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 7,
      life: 1,
    });
  }
  function frame() {
    celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height);
    let alive = false;
    for (const p of ps) {
      p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.life -= 0.011;
      if (p.life > 0) {
        alive = true;
        celebCtx.save();
        celebCtx.translate(p.x, p.y);
        celebCtx.rotate(p.rot);
        celebCtx.fillStyle = p.color;
        celebCtx.globalAlpha = Math.max(0, p.life);
        celebCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.45);
        celebCtx.restore();
      }
    }
    if (alive) celebConfettiAnim = requestAnimationFrame(frame);
    else { celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height); celebConfettiAnim = null; }
  }
  frame();
}

function fxHalo() {
  if (!celebHaloEl) return;
  const sm = newGameBtn.getBoundingClientRect();
  celebHaloEl.style.left = (sm.left + sm.width / 2) + "px";
  celebHaloEl.style.top = (sm.top + sm.height / 2) + "px";
  celebHaloEl.classList.remove("go");
  newGameBtn.classList.remove("celebrating-pop");
  void celebHaloEl.offsetWidth; void newGameBtn.offsetWidth;
  celebHaloEl.classList.add("go");
  newGameBtn.classList.add("celebrating-pop");
}

// 컨페티 클리어: 컨페티 + 헤일로 + 스마일리 점프 + 별빛 크랙 + 종소리 (사운드 9번)
function playConfettiClear() {
  fxConfetti();
  fxHalo();
  celebCrackle(1.0, 20, 0);
  const scale = [2093, 2349, 2637, 2960, 3322];
  for (let i = 0; i < 10; i++) {
    const f = scale[Math.floor(Math.random() * scale.length)];
    celebTone({ freq: f, duration: 0.3, type: "sine", volume: 0.1, start: 0.05 + Math.random() * 0.7 });
  }
}

// 마크 XP 픽업 핑 (피치 1.25배 상향, attack envelope으로 더 청량하게)
function playMcPling() {
  const ctx = getAudio();
  if (!ctx) return;
  const baseFreqs = [1960, 2200, 2470, 2616, 2936, 3296]; // B6 ~ G7
  const freq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
  const detune = 1 + (Math.random() - 0.5) * 0.06;
  const t0 = ctx.currentTime;
  // 메인 사인파 (빠른 어택 + 빠른 감쇠)
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.value = freq * detune;
  g1.gain.setValueAtTime(0, t0);
  g1.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
  g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  osc1.connect(g1); g1.connect(ctx.destination);
  osc1.start(t0); osc1.stop(t0 + 0.3);
  // 옥타브 위 배음
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = freq * detune * 2;
  g2.gain.setValueAtTime(0, t0);
  g2.gain.linearRampToValueAtTime(0.06, t0 + 0.005);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
  osc2.connect(g2); g2.connect(ctx.destination);
  osc2.start(t0); osc2.stop(t0 + 0.2);
}

// 마크 경험치 클리어: 깃발 셀에서 XP 오브가 솟아 스마일리로 빨려들어감
function playMinecraftClear() {
  const sm = newGameBtn.getBoundingClientRect();
  const targetX = sm.left + sm.width / 2;
  const targetY = sm.top + sm.height / 2;
  const flagCells = boardEl.querySelectorAll(".cell.flagged");
  const starts = [];
  flagCells.forEach((cell) => {
    const cr = cell.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    for (let k = 0; k < 2; k++) {
      starts.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy + (Math.random() - 0.5) * 8,
      });
    }
  });
  // 발사 윈도우 1.2초 고정 — 난이도 무관하게 일정한 길이 유지
  const launchWindow = 1.2;
  const denom = Math.max(1, starts.length - 1);
  let lastArrival = 0;
  starts.forEach((s, i) => {
    const orb = document.createElement("div");
    orb.className = "xp-orb";
    orb.style.left = (s.x - 7) + "px";
    orb.style.top = (s.y - 7) + "px";
    orb.style.setProperty("--tx", (targetX - s.x) + "px");
    orb.style.setProperty("--ty", (targetY - s.y) + "px");
    const delay = (i / denom) * launchWindow + (Math.random() - 0.5) * 0.08;
    orb.style.animationDelay = delay + "s";
    document.body.appendChild(orb);
    const arrivalMs = (delay + 0.7) * 1000;
    lastArrival = Math.max(lastArrival, arrivalMs);
    setTimeout(() => {
      playMcPling();
      newGameBtn.classList.add("celebrating-glow");
      setTimeout(() => newGameBtn.classList.remove("celebrating-glow"), 90);
    }, arrivalMs);
    setTimeout(() => orb.remove(), arrivalMs + 200);
  });
  setTimeout(() => {
    newGameBtn.classList.remove("celebrating-bounce");
    void newGameBtn.offsetWidth;
    newGameBtn.classList.add("celebrating-bounce");
    if (celebLevelUpEl) {
      celebLevelUpEl.style.left = targetX + "px";
      celebLevelUpEl.style.top = (targetY - 60) + "px";
      celebLevelUpEl.classList.remove("go");
      void celebLevelUpEl.offsetWidth;
      celebLevelUpEl.classList.add("go");
    }
    // 마지막 강한 "딩" — 레벨업 사운드 (attack envelope)
    const ctx = getAudio();
    if (ctx) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.value = 2936;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.75);
    }
  }, lastArrival + 50);
}

function playClearEffect() {
  if (clearEffect === "minecraft") playMinecraftClear();
  else playConfettiClear();
}

// ---- PWA 등록: 오프라인/홈 화면 설치 ----
if ("serviceWorker" in navigator) {
  let swRegistration = null;

  window.addEventListener("load", () => {
    // updateViaCache:'none' → 브라우저 HTTP 캐시 무시하고 service-worker.js를 네트워크에서 받음
    navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" })
      .then((reg) => {
        swRegistration = reg;
        // 등록 직후 즉시 한 번 업데이트 체크 — 브라우저 기본 24h 캐시를 뚫음
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });

  // 앱이 포어그라운드로 돌아올 때마다 업데이트 체크 (PWA standalone에선 navigation이 거의 없어 자동 체크가 안 됨)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && swRegistration) {
      swRegistration.update().catch(() => {});
    }
  });

  // 새 service worker가 활성화되면 페이지 한 번 자동 새로고침 → 사용자가 두 번 안 껐다 켜도 됨
  let reloadedForSW = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForSW) return;
    reloadedForSW = true;
    window.location.reload();
  });
}

