/* ==========================================================================
   Mode en ligne : chacun joue sur son téléphone.
   Le téléphone qui crée la partie est l'« hôte » : il garde l'état du jeu et
   l'envoie aux autres. Les téléphones sont reliés directement (WebRTC via
   PeerJS) : pas de serveur à nous, pas de compte.
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO;
const { esc, shuffle, pick, toast, buzz, beep } = A;

const PREFIX = 'skelvo-apero-';
const PEER_SRC = 'vendor/peerjs-1.5.4.min.js';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/* Pour les tests on peut pointer vers un serveur PeerJS local :
   localStorage['apero:peerhost'] = '{"host":"localhost","port":9000,"path":"/"}' */
function peerOptions() {
  const o = A.store.get('peerhost', null);
  return o ? { host: o.host, port: o.port, path: o.path || '/', secure: !!o.secure, debug: 1 } : { debug: 1 };
}
let peerLib = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  if (peerLib) return peerLib;
  peerLib = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = PEER_SRC;
    s.onload = ok; s.onerror = () => { peerLib = null; ko(new Error('lib')); };
    document.head.appendChild(s);
  });
  return peerLib;
}
const genCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

/* ================= Jeux (calculés par l'hôte) ================= */

/* ---------- Président ---------- */
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R', 'A', '2'];
const SUITS = ['♣', '♦', '♥', '♠'];
const rankOf = c => c.slice(0, -1);
const rv = c => RANKS.indexOf(rankOf(c));
const cardOrder = (a, b) => rv(a) - rv(b) || SUITS.indexOf(a.slice(-1)) - SUITS.indexOf(b.slice(-1));

function President(names) {
  const n = names.length;
  let order = shuffle(names);           // ordre autour de la table
  let hands = {}, pile = null, turn = null, lastPlayer = null, passed = new Set(), finished = [];
  let titles = {}, roundNo = 0, phase = 'play', log = '', exch = {};

  const active = () => order.filter(p => hands[p].length && !finished.includes(p));
  const nextActive = from => { let i = order.indexOf(from); for (let k = 0; k < n; k++) { i = (i + 1) % n; const p = order[i]; if (hands[p].length && !finished.includes(p)) return p; } return null; };
  const titleNames = () => {
    const t = {}; finished.forEach((p, i) => {
      t[p] = i === 0 ? 'Président' : i === n - 1 ? 'Trou du cul' : (n >= 4 && i === 1) ? 'Vice-président' : (n >= 4 && i === n - 2) ? 'Vice-trou' : 'Neutre';
    }); return t;
  };

  function deal() {
    roundNo++; phase = 'play'; pile = null; passed = new Set(); lastPlayer = null; exch = {};
    const deck = shuffle(RANKS.flatMap(r => SUITS.map(s => r + s)));
    hands = {}; order.forEach(p => hands[p] = []);
    deck.forEach((c, i) => hands[order[i % n]].push(c));
    const prev = finished; finished = [];
    if (prev.length === n) {
      // Échanges : le Trou du cul donne ses 2 meilleures cartes au Président, qui rend ses 2 plus faibles.
      const swap = (rich, poor, k) => {
        const best = hands[poor].slice().sort(cardOrder).slice(-k), worst = hands[rich].slice().sort(cardOrder).slice(0, k);
        hands[poor] = hands[poor].filter(c => !best.includes(c)).concat(worst);
        hands[rich] = hands[rich].filter(c => !worst.includes(c)).concat(best);
        exch[poor] = `Tu as donné ${best.join(' ')} à ${rich} et reçu ${worst.join(' ')}`;
        exch[rich] = `${poor} t'a donné ${best.join(' ')}, tu lui as rendu ${worst.join(' ')}`;
      };
      swap(prev[0], prev[n - 1], 2);
      if (n >= 4) swap(prev[1], prev[n - 2], 1);
      turn = prev[n - 1];
      log = `${turn} (Trou du cul) commence`;
    } else {
      turn = order.find(p => hands[p].includes('3♣')) || order[0];
      log = `${turn} a le 3♣ et commence`;
    }
    order.forEach(p => hands[p].sort(cardOrder));
  }

  function endTrick(lead) {
    pile = null; passed = new Set(); lastPlayer = null;
    turn = lead && !finished.includes(lead) ? lead : nextActive(lead);
  }
  function checkEnd() {
    const left = active();
    if (left.length <= 1) {
      if (left.length) finished.push(left[0]);
      phase = 'end'; titles = titleNames(); turn = null; pile = null;
      log = `${finished[0]} est Président·e 👑 · ${finished[n - 1]} est Trou du cul 💩`;
      return true;
    }
    return false;
  }

  function act(who, a) {
    if (a.k === 'next' && phase === 'end') { deal(); return; }
    if (phase !== 'play' || who !== turn) return 'Ce n’est pas ton tour';
    if (a.k === 'pass') {
      if (!pile) return 'Tu dois commencer le pli';
      passed.add(who); log = `${who} passe`;
      const others = active().filter(p => p !== lastPlayer);
      if (others.every(p => passed.has(p))) { log += ' · pli terminé'; endTrick(lastPlayer); }
      else turn = nextActive(who);
      return;
    }
    if (a.k === 'play') {
      const cards = a.cards || [];
      if (!cards.length || cards.length > 4 || !cards.every(c => hands[who].includes(c))) return 'Cartes invalides';
      if (new Set(cards.map(rankOf)).size !== 1) return 'Joue des cartes de même valeur';
      if (pile && cards.length !== pile.cards.length) return `Il faut jouer ${pile.cards.length} carte${pile.cards.length > 1 ? 's' : ''}`;
      if (pile && rv(cards[0]) < rv(pile.cards[0])) return 'Il faut une valeur égale ou plus forte';
      hands[who] = hands[who].filter(c => !cards.includes(c));
      pile = { cards: cards.slice().sort(cardOrder), by: who }; lastPlayer = who; passed = new Set();
      log = `${who} joue ${cards.join(' ')}`;
      if (!hands[who].length) { finished.push(who); log += ` et termine ${finished.length === 1 ? 'premier·e 👑' : `${finished.length}e`}`; }
      if (checkEnd()) return;
      if (rankOf(cards[0]) === '2') { log += ' · le 2 ferme le pli'; endTrick(who); return; }
      const others = active().filter(p => p !== who);
      if (!others.length) { endTrick(who); return; }
      turn = nextActive(who);
    }
  }

  function view(me) {
    return {
      id: 'president', phase, roundNo, log, turn, me,
      hand: hands[me] || [], pile,
      players: order.map(p => ({ name: p, n: hands[p].length, title: titles[p] || '', rank: finished.indexOf(p), passed: passed.has(p) })),
      exch: exch[me] || '', ranking: phase === 'end' ? finished.map(p => ({ name: p, title: titles[p] })) : null
    };
  }
  deal();
  return { act, view, min: 3, max: 8 };
}

