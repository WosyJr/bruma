const V = require('./views');
const TV = require('./townviews');
const I = require('./inn');
const P = require('./innpoker');
const B = require('./innpvp');
const L = require('./innlong');
const M = require('./innmorris');
const Rc = require('./innrace');
const Dr = require('./inndraughts');
const J = require('./innjack');

const esc = V.esc;
const hidden = V.hidden;
const sep = n => I.septims(n);
const card = TV.card;
const bone = TV.bone;

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const die = (v, cls) => `<span class="die${v ? '' : ' blank'}${cls ? ' ' + cls : ''}"${v ? ` aria-label="${v}"` : ' aria-label="hidden die"'}>${Array.from({ length: 9 }, (_, i) => `<b${v && PIPS[v].includes(i) ? ' class="on"' : ''}></b>`).join('')}</span>`;

const NAME = { duel: 'Bones Duel', bluff: 'Bruma Bluff', poker: 'Hold’em', long: 'The Long Table', morris: 'Nine Men’s Morris', coin: 'The Coin Toss', rps: 'Hammer, Shield, Spell', race: 'The Pale Pass Race', draughts: 'Draughts' };
const BLURB = {
  duel: 'Two patrons, three bones, the frost. Each puts down a stake; first to fifty takes both.',
  bluff: 'Two to six around the table, five dice under each cup. Bid, or call liar. Last with dice takes the pot.',
  poker: 'Texas hold’em for two to six. Blinds, side pots and a small house cut. Cash in whenever you rise.',
  long: 'Blackjack against Brannoc with up to five at one table. Everyone’s cards face up, bets each round.',
  morris: 'The old board game. Make mills, take their pieces. Skill, not luck, for a stake each.',
  coin: 'Best of five on a fair coin. The call goes back and forth; first to three takes both stakes.',
  rps: 'Hammer breaks spell, spell melts shield, shield blocks hammer. Choose in secret, best of three or five.',
  race: 'Two to four race four travellers each from Bruma’s gate over the pass to Sovngarde. Draw a card, move, and send rivals home.',
  draughts: 'Checkers for two. Captures are forced, jumps chain, and a man that reaches the far side is crowned.'
};
const ART = {
  duel: () => `<div class="bones">${[6, 6, 1].map(bone).join('')}</div>`,
  bluff: () => `<div class="bones">${[1, 4, 4].map(v => die(v)).join('')}</div>`,
  poker: () => `<div class="cards">${['As', 'Kd', '??'].map(card).join('')}</div>`,
  long: () => `<div class="cards">${['Ad', 'Js', '9h', '9c'].map(card).join('')}</div>`,
  morris: () => morrisSvg(M.fresh().board.map((x, i) => [0, 4, 9, 13, 19].includes(i) ? 0 : ([2, 7, 10, 16].includes(i) ? 1 : -1)), null, 'mini'),
  coin: () => `<div class="coins"><span class="coin heads">◉</span><span class="coin tails">✦</span></div>`,
  rps: () => `<div class="hss">${['hammer', 'shield', 'spell'].map(k => hssIcon(k)).join('')}</div>`,
  race: () => `<div class="racecards">${['dragon', '12', 'swap'].map(c => raceCard(c, 'mini')).join('')}</div>`,
  draughts: () => draughtsSvg(Dr.fresh(0), 0, 'mini')
};

const RCOL = ['#7FB2D9', '#D9643A', '#5FA36A', '#E3B341'];
function raceCard(id, cls) {
  const c = Rc.CARD[id];
  if (!c) return `<span class="rcard back${cls ? ' ' + cls : ''}"><b>✦</b></span>`;
  const big = { dragon: '🐉', swap: '⇄', b4: '−4' }[id] || id;
  return `<span class="rcard c-${id}${cls ? ' ' + cls : ''}"><i>${esc(c.name)}</i><b>${big === '🐉' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15c3-1 5-4 6-8 2 3 4 4 7 4l-2 2 5 1-4 2 2 3c-3 0-5-1-7-3-2 1-4 1-7-1z"/></svg>' : esc(big)}</b><small>${esc(c.text)}</small></span>`;
}

