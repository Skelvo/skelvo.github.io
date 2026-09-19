(function () {
  "use strict";

  const STORAGE_KEY = "jardin-cosy-progress";

  /** @type {{level:number, x:number, y:number, grid:string[][], moves:number, history:Array}} */
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
  const winOverlay = document.getElementById("win-overlay");
  const finalOverlay = document.getElementById("final-overlay");

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completed: [] };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.completed)) return { completed: [] };
      return parsed;
    } catch (e) {
      return { completed: [] };
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
    return progress.completed.includes(index - 1);
  }

  function buildLevelMenu() {
    levelGridEl.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const btn = document.createElement("button");
      btn.className = "level-tile";
      const unlocked = isLevelUnlocked(index);
      const done = progress.completed.includes(index);
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span class="level-tile-num">${index + 1}</span>
        <span class="level-tile-icon">${done ? "🌼" : unlocked ? "🌱" : "🔒"}</span>
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

  function startLevel(index) {
    const level = LEVELS[index];
    const grid = parseGrid(level.grid);
    const player = findPlayer(grid);
    state = {
      level: index,
      x: player.x,
      y: player.y,
      grid,
      moves: 0,
      history: [],
    };
    levelNameEl.textContent = level.name;
    levelNumberEl.textContent = `Niveau ${index + 1} / ${LEVELS.length}`;
    movesEl.textContent = "0";
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
        cell.textContent = glyphForCell(ch);
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
    state.history.push({ grid: snapshotGrid(), x, y, moves: state.moves });

    if (target === "$" || target === "*") {
      const bx = nx + dx;
      const by = ny + dy;
      const beyond = cellAt(bx, by);
      setCellAt(bx, by, isTargetLike(beyond) ? "*" : "$");
    }

    // libère la case de départ
    setCellAt(x, y, isTargetLike(cellAt(x, y)) ? "." : " ");
    // occupe la nouvelle case
    setCellAt(nx, ny, isTargetLike(target) && target !== "$" ? "+" : "@");

    state.x = nx;
    state.y = ny;
    state.moves++;
    movesEl.textContent = String(state.moves);

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
    movesEl.textContent = String(state.moves);
    render();
  }

  function checkWin() {
    const hasRemainingBox = state.grid.some((row) => row.includes("$"));
    if (!hasRemainingBox) {
      const already = progress.completed.includes(state.level);
      if (!already) {
        progress.completed.push(state.level);
        saveProgress(progress);
      }
      setTimeout(() => {
        if (state.level === LEVELS.length - 1) {
          finalOverlay.classList.add("show");
        } else {
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
