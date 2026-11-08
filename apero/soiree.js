/* ==========================================================================
   Soirée : compteur de gorgées, stats de la soirée et mode « Soirée auto ».
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO;
const { S, esc, view, header, toast, buzz, beep, pick, shuffle } = A;

/* ---------- Mémoire de la soirée ---------- */
const fresh = () => ({ start: Date.now(), sips: {}, jokers: {}, wins: {}, rounds: 0, games: {} });
let N = A.store.get('night', null) || fresh();
// une soirée « expire » après 12 h sans activité
if (Date.now() - (N.last || N.start) > 12 * 3600e3) N = fresh();
const persist = () => { N.last = Date.now(); A.store.set('night', N); };
const inc = (o, p, n = 1) => { o[p] = Math.max(0, (o[p] || 0) + n); };
A.night = {
  sip(p, n = 1) { if (!p || !n) return; inc(N.sips, p, n); persist(); },
  joker(p, sips = 0) { inc(N.jokers, p); if (sips) inc(N.sips, p, sips); persist(); },
  win(p) { inc(N.wins, p); persist(); },
  played(id) { inc(N.games, id); N.rounds++; persist(); },
  data: () => N,
  reset() { N = fresh(); persist(); }
};
const top = o => { const r = Object.entries(o).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); return r.length ? r[0] : null; };
const who = p => `${A.avatar(p)} ${esc(p)}`;

/* ---------- Bouton flottant 🍻 : ajouter des gorgées pendant un jeu ---------- */
A.openSips = openSheet;
function openSheet() {
  const old = document.querySelector('.sipsheet'); if (old) old.remove();
  const wrap = document.createElement('div'); wrap.className = 'sipsheet';
  const draw = () => {
    wrap.innerHTML = `<div class="box">
      <div class="sheethead"><b>${S.drinks ? '🍻 Gorgées de la soirée' : '⚠️ Pénalités de la soirée'}</b><button class="x" aria-label="Fermer">✕</button></div>
      ${S.players.map(p => `<div class="siprow"><span>${who(p)}</span><button data-p="${esc(p)}" data-n="-1">−</button><b>${N.sips[p] || 0}</b><button data-p="${esc(p)}" data-n="1">+1</button><button data-p="${esc(p)}" data-n="3">+3</button></div>`).join('')}
      <p class="hint" style="font-size:.8rem;margin-top:8px">Le compteur suit toute la soirée : retrouve les stats dans 📊 Stats.</p>
    </div>`;
    wrap.querySelector('.x').onclick = () => wrap.remove();
    wrap.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { A.night.sip(b.dataset.p, +b.dataset.n); buzz(10); b.parentElement.querySelector('b').textContent = N.sips[b.dataset.p] || 0; });
  };
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
  draw(); document.body.appendChild(wrap);
}

