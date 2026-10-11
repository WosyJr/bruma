const V = require('./views');
const TV = require('./townviews');
const I = require('./inn');
const J = require('./innjack');
const Wh = require('./innwheel');
const Hz = require('./innhazard');
const Hl = require('./innhilo');
const Bn = require('./bones');

const esc = V.esc;
const hidden = V.hidden;
const sep = n => I.septims(n);
const card = TV.card;

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const die = v => `<span class="die${v ? '' : ' blank'}"${v ? ` aria-label="${v}"` : ''}>${Array.from({ length: 9 }, (_, i) => `<b${v && PIPS[v].includes(i) ? ' class="on"' : ''}></b>`).join('')}</span>`;
const bone = TV.bone;

const ART = {
  cards: () => `<div class="cards">${['Ah', 'Ks'].map(card).join('')}</div>`,
  wheel: () => `<div class="minwheel">${wheelSvg(17, 'mini')}</div>`,
  hazard: () => `<div class="bones">${[5, 2].map(die).join('')}</div>`,
  redblack: () => `<div class="cards">${['7d', '??'].map(card).join('')}</div>`,
  bones: () => `<div class="bones">${[6, 6, 6].map(bone).join('')}</div>`
};
const BLURB = {
  cards: 'Blackjack against Old Brannoc from a six-deck shoe. Double, split, insure, surrender.',
  wheel: 'Single-zero roulette. Numbers, splits, corners, dozens, red or black.',
  hazard: 'Name a main from five to nine, then throw two dice and chase your chance.',
  redblack: 'Higher or lower on the next card. Each right call grows the pot. Mind the aces.',
  bones: 'Three bones, a pot, and the frost. First to fifty takes the stake.'
};

function purseBar(d) {
  const p = d.patron;
  if (!p || p.status !== 'seated') return '';
  return `<div class="pursebar">
    <span class="lbl">Your purse</span><b data-purse>${sep(p.purse)}</b><span class="unit">septims</span>
    <span class="sp"></span>
    <a href="/inn/me">My bets and purse</a>
    ${p.kind === 'guest' ? `<form method="post" action="/inn/leave">${hidden(d.csrf)}<button class="linkish" type="submit">Leave the inn</button></form>` : ''}
  </div>`;
}

function door(d) {
  const p = d.patron;
  const u = d.user;
  if (p && p.status === 'seated') return `<div class="card lobbyhead innseated">
    <div class="eyebrow">The Jerall View Inn · by the North Gate</div>
    <h2>Welcome back, ${esc(p.name)}</h2>
    <p class="lede">${p.purse ? 'Pick a table. Every stake comes out of your purse and every win goes back into it.' : 'Your purse is empty. See the innkeeper in game, hand over your coin, and they will fill it.'}</p>
    ${purseBar(d)}
  </div>`;
  if (p && p.status === 'waiting') return `<div class="card lobbyhead">
    <div class="eyebrow">The Jerall View Inn · by the North Gate</div>
    <h2>Your name is with the innkeeper</h2>
    <p class="lede">${esc(I.KEEPER)} has written <b>${esc(p.name)}</b> in his book. A keeper of the inn will seat you. Hand over the coin you want to play with in game, and they will put it in your purse.</p>
    ${p.kind === 'guest' ? `<form method="post" action="/inn/leave">${hidden(d.csrf)}<button class="linkish" type="submit">Leave the inn</button></form>` : ''}
  </div>`;
  if (p && p.status === 'turned') return `<div class="card lobbyhead">
    <div class="eyebrow">The Jerall View Inn · by the North Gate</div>
    <h2>The innkeeper has turned you away</h2>
    <p class="lede">The tables are closed to <b>${esc(p.name)}</b>. Take it up with the inn’s keepers in game.</p>
    ${p.kind === 'guest' ? `<form method="post" action="/inn/leave">${hidden(d.csrf)}<button class="linkish" type="submit">Leave the inn</button></form>` : ''}
  </div>`;
  const head = `<div class="eyebrow">The Jerall View Inn · by the North Gate</div>
    <h2>Give the innkeeper your name</h2>
    <p class="lede">The tables play for real septims. ${esc(I.KEEPER)} seats only those the inn’s keepers have accepted, and every purse is filled by handing over coin in game.</p>`;
  if (u) return `<div class="card lobbyhead">${head}
    <form method="post" action="/inn/ask" class="iask">${hidden(d.csrf)}
      <p>You sit down as <b>${esc(u.name)}</b>. No passphrase needed: your hall login is your seat.</p>
      <button class="btn go" type="submit">Ask for a seat</button>
    </form>
  </div>`;
  return `<div class="card lobbyhead">${head}
    <div class="doorforms">
      <form method="post" action="/inn/ask" class="stack iask">${hidden(d.csrf)}
        <h3>Ask for a seat</h3>
        <label>Your character’s name<input name="name" maxlength="40" required autocomplete="off"></label>
        <label>A passphrase<input name="pass" type="password" minlength="6" maxlength="100" required autocomplete="new-password"><span class="hint">You need it to sit down again, on any device. Six letters or more.</span></label>
        <label>Who are you in Bruma? <span class="hint">optional</span><input name="who" maxlength="80" placeholder="A trader from Cheydinhal"></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn go" type="submit">Ask for a seat</button>
      </form>
      <form method="post" action="/inn/signin" class="stack iask">${hidden(d.csrf)}
        <h3>Asked already? Sit down</h3>
        <label>Your character’s name<input name="name" maxlength="40" required autocomplete="username"></label>
        <label>Your passphrase<input name="pass" type="password" maxlength="100" required autocomplete="current-password"></label>
        <button class="btn ghost" type="submit">Sit down</button>
        <p class="hint">Officers of the County <a href="/login?to=/inn">enter the hall</a> and ask with one click.</p>
      </form>
    </div>
  </div>`;
}

