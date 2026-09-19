(function () {
  "use strict";

  const STORAGE_KEY = "jardin-cosy-progress";

  /** @type {{level:number, x:number, y:number, grid:string[][], moves:number, carrots:Set<string>, carrotsTotal:number, carrotsCollected:number, history:Array}} */
  let state = null;

  const screens = {
    menu: document.getElementById("screen-menu"),
    game: document.getElementById("screen-game"),
  };

  const levelGridEl = document.getElementById("level-grid");
  const boardEl = document.getElementById("board");
  const levelNameEl = document.getElementById("level-name");
  const levelNumberEl = document.getElementById("level-number");
  const movesEl = document.getElementById("moves-count");
  const carrotLineEl = document.getElementById("carrot-line");
  const carrotCountEl = document.getElementById("carrot-count");
  const carrotTotalEl = document.getElementById("carrot-total");
  const winOverlay = document.getElementById("win-overlay");
  const winStarsEl = document.getElementById("win-stars");
  const winCarrotStatusEl = document.getElementById("win-carrot-status");
  const finalOverlay = document.getElementById("final-overlay");

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { levels: {} };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.levels === "object" && parsed.levels) {
        return { levels: parsed.levels };
      }
      // migration depuis l'ancien format { completed: [indices] }
      if (Array.isArray(parsed.completed)) {
        const levels = {};
        parsed.completed.forEach((i) => {
          levels[i] = { completed: true, stars: 1, carrots: false };
        });
        return { levels };
      }
      return { levels: {} };
    } catch (e) {
      return { levels: {} };
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* pas grave si le stockage est indisponible */
    }
  }

  let progress = loadProgress();

  function isLevelUnlocked(index) {
    if (index === 0) return true;
    const prev = progress.levels[index - 1];
    return !!(prev && prev.completed);
  }

  function starsMarkup(count) {
    let out = "";
    for (let i = 0; i < 3; i++) {
      out += i < count ? "★" : "☆";
    }
    return out;
  }

  function buildLevelMenu() {
    levelGridEl.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const btn = document.createElement("button");
      btn.className = "level-tile";
      const unlocked = isLevelUnlocked(index);
      const record = progress.levels[index];
      const done = !!(record && record.completed);
      btn.disabled = !unlocked;
      const stars = done ? `<span class="level-tile-stars">${starsMarkup(record.stars || 0)}</span>` : "";
      const carrotBadge = done && record.carrots ? `<span class="level-tile-carrot">🥕</span>` : "";
      btn.innerHTML = `
        ${carrotBadge}
        <span class="level-tile-num">${index + 1}</span>
        <span class="level-tile-icon">${done ? "🌼" : unlocked ? "🌱" : "🔒"}</span>
        ${stars}
      `;
      if (unlocked) {
        btn.addEventListener("click", () => startLevel(index));
      }
      levelGridEl.appendChild(btn);
    });
  }

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function parseGrid(rows) {
    return rows.map((row) => row.split(""));
  }

  function findPlayer(grid) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === "@" || grid[y][x] === "+") {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  }

  function carrotKey(x, y) {
    return x + "," + y;
  }

  function updateCarrotHud() {
    if (!state || state.carrotsTotal === 0) {
      carrotLineEl.hidden = true;
      return;
    }
    carrotLineEl.hidden = false;
    carrotCountEl.textContent = String(state.carrotsCollected);
    carrotTotalEl.textContent = String(state.carrotsTotal);
  }

  function collectCarrotAt(x, y) {
    const key = carrotKey(x, y);
    if (state.carrots.has(key)) {
      state.carrots.delete(key);
      state.carrotsCollected++;
    }
  }

  function startLevel(index) {
    const level = LEVELS[index];
    const grid = parseGrid(level.grid);
    const player = findPlayer(grid);
    const carrots = new Set((level.carrots || []).map(([x, y]) => carrotKey(x, y)));
    state = {
      level: index,
      x: player.x,
      y: player.y,
      grid,
      moves: 0,
      carrots,
      carrotsTotal: carrots.size,
      carrotsCollected: 0,
      history: [],
    };
    collectCarrotAt(player.x, player.y);
    levelNameEl.textContent = level.name;
    levelNumberEl.textContent = `Niveau ${index + 1} / ${LEVELS.length}`;
    movesEl.textContent = "0";
    updateCarrotHud();
    winOverlay.classList.remove("show");
    finalOverlay.classList.remove("show");
    showScreen("game");
    render();
  }

  function cellAt(x, y) {
    const row = state.grid[y];
    if (!row) return "#";
    return row[x] === undefined ? "#" : row[x];
  }

  function setCellAt(x, y, value) {
    state.grid[y][x] = value;
  }

  function isFloorLike(ch) {
    return ch === " " || ch === "." || ch === "@" || ch === "+";
  }

  function isTargetLike(ch) {
    return ch === "." || ch === "+" || ch === "*";
  }

  function render() {
    boardEl.style.setProperty("--cols", Math.max(...state.grid.map((r) => r.length)));
    boardEl.style.setProperty("--rows", state.grid.length);
    boardEl.innerHTML = "";
    for (let y = 0; y < state.grid.length; y++) {
      for (let x = 0; x < state.grid[y].length; x++) {
        const ch = state.grid[y][x];
        const cell = document.createElement("div");
        cell.className = "cell " + classForCell(ch);
        cell.style.gridRowStart = y + 1;
        cell.style.gridColumnStart = x + 1;
        const hasCarrot = ch !== "#" && state.carrots.has(carrotKey(x, y));
        cell.textContent = hasCarrot ? "🥕" : glyphForCell(ch);
        boardEl.appendChild(cell);
      }
    }
  }

  function classForCell(ch) {
    switch (ch) {
      case "#":
        return "cell-wall";
      case " ":
        return "cell-floor";
      case ".":
        return "cell-target";
      case "$":
        return "cell-box";
      case "*":
        return "cell-box-done";
      case "@":
        return "cell-player";
      case "+":
        return "cell-player cell-target";
      default:
        return "cell-floor";
    }
  }

  function glyphForCell(ch) {
    switch (ch) {
      case "#":
        return "🌿";
      case "$":
        return "🪴";
      case "*":
        return "🌸";
      case "@":
      case "+":
        return "🐰";
      case ".":
        return "";
      default:
        return "";
    }
  }

  function snapshotGrid() {
    return state.grid.map((row) => row.slice());
  }

  function move(dx, dy) {
    if (!state || winOverlay.classList.contains("show")) return;
    const { x, y } = state;
    const nx = x + dx;
    const ny = y + dy;
    const target = cellAt(nx, ny);

    if (target === "#") return;

    if (target === "$" || target === "*") {
      const bx = nx + dx;
      const by = ny + dy;
      const beyond = cellAt(bx, by);
      if (beyond === "#" || beyond === "$" || beyond === "*") return;
    }

    // sauvegarde avant de jouer le coup, pour l'annulation
    state.history.push({
      grid: snapshotGrid(),
      x,
      y,
      moves: state.moves,
      carrots: new Set(state.carrots),
      carrotsCollected: state.carrotsCollected,
    });

    let boxDest = null;
    if (target === "$" || target === "*") {
      const bx = nx + dx;
      const by = ny + dy;
      const beyond = cellAt(bx, by);
      setCellAt(bx, by, isTargetLike(beyond) ? "*" : "$");
      boxDest = { x: bx, y: by };
    }

    // libère la case de départ
    setCellAt(x, y, isTargetLike(cellAt(x, y)) ? "." : " ");
    // occupe la nouvelle case
    setCellAt(nx, ny, isTargetLike(target) && target !== "$" ? "+" : "@");

    state.x = nx;
    state.y = ny;
    state.moves++;
    movesEl.textContent = String(state.moves);

    collectCarrotAt(nx, ny);
    if (boxDest) collectCarrotAt(boxDest.x, boxDest.y);
    updateCarrotHud();

    render();
    checkWin();
  }

  function undo() {
    if (!state || state.history.length === 0) return;
    const last = state.history.pop();
    state.grid = last.grid;
    state.x = last.x;
    state.y = last.y;
    state.moves = last.moves;
    state.carrots = last.carrots;
    state.carrotsCollected = last.carrotsCollected;
    movesEl.textContent = String(state.moves);
    updateCarrotHud();
    render();
  }

  function starsForMoves(moves, par) {
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.6)) return 2;
    return 1;
  }

  function checkWin() {
    const hasRemainingBox = state.grid.some((row) => row.includes("$"));
    if (!hasRemainingBox) {
      const level = LEVELS[state.level];
      const stars = starsForMoves(state.moves, level.par || state.moves);
      const carrotsFull = state.carrotsTotal === 0 || state.carrotsCollected === state.carrotsTotal;

      const prevRecord = progress.levels[state.level] || {};
      progress.levels[state.level] = {
        completed: true,
        stars: Math.max(prevRecord.stars || 0, stars),
        carrots: !!prevRecord.carrots || (state.carrotsTotal > 0 && carrotsFull),
      };
      saveProgress(progress);

      setTimeout(() => {
        if (state.level === LEVELS.length - 1) {
          finalOverlay.classList.add("show");
        } else {
          winStarsEl.textContent = starsMarkup(stars);
          if (state.carrotsTotal === 0) {
            winCarrotStatusEl.hidden = true;
          } else {
            winCarrotStatusEl.hidden = false;
            winCarrotStatusEl.textContent = carrotsFull
              ? "🥕 Toutes les carottes récoltées !"
              : `🥕 ${state.carrotsCollected}/${state.carrotsTotal} carottes — rejoue pour les avoir toutes`;
          }
          winOverlay.classList.add("show");
        }
      }, 200);
    }
  }

  function resetLevel() {
    startLevel(state.level);
  }

  function nextLevel() {
    const next = state.level + 1;
    if (next < LEVELS.length) {
      startLevel(next);
    } else {
      showScreen("menu");
      buildLevelMenu();
    }
  }

  function goToMenu() {
    showScreen("menu");
    buildLevelMenu();
  }

  // --- Contrôles ---

  document.addEventListener("keydown", (e) => {
    if (!screens.game.classList.contains("active")) return;
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        move(0, -1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        move(0, 1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        move(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        move(1, 0);
        break;
      case "z":
      case "Z":
        undo();
        break;
      case "r":
      case "R":
        resetLevel();
        break;
    }
  });

  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      if (dir === "up") move(0, -1);
      if (dir === "down") move(0, 1);
      if (dir === "left") move(-1, 0);
      if (dir === "right") move(1, 0);
    });
  });

  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-reset").addEventListener("click", resetLevel);
  document.getElementById("btn-menu").addEventListener("click", goToMenu);
  document.getElementById("btn-next").addEventListener("click", nextLevel);
  document.getElementById("btn-replay").addEventListener("click", resetLevel);
  document.getElementById("btn-final-menu").addEventListener("click", goToMenu);

  // Swipe tactile
  let touchStartX = 0;
  let touchStartY = 0;
  boardEl.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true }
  );
  boardEl.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const threshold = 24;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 1 : -1, 0);
      } else {
        move(0, dy > 0 ? 1 : -1);
      }
    },
    { passive: true }
  );

  buildLevelMenu();
  showScreen("menu");
})();
