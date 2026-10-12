const V = require('./views');
const I = require('./inn');
const Sl = require('./innslots');
const Mn = require('./innmines');
const Pk = require('./innplinko');
const Ev = require('./innevents');

const esc = V.esc;
const hidden = V.hidden;
const sep = n => I.septims(n);
const x2 = m => Number(m).toFixed(2);
const EVENT = ['crash', 'races', 'arena'];

function stakeField(d, game, extra) {
  const lim = d.house.limits[game];
  const empty = !d.patron.purse;
  const last = Math.max(d.lastBet || lim.min, lim.min);
  const chips = [lim.min, lim.min * 5, lim.min * 20, lim.min * 100];
  return `<label class="stake">Stake<input name="bet" inputmode="numeric" value="${last}" data-stake aria-label="Stake in septims"${empty ? ' disabled' : ''}></label>
      <span class="chips">${chips.map(v => `<button type="button" class="chipbtn" data-chip="${v}"${empty ? ' disabled' : ''}>${sep(v)}</button>`).join('')}</span>${extra || ''}`;
}
function purseNote(d, game, extra) {
  const lim = d.house.limits[game];
  return !d.patron.purse ? '<p class="emptypurse">Your purse is empty. <a href="/inn#purse">Ask for more coin</a> and hand it over in game.</p>' : `<p class="hint lims">At least ${sep(lim.min)}; bet as much as your purse holds.${extra ? ' ' + extra : ''}</p>`;
}

const GLYPH = { dragon: '✦', septim: '◉', crown: '♛', mammoth: 'Ψ', gear: '⚙︎', mead: '⚱︎', roll: '❁' };
const sym = (id, cls) => `<span class="sl sl-${id}${cls ? ' ' + cls : ''}" data-sym="${id}" title="${esc(Sl.SYM[id].name)}"><i>${GLYPH[id]}</i></span>`;
const IDLE = [['roll', 'crown', 'mead'], ['gear', 'dragon', 'roll'], ['mead', 'mammoth', 'gear'], ['crown', 'roll', 'mammoth'], ['roll', 'gear', 'mead']];

function slotsPart(d) {
  const g = d.view || {};
  const last = g.last;
  const grid = last ? last.grid : IDLE;
  const win = new Set();
  if (last) {
    last.lines.forEach(l => Sl.LINES[l.line].slice(0, l.n).forEach((r, c) => win.add(c + '-' + r)));
    if (last.scatter) grid.forEach((col, c) => col.forEach((s, r) => { if (s === 'septim') win.add(c + '-' + r); }));
    if (last.jackpot) grid.forEach((col, c) => col.forEach((s, r) => { if (s === 'dragon') win.add(c + '-' + r); }));
  }
  const good = last && (last.free ? last.won > 0 : last.won > last.bet);
  const bad = last && !last.free && last.won < last.bet;
  const say = !last ? 'Nine lines, five reels. Pull the lever.' : (last.jackpot ? 'A DRAGON ON EVERY REEL! The hoard is yours: ' + sep(last.won) + '.' : (last.won ? (last.free ? 'Free spin: ' : '') + 'Back to you: ' + sep(last.won) + '.' : (last.free ? 'Free spin: nothing this time.' : 'Nothing this time.'))) + (last && last.freeAdded ? ' Three Septims or more: ' + last.freeAdded + ' free spins!' : '');
  const lineList = last && (last.lines.length || last.scatter) ? `<ul class="wlines">${last.lines.map(l => `<li class="won"><span>${esc(Sl.SYM[l.sym].name)} × ${l.n}, line ${l.line + 1}</span><span>${sep(Math.floor(l.amount))}</span></li>`).join('')}${last.scatter ? `<li class="won"><span>${last.scatters} Septims anywhere</span><span>${sep(Math.floor(last.scatter))}</span></li>` : ''}</ul>` : '';
  const free = g.free > 0;
  const empty = !d.patron.purse;
  return `<div class="felt slotsfelt" data-slots data-strip="${esc(JSON.stringify(Sl.STRIP))}" data-glyph="${esc(JSON.stringify(GLYPH))}">
    <div class="hoard"><span class="lbl">The Dragon’s Hoard</span><b data-jackpot>${sep(Math.floor(g.jackpot || 0))}</b><span class="hint">A Dragon on all five reels takes it all</span></div>
    <div class="reels${last && last.won ? ' paid' : ''}" data-reels>${grid.map((col, c) => `<div class="reel" data-reel="${c}"><div class="strip">${col.map((s, r) => sym(s, win.has(c + '-' + r) ? 'win' : '')).join('')}</div></div>`).join('')}</div>
    <p class="say ${good ? 'good' : (bad ? 'bad' : '')}${last && last.jackpot ? ' jackpot' : ''}" data-say aria-live="polite">${esc(say)}</p>
    ${lineList}
    ${free ? `<p class="freeleft"><b>${g.free}</b> free ${g.free === 1 ? 'spin' : 'spins'} left at ${sep(g.freeBet)} a spin${g.freeWon ? ' · won so far ' + sep(g.freeWon) : ''}</p>` : ''}
    <form method="post" action="/inn/slots/spin" data-play class="stakerow">${hidden(d.csrf)}
      ${free ? '' : stakeField(d, 'slots')}
      <button class="btn go lever" type="submit" data-key="enter"${empty && !free ? ' disabled' : ''}>${free ? 'Free spin' : 'Pull the lever'}</button>
    </form>
    ${free ? '' : purseNote(d, 'slots', 'The stake is spread over nine lines.')}
  </div>`;
}

