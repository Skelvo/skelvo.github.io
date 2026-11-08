/* ==========================================================================
   🕹️ Arcade : jeux d'adresse sur un seul téléphone.
   Chacun son tour (record de la soirée) : La Tour, Le Sprint, Le Serpent,
   Casse-briques, Esquive, Le Lancer.
   Duels à deux, téléphone à plat entre les joueurs : Air hockey, Ping, Tir rapide.
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO;
const { S, esc, view, header, toast, buzz, beep, pick, shuffle } = A;

/* ---------- Outils communs ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#ff5c8a';
const sipTxt = n => S.drinks ? `${n} gorgée${n > 1 ? 's' : ''} 🍻` : 'un gage';

function setup(cv) {
  const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
  return { c, W: r.width, H: r.height, k: Math.min(r.width, r.height) / 400 };
}
/* boucle d'animation : s'arrête toute seule si le canvas quitte la page */
function loop(cv, step) {
  let last = performance.now(), raf = 0, on = true;
  const f = t => {
    if (!on || !cv.isConnected) return;
    const dt = Math.min(.033, (t - last) / 1000); last = t;
    if (step(dt) === false) { on = false; return; }
    raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
  return () => { on = false; cancelAnimationFrame(raf); };
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function txt(c, s, x, y, size, color = '#fff', rot = 0, weight = 800) {
  c.save(); c.translate(x, y); if (rot) c.rotate(rot);
  c.font = `${weight} ${size}px system-ui,-apple-system,sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(s, 0, 0); c.restore();
}
const pos = (cv, e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
/* touches du clavier (pour jouer sur ordi) */
function keys(map) {
  const h = e => { const f = map[e.key]; if (f) { e.preventDefault(); f(e.type === 'keydown'); } };
  window.addEventListener('keydown', h); window.addEventListener('keyup', h);
  return () => { window.removeEventListener('keydown', h); window.removeEventListener('keyup', h); };
}
const records = id => A.store.get('arc:' + id, null);

/* ======================================================================
   Jeu « chacun son tour » : chaque joueur fait une partie, meilleur score
   ====================================================================== */
function Solo(id, o) {
  const g = A.G[id];
  const names = S.players.length ? S.players.slice() : ['Toi'];
  let idx = 0, phase = 'intro', round = {}, wins = {}, last = null, stop = null, isRec = false, err = '';
  const who = () => names[idx];
  const self = {
    render() {
      const rec = records(id);
      const recTxt = rec ? `🏅 Record : <b>${rec.s}${o.unit || ''}</b> par ${esc(rec.p)}` : '🏅 Pas encore de record';
      const roundBoard = Object.keys(round).length ? `<div class="label">Cette manche</div><div class="scores">${Object.entries(round).sort((a, b) => b[1] - a[1]).map(([p, s], i) =>
        `<div class="score ${i === 0 ? 'lead' : ''}"><span>${i === 0 ? '👑 ' : ''}${A.avatar(p)} ${esc(p)}</span><span>${s}${o.unit || ''}</span></div>`).join('')}</div>` : '';
      if (phase === 'play') return view(`${header(g.name)}<div class="arena"><canvas id="acv"></canvas><div class="ahud" id="ahud"></div></div>`, () => self.play());
      if (phase === 'over') {
        const done = idx >= names.length - 1;
        return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">${A.avatar(who())} ${esc(who())}<strong>${last}${o.unit || ''}</strong></div>
            ${isRec ? '<p class="arecord">🏅 Nouveau record !</p>' : ''}
            ${roundBoard}
            <button class="btn primary big block" data-a="anext">${done ? (names.length > 1 ? 'Résultats de la manche' : '🔄 Rejouer') : `Au tour de ${esc(names[idx + 1])} ▶️`}</button>
          </div>`);
      }
      if (phase === 'results') {
        const rows = Object.entries(round).sort((a, b) => b[1] - a[1]);
        const best = rows[0], worst = rows[rows.length - 1];
        return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Manche terminée<strong>🏆 ${A.avatar(best[0])} ${esc(best[0])}</strong></div>
            ${roundBoard}
            <p class="exch">😬 ${esc(worst[0])} est dernier·e : ${S.drinks ? `${sipTxt(2)}` : `gage : ${esc(pick(A.gages()))}`}</p>
            ${Object.keys(wins).length ? `<div class="label">Manches gagnées</div><div class="chips" style="margin-top:0">${Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<span class="chip" style="padding-right:14px">${A.avatar(p)} ${esc(p)} · ${n} 🏆</span>`).join('')}</div>` : ''}
            <p class="hint">${recTxt}</p>
            <button class="btn primary big block" data-a="around">🔄 Nouvelle manche</button>
          </div>`);
      }
      view(`${header(g.name)}
        <div class="stage">
          <div class="turn">${names.length > 1 ? 'À toi de jouer' : 'Prêt·e ?'}<strong>${A.avatar(who())} ${esc(who())}</strong></div>
          <div class="arules"><span>${g.e}</span><p>${o.rules}</p></div>
          ${err ? `<p class="errbox">${esc(err)}</p>` : ''}
          ${roundBoard}
          <p class="hint">${recTxt}${names.length > 1 ? ` · le / la dernier·e de la manche : ${sipTxt(2)}` : ''}</p>
          <button class="btn primary big block" data-a="ago">▶️ C'est parti !</button>
        </div>`);
    },
    play() {
      const cv = document.getElementById('acv'), hud = document.getElementById('ahud');
      const env = setup(cv);
      let ended = false;
      const api = {
        name: who(),
        hud: h => { if (hud) hud.innerHTML = h; },
        end: score => {
          if (ended) return; ended = true; stop && stop(); stop = null;
          score = Math.max(0, Math.round(score));
          last = score; round[who()] = Math.max(round[who()] ?? -1, score);
          const rec = records(id); isRec = score > 0 && (!rec || score > rec.s);
          if (isRec) A.store.set('arc:' + id, { s: score, p: who() });
          buzz([80, 40, 80]); beep(isRec ? 1320 : 330, .25, isRec ? 'sine' : 'sawtooth', .15);
          setTimeout(() => { phase = 'over'; self.render(); }, 700);
        }
      };
      stop = o.play(cv, env, api);
    },
    async on(a) {
      if (a === 'ago') {
        err = '';
        if (o.sensors && A.askSensors) await A.askSensors('orientation');
        phase = 'play'; self.render();
      }
      if (a === 'anext') {
        if (idx < names.length - 1) { idx++; phase = 'intro'; }
        else if (names.length > 1) {
          phase = 'results';
          const rows = Object.entries(round).sort((x, y) => y[1] - x[1]);
          wins[rows[0][0]] = (wins[rows[0][0]] || 0) + 1;
          if (S.drinks && A.night) A.night.sip(rows[rows.length - 1][0], 2);
        } else { round = {}; phase = 'intro'; }
        self.render();
      }
      if (a === 'around') { round = {}; idx = 0; names.push(names.shift()); phase = 'intro'; self.render(); }
    },
    leave() { stop && stop(); stop = null; }
  };
  return self;
}

/* ======================================================================
   Duel à deux sur le même téléphone (en haut contre en bas)
   ====================================================================== */
