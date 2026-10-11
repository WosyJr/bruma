const crypto = require('crypto');
const S = require('./store');

const FILE = 'inn-where.json';
const TZ = process.env.INN_TZ || 'America/New_York';

const PLACES = [
  'the cellar under the Jerall View',
  'the old smithy by the North Gate',
  'the hayloft behind the stables',
  'the chapel crypt, after vespers',
  'a back room of the Hearth and Home',
  'the root cellar on Mages’ Row',
  'the empty granary by the east wall',
  'the drained cistern below the market',
  'the woodcutter’s shed outside the walls',
  'the boathouse on the frozen pond',
  'the attic of a shuttered townhouse',
  'the tannery loft, downwind',
  'an old watchtower on the Pale Pass road',
  'the warehouse by the south gate'
];

function nightOf(ms) {
  const d = new Date((ms || Date.now()) - 12 * 3600000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function state() {
  const s = S.read(FILE, {});
  if (!s.seed) { s.seed = crypto.randomBytes(16).toString('hex'); S.write(FILE, s); }
  return s;
}

function rolled(night, seed) {
  const h = n => crypto.createHash('sha256').update(seed + '|' + n).digest().readUInt32BE(0) % PLACES.length;
  const prev = new Date(Date.parse(night + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
  let i = h(night);
  if (i === h(prev)) i = (i + 1 + (h(night + '+') % (PLACES.length - 1))) % PLACES.length;
  return PLACES[i];
}

function placeFor(night) {
  const s = state();
  const o = (s.set || {})[night];
  return o ? o.place : rolled(night, s.seed);
}

function tonight(ms) {
  const night = nightOf(ms);
  const s = state();
  const o = (s.set || {})[night];
  return { night, place: placeFor(night), setBy: o ? o.by : '' };
}

function tomorrow(ms) {
  const night = nightOf((ms || Date.now()) + 86400000);
  return { night, place: placeFor(night) };
}

function setTonight(place, by) {
  const p = String(place || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
  const s = state();
  const night = nightOf();
  s.set = s.set || {};
  if (!p) delete s.set[night];
  else s.set[night] = { place: p, by: by ? by.name : '', at: new Date().toISOString() };
  const keep = Object.keys(s.set).sort().slice(-30);
  s.set = Object.fromEntries(keep.map(k => [k, s.set[k]]));
  S.write(FILE, s);
  return tonight();
}

const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

module.exports = { PLACES, nightOf, tonight, tomorrow, setTonight, placeFor, cap };
