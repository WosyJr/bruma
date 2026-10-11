const R = require('./innrng');

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colour = n => n === 0 ? 'green' : (RED.has(n) ? 'red' : 'black');
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const PAYS = { straight: 35, split: 17, street: 11, trio: 11, corner: 8, four: 8, line: 5, dozen: 2, column: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1 };
const KIND = { straight: 'Straight up', split: 'Split', street: 'Street', trio: 'Trio', corner: 'Corner', four: 'First four', line: 'Six line', dozen: 'Dozen', column: 'Column', red: 'Red', black: 'Black', odd: 'Odd', even: 'Even', low: '1 to 18', high: '19 to 36' };

const BETS = {};
function add(key, type, nums, label) { BETS[key] = { key, type, nums, pays: PAYS[type], label: label || KIND[type] + ' ' + nums.join('-') }; }

range(0, 36).forEach(n => add('s' + n, 'straight', [n], 'Straight up ' + n));
range(1, 33).forEach(n => add('h' + n, 'split', [n, n + 3]));
range(1, 36).filter(n => n % 3 !== 0).forEach(n => add('v' + n, 'split', [n, n + 1]));
[1, 2, 3].forEach(n => add('z' + n, 'split', [0, n]));
range(0, 11).forEach(r => add('st' + r, 'street', [3 * r + 1, 3 * r + 2, 3 * r + 3]));
add('t1', 'trio', [0, 1, 2]);
add('t2', 'trio', [0, 2, 3]);
range(1, 32).filter(n => n % 3 !== 0).forEach(n => add('c' + n, 'corner', [n, n + 1, n + 3, n + 4]));
add('f4', 'four', [0, 1, 2, 3]);
range(0, 10).forEach(r => add('l' + r, 'line', range(3 * r + 1, 3 * r + 6)));
[1, 2, 3].forEach(d => add('d' + d, 'dozen', range(12 * (d - 1) + 1, 12 * d), ['1st', '2nd', '3rd'][d - 1] + ' dozen'));
[1, 2, 3].forEach(c => add('k' + c, 'column', range(1, 36).filter(n => (n - 1) % 3 === c - 1), 'Column ' + c));
add('red', 'red', range(1, 36).filter(n => RED.has(n)), 'Red');
add('black', 'black', range(1, 36).filter(n => !RED.has(n)), 'Black');
add('odd', 'odd', range(1, 36).filter(n => n % 2), 'Odd');
add('even', 'even', range(1, 36).filter(n => !(n % 2)), 'Even');
add('low', 'low', range(1, 18), '1 to 18');
add('high', 'high', range(19, 36), '19 to 36');

function clean(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    const b = BETS[k];
    const a = Math.floor(Number(v));
    if (!b) throw new Error('There is no such place on the cloth.');
    if (!Number.isFinite(a) || a < 1) return;
    out[k] = (out[k] || 0) + a;
  });
  return out;
}

function spin(bets, rng) {
  const n = (rng || R.int)(37);
  let staked = 0, returned = 0;
  const lines = Object.entries(bets).map(([k, a]) => {
    const b = BETS[k];
    staked += a;
    const won = b.nums.includes(n);
    const ret = won ? a * (b.pays + 1) : 0;
    returned += ret;
    return { key: k, label: b.label, amount: a, pays: b.pays, won, ret };
  });
  return { n, colour: colour(n), staked, returned, lines };
}

function fresh() { return { last: null }; }

module.exports = { ORDER, RED, BETS, PAYS, KIND, colour, clean, spin, fresh };