function lobby(d) {
  const seated = d.patron && d.patron.status === 'seated';
  const o = d.outcomes;
  const peek = g => {
    const l = o[g] || [];
    if (!l.length) return '';
    if (g === 'wheel') return `<span class="peek">${l.slice(0, 10).map(x => `<i class="pk ${x.c}">${x.n}</i>`).join('')}</span>`;
    if (g === 'hazard') return `<span class="peek">${l.slice(0, 8).map(x => `<i class="pk ${x.r === 'win' ? 'good' : 'bad'}">${x.t[x.t.length - 1]}</i>`).join('')}</span>`;
    if (g === 'cards') return `<span class="peek">${l.slice(0, 10).map(x => `<i class="pk${x === 'bust' ? ' good' : ''}">${esc(x)}</i>`).join('')}</span>`;
    return '';
  };
  return `<section class="innlobby">
  ${door(d)}
  <div class="lobbytables five">
    ${I.GAMES.map(g => {
      const inner = `${ART[g.id]()}<h3>${esc(g.name)}</h3><p>${BLURB[g.id]}</p>${peek(g.id)}<span class="hint">${sep(d.house.limits[g.id].min)} to ${sep(d.house.limits[g.id].max)} a ${g.id === 'wheel' ? 'spin' : 'stake'}</span>`;
      return seated ? `<a class="tablecard" href="/inn/${g.id}">${inner}<span class="dcta">Take a seat →</span></a>` : `<a class="tablecard shut" href="/inn/${g.id}">${inner}<span class="closed">Seated patrons only</span></a>`;
    }).join('')}
  </div>
</section>`;
}

function seatHead(d, game) {
  return `<div class="innhead">
      <div><div class="eyebrow"><a href="/inn">The Jerall View Inn</a></div><h2>${esc(I.GAME[game].name)}</h2></div>
      <div class="innwho">${d.patron && d.patron.status === 'seated' ? `<span class="pmini">Purse <b data-purse>${sep(d.patron.purse)}</b></span>` : ''}${game === 'cards' || game === 'bones' ? '<button type="button" class="btn ghost small" data-tutopen>How to play</button>' : ''}</div>
    </div>`;
}

function stakeRow(d, game, label, extra) {
  const lim = d.house.limits[game];
  const p = d.patron;
  const last = Math.min(Math.max(d.lastBet || lim.min, lim.min), lim.max);
  const chips = [lim.min, lim.min * 5, lim.min * 20, lim.max].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
  const empty = !p.purse;
  return `<div class="stakerow">
      <label class="stake">Stake<input name="bet" inputmode="numeric" value="${last}" data-stake aria-label="Stake in septims"${empty ? ' disabled' : ''}></label>
      <span class="chips">${chips.map(v => `<button type="button" class="chipbtn" data-chip="${v}"${empty ? ' disabled' : ''}>${sep(v)}</button>`).join('')}</span>
      ${extra || ''}
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>${label}</button>
    </div>
    ${empty ? '<p class="emptypurse">Your purse is empty. See the innkeeper in game.</p>' : `<p class="hint lims">${sep(lim.min)} to ${sep(lim.max)} at this table</p>`}`;
}

function jackHand(h, i, many) {
  const tag = { win: 'Won', lose: 'Lost', push: 'Push', bust: 'Bust', surrender: 'Surrendered', blackjack: 'Blackjack' }[h.result] || '';
  return `<div class="hand${h.active ? ' active' : ''}${h.result ? ' r-' + h.result : ''}">
    <div class="hlabel"><span>${many ? 'Hand ' + (i + 1) : 'You'}</span><b>${(h.soft ? 'soft ' : '') + h.total}</b></div>
    <div class="cards">${h.cards.map(card).join('')}</div>
    <div class="hmeta">${sep(h.bet)}${h.doubled ? ' · doubled' : ''}${tag ? ` · <em>${tag}</em>` : ''}</div>
  </div>`;
}

function cardsPart(d, o) {
  const v = Object.assign({}, d.view, o || {});
  const p = d.patron;
  const live = v.started && v.phase !== 'done';
  const btn = (what, label, key, on, cls) => `<button class="btn ${cls || 'ghost'}" type="submit" formaction="/inn/cards/${what}" data-key="${key}"${on ? '' : ' disabled'}>${label} <kbd>${key.toUpperCase()}</kbd></button>`;
  let ctrl;
  if (o && o.frame) ctrl = '<div class="iacts"><span class="hint">Brannoc plays his hand…</span></div>';
  else if (v.phase === 'insurance') ctrl = `<form method="post" action="/inn/cards/insure" data-inn class="iacts">${hidden(d.csrf)}
      <button class="btn go" type="submit" formaction="/inn/cards/insure" data-key="i"${v.can.insureAfford ? '' : ' disabled'}>Insure for ${sep(Math.floor(v.bet / 2))} <kbd>I</kbd></button>
      <button class="btn ghost" type="submit" formaction="/inn/cards/noinsure" data-key="n">No insurance <kbd>N</kbd></button>
    </form>`;
  else if (live) ctrl = `<form method="post" action="/inn/cards/hit" data-inn class="iacts">${hidden(d.csrf)}
      ${btn('hit', 'Hit', 'h', v.can.hit, 'go')}${btn('stand', 'Stand', 's', v.can.stand)}${btn('double', 'Double', 'd', v.can.double)}${btn('split', 'Split', 'p', v.can.split)}${btn('surrender', 'Surrender', 'r', v.can.surrender)}
    </form>`;
  else ctrl = `<form method="post" action="/inn/cards/deal" data-inn>${hidden(d.csrf)}${stakeRow(d, 'cards', v.started ? 'Deal again' : 'Deal me in')}</form>`;
  const dealer = v.started ? v.dealer : [];
  const many = v.hands && v.hands.length > 1;
  return `<div class="felt">
    <div class="hand"><div class="hlabel"><span>${esc(I.KEEPER)}</span><b>${v.started ? v.dealerTotal : ''}</b></div><div class="cards">${dealer.length ? dealer.map(card).join('') : '<span class="pcard ghost"></span><span class="pcard ghost"></span>'}</div></div>
    <p class="say ${esc(v.tone || '')}" data-say aria-live="polite">${esc(v.say)}</p>
    <div class="hands${many ? ' many' : ''}">${v.started ? v.hands.map((h, i) => jackHand(h, i, many)).join('') : '<div class="hand"><div class="hlabel"><span>You</span><b></b></div><div class="cards"><span class="pcard ghost"></span><span class="pcard ghost"></span></div></div>'}</div>
    ${v.started && !live && v.staked ? `<p class="settle">Staked ${sep(v.staked)} · back to you ${sep(v.returned)}${v.ins ? ` · insurance ${sep(v.ins)}` : ''}</p>` : (v.started && v.ins ? `<p class="settle">Insured for ${sep(v.ins)}</p>` : '')}
    ${p && p.status === 'seated' ? ctrl : ''}
    ${v.streak > 1 ? `<p class="streak">${v.streak} wins in a row</p>` : ''}
    <p class="hint shoe">${v.left} cards left in the shoe · reshuffled at three quarters</p>
  </div>`;
}