function raceSvg(r, st, opts) {
  const o = opts || {};
  const C = 30;
  const sideCol = side => { const p = st.sides.indexOf(side); return p >= 0 ? RCOL[side] : '#6E6656'; };
  const sq = (x, y, fill, cls) => `<rect x="${x * C + 1}" y="${y * C + 1}" width="${C - 2}" height="${C - 2}" rx="4" fill="${fill}" class="${cls || ''}"/>`;
  const parts = [];
  for (let t = 0; t < Rc.TRACK; t++) {
    const [x, y] = Rc.coords(0, 'track', t);
    const side = Math.floor(t / Rc.SIDE), k = t % Rc.SIDE;
    const sl = Rc.SLIDES.find(s2 => k >= s2[0] && k <= s2[1]);
    parts.push(sq(x, y, sl ? sideCol(side) : '#E9DFC8', 'rsq' + (sl ? ' slide' : '')));
    if (sl && k === sl[0]) parts.push(`<path d="M${x * C + 8} ${y * C + 8}l14 7-14 7z" fill="#FFF6E2" opacity=".8" transform="rotate(${side * 90} ${x * C + 15} ${y * C + 15})"/>`);
  }
  st.sides.forEach((side, p) => {
    for (let k = 1; k <= Rc.SAFE; k++) { const [x, y] = Rc.coords(side, 'safe', k); parts.push(sq(x, y, RCOL[side], 'rsafe')); }
    const [hx, hy] = Rc.coords(side, 'home', 0, 0);
    parts.push(`<circle cx="${(hx + 0.5) * C}" cy="${(hy + 0.3) * C}" r="${C * 1.05}" fill="${RCOL[side]}" opacity=".55" stroke="${RCOL[side]}" stroke-width="2"/><text x="${(hx + 0.5) * C}" y="${(hy + 0.3) * C + 4}" class="rlabel">Sovngarde</text>`);
    const [gx, gy] = Rc.coords(side, 'gate', 0, 0);
    parts.push(`<rect x="${(gx - 0.45) * C}" y="${(gy - 0.45) * C}" width="${C * 1.9}" height="${C * 1.9}" rx="10" fill="none" stroke="${RCOL[side]}" stroke-width="2" stroke-dasharray="4 3"/>`);
  });
  const hot = new Set((o.hot || []).map(String));
  st.pieces.forEach((ps, p) => {
    if (st.out[p]) return;
    const side = st.sides[p];
    ps.forEach((pc, i) => {
      const [x, y] = Rc.coords(side, pc.where, pc.at, i);
      const cx = (x + 0.5) * C, cy = (y + 0.5) * C;
      const last = st.last && st.last.p === p && st.last.i === i;
      parts.push(`<g class="rpc${hot.has(p + ':' + i) ? ' hot' : ''}${last ? ' last' : ''}"><circle cx="${cx}" cy="${cy}" r="${pc.where === 'home' || pc.where === 'gate' ? 10 : 12}" fill="${RCOL[side]}" stroke="#1E140C" stroke-width="2"/><text x="${cx}" y="${cy + 4}">${i + 1}</text></g>`);
    });
  });
  return `<svg class="raceboard ${o.cls || ''}" viewBox="0 0 ${16 * C} ${16 * C}" role="img" aria-label="The Pale Pass Race board"><rect x="0" y="0" width="${16 * C}" height="${16 * C}" rx="12" class="rbg"/>${parts.join('')}</svg>`;
}

function draughtsSvg(st, flip, cls, opts) {
  const o = opts || {};
  const C = 40;
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const [r, c] = Dr.rc(i);
    const vr = flip ? 7 - r : r, vc = flip ? 7 - c : c;
    const dark = (r + c) % 2 === 1;
    const tgt = (o.targets || []).includes(i), sel = o.sel === i, last = st.last && (st.last.from === i || st.last.to === i);
    cells.push(`<rect x="${vc * C}" y="${vr * C}" width="${C}" height="${C}" class="${dark ? 'dk' : 'lt'}${last ? ' lastsq' : ''}"/>`);
    const pc = st.board[i];
    if (pc) {
      const light = pc.p === 0;
      cells.push(`<g class="dpc ${light ? 'pl' : 'pd'}${pc.k ? ' king' : ''}${sel ? ' sel' : ''}"><circle cx="${vc * C + C / 2}" cy="${vr * C + C / 2}" r="${C * 0.38}"/>${pc.k ? `<path d="M${vc * C + 11} ${vr * C + 25}l3-10 6 6 3-8 3 8 6-6 3 10z" class="crown"/>` : `<circle cx="${vc * C + C / 2}" cy="${vr * C + C / 2}" r="${C * 0.24}" class="ring"/>`}</g>`);
    }
    if (o.live && dark) cells.push(`<rect x="${vc * C}" y="${vr * C}" width="${C}" height="${C}" class="dhit${tgt ? ' tgt' : ''}" data-sq="${i}"/>`);
  }
  return `<svg class="draughts ${cls || ''}" viewBox="0 0 ${8 * C} ${8 * C}" role="img" aria-label="Draughts board">${cells.join('')}</svg>`;
}

const HSS = {
  hammer: '<path d="M6 7h11v6H6z"/><path d="M11.5 13v8"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  spell: '<path d="M12 3l1.8 5.4L19 9l-4.2 3.4L16 18l-4-3-4 3 1.2-5.6L5 9l5.2-.6z"/>'
};
function hssIcon(k, cls) { return `<span class="hssico ${k}${cls ? ' ' + cls : ''}" aria-label="${B.RPSNAME[k]}"><svg viewBox="0 0 24 24" aria-hidden="true">${HSS[k]}</svg><b>${B.RPSNAME[k]}</b></span>`; }

