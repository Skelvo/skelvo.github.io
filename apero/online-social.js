/* ==========================================================================
   Jeux en ligne « ambiance » : écrire en secret, puis voter.
   Le Bluff · Le Mot de la fin · Qui a écrit ça ?
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO, O = A.online;
const { esc, shuffle, pick } = A;
const WRITE_MS = 90000;

/* ---------- Outils communs (côté hôte) ---------- */
function totalsInit(names) { const t = {}; names.forEach(p => t[p] = 0); return t; }
const clean = (t, n = 140) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);

/* ---------- Outils communs (affichage) ---------- */
let draft = '', draftKey = '';
function scoresHtml(totals, plus) {
  return `<div class="scores">${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([p, s], i) =>
    `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}</span><span>${s}${plus && plus[p] ? ` <small style="color:var(--ok)">+${plus[p]}</small>` : ''}</span></div>`).join('')}</div>`;
}
let wTick = null;
function tick(left) {
  clearInterval(wTick);
  if (!left) return;
  const end = Date.now() + left;
  wTick = setInterval(() => {
    const el = document.getElementById('wleft'); if (!el) return clearInterval(wTick);
    const l = Math.max(0, end - Date.now()); el.textContent = Math.ceil(l / 1000); el.classList.toggle('hot', l < 10000);
  }, 250);
}
/* Écran d'écriture commun ; ne se redessine pas pendant qu'on tape */
function writeScreen(ctx, title, g, { prompt, placeholder, tip, max = 140 }) {
  const key = g.id + '|' + g.round + '|' + (g.sub || 0);
  if (draftKey !== key) { draftKey = key; draft = ''; }
  if (g.mine != null) {
    return ctx.view(`${ctx.top(title)}
      <div class="stage" style="justify-content:center;text-align:center">
        <div class="big-num" style="font-size:4rem">✅</div>
        <p class="hint">C'est envoyé ! <b id="wleft">${Math.ceil(g.left / 1000)}</b> s</p>
        <div class="waiting">${g.waiting.length ? `En attente de ${g.waiting.map(esc).join(', ')}` : 'Tout le monde a répondu'}</div>
        ${ctx.amHost() ? `<button class="btn ghost" data-a="wforce">Ne plus attendre</button>` : ''}
      </div>`, () => tick(g.left));
  }
  if (document.getElementById('win') && document.getElementById('wform')?.dataset.key === key) {
    const w = document.getElementById('wwait'); if (w) w.textContent = `${g.nDone} / ${g.nTotal} ont répondu`;
    return tick(g.left);
  }
  ctx.view(`${ctx.top(title)}
    <div class="stage">
      <div class="dhead"><span>Manche ${g.round}</span><b id="wleft">${Math.ceil(g.left / 1000)}</b></div>
      ${prompt}
      <form id="wform" data-key="${esc(key)}" autocomplete="off" class="wform">
        <textarea id="win" maxlength="${max}" rows="3" placeholder="${esc(placeholder)}">${esc(draft)}</textarea>
        <button class="btn primary big block" type="submit">Envoyer</button>
      </form>
      ${tip ? `<p class="hint" style="font-size:.85rem">${tip}</p>` : ''}
      <div class="waiting" id="wwait">${g.nDone} / ${g.nTotal} ont répondu</div>
    </div>`, () => {
      const t = document.getElementById('win');
      t.addEventListener('input', () => { draft = t.value; });
      document.getElementById('wform').addEventListener('submit', e => {
        e.preventDefault(); draft = t.value;
        if (!draft.trim()) return ctx.toast('Écris quelque chose 🙂');
        ctx.send({ k: 'write', text: draft });
      });
      tick(g.left);
    });
}
function hostWait(ctx, label) { return ctx.amHost() ? '' : `<div class="waiting"><div class="spinner small"></div>${esc(label || `${ctx.host} continue…`)}</div>`; }

/* ======================================================================
   🎭 LE BLUFF — fausses définitions
   ====================================================================== */