/* ---------- L'Imposteur (votes sur chaque téléphone) ---------- */
function Imposteur(names) {
  let phase, civ, impWord, imps, first, votes;
  function round() {
    const pair = shuffle(pick(A.D.imposteur));
    civ = pair[0]; impWord = pair[1];
    imps = shuffle(names).slice(0, names.length >= 7 ? 2 : 1);
    first = pick(names); votes = {}; phase = 'word';
  }
  function act(who, a, isHost) {
    if (a.k === 'tovote' && phase === 'word' && isHost) { phase = 'vote'; return; }
    if (a.k === 'vote' && phase === 'vote' && names.includes(a.p) && a.p !== who) {
      votes[who] = a.p;
      if (names.every(p => votes[p])) phase = 'result';
      return;
    }
    if (a.k === 'reveal' && phase === 'vote' && isHost) { phase = 'result'; return; }
    if (a.k === 'again' && phase === 'result' && isHost) { round(); return; }
  }
  function view(me) {
    const tally = {}; Object.values(votes).forEach(p => tally[p] = (tally[p] || 0) + 1);
    const top = Math.max(0, ...Object.values(tally));
    const accused = Object.keys(tally).filter(p => tally[p] === top);
    return {
      id: 'imposteur', phase, me, first, players: names,
      word: imps.includes(me) ? impWord : civ,
      voted: votes[me] || null, nVotes: Object.keys(votes).length,
      result: phase === 'result' ? { imps, civ, impWord, tally, caught: accused.length === 1 && imps.includes(accused[0]), accused } : null
    };
  }
  round();
  return { act, view, min: 3, max: 12 };
}