function Duel(id, o) {
  const g = A.G[id];
  const queue = S.players.length >= 2 ? S.players.slice() : ['Joueur 1', 'Joueur 2'];
  let phase = 'intro', res = null, stop = null, wins = {};
  const pair = () => [queue[0], queue[1]];
  const self = {
    render() {
      const [a, b] = pair();
      if (phase === 'play') return view(`${header(g.name)}<div class="arena duelarena"><canvas id="acv"></canvas></div>`, () => self.play());
      const winsHtml = Object.keys(wins).length ? `<div class="label">Victoires</div><div class="chips" style="margin-top:0">${Object.entries(wins).sort((x, y) => y[1] - x[1]).map(([p, n]) => `<span class="chip" style="padding-right:14px">${A.avatar(p)} ${esc(p)} · ${n} 🏆</span>`).join('')}</div>` : '';
      if (phase === 'over') return view(`${header(g.name)}
        <div class="stage">
          <div class="turn">${esc(res.score)}<strong>🏆 ${A.avatar(res.w)} ${esc(res.w)}</strong></div>
          <p class="exch">😬 ${esc(res.l)} perd : ${S.drinks ? sipTxt(3) : `gage : ${esc(pick(A.gages()))}`}</p>
          ${winsHtml}
          <div class="row">${queue.length > 2 ? `<button class="btn" data-a="drev">🔄 Revanche</button><button class="btn primary" data-a="dnext">Le gagnant reste ▶️</button>` : `<button class="btn primary big block" data-a="drev">🔄 Revanche</button>`}</div>
        </div>`);
      view(`${header(g.name)}
        <div class="stage">
          <div class="arules"><span>${g.e}</span><p>${o.rules}</p></div>
          <div class="dpair"><div><small>En haut</small><b>${A.avatar(a)} ${esc(a)}</b></div><i>VS</i><div><small>En bas</small><b>${A.avatar(b)} ${esc(b)}</b></div></div>
          <p class="hint">📱 Posez le téléphone à plat entre vous deux, chacun de son côté.${queue.length > 2 ? ` Ensuite : ${esc(queue[2])}.` : ''}</p>
          ${winsHtml}
          ${queue.length > 2 ? `<button class="btn" data-a="dswap">🔀 Changer de duel</button>` : ''}
          <button class="btn primary big block" data-a="dgo">▶️ C'est parti !</button>
        </div>`);
    },
    play() {
      const cv = document.getElementById('acv'), env = setup(cv), [a, b] = pair();
      let ended = false;
      stop = o.play(cv, env, {
        names: [a, b],
        end: (wi, score) => {
          if (ended) return; ended = true; stop && stop(); stop = null;
          const w = wi === 0 ? a : b, l = wi === 0 ? b : a;
          res = { w, l, score }; wins[w] = (wins[w] || 0) + 1;
          if (S.drinks && A.night) A.night.sip(l, 3);
          buzz([100, 50, 100, 50, 200]); beep(1320, .3, 'sine', .15);
          setTimeout(() => { phase = 'over'; self.render(); }, 1200);
        }
      });
    },
    on(a) {
      if (a === 'dgo') { phase = 'play'; self.render(); }
      if (a === 'drev') { phase = 'intro'; self.render(); }
      if (a === 'dnext') { const l = queue.indexOf(res.l); queue.push(queue.splice(l, 1)[0]); phase = 'intro'; self.render(); }
      if (a === 'dswap') { queue.push(queue.shift()); phase = 'intro'; self.render(); }
    },
    leave() { stop && stop(); stop = null; }
  };
  return self;
}

/* ======================================================================
   🧱 LA TOUR
   ====================================================================== */
function playTour(cv, { c, W, H }, api) {
  const bh = Math.max(22, H / 15);
  const blocks = [{ x: W * .2, w: W * .6 }];
  let cur = null, cam = 0, combo = 0, speed = 170, dead = false, falls = [], flash = 0;
  const hue = i => (200 + i * 9) % 360;
  const spawn = () => { const t = blocks[blocks.length - 1], fromL = blocks.length % 2; cur = { x: fromL ? -t.w : W, w: t.w, dir: fromL ? 1 : -1 }; };
  spawn();
  const drop = () => {
    if (dead) return;
    const t = blocks[blocks.length - 1];
    if (Math.abs(cur.x - t.x) < Math.max(3, W * .012)) {
      cur.x = t.x; combo++; flash = .35; beep(700 + combo * 80, .08, 'sine');
      if (combo >= 3) { const g2 = Math.min(W * .6 - cur.w, W * .03); cur.w += g2; cur.x -= g2 / 2; }
    } else {
      combo = 0;
      const l = Math.max(cur.x, t.x), r = Math.min(cur.x + cur.w, t.x + t.w);
      if (r - l <= 0) { dead = true; falls.push({ x: cur.x, w: cur.w, y: 0, i: blocks.length, vy: 0 }); cur = null; api.end(blocks.length - 1); return; }
      const cut = cur.x < l ? { x: cur.x, w: l - cur.x } : { x: r, w: cur.x + cur.w - r };
      falls.push({ ...cut, i: blocks.length, y: 0, vy: 0 });
      cur.x = l; cur.w = r - l; beep(440, .05, 'triangle'); buzz(12);
    }
    blocks.push({ x: cur.x, w: cur.w });
    speed = Math.min(520, 170 + blocks.length * 9);
    api.hud(`<b>${blocks.length - 1}</b>${combo >= 2 ? ` <small>parfait ×${combo}</small>` : ''}`);
    spawn();
  };
  api.hud('<b>0</b> <small>Tape pour poser</small>');
  cv.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
  const unk = keys({ ' ': d => d && drop(), Enter: d => d && drop() });
  const stopL = loop(cv, dt => {
    if (cur) { cur.x += cur.dir * speed * dt; if (cur.x + cur.w > W + 1) { cur.x = W - cur.w; cur.dir = -1; } if (cur.x < -1) { cur.x = 0; cur.dir = 1; } }
    const target = Math.max(0, blocks.length * bh - H * .55); cam += (target - cam) * Math.min(1, dt * 6);
    flash = Math.max(0, flash - dt);
    c.clearRect(0, 0, W, H);
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, `hsl(${hue(blocks.length)},45%,16%)`); grd.addColorStop(1, '#120d1f'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    const Y = i => H - (i + 1) * bh + cam;
    blocks.forEach((b, i) => { if (Y(i) > H + bh) return; c.fillStyle = `hsl(${hue(i)},75%,${55 + (i === blocks.length - 1 ? flash * 60 : 0)}%)`; rr(c, b.x, Y(i), b.w, bh - 2, 5); c.fill(); });
    if (cur) { c.fillStyle = `hsl(${hue(blocks.length)},80%,62%)`; rr(c, cur.x, Y(blocks.length), cur.w, bh - 2, 5); c.fill(); }
    falls.forEach(f => { f.vy += 1800 * dt; f.y += f.vy * dt; c.fillStyle = `hsla(${hue(f.i)},70%,55%,.8)`; rr(c, f.x, Y(f.i) + f.y, f.w, bh - 2, 5); c.fill(); });
    falls = falls.filter(f => f.y < H * 2);
  });
  return () => { stopL(); unk(); };
}