function minesTiles(g, still) {
  const play = g.phase === 'play', done = g.phase === 'done';
  const opened = new Set(g.opened || []);
  const draugr = new Set(done ? g.draugr : []);
  const tile = i => {
    if (play && still) return opened.has(i) ? '<span class="stone open"><i>◆</i></span>' : '<span class="stone shut"><i></i></span>';
    if (play) return opened.has(i) ? `<button type="button" class="stone open" disabled aria-label="Silver"><i>◆</i></button>` : `<button class="stone" type="submit" name="tile" value="${i}" formaction="/inn/mines/pick" aria-label="Lift stone ${i + 1}"><i></i></button>`;
    if (done) {
      if (i === g.hit) return '<span class="stone draugr hit" aria-label="Draugr"><i>☠︎</i></span>';
      if (draugr.has(i)) return '<span class="stone draugr" aria-label="Draugr"><i>☠︎</i></span>';
      if (opened.has(i)) return '<span class="stone open" aria-label="Silver"><i>◆</i></span>';
      return '<span class="stone missed" aria-label="Silver left behind"><i>◆</i></span>';
    }
    return '<span class="stone shut"><i></i></span>';
  };
  return Array.from({ length: 25 }, (_, i) => tile(i)).join('');
}
function minesPart(d) {
  const g = d.view || Mn.fresh();
  const play = g.phase === 'play', done = g.phase === 'done';
  const n = (g.opened || []).length;
  const next = play && n < 25 - g.mines ? Mn.multiplier(g.mines, n + 1) : 0;
  const empty = !d.patron.purse;
  const say = play ? (n ? `${n} ${n === 1 ? 'stone' : 'stones'} lifted. Take ${sep(Math.floor(g.bet * g.mult))} now, or lift another for ×${x2(next)}.` : `${g.mines} ${g.mines === 1 ? 'draugr sleeps' : 'draugr sleep'} under these stones. Lift one.`)
    : (done ? (g.result === 'cash' ? `You leave the barrow with ${sep(g.returned)}, ×${x2(g.mult)} your stake.` : `A draugr wakes! The barrow keeps your ${sep(g.bet)}.`) : 'Choose how many draugr sleep in the barrow, put down a stake, and lift stones for silver.');
  const counts = [4, 5, 6, 8, 10, 12, 15, 20, 24];
  const want = Math.max(Mn.MIN, g.mines || Mn.MIN);
  const controls = play
    ? `<div class="stakerow"><span class="bstat">Stake <b>${sep(g.bet)}</b> · ${g.mines} draugr · now <b>×${x2(g.mult)}</b></span><button class="btn go" type="submit" formaction="/inn/mines/cash" data-key="enter"${n ? '' : ' disabled'}>Take ${sep(Math.floor(g.bet * g.mult))}</button></div>`
    : `<div class="stakerow">${stakeField(d, 'mines', `<label class="stake">Draugr<select name="mines" data-mines>${counts.concat(counts.includes(want) ? [] : [want]).sort((a, b) => a - b).map(k => `<option value="${k}"${k === want ? ' selected' : ''}>${k}</option>`).join('')}</select></label>`)}<button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Enter the barrow</button></div>`;
  const ladder = !play ? `<p class="hint mladder" data-mladder>${[1, 2, 3, 5, 8].filter(k => k <= 25 - want).map(k => `${k} ${k === 1 ? 'stone' : 'stones'} ×${x2(Mn.multiplier(want, k))}`).join(' · ')}</p>` : '';
  return `<div class="felt barrowfelt" data-barrow data-phase="${g.phase}" data-edge="${Mn.EDGE}">
    <form method="post" action="/inn/mines/start" data-play>${hidden(d.csrf)}
      <div class="bgrid${done ? ' over ' + g.result : ''}">${minesTiles(g)}</div>
      <p class="say ${done ? (g.result === 'cash' ? 'good' : 'bad') : ''}" data-say aria-live="polite">${esc(say)}</p>
      ${controls}
    </form>
    ${ladder}
    ${play ? '' : purseNote(d, 'mines')}
  </div>`;
}

const PK = { gap: 34, row: 30, top: 34, mid: 310 };
function plinkoBoard(risk) {
  const t = Pk.TABLE[risk];
  const pegs = [];
  for (let r = 0; r < Pk.ROWS; r++) for (let i = 0; i < r + 3; i++) pegs.push(`<circle cx="${PK.mid + (i - (r + 2) / 2) * PK.gap}" cy="${PK.top + r * PK.row}" r="3.2"/>`);
  const y = PK.top + Pk.ROWS * PK.row - 6;
  const slots = t.map((m, i) => { const x = PK.mid + (i - 8) * PK.gap; const tier = m >= 10 ? 'hot' : (m >= 2 ? 'warm' : (m >= 1 ? 'even' : 'cold')); return `<g class="pslot ${tier}" data-pslot="${i}"><rect x="${x - 16}" y="${y}" width="32" height="26" rx="5"/><text x="${x}" y="${y + 17}">${m >= 100 ? m : m}×</text></g>`; }).join('');
  return `<svg class="avaboard" viewBox="0 0 620 ${y + 34}" role="img" aria-label="The peg board"><g class="pegs">${pegs.join('')}</g><g class="pslots" data-pslots>${slots}</g><g data-balls></g></svg>`;
}
function plinkoPart(d) {
  const g = d.view || {};
  const risk = g.risk || 'medium';
  const last = g.last;
  const empty = !d.patron.purse;
  return `<div class="felt avafelt" data-plinko data-table="${esc(JSON.stringify(Pk.TABLE))}" data-geo="${esc(JSON.stringify(PK))}">
    ${plinkoBoard(risk)}
    <p class="say ${last ? (last.returned > last.staked ? 'good' : (last.returned < last.staked ? 'bad' : '')) : ''}" data-say aria-live="polite">${last ? `The snowball lands on ×${last.mult}. ${last.returned ? 'Back to you: ' + sep(last.returned) + '.' : 'Nothing back.'}` : 'Drop a snowball from the top of the pass. Where it lands is what your stake is worth.'}</p>
    <div class="avarecent" data-avarecent aria-label="Your last drops"></div>
    <form method="post" action="/inn/plinko/drop" data-play class="stakerow">${hidden(d.csrf)}
      <span class="riskset" role="radiogroup" aria-label="Risk">${Pk.RISKS.map(r => `<label class="riskopt"><input type="radio" name="risk" value="${r.id}"${r.id === risk ? ' checked' : ''} data-risk><span>${r.name}</span></label>`).join('')}</span>
      ${stakeField(d, 'plinko')}
      <button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Drop the snowball</button>
    </form>
    ${purseNote(d, 'plinko', 'Drop as many as you like; each lands on its own.')}
  </div>`;
}

