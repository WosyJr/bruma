const V = require('./views');
const TV = require('./townviews');
const I = require('./inn');
const P = require('./innpoker');
const B = require('./innpvp');

const esc = V.esc;
const hidden = V.hidden;
const sep = n => I.septims(n);
const card = TV.card;
const bone = TV.bone;

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const die = (v, cls) => `<span class="die${v ? '' : ' blank'}${cls ? ' ' + cls : ''}"${v ? ` aria-label="${v}"` : ' aria-label="hidden die"'}>${Array.from({ length: 9 }, (_, i) => `<b${v && PIPS[v].includes(i) ? ' class="on"' : ''}></b>`).join('')}</span>`;

const NAME = { duel: 'Bones Duel', bluff: 'Bruma Bluff', poker: 'Hold’em' };
const BLURB = {
  duel: 'Two patrons, three bones, the frost. Each puts down a stake; first to fifty takes both.',
  bluff: 'Two to six around the table, five dice under each cup. Bid, or call liar. Last with dice takes the pot.',
  poker: 'Texas hold’em for two to six. Blinds, side pots and a small house cut. Cash in whenever you rise.'
};
const ART = {
  duel: () => `<div class="bones">${[6, 6, 1].map(bone).join('')}</div>`,
  bluff: () => `<div class="bones">${[1, 4, 4].map(v => die(v)).join('')}</div>`,
  poker: () => `<div class="cards">${['As', 'Kd', '??'].map(card).join('')}</div>`
};

const RULES = {
  duel: `<ul class="irules">
    <li>Each player puts down the same <b>stake</b>. The winner takes both, less the house cut.</li>
    <li>On your turn throw three bones; their total goes into the <b>pot</b>. Throw again, or <b>call it</b> to bank the pot.</li>
    <li>A bone showing one pip is <b>frost</b>: the pot melts and the turn passes.</li>
    <li>Three alike adds <b>+10</b>. First to <b>${B.GOAL}</b> wins.</li>
    <li>When the turn timer runs out your pot is banked for you, or the turn passes. Three in a row and you forfeit.</li>
  </ul>`,
  bluff: `<ul class="irules">
    <li>Everyone antes the same stake and hides <b>five dice</b> under a cup. You see only your own.</li>
    <li>In turn, bid on how many dice <b>around the whole table</b> show a face: “four fives”.</li>
    <li><b>Ones are wild</b> and count as any face. You cannot bid on ones.</li>
    <li>Each bid must be higher: more dice, or the same number of a higher face.</li>
    <li>Or call <b>“Liar!”</b>. Cups come up. If the bid holds, the caller loses a die; if not, the bidder does.</li>
    <li>The loser opens the next round. Lose your last die and you are out. The last with dice takes the pot, less the house cut.</li>
    <li>Run out of time and the table bids or calls for you. Three times and you are out.</li>
  </ul>`,
  poker: `<ul class="irules">
    <li><b>Texas hold’em</b>. Two cards each, five shared on the board. Best five of seven wins.</li>
    <li>The two after the button post the <b>small and big blinds</b>. Heads up, the button is the small blind.</li>
    <li>Fold, check, call, or raise. A raise is at least the size of the last one. <b>All in</b> any time; side pots are made for you.</li>
    <li>Hands rank: high card, pair, two pair, three of a kind, straight, flush, full house, four of a kind, straight flush.</li>
    <li>The house cut comes off pots that see a flop, no more than three big blinds. No flop, no cut.</li>
    <li>Run out of time and you check, or fold. Miss two turns and you sit out; five minutes away and your chips are cashed in for you.</li>
    <li>Leave whenever you like: your chips go straight back to your purse.</li>
  </ul>`
};

function seatsTaken(r) { return r.seats.filter(s => !s.left).length; }

