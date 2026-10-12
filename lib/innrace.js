const R = require('./innrng');

const SIDE = 15;
const TRACK = 60;
const SAFE = 5;
const HOME = SAFE + 1;
const COLOURS = [
  { id: 'frost', name: 'Frost' },
  { id: 'ember', name: 'Ember' },
  { id: 'pine', name: 'Pine' },
  { id: 'gold', name: 'Gold' }
];
const SIDES = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const SLIDES = [[1, 4], [9, 13]];

const CARDS = [
  { id: '1', n: 5, name: 'One', text: 'Bring a traveller out of the gate, or move one 1 forward.' },
  { id: '2', n: 4, name: 'Two', text: 'Bring a traveller out, or move one 2 forward. Then draw again.' },
  { id: '3', n: 4, name: 'Three', text: 'Move a traveller 3 forward.' },
  { id: '5', n: 4, name: 'Five', text: 'Move a traveller 5 forward.' },
  { id: '8', n: 4, name: 'Eight', text: 'Move a traveller 8 forward.' },
  { id: '12', n: 4, name: 'Twelve', text: 'Move a traveller 12 forward.' },
  { id: 'b4', n: 4, name: 'Back Four', text: 'Move a traveller 4 back.' },
  { id: '10', n: 4, name: 'Ten', text: 'Move a traveller 10 forward, or 1 back.' },
  { id: 'swap', n: 3, name: 'Shadow Swap', text: 'Swap places with a rival on the road, or move 11 forward.' },
  { id: 'dragon', n: 4, name: 'Dragon', text: 'Send a traveller from your gate onto a rival on the road. The rival goes back to their gate.' }
];
const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));

function newDeck(rng) {
  const d = [];
  CARDS.forEach(c => { for (let i = 0; i < c.n; i++) d.push(c.id); });
  return R.shuffle(d, rng);
}

const entryOf = side => side * SIDE + 4;
const turnOf = side => side * SIDE + 2;
const sideAt = t => Math.floor(t / SIDE);

function fresh(players, rng) {
  const sides = SIDES[players] || SIDES[4];
  return {
    sides,
    pieces: sides.map(() => [0, 1, 2, 3].map(() => ({ where: 'gate', at: 0 }))),
    deck: newDeck(rng), discard: [], turn: 0, card: null, phase: 'draw', options: [],
    out: sides.map(() => false), winner: -1, say: '', last: null, moves: 0
  };
}

function ownerOfSide(st, side) { return st.sides.indexOf(side); }

function occupant(st, t, skip) {
  for (let p = 0; p < st.pieces.length; p++) {
    if (st.out[p]) continue;
    const i = st.pieces[p].findIndex((x, j) => x.where === 'track' && x.at === t && !(skip && skip.p === p && skip.i === j));
    if (i >= 0) return { p, i };
  }
  return null;
}

function forward(st, p, piece, n) {
  const side = st.sides[p];
  if (piece.where === 'track') {
    const e = turnOf(side);
    const d = (e - piece.at + TRACK) % TRACK;
    if (n <= d) return { where: 'track', at: (piece.at + n) % TRACK };
    const r = n - d;
    if (r > HOME) return null;
    return r === HOME ? { where: 'home', at: 0 } : { where: 'safe', at: r };
  }
  if (piece.where === 'safe') {
    const r = piece.at + n;
    if (r > HOME) return null;
    return r === HOME ? { where: 'home', at: 0 } : { where: 'safe', at: r };
  }
  return null;
}

function backward(st, p, piece, n) {
  const side = st.sides[p];
  if (piece.where === 'track') return { where: 'track', at: (piece.at - n + TRACK * 2) % TRACK };
  if (piece.where === 'safe') {
    const r = piece.at - n;
    if (r >= 1) return { where: 'safe', at: r };
    return { where: 'track', at: (turnOf(side) + r + TRACK) % TRACK };
  }
  return null;
}

function blockedByOwn(st, p, to, self) {
  if (!to || to.where === 'home' || to.where === 'gate') return false;
  return st.pieces[p].some((x, i) => i !== self && x.where === to.where && x.at === to.at);
}

function slideFrom(st, p, t) {
  const side = sideAt(t);
  const k = t % SIDE;
  const sl = SLIDES.find(s => s[0] === k);
  if (!sl) return null;
  if (ownerOfSide(st, side) === p) return null;
  return { from: t, to: side * SIDE + sl[1] };
}

