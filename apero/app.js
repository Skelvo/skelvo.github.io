(() => {
'use strict';

const D = window.DATA;
const VERSION = 2;
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
  const base = src.soft.concat(S.spicy ? src.hot : []);
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
const G = {
  aov:      { name: 'Action ou Vérité', e: '🎭', d: 'Le classique, en mieux', g: 'linear-gradient(150deg,#ff5c8a,#b0306e)', min: 2 },
  jamais:   { name: "Je n'ai jamais", e: '🙊', d: 'Les secrets sortent', g: 'linear-gradient(150deg,#7b5cff,#4b2bb8)', min: 2 },
  imposteur:{ name: "L'Imposteur", e: '🕵️', d: 'Qui n’a pas le même mot ?', g: 'linear-gradient(150deg,#1fb5a4,#0e6a71)', min: 3 },
  bombe:    { name: 'La Bombe', e: '💣', d: 'Réponds avant le boum', g: 'linear-gradient(150deg,#ff8a3d,#d13b1f)', min: 2 },
  qui:      { name: 'Qui pourrait…', e: '👉', d: 'Tout le monde pointe', g: 'linear-gradient(150deg,#ffb547,#e0702a)', min: 3 },
  preferes: { name: 'Tu préfères ?', e: '⚖️', d: 'Choix impossibles', g: 'linear-gradient(150deg,#3aa0ff,#2952d6)', min: 2 },
  mime:     { name: 'Fais deviner', e: '⏱️', d: 'Mime, parle, un seul mot', g: 'linear-gradient(150deg,#3ddc97,#16865c)', min: 2 },
  roue:     { name: 'La Roue', e: '🎡', d: 'Le hasard désigne un joueur', g: 'linear-gradient(150deg,#d65cff,#7a2bb8)', min: 2 }
};

let current = null;   // jeu en cours (objet avec render)

function header(title, extra = '') {
  return `<div class="top"><button class="icon-btn" data-a="home" aria-label="Retour">←</button><h1>${esc(title)}</h1>${extra}</div>`;
}
function view(html, after) {
  $app.innerHTML = html;
  $app.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', onAction));
  after && after();
  window.scrollTo(0, 0);
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
  if (S.players.length < g.min) { toast(`Ajoute au moins ${g.min} joueurs pour ce jeu 🙂`); document.querySelector('#pname')?.focus(); return; }
  history.pushState({ g: id }, '', '#' + id);
  start(id);
}
function openPage(id) { history.pushState({ p: id }, '', '#' + id); start(id); }
function start(id) {
  clearTimers();
  current = makers[id]();
  keepAwake(!!G[id]);
  current.render();
}
function goHome() { if (history.state && (history.state.g || history.state.p)) history.back(); else showHome(); }
function showHome() { clearTimers(); current = null; keepAwake(false); home.render(); }
window.addEventListener('popstate', () => showHome());

/* ================= Accueil ================= */
const home = {
  render() {
    const chips = S.players.map((p, i) => `<span class="chip">${esc(p)}<button data-a="del" data-i="${i}" aria-label="Retirer ${esc(p)}">✕</button></span>`).join('');
    const games = Object.entries(G).map(([id, g], i, arr) =>
      `<button class="game${i === arr.length - 1 && arr.length % 2 ? ' wide' : ''}" style="--g:${g.g}" data-a="game" data-id="${id}">
        <span class="e">${g.e}</span><b>${g.name}</b><span>${g.d}</span></button>`).join('');
    view(`
      <div class="brand"><div class="logo">🥂</div><div><h1>Apéro</h1><p>Jeux de soirée · gratuit · sans pub</p></div></div>

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
        <div class="toggle"><div class="t"><b>Mode épicé 🌶️</b><span>Questions plus osées · 18+</span></div><button class="switch ${S.spicy ? 'on' : ''}" data-a="spicy" aria-label="Mode épicé"></button></div>
      </div>

      <div class="games">${games}</div>

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
        S.players.push(v); save(); home.render();
        document.getElementById('pname').focus();
      });
    });
  },
  on(a, el) {
    if (a === 'del') { S.players.splice(+el.dataset.i, 1); save(); home.render(); }
    if (a === 'drinks') { S.drinks = !S.drinks; save(); home.render(); }
    if (a === 'spicy') { S.spicy = !S.spicy; save(); home.render(); if (S.spicy) toast('Mode épicé activé 🌶️'); }
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
            <p class="hint">Tout le monde choisit en même temps. ${S.drinks ? 'La minorité boit 🍻' : 'La minorité fait un gage'}</p>
            <button class="btn primary big block" data-a="next">Question suivante</button>
          </div>`);
      },
      on(a, el) {
        if (a === 'pick') { sel = +el.dataset.i; buzz(15); this.render(); }
        if (a === 'next') { pair = d.next(); sel = -1; this.render(); }
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
            <h3>🕵️ L'Imposteur</h3><p>Chacun regarde son mot en secret. Tour à tour, chacun dit un mot qui s'y rapporte, sans être trop évident. Après un ou deux tours, on vote pour éliminer l'imposteur. En version « mot proche », l'imposteur ne sait même pas qu'il l'est !</p>
            <h3>💣 La Bombe</h3><p>Une catégorie s'affiche. On allume la mèche, on donne un mot et on passe le téléphone. La bombe explose au hasard : celui qui la tient a perdu.</p>
            <h3>👉 Qui pourrait…</h3><p>On lit la phrase, compte à rebours, et tout le monde pointe quelqu'un en même temps. Le plus désigné boit autant de gorgées que de doigts pointés sur lui.</p>
            <h3>⚖️ Tu préfères ?</h3><p>Deux choix, tout le monde vote à main levée en même temps. La minorité boit. Il faut justifier les choix bizarres.</p>
            <h3>⏱️ Fais deviner</h3><p>Un joueur fait deviner un max de mots en un temps limité, en parlant, en mimant ou avec un seul mot. Il marque un point par mot trouvé.</p>
            <h3>🎡 La Roue</h3><p>Le hasard désigne un joueur, avec ou sans gage. Pratique pour savoir qui commence… ou qui va chercher les glaçons.</p>
            <p style="margin-top:22px">Tout reste sur ton téléphone : aucune donnée envoyée, aucun compte, aucune pub.</p>
          </div>`);
      }
    };
  }
};

function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* ================= Démarrage ================= */
const startHash = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
showHome();
if (makers[startHash] && (!G[startHash] || S.players.length >= G[startHash].min)) (G[startHash] ? openGame : openPage)(startHash);

/* ================= Mises à jour ================= */
/* Quand une nouvelle version est publiée, le service worker la télécharge en arrière-plan
   puis prend la main : on propose alors d'actualiser. */
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let shown = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || shown) return;
    shown = true; showUpdateBanner();
  });
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 15 * 60 * 1000);
    } catch {}
  });
}
function showUpdateBanner() {
  if (document.querySelector('.update')) return;
  const b = document.createElement('div');
  b.className = 'update';
  b.innerHTML = `<span>✨ Nouvelle version</span><button class="go">Actualiser</button><button class="x" aria-label="Plus tard">✕</button>`;
  b.querySelector('.go').addEventListener('click', () => location.reload());
  b.querySelector('.x').addEventListener('click', () => b.remove());
  document.body.appendChild(b);
}
})();
