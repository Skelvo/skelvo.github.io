/* ==========================================================================
   Jeux de cartes en ligne (jetons fictifs, aucun argent réel).
   Poker (Texas Hold'em) · Blackjack
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO, O = A.online;
const { esc, shuffle } = A;

/* ---------- Cartes ---------- */
const RANKS = '23456789TJQKA', SUITS = 'shdc';
const newDeck = (n = 1) => shuffle(Array.from({ length: n }, () => [...RANKS].flatMap(r => [...SUITS].map(s => r + s))).flat());
const rv = c => RANKS.indexOf(c[0]) + 2;
const RLABEL = { T: '10', J: 'V', Q: 'D', K: 'R', A: 'A' };
const SLABEL = { s: '♠', h: '♥', d: '♦', c: '♣' };
const cardHtml = (c, cls = '') => c === '??'
  ? `<span class="pc back ${cls}"></span>`
  : `<span class="pc ${c[1] === 'h' || c[1] === 'd' ? 'red' : ''} ${cls}"><b>${RLABEL[c[0]] || c[0]}</b><i>${SLABEL[c[1]]}</i></span>`;

/* ---------- Évaluation des mains de poker ---------- */
const HAND_NAMES = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];
function eval5(cards) {
  const v = cards.map(rv).sort((a, b) => b - a);
  const flush = cards.every(c => c[1] === cards[0][1]);
  let uniq = [...new Set(v)], straightHigh = 0;
  if (uniq.length === 5) {
    if (v[0] - v[4] === 4) straightHigh = v[0];
    else if (v.join() === '14,5,4,3,2') straightHigh = 5;      // la roue A-2-3-4-5
  }
  const cnt = {}; v.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const order = groups.map(g => g[1]);
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0][0] === 4) return [7, ...order];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...order];
  if (flush) return [5, ...v];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][0] === 3) return [3, ...order];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...order];
  if (groups[0][0] === 2) return [1, ...order];
  return [0, ...v];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function best7(cards) {
  let best = null;
  for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
    const five = cards.filter((_, i) => i !== a && i !== b);
    const s = eval5(five); if (!best || cmp(s, best) > 0) best = s;
  }
  return best;
}
A.pokerEval = { eval5, best7, cmp, HAND_NAMES };   // exposé pour les tests

/* ======================================================================
   🃏 POKER — Texas Hold'em, jetons fictifs
   ====================================================================== */
