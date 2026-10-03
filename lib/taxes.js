const S = require('./store');
const P = require('./property');

const FILE = 'taxes.json';
const PAID = 'tax-rendered.json';

const KINDS = [
  { id: 'hearth', name: 'Hearth-tax', note: 'Laid upon every hearth in the County, by the season.' },
  { id: 'land', name: 'Land-tax', note: 'Laid upon the holding, by what it is worth.' },
  { id: 'trade', name: 'Trade levy', note: 'Laid upon a stall, a shop or a charter.' },
  { id: 'toll', name: 'Road toll', note: 'Laid upon carts and droves upon the county roads.' },
  { id: 'tithe', name: 'Guild tithe', note: 'Rendered by a guild out of what it takes.' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Tax');

function roll() { return S.read(FILE, []); }
function rendered() { return S.read(PAID, []); }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function clean(patch, base) {
  const b = base || {};
  return {
    who: String(patch.who !== undefined ? patch.who : b.who || '').trim().slice(0, 120),
    kind: KIND_BY_ID[patch.kind] ? patch.kind : (b.kind || 'hearth'),
    prop: String(patch.prop !== undefined ? patch.prop : b.prop || '').trim().slice(0, 40),
    where: String(patch.where !== undefined ? patch.where : b.where || '').trim().slice(0, 120),
    due: Math.max(0, Math.round(Number(patch.due !== undefined ? patch.due : b.due) || 0)),
    period: String(patch.period !== undefined ? patch.period : b.period || '').trim().slice(0, 80),
    note: String(patch.note !== undefined ? patch.note : b.note || '').trim().slice(0, 300),
    forgiven: patch.forgiven !== undefined ? !!patch.forgiven : !!b.forgiven
  };
}

function assess(patch, by) {
  const rows = roll();
  const body = clean(patch);
  if (!body.who) throw new Error('Say who the tax is laid upon.');
  if (body.due <= 0) throw new Error('A tax must be for more than nothing.');
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    ...body,
    laid: new Date().toISOString(),
    by: by.username,
    byName: by.name
  };
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function assessFromRoll({ kind, period, rate }, by) {
  const holdings = P.all().filter(h => h.state === 'held' && h.holder);
  if (!holdings.length) throw new Error('No holding on the roll is held by anyone. Enter the holdings first.');
  const rows = roll();
  const per = Math.max(0, Math.round(Number(rate) || 0));
  let no = rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0);
  const at = new Date().toISOString();
  const made = [];
  holdings.forEach(h => {
    const already = rows.some(r => r.prop === h.id && r.period === String(period || '').trim() && r.kind === kind);
    if (already) return;
    const due = per > 0 ? per : Math.round((Number(h.rent) || 0) / 4);
    if (due <= 0) return;
    const row = {
      id: S.id() + made.length.toString(36),
      no: ++no,
      who: h.holder,
      kind: KIND_BY_ID[kind] ? kind : 'hearth',
      prop: h.id,
      where: h.name + (h.place ? ', ' + h.place : ''),
      due,
      period: String(period || '').trim().slice(0, 80),
      note: '',
      forgiven: false,
      laid: at,
      by: by.username,
      byName: by.name
    };
    rows.push(row);
    made.push(row);
  });
  if (!made.length) throw new Error('Every held holding is already assessed for that period.');
  S.write(FILE, rows);
  return made;
}

function amend(id, patch, by) {
  const rows = roll();
  const r = rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such assessment.');
  Object.assign(r, clean(patch, r));
  r.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return r;
}

function strike(id) {
  S.write(FILE, roll().filter(r => r.id !== String(id || '')));
}

function render(id, { amount, note }, by) {
  const r = roll().find(x => x.id === String(id || ''));
  if (!r) throw new Error('No such assessment.');
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) throw new Error('A payment must be for more than nothing.');
  const list = rendered();
  const row = {
    id: S.id(),
    tax: r.id,
    who: r.who,
    amount: n,
    note: String(note || '').trim().slice(0, 300),
    at: new Date().toISOString(),
    by: by.username,
    byName: by.name
  };
  list.unshift(row);
  S.write(PAID, list);

  try {
    const T = require('./treasury');
    const entry = T.enter({
      way: 'in',
      amount: n,
      party: r.who,
      reason: kindName(r.kind) + (r.period ? ', ' + r.period : '') + ' — assessment no. ' + r.no,
      cat: 'tax',
      tax: r.id
    }, by);
    const list2 = rendered();
    const got = list2.find(x => x.id === row.id);
    if (got) { got.treasuryNo = entry.no; S.write(PAID, list2); }
  } catch (_) {}

  return row;
}

function paidOn(taxId) {
  return rendered().filter(x => x.tax === String(taxId || ''));
}

function owing(r) {
  if (r.forgiven) return 0;
  const paid = paidOn(r.id).reduce((n, x) => n + x.amount, 0);
  return Math.max(0, (Number(r.due) || 0) - paid);
}

function withState(rows) {
  return (rows || roll()).map(r => {
    const paid = paidOn(r.id).reduce((n, x) => n + x.amount, 0);
    const left = r.forgiven ? 0 : Math.max(0, (Number(r.due) || 0) - paid);
    const state = r.forgiven ? 'forgiven' : left === 0 ? 'rendered' : paid > 0 ? 'part' : 'owing';
    return { ...r, paid, left, state };
  });
}

const STATES = {
  owing: { name: 'Owing', tag: '' },
  part: { name: 'Part rendered', tag: 'gold' },
  rendered: { name: 'Rendered', tag: 'in' },
  forgiven: { name: 'Forgiven', tag: 'on' }
};

function summary() {
  const rows = withState();
  let due = 0, paid = 0, arrears = 0, forgiven = 0;
  rows.forEach(r => {
    if (r.forgiven) { forgiven += Number(r.due) || 0; return; }
    due += Number(r.due) || 0;
    paid += r.paid;
    arrears += r.left;
  });
  return { count: rows.length, due, paid, arrears, forgiven, owing: rows.filter(r => r.state === 'owing' || r.state === 'part').length };
}

function periods() {
  const seen = new Set();
  roll().forEach(r => { if (r.period) seen.add(r.period); });
  return Array.from(seen).sort();
}

function forHolder(who) {
  const key = String(who || '').trim().toLowerCase();
  if (!key) return [];
  return withState().filter(r => r.who.toLowerCase() === key);
}

module.exports = {
  KINDS, KIND_BY_ID, kindName, STATES,
  roll, rendered, assess, assessFromRoll, amend, strike, render, paidOn, owing, withState, summary, periods, forHolder
};
