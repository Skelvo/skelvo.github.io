/* ==========================================================================
   Jeux à boire classiques (un seul téléphone).
   Le Jeu du Roi · La Pyramide · Le Bus
   Sans alcool : les gorgées deviennent des points de pénalité, et le
   joueur le plus pénalisé fait un gage à la fin.
   ========================================================================== */
(() => {
'use strict';
const A = window.APERO;
const { esc, shuffle, pick, view, header, toast, buzz, beep, S } = A;

/* ---------- Cartes ---------- */
const RANKS = '23456789TJQKA', SUITS = 'shdc';
const newDeck = () => shuffle([...RANKS].flatMap(r => [...SUITS].map(s => r + s)));
const val = c => RANKS.indexOf(c[0]) + 2;                     // 2 … 14 (As fort)
const RL = { T: '10', J: 'V', Q: 'D', K: 'R', A: 'A' }, SL = { s: '♠', h: '♥', d: '♦', c: '♣' };
const NAME = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' };
const red = c => c[1] === 'h' || c[1] === 'd';
const card = (c, cls = '') => c ? `<span class="pc ${red(c) ? 'red' : ''} ${cls}"><b>${RL[c[0]] || c[0]}</b><i>${SL[c[1]]}</i></span>` : `<span class="pc back ${cls}"></span>`;

/* gorgées ou points de pénalité */
const g = n => S.drinks ? `${n} gorgée${n > 1 ? 's' : ''}` : `${n} point${n > 1 ? 's' : ''} de pénalité`;
const drink = n => S.drinks ? `boit ${g(n)} 🍻` : `prend ${g(n)}`;
function tally() {
  const t = {};
  return {
    add(p, n) { t[p] = (t[p] || 0) + n; },
    html(title = S.drinks ? 'Gorgées' : 'Pénalités') {
      const rows = Object.entries(t).sort((a, b) => b[1] - a[1]); if (!rows.length) return '';
      return `<div class="label">${title}</div><div class="scores">${rows.map(([p, n], i) => `<div class="score ${i === 0 ? 'lead' : ''}"><span>${esc(p)}</span><span>${n}</span></div>`).join('')}</div>`;
    },
    worst() { return Object.entries(t).sort((a, b) => b[1] - a[1])[0]; }
  };
}

/* ======================================================================
   👑 LE JEU DU ROI
   ====================================================================== */
const ROI_RULES = {
  14: ['Cascade', () => `Tout le monde commence à boire en même temps${S.drinks ? '' : ' (ou à applaudir)'}. Celui qui a tiré arrête quand il veut ; chacun ne peut arrêter qu'après son voisin de droite !`],
  2: ['Pour toi', () => `Choisis quelqu'un : il ${drink(2)}.`],
  3: ['Pour moi', () => `Tu ${drink(3).replace('boit', 'bois').replace('prend', 'prends')}.`],
  4: ['Le sol', () => `Tout le monde touche le sol ! Le dernier ${drink(2)}.`],
  5: ['La main', () => `Tout le monde lève la main ! Le dernier ${drink(2)}.`],
  6: ['Je n\'ai jamais', () => `Dis « Je n'ai jamais… » : tous ceux qui l'ont déjà fait ${S.drinks ? 'boivent une gorgée' : 'prennent un point'}.`],
  7: ['Le ciel', () => `Tout le monde pointe le ciel ! Le dernier ${drink(2)}.`],
  8: ['Partenaire', () => `Choisis un partenaire : jusqu'au prochain 8, à chaque fois que tu bois, il boit aussi.`],
  9: ['Rimes', () => `Dis un mot : chacun son tour trouve une rime. Le premier qui sèche ou répète ${drink(2)}.`],
  10: ['Catégories', () => `Choisis un thème (marques de bière, pays…) : chacun cite un élément. Le premier qui sèche ${drink(2)}.`],
  11: ['Nouvelle règle', () => `Invente une règle valable jusqu'à la fin de la partie (ex : interdit de dire « boire »). Celui qui l'enfreint ${drink(1)}.`],
  12: ['Maître des questions', () => `Tu es le maître des questions jusqu'à la prochaine Dame : quiconque répond à une de tes questions ${drink(1)}.`],
  13: ['Coupe du Roi', () => ``]
};
function Roi() {
  const rot = A.rotation(), d = newDeck(), T = tally();
  let who = rot.next(), cur = null, kings = 0, master = null, partner = null, rules = [];
  return {
    render() {
      const left = d.length;
      if (!cur) return view(`${header('Le Jeu du Roi')}
        <div class="stage">
          <div class="turn">Au tour de<strong>${esc(who)}</strong></div>
          <button class="bigdeck" data-a="draw">${card(null, 'big')}<span>Tirer une carte</span><small>${left} cartes · ${4 - kings} Roi${4 - kings > 1 ? 's' : ''} restant${4 - kings > 1 ? 's' : ''}</small></button>
          ${status()}
          ${T.html()}
        </div>`);
      const v = val(cur), [title, txt] = ROI_RULES[v];
      let text = txt();
      if (v === 13) text = kings < 4 ? `Verse un peu de ta boisson dans la coupe au centre (${kings}/4 Rois tirés).` : `C'est le 4e Roi ! ${esc(who)} ${S.drinks ? 'boit la coupe… ou 5 gorgées si elle est trop remplie 😅' : 'fait un gage : ' + esc(pick(A.gages()))}`;
      view(`${header('Le Jeu du Roi')}
        <div class="stage">
          <div class="turn">${esc(who)} tire</div>
          <div class="card roicard" style="--g:${v === 13 ? 'linear-gradient(160deg,#f7b733,#c0661c)' : 'linear-gradient(160deg,#2c2249,#221a3b)'}">
            <div class="roiface">${card(cur, 'huge')}</div>
            <div class="secret" style="font-size:1.8rem">${NAME[v]} · ${title}</div>
            <div class="sub" style="font-size:1.05rem">${text}</div>
          </div>
          ${v === 11 ? `<form class="add-row" id="rform"><input id="rin" maxlength="80" placeholder="La nouvelle règle…" autocomplete="off"><button class="btn" type="submit">Ajouter</button></form>` : ''}
          ${[2, 3].includes(v) ? `<div class="label">Qui boit ?</div><div class="chips" style="margin-top:0">${(v === 3 ? [who] : A.S.players.filter(p => p !== who)).map(p => `<button class="chip pickp" data-a="rsip" data-p="${esc(p)}" data-n="${v}" style="padding-right:14px">${esc(p)}</button>`).join('')}</div>` : ''}
          ${v === 8 ? `<div class="label">Ton partenaire</div><div class="chips" style="margin-top:0">${A.S.players.filter(p => p !== who).map(p => `<button class="chip pickp" data-a="rpart" data-p="${esc(p)}" style="padding-right:14px">${esc(p)}</button>`).join('')}</div>` : ''}
          ${left ? `<button class="btn primary big block" data-a="next">Joueur suivant</button>` : `<div class="turnbar mine">Le paquet est fini ! 🎉</div><button class="btn primary big block" data-a="again">Nouvelle partie</button>`}
          ${status()}
        </div>`, () => {
          const f = document.getElementById('rform');
          if (f) f.addEventListener('submit', e => { e.preventDefault(); const t = document.getElementById('rin').value.trim(); if (t) { rules.push(t); toast('Règle ajoutée ✓'); this.render(); } });
        });
    },
    on(a, el) {
      if (a === 'draw') {
        cur = d.pop(); const v = val(cur);
        if (v === 13) { kings++; if (kings === 4) { T.add(who, 5); buzz([200, 80, 200]); } }
        if (v === 12) master = who;
        beep(700 + v * 30, .08, 'sine'); buzz(25); this.render();
      }
      if (a === 'rsip') { T.add(el.dataset.p, +el.dataset.n); toast(`${el.dataset.p} ${drink(+el.dataset.n)}`); el.disabled = true; }
      if (a === 'rpart') { partner = { a: who, b: el.dataset.p }; toast(`${el.dataset.p} boit avec ${who} jusqu'au prochain 8`); this.render(); }
      if (a === 'next') { cur = null; who = rot.next(); this.render(); }
      if (a === 'again') { Object.assign(this, Roi()); this.render(); }
    }
  };
  function status() {
    const bits = [];
    if (master) bits.push(`👑 Maître des questions : <b>${esc(master)}</b>`);
    if (partner) bits.push(`🤝 ${esc(partner.b)} boit avec ${esc(partner.a)}`);
    rules.forEach(r => bits.push(`📜 ${esc(r)}`));
    return bits.length ? `<div class="rules-live">${bits.map(b => `<div>${b}</div>`).join('')}</div>` : '';
  }
}

/* ======================================================================
   🔺 LA PYRAMIDE — mémorise tes cartes, puis bluffe
   ====================================================================== */
function Pyramide() {
  const names = A.S.players.slice(), d = newDeck(), T = tally();
  const hands = {}; names.forEach(p => hands[p] = [d.pop(), d.pop(), d.pop(), d.pop()]);
  const pyr = Array.from({ length: 15 }, () => d.pop());       // rangées de 5, 4, 3, 2, 1 (de bas en haut)
  const rowOf = i => i < 5 ? 1 : i < 9 ? 2 : i < 12 ? 3 : i < 14 ? 4 : 5;
  let phase = 'memo', mi = 0, shown = false, revealed = -1, giver = null, target = null, peekT = null;
  const self = {
    render() {
      if (phase === 'memo') {
        const p = names[mi];
        return view(`${header('La Pyramide')}
          <div class="stage">
            <div class="turn">Joueur ${mi + 1} / ${names.length}</div>
            <div class="card" style="--g:linear-gradient(160deg,#2c2249,#221a3b);flex:none;min-height:0;padding:22px">
              <div class="tag" style="position:static">${shown ? `${esc(p)}, mémorise tes 4 cartes !` : 'Passe le téléphone à'}</div>
              ${shown ? `<div class="pyrhand">${hands[p].map(c => card(c, 'big')).join('')}</div><div class="sub" id="pyrt">Elles se cachent dans 10 s…</div>` : `<div class="secret">${esc(p)}</div><div class="sub">Personne d'autre ne regarde 👀</div>`}
            </div>
            ${shown ? `<button class="btn big block" data-a="pyrhide">J'ai retenu, cacher</button>` : `<button class="btn primary big block" data-a="pyrshow">Voir mes cartes</button>`}
            <p class="hint">Retiens bien les valeurs : tu ne pourras plus les revoir avant la fin !</p>
          </div>`);
      }
      const rows = [[14], [12, 13], [9, 10, 11], [5, 6, 7, 8], [0, 1, 2, 3, 4]];
      const cur = revealed >= 0 ? pyr[revealed] : null, n = revealed >= 0 ? rowOf(revealed) : 0;
      const end = revealed >= 14 && !giver;
      view(`${header('La Pyramide')}
        <div class="stage" style="gap:10px">
          <div class="pyr">${rows.map(r => `<div>${r.map(i => i <= revealed ? card(pyr[i], i === revealed ? 'cur' : 'done') : card(null)).join('')}</div>`).join('')}</div>
          ${cur ? `<p class="log">${NAME[val(cur)]} · rangée ${n} : on donne <b>${g(n)}</b></p>` : '<p class="hint">Retourne la première carte (en bas à gauche).</p>'}
          ${cur && !end ? (giver == null
            ? `<div class="label">Quelqu'un a un ${NAME[val(cur)]} ?</div>
               <div class="chips" style="margin-top:0">${names.map(p => `<button class="chip pickp" data-a="pyrgiver" data-p="${esc(p)}" style="padding-right:14px">${esc(p)}</button>`).join('')}</div>`
            : target == null
              ? `<div class="label">${esc(giver)} donne ${g(n)} à…</div>
                 <div class="chips" style="margin-top:0">${names.filter(p => p !== giver).map(p => `<button class="chip pickp" data-a="pyrtarget" data-p="${esc(p)}" style="padding-right:14px">${esc(p)}</button>`).join('')}</div>
                 <button class="btn ghost" data-a="pyrcancel">Annuler</button>`
              : `<div class="turnbar">${esc(target)}, tu crois ${esc(giver)} ?</div>
                 <div class="row"><button class="btn ok" data-a="pyrok">Je bois</button><button class="btn" style="background:#ff4d4d;color:#fff;border:0" data-a="pyrliar">Menteur !</button></div>`) : ''}
          ${end ? `<div class="turnbar mine">Pyramide terminée ! 🎉</div>
              <div class="label">Les cartes de chacun</div>
              <div class="pyrall">${names.map(p => `<div><span>${esc(p)}</span><div>${hands[p].map(c => card(c, 'tiny')).join('')}</div></div>`).join('')}</div>
              <button class="btn primary big block" data-a="pyragain">Nouvelle pyramide</button>`
            : (giver == null ? `<button class="btn primary big block" data-a="pyrnext">${revealed < 0 ? 'Retourner la première carte' : 'Carte suivante'}</button>` : '')}
          ${T.html()}
        </div>`, null, true);
    },
    on(a, el) {
      if (a === 'pyrshow') { shown = true; this.render(); let s = 10; clearInterval(peekT); peekT = setInterval(() => { s--; const t = document.getElementById('pyrt'); if (t) t.textContent = `Elles se cachent dans ${s} s…`; if (s <= 0) { clearInterval(peekT); self.on('pyrhide'); } }, 1000); }
      if (a === 'pyrhide') { clearInterval(peekT); if (!shown) return; shown = false; mi++; if (mi >= names.length) phase = 'play'; this.render(); }
      if (a === 'pyrnext') { revealed++; beep(600 + revealed * 30, .08, 'sine'); buzz(20); this.render(); }
      if (a === 'pyrgiver') { giver = el.dataset.p; this.render(); }
      if (a === 'pyrtarget') { target = el.dataset.p; this.render(); }
      if (a === 'pyrcancel') { giver = target = null; this.render(); }
      if (a === 'pyrok') { const n = rowOf(revealed); T.add(target, n); toast(`${target} ${drink(n)}`); giver = target = null; this.render(); }
      if (a === 'pyrliar') {
        const n = rowOf(revealed), rank = pyr[revealed][0], has = hands[giver].some(c => c[0] === rank);
        if (has) { T.add(target, 2 * n); toast(`${giver} avait bien la carte ! ${target} ${drink(2 * n)} 😈`); }
        else { T.add(giver, 2 * n); toast(`${giver} bluffait ! ${giver} ${drink(2 * n)} 🤥`); }
        buzz([80, 40, 80]); giver = target = null; this.render();
      }
      if (a === 'pyragain') { A.makers.pyramide && (Object.assign(self, A.makers.pyramide())); self.render(); }
    },
    leave() { clearInterval(peekT); }
  };
  return self;
}

/* ======================================================================
   🚌 LE BUS — 4 questions, et le plus malchanceux prend le bus
   ====================================================================== */
const BUS_Q = [
  ['Rouge ou noir ?', [['rouge', '🟥 Rouge'], ['noir', '⬛ Noir']]],
  ['Plus haut ou plus bas que ta 1re carte ?', [['haut', '⬆️ Plus haut'], ['bas', '⬇️ Plus bas']]],
  ['Entre tes deux cartes, ou à l’extérieur ?', [['entre', '↔️ Entre'], ['dehors', '⇹ À l’extérieur']]],
  ['Quelle couleur ?', [['s', '♠ Pique'], ['h', '♥ Cœur'], ['d', '♦ Carreau'], ['c', '♣ Trèfle']]]
];
function Bus() {
  const names = A.S.players.slice(), T = tally(), errors = {}; names.forEach(p => errors[p] = 0);
  let d = newDeck(), pi = 0, q = 0, hand = [], last = null, phase = 'quiz', rider = null, bus = [], pos = 0, msg = '';
  const draw = () => { if (!d.length) d = newDeck(); return d.pop(); };
  function judge(ans, c) {
    const v = val(c);
    if (q === 0) return (ans === 'rouge') === red(c);
    if (q === 1) { const f = val(hand[0]); return v !== f && (ans === 'haut') === (v > f); }
    if (q === 2) { const lo = Math.min(val(hand[0]), val(hand[1])), hi = Math.max(val(hand[0]), val(hand[1])); return v !== lo && v !== hi && (ans === 'entre') === (v > lo && v < hi); }
    return c[1] === ans;
  }
  function startBus() {
    const max = Math.max(...Object.values(errors)); rider = pick(names.filter(p => errors[p] === max));
    phase = 'bus'; bus = [draw()]; pos = 0; msg = '';
  }
  return {
    render() {
      if (phase === 'quiz') {
        const p = names[pi], [txt, opts] = BUS_Q[q];
        return view(`${header('Le Bus')}
          <div class="stage">
            <div class="turn">${esc(p)} · question ${q + 1}/4</div>
            <div class="pyrhand">${hand.map(c => card(c, 'big')).join('')}${card(null, 'big')}</div>
            ${last ? `<p class="log">${last}</p>` : ''}
            <div class="card" style="--g:linear-gradient(160deg,#f7971e,#d35400);flex:none;min-height:0;padding:20px"><div class="txt">${txt}</div><div class="sub">Raté = ${g(q + 1)}</div></div>
            <div class="${opts.length > 2 ? 'busgrid' : 'row'}">${opts.map(([k, l]) => `<button class="btn big" data-a="busans" data-v="${k}">${l}</button>`).join('')}</div>
            ${T.html()}
          </div>`, null, true);
      }
      if (phase === 'busintro') {
        return view(`${header('Le Bus')}
          <div class="stage">
            <div class="card" style="--g:linear-gradient(160deg,#f7971e,#d35400);flex:none;min-height:0;padding:24px">
              <div class="big-num" style="font-size:4.5rem">🚌</div>
              <div class="secret">${esc(rider)}</div><div class="sub">prend le bus ! (${errors[rider]} erreur${errors[rider] > 1 ? 's' : ''})</div></div>
            <p class="hint">5 cartes à passer en devinant « plus haut » ou « plus bas » que la précédente. Une erreur = tu bois le numéro de la carte et tu repars de zéro !</p>
            <button class="btn primary big block" data-a="busgo">Monter dans le bus</button>
            ${T.html()}
          </div>`);
      }
      if (phase === 'bus') {
        return view(`${header('Le Bus')}
          <div class="stage">
            <div class="turn">${esc(rider)} dans le bus · étape ${pos + 1}/5</div>
            <div class="busrow">${Array.from({ length: 6 }, (_, i) => i < bus.length ? card(bus[i], i === bus.length - 1 ? 'cur' : 'done') : card(null)).join('')}</div>
            ${msg ? `<p class="log">${msg}</p>` : ''}
            <div class="row"><button class="btn big" data-a="busup">⬆️ Plus haut</button><button class="btn big" data-a="busdown">⬇️ Plus bas</button></div>
            <p class="hint" style="font-size:.82rem">Une carte de même valeur compte comme une erreur.</p>
            ${T.html()}
          </div>`, null, true);
      }
      view(`${header('Le Bus')}
        <div class="stage">
          <div class="card" style="--g:linear-gradient(160deg,#3ddc97,#16865c);flex:none;min-height:0;padding:24px"><div class="big-num" style="font-size:4rem">🏁</div><div class="secret">${esc(rider)} descend du bus !</div></div>
          ${T.html()}
          <button class="btn primary big block" data-a="busagain">Nouvelle partie</button>
        </div>`);
    },
    on(a, el) {
      if (a === 'busans') {
        const c = draw(), ok = judge(el.dataset.v, c), p = names[pi];
        hand.push(c);
        if (!ok) { errors[p]++; T.add(p, q + 1); buzz([80, 40, 80]); beep(220, .2, 'sawtooth'); } else { beep(1100, .1, 'sine'); buzz(20); }
        last = `${NAME[val(c)]}${SL[c[1]]} : ${ok ? 'gagné ✅' : `raté ❌ ${esc(p)} ${drink(q + 1)}`}`;
        q++;
        if (q >= 4) { q = 0; hand = []; pi++; if (pi >= names.length) { startBus(); phase = 'busintro'; } }
        this.render();
      }
      if (a === 'busgo') { phase = 'bus'; this.render(); }
      if (a === 'busup' || a === 'busdown') {
        const prev = bus[bus.length - 1], c = draw(), ok = a === 'busup' ? val(c) > val(prev) : val(c) < val(prev);
        bus.push(c);
        if (ok) { pos++; msg = `${NAME[val(c)]}${SL[c[1]]} : ça passe ✅`; beep(1100, .1, 'sine'); if (pos >= 5) { phase = 'end'; buzz([60, 40, 60, 40, 200]); } }
        else { const n = pos + 1; T.add(rider, n); msg = `${NAME[val(c)]}${SL[c[1]]} : raté ❌ ${esc(rider)} ${drink(n)} et repart de zéro`; buzz([100, 50, 100]); beep(220, .2, 'sawtooth'); pos = 0; bus = [c]; }
        this.render();
      }
      if (a === 'busagain') { pi = 0; q = 0; hand = []; last = null; names.forEach(p => errors[p] = 0); phase = 'quiz'; d = newDeck(); this.render(); }
    }
  };
}

/* ---------- Enregistrement ---------- */
Object.assign(A.G, {
  roi:      { name: 'Le Jeu du Roi', e: '👑', d: 'Chaque carte a sa règle. Gare au 4e Roi !', g: 'linear-gradient(150deg,#f7b733,#8e2de2)', fit: 'obbb', isNew: true },
  pyramide: { name: 'La Pyramide', e: '🔺', d: 'Mémorise tes cartes, puis bluffe', g: 'linear-gradient(150deg,#e65c00,#9b1b30)', fit: '-bbb', isNew: true },
  bus:      { name: 'Le Bus', e: '🚌', d: '4 questions… et le perdant prend le bus', g: 'linear-gradient(150deg,#f7971e,#d35400)', fit: 'obbb', isNew: true }
});
A.makers.roi = Roi; A.makers.pyramide = Pyramide; A.makers.bus = Bus;
})();