function wheelSvg(n, cls) {
  const N = Wh.ORDER.length;
  const a = 360 / N;
  const idx = Math.max(0, Wh.ORDER.indexOf(n));
  const R0 = 100, R1 = 74, R2 = 50;
  const pt = (r, deg) => { const t = (deg - 90) * Math.PI / 180; return [(110 + r * Math.cos(t)).toFixed(2), (110 + r * Math.sin(t)).toFixed(2)]; };
  const seg = (i) => {
    const s = i * a - a / 2, e = i * a + a / 2;
    const [x1, y1] = pt(R0, s), [x2, y2] = pt(R0, e), [x3, y3] = pt(R1, e), [x4, y4] = pt(R1, s);
    const num = Wh.ORDER[i];
    const [tx, ty] = pt((R0 + R1) / 2 + 1, i * a);
    return `<path d="M${x1} ${y1}A${R0} ${R0} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R1} ${R1} 0 0 0 ${x4} ${y4}Z" class="pk-${Wh.colour(num)}"/><text x="${tx}" y="${ty}" transform="rotate(${(i * a).toFixed(2)} ${tx} ${ty})">${num}</text>`;
  };
  return `<svg class="wheel ${cls || ''}" viewBox="0 0 220 220" role="img" aria-label="${n === null || n === undefined ? 'The wheel at rest' : 'The ball rests on ' + n}">
    <circle cx="110" cy="110" r="108" class="rim"/>
    <g class="spinner" data-spinner style="transform:rotate(${(-idx * a).toFixed(3)}deg)">${Wh.ORDER.map((_, i) => seg(i)).join('')}<circle cx="110" cy="110" r="${R1}" class="bowl"/><circle cx="110" cy="110" r="${R2}" class="hub"/>${[0, 45, 90, 135].map(r => `<path d="M110 ${110 - R2 + 6}V${110 + R2 - 6}" class="spoke" transform="rotate(${r} 110 110)"/>`).join('')}</g>
    <circle cx="110" cy="${110 - R1 - 6}" r="5" class="ball" data-ball${n === null || n === undefined ? ' hidden' : ''}/>
    <path d="M104 2h12l-6 10z" class="pointer"/>
  </svg>`;
}

function hot(key, x, y, xv, yv, label) {
  return `<button type="button" class="hot" data-place="${key}" style="--x:${x}%;--y:${y}%;--xv:${xv}%;--yv:${yv}%" aria-label="${esc(label)}"></button>`;
}

function cloth() {
  const cells = [];
  const hots = [];
  const f = v => +(v * 100).toFixed(3);
  for (let n = 1; n <= 36; n++) {
    const col = Math.floor((n - 1) / 3) + 1, row = 3 - ((n - 1) % 3);
    const vc = ((n - 1) % 3) + 1, vr = Math.floor((n - 1) / 3) + 1;
    cells.push(`<button type="button" class="num ${Wh.colour(n)}" data-place="s${n}" style="--c:${col};--r:${row};--vc:${vc};--vr:${vr}" aria-label="Straight up ${n}">${n}</button>`);
    if (n % 3 !== 0) hots.push(hot('v' + n, f((col - 0.5) / 12), f((row - 1) / 3), f(vc / 3), f((vr - 0.5) / 12), 'Split ' + n + ' and ' + (n + 1)));
    if (n <= 33) hots.push(hot('h' + n, f(col / 12), f((row - 0.5) / 3), f((vc - 0.5) / 3), f(vr / 12), 'Split ' + n + ' and ' + (n + 3)));
    if (n % 3 !== 0 && n <= 32) hots.push(hot('c' + n, f(col / 12), f((row - 1) / 3), f(vc / 3), f(vr / 12), 'Corner ' + [n, n + 1, n + 3, n + 4].join(', ')));
  }
  for (let r = 0; r < 12; r++) hots.push(hot('st' + r, f((r + 0.5) / 12), 100, 0, f((r + 0.5) / 12), 'Street ' + (3 * r + 1) + ' to ' + (3 * r + 3)));
  for (let r = 0; r < 11; r++) hots.push(hot('l' + r, f((r + 1) / 12), 100, 0, f((r + 1) / 12), 'Six line ' + (3 * r + 1) + ' to ' + (3 * r + 6)));
  [1, 2, 3].forEach(n => hots.push(hot('z' + n, 0, f((3.5 - n) / 3), f((n - 0.5) / 3), 0, 'Split 0 and ' + n)));
  hots.push(hot('t1', 0, f(2 / 3), f(1 / 3), 0, 'Trio 0, 1, 2'));
  hots.push(hot('t2', 0, f(1 / 3), f(2 / 3), 0, 'Trio 0, 2, 3'));
  hots.push(hot('f4', 0, 100, 0, 0, 'First four 0, 1, 2, 3'));
  const out = (k, label, cls) => `<button type="button" class="out ${cls || ''}" data-place="${k}">${label}</button>`;
  return `<div class="cloth" data-cloth>
    <button type="button" class="num green zero" data-place="s0" aria-label="Straight up 0">0</button>
    <div class="nums">${cells.join('')}${hots.join('')}</div>
    <div class="colbets">${[3, 2, 1].map(c => out('k' + c, '2 to 1', 'col')).join('')}</div>
    <div class="dozens">${out('d1', '1st 12')}${out('d2', '2nd 12')}${out('d3', '3rd 12')}</div>
    <div class="evens">${out('low', '1–18')}${out('even', 'Even')}${out('red', '<span class="dia red"></span>', 'redbet')}${out('black', '<span class="dia black"></span>', 'blackbet')}${out('odd', 'Odd')}${out('high', '19–36')}</div>
  </div>`;
}

