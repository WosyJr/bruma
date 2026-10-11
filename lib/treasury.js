const S = require('./store');

const FILE = 'treasury.json';

const CATEGORIES = [
  { id: 'tax', name: 'Taxes and levies', way: 'in' },
  { id: 'fine', name: 'Fines and amercements', way: 'in' },
  { id: 'tithe', name: 'Guild tithes', way: 'in' },
  { id: 'rent', name: 'Rents of the County', way: 'in' },
  { id: 'trade', name: 'Trade and tolls', way: 'in' },
  { id: 'export', name: 'Exports', way: 'both' },
  { id: 'import', name: 'Imports', way: 'both' },
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

const ACCOUNTS = [
  { id: 'checking', name: 'Checking', sub: 'the Coffers', note: 'Day-to-day money in and out. Everything collected lands here.' },
  { id: 'savings', name: 'Savings', sub: 'the Strongbox', note: 'Money put away.' }
];
const ACCT_BY_ID = Object.fromEntries(ACCOUNTS.map(a => [a.id, a]));
const acctOf = r => (ACCT_BY_ID[r.acct] ? r.acct : 'checking');
const acctName = id => (ACCT_BY_ID[id] ? ACCT_BY_ID[id].name : 'Checking');
const effect = r => (r.way === 'move' ? 0 : (r.way === 'in' ? r.amount : -r.amount));
function effectOn(r, acct) {
  if (r.way === 'move') return r.to === acct ? r.amount : (r.from === acct ? -r.amount : 0);
  return acctOf(r) === acct ? effect(r) : 0;
}

function ledger() { return S.read(FILE, []); }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function balance(rows) {
  return (rows || ledger()).reduce((n, r) => n + effect(r), 0);
}
function balanceOf(acct, rows) {
  return (rows || ledger()).reduce((n, r) => n + effectOn(r, acct), 0);
}

function enter({ way, amount, party, reason, cat, guild, correctionOf, matter, tax, licence, deed, due, acct, from, to }, by) {
  const w = way === 'move' ? 'move' : (way === 'out' ? 'out' : 'in');
  if (w === 'move' && !(ACCT_BY_ID[from] && ACCT_BY_ID[to] && from !== to)) throw new Error('Choose two different accounts to move money between.');
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
    matter: String(matter || '').trim().slice(0, 40),
    tax: String(tax || '').trim().slice(0, 40),
    licence: String(licence || '').trim().slice(0, 40),
    deed: String(deed || '').trim().slice(0, 40),
    due: String(due || '').trim().slice(0, 40),
    acct: w === 'move' ? '' : (ACCT_BY_ID[acct] ? acct : 'checking'),
    from: w === 'move' ? from : '',
    to: w === 'move' ? to : '',
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
    way: orig.way === 'move' ? 'move' : (orig.way === 'in' ? 'out' : 'in'),
    from: orig.to,
    to: orig.from,
    acct: acctOf(orig),
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
    if (r.way === 'move') return;
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
    if (r.way === 'move') return;
    if (sinceKey && monthKey(r.at) !== sinceKey) return;
    const row = seen.get(r.cat) || { cat: r.cat, name: catName(r.cat), in: 0, out: 0, count: 0 };
    if (r.way === 'in') row.in += r.amount; else row.out += r.amount;
    row.count += 1;
    seen.set(r.cat, row);
  });
  return Array.from(seen.values()).sort((a, b) => (b.in + b.out) - (a.in + a.out));
}

function forMatter(id) {
  const key = String(id || '');
  if (!key) return [];
  return ledger().filter(r => r.matter === key).sort((a, b) => b.no - a.no);
}

function forGuild(guildId) {
  const g = String(guildId || '');
  return ledger().filter(r => r.guild === g).sort((a, b) => b.no - a.no);
}

function filter({ way, cat, month, q, acct }) {
  let rows = ledger().slice().sort((a, b) => b.no - a.no);
  if (way === 'in' || way === 'out' || way === 'move') rows = rows.filter(r => r.way === way);
  if (ACCT_BY_ID[acct]) rows = rows.filter(r => effectOn(r, acct) !== 0);
  if (cat && CAT_BY_ID[cat]) rows = rows.filter(r => r.cat === cat);
  if (month) rows = rows.filter(r => monthKey(r.at) === month);
  const needle = String(q || '').trim().toLowerCase();
  if (needle) rows = rows.filter(r => (r.party + ' ' + r.reason + ' ' + r.byName).toLowerCase().includes(needle));
  return rows;
}