function Poker(names) {
  const START = 1000, SB = 10, BB = 20;
  const seats = shuffle(names), stack = {}; seats.forEach(p => stack[p] = START);
  let dealer = -1, deck, hole, board, bet, contrib, folded, allin, acted, curBet, minRaise, turn, street, phase, result, handNo = 0, log;
  const inHand = () => seats.filter(p => hole[p] && !folded[p]);
  const canAct = p => hole[p] && !folded[p] && !allin[p];
  const nextFrom = (i, pred) => { for (let k = 1; k <= seats.length; k++) { const p = seats[(i + k) % seats.length]; if (pred(p)) return p; } return null; };
  function newHand() {
    const alive = seats.filter(p => stack[p] > 0);
    if (alive.length < 2) { phase = 'over'; return; }
    handNo++; deck = newDeck(); hole = {}; board = []; bet = {}; contrib = {}; folded = {}; allin = {}; acted = {}; result = null; log = '';
    do dealer = (dealer + 1) % seats.length; while (stack[seats[dealer]] <= 0);
    alive.forEach(p => { hole[p] = [deck.pop(), deck.pop()]; bet[p] = 0; contrib[p] = 0; });
    const heads = alive.length === 2;
    const sbP = heads ? seats[dealer] : nextFrom(dealer, p => !!hole[p]);
    const bbP = nextFrom(seats.indexOf(sbP), p => !!hole[p]);
    post(sbP, SB); post(bbP, BB);
    curBet = BB; minRaise = BB; street = 0; phase = 'bet';
    turn = nextFrom(seats.indexOf(bbP), canAct);
    log = `Main ${handNo} · petite blinde ${sbP}, grosse blinde ${bbP}`;
    if (!turn || everyoneSettled()) advanceStreet();
  }
  function post(p, n) { const x = Math.min(n, stack[p]); stack[p] -= x; bet[p] += x; contrib[p] += x; if (!stack[p]) allin[p] = true; }
  function everyoneSettled() { return seats.filter(canAct).every(p => acted[p] && bet[p] === curBet); }
  function advanceStreet() {
    seats.forEach(p => { if (hole[p]) bet[p] = 0; }); acted = {}; curBet = 0; minRaise = BB;
    if (inHand().length === 1) return finish();
    if (street === 3) return showdown();
    street++;
    if (street === 1) board.push(deck.pop(), deck.pop(), deck.pop()); else board.push(deck.pop());
    if (seats.filter(canAct).length < 2) return advanceStreet();     // plus personne ne peut miser : on déroule
    turn = nextFrom(dealer, canAct);
  }
  function afterAction(p) {
    acted[p] = true;
    if (inHand().length === 1) return finish();
    if (everyoneSettled()) return advanceStreet();
    turn = nextFrom(seats.indexOf(p), canAct);
    if (!turn) advanceStreet();
  }
  function finish() {
    const w = inHand()[0], pot = seats.reduce((a, p) => a + (contrib[p] || 0), 0);
    stack[w] += pot; phase = 'show'; result = { pots: [{ amount: pot, winners: [w] }], reveal: false };
    log = `${w} remporte ${pot} (les autres se sont couchés)`;
  }
  function showdown() {
    while (board.length < 5) board.push(deck.pop());
    const live = inHand(), scores = {}; live.forEach(p => scores[p] = best7(hole[p].concat(board)));
    const levels = [...new Set(seats.filter(p => contrib[p] > 0).map(p => contrib[p]))].sort((a, b) => a - b);
    const pots = []; let prev = 0;
    levels.forEach(l => {
      const amount = seats.reduce((a, p) => a + Math.max(0, Math.min(contrib[p] || 0, l) - prev), 0);
      const elig = live.filter(p => contrib[p] >= l);
      if (amount && elig.length) {
        let best = null; elig.forEach(p => { if (!best || cmp(scores[p], best) > 0) best = scores[p]; });
        const winners = elig.filter(p => cmp(scores[p], best) === 0);
        const share = Math.floor(amount / winners.length); let rest = amount - share * winners.length;
        winners.forEach(p => { stack[p] += share + (rest-- > 0 ? 1 : 0); });
        pots.push({ amount, winners, hand: HAND_NAMES[best[0]] });
      } else if (amount && pots.length) { /* jetons non contestés : rendus au dernier pot */ pots[pots.length - 1].amount += amount; pots[pots.length - 1].winners.forEach(p => stack[p] += Math.floor(amount / pots[pots.length - 1].winners.length)); }
      prev = l;
    });
    phase = 'show';
    result = { pots, reveal: true, hands: Object.fromEntries(live.map(p => [p, HAND_NAMES[scores[p][0]]])) };
    log = pots.map(pt => `${pt.winners.join(' & ')} gagne ${pt.amount}${pt.hand ? ` (${pt.hand})` : ''}`).join(' · ');
  }
  function act(who, a, isHost) {
    if (a.k === 'deal' && isHost && (phase === 'show')) { newHand(); return; }
    if (a.k === 'rebuy' && isHost && (phase === 'show' || phase === 'over')) { seats.forEach(p => { if (stack[p] <= 0) stack[p] = START; }); if (phase === 'over') newHand(); return; }
    if (phase !== 'bet' || who !== turn) return 'Ce n’est pas ton tour';
    const need = curBet - bet[who];
    if (a.k === 'fold') { folded[who] = true; log = `${who} se couche`; return afterAction(who); }
    if (a.k === 'check') { if (need > 0) return 'Il faut suivre ou se coucher'; log = `${who} parole`; return afterAction(who); }
    if (a.k === 'call') { if (need <= 0) return 'Rien à suivre'; post(who, need); log = `${who} suit${allin[who] ? ' (tapis)' : ''}`; return afterAction(who); }
    if (a.k === 'raise') {
      const to = Math.floor(+a.to || 0), maxTo = bet[who] + stack[who];
      const allIn = to >= maxTo;
      if (!allIn && to < curBet + minRaise) return `Relance minimum : ${curBet + minRaise}`;
      const target = Math.min(to, maxTo);
      if (target <= curBet) { if (need > 0) { post(who, need); log = `${who} suit (tapis)`; return afterAction(who); } return 'Relance trop petite'; }
      const raiseBy = target - curBet;
      post(who, target - bet[who]);
      if (raiseBy >= minRaise) { minRaise = raiseBy; seats.forEach(p => { if (p !== who) acted[p] = false; }); }
      curBet = target; log = `${who} ${allin[who] ? 'fait tapis' : 'relance'} à ${target}`;
      return afterAction(who);
    }
  }
  function view(me) {
    const pot = seats.reduce((a, p) => a + (contrib && contrib[p] || 0), 0);
    return {
      id: 'poker', phase, me, handNo, turn, street, board: board || [], pot, log, curBet, minRaise, dealer: seats[dealer],
      mine: hole && hole[me] || null, myBet: bet && bet[me] || 0, myStack: stack[me],
      players: seats.map(p => ({
        name: p, stack: stack[p], bet: bet && bet[p] || 0, folded: !!(folded && folded[p]), allin: !!(allin && allin[p]), out: !hole || !hole[p],
        cards: phase === 'show' && result && result.reveal && hole[p] && !folded[p] ? hole[p] : null,
        hand: phase === 'show' && result && result.hands ? result.hands[p] : null
      })),
      result: phase === 'show' ? result : null,
      champion: phase === 'over' ? seats.find(p => stack[p] > 0) : null
    };
  }
  newHand();
  return { act, view, min: 2, max: 8 };
}
function renderPoker(g, ctx) {
  const T = 'Poker';
  const me = g.players.find(p => p.name === g.me);
  const seats = `<div class="pkseats">${g.players.map(p => `<div class="pkseat ${p.name === g.turn && g.phase === 'bet' ? 'now' : ''} ${p.folded || p.out ? 'gone' : ''} ${g.result && g.result.pots.some(pt => pt.winners.includes(p.name)) ? 'win' : ''}">
      <b>${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}${p.name === g.dealer ? ' <i class="dbtn">D</i>' : ''}</b>
      <span>🪙 ${p.stack}</span>
      ${p.cards ? `<div class="mini">${p.cards.map(c => cardHtml(c, 'tiny')).join('')}</div><em>${esc(p.hand || '')}</em>`
        : p.folded ? '<em>couché</em>' : p.allin ? '<em>tapis !</em>' : p.bet ? `<em>mise ${p.bet}</em>` : ''}
    </div>`).join('')}</div>`;
  if (g.phase === 'over') return ctx.view(`${ctx.top(T)}
    <div class="stage">
      <div class="card" style="--g:linear-gradient(160deg,#0f9b0f,#065c06);flex:none;min-height:0;padding:24px"><div class="big-num" style="font-size:4rem">🏆</div><div class="secret">${esc(g.champion || '')}</div><div class="sub">a raflé tous les jetons !</div></div>
      ${seats}
      ${ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="pkrebuy">Recaver tout le monde</button></div>` : ''}
    </div>`);
  const myTurn = g.phase === 'bet' && g.turn === g.me;
  const need = g.curBet - g.myBet;
  const maxTo = g.myBet + (me ? me.stack : 0), minTo = Math.min(maxTo, g.curBet + g.minRaise);
  if (ctx.ui.pkTo == null || ctx.ui.pkTo < minTo || ctx.ui.pkTo > maxTo || ctx.ui.pkHand !== g.handNo + '|' + g.street + '|' + g.curBet) { ctx.ui.pkTo = minTo; ctx.ui.pkHand = g.handNo + '|' + g.street + '|' + g.curBet; }
  ctx.view(`${ctx.top(T)}
    <div class="stage" style="gap:10px">
      ${seats}
      <div class="table pktable">
        <div class="pile">${[0, 1, 2, 3, 4].map(i => g.board[i] ? cardHtml(g.board[i]) : '<span class="pc slot"></span>').join('')}</div>
        <small>Pot : 🪙 ${g.pot}</small>
      </div>
      <p class="log">${esc(g.log)}</p>
      ${g.mine ? `<div class="pkhand">${g.mine.map(c => cardHtml(c, 'big')).join('')}</div>` : '<p class="hint">Tu regardes cette main 👀</p>'}
      ${g.phase === 'show' ? (ctx.amHost() ? `<div class="row"><button class="btn" data-a="pkrebuy">Recaver les éliminés</button><button class="btn primary" data-a="pkdeal">Main suivante</button></div>` : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} distribue…</div>`)
        : myTurn ? `
          <div class="turnbar mine">👉 À toi · ${need > 0 ? `${Math.min(need, me.stack)} pour suivre` : 'personne n’a misé'}</div>
          ${maxTo > g.curBet ? `<div class="pkraise"><input type="range" id="pkto" min="${minTo}" max="${maxTo}" step="10" value="${ctx.ui.pkTo}"><b id="pktov">${ctx.ui.pkTo >= maxTo ? 'Tapis' : ctx.ui.pkTo}</b></div>` : ''}
          <div class="row">
            <button class="btn" data-a="pkfold">Se coucher</button>
            ${need > 0 ? `<button class="btn ok" data-a="pkcall">Suivre ${Math.min(need, me.stack)}</button>` : `<button class="btn ok" data-a="pkcheck">Parole</button>`}
          </div>
          ${maxTo > g.curBet ? `<button class="btn primary block" data-a="pkraise">${g.curBet ? 'Relancer' : 'Miser'} <span id="pkbtnv">${ctx.ui.pkTo >= maxTo ? '(tapis)' : 'à ' + ctx.ui.pkTo}</span></button>` : ''}`
        : `<div class="turnbar">${g.turn ? `Au tour de ${esc(g.turn)}…` : '…'}</div>`}
      ${ctx.amHost() ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}
    </div>`, () => {
      const r = document.getElementById('pkto'); if (!r) return;
      r.addEventListener('input', () => { ctx.ui.pkTo = +r.value; const all = +r.value >= maxTo; document.getElementById('pktov').textContent = all ? 'Tapis' : r.value; document.getElementById('pkbtnv').textContent = all ? '(tapis)' : 'à ' + r.value; });
    }, true);
}

