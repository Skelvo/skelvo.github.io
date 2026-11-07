/* ==========================================================================
   Jeux de plateau en ligne (2 joueurs, les autres regardent).
   « Le gagnant reste » : à la fin, le perdant laisse sa place au suivant.
   Bataille navale · Aligne 4 · Morpion géant · Dames · Échecs
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO, O = A.online;
const { esc, shuffle } = A;

/* ======================================================================
   Gestion des duels (file d'attente, abandons, nul, revanche)
   ====================================================================== */
function Duel(names, makeEngine) {
  const queue = shuffle(names), wins = Object.fromEntries(names.map(p => [p, 0]));
  let e, players, result, drawOffer, gameNo = 0;
  function start() { gameNo++; players = [queue[0], queue[1]]; e = makeEngine(); result = null; drawOffer = null; }
  function finish(w, why) {
    result = { winner: w, why };
    if (w === 0 || w === 1) wins[players[w]]++;
  }
  function act(who, a, isHost) {
    const side = players.indexOf(who);
    if (a.k === 'dnext' && result && (isHost || side >= 0)) {
      if (result.winner === 0 || result.winner === 1) { const loser = players[1 - result.winner]; queue.splice(queue.indexOf(loser), 1); queue.push(loser); }
      else { const p = queue.splice(0, 2); queue.push(...p.reverse()); }
      start(); return;
    }
    if (result) return 'La partie est terminée';
    if (side < 0) return 'Tu regardes cette partie 👀';
    if (a.k === 'resign') { finish(1 - side, `${who} abandonne`); return; }
    if (a.k === 'offer') { drawOffer = side; return; }
    if (a.k === 'accept' && drawOffer === 1 - side) { finish(2, 'Match nul accepté'); return; }
    if (a.k === 'decline') { drawOffer = null; return; }
    const err = e.act(side, a); if (err) return err;
    drawOffer = null;
    if (e.over()) { const o = e.over(); finish(o.winner, o.why); }
  }
  function view(me) {
    const side = players.indexOf(me);
    return { side, players, queue: queue.slice(2), wins, result, drawOffer, gameNo, game: e.view(side) };
  }
  start();
  return { act, view };
}
function duelWrap(id, makeEngine) {
  return (names) => { const d = Duel(names, makeEngine); return { act: d.act, view: me => ({ id, me, ...d.view(me) }), min: 2, max: 16 }; };
}
/* En-tête et pied communs */
function duelHead(g, ctx, turnSide, extra = '') {
  const [a, b] = g.players, mine = g.side >= 0 && turnSide === g.side && !g.result;
  return `<div class="duelbar">
      <div class="${turnSide === 0 && !g.result ? 'now' : ''}"><b>${esc(a)}${g.side === 0 ? ' (toi)' : ''}</b><small>${g.game.labels && g.game.labels[0] ? esc(g.game.labels[0]) + ' · ' : ''}🏆 ${g.wins[a]}</small></div>
      <span>VS</span>
      <div class="${turnSide === 1 && !g.result ? 'now' : ''}"><b>${esc(b)}${g.side === 1 ? ' (toi)' : ''}</b><small>${g.game.labels && g.game.labels[1] ? esc(g.game.labels[1]) + ' · ' : ''}🏆 ${g.wins[b]}</small></div>
    </div>
    ${g.result ? `<div class="turnbar mine">${g.result.winner === 2 ? '🤝 Match nul' : `🏆 ${esc(g.players[g.result.winner])} gagne`}${g.result.why ? ` · ${esc(g.result.why)}` : ''}</div>`
      : g.side < 0 ? `<div class="turnbar">👀 Tu regardes · au tour de ${esc(g.players[turnSide] || '')}</div>`
      : `<div class="turnbar ${mine ? 'mine' : ''}">${mine ? '👉 À toi de jouer' : `Au tour de ${esc(g.players[turnSide])}…`}${extra}</div>`}`;
}
function duelFoot(g, ctx) {
  const play = g.side >= 0 && !g.result;
  return `${g.drawOffer != null && !g.result ? (g.side === 1 - g.drawOffer ? `<div class="row"><button class="btn" data-a="ddecline">Refuser le nul</button><button class="btn ok" data-a="daccept">Accepter le nul</button></div>` : `<p class="hint">Proposition de match nul envoyée…</p>`) : ''}
    ${play ? `<div class="row"><button class="btn ghost" data-a="dresign">🏳️ Abandonner</button>${g.drawOffer == null ? `<button class="btn ghost" data-a="doffer">🤝 Proposer nul</button>` : ''}</div>` : ''}
    ${g.result && (g.side >= 0 || ctx.amHost()) ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="dnext">${g.queue.length ? `Suivant : ${esc(g.queue[0])}` : 'Revanche'}</button></div>` : ''}
    ${g.queue.length ? `<p class="hint" style="font-size:.8rem">File d'attente : ${g.queue.map(esc).join(', ')}</p>` : ''}
    ${ctx.amHost() && !g.result ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}`;
}

/* ======================================================================
   🚢 BATAILLE NAVALE
   ====================================================================== */
const SHIPS = [5, 4, 3, 3, 2];
function placeFleet() {
  const grid = Array(100).fill(-1), ships = [];
  SHIPS.forEach((len, id) => {
    for (;;) {
      const hz = Math.random() < .5, r = Math.floor(Math.random() * (hz ? 10 : 11 - len)), c = Math.floor(Math.random() * (hz ? 11 - len : 10));
      const cells = Array.from({ length: len }, (_, k) => (r + (hz ? 0 : k)) * 10 + c + (hz ? k : 0));
      // pas de bateaux collés (même en diagonale) pour que ce soit lisible
      const touch = cells.some(i => { const rr = Math.floor(i / 10), cc = i % 10; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r2 = rr + dr, c2 = cc + dc; if (r2 >= 0 && r2 < 10 && c2 >= 0 && c2 < 10 && grid[r2 * 10 + c2] >= 0) return true; } return false; });
      if (touch) continue;
      cells.forEach(i => grid[i] = id); ships.push(cells); break;
    }
  });
  return { grid, ships };
}
function Navale() {
  const fleets = [placeFleet(), placeFleet()], shots = [new Set(), new Set()], ready = [false, false];
  let turn = 0, last = null;
  const sunk = (side, id) => fleets[side].ships[id].every(i => shots[1 - side].has(i));
  const allSunk = side => fleets[side].ships.every((_, id) => sunk(side, id));
  return {
    act(side, a) {
      if (!ready[0] || !ready[1]) {
        if (a.k === 'nshuffle' && !ready[side]) { fleets[side] = placeFleet(); return; }
        if (a.k === 'nready') { ready[side] = true; return; }
        return 'Attends que tout le monde soit prêt';
      }
      if (a.k !== 'shoot') return;
      if (side !== turn) return 'Ce n’est pas ton tour';
      const i = a.i | 0; if (i < 0 || i > 99 || shots[side].has(i)) return 'Case déjà visée';
      shots[side].add(i);
      const id = fleets[1 - side].grid[i];
      last = { side, i, hit: id >= 0, sunk: id >= 0 && sunk(1 - side, id) ? SHIPS[id] : 0 };
      if (id < 0) turn = 1 - side;            // touché : on rejoue
    },
    over() { if (allSunk(0)) return { winner: 1, why: 'Toute la flotte est coulée' }; if (allSunk(1)) return { winner: 0, why: 'Toute la flotte est coulée' }; return null; },
    view(side) {
      const me = side >= 0 ? side : 0;
      const oppCells = Array.from({ length: 100 }, (_, i) => {
        if (!shots[me].has(i)) return 0;
        const id = fleets[1 - me].grid[i]; if (id < 0) return 1;
        return sunk(1 - me, id) ? 3 : 2;                       // 1 raté, 2 touché, 3 coulé
      });
      const myCells = Array.from({ length: 100 }, (_, i) => (fleets[me].grid[i] >= 0 ? 10 : 0) + (shots[1 - me].has(i) ? 1 : 0));
      const left = s => fleets[s].ships.filter((_, id) => !sunk(s, id)).length;
      return { ready, phase: ready[0] && ready[1] ? 'play' : 'place', turn, last, oppCells, myCells, left: [left(0), left(1)], labels: ['', ''] };
    }
  };
}
function renderNavale(g, ctx) {
  const v = g.game, play = v.phase === 'play';
  const grid = (cells, clickable, own) => `<div class="ngrid">${cells.map((x, i) => {
    let cls = '';
    if (own) cls = (x >= 10 ? 'ship ' : '') + (x % 10 ? (x >= 10 ? 'hit' : 'miss') : '');
    else cls = ['', 'miss', 'hit', 'sunk'][x];
    return `<button class="ncell ${cls}" ${clickable && !x ? `data-a="nshoot" data-i="${i}"` : 'disabled'}></button>`;
  }).join('')}</div>`;
  if (!play) return ctx.view(`${ctx.top('Bataille navale')}
    <div class="stage">${duelHead(g, ctx, -1)}
      ${g.side >= 0 ? `<p class="hint">Voici ta flotte (5, 4, 3, 3 et 2 cases). Mélange jusqu'à ce qu'elle te plaise, puis valide.</p>${grid(v.myCells, false, true)}
        ${v.ready[g.side] ? `<div class="waiting"><div class="spinner small"></div>En attente de ${esc(g.players[1 - g.side])}…</div>` : `<div class="row"><button class="btn" data-a="nshuffle">🔀 Mélanger</button><button class="btn primary" data-a="nready">Prêt ✓</button></div>`}`
        : `<div class="waiting">Les amiraux placent leurs bateaux…</div>`}
      ${duelFoot(g, ctx)}
    </div>`);
  const myTurn = g.side === v.turn && !g.result;
  const msg = v.last ? `${esc(g.players[v.last.side])} tire en ${'ABCDEFGHIJ'[v.last.i % 10]}${Math.floor(v.last.i / 10) + 1} : ${v.last.sunk ? `coulé ! (${v.last.sunk} cases) 💥` : v.last.hit ? 'touché ! 🔥' : 'à l’eau 💦'}` : 'Feu à volonté !';
  ctx.view(`${ctx.top('Bataille navale')}
    <div class="stage" style="gap:10px">${duelHead(g, ctx, v.turn)}
      <p class="log">${msg}</p>
      <div class="label">${g.side >= 0 ? `Flotte ennemie · ${v.left[1 - g.side]} bateau${v.left[1 - g.side] > 1 ? 'x' : ''} restant${v.left[1 - g.side] > 1 ? 's' : ''}` : `Tirs de ${esc(g.players[0])}`}</div>
      ${grid(v.oppCells, myTurn, false)}
      <div class="label">${g.side >= 0 ? `Ta flotte · ${v.left[g.side]} restant${v.left[g.side] > 1 ? 's' : ''}` : `Flotte de ${esc(g.players[0])}`}</div>
      <div class="small-grid">${grid(v.myCells, false, true)}</div>
      ${duelFoot(g, ctx)}
    </div>`, null, true);
}

/* ======================================================================
   🔴 ALIGNE 4  et  ⭕ MORPION GÉANT  (aligner des pions)
   ====================================================================== */
function lineWin(board, W, H, i, need) {
  const v = board[i], r = Math.floor(i / W), c = i % W;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [i];
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < H && cc >= 0 && cc < W && board[rr * W + cc] === v) { cells.push(rr * W + cc); rr += dr * s; cc += dc * s; } }
    if (cells.length >= need) return cells;
  }
  return null;
}
function Aligne4() {
  const W = 7, H = 6, b = Array(W * H).fill(-1); let turn = 0, win = null, last = -1, n = 0;
  return {
    act(side, a) {
      if (a.k !== 'drop') return; if (side !== turn) return 'Ce n’est pas ton tour';
      const c = a.c | 0; if (c < 0 || c >= W) return;
      let r = H - 1; while (r >= 0 && b[r * W + c] >= 0) r--; if (r < 0) return 'Colonne pleine';
      const i = r * W + c; b[i] = side; last = i; n++;
      win = lineWin(b, W, H, i, 4); turn = 1 - side;
    },
    over() { if (win) return { winner: b[win[0]], why: '4 alignés !' }; if (n === W * H) return { winner: 2, why: 'Grille pleine' }; return null; },
    view() { return { b, turn, win, last, W, H, labels: ['🔴 Rouge', '🟡 Jaune'] }; }
  };
}
function renderAligne(g, ctx) {
  const v = g.game, can = g.side === v.turn && !g.result;
  ctx.view(`${ctx.top('Aligne 4')}
    <div class="stage">${duelHead(g, ctx, v.turn)}
      <div class="c4">${Array.from({ length: v.W }, (_, c) => `<button class="c4col" ${can ? `data-a="c4" data-c="${c}"` : 'disabled'}>${Array.from({ length: v.H }, (_, r) => {
        const i = r * v.W + c, x = v.b[i];
        return `<i class="${x === 0 ? 'red' : x === 1 ? 'yel' : ''} ${v.win && v.win.includes(i) ? 'win' : ''} ${i === v.last ? 'last' : ''}"></i>`; }).join('')}</button>`).join('')}</div>
      ${duelFoot(g, ctx)}
    </div>`, null, true);
}
function Morpion() {
  const N = 15, b = Array(N * N).fill(-1); let turn = 0, win = null, last = -1, n = 0;
  return {
    act(side, a) {
      if (a.k !== 'put') return; if (side !== turn) return 'Ce n’est pas ton tour';
      const i = a.i | 0; if (i < 0 || i >= N * N || b[i] >= 0) return 'Case occupée';
      b[i] = side; last = i; n++; win = lineWin(b, N, N, i, 5); turn = 1 - side;
    },
    over() { if (win) return { winner: b[win[0]], why: '5 alignés !' }; if (n === N * N) return { winner: 2, why: 'Plateau plein' }; return null; },
    view() { return { b, turn, win, last, N, labels: ['✕', '◯'] }; }
  };
}
function renderMorpion(g, ctx) {
  const v = g.game, can = g.side === v.turn && !g.result;
  ctx.view(`${ctx.top('Morpion géant')}
    <div class="stage">${duelHead(g, ctx, v.turn)}
      <div class="gomoku" style="--n:${v.N}">${v.b.map((x, i) => `<button class="gcell ${x === 0 ? 'x' : x === 1 ? 'o' : ''} ${v.win && v.win.includes(i) ? 'win' : ''} ${i === v.last ? 'last' : ''}" ${can && x < 0 ? `data-a="gput" data-i="${i}"` : 'disabled'}>${x === 0 ? '✕' : x === 1 ? '◯' : ''}</button>`).join('')}</div>
      <p class="hint" style="font-size:.82rem">Aligne 5 symboles (horizontal, vertical ou diagonale).</p>
      ${duelFoot(g, ctx)}
    </div>`, null, true);
}

/* ======================================================================
   ⛀ DAMES — règles internationales (10×10)
   Prise obligatoire et majoritaire, rafles, dames volantes.
   ====================================================================== */
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
function damesInit() {
  const b = Array(100).fill('');
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2 === 1) { if (r < 4) b[r * 10 + c] = 'b'; else if (r > 5) b[r * 10 + c] = 'w'; }
  return b;
}
const owner = p => p ? (p.toLowerCase() === 'w' ? 0 : 1) : -1;
const isKing = p => p === 'W' || p === 'B';
function damesMoves(b, side) {
  const caps = [];
  for (let s = 0; s < 100; s++) {
    if (owner(b[s]) !== side) continue;
    const king = isKing(b[s]);
    const dfs = (sq, captured, path) => {
      let found = false; const r = Math.floor(sq / 10), c = sq % 10;
      for (const [dr, dc] of DIRS) {
        let rr = r + dr, cc = c + dc;
        if (king) while (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && (!b[rr * 10 + cc] || rr * 10 + cc === s)) { rr += dr; cc += dc; }
        if (!(rr >= 0 && rr < 10 && cc >= 0 && cc < 10)) continue;
        const mid = rr * 10 + cc;
        if (owner(b[mid]) !== 1 - side || captured.includes(mid)) continue;
        let lr = rr + dr, lc = cc + dc;
        while (lr >= 0 && lr < 10 && lc >= 0 && lc < 10 && (!b[lr * 10 + lc] || lr * 10 + lc === s)) {
          const land = lr * 10 + lc;
          found = true;
          const sub = dfs(land, captured.concat(mid), path.concat(land));
          if (!sub) caps.push({ from: s, to: land, path: path.concat(land), captured: captured.concat(mid) });
          if (!king) break;
          lr += dr; lc += dc;
        }
      }
      return found;
    };
    dfs(s, [], []);
  }
  if (caps.length) { const max = Math.max(...caps.map(m => m.captured.length)); return caps.filter(m => m.captured.length === max); }
  const moves = [];
  for (let s = 0; s < 100; s++) {
    if (owner(b[s]) !== side) continue;
    const r = Math.floor(s / 10), c = s % 10, king = isKing(b[s]);
    for (const [dr, dc] of DIRS) {
      if (!king && dr !== (side === 0 ? -1 : 1)) continue;
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && !b[rr * 10 + cc]) { moves.push({ from: s, to: rr * 10 + cc, path: [rr * 10 + cc], captured: [] }); if (!king) break; rr += dr; cc += dc; }
    }
  }
  return moves;
}
function damesApply(b, m) {
  const nb = b.slice(), p = nb[m.from]; nb[m.from] = ''; m.captured.forEach(i => nb[i] = '');
  const row = Math.floor(m.to / 10);
  nb[m.to] = (p === 'w' && row === 0) ? 'W' : (p === 'b' && row === 9) ? 'B' : p;
  return nb;
}
function Dames() {
  let b = damesInit(), turn = 0, last = null, quiet = 0;
  return {
    act(side, a) {
      if (a.k !== 'move') return; if (side !== turn) return 'Ce n’est pas ton tour';
      const legal = damesMoves(b, side), m = legal.find(x => x.from === (a.from | 0) && x.to === (a.to | 0));
      if (!m) return legal.some(x => x.captured.length) ? 'La prise est obligatoire (et il faut prendre le maximum de pions)' : 'Déplacement impossible';
      const kingMove = isKing(b[m.from]) && !m.captured.length;
      b = damesApply(b, m); last = m; turn = 1 - side;
      quiet = kingMove ? quiet + 1 : 0;
    },
    over() {
      if (!damesMoves(b, turn).length) return { winner: 1 - turn, why: 'Plus aucun coup possible' };
      if (quiet >= 50) return { winner: 2, why: '25 coups de dames de chaque côté sans prise' };
      return null;
    },
    view() { return { b, turn, last, moves: damesMoves(b, turn), labels: ['⚪ Blancs', '⚫ Noirs'] }; }
  };
}
A.boardEngines = { damesMoves, damesApply, damesInit };   // exposé pour les tests
function renderDames(g, ctx) {
  const v = g.game, can = g.side === v.turn && !g.result, sel = ctx.ui.dsel;
  const flip = g.side === 1;
  const targets = sel != null ? v.moves.filter(m => m.from === sel).map(m => m.to) : [];
  const movable = can ? [...new Set(v.moves.map(m => m.from))] : [];
  const cells = [];
  for (let k = 0; k < 100; k++) {
    const i = flip ? 99 - k : k, r = Math.floor(i / 10), c = i % 10, dark = (r + c) % 2 === 1, p = v.b[i];
    const cls = ['dsq', dark ? 'dark' : '', i === sel ? 'sel' : '', targets.includes(i) ? 'tgt' : '', movable.includes(i) ? 'mov' : '',
      v.last && (v.last.from === i || v.last.to === i) ? 'last' : '', v.last && v.last.captured.includes(i) ? 'cap' : ''].join(' ');
    const act = can && (movable.includes(i) ? `data-a="dsel" data-i="${i}"` : targets.includes(i) ? `data-a="dto" data-i="${i}"` : '');
    cells.push(`<button class="${cls}" ${act || 'disabled'}>${p ? `<i class="pion ${p.toLowerCase() === 'w' ? 'w' : 'b'} ${isKing(p) ? 'k' : ''}"></i>` : ''}</button>`);
  }
  const mustCap = can && v.moves.length && v.moves[0].captured.length;
  ctx.view(`${ctx.top('Dames')}
    <div class="stage">${duelHead(g, ctx, v.turn, mustCap ? ` · prise obligatoire (${v.moves[0].captured.length})` : '')}
      <div class="dboard">${cells.join('')}</div>
      <p class="hint" style="font-size:.82rem">Touche un pion puis sa case d'arrivée. La prise est obligatoire, et il faut prendre le plus de pions possible.</p>
      ${duelFoot(g, ctx)}
    </div>`, null, true);
}

/* ======================================================================
   ♟️ ÉCHECS — règles complètes (roque, prise en passant, promotion,
   échec et mat, pat, matériel insuffisant, 50 coups)
   ====================================================================== */
const CH = (() => {
  const isW = p => p && p === p.toUpperCase(), side = p => p ? (isW(p) ? 'w' : 'b') : null;
  const N8 = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const on = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
  function init() {
    const back = 'rnbqkbnr'.split('');
    const b = Array(64).fill('');
    for (let f = 0; f < 8; f++) { b[f] = back[f]; b[8 + f] = 'p'; b[48 + f] = 'P'; b[56 + f] = back[f].toUpperCase(); }
    return { b, turn: 'w', castle: 'KQkq', ep: -1, half: 0, full: 1 };
  }
  function attacked(b, sq, by) {
    const r = sq >> 3, f = sq & 7;
    const pawnDir = by === 'w' ? 1 : -1;   // un pion blanc attaque vers le haut, donc il est en dessous
    for (const df of [-1, 1]) { const rr = r + pawnDir, ff = f + df; if (on(rr, ff) && b[rr * 8 + ff] === (by === 'w' ? 'P' : 'p')) return true; }
    for (const [dr, df] of N8) { const rr = r + dr, ff = f + df; if (on(rr, ff) && b[rr * 8 + ff] === (by === 'w' ? 'N' : 'n')) return true; }
    for (const [dr, df] of K8) { const rr = r + dr, ff = f + df; if (on(rr, ff) && b[rr * 8 + ff] === (by === 'w' ? 'K' : 'k')) return true; }
    const slide = (dirs, pcs) => dirs.some(([dr, df]) => { let rr = r + dr, ff = f + df; while (on(rr, ff)) { const p = b[rr * 8 + ff]; if (p) return side(p) === by && pcs.includes(p.toLowerCase()); rr += dr; ff += df; } return false; });
    return slide(DIAG, 'bq') || slide(ORTH, 'rq');
  }
  function pseudo(st) {
    const { b, turn } = st, mv = [];
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (!p || side(p) !== turn) continue;
      const r = s >> 3, f = s & 7, t = p.toLowerCase();
      const add = (to, extra = {}) => mv.push({ from: s, to, ...extra });
      if (t === 'p') {
        const dir = turn === 'w' ? -1 : 1, startR = turn === 'w' ? 6 : 1, lastR = turn === 'w' ? 0 : 7;
        const push = (to, extra) => { if ((to >> 3) === lastR) 'qrbn'.split('').forEach(pr => add(to, { ...extra, promo: pr })); else add(to, extra); };
        const one = (r + dir) * 8 + f;
        if (on(r + dir, f) && !b[one]) { push(one); const two = (r + 2 * dir) * 8 + f; if (r === startR && !b[two]) add(two, { double: true }); }
        for (const df of [-1, 1]) {
          if (!on(r + dir, f + df)) continue; const to = (r + dir) * 8 + f + df;
          if (b[to] && side(b[to]) !== turn) push(to);
          else if (to === st.ep) add(to, { ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, df] of (t === 'n' ? N8 : K8)) { const rr = r + dr, ff = f + df; if (on(rr, ff) && side(b[rr * 8 + ff]) !== turn) add(rr * 8 + ff); }
        if (t === 'k') {
          const opp = turn === 'w' ? 'b' : 'w', home = turn === 'w' ? 60 : 4;
          if (s === home && !attacked(b, s, opp)) {
            const kc = turn === 'w' ? 'K' : 'k', qc = turn === 'w' ? 'Q' : 'q';
            if (st.castle.includes(kc) && !b[s + 1] && !b[s + 2] && !attacked(b, s + 1, opp) && !attacked(b, s + 2, opp)) add(s + 2, { castle: 'k' });
            if (st.castle.includes(qc) && !b[s - 1] && !b[s - 2] && !b[s - 3] && !attacked(b, s - 1, opp) && !attacked(b, s - 2, opp)) add(s - 2, { castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, df] of dirs) { let rr = r + dr, ff = f + df; while (on(rr, ff)) { const q = b[rr * 8 + ff]; if (q && side(q) === turn) break; add(rr * 8 + ff); if (q) break; rr += dr; ff += df; } }
      }
    }
    return mv;
  }
  function apply(st, m) {
    const b = st.b.slice(), p = b[m.from], turn = st.turn, capt = b[m.to];
    b[m.to] = m.promo ? (turn === 'w' ? m.promo.toUpperCase() : m.promo) : p; b[m.from] = '';
    if (m.ep) b[m.to + (turn === 'w' ? 8 : -8)] = '';
    if (m.castle === 'k') { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = ''; }
    if (m.castle === 'q') { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = ''; }
    let castle = st.castle;
    const strip = sq => { if (sq === 60) castle = castle.replace(/[KQ]/g, ''); if (sq === 4) castle = castle.replace(/[kq]/g, ''); if (sq === 63) castle = castle.replace('K', ''); if (sq === 56) castle = castle.replace('Q', ''); if (sq === 7) castle = castle.replace('k', ''); if (sq === 0) castle = castle.replace('q', ''); };
    strip(m.from); strip(m.to);
    const ep = m.double ? (m.from + m.to) / 2 : -1;
    const half = (p.toLowerCase() === 'p' || capt || m.ep) ? 0 : st.half + 1;
    return { b, turn: turn === 'w' ? 'b' : 'w', castle, ep, half, full: st.full + (turn === 'b' ? 1 : 0) };
  }
  const kingSq = (b, s) => b.indexOf(s === 'w' ? 'K' : 'k');
  const inCheck = st => attacked(st.b, kingSq(st.b, st.turn), st.turn === 'w' ? 'b' : 'w');
  function legal(st) { return pseudo(st).filter(m => { const n = apply(st, m); return !attacked(n.b, kingSq(n.b, st.turn), n.turn); }); }
  function insufficient(b) {
    const pcs = b.filter(p => p && p.toLowerCase() !== 'k').map(p => p.toLowerCase());
    return !pcs.length || (pcs.length === 1 && 'bn'.includes(pcs[0]));
  }
  function fromFEN(fen) {
    const [pos, turn, castle, ep] = fen.split(' '); const b = [];
    pos.split('/').forEach(row => [...row].forEach(ch => { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) b.push(''); else b.push(ch); }));
    const epSq = ep && ep !== '-' ? (8 - +ep[1]) * 8 + 'abcdefgh'.indexOf(ep[0]) : -1;
    return { b, turn, castle: castle === '-' ? '' : castle, ep: epSq, half: 0, full: 1 };
  }
  return { init, legal, apply, inCheck, insufficient, fromFEN };
})();
A.chess = CH;   // exposé pour les tests (perft)
const PIECE = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const SQN = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
function Echecs() {
  let st = CH.init(), last = null, history = [], reps = {};
  const key = s => s.b.join(',') + s.turn + s.castle + s.ep;
  reps[key(st)] = 1;
  return {
    act(side, a) {
      if (a.k !== 'move') return;
      if ((side === 0 ? 'w' : 'b') !== st.turn) return 'Ce n’est pas ton tour';
      const m = CH.legal(st).find(x => x.from === (a.from | 0) && x.to === (a.to | 0) && (!x.promo || x.promo === (a.promo || 'q')));
      if (!m) return 'Coup illégal';
      const p = st.b[m.from], capt = st.b[m.to] || m.ep;
      st = CH.apply(st, m); last = m;
      const chk = CH.inCheck(st);
      history.push((p.toLowerCase() === 'p' ? '' : PIECE[p.toUpperCase()]) + (capt ? '×' : '') + SQN(m.to) + (m.promo ? '=' + PIECE[m.promo.toUpperCase()] : '') + (m.castle ? (m.castle === 'k' ? ' (0-0)' : ' (0-0-0)') : '') + (chk ? '+' : ''));
      const k = key(st); reps[k] = (reps[k] || 0) + 1;
    },
    over() {
      const moves = CH.legal(st);
      if (!moves.length) return CH.inCheck(st) ? { winner: st.turn === 'w' ? 1 : 0, why: 'Échec et mat ♚' } : { winner: 2, why: 'Pat' };
      if (CH.insufficient(st.b)) return { winner: 2, why: 'Matériel insuffisant' };
      if (st.half >= 100) return { winner: 2, why: 'Règle des 50 coups' };
      if (Object.values(reps).some(n => n >= 3)) return { winner: 2, why: 'Triple répétition' };
      return null;
    },
    view() { return { b: st.b, turn: st.turn === 'w' ? 0 : 1, last, check: CH.inCheck(st), moves: CH.legal(st).map(m => ({ from: m.from, to: m.to, promo: m.promo || null })), history: history.slice(-8), labels: ['Blancs', 'Noirs'] }; }
  };
}
function renderEchecs(g, ctx) {
  const v = g.game, can = g.side === v.turn && !g.result, sel = ctx.ui.csel, flip = g.side === 1;
  const targets = sel != null ? [...new Set(v.moves.filter(m => m.from === sel).map(m => m.to))] : [];
  const movable = can ? [...new Set(v.moves.map(m => m.from))] : [];
  const kingIdx = v.check ? v.b.indexOf(v.turn === 0 ? 'K' : 'k') : -1;
  const cells = [];
  for (let k = 0; k < 64; k++) {
    const i = flip ? 63 - k : k, r = i >> 3, f = i & 7, p = v.b[i];
    const cls = ['csq', (r + f) % 2 ? 'dark' : '', i === sel ? 'sel' : '', targets.includes(i) ? (p ? 'tgt cap' : 'tgt') : '',
      v.last && (v.last.from === i || v.last.to === i) ? 'last' : '', i === kingIdx ? 'chk' : ''].join(' ');
    const act = can && (targets.includes(i) ? `data-a="cto" data-i="${i}"` : movable.includes(i) ? `data-a="csel" data-i="${i}"` : '');
    cells.push(`<button class="${cls}" ${act || 'disabled'}>${p ? `<span class="${p === p.toUpperCase() ? 'pw' : 'pb'}">${PIECE[p.toLowerCase()]}</span>` : ''}${(flip ? r === 0 : r === 7) ? `<em class="cf">${'abcdefgh'[f]}</em>` : ''}${(flip ? f === 7 : f === 0) ? `<em class="cr">${8 - r}</em>` : ''}</button>`);
  }
  const promo = ctx.ui.cpromo;
  ctx.view(`${ctx.top('Échecs')}
    <div class="stage">${duelHead(g, ctx, v.turn, v.check && !g.result ? ' · échec !' : '')}
      <div class="cboard">${cells.join('')}</div>
      ${promo ? `<div class="label">Promotion : choisis ta pièce</div><div class="seg suits">${'qrbn'.split('').map(p => `<button data-a="cpromo" data-p="${p}">${PIECE[p]}</button>`).join('')}</div>` : ''}
      ${v.history.length ? `<p class="hint" style="font-size:.82rem">Derniers coups : ${v.history.map(esc).join(' · ')}</p>` : ''}
      ${duelFoot(g, ctx)}
    </div>`, null, true);
}

/* ---------- Actions ---------- */
function onBoard(a, el, ctx) {
  const g = ctx.g, ui = ctx.ui;
  const map = { dresign: 'resign', doffer: 'offer', daccept: 'accept', ddecline: 'decline', dnext: 'dnext', nshuffle: 'nshuffle', nready: 'nready' };
  if (map[a]) { if (a === 'dresign' && !confirm('Abandonner la partie ?')) return true; ui.dsel = ui.csel = null; ui.cpromo = null; ctx.send({ k: map[a] }); return true; }
  if (a === 'nshoot') { ctx.buzz(20); ctx.send({ k: 'shoot', i: +el.dataset.i }); return true; }
  if (a === 'c4') { ctx.buzz(15); ctx.send({ k: 'drop', c: +el.dataset.c }); return true; }
  if (a === 'gput') { ctx.buzz(15); ctx.send({ k: 'put', i: +el.dataset.i }); return true; }
  if (a === 'dsel') { ui.dsel = +el.dataset.i; ctx.render(); return true; }
  if (a === 'dto') { const from = ui.dsel; ui.dsel = null; ctx.send({ k: 'move', from, to: +el.dataset.i }); return true; }
  if (a === 'csel') { ui.csel = +el.dataset.i; ui.cpromo = null; ctx.render(); return true; }
  if (a === 'cto') {
    const to = +el.dataset.i, from = ui.csel;
    if (g.game.moves.some(m => m.from === from && m.to === to && m.promo)) { ui.cpromo = { from, to }; ctx.render(); return true; }
    ui.csel = null; ctx.send({ k: 'move', from, to }); return true;
  }
  if (a === 'cpromo') { const m = ui.cpromo; ui.cpromo = ui.csel = null; ctx.send({ k: 'move', from: m.from, to: m.to, promo: el.dataset.p }); return true; }
  return false;
}
const notify = (g, prev, ctx) => {
  const t = g.game.turn, mine = g.side >= 0 && t === g.side && !g.result;
  const was = prev && prev.game && prev.game.turn === g.side && !prev.result && prev.gameNo === g.gameNo;
  if (mine && !was) { ctx.buzz([60, 40, 60]); ctx.beep(1040, .1, 'sine'); }
  if (!prev || prev.gameNo !== g.gameNo) { ctx.ui.dsel = ctx.ui.csel = ctx.ui.cpromo = null; }
};
const reg = (id, make, def) => O.register(id, { make: duelWrap(id, make), cat: 'plateau', min: 2, max: 16, on: onBoard, onState: notify, ...def });
reg('navale', Navale, { name: 'Bataille navale', e: '🚢', d: 'Coule la flotte adverse. Touché = tu rejoues !', g: 'linear-gradient(150deg,#1e3c72,#2a5298)', render: renderNavale });
reg('aligne4', Aligne4, { name: 'Aligne 4', e: '🔴', d: 'Fais tomber tes jetons, aligne-en 4.', g: 'linear-gradient(150deg,#1d4ed8,#1e3a8a)', render: renderAligne });
reg('morpion', Morpion, { name: 'Morpion géant', e: '❌', d: 'Plateau 15×15 : aligne 5 symboles.', g: 'linear-gradient(150deg,#ee9ca7,#a16bfe)', render: renderMorpion });
reg('dames', Dames, { name: 'Dames', e: '⛀', d: 'Règles internationales 10×10, prises obligatoires.', g: 'linear-gradient(150deg,#8e5a2b,#3e2510)', render: renderDames });
reg('echecs', Echecs, { name: 'Échecs', e: '♟️', d: 'Règles complètes : roque, en passant, promotion, mat.', g: 'linear-gradient(150deg,#5f6b7a,#20262e)', render: renderEchecs });
})();
