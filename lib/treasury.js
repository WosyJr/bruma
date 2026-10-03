const S = require('./store');

const FILE = 'treasury.json';

const CATEGORIES = [
  { id: 'tax', name: 'Taxes and levies', way: 'in' },
  { id: 'fine', name: 'Fines and amercements', way: 'in' },
  { id: 'tithe', name: 'Guild tithes', way: 'in' },
  { id: 'rent', name: 'Rents of the County', way: 'in' },
  { id: 'trade', name: 'Trade and tolls', way: 'in' },
  { id: 'grant', name: 'Grants and gifts', way: 'in' },
  { id: 'wage', name: 'Wages of the Watch', way: 'out' },
  { id: 'works', name: 'Works and repairs', way: 'out' },
  { id: 'stipend', name: 'Stipends and pensions', way: 'out' },
  { id: 'purchase', name: 'Purchases and provisions', way: 'out' },
  { id: 'relief', name: 'Relief of the poor', way: 'out' },
  { id: 'other', name: 'Other', way: 'both' }
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const catName = id => (CAT_BY_ID[id] ? CAT_BY_ID[id].name : 'Other');
const catsFor = way => CATEGORIES.filter(c => c.way === way || c.way === 'both');

function ledger() { return S.read(FILE, []); }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function balance(rows) {
  return (rows || ledger()).reduce((n, r) => n + (r.way === 'in' ? r.amount : -r.amount), 0);
}

function enter({ way, amount, party, reason, cat, guild, correctionOf }, by) {
  const w = way === 'out' ? 'out' : 'in';
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) throw new Error('An entry must be for more than nothing.');
  if (n > 100000000) throw new Error('That is more coin than the County has ever seen. Check the figure.');
  const reasonText = String(reason || '').trim().slice(0, 300);
  if (!reasonText) throw new Error('Say what the money was for.');
  const rows = ledger();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    way: w,
    amount: n,
    party: String(party || '').trim().slice(0, 120),
    reason: reasonText,
    cat: CAT_BY_ID[cat] ? cat : 'other',
    guild: String(guild || '').trim().slice(0, 40),
    correctionOf: String(correctionOf || '').trim().slice(0, 40),
    by: by.username,
    byName: by.name,
    at: new Date().toISOString()
  };
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function correct(id, { reason }, by) {
  const rows = ledger();
  const orig = rows.find(r => r.id === String(id || ''));
  if (!orig) throw new Error('No such entry in the ledger.');
  if (orig.correctionOf) throw new Error('That entry is itself a correction. Correct the original instead.');
  if (rows.some(r => r.correctionOf === orig.id)) throw new Error('That entry has already been corrected.');
  return enter({
    way: orig.way === 'in' ? 'out' : 'in',
    amount: orig.amount,
    party: orig.party,
    reason: String(reason || '').trim().slice(0, 300) || ('Correction of entry no. ' + orig.no),
    cat: orig.cat,
    guild: orig.guild,
    correctionOf: orig.id
  }, by);
}

function correctedIds() {
  const out = new Set();
  ledger().forEach(r => { if (r.correctionOf) out.add(r.correctionOf); });
  return out;
}

function monthKey(iso) { return String(iso || '').slice(0, 7); }

function months() {
  const seen = new Map();
  ledger().forEach(r => {
    const k = monthKey(r.at);
    const m = seen.get(k) || { key: k, in: 0, out: 0, count: 0 };
    if (r.way === 'in') m.in += r.amount; else m.out += r.amount;
    m.count += 1;
    seen.set(k, m);
  });
  return Array.from(seen.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function byCategory(sinceKey) {
  const seen = new Map();
  ledger().forEach(r => {
    if (sinceKey && monthKey(r.at) !== sinceKey) return;
    const row = seen.get(r.cat) || { cat: r.cat, name: catName(r.cat), in: 0, out: 0, count: 0 };
    if (r.way === 'in') row.in += r.amount; else row.out += r.amount;
    row.count += 1;
    seen.set(r.cat, row);
  });
  return Array.from(seen.values()).sort((a, b) => (b.in + b.out) - (a.in + a.out));
}

function forGuild(guildId) {
  const g = String(guildId || '');
  return ledger().filter(r => r.guild === g).sort((a, b) => b.no - a.no);
}

function filter({ way, cat, month, q }) {
  let rows = ledger().slice().sort((a, b) => b.no - a.no);
  if (way === 'in' || way === 'out') rows = rows.filter(r => r.way === way);
  if (cat && CAT_BY_ID[cat]) rows = rows.filter(r => r.cat === cat);
  if (month) rows = rows.filter(r => monthKey(r.at) === month);
  const needle = String(q || '').trim().toLowerCase();
  if (needle) rows = rows.filter(r => (r.party + ' ' + r.reason + ' ' + r.byName).toLowerCase().includes(needle));
  return rows;
}

function running(rows) {
  const asc = rows.slice().sort((a, b) => a.no - b.no);
  let n = 0;
  const map = new Map();
  asc.forEach(r => { n += r.way === 'in' ? r.amount : -r.amount; map.set(r.id, n); });
  return map;
}

function summary() {
  const rows = ledger();
  const thisMonth = monthKey(new Date().toISOString());
  let mIn = 0, mOut = 0;
  rows.forEach(r => {
    if (monthKey(r.at) !== thisMonth) return;
    if (r.way === 'in') mIn += r.amount; else mOut += r.amount;
  });
  return { balance: balance(rows), entries: rows.length, monthIn: mIn, monthOut: mOut, month: thisMonth };
}

module.exports = {
  CATEGORIES, CAT_BY_ID, catName, catsFor,
  ledger, enter, correct, correctedIds, balance, months, monthKey,
  byCategory, forGuild, filter, running, summary
};
