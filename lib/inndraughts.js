const R = require('./innrng');

const DRAWN = 80;

function fresh(first) {
  const board = Array(64).fill(null);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 === 0) continue;
    if (r < 3) board[r * 8 + c] = { p: 1, k: false };
    if (r > 4) board[r * 8 + c] = { p: 0, k: false };
  }
  return { board, turn: first || 0, chain: -1, quiet: 0, winner: -1, draw: false, last: null, say: '', moves: 0 };
}

const rc = i => [Math.floor(i / 8), i % 8];
const at = (r, c) => (r >= 0 && r < 8 && c >= 0 && c < 8 ? r * 8 + c : -1);

function dirs(pc) {
  if (pc.k) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return pc.p === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function jumpsFrom(st, i) {
  const pc = st.board[i];
  if (!pc) return [];
  const [r, c] = rc(i);
  const out = [];
  dirs(pc).forEach(([dr, dc]) => {
    const mid = at(r + dr, c + dc), to = at(r + 2 * dr, c + 2 * dc);
    if (mid < 0 || to < 0) return;
    const m = st.board[mid];
    if (m && m.p !== pc.p && !st.board[to]) out.push({ from: i, to, take: mid });
  });
  return out;
}

function stepsFrom(st, i) {
  const pc = st.board[i];
  if (!pc) return [];
  const [r, c] = rc(i);
  return dirs(pc).map(([dr, dc]) => at(r + dr, c + dc)).filter(t => t >= 0 && !st.board[t]).map(to => ({ from: i, to }));
}

function legal(st, p) {
  if (st.chain >= 0) return jumpsFrom(st, st.chain);
  const mine = st.board.map((x, i) => (x && x.p === p ? i : -1)).filter(i => i >= 0);
  const jumps = [].concat(...mine.map(i => jumpsFrom(st, i)));
  if (jumps.length) return jumps;
  return [].concat(...mine.map(i => stepsFrom(st, i)));
}

function endCheck(st, names) {
  const p = st.turn;
  const left = st.board.filter(x => x && x.p === p).length;
  if (!left) { st.winner = 1 - p; st.say += ' ' + names[p] + ' has no pieces left.'; return; }
  if (!legal(st, p).length) { st.winner = 1 - p; st.say += ' ' + names[p] + ' cannot move.'; return; }
  if (st.quiet >= DRAWN) { st.draw = true; st.say = 'Forty moves each without a capture or a man moving forward. The game is drawn.'; }
}

function move(st, p, from, to, names) {
  if (st.winner >= 0 || st.draw) throw new Error('The game is over.');
  if (st.turn !== p) throw new Error('It is not your move.');
  from = Math.floor(Number(from)); to = Math.floor(Number(to));
  const all = legal(st, p);
  const m = all.find(x => x.from === from && x.to === to);
  if (!m) {
    if (st.chain >= 0) throw new Error('Keep jumping with the same piece.');
    if (all.some(x => x.take !== undefined)) throw new Error('A capture is there to be made, and you must make it.');
    throw new Error('That piece cannot go there.');
  }
  const pc = st.board[from];
  st.board[to] = pc;
  st.board[from] = null;
  let crowned = false;
  const [r] = rc(to);
  if (!pc.k && ((pc.p === 0 && r === 0) || (pc.p === 1 && r === 7))) { pc.k = true; crowned = true; }
  st.moves++;
  if (m.take !== undefined) {
    st.board[m.take] = null;
    st.quiet = 0;
    st.last = { from, to, take: m.take, by: p };
    st.say = names[p] + ' jumps and takes a piece' + (crowned ? ', and is crowned!' : '.');
    if (!crowned && jumpsFrom(st, to).length) { st.chain = to; st.say += ' Another jump waits.'; return; }
  } else {
    st.quiet = pc.k && !crowned ? st.quiet + 1 : 0;
    st.last = { from, to, by: p };
    st.say = names[p] + ' moves' + (crowned ? ' and is crowned!' : '.');
  }
  st.chain = -1;
  st.turn = 1 - p;
  endCheck(st, names);
}

function autoMove(st, p, names, rng) {
  const all = legal(st, p);
  const m = all[(rng || R.int)(all.length)];
  return move(st, p, m.from, m.to, names);
}

module.exports = { DRAWN, fresh, legal, move, autoMove, jumpsFrom, rc };
