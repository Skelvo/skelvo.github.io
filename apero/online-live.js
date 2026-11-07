/* ==========================================================================
   Courses en direct (tout le monde en même temps).
   Course de taps · Réflexes en groupe · Mots cachés
   Les temps sont mesurés sur chaque téléphone : la latence réseau ne fausse
   pas les résultats.
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO, O = A.online;
const { esc, shuffle } = A;
const tot = names => Object.fromEntries(names.map(p => [p, 0]));
const scoresHtml = (totals, plus) => `<div class="scores">${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([p, s], i) =>
  `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}</span><span>${s}${plus && plus[p] ? ` <small style="color:var(--ok)">+${plus[p]}</small>` : ''}</span></div>`).join('')}</div>`;
const hostBtn = (ctx, label, a) => ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="${a}">${label}</button></div>` : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} relance…</div>`;

/* ======================================================================
   👆 COURSE DE TAPS — le plus de taps en 10 secondes
   ====================================================================== */
function Taps(names, notify) {
  const DUR = 10000, totals = tot(names);
  let round = 0, phase = 'ready', counts, finals, timer = null, gain = {};
  function settle() {
    clearTimeout(timer); phase = 'result';
    const rank = names.slice().sort((a, b) => (finals[b] || 0) - (finals[a] || 0)); gain = {};
    [3, 2, 1].forEach((pt, i) => { if (rank[i] && finals[rank[i]] && names.length > i + (names.length > 2 ? 0 : 1)) { gain[rank[i]] = pt; totals[rank[i]] += pt; } });
  }
  function act(who, a, isHost) {
    if (a.k === 'go' && isHost && phase !== 'run') {
      round++; phase = 'run'; counts = {}; finals = {};
      clearTimeout(timer); timer = setTimeout(() => { if (phase === 'run') { settle(); notify(); } }, 3000 + DUR + 4000);
      return;
    }
    if (a.k === 'tick' && phase === 'run') { counts[who] = Math.min(400, a.n | 0); return { relay: { k: 'tp', p: who, n: counts[who] } }; }
    if (a.k === 'final' && phase === 'run' && !(who in finals)) {
      finals[who] = Math.min(400, a.n | 0); counts[who] = finals[who];
      if (names.every(p => p in finals)) { settle(); return; }
      return 'silent';
    }
  }
  function view(me) { return { id: 'taps', phase, round, me, dur: DUR, players: names, finals: phase === 'result' ? finals : null, totals, gain }; }
  return { act, view, stop: () => clearTimeout(timer), min: 1, max: 16 };
}
let tp = { round: -1, n: 0, live: {}, end: 0, started: false, timers: [] };
function renderTaps(g, ctx) {
  if (g.phase === 'ready') return ctx.view(`${ctx.top('Course de taps')}
    <div class="stage" style="justify-content:center;text-align:center">
      <div class="big-num" style="font-size:5rem">👆</div>
      <p class="hint">Tape le plus vite possible sur le gros bouton pendant <b>10 secondes</b>. Tous en même temps !</p>
      ${scoresHtml(g.totals)}
      ${ctx.amHost() ? `<button class="btn primary big block" data-a="tgo">Lancer la course</button>` : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} va lancer…</div>`}
    </div>`);
  if (g.phase === 'result') {
    tp.timers.forEach(clearTimeout); tp.timers = [];
    const rank = Object.entries(g.finals).sort((a, b) => b[1] - a[1]);
    return ctx.view(`${ctx.top('Course de taps')}
      <div class="stage">
        <div class="ranking">${rank.map(([p, n], i) => `<div><span>${['🥇', '🥈', '🥉'][i] || i + 1 + '.'}</span><b>${esc(p)}</b><em>${n} taps · ${(n / 10).toFixed(1)}/s</em></div>`).join('')}</div>
        ${scoresHtml(g.totals, g.gain)}
        ${hostBtn(ctx, 'Nouvelle course', 'tgo')}
      </div>`);
  }
  // course en cours : on démarre le compte à rebours local une seule fois par manche
  if (tp.round !== g.round) {
    tp.timers.forEach(clearTimeout); tp = { round: g.round, n: 0, live: {}, end: 0, started: false, timers: [] };
    const t0 = Date.now();
    [2, 1].forEach((n, i) => tp.timers.push(setTimeout(() => { const el = document.getElementById('tcount'); if (el) el.textContent = n; ctx.beep(660, .08, 'sine'); }, (i + 1) * 1000)));
    tp.timers.push(setTimeout(() => {
      tp.started = true; tp.end = Date.now() + g.dur; ctx.beep(990, .2, 'sine'); ctx.buzz(80);
      const pad = document.getElementById('tpad'); if (pad) { pad.classList.add('on'); pad.querySelector('b').textContent = '0'; }
      const c = document.getElementById('tcount'); if (c) c.textContent = 'TAPE !';
      let last = -1;
      const tick = setInterval(() => {
        const left = tp.end - Date.now(), c2 = document.getElementById('tcount');
        if (c2) c2.textContent = Math.max(0, left / 1000).toFixed(1) + ' s';
        if (tp.n !== last) { last = tp.n; ctx.send({ k: 'tick', n: tp.n }); }
        if (left <= 0) { clearInterval(tick); tp.started = false; const pad2 = document.getElementById('tpad'); if (pad2) pad2.classList.remove('on'); ctx.send({ k: 'final', n: tp.n }); ctx.beep(330, .4, 'sawtooth'); if (c2) c2.textContent = 'Fini !'; }
      }, 250);
      tp.timers.push(tick);
    }, 3000 - (Date.now() - t0)));
  }
  ctx.view(`${ctx.top('Course de taps')}
    <div class="stage" style="gap:12px">
      <div class="clock" id="tcount">3</div>
      <button class="tpad" id="tpad"><b>${tp.n || '…'}</b><small>taps</small></button>
      <div class="bars" id="tlive">${g.players.map(p => `<div class="bar"><span>${esc(p)}</span><i style="--w:0%" data-p="${esc(p)}"></i><b data-n="${esc(p)}">0</b></div>`).join('')}</div>
    </div>`, () => {
      const pad = document.getElementById('tpad');
      pad.addEventListener('pointerdown', e => { e.preventDefault(); if (!tp.started) return; tp.n++; pad.querySelector('b').textContent = tp.n; pad.classList.remove('pulse'); void pad.offsetWidth; pad.classList.add('pulse'); updLive(g.me, tp.n); });
      Object.entries(tp.live).forEach(([p, n]) => updLive(p, n));
    });
}
function updLive(p, n) {
  tp.live[p] = n; const max = Math.max(20, ...Object.values(tp.live));
  Object.entries(tp.live).forEach(([q, m]) => {
    const i = document.querySelector(`#tlive i[data-p="${CSS.escape(q)}"]`), b = document.querySelector(`#tlive b[data-n="${CSS.escape(q)}"]`);
    if (i) i.style.setProperty('--w', (m / max * 100) + '%'); if (b) b.textContent = m;
  });
}

