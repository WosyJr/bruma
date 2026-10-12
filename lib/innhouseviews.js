const V = require('./views');
const TV = require('./townviews');
const I = require('./inn');
const Cg = require('./inncage');
const Sx = require('./innsix');
const Pu = require('./innpunto');
const Kn = require('./innkeno');

const esc = V.esc;
const hidden = V.hidden;
const sep = n => I.septims(n);
const card = TV.card;
const bone = TV.bone;

function chipRow(d, game, form) {
  const lim = d.house.limits[game];
  const empty = !d.patron.purse;
  const chips = [lim.min, lim.min * 5, lim.min * 20, lim.min * 100].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
  return `<input type="hidden" name="bets" value="${esc(JSON.stringify(form.bets || {}))}" data-bets>
      <div class="chips rchips" role="radiogroup" aria-label="Chip">${chips.map((v, i) => `<button type="button" class="rchip c${i}${i === 0 ? ' on' : ''}" data-chipval="${v}" role="radio" aria-checked="${i === 0}">${sep(v)}</button>`).join('')}</div>
      <span class="wtotal">On the cloth <b data-total>0</b></span>
      <button type="button" class="btn ghost small" data-undo>Undo</button>
      <button type="button" class="btn ghost small" data-clear>Clear</button>
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>${form.label}</button>`;
}
function limLine(d, game, extra) {
  const lim = d.house.limits[game];
  return !d.patron.purse ? '<p class="emptypurse">Your purse is empty. <a href="/inn#purse">Ask for more coin</a> and hand it over in game.</p>' : `<p class="hint lims">Each place at least ${sep(lim.min)}; bet as much as your purse holds. ${extra || 'Click a chip, then the cloth. Right-click a place to clear it.'}</p>`;
}
const lines = l => `<ul class="wlines">${l.map(x => `<li class="${x.won ? 'won' : ''}"><span>${esc(x.label)}</span><span>${sep(x.amount)}${x.ret ? ' → ' + sep(x.ret) : ''}</span></li>`).join('')}</ul>`;
const tone = r => r.returned > r.staked ? 'good' : (r.returned < r.staked ? 'bad' : '');

function cagePart(d) {
  const g = d.view || {};
  const last = g.last;
  const spot = (k, inner, cls) => `<button type="button" class="cspot ${cls || ''}" data-place="${k}" aria-label="${esc(Cg.BETS[k].label)}">${inner}</button>`;
  return `<div class="felt cagefelt">
    <div class="cagetop">
      <div class="cage${last ? '' : ' idle'}" data-cage><div class="bones" data-dice>${(last ? last.dice : [0, 0, 0]).map(bone).join('')}</div><span class="cagebars" aria-hidden="true"></span></div>
      <div class="wresult">${last ? `<p class="say ${tone(last)}" data-say>${last.dice.join(' · ')}: ${last.triple ? 'three alike! ' : 'a total of ' + last.sum + '. '}${last.returned ? 'Back to you: ' + sep(last.returned) + '.' : 'The cage keeps it all.'}</p>${lines(last.lines)}` : '<p class="say" data-say>Put your chips on the numbers and turn the cage.</p>'}</div>
    </div>
    <div class="cagecloth" data-cloth>
      <div class="cnums">${[1, 2, 3, 4, 5, 6].map(n => spot('n' + n, bone(n) + '<span class="pays">1, 2 or 3 to 1</span>', 'num')).join('')}</div>
      <div class="cside">${spot('low', '<b>Low</b><span class="pays">10 or less · 1 to 1</span>')}${spot('triple', '<b>Any three alike</b><span class="pays">30 to 1</span>', 'trip')}${spot('high', '<b>High</b><span class="pays">11 or more · 1 to 1</span>')}</div>
    </div>
    <form method="post" action="/inn/cage/throw" data-inn class="wheelctl">${hidden(d.csrf)}${chipRow(d, 'cage', { bets: (g.bets || {}), label: 'Turn the cage' })}</form>
    ${limLine(d, 'cage')}
  </div>`;
}