/* ---------- Le Menteur aux dés ---------- */
function Menteur(names) {
  const order = shuffle(names);
  const count = {}; order.forEach(p => count[p] = 5);
  let dice = {}, bid = null, turn = null, phase = 'bid', reveal = null, winner = null, roundNo = 0, log = '';
  const alive = () => order.filter(p => count[p] > 0);
  const total = () => alive().reduce((a, p) => a + count[p], 0);
  const nextAlive = from => { let i = order.indexOf(from); for (let k = 0; k < order.length; k++) { i = (i + 1) % order.length; if (count[order[i]] > 0) return order[i]; } return null; };
  function roll(starter) {
    roundNo++; dice = {}; bid = null; reveal = null; phase = 'bid';
    alive().forEach(p => dice[p] = Array.from({ length: count[p] }, () => 1 + Math.floor(Math.random() * 6)).sort());
    turn = starter && count[starter] > 0 ? starter : nextAlive(starter || order[order.length - 1]);
    log = `Manche ${roundNo} · ${turn} ouvre les enchères`;
  }
  const higher = (q, f) => !bid || q > bid.q || (q === bid.q && f > bid.f);
  function act(who, a, isHost) {
    if (a.k === 'next' && phase === 'reveal' && isHost) { roll(reveal.loser); return; }
    if (a.k === 'again' && phase === 'end' && isHost) { order.forEach(p => count[p] = 5); winner = null; roundNo = 0; roll(); return; }
    if (phase !== 'bid' || who !== turn) return 'Ce n’est pas ton tour';
    if (a.k === 'bid') {
      const q = a.q | 0, f = a.f | 0;
      if (q < 1 || q > total() || f < 1 || f > 6) return 'Annonce impossible';
      if (!higher(q, f)) return 'Il faut annoncer plus : plus de dés, ou une face plus forte';
      bid = { q, f, by: who }; log = `${who} annonce ${q} × ${f}`; turn = nextAlive(who); return;
    }
    if (a.k === 'call') {
      if (!bid) return 'Il n’y a encore aucune annonce';
      const n = alive().reduce((acc, p) => acc + dice[p].filter(v => v === bid.f).length, 0);
      const truth = n >= bid.q, loser = truth ? who : bid.by;
      count[loser]--;
      reveal = { bid, n, caller: who, truth, loser, dice: { ...dice } };
      log = truth ? `${bid.by} disait vrai ! ${who} perd un dé` : `${bid.by} mentait ! Il perd un dé`;
      const al = alive();
      if (al.length === 1) { winner = al[0]; phase = 'end'; } else phase = 'reveal';
    }
  }
  function view(me) {
    return {
      id: 'menteur', phase, me, turn, bid, log, roundNo, total: total(), winner,
      mine: dice[me] || [], reveal,
      players: order.map(p => ({ name: p, n: count[p] }))
    };
  }
  roll();
  return { act, view, min: 2, max: 8 };
}

const GAMES = {
  president: { make: President, name: 'Président', e: '🃏', d: 'Le jeu de cartes de soirée. Débarrasse-toi de tes cartes le premier !', min: 3, max: 8, g: 'linear-gradient(150deg,#e2364f,#7a1630)' },
  imposteur: { make: Imposteur, name: "L'Imposteur", e: '🕵️', d: 'Chacun voit son mot sur son téléphone, puis tout le monde vote.', min: 3, max: 12, g: 'linear-gradient(150deg,#1fb5a4,#0e6a71)' },
  menteur:   { make: Menteur, name: 'Le Menteur', e: '🎲', d: 'Dés cachés et annonces de plus en plus folles. Bluffe ou accuse !', min: 2, max: 8, g: 'linear-gradient(150deg,#8e44ad,#2c3e91)' }
};