function wheelPart(d) {
  const w = d.view;
  const lim = d.house.limits.wheel;
  const last = w.last;
  const empty = !d.patron.purse;
  const chips = [lim.min, lim.min * 5, lim.min * 20, lim.min * 100].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
  return `<div class="felt wheelfelt">
    <div class="wheeltop">
      ${wheelSvg(last ? last.n : null)}
      <div class="wresult" data-wresult>${last ? `<div class="wnum ${last.colour}">${last.n}</div><p class="say ${last.returned > last.staked ? 'good' : (last.returned < last.staked ? 'bad' : '')}" data-say>${last.n} ${last.colour}. ${last.returned ? 'Back to you: ' + sep(last.returned) + '.' : 'The house takes the cloth.'}</p>
        <ul class="wlines">${last.lines.map(l => `<li class="${l.won ? 'won' : ''}"><span>${esc(l.label)}</span><span>${sep(l.amount)}${l.won ? ' → ' + sep(l.ret) : ''}</span></li>`).join('')}</ul>` : '<p class="say" data-say>Place your chips and spin.</p>'}</div>
    </div>
    ${cloth()}
    <form method="post" action="/inn/wheel/spin" data-inn data-wheelform class="wheelctl">${hidden(d.csrf)}
      <input type="hidden" name="bets" value="${esc(JSON.stringify(w.bets || {}))}" data-bets>
      <div class="chips" role="radiogroup" aria-label="Chip">${chips.map((v, i) => `<button type="button" class="chip c${i}${i === 0 ? ' on' : ''}" data-chipval="${v}" role="radio" aria-checked="${i === 0}">${sep(v)}</button>`).join('')}</div>
      <span class="wtotal">On the cloth <b data-total>0</b></span>
      <button type="button" class="btn ghost small" data-undo>Undo</button>
      <button type="button" class="btn ghost small" data-clear>Clear</button>
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Spin</button>
      <noscript><div class="nojs"><select name="place">${['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'd2', 'd3', 'k1', 'k2', 'k3'].concat(Array.from({ length: 37 }, (_, i) => 's' + i)).map(k => `<option value="${k}">${esc(Wh.BETS[k].label)}</option>`).join('')}</select><input name="amount" inputmode="numeric" value="${lim.min}"></div></noscript>
    </form>
    ${empty ? '<p class="emptypurse">Your purse is empty. See the innkeeper in game.</p>' : `<p class="hint lims">Each place at least ${sep(lim.min)}; at most ${sep(lim.max)} on one spin. Click a chip, then the cloth. Edges and corners of the numbers take splits, corners, streets and lines.</p>`}
  </div>`;
}

function hazardPart(d) {
  const g = d.view;
  const live = Hz.live(g);
  const last = g.throws && g.throws.length ? g.throws[g.throws.length - 1] : [0, 0];
  const lim = d.house.limits.hazard;
  const side = `<details class="side"><summary>Side bet on the next throw</summary><div class="sidein"><label>Total<select name="sideTotal">${Object.keys(Hz.SIDE).map(t => `<option value="${t}">${t} · pays ${Hz.SIDE[t]} to 1</option>`).join('')}</select></label><label>Amount<input name="sideAmount" inputmode="numeric" placeholder="none"></label></div></details>`;
  let ctrl;
  if (live) ctrl = `<form method="post" action="/inn/hazard/throw" data-inn class="iacts col">${hidden(d.csrf)}${side}<button class="btn go" type="submit" data-key="enter">Throw again</button></form>`;
  else ctrl = `<form method="post" action="/inn/hazard/start" data-inn>${hidden(d.csrf)}
      <fieldset class="mains"><legend>Your main</legend>${Hz.MAINS.map(m => `<label><input type="radio" name="main" value="${m}"${(g.main || 7) === m ? ' checked' : ''}><span>${m}</span></label>`).join('')}</fieldset>
      ${stakeRow(d, 'hazard', 'Throw', '')}
      ${side}
    </form>`;
  return `<div class="felt dicefelt">
    <div class="hzstate"><span>Main <b>${g.main || '–'}</b></span><span>Chance <b>${g.chance || '–'}</b></span>${g.staked ? `<span>Staked <b>${sep(g.staked)}</b></span>` : ''}</div>
    <div class="bones" data-dice>${last.map(die).join('')}</div>
    <p class="say ${esc(g.tone || '')}" data-say aria-live="polite">${esc(g.say)}</p>
    ${g.throws && g.throws.length > 1 ? `<p class="hint throws">Throws: ${g.throws.map(t => t[0] + t[1]).join(' · ')}</p>` : ''}
    ${ctrl}
  </div>`;
}