function sixSvg(slot, cls) {
  const N = Sx.ORDER.length;
  const a = 360 / N;
  const R0 = 104, R1 = 62;
  const pt = (r, deg) => { const t = (deg - 90) * Math.PI / 180; return [(110 + r * Math.cos(t)).toFixed(2), (110 + r * Math.sin(t)).toFixed(2)]; };
  const lab = { one: '1', two: '2', five: '5', ten: '10', twenty: '20', dragon: '✦', septim: '◉' };
  const seg = i => {
    const s = i * a - a / 2, e = i * a + a / 2;
    const [x1, y1] = pt(R0, s), [x2, y2] = pt(R0, e), [x3, y3] = pt(R1, e), [x4, y4] = pt(R1, s);
    const sym = Sx.ORDER[i];
    const [tx, ty] = pt(R0 - 12, i * a);
    return `<path d="M${x1} ${y1}A${R0} ${R0} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R1} ${R1} 0 0 0 ${x4} ${y4}Z" class="sx-${sym}"/><text x="${tx}" y="${ty}" transform="rotate(${(i * a).toFixed(2)} ${tx} ${ty})">${lab[sym]}</text>`;
  };
  const idx = slot === null || slot === undefined ? 0 : slot;
  return `<svg class="wheel sixwheel ${cls || ''}" viewBox="0 0 220 220" role="img" aria-label="${slot === null || slot === undefined ? 'The Dragon Wheel at rest' : 'The wheel stops on ' + Sx.SYM[Sx.ORDER[slot]].label}">
    <circle cx="110" cy="110" r="108" class="rim"/>
    <g class="spinner" data-spinner data-slots="${N}" style="transform:rotate(${(-idx * a).toFixed(3)}deg)">${Sx.ORDER.map((_, i) => seg(i)).join('')}<circle cx="110" cy="110" r="${R1}" class="bowl"/><circle cx="110" cy="110" r="22" class="hub"/>${Array.from({ length: N }, (_, i) => { const [x, y] = pt(R0 + 2, i * a - a / 2); return `<circle cx="${x}" cy="${y}" r="1.6" class="peg"/>`; }).join('')}</g>
    <path d="M104 0h12l-6 14z" class="pointer"/>
  </svg>`;
}

function sixPart(d) {
  const g = d.view || {};
  const last = g.last;
  const name = s => Sx.SYM[s].id === 'dragon' ? 'the Dragon' : (s === 'septim' ? 'the Septim' : 'a ' + Sx.SYM[s].label);
  return `<div class="felt wheelfelt sixfelt">
    <div class="wheeltop">
      ${sixSvg(last ? last.slot : null)}
      <div class="wresult">${last ? `<div class="wnum sx-${last.sym}">${esc(Sx.SYM[last.sym].label)}</div><p class="say ${tone(last)}" data-say>It stops on ${name(last.sym)}. ${last.returned ? 'Back to you: ' + sep(last.returned) + '.' : 'The house takes the cloth.'}</p>${lines(last.lines)}` : '<p class="say" data-say>Place your chips on a symbol and spin the wheel.</p>'}</div>
    </div>
    <div class="sixcloth" data-cloth>${Sx.SYMS.map(s => `<button type="button" class="sxspot sx-${s.id}" data-place="${s.id}" aria-label="${esc(s.label)}, pays ${s.pays} to 1"><b>${esc(s.label)}</b><span class="pays">${s.pays} to 1 · ${s.count} of 54</span></button>`).join('')}</div>
    <form method="post" action="/inn/six/spin" data-inn class="wheelctl">${hidden(d.csrf)}${chipRow(d, 'six', { bets: g.bets || {}, label: 'Spin' })}</form>
    ${limLine(d, 'six')}
  </div>`;
}