function crashParts(d) {
  const { e, pid } = d.view;
  const c = e.crash;
  const mine = c.bets.find(b => b.patron === pid);
  const crashed = c.phase === 'crashed';
  const meta = { game: 'crash', no: c.no, phase: c.phase, flyAt: c.flyAt, betUntil: c.betUntil, k: Ev.K, point: crashed ? c.point : null, mine: mine ? { amount: mine.amount, auto: mine.auto, cashed: mine.cashed, at: mine.at } : null };
  const stage = `<div class="climb" data-climb>
      <svg class="climbsvg" viewBox="0 0 600 260" aria-hidden="true"><g class="grid">${[50, 100, 150, 200].map(y => `<line x1="40" x2="590" y1="${y}" y2="${y}"/>`).join('')}</g><g class="ylab" data-ylab></g><path class="trail" data-trail d="M40 230"/><path class="curve" data-curve d="M40 230"/><circle class="head" data-head cx="40" cy="230" r="7"/></svg>
      <div class="climbx${crashed ? ' fell' : ''}" data-mult>${crashed ? x2(c.point) + '×' : '1.00×'}</div>
      <div class="climbnote" data-note>${crashed ? 'The dragon fell at ×' + x2(c.point) : (c.phase === 'bet' ? 'Takes off in a few seconds' : 'Flight ' + c.no + ' is climbing')}</div>
    </div>`;
  const empty = !d.patron.purse;
  let ctl;
  if (c.phase === 'bet' && !mine) ctl = `<form method="post" action="/inn/crash/bet" data-play class="stakerow">${hidden(d.csrf)}${stakeField(d, 'crash', `<label class="stake">Cash out at<input name="auto" inputmode="decimal" placeholder="by hand" value="${esc(d.view.mine && d.view.mine.auto ? d.view.mine.auto : '')}" aria-label="Cash out automatically at"></label>`)}<button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Ride flight ${c.no}</button></form>${purseNote(d, 'crash', 'Leave “cash out at” empty to cash out by hand.')}`;
  else if (c.phase === 'bet') ctl = `<p class="ride">You ride flight ${c.no} with <b>${sep(mine.amount)}</b>${mine.auto ? `, cashing out by itself at ×${x2(mine.auto)}` : '. Cash out before the dragon falls'}.</p>`;
  else if (mine && mine.cashed) ctl = `<p class="ride good">You cashed out at <b>×${x2(mine.at)}</b>: <b>${sep(mine.returned)}</b> back in your purse.</p>`;
  else if (mine && c.phase === 'fly') ctl = `<form method="post" action="/inn/crash/cash" data-play class="stakerow cashrow">${hidden(d.csrf)}<button class="btn go cashout" type="submit" data-key="enter" data-cashbtn data-amount="${mine.amount}">Cash out</button>${mine.auto ? `<span class="hint">or by itself at ×${x2(mine.auto)}</span>` : ''}</form>`;
  else if (mine) ctl = `<p class="ride bad">The dragon fell at ×${x2(c.point)}. Your ${sep(mine.amount)} went with it.</p>`;
  else ctl = `<p class="ride">${c.phase === 'fly' ? 'The dragon is in the air. Bet on the next flight.' : 'The dragon fell. The next flight boards in a moment.'}</p>`;
  const list = c.bets.length ? `<ul class="riders">${c.bets.map(b => `<li class="${b.cashed ? 'good' : (crashed ? 'bad' : '')}"><span>${esc(b.name)}</span><span>${sep(b.amount)}</span><span>${b.cashed ? '×' + x2(b.at) + ' → ' + sep(b.returned) : (crashed ? 'fell' : (b.auto ? 'auto ×' + x2(b.auto) : 'riding'))}</span></li>`).join('')}</ul>` : '<p class="hint">Nobody rides this flight yet.</p>';
  const hist = `<div class="lastout crashhist">${(e.history.crash || []).map(p => `<i class="pk ${p >= 10 ? 'hot' : (p >= 2 ? 'good' : 'bad')}">${x2(p)}</i>`).join('')}</div>`;
  return { meta, stage, ctl, list: `<span class="lbl">Flight ${c.no}: riders</span>${list}`, hist };
}

