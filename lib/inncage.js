const R = require('./innrng');

const BETS = {};
[1, 2, 3, 4, 5, 6].forEach(n => { BETS['n' + n] = { key: 'n' + n, label: 'The ' + n, type: 'number', n }; });
BETS.high = { key: 'high', label: 'High, 11 or more', type: 'high' };
BETS.low = { key: 'low', label: 'Low, 10 or less', type: 'low' };
BETS.triple = { key: 'triple', label: 'Any three alike', type: 'triple' };

function clean(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    if (!BETS[k]) throw new Error('There is no such place on the cage cloth.');
    const a = Math.floor(Number(v));
    if (Number.isFinite(a) && a >= 1) out[k] = (out[k] || 0) + a;
  });
  return out;
}

function settle(bets, dice) {
  const sum = dice[0] + dice[1] + dice[2];
  const triple = dice[0] === dice[1] && dice[1] === dice[2];
  let staked = 0, returned = 0;
  const lines = Object.entries(bets).map(([k, a]) => {
    const b = BETS[k];
    staked += a;
    let pays = -1;
    if (b.type === 'number') { const m = dice.filter(d => d === b.n).length; pays = m ? m : -1; }
    else if (b.type === 'high') pays = !triple && sum >= 11 ? 1 : -1;
    else if (b.type === 'low') pays = !triple && sum <= 10 ? 1 : -1;
    else if (b.type === 'triple') pays = triple ? 30 : -1;
    const ret = pays > 0 ? a * (pays + 1) : 0;
    returned += ret;
    return { key: k, label: b.label, amount: a, pays, won: ret > 0, ret };
  });
  return { dice, sum, triple, staked, returned, lines };
}

function throwCage(bets, rng) {
  const d = [R.die(rng), R.die(rng), R.die(rng)];
  return settle(bets, d);
}

function fresh() { return { last: null }; }

module.exports = { BETS, clean, settle, throwCage, fresh };
