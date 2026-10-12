const R = require('./innrng');

const TILES = 25;
const EDGE = 0.97;

function multiplier(mines, picks) {
  let m = 1;
  for (let i = 0; i < picks; i++) m *= (TILES - i) / (TILES - mines - i);
  return picks ? Math.floor(m * EDGE * 100) / 100 : 1;
}

function start(bet, mines, rng) {
  const all = Array.from({ length: TILES }, (_, i) => i);
  R.shuffle(all, rng);
  return { bet, mines, draugr: all.slice(0, mines).sort((a, b) => a - b), opened: [], phase: 'play', mult: 1, returned: 0, hit: -1 };
}

function pick(g, tile) {
  if (!g || g.phase !== 'play') throw new Error('Put down a stake and choose how many draugr first.');
  const t = Math.floor(Number(tile));
  if (!(t >= 0 && t < TILES)) throw new Error('Choose a stone in the barrow.');
  if (g.opened.includes(t)) throw new Error('That stone is already lifted.');
  if (g.draugr.includes(t)) { g.hit = t; g.phase = 'done'; g.returned = 0; g.result = 'draugr'; return g; }
  g.opened.push(t);
  g.mult = multiplier(g.mines, g.opened.length);
  if (g.opened.length === TILES - g.mines) return cash(g);
  return g;
}

function cash(g) {
  if (!g || g.phase !== 'play') throw new Error('There is nothing to take.');
  if (!g.opened.length) throw new Error('Lift at least one stone first.');
  g.returned = Math.floor(g.bet * g.mult);
  g.phase = 'done';
  g.result = 'cash';
  return g;
}

function fresh() { return { phase: 'idle', opened: [], draugr: [], mines: 3, bet: 0, mult: 1 }; }

module.exports = { TILES, EDGE, multiplier, start, pick, cash, fresh };