function Bluff(names, notify) {
  const words = A.deck(A.D.bluff), totals = totalsInit(names);
  let round = 0, w, phase, texts, opts, votes, deadline, timer = null, gain = {};
  function newRound() {
    round++; w = words.next(); phase = 'write'; texts = {}; votes = {}; opts = null; gain = {};
    deadline = Date.now() + WRITE_MS;
    clearTimeout(timer); timer = setTimeout(() => { if (phase === 'write') { toVote(); notify(); } }, WRITE_MS + 1000);
  }
  function toVote() {
    clearTimeout(timer);
    opts = shuffle([{ by: null, text: w[1] }, ...names.filter(p => texts[p]).map(p => ({ by: p, text: texts[p] }))]);
    phase = 'vote';
  }
  function reveal() {
    phase = 'reveal'; gain = {};
    Object.entries(votes).forEach(([v, i]) => {
      const o = opts[i];
      if (!o.by) gain[v] = (gain[v] || 0) + 2;          // a trouvé la vraie définition
      else gain[o.by] = (gain[o.by] || 0) + 1;          // a piégé quelqu'un
    });
    Object.entries(gain).forEach(([p, n]) => totals[p] += n);
  }
  function act(who, a, isHost) {
    if (a.k === 'write' && phase === 'write' && !(who in texts)) {
      texts[who] = clean(a.text) || '…';
      if (names.every(p => p in texts)) toVote();
      return;
    }
    if (a.k === 'vote' && phase === 'vote') {
      const i = a.i | 0; if (!opts[i] || opts[i].by === who) return 'Tu ne peux pas voter pour ta propre définition 😉';
      votes[who] = i; if (names.every(p => p in votes)) reveal(); return;
    }
    if (a.k === 'wforce' && isHost) { if (phase === 'write') toVote(); else if (phase === 'vote') reveal(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { newRound(); return; }
  }
  function view(me) {
    return {
      id: 'bluff', phase, round, word: w[0], me,
      left: phase === 'write' ? Math.max(0, deadline - Date.now()) : 0,
      mine: phase === 'write' && me in texts ? texts[me] : null,
      nDone: phase === 'write' ? Object.keys(texts).length : Object.keys(votes).length, nTotal: names.length,
      waiting: (phase === 'write' ? names.filter(p => !(p in texts)) : names.filter(p => !(p in votes))),
      opts: opts ? opts.map((o, i) => ({ text: o.text, mine: o.by === me,
        real: phase === 'reveal' ? !o.by : undefined, by: phase === 'reveal' ? o.by : undefined,
        voters: phase === 'reveal' ? names.filter(p => votes[p] === i) : undefined })) : null,
      myVote: me in (votes || {}) ? votes[me] : null, totals, gain
    };
  }
  newRound();
  return { act, view, stop: () => clearTimeout(timer), min: 3, max: 10 };
}
function renderBluff(g, ctx) {
  const T = 'Le Bluff';
  if (g.phase === 'write') return writeScreen(ctx, T, g, {
    prompt: `<div class="card" style="--g:linear-gradient(160deg,#7f00ff,#e100ff);flex:none;min-height:0;padding:22px"><div class="tag" style="position:static">Que veut dire…</div><div class="secret" style="margin-top:8px">${esc(g.word)}</div></div>`,
    placeholder: 'Invente une définition crédible…',
    tip: 'Écris une fausse définition assez crédible pour piéger les autres. Si tu connais la vraie, invente quand même !'
  });
  if (g.phase === 'vote') return ctx.view(`${ctx.top(T)}
    <div class="stage">
      <div class="turn">Quelle est la vraie définition de<strong>${esc(g.word)} ?</strong></div>
      <div class="vopts">${g.opts.map((o, i) => `<button class="vopt ${g.myVote === i ? 'chosen' : ''} ${o.mine ? 'mine' : ''}" ${o.mine ? 'disabled' : `data-a="wvote" data-i="${i}"`}>
        ${esc(o.text)}${o.mine ? '<small>ta définition</small>' : ''}</button>`).join('')}</div>
      <div class="waiting">${g.nDone} / ${g.nTotal} votes</div>
      ${ctx.amHost() ? `<button class="btn ghost" data-a="wforce">Révéler sans attendre</button>` : ''}
    </div>`, null, true);
  ctx.view(`${ctx.top(T)}
    <div class="stage">
      <div class="turn">${esc(g.word)}</div>
      <div class="vopts">${g.opts.map(o => `<div class="vopt res ${o.real ? 'real' : ''}">
        <div>${esc(o.text)}</div>
        <small>${o.real ? '✅ La vraie définition' : `🎭 Inventée par ${esc(o.by)}`}${o.voters.length ? ` · ${o.voters.length} vote${o.voters.length > 1 ? 's' : ''} : ${o.voters.map(esc).join(', ')}` : ''}</small></div>`).join('')}</div>
      <p class="hint" style="font-size:.85rem">+2 pour avoir trouvé la vraie · +1 par joueur piégé</p>
      ${scoresHtml(g.totals, g.gain)}
      ${ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="wnext">Mot suivant</button></div>` : hostWait(ctx)}
    </div>`);
}

/* ======================================================================
   💬 LE MOT DE LA FIN — réponses drôles anonymes
   ====================================================================== */
function MotFin(names, notify) {
  const prompts = A.deck(A.S.spicy ? (A.S.spicyLvl === 2 ? A.D.motfinHot2 : A.D.motfinHot) : A.D.motfin), totals = totalsInit(names);
  let round = 0, prompt, phase, texts, opts, votes, deadline, timer = null, gain = {};
  function newRound() {
    round++; prompt = prompts.next(); phase = 'write'; texts = {}; votes = {}; opts = null; gain = {};
    deadline = Date.now() + WRITE_MS;
    clearTimeout(timer); timer = setTimeout(() => { if (phase === 'write') { toVote(); notify(); } }, WRITE_MS + 1000);
  }
  function toVote() { clearTimeout(timer); opts = shuffle(names.filter(p => texts[p]).map(p => ({ by: p, text: texts[p] }))); phase = 'vote'; }
  function reveal() {
    phase = 'reveal'; gain = {};
    Object.values(votes).forEach(i => { const o = opts[i]; gain[o.by] = (gain[o.by] || 0) + 1; });
    // bonus si tous ceux qui pouvaient voter pour cette réponse l'ont choisie
    opts.forEach(o => { const eligible = Object.keys(votes).filter(v => v !== o.by).length; if (eligible >= 2 && (gain[o.by] || 0) === eligible) gain[o.by] += 2; });
    Object.entries(gain).forEach(([p, n]) => totals[p] += n);
  }
  function act(who, a, isHost) {
    if (a.k === 'write' && phase === 'write' && !(who in texts)) {
      texts[who] = clean(a.text, 100) || '…';
      if (names.every(p => p in texts)) toVote();
      return;
    }
    if (a.k === 'vote' && phase === 'vote') {
      const i = a.i | 0; if (!opts[i] || opts[i].by === who) return 'Pas le droit de voter pour toi 😉';
      votes[who] = i; if (names.every(p => p in votes || !opts.some(o => o.by !== p))) reveal(); return;
    }
    if (a.k === 'wforce' && isHost) { if (phase === 'write') toVote(); else if (phase === 'vote') reveal(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { newRound(); return; }
  }
  function view(me) {
    return {
      id: 'motfin', phase, round, prompt, me,
      left: phase === 'write' ? Math.max(0, deadline - Date.now()) : 0,
      mine: phase === 'write' && me in texts ? texts[me] : null,
      nDone: phase === 'write' ? Object.keys(texts).length : Object.keys(votes).length, nTotal: names.length,
      waiting: phase === 'write' ? names.filter(p => !(p in texts)) : names.filter(p => !(p in votes)),
      opts: opts ? opts.map((o, i) => ({ text: o.text, mine: o.by === me, by: phase === 'reveal' ? o.by : undefined,
        n: phase === 'reveal' ? Object.values(votes).filter(v => v === i).length : undefined })) : null,
      myVote: votes && me in votes ? votes[me] : null, totals, gain
    };
  }
  newRound();
  return { act, view, stop: () => clearTimeout(timer), min: 3, max: 12 };
}
function renderMotFin(g, ctx) {
  const T = 'Le Mot de la fin';
  const card = `<div class="card" style="--g:linear-gradient(160deg,#ff512f,#dd2476);flex:none;min-height:0;padding:22px"><div class="txt" style="font-size:1.3rem">${esc(g.prompt)}</div></div>`;
  if (g.phase === 'write') return writeScreen(ctx, T, g, { prompt: card, placeholder: 'Ta réponse la plus drôle…', tip: 'Les réponses seront affichées sans les noms. Soyez drôles (et un peu méchants si vous voulez 😈).', max: 100 });
  if (g.phase === 'vote') return ctx.view(`${ctx.top(T)}
    <div class="stage">
      ${card}
      <div class="label">Vote pour la meilleure</div>
      <div class="vopts">${g.opts.map((o, i) => `<button class="vopt ${g.myVote === i ? 'chosen' : ''} ${o.mine ? 'mine' : ''}" ${o.mine ? 'disabled' : `data-a="wvote" data-i="${i}"`}>${esc(o.text)}${o.mine ? '<small>ta réponse</small>' : ''}</button>`).join('')}</div>
      <div class="waiting">${g.nDone} / ${g.nTotal} votes</div>
      ${ctx.amHost() ? `<button class="btn ghost" data-a="wforce">Révéler sans attendre</button>` : ''}
    </div>`, null, true);
  const sorted = g.opts.slice().sort((a, b) => b.n - a.n);
  ctx.view(`${ctx.top(T)}
    <div class="stage">
      ${card}
      <div class="vopts">${sorted.map((o, i) => `<div class="vopt res ${i === 0 && o.n ? 'real' : ''}"><div>${i === 0 && o.n ? '🏆 ' : ''}${esc(o.text)}</div><small>${esc(o.by)} · ${o.n} vote${o.n > 1 ? 's' : ''}</small></div>`).join('')}</div>
      ${scoresHtml(g.totals, g.gain)}
      ${ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="wnext">Phrase suivante</button></div>` : hostWait(ctx)}
    </div>`);
}

/* ======================================================================
   🕵️ QUI A ÉCRIT ÇA ? — réponses perso anonymes, on devine l'auteur
   ====================================================================== */
function QuiEcrit(names, notify) {
  const qs = A.deck(A.S.spicy ? (A.S.spicyLvl === 2 ? A.D.quiecritHot2 : A.D.quiecritHot) : A.D.quiecrit), totals = totalsInit(names);
  let round = 0, q, phase, texts, order, idx, guesses, deadline, timer = null, gain = {};
  function newRound() {
    round++; q = qs.next(); phase = 'write'; texts = {}; order = []; idx = 0; guesses = {}; gain = {};
    deadline = Date.now() + WRITE_MS;
    clearTimeout(timer); timer = setTimeout(() => { if (phase === 'write') { toGuess(); notify(); } }, WRITE_MS + 1000);
  }
  function toGuess() {
    clearTimeout(timer);
    order = shuffle(names.filter(p => texts[p]));
    if (!order.length) { phase = 'end'; return; }
    idx = 0; guesses = {}; phase = 'guess';
  }
  function settle() {
    const author = order[idx]; gain = {};
    Object.entries(guesses).forEach(([p, t]) => {
      if (p === author) return;
      if (t === author) gain[p] = (gain[p] || 0) + 1;     // a reconnu l'auteur
      else gain[author] = (gain[author] || 0) + 1;         // l'auteur a brouillé les pistes
    });
    Object.entries(gain).forEach(([p, n]) => totals[p] += n);
    phase = 'reveal';
  }
  function act(who, a, isHost) {
    if (a.k === 'write' && phase === 'write' && !(who in texts)) {
      texts[who] = clean(a.text, 120) || '…';
      if (names.every(p => p in texts)) toGuess();
      return;
    }
    if (a.k === 'guess' && phase === 'guess' && names.includes(a.p)) {
      guesses[who] = a.p; if (names.every(p => p in guesses)) settle(); return;
    }
    if (a.k === 'wforce' && isHost) { if (phase === 'write') toGuess(); else if (phase === 'guess') settle(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') {
      idx++; guesses = {}; gain = {};
      if (idx >= order.length) phase = 'end'; else phase = 'guess';
      return;
    }
    if (a.k === 'newq' && isHost && phase === 'end') { newRound(); return; }
  }
  function view(me) {
    const cur = order[idx];
    return {
      id: 'quiecrit', phase, round, q, me, players: names,
      left: phase === 'write' ? Math.max(0, deadline - Date.now()) : 0,
      mine: phase === 'write' && me in texts ? texts[me] : null,
      nDone: phase === 'write' ? Object.keys(texts).length : Object.keys(guesses).length, nTotal: names.length,
      waiting: phase === 'write' ? names.filter(p => !(p in texts)) : names.filter(p => !(p in guesses)),
      text: cur ? texts[cur] : null, n: idx + 1, of: order.length, isMine: cur === me,
      author: phase === 'reveal' ? cur : null, myGuess: guesses[me] || null,
      guesses: phase === 'reveal' ? guesses : null, totals, gain
    };
  }
  newRound();
  return { act, view, stop: () => clearTimeout(timer), min: 3, max: 12 };
}
function renderQuiEcrit(g, ctx) {
  const T = 'Qui a écrit ça ?';
  const qcard = `<div class="card" style="--g:linear-gradient(160deg,#11998e,#38ef7d);flex:none;min-height:0;padding:20px"><div class="txt" style="font-size:1.25rem;color:#05301f">${esc(g.q)}</div></div>`;
  if (g.phase === 'write') return writeScreen(ctx, T, g, { prompt: qcard, placeholder: 'Ta réponse (sincère… ou pas)', tip: 'Ensuite, chaque réponse sera affichée sans nom : à vous de deviner qui l’a écrite. Tu marques aussi des points si personne ne te reconnaît 🕵️', max: 120 });
  if (g.phase === 'end') return ctx.view(`${ctx.top(T)}
    <div class="stage">
      ${qcard}
      <p class="hint">Toutes les réponses ont été devinées !</p>
      ${scoresHtml(g.totals)}
      ${ctx.amHost() ? `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="wnewq">Nouvelle question</button></div>` : hostWait(ctx)}
    </div>`);
  const answer = `<div class="bigquote">« ${esc(g.text)} »</div>`;
  if (g.phase === 'guess') return ctx.view(`${ctx.top(T)}
    <div class="stage">
      <div class="turn">Réponse ${g.n} / ${g.of}</div>
      ${answer}
      <div class="label">${g.isMine ? 'C’est la tienne 🤫 Vote quand même pour brouiller les pistes' : 'Qui a écrit ça ?'}</div>
      <div class="lplayers">${g.players.map(p => `<button class="lp ${g.myGuess === p ? 'chosen' : ''}" data-a="wguess" data-p="${esc(p)}"><b>${esc(p)}${p === g.me ? ' (toi)' : ''}</b></button>`).join('')}</div>
      <div class="waiting">${g.nDone} / ${g.nTotal} ont voté</div>
      ${ctx.amHost() ? `<button class="btn ghost" data-a="wforce">Révéler sans attendre</button>` : ''}
    </div>`, null, true);
  const right = Object.entries(g.guesses).filter(([p, t]) => p !== g.author && t === g.author).map(([p]) => p);
  ctx.view(`${ctx.top(T)}
    <div class="stage">
      ${answer}
      <div class="card" style="--g:linear-gradient(160deg,#11998e,#38ef7d);flex:none;min-height:0;padding:18px"><div class="tag" style="position:static;color:#05301f">C'était</div><div class="secret" style="color:#05301f">${esc(g.author)}</div></div>
      <p class="hint">${right.length ? `Bien vu : ${right.map(esc).join(', ')}` : 'Personne ne l’a reconnu 😏'}</p>
      ${scoresHtml(g.totals, g.gain)}
      ${ctx.amHost() ? `<button class="btn primary big block" data-a="wnext">${g.n < g.of ? 'Réponse suivante' : 'Terminer la question'}</button>` : hostWait(ctx)}
    </div>`);
}

/* ---------- Actions communes ---------- */
function on(a, el, ctx) {
  if (a === 'wvote') { ctx.buzz(15); ctx.send({ k: 'vote', i: +el.dataset.i }); return true; }
  if (a === 'wguess') { ctx.buzz(15); ctx.send({ k: 'guess', p: el.dataset.p }); return true; }
  if (a === 'wforce') { ctx.send({ k: 'wforce' }); return true; }
  if (a === 'wnext') { ctx.send({ k: 'next' }); return true; }
  if (a === 'wnewq') { ctx.send({ k: 'newq' }); return true; }
  return false;
}

O.register('bluff', { make: Bluff, cat: 'ambiance', name: 'Le Bluff', e: '🎭', d: 'Un mot rare : invente une fausse définition et piège les autres !', min: 3, max: 10, g: 'linear-gradient(150deg,#7f00ff,#e100ff)', render: renderBluff, on });
O.register('motfin', { spicy: true, make: MotFin, cat: 'ambiance', name: 'Le Mot de la fin', e: '💬', d: 'Complète la phrase le plus drôlement possible, votes anonymes.', min: 3, max: 12, g: 'linear-gradient(150deg,#ff512f,#dd2476)', render: renderMotFin, on });
O.register('quiecrit', { spicy: true, make: QuiEcrit, cat: 'ambiance', name: 'Qui a écrit ça ?', e: '🕵️‍♀️', d: 'Réponses perso anonymes : devine qui a écrit quoi.', min: 3, max: 12, g: 'linear-gradient(150deg,#11998e,#38ef7d)', render: renderQuiEcrit, on });
})();
