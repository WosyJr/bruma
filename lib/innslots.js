const R = require('./innrng');

const SYMS = [
  { id: 'dragon', name: 'Dragon', w: 2, wild: true },
  { id: 'septim', name: 'Septim', w: 1, scatter: true },
  { id: 'crown', name: 'Jarl’s Crown', w: 3 },
  { id: 'mammoth', name: 'Mammoth', w: 5 },
  { id: 'gear', name: 'Dwemer Gear', w: 7 },
  { id: 'mead', name: 'Honningbrew Mead', w: 9 },
  { id: 'roll', name: 'Sweetroll', w: 11 }
];
const SYM = Object.fromEntries(SYMS.map(s => [s.id, s]));
const STRIP = [];
SYMS.forEach(s => { for (let i = 0; i < s.w; i++) STRIP.push(s.id); });
const PAY = { dragon: [0, 0, 0, 22, 110, 440], crown: [0, 0, 0, 11, 55, 220], mammoth: [0, 0, 0, 8.8, 33, 132], gear: [0, 0, 0, 6.6, 22, 88], mead: [0, 0, 0, 4.4, 13.2, 55], roll: [0, 0, 0, 2.2, 8.8, 33] };
const SCATTER = [0, 0, 0, 2, 5, 20, 50];
const FREE = 8;
const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1]];
const SEED = 1000;
const CUT = 0.01;

function reels(rng) {
  const r = rng || R.int;
  return [0, 1, 2, 3, 4].map(() => { const s = r(STRIP.length); return { stop: s, cells: [0, 1, 2].map(k => STRIP[(s + k) % STRIP.length]) }; });
}

function judge(grid, bet) {
  const lineBet = bet / 9;
  const lines = [];
  let win = 0;
  LINES.forEach((ln, li) => {
    const row = ln.map((r, c) => grid[c][r]);
    let base = row.find(x => x !== 'dragon') || 'dragon';
    if (base === 'septim') base = 'dragon';
    let n = 0; for (const x of row) { if (x === base || x === 'dragon') n++; else break; }
    let dn = 0; for (const x of row) { if (x === 'dragon') dn++; else break; }
    const pay = base === 'dragon' ? 0 : ((PAY[base] || [])[n] || 0);
    const dpay = PAY.dragon[dn] || 0;
    const best = Math.max(pay, dpay);
    if (best > 0) { const sym = dpay > pay ? 'dragon' : base; const cnt = dpay > pay ? dn : n; lines.push({ line: li, sym, n: cnt, amount: lineBet * best }); win += lineBet * best; }
  });
  const sc = grid.flat().filter(x => x === 'septim').length;
  const scatter = sc >= 3 ? bet * SCATTER[Math.min(sc, 6)] : 0;
  const free = sc >= 3 ? FREE : 0;
  const jackpot = grid.every(col => col.includes('dragon'));
  return { lines, win: win + scatter, scatter, scatters: sc, free, jackpot };
}

function spin(bet, rng) {
  const rs = reels(rng);
  const grid = rs.map(x => x.cells);
  const j = judge(grid, bet);
  return Object.assign({ stops: rs.map(x => x.stop), grid }, j);
}

function fresh() { return { last: null, free: 0, freeBet: 0, freeWon: 0 }; }

module.exports = { SYMS, SYM, STRIP, PAY, SCATTER, FREE, LINES, SEED, CUT, reels, judge, spin, fresh };