/* ======================================================================
   🏃 LE SPRINT
   ====================================================================== */
function playSprint(cv, { c, W, H, k }, api) {
  const s = Math.max(26, 34 * k), ground = H * .78, px = W * .18, G = 2600 * k, JV = -980 * k;
  let y = ground - s, vy = 0, jumps = 0, hold = false, speed = 300 * k, dist = 0, obs = [], next = 1.2, t = 0, dead = false, stars = [], bonus = 0, hills = [0, 0];
  const ava = A.avatar(api.name);
  const jump = d => { hold = d; if (!d || dead) return; if (jumps < 2) { vy = JV * (jumps ? .85 : 1); jumps++; beep(jumps > 1 ? 900 : 660, .06, 'sine'); buzz(8); } };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); jump(true); });
  cv.addEventListener('pointerup', () => jump(false)); cv.addEventListener('pointercancel', () => jump(false));
  const unk = keys({ ' ': jump, ArrowUp: jump });
  const stopL = loop(cv, dt => {
    if (!dead) {
      t += dt; speed = Math.min(760 * k, (300 + t * 12) * k); dist += speed * dt;
      vy += G * (hold && vy < 0 ? .55 : 1) * dt; y += vy * dt;
      if (y >= ground - s) { y = ground - s; vy = 0; jumps = 0; }
      next -= dt;
      if (next <= 0) {
        const r = Math.random();
        if (t > 8 && r < .25) obs.push({ x: W + 20, y: ground - s * 2.5, w: s * .9, h: s * .7, fly: true });
        else if (r < .55) obs.push({ x: W + 20, y: ground - s * 1.6, w: s * .7, h: s * 1.6 });
        else obs.push({ x: W + 20, y: ground - s, w: s * (Math.random() < .3 ? 1.9 : 1), h: s });
        if (Math.random() < .35) stars.push({ x: W + 20 + rnd(80, 200) * k, y: ground - s * rnd(2.2, 3.6) });
        next = rnd(.75, 1.5) * (520 * k) / speed + .25;
      }
      obs.forEach(o => o.x -= speed * dt); stars.forEach(o => o.x -= speed * dt);
      obs = obs.filter(o => o.x + o.w > -10); stars = stars.filter(o => o.x > -30 && !o.got);
      const m = s * .18;
      for (const o of obs) if (px + m < o.x + o.w && px + s - m > o.x && y + m < o.y + o.h && y + s - m > o.y) { dead = true; buzz(200); api.end(dist / (40 * k) + bonus); }
      for (const st of stars) if (Math.hypot(st.x - (px + s / 2), st.y - (y + s / 2)) < s * .8) { st.got = true; bonus += 10; beep(1400, .07, 'sine'); }
      api.hud(`<b>${Math.round(dist / (40 * k) + bonus)}</b> <small>m</small>`);
    }
    hills[0] = (hills[0] + speed * dt * .2) % W; hills[1] = (hills[1] + speed * dt * .5) % W;
    c.fillStyle = '#17112b'; c.fillRect(0, 0, W, H);
    for (let l = 0; l < 2; l++) {
      c.fillStyle = l ? '#2a1f4d' : '#211840'; c.beginPath(); c.moveTo(0, ground);
      for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, ground - (l ? 40 : 90) * k - Math.sin((x + hills[l]) / (l ? 60 : 130)) * (l ? 18 : 35) * k);
      c.lineTo(W, ground); c.fill();
    }
    c.fillStyle = '#3b2d66'; c.fillRect(0, ground, W, H - ground);
    c.strokeStyle = 'rgba(255,255,255,.15)'; c.beginPath(); for (let x = -(dist % 40); x < W; x += 40) { c.moveTo(x, ground + 10); c.lineTo(x + 18, ground + 10); } c.stroke();
    obs.forEach(o => { if (o.fly) { txt(c, '🦇', o.x + o.w / 2, o.y + o.h / 2, o.h * 1.3); } else { c.fillStyle = '#ff8a3d'; rr(c, o.x, o.y, o.w, o.h, 6); c.fill(); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(o.x + 4, o.y + o.h * .45, o.w - 8, 3); } });
    stars.forEach(st => txt(c, '⭐', st.x, st.y, s * .8));
    txt(c, ava, px + s / 2, y + s / 2 + 2, s * 1.05);
  });
  return () => { stopL(); unk(); };
}

/* ======================================================================
   🐍 LE SERPENT
   ====================================================================== */
function playSerpent(cv, { c, W, H }, api) {
  const COLS = 15, cell = W / COLS, T0 = 52, ROWS = Math.floor((H - T0) / cell), oy = T0 + (H - T0 - ROWS * cell) / 2;
  let snake = [[7, Math.floor(ROWS / 2)], [6, Math.floor(ROWS / 2)], [5, Math.floor(ROWS / 2)], [4, Math.floor(ROWS / 2)]];
  let dir = [1, 0], q = [], acc = 0, score = 0, food = null, gold = null, dead = false, grow = 0;
  const free = () => { let p; do p = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)]; while (snake.some(s => s[0] === p[0] && s[1] === p[1])); return p; };
  food = free();
  const turn = d => { const ld = q.length ? q[q.length - 1] : dir; if (d[0] === -ld[0] && d[1] === -ld[1]) return; if (d[0] === ld[0] && d[1] === ld[1]) return; if (q.length < 3) q.push(d); };
  let sx = 0, sy = 0, swiped = false;
  cv.addEventListener('pointerdown', e => { e.preventDefault(); const p = pos(cv, e); sx = p.x; sy = p.y; swiped = false; });
  cv.addEventListener('pointermove', e => {
    if (swiped || !e.buttons && e.pointerType === 'mouse') return;
    const p = pos(cv, e), dx = p.x - sx, dy = p.y - sy;
    if (Math.hypot(dx, dy) > 24) { swiped = true; turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); }
  });
  cv.addEventListener('pointerup', e => {
    if (swiped) return;
    // simple touche : on tourne vers le doigt
    const p = pos(cv, e), h = snake[0], hx = (h[0] + .5) * cell, hy = oy + (h[1] + .5) * cell, d = q.length ? q[q.length - 1] : dir;
    if (d[0]) turn([0, p.y < hy ? -1 : 1]); else turn([p.x < hx ? -1 : 1, 0]);
  });
  const unk = keys({ ArrowUp: d => d && turn([0, -1]), ArrowDown: d => d && turn([0, 1]), ArrowLeft: d => d && turn([-1, 0]), ArrowRight: d => d && turn([1, 0]) });
  api.hud('<b>0</b> <small>Glisse ou touche pour tourner</small>');
  const stopL = loop(cv, dt => {
    if (!dead) {
      acc += dt;
      const step = Math.max(.065, .16 - score * .004);
      if (gold) { gold.t -= dt; if (gold.t <= 0) gold = null; }
      while (acc >= step && !dead) {
        acc -= step; if (q.length) dir = q.shift();
        const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
        if (h[0] < 0 || h[1] < 0 || h[0] >= COLS || h[1] >= ROWS || snake.slice(0, -1).some(s => s[0] === h[0] && s[1] === h[1])) { dead = true; buzz(200); api.end(score); break; }
        snake.unshift(h);
        if (h[0] === food[0] && h[1] === food[1]) { score++; grow += 1; food = free(); beep(880, .06, 'sine'); buzz(10); if (!gold && Math.random() < .2) gold = { p: free(), t: 5 }; }
        else if (gold && h[0] === gold.p[0] && h[1] === gold.p[1]) { score += 3; grow += 2; gold = null; beep(1320, .1, 'sine'); }
        if (grow > 0) grow--; else snake.pop();
        api.hud(`<b>${score}</b>`);
      }
    }
    c.fillStyle = '#120d1f'; c.fillRect(0, 0, W, H);
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { c.fillStyle = (x + y) % 2 ? '#1b1433' : '#1f173a'; c.fillRect(x * cell, oy + y * cell, cell, cell); }
    txt(c, '🍒', (food[0] + .5) * cell, oy + (food[1] + .55) * cell, cell * .85);
    if (gold) { c.globalAlpha = gold.t < 1.5 ? (Math.sin(gold.t * 20) + 1) / 2 : 1; txt(c, '🍋', (gold.p[0] + .5) * cell, oy + (gold.p[1] + .55) * cell, cell * .9); c.globalAlpha = 1; }
    snake.forEach((s, i) => { c.fillStyle = i ? `hsl(${150 - Math.min(i, 30) * 2},70%,${50 - Math.min(i, 20)}%)` : '#3ddc97'; rr(c, s[0] * cell + 1.5, oy + s[1] * cell + 1.5, cell - 3, cell - 3, cell * .3); c.fill(); });
    const h = snake[0]; c.fillStyle = '#120d1f';
    const ex = (h[0] + .5) * cell, ey = oy + (h[1] + .5) * cell, ox = dir[1] * cell * .18, oy2 = dir[0] * cell * .18;
    c.beginPath(); c.arc(ex + ox + dir[0] * cell * .15, ey + oy2 + dir[1] * cell * .15, cell * .09, 0, 7); c.arc(ex - ox + dir[0] * cell * .15, ey - oy2 + dir[1] * cell * .15, cell * .09, 0, 7); c.fill();
  });
  return () => { stopL(); unk(); };
}

