(() => {
'use strict';

const D = window.DATA;
const VERSION = 22;
const $app = document.getElementById('app');

/* ================= Stockage ================= */
const store = {
  get(k, def) { try { const v = localStorage.getItem('apero:' + k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem('apero:' + k, JSON.stringify(v)); } catch {} }
};
const S = {
  players: store.get('players', []),
  spicy: store.get('spicy', false),
  drinks: store.get('drinks', true),
  custom: store.get('custom', { verite: [], action: [], jamais: [], qui: [], preferes: [] })
};
const save = () => { store.set('players', S.players); store.set('spicy', S.spicy); store.set('drinks', S.drinks); store.set('custom', S.custom); };

/* ================= Utilitaires ================= */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Paquet sans répétition : on ne revoit une carte qu'une fois tout le paquet passé */
function deck(items) {
  let pile = [], last = null;
  return {
    size: items.length,
    next() {
      if (!pile.length) { pile = shuffle(items); if (pile.length > 1 && pile[pile.length - 1] === last) pile.unshift(pile.pop()); }
      return (last = pile.pop());
    }
  };
}
function pool(key) {
  const src = D[key];
  // mode épicé : les cartes épicées REMPLACENT les cartes normales
  const base = S.spicy && src.hot && src.hot.length ? src.hot : src.soft;
  const mine = (S.custom[key] || []).map(t => key === 'preferes' ? t.split(/\s+\/\s+|\s+ou\s+/i).slice(0, 2) : t)
    .filter(t => key !== 'preferes' || (t.length === 2 && t[0] && t[1]));
  return base.concat(mine);
}
const others = cur => S.players.filter(p => p !== cur);
function fill(text, cur) {
  return esc(text).replace(/\{p\}/g, () => {
    const o = others(cur);
    return '<u>' + esc(o.length ? pick(o) : 'quelqu’un') + '</u>';
  });
}
const sip = (n, alt) => S.drinks ? `${n} gorgée${n > 1 ? 's' : ''} 🍻` : alt;
const gages = () => S.drinks ? D.gages : D.gages.filter(g => !/gorgée/i.test(g));

function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch {} }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

/* Son (Web Audio, aucun fichier) */
let actx = null;
function beep(freq = 880, dur = 0.06, type = 'square', vol = 0.15) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch {}
}
function boomSound() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const len = actx.sampleRate * 1.2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0.9;
    src.buffer = buf; src.connect(f).connect(g).connect(actx.destination); src.start();
  } catch {}
}

/* Écran toujours allumé pendant le jeu */
let wake = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && current) keepAwake(true); });

/* Minuteries du jeu en cours, nettoyées à chaque sortie */
let timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
const clearTimers = () => { timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers = []; };

/* ================= Jeux ================= */
/* fit : adaptation à 2 / 3 / 4 / 5+ joueurs — b = idéal, o = ça marche, - = pas jouable */
const G = {
  aov:      { name: 'Action ou Vérité', e: '🎭', d: 'Le classique, en mieux', g: 'linear-gradient(150deg,#ff5c8a,#b0306e)', fit: 'obbb' },
  jamais:   { name: "Je n'ai jamais", e: '🙊', d: 'Les secrets sortent', g: 'linear-gradient(150deg,#7b5cff,#4b2bb8)', fit: 'obbb' },
  juge:     { name: 'Le Juge', e: '🧑‍⚖️', d: 'Un duel, un arbitre', g: 'linear-gradient(150deg,#f2c14e,#c0661c)', fit: '-bbo', isNew: true },
  connais:  { name: 'Tu me connais ?', e: '🔮', d: 'Devine ce qu’il va répondre', g: 'linear-gradient(150deg,#ff6fb5,#8a3ad6)', fit: 'bbbo', isNew: true },
  synchro:  { name: 'Synchro', e: '🧠', d: 'Dites le même mot', g: 'linear-gradient(150deg,#28c7d9,#2b5fd6)', fit: 'bbbo', isNew: true },
  imposteur:{ name: "L'Imposteur", e: '🕵️', d: 'Qui n’a pas le même mot ?', g: 'linear-gradient(150deg,#1fb5a4,#0e6a71)', fit: '--bb' },
  bombe:    { name: 'La Bombe', e: '💣', d: 'Réponds avant le boum', g: 'linear-gradient(150deg,#ff8a3d,#d13b1f)', fit: 'obbb' },
  qui:      { name: 'Qui pourrait…', e: '👉', d: 'Tout le monde pointe', g: 'linear-gradient(150deg,#ffb547,#e0702a)', fit: '-obb' },
  preferes: { name: 'Tu préfères ?', e: '⚖️', d: 'Choix impossibles', g: 'linear-gradient(150deg,#3aa0ff,#2952d6)', fit: 'obbb' },
  mime:     { name: 'Fais deviner', e: '⏱️', d: 'Mime, parle, un seul mot', g: 'linear-gradient(150deg,#3ddc97,#16865c)', fit: 'obbb' },
  roue:     { name: 'La Roue', e: '🎡', d: 'Le hasard désigne un joueur', g: 'linear-gradient(150deg,#d65cff,#7a2bb8)', fit: 'oooo' },
  doigt:    { name: 'Le Doigt élu', e: '👆', d: 'Tous un doigt, un seul élu', g: 'linear-gradient(150deg,#ff4fa3,#ff8a3d)', fit: 'bbbb', free: true, isNew: true },
  duel:     { name: 'Duel de réflexes', e: '⚡', d: 'Face à face, premier qui tape', g: 'linear-gradient(150deg,#ffd23f,#ee6c1f)', fit: 'booo', free: true, isNew: true },
  main:     { name: 'Main sûre', e: '🫳', d: 'Ne fais pas trembler le téléphone', g: 'linear-gradient(150deg,#5ee7c5,#1d7f9a)', fit: 'bbbb', free: true, isNew: true },
  enigmes:  { name: 'Énigmes', e: '🧩', d: 'Devinettes et casse-têtes en équipe', g: 'linear-gradient(150deg,#4facfe,#6a3093)', fit: 'bbbb', free: true, isNew: true },
  yams:     { name: 'Le Yams', e: '🎲', d: '5 dés, 3 lancers, une grille', g: 'linear-gradient(150deg,#e94560,#533483)', fit: 'bbbo', isNew: true },
  secoue:   { name: 'Secoue-le', e: '🫨', d: 'Le plus fort en 5 secondes', g: 'linear-gradient(150deg,#ff6b6b,#a1239c)', fit: 'bbbb', free: true, isNew: true }
};
const clampN = n => Math.min(5, Math.max(2, n));
const fitAt = (id, n) => G[id].fit[clampN(n) - 2];             // 'b' | 'o' | '-'
const minPlayers = id => 2 + G[id].fit.search(/[bo]/);
const nLabel = n => n >= 5 ? '5 et +' : String(n);

let current = null;   // jeu en cours (objet avec render)

function header(title, extra = '') {
  return `<div class="top"><button class="icon-btn" data-a="home" aria-label="Retour">←</button><h1>${esc(title)}</h1>${extra}</div>`;
}
function view(html, after, keepScroll) {
  const y = window.scrollY;
  $app.innerHTML = html;
  $app.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', onAction));
  after && after();
  window.scrollTo(0, keepScroll ? y : 0);
}
function onAction(e) {
  const el = e.currentTarget, a = el.dataset.a;
  if (a === 'home') return goHome();
  if (current && current.on) current.on(a, el);
  else if (home.on) home.on(a, el);
}

/* ---------- Navigation (bouton retour Android géré) ---------- */
function openGame(id) {
  const g = G[id];
  const m = minPlayers(id);
  if (!g.free && S.players.length < m) { toast(`${g.name} se joue à partir de ${m} joueurs 🙂`); document.querySelector('#pname')?.focus(); return; }
  history.pushState({ g: id }, '', '#' + id);
  start(id);
}
function openPage(id) { history.pushState({ p: id }, '', '#' + id); start(id); }
function start(id) {
  clearTimers();
  current = makers[id]();
  keepAwake(!!G[id] || id === 'online');
  current.render();
}
function goHome() {
  if (current && current.confirmLeave && !confirm(current.confirmLeave)) return;
  if (history.state && (history.state.g || history.state.p)) history.back(); else showHome();
}
function showHome() { clearTimers(); if (current && current.leave) current.leave(); current = null; keepAwake(false); home.render(); }
window.addEventListener('popstate', () => showHome());