/* ================= Écran « En ligne » ================= */
A.makers.online = function () {
  let ui = { screen: 'menu', err: '', code: A.joinCode || '', name: A.store.get('onlineName', '') || A.S.players[0] || '' };
  A.joinCode = null;
  let peer = null, conn = null, isHost = false, state = null, sel = new Set(), lastHand = '';
  // Côté hôte
  let room = null;

  const me = () => ui.name;
  const self = {
    get confirmLeave() { return (ui.screen === 'room') ? (isHost ? 'Quitter ? La partie s’arrêtera pour tout le monde.' : 'Quitter la partie ?') : null; },
    leave() { try { conn && conn.close(); } catch {} try { peer && peer.destroy(); } catch {} peer = conn = room = null; },
    render, on
  };

  /* ---------- Réseau : hôte ---------- */
  async function createRoom() {
    ui.screen = 'connecting'; ui.msg = 'Création de la partie…'; render();
    try { await loadPeer(); } catch { return fail('Impossible de charger le mode en ligne. Vérifie ta connexion internet.'); }
    isHost = true;
    room = { code: null, host: me(), players: [{ name: me(), conn: null, online: true }], game: null, gameId: null };
    const tryOpen = (tries) => {
      const code = genCode();
      const p = new window.Peer(PREFIX + code, peerOptions());
      p.on('open', () => { peer = p; room.code = code; ui.screen = 'room'; broadcast(); });
      p.on('error', e => {
        if (e.type === 'unavailable-id' && tries > 0) { p.destroy(); tryOpen(tries - 1); }
        else if (!peer) fail(netError(e));
        else if (e.type !== 'peer-unavailable') toast('Souci réseau : ' + (e.type || 'inconnu'));
      });
      p.on('disconnected', () => { try { p.reconnect(); } catch {} });
      p.on('connection', c => {
        c.on('data', m => onHostMsg(c, m));
        c.on('close', () => dropConn(c));
        c.on('error', () => dropConn(c));
      });
    };
    tryOpen(4);
  }
  function dropConn(c) {
    if (!room) return;
    const pl = room.players.find(x => x.conn === c);
    if (pl) { pl.online = false; pl.conn = null; toast(`${pl.name} s'est déconnecté·e`); broadcast(); }
  }
  function onHostMsg(c, m) {
    if (!room || !m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      const name = String(m.name || '').trim().slice(0, 18);
      if (!name) return c.send({ t: 'err', m: 'Prénom manquant' });
      let pl = room.players.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (pl && pl.online) return c.send({ t: 'err', m: 'Ce prénom est déjà pris dans la partie' });
      if (!pl) {
        if (room.game) return c.send({ t: 'err', m: 'Une partie est en cours. Attends la fin de la manche.' });
        if (room.players.length >= 12) return c.send({ t: 'err', m: 'La partie est pleine' });
        pl = { name, conn: null, online: false }; room.players.push(pl);
      }
      pl.conn = c; pl.online = true;
      toast(`${pl.name} a rejoint 🎉`); beep(880, .08, 'sine');
      broadcast(); return;
    }
    if (m.t === 'act') {
      const pl = room.players.find(x => x.conn === c);
      if (pl) hostAct(pl.name, m.a);
    }
  }
  function hostAct(who, a) {
    if (!room) return;
    const host = who === room.host;
    if (a.k === 'start' && host) {
      const G = GAMES[a.g]; if (!G) return;
      const names = room.players.filter(p => p.online).map(p => p.name);
      if (names.length < G.min) return toast(`Il faut au moins ${G.min} joueurs connectés`);
      if (names.length > G.max) return toast(`${G.max} joueurs maximum pour ce jeu`);
      room.game = G.make(names); room.gameId = a.g; broadcast(); return;
    }
    if (a.k === 'lobby' && host) { room.game = null; room.gameId = null; broadcast(); return; }
    if (room.game) {
      const err = room.game.act(who, a, host);
      if (err) { sendTo(who, { t: 'err', m: err, soft: true }); return; }
      broadcast();
    }
  }
  function stateFor(name) {
    return {
      code: room.code, host: room.host, me: name,
      players: room.players.map(p => ({ name: p.name, online: p.online })),
      gameId: room.gameId, g: room.game ? room.game.view(name) : null
    };
  }
  function sendTo(name, msg) {
    if (name === room.host) { if (msg.t === 'err') { toast(msg.m); buzz(60); } return; }
    const pl = room.players.find(p => p.name === name);
    if (pl && pl.conn && pl.conn.open) { try { pl.conn.send(msg); } catch {} }
  }
  function broadcast() {
    if (!room) return;
    room.players.forEach(p => { if (p.name !== room.host) sendTo(p.name, { t: 'state', s: stateFor(p.name) }); });
    setState(stateFor(room.host));
  }

  /* ---------- Réseau : invité ---------- */
  async function joinRoom() {
    const code = ui.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { ui.err = 'Le code fait 4 caractères'; return render(); }
    ui.code = code; ui.screen = 'connecting'; ui.msg = `Connexion à la partie ${code}…`; render();
    try { await loadPeer(); } catch { return fail('Impossible de charger le mode en ligne. Vérifie ta connexion internet.'); }
    isHost = false;
    const p = new window.Peer(peerOptions()); peer = p;
    let opened = false;
    const timeout = setTimeout(() => { if (!opened) fail('La partie ne répond pas. Vérifie le code, et que le téléphone qui a créé la partie a bien l’appli ouverte.'); }, 15000);
    p.on('error', e => { clearTimeout(timeout); if (!opened || e.type === 'peer-unavailable') fail(netError(e)); });
    p.on('open', () => {
      const c = p.connect(PREFIX + code, { reliable: true, serialization: 'json' }); conn = c;
      c.on('open', () => { opened = true; clearTimeout(timeout); c.send({ t: 'hello', name: me() }); });
      c.on('data', m => {
        if (m.t === 'state') { if (ui.screen !== 'room') { ui.screen = 'room'; } setState(m.s); }
        if (m.t === 'err') { if (m.soft) { toast(m.m); buzz(60); } else fail(m.m); }
      });
      c.on('close', () => { if (ui.screen === 'room') { ui.screen = 'lost'; render(); } });
    });
  }
  function send(a) {
    if (isHost) hostAct(me(), a);
    else if (conn && conn.open) conn.send({ t: 'act', a });
    else toast('Connexion perdue…');
  }
  function netError(e) {
    const t = e && e.type;
    if (t === 'peer-unavailable') return 'Partie introuvable. Vérifie le code (et que le créateur a l’appli ouverte).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Pas de connexion au service en ligne. Vérifie ton internet.';
    if (t === 'browser-incompatible') return 'Ce navigateur ne gère pas le mode en ligne. Essaie Safari ou Chrome à jour.';
    return 'Connexion impossible (' + (t || 'erreur') + '). Réessaie.';
  }
  function fail(msg) { self.leave(); ui.screen = 'menu'; ui.err = msg; render(); }

  function setState(s) {
    const prev = state; state = s;
    const hand = s.g && s.g.hand ? s.g.hand.join(',') : '';
    if (hand !== lastHand) { sel = new Set([...sel].filter(c => s.g.hand.includes(c))); lastHand = hand; }
    if (s.g && (s.g.id === 'president' || s.g.id === 'menteur') && s.g.turn === s.me && (!prev || !prev.g || prev.g.turn !== s.me)) { buzz([60, 40, 60]); beep(1040, .1, 'sine'); }
    render();
  }

  /* ---------- Affichage ---------- */
  function render() {
    const H = A.header;
    if (ui.screen === 'menu') return A.view(`${H('Jouer en ligne')}
      <div class="stage">
        <p class="hint" style="text-align:left">Chacun joue sur <b>son propre téléphone</b>. Un joueur crée la partie, les autres la rejoignent avec le code. Il faut internet sur chaque téléphone (le même wifi, c’est encore mieux).</p>
        <div class="label">Ton prénom</div>
        <div class="add-row"><input id="oname" maxlength="18" placeholder="Prénom" value="${esc(ui.name)}" autocomplete="off" /></div>
        ${ui.err ? `<p class="errbox">${esc(ui.err)}</p>` : ''}
        <button class="btn primary big block" data-a="create">✨ Créer une partie</button>
        <div class="or-sep"><span>ou rejoindre</span></div>
        <div class="add-row"><input id="ocode" class="codein" maxlength="4" placeholder="CODE" value="${esc(ui.code)}" autocomplete="off" autocapitalize="characters" /><button class="btn" data-a="join">Rejoindre</button></div>
      </div>`, () => {
        const n = document.getElementById('oname'), c = document.getElementById('ocode');
        n.addEventListener('input', () => { ui.name = n.value; });
        c.addEventListener('input', () => { ui.code = c.value = c.value.toUpperCase(); });
        c.addEventListener('keydown', e => { if (e.key === 'Enter') on('join'); });
      });
    if (ui.screen === 'connecting') return A.view(`${H('Jouer en ligne')}
      <div class="stage" style="justify-content:center;text-align:center"><div class="spinner"></div><p class="hint">${esc(ui.msg)}</p></div>`);
    if (ui.screen === 'lost') return A.view(`${H('Jouer en ligne')}
      <div class="stage" style="justify-content:center;text-align:center">
        <div class="big-num" style="font-size:5rem">📵</div>
        <p class="hint">Connexion avec la partie perdue.<br>Le créateur a peut-être fermé l'appli ou changé de réseau.</p>
        <button class="btn primary big block" data-a="rejoin">Se reconnecter</button>
      </div>`);
    if (!state) return;
    if (!state.g) return renderLobby();
    if (state.g.id === 'president') return renderPresident(state.g);
    if (state.g.id === 'imposteur') return renderImposteur(state.g);
    if (state.g.id === 'menteur') return renderMenteur(state.g);
  }

  const amHost = () => state && state.me === state.host;
  const top = (title) => A.header(title, `<span class="room-code">${esc(state.code)}</span>`);

  function renderLobby() {
    const online = state.players.filter(p => p.online).length;
    A.view(`${top('Salon')}
      <div class="stage">
        <div class="codecard">
          <span>Code de la partie</span>
          <b>${esc(state.code)}</b>
          <button class="btn" data-a="share">📤 Inviter</button>
        </div>
        <div class="label">Joueurs connectés · ${online}</div>
        <div class="chips" style="margin-top:0">${state.players.map(p => `<span class="chip ${p.online ? '' : 'offline'}" style="padding-right:14px"><i class="dot"></i>${esc(p.name)}${p.name === state.host ? ' 👑' : ''}${p.name === state.me ? ' (toi)' : ''}</span>`).join('')}</div>
        ${amHost() ? `
          <div class="label">Choisis un jeu</div>
          ${Object.entries(GAMES).map(([id, g]) => {
            const ok = online >= g.min && online <= g.max;
            return `<button class="game wide ${ok ? '' : 'off'}" style="--g:${g.g};min-height:110px" data-a="start" data-g="${id}">
              <span class="e">${g.e}</span><b>${g.name}</b><span>${ok ? g.d : `De ${g.min} à ${g.max} joueurs`}</span></button>`;
          }).join('')}`
          : `<div class="waiting"><div class="spinner small"></div>En attente que ${esc(state.host)} lance un jeu…</div>`}
      </div>`);
  }

  /* --- Président --- */
  const cardHtml = (c, extra = '') => {
    const s = c.slice(-1), red = s === '♥' || s === '♦';
    return `<span class="pc ${red ? 'red' : ''} ${extra}"><b>${esc(rankOf(c))}</b><i>${s}</i></span>`;
  };
  function canPlay(g) {
    const cards = [...sel];
    if (!cards.length || g.turn !== g.me) return false;
    if (new Set(cards.map(rankOf)).size !== 1 || cards.length > 4) return false;
    if (g.pile && (cards.length !== g.pile.cards.length || rv(cards[0]) < rv(g.pile.cards[0]))) return false;
    return true;
  }
  function renderPresident(g) {
    const myTurn = g.turn === g.me && g.phase === 'play';
    if (g.phase === 'end') {
      return A.view(`${top('Président')}
        <div class="stage">
          <div class="card" style="--g:linear-gradient(160deg,#e2364f,#7a1630);flex:none;min-height:0;padding:24px 18px">
            <div class="tag" style="position:static;margin-bottom:12px">Fin de la manche ${g.roundNo}</div>
            <div class="ranking">${g.ranking.map((r, i) => `<div><span>${i + 1}.</span><b>${esc(r.name)}</b><em>${esc(r.title)}${r.title === 'Président' ? ' 👑' : r.title === 'Trou du cul' ? ' 💩' : ''}</em></div>`).join('')}</div>
          </div>
          <p class="hint">${A.S.drinks ? `Le Trou du cul boit 3 gorgées${g.ranking.length >= 4 ? ', le Vice-trou 1' : ''} 🍻` : 'Le Trou du cul fait un gage : ' + esc(pick(A.gages()))}<br>À la prochaine manche, il donne ses 2 meilleures cartes au Président, qui lui rend ses 2 plus faibles.</p>
          ${amHost() ? `<button class="btn primary big block" data-a="pnext">Manche suivante</button><button class="btn block" data-a="lobby">Retour au salon</button>` : `<div class="waiting"><div class="spinner small"></div>${esc(state.host)} lance la manche suivante…</div>`}
        </div>`);
    }
    const ok = canPlay(g);
    A.view(`${top('Président')}
      <div class="stage">
        <div class="seats">${g.players.map(p => `<div class="seat ${p.name === g.turn ? 'now' : ''} ${p.rank > -1 ? 'done' : ''}">
          <b>${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}</b>
          <span>${p.rank > -1 ? `Fini ${p.rank === 0 ? '👑' : '#' + (p.rank + 1)}` : p.passed ? 'Passe' : `${p.n} carte${p.n > 1 ? 's' : ''}`}</span>
          ${p.title ? `<em>${esc(p.title)}</em>` : ''}</div>`).join('')}</div>
        <div class="table">
          ${g.pile ? `<div class="pile">${g.pile.cards.map(c => cardHtml(c, 'big')).join('')}</div><small>posé par ${esc(g.pile.by)}</small>` : `<small>${myTurn ? 'À toi d’ouvrir le pli : joue ce que tu veux' : 'Nouveau pli'}</small>`}
        </div>
        <p class="log">${esc(g.log)}</p>
        ${g.exch && g.roundNo > 1 ? `<p class="exch">🔄 ${esc(g.exch)}</p>` : ''}
        <div class="turnbar ${myTurn ? 'mine' : ''}">${myTurn ? '👉 À toi de jouer !' : `Au tour de ${esc(g.turn)}…`}</div>
        <div class="hand">${g.hand.map(c => `<button class="cardbtn" data-a="sel" data-c="${esc(c)}">${cardHtml(c, sel.has(c) ? 'sel' : '')}</button>`).join('')}</div>
        ${myTurn ? `<div class="row">
          <button class="btn" data-a="ppass" ${g.pile ? '' : 'disabled'}>Passer</button>
          <button class="btn primary" data-a="pplay" ${ok ? '' : 'disabled'}>Jouer${sel.size ? ` (${sel.size})` : ''}</button></div>` : ''}
        ${amHost() ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}
      </div>`, null, true);
  }

  /* --- Imposteur --- */
  function renderImposteur(g) {
    if (g.phase === 'word') return A.view(`${top("L'Imposteur")}
      <div class="stage">
        <div class="card hideable" style="--g:linear-gradient(160deg,#1fb5a4,#0e6a71)" data-a="peek">
          <div class="tag">Ton mot secret</div>
          <div class="secret ${ui.peek ? '' : 'blur'}">${esc(g.word)}</div>
          <div class="sub">${ui.peek ? 'Touche pour cacher' : 'Touche pour voir (cache ton écran 👀)'}</div>
        </div>
        <p class="hint">Chacun dit un mot lié à son mot secret. <b>${esc(g.first)}</b> commence. Faites un ou deux tours, puis votez !</p>
        ${amHost() ? `<button class="btn primary big block" data-a="tovote">Passer au vote 🗳️</button>` : `<div class="waiting">${esc(state.host)} lancera le vote</div>`}
      </div>`);
    if (g.phase === 'vote') return A.view(`${top("L'Imposteur")}
      <div class="stage">
        <div class="turn">Vote secret<strong>Qui est l'imposteur ?</strong></div>
        <div class="winners">${g.players.filter(p => p !== g.me).map(p => `<button class="btn ${g.voted === p ? 'ok' : ''}" data-a="vote" data-p="${esc(p)}">${g.voted === p ? '✓ ' : ''}${esc(p)}</button>`).join('')}</div>
        <p class="hint">${g.nVotes} / ${g.players.length} votes${g.voted ? ' · tu peux changer ton vote jusqu’à la fin' : ''}</p>
        ${amHost() ? `<button class="btn block" data-a="reveal">Révéler maintenant</button>` : ''}
      </div>`);
    const r = g.result;
    A.view(`${top("L'Imposteur")}
      <div class="stage">
        <div class="card" style="--g:${r.caught ? 'linear-gradient(160deg,#3ddc97,#16865c)' : 'linear-gradient(160deg,#ff5c8a,#8f2059)'}">
          <div class="tag">${r.caught ? 'Démasqué ! 🎉' : 'L’imposteur s’en sort 😈'}</div>
          <div class="sub" style="margin:0 0 6px">${r.imps.length > 1 ? 'Les imposteurs étaient' : "L'imposteur était"}</div>
          <div class="secret">${r.imps.map(esc).join(' & ')}</div>
          <div class="sub">Mot des civils : <b>${esc(r.civ)}</b> · Mot de l'imposteur : <b>${esc(r.impWord)}</b></div>
          <div class="found" style="margin-top:14px">${Object.entries(r.tally).sort((a, b) => b[1] - a[1]).map(([p, k]) => `<span>${esc(p)} · ${k} vote${k > 1 ? 's' : ''}</span>`).join('')}</div>
        </div>
        <p class="hint">${A.S.drinks ? (r.caught ? 'L’imposteur boit 3 gorgées 🍻' : 'Tous les autres boivent 2 gorgées 🍻') : (r.caught ? 'Gage pour l’imposteur !' : 'Gage pour les autres !')}</p>
        ${amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="iagain">Rejouer</button></div>` : `<div class="waiting">${esc(state.host)} relance une manche…</div>`}
      </div>`);
  }

  /* --- Le Menteur --- */
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const die = (v, cls = '') => `<span class="die small ${cls}">${[...Array(9)].map((_, k) => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`;
  function renderMenteur(g) {
    const players = `<div class="seats">${g.players.map(p => `<div class="seat ${p.name === g.turn && g.phase === 'bid' ? 'now' : ''} ${p.n ? '' : 'done'}">
        <b>${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}</b><span>${p.n ? '🎲'.repeat(Math.min(p.n, 5)) : 'Éliminé·e'}</span></div>`).join('')}</div>`;
    const bidBox = g.bid ? `<div class="bidbox"><small>Annonce de ${esc(g.bid.by)}</small><div>Au moins <b>${g.bid.q}</b> × ${die(g.bid.f)}</div></div>`
      : `<div class="bidbox"><small>Pas encore d'annonce</small><div>${esc(g.turn)} ouvre</div></div>`;
    if (g.phase === 'reveal' || g.phase === 'end') {
      const r = g.reveal;
      return A.view(`${top('Le Menteur')}
        <div class="stage">
          <div class="card" style="--g:${r.truth ? 'linear-gradient(160deg,#3ddc97,#16865c)' : 'linear-gradient(160deg,#ff5c8a,#8f2059)'};flex:none;min-height:0;padding:22px 16px">
            <div class="tag" style="position:static">${esc(r.caller)} crie « Menteur ! »</div>
            <div class="txt" style="margin:10px 0">Il y a <b>${r.n}</b> × ${die(r.bid.f)}<br><small style="font-size:.9rem;opacity:.85">annonce : au moins ${r.bid.q}</small></div>
            <div class="sub" style="margin-top:4px"><b>${r.truth ? `${esc(r.bid.by)} disait vrai` : `${esc(r.bid.by)} bluffait`}</b> · ${esc(r.loser)} perd un dé</div>
          </div>
          <div class="allDice">${Object.entries(r.dice).map(([p, d]) => `<div><span class="pname">${esc(p)}</span><div>${d.map(v => die(v, v === r.bid.f ? 'hit' : 'dim')).join('')}</div></div>`).join('')}</div>
          ${g.phase === 'end' ? `<div class="card" style="--g:linear-gradient(160deg,#ffb547,#e0702a);flex:none;min-height:0;padding:18px"><div class="secret">👑 ${esc(g.winner)}</div><div class="sub">remporte la partie !</div></div>` : ''}
          ${amHost() ? (g.phase === 'end' ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="magain">Rejouer</button></div>` : `<button class="btn primary big block" data-a="mnext">Manche suivante</button>`)
            : `<div class="waiting"><div class="spinner small"></div>${esc(state.host)} lance la suite…</div>`}
        </div>`);
    }
    const myTurn = g.turn === g.me;
    // proposition par défaut : la plus petite surenchère possible
    if (myTurn) {
      const minQ = g.bid ? g.bid.q : 1;
      if (!ui.bq || ui.bidKey !== JSON.stringify(g.bid)) { ui.bidKey = JSON.stringify(g.bid); ui.bq = g.bid ? (g.bid.f < 6 ? g.bid.q : g.bid.q + 1) : 1; ui.bf = g.bid ? (g.bid.f < 6 ? g.bid.f + 1 : 2) : 2; }
      ui.bq = Math.max(minQ, Math.min(g.total, ui.bq));
    }
    const valid = !g.bid || ui.bq > g.bid.q || (ui.bq === g.bid.q && ui.bf > g.bid.f);
    A.view(`${top('Le Menteur')}
      <div class="stage">
        ${players}
        ${bidBox}
        <div class="label">Tes dés (secrets 🤫) · ${g.total} dés en jeu</div>
        <div class="dice">${g.mine.map(v => die(v)).join('')}</div>
        <p class="log">${esc(g.log)}</p>
        ${myTurn ? `
          <div class="turnbar mine">👉 À toi : surenchéris ou accuse !</div>
          <div class="bidpick">
            <div class="stepper"><button class="btn" data-a="bq" data-v="-1">−</button><b>${ui.bq}</b><button class="btn" data-a="bq" data-v="1">+</button></div>
            <span>×</span>
            <div class="faces">${[1, 2, 3, 4, 5, 6].map(f => `<button class="${ui.bf === f ? 'on' : ''}" data-a="bf" data-v="${f}">${die(f)}</button>`).join('')}</div>
          </div>
          <div class="row">
            <button class="btn" data-a="mcall" ${g.bid ? '' : 'disabled'} style="background:#ff4d4d;color:#fff;border:0">Menteur !</button>
            <button class="btn primary" data-a="mbid" ${valid ? '' : 'disabled'}>Annoncer ${ui.bq} × ${ui.bf}</button>
          </div>` : `<div class="turnbar">Au tour de ${esc(g.turn)}…</div>`}
        <p class="hint" style="font-size:.82rem">On annonce combien de dés d'une face il y a <b>au total</b> (tous les joueurs). Surenchère = plus de dés, ou même nombre avec une face plus forte.</p>
        ${amHost() ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}
      </div>`, null, true);
  }

  /* ---------- Actions ---------- */
  function on(a, el) {
    if (a === 'create' || a === 'join') {
      ui.name = (document.getElementById('oname')?.value || ui.name).trim().replace(/\s+/g, ' ');
      if (!ui.name) { ui.err = 'Entre ton prénom d’abord'; return render(); }
      A.store.set('onlineName', ui.name); ui.err = '';
      return a === 'create' ? createRoom() : joinRoom();
    }
    if (a === 'rejoin') { self.leave(); return joinRoom(); }
    if (a === 'share') {
      const url = location.origin + location.pathname + '#join=' + state.code;
      const text = `Rejoins ma partie Apéro 🥂 Code : ${state.code}`;
      if (navigator.share) navigator.share({ title: 'Apéro', text, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => toast('Lien copié ✓'), () => toast(url));
      return;
    }
    if (a === 'start') return send({ k: 'start', g: el.dataset.g });
    if (a === 'lobby') { if (confirm('Arrêter le jeu et revenir au salon ?')) send({ k: 'lobby' }); return; }
    // Président
    if (a === 'sel') {
      const c = el.dataset.c; sel.has(c) ? sel.delete(c) : sel.add(c);
      // pratique : sélectionner une carte d'une autre valeur remplace la sélection
      const r = rankOf(c); if (sel.has(c)) [...sel].forEach(x => { if (rankOf(x) !== r) sel.delete(x); });
      buzz(8); return render();
    }
    if (a === 'pplay') { const cards = [...sel]; sel = new Set(); return send({ k: 'play', cards }); }
    if (a === 'ppass') { sel = new Set(); return send({ k: 'pass' }); }
    if (a === 'pnext') return send({ k: 'next' });
    // Menteur
    if (a === 'bq') { ui.bq = Math.max(1, ui.bq + +el.dataset.v); buzz(8); return render(); }
    if (a === 'bf') { ui.bf = +el.dataset.v; buzz(8); return render(); }
    if (a === 'mbid') return send({ k: 'bid', q: ui.bq, f: ui.bf });
    if (a === 'mcall') { buzz([80, 40, 80]); return send({ k: 'call' }); }
    if (a === 'mnext') return send({ k: 'next' });
    if (a === 'magain') return send({ k: 'again' });
    // Imposteur
    if (a === 'peek') { ui.peek = !ui.peek; return render(); }
    if (a === 'tovote') { ui.peek = false; return send({ k: 'tovote' }); }
    if (a === 'vote') { buzz(20); return send({ k: 'vote', p: el.dataset.p }); }
    if (a === 'reveal') return send({ k: 'reveal' });
    if (a === 'iagain') { ui.peek = false; return send({ k: 'again' }); }
  }

  return self;
};
})();