function roomRow(r, me) {
  const at = me ? B.seatOf(r, me) : -1;
  const n = seatsTaken(r);
  const stakeLbl = r.game === 'poker' ? 'buy-in ' + sep(r.stake) + ' · blinds ' + Math.max(1, Math.floor(r.bb / 2)) + '/' + r.bb : 'stake ' + sep(r.stake);
  const status = r.status === 'open' ? `<span class="tag on">waiting · ${n} of ${r.max}</span>` : `<span class="tag">playing · ${n} of ${r.max}</span>`;
  const can = r.status === 'open' || (r.game === 'poker' && n < r.max);
  const go = at >= 0 ? `<a class="btn go small" href="/inn/room/${esc(r.id)}">Back to your seat</a>` : `<a class="btn ${can ? 'go' : 'ghost'} small" href="/inn/room/${esc(r.id)}">${can ? 'Sit down' : 'Watch'}</a>`;
  return `<li class="roomrow"><div><span class="tag">${esc(NAME[r.game])}</span> <b>${esc(r.title)}</b> ${status}<span class="hint"> · ${stakeLbl} · ${r.seats.filter(s => !s.left).map(s => esc(s.name)).join(', ')}</span></div><div class="acts">${go}</div></li>`;
}

function backPage(d) {
  const seated = d.patron && d.patron.status === 'seated';
  const me = seated ? d.patron.id : '';
  const mine = me ? B.liveRoomOf(me) : null;
  const h = d.house;
  const open = d.open;
  const form = g => {
    const lim = h.limits[g];
    const extra = g === 'poker'
      ? `<label>Big blind<input name="bb" inputmode="numeric" value="${Math.max(2, Math.floor(Math.max(lim.min, 200) / 50))}" aria-label="Big blind"></label><label>Seats<select name="seats">${[2, 3, 4, 5, 6].map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`
      : (g === 'bluff' ? `<label>Seats<select name="seats">${[2, 3, 4, 5, 6].map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : '');
    return `<form method="post" action="/inn/back/open" class="openform">${hidden(d.csrf)}<input type="hidden" name="game" value="${g}">
      <label>${g === 'poker' ? 'Buy-in' : 'Stake each'}<input name="stake" inputmode="numeric" value="${Math.min(lim.max, Math.max(lim.min, g === 'poker' ? 200 : 50))}" aria-label="${g === 'poker' ? 'Buy-in' : 'Stake'}"></label>
      ${extra}
      <label class="wide">Name the table <span class="hint">optional</span><input name="title" maxlength="40" placeholder="${esc(d.patron ? d.patron.name : 'Your')}’s table"></label>
      <button class="btn go" type="submit"${!seated || mine || !d.patron.purse ? ' disabled' : ''}>Open a table</button>
      <span class="hint">${sep(lim.min)} to ${sep(lim.max)}</span>
    </form>`;
  };
  return `<section class="stack backroom">
  <div class="card lobbyhead innseated">
    <div class="eyebrow"><a href="/inn">The Jerall View Inn</a></div>
    <h2>The back room</h2>
    <p class="lede">Patron against patron. Your stake leaves your purse when you sit down and the winner’s pot goes straight back into theirs. The house keeps ${h.rake}% of each pot and nothing else.</p>
    ${seated ? '' : '<p class="emptypurse">Only seated patrons may play here. <a href="/inn">Ask for a seat at the door.</a></p>'}
    ${mine ? `<p class="backnow">You are sitting at <b>${esc(mine.title)}</b> (${esc(NAME[mine.game])}). <a class="btn go small" href="/inn/room/${esc(mine.id)}">Back to your seat</a></p>` : ''}
  </div>
  <div class="card"><h3>Tables in the back room</h3>${open.length ? `<ul class="plist rooms" data-rooms>${open.map(r => roomRow(r, me)).join('')}</ul>` : V.empty('No tables are open. Open one below and wait for a challenger.')}</div>
  <div class="lobbytables three">${['duel', 'bluff', 'poker'].map(g => `<div class="tablecard"${seated ? '' : ' data-shut'}>${ART[g]()}<h3>${NAME[g]}</h3><p>${BLURB[g]}</p>${form(g)}</div>`).join('')}</div>
  ${d.recent.length ? `<div class="card"><h3>Lately in the back room</h3><ul class="plog">${d.recent.map(r => `<li><span>${esc(V.when(r.updated))}</span><span><span class="tag">${esc(NAME[r.game])}</span> ${r.result && r.result.winners && r.result.winners.length ? `<b>${esc(r.seats.filter(s => r.result.winners.includes(s.pid)).map(s => s.name).join(' and '))}</b> took ${sep(r.result.amount)} from ${r.seats.length} players` : esc(r.title) + ' broke up'}</span></li>`).join('')}</ul></div>` : ''}
</section>`;
}

function timer(r, mine) {
  if (!r.deadline || r.status !== 'playing') return '';
  const left = Math.max(0, Math.round((r.deadline - Date.now()) / 1000));
  return `<div class="pvtimer${mine ? ' mine' : ''}" data-deadline="${r.deadline}" data-total="${(r.turn || 45) * 1000}" data-now="${Date.now()}"><i style="width:${Math.min(100, Math.round(left / (r.turn || 45) * 100))}%"></i><span data-left>${left}s</span></div>`;
}

const form = (d, r, what, inner, cls) => `<form method="post" action="/inn/room/${esc(r.id)}/${what}" data-room class="${cls || 'inl'}">${hidden(d.csrf)}${inner}</form>`;

function openPart(d, r, idx) {
  const n = seatsTaken(r);
  const host = r.host === d.me;
  const lines = r.seats.filter(s => !s.left).map(s => `<li><b>${esc(s.name)}</b>${s.pid === r.host ? ' <span class="tag">opened it</span>' : ''}${r.game === 'poker' ? `<span class="hint"> · ${sep(s.stack)} in chips</span>` : `<span class="hint"> · ${sep(r.stake)} down</span>`}</li>`).join('');
  let ctrl = '';
  if (idx >= 0) {
    ctrl = (r.game !== 'duel' && host ? form(d, r, 'start', `<button class="btn go" type="submit"${n < 2 ? ' disabled' : ''}>Deal them in (${n} at the table)</button>`) : `<span class="hint">${r.game === 'duel' ? 'The duel starts the moment a challenger sits down.' : 'The one who opened the table deals once enough have sat down.'}</span>`)
      + form(d, r, 'leave', '<button class="btn ghost" type="submit">Take my stake back and leave</button>');
  } else if (d.canSit) {
    ctrl = form(d, r, 'join', `<button class="btn go" type="submit">Sit down for ${sep(r.stake)}</button>`);
  }
  return `<div class="felt pvwait">
    <p class="say">${r.game === 'duel' ? 'Waiting for a challenger.' : 'Waiting for players. ' + n + ' of ' + r.max + ' seats taken.'}</p>
    <ul class="pvlist">${lines}</ul>
    <div class="iacts">${ctrl}</div>
  </div>`;
}

function duelPart(d, r, idx) {
  const st = r.st;
  const seatHtml = i => {
    const s = r.seats[i];
    const sc = st.scores[i];
    return `<div class="iseat${st.turn === i && r.status === 'playing' ? ' turn' : ''}${st.winner === i ? ' winner' : ''}"><span class="lbl">${esc(s.name)}${i === idx ? ' · you' : ''}</span><span class="score">${sc}</span><span class="of">of ${B.GOAL}</span><span class="track"><i style="width:${Math.min(100, Math.round(sc / B.GOAL * 100))}%"></i></span></div>`;
  };
  const dice = st.last && st.last.length ? st.last : [0, 0, 0];
  let ctrl = '';
  if (r.status === 'playing' && idx >= 0 && st.turn === idx) ctrl = form(d, r, 'throw', `<button class="btn go" type="submit" data-key="t">Throw the bones <kbd>T</kbd></button><button class="btn ghost" type="submit" formaction="/inn/room/${esc(r.id)}/bank" data-key="c"${st.pot ? '' : ' disabled'}>Call it <kbd>C</kbd></button>`, 'iacts');
  else if (r.status === 'playing') ctrl = `<p class="hint">${esc(r.seats[st.turn].name)} is throwing.</p>`;
  return `<div class="itable">
    ${seatHtml(0)}
    <div class="imid">
      <div class="bones" data-dice>${dice.map(bone).join('')}</div>
      <div class="pot">THIS POT <b>${st.pot}</b> · AT STAKE <b>${sep(r.stake * 2)}</b></div>
      ${timer(r, st.turn === idx)}
      ${ctrl}
      <p class="say" data-say aria-live="polite">${esc(st.say)}</p>
    </div>
    ${seatHtml(1)}
  </div>`;
}

function minBid(r) {
  const b = r.st.bid;
  if (!b) return { q: 1, f: 2 };
  return b.f < 6 ? { q: b.q, f: b.f + 1 } : { q: b.q + 1, f: 2 };
}

function bluffPart(d, r, idx) {
  const st = r.st;
  const eye = d.keeperEye;
  const seats = r.seats.map((s, i) => {
    const show = i === idx || eye || r.status === 'done';
    const turn = r.status === 'playing' && st.turn === i;
    const dice = s.out ? '' : (show ? s.dice.map(v => die(v, v === 1 ? 'wild' : '')).join('') : Array.from({ length: s.n }, () => '<span class="cup" aria-hidden="true"></span>').join(''));
    return `<div class="pvseat${turn ? ' turn' : ''}${s.out ? ' out' : ''}${st.winner === i ? ' winner' : ''}">
      <div class="pvname"><b>${esc(s.name)}</b>${i === idx ? ' <span class="tag">you</span>' : ''}${s.left ? ' <span class="tag">left</span>' : (s.out ? ' <span class="tag">out</span>' : '')}</div>
      <div class="pvdice${show ? ' shown' : ''}">${dice || '<span class="hint">no dice</span>'}</div>
      <div class="hint">${s.out ? 'out' : s.n + (s.n === 1 ? ' die' : ' dice')}${st.bid && st.bid.by === i ? ' · bid ' + st.bid.q + ' × ' + st.bid.f : ''}</div>
    </div>`;
  }).join('');
  const bid = st.bid ? `<div class="pvbid"><span class="lbl">The bid</span><b>${st.bid.q}</b><span class="x">×</span>${die(st.bid.f)}<span class="hint">by ${esc(r.seats[st.bid.by].name)}</span></div>` : `<div class="pvbid empty"><span class="lbl">Round ${st.round || 1}</span><span class="hint">No bid yet</span></div>`;
  let ctrl = '';
  if (r.status === 'playing' && idx >= 0 && st.turn === idx) {
    const m = minBid(r);
    ctrl = form(d, r, 'bid', `<div class="bidpick">
        <label class="bidq">How many<input name="q" type="number" min="1" max="${B.totalDice(r)}" value="${m.q}" inputmode="numeric" data-keep></label>
        <fieldset class="bidf"><legend class="lbl">Of which face</legend>${[2, 3, 4, 5, 6].map(f => `<label class="facepick"><input type="radio" name="f" value="${f}"${f === m.f ? ' checked' : ''} data-keep>${die(f)}</label>`).join('')}</fieldset>
      </div>
      <div class="iacts"><button class="btn go" type="submit" data-key="b">Bid <kbd>B</kbd></button>${st.bid ? `<button class="btn bad" type="submit" formaction="/inn/room/${esc(r.id)}/liar" data-key="l">Liar! <kbd>L</kbd></button>` : ''}</div>`, 'bidform');
  } else if (r.status === 'playing') ctrl = `<p class="hint">${esc(r.seats[st.turn].name)} is thinking. ${B.totalDice(r)} dice under the cups.</p>`;
  const rv = st.reveal;
  const reveal = rv ? `<div class="pvreveal"><div class="lbl">Round ${rv.round}: ${esc(r.seats[rv.caller].name)} called liar on ${rv.bid.q} × ${rv.bid.f}. There were <b>${rv.count}</b>.</div>${rv.dice.map((x, i) => x.dice.length ? `<div class="rvrow${i === rv.loser ? ' lost' : ''}"><span>${esc(x.name)}</span><span class="rvdice">${x.dice.map(v => die(v, v === rv.bid.f || v === 1 ? 'hit' : 'miss')).join('')}</span></div>` : '').join('')}</div>` : '';
  return `<div class="felt pvfelt">
    <div class="pvseats">${seats}</div>
    ${bid}
    ${timer(r, st.turn === idx)}
    ${ctrl}
    <p class="say" data-say aria-live="polite">${esc(st.say)}</p>
    ${reveal}
  </div>`;
}

function pokerPart(d, r, idx) {
  const st = r.st;
  const eye = d.keeperEye;
  const liveHand = P.live(st);
  const shown = {};
  if (st.last && !liveHand) (st.last.shown || []).forEach(x => { shown[x.name] = x; });
  const btn = r.seats.findIndex(s => s.pid === st.buttonPid);
  const pot = r.seats.reduce((n, s) => n + (s.inHand ? (s.contrib || 0) : 0), 0);
  const board = liveHand ? st.board : (st.last ? st.last.board : []);
  const best = {};
  if (!liveHand && st.last) { const top = ((st.last.winners || [])[0] || {}).names || []; (st.last.shown || []).filter(x => top.includes(x.name)).forEach(x => (x.best || []).forEach(c => { best[c] = 1; })); }
  const seats = r.seats.map((s, i) => {
    if (s.left && !s.inHand) return '';
    const turn = liveHand && st.toAct === i;
    const sh = shown[s.name];
    let cards = '';
    if (s.hole && s.hole.length && s.inHand) {
      if (sh) cards = sh.hole.map(c => card(c).replace('class="pcard', 'class="pcard' + (best[c] ? ' best' : ''))).join('');
      else if (i === idx || eye) cards = s.folded && i !== idx && !eye ? '' : s.hole.map(card).join('');
      else if (!s.folded) cards = card('??') + card('??');
    }
    const tags = [btn === i ? '<span class="pkdealer" title="Dealer button">D</span>' : '', liveHand && st.sb === i ? '<span class="tag">SB</span>' : '', liveHand && st.bbi === i ? '<span class="tag">BB</span>' : '', s.folded && s.inHand ? '<span class="tag">folded</span>' : '', s.allin ? '<span class="tag on">all in</span>' : '', s.away && !s.left ? '<span class="tag warn">away</span>' : '', s.left ? '<span class="tag">left</span>' : '', !s.inHand && !s.left && s.stack > 0 && liveHand ? '<span class="tag">next hand</span>' : '', !s.left && s.stack <= 0 && !liveHand ? '<span class="tag">no chips</span>' : ''].join('');
    return `<div class="pkseat${turn ? ' turn' : ''}${s.folded && s.inHand ? ' folded' : ''}${i === idx ? ' me' : ''}${s.won ? ' winner' : ''}">
      <div class="pvname"><b>${esc(s.name)}</b>${i === idx ? ' <span class="tag">you</span>' : ''}</div>
      <div class="pkcards${i === idx ? ' mine' : ''}">${cards || '<span class="pcard ghost"></span><span class="pcard ghost"></span>'}</div>
      <div class="pkstack">${sep(s.stack)}${s.bet ? ` <span class="pkbet">${sep(s.bet)}</span>` : ''}${!liveHand && s.won ? ` <span class="pkwon">+${sep(s.won)}</span>` : ''}</div>
      <div class="pktags">${tags}${sh ? `<span class="hint">${esc(sh.desc)}</span>` : ''}</div>
    </div>`;
  }).join('');
  let ctrl = '';
  const can = idx >= 0 ? P.canDo(r, idx) : null;
  if (r.status === 'playing' && can) {
    ctrl = form(d, r, 'fold', `<div class="iacts">
      <button class="btn ghost" type="submit" data-key="f">Fold <kbd>F</kbd></button>
      ${can.check ? `<button class="btn go" type="submit" formaction="/inn/room/${esc(r.id)}/check" data-key="k">Check <kbd>K</kbd></button>` : `<button class="btn go" type="submit" formaction="/inn/room/${esc(r.id)}/call" data-key="c">Call ${sep(can.toCall)} <kbd>C</kbd></button>`}
      </div>
      ${can.raise && can.maxTo > st.currentBet ? `<div class="raiserow">
        <label>${can.bet ? 'Bet' : 'Raise to'}<input name="to" type="number" min="${can.minTo}" max="${can.maxTo}" step="1" value="${can.minTo}" inputmode="numeric" data-keep data-raise></label>
        <input type="range" min="${can.minTo}" max="${can.maxTo}" step="1" value="${can.minTo}" aria-label="Raise amount" data-keep data-raiseslide>
        <span class="raisequick">${[['½ pot', Math.floor(pot / 2)], ['Pot', pot]].map(([l, v]) => { const to = Math.min(can.maxTo, Math.max(can.minTo, st.currentBet + v)); return `<button type="button" class="chipbtn" data-raiseto="${to}">${l}</button>`; }).join('')}</span>
        <button class="btn go" type="submit" formaction="/inn/room/${esc(r.id)}/raise" data-key="r">${can.bet ? 'Bet' : 'Raise'} <kbd>R</kbd></button>
        <button class="btn bad" type="submit" formaction="/inn/room/${esc(r.id)}/allin" data-key="a">All in ${sep(can.maxTo)} <kbd>A</kbd></button>
      </div>` : ''}`, 'pkform');
  } else if (r.status === 'playing' && liveHand && st.toAct >= 0) {
    ctrl = `<p class="hint">${esc(r.seats[st.toAct].name)} to act.</p>`;
  } else if (r.status === 'playing' && !liveHand) {
    ctrl = `<p class="hint" data-nextat="${st.nextAt || 0}">${P.players(r).length >= 2 ? 'The next hand is being dealt…' : 'Waiting for a second player with chips.'}</p>`;
  }
  const extra = [];
  if (idx >= 0 && r.status === 'playing') {
    const me = r.seats[idx];
    if (me.away) extra.push(form(d, r, 'back', '<button class="btn go small" type="submit">I’m back: deal me in</button>'));
    if (me.stack <= 0 && !(liveHand && me.inHand && !me.folded)) extra.push(form(d, r, 'rebuy', `<button class="btn go small" type="submit">Buy in again for ${sep(r.stake)}</button>`));
  }
  const slots = Array.from({ length: 5 }, (_, i) => board[i] ? card(board[i]).replace('class="pcard', 'class="pcard' + (best[board[i]] ? ' best' : '')) : '<span class="pcard ghost"></span>').join('');
  return `<div class="felt pkfelt">
    <div class="pkseats">${seats}</div>
    <div class="pkboard"><div class="cards" data-board>${slots}</div><div class="pot">${liveHand ? 'POT' : (st.last ? 'HAND ' + st.last.hand : 'POT')} <b>${sep(liveHand ? pot : (st.last ? st.last.total - st.last.rake : 0))}</b>${!liveHand && st.last && st.last.rake ? ` <span class="hint">house kept ${sep(st.last.rake)}</span>` : ''}</div></div>
    ${timer(r, liveHand && st.toAct === idx)}
    ${ctrl}
    ${extra.length ? `<div class="iacts">${extra.join('')}</div>` : ''}
    <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
  </div>`;
}

function donePart(r) {
  const res = r.result || {};
  if (res.empty || !(res.winners && res.winners.length)) return `<div class="pvdone"><p>The table broke up. Every stake went back.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
  const names = r.seats.filter(s => res.winners.includes(s.pid)).map(s => s.name).join(' and ');
  return `<div class="pvdone won"><p><b>${esc(names)}</b> takes ${sep(res.amount)}${res.rake ? ` <span class="hint">(the house kept ${sep(res.rake)} of ${sep(res.total)})</span>` : ''}.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
}

function roomPart(d, r) {
  const idx = d.me ? B.seatOf(r, d.me) : -1;
  let body;
  if (r.status === 'open') body = openPart(d, r, idx);
  else if (r.game === 'duel') body = duelPart(d, r, idx);
  else if (r.game === 'bluff') body = bluffPart(d, r, idx);
  else body = pokerPart(d, r, idx);
  const sit = r.status === 'playing' && r.game === 'poker' && idx < 0 && d.canSit && seatsTaken(r) < r.max ? form(d, r, 'join', `<button class="btn go small" type="submit">Sit down with ${sep(r.stake)}</button>`) : '';
  const leave = idx >= 0 && r.status === 'playing' ? form(d, r, 'leave', `<button class="btn ghost small" type="submit">${r.game === 'poker' ? 'Cash in and leave' : 'Forfeit and leave'}</button>`) : '';
  const watching = idx < 0 ? `<p class="hint watching">${d.keeperEye ? 'Keeper’s eye: you see every hand at this table.' : 'You are watching.'}</p>` : '';
  return `${body}${r.status === 'done' ? donePart(r) : ''}<div class="pvfoot">${watching}${sit}${leave}</div>`;
}

function chatPart(r) {
  return r.chat.length ? r.chat.slice(-25).map(c => `<div><b>${esc(c.name)}</b> ${esc(c.text)}</div>`).join('') : '<div class="hint">Nobody has said anything yet.</div>';
}
function logPart(r) { return r.log.map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>The table is laid.</div>'; }

function roomPage(d, r) {
  const idx = d.me ? B.seatOf(r, d.me) : -1;
  const talk = r.seats.some(s => s.pid === d.me);
  return `<section class="innwrap">
  <div class="inn" id="room" data-room="${esc(r.id)}" data-v="${r.v}" data-ev="${(r.ev || {}).n || 0}" data-me="${idx}">
    <div class="innhead">
      <div><div class="eyebrow"><a href="/inn">The Jerall View Inn</a> · <a href="/inn/back">The back room</a></div><h2>${esc(r.title)}</h2><span class="hint">${esc(NAME[r.game])} · ${r.game === 'poker' ? 'buy-in ' + sep(r.stake) + ' · blinds ' + Math.max(1, Math.floor(r.bb / 2)) + '/' + r.bb : 'stake ' + sep(r.stake) + ' each'} · house cut ${r.rake}% · ${r.turn}s a turn</span></div>
      <div class="innwho">${d.patron && d.patron.status === 'seated' ? `<span class="pmini">Purse <b data-purse>${sep(d.patron.purse)}</b></span>` : ''}</div>
    </div>
    <div id="roomtbl">${roomPart(d, r)}</div>
    <div class="ilog" data-roomlog>${logPart(r)}</div>
  </div>
  <div class="innside">
    <section class="card tight"><div class="eyebrow" style="margin-bottom:10px">Table talk</div><div class="pvchat" data-chat>${chatPart(r)}</div>${talk ? `<form method="post" action="/inn/room/${esc(r.id)}/say" data-say-form class="pvsay">${hidden(d.csrf)}<input name="text" maxlength="200" autocomplete="off" placeholder="Say something" aria-label="Say something"><button class="btn ghost small" type="submit">Say</button></form>` : ''}</section>
    <section class="card tight"><div class="eyebrow" style="margin-bottom:10px">The rules</div>${RULES[r.game]}<p class="hint">Every card and die is drawn on the server by a cryptographic random draw. You see only your own.</p></section>
  </div>
</section>
<script src="/inn.js?v=${V.stamp('inn.js')}" defer></script><script src="/innroom.js?v=${V.stamp('innroom.js')}" defer></script>`;
}

function liveBack(list) {
  if (!list.length) return '';
  return list.map(x => `<section class="livecard"><div class="livehead"><b>${esc(x.r.title)}</b><span class="tag">${esc(NAME[x.r.game])}</span><span class="sp"></span><a class="hint" href="/inn/room/${esc(x.r.id)}">Watch at the table</a></div><div class="inn livefelt">${x.html}</div></section>`).join('');
}

module.exports = { NAME, RULES, backPage, roomPage, roomPart, chatPart, logPart, liveBack, roomRow };