/* ---------- Stats de la soirée ---------- */
A.makers.stats = function () {
  return {
    render() {
      const champ = top(N.wins), drinker = top(N.sips), joker = top(N.jokers);
      const players = [...new Set([...A.S.players, ...Object.keys(N.sips), ...Object.keys(N.wins), ...Object.keys(N.jokers)])];
      const rows = players.map(p => ({ p, w: N.wins[p] || 0, s: N.sips[p] || 0, j: N.jokers[p] || 0 })).sort((a, b) => b.w - a.w || b.s - a.s);
      const fav = top(N.games);
      const mins = Math.round((Date.now() - N.start) / 60000);
      view(`${header('📊 La soirée')}
        <div class="stage">
          <p class="hint">Soirée commencée il y a ${mins < 60 ? mins + ' min' : Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min'} · ${N.rounds} manche${N.rounds > 1 ? 's' : ''} jouée${N.rounds > 1 ? 's' : ''}${fav && A.G[fav[0]] ? ` · jeu préféré : ${A.G[fav[0]].e} ${esc(A.G[fav[0]].name)}` : ''}</p>
          <div class="podium">
            <div class="pod gold"><span>👑</span><small>Champion·ne</small><b>${champ ? who(champ[0]) : '—'}</b><em>${champ ? champ[1] + ' victoire' + (champ[1] > 1 ? 's' : '') : 'pas encore'}</em></div>
            <div class="pod"><span>${S.drinks ? '🍻' : '⚠️'}</span><small>${S.drinks ? 'Plus gros buveur' : 'Plus pénalisé·e'}</small><b>${drinker ? who(drinker[0]) : '—'}</b><em>${drinker ? drinker[1] + (S.drinks ? ' gorgées' : ' points') : '—'}</em></div>
            <div class="pod"><span>🃏</span><small>Roi des Jokers</small><b>${joker ? who(joker[0]) : '—'}</b><em>${joker ? joker[1] + ' joker' + (joker[1] > 1 ? 's' : '') : '—'}</em></div>
          </div>
          <div class="stable"><div class="sh"><span>Joueur</span><span>🏆</span><span>${S.drinks ? '🍻' : '⚠️'}</span><span>🃏</span></div>
            ${rows.map(r => `<div><span>${who(r.p)}</span><span>${r.w}</span><span>${r.s}</span><span>${r.j}</span></div>`).join('') || '<p class="hint">Rien pour l’instant… jouez !</p>'}</div>
          ${drinker && S.drinks ? `<p class="hint">🥤 Pensez à boire de l'eau entre deux verres, et personne ne conduit après !</p>` : ''}
          <button class="btn" data-a="nreset">🔄 Nouvelle soirée (tout remettre à zéro)</button>
        </div>`);
    },
    on(a) { if (a === 'nreset' && confirm('Remettre toutes les stats de la soirée à zéro ?')) { A.night.reset(); toast('Nouvelle soirée 🥳'); this.render(); } }
  };
};

/* ---------- Soirée auto ---------- */
let SA = { round: 0, last: [], pending: null, cur: null };
A.soiree = { round: () => SA.round, game: () => SA.pending };
A.makers.soiree = function () {
  const n = A.S.players.length;
  const pool = () => Object.keys(A.G).filter(id => !A.G[id].noAuto && (!A.S.spicy || A.G[id].spicy) && A.fitAt(id, n) !== '-' && n >= A.minPlayers(id));
  function spin(self) {
    const all = pool(); if (!all.length) return toast('Aucun jeu disponible pour ce nombre de joueurs');
    const choices = all.filter(id => !SA.last.includes(id));
    const target = pick(choices.length ? choices : all);
    SA.cur = null; self.render(true);
    const el = () => document.getElementById('sareel');
    const seq = shuffle(all); let i = 0, steps = 16 + Math.floor(Math.random() * 6);
    const step = () => {
      i++; const id = i >= steps ? target : seq[i % seq.length], g = A.G[id], e = el();
      if (e) e.innerHTML = `<span>${g.e}</span><b>${esc(g.name)}</b>`;
      beep(400 + i * 30, .03, 'triangle', .08);
      if (i >= steps) { SA.cur = target; SA.last = [target, ...SA.last].slice(0, 3); buzz(60); return self.render(); }
      setTimeout(step, 50 + Math.pow(i / steps, 3) * 320);
    };
    step();
  }
  const self = {
    get confirmLeave() { return SA.round ? 'Quitter la Soirée auto ?\n\nPas de souci : la soirée et le classement sont gardés. Tu pourras la reprendre depuis l’accueil (bouton « Reprendre la soirée »).' : null; },
    render(spinning) {
      const wins = N.wins, rows = A.S.players.map(p => [p, wins[p] || 0]).sort((a, b) => b[1] - a[1]);
      if (SA.pending) {
        const g = A.G[SA.pending];
        return view(`${header('🎲 Soirée auto')}
          <div class="stage">
            <div class="turn">Manche ${SA.round} terminée<strong>${g.e} ${esc(g.name)}</strong></div>
            <div class="label">Qui a gagné cette manche ?</div>
            <div class="chips" style="margin-top:0">${A.S.players.map(p => `<button class="chip pickp" data-a="sawin" data-p="${esc(p)}" style="padding-right:14px">${who(p)}</button>`).join('')}</div>
            <button class="btn" data-a="sawin" data-p="">Personne / pas de gagnant</button>
            <div class="row"><button class="btn" data-a="sareplay">🔄 Rejouer à ${esc(g.name)}</button></div>
          </div>`);
      }
      const g = SA.cur && A.G[SA.cur];
      view(`${header('🎲 Soirée auto')}
        <div class="stage">
          <div class="turn">${SA.round ? `${SA.round} manche${SA.round > 1 ? 's' : ''} jouée${SA.round > 1 ? 's' : ''}` : 'C’est parti !'}<strong>Manche ${SA.round + 1}</strong></div>
          <div class="sareel ${g ? 'done' : ''}" id="sareel" style="${g ? `--g:${g.g}` : ''}">${g ? `<span>${g.e}</span><b>${esc(g.name)}</b><small>${esc(g.d)}</small>` : `<span>🎲</span><b>${spinning ? '…' : 'Quel jeu ?'}</b>`}</div>
          ${g ? `<div class="row"><button class="btn" data-a="saspin">🔄 Autre jeu</button><button class="btn primary" data-a="saplay">▶️ Jouer</button></div>`
              : `<button class="btn primary big block" data-a="saspin" ${spinning ? 'disabled' : ''}>Tirer le jeu au sort</button>`}
          <div class="label">Classement de la soirée</div>
          <div class="scores">${rows.map(([p, w], i) => `<div class="score ${i === 0 && w ? 'lead' : ''}"><span>${i === 0 && w ? '👑 ' : ''}${who(p)}</span><span>${w} 🏆</span></div>`).join('')}</div>
          <div class="row"><button class="btn" data-a="page" data-id="stats">📊 Stats</button><button class="btn" data-a="saend">🏁 Finir la soirée</button></div>
        </div>`);
    },
    on(a, el) {
      if (a === 'saspin') spin(self);
      if (a === 'saplay' && SA.cur) { SA.round++; SA.pending = SA.cur; A.night.played(SA.cur); A.openGame(SA.cur); }
      if (a === 'sareplay' && SA.pending) { A.openGame(SA.pending); return; }
      if (a === 'sawin') { if (el.dataset.p) { A.night.win(el.dataset.p); toast(`+1 victoire pour ${el.dataset.p} 🏆`); } SA.pending = null; SA.cur = null; self.render(); }
      if (a === 'saend') {
        const loser = top(N.sips), champ = top(N.wins);
        alert(`🏁 Fin de la soirée !\n\n👑 Champion·ne : ${champ ? champ[0] : 'personne'}\n${loser ? `${S.drinks ? '🍻' : '⚠️'} ${loser[0]} a le plus ${S.drinks ? 'bu' : 'de pénalités'}${S.drinks ? '' : ' : gage final pour lui / elle !'}` : ''}`);
        SA = { round: 0, last: [], pending: null, cur: null }; A.openPage('stats');
      }
      if (a === 'page') A.openPage(el.dataset.id);
    }
  };
  return self;
};
})();