function redblackPart(d) {
  const g = d.view;
  const live = Hl.live(g);
  const o = live ? Hl.odds(g) : null;
  const x = m => m ? '×' + m.toFixed(2) : '–';
  let ctrl;
  if (live) ctrl = `<form method="post" action="/inn/redblack/hi" data-inn class="iacts">${hidden(d.csrf)}
      <button class="btn go" type="submit" formaction="/inn/redblack/hi" data-key="h"${o.hi ? '' : ' disabled'}>Higher ${x(o.hi)} <kbd>H</kbd></button>
      <button class="btn go" type="submit" formaction="/inn/redblack/lo" data-key="l"${o.lo ? '' : ' disabled'}>Lower ${x(o.lo)} <kbd>L</kbd></button>
      <button class="btn ghost" type="submit" formaction="/inn/redblack/take" data-key="t"${g.calls ? '' : ' disabled'}>Take ${sep(Math.floor(g.pot))} <kbd>T</kbd></button>
    </form>
    <p class="hint">${o.left} cards left: ${o.hiN} higher, ${o.loN} lower, ${o.same} the same, ${o.aces} ${o.aces === 1 ? 'ace' : 'aces'}.</p>`;
  else ctrl = `<form method="post" action="/inn/redblack/start" data-inn>${hidden(d.csrf)}${stakeRow(d, 'redblack', 'Turn a card')}</form>`;
  return `<div class="felt">
    <div class="hlrow">
      <div class="hand"><div class="hlabel"><span>On the table</span></div><div class="cards big">${g.card ? card(g.card) : '<span class="pcard ghost"></span>'}</div></div>
      <div class="hlpot"><span class="lbl">Pot</span><b>${sep(Math.floor(g.pot || 0))}</b>${live ? `<span class="hint">${g.calls} ${g.calls === 1 ? 'call' : 'calls'} right</span>` : ''}</div>
    </div>
    <p class="say ${esc(g.tone || '')}" data-say aria-live="polite">${esc(g.say)}</p>
    ${g.turned && g.turned.length > 1 ? `<div class="cards run">${g.turned.slice(0, -1).slice(-10).map(card).join('')}</div>` : ''}
    ${ctrl}
  </div>`;
}

function bonesPart(d, s) {
  const g = Object.assign({}, d.view, s || {});
  const seat = (who, label, score) => `<div class="iseat${g.turn === who ? ' turn' : ''}"><span class="lbl">${esc(label)}</span><span class="score">${score}</span><span class="of">of ${Bn.GOAL}</span><span class="track"><i style="width:${Math.min(100, Math.round(score / Bn.GOAL * 100))}%"></i></span></div>`;
  const dice = (g.dice || g.last || []).length ? (g.dice || g.last) : [0, 0, 0];
  let ctrl = '';
  if (s && s.frame) ctrl = '';
  else if (!g.over && g.turn === 'you') ctrl = `<form method="post" action="/inn/bones/throw" data-inn class="iacts">${hidden(d.csrf)}
      <button class="btn go" type="submit" formaction="/inn/bones/throw" data-key="t">Throw the bones <kbd>T</kbd></button>
      <button class="btn ghost" type="submit" formaction="/inn/bones/bank" data-key="c"${g.pot ? '' : ' disabled'}>Call it <kbd>C</kbd></button>
    </form>`;
  else if (g.over) ctrl = `<form method="post" action="/inn/bones/start" data-inn>${hidden(d.csrf)}${stakeRow(d, 'bones', g.log.length ? 'Another game' : 'Play for it')}</form>`;
  return `<div class="itable">
      ${seat('you', 'You', g.you)}
      <div class="imid">
        <div class="bones" data-dice>${dice.map(bone).join('')}</div>
        <div class="pot">THIS POT <b>${g.pot}</b>${g.stake && !g.over ? ` · STAKE <b>${sep(g.stake)}</b>` : ''}</div>
        ${ctrl}
        <p class="say ${esc(g.tone || '')}" data-say aria-live="polite">${esc(g.say)}</p>
      </div>
      ${seat('inn', Bn.KEEPER, g.inn)}
    </div>
    <div class="ilog">${(g.log || []).map(l => `<div>${esc(l)}</div>`).join('') || '<div>The fire is lit.</div>'}</div>`;
}

const PART = { cards: cardsPart, wheel: wheelPart, hazard: hazardPart, redblack: redblackPart, bones: bonesPart };

function part(game, d, o) {
  if (!d.patron || d.patron.status !== 'seated') return `<div class="closedtable"><p>${esc(I.KEEPER)} looks up. “This table is for seated patrons, traveller.”</p><a class="btn go" href="/inn">Ask for a seat at the door</a></div>`;
  return PART[game](d, o);
}