/* ======================================================================
   🂡 BLACKJACK — contre la banque, tout le monde joue en même temps
   ====================================================================== */
function bjValue(cards) {
  let t = 0, aces = 0;
  cards.forEach(c => { const r = c[0]; if (r === 'A') { aces++; t += 11; } else if ('TJQK'.includes(r)) t += 10; else t += +r; });
  while (t > 21 && aces) { t -= 10; aces--; }
  return { t, soft: aces > 0 };
}
const isBJ = cards => cards.length === 2 && bjValue(cards).t === 21;
function Blackjack(names) {
  const START = 1000, stack = {}; names.forEach(p => stack[p] = START);
  let shoe = newDeck(6), phase, bets, hands, dealer, done, outcome, round = 0;
  const draw = () => { if (shoe.length < 60) shoe = newDeck(6); return shoe.pop(); };
  function newRound() { round++; phase = 'bet'; bets = {}; hands = {}; dealer = []; done = {}; outcome = null; }
  function deal() {
    phase = 'play';
    Object.keys(bets).forEach(p => { hands[p] = [draw(), draw()]; if (isBJ(hands[p])) done[p] = true; });
    dealer = [draw(), draw()];
    if (isBJ(dealer)) return settle();
    checkAllDone();
  }
  function checkAllDone() { if (Object.keys(bets).every(p => done[p])) settle(); }
  function settle() {
    const anyAlive = Object.keys(bets).some(p => bjValue(hands[p]).t <= 21 && !isBJ(hands[p]));
    if (anyAlive && !isBJ(dealer)) { while (true) { const v = bjValue(dealer); if (v.t < 17) dealer.push(draw()); else break; } }
    const dv = bjValue(dealer).t, dBJ = isBJ(dealer); outcome = {};
    Object.keys(bets).forEach(p => {
      const v = bjValue(hands[p]).t, b = bets[p], bj = isBJ(hands[p]);
      let res, gain;
      if (v > 21) { res = 'Sauté'; gain = -b; }
      else if (bj && !dBJ) { res = 'Blackjack !'; gain = Math.floor(b * 1.5); }
      else if (dBJ && !bj) { res = 'Blackjack de la banque'; gain = -b; }
      else if (dv > 21 || v > dv) { res = 'Gagné'; gain = b; }
      else if (v === dv) { res = 'Égalité'; gain = 0; }
      else { res = 'Perdu'; gain = -b; }
      stack[p] += b + gain; outcome[p] = { res, gain };
    });
    phase = 'result';
  }
  function act(who, a, isHost) {
    if (a.k === 'bet' && phase === 'bet' && !(who in bets)) {
      const b = Math.floor(+a.v || 0); if (b < 10 || b > stack[who]) return 'Mise invalide';
      bets[who] = b; stack[who] -= b;
      if (names.filter(p => stack[p] + (bets[p] || 0) >= 10).every(p => p in bets)) deal();
      return;
    }
    if (a.k === 'dealnow' && isHost && phase === 'bet' && Object.keys(bets).length) { deal(); return; }
    if (phase === 'play' && hands[who] && !done[who]) {
      if (a.k === 'hit') { hands[who].push(draw()); if (bjValue(hands[who]).t >= 21) done[who] = true; checkAllDone(); return; }
      if (a.k === 'stand') { done[who] = true; checkAllDone(); return; }
      if (a.k === 'double' && hands[who].length === 2 && stack[who] >= bets[who]) { stack[who] -= bets[who]; bets[who] *= 2; hands[who].push(draw()); done[who] = true; checkAllDone(); return; }
    }
    if (a.k === 'next' && isHost && phase === 'result') { newRound(); return; }
    if (a.k === 'rebuy' && isHost && phase !== 'play') { names.forEach(p => { if (stack[p] < 10 && !(p in (bets || {}))) stack[p] = START; }); return; }
  }
  function view(me) {
    const hide = phase === 'play';
    return {
      id: 'blackjack', phase, me, round,
      dealer: hide ? [dealer[0], '??'] : dealer, dealerVal: hide ? null : bjValue(dealer).t,
      players: names.map(p => ({ name: p, stack: stack[p], bet: bets[p] || 0, cards: hands[p] || null, val: hands[p] ? bjValue(hands[p]).t : null, done: !!done[p], out: outcome && outcome[p] })),
      myBet: bets[me] || null, myHand: hands[me] || null, myVal: hands[me] ? bjValue(hands[me]) : null, myDone: !!done[me], myStack: stack[me],
      canDouble: phase === 'play' && hands[me] && hands[me].length === 2 && stack[me] >= bets[me] && !done[me],
      nBets: Object.keys(bets).length
    };
  }
  newRound();
  return { act, view, min: 1, max: 7 };
}
function renderBJ(g, ctx) {
  const T = 'Blackjack';
  const dealer = `<div class="table pktable"><small>Banque${g.dealerVal != null ? ` · ${g.dealerVal}` : ''}</small><div class="pile">${g.dealer.length ? g.dealer.map(c => cardHtml(c)).join('') : '<span class="pc slot"></span><span class="pc slot"></span>'}</div></div>`;
  const others = `<div class="pkseats">${g.players.map(p => `<div class="pkseat ${p.out ? (p.out.gain > 0 ? 'win' : p.out.gain < 0 ? 'gone' : '') : ''}">
      <b>${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}</b><span>🪙 ${p.stack}${p.bet ? ` · mise ${p.bet}` : ''}</span>
      ${p.cards ? `<div class="mini">${p.cards.map(c => cardHtml(c, 'tiny')).join('')}</div><em>${p.val}${p.out ? ` · ${esc(p.out.res)}` : p.done ? ' ✓' : ''}</em>` : ''}
    </div>`).join('')}</div>`;
  if (g.phase === 'bet') {
    const chips = [10, 50, 100, 250].filter(c => c <= g.myStack);
    return ctx.view(`${ctx.top(T)}
      <div class="stage">
        ${dealer}
        <div class="mineonly">${g.myBet ? `<div class="turnbar mine">Ta mise : 🪙 ${g.myBet} · en attente des autres</div>`
          : g.myStack >= 10 ? `<div class="label">Ta mise (tu as 🪙 ${g.myStack})</div>
            <div class="seg">${chips.map(c => `<button data-a="bjbet" data-v="${c}">${c}</button>`).join('')}<button data-a="bjbet" data-v="${g.myStack}">Tout</button></div>`
          : '<p class="hint">Plus de jetons… demande à l’hôte de te recaver 😅</p>'}</div>
        ${others}
        ${ctx.amHost() ? `<div class="row"><button class="btn" data-a="bjrebuy">Recaver</button><button class="btn" data-a="bjdeal" ${g.nBets ? '' : 'disabled'}>Distribuer</button></div>` : ''}
      </div>`);
  }
  const v = g.myVal;
  ctx.view(`${ctx.top(T)}
    <div class="stage">
      ${dealer}
      ${g.myHand ? `<div class="pkhand">${g.myHand.map(c => cardHtml(c, 'big')).join('')}</div><div class="bjval">${v.t}${v.soft && v.t <= 21 ? ' (souple)' : ''}${v.t > 21 ? ' · sauté 💥' : ''}</div>` : '<p class="hint">Tu ne joues pas cette manche.</p>'}
      ${g.phase === 'play' && g.myHand && !g.myDone ? `<div class="row"><button class="btn" data-a="bjstand">Rester</button><button class="btn ok" data-a="bjhit">Carte</button></div>
        ${g.canDouble ? `<button class="btn primary block" data-a="bjdouble">Doubler (une seule carte)</button>` : ''}` : ''}
      ${g.phase === 'result' ? (() => { const me = g.players.find(p => p.name === g.me); return me && me.out ? `<div class="turnbar ${me.out.gain > 0 ? 'mine' : ''}">${esc(me.out.res)} · ${me.out.gain > 0 ? '+' : ''}${me.out.gain}</div>` : ''; })() : ''}
      ${others}
      ${g.phase === 'result' ? (ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="bjnext">Nouvelle manche</button></div>` : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} relance…</div>`) : ''}
    </div>`, null, true);
}