/* ================= Accueil ================= */
const home = {
  render() {
    const chips = S.players.map((p, i) => `<span class="chip">${esc(p)}<button data-a="del" data-i="${i}" aria-label="Retirer ${esc(p)}">✕</button></span>`).join('');
    const n = home.n || (S.players.length >= 2 ? clampN(S.players.length) : 3);
    const card = (id, i, arr, off) => { const g = G[id];
      return `<button class="game${i === arr.length - 1 && arr.length % 2 ? ' wide' : ''}${off ? ' off' : ''}" style="--g:${g.g}" data-a="game" data-id="${id}">
        ${g.isNew ? '<i class="new">Nouveau</i>' : ''}<span class="e">${g.e}</span><b>${g.name}</b><span>${off ? `Dès ${minPlayers(id)} joueurs` : g.d}</span></button>`; };
    const ids = Object.keys(G), group = f => ids.filter(id => fitAt(id, n) === f);
    const block = (title, list, off) => list.length ? `<h3 class="cat">${title}</h3><div class="games">${list.map((id, i, a) => card(id, i, a, off)).join('')}</div>` : '';
    const games = `
      <div class="nfilter"><span>Vous êtes</span>${[2, 3, 4, 5].map(k => `<button class="${k === n ? 'on' : ''}" data-a="n" data-v="${k}">${nLabel(k)}</button>`).join('')}</div>
      ${block(`⭐ Parfait à ${nLabel(n)}`, group('b'))}
      ${block('👍 Ça marche aussi', group('o'))}
      ${block(`Pas à ${nLabel(n)}`, group('-'), true)}`;
    view(`
      <div class="brand"><div class="logo">${S.spicy ? '🌶️' : '🥂'}</div><div><h1>Apéro${S.spicy ? ' <span class="hotbadge">18+</span>' : ''}</h1><p>${S.spicy ? 'Édition épicée 🔥 · questions trash' : 'Jeux de soirée · gratuit · sans pub'}</p></div></div>

      <div class="section">
        <h2><span>Joueurs</span><span>${S.players.length || ''}</span></h2>
        <form class="add-row" id="addf" autocomplete="off">
          <input id="pname" maxlength="18" placeholder="Prénom du joueur" enterkeyhint="done" />
          <button class="btn primary" type="submit">Ajouter</button>
        </form>
        ${S.players.length ? `<div class="chips">${chips}</div>` : `<p class="empty">Ajoutez les prénoms de tout le monde : les jeux s'en servent pour désigner qui joue.</p>`}
      </div>

      <div class="section">
        <div class="toggle"><div class="t"><b>Avec alcool 🍻</b><span>Gorgées dans les règles (sinon : gages)</span></div><button class="switch ${S.drinks ? 'on' : ''}" data-a="drinks" aria-label="Avec alcool"></button></div>
        <div class="toggle"><div class="t"><b>Mode épicé 🌶️</b><span>${S.spicy ? 'Activé : uniquement des questions trash et sexy' : 'Questions trash et sexy · 18+'}</span></div><button class="switch ${S.spicy ? 'on' : ''}" data-a="spicy" aria-label="Mode épicé"></button></div>
      </div>

      <button class="online-cta" data-a="page" data-id="online">
        <span class="e">📡</span><span><b>Jouer en ligne</b><small>Chacun sur son téléphone · Poker, Échecs, Bluff, Loups-garous…</small></span><span class="go">›</span>
      </button>
      ${games}

      <div class="links">
        <button class="btn" data-a="page" data-id="cartes">✍️ Mes cartes</button>
        <button class="btn" data-a="page" data-id="regles">📖 Règles</button>
      </div>
      <p class="foot">Un seul téléphone qui tourne · Installe-moi : « Partager › Sur l'écran d'accueil »<br>Version ${VERSION}</p>
    `, () => {
      document.getElementById('addf').addEventListener('submit', e => {
        e.preventDefault();
        const inp = document.getElementById('pname'), v = inp.value.trim().replace(/\s+/g, ' ');
        if (!v) return;
        if (S.players.some(p => p.toLowerCase() === v.toLowerCase())) { toast('Ce prénom est déjà là'); return; }
        S.players.push(v); home.n = null; save(); home.render();
        document.getElementById('pname').focus();
      });
    }, true);
  },
  on(a, el) {
    if (a === 'del') { S.players.splice(+el.dataset.i, 1); home.n = null; save(); home.render(); }
    if (a === 'n') { home.n = +el.dataset.v; home.render(); }
    if (a === 'drinks') { S.drinks = !S.drinks; save(); home.render(); }
    if (a === 'spicy') {
      if (!S.spicy && !confirm('🌶️ Mode épicé : questions et actions trash et sexy, réservées aux adultes.\n\nTout le monde ici a 18 ans ou plus et est partant ?\n(Chacun peut toujours refuser une carte avec le Joker.)')) return;
      S.spicy = !S.spicy; save(); applyTheme(); home.render(); toast(S.spicy ? 'Mode épicé activé 🌶️🔥' : 'Retour au mode normal 🥂');
    }
    if (a === 'game') openGame(el.dataset.id);
    if (a === 'page') openPage(el.dataset.id);
  }
};

/* Joueur qui tourne */
function rotation() {
  const order = shuffle(S.players); let i = -1;
  return { next() { i = (i + 1) % order.length; return order[i]; }, get cur() { return order[Math.max(i, 0)]; } };
}

/* ================= Fabriques de jeux ================= */
const makers = {

  /* ---------- Action ou Vérité ---------- */
  aov() {
    const g = G.aov, rot = rotation();
    const dv = deck(pool('verite')), da = deck(pool('action'));
    let who = rot.next(), card = null;
    return {
      render() {
        if (!card) return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Au tour de<strong>${esc(who)}</strong></div>
            <button class="choice" style="background:linear-gradient(150deg,#7b5cff,#4b2bb8)" data-a="v">Vérité<small>Réponds honnêtement</small></button>
            <button class="choice" style="background:linear-gradient(150deg,#ff5c8a,#b0306e)" data-a="a">Action<small>Pas de chichis</small></button>
            <button class="btn" data-a="rand">🎲 Au hasard</button>
            ${S.spicy ? '<p class="hint" style="font-size:.85rem">🌶️ Mode épicé : chacun peut refuser une carte, c’est le Joker.</p>' : ''}
          </div>`);
        view(`${header(g.name)}
          <div class="stage">
            <div class="turn">${esc(who)}</div>
            <div class="card" style="--g:${card.t === 'v' ? 'linear-gradient(160deg,#7b5cff,#3b1f9a)' : 'linear-gradient(160deg,#ff5c8a,#8f2059)'}">
              <div class="tag">${card.t === 'v' ? 'Vérité' : 'Action'}</div>
              <div class="txt">${card.html}</div>
            </div>
            <div class="row">
              <button class="btn" data-a="joker">Joker · ${S.drinks ? '2 🍻' : 'gage'}</button>
              <button class="btn ok" data-a="done">C'est fait ✓</button>
            </div>
          </div>`);
      },
      on(a) {
        if (a === 'rand') a = Math.random() < .5 ? 'v' : 'a';
        if (a === 'v' || a === 'a') { card = { t: a, html: fill((a === 'v' ? dv : da).next(), who) }; buzz(15); this.render(); }
        if (a === 'joker') { if (!S.drinks) toast('Gage : ' + pick(gages())); this.next(); }
        if (a === 'done') this.next();
      },
      next() { card = null; who = rot.next(); this.render(); }
    };
  },

  /* ---------- Je n'ai jamais ---------- */
  jamais() {
    const g = G.jamais, d = deck(pool('jamais')); let n = 0, txt = d.next();
    return {
      render() {
        view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:${g.g}" data-a="next">
              <div class="tag">Je n'ai jamais…</div>
              <div class="txt">${fill(txt.replace(/^Je n'ai jamais\s*/i, '… '), null)}</div>
              <div class="count">Carte ${n + 1}</div>
            </div>
            <p class="hint">${S.drinks ? 'Ceux qui l’ont déjà fait boivent une gorgée 🍻' : 'Ceux qui l’ont déjà fait perdent un point ✋'}</p>
            <button class="btn primary big block" data-a="next">Carte suivante</button>
          </div>`);
      },
      on(a) { if (a === 'next') { txt = d.next(); n++; this.render(); } }
    };
  },

  /* ---------- Qui pourrait ---------- */
  qui() {
    const g = G.qui, d = deck(pool('qui')); let txt = d.next(), phase = 'read';
    return {
      render() {
        const center = phase === 'count' ? `<div class="big-num" id="cnt">3</div>`
          : phase === 'point' ? `<div class="big-num">👉</div><div class="sub" style="font-size:1.3rem;font-weight:700">Pointez !</div>`
          : `<div class="txt">${fill(txt, null)}</div>`;
        view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:${g.g}">
              <div class="tag">Qui est le plus susceptible de…</div>
              ${center}
            </div>
            <p class="hint">${S.drinks ? 'Celui qui reçoit le plus de doigts boit autant de gorgées 🍻' : 'Le / la plus désigné·e fait un gage'}</p>
            ${phase === 'read' ? `<button class="btn primary big block" data-a="go">3, 2, 1… Pointez !</button>`
              : phase === 'point' ? `<div class="row"><button class="btn" data-a="gage">🎲 Un gage</button><button class="btn primary" data-a="next">Suivante</button></div>`
              : `<button class="btn big block" disabled>…</button>`}
          </div>`);
      },
      on(a) {
        if (a === 'go') {
          phase = 'count'; this.render(); let c = 3; beep(660, .08, 'sine');
          const id = every(() => {
            c--; const el = document.getElementById('cnt');
            if (c > 0 && el) { el.textContent = c; el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; beep(660, .08, 'sine'); }
            else { clearInterval(id); beep(990, .25, 'sine'); buzz(120); phase = 'point'; this.render(); }
          }, 800);
        }
        if (a === 'gage') toast(pick(gages()));
        if (a === 'next') { txt = d.next(); phase = 'read'; this.render(); }
      }
    };
  },

  /* ---------- Tu préfères ---------- */
  preferes() {
    const g = G.preferes, d = deck(pool('preferes')); let pair = d.next(), sel = -1, cur = null;
    return {
      render() {
        const b = (i, bg) => `<button data-a="pick" data-i="${i}" class="${sel === i ? 'sel' : sel > -1 ? 'dim' : ''}" style="background:${bg}">${fill(pair[i], cur)}</button>`;
        view(`${header(g.name)}
          <div class="stage">
            <div class="wyr">
              ${b(0, 'linear-gradient(150deg,#3aa0ff,#2952d6)')}
              <div class="or">OU</div>
              ${b(1, 'linear-gradient(150deg,#ff5c8a,#b0306e)')}
            </div>
            <p class="hint">${S.players.length === 2
              ? `Chacun devine d'abord le choix de l'autre. ${S.drinks ? 'Raté ? Tu bois 🍻' : 'Raté ? Gage !'}`
              : `Tout le monde choisit en même temps. ${S.drinks ? 'La minorité boit 🍻' : 'La minorité fait un gage'}`}</p>
            <button class="btn primary big block" data-a="next">Question suivante</button>
          </div>`);
      },
      on(a, el) {
        if (a === 'pick') { sel = +el.dataset.i; buzz(15); this.render(); }
        if (a === 'next') { pair = d.next(); sel = -1; this.render(); }
      }
    };
  },

  /* ---------- Le Juge ---------- */
  juge() {
    const g = G.juge, d = deck(pool('juge')), rot = rotation();
    let target = 5, phase = 'setup', judge = null, txt = '', scores = {}, champ = null;
    const board = () => scoreboard(scores, target);
    return {
      render() {
        if (phase === 'setup') return view(`${header(g.name)}
          <div class="stage">
            <p class="hint" style="text-align:left">À chaque manche, un joueur est <b>le juge</b>. Les autres relèvent le même défi chacun leur tour, et le juge désigne le meilleur. Le juge change à chaque manche.</p>
            <div class="label">Points pour gagner</div>
            <div class="seg">${[3, 5, 7, 10].map(k => `<button class="${target === k ? 'on' : ''}" data-a="t" data-v="${k}">${k}</button>`).join('')}</div>
            <div style="flex:1"></div>
            <button class="btn primary big block" data-a="go">C'est parti</button>
          </div>`);
        if (phase === 'round') {
          const comp = others(judge);
          return view(`${header(g.name)}
            <div class="stage">
              <div class="turn">Juge<strong>🧑‍⚖️ ${esc(judge)}</strong></div>
              <div class="card" style="--g:${g.g}">
                <div class="tag">Le défi</div>
                <div class="txt">${fill(txt, judge)}</div>
                <div class="sub">${comp.map(esc).join(' puis ')} : à vous !</div>
              </div>
              <div class="label">${esc(judge)}, qui gagne ?</div>
              <div class="winners">${comp.map(p => `<button class="btn ok" data-a="win" data-p="${esc(p)}">🏆 ${esc(p)}</button>`).join('')}</div>
              <button class="btn" data-a="skip">Autre défi</button>
              ${board()}
            </div>`);
        }
        const loser = Object.keys(scores).sort((x, y) => scores[x] - scores[y])[0];
        view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:${g.g}">
              <div class="tag">Champion·ne</div>
              <div class="big-num" style="font-size:6rem">👑</div>
              <div class="secret">${esc(champ)}</div>
              <div class="sub">Dernière place : <b>${esc(loser)}</b><br>${esc(pick(gages()))}</div>
            </div>
            <button class="btn primary big block" data-a="again">Revanche</button>
            ${board()}
          </div>`);
      },
      on(a, el) {
        if (a === 't') { target = +el.dataset.v; this.render(); }
        if (a === 'go' || a === 'again') { scores = {}; S.players.forEach(p => scores[p] = 0); this.round(); }
        if (a === 'skip') { txt = d.next(); this.render(); }
        if (a === 'win') {
          const p = el.dataset.p; scores[p]++; beep(1320, .1, 'sine'); buzz(40);
          if (scores[p] >= target) { champ = p; phase = 'end'; beep(990, .3, 'sine'); return this.render(); }
          toast(`+1 pour ${p} !`); this.round();
        }
      },
      round() { judge = rot.next(); txt = d.next(); phase = 'round'; this.render(); }
    };
  },

  /* ---------- Tu me connais ? ---------- */
  connais() {
    const g = G.connais, d = deck(D.connais), rot = rotation();
    let who = rot.next(), q = d.next(), phase = 'pass', ans = -1, right = new Set(), scores = {};
    S.players.forEach(p => scores[p] = 0);
    return {
      render() {
        const guessers = others(who);
        const opts = (mode) => `<div class="opts">${q[1].map((o, i) => `<button class="opt answer ${mode === 'reveal' && i === ans ? 'on' : ''} ${mode === 'reveal' && i !== ans ? 'dim' : ''}" ${mode === 'pick' ? `data-a="ans" data-i="${i}"` : ''}><span class="letter">${'ABCD'[i]}</span><div><b>${esc(o)}</b></div></button>`).join('')}</div>`;
        if (phase === 'pass') return view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:linear-gradient(160deg,#2c2249,#221a3b)">
              <div class="tag">Passe le téléphone à</div>
              <div class="secret">${esc(who)}</div>
              <div class="sub">Les autres ne regardent pas 👀</div>
            </div>
            <button class="btn primary big block" data-a="me">C'est moi</button>
            ${scoreboard(scores)}
          </div>`);
        if (phase === 'pick') return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">${esc(who)}, réponds en secret</div>
            <div class="card" style="--g:${g.g};min-height:150px;flex:none"><div class="txt">${esc(q[0])}</div></div>
            ${opts('pick')}
          </div>`);
        if (phase === 'guess') return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Selon vous, qu'a répondu<strong>${esc(who)} ?</strong></div>
            <div class="card" style="--g:${g.g};min-height:150px;flex:none"><div class="txt">${esc(q[0])}</div></div>
            ${opts('show')}
            <p class="hint">${guessers.map(esc).join(', ')} : annoncez votre réponse à voix haute (A, B, C ou D) !</p>
            <button class="btn primary big block" data-a="reveal">Révéler la réponse</button>
          </div>`);
        view(`${header(g.name)}
          <div class="stage">
            <div class="turn">${esc(who)} a répondu</div>
            <div class="card" style="--g:${g.g};min-height:150px;flex:none"><div class="tag">${esc(q[0])}</div><div class="secret" style="margin-top:14px">${esc(q[1][ans])}</div></div>
            <div class="label">Qui avait trouvé ?</div>
            <div class="winners">${guessers.map(p => `<button class="btn ${right.has(p) ? 'ok' : ''}" data-a="right" data-p="${esc(p)}">${right.has(p) ? '✓ ' : ''}${esc(p)}</button>`).join('')}</div>
            <p class="hint">${S.drinks ? 'Ceux qui se sont trompés boivent une gorgée 🍻' : 'Un point par bonne réponse'}</p>
            <button class="btn primary big block" data-a="next">Question suivante</button>
            ${scoreboard(scores)}
          </div>`);
      },
      on(a, el) {
        if (a === 'me') { phase = 'pick'; this.render(); }
        if (a === 'ans') { ans = +el.dataset.i; buzz(20); phase = 'guess'; this.render(); }
        if (a === 'reveal') { phase = 'reveal'; right = new Set(); beep(990, .15, 'sine'); this.render(); }
        if (a === 'right') { const p = el.dataset.p; right.has(p) ? right.delete(p) : right.add(p); this.render(); }
        if (a === 'next') { right.forEach(p => scores[p]++); who = rot.next(); q = d.next(); phase = 'pass'; this.render(); }
      }
    };
  },

  /* ---------- Synchro ---------- */
  synchro() {
    const g = G.synchro, d = deck(D.synchro), ROUNDS = 10;
    let round = 0, score = 0, theme = d.next(), phase = 'theme', log = [];
    const duo = S.players.length === 2, max = ROUNDS * 3;
    return {
      render() {
        if (phase === 'end') {
          const r = score / max;
          const verdict = r >= .7 ? 'Télépathes certifiés 🧠✨' : r >= .45 ? 'Belle connexion 🤝' : r >= .2 ? 'Ça vient, ça vient… 😅' : 'Vous vivez sur des planètes différentes 🪐';
          return view(`${header(g.name)}
            <div class="stage">
              <div class="card" style="--g:${g.g}">
                <div class="tag">Score de l'équipe</div>
                <div class="big-num" style="font-size:6.5rem">${score}</div>
                <div class="sub">sur ${max} · ${verdict}</div>
                <div class="found" style="margin-top:16px">${log.map(x => `<span class="${x.p ? '' : 'x'}">${esc(x.t)}</span>`).join('')}</div>
              </div>
              <button class="btn primary big block" data-a="again">Rejouer</button>
            </div>`);
        }
        const center = phase === 'count' ? `<div class="big-num" id="cnt">3</div>`
          : phase === 'said' ? `<div class="big-num">🗣️</div><div class="sub" style="font-size:1.3rem;font-weight:700">Alors, pareil ?</div>`
          : `<div class="txt">${esc(theme)}</div><div class="sub">Pensez à un mot… sans rien dire !</div>`;
        view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Manche ${round + 1} / ${ROUNDS} · ${score} pts</div>
            <div class="card" style="--g:${g.g}">
              <div class="tag">${phase === 'theme' ? 'Le thème' : esc(theme)}</div>
              ${center}
            </div>
            ${phase === 'theme' ? `<button class="btn primary big block" data-a="go">3, 2, 1… Dites-le !</button>`
              : phase === 'said' ? (duo
                ? `<div class="row"><button class="btn big" data-a="res" data-v="0">❌ Raté</button><button class="btn ok big" data-a="res" data-v="3">🎉 Pareil ! +3</button></div>`
                : `<div class="winners"><button class="btn ok big" data-a="res" data-v="3">🎉 Tous pareil ! +3</button><button class="btn big" data-a="res" data-v="1">👯 Au moins deux +1</button><button class="btn big" data-a="res" data-v="0">❌ Personne</button></div>`)
              : `<button class="btn big block" disabled>…</button>`}
            <p class="hint">${S.drinks ? 'Personne de synchro ? Tout le monde boit 🍻' : 'Jeu en équipe : visez le meilleur score !'}</p>
          </div>`);
      },
      on(a, el) {
        if (a === 'go') countdown(this, () => { phase = 'said'; this.render(); }, () => { phase = 'count'; this.render(); });
        if (a === 'res') {
          const v = +el.dataset.v; score += v; log.push({ t: theme, p: v > 0 });
          v ? (beep(1320, .1, 'sine'), buzz(40)) : beep(220, .15);
          round++; theme = d.next(); phase = round >= ROUNDS ? 'end' : 'theme'; this.render();
        }
        if (a === 'again') { round = 0; score = 0; log = []; phase = 'theme'; this.render(); }
      }
    };
  },

  /* ---------- L'Imposteur ---------- */
  imposteur() {
    const g = G.imposteur, d = deck(D.imposteur);
    let nImp = 1, mode = 'proche', minutes = 3;
    let phase = 'setup', order = [], idx = 0, shown = false, round = null, left = 0;
    const maxImp = () => Math.max(1, Math.floor((S.players.length - 1) / 2));
    return {
      render() {
        if (phase === 'setup') {
          const imps = [1, 2, 3].filter(n => n <= maxImp());
          return view(`${header(g.name)}
            <div class="stage">
              <p class="hint" style="text-align:left">Tout le monde reçoit le même mot secret… sauf l'imposteur. Chacun à son tour dit <b>un mot</b> qui s'y rapporte, puis on vote pour démasquer l'intrus.</p>
              <div class="label">Version</div>
              <div class="opts">
                <button class="opt ${mode === 'proche' ? 'on' : ''}" data-a="mode" data-v="proche"><span class="r"></span><div><b>Mot proche</b><span>L'imposteur a un mot voisin et ne sait pas qu'il est l'imposteur</span></div></button>
                <button class="opt ${mode === 'vide' ? 'on' : ''}" data-a="mode" data-v="vide"><span class="r"></span><div><b>Sans mot</b><span>L'imposteur sait qu'il l'est et doit bluffer</span></div></button>
              </div>
              <div class="label">Imposteurs</div>
              <div class="seg">${imps.map(n => `<button class="${nImp === n ? 'on' : ''}" data-a="nimp" data-v="${n}">${n}</button>`).join('')}</div>
              <div class="label">Temps de discussion</div>
              <div class="seg">${[2, 3, 5, 0].map(m => `<button class="${minutes === m ? 'on' : ''}" data-a="min" data-v="${m}">${m ? m + ' min' : 'Libre'}</button>`).join('')}</div>
              <div style="flex:1"></div>
              <button class="btn primary big block" data-a="start">Distribuer les mots</button>
            </div>`);
        }
        if (phase === 'deal') {
          const p = order[idx], role = round.roles[p];
          return view(`${header(g.name)}
            <div class="stage reveal">
              <div class="turn">Joueur ${idx + 1} / ${order.length}</div>
              <div class="card" style="--g:${shown ? g.g : 'linear-gradient(160deg,#2c2249,#221a3b)'}">
                ${shown
                  ? (role === 'imp' && mode === 'vide'
                      ? `<div class="tag">${esc(p)}</div><div class="secret">🤫 Tu es l'imposteur</div><div class="sub">Écoute bien les autres et fonds-toi dans la masse.</div>`
                      : `<div class="tag">${esc(p)}, ton mot</div><div class="secret">${esc(role === 'imp' ? round.imp : round.civ)}</div><div class="sub">Mémorise-le et ne le montre à personne.</div>`)
                  : `<div class="tag">Passe le téléphone à</div><div class="secret">${esc(p)}</div><div class="sub">Personne d'autre ne regarde 👀</div>`}
              </div>
              ${shown ? `<button class="btn big block" data-a="hide">J'ai retenu, cacher</button>` : `<button class="btn primary big block" data-a="show">C'est moi, voir mon mot</button>`}
            </div>`);
        }
        if (phase === 'talk') {
          return view(`${header(g.name)}
            <div class="stage">
              <div class="card" style="--g:${g.g}">
                <div class="tag">Discussion</div>
                <div class="txt"><u>${esc(round.first)}</u> commence</div>
                <div class="sub">Chacun dit un mot lié à son mot secret, puis on refait un tour… et on vote ! 🗳️</div>
                ${minutes ? `<div class="clock" id="clk" style="margin-top:18px">${fmt(left)}</div>` : ''}
              </div>
              <button class="btn primary big block" data-a="reveal">Révéler l'imposteur</button>
            </div>`);
        }
        if (phase === 'end') {
          const imps = Object.keys(round.roles).filter(p => round.roles[p] === 'imp');
          return view(`${header(g.name)}
            <div class="stage">
              <div class="card" style="--g:linear-gradient(160deg,#ff5c8a,#8f2059)">
                <div class="tag">${imps.length > 1 ? 'Les imposteurs étaient' : "L'imposteur était"}</div>
                <div class="secret">${imps.map(esc).join(' & ')}</div>
                <div class="sub">Mot des civils : <b>${esc(round.civ)}</b>${mode === 'proche' ? ` · Mot de l'imposteur : <b>${esc(round.imp)}</b>` : ''}</div>
              </div>
              <p class="hint">${S.drinks ? 'Démasqué ? L’imposteur boit 3 gorgées. Raté ? Tous les autres boivent 🍻' : 'Démasqué ? L’imposteur fait un gage. Raté ? Gage pour les autres'}</p>
              <div class="row"><button class="btn" data-a="setup">Réglages</button><button class="btn primary" data-a="start">Rejouer</button></div>
            </div>`);
        }
      },
      on(a, el) {
        if (a === 'mode') { mode = el.dataset.v; this.render(); }
        if (a === 'nimp') { nImp = +el.dataset.v; this.render(); }
        if (a === 'min') { minutes = +el.dataset.v; this.render(); }
        if (a === 'setup') { clearTimers(); phase = 'setup'; this.render(); }
        if (a === 'start') {
          clearTimers();
          nImp = Math.min(nImp, maxImp());
          const pair = shuffle(d.next()); // on échange parfois le sens de la paire
          order = shuffle(S.players);
          const imps = shuffle(order).slice(0, nImp), roles = {};
          order.forEach(p => roles[p] = imps.includes(p) ? 'imp' : 'civ');
          // Le premier à parler n'est jamais l'imposteur en version "sans mot"
          const firstPool = mode === 'vide' ? order.filter(p => roles[p] === 'civ') : order;
          round = { civ: pair[0], imp: pair[1], roles, first: pick(firstPool) };
          idx = 0; shown = false; phase = 'deal'; this.render();
        }
        if (a === 'show') { shown = true; buzz(20); this.render(); }
        if (a === 'hide') {
          shown = false; idx++;
          if (idx >= order.length) {
            phase = 'talk'; left = minutes * 60; this.render();
            if (minutes) every(() => {
              left = Math.max(0, left - 1);
              const c = document.getElementById('clk'); if (c) c.textContent = fmt(left);
              if (left <= 10 && left > 0) beep(700, .05);
              if (left === 0) { clearTimers(); beep(440, .5, 'sawtooth'); buzz([200, 100, 200]); toast('Temps écoulé ! Votez 🗳️'); }
            }, 1000);
          } else this.render();
        }
        if (a === 'reveal') { clearTimers(); phase = 'end'; buzz(80); this.render(); }
      }
    };
  },

  /* ---------- La Bombe ---------- */
  bombe() {
    const g = G.bombe, d = deck(D.bombe); let cat = d.next(), phase = 'ready', gage = '';
    return {
      render() {
        if (phase === 'ready') return view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:${g.g}">
              <div class="tag">Catégorie</div>
              <div class="txt">${esc(cat)}</div>
              <div class="sub">Donne un mot de la catégorie, puis passe vite le téléphone à ta gauche. Pas de répétition ! Celui qui le tient quand ça explose a perdu.</div>
            </div>
            <div class="row"><button class="btn" data-a="other">Autre catégorie</button><button class="btn primary" data-a="light">Allumer la mèche 🔥</button></div>
          </div>`);
        if (phase === 'run') return view(`${header(g.name)}
          <div class="stage" style="text-align:center;justify-content:center">
            <div class="turn">${esc(cat)}</div>
            <div style="flex:1;display:grid;place-items:center"><span class="bomb tick" id="bomb">💣</span></div>
            <p class="hint">Un mot… et on passe ! ➜</p>
          </div>`);
        view(`${header(g.name)}
          <div class="stage shake">
            <div class="card" style="--g:linear-gradient(160deg,#ff3b3b,#7a0f0f)">
              <div class="big-num">💥</div>
              <div class="txt" style="margin-top:10px">BOUM !</div>
              <div class="sub">Celui qui tient le téléphone a perdu.<br><b>${esc(gage)}</b></div>
            </div>
            <button class="btn primary big block" data-a="again">Nouvelle manche</button>
          </div>`);
      },
      on(a) {
        if (a === 'other') { cat = d.next(); this.render(); }
        if (a === 'light') {
          phase = 'run'; this.render();
          const total = 18000 + rnd(30000), t0 = Date.now();
          const loop = () => {
            const el = Date.now() - t0, r = el / total;
            if (r >= 1) {
              phase = 'boom'; gage = pick(gages());
              boomSound(); buzz([400, 80, 400]);
              document.body.classList.add('flash'); later(() => document.body.classList.remove('flash'), 1900);
              return this.render();
            }
            const gap = Math.max(110, 900 * (1 - r * .88));
            beep(r > .8 ? 1200 : 900, .04, 'square', .12);
            const b = document.getElementById('bomb'); if (b) b.style.setProperty('--spd', (gap * 2) + 'ms');
            later(loop, gap);
          };
          loop();
        }
        if (a === 'again') { cat = d.next(); phase = 'ready'; this.render(); }
      }
    };
  },

  /* ---------- Fais deviner ---------- */
  mime() {
    const g = G.mime, d = deck(D.mots);
    const MODES = { parle: ['🗣️ Parle', 'Fais deviner sans dire le mot'], mime: ['🤐 Mime', 'Aucun son, que des gestes'], un: ['☝️ Un seul mot', 'Un seul mot d’indice par carte'] };
    let modes = ['parle', 'mime'], dur = 60, phase = 'setup', rot = rotation(), who = null, mode = null;
    let word = '', got = [], left = 0, scores = {};
    return {
      render() {
        if (phase === 'setup') return view(`${header(g.name)}
          <div class="stage">
            <p class="hint" style="text-align:left">Chacun son tour, un joueur fait deviner un maximum de mots aux autres avant la fin du chrono. Celui qui trouve et celui qui fait deviner marquent un point.</p>
            <div class="label">Façons de jouer (tirées au hasard)</div>
            <div class="opts">${Object.entries(MODES).map(([k, [t, s]]) => `<button class="opt ${modes.includes(k) ? 'on' : ''}" data-a="mode" data-v="${k}"><span class="r"></span><div><b>${t}</b><span>${s}</span></div></button>`).join('')}</div>
            <div class="label">Durée d'un tour</div>
            <div class="seg">${[30, 45, 60, 90].map(s => `<button class="${dur === s ? 'on' : ''}" data-a="dur" data-v="${s}">${s} s</button>`).join('')}</div>
            <div style="flex:1"></div>
            <button class="btn primary big block" data-a="begin">C'est parti</button>
          </div>`);
        if (phase === 'ready') return view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Au tour de<strong>${esc(who)}</strong></div>
            <div class="card" style="--g:${g.g}">
              <div class="tag">Ce tour-ci</div>
              <div class="txt">${MODES[mode][0]}</div>
              <div class="sub">${MODES[mode][1]} · ${dur} secondes<br>Toi seul·e regardes l'écran !</div>
            </div>
            <button class="btn primary big block" data-a="go">Lancer le chrono</button>
            ${scoreboard()}
          </div>`);
        if (phase === 'play') return view(`${header(g.name)}
          <div class="stage">
            <div class="timer"><i id="bar" style="transform:scaleX(${left / dur})"></i></div>
            <div class="clock" id="clk">${left}</div>
            <div class="card" style="--g:${g.g}">
              <div class="tag">${MODES[mode][0]}</div>
              <div class="secret">${esc(word)}</div>
            </div>
            <div class="row">
              <button class="btn big" data-a="skip">Passer</button>
              <button class="btn ok big" data-a="ok">Trouvé ✓</button>
            </div>
          </div>`);
        if (phase === 'done') {
          const n = got.filter(x => x.ok).length;
          return view(`${header(g.name)}
            <div class="stage">
              <div class="card" style="--g:${g.g}">
                <div class="tag">Temps écoulé</div>
                <div class="big-num" style="font-size:6rem">${n}</div>
                <div class="sub">mot${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''} par ${esc(who)}</div>
                <div class="found" style="margin-top:14px">${got.map(x => `<span class="${x.ok ? '' : 'x'}">${esc(x.w)}</span>`).join('')}</div>
              </div>
              <button class="btn primary big block" data-a="nextp">Joueur suivant</button>
              ${scoreboard()}
            </div>`);
        }
      },
      on(a, el) {
        if (a === 'mode') { const v = el.dataset.v; modes = modes.includes(v) ? (modes.length > 1 ? modes.filter(m => m !== v) : modes) : modes.concat(v); this.render(); }
        if (a === 'dur') { dur = +el.dataset.v; this.render(); }
        if (a === 'begin' || a === 'nextp') {
          if (a === 'nextp') scores[who] = (scores[who] || 0) + got.filter(x => x.ok).length;
          who = rot.next(); mode = pick(modes); phase = 'ready'; this.render();
        }
        if (a === 'go') {
          phase = 'play'; left = dur; got = []; word = d.next(); this.render();
          const t0 = Date.now();
          every(() => {
            const l = Math.max(0, dur - (Date.now() - t0) / 1000); left = Math.ceil(l);
            const bar = document.getElementById('bar'), c = document.getElementById('clk');
            if (bar) bar.style.transform = `scaleX(${l / dur})`;
            if (c) c.textContent = left;
            if (l <= 0) { clearTimers(); beep(330, .6, 'sawtooth'); buzz([300, 100, 300]); got.push({ w: word, ok: false }); phase = 'done'; this.render(); }
          }, 200);
          let lastSec = dur;
          every(() => { if (left <= 5 && left > 0 && left !== lastSec) { lastSec = left; beep(880, .06); } }, 100);
        }
        if (a === 'ok' || a === 'skip') {
          got.push({ w: word, ok: a === 'ok' });
          if (a === 'ok') { beep(1320, .08, 'sine'); buzz(30); } else beep(220, .08);
          word = d.next(); this.render();
        }
      }
    };
    function scoreboard() {
      const rows = Object.entries(scores).sort((x, y) => y[1] - x[1]);
      if (!rows.length) return '';
      return `<div class="label">Scores</div><div class="scores">${rows.map(([p, s], i) => `<div class="score ${i === 0 ? 'lead' : ''}"><span>${i === 0 ? '👑 ' : ''}${esc(p)}</span><span>${s}</span></div>`).join('')}</div>`;
    }
  },

  /* ---------- Le Doigt élu ---------- */
  doigt() {
    const g = G.doigt;
    const COLORS = ['#ff5c8a', '#ffb547', '#3ddc97', '#3aa0ff', '#d65cff', '#28c7d9', '#ff8a3d', '#f2c14e', '#7b5cff', '#ff6fb5'];
    let mode = 'un', phase = 'wait', armT = null;
    const pts = new Map();   // identifiant du doigt -> { el, color }
    let zone, label;
    const setLabel = (t) => { if (label) label.innerHTML = t; };
    const idle = () => setLabel(mode === 'un' ? 'Posez tous un doigt sur l’écran…' : 'Posez tous un doigt : deux équipes vont se former…');

    function arm() {
      clearTimeout(armT);
      if (phase === 'done') return;
      if (pts.size >= 2) {
        phase = 'arming'; zone.classList.add('arming'); setLabel('Ne bougez plus…');
        armT = setTimeout(choose, 1600);
        beep(520, .05, 'sine', .08);
      } else { phase = 'wait'; zone.classList.remove('arming'); idle(); }
    }
    function choose() {
      phase = 'done'; zone.classList.remove('arming'); zone.classList.add('done');
      const ids = shuffle([...pts.keys()]);
      if (mode === 'un') {
        const w = ids[0];
        pts.forEach((p, id) => p.el.classList.add(id === w ? 'win' : 'lose'));
        setLabel(`👆 L'élu ! ${S.drinks ? 'Il boit… ou il choisit qui boit 🍻' : esc(pick(gages()))}`);
      } else {
        const half = Math.ceil(ids.length / 2);
        ids.forEach((id, i) => { const p = pts.get(id); const c = i < half ? '#ff5c8a' : '#3aa0ff'; p.el.style.setProperty('--c', c); p.el.classList.add('team'); });
        setLabel('<b style="color:#ff5c8a">● Équipe rose</b> contre <b style="color:#3aa0ff">● Équipe bleue</b>');
      }
      beep(990, .25, 'sine'); buzz([80, 60, 200]);
    }
    function place(t) {
      const r = zone.getBoundingClientRect();
      let p = pts.get(t.identifier);
      if (!p) {
        if (phase === 'done') return;
        const used = new Set([...pts.values()].map(x => x.color));
        const color = COLORS.find(c => !used.has(c)) || pick(COLORS);
        const el = document.createElement('i'); el.className = 'finger'; el.style.setProperty('--c', color);
        zone.appendChild(el); p = { el, color }; pts.set(t.identifier, p); buzz(10);
      }
      p.el.style.left = (t.clientX - r.left) + 'px'; p.el.style.top = (t.clientY - r.top) + 'px';
      return p;
    }
    function onTouch(e) {
      e.preventDefault();
      if (e.type === 'touchstart') { let added = false; [...e.changedTouches].forEach(t => { if (!pts.has(t.identifier) && place(t)) added = true; }); if (added) arm(); }
      if (e.type === 'touchmove') [...e.changedTouches].forEach(t => pts.has(t.identifier) && place(t));
      if (e.type === 'touchend' || e.type === 'touchcancel') {
        [...e.changedTouches].forEach(t => { const p = pts.get(t.identifier); if (p) { if (phase !== 'done') p.el.remove(); pts.delete(t.identifier); } });
        if (phase === 'done') { if (!pts.size) { zone.querySelectorAll('.finger').forEach(x => x.remove()); zone.classList.remove('done'); phase = 'wait'; idle(); } }
        else arm();
      }
    }
    return {
      render() {
        view(`${header(g.name)}
          <div class="seg" style="margin-bottom:12px">
            <button class="${mode === 'un' ? 'on' : ''}" data-a="mode" data-v="un">👆 Un élu</button>
            <button class="${mode === 'eq' ? 'on' : ''}" data-a="mode" data-v="eq">⚔️ Deux équipes</button>
          </div>
          <div class="fzone" id="fz"><p class="flabel" id="fl"></p></div>`, () => {
          zone = document.getElementById('fz'); label = document.getElementById('fl'); idle();
          ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(t => zone.addEventListener(t, onTouch, { passive: false }));
        });
      },
      on(a, el) { if (a === 'mode') { mode = el.dataset.v; clearTimeout(armT); pts.clear(); phase = 'wait'; this.render(); } },
      leave() { clearTimeout(armT); }
    };
  },

  /* ---------- Duel de réflexes ---------- */
  duel() {
    const g = G.duel, TARGET = 5;
    let phase = 'ready', score = [0, 0], goAt = 0, msg = ['', ''], t1 = null, round = 0;
    const NAMES = ['Rose', 'Bleu'];
    const COLORS = ['#ff5c8a', '#3aa0ff'];
    const halves = () => [document.getElementById('h0'), document.getElementById('h1')];
    function paint(cls, texts) {
      halves().forEach((h, i) => {
        if (!h) return;
        h.className = 'dhalf ' + cls + (i === 0 ? ' top' : '');
        h.querySelector('.dmsg').innerHTML = texts[i];
        h.querySelector('.dscore').textContent = `${score[i]} – ${score[1 - i]}`;
      });
    }
    function launch() {
      clearTimeout(t1); round++;
      phase = 'wait'; paint('wait', ['Attends le vert…', 'Attends le vert…']);
      // parfois un faux signal pour piéger les impatients
      const trap = round > 1 && Math.random() < .35;
      const delay = 1500 + Math.random() * 3500;
      if (trap) t1 = setTimeout(() => { phase = 'trap'; paint('trap', ['Piège ! Pas encore…', 'Piège ! Pas encore…']); beep(300, .08); t1 = setTimeout(() => { phase = 'wait'; paint('wait', ['Attends le vert…', 'Attends le vert…']); t1 = setTimeout(go, 800 + Math.random() * 2200); }, 700); }, delay * .6);
      else t1 = setTimeout(go, delay);
    }
    function go() { phase = 'go'; goAt = performance.now(); paint('go', ['TAPE !', 'TAPE !']); beep(1200, .12, 'square', .2); }
    function tap(i) {
      if (phase === 'ready' || phase === 'end') return;
      if (phase === 'result') return;
      clearTimeout(t1);
      let winner, texts;
      if (phase === 'go') {
        const ms = Math.round(performance.now() - goAt);
        winner = i; texts = i === 0 ? [`🏆 Gagné ! ${ms} ms`, 'Trop lent… 🐢'] : ['Trop lent… 🐢', `🏆 Gagné ! ${ms} ms`];
        beep(1320, .1, 'sine'); buzz(60);
      } else {
        winner = 1 - i; const early = phase === 'trap' ? 'Tombé dans le piège 😅' : 'Faux départ ! ❌';
        texts = i === 0 ? [early, '🏆 Point offert !'] : ['🏆 Point offert !', early];
        beep(200, .25, 'sawtooth'); buzz([100, 50, 100]);
      }
      score[winner]++;
      if (score[winner] >= TARGET) {
        phase = 'end';
        const fin = ['', '']; fin[winner] = `👑 ${NAMES[winner]} gagne le duel !`; fin[1 - winner] = S.drinks ? 'Perdu… 3 gorgées 🍻' : 'Perdu… ' + pick(gages());
        paint('end', fin.map((t, k) => `${t}<button class="btn primary" data-a="again" style="margin-top:14px">Revanche</button>`));
        halves().forEach(h => h.querySelectorAll('[data-a="again"]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); score = [0, 0]; round = 0; launch(); })));
        return;
      }
      phase = 'result'; paint('result', texts);
      t1 = setTimeout(launch, 1800);
    }
    return {
      render() {
        const half = (i) => `<div class="dhalf ready${i === 0 ? ' top' : ''}" id="h${i}" style="--c:${COLORS[i]}">
            <div class="dscore">0 – 0</div><div class="dmsg">Joueur ${NAMES[i]}<br><small>Tape ta moitié quand elle devient verte. Premier à ${TARGET} !</small></div></div>`;
        view(`<div class="duel">
            ${half(0)}
            <div class="dmid"><button class="icon-btn" data-a="home" aria-label="Retour">←</button><button class="btn primary" data-a="start" id="dstart">Lancer le duel</button></div>
            ${half(1)}
          </div>`, () => {
          halves().forEach((h, i) => h.addEventListener('pointerdown', e => { e.preventDefault(); tap(i); }));
        });
      },
      on(a) { if (a === 'start') { document.getElementById('dstart')?.remove(); launch(); } },
      leave() { clearTimeout(t1); }
    };
  },

  /* ---------- Main sûre (gyroscope) ---------- */
  main() {
    const g = G.main, names = S.players.length ? S.players.slice() : ['Toi'];
    let idx = 0, phase = 'intro', best = {}, ref = null, t0 = 0, raf = 0, last = null, err = '';
    const START_TOL = 14, END_TOL = 1.2, SHRINK = 25;   // degrés, secondes
    const tolAt = s => Math.max(END_TOL, START_TOL - (START_TOL - END_TOL) * s / SHRINK);
    const onOri = e => { if (e.beta == null) return; last = { b: e.beta, g: e.gamma }; };
    function stop() { cancelAnimationFrame(raf); window.removeEventListener('deviceorientation', onOri); }
    function loop() {
      if (phase !== 'play') return;
      const s = (performance.now() - t0) / 1000;
      if (last && !ref) ref = { ...last };
      const db = last && ref ? last.b - ref.b : 0, dg = last && ref ? last.g - ref.g : 0;
      const dev = Math.hypot(db, dg), tol = tolAt(s);
      const dot = document.getElementById('lvdot'), ring = document.getElementById('lvring'), clk = document.getElementById('lvclk');
      const R = 110, k = R / START_TOL;
      if (dot) dot.style.transform = `translate(${Math.max(-R, Math.min(R, dg * k))}px, ${Math.max(-R, Math.min(R, db * k))}px)`;
      if (ring) ring.style.transform = `scale(${tol / START_TOL})`;
      if (clk) clk.textContent = s.toFixed(1) + ' s';
      if (dev > tol && s > .4) {
        stop(); phase = 'fail'; const sc = Math.round(s * 10) / 10;
        best[names[idx]] = Math.max(best[names[idx]] || 0, sc);
        beep(200, .3, 'sawtooth'); buzz([200, 80, 200]); this_.render(sc); return;
      }
      if (Math.floor(s) !== Math.floor(s - 1 / 60) && s > 1) beep(600 + s * 20, .03, 'sine', .06);
      raf = requestAnimationFrame(loop);
    }
    const this_ = {
      render(sc) {
        const who = names[idx];
        const board = scoreboard(best, 0, ' s');
        if (phase === 'intro' || phase === 'fail') return view(`${header(g.name)}
          <div class="stage">
            ${phase === 'fail' ? `<div class="card" style="--g:linear-gradient(160deg,#ff5c8a,#8f2059);flex:none;min-height:0;padding:26px">
                <div class="tag" style="position:static">Ça a bougé !</div><div class="big-num" style="font-size:5rem">${sc} s</div><div class="sub">${esc(who)}</div></div>` : ''}
            <div class="turn">${phase === 'fail' && names.length > 1 ? 'Au suivant :' : 'À toi'}<strong>${esc(names[phase === 'fail' ? (idx + 1) % names.length : idx])}</strong></div>
            <p class="hint">Tiens le téléphone <b>à plat, dans ta main</b> (pas posé sur la table !). Garde la bille dans le cercle : il rétrécit de plus en plus. Celui qui tient le plus longtemps gagne.</p>
            ${err ? `<p class="errbox">${esc(err)}</p>` : ''}
            <button class="btn primary big block" data-a="go">${phase === 'fail' ? 'Joueur suivant' : 'Je suis prêt·e'}</button>
            ${board}
          </div>`);
        view(`${header(g.name)}
          <div class="stage" style="align-items:center;justify-content:center">
            <div class="turn">${esc(who)}<strong id="lvclk">0.0 s</strong></div>
            <div class="level"><i id="lvring"></i><b id="lvdot"></b></div>
            <p class="hint">Bouge pas… 🤫</p>
          </div>`);
      },
      async on(a) {
        if (a !== 'go') return;
        if (phase === 'fail') idx = (idx + 1) % names.length;
        err = '';
        if (!(await askSensors('orientation'))) { err = 'Impossible d’accéder aux capteurs de mouvement. Sur iPhone, il faut accepter l’autorisation ; sinon ce téléphone n’en a pas.'; phase = 'intro'; return this_.render(); }
        last = null; ref = null; window.addEventListener('deviceorientation', onOri);
        phase = 'play'; this_.render();
        await new Promise(r => setTimeout(r, 900));
        if (!last) { stop(); phase = 'intro'; err = 'Aucun capteur ne répond sur ce téléphone 😕'; return this_.render(); }
        t0 = performance.now(); ref = null; beep(880, .1, 'sine'); loop();
      },
      leave: stop
    };
    return this_;
  },

  /* ---------- Secoue-le (accéléromètre) ---------- */
  secoue() {
    const g = G.secoue, names = S.players.length ? S.players.slice() : ['Toi'], DUR = 5;
    let idx = 0, phase = 'intro', scores = {}, power = 0, t0 = 0, raf = 0, got = false, err = '', lastScore = 0;
    const onMot = e => {
      const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
      const ag = e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null;
      if (!a && !ag) return;          // mesure vide : pas de vrai capteur
      got = true; if (phase !== 'play') return;
      let m;
      if (a) m = Math.hypot(a.x, a.y, a.z);
      else { const q = e.accelerationIncludingGravity || {}; m = Math.abs(Math.hypot(q.x || 0, q.y || 0, q.z || 0) - 9.81); }
      if (m > 1.5) power += m * (e.interval > 1 ? e.interval / 1000 : (e.interval || .016));
    };
    function stop() { cancelAnimationFrame(raf); window.removeEventListener('devicemotion', onMot); }
    function loop() {
      const s = (performance.now() - t0) / 1000, left = Math.max(0, DUR - s);
      const val = Math.round(power * 10);
      const n = document.getElementById('shk'), bar = document.getElementById('shbar'), c = document.getElementById('shclk');
      if (n) n.textContent = val; if (c) c.textContent = left.toFixed(1);
      if (bar) bar.style.transform = `scaleX(${Math.min(1, val / 600)})`;
      if (left <= 0) {
        stop(); phase = 'done'; lastScore = val; scores[names[idx]] = Math.max(scores[names[idx]] || 0, val);
        beep(990, .3, 'sine'); buzz(200); return this_.render();
      }
      raf = requestAnimationFrame(loop);
    }
    const verdict = v => v > 900 ? 'Tremblement de terre 🌋' : v > 550 ? 'Shaker professionnel 🍸' : v > 300 ? 'Pas mal du tout 💪' : v > 120 ? 'Un peu mou… 🥱' : 'Tu dors ? 😴';
    const this_ = {
      render() {
        const board = scoreboard(scores);
        if (phase === 'play') return view(`${header(g.name)}
          <div class="stage" style="text-align:center;justify-content:center">
            <div class="turn">${esc(names[idx])} · <span id="shclk">${DUR}.0</span> s</div>
            <div class="big-num shake-num" id="shk">0</div>
            <div class="timer" style="height:18px"><i id="shbar" style="transform:scaleX(0)"></i></div>
            <p class="hint" style="font-size:1.2rem;font-weight:800;color:var(--text)">SECOUE ! 🫨</p>
          </div>`);
        view(`${header(g.name)}
          <div class="stage">
            ${phase === 'done' ? `<div class="card" style="--g:${g.g};flex:none;min-height:0;padding:26px">
                <div class="tag" style="position:static">${esc(names[idx])}</div><div class="big-num" style="font-size:5.5rem">${lastScore}</div><div class="sub">${verdict(lastScore)}</div></div>` : ''}
            <div class="turn">${phase === 'done' && names.length > 1 ? 'Au suivant :' : 'À toi'}<strong>${esc(names[phase === 'done' ? (idx + 1) % names.length : idx])}</strong></div>
            <p class="hint">Tiens <b>fermement</b> le téléphone (dragonne ou deux mains 😅) et secoue-le le plus fort possible pendant ${DUR} secondes.</p>
            ${err ? `<p class="errbox">${esc(err)}</p>` : ''}
            <button class="btn primary big block" data-a="go">${phase === 'done' ? 'Joueur suivant' : 'C’est parti !'}</button>
            ${board}
          </div>`);
      },
      async on(a) {
        if (a !== 'go') return;
        if (phase === 'done') idx = (idx + 1) % names.length;
        err = '';
        if (!(await askSensors('motion'))) { err = 'Impossible d’accéder aux capteurs de mouvement. Sur iPhone, il faut accepter l’autorisation.'; phase = 'intro'; return this_.render(); }
        got = false; power = 0; window.addEventListener('devicemotion', onMot);
        phase = 'count'; view(`${header(g.name)}<div class="stage" style="justify-content:center;text-align:center"><div class="big-num" id="cnt">3</div><p class="hint">${esc(names[idx])}, prépare-toi…</p></div>`);
        countdown(this_, () => {
          if (!got) { stop(); phase = 'intro'; err = 'Aucun capteur ne répond sur ce téléphone 😕'; return this_.render(); }
          phase = 'play'; power = 0; t0 = performance.now(); this_.render(); loop();
        }, () => {});
      },
      leave: stop
    };
    return this_;
  },

  /* ---------- Énigmes ---------- */
  enigmes() {
    const g = G.enigmes, d = deck(D.enigmes), DUR = 60;
    let e = d.next(), phase = 'think', hint = false, left = DUR, n = 1, team = 0, scores = {};
    const start = () => {
      clearTimers(); left = DUR;
      every(() => {
        left--; const c = document.getElementById('enclk'), bar = document.getElementById('enbar');
        if (c) c.textContent = left; if (bar) bar.style.transform = `scaleX(${left / DUR})`;
        if (left <= 10 && left > 0) beep(700, .04);
        if (left <= 0) { clearTimers(); phase = 'reveal'; beep(300, .4, 'sawtooth'); buzz(200); this_.render(); }
      }, 1000);
    };
    const this_ = {
      render() {
        const think = phase === 'think';
        view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Énigme ${n} · équipe ${team} pt${team > 1 ? 's' : ''}</div>
            ${think ? `<div class="timer"><i id="enbar" style="transform:scaleX(${left / DUR})"></i></div><div class="clock" id="enclk" style="font-size:2.4rem">${left}</div>` : ''}
            <div class="card" style="--g:${g.g}">
              <div class="tag">${think ? 'Réfléchissez ensemble' : 'Réponse'}</div>
              <div class="txt" style="font-size:clamp(1.25rem,5.4vw,1.7rem)">${esc(e[0])}</div>
              ${hint && think ? `<div class="sub">💡 ${esc(e[2])}</div>` : ''}
              ${!think ? `<div class="secret" style="margin-top:16px;font-size:clamp(1.5rem,7vw,2.2rem)">${esc(e[1])}</div>` : ''}
            </div>
            ${think ? `<div class="row"><button class="btn" data-a="hint" ${hint ? 'disabled' : ''}>💡 Indice</button><button class="btn primary" data-a="show">Voir la réponse</button></div>`
              : `${S.players.length ? `<div class="label">Qui a trouvé ?</div><div class="chips" style="margin-top:0">${S.players.map(p => `<button class="chip pickp" data-a="who" data-p="${esc(p)}" style="padding-right:14px">${esc(p)}</button>`).join('')}<button class="chip pickp" data-a="who" data-p="" style="padding-right:14px">Personne 😅</button></div>`
                  : `<div class="row"><button class="btn" data-a="who" data-p="">Raté 😅</button><button class="btn ok" data-a="who" data-p="*">On a trouvé ✓</button></div>`}`}
            ${scoreboard(scores)}
          </div>`);
      },
      on(a, el) {
        if (a === 'hint') { hint = true; this_.render(); }
        if (a === 'show') { clearTimers(); phase = 'reveal'; this_.render(); }
        if (a === 'who') {
          const p = el.dataset.p;
          if (p) { team++; beep(1320, .1, 'sine'); buzz(40); if (p !== '*') scores[p] = (scores[p] || 0) + 1; }
          e = d.next(); n++; hint = false; phase = 'think'; this_.render(); start();
        }
      }
    };
    setTimeout(start, 0);
    return this_;
  },

  /* ---------- Le Yams ---------- */
  yams() {
    const g = G.yams, names = S.players.slice();
    const CATS = [
      ['1', 'As', d => sumOf(d, 1)], ['2', 'Deux', d => sumOf(d, 2)], ['3', 'Trois', d => sumOf(d, 3)],
      ['4', 'Quatre', d => sumOf(d, 4)], ['5', 'Cinq', d => sumOf(d, 5)], ['6', 'Six', d => sumOf(d, 6)],
      ['brelan', 'Brelan', d => maxSame(d) >= 3 ? total(d) : 0], ['carre', 'Carré', d => maxSame(d) >= 4 ? total(d) : 0],
      ['full', 'Full', d => { const c = counts(d).filter(Boolean).sort(); return c.length === 2 && c[0] === 2 && c[1] === 3 ? 25 : 0; }],
      ['petite', 'Petite suite', d => [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some(q => q.every(v => d.includes(v))) ? 30 : 0],
      ['grande', 'Grande suite', d => { const u = [...new Set(d)].sort().join(''); return u === '12345' || u === '23456' ? 40 : 0; }],
      ['yams', 'Yams', d => maxSame(d) === 5 ? 50 : 0], ['chance', 'Chance', d => total(d)]
    ];
    function counts(d) { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++); return c; }
    function sumOf(d, v) { return d.filter(x => x === v).length * v; }
    function total(d) { return d.reduce((a, b) => a + b, 0); }
    function maxSame(d) { return Math.max(...counts(d)); }
    const sheets = {}; names.forEach(p => sheets[p] = {});
    const upper = p => CATS.slice(0, 6).reduce((a, [k]) => a + (sheets[p][k] || 0), 0);
    const bonus = p => upper(p) >= 63 ? 35 : 0;
    const score = p => CATS.reduce((a, [k]) => a + (sheets[p][k] || 0), 0) + bonus(p);
    let turn = 0, dice = [1, 1, 1, 1, 1], held = [false, false, false, false, false], rolls = 0, rolling = false;
    const who = () => names[turn % names.length];
    const done = () => names.every(p => CATS.every(([k]) => k in sheets[p]));
    const dieHtml = (v, i) => `<button class="die ${held[i] ? 'held' : ''} ${rolling && !held[i] ? 'roll' : ''}" data-a="hold" data-i="${i}" ${rolls ? '' : 'disabled'} aria-label="Dé ${v}">
        ${[...Array(9)].map((_, k) => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('')}</button>`;
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    return {
      render() {
        if (done()) {
          const rank = names.slice().sort((a, b) => score(b) - score(a));
          return view(`${header(g.name)}
            <div class="stage">
              <div class="card" style="--g:${g.g};flex:none;min-height:0;padding:24px 18px">
                <div class="tag" style="position:static;margin-bottom:12px">Partie terminée</div>
                <div class="ranking">${rank.map((p, i) => `<div><span>${i + 1}.</span><b>${esc(p)}${i === 0 ? ' 👑' : ''}</b><em>${score(p)} pts</em></div>`).join('')}</div>
              </div>
              <p class="hint">${S.drinks ? `${esc(rank[rank.length - 1])} boit 3 gorgées 🍻` : `Gage pour ${esc(rank[rank.length - 1])} : ${esc(pick(gages()))}`}</p>
              <button class="btn primary big block" data-a="again">Rejouer</button>
            </div>`);
        }
        const p = who(), sh = sheets[p];
        const row = ([k, label, f], i) => {
          const filled = k in sh, pot = rolls ? f(dice) : null;
          return `<button class="yrow ${filled ? 'filled' : ''} ${!filled && pot ? 'good' : ''}" ${!filled && rolls ? `data-a="pick" data-k="${k}"` : 'disabled'}>
            <span>${label}</span><b>${filled ? sh[k] : rolls ? pot : '–'}</b></button>${i === 5 ? `<div class="ybonus">Bonus (63+ en haut) <b>${upper(p)} / 63 ${bonus(p) ? '✓ +35' : ''}</b></div>` : ''}`;
        };
        view(`${header(g.name)}
          <div class="stage">
            <div class="turn">Au tour de<strong>${esc(p)} · ${score(p)} pts</strong></div>
            <div class="dice">${dice.map(dieHtml).join('')}</div>
            <p class="hint" style="margin-top:-4px">${rolls === 0 ? 'Lance les dés !' : rolls < 3 ? 'Touche les dés à garder, relance, ou choisis une case.' : 'Choisis une case pour marquer.'}</p>
            <button class="btn primary big block" data-a="roll" ${rolls >= 3 || rolling ? 'disabled' : ''}>🎲 ${rolls === 0 ? 'Lancer' : `Relancer (${3 - rolls})`}</button>
            <div class="ysheet">${CATS.map(row).join('')}</div>
            ${names.length > 1 ? `<div class="scores">${names.map(q => `<div class="score ${q === p ? 'lead' : ''}"><span>${esc(q)}</span><span>${score(q)}</span></div>`).join('')}</div>` : ''}
          </div>`, null, true);
      },
      on(a, el) {
        if (a === 'roll' && rolls < 3 && !rolling) {
          rolling = true; rolls++; let n = 0; this.render();
          const spin = every(() => {
            dice = dice.map((v, i) => held[i] ? v : 1 + rnd(6)); n++;
            document.querySelectorAll('.die').forEach((d, i) => { if (!held[i]) d.innerHTML = [...Array(9)].map((_, k) => `<i class="${PIPS[dice[i]].includes(k) ? 'on' : ''}"></i>`).join(''); });
            beep(300 + rnd(300), .02, 'triangle', .05);
            if (n >= 8) { clearInterval(spin); rolling = false; buzz(20); if (maxSame(dice) === 5) { toast('🎲 YAMS !!!'); buzz([100, 50, 100, 50, 300]); } this.render(); }
          }, 60);
        }
        if (a === 'hold' && rolls && !rolling) { const i = +el.dataset.i; held[i] = !held[i]; buzz(8); this.render(); }
        if (a === 'pick') {
          const k = el.dataset.k, c = CATS.find(x => x[0] === k);
          sheets[who()][k] = c[2](dice);
          turn++; rolls = 0; held = held.map(() => false);
          if (!done() && names.length > 1) toast(`À ${who()} !`);
          this.render();
        }
        if (a === 'again') { names.forEach(p => sheets[p] = {}); turn = 0; rolls = 0; held = held.map(() => false); this.render(); }
      }
    };
  },

  /* ---------- La Roue ---------- */
  roue() {
    const g = G.roue; let name = '?', spinning = false, final = false, gage = '';
    return {
      render() {
        view(`${header(g.name)}
          <div class="stage">
            <div class="card" style="--g:${g.g}">
              <div class="tag">Le hasard a choisi</div>
              <div class="wheel-name ${final ? 'final' : ''}" id="wn">${esc(name)}</div>
              ${final ? `<div class="sub"><b>${esc(gage)}</b></div>` : ''}
            </div>
            <div class="row">
              <button class="btn" data-a="mode-gage" ${spinning ? 'disabled' : ''}>🎲 + Gage</button>
              <button class="btn primary" data-a="spin" ${spinning ? 'disabled' : ''}>Tourner</button>
            </div>
            <p class="hint">Pour savoir qui commence, qui ressert, ou qui fait le gage.</p>
          </div>`);
      },
      on(a) {
        if (a !== 'spin' && a !== 'mode-gage') return;
        const withGage = a === 'mode-gage';
        spinning = true; final = false; this.render();
        const target = pick(S.players), steps = 22 + rnd(8); let i = 0, list = shuffle(S.players);
        const step = () => {
          i++;
          const el = document.getElementById('wn');
          name = i >= steps ? target : list[i % list.length];
          if (el) el.textContent = name;
          beep(500 + i * 25, .03, 'triangle', .1);
          if (i >= steps) { spinning = false; final = true; gage = withGage ? pick(gages()) : ''; buzz(80); return this.render(); }
          later(step, 40 + Math.pow(i / steps, 3) * 380);
        };
        step();
      }
    };
  },

  /* ---------- Mes cartes ---------- */
  cartes() {
    const TABS = { verite: 'Vérités', action: 'Actions', jamais: "Je n'ai jamais", qui: 'Qui pourrait', preferes: 'Tu préfères' };
    const PH = {
      verite: "Une question par ligne\nEx : Qu'est-ce que tu penses vraiment de {p} ?",
      action: "Une action par ligne\nEx : Fais un câlin à {p}",
      jamais: "Une phrase par ligne\nEx : Je n'ai jamais raté un apéro chez Julien",
      qui: "Une fin de phrase par ligne\nEx : finir la soirée en pyjama ?",
      preferes: "Deux choix séparés par « / »\nEx : Être riche / Être célèbre"
    };
    let tab = 'verite';
    return {
      render() {
        view(`${header('Mes cartes')}
          <div class="stage">
            <p class="hint" style="text-align:left">Ajoute vos propres cartes, vos blagues internes… Elles se mélangent aux autres. Écris <b>{p}</b> pour insérer un joueur au hasard.</p>
            <div class="tabs">${Object.entries(TABS).map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${t}${S.custom[k]?.length ? ' · ' + S.custom[k].length : ''}</button>`).join('')}</div>
            <textarea id="ta" placeholder="${esc(PH[tab])}">${esc((S.custom[tab] || []).join('\n'))}</textarea>
            <button class="btn primary big block" data-a="save">Enregistrer</button>
          </div>`);
      },
      on(a, el) {
        if (a === 'tab') { this.store(); tab = el.dataset.v; this.render(); }
        if (a === 'save') { this.store(); toast('Cartes enregistrées ✓'); this.render(); }
      },
      store() {
        const ta = document.getElementById('ta'); if (!ta) return;
        S.custom[tab] = ta.value.split('\n').map(s => s.trim()).filter(Boolean); save();
      }
    };
  },

  /* ---------- Règles ---------- */
  regles() {
    return {
      render() {
        view(`${header('Règles')}
          <div class="rules">
            <p>Ajoute tous les joueurs sur l'accueil, puis fais tourner le téléphone. Active « Avec alcool » pour jouer aux gorgées, ou désactive-le pour des gages à la place. Buvez avec modération, et de l'eau entre deux verres 💧</p>
            <h3>🎭 Action ou Vérité</h3><p>Le joueur désigné choisit Action ou Vérité. Il refuse ? Il prend le Joker (gorgées ou gage).</p>
            <h3>🙊 Je n'ai jamais</h3><p>On lit la carte à voix haute. Ceux qui l'ont déjà fait boivent (ou perdent un point). Les révélations sont encouragées.</p>
            <h3>🧑‍⚖️ Le Juge <small>3-4 joueurs</small></h3><p>À chaque manche, un joueur est le juge. Les autres relèvent le défi à tour de rôle, et le juge désigne le meilleur, qui marque un point. Le juge change à chaque manche. Premier au score visé : champion !</p>
            <h3>🔮 Tu me connais ? <small>2-4 joueurs</small></h3><p>Le téléphone pose une question à un joueur, qui répond en secret. Les autres annoncent à voix haute ce qu'il a répondu selon eux. Un point par bonne réponse.</p>
            <h3>🧠 Synchro <small>2-4 joueurs</small></h3><p>Un thème s'affiche. À « 3, 2, 1 », tout le monde dit un mot en même temps. Le but : dire le même mot ! Jeu en équipe, 10 manches pour faire le meilleur score.</p>
            <h3>📡 Jouer en ligne</h3><p>Chacun sur son téléphone : un joueur crée la partie, les autres entrent le code (ou ouvrent le lien d'invitation). Il faut internet sur chaque téléphone, le même wifi c'est l'idéal. Le téléphone qui a créé la partie doit garder l'appli ouverte.</p>
            <h3>🃏 Président <small>en ligne · 3-8 joueurs</small></h3><p>Toutes les cartes sont distribuées. Le premier joueur pose 1 à 4 cartes de même valeur ; les suivants doivent poser le même nombre de cartes, de valeur égale ou plus forte, ou passer. Ordre : 3 (la plus faible) … 10, Valet, Dame, Roi, As, 2 (la plus forte). Un 2 ferme le pli. Quand tout le monde passe, celui qui a joué en dernier repart. Le premier à vider sa main est Président, le dernier Trou du cul : à la manche suivante, il donne ses 2 meilleures cartes au Président.</p>
            <h3>🎭 Le Bluff <small>en ligne · 3-10</small></h3><p>Un mot très rare s'affiche. Chacun invente une fausse définition, puis toutes les définitions (la vraie au milieu) sont mélangées : votez pour celle que vous croyez vraie. +2 si tu trouves la vraie, +1 pour chaque joueur piégé par la tienne.</p>
            <h3>💬 Le Mot de la fin <small>en ligne · 3-12</small></h3><p>Une phrase à compléter : chacun écrit sa réponse la plus drôle, elles s'affichent sans les noms et on vote pour la meilleure (pas la sienne !). Un point par vote, bonus si tout le monde l'a choisie.</p>
            <h3>🕵️‍♀️ Qui a écrit ça ? <small>en ligne · 3-12</small></h3><p>Une question perso : chacun répond en secret. Les réponses s'affichent une par une, sans nom, et tout le monde vote pour l'auteur. Un point si tu le reconnais ; l'auteur marque un point pour chaque joueur qu'il a trompé.</p>
            <h3>👉 🔮 🧠 Qui pourrait…, Tu me connais ?, Synchro <small>en ligne</small></h3><p>Les mêmes jeux qu'en local, mais chacun vote ou répond en secret sur son téléphone, et tout est révélé en même temps.</p>
            <h3>📏 Estimations <small>en ligne · 2-16</small></h3><p>Une question chiffrée (« Combien d'os dans le corps humain ? ») : chacun donne son estimation, le plus proche marque 3 points, puis 2 et 1.</p>
            <h3>🐺 Loups-garous <small>en ligne · 5-16 joueurs</small></h3><p>Chacun reçoit un rôle secret : loup-garou, voyante, docteur ou villageois. La nuit, tout le monde touche son écran (les loups choisissent une victime, la voyante espionne, le docteur protège, les villageois font semblant). Le jour, on découvre la victime, on débat et on vote pour éliminer un suspect. Le village gagne s'il élimine tous les loups ; les loups gagnent s'ils sont aussi nombreux que les autres.</p>
            <h3>📞 Le Téléphone dessiné <small>en ligne · 3-10 joueurs</small></h3><p>Chacun écrit une phrase. Elle passe au voisin, qui la dessine ; le suivant devine le dessin par écrit ; le suivant redessine sa devinette… À la fin, on fait défiler chaque chaîne pour voir comment la phrase s'est transformée.</p>
            <h3>🎨 Le Dessin <small>en ligne · 2-10 joueurs</small></h3><p>Chacun son tour, un joueur reçoit un mot secret et le dessine sur son téléphone : le dessin apparaît en direct chez les autres, qui tapent leurs propositions. 80 secondes par dessin, la première lettre s'affiche à mi-temps. Trouver vite rapporte 3, 2 puis 1 point ; le dessinateur gagne 1 point par joueur qui trouve.</p>
            <h3>📝 Le Petit Bac <small>en ligne · 2-10 joueurs</small></h3><p>Une lettre et 6 catégories tirées au hasard. Chacun remplit sur son téléphone ; le premier qui a fini appuie sur STOP et les autres ont 10 secondes. Réponse valable : 10 points, 5 si quelqu'un a la même. L'hôte peut refuser une réponse douteuse.</p>
            <h3>🔔 Quiz buzzer <small>en ligne · 2-12 joueurs</small></h3><p>12 questions de culture générale s'affichent sur tous les téléphones. Le premier qui appuie sur BUZZ a 8 secondes pour répondre. Faux ? Il est bloqué et les autres peuvent buzzer. Un point par bonne réponse.</p>
            <h3>⚡ Courses en direct <small>en ligne</small></h3><p><b>Course de taps</b> : le plus de taps en 10 secondes, classement en direct. <b>Réflexes en groupe</b> : touche ton écran dès qu'il devient vert ; le plus rapide marque, le plus lent (ou celui qui touche trop tôt) a perdu. <b>Mots cachés</b> : la même grille sur tous les téléphones, touche la première puis la dernière lettre d'un mot ; le premier qui le trouve marque (2 points pour les mots de 7 lettres et plus).</p>
            <h3>♟️ Plateau en ligne <small>2 joueurs, les autres regardent</small></h3><p>Bataille navale, Aligne 4, Morpion géant (5 alignés sur 15×15), Dames (règles internationales : prise obligatoire et majoritaire, dames volantes) et Échecs (règles complètes). Avec plus de 2 joueurs : « le gagnant reste », le perdant laisse sa place au suivant de la file. On peut abandonner ou proposer le match nul.</p>
            <h3>♠️ Poker <small>en ligne · 2-8 · jetons fictifs</small></h3><p>Texas Hold'em : 2 cartes cachées chacun, 5 cartes communes (flop, turn, river). Blindes 10/20, 1000 jetons au départ. Parole, suivre, relancer ou se coucher ; à l'abattage la meilleure main de 5 cartes gagne (pots annexes gérés pour les tapis). L'hôte peut recaver les joueurs éliminés.</p>
            <h3>🎴 8 américain <small>en ligne · 2-8</small></h3><p>Pose une carte de la même couleur ou de la même valeur que celle du dessus. Le 8 se pose sur tout et change la couleur ; le 2 fait piocher 2 au suivant (cumulable avec un autre 2) ; le Valet fait passer le tour ; l'As change le sens. Pas de carte jouable ? Pioche. Le premier qui vide sa main gagne.</p>
            <h3>🂮 Belote <small>en ligne · 4 joueurs</small></h3><p>Deux équipes (partenaires face à face), 32 cartes. Enchères en deux tours sur la carte retournée. Il faut fournir la couleur demandée ; sinon couper (sauf si ton partenaire est maître) et monter à l'atout si possible. Atout : Valet 20, 9 14, As 11, 10 10, Roi 4, Dame 3. Belote-rebelote +20, dix de der +10, capot 252. Si l'équipe qui a pris fait moins que l'autre, elle est « dedans » : 162 pour la défense. Partie en 501 (sans annonces).</p>
            <h3>🂡 Blackjack <small>en ligne · 1-7 · jetons fictifs</small></h3><p>Tout le monde joue en même temps contre la banque. Approche-toi de 21 sans dépasser : Carte, Rester ou Doubler. Un Blackjack (As + figure) paie 3 pour 2 ; la banque tire jusqu'à 17.</p>
            <h3>🎲 Le Menteur <small>en ligne · 2-8 joueurs</small></h3><p>Chacun a 5 dés cachés sur son téléphone. À tour de rôle, on annonce combien de dés d'une face il y a au total sur la table (« au moins 4 × 5 ») en surenchérissant à chaque fois, ou on crie « Menteur ! ». On révèle : si l'annonce était vraie, l'accusateur perd un dé, sinon c'est le menteur. Le dernier à avoir des dés gagne.</p>
            <h3>🕵️ L'Imposteur</h3><p>Chacun regarde son mot en secret. Tour à tour, chacun dit un mot qui s'y rapporte, sans être trop évident. Après un ou deux tours, on vote pour éliminer l'imposteur. En version « mot proche », l'imposteur ne sait même pas qu'il l'est !</p>
            <h3>💣 La Bombe</h3><p>Une catégorie s'affiche. On allume la mèche, on donne un mot et on passe le téléphone. La bombe explose au hasard : celui qui la tient a perdu.</p>
            <h3>👉 Qui pourrait…</h3><p>On lit la phrase, compte à rebours, et tout le monde pointe quelqu'un en même temps. Le plus désigné boit autant de gorgées que de doigts pointés sur lui.</p>
            <h3>⚖️ Tu préfères ?</h3><p>Deux choix, tout le monde vote à main levée en même temps. La minorité boit. Il faut justifier les choix bizarres.</p>
            <h3>⏱️ Fais deviner</h3><p>Un joueur fait deviner un max de mots en un temps limité, en parlant, en mimant ou avec un seul mot. Il marque un point par mot trouvé.</p>
            <h3>👆 Le Doigt élu</h3><p>Tout le monde pose un doigt sur l'écran. Quand plus personne ne bouge, l'appli en choisit un au hasard… ou forme deux équipes. Pas besoin d'entrer les prénoms.</p>
            <h3>⚡ Duel de réflexes <small>2 joueurs</small></h3><p>Posez le téléphone à plat entre vous deux : chacun a sa moitié d'écran. Tapez dès qu'elle devient verte. Taper trop tôt (ou sur le piège jaune) donne le point à l'adversaire. Premier à 5 !</p>
            <h3>🫳 Main sûre</h3><p>Chacun son tour, tiens le téléphone à plat dans ta main et garde la bille dans le cercle, qui rétrécit. Le plus long temps gagne. Sur iPhone, accepte l'accès aux capteurs de mouvement.</p>
            <h3>🫨 Secoue-le</h3><p>Chacun son tour, secoue le téléphone le plus fort possible pendant 5 secondes. Tiens-le bien !</p>
            <h3>🧩 Énigmes</h3><p>Une devinette, une charade ou un casse-tête : vous avez 60 secondes pour trouver ensemble. Un indice est disponible si vous bloquez. Celui qui trouve marque un point (et l'équipe aussi).</p>
            <h3>🎲 Le Yams</h3><p>Chacun son tour : 3 lancers maximum, on garde les dés qu'on veut entre deux lancers, puis on inscrit le résultat dans une case (une seule fois par case). Brelan et Carré = total des dés, Full = 25, Petite suite = 30, Grande suite = 40, Yams = 50. Bonus de 35 si le haut de la grille atteint 63.</p>
            <h3>🎡 La Roue</h3><p>Le hasard désigne un joueur, avec ou sans gage. Pratique pour savoir qui commence… ou qui va chercher les glaçons.</p>
            <p style="margin-top:22px">Tout reste sur ton téléphone : aucune donnée envoyée, aucun compte, aucune pub.</p>
          </div>`);
      }
    };
  }
};

/* Autorisation des capteurs de mouvement (obligatoire sur iPhone, après un appui) */
async function askSensors(kind) {
  const Ev = kind === 'motion' ? window.DeviceMotionEvent : window.DeviceOrientationEvent;
  if (!Ev) return true;   // on tente quand même : l'absence de mesures sera détectée ensuite
  if (typeof Ev.requestPermission === 'function') {
    try { return (await Ev.requestPermission()) !== 'denied'; } catch { return false; }
  }
  return true;
}

/* Compte à rebours 3-2-1 dans l'élément #cnt */
function countdown(game, done, startPhase) {
  startPhase(); let c = 3; beep(660, .08, 'sine');
  const id = every(() => {
    c--; const el = document.getElementById('cnt');
    if (c > 0 && el) { el.textContent = c; el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; beep(660, .08, 'sine'); }
    else { clearInterval(id); beep(990, .25, 'sine'); buzz(120); done(); }
  }, 800);
}
function scoreboard(scores, target, unit = '') {
  const rows = Object.entries(scores).sort((x, y) => y[1] - x[1]);
  if (!rows.length || rows.every(r => !r[1])) return '';
  return `<div class="label">Scores${target ? ` · premier à ${target}` : ''}</div><div class="scores">${rows.map(([p, s], i) => `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}</span><span>${s}${unit}</span></div>`).join('')}</div>`;
}

function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* ================= Démarrage ================= */
/* Thème du mode épicé */
function applyTheme() {
  document.documentElement.classList.toggle('spicy', !!S.spicy);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = S.spicy ? '#1a0606' : '#120d1f';
}
applyTheme();

/* Boîte à outils partagée avec online.js (mode connecté) */
window.APERO = { D, S, store, esc, rnd, pick, shuffle, deck, view, header, toast, buzz, beep, gages, later, every, clearTimers,
  makers, openPage, VERSION, joinCode: null };

/* Démarrage une fois tous les scripts chargés (online.js ajoute ses écrans) */
document.addEventListener('DOMContentLoaded', () => {
  const startHash = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  showHome();
  const join = startHash.match(/^join=([A-Za-z0-9]{4})$/);
  if (join && makers.online) { APERO.joinCode = join[1].toUpperCase(); openPage('online'); }
  else if (makers[startHash] && (!G[startHash] || G[startHash].free || S.players.length >= minPlayers(startHash))) (G[startHash] ? openGame : openPage)(startHash);
});

/* ================= Mises à jour ================= */
/* Pendant que l'appli est ouverte, on regarde toutes les minutes (et à chaque retour
   sur l'appli) le numéro publié dans version.json. S'il est plus récent que celui
   qui tourne, une fenêtre propose d'actualiser. */
let swReg = null, updShownFor = 0, updDismissed = 0;
async function checkVersion() {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const { version } = await r.json();
    if (version > VERSION) showUpdate(version);
  } catch {}
}
function showUpdate(v) {
  if (document.querySelector('.upd') || updShownFor >= v && Date.now() - updDismissed < 10 * 60 * 1000) return;
  updShownFor = v || updShownFor;
  swReg && swReg.update().catch(() => {});   // commence à télécharger tout de suite
  const inGame = !!current;
  const w = document.createElement('div');
  w.className = 'upd';
  w.innerHTML = `<div class="box" role="dialog" aria-modal="true">
      <div class="ico">✨</div>
      <h3>Nouvelle version disponible</h3>
      <p>${v ? `Tu as la version ${VERSION}, la version ${v} est sortie.` : 'Une mise à jour est prête.'}${inGame ? '<br><b>La partie en cours sera interrompue.</b>' : ''}</p>
      <button class="btn primary big block go">Actualiser</button>
      <button class="later">Plus tard</button>
    </div>`;
  w.querySelector('.go').addEventListener('click', applyUpdate);
  w.querySelector('.later').addEventListener('click', () => { updDismissed = Date.now(); w.remove(); });
  document.body.appendChild(w);
  buzz(30);
}
async function applyUpdate() {
  const btn = document.querySelector('.upd .go'); if (btn) { btn.disabled = true; btn.textContent = 'Mise à jour…'; }
  try {
    if (swReg) {
      await swReg.update();
      const sw = swReg.installing || swReg.waiting;
      if (sw) await new Promise(ok => {
        const t = setTimeout(ok, 8000);
        navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); ok(); }, { once: true });
      });
    }
  } catch {}
  location.reload();
}
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdate(0); });
  window.addEventListener('load', async () => {
    try { swReg = await navigator.serviceWorker.register('sw.js'); } catch {}
  });
}
document.addEventListener('visibilitychange', checkVersion);
window.addEventListener('online', checkVersion);
window.addEventListener('focus', checkVersion);
setInterval(checkVersion, 60 * 1000);
setTimeout(checkVersion, 3000);
})();
