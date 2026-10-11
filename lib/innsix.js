const R = require('./innrng');

const SYMS = [
  { id: 'one', label: '1', pays: 1, count: 24 },
  { id: 'two', label: '2', pays: 2, count: 15 },
  { id: 'five', label: '5', pays: 5, count: 7 },
  { id: 'ten', label: '10', pays: 10, count: 4 },
  { id: 'twenty', label: '20', pays: 20, count: 2 },
  { id: 'dragon', label: 'Dragon', pays: 40, count: 1 },
  { id: 'septim', label: 'Septim', pays: 40, count: 1 }
];
const SYM = Object.fromEntries(SYMS.map(s => [s.id, s]));

const ORDER = (() => {
  const spread = (items, n) => {
    const tagged = [];
    items.forEach(s => { for (let i = 0; i < s.count; i++) tagged.push({ id: s.id, at: (i + 0.5) * n / s.count + s.pays * 0.001 }); });
    return tagged.sort((x, y) => x.at - y.at).map(t => t.id);
  };
  const others = spread(SYMS.filter(s => s.id !== 'one'), 30);
  const out = [];
  let o = 0, ones = 0;
  for (let i = 0; i < 54; i++) {
    const wantOne = ones < 24 && Math.floor((i + 1) * 24 / 54) > ones;
    if (wantOne) { out.push('one'); ones++; } else out.push(others[o++]);
  }
  const d = out.indexOf('dragon'), sp = out.indexOf('septim'), far = (d + 27) % 54;
  [out[sp], out[far]] = [out[far], out[sp]];
  return out;
})();

function clean(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    if (!SYM[k]) throw new Error('There is no such place on the wheel’s cloth.');
    const a = Math.floor(Number(v));
    if (Number.isFinite(a) && a >= 1) out[k] = (out[k] || 0) + a;
  });
  return out;
}

function spin(bets, rng) {
  const slot = (rng || R.int)(ORDER.length);
  const hit = ORDER[slot];
  let staked = 0, returned = 0;
  const lines = Object.entries(bets).map(([k, a]) => {
    staked += a;
    const won = k === hit;
    const ret = won ? a * (SYM[k].pays + 1) : 0;
    returned += ret;
    return { key: k, label: SYM[k].label, amount: a, pays: SYM[k].pays, won, ret };
  });
  return { slot, sym: hit, staked, returned, lines };
}

function fresh() { return { last: null }; }

module.exports = { SYMS, SYM, ORDER, clean, spin, fresh };