/* ======================================================================
   🎴 8 AMÉRICAIN
   ====================================================================== */
const SUIT_NAMES = { s: 'Pique ♠', h: 'Cœur ♥', d: 'Carreau ♦', c: 'Trèfle ♣' };
function Huit(names) {
  const order = shuffle(names), wins = Object.fromEntries(names.map(p => [p, 0]));
  let deck, pile, hands, turn, dir, suit, pending, drew, phase, winner, log, round = 0;
  const nextOf = (p, k = 1) => order[((order.indexOf(p) + dir * k) % order.length + order.length) % order.length];
  function deal() {
    round++; deck = newDeck(); hands = {}; dir = 1; pending = 0; drew = false; winner = null; phase = 'play';
    const n = order.length === 2 ? 8 : 7;
    order.forEach(p => hands[p] = Array.from({ length: n }, () => deck.pop()));
    let top; do { top = deck.pop(); if ('82JA'.includes(top[0])) deck.unshift(top); } while ('82JA'.includes(top[0]));
    pile = [top]; suit = top[1];
    turn = order[(round - 1) % order.length]; log = `${turn} commence`;
  }
  function draw(p, n) { for (let i = 0; i < n; i++) { if (!deck.length) { const top = pile.pop(); deck = shuffle(pile); pile = [top]; } if (deck.length) hands[p].push(deck.pop()); } }
  const top = () => pile[pile.length - 1];
  const playable = c => pending ? c[0] === '2' : (c[0] === '8' || c[1] === suit || c[0] === top()[0]);
  function act(who, a, isHost) {
    if (a.k === 'again' && isHost && phase === 'end') { deal(); return; }
    if (phase !== 'play' || who !== turn) return 'Ce n’est pas ton tour';
    if (a.k === 'play') {
      const c = a.c; if (!hands[who].includes(c)) return 'Carte inconnue';
      if (!playable(c)) return pending ? 'Tu dois jouer un 2 ou piocher' : 'Cette carte ne va pas : même couleur, même valeur ou un 8';
      if (drew && drew !== c) return 'Tu ne peux jouer que la carte piochée';
      hands[who] = hands[who].filter(x => x !== c); pile.push(c); drew = false;
      suit = c[0] === '8' && /^[shdc]$/.test(a.suit || '') ? a.suit : c[1];
      log = `${who} joue ${RLABEL[c[0]] || c[0]}${SLABEL[c[1]]}` + (c[0] === '8' ? ` et demande ${SUIT_NAMES[suit]}` : '');
      if (!hands[who].length) { wins[who]++; winner = who; phase = 'end'; log = `${who} n'a plus de cartes et gagne ! 🏆`; return; }
      let skip = 0;
      if (c[0] === '2') pending += 2;
      if (c[0] === 'J') { skip = 1; log += ' · tour passé !'; }
      if (c[0] === 'A') { if (order.length === 2) skip = 1; else dir = -dir; log += ' · sens inversé'; }
      turn = nextOf(who, 1 + skip);
      return;
    }
    if (a.k === 'draw') {
      if (drew) return 'Tu as déjà pioché';
      if (pending) { draw(who, pending); log = `${who} pioche ${pending} cartes`; pending = 0; turn = nextOf(who); return; }
      draw(who, 1); const c = hands[who][hands[who].length - 1];
      if (playable(c)) { drew = c; log = `${who} pioche… et peut la jouer`; } else { log = `${who} pioche et passe`; turn = nextOf(who); }
      return;
    }
    if (a.k === 'pass' && drew) { drew = false; log = `${who} passe`; turn = nextOf(who); return; }
  }
  function view(me) {
    return { id: 'huit', phase, me, turn, top: top(), suit, pending, dir, log, round, winner, wins,
      hand: (hands[me] || []).slice().sort((a, b) => 'shdc'.indexOf(a[1]) - 'shdc'.indexOf(b[1]) || rv(a) - rv(b)),
      playable: me === turn ? (hands[me] || []).filter(c => playable(c) && (!drew || drew === c)) : [], drew: me === turn ? drew : false,
      players: order.map(p => ({ name: p, n: hands[p].length })), deck: deck.length };
  }
  deal();
  return { act, view, min: 2, max: 8 };
}
function renderHuit(g, ctx) {
  const ui = ctx.ui;
  const seats = `<div class="pkseats">${g.players.map(p => `<div class="pkseat ${p.name === g.turn && g.phase === 'play' ? 'now' : ''}"><b>${esc(p.name)}${p.name === g.me ? ' (toi)' : ''}</b><span>${p.n} carte${p.n > 1 ? 's' : ''}${p.n === 1 ? ' · CARTE !' : ''}</span><em>🏆 ${g.wins[p.name]}</em></div>`).join('')}</div>`;
  if (g.phase === 'end') return ctx.view(`${ctx.top('8 américain')}
    <div class="stage"><div class="card" style="--g:linear-gradient(160deg,#ff9966,#ff5e62);flex:none;min-height:0;padding:24px"><div class="big-num" style="font-size:4rem">🏆</div><div class="secret">${esc(g.winner)}</div><div class="sub">a vidé sa main !</div></div>
      ${seats}${ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="hagain">Nouvelle donne</button></div>` : ''}</div>`);
  const myTurn = g.turn === g.me;
  ctx.view(`${ctx.top('8 américain')}
    <div class="stage" style="gap:10px">
      ${seats}
      <div class="table"><div class="pile">${cardHtml(g.top, 'big')}</div>
        <small>Couleur demandée : <b>${SUIT_NAMES[g.suit]}</b>${g.pending ? ` · ⚠️ +${g.pending} à piocher` : ''} · sens ${g.dir > 0 ? '↻' : '↺'}</small></div>
      <p class="log">${esc(g.log)}</p>
      <div class="turnbar ${myTurn ? 'mine' : ''}">${myTurn ? (g.pending ? `👉 Joue un 2 ou pioche ${g.pending}` : g.drew ? '👉 Joue la carte piochée ou passe' : '👉 À toi de jouer') : `Au tour de ${esc(g.turn)}…`}</div>
      ${ui.huit8 ? `<div class="label">Le 8 change la couleur : choisis</div><div class="seg suits">${'shdc'.split('').map(s => `<button data-a="hsuit" data-s="${s}" class="${s === 'h' || s === 'd' ? 'red' : ''}">${SLABEL[s]}</button>`).join('')}</div>` : ''}
      <div class="hand">${g.hand.map(c => `<button class="cardbtn ${g.playable.includes(c) ? 'ok' : myTurn ? 'no' : ''}" data-a="hplay" data-c="${c}">${cardHtml(c, ui.huit8 === c ? 'sel' : '')}</button>`).join('')}</div>
      ${myTurn ? `<div class="row">${g.drew ? `<button class="btn" data-a="hpass">Passer</button>` : `<button class="btn" data-a="hdraw">${g.pending ? `Piocher ${g.pending}` : 'Piocher'}</button>`}</div>` : ''}
      ${ctx.amHost() ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}
    </div>`, null, true);
}

/* ======================================================================
   🂮 BELOTE — 4 joueurs, 2 équipes (règles classiques sans annonces)
   ====================================================================== */
const B_ORDER_T = ['J', '9', 'A', 'T', 'K', 'Q', '8', '7'], B_ORDER = ['A', 'T', 'K', 'Q', 'J', '9', '8', '7'];
const B_PTS_T = { J: 20, 9: 14, A: 11, T: 10, K: 4, Q: 3, 8: 0, 7: 0 }, B_PTS = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };
const belDeck = () => shuffle([...'789TJQKA'].flatMap(r => [...SUITS].map(s => r + s)));
function Belote(names) {
  const TARGET = 501, seats = shuffle(names);      // équipes : sièges 0+2 et 1+3
  const team = p => seats.indexOf(p) % 2, score = [0, 0];
  let dealer = -1, deck, hands, turned, bidRound, bidder, taker, trump, trick, lead, won, turn, phase, log, lastTrick, belote, dealPts, handNo = 0;
  const nextSeat = (p, k = 1) => seats[(seats.indexOf(p) + k) % 4];
  const strength = (c, ledSuit) => c[1] === trump ? 100 + (8 - B_ORDER_T.indexOf(c[0])) : c[1] === ledSuit ? 8 - B_ORDER.indexOf(c[0]) : -1;
  const pts = c => c[1] === trump ? B_PTS_T[c[0]] : B_PTS[c[0]];
  function deal() {
    handNo++; dealer = (dealer + 1) % 4; deck = belDeck(); hands = {}; seats.forEach(p => hands[p] = []);
    const give = n => seats.forEach((_, i) => { const p = seats[(dealer + 1 + i) % 4]; for (let k = 0; k < n; k++) hands[p].push(deck.pop()); });
    give(3); give(2); turned = deck.pop(); bidRound = 1; bidder = seats[(dealer + 1) % 4]; taker = null; trump = null; phase = 'bid';
    trick = []; won = [[], []]; belote = null; dealPts = null; lastTrick = null;
    log = `${seats[dealer]} distribue · retournée : ${RLABEL[turned[0]] || turned[0]}${SLABEL[turned[1]]}`;
  }
  function take(p, s) {
    taker = p; trump = s; hands[p].push(turned);
    seats.forEach((_, i) => { const q = seats[(dealer + 1 + i) % 4]; const n = q === p ? 2 : 3; for (let k = 0; k < n; k++) hands[q].push(deck.pop()); });
    seats.forEach(q => { if (hands[q].includes('K' + trump) && hands[q].includes('Q' + trump)) belote = { p: q, said: 0 }; });
    phase = 'play'; lead = seats[(dealer + 1) % 4]; turn = lead;
    log = `${p} prend à ${SUIT_NAMES[s]}`;
  }
  function winnerOf(t) { const led = t[0].c[1]; return t.reduce((b, x) => strength(x.c, led) > strength(b.c, led) ? x : b).p; }
  function legal(p) {
    const h = hands[p]; if (!trick.length) return h.slice();
    const led = trick[0].c[1], follow = h.filter(c => c[1] === led);
    const trumps = h.filter(c => c[1] === trump);
    const bestTrump = Math.max(-1, ...trick.filter(x => x.c[1] === trump).map(x => strength(x.c, led)));
    const higher = ts => ts.filter(c => strength(c, led) > bestTrump);
    if (follow.length) {
      if (led === trump) { const hi = higher(follow); return hi.length ? hi : follow; }
      return follow;
    }
    const partnerWinning = trick.length >= 2 && team(winnerOf(trick)) === team(p);
    if (partnerWinning) return h.slice();
    if (trumps.length) { const hi = higher(trumps); return hi.length ? hi : trumps; }
    return h.slice();
  }
  function endDeal() {
    const raw = [0, 0]; won.forEach((cards, t) => cards.forEach(c => raw[t] += pts(c)));
    raw[team(lastTrick.winner)] += 10;                       // dix de der
    const tt = team(taker), capot = won[1 - tt].length === 0 ? tt : won[tt].length === 0 ? 1 - tt : -1;
    const bel = [0, 0]; if (belote && belote.said >= 2) bel[team(belote.p)] = 20;
    let add;
    if (capot >= 0) { add = [0, 0]; add[capot] = 252; }
    else if (raw[tt] + bel[tt] > raw[1 - tt] + bel[1 - tt]) add = raw.slice();
    else { add = [0, 0]; add[1 - tt] = 162; }                  // l'équipe qui a pris est « dedans »
    add[0] += bel[0]; add[1] += bel[1];
    score[0] += add[0]; score[1] += add[1];
    dealPts = { raw, add, capot: capot >= 0, dedans: capot < 0 && add[tt] === bel[tt], takerTeam: tt };
    phase = score[0] >= TARGET || score[1] >= TARGET ? 'over' : 'scores';
    log = dealPts.capot ? 'CAPOT ! 252 points' : dealPts.dedans ? `${taker} est dedans ! 162 pour la défense` : `Donne terminée : ${add[0]} / ${add[1]}`;
  }
  function act(who, a, isHost) {
    if (a.k === 'next' && isHost && phase === 'scores') { deal(); return; }
    if (a.k === 'again' && isHost && phase === 'over') { score[0] = score[1] = 0; deal(); return; }
    if (phase === 'bid' && who === bidder) {
      if (a.k === 'take') {
        const s = bidRound === 1 ? turned[1] : a.s;
        if (!/^[shdc]$/.test(s || '') || (bidRound === 2 && s === turned[1])) return 'Choisis une autre couleur';
        take(who, s); return;
      }
      if (a.k === 'pass') {
        log = `${who} passe`;
        if (who === seats[dealer]) { if (bidRound === 1) bidRound = 2; else { log = 'Tout le monde passe : on redistribue'; deal(); return; } }
        bidder = nextSeat(who); return;
      }
    }
    if (phase === 'play' && who === turn && a.k === 'play') {
      if (!legal(who).includes(a.c)) return 'Carte interdite (il faut fournir, couper ou monter)';
      hands[who] = hands[who].filter(c => c !== a.c); trick.push({ p: who, c: a.c });
      if (belote && belote.p === who && a.c[1] === trump && 'KQ'.includes(a.c[0])) { belote.said++; log = `${who} : ${belote.said === 1 ? 'Belote !' : 'Rebelote !'}`; }
      if (trick.length === 4) {
        const w = winnerOf(trick); won[team(w)].push(...trick.map(x => x.c)); lastTrick = { cards: trick, winner: w };
        trick = []; lead = w; turn = w; log = `${w} remporte le pli`;
        if (!hands[w].length) endDeal();
      } else turn = nextSeat(who);
      return;
    }
    return 'Ce n’est pas ton tour';
  }
  function view(me) {
    const t = team(me);
    return { id: 'belote', phase, me, seats, myTeam: t, score, target: TARGET, turned, trump, taker, bidder, bidRound, turn, log, handNo,
      dealer: seats[dealer], trick, lastTrick, dealPts,
      hand: (hands[me] || []).slice().sort((a, b) => 'shdc'.indexOf(a[1]) - 'shdc'.indexOf(b[1]) || (a[1] === trump ? B_ORDER_T.indexOf(b[0]) - B_ORDER_T.indexOf(a[0]) : B_ORDER.indexOf(b[0]) - B_ORDER.indexOf(a[0]))),
      legal: phase === 'play' && turn === me ? legal(me) : [], tricks: won.map(w => w.length / 4) };
  }
  deal();
  return { act, view, min: 4, max: 4 };
}
function renderBelote(g, ctx) {
  const i = g.seats.indexOf(g.me), rel = k => g.seats[(i + k) % 4];
  const label = p => `${esc(p)}${p === g.me ? ' (toi)' : ''}${p === g.dealer ? ' <i class="dbtn">D</i>' : ''}${p === g.taker ? ' 🎯' : ''}`;
  const played = p => { const x = g.trick.find(t => t.p === p); return x ? cardHtml(x.c) : '<span class="pc slot"></span>'; };
  const teamNames = t => g.seats.filter((_, k) => k % 2 === t).map(esc).join(' & ');
  const scoreBar = `<div class="bscore"><div class="${g.myTeam === 0 ? 'us' : ''}"><small>${teamNames(0)}</small><b>${g.score[0]}</b></div><span>/ ${g.target}</span><div class="${g.myTeam === 1 ? 'us' : ''}"><small>${teamNames(1)}</small><b>${g.score[1]}</b></div></div>`;
  if (g.phase === 'scores' || g.phase === 'over') {
    const d = g.dealPts;
    return ctx.view(`${ctx.top('Belote')}
      <div class="stage">${scoreBar}
        <div class="card" style="--g:linear-gradient(160deg,#134e5e,#71b280);flex:none;min-height:0;padding:22px">
          <div class="tag" style="position:static">${g.phase === 'over' ? 'Partie terminée' : `Donne ${g.handNo}`}</div>
          <div class="secret" style="margin-top:6px;font-size:1.8rem">${g.phase === 'over' ? `🏆 ${teamNames(g.score[0] >= g.score[1] ? 0 : 1)}` : esc(g.log)}</div>
          <div class="sub">Points des plis : ${d.raw[0]} / ${d.raw[1]} · marqués : +${d.add[0]} / +${d.add[1]}</div></div>
        ${ctx.amHost() ? (g.phase === 'over' ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="bagain">Nouvelle partie</button></div>` : `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="bnext">Donne suivante</button></div>`) : `<div class="waiting"><div class="spinner small"></div>${esc(ctx.host)} redistribue…</div>`}
      </div>`);
  }
  const myTurn = (g.phase === 'bid' && g.bidder === g.me) || (g.phase === 'play' && g.turn === g.me);
  const centre = g.phase === 'bid'
    ? `<div class="pile">${cardHtml(g.turned, 'big')}</div><small>Carte retournée · ${g.bidRound === 1 ? '1er tour' : '2e tour'} d'enchères</small>`
    : `<div class="btable"><div class="bn">${played(rel(2))}</div><div class="bw">${played(rel(3))}</div><div class="be">${played(rel(1))}</div><div class="bs">${played(g.me)}</div></div><small>Atout : <b>${SUIT_NAMES[g.trump]}</b> · plis ${g.tricks[g.myTeam]} – ${g.tricks[1 - g.myTeam]}</small>`;
  ctx.view(`${ctx.top('Belote')}
    <div class="stage" style="gap:10px">
      ${scoreBar}
      <div class="bnames"><span>⬆️ ${label(rel(2))} (partenaire)</span><span>⬅️ ${label(rel(3))}</span><span>➡️ ${label(rel(1))}</span></div>
      <div class="table">${centre}</div>
      <p class="log">${esc(g.log)}</p>
      <div class="turnbar ${myTurn ? 'mine' : ''}">${myTurn ? (g.phase === 'bid' ? '👉 Prends-tu ?' : '👉 À toi de jouer') : `Au tour de ${esc(g.phase === 'bid' ? g.bidder : g.turn)}…`}</div>
      ${g.phase === 'bid' && myTurn ? (g.bidRound === 1
        ? `<div class="row"><button class="btn" data-a="bpass">Passer</button><button class="btn primary" data-a="btake">Prendre à ${SLABEL[g.turned[1]]}</button></div>`
        : `<div class="seg suits">${'shdc'.split('').filter(s => s !== g.turned[1]).map(s => `<button data-a="btake2" data-s="${s}" class="${s === 'h' || s === 'd' ? 'red' : ''}">${SLABEL[s]}</button>`).join('')}</div><button class="btn block" data-a="bpass">Passer</button>`) : ''}
      <div class="hand">${g.hand.map(c => `<button class="cardbtn ${g.legal.includes(c) ? 'ok' : g.phase === 'play' && myTurn ? 'no' : ''}" data-a="bplay" data-c="${c}">${cardHtml(c, c[1] === g.trump ? 'trump' : '')}</button>`).join('')}</div>
      ${ctx.amHost() ? `<button class="btn ghost" data-a="lobby">Arrêter et revenir au salon</button>` : ''}
    </div>`, null, true);
}