function racesParts(d) {
  const { e, pid } = d.view;
  const r = e.race;
  const run = r.phase !== 'bet';
  const done = r.phase === 'done';
  const mb = r.bets.filter(b => b.patron === pid);
  const meta = { game: 'races', no: r.no, phase: r.phase, runAt: r.runAt, endAt: r.endAt, nextAt: r.nextAt, frames: run ? r.frames : null, order: done ? r.order : null, names: r.horses.map(h => h.name), mine: { n: mb.length, staked: mb.reduce((n, b) => n + b.amount, 0), returned: done ? mb.reduce((n, b) => n + b.returned, 0) : 0 } };
  const placeOf = i => done ? r.order.indexOf(i) : -1;
  const stage = `<div class="downs" data-downs>
      <div class="downsclock" data-dclock>${done ? 'Race ' + r.no + ' is run.' : (run ? 'They’re off!' : 'Race ' + r.no)}</div>
      ${r.horses.map((h, i) => `<div class="lane${placeOf(i) === 0 ? ' first' : ''}"><span class="lnum" style="--silk:${h.silk}">${i + 1}</span><div class="track"><span class="horse" data-horse="${i}" style="--silk:${h.silk}${done ? ';left:calc(100% - 26px)' : ''}">♞</span><span class="finish"></span></div><span class="lname">${esc(h.name)}${done && placeOf(i) < 3 ? ` <b class="placed p${placeOf(i)}">${['1st', '2nd', '3rd'][placeOf(i)]}</b>` : ''}</span></div>`).join('')}
    </div>`;
  const mine = r.bets.filter(b => b.patron === pid);
  const empty = !d.patron.purse;
  const odds = (h, i, t) => `<label class="oddsbtn"><input type="radio" name="pick" value="${i}:${t}" form="racebet${r.no}" required><span>${h.odds[t].toFixed(1)}</span></label>`;
  const book = `<div class="tablewrap"><table class="racebook"><thead><tr><th></th><th>Horse</th><th class="num">Win</th><th class="num">Place <span class="hint">1st–2nd</span></th><th class="num">Show <span class="hint">1st–3rd</span></th></tr></thead><tbody>${r.horses.map((h, i) => `<tr><td><span class="lnum" style="--silk:${h.silk}">${i + 1}</span></td><td>${esc(h.name)}</td>${run ? `<td class="num">${h.odds.win.toFixed(1)}</td><td class="num">${h.odds.place.toFixed(1)}</td><td class="num">${h.odds.show.toFixed(1)}</td>` : `<td class="num">${odds(h, i, 'win')}</td><td class="num">${odds(h, i, 'place')}</td><td class="num">${odds(h, i, 'show')}</td>`}</tr>`).join('')}</tbody></table></div>`;
  const myList = mine.length ? `<ul class="riders">${mine.map(b => { const pl = b.horses ? -1 : placeOf(b.horse); const won = done && b.returned > 0; return `<li class="${done ? (won ? 'good' : 'bad') : ''}"><span>${esc(I.raceName(r, b))} at ${b.odds.toFixed(1)}</span><span>${sep(b.amount)}</span><span>${done ? (won ? '→ ' + sep(b.returned) : (pl >= 0 ? 'came ' + (pl + 1) + (['st', 'nd', 'rd'][pl] || 'th') : 'lost')) : (run ? 'running' : 'on the book')}</span></li>`; }).join('')}</ul>` : '';
  const ctl = `${book}${run ? `<p class="ride">${done ? 'The next race opens its book shortly.' : 'The book is closed. They are running.'}</p>` : `<form method="post" action="/inn/races/bet" data-play class="stakerow" id="racebet${r.no}" data-racebet>${hidden(d.csrf)}<span class="hint">Pick odds above, then</span>${stakeField(d, 'races')}<button class="btn go" type="submit" data-key="enter"${empty ? ' disabled' : ''}>Place the bet</button></form>${purseNote(d, 'races', 'The odds are what one septim brings back, your stake included.')}`}${run ? '' : exoticForm(d, r, empty)}${myList ? '<span class="lbl">Your bets on this race</span>' + myList : ''}`;
  const list = r.bets.length ? `<ul class="riders">${r.bets.map(b => `<li><span>${esc(b.name)}</span><span>${esc(I.raceName(r, b))}</span><span>${sep(b.amount)}</span></li>`).join('')}</ul>` : '<p class="hint">No bets on this race yet.</p>';
  const hist = `<div class="lastout racehist">${(e.history.race || []).slice(0, 10).map(x => `<div class="kprev"><span>Race ${x.no}</span><span>${x.order.slice(0, 3).map((n, k) => `<b class="placed p${k}">${k + 1}</b> ${esc(n)}`).join(' · ')}</span></div>`).join('')}</div>`;
  return { meta, stage, ctl, list: `<span class="lbl">The book on race ${r.no}</span>${list}`, hist };
}

