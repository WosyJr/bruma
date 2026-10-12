const V = require('./views');
const TV = require('./townviews');
const I = require('./inn');
const J = require('./innjack');
const Wh = require('./innwheel');
const Hz = require('./innhazard');
const Hl = require('./innhilo');
const Bn = require('./bones');
const Wr = require('./innwhere');
const HV = require('./innhouseviews');
const GV = require('./inngameviews');

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
  bones: () => `<div class="bones">${[6, 6, 6].map(bone).join('')}</div>`,
  ...HV.ART,
  ...GV.ART
};
const BLURB = {
  cards: 'Blackjack against Old Brannoc from a six-deck shoe. Double, split, insure, surrender.',
  wheel: 'Single-zero roulette. Numbers, splits, corners, dozens, red or black.',
  hazard: 'Name a main from five to nine, then throw two dice and chase your chance.',
  redblack: 'Higher or lower on the next card. Each right call grows the pot. Mind the aces.',
  bones: 'Three bones, a pot, and the frost. First to fifty takes the stake.',
  ...HV.BLURB,
  ...GV.BLURB
};

function purseBar(d) {
  const p = d.patron;
  if (!p || p.status !== 'seated') return '';
  const net = d.net || 0;
  const reqs = d.requests || [];
  const cash = reqs.find(r => r.kind === 'cashout');
  const more = reqs.find(r => r.kind === 'more');
  const off = r => `<form method="post" action="/inn/request/${esc(r.id)}/withdraw" class="inl">${hidden(d.csrf)}<button class="linkish" type="submit">Call it off</button></form>`;
  return `<div class="pursebar" id="purse">
    <span class="lbl">Your purse</span><b data-purse>${sep(p.purse)}</b><span class="unit">septims</span>
    <span class="pnet ${net > 0 ? 'up' : (net < 0 ? 'down' : '')}">${net ? (net > 0 ? 'Up ' : 'Down ') + sep(Math.abs(net)) + ' at the tables' : 'Even at the tables'}</span>
    <span class="sp"></span>
    <a href="/inn/me">My bets and purse</a>
    ${p.kind === 'guest' ? `<form method="post" action="/inn/leave" class="inl">${hidden(d.csrf)}<button class="linkish" type="submit">Leave the inn</button></form>` : ''}
  </div>
  <div class="pursereqs">
    ${cash ? `<p class="preq"><b>${sep(cash.amount)}</b> is set aside to cash out. The innkeeper will pay you in game, then sign you out. ${off(cash)}</p>` : (p.purse ? `<form method="post" action="/inn/cashout" class="pform">${hidden(d.csrf)}<input name="amount" inputmode="numeric" value="${p.purse}" aria-label="Septims to cash out"><button class="btn ghost small" type="submit">Request to cash out</button><span class="hint">It leaves your purse at once. Once the innkeeper pays you in game you are signed out of the tables.</span></form>` : '')}
    ${more ? `<p class="preq">You have asked for ${more.amount ? sep(more.amount) : 'more'} coin. Hand it over in game and the innkeeper will fill your purse. ${off(more)}</p>` : `<form method="post" action="/inn/more" class="pform">${hidden(d.csrf)}<input name="amount" inputmode="numeric" placeholder="How much" aria-label="Septims you want"><input name="note" maxlength="140" placeholder="Note (optional)" aria-label="Note"><button class="btn ghost small" type="submit">Ask for more coin</button></form>`}
  </div>`;
}

function doorShell(inner) {
  return `<div class="innDoor"><div class="dhead"><div class="dtitle">The Jerall View</div><div class="dsub">Gaming hall · tonight in ${esc(Wr.tonight().place)}</div></div>${inner}</div>`;
}