function puntoPart(d, o) {
  const g = Object.assign({}, d.view || {}, o || {});
  const last = g.last;
  const P = o ? o.P : (last ? last.P : []), B = o ? o.B : (last ? last.B : []);
  const slots = (cards) => (cards.length ? cards.map(card).join('') : '<span class="pcard ghost"></span><span class="pcard ghost"></span>');
  const res = !o && last;
  const win = res ? last.win : '';
  return `<div class="felt puntofelt">
    <div class="punto">
      <div class="phand${win === 'player' ? ' won' : ''}"><div class="hlabel"><span>Player</span><b>${P.length ? Pu.score(P) : ''}</b></div><div class="cards">${slots(P)}</div></div>
      <div class="phand${win === 'banker' ? ' won' : ''}"><div class="hlabel"><span>Banker</span><b>${B.length ? Pu.score(B) : ''}</b></div><div class="cards">${slots(B)}</div></div>
    </div>
    <p class="say ${res ? tone(last) : ''}" data-say>${o ? esc(o.say || '') : (res ? (win === 'tie' ? 'A tie, ' + last.ps + ' all.' : (win === 'player' ? 'The Player wins, ' : 'The Banker wins, ') + Math.max(last.ps, last.bs) + ' to ' + Math.min(last.ps, last.bs) + (last.natural ? ', a natural.' : '.')) + ' ' + (last.returned ? 'Back to you: ' + sep(last.returned) + '.' : 'The house takes the cloth.') : 'Bet on the Player, the Banker, or a Tie.')}</p>
    ${res ? lines(last.lines) : ''}
    ${o && o.frame ? '' : `<div class="puntocloth" data-cloth>
      <button type="button" class="pspot player" data-place="player"><b>Player</b><span class="pays">1 to 1</span></button>
      <button type="button" class="pspot tie" data-place="tie"><b>Tie</b><span class="pays">8 to 1</span></button>
      <button type="button" class="pspot banker" data-place="banker"><b>Banker</b><span class="pays">1 to 1, less 5%</span></button>
    </div>
    <form method="post" action="/inn/punto/deal" data-inn class="wheelctl">${hidden(d.csrf)}${chipRow(d, 'punto', { bets: (g.bets || {}), label: 'Deal' })}</form>
    ${limLine(d, 'punto')}`}
  </div>`;
}

function ball(n, cls) { return `<span class="kball${cls ? ' ' + cls : ''}" data-n="${n}">${n}</span>`; }

function kenoPart(d) {
  const g = d.view || {};
  const lim = d.house.limits.keno;
  const empty = !d.patron.purse;
  const mine = g.mine || {};
  const picked = new Set(mine.picks || []);
  const last = g.last;
  const lastSet = new Set(last ? last.balls : []);
  const tk = t => `<li class="ktick"><span class="kpicks">${t.picks.map(n => ball(n, t.hits && t.hits.includes(n) ? 'hit' : '')).join('')}</span><span>${sep(t.bet)}${t.state === 'settled' ? ` · draw ${t.draw}: <b>${t.hits.length} of ${t.picks.length}</b>${t.ret ? ' → ' + sep(t.ret) : ''}` : ` on draw ${t.draw}`}</span>${t.state === 'open' ? `<form method="post" action="/inn/keno/cancel" data-inn class="inl">${hidden(d.csrf)}<input type="hidden" name="ticket" value="${esc(t.id)}"><button class="linkish" type="submit">Tear it up</button></form>` : ''}</li>`;
  return `<div class="felt kenofelt" data-keno data-pay="${esc(JSON.stringify(Kn.PAY))}" data-next="${g.nextAt || 0}" data-now="${Date.now()}" data-no="${g.no}" data-last="${last ? last.no : 0}">
    <div class="kenotop">
      <div class="kclock"><span class="lbl">Draw ${g.no} in</span><b data-kclock>–</b><span class="hint">One draw every ${g.every} ${g.every === 1 ? 'minute' : 'minutes'} for the whole hall</span></div>
      <div class="kdrawn"><span class="lbl">${last ? 'Draw ' + last.no + ' · the twenty balls' : 'No draw yet'}</span><div class="kballs" data-kballs>${last ? last.balls.map(n => ball(n, picked.has(n) ? 'hit' : '')).join('') : ''}</div></div>
    </div>
    <p class="say" data-say aria-live="polite"></p>
    <form method="post" action="/inn/keno/buy" data-inn class="kform">${hidden(d.csrf)}
      <input type="hidden" name="picks" value="${esc((mine.picks || []).join(','))}" data-kpicks>
      <div class="kgrid" role="group" aria-label="Pick up to ten numbers">${Array.from({ length: 80 }, (_, i) => i + 1).map(n => `<button type="button" class="kn${picked.has(n) ? ' on' : ''}${lastSet.has(n) ? ' drawn' : ''}" data-kn="${n}" aria-pressed="${picked.has(n)}">${n}</button>`).join('')}</div>
      <div class="kctl">
        <span class="hint"><b data-kcount>${picked.size}</b> of 10 picked</span>
        <button type="button" class="btn ghost small" data-kquick>Quick pick</button>
        <button type="button" class="btn ghost small" data-kclear>Clear</button>
        <label class="stake">Stake<input name="bet" inputmode="numeric" value="${Math.max(mine.bet || lim.min, lim.min)}" data-stake aria-label="Stake in septims"${empty ? ' disabled' : ''}></label>
        <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Buy a ticket for draw ${g.no}</button>
      </div>
    </form>
    <div class="kpay" data-kpay>${kenoPay(picked.size)}</div>
    ${g.open && g.open.length ? `<div class="ktickets"><span class="lbl">Your tickets for the next draw</span><ul>${g.open.map(tk).join('')}</ul></div>` : ''}
    ${g.done && g.done.length ? `<div class="ktickets"><span class="lbl">Your last tickets</span><ul>${g.done.map(tk).join('')}</ul></div>` : ''}
    ${empty ? '<p class="emptypurse">Your purse is empty. <a href="/inn#purse">Ask for more coin</a> and hand it over in game.</p>' : `<p class="hint lims">A ticket costs at least ${sep(lim.min)}, as much as your purse holds. The lottery pays at most ${sep(d.house.kenoCap)} on one ticket.</p>`}
  </div>`;
}

