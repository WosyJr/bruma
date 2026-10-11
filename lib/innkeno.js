const R = require('./innrng');

const PAY = {
  1: { 1: 3.6 },
  2: { 1: 1, 2: 9 },
  3: { 2: 2.3, 3: 42 },
  4: { 2: 1, 3: 7, 4: 120 },
  5: { 3: 4.3, 4: 18, 5: 500 },
  6: { 3: 2, 4: 9.2, 5: 60, 6: 1500 },
  7: { 3: 1, 4: 4.8, 5: 22, 6: 220, 7: 5000 },
  8: { 4: 3, 5: 13.9, 6: 90, 7: 900, 8: 10000 },
  9: { 4: 2, 5: 5, 6: 40, 7: 300, 8: 3000, 9: 10000 },
  10: { 0: 3, 5: 3.9, 6: 20, 7: 110, 8: 900, 9: 5000, 10: 10000 }
};

function cleanPicks(raw) {
  const list = (Array.isArray(raw) ? raw : String(raw || '').split(/[\s,]+/)).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 80);
  const uniq = Array.from(new Set(list)).sort((a, b) => a - b);
  if (!uniq.length) throw new Error('Pick at least one number.');
  if (uniq.length > 10) throw new Error('Pick no more than ten numbers.');
  return uniq;
}

function drawBalls(rng) {
  const all = Array.from({ length: 80 }, (_, i) => i + 1);
  R.shuffle(all, rng);
  return all.slice(0, 20);
}

function payFor(picks, balls, bet, cap) {
  const hits = picks.filter(n => balls.includes(n));
  const m = (PAY[picks.length] || {})[hits.length] || 0;
  let ret = Math.floor(bet * m);
  if (cap && ret > cap) ret = cap;
  return { hits, mult: m, ret };
}

module.exports = { PAY, cleanPicks, drawBalls, payFor };