/* ======================================================================
   ⚡ RÉFLEXES EN GROUPE — le plus rapide gagne, le plus lent perd
   ====================================================================== */
function Reflexes(names, notify) {
  const totals = tot(names);
  let round = 0, phase = 'ready', delay = 0, res = {}, timer = null, gain = {}, loser = null;
  function settle() {
    clearTimeout(timer); phase = 'result'; gain = {};
    const ok = names.filter(p => res[p] && res[p].ms >= 0).sort((a, b) => res[a].ms - res[b].ms);
    if (ok[0]) { gain[ok[0]] = 1; totals[ok[0]]++; }
    const early = names.filter(p => !res[p] || res[p].ms < 0);
    loser = early.length ? early : ok.length > 1 ? [ok[ok.length - 1]] : [];
  }
  function act(who, a, isHost) {
    if (a.k === 'go' && isHost && phase !== 'run') {
      round++; phase = 'run'; res = {}; delay = 2000 + Math.floor(Math.random() * 4000);
      clearTimeout(timer); timer = setTimeout(() => { if (phase === 'run') { settle(); notify(); } }, delay + 9000);
      return;
    }
    if (a.k === 'res' && phase === 'run' && !(who in res)) {
      res[who] = { ms: Math.max(-1, Math.min(5000, Math.round(+a.ms))) };
      if (names.every(p => p in res)) { settle(); return; }
      return 'silent';
    }
  }
  function view(me) { return { id: 'reflexes', phase, round, me, delay, players: names, res: phase === 'result' ? res : null, totals, gain, loser }; }
  return { act, view, stop: () => clearTimeout(timer), min: 2, max: 16 };
}
let rf = { round: -1 };
function renderReflexes(g, ctx) {
  if (g.phase === 'ready') return ctx.view(`${ctx.top('Réflexes en groupe')}
    <div class="stage" style="justify-content:center;text-align:center">
      <div class="big-num" style="font-size:5rem">⚡</div>
      <p class="hint">Quand ton écran devient <b style="color:var(--ok)">vert</b>, touche-le le plus vite possible. Le plus rapide marque un point, <b>le plus lent (ou celui qui touche trop tôt) a perdu</b> !</p>
      ${scoresHtml(g.totals)}
      ${ctx.amHost() ? `<button class="btn primary big block" data-a="rgo">C'est parti</button>` : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} va lancer…</div>`}
    </div>`);
  if (g.phase === 'result') {
    clearTimeout(rf.t);
    const rows = g.players.map(p => ({ p, ms: g.res[p] ? g.res[p].ms : null })).sort((a, b) => (a.ms < 0 || a.ms == null ? 1e9 : a.ms) - (b.ms < 0 || b.ms == null ? 1e9 : b.ms));
    return ctx.view(`${ctx.top('Réflexes en groupe')}
      <div class="stage">
        <div class="ranking">${rows.map((r, i) => `<div class="${g.loser.includes(r.p) ? 'lose' : ''}"><span>${i === 0 && r.ms >= 0 ? '⚡' : i + 1 + '.'}</span><b>${esc(r.p)}</b><em>${r.ms == null ? 'pas de réponse' : r.ms < 0 ? 'trop tôt ❌' : r.ms + ' ms'}</em></div>`).join('')}</div>
        ${g.loser.length ? `<p class="hint">${g.loser.map(esc).join(' & ')} ${A.S.drinks ? 'boit 2 gorgées 🍻' : 'fait un gage 😈'}</p>` : ''}
        ${scoresHtml(g.totals, g.gain)}
        ${hostBtn(ctx, 'Manche suivante', 'rgo')}
      </div>`);
  }
  if (rf.round !== g.round) {
    clearTimeout(rf.t); rf = { round: g.round, state: 'wait', greenAt: 0, sent: false };
    rf.t = setTimeout(() => { rf.state = 'go'; rf.greenAt = performance.now(); const z = document.getElementById('rzone'); if (z) { z.className = 'rzone go'; z.querySelector('b').textContent = 'TOUCHE !'; } ctx.beep(1200, .1, 'square', .2); }, g.delay);
  }
  ctx.view(`${ctx.top('Réflexes en groupe')}
    <div class="stage"><button class="rzone ${rf.state === 'go' ? 'go' : rf.state === 'done' ? 'done' : ''}" id="rzone"><b>${rf.state === 'done' ? rf.label : rf.state === 'go' ? 'TOUCHE !' : 'Attends le vert…'}</b></button></div>`, () => {
      const z = document.getElementById('rzone');
      z.addEventListener('pointerdown', e => {
        e.preventDefault(); if (rf.sent) return; rf.sent = true;
        const early = rf.state !== 'go', ms = early ? -1 : Math.round(performance.now() - rf.greenAt);
        clearTimeout(rf.t); rf.state = 'done'; rf.label = early ? 'Trop tôt ! ❌' : `${ms} ms`;
        z.className = 'rzone done'; z.querySelector('b').textContent = rf.label; ctx.buzz(early ? [100, 50, 100] : 40);
        ctx.send({ k: 'res', ms });
      });
    });
}

/* ======================================================================
   🔤 MOTS CACHÉS — premier à trouver chaque mot
   ====================================================================== */
const MC_THEMES = {
  'Animaux': ['CHAT', 'CHIEN', 'LAPIN', 'ZEBRE', 'TIGRE', 'LION', 'OURS', 'CHEVAL', 'SINGE', 'RENARD', 'CANARD', 'HIBOU', 'LOUP', 'VACHE', 'MOUTON', 'POULE', 'DAUPHIN', 'REQUIN'],
  'Fruits & légumes': ['POMME', 'POIRE', 'BANANE', 'CERISE', 'FRAISE', 'KIWI', 'MANGUE', 'CITRON', 'ORANGE', 'RAISIN', 'CAROTTE', 'TOMATE', 'POIREAU', 'NAVET', 'MELON', 'PRUNE', 'ABRICOT'],
  'Apéro': ['CHIPS', 'BIERE', 'OLIVE', 'TAPAS', 'GLACON', 'VERRE', 'TOAST', 'PIZZA', 'SAUCISSON', 'FROMAGE', 'CACAHUETE', 'MUSIQUE', 'COCKTAIL', 'CITRON', 'JUS', 'SODA'],
  'Pays': ['FRANCE', 'ITALIE', 'ESPAGNE', 'JAPON', 'CHINE', 'BRESIL', 'CANADA', 'MAROC', 'PEROU', 'INDE', 'CHILI', 'GRECE', 'SUEDE', 'EGYPTE', 'MEXIQUE', 'IRLANDE'],
  'Sports': ['RUGBY', 'TENNIS', 'BOXE', 'SKI', 'JUDO', 'GOLF', 'VOILE', 'SURF', 'FOOT', 'VELO', 'ESCRIME', 'KARATE', 'HANDBALL', 'NATATION', 'BASKET', 'AVIRON']
};
function makeGrid(words, N = 10) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const g = Array(N * N).fill(''), placed = [];
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    for (const w of shuffle(words)) {
      let ok = false;
      for (let t = 0; t < 200 && !ok; t++) {
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)], r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
        const cells = [...w].map((_, k) => [r0 + dr * k, c0 + dc * k]);
        if (cells.some(([r, c]) => r < 0 || r >= N || c < 0 || c >= N)) continue;
        if (cells.some(([r, c], k) => g[r * N + c] && g[r * N + c] !== w[k])) continue;
        cells.forEach(([r, c], k) => g[r * N + c] = w[k]);
        placed.push({ w, a: cells[0][0] * N + cells[0][1], b: cells[cells.length - 1][0] * N + cells[cells.length - 1][1] }); ok = true;
      }
    }
    if (placed.length >= Math.min(words.length, 8)) {
      const L = 'AAEEEEIIINNOORRSSTTULCDMP';
      return { grid: g.map(x => x || L[Math.floor(Math.random() * L.length)]), placed, N };
    }
  }
}
function MotsCaches(names, notify) {
  const totals = tot(names), DUR = 180000;
  let round = 0, theme, G, found, phase, deadline, timer = null, lastFind = null;
  function newRound() {
    round++; theme = A.pick(Object.keys(MC_THEMES));
    const words = shuffle(MC_THEMES[theme].filter(w => w.length <= 9)).slice(0, 8);
    G = makeGrid(words) || makeGrid(words.slice(0, 6)) || makeGrid(words.slice(0, 4)); found = {}; phase = 'play'; lastFind = null;
    deadline = Date.now() + DUR; clearTimeout(timer); timer = setTimeout(() => { if (phase === 'play') { phase = 'end'; notify(); } }, DUR);
  }
  function act(who, a, isHost) {
    if (a.k === 'pick' && phase === 'play') {
      const s = a.a | 0, e = a.b | 0;
      const w = G.placed.find(p => ((p.a === s && p.b === e) || (p.a === e && p.b === s)) && !(p.w in found));
      if (!w) return G.placed.some(p => ((p.a === s && p.b === e) || (p.a === e && p.b === s))) ? 'Déjà trouvé !' : 'Pas de mot ici…';
      found[w.w] = who; totals[who] += w.w.length >= 7 ? 2 : 1; lastFind = { w: w.w, p: who };
      if (G.placed.every(p => p.w in found)) { phase = 'end'; clearTimeout(timer); }
      return;
    }
    if (a.k === 'again' && isHost && phase === 'end') { newRound(); return; }
  }
  function view(me) {
    return { id: 'motscaches', phase, round, theme, me, grid: G.grid, N: G.N, words: G.placed.map(p => ({ w: p.w, by: found[p.w] || null, a: p.w in found || phase === 'end' ? p.a : null, b: p.w in found || phase === 'end' ? p.b : null })),
      left: phase === 'play' ? Math.max(0, deadline - Date.now()) : 0, totals, lastFind };
  }
  newRound();
  return { act, view, stop: () => clearTimeout(timer), min: 1, max: 16 };
}
function lineCells(a, b, N) {
  const r1 = Math.floor(a / N), c1 = a % N, r2 = Math.floor(b / N), c2 = b % N, dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  if (!(r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return [];
  const n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)); return Array.from({ length: n + 1 }, (_, k) => (r1 + dr * k) * N + c1 + dc * k);
}
let mcTick = null;
function renderMots(g, ctx) {
  clearInterval(mcTick);
  const N = g.N, sel = ctx.ui.mcA, foundCells = new Set();
  g.words.forEach(w => { if (w.a != null) lineCells(w.a, w.b, N).forEach(i => foundCells.add(i)); });
  const play = g.phase === 'play';
  ctx.view(`${ctx.top('Mots cachés')}
    <div class="stage" style="gap:10px">
      <div class="dhead"><span>Thème : <b style="color:var(--text);font-size:1rem">${esc(g.theme)}</b></span>${play ? `<b id="mcleft">${Math.ceil(g.left / 1000)}</b>` : ''}</div>
      <p class="hint" style="font-size:.85rem">${play ? (sel != null ? 'Touche maintenant la <b>dernière</b> lettre du mot' : 'Touche la <b>première</b> lettre d’un mot, puis la dernière') : 'Partie terminée !'}</p>
      <div class="mgrid" style="--n:${N}">${g.grid.map((ch, i) => `<button class="mcell ${foundCells.has(i) ? 'found' : ''} ${sel === i ? 'sel' : ''}" ${play ? `data-a="mc" data-i="${i}"` : 'disabled'}>${ch}</button>`).join('')}</div>
      <div class="mwords">${g.words.map(w => `<span class="${w.by ? 'ok' : ''}">${w.by || !play ? esc(w.w) : '?'.repeat(w.w.length)}${w.by ? ` <small>${esc(w.by)}</small>` : ''}</span>`).join('')}</div>
      ${scoresHtml(g.totals)}
      ${!play && ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="mcagain">Nouvelle grille</button></div>` : ''}
    </div>`, null, true);
  if (play) { const end = Date.now() + g.left; mcTick = setInterval(() => { const el = document.getElementById('mcleft'); if (!el) return clearInterval(mcTick); el.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000)); }, 500); }
}