/* ---------- Actions ---------- */
function onPoker(a, el, ctx) {
  const m = { pkfold: { k: 'fold' }, pkcheck: { k: 'check' }, pkcall: { k: 'call' }, pkdeal: { k: 'deal' }, pkrebuy: { k: 'rebuy' } };
  if (m[a]) { ctx.buzz(15); ctx.send(m[a]); return true; }
  if (a === 'pkraise') { ctx.buzz(15); ctx.send({ k: 'raise', to: ctx.ui.pkTo }); return true; }
  return false;
}
function onBJ(a, el, ctx) {
  if (a === 'bjbet') { ctx.buzz(15); ctx.send({ k: 'bet', v: +el.dataset.v }); return true; }
  const m = { bjhit: 'hit', bjstand: 'stand', bjdouble: 'double', bjnext: 'next', bjrebuy: 'rebuy', bjdeal: 'dealnow' };
  if (m[a]) { ctx.buzz(15); ctx.send({ k: m[a] }); return true; }
  return false;
}
function onHuit(a, el, ctx) {
  if (a === 'hplay') {
    const c = el.dataset.c, g = ctx.g;
    if (!g.playable.includes(c)) { ctx.buzz(60); return true; }
    if (c[0] === '8') { ctx.ui.huit8 = c; ctx.render(); return true; }
    ctx.ui.huit8 = null; ctx.send({ k: 'play', c }); return true;
  }
  if (a === 'hsuit') { const c = ctx.ui.huit8; ctx.ui.huit8 = null; ctx.send({ k: 'play', c, suit: el.dataset.s }); return true; }
  if (a === 'hdraw') { ctx.ui.huit8 = null; ctx.send({ k: 'draw' }); return true; }
  if (a === 'hpass') { ctx.send({ k: 'pass' }); return true; }
  if (a === 'hagain') { ctx.send({ k: 'again' }); return true; }
  return false;
}
function onBelote(a, el, ctx) {
  if (a === 'bplay') { if (!ctx.g.legal.includes(el.dataset.c)) { ctx.buzz(60); return true; } ctx.send({ k: 'play', c: el.dataset.c }); return true; }
  if (a === 'btake') { ctx.send({ k: 'take' }); return true; }
  if (a === 'btake2') { ctx.send({ k: 'take', s: el.dataset.s }); return true; }
  if (a === 'bpass') { ctx.send({ k: 'pass' }); return true; }
  if (a === 'bnext') { ctx.send({ k: 'next' }); return true; }
  if (a === 'bagain') { ctx.send({ k: 'again' }); return true; }
  return false;
}
const anyTurn = (g, prev, ctx) => { const mine = g.turn === g.me || g.bidder === g.me && g.phase === 'bid'; const was = prev && (prev.turn === g.me || prev.bidder === g.me && prev.phase === 'bid'); if (mine && !was) { ctx.buzz([60, 40, 60]); ctx.beep(1040, .1, 'sine'); } };
const yourTurn = (g, prev, ctx) => { if (g.turn === g.me && g.phase === 'bet' && (!prev || prev.turn !== g.me || prev.street !== g.street)) { ctx.buzz([60, 40, 60]); ctx.beep(1040, .1, 'sine'); } };

