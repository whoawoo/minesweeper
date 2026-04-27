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
const calHintEl = document.getElementById("calHint");
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
  el.addEventListener("touchmove", cancel, { passive: true });
  el.addEventListener("touchcancel", cancel, { passive: true });

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
  // 도장 미적립 (게임 다시 시작 시 사라짐)
  pendingStampDate = null;
  hideStampBanner();
  clearSave();
}

function handleWin() {
  gameOver = true;
  stopTimer();
  flagAllMines();
  updateMineCount();
  newGameBtn.textContent = SMILEY_WIN;
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
  attendanceInfoEl.textContent = trophies > 0
    ? `도장 ${total}개 · 🏆 ${trophies}`
    : `도장 ${total}개`;
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
    calTrophyRow.innerHTML =
      `<span class="cal-trophy-emoji">🏆</span>` +
      `<span class="cal-trophy-caption">${calMonth + 1}월 완벽 출석!</span>`;
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

    if (stamps[ds]) cell.classList.add("stamped");
    if (ds > today) {
      cell.classList.add("future");
      cell.disabled = true;
    }
    if (ds === today) cell.classList.add("today");
    if (ds === selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", () => {
      if (cell.disabled) return;
      selectedDate = ds;
      renderCalendar();
    });
    calGridEl.appendChild(cell);
  }

  // 힌트 갱신
  if (selectedDate) {
    const [y, m, dd] = selectedDate.split("-");
    const stamped = stamps[selectedDate];
    calHintEl.textContent = stamped
      ? `${parseInt(m)}월 ${parseInt(dd)}일 — 이미 도장 ✓`
      : `${parseInt(m)}월 ${parseInt(dd)}일 선택됨`;
  } else {
    calHintEl.textContent = "날짜를 선택하세요 (없으면 오늘)";
  }
}

function showAttendance() {
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
  pendingStampDate = null;
  hideStampBanner();
  clearSave();
  init();
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