/* ======================================================================
   🧨 CASSE-BRIQUES
   ====================================================================== */
function playBriques(cv, { c, W, H, k }, api) {
  const R = Math.max(6, 7 * k), py = H - 46 * k;
  let pw = W * .24, pxx = W / 2, balls = [], bricks = [], drops = [], lives = 3, score = 0, level = 1, base = 360 * k, held = true, wideT = 0, dead = false;
  const build = () => {
    bricks = []; const cols = 7, rows = Math.min(8, 4 + level), bw = (W - 16) / cols, bh2 = Math.max(16, 20 * k);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      if (level > 1 && Math.random() < .12) continue;
      const hp = r < level - 1 && Math.random() < .5 ? 2 : 1;
      bricks.push({ x: 8 + q * bw + 2, y: Math.max(66, 60 * k) + r * (bh2 + 4), w: bw - 4, h: bh2, hp, hue: (r * 35 + level * 50) % 360 });
    }
  };
  const newBall = () => { balls = [{ x: pxx, y: py - R - 2, vx: 0, vy: 0 }]; held = true; };
  build(); newBall();
  const launch = () => { if (!held || dead) return; held = false; const a = rnd(-.4, .4), sp = base * (1 + (level - 1) * .08); balls[0].vx = Math.sin(a) * sp; balls[0].vy = -Math.cos(a) * sp; beep(660, .05, 'sine'); };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); pxx = pos(cv, e).x; launch(); });
  cv.addEventListener('pointermove', e => { pxx = pos(cv, e).x; });
  let kl = false, kr = false;
  const unk = keys({ ArrowLeft: d => kl = d, ArrowRight: d => kr = d, ' ': d => d && launch() });
  const hud = () => api.hud(`<b>${score}</b> <small>${'❤️'.repeat(lives)} · niveau ${level}</small>`);
  hud();
  const stopL = loop(cv, dt => {
    if (kl) pxx -= 500 * k * dt; if (kr) pxx += 500 * k * dt;
    if (wideT > 0) { wideT -= dt; pw = W * .36; } else pw = W * .24;
    pxx = clamp(pxx, pw / 2, W - pw / 2);
    if (!dead) {
      for (const b of balls) {
        if (held) { b.x = pxx; b.y = py - R - 2; continue; }
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
          if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); } if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
          if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
          if (b.vy > 0 && b.y + R >= py && b.y + R <= py + 14 && b.x > pxx - pw / 2 - R && b.x < pxx + pw / 2 + R) {
            const off = clamp((b.x - pxx) / (pw / 2), -1, 1), sp = Math.min(Math.hypot(b.vx, b.vy) * 1.01, 820 * k);
            b.vx = Math.sin(off * 1.05) * sp; b.vy = -Math.cos(off * 1.05) * sp; b.y = py - R; beep(520, .03, 'triangle'); buzz(6);
          }
          for (const br of bricks) {
            if (br.hp <= 0) continue;
            const nx = clamp(b.x, br.x, br.x + br.w), ny = clamp(b.y, br.y, br.y + br.h);
            if ((b.x - nx) ** 2 + (b.y - ny) ** 2 < R * R) {
              const ox = Math.min(b.x + R - br.x, br.x + br.w - (b.x - R)), oy = Math.min(b.y + R - br.y, br.y + br.h - (b.y - R));
              if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
              br.hp--; if (br.hp <= 0) { score += 10; if (Math.random() < .14) drops.push({ x: br.x + br.w / 2, y: br.y, t: pick(['W', 'M', 'S']) }); }
              beep(900 + Math.random() * 300, .03, 'square', .05);
              break;
            }
          }
        }
      }
      balls = balls.filter(b => b.y < H + 20);
      if (!balls.length) { lives--; buzz(150); beep(200, .2, 'sawtooth'); if (lives <= 0) { dead = true; api.end(score); } else newBall(); hud(); }
      drops.forEach(d => { d.y += 160 * k * dt; if (d.y > py - 6 && d.y < py + 16 && Math.abs(d.x - pxx) < pw / 2 + 8) { d.got = true; beep(1200, .08, 'sine');
        if (d.t === 'W') wideT = 10;
        if (d.t === 'S') balls.forEach(b => { b.vx *= .7; b.vy *= .7; });
        if (d.t === 'M' && balls[0] && !held) { const b = balls[0], sp = Math.hypot(b.vx, b.vy); [-.5, .5].forEach(a => balls.push({ x: b.x, y: b.y, vx: Math.sin(a) * sp, vy: -Math.abs(Math.cos(a) * sp) })); } } });
      drops = drops.filter(d => !d.got && d.y < H);
      if (bricks.every(b => b.hp <= 0)) { level++; score += 50; build(); newBall(); beep(1320, .2, 'sine'); toast(`Niveau ${level} 🚀`); }
      hud();
    }
    c.fillStyle = '#120d1f'; c.fillRect(0, 0, W, H);
    bricks.forEach(b => { if (b.hp <= 0) return; c.fillStyle = `hsl(${b.hue},75%,${b.hp > 1 ? 40 : 58}%)`; rr(c, b.x, b.y, b.w, b.h, 4); c.fill(); if (b.hp > 1) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.stroke(); } });
    drops.forEach(d => { c.fillStyle = { W: '#3aa0ff', M: '#ff5c8a', S: '#3ddc97' }[d.t]; rr(c, d.x - 14, d.y - 9, 28, 18, 9); c.fill(); txt(c, { W: '↔', M: '✦', S: '🐢' }[d.t], d.x, d.y, 12); });
    c.fillStyle = wideT > 0 ? '#3aa0ff' : css('--accent'); rr(c, pxx - pw / 2, py, pw, 12, 6); c.fill();
    c.fillStyle = '#fff'; balls.forEach(b => { c.beginPath(); c.arc(b.x, b.y, R, 0, 7); c.fill(); });
    if (held && !dead) txt(c, 'Touche pour lancer', W / 2, H * .62, 15 * k, 'rgba(255,255,255,.7)', 0, 600);
  });
  return () => { stopL(); unk(); };
}