function kenoPay(n) {
  if (!n) return '<span class="hint">Pick numbers to see what they pay.</span>';
  const t = Kn.PAY[n] || {};
  return `<span class="lbl">${n} ${n === 1 ? 'number' : 'numbers'}: what a septim brings back</span><span class="kpaylist">${Object.keys(t).map(Number).sort((a, b) => b - a).map(k => `<span><b>${k}</b> hit${k === 1 ? '' : 's'} → ×${t[k]}</span>`).join('')}</span>`;
}

const RULES = {
  cage: `<ul class="irules">
    <li>Three dice tumble in the iron cage. Bet on as many places as you like.</li>
    <li>A <b>number</b> pays 1 to 1 if one die shows it, 2 to 1 for two, <b>3 to 1</b> for three.</li>
    <li><b>High</b> (11 or more) and <b>Low</b> (10 or less) pay even money, and lose on any three alike.</li>
    <li><b>Any three alike</b> pays 30 to 1.</li>
  </ul>`,
  keno: `<ul class="irules">
    <li>Pick <b>one to ten</b> numbers from 80 and buy a ticket.</li>
    <li>Every few minutes the Jarl’s men draw <b>twenty balls</b> for the whole hall at once.</li>
    <li>The more of your numbers come up, the more it pays; the table under the grid shows it for your count.</li>
    <li>Ten of ten pays 10,000 times the stake, up to the house’s cap. Wins land in your purse the moment the balls drop.</li>
    <li>Tear up a ticket before its draw for your stake back.</li>
  </ul>`,
  punto: `<ul class="irules">
    <li>Two hands are dealt, the <b>Player</b> and the <b>Banker</b>. Bet on which comes closest to <b>nine</b>, or on a <b>Tie</b>.</li>
    <li>Tens and faces count nothing, aces one; only the last digit of the total counts.</li>
    <li>The cards are drawn by the fixed rules of the game. Nobody decides anything after the deal.</li>
    <li>Player pays 1 to 1. Banker pays 1 to 1, less 5%. A Tie pays 8 to 1, and Player and Banker bets are handed back.</li>
    <li>Eight decks, shuffled when four fifths are played.</li>
  </ul>`,
  six: `<ul class="irules">
    <li>The wheel has <b>54 slots</b>. Bet on the symbol it stops on.</li>
    <li>1 pays 1 to 1 (24 slots), 2 pays 2 (15), 5 pays 5 (7), 10 pays 10 (4), 20 pays 20 (2).</li>
    <li>The <b>Dragon</b> and the <b>Septim</b> pay 40 to 1, one slot each.</li>
  </ul>`
};

