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
      word: imps.includes(me) ? impWord : names.includes(me) ? civ : null,
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

/* ---------- Quiz buzzer ---------- */
function Quiz(names, notify) {
  const TOTAL = 12, ANSWER_MS = 8000;
  const qs = shuffle(A.D.quiz).slice(0, TOTAL);
  let n = 0, phase = 'q', buzzer = null, locked = new Set(), lastWrong = null, foundBy = null, deadline = 0, timer = null, winner = null;
  const scores = {}; names.forEach(p => scores[p] = 0);
  function clear() { clearTimeout(timer); timer = null; }
  function wrong(who, i) {
    locked.add(who); lastWrong = { who, i }; buzzer = null;
    if (names.every(p => locked.has(p))) phase = 'reveal'; else phase = 'q';
  }
  function act(who, a, isHost) {
    const q = qs[n];
    if (a.k === 'buzz' && phase === 'q' && !locked.has(who)) {
      phase = 'answer'; buzzer = who; lastWrong = null; deadline = Date.now() + ANSWER_MS;
      clear(); timer = setTimeout(() => { if (phase === 'answer' && buzzer === who) { wrong(who, -1); notify(); } }, ANSWER_MS);
      return;
    }
    if (a.k === 'answer' && phase === 'answer' && who === buzzer) {
      clear();
      if ((a.i | 0) === q[2]) { scores[who]++; phase = 'reveal'; lastWrong = null; foundBy = who; }
      else wrong(who, a.i | 0);
      return;
    }
    if (a.k === 'reveal' && isHost && phase === 'q') { phase = 'reveal'; buzzer = null; return; }
    if (a.k === 'next' && isHost && phase === 'reveal') {
      n++; locked = new Set(); buzzer = null; lastWrong = null; foundBy = null;
      if (n >= qs.length) { phase = 'end'; const best = Math.max(...Object.values(scores)); winner = names.filter(p => scores[p] === best); }
      else phase = 'q';
      return;
    }
    if (a.k === 'again' && isHost && phase === 'end') {
      const fresh = Quiz(names, notify); Object.assign(api, fresh); return;
    }
  }
  function view(me) {
    const q = qs[Math.min(n, qs.length - 1)];
    return {
      id: 'quiz', phase, me, n: n + 1, total: qs.length, q: q[0], opts: q[1],
      correct: phase === 'reveal' ? q[2] : null, foundBy, buzzer, locked: [...locked], lastWrong,
      left: phase === 'answer' ? Math.max(0, deadline - Date.now()) : 0, scores, winner
    };
  }
  const api = { act, view, stop: clear, min: 2, max: 12 };
  return api;
}

/* ---------- Le Petit Bac ---------- */
const BAC_CATS = ['Prénom', 'Pays', 'Ville', 'Animal', 'Fruit ou légume', 'Métier', 'Objet', 'Marque', 'Célébrité', 'Film ou série',
  'Sport', 'Couleur', 'Plat ou boisson', 'Partie du corps', 'Vêtement', 'Instrument de musique', 'Chanteur·se', 'Insulte gentille', 'Truc qu’on trouve dans un sac', 'Excuse bidon'];
const BAC_LETTERS = 'ABCDEFGHIJLMNOPRSTV';
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
function Bac(names, notify) {
  const STOP_MS = 10000;
  let phase, letter, cats, answers, rejected, roundNo = 0, stopBy = null, deadline = 0, timer = null, roundPts = {};
  const totals = {}; names.forEach(p => totals[p] = 0);
  const used = new Set();
  function newRound() {
    roundNo++; phase = 'write'; stopBy = null; answers = {}; rejected = {}; roundPts = {};
    const pool = BAC_LETTERS.split('').filter(l => !used.has(l)); letter = pick(pool.length ? pool : BAC_LETTERS.split('')); used.add(letter);
    cats = shuffle(BAC_CATS).slice(0, 6);
    names.forEach(p => answers[p] = cats.map(() => ''));
  }
  const valid = (p, i) => { const v = norm(answers[p][i]); return v.length > 1 && v[0] === letter.toLowerCase() && !rejected[p + '|' + i]; };
  function score() {
    roundPts = {}; names.forEach(p => roundPts[p] = 0);
    cats.forEach((_, i) => {
      const ok = names.filter(p => valid(p, i));
      ok.forEach(p => { const dup = ok.some(q => q !== p && norm(answers[q][i]) === norm(answers[p][i])); roundPts[p] += dup ? 5 : 10; });
    });
  }
  function toVote() { clearTimeout(timer); phase = 'vote'; score(); }
  function act(who, a, isHost) {
    if (a.k === 'answers' && phase === 'write' && Array.isArray(a.list)) { answers[who] = cats.map((_, i) => String(a.list[i] || '').slice(0, 40)); return 'silent'; }
    if (a.k === 'stop' && phase === 'write' && !stopBy) {
      if (Array.isArray(a.list)) answers[who] = cats.map((_, i) => String(a.list[i] || '').slice(0, 40));
      stopBy = who; deadline = Date.now() + STOP_MS;
      timer = setTimeout(() => { if (phase === 'write') { toVote(); notify(); } }, STOP_MS + 600);  // petit délai pour recevoir les dernières réponses
      return;
    }
    if (a.k === 'toggle' && phase === 'vote' && isHost) { const key = a.p + '|' + (a.i | 0); rejected[key] = !rejected[key]; score(); return; }
    if (a.k === 'validate' && phase === 'vote' && isHost) { names.forEach(p => totals[p] += roundPts[p]); phase = 'scores'; return; }
    if (a.k === 'next' && phase === 'scores' && isHost) { newRound(); return; }
  }
  function view(me) {
    return {
      id: 'bac', phase, me, letter, cats, roundNo, stopBy,
      left: phase === 'write' && stopBy ? Math.max(0, deadline - Date.now()) : 0,
      mine: answers[me] || [],
      all: phase === 'write' ? null : names.map(p => ({ name: p, list: answers[p], ok: cats.map((_, i) => valid(p, i)) })),
      roundPts, totals
    };
  }
  newRound();
  return { act, view, stop: () => clearTimeout(timer), min: 2, max: 10 };
}

/* ---------- Le Dessin ---------- */
function Dessin(names, notify) {
  const ROUND_MS = 80000;
  const order = shuffle(names), words = A.deck(A.D.mots);
  const scores = {}; names.forEach(p => scores[p] = 0);
  let turnIdx = -1, drawer, word, strokes, found, feed, phase, deadline, timer = null, roundNo = 0, changed;
  function next() {
    clearTimeout(timer); turnIdx = (turnIdx + 1) % order.length; drawer = order[turnIdx]; roundNo++;
    word = words.next(); strokes = []; found = []; feed = []; phase = 'draw'; changed = false;
    deadline = Date.now() + ROUND_MS;
    timer = setTimeout(() => { if (phase === 'draw') { phase = 'reveal'; notify(); } }, ROUND_MS);
  }
  const guessers = () => order.filter(p => p !== drawer);
  function act(who, a, isHost) {
    if (a.k === 'stroke' && phase === 'draw' && who === drawer && Array.isArray(a.pts)) {
      const pts = a.pts.slice(0, 200).map(p => [+p[0] || 0, +p[1] || 0]);
      if (a.n || !strokes.length) strokes.push({ c: String(a.c || '#111').slice(0, 9), w: Math.min(30, +a.w || 4), pts });
      else strokes[strokes.length - 1].pts.push(...pts.slice(1));
      return { relay: { k: 'stroke', n: !!a.n, c: a.c, w: a.w, pts } };
    }
    if (a.k === 'clear' && phase === 'draw' && who === drawer) { strokes = []; return { relay: { k: 'clear' } }; }
    if (a.k === 'change' && phase === 'draw' && who === drawer && !changed && !found.length) { word = words.next(); changed = true; strokes = []; return; }
    if (a.k === 'guess' && phase === 'draw' && who !== drawer && !found.includes(who)) {
      const t = String(a.text || '').slice(0, 40);
      if (!t.trim()) return 'silent';
      if (norm(t) === norm(word)) {
        found.push(who);
        const pts = Math.max(1, 4 - found.length);   // 3, 2, puis 1
        scores[who] += pts; scores[drawer] += 1;
        feed.push({ who, ok: true, pts });
        if (guessers().every(p => found.includes(p))) { clearTimeout(timer); phase = 'reveal'; }
      } else feed.push({ who, text: t });
      feed = feed.slice(-12);
      return;
    }
    if (a.k === 'next' && phase === 'reveal' && isHost) { next(); return; }
    if (a.k === 'skip' && phase === 'draw' && isHost) { clearTimeout(timer); phase = 'reveal'; return; }
  }
  function view(me) {
    const left = phase === 'draw' ? Math.max(0, deadline - Date.now()) : 0;
    const showFirst = left < ROUND_MS / 2;
    const mask = [...word].map((ch, i) => ch === ' ' || ch === '-' || ch === "'" ? ch : (i === 0 && showFirst ? ch.toUpperCase() : '_')).join(' ');
    return {
      id: 'dessin', phase, me, drawer, roundNo, left, total: ROUND_MS,
      word: me === drawer || phase === 'reveal' || found.includes(me) ? word : null,
      mask, firstAt: ROUND_MS / 2, firstLetter: word[0].toUpperCase(), canChange: me === drawer && !changed && !found.length,
      strokes, found, feed, scores, wid: changed ? 1 : 0
    };
  }
  next();
  return { act, view, stop: () => clearTimeout(timer), min: 2, max: 10 };
}