/* ---------- Actions ---------- */
function onLive(a, el, ctx) {
  if (a === 'tgo' || a === 'rgo') { ctx.send({ k: 'go' }); return true; }
  if (a === 'mcagain') { ctx.ui.mcA = null; ctx.send({ k: 'again' }); return true; }
  if (a === 'mc') {
    const i = +el.dataset.i;
    if (ctx.ui.mcA == null || ctx.ui.mcA === i) { ctx.ui.mcA = ctx.ui.mcA === i ? null : i; ctx.render(); return true; }
    const s = ctx.ui.mcA; ctx.ui.mcA = null; ctx.send({ k: 'pick', a: s, b: i }); ctx.render(); return true;
  }
  return false;
}
O.register('taps', { make: Taps, cat: 'reflexes', name: 'Course de taps', e: '👆', d: 'Le plus de taps en 10 secondes, classement en direct.', min: 1, max: 16, g: 'linear-gradient(150deg,#f857a6,#ff5858)', render: renderTaps, on: onLive,
  onEvent: e => { if (e.k === 'tp') updLive(e.p, e.n); } });
O.register('reflexes', { make: Reflexes, cat: 'reflexes', name: 'Réflexes en groupe', e: '⚡', d: 'Touche dès que c’est vert. Le plus lent a perdu !', min: 2, max: 16, g: 'linear-gradient(150deg,#00b09b,#96c93d)', render: renderReflexes, on: onLive });
O.register('motscaches', { make: MotsCaches, cat: 'reflexes', name: 'Mots cachés', e: '🔤', d: 'Même grille pour tous : le premier qui trouve un mot marque.', min: 1, max: 16, g: 'linear-gradient(150deg,#4568dc,#b06ab3)', render: renderMots, on: onLive,
  onState: (g, prev, ctx) => { if (prev && g.lastFind && (!prev.lastFind || prev.lastFind.w !== g.lastFind.w)) { ctx.beep(1320, .1, 'sine'); ctx.buzz(30); if (g.lastFind.p !== g.me) ctx.toast(`${g.lastFind.p} a trouvé ${g.lastFind.w}`); } } });
})();
