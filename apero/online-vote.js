/* ==========================================================================
   Jeux en ligne de vote / réponses secrètes révélées ensemble.
   Qui pourrait… · Tu me connais ? · Synchro · Estimations
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO, O = A.online;
const { esc, shuffle } = A;
const norm = O.norm;

const scoresHtml = (totals, plus) => `<div class="scores">${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([p, s], i) =>
  `<div class="score ${i === 0 && s ? 'lead' : ''}"><span>${i === 0 && s ? '👑 ' : ''}${esc(p)}</span><span>${s}${plus && plus[p] ? ` <small style="color:var(--ok)">+${plus[p]}</small>` : ''}</span></div>`).join('')}</div>`;
const hostOr = (ctx, html, label) => ctx.amHost() ? html : `<div class="waiting"><div class="spinner small"></div>${esc(label || `${ctx.host} continue…`)}</div>`;
const tot = names => Object.fromEntries(names.map(p => [p, 0]));
const wait = g => `<div class="waiting">${g.nDone} / ${g.nTotal} ont répondu</div>`;

/* Champ de saisie qui ne se redessine pas pendant qu'on tape */
let draft = '', dkey = '';
function inputBlock(ctx, key, { placeholder, type = 'text', label = 'Valider' }) {
  if (dkey !== key) { dkey = key; draft = ''; }
  return `<form class="add-row" id="vform" data-key="${esc(key)}" autocomplete="off">
    <input id="vin" ${type === 'number' ? 'type="text" inputmode="decimal"' : ''} maxlength="40" placeholder="${esc(placeholder)}" value="${esc(draft)}">
    <button class="btn primary" type="submit">${label}</button></form>`;
}
function bindInput(ctx, k, transform) {
  const f = document.getElementById('vform'); if (!f) return;
  const i = document.getElementById('vin');
  i.addEventListener('input', () => { draft = i.value; });
  f.addEventListener('submit', e => {
    e.preventDefault(); draft = i.value;
    const v = transform ? transform(draft) : draft.trim();
    if (v === null || v === '' || Number.isNaN(v)) return ctx.toast(transform ? 'Entre un nombre 🙂' : 'Écris quelque chose 🙂');
    ctx.send({ k, v });
  });
}
/* Ne redessine que le compteur si l'écran de saisie est déjà affiché */
function keepTyping(key, g) {
  const f = document.getElementById('vform');
  if (f && f.dataset.key === key && g.mine == null) { const w = document.querySelector('.waiting'); if (w) w.textContent = `${g.nDone} / ${g.nTotal} ont répondu`; return true; }
  return false;
}

/* ======================================================================
   👉 QUI POURRAIT… — vote anonyme
   ====================================================================== */