/* ---------- Le Téléphone dessiné ---------- */
const cleanStrokes = d => Array.isArray(d) ? d.slice(0, 400).map(s => ({ c: String(s && s.c || '#111').slice(0, 9), w: Math.min(30, +(s && s.w) || 4),
  pts: Array.isArray(s && s.pts) ? s.pts.slice(0, 500).map(p => [+p[0] || 0, +p[1] || 0]) : [] })) : [];
function Tel(names, notify) {
  const WRITE_MS = 45000, DRAW_MS = 80000;
  let order, N, step, entries, drafts, submitted, phase, deadline, timer = null, rc;
  function start() {
    order = shuffle(names); N = order.length; step = 0; entries = order.map(() => []); phase = 'play'; rc = 0;
    begin();
  }
  const typeAt = s => s % 2 ? 'draw' : 'write';
  const chainOf = (p, s) => ((order.indexOf(p) - s) % N + N) % N;
  function begin() {
    drafts = {}; submitted = new Set();
    const ms = typeAt(step) === 'draw' ? DRAW_MS : WRITE_MS; deadline = Date.now() + ms;
    clearTimeout(timer); timer = setTimeout(() => { if (phase === 'play') { advance(); notify(); } }, ms + 1500);
  }
  function advance() {
    const t = typeAt(step);
    order.forEach(p => {
      const d = drafts[p];
      entries[chainOf(p, step)][step] = { by: p, type: t, data: t === 'draw' ? cleanStrokes(d) : (String(d || '').trim().slice(0, 80) || '🤷 (rien écrit)') };
    });
    step++;
    if (step >= N) { phase = 'reveal'; clearTimeout(timer); } else begin();
  }
  function act(who, a, isHost) {
    if ((a.k === 'save' || a.k === 'submit') && phase === 'play' && order.includes(who) && !submitted.has(who)) {
      drafts[who] = typeAt(step) === 'draw' ? cleanStrokes(a.data) : String(a.data || '').slice(0, 80);
      if (a.k === 'save') return 'silent';
      submitted.add(who);
      if (order.every(p => submitted.has(p))) advance();
      return;
    }
    if (a.k === 'rgo' && phase === 'reveal' && isHost) { rc = Math.max(0, Math.min(N - 1, rc + (a.d | 0))); return; }
    if (a.k === 'again' && phase === 'reveal' && isHost) { start(); return; }
  }
  function view(me) {
    const c = order.includes(me) ? chainOf(me, step) : 0;
    const prev = phase === 'play' && step > 0 ? entries[c][step - 1] : null;
    return {
      id: 'tel', phase, me, step, steps: N, type: typeAt(step), prev,
      left: phase === 'play' ? Math.max(0, deadline - Date.now()) : 0,
      done: phase === 'play' ? [...submitted] : [], waitingFor: phase === 'play' ? order.filter(p => !submitted.has(p)) : [],
      mineDone: submitted.has(me), suggestions: null,
      chain: phase === 'reveal' ? entries[rc] : null, rc, owner: phase === 'reveal' ? order[rc] : null
    };
  }
  start();
  return { act, view, stop: () => clearTimeout(timer), min: 3, max: 10 };
}

/* ---------- Loups-garous (version traditionnelle) ---------- */
const ROLES = {
  loup: { name: 'Loup-garou', e: '🐺', team: 'loups', desc: 'Chaque nuit, avec les autres loups, choisis une victime. Le jour, fais semblant d’être innocent.' },
  voyante: { name: 'Voyante', e: '🔮', team: 'village', desc: 'Chaque nuit, découvre le rôle secret d’un joueur.' },
  docteur: { name: 'Docteur', e: '🩺', team: 'village', desc: 'Chaque nuit, protège un joueur (pas le même deux nuits de suite).' },
  villageois: { name: 'Villageois', e: '🧑‍🌾', team: 'village', desc: 'Trouve les loups et fais-les éliminer au vote du jour.' }
};
function Loups(names) {
  let roles, alive, phase, night, wolfVotes, seerPick, docPick, lastDoc, fake, ready, votes, dawn, result, winner, seerLog;
  function start() {
    const n = names.length, nW = Math.max(1, Math.floor(n / 4));
    const deckR = ['voyante', 'docteur', ...Array(nW).fill('loup')];
    while (deckR.length < n) deckR.push('villageois');
    const sh = shuffle(deckR); roles = {}; names.forEach((p, i) => roles[p] = sh[i]);
    alive = new Set(names); phase = 'roles'; night = 0; ready = new Set(); lastDoc = null; seerLog = {}; winner = null; dawn = null; result = null;
  }
  const isAlive = p => alive.has(p);
  const aliveOf = r => names.filter(p => isAlive(p) && roles[p] === r);
  function beginNight() { night++; phase = 'night'; wolfVotes = {}; seerPick = null; docPick = null; fake = new Set(); }
  function nightDone() { return names.filter(isAlive).every(p => hasActed(p)); }
  function hasActed(p) {
    const r = roles[p];
    if (r === 'loup') return p in wolfVotes;
    if (r === 'voyante') return !!seerPick;
    if (r === 'docteur') return !!docPick;
    return fake.has(p);
  }
  function endNight() {
    const tally = {}; Object.values(wolfVotes).forEach(t => tally[t] = (tally[t] || 0) + 1);
    const top = Math.max(0, ...Object.values(tally)); const cands = Object.keys(tally).filter(t => tally[t] === top);
    const target = cands.length ? pick(cands) : null;
    const saved = target && target === docPick;
    if (target && !saved) alive.delete(target);
    if (seerPick) seerLog[night] = { who: seerPick, role: roles[seerPick] };
    lastDoc = docPick;
    dawn = { victim: target && !saved ? target : null, role: target && !saved ? roles[target] : null, saved: !!saved, night };
    phase = 'dawn'; checkWin();
  }
  function endVote() {
    const tally = {}; Object.values(votes).forEach(t => { if (t !== '—') tally[t] = (tally[t] || 0) + 1; });
    const top = Math.max(0, ...Object.values(tally)); const cands = Object.keys(tally).filter(t => tally[t] === top);
    const out = cands.length === 1 ? cands[0] : null;
    if (out) alive.delete(out);
    result = { out, role: out ? roles[out] : null, tally, votes: { ...votes }, tie: cands.length > 1 };
    phase = 'result'; checkWin();
  }
  function checkWin() {
    const w = aliveOf('loup').length, others = names.filter(p => isAlive(p) && roles[p] !== 'loup').length;
    if (!w) { winner = 'village'; phase = 'end'; } else if (w >= others) { winner = 'loups'; phase = 'end'; }
  }
  function act(who, a, isHost) {
    if (a.k === 'seen' && phase === 'roles') { ready.add(who); if (names.every(p => ready.has(p))) beginNight(); return; }
    if (phase === 'night' && isAlive(who) && a.k === 'night') {
      const t = String(a.p || ''), r = roles[who];
      if (!names.includes(t) || !isAlive(t)) return 'Choix impossible';
      if (r === 'loup') { if (roles[t] === 'loup') return 'Pas un autre loup 😅'; wolfVotes[who] = t; }
      else if (r === 'voyante') { if (seerPick) return; if (t === who) return 'Choisis quelqu’un d’autre'; seerPick = t; }
      else if (r === 'docteur') { if (docPick) return; if (t === lastDoc) return 'Pas le même que la nuit dernière'; docPick = t; }
      else fake.add(who);
      if (nightDone()) endNight();
      return;
    }
    if (a.k === 'day' && phase === 'dawn' && isHost) { phase = 'vote'; votes = {}; return; }
    if (a.k === 'vote' && phase === 'vote' && isAlive(who)) {
      const t = String(a.p || '');
      if (t !== '—' && (!isAlive(t) || t === who)) return 'Vote impossible';
      votes[who] = t; if (names.filter(isAlive).every(p => p in votes)) endVote(); return;
    }
    if (a.k === 'night' && phase === 'result' && isHost) { beginNight(); return; }
    if (a.k === 'again' && phase === 'end' && isHost) { start(); return; }
  }
  function view(me) {
    const r = roles[me], dead = names.includes(me) && !isAlive(me);
    const seeAll = dead || phase === 'end';
    return {
      id: 'loups', phase, me, night, role: r, roleInfo: ROLES[r], dead,
      players: names.map(p => ({ name: p, alive: isAlive(p), role: seeAll || (r === 'loup' && roles[p] === 'loup') || (!isAlive(p)) ? roles[p] : null })),
      ready: ready.has(me), readyCount: ready.size,
      acted: phase === 'night' ? hasActed(me) : false,
      pending: phase === 'night' ? names.filter(p => isAlive(p) && !hasActed(p)).length : 0,
      wolfVotes: r === 'loup' && phase === 'night' ? wolfVotes : null,
      lastDoc: r === 'docteur' ? lastDoc : null,
      seer: r === 'voyante' ? seerLog : null,
      dawn, result, winner,
      myVote: phase === 'vote' ? votes[me] || null : null, nVotes: phase === 'vote' ? Object.keys(votes).length : 0, nAlive: names.filter(isAlive).length
    };
  }
  start();
  return { act, view, min: 5, max: 16 };
}