function describe(st, p, i, to) {
  const n = 'traveller ' + (i + 1);
  if (to.where === 'home') return n + ' reaches Sovngarde';
  if (to.where === 'safe') return n + ' into the safe stretch (' + to.at + ' of ' + SAFE + ')';
  const o = occupant(st, to.at);
  return n + ' to the road' + (o && o.p !== p ? ', sending a rival back' : '');
}

function optionsFor(st, p, card) {
  const out = [];
  const mine = st.pieces[p];
  const add = (o) => out.push(o);
  const fwd = n => mine.forEach((x, i) => {
    const to = forward(st, p, x, n);
    if (to && !blockedByOwn(st, p, to, i)) add({ kind: 'move', i, to, text: 'Move ' + describe(st, p, i, to).replace(/^traveller/, 'traveller') + ' (' + n + ' forward)' });
  });
  const back = n => mine.forEach((x, i) => {
    if (x.where !== 'track' && x.where !== 'safe') return;
    const to = backward(st, p, x, n);
    if (to && !blockedByOwn(st, p, to, i)) add({ kind: 'move', i, to, text: 'Move ' + describe(st, p, i, to) + ' (' + n + ' back)' });
  });
  const leave = () => {
    const e = entryOf(st.sides[p]);
    const i = mine.findIndex(x => x.where === 'gate');
    if (i < 0) return;
    const to = { where: 'track', at: e };
    if (blockedByOwn(st, p, to, i)) return;
    add({ kind: 'move', i, to, text: 'Bring traveller ' + (i + 1) + ' out of the gate' + (occupant(st, e) ? ', sending a rival back' : '') });
  };
  if (card === '1' || card === '2') { leave(); fwd(Number(card)); }
  else if (['3', '5', '8', '12'].includes(card)) fwd(Number(card));
  else if (card === 'b4') back(4);
  else if (card === '10') { fwd(10); back(1); }
  else if (card === 'swap') {
    mine.forEach((x, i) => {
      if (x.where !== 'track') return;
      st.pieces.forEach((other, q) => {
        if (q === p || st.out[q]) return;
        other.forEach((y, j) => { if (y.where === 'track') add({ kind: 'swap', i, q, j, text: 'Swap traveller ' + (i + 1) + ' with ' + (COLOURS[st.sides[q]].name) + '’s traveller ' + (j + 1) }); });
      });
    });
    fwd(11);
  } else if (card === 'dragon') {
    const i = mine.findIndex(x => x.where === 'gate');
    if (i >= 0) st.pieces.forEach((other, q) => {
      if (q === p || st.out[q]) return;
      other.forEach((y, j) => { if (y.where === 'track') add({ kind: 'dragon', i, q, j, text: 'Loose the dragon on ' + COLOURS[st.sides[q]].name + '’s traveller ' + (j + 1) }); });
    });
  }
  return out;
}

function bump(st, t, mover) {
  const o = occupant(st, t, mover);
  if (o) { st.pieces[o.p][o.i] = { where: 'gate', at: 0 }; return o; }
  return null;
}

function land(st, p, i, names) {
  const pc = st.pieces[p][i];
  const notes = [];
  if (pc.where !== 'track') return notes;
  const hit = bump(st, pc.at, { p, i });
  if (hit) notes.push(names[hit.p] + ' is sent back to the gate');
  const sl = slideFrom(st, p, pc.at);
  if (sl) {
    for (let t = sl.from + 1; t <= sl.to; t++) {
      const h2 = bump(st, t, { p, i });
      if (h2) notes.push(names[h2.p] + ' is swept back by the avalanche');
    }
    pc.at = sl.to;
    notes.unshift('an avalanche carries them down the slope');
  }
  return notes;
}

function draw(st, rng) {
  if (!st.deck.length) { st.deck = R.shuffle(st.discard.slice(), rng); st.discard = []; }
  return st.deck.pop();
}

function startTurn(st, names) {
  st.card = null;
  st.options = [];
  st.phase = 'draw';
}

function nextPlayer(st) {
  for (let k = 1; k <= st.sides.length; k++) {
    const q = (st.turn + k) % st.sides.length;
    if (!st.out[q]) return q;
  }
  return st.turn;
}

