const crypto = require('crypto');

const SYMBOLS = [
  { id: 'septim', glyph: '🪙', name: 'the Septim', mult: 1, w: 3000 },
  { id: 'flagon', glyph: '🍺', name: 'the Flagon', mult: 2, w: 1500 },
  { id: 'sword', glyph: '⚔\uFE0F', name: 'the Crossed Swords', mult: 5, w: 300 },
  { id: 'crown', glyph: '👑', name: 'the Crown', mult: 20, w: 50 },
  { id: 'dragon', glyph: '🐉', name: 'the Dragon', mult: 100, w: 5 }
];
const TOTAL = 10000;
const WIN_W = SYMBOLS.reduce((n, s) => n + s.w, 0);
const BY_ID = Object.fromEntries(SYMBOLS.map(s => [s.id, s]));

const rnd = n => crypto.randomInt(n);
const pickWeighted = () => {
  let r = rnd(WIN_W);
  for (const s of SYMBOLS) { if (r < s.w) return s; r -= s.w; }
  return SYMBOLS[0];
};

function buy(bet) {
  const roll = rnd(TOTAL);
  let win = null, acc = 0;
  for (const s of SYMBOLS) { acc += s.w; if (roll < acc) { win = s; break; } }
  let seals;
  if (win) seals = [win, win, win];
  else if (rnd(10) < 6) {
    const pair = pickWeighted();
    let odd = pair;
    while (odd.id === pair.id) odd = SYMBOLS[rnd(SYMBOLS.length)];
    seals = [pair, pair, odd];
    for (let i = seals.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = seals[i]; seals[i] = seals[j]; seals[j] = t; }
  } else {
    const pool = SYMBOLS.slice();
    seals = [];
    for (let k = 0; k < 3; k++) seals.push(pool.splice(rnd(pool.length), 1)[0]);
  }
  return {
    at: new Date().toISOString(),
    seals: seals.map(s => ({ id: s.id, glyph: s.glyph, name: s.name, mult: s.mult })),
    win: win ? win.id : '',
    mult: win ? win.mult : 0,
    staked: bet,
    returned: win ? bet * win.mult : 0
  };
}

module.exports = { SYMBOLS, BY_ID, buy };