const GAMES = {
  president: { make: President, cat: 'cartes', name: 'Président', e: '🃏', d: 'Le jeu de cartes de soirée. Débarrasse-toi de tes cartes le premier !', min: 3, max: 8, g: 'linear-gradient(150deg,#e2364f,#7a1630)' },
  imposteur: { make: Imposteur, cat: 'ambiance', name: "L'Imposteur", e: '🕵️', d: 'Chacun voit son mot sur son téléphone, puis tout le monde vote.', min: 3, max: 12, g: 'linear-gradient(150deg,#1fb5a4,#0e6a71)' },
  quiz:      { make: Quiz, cat: 'ambiance', name: 'Quiz buzzer', e: '🔔', d: '12 questions de culture G. Le premier qui buzze répond !', min: 2, max: 12, g: 'linear-gradient(150deg,#f7b733,#fc4a1a)' },
  bac:       { make: Bac, cat: 'ambiance', name: 'Le Petit Bac', e: '📝', d: 'Une lettre, 6 catégories. Le premier qui finit crie STOP !', min: 2, max: 10, g: 'linear-gradient(150deg,#56ab2f,#1e6b52)' },
  loups:     { make: Loups, cat: 'ambiance', name: 'Loups-garous', e: '🐺', d: 'Rôles secrets, nuits et votes : l’appli est le maître du jeu. Dès 5 joueurs.', min: 5, max: 16, g: 'linear-gradient(150deg,#434343,#7a1630)' },
  tel:       { make: Tel, cat: 'ambiance', name: 'Le Téléphone dessiné', e: '📞', d: 'Phrase → dessin → devinette… et on rigole en voyant le résultat !', min: 3, max: 10, g: 'linear-gradient(150deg,#00c6ff,#7b2ff7)' },
  dessin:    { make: Dessin, cat: 'ambiance', name: 'Le Dessin', e: '🎨', d: 'Un joueur dessine, les autres devinent en direct sur leur téléphone.', min: 2, max: 10, g: 'linear-gradient(150deg,#ff9a8b,#a74ea8)' },
  menteur:   { make: Menteur, cat: 'cartes', name: 'Le Menteur', e: '🎲', d: 'Dés cachés et annonces de plus en plus folles. Bluffe ou accuse !', min: 2, max: 8, g: 'linear-gradient(150deg,#8e44ad,#2c3e91)' }
};

/* Extensions : d'autres fichiers (online-*.js) ajoutent leurs jeux ici.
   Un jeu = { make, name, e, d, min, max, g, cat, render(g, ctx), on(a, el, ctx), onState(g, prevG, ctx), onEvent(e, ctx) } */
const TV = '📺';
const CATS = { ambiance: '🎉 Ambiance', cartes: '🃏 Cartes & dés', plateau: '♟️ Plateau (à 2)', reflexes: '⚡ Réflexes en direct' };
A.online = { games: GAMES, register: (id, def) => { GAMES[id] = def; }, norm, cleanStrokes, ROLES };

