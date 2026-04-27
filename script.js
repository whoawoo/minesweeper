// 2단계+: 지뢰 배치 + 난이도 선택 + 새 게임 버튼

const DIFFICULTIES = {
  beginner:     { rows: 8,  cols: 8,  mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert:       { rows: 30, cols: 16, mines: 99 },
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

const SMILEY_DEFAULT = "🙂";
const SMILEY_PRESS = "😯";
const SMILEY_LOSE = "😵";
const SMILEY_WIN = "😎";

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
function placeMines(safeR, safeC) {
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

  // 후보 위치 모으기
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!safeSet.has(r * COLS + c)) {
        candidates.push([r, c]);
      }
    }
  }

  // 셔플(Fisher-Yates) 후 앞에서부터 MINES개 선택
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mineCount = Math.min(MINES, candidates.length);
  for (let i = 0; i < mineCount; i++) {
    const [r, c] = candidates[i];
    cells[r][c].isMine = true;
  }

  // 각 칸의 "주변 지뢰 수" 계산
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (cells[r][c].isMine) continue;
      cells[r][c].adjacent = countAdjacentMines(r, c);
    }
  }

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
}

const LONG_PRESS_MS = 400;

function attachInputHandlers(el, r, c) {
  let pressTimer = null;
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
  el.addEventListener("touchstart", () => {
    smileyPress();
    pressTimer = setTimeout(() => {
      onFlagToggle(r, c);
      suppressNextClick = true;
      if (navigator.vibrate) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }, { passive: true });

  const cancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  el.addEventListener("touchend", cancel, { passive: true });
  el.addEventListener("touchmove", cancel, { passive: true });
  el.addEventListener("touchcancel", cancel, { passive: true });

  // 일반 탭/클릭 = 공개 (단, 직전에 롱프레스 일어났으면 1번 무시)
  el.addEventListener("click", () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    onCellClick(r, c);
  });
}

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
}

function handleWin() {
  gameOver = true;
  stopTimer();
  flagAllMines();
  updateMineCount();
  newGameBtn.textContent = SMILEY_WIN;
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
      el.textContent = "💣";
    } else if (cell.adjacent > 0) {
      el.textContent = cell.adjacent;
      el.classList.add(`n${cell.adjacent}`);
    }
  } else if (cell.isFlagged) {
    el.classList.add("flagged");
    el.textContent = "🚩";
  }
}

// ---- 화면 전환 ----
function showMain() {
  stopTimer();
  gameView.classList.add("hidden");
  mainView.classList.remove("hidden");
}

function startGame(level) {
  currentDifficulty = level;
  mainView.classList.add("hidden");
  gameView.classList.remove("hidden");
  init();
}

// 메인 화면의 난이도 버튼들
mainView.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.level));
});

// 게임 화면 → 메인 복귀
menuBackBtn.addEventListener("click", showMain);

// 스마일 버튼 = 같은 난이도로 새 게임
newGameBtn.addEventListener("click", init);

// 손/마우스를 떼면 스마일 복귀 (어디서 떼든 동작하도록 document에 부착)
document.addEventListener("mouseup", smileyRelease);
document.addEventListener("touchend", smileyRelease);
document.addEventListener("touchcancel", smileyRelease);

// 메인 화면이 기본 시작 화면 (init은 startGame 안에서 호출됨)

// ---- PWA 등록: 오프라인/홈 화면 설치 ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });

  // 새 service worker가 활성화되면 페이지 한 번 자동 새로고침 → 사용자가 두 번 안 껐다 켜도 됨
  let reloadedForSW = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForSW) return;
    reloadedForSW = true;
    window.location.reload();
  });
}