function running(rows, acct) {
  const asc = rows.slice().sort((a, b) => a.no - b.no);
  let n = 0;
  const map = new Map();
  asc.forEach(r => { n += ACCT_BY_ID[acct] ? effectOn(r, acct) : effect(r); map.set(r.id, n); });
  return map;
}

const SOURCES = [
  { id: 'rent', name: 'Rents', test: r => r.cat === 'rent' || !!r.deed },
  { id: 'licence', name: 'Licences', test: r => !!r.licence || (r.cat === 'trade' && /licen/i.test(r.reason)) },
  { id: 'tax', name: 'Taxes and levies', test: r => r.cat === 'tax' || !!r.tax },
  { id: 'export', name: 'Exports', test: r => r.cat === 'export' },
  { id: 'import', name: 'Imports', test: r => r.cat === 'import' },
  { id: 'other', name: 'Everything else', test: () => true }
];
function sourceOf(r) { return SOURCES.find(s => s.test(r)).id; }

function bySource(ms) {
  const now = new Date(ms || Date.now());
  const Du = require('./dues');
  const week = Du.sundayOf(now.getTime());
  const month = monthKey(now.toISOString());
  const rows = ledger();
  const out = SOURCES.map(s => ({ id: s.id, name: s.name, week: 0, month: 0, all: 0, out: 0, owed: 0 }));
  const at = id => out.find(x => x.id === id);
  rows.forEach(r => {
    if (r.way === 'move') return;
    const base = r.correctionOf ? rows.find(x => x.id === r.correctionOf) || r : r;
    const s = at(sourceOf(base));
    const sign = r.way === 'in' ? 1 : -1;
    const local = Du.localDate(Date.parse(r.at)).iso;
    if (base.way === 'in') {
      s.all += sign * r.amount;
      if (local >= week) s.week += sign * r.amount;
      if (monthKey(r.at) === month) s.month += sign * r.amount;
    } else s.out += -sign * r.amount;
  });
  Du.pending().forEach(d => { at(d.kind === 'deed' ? 'rent' : (d.kind === 'licence' ? 'licence' : 'tax')).owed += d.amount; });
  const total = out.reduce((t, x) => ({ week: t.week + x.week, month: t.month + x.month, all: t.all + x.all, out: t.out + x.out, owed: t.owed + x.owed }), { week: 0, month: 0, all: 0, out: 0, owed: 0 });
  return { rows: out, total, week, month };
}

function moveMoney({ from, to, amount, reason }, by) {
  if (!ACCT_BY_ID[from] || !ACCT_BY_ID[to] || from === to) throw new Error('Choose two different accounts to move money between.');
  const n = Math.round(Number(amount) || 0);
  if (n > 0 && balanceOf(from) < n) throw new Error(acctName(from) + ' holds only ' + balanceOf(from).toLocaleString('en-US') + ' septims.');
  return enter({ way: 'move', from, to, amount: n, reason: String(reason || '').trim() || ('Moved from ' + acctName(from) + ' to ' + acctName(to)), cat: 'other' }, by);
}

function reset(scope, by) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const keep = f => { const rows = S.read(f, null); if (rows !== null) S.write(f + '-before-reset-' + stamp, rows); };
  keep(FILE);
  S.write(FILE, []);
  if (scope === 'everything') { keep('treasury-dues.json'); S.write('treasury-dues.json', { weeks: [], rows: [] }); }
  return { scope, by: by ? by.name : '', at: new Date().toISOString() };
}

function summary() {
  const rows = ledger();
  const thisMonth = monthKey(new Date().toISOString());
  let mIn = 0, mOut = 0;
  rows.forEach(r => {
    if (monthKey(r.at) !== thisMonth || r.way === 'move') return;
    if (r.way === 'in') mIn += r.amount; else mOut += r.amount;
  });
  return { balance: balance(rows), checking: balanceOf('checking', rows), savings: balanceOf('savings', rows), entries: rows.length, monthIn: mIn, monthOut: mOut, month: thisMonth };
}

module.exports = {
  CATEGORIES, CAT_BY_ID, catName, catsFor, ACCOUNTS, ACCT_BY_ID, SOURCES, sourceOf, bySource, acctOf, acctName, effectOn, balanceOf, moveMoney, reset,
  ledger, enter, correct, correctedIds, balance, months, monthKey,
  byCategory, forGuild, forMatter, filter, running, summary
};