/* ================= Écran « En ligne » ================= */
A.makers.online = function () {
  let ui = { screen: 'menu', err: '', tv: false, code: A.joinCode || '', name: A.store.get('onlineName', '') || A.S.players[0] || '' };
  A.joinCode = null;
  let peer = null, conn = null, isHost = false, state = null, sel = new Set(), lastHand = '';
  // Côté hôte
  let room = null;

  const me = () => ui.name;
  const self = {
    get confirmLeave() { return (ui.screen === 'room') ? (isHost ? 'Quitter ? La partie s’arrêtera pour tout le monde.' : 'Quitter la partie ?') : null; },
    leave() { document.documentElement.classList.remove('tv'); try { room && room.game && room.game.stop && room.game.stop(); } catch {} try { conn && conn.close(); } catch {} try { peer && peer.destroy(); } catch {} peer = conn = room = null; },
    render, on
  };

  /* ---------- Réseau : hôte ---------- */
  async function createRoom() {
    ui.screen = 'connecting'; ui.msg = 'Création de la partie…'; render();
    try { await loadPeer(); } catch { return fail('Impossible de charger le mode en ligne. Vérifie ta connexion internet.'); }
    isHost = true;
    room = { code: null, host: me(), players: [{ name: me(), conn: null, online: true }], tvs: [], game: null, gameId: null };
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
    if (room.tvs.includes(c)) { room.tvs = room.tvs.filter(x => x !== c); toast('📺 Écran TV déconnecté'); return broadcast(); }
    const pl = room.players.find(x => x.conn === c);
    if (pl) { pl.online = false; pl.conn = null; toast(`${pl.name} s'est déconnecté·e`); broadcast(); }
  }
  function onHostMsg(c, m) {
    if (!room || !m || typeof m !== 'object') return;
    if (m.t === 'hello' && m.tv) {
      if (!room.tvs.includes(c)) room.tvs.push(c);
      toast('📺 Écran TV connecté'); beep(880, .08, 'sine');
      broadcast(); return;
    }
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
      room.game = G.make(names, () => broadcast()); room.gameId = a.g; broadcast(); return;
    }
    if (a.k === 'lobby' && host) { room.game && room.game.stop && room.game.stop(); room.game = null; room.gameId = null; broadcast(); return; }
    if (room.game) {
      const err = room.game.act(who, a, host);
      if (err === 'silent') return;
      if (err && err.relay) { relay(who, err.relay); return; }
      if (err) { sendTo(who, { t: 'err', m: err, soft: true }); return; }
      broadcast();
    }
  }
  function stateFor(name) {
    return {
      code: room.code, host: room.host, me: name,
      players: room.players.map(p => ({ name: p.name, online: p.online })), tvs: room.tvs.length,
      gameId: room.gameId, g: room.game ? room.game.view(name) : null
    };
  }
  function sendTo(name, msg) {
    if (name === room.host) { if (msg.t === 'err') { toast(msg.m); buzz(60); } return; }
    const pl = room.players.find(p => p.name === name);
    if (pl && pl.conn && pl.conn.open) { try { pl.conn.send(msg); } catch {} }
  }
  function relay(from, e) {
    room.players.forEach(p => {
      if (p.name === from) return;
      if (p.name === room.host) onEvent(e);
      else if (p.conn && p.conn.open) { try { p.conn.send({ t: 'ev', e }); } catch {} }
    });
    room.tvs.forEach(c => { if (c.open) { try { c.send({ t: 'ev', e }); } catch {} } });
  }
  function broadcast() {
    if (!room) return;
    room.players.forEach(p => { if (p.name !== room.host) sendTo(p.name, { t: 'state', s: stateFor(p.name) }); });
    if (room.tvs.length) { const s = stateFor(TV); room.tvs.forEach(c => { if (c.open) { try { c.send({ t: 'state', s }); } catch {} } }); }
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
      c.on('open', () => { opened = true; clearTimeout(timeout); c.send(ui.tv ? { t: 'hello', tv: true } : { t: 'hello', name: me() }); });
      c.on('data', m => {
        if (m.t === 'state') { if (ui.screen !== 'room') { ui.screen = 'room'; document.documentElement.classList.toggle('tv', ui.tv); } setState(m.s); }
        if (m.t === 'err') { if (m.soft) { toast(m.m); buzz(60); } else fail(m.m); }
        if (m.t === 'ev') onEvent(m.e);
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
    if (s.g && GAMES[s.g.id] && GAMES[s.g.id].onState) { try { GAMES[s.g.id].onState(s.g, prev && prev.g && prev.g.id === s.g.id ? prev.g : null, ctx()); } catch (e) { console.error(e); } }
    if (s.g && s.g.id === 'dessin' && prev && prev.g && prev.g.id === 'dessin' && s.g.found.length > prev.g.found.length) { beep(1320, .12, 'sine'); buzz(40); }
    if (s.g && s.g.id === 'bac' && s.g.stopBy && (!prev || !prev.g || !prev.g.stopBy)) { beep(440, .3, 'square', .2); buzz([200, 80, 200]); }
    if (s.g && s.g.id === 'quiz' && s.g.buzzer && (!prev || !prev.g || prev.g.buzzer !== s.g.buzzer)) { beep(880, .15, 'square', .2); buzz(120); }
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
        <button class="btn block tvbtn" data-a="tvjoin">📺 Afficher sur la TV ou un ordi <small>(écran spectateur, sans jouer)</small></button>
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
    const P = GAMES[state.g.id];
    if (P && P.render) return P.render(state.g, ctx());
    if (state.g.id === 'president') return renderPresident(state.g);
    if (state.g.id === 'imposteur') return renderImposteur(state.g);
    if (state.g.id === 'menteur') return renderMenteur(state.g);
    if (state.g.id === 'quiz') return renderQuiz(state.g);
    if (state.g.id === 'bac') return renderBac(state.g);
    if (state.g.id === 'dessin') return renderDessin(state.g);
    if (state.g.id === 'tel') return renderTel(state.g);
    if (state.g.id === 'loups') return renderLoups(state.g);
  }

  const amHost = () => state && state.me === state.host;
  const top = (title) => A.header(title, `<span class="room-code">${esc(state.code)}</span>`);

  function renderLobby() {
    const online = state.players.filter(p => p.online).length;
    if (state.me === TV) return A.view(`${top('📺 Écran TV')}
      <div class="stage tvlobby">
        <div class="codecard"><span>Rejoins sur skelvo.fr/apero › Jouer en ligne</span><b>${esc(state.code)}</b><div class="qr" id="qr"></div><small class="qrhint">ou scanne avec l'appareil photo</small></div>
        <div class="label">Joueurs connectés · ${online}</div>
        <div class="chips" style="margin-top:0">${state.players.map(p => `<span class="chip ${p.online ? '' : 'offline'}" style="padding-right:14px"><i class="dot"></i>${esc(p.name)}${p.name === state.host ? ' 👑' : ''}</span>`).join('')}</div>
        <div class="waiting"><div class="spinner small"></div>${esc(state.host)} choisit le jeu…</div>
      </div>`, () => drawQR(location.origin + location.pathname + '#join=' + state.code));
    A.view(`${top('Salon')}
      <div class="stage">
        <div class="codecard">
          <span>Code de la partie</span>
          <b>${esc(state.code)}</b>
          <div class="qr" id="qr"></div>
          <small class="qrhint">Scanne avec l'appareil photo pour rejoindre</small>
          <button class="btn" data-a="share">📤 Inviter</button>
        </div>
        ${amHost() ? `<p class="hint tvhint">📺 ${state.tvs ? `<b>Écran TV connecté${state.tvs > 1 ? ` (${state.tvs})` : ''}</b> : la partie s'affiche en grand.` : `Envie d'afficher la partie en grand ? Ouvre <b>skelvo.fr/apero</b> sur la TV ou un ordi › Jouer en ligne › tape <b>${esc(state.code)}</b> › 📺 Afficher sur la TV.`}</p>` : ''}
        <div class="label">Joueurs connectés · ${online}</div>
        <div class="chips" style="margin-top:0">${state.players.map(p => `<span class="chip ${p.online ? '' : 'offline'}" style="padding-right:14px"><i class="dot"></i>${esc(p.name)}${p.name === state.host ? ' 👑' : ''}${p.name === state.me ? ' (toi)' : ''}</span>`).join('')}</div>
        ${amHost() ? `
          <div class="label">Choisis un jeu</div>
          ${A.S.spicy ? '<p class="spicynote">🌶️ Mode épicé activé : seuls les jeux épicés sont proposés.</p>' : ''}
          ${Object.entries(CATS).map(([cat, title]) => {
            const list = Object.entries(GAMES).filter(([, g]) => (g.cat || 'ambiance') === cat && (!A.S.spicy || g.spicy))
              .sort((a, b) => ((online >= b[1].min && online <= b[1].max) - (online >= a[1].min && online <= a[1].max)));
            if (!list.length) return '';
            return `<h3 class="cat">${title}</h3><div class="ogames">${list.map(([id, g]) => {
              const ok = online >= g.min && online <= g.max;
              return `<button class="game ${ok ? '' : 'off'}" style="--g:${g.g}" data-a="start" data-g="${id}">
                <span class="e">${g.e}</span><b>${g.name}</b><span>${ok ? g.d : g.min === g.max ? `À ${g.min} joueurs` : `De ${g.min} à ${g.max} joueurs`}</span></button>`;
            }).join('')}</div>`;
          }).join('')}`
          : `<div class="waiting"><div class="spinner small"></div>En attente que ${esc(state.host)} lance un jeu…</div>`}
      </div>`, () => drawQR(location.origin + location.pathname + '#join=' + state.code));
  }

  /* QR code d'invitation (bibliothèque chargée à la demande) */
  let qrLib = null;
  function drawQR(url) {
    const el = document.getElementById('qr'); if (!el) return;
    const paint = () => { try { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch { el.remove(); } };
    if (window.qrcode) return paint();
    qrLib = qrLib || new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/qrcode-1.4.4.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
    qrLib.then(paint, () => el.remove());
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
    if (g.me === TV && g.phase !== 'result') return A.view(`${top("L'Imposteur")}
      <div class="stage">
        <div class="card" style="--g:linear-gradient(160deg,#1fb5a4,#0e6a71)">
          <div class="tag">${g.phase === 'word' ? 'Chacun regarde son mot secret 🤫' : 'Vote secret 🗳️'}</div>
          <div class="secret">${g.phase === 'word' ? `${esc(g.first)} commence` : 'Qui est l’imposteur ?'}</div>
          <div class="sub">${g.phase === 'word' ? 'Un mot chacun, à tour de rôle. Faites un ou deux tours, puis votez !' : `${g.nVotes} / ${g.players.length} votes`}</div>
        </div>
        <div class="chips" style="justify-content:center">${g.players.map(p => `<span class="chip" style="padding-right:14px">${esc(p)}</span>`).join('')}</div>
      </div>`);
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
        <div class="label mineonly">Tes dés (secrets 🤫) · ${g.total} dés en jeu</div>
        <div class="dice mineonly">${g.mine.map(v => die(v)).join('')}</div>
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

  /* --- Quiz buzzer --- */
  let qTick = null;
  function renderQuiz(g) {
    clearInterval(qTick);
    const board = `<div class="scores">${Object.entries(g.scores).sort((a, b) => b[1] - a[1]).map(([p, s], i) => `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}${p === g.me ? ' (toi)' : ''}</span><span>${s}</span></div>`).join('')}</div>`;
    if (g.phase === 'end') return A.view(`${top('Quiz buzzer')}
      <div class="stage">
        <div class="card" style="--g:linear-gradient(160deg,#f7b733,#fc4a1a);flex:none;min-height:0;padding:24px">
          <div class="tag" style="position:static">Fin du quiz</div><div class="big-num" style="font-size:4.5rem">🏆</div>
          <div class="secret">${g.winner.map(esc).join(' & ')}</div></div>
        ${board}
        ${amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="qagain">Rejouer</button></div>` : ''}
      </div>`);
    const iAmLocked = g.locked.includes(g.me), mine = g.buzzer === g.me;
    const optCls = i => g.phase === 'reveal' ? (i === g.correct ? 'right' : 'dim') : (g.lastWrong && g.lastWrong.i === i ? 'wrongpick' : '');
    const opts = `<div class="qopts">${g.opts.map((o, i) => `<button class="qopt ${optCls(i)}" ${mine && g.phase === 'answer' ? `data-a="qans" data-i="${i}"` : 'disabled'}><span>${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div>`;
    let status = '';
    if (g.phase === 'q') status = iAmLocked ? `<div class="turnbar">❌ Raté… les autres peuvent buzzer</div>` : `<button class="buzz" data-a="buzz">BUZZ</button>`;
    if (g.phase === 'answer') status = mine ? `<div class="turnbar mine">⏱️ Réponds vite ! <b id="qleft">${Math.ceil(g.left / 1000)}</b></div>` : `<div class="turnbar">🔔 ${esc(g.buzzer)} a buzzé… <b id="qleft">${Math.ceil(g.left / 1000)}</b></div>`;
    if (g.phase === 'reveal') status = `<div class="turnbar ${g.foundBy ? 'mine' : ''}">${g.foundBy ? `✅ ${esc(g.foundBy)} a trouvé ! +1` : 'Personne n’a trouvé 😅'}</div>`;
    A.view(`${top('Quiz buzzer')}
      <div class="stage">
        <div class="turn">Question ${g.n} / ${g.total}</div>
        <div class="card" style="--g:linear-gradient(160deg,#2c2249,#221a3b);flex:none;min-height:130px;padding:22px 18px"><div class="txt" style="font-size:1.3rem">${esc(g.q)}</div></div>
        ${g.lastWrong && g.phase !== 'reveal' ? `<p class="exch">${esc(g.lastWrong.who)} s'est trompé·e${g.lastWrong.i < 0 ? ' (temps écoulé)' : ''}</p>` : ''}
        ${opts}
        ${status}
        ${amHost() && g.phase === 'q' ? `<button class="btn ghost" data-a="qreveal">Personne ne sait ? Révéler</button>` : ''}
        ${amHost() && g.phase === 'reveal' ? `<button class="btn primary big block" data-a="qnext">${g.n >= g.total ? 'Voir les résultats' : 'Question suivante'}</button>` : ''}
        ${board}
      </div>`, null, true);
    if (g.phase === 'answer') {
      const end = Date.now() + g.left;
      qTick = setInterval(() => { const el = document.getElementById('qleft'); if (!el) return clearInterval(qTick); el.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000)); }, 250);
    }
  }

  /* --- Le Petit Bac --- */
  let bacTick = null, bacSend = null;
  function renderBac(g) {
    clearInterval(bacTick);
    const totals = `<div class="scores">${Object.entries(g.totals).sort((a, b) => b[1] - a[1]).map(([p, s], i) => `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}</span><span>${s}${g.phase === 'vote' ? ` <small style="color:var(--ok)">+${g.roundPts[p] || 0}</small>` : ''}</span></div>`).join('')}</div>`;
    if (g.phase === 'write') {
      if (ui.bacRound !== g.roundNo) { ui.bacRound = g.roundNo; ui.bac = g.cats.map(() => ''); }
      // garder le curseur là où on écrit si l'écran se redessine
      const act = document.activeElement, fid = act && act.dataset && act.dataset.bi, pos = act && act.selectionStart;
      A.view(`${top('Le Petit Bac')}
        <div class="stage">
          <div class="bacletter"><small>Manche ${g.roundNo} · lettre</small><b>${esc(g.letter)}</b></div>
          ${g.stopBy ? `<div class="turnbar mine">🛑 ${esc(g.stopBy)} a dit STOP ! <b id="bacleft">${Math.ceil(g.left / 1000)}</b> s</div>` : ''}
          <div class="bacform">${g.cats.map((c, i) => `<label><span>${esc(c)}</span><input data-bi="${i}" value="${esc(ui.bac[i] || '')}" placeholder="${esc(g.letter)}…" autocomplete="off" autocapitalize="sentences" maxlength="40"></label>`).join('')}</div>
          ${g.stopBy ? '' : `<button class="btn primary big block" data-a="bacstop">STOP ! J'ai fini</button>`}
          <p class="hint" style="font-size:.82rem">Mot qui commence par la lettre : 10 points. Même mot qu'un autre joueur : 5 points.</p>
        </div>`, () => {
          document.querySelectorAll('[data-bi]').forEach(inp => inp.addEventListener('input', () => {
            ui.bac[+inp.dataset.bi] = inp.value;
            clearTimeout(bacSend); bacSend = setTimeout(() => send({ k: 'answers', list: ui.bac }), 350);
          }));
          if (fid != null) { const el = document.querySelector(`[data-bi="${fid}"]`); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } }
        }, true);
      if (g.stopBy) {
        send({ k: 'answers', list: ui.bac });
        const end = Date.now() + g.left;
        bacTick = setInterval(() => { const el = document.getElementById('bacleft'); if (!el) return clearInterval(bacTick); el.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000)); }, 250);
      }
      return;
    }
    if (g.phase === 'vote') return A.view(`${top('Le Petit Bac')}
      <div class="stage">
        <div class="bacletter"><small>Résultats · lettre</small><b>${esc(g.letter)}</b></div>
        ${g.cats.map((c, i) => `<div class="baccat"><h4>${esc(c)}</h4>${g.all.map(p => `<button class="bacans ${p.ok[i] ? 'ok' : 'ko'}" ${amHost() && p.list[i] ? `data-a="bactoggle" data-p="${esc(p.name)}" data-i="${i}"` : 'disabled'}>
          <span>${esc(p.name)}</span><b>${esc(p.list[i] || '—')}</b></button>`).join('')}</div>`).join('')}
        <p class="hint">${amHost() ? 'Touche une réponse pour la refuser ou l’accepter (après discussion 😇).' : `${esc(state.host)} valide les réponses…`}</p>
        ${amHost() ? `<button class="btn primary big block" data-a="bacvalidate">Valider les points</button>` : ''}
        ${totals}
      </div>`, null, true);
    A.view(`${top('Le Petit Bac')}
      <div class="stage">
        <div class="card" style="--g:linear-gradient(160deg,#56ab2f,#1e6b52);flex:none;min-height:0;padding:22px"><div class="tag" style="position:static">Après ${g.roundNo} manche${g.roundNo > 1 ? 's' : ''}</div></div>
        ${totals}
        ${amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="bacnext">Nouvelle lettre</button></div>` : `<div class="waiting"><div class="spinner small"></div>${esc(state.host)} tire une nouvelle lettre…</div>`}
      </div>`);
  }

  /* --- Le Dessin --- */
  const PALETTE = ['#16131c', '#e8384f', '#f7b733', '#3ddc97', '#3aa0ff', '#a74ea8', '#ffffff'];
  let dKey = '', dTick = null, cv = null, ctx2 = null, pen = { c: '#16131c', w: 4 }, drawing = null, dBuf = [], dFlush = null;
  function sizeCanvas() {
    if (!cv) return;
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx2 = cv.getContext('2d'); ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
    ctx2.fillStyle = '#fff'; ctx2.fillRect(0, 0, cv.width, cv.height);
  }
  function drawLine(s) {
    if (!ctx2 || !s.pts || !s.pts.length) return;
    const W = cv.width;
    ctx2.strokeStyle = s.c; ctx2.lineWidth = s.w * W / 340;
    ctx2.beginPath();
    s.pts.forEach(([x, y], i) => i ? ctx2.lineTo(x * W, y * cv.height) : ctx2.moveTo(x * W, y * cv.height));
    if (s.pts.length === 1) ctx2.lineTo(s.pts[0][0] * W + .1, s.pts[0][1] * cv.height);
    ctx2.stroke();
  }
  function redraw(strokes) { sizeCanvas(); (strokes || []).forEach(drawLine); }
  function onEvent(e) {
    if (state && state.g && GAMES[state.g.id] && GAMES[state.g.id].onEvent) return GAMES[state.g.id].onEvent(e, ctx());
    if (!state || !state.g || state.g.id !== 'dessin' || !ctx2) return;
    if (e.k === 'stroke') drawLine(e);
    if (e.k === 'clear') redraw([]);
  }
  function flushStroke(first) {
    if (dBuf.length < (first ? 1 : 2)) return;
    send({ k: 'stroke', n: first, c: pen.c, w: pen.w, pts: dBuf.map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]) });
    dBuf = [dBuf[dBuf.length - 1]];   // le prochain paquet repart du dernier point
  }
  function bindDrawing() {
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      drawing = true; dBuf = [pos(e)]; drawLine({ c: pen.c, w: pen.w, pts: dBuf });
      flushStroke(true);
      clearInterval(dFlush); dFlush = setInterval(() => flushStroke(false), 60);
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; e.preventDefault();
      const p = pos(e), last = dBuf[dBuf.length - 1];
      drawLine({ c: pen.c, w: pen.w, pts: [last, p] }); dBuf.push(p);
    });
    const end = () => { if (!drawing) return; drawing = false; clearInterval(dFlush); flushStroke(false); dBuf = []; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function renderDessin(g) {
    clearInterval(dTick);
    const isDrawer = g.me === g.drawer, key = g.roundNo + '|' + g.phase + '|' + isDrawer + '|' + !!g.word + '|' + g.wid;
    const scores = `<div class="scores">${Object.entries(g.scores).sort((a, b) => b[1] - a[1]).map(([p, s], i) => `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}${p === g.drawer ? ' ✏️' : ''}</span><span>${s}</span></div>`).join('')}</div>`;
    const feed = g.feed.slice().reverse().map(f => f.ok ? `<div class="gf ok">✅ ${esc(f.who)} a trouvé ! +${f.pts}</div>` : `<div class="gf"><b>${esc(f.who)}</b> ${esc(f.text)}</div>`).join('') || '<div class="gf muted">Les propositions s’affichent ici…</div>';
    const wordLine = g.word ? `<b>${esc(g.word)}</b>` : `<span class="mask">${esc(g.mask)}</span>`;
    if (key === dKey && document.getElementById('dcv')) {
      // mise à jour légère : on ne touche pas au dessin en cours
      const f = document.getElementById('dfeed'); if (f) f.innerHTML = feed;
      const sc = document.getElementById('dscores'); if (sc) sc.innerHTML = scores;
      const w = document.getElementById('dword'); if (w) w.innerHTML = wordLine;
      startTick(g); return;
    }
    dKey = key;
    if (g.phase === 'reveal') {
      cv = null;
      return A.view(`${top('Le Dessin')}
        <div class="stage">
          <div class="card" style="--g:linear-gradient(160deg,#ff9a8b,#a74ea8);flex:none;min-height:0;padding:22px">
            <div class="tag" style="position:static">Le mot était</div><div class="secret" style="margin-top:8px">${esc(g.word)}</div>
            <div class="sub">${g.found.length ? `Trouvé par ${g.found.map(esc).join(', ')}` : 'Personne n’a trouvé 😅'}</div></div>
          <canvas id="dcv" class="dcanvas"></canvas>
          <div id="dscores">${scores}</div>
          ${amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="dnext">Dessinateur suivant</button></div>` : `<div class="waiting"><div class="spinner small"></div>${esc(state.host)} lance la suite…</div>`}
        </div>`, () => { cv = document.getElementById('dcv'); redraw(g.strokes); });
    }
    A.view(`${top('Le Dessin')}
      <div class="stage" style="gap:10px">
        <div class="dhead"><span>${isDrawer ? '✏️ À toi de dessiner' : `✏️ ${esc(g.drawer)} dessine`}</span><b id="dleft">${Math.ceil(g.left / 1000)}</b></div>
        <div class="dword" id="dword">${wordLine}</div>
        <canvas id="dcv" class="dcanvas ${isDrawer ? 'mine' : ''}"></canvas>
        ${isDrawer ? `
          <div class="dtools">
            ${PALETTE.map(c => `<button class="dcol ${pen.c === c ? 'on' : ''}" style="--c:${c}" data-a="dcolor" data-c="${c}" aria-label="Couleur"></button>`).join('')}
            <button class="dsz ${pen.w === 4 ? 'on' : ''}" data-a="dsize" data-v="4">•</button><button class="dsz big ${pen.w === 12 ? 'on' : ''}" data-a="dsize" data-v="12">●</button>
          </div>
          <div class="row"><button class="btn" data-a="dclear">🗑️ Effacer</button>${g.canChange ? `<button class="btn" data-a="dchange">🔄 Autre mot</button>` : ''}</div>`
        : g.word ? `<div class="turnbar mine">✅ Trouvé ! Attends les autres…</div>`
        : `<form class="add-row" id="dguess" autocomplete="off"><input id="dgin" placeholder="Ta proposition…" enterkeyhint="send" maxlength="40"><button class="btn primary" type="submit">OK</button></form>`}
        <div class="gfeed" id="dfeed">${feed}</div>
        <div id="dscores">${scores}</div>
        ${amHost() ? `<button class="btn ghost" data-a="dskip">Passer ce dessin</button>` : ''}
      </div>`, () => {
        cv = document.getElementById('dcv'); redraw(g.strokes);
        if (isDrawer) bindDrawing();
        const f = document.getElementById('dguess');
        if (f) f.addEventListener('submit', e => { e.preventDefault(); const i = document.getElementById('dgin'); if (i.value.trim()) send({ k: 'guess', text: i.value }); i.value = ''; i.focus(); });
      });
    startTick(g);
  }
  function startTick(g) {
    clearInterval(dTick);
    if (g.phase !== 'draw') return;
    const end = Date.now() + g.left;
    dTick = setInterval(() => {
      const l = Math.max(0, end - Date.now()), el = document.getElementById('dleft');
      if (!el) return clearInterval(dTick);
      el.textContent = Math.ceil(l / 1000);
      if (l < 10000) el.classList.add('hot');
      const w = document.getElementById('dword'), m = w && w.querySelector('.mask');
      if (m && l < g.firstAt && m.textContent[0] === '_') m.textContent = g.firstLetter + m.textContent.slice(1);
    }, 250);
  }

  /* --- Le Téléphone dessiné --- */
  let tKey = '', tTick = null, tSave = null, tStrokes = [], tText = '', tDirty = false;
  function paint(canvas, strokes) {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    const c = canvas.getContext('2d'); c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = '#fff'; c.fillRect(0, 0, canvas.width, canvas.height);
    (strokes || []).forEach(s => {
      if (!s.pts.length) return;
      c.strokeStyle = s.c; c.lineWidth = s.w * canvas.width / 340; c.beginPath();
      s.pts.forEach(([x, y], i) => i ? c.lineTo(x * canvas.width, y * canvas.height) : c.moveTo(x * canvas.width, y * canvas.height));
      if (s.pts.length === 1) c.lineTo(s.pts[0][0] * canvas.width + .1, s.pts[0][1] * canvas.height);
      c.stroke();
    });
    return c;
  }
  function bindLocalDraw(canvas) {
    let cur = null;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000) / 1000, Math.round((e.clientY - r.top) / r.height * 1000) / 1000]; };
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); cur = { c: pen.c, w: pen.w, pts: [pos(e)] }; tStrokes.push(cur); paint(canvas, tStrokes); tDirty = true; });
    canvas.addEventListener('pointermove', e => {
      if (!cur) return; e.preventDefault();
      const p = pos(e), last = cur.pts[cur.pts.length - 1]; cur.pts.push(p);
      const c = canvas.getContext('2d'); c.strokeStyle = cur.c; c.lineWidth = cur.w * canvas.width / 340; c.lineCap = 'round';
      c.beginPath(); c.moveTo(last[0] * canvas.width, last[1] * canvas.height); c.lineTo(p[0] * canvas.width, p[1] * canvas.height); c.stroke();
    });
    const end = () => { cur = null; tDirty = true; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }
  function renderTel(g) {
    clearInterval(tTick);
    const key = g.phase + '|' + g.step + '|' + g.mineDone + '|' + g.rc;
    const waitLine = `${g.waitingFor.length ? `En attente de ${g.waitingFor.map(esc).join(', ')}` : ''}`;
    if (key === tKey && document.getElementById('twait')) { document.getElementById('twait').textContent = waitLine; return startTelTick(g); }
    if (key !== tKey && g.phase === 'play' && !g.mineDone && (!tKey.startsWith('play|' + g.step + '|'))) { tStrokes = []; tText = ''; }
    tKey = key;
    clearInterval(tSave);
    if (g.phase === 'reveal') {
      return A.view(`${top('Le Téléphone dessiné')}
        <div class="stage">
          <div class="turn">Chaîne ${g.rc + 1} / ${g.steps}<strong>La phrase de ${esc(g.owner)}</strong></div>
          <div class="album">${g.chain.map((e, i) => e.type === 'draw'
            ? `<div class="aitem"><small>${esc(e.by)} a dessiné :</small><canvas class="tcanvas small" data-ci="${i}"></canvas></div>`
            : `<div class="aitem"><small>${esc(e.by)} ${i ? 'a cru voir' : 'a écrit'} :</small><div class="abubble">${esc(e.data)}</div></div>`).join('')}</div>
          ${amHost() ? `<div class="row"><button class="btn" data-a="trgo" data-d="-1" ${g.rc ? '' : 'disabled'}>← Précédente</button><button class="btn primary" data-a="trgo" data-d="1" ${g.rc < g.steps - 1 ? '' : 'disabled'}>Suivante →</button></div>
            <div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn" data-a="tagain">Nouvelle partie</button></div>` : `<p class="hint">${esc(state.host)} fait défiler les chaînes</p>`}
        </div>`, () => document.querySelectorAll('[data-ci]').forEach(cv => paint(cv, g.chain[+cv.dataset.ci].data)));
    }
    if (g.mineDone) {
      return A.view(`${top('Le Téléphone dessiné')}
        <div class="stage" style="justify-content:center;text-align:center">
          <div class="big-num" style="font-size:4rem">✅</div>
          <p class="hint">C'est envoyé ! <b id="tleft">${Math.ceil(g.left / 1000)}</b> s</p>
          <div class="waiting" id="twait">${waitLine}</div>
        </div>`, () => startTelTick(g));
    }
    const head = `<div class="dhead"><span>Étape ${g.step + 1} / ${g.steps}</span><b id="tleft">${Math.ceil(g.left / 1000)}</b></div>`;
    if (g.type === 'write') {
      const first = g.step === 0;
      return A.view(`${top('Le Téléphone dessiné')}
        <div class="stage" style="gap:10px">
          ${head}
          ${first ? `<div class="card" style="--g:linear-gradient(160deg,#00c6ff,#7b2ff7);flex:none;min-height:0;padding:20px"><div class="txt" style="font-size:1.25rem">Écris une phrase marrante que quelqu'un devra dessiner ✍️</div></div>`
            : `<p class="label" style="margin:0">Qu'est-ce que ce dessin représente ?</p><canvas id="tprev" class="tcanvas"></canvas>`}
          <form class="add-row" id="tform" autocomplete="off"><input id="tin" maxlength="80" placeholder="${first ? 'Ex : un chat qui fait du ski' : 'Je pense que c’est…'}" value="${esc(tText)}"><button class="btn primary" type="submit">OK</button></form>
          ${first ? `<button class="btn" data-a="tidea">🎲 Donne-moi une idée</button>` : ''}
          <div class="waiting" id="twait">${waitLine}</div>
        </div>`, () => {
          if (!first) paint(document.getElementById('tprev'), g.prev && g.prev.data);
          const inp = document.getElementById('tin');
          inp.addEventListener('input', () => { tText = inp.value; tDirty = true; });
          document.getElementById('tform').addEventListener('submit', e => { e.preventDefault(); tText = inp.value; if (!tText.trim()) return toast('Écris quelque chose 🙂'); send({ k: 'submit', data: tText }); });
          tSave = setInterval(() => { if (tDirty) { tDirty = false; send({ k: 'save', data: tText }); } }, 1500);
          startTelTick(g);
        });
    }
    A.view(`${top('Le Téléphone dessiné')}
      <div class="stage" style="gap:10px">
        ${head}
        <div class="dword">Dessine : « ${esc(g.prev ? g.prev.data : '')} »</div>
        <canvas id="tcv" class="tcanvas mine"></canvas>
        <div class="dtools">
          ${PALETTE.map(c => `<button class="dcol ${pen.c === c ? 'on' : ''}" style="--c:${c}" data-a="dcolor" data-c="${c}" aria-label="Couleur"></button>`).join('')}
          <button class="dsz ${pen.w === 4 ? 'on' : ''}" data-a="dsize" data-v="4">•</button><button class="dsz big ${pen.w === 12 ? 'on' : ''}" data-a="dsize" data-v="12">●</button>
        </div>
        <div class="row"><button class="btn" data-a="tundo">↩️ Annuler</button><button class="btn primary" data-a="tsend">Terminé ✓</button></div>
        <div class="waiting" id="twait">${waitLine}</div>
      </div>`, () => {
        const cvs = document.getElementById('tcv'); paint(cvs, tStrokes); bindLocalDraw(cvs);
        tSave = setInterval(() => { if (tDirty) { tDirty = false; send({ k: 'save', data: tStrokes }); } }, 2000);
        startTelTick(g);
      });
  }
  function startTelTick(g) {
    clearInterval(tTick);
    if (g.phase !== 'play') return;
    const end = Date.now() + g.left;
    tTick = setInterval(() => { const el = document.getElementById('tleft'); if (!el) return clearInterval(tTick); const l = Math.max(0, end - Date.now()); el.textContent = Math.ceil(l / 1000); el.classList.toggle('hot', l < 10000); }, 250);
  }

  /* --- Loups-garous --- */
  const roleName = r => r ? `${ROLES[r].e} ${ROLES[r].name}` : '';
  function renderLoups(g) {
    const tv = g.me === TV;
    if (tv) g = { ...g, dead: true, roleInfo: { e: '📺', name: 'Écran TV', desc: '' } };
    const R = g.roleInfo;
    const roleChip = tv ? '' : `<div class="rolechip ${g.role === 'loup' ? 'wolf' : ''}" data-a="peek">${ui.peek ? `${R.e} ${esc(R.name)}` : '👁️ Mon rôle'}</div>`;
    const plist = (mode) => `<div class="lplayers">${g.players.map(p => {
        const disabled = !p.alive || (mode === 'vote' && p.name === g.me) || (mode === 'night' && (
          (g.role === 'loup' && p.role === 'loup') || (g.role === 'voyante' && p.name === g.me) || (g.role === 'docteur' && p.name === g.lastDoc)));
        const wolfVoters = g.wolfVotes ? Object.entries(g.wolfVotes).filter(([, t]) => t === p.name).map(([w]) => w) : [];
        const chosen = (mode === 'vote' && g.myVote === p.name) || (g.wolfVotes && g.wolfVotes[g.me] === p.name);
        return `<button class="lp ${p.alive ? '' : 'dead'} ${chosen ? 'chosen' : ''}" ${mode && !disabled ? `data-a="${mode === 'vote' ? 'lvote' : 'lnight'}" data-p="${esc(p.name)}"` : 'disabled'}>
          <b>${p.alive ? '' : '💀 '}${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}</b>${p.role ? `<span>${roleName(p.role)}</span>` : ''}${wolfVoters.length ? `<em>🐺 ${wolfVoters.map(esc).join(', ')}</em>` : ''}</button>`;
      }).join('')}</div>`;
    const deadNote = !tv && g.dead && g.phase !== 'end' ? `<p class="exch">👻 Tu es mort·e : tu vois tous les rôles, mais chut, plus un mot !</p>` : '';
    const hostBtn = (label, a) => amHost() ? `<button class="btn primary big block" data-a="${a}">${label}</button>` : `<div class="waiting"><div class="spinner small"></div>${esc(state.host)} continue…</div>`;
    const T = (title, body, extra = '') => A.view(`${A.header(title, `<span class="room-code">${esc(state.code)}</span>`)}<div class="stage">${extra}${body}</div>`);

    if (tv && g.phase === 'roles') return T('Loups-garous 🐺', `
      <div class="card" style="--g:linear-gradient(160deg,#2c5364,#203a43)">
        <div class="tag">La partie commence</div>
        <div class="secret" style="font-size:2.4rem">Chacun découvre son rôle secret 🤫</div>
        <div class="sub">${g.readyCount} / ${g.players.length} prêts</div>
      </div>${plist(null)}`);
    if (g.phase === 'roles') return T('Loups-garous', `
      <div class="card ${ui.peek ? '' : 'hideable'}" style="--g:${g.role === 'loup' ? 'linear-gradient(160deg,#7a1630,#2b0a12)' : 'linear-gradient(160deg,#2c5364,#203a43)'}" data-a="peek">
        <div class="tag">Ton rôle secret</div>
        <div class="secret ${ui.peek ? '' : 'blur'}" style="font-size:2.4rem">${R.e} ${esc(R.name)}</div>
        <div class="sub ${ui.peek ? '' : 'blur'}">${esc(R.desc)}</div>
        ${g.role === 'loup' && ui.peek ? `<div class="sub">Tes complices : ${g.players.filter(p => p.role === 'loup' && p.name !== g.me).map(p => esc(p.name)).join(', ') || 'aucun, tu es seul·e'}</div>` : ''}
        <div class="sub">${ui.peek ? 'Touche pour cacher' : 'Touche pour voir (cache ton écran 👀)'}</div>
      </div>
      ${g.ready ? `<div class="waiting">Prêt·e ✓ · ${g.readyCount} / ${g.players.length}</div>` : `<button class="btn primary big block" data-a="lseen">J'ai vu mon rôle</button>`}`);

    if (g.phase === 'night') {
      let task;
      if (g.dead) task = `<p class="hint">Le village dort… 🌙${tv ? ` <b>${g.pending}</b> en attente` : ''}</p>`;
      else if (g.acted) task = `<div class="waiting">✓ C'est noté. Garde les yeux fermés… (${g.pending} en attente)</div>`;
      else if (g.role === 'loup') task = `<p class="hint"><b>🐺 Loups :</b> choisissez votre victime. Mettez-vous d'accord en silence (vos votes s'affichent entre loups).</p>`;
      else if (g.role === 'voyante') task = `<p class="hint"><b>🔮 Voyante :</b> choisis un joueur pour découvrir son rôle.</p>`;
      else if (g.role === 'docteur') task = `<p class="hint"><b>🩺 Docteur :</b> choisis qui protéger cette nuit${g.lastDoc ? ` (pas ${esc(g.lastDoc)})` : ''}.</p>`;
      else task = `<p class="hint">Touche le nom de quelqu'un que tu soupçonnes. <small>(Tout le monde touche son écran la nuit, pour ne pas se trahir.)</small></p>`;
      return T(`Nuit ${g.night} 🌙`, `${roleChip}${deadNote}${task}${plist(!g.dead && !g.acted || (g.role === 'loup' && !g.dead) ? 'night' : null)}`, `<div class="nightsky"></div>`);
    }
    if (g.phase === 'dawn') {
      const d = g.dawn, seer = g.seer && g.seer[d.night];
      return T(`Jour ${d.night} ☀️`, `
        <div class="card" style="--g:linear-gradient(160deg,#f7b733,#e0702a);flex:none;min-height:0;padding:24px">
          <div class="tag" style="position:static">Le village se réveille</div>
          ${d.victim ? `<div class="secret" style="margin-top:10px">💀 ${esc(d.victim)}</div><div class="sub">a été dévoré·e cette nuit. C'était : <b>${roleName(d.role)}</b></div>`
            : `<div class="secret" style="margin-top:10px">Personne n'est mort 🙌</div><div class="sub">${d.saved ? 'Le docteur a sauvé la victime !' : 'Les loups n’ont rien fait…'}</div>`}
        </div>
        ${seer ? `<p class="exch">🔮 Ta vision : <b>${esc(seer.who)}</b> est ${roleName(seer.role)}</p>` : ''}
        ${deadNote}
        <p class="hint">Discutez : qui est loup ? Puis votez.</p>
        ${plist(null)}
        ${hostBtn('Passer au vote 🗳️', 'lday')}`, roleChip);
    }
    if (g.phase === 'vote') return T('Vote du village 🗳️', `
      ${roleChip}${deadNote}
      <p class="hint">${g.dead ? 'Les vivants votent…' : 'Qui veut-on éliminer ? Tu peux changer d’avis tant que tout le monde n’a pas voté.'}</p>
      ${plist(g.dead ? null : 'vote')}
      ${g.dead ? '' : `<button class="btn ${g.myVote === '—' ? 'ok' : ''}" data-a="lvote" data-p="—">Personne (vote blanc)</button>`}
      <div class="waiting">${g.nVotes} / ${g.nAlive} votes</div>`);
    if (g.phase === 'result') {
      const r = g.result;
      return T('Verdict ⚖️', `
        <div class="card" style="--g:linear-gradient(160deg,#434343,#7a1630);flex:none;min-height:0;padding:24px">
          ${r.out ? `<div class="tag" style="position:static">Le village élimine</div><div class="secret" style="margin-top:10px">${esc(r.out)}</div><div class="sub">C'était : <b>${roleName(r.role)}</b></div>`
            : `<div class="secret">${r.tie ? 'Égalité' : 'Personne'}</div><div class="sub">Personne n'est éliminé aujourd'hui.</div>`}
        </div>
        <div class="found">${Object.entries(r.votes).map(([v, t]) => `<span>${esc(v)} → ${esc(t)}</span>`).join('')}</div>
        ${roleChip}
        ${hostBtn('La nuit tombe… 🌙', 'lnightgo')}`);
    }
    const villageWon = g.winner === 'village';
    T('Loups-garous', `
      <div class="card" style="--g:${villageWon ? 'linear-gradient(160deg,#3ddc97,#16865c)' : 'linear-gradient(160deg,#7a1630,#2b0a12)'};flex:none;min-height:0;padding:26px">
        <div class="big-num" style="font-size:4rem">${villageWon ? '🧑‍🌾' : '🐺'}</div>
        <div class="secret">${villageWon ? 'Le village gagne !' : 'Les loups gagnent !'}</div>
      </div>
      ${plist(null)}
      ${amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="lagain">Rejouer</button></div>` : ''}`);
  }

  /* ---------- Actions ---------- */
  function ctx() {
    return { g: state && state.g, state, ui, send, amHost, top, esc, toast, buzz, beep, pick, shuffle, view: A.view, render, me: state && state.me, host: state && state.host };
  }
  function on(a, el) {
    if (state && state.g && GAMES[state.g.id] && GAMES[state.g.id].on && GAMES[state.g.id].on(a, el, ctx()) !== false) return;
    if (a === 'tvjoin') { ui.tv = true; ui.err = ''; ui.code = (document.getElementById('ocode')?.value || ui.code); return joinRoom(); }
    if (a === 'create' || a === 'join') {
      ui.tv = false;
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
    // Loups-garous
    if (a === 'lseen') { ui.peek = false; return send({ k: 'seen' }); }
    if (a === 'lnight') { buzz(15); return send({ k: 'night', p: el.dataset.p }); }
    if (a === 'lday') return send({ k: 'day' });
    if (a === 'lvote') { buzz(15); return send({ k: 'vote', p: el.dataset.p }); }
    if (a === 'lnightgo') { ui.peek = false; return send({ k: 'night' }); }
    if (a === 'lagain') { ui.peek = false; return send({ k: 'again' }); }
    // Téléphone dessiné
    if (a === 'tidea') { tText = pick(A.D.telephone); const i = document.getElementById('tin'); if (i) i.value = tText; tDirty = true; return; }
    if (a === 'tundo') { tStrokes.pop(); tDirty = true; const c = document.getElementById('tcv'); if (c) paint(c, tStrokes); return; }
    if (a === 'tsend') { clearInterval(tSave); return send({ k: 'submit', data: tStrokes }); }
    if (a === 'trgo') return send({ k: 'rgo', d: +el.dataset.d });
    if (a === 'tagain') return send({ k: 'again' });
    // Dessin
    if (a === 'dcolor') { pen.c = el.dataset.c; document.querySelectorAll('.dcol').forEach(b => b.classList.toggle('on', b === el)); return; }
    if (a === 'dsize') { pen.w = +el.dataset.v; document.querySelectorAll('.dsz').forEach(b => b.classList.toggle('on', b === el)); return; }
    if (a === 'dclear') { redraw([]); return send({ k: 'clear' }); }
    if (a === 'dchange') { dKey = ''; return send({ k: 'change' }); }
    if (a === 'dnext') return send({ k: 'next' });
    if (a === 'dskip') return send({ k: 'skip' });
    // Petit Bac
    if (a === 'bacstop') { buzz([60, 40, 60]); return send({ k: 'stop', list: ui.bac }); }
    if (a === 'bactoggle') return send({ k: 'toggle', p: el.dataset.p, i: +el.dataset.i });
    if (a === 'bacvalidate') return send({ k: 'validate' });
    if (a === 'bacnext') return send({ k: 'next' });
    // Quiz
    if (a === 'buzz') { buzz(60); return send({ k: 'buzz' }); }
    if (a === 'qans') return send({ k: 'answer', i: +el.dataset.i });
    if (a === 'qreveal') return send({ k: 'reveal' });
    if (a === 'qnext') return send({ k: 'next' });
    if (a === 'qagain') return send({ k: 'again' });
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