function door(d) {
  const p = d.patron;
  const u = d.user;
  if (p && p.status === 'seated') return `<div class="card lobbyhead innseated">
    <div class="eyebrow">The Jerall View Inn · tonight in ${esc(Wr.tonight().place)}</div>
    <h2>Welcome back, ${esc(p.name)}</h2>
    <p class="lede">${p.purse ? 'Pick a table. Every stake comes out of your purse and every win goes back into it.' : 'Your purse is empty. Ask for more coin below, hand it over in game, and the innkeeper will fill it.'}</p>
    ${purseBar(d)}
  </div>`;
  const leave = p && p.kind === 'guest' ? `<form method="post" action="/inn/leave" class="dleave">${hidden(d.csrf)}<button class="linkish" type="submit">Leave the inn</button></form>` : '';
  if (p && p.status === 'waiting') return doorShell(`<div class="dwait">
      <span class="dlbl">Waiting at the door</span>
      <p class="dname">${esc(p.name)}</p>
      <p class="dhint">${p.device === 'new' && p.purse !== undefined && p.decidedAt ? 'You have sat at these tables before. The innkeeper will confirm it is you, then your purse is waiting.' : 'The innkeeper will let you in shortly. Hand over the coin you want to play with in game and it goes in your purse.'}</p>
      ${leave}
    </div>`);
  if (p && p.status === 'turned') return doorShell(`<div class="dwait">
      <span class="dlbl">Turned away</span>
      <p class="dname">${esc(p.name)}</p>
      <p class="dhint">The tables are closed to you. Take it up with the inn’s keepers in game.</p>
      ${leave}
    </div>`);
  const out = p && p.status === 'out';
  const fixed = u ? u.name : (out ? p.name : '');
  return doorShell(`${out ? `<p class="dhint dout">You cashed out and the innkeeper paid you. ${p.purse ? 'There is still ' + sep(p.purse) + ' in your purse for next time. ' : ''}Request entry to play again.</p>` : ''}<form method="post" action="/inn/ask" class="dform">${hidden(d.csrf)}
      <label class="dlbl" for="innname">Name</label>
      ${fixed ? `<input id="innname" value="${esc(fixed)}" readonly aria-readonly="true">${!u ? `<input type="hidden" name="name" value="${esc(fixed)}">` : ''}` : '<input id="innname" name="name" maxlength="40" required autocomplete="off" placeholder="Enter your name">'}
      <label class="dlbl" for="inncode">Passcode</label>
      <input id="inncode" name="code" maxlength="40" required autocomplete="off" placeholder="The word you were given">
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="dhint">${u ? 'You are signed in to the hall, so your name is filled in for you. ' : ''}The innkeeper reads your passcode before letting you in.${u ? '' : ' No account required.'}</p>
      <button class="dbtn" type="submit">Request entry</button>
    </form>`);
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
  ${[['The tables', ['cards', 'wheel', 'hazard', 'redblack', 'bones', 'cage', 'punto', 'six']], ['Quick games', ['slots', 'mines', 'plinko']], ['The whole hall at once', ['crash', 'races', 'arena', 'keno']]].map(([title, ids]) => `<h3 class="lobbygroup">${title}</h3><div class="lobbytables five">
    ${I.GAMES.filter(g => ids.includes(g.id)).map(g => {
      const inner = `${ART[g.id]()}<h3>${esc(g.name)}</h3><p>${BLURB[g.id]}</p>${peek(g.id)}<span class="hint">From ${sep(d.house.limits[g.id].min)} a ${{ wheel: 'spin', six: 'spin', slots: 'spin', keno: 'ticket', plinko: 'drop', crash: 'flight', races: 'bet', arena: 'bet' }[g.id] || 'stake'}, no limit</span>`;
      return seated ? `<a class="tablecard" href="/inn/${g.id}">${inner}<span class="dcta">Take a seat →</span></a>` : `<a class="tablecard shut" href="/inn/${g.id}">${inner}<span class="closed">Seated patrons only</span></a>`;
    }).join('')}
  </div>`).join('')}
  <a class="backdoor" href="/inn/back"><span class="eyebrow">Through the curtain</span><b>The back room</b><span>Bones Duel, Bruma Bluff and Hold’em: patron against patron, the house only takes its cut.</span><span class="dcta">${d.backOpen ? d.backOpen + (d.backOpen === 1 ? ' table' : ' tables') + ' going →' : 'Open a table →'}</span></a>
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
  const chips = [lim.min, lim.min * 5, lim.min * 20, lim.open ? lim.min * 100 : lim.max].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
  const empty = !p.purse;
  return `<div class="stakerow">
      <label class="stake">Stake<input name="bet" inputmode="numeric" value="${last}" data-stake aria-label="Stake in septims"${empty ? ' disabled' : ''}></label>
      <span class="chips">${chips.map(v => `<button type="button" class="chipbtn" data-chip="${v}"${empty ? ' disabled' : ''}>${sep(v)}</button>`).join('')}</span>
      ${extra || ''}
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>${label}</button>
    </div>
    ${empty ? '<p class="emptypurse">Your purse is empty. <a href="/inn#purse">Ask for more coin</a> and hand it over in game.</p>' : `<p class="hint lims">${lim.open ? 'At least ' + sep(lim.min) + '; bet as much as your purse holds' : sep(lim.min) + ' to ' + sep(lim.max) + ' at this table'}</p>`}`;
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
      <div class="chips rchips" role="radiogroup" aria-label="Chip">${chips.map((v, i) => `<button type="button" class="rchip c${i}${i === 0 ? ' on' : ''}" data-chipval="${v}" role="radio" aria-checked="${i === 0}">${sep(v)}</button>`).join('')}</div>
      <span class="wtotal">On the cloth <b data-total>0</b></span>
      <button type="button" class="btn ghost small" data-undo>Undo</button>
      <button type="button" class="btn ghost small" data-clear>Clear</button>
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Spin</button>
      <noscript><div class="nojs"><select name="place">${['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'd2', 'd3', 'k1', 'k2', 'k3'].concat(Array.from({ length: 37 }, (_, i) => 's' + i)).map(k => `<option value="${k}">${esc(Wh.BETS[k].label)}</option>`).join('')}</select><input name="amount" inputmode="numeric" value="${lim.min}"></div></noscript>
    </form>
    ${empty ? '<p class="emptypurse">Your purse is empty. <a href="/inn#purse">Ask for more coin</a> and hand it over in game.</p>' : `<p class="hint lims">Each place at least ${sep(lim.min)}; bet as much as your purse holds. Click a chip, then the cloth. Edges and corners of the numbers take splits, corners, streets and lines.</p>`}
  </div>`;
}

function hazardPart(d) {
  const g = d.view;
  const live = Hz.live(g);
  const last = g.throws && g.throws.length ? g.throws[g.throws.length - 1] : [0, 0];
  const lim = d.house.limits.hazard;
  const side = `<details class="hzside"><summary>Side bet on the next throw</summary><div class="sidein"><label>Total<select name="sideTotal">${Object.keys(Hz.SIDE).map(t => `<option value="${t}">${t} · pays ${Hz.SIDE[t]} to 1</option>`).join('')}</select></label><label>Amount<input name="sideAmount" inputmode="numeric" placeholder="none"></label></div></details>`;
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

const PART = { cards: cardsPart, wheel: wheelPart, hazard: hazardPart, redblack: redblackPart, bones: bonesPart, cage: HV.cagePart, six: HV.sixPart, punto: HV.puntoPart, keno: HV.kenoPart, slots: GV.slotsPart, mines: GV.minesPart, plinko: GV.plinkoPart, crash: d => GV.eventPart('crash', d), races: d => GV.eventPart('races', d), arena: d => GV.eventPart('arena', d) };

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
    <li>Take the pot any time after your first right call. The pot stops growing at ${Hl.CAP} times your stake.</li>
  </ul>`,
  bones: `<ul class="irules">
    <li>Stake first; win and you take back <b>twice</b> it.</li>
    <li>Throw three bones; their total goes in your <b>pot</b>. Call it to bank the pot.</li>
    <li>A single pip is <b>frost</b>: the pot is lost.</li>
    <li>Three alike is <b>+${Bn.LUCK}</b>. First to ${Bn.GOAL} wins. You and Brannoc take turns to throw first.</li>
  </ul>`,
  ...HV.RULES,
  ...GV.RULES
};

function lastOut(game, l) {
  if (!l || !l.length) return V.empty('No rounds played yet.');
  if (game === 'wheel') return `<div class="lastout">${l.map(x => `<i class="pk ${x.c}">${x.n}</i>`).join('')}</div>`;
  if (game === 'cards') return `<div class="lastout">${l.map(x => `<i class="pk${x === 'bust' ? ' good' : (x === 'BJ' ? ' bad' : '')}">${esc(x)}</i>`).join('')}</div><p class="hint">What ${esc(I.KEEPER)} finished on, newest first.</p>`;
  if (game === 'hazard') return `<div class="lastout">${l.map(x => `<i class="pk ${x.r === 'win' ? 'good' : 'bad'}" title="Main ${x.main}: ${x.t.join(', ')}">${x.t.join('·')}</i>`).join('')}</div><p class="hint">The throws of each round, newest first. Green won.</p>`;
  if (game === 'redblack') return `<div class="lastout">${l.map(x => `<span class="lorow ${x.r === 'cash' ? 'good' : 'bad'}">${x.cards.map(c => esc(c.replace(/[shdc]$/, ''))).join(' ')}</span>`).join('')}</div>`;
  if (['cage', 'six', 'punto', 'keno'].includes(game)) return HV.lastOut(game, l);
  if (GV.RULES[game]) return GV.lastOut(game, l);
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
${tutorial(game, d.csrf, d.tutorial && d.patron && d.patron.status === 'seated')}<script src="/inn.js?v=${V.stamp('inn.js')}" defer></script>${GV.RULES[game] ? `<script src="/innplay.js?v=${V.stamp('innplay.js')}" defer></script>` : ''}`;
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
  <div class="card"><h3>Your purse in and out</h3>${r.purse.length ? `<ul class="plog">${r.purse.map(x => `<li><span>${esc(V.when(x.at))}</span><span>${{ add: 'Added', take: 'Taken out', set: 'Set to', hold: 'Set aside to cash out', paid: 'Paid out in game', back: 'Back in the purse' }[x.kind] || x.kind} <b>${sep(x.amount)}</b>${x.kind === 'hold' ? '' : ' by ' + esc(x.byName)}${x.note && x.kind !== 'hold' ? ' · ' + esc(x.note) : ''}</span><span class="num">${sep(x.after)}</span></li>`).join('')}</ul>` : V.empty('Nothing yet. A keeper of the inn fills your purse when you hand over coin in game.')}</div>
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
  const code = p => { const c = I.codeOf(p); return c ? ` <span class="passcode">passcode <b>${esc(c)}</b></span>` : ''; };
  const twin = p => { if (p.kind !== 'guest') return null; return I.officerFor(p.name); };
  const who = p => { const t = twin(p); return `<b>${esc(p.name)}</b>${p.kind === 'login' ? ' <span class="tag">officer</span>' : ''}${t ? ` <span class="tag warn">looks like ${esc(t.name)}</span>` : ''}${p.who ? `<span class="hint"> · ${esc(p.who)}</span>` : ''}`; };
  const merge = p => { const t = twin(p); return t ? act(p, 'merge', 'Merge into ' + t.name + (p.purse ? ' (moves ' + sep(p.purse) + ')' : ''), 'go') : ''; };
  return `<section class="stack">
  <div class="card">
    <div class="eyebrow">The Coffers</div>
    <h2 style="margin:4px 0 6px">The Inn Ledger</h2>
    <p class="btnrow" style="margin:6px 0 10px"><a class="btn go small" href="/inn/ledger/live">Watch the tables live</a></p><p class="hint">${L.seated.length} seated · ${L.waiting.length + L.returning.length} at the door · ${L.requests.length} purse ${L.requests.length === 1 ? 'request' : 'requests'} · purses hold ${sep(L.held)}${L.setAside ? ', and ' + sep(L.setAside) + ' is set aside to cash out' : ''}. <a href="/inn/fairness">How the tables ran</a></p>
  </div>
  ${L.requests.length ? `<div class="card reqcard"><h3>Purse requests</h3><ul class="plist">${L.requests.map(r => { const n = L.nets[r.patron] || 0; const tables = `<span class="pnet ${n > 0 ? 'up' : (n < 0 ? 'down' : '')}">${n ? (n > 0 ? 'won ' : 'lost ') + sep(Math.abs(n)) + ' at the tables' : 'even at the tables'}</span>`; return r.kind === 'cashout'
    ? `<li><div><b>${esc(r.name)}</b>${r.username ? ' <span class="tag">officer</span>' : ''} wants to <b>cash out ${sep(r.amount)}</b> and go home · ${tables}<span class="hint"> · ${esc(V.when(r.at))}</span></div><div class="acts"><form method="post" action="/inn/ledger/request/${esc(r.id)}/paid" class="inl">${hidden(d.csrf)}<button class="btn go small" type="submit">Paid in game: sign them out</button></form><form method="post" action="/inn/ledger/request/${esc(r.id)}/back" class="inl">${hidden(d.csrf)}<button class="btn ghost small" type="submit">Put it back in the purse</button></form></div></li>`
    : `<li><div><b>${esc(r.name)}</b>${r.username ? ' <span class="tag">officer</span>' : ''} asks for <b>${r.amount ? sep(r.amount) : 'more'}</b> coin${r.note ? ': “' + esc(r.note) + '”' : ''} · ${tables}<span class="hint"> · ${esc(V.when(r.at))}</span></div><div class="acts"><form method="post" action="/inn/ledger/request/${esc(r.id)}/add" class="pform">${hidden(d.csrf)}<input name="amount" inputmode="numeric" value="${r.amount || ''}" required placeholder="Septims" aria-label="Septims to add"><button class="btn go small" type="submit">Handed over: add it</button></form><form method="post" action="/inn/ledger/request/${esc(r.id)}/decline" class="inl">${hidden(d.csrf)}<button class="btn ghost small" type="submit">Decline</button></form></div></li>`; }).join('')}</ul><p class="hint">A cash-out leaves the patron’s purse the moment they ask, so it cannot be played away while it waits. Pay them in game, then mark it paid.</p></div>` : ''}
  <div class="card"><h3>At the door</h3>
    ${L.waiting.length + L.returning.length > 1 ? `<form method="post" action="/inn/ledger/all/accept" class="inl" style="margin-bottom:10px">${hidden(d.csrf)}<button class="btn go small" type="submit">Let them all in (${L.waiting.length + L.returning.length})</button></form>` : ''}
    ${L.waiting.length || L.returning.length ? `<ul class="plist">${L.waiting.map(p => `<li><div>${who(p)}${code(p)}<span class="hint"> · asked ${esc(V.when(p.at))}</span></div><div class="acts">${merge(p)}${act(p, 'accept', 'Let them in', 'go')}${act(p, 'turn', 'Turn away')}</div></li>`).join('')}${L.returning.map(p => `<li><div>${who(p)}${code(p)} <span class="tag on">back from another browser</span><span class="hint"> · seated, purse ${sep(p.purse)}</span></div><div class="acts">${act(p, 'device', 'It’s them', 'go')}${act(p, 'nodevice', 'Not them')}</div></li>`).join('')}</ul>` : V.empty('Nobody is waiting.')}
    <p class="hint">Everyone at the door gives a name and the passcode they were told in game. Read the passcode before you let them in. Each new browser waits here too, so nobody can sit down under someone else’s name and play their purse.</p>
  </div>
  <div class="card"><h3>Seated patrons</h3>
    ${L.seated.length ? `<ul class="plist">${L.seated.map(p => { const n = L.nets[p.id] || 0; return `<li><div>${who(p)}<span class="purseamt">${sep(p.purse)}</span>${p.held ? `<span class="hint"> · ${sep(p.held)} set aside to cash out</span>` : ''}<span class="pnet ${n > 0 ? 'up' : (n < 0 ? 'down' : '')}"> · ${n ? (n > 0 ? 'won ' : 'lost ') + sep(Math.abs(n)) + ' at the tables' : 'even at the tables'}</span></div>${pform(p)}<div class="acts">${merge(p)}${act(p, 'turn', 'Unseat')}</div></li>`; }).join('')}</ul>` : V.empty('Nobody is seated yet.')}
  </div>
  ${L.gone.length ? `<div class="card"><h3>Cashed out and gone home</h3><ul class="plist">${L.gone.map(p => { const n = L.nets[p.id] || 0; return `<li><div>${who(p)}${p.purse ? `<span class="purseamt">${sep(p.purse)}</span>` : ''}<span class="pnet ${n > 0 ? 'up' : (n < 0 ? 'down' : '')}"> · ${n ? (n > 0 ? 'won ' : 'lost ') + sep(Math.abs(n)) + ' at the tables' : 'even at the tables'}</span><span class="hint"> · ${esc(V.when(p.outAt))}</span></div>${p.purse ? pform(p) : ''}<div class="acts">${merge(p)}${act(p, 'forget', p.purse ? 'Forget them, writing off ' + sep(p.purse) : 'Forget them')}</div></li>`; }).join('')}</ul><p class="hint">Marking a cash-out paid signs the patron out of every table. They request entry again, with a passcode, to play another night.</p></div>` : ''}
  ${L.turned.length ? `<div class="card"><h3>Turned away</h3><ul class="plist">${L.turned.map(p => `<li><div>${who(p)}${p.purse ? `<span class="purseamt">${sep(p.purse)}</span>` : ''}</div>${p.purse ? pform(p) : ''}<div class="acts">${merge(p)}${act(p, 'accept', 'Seat them')}${act(p, 'forget', p.purse || p.held ? 'Forget them, writing off ' + sep((p.purse || 0) + (p.held || 0)) : 'Forget them')}</div></li>`).join('')}</ul><p class="hint">Forgetting a patron frees the name to ask again. Anything left in their purse is written off in the purse book.</p></div>` : ''}
  <div class="card wherecard"><h3>Where the tables are tonight</h3>
    <p class="wherenow"><b>${esc(Wr.cap(d.where.place))}</b>${d.where.setBy ? `<span class="hint"> · moved here by ${esc(d.where.setBy)}</span>` : ''}</p>
    <p class="hint">The inn moves every night so the Watch never knows where to look. Patrons see tonight’s place at the door. Tomorrow night: <b>${esc(d.next.place)}</b>.</p>
    <form method="post" action="/inn/ledger/where" class="pform">${hidden(d.csrf)}
      <input name="place" list="innplaces" maxlength="80" placeholder="Move it tonight to…" aria-label="Where tonight">
      <datalist id="innplaces">${Wr.PLACES.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <button class="btn go small" type="submit">Move it tonight</button>
      ${d.where.setBy ? `<button class="btn ghost small" type="submit" name="place" value="">Let the night choose</button>` : ''}
    </form>
  </div>
  <div class="card"><h3>House limits</h3>
    <form method="post" action="/inn/ledger/house" class="stack">${hidden(d.csrf)}
      <div class="limgrid"><span></span><span class="lbl">Smallest</span><span class="lbl">Largest</span>${I.ALL.map(g => `<span>${esc(g.name)}${g.id === 'poker' ? ' <span class="hint">buy-in</span>' : (g.id === 'long' ? ' <span class="hint">a bet</span>' : (g.pvp ? ' <span class="hint">stake each</span>' : ''))}</span><input name="min_${g.id}" inputmode="numeric" value="${h.limits[g.id].min}" aria-label="${esc(g.name)} smallest">${h.limits[g.id].open ? '<span class="hint nolimit">No limit: their purse</span>' : `<input name="max_${g.id}" inputmode="numeric" value="${h.limits[g.id].max}" aria-label="${esc(g.name)} largest">`}`).join('')}</div>
      <p class="hint">Against the house there is no largest stake: a patron may bet whatever their purse holds, and their purse is what you set. Between patrons the limits above still stand.</p>
      <label>The most the lottery pays on one ticket<input name="kenoCap" inputmode="numeric" value="${h.kenoCap}"></label>
      <label>Daily loss cap per patron <span class="hint">0 for none</span><input name="dailyCap" inputmode="numeric" value="${h.dailyCap}"></label>
      <label>The house cut in the back room <span class="hint">in the hundred, from each pot between patrons</span><input name="rake" inputmode="decimal" value="${h.rake}"></label>
      <label>Minutes between lottery draws <span class="hint">the Jarl’s Lottery draws for the whole hall this often</span><input name="kenoEvery" inputmode="numeric" value="${h.kenoEvery}"></label>
      <label>Minutes between races at the Chorrol Downs <span class="hint">2 to 120</span><input name="raceEvery" inputmode="numeric" value="${h.raceEvery}"></label>
      <label>Minutes between the house’s bouts in the Arena <span class="hint">2 to 120</span><input name="boutEvery" inputmode="numeric" value="${h.boutEvery}"></label>
      <label>Seconds for each turn in the back room <span class="hint">then the table moves on without them</span><input name="turn" inputmode="numeric" value="${h.turn}"></label>
      <label class="check"><input type="checkbox" name="hitSoft17" value="1"${h.hitSoft17 ? ' checked' : ''}> Brannoc hits soft 17 <span class="hint">a little harder on patrons</span></label>
      <label class="check"><input type="checkbox" name="anyTen" value="1"${h.anyTen ? ' checked' : ''}> Any two ten-cards may be split <span class="hint">otherwise only the same rank</span></label>
      <button class="btn go" type="submit">Set the house rules</button>
      ${h.updatedBy ? `<p class="hint">Last set by ${esc(h.updatedBy)}, ${esc(V.when(h.updatedAt))}.</p>` : ''}
    </form>
    <form method="post" action="/inn/ledger/keno/draw" class="inl" style="margin-top:12px">${hidden(d.csrf)}<button class="btn ghost small" type="submit">Draw the lottery now</button> <span class="hint">Draws at once and starts the clock again.</span></form>
  </div>
  ${GV.postedCard(d)}
  ${L.luck.length ? `<div class="card"><h3>Luck of the Nine</h3><p class="hint">Five hands running won from ${esc(I.KEEPER)}. Officers can be given the honour on <a href="/honours">the Roll of Honour</a>.</p><ul class="plog">${L.luck.map(x => `<li><span>${esc(V.when(x.at))}</span><span><b>${esc(x.name)}</b>${x.username ? ' <span class="tag">officer</span>' : ''}</span></li>`).join('')}</ul></div>` : ''}
  <div class="card"><h3>Purse book</h3>${L.log.length ? `<ul class="plog">${L.log.map(x => `<li><span>${esc(V.when(x.at))}</span><span><b>${esc(x.name)}</b>: ${{ add: 'added', take: 'took out', set: 'set to', hold: 'set aside to cash out', paid: 'paid out in game', back: 'put back' }[x.kind] || x.kind} ${sep(x.amount)} (${sep(x.before)} → ${sep(x.after)}) by ${esc(x.byName)}${x.own ? ' <span class="tag warn">own purse</span>' : ''}${x.note ? ' · ' + esc(x.note) : ''}</span></li>`).join('')}</ul>` : V.empty('No purse has been touched yet.')}</div>
</section>`;
}

function watchPart(game, d) {
  if (['cage', 'six', 'punto', 'keno'].includes(game)) return HV.watch(game, d);
  if (GV.RULES[game]) return GV.watch(game, d);
  if (game === 'wheel') {
    const last = d.view && d.view.last;
    return `<div class="felt watchwheel">${wheelSvg(last ? last.n : null, 'mini')}${last ? `<div class="wresult"><div class="wnum ${last.colour}">${last.n}</div><ul class="wlines">${last.lines.map(l => `<li class="${l.won ? 'won' : ''}"><span>${esc(l.label)}</span><span>${sep(l.amount)}${l.won ? ' → ' + sep(l.ret) : ''}</span></li>`).join('')}</ul></div>` : '<p class="say">No spin yet.</p>'}</div>`;
  }
  return part(game, d).replace(/<form[\s\S]*?<\/form>/g, '').replace(/<p class="emptypurse">[\s\S]*?<\/p>/g, '').replace(/<p class="hint lims">[\s\S]*?<\/p>/g, '');
}

function liveCard(r) {
  return `<section class="livecard" data-live="${esc(r.id)}" data-game="${esc(r.game)}" data-at="${Date.parse(r.at) || 0}">
    <div class="livehead"><b>${esc(r.name)}</b><span class="tag">${esc(I.GAME[r.game].short)}</span><span class="sp"></span><span class="hint">purse ${sep(r.purse)}${r.held ? ' · ' + sep(r.held) + ' set aside' : ''} · <span class="pnet ${r.net > 0 ? 'up' : (r.net < 0 ? 'down' : '')}">${r.net ? (r.net > 0 ? 'up ' : 'down ') + sep(Math.abs(r.net)) : 'even'}</span></span></div>
    <div class="inn livefelt">${r.html}</div>
    <p class="hint liveago" data-ago>Last move just now</p>
  </section>`;
}
function liveTables(rows) {
  if (!rows.length) return V.empty('Nobody has played in the last fifteen minutes.');
  return rows.map(liveCard).join('');
}

function liveFeed(list) {
  if (!list.length) return V.empty('No rounds yet.');
  return `<ul class="plog livefeed">${list.map(x => `<li data-id="${esc(x.id || x.at)}"><span>${esc(V.when(x.at))}</span><span><b>${esc(x.name)}</b> at ${esc((I.GAME[x.game] || { short: x.game }).short)}: staked ${sep(x.staked)}, back ${sep(x.returned)}</span><span class="num ${x.net > 0 ? 'up' : (x.net < 0 ? 'down' : '')}">${x.net > 0 ? '+' : ''}${sep(x.net)}</span></li>`).join('')}</ul>`;
}

function liveSummary(s) {
  return `<div class="livestats">
    <div><span class="lbl">At the tables</span><b>${s.players}</b></div>
    <div><span class="lbl">Rounds, last 15 min</span><b>${sep(s.rounds)}</b></div>
    <div><span class="lbl">Staked</span><b>${sep(s.staked)}</b></div>
    <div><span class="lbl">${s.house >= 0 ? 'House up' : 'House down'}</span><b class="${s.house >= 0 ? 'up' : 'down'}">${sep(Math.abs(s.house))}</b></div>
    <div><span class="lbl">Back-room tables</span><b>${s.rooms}</b></div>
  </div>`;
}

function livePage(d) {
  const games = I.GAMES;
  return `<section class="stack">
  <div class="card">
    <div class="eyebrow"><a href="/inn/ledger">The Inn Ledger</a></div>
    <h2 style="margin:4px 0 6px">The tables, live</h2>
    <p class="hint">Everyone who has played in the last fifteen minutes, at the table they are on, as they see it. Cards stay in place and change only when something happens at that table. <span data-livestate class="livestate on">Live</span></p>
    <div data-livesummary>${liveSummary(d.summary)}</div>
    <div class="livefilter" role="group" aria-label="Show tables"><button type="button" class="on" data-lf="">Every table</button>${games.map(g => `<button type="button" data-lf="${g.id}">${esc(g.short)}</button>`).join('')}</div>
  </div>
  <div class="livegrid" data-livetables>${liveTables(d.rows)}</div>
  <div class="card"><h3>The back room</h3><p class="hint">Patron against patron, with every hand and cup shown to you. <a href="/inn/back">The back room’s door</a></p><div class="livegrid" data-liveback>${d.back || V.empty('No tables are open in the back room.')}</div></div>
  <div class="card"><h3>Rounds as they finish</h3><div data-livefeed>${liveFeed(d.feed)}</div></div>
</section>
<script src="/innlive.js?v=${V.stamp('innlive.js')}" defer></script>`;
}

function fairnessPage(d) {
  const w = d.week;
  d = Object.assign({ csrf: '' }, d);
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
    ${I.ALL.map(g => { const r = w.byGame[g.id]; return `<tr><td>${esc(g.name)}</td><td class="num">${sep(r.rounds)}</td><td class="num">${sep(r.staked)}</td><td class="num">${sep(r.returned)}</td><td class="num">${r.staked ? (r.edge * 100).toFixed(1) + '%' : '–'}</td><td class="hint">${esc(g.theory)}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <details class="card resetcard"><summary>Reset the inn’s records</summary>
    <form method="post" action="/inn/ledger/reset" class="stack" style="max-width:560px;margin-top:12px">${hidden(d.csrf)}
      <label class="check"><input type="radio" name="scope" value="rounds" checked> <span><b>The rounds only</b>: this page, the last 20 at each table, the week’s boards and Herald line, Luck of the Nine, and everyone’s won and lost. Patrons keep their seats and purses.</span></label>
      <label class="check"><input type="radio" name="scope" value="everything"> <span><b>Everything</b>: the rounds, every patron, every purse, every request and the purse book. The inn starts empty.</span></label>
      <label>Type RESET to confirm<input name="confirm" autocomplete="off" required></label>
      <button class="btn bad" type="submit">Reset</button>
      <p class="hint">Nothing is thrown away: the old files are kept beside the new ones in the data folder, named “before reset” with the date.</p>
    </form>
  </details>
</section>`;
}

module.exports = { HV, GV, liveCard, liveSummary, lobby, tablePage, part, watchPart, liveTables, liveFeed, livePage, cardsPart, bonesPart, mePage, ledgerPage, fairnessPage, lastOut, wheelSvg };