function exoticForm(d, r, empty) {
  const opts = sel => r.horses.map((h, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${i + 1} · ${esc(h.name)}</option>`).join('');
  return `<form method="post" action="/inn/races/bet" data-play class="exotic" data-exotic data-exacta="${esc(JSON.stringify(r.exacta || {}))}" data-trifecta="${esc(JSON.stringify(r.trifecta || {}))}">${hidden(d.csrf)}
      <span class="lbl">Side bets: the order they finish</span>
      <span class="riskset" role="radiogroup" aria-label="Exacta or trifecta"><label class="riskopt"><input type="radio" name="kind" value="exacta" checked><span>Exacta</span></label><label class="riskopt"><input type="radio" name="kind" value="trifecta"><span>Trifecta</span></label></span>
      <span class="exsel"><label>First<select name="e1">${opts(0)}</select></label><label>Second<select name="e2">${opts(1)}</select></label><label data-third hidden>Third<select name="e3">${opts(2)}</select></label></span>
      <span class="exprice">Pays <b data-exprice>${(r.exacta || {})['0-1'] || '–'}</b> per septim</span>
      <div class="stakerow">${stakeField(d, 'races')}<button class="btn go" type="submit"${empty ? ' disabled' : ''}>Bet the order</button></div>
    </form>`;
}

function fighterCard(f, i, bo, done) {
  return `<div class="fighter f${i}${done && bo.winner === i ? ' won' : ''}${done && bo.winner !== i ? ' lost' : ''}"><b>${esc(f.name)}</b>${f.kind ? `<span class="hint">${esc(f.kind)}</span>` : ''}<div class="hpbar"><i data-hp="${i}" style="width:${done ? (bo.winner === i ? Math.max(4, Math.round(100 * (bo.log[bo.log.length - 1].hp[i]) / f.hp)) : 0) : 100}%"></i></div><span class="hpnum" data-hpn="${i}">${f.hp ? (done ? bo.log[bo.log.length - 1].hp[i] : f.hp) + ' / ' + f.hp : ''}</span><span class="odds">${bo.odds[i].toFixed(2)}</span></div>`;
}
function arenaParts(d) {
  const { e, pid } = d.view;
  const bo = e.bout;
  const live = bo.phase !== 'bet';
  const done = bo.phase === 'done';
  const mb = bo.bets.filter(b => b.patron === pid);
  const meta = { game: 'arena', no: bo.no, phase: bo.phase, startAt: bo.startAt, endAt: bo.endAt, nextAt: bo.nextAt, log: live ? bo.log : null, names: bo.fighters.map(f => f.name), hp: bo.fighters.map(f => f.hp), styles: bo.fighters.map(f => ({ style: f.style || 'shield', colour: f.colour || '#7A5A3A', element: f.element || '' })), mine: { n: mb.length, staked: mb.reduce((n, b) => n + b.amount, 0), returned: done ? mb.reduce((n, b) => n + b.returned, 0) : 0 } };
  const stage = `<div class="arena" data-arena>
      <div class="ring">${fighterCard(bo.fighters[0], 0, bo, done)}<div class="vs"><span data-aclock>${done ? 'Bout ' + bo.no : (live ? 'Fight!' : 'Bout ' + bo.no)}</span></div>${fighterCard(bo.fighters[1], 1, bo, done)}</div>
      <canvas class="arenacanvas" data-ring width="880" height="380" role="img" aria-label="The ring: ${esc(bo.fighters[0].name)} against ${esc(bo.fighters[1].name)}"></canvas>
      <ol class="blows" data-blows>${done ? `<li class="ko">${esc(bo.fighters[bo.winner].name)} wins the bout.</li>` : ''}</ol>
    </div>`;
  const empty = !d.patron.purse;
  const mine = bo.bets.filter(b => b.patron === pid);
  const back = (title, f, odds, extra, key) => `<form method="post" action="/inn/arena/bet" data-play class="stakerow backrow">${hidden(d.csrf)}${extra || ''}${stakeField(d, 'arena')}<span class="backbtns"><button class="btn go" type="submit" name="side" value="0"${key ? ' data-key="1"' : ''}${empty ? ' disabled' : ''}>Back ${esc(f[0].name)} · ${odds[0].toFixed(2)}</button><button class="btn go" type="submit" name="side" value="1"${key ? ' data-key="2"' : ''}${empty ? ' disabled' : ''}>Back ${esc(f[1].name)} · ${odds[1].toFixed(2)}</button></span></form>`;
  const posted = e.posted.filter(p => p.phase === 'open' || p.phase === 'closed' || p.bets.some(b => b.patron === pid && Date.now() - Date.parse(p.settledAt || p.at) < 3600000));
  const myOn = (bets, f, settled, w) => bets.filter(b => b.patron === pid).map(b => `<li class="${settled ? (b.returned > b.amount ? 'good' : (b.returned === b.amount ? '' : 'bad')) : ''}"><span>${esc(b.prop ? I.propName(b.prop, bo) : f[b.side].name)} at ${b.odds.toFixed(2)}</span><span>${sep(b.amount)}</span><span>${settled ? (b.returned ? '→ ' + sep(b.returned) : 'lost') : 'riding'}</span></li>`).join('');
  const mineHouse = myOn(bo.bets, bo.fighters, done);
  const pr = bo.props;
  const propForm = pr ? `<form method="post" action="/inn/arena/bet" data-play class="stakerow backrow propsrow">${hidden(d.csrf)}<span class="lbl">Side bets</span>${stakeField(d, 'arena')}<span class="backbtns"><button class="btn ghost" type="submit" name="prop" value="under"${empty ? ' disabled' : ''}>Under ${pr.line} blows · ${pr.under.toFixed(2)}</button><button class="btn ghost" type="submit" name="prop" value="over"${empty ? ' disabled' : ''}>Over ${pr.line} blows · ${pr.over.toFixed(2)}</button>${Object.entries(pr.ends).map(([k, o]) => `<button class="btn ghost" type="submit" name="prop" value="${k}"${empty ? ' disabled' : ''}>Ends ${esc(Ev.ENDS[k])} · ${o.toFixed(2)}</button>`).join('')}</span></form>` : '';
  const ctl = `${live ? `<p class="ride">${done ? 'The next pair steps into the ring shortly.' : 'The bout is on. Betting is closed.'}</p>` : back('', bo.fighters, bo.odds, '', true) + propForm + purseNote(d, 'arena', 'The odds are what one septim brings back, your stake included.')}${mineHouse ? `<span class="lbl">Your bets on bout ${bo.no}</span><ul class="riders">${mineHouse}</ul>` : ''}
    ${posted.length ? `<div class="posted"><span class="lbl">Bouts posted by the keepers</span>${posted.map(p => `<div class="pbout"><div class="pbhead"><b>${esc(p.fighters[0].name)}</b> against <b>${esc(p.fighters[1].name)}</b>${p.title ? ` <span class="hint">· ${esc(p.title)}</span>` : ''}<span class="tag${p.phase === 'open' ? ' on' : ''}">${{ open: 'betting open', closed: 'betting closed', settled: 'settled', void: 'called off' }[p.phase]}</span></div>${p.phase === 'open' ? back('', p.fighters, p.odds, `<input type="hidden" name="bout" value="${esc(p.id)}">`) : `<p class="hint">${p.phase === 'settled' ? esc(p.fighters[p.winner].name) + ' won.' : (p.phase === 'void' ? 'Every stake was handed back.' : 'Waiting on the keepers to call the winner.')}</p>`}${p.bets.some(b => b.patron === pid) ? `<ul class="riders">${myOn(p.bets, p.fighters, p.phase === 'settled' || p.phase === 'void')}</ul>` : ''}</div>`).join('')}</div>` : ''}`;
  const list = bo.bets.length ? `<ul class="riders">${bo.bets.map(b => `<li><span>${esc(b.name)}</span><span>${esc(b.prop ? I.propName(b.prop, bo) : bo.fighters[b.side].name)}</span><span>${sep(b.amount)}</span></li>`).join('')}</ul>` : '<p class="hint">No bets on this bout yet.</p>';
  const hist = `<div class="lastout racehist">${(e.history.bout || []).slice(0, 10).map(x => `<div class="kprev"><span>Bout ${x.no}</span><span><b>${esc(x.winner)}</b> beat ${esc(x.loser)}</span></div>`).join('')}</div>`;
  return { meta, stage, ctl, list: `<span class="lbl">The book on bout ${bo.no}</span>${list}`, hist };
}

const PARTS = { crash: crashParts, races: racesParts, arena: arenaParts };
function eventParts(game, d) { return PARTS[game](d); }
function eventPart(game, d) {
  const p = eventParts(game, d);
  return `<div class="felt evfelt ${game}felt" data-event="${game}" data-meta="${esc(JSON.stringify(p.meta))}" data-now="${Date.now()}">
    <div data-ev="stage">${p.stage}</div>
    <div class="evctl" data-ev="ctl">${p.ctl}</div>
    <div class="evlist" data-ev="list">${p.list}</div>
    <div class="evhist"><span class="lbl">Before this</span><div data-ev="hist">${p.hist}</div></div>
  </div>`;
}

const RULES = {
  slots: `<ul class="irules">
    <li>Five reels, three rows, <b>nine lines</b>. Your stake is spread evenly over the lines.</li>
    <li>Three or more alike from the left on a line pay. Per septim on the line: Crown 11 / 55 / 220, Mammoth 8.8 / 33 / 132, Gear 6.6 / 22 / 88, Mead 4.4 / 13.2 / 55, Sweetroll 2.2 / 8.8 / 33.</li>
    <li>The <b>Dragon</b> is wild and stands in for anything but the Septim. Three, four or five Dragons pay 22 / 110 / 440.</li>
    <li>Three or more <b>Septims</b> anywhere pay 2, 5, 20 or 50 times the stake and give <b>8 free spins</b>.</li>
    <li>A Dragon on <b>every reel</b> wins the Dragon’s Hoard. Every spin feeds it one septim in a hundred.</li>
  </ul>`,
  mines: `<ul class="irules">
    <li>The barrow has <b>25 stones</b>. Choose how many <b>draugr</b> sleep under them, from 4 to 24.</li>
    <li>Lift a stone: silver grows your winnings. A draugr ends the run and takes the stake.</li>
    <li><b>Take</b> your winnings any time after the first stone.</li>
    <li>More draugr, bigger steps: with 4 draugr one stone pays ×1.09; with 10 it pays ×1.53.</li>
  </ul>`,
  plinko: `<ul class="irules">
    <li>Drop a snowball from the top of the pass. It bounces left or right off <b>sixteen rows</b> of rocks.</li>
    <li>It lands in one of 17 slots; the slot is what your stake is multiplied by.</li>
    <li><b>Low</b> risk: 0.5× to 16×. <b>Medium</b>: 0.3× to 50×. <b>High</b>: 0.2× to <b>100×</b>.</li>
    <li>The edges are rare and rich; the middle is common and lean.</li>
  </ul>`,
  crash: `<ul class="irules">
    <li>Every flight the dragon climbs and the multiplier grows from <b>1.00×</b>. At some point it falls.</li>
    <li>Bet while the flight boards, then <b>cash out</b> before the fall for your stake times the multiplier.</li>
    <li>Set <b>cash out at</b> to leave by itself at that height.</li>
    <li>Still riding when it falls, you lose the stake. Some flights fall at once.</li>
    <li>Everyone in the hall rides the same dragon.</li>
  </ul>`,
  races: `<ul class="irules">
    <li>Six horses run every few minutes. The book opens as soon as the last race is done.</li>
    <li><b>Win</b>: your horse comes first. <b>Place</b>: first or second. <b>Show</b>: first, second or third.</li>
    <li>The odds are fixed when you bet and show what one septim brings back, the stake included.</li>
    <li>Side bets on the order: an <b>exacta</b> names the first two in order, a <b>trifecta</b> the first three. Their prices come from the same thousands of simulated races.</li>
    <li>Up to twelve bets on one race. Everyone watches the same race.</li>
  </ul>`,
  arena: `<ul class="irules">
    <li>Two fighters step into the ring every few minutes. Back the one you think walks out.</li>
    <li>The odds are fixed when you bet and show what one septim brings back, the stake included.</li>
    <li>Watch it blow by blow: blades, shield bashes, arrows and spells. A fighter at zero is done.</li>
    <li>Side bets: <b>under or over</b> the number of blows the bout lasts, and <b>how it ends</b>: by the blade, a spell or an arrow.</li>
    <li>The keepers also post bouts fought in game. Those are settled by the keepers when the fight is over; a bout called off hands every stake back.</li>
  </ul>`
};

const ART = {
  slots: () => `<div class="reels mini">${['dragon', 'crown', 'dragon'].map(s => `<div class="reel">${sym(s)}</div>`).join('')}</div>`,
  mines: () => '<div class="bgrid mini">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<span class="stone${i === 4 ? ' draugr' : (i % 3 === 0 ? ' open' : '')}"><i>${i === 4 ? '☠︎' : (i % 3 === 0 ? '◆' : '')}</i></span>`).join('') + '</div>',
  plinko: () => `<svg class="avamini" viewBox="0 0 120 70" aria-hidden="true">${[0, 1, 2, 3].map(r => Array.from({ length: r + 3 }, (_, i) => `<circle cx="${60 + (i - (r + 2) / 2) * 16}" cy="${12 + r * 13}" r="2.4"/>`).join('')).join('')}<circle class="snow" cx="68" cy="31" r="5"/></svg>`,
  crash: () => '<svg class="climbmini" viewBox="0 0 120 70" aria-hidden="true"><path d="M6 64 Q70 60 112 8" /><text x="70" y="50">2.47×</text></svg>',
  races: () => `<div class="minidowns">${['#C9A06A', '#7FB2D9', '#D9643A'].map((c, i) => `<span style="--silk:${c};left:${[62, 40, 18][i]}%">♞</span>`).join('')}</div>`,
  arena: () => '<div class="miniarena"><span>⚔︎</span></div>'
};
const BLURB = {
  slots: 'Five reels, nine lines. The Dragon is wild, and a Dragon on every reel takes the hoard.',
  mines: 'Lift stones for silver. Each one pays more, until a draugr wakes.',
  plinko: 'Drop a snowball down the pass. From 0.2× to 100×, low, medium or high risk.',
  crash: 'The dragon climbs and the multiplier grows. Cash out before it falls.',
  races: 'Six horses every few minutes. Win, place or show at fixed odds.',
  arena: 'Back a fighter, watch the bout blow by blow. Keepers post fights from the game too.'
};

function lastOut(game, l) {
  if (game === 'slots') return `<div class="lastout">${l.map(x => `<i class="pk ${x.j ? 'hot' : (x.w > x.b ? 'good' : (x.w ? '' : 'bad'))}">${x.j ? 'HOARD' : (x.w ? '×' + (Math.round(x.w / x.b * 10) / 10) : '–')}</i>`).join('')}</div><p class="hint">What each spin paid, against its stake. Newest first.</p>`;
  if (game === 'mines') return `<div class="lastout">${l.map(x => `<i class="pk ${x.r === 'cash' ? 'good' : 'bad'}" title="${x.m} draugr, ${x.n} stones">${x.r === 'cash' ? '×' + x2(x.x) : '☠︎ ' + x.n}</i>`).join('')}</div><p class="hint">Taken out, or woke a draugr after so many stones.</p>`;
  if (game === 'plinko') return `<div class="lastout">${l.map(x => `<i class="pk ${x.x >= 10 ? 'hot' : (x.x >= 1 ? 'good' : 'bad')}">${x.x}×</i>`).join('')}</div>`;
  if (game === 'crash') return `<div class="lastout">${l.map(x => `<i class="pk ${x.x >= 10 ? 'hot' : (x.x >= 2 ? 'good' : 'bad')}">${x2(x.x)}</i>`).join('')}</div><p class="hint">Where each flight fell.</p>`;
  if (game === 'races') return `<div class="lastout racehist">${l.map(x => `<div class="kprev"><span>Race ${x.no}</span><span><b>${esc(x.first)}</b> at ${Number(x.odds).toFixed(1)}</span></div>`).join('')}</div>`;
  if (game === 'arena') return `<div class="lastout racehist">${l.map(x => `<div class="kprev"><span>${String(x.no).startsWith('P') ? 'Posted ' + esc(String(x.no).slice(1)) : 'Bout ' + esc(x.no)}</span><span><b>${esc(x.w)}</b></span></div>`).join('')}</div>`;
  return '';
}

function watch(game, d) {
  const g = d.view || {};
  const pid = d.patron.id;
  if (game === 'slots') {
    const l = g.last;
    if (!l) return '<div class="felt"><p class="say">No spin yet.</p></div>';
    return `<div class="felt slotsfelt"><div class="reels watch">${l.grid.map(col => `<div class="reel"><div class="strip">${col.map(s => sym(s)).join('')}</div></div>`).join('')}</div><p class="say">${l.free ? 'Free spin. ' : 'Stake ' + sep(l.bet) + '. '}${l.won ? 'Won ' + sep(l.won) + (l.jackpot ? ', THE HOARD' : '') : 'Nothing'}.${g.free ? ' ' + g.free + ' free spins left.' : ''}</p></div>`;
  }
  if (game === 'mines') {
    if (g.phase === 'idle') return '<div class="felt"><p class="say">Not in the barrow yet.</p></div>';
    return `<div class="felt barrowfelt"><div class="bgrid watch${g.phase === 'done' ? ' over ' + g.result : ''}">${minesTiles(g, true)}</div><p class="say">${g.mines} draugr, stake ${sep(g.bet)}, ${g.opened.length} ${g.opened.length === 1 ? 'stone' : 'stones'} lifted${g.phase === 'play' ? ', at ×' + x2(g.mult) : (g.result === 'cash' ? ', took ' + sep(g.returned) : ', woke a draugr')}.</p></div>`;
  }
  if (game === 'plinko') {
    const l = g.last;
    return l ? `<div class="felt"><p class="say ${l.returned > l.staked ? 'good' : 'bad'}">${esc((Pk.RISKS.find(r => r.id === l.risk) || {}).name || '')} risk, ${sep(l.staked)}: landed on ×${l.mult}, ${sep(l.returned)} back.</p></div>` : '<div class="felt"><p class="say">No drop yet.</p></div>';
  }
  if (EVENT.includes(game)) {
    const e = g.e;
    const lines = [];
    if (game === 'crash') { const c = e.crash; const b = c.bets.find(x => x.patron === pid); lines.push(b ? `Flight ${c.no}: ${sep(b.amount)}${b.cashed ? ', cashed at ×' + x2(b.at) + ' → ' + sep(b.returned) : (c.phase === 'crashed' ? ', fell at ×' + x2(c.point) : (b.auto ? ', auto at ×' + x2(b.auto) : ', riding'))}` : `Flight ${c.no}: no bet (${c.phase === 'crashed' ? 'fell at ×' + x2(c.point) : c.phase === 'fly' ? 'in the air' : 'boarding'})`); }
    if (game === 'races') { const r = e.race; const bs = r.bets.filter(x => x.patron === pid); lines.push(bs.length ? `Race ${r.no}: ` + bs.map(b => `${sep(b.amount)} on ${esc(I.raceName(r, b))}${r.phase === 'done' ? (b.returned ? ' → ' + sep(b.returned) : ' (lost)') : ''}`).join('; ') : `Race ${r.no}: no bet`); }
    if (game === 'arena') { const bo = e.bout; const bs = bo.bets.filter(x => x.patron === pid); lines.push(bs.length ? `Bout ${bo.no}: ` + bs.map(b => `${sep(b.amount)} on ${esc(b.prop ? I.propName(b.prop, bo) : bo.fighters[b.side].name)}${bo.phase === 'done' ? (b.returned ? ' → ' + sep(b.returned) : ' (lost)') : ''}`).join('; ') : `Bout ${bo.no}: no bet`); e.posted.filter(p => p.phase === 'open' || p.phase === 'closed').forEach(p => { const pb = p.bets.filter(x => x.patron === pid); if (pb.length) lines.push(`Posted: ` + pb.map(b => `${sep(b.amount)} on ${esc(p.fighters[b.side].name)}`).join('; ')); }); }
    return `<div class="felt"><p class="say">${lines.join('<br>')}</p></div>`;
  }
  return '';
}

function postedCard(d) {
  const e = Ev.state();
  const list = e.posted.slice(0, 12);
  const total = p => p.bets.reduce((n, b) => n + b.amount, 0);
  const side = (p, i) => p.bets.filter(b => b.side === i).reduce((n, b) => n + b.amount, 0);
  const act = (p, what, label, cls) => `<form method="post" action="/inn/ledger/bout/${esc(p.id)}/${what}" class="inl">${hidden(d.csrf)}<button class="btn ${cls || 'ghost'} small" type="submit">${label}</button></form>`;
  return `<div class="card" id="arenabouts"><h3>The Arena: bouts fought in game</h3>
    <p class="hint">Post a fight that is happening in game. Patrons back either side at your odds until you close the betting; once it is fought, say who won and the winners are paid at once. Calling it off hands every stake back. The house’s own bouts run by themselves.</p>
    <form method="post" action="/inn/ledger/bout" class="pform boutform">${hidden(d.csrf)}
      <input name="a" maxlength="60" required placeholder="First fighter" aria-label="First fighter">
      <input name="oddsA" inputmode="decimal" required placeholder="Odds, e.g. 1.80" aria-label="Odds on the first fighter">
      <input name="b" maxlength="60" required placeholder="Second fighter" aria-label="Second fighter">
      <input name="oddsB" inputmode="decimal" required placeholder="Odds, e.g. 2.10" aria-label="Odds on the second fighter">
      <input name="title" maxlength="80" placeholder="Where or why (optional)" aria-label="Title">
      <button class="btn go small" type="submit">Post the bout</button>
    </form>
    ${list.length ? `<ul class="plist">${list.map(p => `<li><div><b>${esc(p.fighters[0].name)}</b> ${p.odds[0].toFixed(2)} against <b>${esc(p.fighters[1].name)}</b> ${p.odds[1].toFixed(2)}${p.title ? ' · ' + esc(p.title) : ''} <span class="tag${p.phase === 'open' ? ' on' : ''}">${{ open: 'betting open', closed: 'betting closed', settled: 'settled: ' + (p.winner !== undefined ? esc(p.fighters[p.winner].name) : ''), void: 'called off' }[p.phase]}</span><span class="hint"> · ${p.bets.length} ${p.bets.length === 1 ? 'bet' : 'bets'}, ${sep(total(p))} staked (${sep(side(p, 0))} on ${esc(p.fighters[0].name)}, ${sep(side(p, 1))} on ${esc(p.fighters[1].name)})${p.phase === 'open' || p.phase === 'closed' ? ` · pays at most ${sep(Math.max(Math.floor(side(p, 0) * p.odds[0]), Math.floor(side(p, 1) * p.odds[1])))}` : ''}</span></div>${p.phase === 'open' || p.phase === 'closed' ? `<div class="acts">${p.phase === 'open' ? act(p, 'close', 'Close the betting') : ''}${act(p, 'a', esc(p.fighters[0].name) + ' won', 'go')}${act(p, 'b', esc(p.fighters[1].name) + ' won', 'go')}${act(p, 'void', 'Call it off')}</div>` : ''}</li>`).join('')}</ul>` : V.empty('No bouts posted yet.')}
  </div>`;
}

module.exports = { slotsPart, minesPart, plinkoPart, eventPart, eventParts, RULES, ART, BLURB, lastOut, watch, postedCard, EVENT, GLYPH };
