const rank = c => String(c).slice(0, -1);
const suit = c => String(c).slice(-1);
const red = c => suit(c) === 'h' || suit(c) === 'd';
const ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const PP = { perfect: { label: 'Perfect pair', pays: 25 }, coloured: { label: 'Coloured pair', pays: 12 }, mixed: { label: 'Mixed pair', pays: 6 } };
function perfectPairs(a, b) {
  if (rank(a) !== rank(b)) return null;
  if (suit(a) === suit(b)) return Object.assign({ kind: 'perfect' }, PP.perfect);
  if (red(a) === red(b)) return Object.assign({ kind: 'coloured' }, PP.coloured);
  return Object.assign({ kind: 'mixed' }, PP.mixed);
}

const T3 = { suitedtrips: { label: 'Suited three of a kind', pays: 100 }, straightflush: { label: 'Straight flush', pays: 40 }, trips: { label: 'Three of a kind', pays: 30 }, straight: { label: 'Straight', pays: 10 }, flush: { label: 'Flush', pays: 5 } };
function isStraight(cs) {
  const v = cs.map(c => ORDER.indexOf(rank(c))).sort((x, y) => x - y);
  if (v[0] + 1 === v[1] && v[1] + 1 === v[2]) return true;
  return v[0] === 0 && v[1] === 11 && v[2] === 12;
}
function twentyOnePlus3(a, b, up) {
  const cs = [a, b, up];
  const flush = cs.every(c => suit(c) === suit(a));
  const trips = cs.every(c => rank(c) === rank(a));
  const straight = isStraight(cs);
  const k = trips && flush ? 'suitedtrips' : (straight && flush ? 'straightflush' : (trips ? 'trips' : (straight ? 'straight' : (flush ? 'flush' : ''))));
  return k ? Object.assign({ kind: k }, T3[k]) : null;
}

const PUNTO = { ppair: { label: 'Player pair', pays: 11 }, bpair: { label: 'Banker pair', pays: 11 }, either: { label: 'Either pair', pays: 5 } };
function puntoPairs(P, B) {
  const pp = rank(P[0]) === rank(P[1]), bp = rank(B[0]) === rank(B[1]);
  return { ppair: pp, bpair: bp, either: pp || bp };
}

function settle(bets, hits) {
  const lines = [];
  let staked = 0, returned = 0;
  Object.keys(bets).forEach(k => {
    const amount = bets[k];
    if (!(amount > 0)) return;
    staked += amount;
    const h = hits[k];
    const ret = h ? amount * (h.pays + 1) : 0;
    returned += ret;
    lines.push({ key: k, label: h ? h.label : '', amount, ret, won: !!h });
  });
  return { staked, returned, lines };
}

module.exports = { PP, T3, PUNTO, perfectPairs, twentyOnePlus3, puntoPairs, settle, rank, suit };