O.register('poker', { make: Poker, cat: 'cartes', name: 'Poker', e: '♠️', d: 'Texas Hold’em entre potes, 1000 jetons fictifs chacun.', min: 2, max: 8, g: 'linear-gradient(150deg,#0f9b0f,#065c06)', render: renderPoker, on: onPoker, onState: yourTurn });
O.register('huit', { make: Huit, cat: 'cartes', name: '8 américain', e: '🎴', d: 'Même couleur ou même valeur ; le 8 change la couleur, le 2 fait piocher.', min: 2, max: 8, g: 'linear-gradient(150deg,#ff9966,#ff5e62)', render: renderHuit, on: onHuit, onState: anyTurn });
O.register('belote', { make: Belote, cat: 'cartes', name: 'Belote', e: '🂮', d: 'À 4 en deux équipes : atout, plis, belote-rebelote. Partie en 501.', min: 4, max: 4, g: 'linear-gradient(150deg,#134e5e,#71b280)', render: renderBelote, on: onBelote, onState: anyTurn });
O.register('blackjack', { make: Blackjack, cat: 'cartes', name: 'Blackjack', e: '🂡', d: 'Tout le monde contre la banque, en même temps. Approche-toi de 21 !', min: 1, max: 7, g: 'linear-gradient(150deg,#1a1a1a,#8e0e00)', render: renderBJ, on: onBJ });
})();
