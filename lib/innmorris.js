const R = require('./innrng');

const ADJ = [[1, 9], [0, 2, 4], [1, 14], [4, 10], [1, 3, 5, 7], [4, 13], [7, 11], [4, 6, 8], [7, 12], [0, 10, 21], [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23], [11, 16], [15, 17, 19], [12, 16], [10, 19], [16, 18, 20, 22], [13, 19], [9, 22], [19, 21, 23], [14, 22]];
const MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23], [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
const XY = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
const DRAWN = 100;

function fresh(first) { return { board: Array(24).fill(-1), toPlace: [9, 9], turn: first || 0, mustTake: false, quiet: 0, winner: -1, draw: false, last: null, say: '', moves: 0 }; }

const count = (st, p) => st.board.filter(x => x === p).length;
const inMill = (st, i) => MILLS.some(m => m.includes(i) && m.every(j => st.board[j] === st.board[i]));
const madeMill = (st, i) => MILLS.some(m => m.includes(i) && m.every(j => st.board[j] === st.board[i]));
const phase = (st, p) => st.toPlace[p] > 0 ? 'place' : (count(st, p) === 3 ? 'fly' : 'move');

function takeable(st, p) {
  const foe = 1 - p;
  const all = st.board.map((x, i) => i).filter(i => st.board[i] === foe);
  const free = all.filter(i => !inMill(st, i));
  return free.length ? free : all;
}

function moves(st, p) {
  const out = [];
  const ph = phase(st, p);
  if (ph === 'place') { st.board.forEach((x, i) => { if (x === -1) out.push({ kind: 'place', to: i }); }); return out; }
  st.board.forEach((x, i) => {
    if (x !== p) return;
    const targets = ph === 'fly' ? st.board.map((y, j) => j).filter(j => st.board[j] === -1) : ADJ[i].filter(j => st.board[j] === -1);
    targets.forEach(j => out.push({ kind: 'move', from: i, to: j }));
  });
  return out;
}

function lostBy(st, p) {
  if (st.toPlace[p] === 0 && count(st, p) < 3) return 'is down to two pieces';
  if (!st.mustTake && moves(st, p).length === 0) return 'has no move left';
  return '';
}

function endCheck(st, names) {
  const p = st.turn;
  const why = lostBy(st, p);
  if (why) { st.winner = 1 - p; st.say = names[p] + ' ' + why + '.'; return true; }
  if (st.quiet >= DRAWN) { st.draw = true; st.say = 'Fifty moves each without a mill. The game is drawn.'; return true; }
  return false;
}

function act(st, p, what, a, names) {
  if (st.winner >= 0 || st.draw) throw new Error('The game is over.');
  if (st.turn !== p) throw new Error('It is not your move.');
  const n = v => { const x = Math.floor(Number(v)); if (!(x >= 0 && x <= 23)) throw new Error('Pick a point on the board.'); return x; };
  if (st.mustTake) {
    if (what !== 'take') throw new Error('You made a mill: take one of their pieces first.');
    const i = n(a.at);
    if (!takeable(st, p).includes(i)) throw new Error(st.board[i] === 1 - p ? 'That piece is in a mill. Take one that is not.' : 'Take one of their pieces.');
    st.board[i] = -1;
    st.mustTake = false;
    st.quiet = 0;
    st.last = { kind: 'take', at: i, by: p };
    st.say = names[p] + ' takes a piece.';
    st.turn = 1 - p;
    st.moves++;
    endCheck(st, names);
    return;
  }
  let to;
  if (what === 'place') {
    if (phase(st, p) !== 'place') throw new Error('Your pieces are all on the board. Move one.');
    to = n(a.to);
    if (st.board[to] !== -1) throw new Error('That point is taken.');
    st.board[to] = p;
    st.toPlace[p]--;
    st.last = { kind: 'place', to, by: p };
    st.say = names[p] + ' places a piece.';
  } else if (what === 'move') {
    const ph = phase(st, p);
    if (ph === 'place') throw new Error('Place all nine pieces first.');
    const from = n(a.from);
    to = n(a.to);
    if (st.board[from] !== p) throw new Error('Move one of your own pieces.');
    if (st.board[to] !== -1) throw new Error('That point is taken.');
    if (ph === 'move' && !ADJ[from].includes(to)) throw new Error('Move along a line to the next point.');
    st.board[from] = -1;
    st.board[to] = p;
    st.last = { kind: 'move', from, to, by: p };
    st.say = names[p] + (ph === 'fly' ? ' flies a piece.' : ' moves a piece.');
  } else throw new Error('Place, move or take.');
  st.moves++;
  if (madeMill(st, to)) {
    st.mustTake = true;
    st.say = names[p] + ' makes a mill!';
    st.quiet = 0;
    if (!takeable(st, p).length) { st.mustTake = false; st.turn = 1 - p; endCheck(st, names); }
    return;
  }
  st.quiet++;
  st.turn = 1 - p;
  endCheck(st, names);
}

function autoMove(st, p, names, rng) {
  const pick = list => list[(rng || R.int)(list.length)];
  if (st.mustTake) return act(st, p, 'take', { at: pick(takeable(st, p)) }, names);
  const m = pick(moves(st, p));
  return act(st, p, m.kind, m, names);
}

module.exports = { ADJ, MILLS, XY, DRAWN, fresh, act, autoMove, moves, takeable, phase, count, inMill };