function morrisSvg(board, opts, cls) {
  const o = opts || {};
  const P = i => [20 + M.XY[i][0] * 40, 20 + M.XY[i][1] * 40];
  const lines = [[0, 2], [3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [0, 21], [3, 18], [6, 15], [1, 7], [16, 22], [8, 17], [5, 20], [2, 23]].map(([a, b]) => `<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}"/>`).join('');
  const pts = board.map((x, i) => {
    const [cx, cy] = P(i);
    const sel = o.sel === i, tgt = (o.targets || []).includes(i), take = (o.take || []).includes(i), last = o.last && (o.last.to === i || o.last.at === i);
    const piece = x >= 0 ? `<circle class="mp p${x === (o.light === undefined ? 0 : o.light) ? 'l' : 'd'}${sel ? ' sel' : ''}${take ? ' takeable' : ''}${last ? ' last' : ''}" cx="${cx}" cy="${cy}" r="13"/>` : `<circle class="mpt${tgt ? ' tgt' : ''}" cx="${cx}" cy="${cy}" r="${tgt ? 7 : 4}"/>`;
    return o.live ? `<g class="mpoint" data-pt="${i}" tabindex="0" role="button" aria-label="Point ${i + 1}${x >= 0 ? ', ' + (x === o.light ? 'light' : 'dark') + ' piece' : ', empty'}">${piece}<circle class="hit" cx="${cx}" cy="${cy}" r="18"/></g>` : piece;
  }).join('');
  return `<svg class="morris ${cls || ''}" viewBox="0 0 280 280" role="img" aria-label="Nine Men’s Morris board"><rect x="2" y="2" width="276" height="276" rx="10" class="mboard"/><g class="mlines">${lines}</g>${pts}</svg>`;
}

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
  </ul>`,
  long: `<ul class="irules">
    <li>Blackjack against Brannoc, up to <b>five</b> at the table. Everyone sees everyone’s cards.</li>
    <li>Each round opens for bets for twenty seconds. The cards fall once everyone has bet, or the time is up.</li>
    <li>Blackjack pays <b>6 to 5</b>. Double on any two cards, split pairs up to four hands, surrender your first two cards for half back.</li>
    <li>He shows an ace: insurance for half your bet pays 2 to 1. He peeks for twenty-one before anyone plays.</li>
    <li>Players act in seat order. Run out of time and you stand.</li>
    <li>No house cut: this is Brannoc’s own table, by the house rules.</li>
  </ul>`,
  morris: `<ul class="irules">
    <li>Each player has <b>nine pieces</b>. Take turns placing them on the empty points.</li>
    <li>Three of yours in a line is a <b>mill</b>: take one of their pieces. Pieces in a mill are safe unless every one of theirs is in a mill.</li>
    <li>Once all are placed, move a piece along a line to the next empty point.</li>
    <li>Down to three pieces, you may <b>fly</b> to any empty point.</li>
    <li>Fall to two pieces, or have no move, and you lose. Fifty moves each without a mill is a draw, and the stakes go back.</li>
    <li>Run out of time and the table moves for you. Three times and you forfeit.</li>
  </ul>`,
  coin: `<ul class="irules">
    <li>Best of five. One player calls <b>heads</b> or <b>tails</b>; the coin is tossed on the server by a fair draw.</li>
    <li>Call it right and the point is yours; wrong and it goes to the other. The call passes back and forth.</li>
    <li>First to <b>three</b> takes both stakes, less the house cut.</li>
    <li>Run out of time and the table calls for you. Three times and you forfeit.</li>
  </ul>`,
  race: `<ul class="irules">
    <li>Each player has <b>four travellers</b> at their gate. Get all four over the pass to <b>Sovngarde</b> to win the pot.</li>
    <li>On your turn draw a card from our own deck of forty, then choose a move it allows. If none is possible, the card is lost.</li>
    <li><b>One</b> or <b>Two</b> bring a traveller out of the gate. Two also draws again.</li>
    <li><b>Back Four</b> moves back; going back past your turn-off brings you close to home. <b>Ten</b> is ten forward or one back.</li>
    <li><b>Shadow Swap</b> trades places with a rival on the road, or eleven forward. The <b>Dragon</b> sends a traveller from your gate onto a rival, and the rival goes back to their gate.</li>
    <li>Land on a rival and they go back to their gate. You cannot land on your own.</li>
    <li>Land on the start of another colour’s <b>avalanche</b> and slide to its end, sweeping everyone on it back to their gates.</li>
    <li>The last five squares before Sovngarde are your <b>safe stretch</b>: nobody can touch you there. You need the exact count to get in.</li>
    <li>Run out of time and the table plays for you. Three times and you are out of the race.</li>
  </ul>`,
  draughts: `<ul class="irules">
    <li>Men move one square diagonally forward onto a dark square.</li>
    <li>Jump an enemy piece to take it. <b>If you can take, you must</b>, and a jump that lands where another jump waits must go on.</li>
    <li>A man that reaches the far row is <b>crowned</b> and may move and take backwards too. Being crowned ends the move.</li>
    <li>Take all their pieces, or leave them no move, and you win. Forty moves each without a take or a man moving is a draw, and the stakes go back.</li>
    <li>Run out of time and the table moves for you. Three times and you forfeit.</li>
  </ul>`,
  rps: `<ul class="irules">
    <li>Both choose in secret: <b>Hammer</b>, <b>Shield</b> or <b>Spell</b>. The choices show together.</li>
    <li>Hammer breaks spell. Spell melts shield. Shield blocks hammer.</li>
    <li>The same choice is played again. Win the most rounds of three, or of five, to take both stakes.</li>
    <li>Run out of time without choosing and you lose that round. Three in a row and you forfeit.</li>
  </ul>`
};

function seatsTaken(r) { return r.seats.filter(s => !s.left).length; }

function roomRow(r, me) {
  const at = me ? B.seatOf(r, me) : -1;
  const n = seatsTaken(r);
  const stakeLbl = r.game === 'poker' ? 'buy-in ' + sep(r.stake) + ' · blinds ' + Math.max(1, Math.floor(r.bb / 2)) + '/' + r.bb : (r.game === 'long' ? 'bets each round' : 'stake ' + sep(r.stake) + (r.game === 'rps' ? ' · best of ' + (r.bestof || 3) : ''));
  const status = r.status === 'open' ? `<span class="tag on">waiting · ${n} of ${r.max}</span>` : `<span class="tag">playing · ${n} of ${r.max}</span>`;
  const can = r.status === 'open' || ((r.game === 'poker' || r.game === 'long') && n < r.max);
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
    if (g === 'long') return `<form method="post" action="/inn/back/open" class="openform">${hidden(d.csrf)}<input type="hidden" name="game" value="long">
      <label>Seats<select name="seats">${[1, 2, 3, 4, 5].map(n => `<option${n === 5 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="wide">Name the table <span class="hint">optional</span><input name="title" maxlength="40" placeholder="The Long Table"></label>
      <button class="btn go" type="submit"${!seated || mine || !d.patron.purse ? ' disabled' : ''}>Pull up a chair</button>
      <span class="hint">Bets from ${sep(lim.min)} each round, no limit. No stake to sit.</span>
    </form>`;
    const extra = g === 'rps' ? `<label>Best of<select name="bestof"><option>3</option><option>5</option></select></label>` : g === 'poker'
      ? `<label>Big blind<input name="bb" inputmode="numeric" value="${Math.max(2, Math.floor(Math.max(lim.min, 200) / 50))}" aria-label="Big blind"></label><label>Seats<select name="seats">${[2, 3, 4, 5, 6].map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`
      : (g === 'bluff' ? `<label>Seats<select name="seats">${[2, 3, 4, 5, 6].map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : (g === 'race' ? `<label>Seats<select name="seats">${[2, 3, 4].map(n => `<option${n === 4 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''));
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
  <div class="lobbytables three">${['long', 'poker', 'race', 'draughts', 'bluff', 'duel', 'morris', 'coin', 'rps'].map(g => `<div class="tablecard"${seated ? '' : ' data-shut'}>${ART[g]()}<h3>${NAME[g]}</h3><p>${BLURB[g]}</p>${form(g)}</div>`).join('')}</div>
  ${d.recent.length ? `<div class="card"><h3>Lately in the back room</h3><ul class="plog">${d.recent.map(r => `<li><span>${esc(V.when(r.updated))}</span><span><span class="tag">${esc(NAME[r.game])}</span> ${r.result && r.result.winners && r.result.winners.length ? `<b>${esc(r.seats.filter(s => r.result.winners.includes(s.pid)).map(s => s.name).join(' and '))}</b> took ${sep(r.result.amount)} from ${r.seats.length} players` : esc(r.title) + ' broke up'}</span></li>`).join('')}</ul></div>` : ''}
</section>`;
}

function timer(r, mine) {
  if (!r.deadline || r.status !== 'playing') return '';
  const left = Math.max(0, Math.round((r.deadline - Date.now()) / 1000));
  const ph = r.game === 'long' ? r.st.phase : '';
  const total = ph === 'betting' ? L.BETWIN : (ph === 'done' ? L.PAUSE : (ph === 'insurance' ? 15000 : (r.turn || 45) * 1000));
  return `<div class="pvtimer${mine ? ' mine' : ''}" data-deadline="${r.deadline}" data-total="${total}" data-now="${Date.now()}"><i style="width:${Math.min(100, Math.round(left * 1000 / total * 100))}%"></i><span data-left>${left}s</span></div>`;
}

const form = (d, r, what, inner, cls) => `<form method="post" action="/inn/room/${esc(r.id)}/${what}" data-room class="${cls || 'inl'}">${hidden(d.csrf)}${inner}</form>`;

function openPart(d, r, idx) {
  const n = seatsTaken(r);
  const host = r.host === d.me;
  const lines = r.seats.filter(s => !s.left).map(s => `<li><b>${esc(s.name)}</b>${s.pid === r.host ? ' <span class="tag">opened it</span>' : ''}${r.game === 'poker' ? `<span class="hint"> · ${sep(s.stack)} in chips</span>` : `<span class="hint"> · ${sep(r.stake)} down</span>`}</li>`).join('');
  let ctrl = '';
  if (idx >= 0) {
    ctrl = (!B.TWO.includes(r.game) && host ? form(d, r, 'start', `<button class="btn go" type="submit"${n < 2 ? ' disabled' : ''}>Deal them in (${n} at the table)</button>`) : `<span class="hint">${B.TWO.includes(r.game) ? 'It starts the moment a challenger sits down.' : 'The one who opened the table deals once enough have sat down.'}</span>`)
      + form(d, r, 'leave', '<button class="btn ghost" type="submit">Take my stake back and leave</button>');
  } else if (d.canSit) {
    ctrl = form(d, r, 'join', `<button class="btn go" type="submit">Sit down for ${sep(r.stake)}</button>`);
  }
  return `<div class="felt pvwait">
    <p class="say">${B.TWO.includes(r.game) ? 'Waiting for a challenger.' : 'Waiting for players. ' + n + ' of ' + r.max + ' seats taken.'}</p>
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

function longPart(d, r, idx) {
  const st = r.st;
  const lim = d.house.limits.long;
  const dealer = st.dealer || [];
  const dcards = dealer.length ? dealer.map((c, i) => i === 1 && st.hole ? card('??') : card(c)).join('') : '<span class="pcard ghost"></span><span class="pcard ghost"></span>';
  const dt = dealer.length ? (st.hole ? J.total([dealer[0]]).n : J.total(dealer).n) : '';
  const tag = { win: 'Won', lose: 'Lost', push: 'Push', bust: 'Bust', surrender: 'Surrendered', blackjack: 'Blackjack' };
  const seats = r.seats.map((s, i) => {
    if (s.left && !(s.hands && s.hands.length)) return '';
    const active = st.phase === 'play' && st.active && st.active.seat === i;
    const hands = (s.hands || []).map((h, k) => { const t = J.total(h.cards); return `<div class="lhand${active && st.active.hand === k ? ' active' : ''}${h.result ? ' r-' + h.result : ''}"><div class="cards">${h.cards.map(card).join('')}</div><div class="hmeta"><b>${(t.soft && t.n < 21 ? 'soft ' : '') + t.n}</b> · ${sep(h.bet)}${h.doubled ? ' · doubled' : ''}${h.result ? ' · <em>' + tag[h.result] + '</em>' : ''}</div></div>`; }).join('');
    const state = st.phase === 'betting' ? (s.bet ? `bet ${sep(s.bet)}` : 'no bet yet') : (s.hands && s.hands.length ? (st.phase === 'done' ? (s.returned > s.staked ? '+' + sep(s.returned - s.staked) : (s.returned === s.staked ? 'even' : '−' + sep(s.staked - s.returned))) : (s.ins ? 'insured ' + sep(s.ins) : '')) : 'sitting out');
    return `<div class="lseat${active ? ' turn' : ''}${i === idx ? ' me' : ''}${st.phase === 'done' && s.returned > s.staked ? ' winner' : ''}"><div class="pvname"><b>${esc(s.name)}</b>${i === idx ? ' <span class="tag">you</span>' : ''}${s.left ? ' <span class="tag">left</span>' : ''}</div>${hands || '<div class="cards"><span class="pcard ghost"></span></div>'}<div class="hint">${state}</div>${s.sides && s.sides.lines.length ? `<div class="hint sidenote">${s.sides.lines.map(l => esc(l.name) + ' ' + sep(l.amount) + (l.won ? ': ' + esc(l.label) + ' → ' + sep(l.ret) : ': lost')).join(' · ')}</div>` : (st.phase === 'betting' && s.sideBet ? `<div class="hint sidenote">side bets ${sep((s.sideBet.pp || 0) + (s.sideBet.t3 || 0))}</div>` : '')}</div>`;
  }).join('');
  let ctrl = '';
  const me = idx >= 0 ? r.seats[idx] : null;
  if (me && st.phase === 'betting' && !me.bet) {
    const chips = [lim.min, lim.min * 5, lim.min * 20, lim.min * 100].filter((v, i, a) => v <= lim.max && a.indexOf(v) === i);
    ctrl = form(d, r, 'bet', `<div class="stakerow"><label class="stake">Bet<input name="amount" inputmode="numeric" value="${lim.min}" data-keep data-stake aria-label="Bet in septims"></label><span class="chips">${chips.map(v => `<button type="button" class="chipbtn" data-chip="${v}">${sep(v)}</button>`).join('')}</span><span class="sidebets"><label class="stake side">Perfect Pairs<input name="pp" inputmode="numeric" placeholder="0" data-keep aria-label="Perfect Pairs side bet"></label><label class="stake side">21+3<input name="t3" inputmode="numeric" placeholder="0" data-keep aria-label="21+3 side bet"></label></span><button class="btn go" type="submit" data-key="b">Bet <kbd>B</kbd></button></div>`, 'iacts');
  } else if (me && st.phase === 'insurance' && me.hands && me.hands.length && (me.insured === null || me.insured === undefined)) {
    ctrl = form(d, r, 'insure', `<button class="btn go" type="submit" data-key="i">Insure for ${sep(Math.floor(me.bet / 2))} <kbd>I</kbd></button><button class="btn ghost" type="submit" formaction="/inn/room/${esc(r.id)}/noinsure" data-key="n">No insurance <kbd>N</kbd></button>`, 'iacts');
  } else if (me && st.phase === 'play') {
    const can = L.canDo(r, idx);
    if (can) {
      const b = (what, label, key, on, cls) => `<button class="btn ${cls || 'ghost'}" type="submit" formaction="/inn/room/${esc(r.id)}/${what}" data-key="${key}"${on ? '' : ' disabled'}>${label} <kbd>${key.toUpperCase()}</kbd></button>`;
      ctrl = form(d, r, 'hit', b('hit', 'Hit', 'h', true, 'go') + b('stand', 'Stand', 's', true) + b('double', 'Double', 'd', can.double) + b('split', 'Split', 'p', can.split) + b('surrender', 'Surrender', 'r', can.surrender), 'iacts');
    }
  }
  const wait = st.phase === 'betting' ? `<p class="hint">Round ${st.round || 1}. ${r.seats.filter(s => !s.left && s.bet).length} of ${r.seats.filter(s => !s.left).length} have bet. The cards fall when everyone has, or the time is up.</p>` : '';
  return `<div class="felt longfelt">
    <div class="dealer"><div class="hlabel"><span>${esc(I.KEEPER)}</span><b>${dt}</b></div><div class="cards" data-board>${dcards}</div></div>
    ${timer(r, (st.phase === 'play' && st.active && st.active.seat === idx) || (st.phase === 'betting' && me && !me.bet) || (st.phase === 'insurance' && me && me.insured === null))}
    ${ctrl}
    ${wait}
    <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
    <div class="lseats">${seats}</div>
  </div>`;
}

function morrisPart(d, r, idx) {
  const st = r.st;
  const light = st.light === undefined ? 0 : st.light;
  const mine = r.status === 'playing' && idx >= 0 && st.turn === idx && st.winner < 0 && !st.draw;
  const ph = idx >= 0 ? M.phase(st, idx) : '';
  const take = mine && st.mustTake ? M.takeable(st, idx) : [];
  const svg = morrisSvg(st.board, { live: mine, light, last: st.last, take });
  const side = i => {
    const s = r.seats[i];
    const on = M.count(st, i);
    return `<div class="mside${st.turn === i && r.status === 'playing' ? ' turn' : ''}${st.winner === i ? ' winner' : ''}"><span class="mdot ${i === light ? 'l' : 'd'}"></span><b>${esc(s.name)}</b>${i === idx ? ' <span class="tag">you</span>' : ''}<span class="hint">${st.toPlace[i] ? st.toPlace[i] + ' to place · ' : ''}${on} on the board</span></div>`;
  };
  const help = mine ? (st.mustTake ? 'You made a mill. Click one of their pieces to take it.' : (ph === 'place' ? 'Click an empty point to place a piece.' : (ph === 'fly' ? 'You are down to three: click a piece, then any empty point.' : 'Click one of your pieces, then the empty point next to it.'))) : (r.status === 'playing' ? esc(r.seats[st.turn].name) + ' to move.' : '');
  return `<div class="felt morrisfelt">
    <div class="msides">${side(0)}${side(1)}</div>
    <div class="mwrap" data-morris data-turn="${mine ? 1 : 0}" data-phase="${ph}" data-take="${st.mustTake && mine ? 1 : 0}" data-me="${idx}" data-board="${st.board.join(',')}" data-adj="${esc(JSON.stringify(M.ADJ))}">${svg}</div>
    ${timer(r, mine)}
    ${mine ? form(d, r, st.mustTake ? 'take' : (ph === 'place' ? 'place' : 'move'), `<input type="hidden" name="from" data-mfrom><input type="hidden" name="to" data-mto><input type="hidden" name="at" data-mat><button type="submit" hidden data-msend>Go</button>`, 'mform') : ''}
    <p class="hint">${help}</p>
    <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
  </div>`;
}

function coinPart(d, r, idx) {
  const st = r.st;
  const last = st.flips[st.flips.length - 1];
  const side = i => `<div class="iseat${st.caller === i && r.status === 'playing' ? ' turn' : ''}${st.winner === i ? ' winner' : ''}"><span class="lbl">${esc(r.seats[i].name)}${i === idx ? ' · you' : ''}</span><span class="score">${st.wins[i]}</span><span class="of">of 3</span><span class="track"><i style="width:${Math.round(st.wins[i] / 3 * 100)}%"></i></span></div>`;
  const mine = r.status === 'playing' && st.caller === idx;
  return `<div class="itable">
    ${side(0)}
    <div class="imid">
      <div class="coinbig${last ? ' ' + last.fell : ''}" data-coin="${last ? last.fell : ''}" data-n="${st.flips.length}"><span class="face heads">◉<i>Heads</i></span><span class="face tails">✦<i>Tails</i></span></div>
      <div class="pot">ROUND <b>${st.round}</b> · AT STAKE <b>${sep(r.stake * 2)}</b></div>
      ${timer(r, mine)}
      ${mine ? form(d, r, 'call', `<button class="btn go" type="submit" name="side" value="heads" data-key="h">Heads <kbd>H</kbd></button><button class="btn go" type="submit" name="side" value="tails" data-key="t">Tails <kbd>T</kbd></button>`, 'iacts') : (r.status === 'playing' ? `<p class="hint">${esc(r.seats[st.caller].name)} is calling.</p>` : '')}
      <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
      <div class="flips">${st.flips.map(f => `<span class="flip${f.winner === idx ? ' mine' : ''}" title="${esc(r.seats[f.caller].name)} called ${f.call}">${f.fell === 'heads' ? '◉' : '✦'}</span>`).join('')}</div>
    </div>
    ${side(1)}
  </div>`;
}

function rpsPart(d, r, idx) {
  const st = r.st;
  const last = st.history[st.history.length - 1];
  const picked = idx >= 0 && st.pick[idx] !== null;
  const side = i => `<div class="iseat${r.status === 'playing' && st.pick[i] === null ? ' turn' : ''}${st.winner === i ? ' winner' : ''}"><span class="lbl">${esc(r.seats[i].name)}${i === idx ? ' · you' : ''}</span><span class="score">${st.wins[i]}</span><span class="of">of ${st.need}</span><span class="track"><i style="width:${Math.round(st.wins[i] / st.need * 100)}%"></i></span><span class="hint">${r.status === 'playing' ? (st.pick[i] !== null ? (i === idx ? 'chose ' + B.RPSNAME[st.pick[i]] : 'has chosen') : 'choosing…') : ''}</span></div>`;
  const reveal = last ? `<div class="hssreveal" data-reveal="${st.history.length}">${[0, 1].map(i => last.picks[i] ? hssIcon(last.picks[i], last.winner === i ? 'won' : (last.winner === 1 - i ? 'lost' : '')) : '<span class="hssico none"><b>nothing</b></span>').join('<span class="vs">vs</span>')}</div>` : '';
  const mine = r.status === 'playing' && idx >= 0 && !picked;
  return `<div class="itable">
    ${side(0)}
    <div class="imid">
      ${reveal}
      <div class="pot">ROUND <b>${st.round}</b> · BEST OF <b>${r.bestof || 3}</b> · AT STAKE <b>${sep(r.stake * 2)}</b></div>
      ${timer(r, mine)}
      ${mine ? form(d, r, 'pick', `${['hammer', 'shield', 'spell'].map((k, i) => `<button class="hssbtn" type="submit" name="choice" value="${k}" data-key="${i + 1}">${hssIcon(k)}<kbd>${i + 1}</kbd></button>`).join('')}`, 'iacts hsspick') : (r.status === 'playing' && picked ? '<p class="hint">Your choice is made. Waiting for theirs.</p>' : '')}
      <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
    </div>
    ${side(1)}
  </div>`;
}

function racePart(d, r, idx) {
  const st = r.st;
  const mine = r.status === 'playing' && idx >= 0 && st.turn === idx && st.winner < 0;
  const hot = mine && st.phase === 'choose' ? st.options.map(o => idx + ':' + o.i) : [];
  const players = r.seats.map((s, p) => `<div class="rplayer${st.turn === p && r.status === 'playing' ? ' turn' : ''}${st.winner === p ? ' winner' : ''}${st.out[p] ? ' out' : ''}"><span class="rdot" style="background:${RCOL[st.sides[p]]}"></span><b>${esc(s.name)}</b>${p === idx ? ' <span class="tag">you</span>' : ''}<span class="hint">${Rc.COLOURS[st.sides[p]].name} · ${st.pieces[p].filter(x => x.where === 'home').length} of 4 home${st.out[p] ? ' · out' : ''}</span></div>`).join('');
  let ctrl = '';
  if (mine && st.phase === 'draw') ctrl = form(d, r, 'draw', `<button class="btn go" type="submit" data-key="d">Draw a card <kbd>D</kbd></button>`, 'iacts');
  else if (mine && st.phase === 'choose') ctrl = form(d, r, 'choose', `<div class="roptions">${st.options.map((o, k) => `<button class="btn ${k ? 'ghost' : 'go'} small" type="submit" name="k" value="${k}"${k < 9 ? ` data-key="${k + 1}"` : ''}><span class="rdot" style="background:${RCOL[st.sides[idx]]}"></span>${esc(o.text)}${k < 9 ? ` <kbd>${k + 1}</kbd>` : ''}</button>`).join('')}</div>`, 'rform');
  else if (r.status === 'playing') ctrl = `<p class="hint">${esc(r.seats[st.turn].name)} ${st.phase === 'draw' ? 'is about to draw' : 'is choosing a move'}.</p>`;
  const lastCard = st.card || (st.discard.length ? st.discard[st.discard.length - 1] : null);
  return `<div class="felt racefelt">
    <div class="rplayers">${players}</div>
    <div class="raceplay">
      <div class="racewrap">${raceSvg(r, st, { hot })}</div>
      <div class="raceside">
        <div class="rdeck"><span class="rcard back"><b>✦</b><small>${st.deck.length} left</small></span>${lastCard ? raceCard(lastCard, st.card ? 'live' : 'spent') : '<span class="rcard ghost"></span>'}</div>
        ${timer(r, mine)}
        ${ctrl}
        <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
      </div>
    </div>
  </div>`;
}

function draughtsPart(d, r, idx) {
  const st = r.st;
  const colour = idx < 0 ? -1 : (idx === st.light ? 0 : 1);
  const mine = r.status === 'playing' && colour >= 0 && st.turn === colour && st.winner < 0 && !st.draw;
  const legal = mine ? Dr.legal(st, colour) : [];
  const svg = draughtsSvg(st, colour === 1, '', { live: mine, sel: st.chain });
  const count = c => st.board.filter(x => x && x.p === c).length;
  const side = c => { const seat = c === 0 ? st.light : 1 - st.light; const s = r.seats[seat]; return `<div class="mside${st.turn === c && r.status === 'playing' ? ' turn' : ''}${st.winner === c ? ' winner' : ''}"><span class="mdot ${c === 0 ? 'l' : 'd'}"></span><b>${esc(s.name)}</b>${seat === idx ? ' <span class="tag">you</span>' : ''}<span class="hint">${count(c)} pieces · ${st.board.filter(x => x && x.p === c && x.k).length} crowned</span></div>`; };
  const must = legal.length && legal[0].take !== undefined;
  return `<div class="felt morrisfelt draughtsfelt">
    <div class="msides">${side(0)}${side(1)}</div>
    <div class="mwrap dwrap" data-draughts data-turn="${mine ? 1 : 0}" data-legal="${esc(JSON.stringify(legal.map(m => [m.from, m.to])))}" data-chain="${st.chain}">${svg}</div>
    ${timer(r, mine)}
    ${mine ? form(d, r, 'move', `<input type="hidden" name="from" data-dfrom><input type="hidden" name="to" data-dto>`, 'dform') : ''}
    <p class="hint">${mine ? (st.chain >= 0 ? 'Keep jumping with the same piece.' : (must ? 'A capture is there: you must take it. Click the piece, then where it lands.' : 'Click one of your pieces, then where it goes.')) : (r.status === 'playing' ? esc(r.seats[st.turn === 0 ? st.light : 1 - st.light].name) + ' to move.' : '')}</p>
    <p class="say" data-say aria-live="polite">${esc(st.say || '')}</p>
  </div>`;
}

function donePart(r) {
  const res = r.result || {};
  if (res.draw) return `<div class="pvdone"><p>A draw. Both stakes went back.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
  if (r.game === 'long') return `<div class="pvdone"><p>Brannoc clears the long table.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
  if (res.empty || !(res.winners && res.winners.length)) return `<div class="pvdone"><p>The table broke up. Every stake went back.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
  const names = r.seats.filter(s => res.winners.includes(s.pid)).map(s => s.name).join(' and ');
  return `<div class="pvdone won"><p><b>${esc(names)}</b> takes ${sep(res.amount)}${res.rake ? ` <span class="hint">(the house kept ${sep(res.rake)} of ${sep(res.total)})</span>` : ''}.</p><a class="btn go" href="/inn/back">To the back room</a></div>`;
}

function roomPart(d, r) {
  const idx = d.me ? B.seatOf(r, d.me) : -1;
  let body;
  const neverStarted = r.status === 'done' && r.game !== 'poker' && r.game !== 'long' && (!r.st || r.st.winner === undefined);
  if (neverStarted) body = '';
  else if (r.status === 'open') body = openPart(d, r, idx);
  else if (r.game === 'duel') body = duelPart(d, r, idx);
  else if (r.game === 'bluff') body = bluffPart(d, r, idx);
  else if (r.game === 'long') body = longPart(d, r, idx);
  else if (r.game === 'morris') body = morrisPart(d, r, idx);
  else if (r.game === 'coin') body = coinPart(d, r, idx);
  else if (r.game === 'rps') body = rpsPart(d, r, idx);
  else if (r.game === 'race') body = racePart(d, r, idx);
  else if (r.game === 'draughts') body = draughtsPart(d, r, idx);
  else body = pokerPart(d, r, idx);
  const sit = r.status === 'playing' && (r.game === 'poker' || r.game === 'long') && idx < 0 && d.canSit && seatsTaken(r) < r.max ? form(d, r, 'join', `<button class="btn go small" type="submit">${r.game === 'long' ? 'Pull up a chair' : 'Sit down with ' + sep(r.stake)}</button>`) : '';
  const leave = idx >= 0 && r.status === 'playing' ? form(d, r, 'leave', `<button class="btn ghost small" type="submit">${r.game === 'poker' ? 'Cash in and leave' : (r.game === 'long' ? 'Get up from the table' : 'Forfeit and leave')}</button>`) : '';
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