const RULES = {
  cards: `<ul class="irules">
    <li>Stake first, then the deal. Closer to <b>21</b> than ${esc(I.KEEPER)} wins even money.</li>
    <li><b>Blackjack</b> on the deal pays <b>3 to 2</b>.</li>
    <li>He shows an ace: <b>insurance</b> costs half your stake and pays 2 to 1 if he has twenty-one.</li>
    <li><b>Double</b> on any two cards: one more card, twice the stake.</li>
    <li><b>Split</b> a pair into two hands, up to four. Split aces take one card each.</li>
    <li><b>Surrender</b> your first two cards for half your stake back.</li>
    <li>He draws to 17 and stands on soft 17. A tie is a push.</li>
  </ul>`,
  wheel: `<ul class="irules">
    <li>One green zero, 37 pockets.</li>
    <li>Straight up pays <b>35 to 1</b>; split 17; street or trio 11; corner or first four 8; six line 5.</li>
    <li>Dozens and columns pay <b>2 to 1</b>.</li>
    <li>Red, black, odd, even, 1–18 and 19–36 pay <b>even money</b>, and lose on zero.</li>
  </ul>`,
  hazard: `<ul class="irules">
    <li>Choose a <b>main</b> from 5 to 9, then throw two dice.</li>
    <li>Throw your main: a <b>nick</b>, you win. Throw 2 or 3: <b>out</b>, you lose.</li>
    <li>11 nicks a main of 7 and outs the rest. 12 nicks a main of 6 or 8 and outs the rest.</li>
    <li>Anything else is your <b>chance</b>. Throw it again before the main to win.</li>
    <li>The main bet pays <b>even money</b>. A side bet names the next total.</li>
  </ul>`,
  redblack: `<ul class="irules">
    <li>${esc(I.KEEPER)} turns a card. Call <b>higher</b> or <b>lower</b> for the next.</li>
    <li>Each right call multiplies the pot by the odds shown, less a 4% cut.</li>
    <li>An <b>ace</b> ends you. The same rank again is Brannoc’s.</li>
    <li>Take the pot any time after your first right call. The house pays at most ${Hl.CAP}× the table’s largest stake.</li>
  </ul>`,
  bones: `<ul class="irules">
    <li>Stake first; win and you take back <b>twice</b> it.</li>
    <li>Throw three bones; their total goes in your <b>pot</b>. Call it to bank the pot.</li>
    <li>A single pip is <b>frost</b>: the pot is lost.</li>
    <li>Three alike is <b>+${Bn.LUCK}</b>. First to ${Bn.GOAL} wins. You and Brannoc take turns to throw first.</li>
  </ul>`
};

function lastOut(game, l) {
  if (!l || !l.length) return V.empty('No rounds played yet.');
  if (game === 'wheel') return `<div class="lastout">${l.map(x => `<i class="pk ${x.c}">${x.n}</i>`).join('')}</div>`;
  if (game === 'cards') return `<div class="lastout">${l.map(x => `<i class="pk${x === 'bust' ? ' good' : (x === 'BJ' ? ' bad' : '')}">${esc(x)}</i>`).join('')}</div><p class="hint">What ${esc(I.KEEPER)} finished on, newest first.</p>`;
  if (game === 'hazard') return `<div class="lastout">${l.map(x => `<i class="pk ${x.r === 'win' ? 'good' : 'bad'}" title="Main ${x.main}: ${x.t.join(', ')}">${x.t.join('·')}</i>`).join('')}</div><p class="hint">The throws of each round, newest first. Green won.</p>`;
  if (game === 'redblack') return `<div class="lastout">${l.map(x => `<span class="lorow ${x.r === 'cash' ? 'good' : 'bad'}">${x.cards.map(c => esc(c.replace(/[shdc]$/, ''))).join(' ')}</span>`).join('')}</div>`;
  if (game === 'bones') return `<div class="lastout">${l.map(x => `<i class="pk ${x.w === 'you' ? 'good' : 'bad'}">${x.you}–${x.inn}</i>`).join('')}</div><p class="hint">Patron against Brannoc, newest first.</p>`;
  return '';
}

const TUT = {
  cards: [
    ['The aim', 'Finish closer to <b>21</b> than Old Brannoc without going over. Over 21 is a <b>bust</b>. You stake first, from your purse.', ['7h', 'Kc', '4s'], '7 + 10 + 4 = <b>21</b>'],
    ['What cards are worth', 'Number cards count what they show. <b>J, Q and K count 10.</b> An <b>ace counts 11</b>, or 1 if 11 would bust you.', ['As', '6d'], 'Soft 17'],
    ['Your choices', '<b>Hit</b> for a card, <b>Stand</b> to stop. <b>Double</b> your stake for exactly one more card. <b>Split</b> a pair into two hands. <b>Surrender</b> to get half back.', ['8s', '8h'], 'A pair of eights: split them'],
    ['Brannoc’s turn', 'He turns his hidden card and <b>draws until 17</b>. If he shows an ace he offers <b>insurance</b> first.', ['9c', '8d'], 'He has 17 and stops'],
    ['Getting paid', 'A win pays even money. <b>Blackjack</b>, an ace and a ten-card on the deal, pays <b>3 to 2</b>. A tie gives your stake back.', ['Ah', 'Qs'], 'Blackjack']
  ],
  bones: [
    ['The aim', 'Put down a stake. First to <b>50</b> wins it twice over.', [6, 4, 3], 'Throw: 13 into your pot'],
    ['Grow your pot', 'Each throw adds to your <b>pot</b>. Throw again, or <b>Call it</b> to bank it.', [5, 5, 2], 'Pot 25'],
    ['Watch for frost', 'A bone showing a <b>single pip is frost</b>: the pot melts and the turn passes.', [1, 6, 4], 'Frost'],
    ['Bruma’s luck', '<b>Three alike</b> adds <b>+10</b>. You and Brannoc take turns to throw first, game by game.', [4, 4, 4], '12 + 10']
  ]
};

function tutorial(game, csrf, open) {
  const steps = TUT[game];
  if (!steps) return '';
  const pic = v => game === 'cards' ? v.map(card).join('') : v.map(bone).join('');
  return `<div class="tut" id="tut" data-tut="${game}"${open ? '' : ' hidden'}>
  <div class="tutbox" role="dialog" aria-modal="true" aria-labelledby="tuthead">
    <div class="eyebrow">How to play · <span data-tutn>1</span> of ${steps.length}</div>
    ${steps.map((st, i) => `<div class="tutstep" data-step="${i}"${i ? ' hidden' : ''}><h3${i ? '' : ' id="tuthead"'}>${st[0]}</h3><p>${st[1]}</p><div class="tutpic"><div class="${game === 'cards' ? 'cards' : 'bones'}">${pic(st[2])}</div><span>${st[3]}</span></div></div>`).join('')}
    <div class="tutdots">${steps.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
    <div class="tutacts">
      <button type="button" class="btn ghost small" data-tutback hidden>Back</button>
      <button type="button" class="btn go" data-tutnext>Next</button>
      <form method="post" action="/inn/${game}/learned" data-tutdone hidden>${hidden(csrf)}<button class="btn go" type="submit">To the table</button></form>
      <form method="post" action="/inn/${game}/learned" class="tutskip">${hidden(csrf)}<button class="linkish" type="submit">Skip, I know how</button></form>
    </div>
  </div>
</div>`;
}