function QuiOnline(names) {
  const src = A.D.qui, deck = A.deck(A.S.spicy ? (A.S.spicyLvl === 2 && src.hot2 ? src.hot2 : src.hot) : src.soft);
  let round = 0, q, votes, phase;
  function next() { round++; q = deck.next(); votes = {}; phase = 'vote'; }
  function act(who, a, isHost) {
    if (a.k === 'v' && phase === 'vote' && names.includes(a.v) && a.v !== who) { votes[who] = a.v; if (names.every(p => p in votes)) phase = 'reveal'; return; }
    if (a.k === 'force' && isHost && phase === 'vote') { phase = 'reveal'; return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { next(); return; }
  }
  function view(me) {
    const tally = {}; Object.values(votes).forEach(p => tally[p] = (tally[p] || 0) + 1);
    return { id: 'quio', phase, round, q, me, players: names, myVote: votes[me] || null, nDone: Object.keys(votes).length, nTotal: names.length,
      tally: phase === 'reveal' ? tally : null };
  }
  next();
  return { act, view, min: 3, max: 16 };
}
function renderQuiO(g, ctx) {
  const card = `<div class="card" style="--g:linear-gradient(150deg,#ffb547,#e0702a);flex:none;min-height:0;padding:22px"><div class="tag" style="position:static">Qui est le plus susceptible de…</div><div class="txt" style="margin-top:10px">${esc(g.q)}</div></div>`;
  if (g.phase === 'vote') return ctx.view(`${ctx.top('Qui pourrait…')}
    <div class="stage">${card}
      <p class="hint">Vote secret 🤫 (pas pour toi)</p>
      <div class="lplayers">${g.players.filter(p => p !== g.me).map(p => `<button class="lp ${g.myVote === p ? 'chosen' : ''}" data-a="vv" data-v="${esc(p)}"><b>${esc(p)}</b></button>`).join('')}</div>
      ${wait(g)}${ctx.amHost() ? `<button class="btn ghost" data-a="vforce">Révéler sans attendre</button>` : ''}
    </div>`, null, true);
  const rows = Object.entries(g.tally).sort((a, b) => b[1] - a[1]);
  const top = rows.length ? rows[0][1] : 0, max = Math.max(1, top);
  ctx.view(`${ctx.top('Qui pourrait…')}
    <div class="stage">${card}
      <div class="bars">${rows.map(([p, n]) => `<div class="bar ${n === top ? 'top' : ''}"><span>${esc(p)}</span><i style="--w:${n / max * 100}%"></i><b>${n}</b></div>`).join('') || '<p class="hint">Aucun vote</p>'}</div>
      <p class="hint">${A.S.drinks ? `${rows.filter(r => r[1] === top).map(r => esc(r[0])).join(' & ')} boit ${top} gorgée${top > 1 ? 's' : ''} 🍻` : `Gage pour ${rows.filter(r => r[1] === top).map(r => esc(r[0])).join(' & ')} !`}</p>
      ${hostOr(ctx, `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="vnext">Suivante</button></div>`)}
    </div>`);
}

/* ======================================================================
   🔮 TU ME CONNAIS ? — en ligne
   ====================================================================== */
function ConnaisOnline(names) {
  const deck = A.deck(A.D.connais), order = shuffle(names), totals = tot(names);
  let turn = -1, target, q, ans, guesses, phase, gain;
  function next() { turn++; target = order[turn % order.length]; q = deck.next(); ans = null; guesses = {}; phase = 'answer'; gain = {}; }
  const done = () => ans !== null && names.filter(p => p !== target).every(p => p in guesses);
  function settle() { gain = {}; Object.entries(guesses).forEach(([p, i]) => { if (i === ans) { gain[p] = 1; totals[p]++; } }); phase = 'reveal'; }
  function act(who, a, isHost) {
    const i = a.v | 0;
    if (a.k === 'v' && phase === 'answer' && i >= 0 && i < q[1].length) {
      if (who === target) ans = i; else guesses[who] = i;
      if (done()) settle(); return;
    }
    if (a.k === 'force' && isHost && phase === 'answer' && ans !== null) { settle(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { next(); return; }
  }
  function view(me) {
    return { id: 'connaiso', phase, me, target, q: q[0], opts: q[1], isTarget: me === target,
      mine: me === target ? ans : (me in guesses ? guesses[me] : null), targetDone: ans !== null,
      nDone: Object.keys(guesses).length + (ans !== null ? 1 : 0), nTotal: names.length,
      ans: phase === 'reveal' ? ans : null, guesses: phase === 'reveal' ? guesses : null, totals, gain };
  }
  next();
  return { act, view, min: 2, max: 12 };
}
function renderConnaisO(g, ctx) {
  const head = `<div class="turn">${g.isTarget ? 'Question pour toi' : 'Que va répondre'}<strong>${g.isTarget ? '🔮 Réponds en secret' : esc(g.target) + ' ?'}</strong></div>
    <div class="card" style="--g:linear-gradient(150deg,#ff6fb5,#8a3ad6);flex:none;min-height:0;padding:20px"><div class="txt" style="font-size:1.3rem">${esc(g.q)}</div></div>`;
  if (g.phase === 'answer') return ctx.view(`${ctx.top('Tu me connais ?')}
    <div class="stage">${head}
      <div class="opts">${g.opts.map((o, i) => `<button class="opt answer ${g.mine === i ? 'on' : ''}" data-a="vv" data-v="${i}"><span class="letter">${'ABCD'[i]}</span><div><b>${esc(o)}</b></div></button>`).join('')}</div>
      <p class="hint">${g.isTarget ? 'Les autres essaient de deviner ta réponse.' : 'Tu marques un point si tu devines la réponse de ' + esc(g.target) + '.'}</p>
      ${wait(g)}${ctx.amHost() && g.targetDone ? `<button class="btn ghost" data-a="vforce">Révéler sans attendre</button>` : ''}
    </div>`, null, true);
  ctx.view(`${ctx.top('Tu me connais ?')}
    <div class="stage">${head}
      <div class="opts">${g.opts.map((o, i) => {
        const who = Object.entries(g.guesses).filter(([, v]) => v === i).map(([p]) => p);
        return `<div class="opt answer ${i === g.ans ? 'on' : 'dim'}"><span class="letter">${'ABCD'[i]}</span><div><b>${esc(o)}</b>${who.length ? `<span>${who.map(esc).join(', ')}</span>` : ''}</div></div>`;
      }).join('')}</div>
      ${scoresHtml(g.totals, g.gain)}
      ${hostOr(ctx, `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="vnext">Question suivante</button></div>`)}
    </div>`);
}

/* ======================================================================
   🧠 SYNCHRO — en ligne : chacun tape son mot en secret
   ====================================================================== */
function SynchroOnline(names) {
  const deck = A.deck(A.D.synchro), totals = tot(names);
  let round = 0, theme, words, phase, groups, gain;
  function next() { round++; theme = deck.next(); words = {}; phase = 'write'; groups = null; gain = {}; }
  function settle() {
    const by = {}; Object.entries(words).forEach(([p, w]) => { const k = norm(w); (by[k] = by[k] || []).push(p); });
    groups = Object.values(by).sort((a, b) => b.length - a.length).map(ps => ({ word: words[ps[0]], players: ps }));
    gain = {}; groups.forEach(gr => { if (gr.players.length > 1) gr.players.forEach(p => { gain[p] = gr.players.length - 1; totals[p] += gr.players.length - 1; }); });
    phase = 'reveal';
  }
  function act(who, a, isHost) {
    if (a.k === 'v' && phase === 'write' && !(who in words)) { const w = String(a.v || '').trim().slice(0, 30); if (!w) return; words[who] = w; if (names.every(p => p in words)) settle(); return; }
    if (a.k === 'force' && isHost && phase === 'write') { settle(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { next(); return; }
  }
  function view(me) {
    return { id: 'synchroo', phase, round, theme, me, mine: words[me] ?? null, nDone: Object.keys(words).length, nTotal: names.length, groups, totals, gain };
  }
  next();
  return { act, view, min: 2, max: 12 };
}
function renderSynchroO(g, ctx) {
  const key = 'syn|' + g.round;
  if (g.phase === 'write' && keepTyping(key, g)) return;
  const card = `<div class="card" style="--g:linear-gradient(150deg,#28c7d9,#2b5fd6);flex:none;min-height:0;padding:22px"><div class="tag" style="position:static">Manche ${g.round} · le thème</div><div class="secret" style="margin-top:8px;font-size:clamp(1.6rem,8vw,2.4rem)">${esc(g.theme)}</div></div>`;
  if (g.phase === 'write') return ctx.view(`${ctx.top('Synchro')}
    <div class="stage">${card}
      ${g.mine == null ? inputBlock(ctx, key, { placeholder: 'Ton mot…' }) : `<div class="turnbar mine">✓ Tu as dit « ${esc(g.mine)} »</div>`}
      <p class="hint">Le but : écrire le <b>même mot</b> que les autres ! Pensez « évident » 🧠</p>
      ${wait(g)}${ctx.amHost() ? `<button class="btn ghost" data-a="vforce">Révéler sans attendre</button>` : ''}
    </div>`, () => bindInput(ctx, 'v'));
  ctx.view(`${ctx.top('Synchro')}
    <div class="stage">${card}
      <div class="sgroups">${g.groups.map(gr => `<div class="sgroup ${gr.players.length > 1 ? 'hit' : ''}"><b>${esc(gr.word)}</b><span>${gr.players.map(esc).join(', ')}</span>${gr.players.length > 1 ? `<em>+${gr.players.length - 1}</em>` : ''}</div>`).join('')}</div>
      ${scoresHtml(g.totals, g.gain)}
      ${hostOr(ctx, `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="vnext">Thème suivant</button></div>`)}
    </div>`);
}

/* ======================================================================
   📏 ESTIMATIONS — le plus proche gagne
   ====================================================================== */
const fmtNum = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
function Estim(names) {
  const deck = A.deck(A.D.estim), totals = tot(names);
  let round = 0, q, vals, phase, ranking, gain;
  function next() { round++; q = deck.next(); vals = {}; phase = 'write'; ranking = null; gain = {}; }
  function settle() {
    ranking = Object.entries(vals).map(([p, v]) => ({ p, v, d: Math.abs(v - q[1]) })).sort((a, b) => a.d - b.d);
    const pts = names.length >= 3 ? [3, 2, 1] : [1]; gain = {};
    let rank = 0;
    ranking.forEach((r, i) => { if (i && r.d !== ranking[i - 1].d) rank = i; if (pts[rank]) { gain[r.p] = pts[rank]; totals[r.p] += pts[rank]; } r.rank = rank + 1; });
    phase = 'reveal';
  }
  function act(who, a, isHost) {
    if (a.k === 'v' && phase === 'write' && !(who in vals)) { const v = Number(a.v); if (!Number.isFinite(v)) return 'Nombre invalide'; vals[who] = v; if (names.every(p => p in vals)) settle(); return; }
    if (a.k === 'force' && isHost && phase === 'write') { settle(); return; }
    if (a.k === 'next' && isHost && phase === 'reveal') { next(); return; }
  }
  function view(me) {
    return { id: 'estim', phase, round, q: q[0], unit: q[2], me, mine: vals[me] ?? null, nDone: Object.keys(vals).length, nTotal: names.length,
      answer: phase === 'reveal' ? q[1] : null, ranking, totals, gain };
  }
  next();
  return { act, view, min: 2, max: 16 };
}
function renderEstim(g, ctx) {
  const key = 'est|' + g.round;
  if (g.phase === 'write' && keepTyping(key, g)) return;
  const card = `<div class="card" style="--g:linear-gradient(150deg,#f2994a,#c0392b);flex:none;min-height:0;padding:22px"><div class="tag" style="position:static">Question ${g.round}</div><div class="txt" style="margin-top:10px;font-size:1.3rem">${esc(g.q)}</div></div>`;
  if (g.phase === 'write') return ctx.view(`${ctx.top('Estimations')}
    <div class="stage">${card}
      ${g.mine == null ? inputBlock(ctx, key, { placeholder: 'Ton estimation' + (g.unit ? ` (${g.unit})` : ''), type: 'number' }) : `<div class="turnbar mine">✓ Ta réponse : ${fmtNum(g.mine)} ${esc(g.unit)}</div>`}
      <p class="hint">Pas besoin de savoir : le plus proche gagne ! (+3, +2, +1)</p>
      ${wait(g)}${ctx.amHost() ? `<button class="btn ghost" data-a="vforce">Révéler sans attendre</button>` : ''}
    </div>`, () => bindInput(ctx, 'v', s => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; }));
  ctx.view(`${ctx.top('Estimations')}
    <div class="stage">${card}
      <div class="card" style="--g:linear-gradient(150deg,#3ddc97,#16865c);flex:none;min-height:0;padding:16px"><div class="tag" style="position:static">La réponse</div><div class="secret">${fmtNum(g.answer)} ${esc(g.unit)}</div></div>
      <div class="ranking">${g.ranking.map(r => `<div><span>${r.rank}.</span><b>${esc(r.p)}</b><em>${fmtNum(r.v)}${g.gain[r.p] ? ` · +${g.gain[r.p]}` : ''}</em></div>`).join('')}</div>
      ${scoresHtml(g.totals)}
      ${hostOr(ctx, `<div class="row"><button class="btn" data-a="lobby">Salon</button><button class="btn primary" data-a="vnext">Question suivante</button></div>`)}
    </div>`);
}

/* ---------- Actions communes ---------- */
function on(a, el, ctx) {
  if (a === 'vv') { ctx.buzz(15); ctx.send({ k: 'v', v: el.dataset.v }); return true; }
  if (a === 'vforce') { ctx.send({ k: 'force' }); return true; }
  if (a === 'vnext') { ctx.send({ k: 'next' }); return true; }
  return false;
}
O.register('quio', { spicy: true, make: QuiOnline, cat: 'ambiance', name: 'Qui pourrait… (en ligne)', e: '👉', d: 'Vote anonyme sur ton téléphone, résultats en barres.', min: 3, max: 16, g: 'linear-gradient(150deg,#ffb547,#e0702a)', render: renderQuiO, on });
O.register('connaiso', { make: ConnaisOnline, cat: 'ambiance', name: 'Tu me connais ? (en ligne)', e: '🔮', d: 'Un joueur répond en secret, les autres devinent sur leur téléphone.', min: 2, max: 12, g: 'linear-gradient(150deg,#ff6fb5,#8a3ad6)', render: renderConnaisO, on });
O.register('synchroo', { make: SynchroOnline, cat: 'ambiance', name: 'Synchro (en ligne)', e: '🧠', d: 'Chacun écrit un mot en secret : dites tous le même !', min: 2, max: 12, g: 'linear-gradient(150deg,#28c7d9,#2b5fd6)', render: renderSynchroO, on });
O.register('estim', { make: Estim, cat: 'ambiance', name: 'Estimations', e: '📏', d: 'Questions chiffrées : le plus proche gagne, pas besoin de savoir !', min: 2, max: 16, g: 'linear-gradient(150deg,#f2994a,#c0392b)', render: renderEstim, on });
})();