function doDraw(st, p, names, rng) {
  if (st.winner >= 0) throw new Error('The race is over.');
  if (st.turn !== p) throw new Error('It is not your turn.');
  if (st.phase !== 'draw') throw new Error('You have drawn already. Choose a move.');
  const c = draw(st, rng);
  st.card = c;
  st.options = optionsFor(st, p, c);
  st.say = names[p] + ' draws ' + CARD[c].name + '.';
  if (!st.options.length) {
    st.say += ' No move can be made.';
    st.discard.push(c);
    st.last = { p, card: c, none: true };
    if (c === '2') { st.card = null; st.phase = 'draw'; st.say += ' Draw again.'; return; }
    st.turn = nextPlayer(st);
    startTurn(st, names);
    return;
  }
  st.phase = 'choose';
}

function choose(st, p, k, names) {
  if (st.winner >= 0) throw new Error('The race is over.');
  if (st.turn !== p) throw new Error('It is not your turn.');
  if (st.phase !== 'choose') throw new Error('Draw a card first.');
  const o = st.options[Math.floor(Number(k))];
  if (!o) throw new Error('Choose one of the moves offered.');
  let notes = [];
  if (o.kind === 'move') {
    st.pieces[p][o.i] = { where: o.to.where, at: o.to.at };
    notes = land(st, p, o.i, names);
  } else if (o.kind === 'swap') {
    const a = st.pieces[p][o.i], b = st.pieces[o.q][o.j];
    const t = a.at; a.at = b.at; b.at = t;
    notes = land(st, p, o.i, names);
  } else if (o.kind === 'dragon') {
    const b = st.pieces[o.q][o.j];
    const t = b.at;
    st.pieces[o.q][o.j] = { where: 'gate', at: 0 };
    st.pieces[p][o.i] = { where: 'track', at: t };
    notes = [names[o.q] + '’s traveller is sent back to the gate'].concat(land(st, p, o.i, names));
  }
  st.say = names[p] + ': ' + o.text.charAt(0).toLowerCase() + o.text.slice(1) + '.' + (notes.length ? ' ' + notes.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('. ') + '.' : '');
  st.last = { p, card: st.card, kind: o.kind, i: o.i };
  st.discard.push(st.card);
  st.moves++;
  if (st.pieces[p].every(x => x.where === 'home')) { st.winner = p; st.say += ' All four of ' + names[p] + '’s travellers reach Sovngarde!'; st.phase = 'done'; return; }
  const again = st.card === '2';
  st.card = null;
  st.options = [];
  if (!again) st.turn = nextPlayer(st);
  startTurn(st, names);
  if (again) st.say += ' ' + names[p] + ' draws again.';
}

function forfeit(st, p, names) {
  st.out[p] = true;
  st.pieces[p] = st.pieces[p].map(() => ({ where: 'gate', at: 0 }));
  const left = st.out.map((o, i) => o ? -1 : i).filter(i => i >= 0);
  if (left.length === 1) { st.winner = left[0]; st.phase = 'done'; return; }
  if (st.turn === p) { st.turn = nextPlayer(st); startTurn(st, names); }
}

function autoPlay(st, p, names, rng) {
  if (st.phase === 'draw') doDraw(st, p, names, rng);
  if (st.winner < 0 && st.turn === p && st.phase === 'choose') {
    const ranked = st.options.map((o, k) => ({ k, score: o.to && o.to.where === 'home' ? 3 : (o.to && o.to.where === 'safe' ? 2 : 1) }));
    ranked.sort((a, b) => b.score - a.score);
    choose(st, p, ranked[0].k, names);
  }
}

function coords(side, kind, at, slot) {
  let x, y;
  if (kind === 'track') {
    const s = sideAt(at), k = at % SIDE;
    [x, y] = [[k, 0], [15, k], [15 - k, 15], [0, 15 - k]][s];
    return [x, y];
  }
  if (kind === 'safe') { x = 2; y = at; }
  else if (kind === 'home') { x = 2 + (slot % 2 ? 0.55 : -0.55) * 0.6; y = 6.6 + (slot > 1 ? 0.6 : 0); }
  else { x = 4.6 + (slot % 2) * 0.9; y = 1.5 + Math.floor(slot / 2) * 0.9; }
  for (let r = 0; r < side; r++) [x, y] = [15 - y, x];
  return [x, y];
}

module.exports = { SIDE, TRACK, SAFE, COLOURS, SIDES, SLIDES, CARDS, CARD, fresh, optionsFor, doDraw, choose, forfeit, autoPlay, coords, entryOf, turnOf, forward, backward, newDeck };