function tablePage(game, d) {
  const others = I.GAMES.filter(g => g.id !== game);
  return `<section class="innwrap">
  <div class="inn" id="inn" data-game="${game}">
    ${seatHead(d, game)}
    <div id="tbl" data-tbl="${game}">${part(game, d)}</div>
  </div>
  <div class="innside">
    <section class="card tight"><div class="eyebrow" style="margin-bottom:10px">The rules</div>${RULES[game]}</section>
    <section class="card tight"><div class="eyebrow" style="margin-bottom:10px">The last 20</div><div data-lastout>${lastOut(game, d.outcomes[game])}</div><p class="hint">Every card, die and spin is drawn on the server by a cryptographic random draw. Nobody at the inn can steer it.</p></section>
    <nav class="card tight othertables"><div class="eyebrow" style="margin-bottom:8px">Other tables</div>${others.map(g => `<a href="/inn/${g.id}">${esc(g.name)}</a>`).join('')}</nav>
  </div>
</section>
${tutorial(game, d.csrf, d.tutorial && d.patron && d.patron.status === 'seated')}<script src="/inn.js?v=${V.stamp('inn.js')}" defer></script>`;
}

function mePage(d) {
  const p = d.patron;
  const r = d.record;
  const row = x => `<tr><td>${esc(V.when(x.at))}</td><td>${esc(I.GAME[x.game].short)}</td><td class="num">${sep(x.staked)}</td><td class="num">${sep(x.returned)}</td><td class="num ${x.net > 0 ? 'up' : (x.net < 0 ? 'down' : '')}">${x.net > 0 ? '+' : ''}${sep(x.net)}</td></tr>`;
  return `<section class="stack">
  <div class="card lobbyhead">
    <div class="eyebrow"><a href="/inn">The Jerall View Inn</a></div>
    <h2>${esc(p.name)}’s purse</h2>
    ${purseBar(d)}
    <div class="mestats">
      <div><span class="lbl">Rounds</span><b>${sep(r.rounds)}</b></div>
      <div><span class="lbl">Staked</span><b>${sep(r.staked)}</b></div>
      <div><span class="lbl">Back to you</span><b>${sep(r.returned)}</b></div>
      <div><span class="lbl">${r.net >= 0 ? 'You are up' : 'The house is up'}</span><b class="${r.net >= 0 ? 'up' : 'down'}">${sep(Math.abs(r.net))}</b></div>
    </div>
    <p class="hint">${r.wins} rounds won, ${r.losses} lost, against ${esc(I.KEEPER)} and Hjalmar.</p>
  </div>
  <div class="card"><h3>Your last 50 rounds</h3>${r.last.length ? `<div class="tablewrap"><table class="innt"><thead><tr><th>When</th><th>Table</th><th class="num">Staked</th><th class="num">Back</th><th class="num">Net</th></tr></thead><tbody>${r.last.map(row).join('')}</tbody></table></div>` : V.empty('No rounds played yet.')}</div>
  <div class="card"><h3>Your purse in and out</h3>${r.purse.length ? `<ul class="plog">${r.purse.map(x => `<li><span>${esc(V.when(x.at))}</span><span>${{ add: 'Added', take: 'Taken out', set: 'Set to' }[x.kind]} <b>${sep(x.amount)}</b> by ${esc(x.byName)}${x.note ? ' · ' + esc(x.note) : ''}</span><span class="num">${sep(x.after)}</span></li>`).join('')}</ul>` : V.empty('Nothing yet. A keeper of the inn fills your purse when you hand over coin in game.')}</div>
</section>`;
}