const ART = {
  cage: () => `<div class="bones">${[4, 4, 2].map(bone).join('')}</div>`,
  keno: () => `<div class="kballs mini">${[7, 23, 41, 62, 80].map(n => ball(n)).join('')}</div>`,
  punto: () => `<div class="cards">${['9h', 'Kd'].map(card).join('')}</div>`,
  six: () => `<div class="minwheel">${sixSvg(null, 'mini')}</div>`
};
const BLURB = {
  cage: 'Three dice in an iron cage. Bet on a number, high or low, or three alike.',
  keno: 'Pick up to ten numbers. Twenty balls drop for the whole hall every few minutes.',
  punto: 'Player or Banker, closest to nine. The cards draw themselves.',
  six: 'A tall wheel of fifty-four slots. The Dragon and the Septim pay forty.'
};

function lastOut(game, l) {
  if (game === 'cage') return `<div class="lastout">${l.map(x => `<i class="pk${x.d[0] === x.d[1] && x.d[1] === x.d[2] ? ' good' : ''}">${x.d.join('')}</i>`).join('')}</div><p class="hint">The three dice of each turn, newest first.</p>`;
  if (game === 'six') return `<div class="lastout">${l.map(x => `<i class="pk sx-${x.s}">${esc(Sx.SYM[x.s].label)}</i>`).join('')}</div>`;
  if (game === 'punto') return `<div class="lastout bead">${l.map(x => `<i class="pk bd-${x.w}" title="${x.p} to ${x.b}">${x.w}</i>`).join('')}</div><p class="hint">P for the Player, B for the Banker, T for a tie, newest first.</p>`;
  if (game === 'keno') return `<div class="lastout kno">${l.slice(0, 6).map(x => `<div class="kprev"><span>Draw ${x.no}</span><span class="kballs mini">${x.balls.map(n => ball(n)).join('')}</span></div>`).join('')}</div>`;
  return '';
}

function watch(game, d) {
  if (game === 'keno') {
    const g = d.view;
    return `<div class="felt kenofelt"><p class="say">${g.open.length ? g.open.length + (g.open.length === 1 ? ' ticket' : ' tickets') + ' on draw ' + g.no + ': ' + g.open.map(t => t.picks.length + ' numbers for ' + sep(t.bet)).join(', ') : 'No ticket on the next draw.'}</p>${g.done[0] ? `<p class="hint">Last ticket: draw ${g.done[0].draw}, ${g.done[0].hits.length} of ${g.done[0].picks.length}${g.done[0].ret ? ', won ' + sep(g.done[0].ret) : ''}.</p>` : ''}</div>`;
  }
  const last = d.view && d.view.last;
  if (!last) return '<div class="felt"><p class="say">No round yet.</p></div>';
  if (game === 'cage') return `<div class="felt"><div class="bones">${last.dice.map(bone).join('')}</div>${lines(last.lines)}</div>`;
  if (game === 'six') return `<div class="felt watchwheel">${sixSvg(last.slot, 'mini')}<div class="wresult"><div class="wnum sx-${last.sym}">${esc(Sx.SYM[last.sym].label)}</div>${lines(last.lines)}</div></div>`;
  if (game === 'punto') return puntoPart(d).replace(/<form[\s\S]*?<\/form>/g, '').replace(/<div class="puntocloth"[\s\S]*?<\/div>/, '').replace(/<p class="(emptypurse|hint lims)">[\s\S]*?<\/p>/g, '');
  return '';
}

module.exports = { cagePart, sixPart, puntoPart, kenoPart, kenoPay, sixSvg, RULES, ART, BLURB, lastOut, watch };
