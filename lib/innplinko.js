const R = require('./innrng');

const ROWS = 16;
const half = { low: [16, 9, 2, 1.4, 1.4, 1.2, 1, 0.95, 0.5], medium: [50, 25, 10, 5, 3, 1.4, 0.9, 0.5, 0.3], high: [100, 50, 20, 10, 5, 1.8, 0.2, 0.2, 0.2] };
const TABLE = Object.fromEntries(Object.entries(half).map(([k, h]) => [k, h.concat(h.slice(0, -1).reverse())]));
const RISKS = [{ id: 'low', name: 'Low' }, { id: 'medium', name: 'Medium' }, { id: 'high', name: 'High' }];

function drop(bet, risk, rng) {
  const r = rng || R.int;
  const t = TABLE[risk] ? risk : 'medium';
  const path = Array.from({ length: ROWS }, () => r(2));
  const slot = path.reduce((a, b) => a + b, 0);
  const mult = TABLE[t][slot];
  return { risk: t, path, slot, mult, staked: bet, returned: Math.floor(bet * mult) };
}

module.exports = { ROWS, TABLE, RISKS, drop };