function ledgerPage(d) {
  const L = d.ledger, h = d.house;
  const pform = p => `<form method="post" action="/inn/ledger/${esc(p.id)}/purse" class="pform">${hidden(d.csrf)}
      <select name="kind" aria-label="What to do"><option value="add">Add</option><option value="take">Take</option><option value="set">Set to</option></select>
      <input name="amount" inputmode="numeric" required placeholder="Septims" aria-label="Septims">
      <input name="note" maxlength="140" placeholder="Note (handed over at the bar…)" aria-label="Note">
      <button class="btn go small" type="submit">Enter</button>
    </form>`;
  const act = (p, what, label, cls) => `<form method="post" action="/inn/ledger/${esc(p.id)}/${what}" class="inl">${hidden(d.csrf)}<button class="btn ${cls || 'ghost'} small" type="submit">${label}</button></form>`;
  const who = p => `<b>${esc(p.name)}</b>${p.kind === 'login' ? ' <span class="tag">officer</span>' : ''}${p.who ? `<span class="hint"> · ${esc(p.who)}</span>` : ''}`;
  return `<section class="stack">
  <div class="card">
    <div class="eyebrow">The Coffers</div>
    <h2 style="margin:4px 0 6px">The Inn Ledger</h2>
    <p class="hint">${L.seated.length} seated · ${L.waiting.length} waiting · purses hold ${sep(L.held)} in all. <a href="/inn/fairness">How the tables ran</a></p>
  </div>
  <div class="card"><h3>Asking for a seat</h3>
    ${L.waiting.length ? `<ul class="plist">${L.waiting.map(p => `<li><div>${who(p)}<span class="hint"> · asked ${esc(V.when(p.at))}</span></div><div class="acts">${act(p, 'accept', 'Seat them', 'go')}${act(p, 'turn', 'Turn away')}</div></li>`).join('')}</ul>` : V.empty('Nobody is waiting.')}
  </div>
  <div class="card"><h3>Seated patrons</h3>
    ${L.seated.length ? `<ul class="plist">${L.seated.map(p => `<li><div>${who(p)}<span class="purseamt">${sep(p.purse)}</span></div>${pform(p)}<div class="acts">${p.kind === 'guest' ? act(p, 'resetpass', 'New passphrase') : ''}${act(p, 'turn', 'Unseat')}</div></li>`).join('')}</ul>` : V.empty('Nobody is seated yet.')}
  </div>
  ${L.turned.length ? `<div class="card"><h3>Turned away</h3><ul class="plist">${L.turned.map(p => `<li><div>${who(p)}${p.purse ? `<span class="purseamt">${sep(p.purse)}</span>` : ''}</div>${p.purse ? pform(p) : ''}<div class="acts">${act(p, 'accept', 'Seat them')}${p.purse ? '' : act(p, 'forget', 'Forget them')}</div></li>`).join('')}</ul><p class="hint">Forgetting a patron frees the name to ask again. Empty their purse first.</p></div>` : ''}
  <div class="card"><h3>House limits</h3>
    <form method="post" action="/inn/ledger/house" class="stack">${hidden(d.csrf)}
      <div class="limgrid"><span></span><span class="lbl">Smallest</span><span class="lbl">Largest</span>${I.GAMES.map(g => `<span>${esc(g.name)}</span><input name="min_${g.id}" inputmode="numeric" value="${h.limits[g.id].min}" aria-label="${esc(g.name)} smallest"><input name="max_${g.id}" inputmode="numeric" value="${h.limits[g.id].max}" aria-label="${esc(g.name)} largest">`).join('')}</div>
      <label>Daily loss cap per patron <span class="hint">0 for none</span><input name="dailyCap" inputmode="numeric" value="${h.dailyCap}"></label>
      <label class="check"><input type="checkbox" name="hitSoft17" value="1"${h.hitSoft17 ? ' checked' : ''}> Brannoc hits soft 17 <span class="hint">a little harder on patrons</span></label>
      <label class="check"><input type="checkbox" name="anyTen" value="1"${h.anyTen ? ' checked' : ''}> Any two ten-cards may be split <span class="hint">otherwise only the same rank</span></label>
      <button class="btn go" type="submit">Set the house rules</button>
      ${h.updatedBy ? `<p class="hint">Last set by ${esc(h.updatedBy)}, ${esc(V.when(h.updatedAt))}.</p>` : ''}
    </form>
  </div>
  ${L.luck.length ? `<div class="card"><h3>Luck of the Nine</h3><p class="hint">Five hands running won from ${esc(I.KEEPER)}. Officers can be given the honour on <a href="/honours">the Roll of Honour</a>.</p><ul class="plog">${L.luck.map(x => `<li><span>${esc(V.when(x.at))}</span><span><b>${esc(x.name)}</b>${x.username ? ' <span class="tag">officer</span>' : ''}</span></li>`).join('')}</ul></div>` : ''}
  <div class="card"><h3>Purse book</h3>${L.log.length ? `<ul class="plog">${L.log.map(x => `<li><span>${esc(V.when(x.at))}</span><span><b>${esc(x.name)}</b>: ${{ add: 'added', take: 'took out', set: 'set to' }[x.kind]} ${sep(x.amount)} (${sep(x.before)} → ${sep(x.after)}) by ${esc(x.byName)}${x.own ? ' <span class="tag warn">own purse</span>' : ''}${x.note ? ' · ' + esc(x.note) : ''}</span></li>`).join('')}</ul>` : V.empty('No purse has been touched yet.')}</div>
</section>`;
}

function fairnessPage(d) {
  const w = d.week;
  return `<section class="stack">
  <div class="card">
    <div class="eyebrow"><a href="/inn/ledger">The Inn Ledger</a></div>
    <h2 style="margin:4px 0 6px">How the tables ran</h2>
    <p class="hint">This week so far. The house edge is what the house kept out of every septim staked. Over a few rounds it swings wildly; over hundreds it settles near the expected figure.</p>
    <div class="mestats">
      <div><span class="lbl">Rounds</span><b>${sep(w.rounds)}</b></div>
      <div><span class="lbl">Staked</span><b>${sep(w.staked)}</b></div>
      <div><span class="lbl">Paid back</span><b>${sep(w.returned)}</b></div>
      <div><span class="lbl">${w.house >= 0 ? 'House up' : 'House down'}</span><b class="${w.house >= 0 ? 'up' : 'down'}">${sep(Math.abs(w.house))}</b></div>
    </div>
  </div>
  <div class="card"><div class="tablewrap"><table class="innt"><thead><tr><th>Table</th><th class="num">Rounds</th><th class="num">Staked</th><th class="num">Paid back</th><th class="num">House edge</th><th>Expected</th></tr></thead><tbody>
    ${I.GAMES.map(g => { const r = w.byGame[g.id]; return `<tr><td>${esc(g.name)}</td><td class="num">${sep(r.rounds)}</td><td class="num">${sep(r.staked)}</td><td class="num">${sep(r.returned)}</td><td class="num">${r.staked ? (r.edge * 100).toFixed(1) + '%' : '–'}</td><td class="hint">${esc(g.theory)}</td></tr>`; }).join('')}
  </tbody></table></div></div>
</section>`;
}

module.exports = { lobby, tablePage, part, cardsPart, bonesPart, mePage, ledgerPage, fairnessPage, lastOut, wheelSvg };