/* ======================================================================
   ☄️ ESQUIVE
   ====================================================================== */
function playEsquive(cv, { c, W, H, k }, api) {
  const sr = 18 * k;
  let x = W / 2, y = H * .82, t = 0, rocks = [], next = .5, dead = false, tilt = null, lastP = null, bonus = 0, stars = [], shield = 0;
  const ava = A.avatar(api.name);
  const onOri = e => { if (e.gamma != null) tilt = e.gamma; };
  window.addEventListener('deviceorientation', onOri);
  cv.addEventListener('pointerdown', e => { e.preventDefault(); lastP = pos(cv, e); });
  cv.addEventListener('pointermove', e => { if (!lastP) return; const p = pos(cv, e); x += (p.x - lastP.x) * 1.3; y += (p.y - lastP.y) * 1.3; lastP = p; });
  const up = () => lastP = null; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  let kl = false, kr = false;
  const unk = keys({ ArrowLeft: d => kl = d, ArrowRight: d => kr = d });
  const sky = [...Array(50)].map(() => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + .3 }));
  const stopL = loop(cv, dt => {
    if (!dead) {
      t += dt;
      if (tilt != null && !lastP) x += clamp(tilt, -35, 35) * 22 * k * dt;
      if (kl) x -= 420 * k * dt; if (kr) x += 420 * k * dt;
      x = clamp(x, sr, W - sr); y = clamp(y, H * .3, H - sr);
      next -= dt;
      if (next <= 0) {
        const r = rnd(12, 30) * k * (Math.random() < .1 ? 1.8 : 1);
        rocks.push({ x: rnd(0, W), y: -r, r, vx: rnd(-40, 40) * k, vy: rnd(160, 260) * k * (1 + t / 40), rot: 0, vr: rnd(-3, 3) });
        if (Math.random() < .06) stars.push({ x: rnd(20, W - 20), y: -20, vy: 150 * k });
        next = Math.max(.12, .55 - t / 90);
      }
      rocks.forEach(o => { o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; });
      stars.forEach(o => { o.y += o.vy * dt; });
      rocks = rocks.filter(o => o.y - o.r < H + 10);
      shield = Math.max(0, shield - dt);
      for (const st of stars) if (Math.hypot(st.x - x, st.y - y) < sr + 16 * k) { st.got = true; bonus += 50; shield = 3; beep(1400, .1, 'sine'); }
      stars = stars.filter(s => !s.got && s.y < H + 20);
      if (!shield) for (const o of rocks) if (Math.hypot(o.x - x, o.y - y) < o.r * .82 + sr * .7) { dead = true; buzz(250); api.end(t * 10 + bonus); break; }
      api.hud(`<b>${Math.round(t * 10 + bonus)}</b>${tilt != null ? ' <small>incline ou glisse</small>' : ' <small>glisse le doigt</small>'}`);
    }
    c.fillStyle = '#0b0818'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.7)'; sky.forEach(s => { s.y = (s.y + s.s * 30 * dt) % H; c.fillRect(s.x, s.y, s.s, s.s); });
    rocks.forEach(o => { c.save(); c.translate(o.x, o.y); c.rotate(o.rot); c.fillStyle = '#8a6a55'; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, rr2 = o.r * (i % 2 ? .85 : 1); c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(o.r * .25, -o.r * .2, o.r * .25, 0, 7); c.fill(); c.restore(); });
    stars.forEach(s => txt(c, '⭐', s.x, s.y, 26 * k));
    if (shield) { c.strokeStyle = `rgba(120,200,255,${.4 + Math.sin(t * 20) * .3})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, sr * 1.5, 0, 7); c.stroke(); }
    txt(c, ava, x, y + 2, sr * 2);
  });
  return () => { stopL(); unk(); window.removeEventListener('deviceorientation', onOri); };
}

/* ======================================================================
   🏀 LE LANCER (boule de papier dans la poubelle, avec du vent)
   ====================================================================== */
function playLancer(cv, { c, W, H, k }, api) {
  const floor = H * .86, br = 11 * k, G = 1500 * k, sx = W * .14, sy = floor - 70 * k;
  let bin, wind, ball, score = 0, phase = 'aim', touched = false, msg = '', msgT = 0, drag = null, trail = [];
  const newRound = () => {
    const bw = Math.max(54 * k, W * .14);
    bin = { x: rnd(W * .5, W * .86 - bw), w: bw, h: Math.max(70 * k, H * .13) };
    wind = score < 1 ? 0 : Math.round(rnd(-1, 1) * Math.min(5, 1 + score * .6) * 10) / 10;
    ball = { x: sx, y: sy, vx: 0, vy: 0 }; phase = 'aim'; touched = false; trail = [];
    api.hud(`<b>${score}</b> <small>${wind ? `vent ${wind > 0 ? '→' : '←'} ${Math.abs(wind)}` : 'pas de vent'}</small>`);
  };
  newRound();
  cv.addEventListener('pointerdown', e => { e.preventDefault(); if (phase !== 'aim') return; drag = { ...pos(cv, e), t: performance.now() }; });
  const release = e => {
    if (!drag || phase !== 'aim') return;
    const p = pos(cv, e), dt2 = Math.max(.05, (performance.now() - drag.t) / 1000);
    let vx = (p.x - drag.x) / dt2, vy = (p.y - drag.y) / dt2; drag = null;
    if (Math.hypot(vx, vy) < 150) return;
    const sp = Math.hypot(vx, vy), max = 1500 * k; if (sp > max) { vx *= max / sp; vy *= max / sp; }
    ball.vx = vx * .75; ball.vy = vy * .75; phase = 'fly'; beep(500, .05, 'triangle'); buzz(8);
  };
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', () => drag = null);
  const unk = keys({ ' ': d => { if (d && phase === 'aim') { ball.vx = 560 * k; ball.vy = -720 * k; phase = 'fly'; } } });
  const rims = () => [{ x: bin.x, y: floor - bin.h }, { x: bin.x + bin.w, y: floor - bin.h }];
  const stopL = loop(cv, dt => {
    if (phase === 'fly') {
      for (let s = 0; s < 4; s++) {
        const h = dt / 4;
        ball.vy += G * h; ball.vx += wind * 60 * k * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
        for (const r of rims()) { const dx = ball.x - r.x, dy = ball.y - r.y, d = Math.hypot(dx, dy); if (d < br + 3) { const nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= 1.6 * dot * nx; ball.vy -= 1.6 * dot * ny; } ball.x = r.x + nx * (br + 3); ball.y = r.y + ny * (br + 3); touched = true; beep(300, .03, 'square', .05); } }
        // parois intérieures de la poubelle
        if (ball.y > floor - bin.h && ball.y < floor) {
          if (Math.abs(ball.x - bin.x) < br && ball.vx !== 0) { ball.x = ball.x < bin.x ? bin.x - br : bin.x + br; ball.vx *= -.5; }
          if (Math.abs(ball.x - (bin.x + bin.w)) < br) { ball.x = ball.x < bin.x + bin.w ? bin.x + bin.w - br : bin.x + bin.w + br; ball.vx *= -.5; }
        }
        if (ball.x > bin.x && ball.x < bin.x + bin.w && ball.y > floor - bin.h * .45 && ball.vy > 0) {
          phase = 'in'; score += touched ? 1 : 2; msg = touched ? 'Panier ! 🎉' : 'Swish ! +2 ✨'; msgT = 1.1; beep(1100, .12, 'sine'); beep(1500, .12, 'sine'); buzz(40); setTimeout(newRound, 900); break;
        }
        if (ball.y > floor - br) { ball.y = floor - br; ball.vy *= -.35; ball.vx *= .7; if (Math.abs(ball.vy) < 60) { phase = 'miss'; } }
        if (ball.x < -40 || ball.x > W + 40) phase = 'miss';
      }
      trail.push([ball.x, ball.y]); if (trail.length > 14) trail.shift();
      if (phase === 'miss') { msg = 'Raté 😬'; msgT = 1; buzz(150); api.end(score); }
    }
    msgT = Math.max(0, msgT - dt);
    c.fillStyle = '#1a1430'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2b2147'; c.fillRect(0, floor, W, H - floor);
    // vent
    if (wind) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; const tt = performance.now() / 1000; for (let i = 0; i < 6; i++) { const yy = H * (.15 + i * .1), xx = ((tt * wind * 60 + i * 97) % W + W) % W; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + Math.sign(wind) * 30, yy); c.stroke(); } }
    // poubelle
    c.fillStyle = '#6b7a8f'; c.beginPath(); c.moveTo(bin.x, floor - bin.h); c.lineTo(bin.x + bin.w, floor - bin.h); c.lineTo(bin.x + bin.w * .9, floor); c.lineTo(bin.x + bin.w * .1, floor); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 4; i++) c.fillRect(bin.x + bin.w * i / 4 - 1.5, floor - bin.h + 8, 3, bin.h - 14);
    c.strokeStyle = '#aab6c6'; c.lineWidth = 5; c.beginPath(); c.moveTo(bin.x - 2, floor - bin.h); c.lineTo(bin.x + bin.w + 2, floor - bin.h); c.stroke();
    // lanceur
    txt(c, A.avatar(api.name), sx - 30 * k, sy + 26 * k, 42 * k);
    c.fillStyle = 'rgba(255,255,255,.15)'; trail.forEach(([tx, ty], i) => { c.beginPath(); c.arc(tx, ty, br * i / trail.length, 0, 7); c.fill(); });
    if (phase !== 'in') { c.fillStyle = '#f2f2f2'; c.beginPath(); c.arc(ball.x, ball.y, br, 0, 7); c.fill(); c.strokeStyle = '#bbb'; c.lineWidth = 1; c.beginPath(); c.arc(ball.x - 3, ball.y - 2, br * .5, 0, 3); c.stroke(); }
    if (phase === 'aim' && score === 0) txt(c, 'Glisse vers le haut et lâche pour lancer 👆', W / 2, H * .3, 14 * k, 'rgba(255,255,255,.75)', 0, 600);
    if (msgT) txt(c, msg, W / 2, H * .22, 30 * k);
  });
  return () => { stopL(); unk(); };
}

/* ======================================================================
   Duels : outils pour le multitouche haut / bas
   ====================================================================== */
function sides(cv, H, onMove) {
  const ptr = {};
  const down = e => { e.preventDefault(); const p = pos(cv, e); ptr[e.pointerId] = p.y < H / 2 ? 0 : 1; try { cv.setPointerCapture(e.pointerId); } catch {} onMove(ptr[e.pointerId], p, true); };
  const move = e => { if (ptr[e.pointerId] == null) return; onMove(ptr[e.pointerId], pos(cv, e), false); };
  const up = e => { delete ptr[e.pointerId]; };
  cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
function scoreSides(c, W, H, names, sc, k, target) {
  c.setLineDash([8, 8]); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke(); c.setLineDash([]);
  txt(c, `${sc[0]}`, W - 28 * k, H / 2 - 30 * k, 34 * k, 'rgba(255,255,255,.55)', Math.PI);
  txt(c, `${sc[1]}`, W - 28 * k, H / 2 + 30 * k, 34 * k, 'rgba(255,255,255,.55)');
  txt(c, `${names[0]} · premier à ${target}`, W / 2, 16 * k, 12 * k, 'rgba(255,255,255,.4)', Math.PI, 600);
  txt(c, `${names[1]} · premier à ${target}`, W / 2, H - 16 * k, 12 * k, 'rgba(255,255,255,.4)', 0, 600);
}

/* ======================================================================
   🏒 AIR HOCKEY
   ====================================================================== */
function playHockey(cv, { c, W, H, k }, api) {
  const TARGET = 7, MR = Math.max(26, 34 * k), PR = MR * .62, GW = W * .38;
  const m = [{ x: W / 2, y: H * .15, vx: 0, vy: 0, tx: W / 2, ty: H * .15 }, { x: W / 2, y: H * .85, vx: 0, vy: 0, tx: W / 2, ty: H * .85 }];
  let pk = { x: W / 2, y: H / 2, vx: 0, vy: 0 }, sc = [0, 0], pause = .8, over = false, flash = null;
  const reset = toward => { pk = { x: W / 2, y: toward === 0 ? H * .35 : H * .65, vx: 0, vy: 0 }; pause = .8; };
  sides(cv, H, (s, p) => { m[s].tx = p.x; m[s].ty = p.y; });
  const stopL = loop(cv, dt => {
    m.forEach((q, s) => {
      const tx = clamp(q.tx, MR, W - MR), ty = s === 0 ? clamp(q.ty, MR, H / 2 - MR) : clamp(q.ty, H / 2 + MR, H - MR);
      q.vx = (tx - q.x) / Math.max(dt, .001); q.vy = (ty - q.y) / Math.max(dt, .001); q.x = tx; q.y = ty;
    });
    if (!over) {
      if (pause > 0) pause -= dt;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const h = dt / steps;
        pk.x += pk.vx * h; pk.y += pk.vy * h;
        for (const q of m) {
          const dx = pk.x - q.x, dy = pk.y - q.y, d = Math.hypot(dx, dy) || 1;
          if (d < MR + PR) {
            const nx = dx / d, ny = dy / d; pk.x = q.x + nx * (MR + PR); pk.y = q.y + ny * (MR + PR);
            const rvx = pk.vx - q.vx * .9, rvy = pk.vy - q.vy * .9, dot = rvx * nx + rvy * ny;
            if (dot < 0) { pk.vx -= 1.85 * dot * nx; pk.vy -= 1.85 * dot * ny; beep(400, .03, 'square', .06); buzz(6); }
          }
        }
        const inGoal = Math.abs(pk.x - W / 2) < GW / 2;
        if (pk.x < PR) { pk.x = PR; pk.vx = Math.abs(pk.vx) * .9; } if (pk.x > W - PR) { pk.x = W - PR; pk.vx = -Math.abs(pk.vx) * .9; }
        if (!inGoal) { if (pk.y < PR) { pk.y = PR; pk.vy = Math.abs(pk.vy) * .9; } if (pk.y > H - PR) { pk.y = H - PR; pk.vy = -Math.abs(pk.vy) * .9; } }
        const sp = Math.hypot(pk.vx, pk.vy), max = 1700 * k; if (sp > max) { pk.vx *= max / sp; pk.vy *= max / sp; }
        if (pk.y < -PR || pk.y > H + PR) {
          const scorer = pk.y < 0 ? 1 : 0; sc[scorer]++; flash = { s: scorer, t: 1 }; beep(1100, .2, 'sine'); buzz([60, 40, 60]);
          if (sc[scorer] >= TARGET) { over = true; api.end(scorer, `${Math.max(...sc)} à ${Math.min(...sc)}`); } else reset(1 - scorer);
          break;
        }
      }
      const f = Math.pow(.6, dt); pk.vx *= f; pk.vy *= f;
    }
    c.fillStyle = '#0f2a3d'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,200,255,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, W * .18, 0, 7); c.stroke();
    c.fillStyle = '#ff5c8a'; c.fillRect(W / 2 - GW / 2, 0, GW, 6); c.fillStyle = '#3aa0ff'; c.fillRect(W / 2 - GW / 2, H - 6, GW, 6);
    scoreSides(c, W, H, api.names, sc, k, TARGET);
    c.fillStyle = '#111'; c.beginPath(); c.arc(pk.x, pk.y, PR, 0, 7); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.stroke();
    m.forEach((q, s) => { c.fillStyle = s ? '#3aa0ff' : '#ff5c8a'; c.beginPath(); c.arc(q.x, q.y, MR, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(q.x, q.y, MR * .45, 0, 7); c.fill(); });
    if (flash) { flash.t -= dt; if (flash.t > 0) { txt(c, 'BUT !', W / 2, H * .3, 40 * k, '#fff', Math.PI); txt(c, 'BUT !', W / 2, H * .7, 40 * k); } else flash = null; }
  });
  return stopL;
}

/* ======================================================================
   🏓 PING
   ====================================================================== */
function playPing(cv, { c, W, H, k }, api) {
  const TARGET = 7, PW = W * .26, PH = 12, R = 8 * k, ys = [H * .07, H * .93 - PH];
  const pads = [W / 2, W / 2];
  let ball, sc = [0, 0], pause = 1, over = false, hits = 0;
  const serve = toward => { const sp = 380 * k, a = rnd(-.5, .5); ball = { x: W / 2, y: H / 2, vx: Math.sin(a) * sp, vy: (toward === 0 ? -1 : 1) * Math.cos(a) * sp }; pause = .9; hits = 0; };
  serve(Math.random() < .5 ? 0 : 1);
  sides(cv, H, (s, p) => { pads[s] = p.x; });
  const stopL = loop(cv, dt => {
    pads.forEach((x, s) => pads[s] = clamp(x, PW / 2, W - PW / 2));
    if (!over) {
      if (pause > 0) pause -= dt;
      else for (let i = 0; i < 3; i++) {
        const h = dt / 3; ball.x += ball.vx * h; ball.y += ball.vy * h;
        if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); } if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
        for (let s = 0; s < 2; s++) {
          const py = ys[s], hit = s === 0 ? (ball.vy < 0 && ball.y - R <= py + PH && ball.y - R >= py - 10) : (ball.vy > 0 && ball.y + R >= py && ball.y + R <= py + PH + 10);
          if (hit && Math.abs(ball.x - pads[s]) < PW / 2 + R) {
            hits++; const off = clamp((ball.x - pads[s]) / (PW / 2), -1, 1), sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 1100 * k);
            ball.vx = Math.sin(off * 1.0) * sp; ball.vy = (s === 0 ? 1 : -1) * Math.cos(off * 1.0) * sp;
            ball.y = s === 0 ? py + PH + R : py - R; beep(s ? 700 : 600, .04, 'square', .06); buzz(8);
          }
        }
        if (ball.y < -R * 2 || ball.y > H + R * 2) {
          const scorer = ball.y < 0 ? 1 : 0; sc[scorer]++; beep(1100, .2, 'sine'); buzz([60, 40, 60]);
          if (sc[scorer] >= TARGET) { over = true; api.end(scorer, `${Math.max(...sc)} à ${Math.min(...sc)}`); } else serve(1 - scorer);
          break;
        }
      }
    }
    c.fillStyle = '#123a2a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.strokeRect(6, 6, W - 12, H - 12);
    scoreSides(c, W, H, api.names, sc, k, TARGET);
    pads.forEach((x, s) => { c.fillStyle = s ? '#3aa0ff' : '#ff5c8a'; rr(c, x - PW / 2, ys[s], PW, PH, 6); c.fill(); });
    if (ball) { c.fillStyle = '#ffb547'; c.beginPath(); c.arc(ball.x, ball.y, R, 0, 7); c.fill(); }
    if (pause > 0 && !over) { txt(c, 'Prêts…', W / 2, H * .38, 22 * k, 'rgba(255,255,255,.7)', Math.PI); txt(c, 'Prêts…', W / 2, H * .62, 22 * k, 'rgba(255,255,255,.7)'); }
  });
  return stopL;
}

/* ======================================================================
   🎯 TIR RAPIDE
   ====================================================================== */
function playTir(cv, { c, W, H, k }, api) {
  const TARGET = 5, TR = 34 * k;
  let sc = [0, 0], state = 'wait', timer = rnd(1.2, 3), tg = null, decoy = false, msg = ['', ''], msgT = 0, over = false, t0 = 0, now = 0;
  const nextRound = () => { state = 'wait'; timer = rnd(1.2, 3.2); tg = null; decoy = Math.random() < .25; };
  const point = (s, why) => {
    sc[s]++; msg = s === 0 ? ['+1 · ' + why, why] : [why, '+1 · ' + why]; msgT = 1.3; buzz([40, 30, 40]);
    if (sc[s] >= TARGET) { over = true; api.end(s, `${Math.max(...sc)} à ${Math.min(...sc)}`); return; }
    state = 'pause'; timer = 1.2;
  };
  const tgPos = s => s === 0 ? { x: W - tg.x, y: H / 2 - tg.y } : { x: tg.x, y: H / 2 + tg.y };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); if (over) return;
    const p = pos(cv, e), s = p.y < H / 2 ? 0 : 1;
    if (state === 'wait') { beep(200, .2, 'sawtooth'); return point(1 - s, s === 0 ? '⏱️ En haut : trop tôt !' : '⏱️ En bas : trop tôt !'); }
    if (state === 'show') {
      const q = tgPos(s);
      if (Math.hypot(p.x - q.x, p.y - q.y) < TR * 1.4) {
        if (decoy) { beep(150, .3, 'sawtooth'); return point(1 - s, '💥 Boum !'); }
        beep(1200, .1, 'sine'); point(s, `🎯 ${Math.round((now - t0) * 1000)} ms`);
      }
    }
  });
  const stopL = loop(cv, dt => {
    now += dt;
    if (!over) {
      timer -= dt;
      if (state === 'wait' && timer <= 0) { state = 'show'; t0 = now; tg = { x: rnd(TR * 1.5, W - TR * 1.5), y: rnd(TR * 1.5, H / 2 - TR * 2) }; timer = decoy ? 1.1 : 99; beep(decoy ? 300 : 900, .06, 'sine'); }
      else if (state === 'show' && decoy && timer <= 0) { decoy = false; state = 'show'; t0 = now; tg = { x: rnd(TR * 1.5, W - TR * 1.5), y: rnd(TR * 1.5, H / 2 - TR * 2) }; timer = 99; beep(900, .06, 'sine'); }
      else if (state === 'pause' && timer <= 0) nextRound();
    }
    msgT = Math.max(0, msgT - dt);
    c.fillStyle = '#1a1430'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,92,138,.07)'; c.fillRect(0, 0, W, H / 2); c.fillStyle = 'rgba(58,160,255,.07)'; c.fillRect(0, H / 2, W, H / 2);
    scoreSides(c, W, H, api.names, sc, k, TARGET);
    if (state === 'wait') { txt(c, 'Attends…', W / 2, H * .25, 24 * k, 'rgba(255,255,255,.6)', Math.PI); txt(c, 'Attends…', W / 2, H * .75, 24 * k, 'rgba(255,255,255,.6)'); }
    if (state === 'show' && tg) [0, 1].forEach(s => { const q = tgPos(s); txt(c, decoy ? '💣' : '🎯', q.x, q.y, TR * 2, '#fff', s ? 0 : Math.PI); });
    if (msgT) { txt(c, msg[0], W / 2, H * .25, 22 * k, '#fff', Math.PI); txt(c, msg[1], W / 2, H * .75, 22 * k); }
  });
  return stopL;
}

/* ---------- Enregistrement ---------- */
const SOLO = {
  tour:    { play: playTour, rules: 'Un bloc glisse : <b>tape</b> pour le poser sur la pile. Ce qui dépasse tombe… Pose-le pile dessus 3 fois de suite pour l’agrandir.', unit: ' étages' },
  sprint:  { play: playSprint, rules: '<b>Tape</b> pour sauter (double saut possible, reste appuyé pour sauter plus haut). Évite les caisses et les chauves-souris, attrape les ⭐.', unit: ' m' },
  serpent: { play: playSerpent, rules: '<b>Glisse</b> le doigt (ou touche à côté de la tête) pour tourner. Mange les 🍒, les 🍋 valent 3 mais disparaissent vite. Ne touche ni les murs ni ta queue !', unit: ' fruits' },
  briques: { play: playBriques, rules: 'Déplace la raquette avec le doigt et casse toutes les briques. 3 vies. Bonus : ↔ raquette large, ✦ multi-balle, 🐢 ralenti.', unit: ' pts' },
  esquive: { play: playEsquive, rules: '<b>Penche le téléphone</b> ou glisse le doigt pour éviter les météores. Les ⭐ donnent un bouclier. Ça accélère !', unit: ' pts', sensors: true },
  lancer:  { play: playLancer, rules: '<b>Glisse vers le haut et lâche</b> pour lancer la boule de papier dans la poubelle. Attention au vent ! Un panier sans toucher le bord = 2 points. Au premier raté, c’est fini.', unit: ' paniers' }
};
const DUEL = {
  hockey: { play: playHockey, rules: 'Chacun déplace son palet avec le doigt, dans sa moitié. Marque dans le but d’en face. Premier à <b>7</b> !' },
  ping:   { play: playPing, rules: 'Chacun sa raquette, de son côté : fais glisser le doigt pour renvoyer la balle. Elle accélère à chaque échange. Premier à <b>7</b> !' },
  tir:    { play: playTir, rules: 'Une cible 🎯 apparaît de chaque côté : le premier qui touche la sienne marque. Toucher trop tôt ou toucher une 💣 donne le point à l’autre. Premier à <b>5</b> !' }
};
Object.assign(A.G, {
  tour:    { arcade: 1, name: 'La Tour', e: '🧱', d: 'Empile le plus haut possible', g: 'linear-gradient(150deg,#ff9a3d,#e23d6d)', fit: 'bbbb', free: true, isNew: true },
  sprint:  { arcade: 1, name: 'Le Sprint', e: '🏃', d: 'Saute les obstacles, ça accélère', g: 'linear-gradient(150deg,#43cea2,#185a9d)', fit: 'bbbb', free: true, isNew: true },
  serpent: { arcade: 1, name: 'Le Serpent', e: '🐍', d: 'Mange, grandis, ne te mords pas', g: 'linear-gradient(150deg,#3ddc97,#11734b)', fit: 'bbbb', free: true, isNew: true },
  briques: { arcade: 1, name: 'Casse-briques', e: '🧨', d: 'Une raquette, une balle, des briques', g: 'linear-gradient(150deg,#7b5cff,#d63af9)', fit: 'bbbb', free: true, isNew: true },
  esquive: { arcade: 1, name: 'Esquive', e: '☄️', d: 'Évite la pluie de météores', g: 'linear-gradient(150deg,#232a6b,#8a3ad6)', fit: 'bbbb', free: true, isNew: true },
  lancer:  { arcade: 1, name: 'Le Lancer', e: '🗑️', d: 'Boule de papier, poubelle et vent', g: 'linear-gradient(150deg,#f7b733,#e0702a)', fit: 'bbbb', free: true, isNew: true },
  hockey:  { arcade: 1, duel: 1, name: 'Air hockey', e: '🏒', d: 'Duel à deux sur le même écran', g: 'linear-gradient(150deg,#2b9fd6,#1b3f8a)', fit: 'bboo', free: true, isNew: true },
  ping:    { arcade: 1, duel: 1, name: 'Ping', e: '🏓', d: 'Tennis de table à deux, sur l’écran', g: 'linear-gradient(150deg,#2fbf71,#0e6a4a)', fit: 'bboo', free: true, isNew: true },
  tir:     { arcade: 1, duel: 1, name: 'Tir rapide', e: '🎯', d: 'Le plus rapide sur sa cible', g: 'linear-gradient(150deg,#ff5f6d,#ffc371)', fit: 'bboo', free: true, isNew: true }
});
Object.entries({ ...SOLO, ...DUEL }).forEach(([id, o]) => { A.G[id].rules = o.rules; });
Object.entries(SOLO).forEach(([id, o]) => A.makers[id] = () => Solo(id, o));
Object.entries(DUEL).forEach(([id, o]) => A.makers[id] = () => Duel(id, o));
})();
