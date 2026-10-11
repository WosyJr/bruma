const S = require('./store');

const FILE = 'treasury-dues.json';
const TZ = process.env.COUNTY_TZ || 'America/New_York';
const KINDS = { deed: 'Rent', licence: 'Licence renewal', tax: 'Tax owing' };

function load() {
  const d = S.read(FILE, null);
  if (!d || Array.isArray(d)) return { weeks: [], rows: Array.isArray(d) ? d : [] };
  return { weeks: d.weeks || [], rows: d.rows || [] };
}
function save(d) { S.write(FILE, { weeks: d.weeks.slice(-60), rows: d.rows }); }

function localDate(ms) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date(ms));
  const get = t => (parts.find(p => p.type === t) || {}).value;
  return { iso: get('year') + '-' + get('month') + '-' + get('day'), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')) };
}
function addDays(iso, n) { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function sundayOf(ms) { const d = localDate(ms || Date.now()); return addDays(d.iso, -d.dow); }

function nextNo(rows) { return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1; }

function reckon(ms, opts) {
  const week = sundayOf(ms);
  const d = load();
  if (d.weeks.includes(week) && !(opts && opts.force)) return { week, added: [], already: true };
  const added = [];
  const add = row => {
    const r = Object.assign({ id: S.id(), no: nextNo(d.rows), state: 'pending', at: new Date().toISOString(), week }, row);
    d.rows.push(r);
    added.push(r);
  };
  const Deeds = require('./deeds');
  Deeds.inForce().forEach(x => {
    const rent = Math.round(Number(x.rent) || 0);
    if (rent <= 0) return;
    if (d.rows.some(r => r.kind === 'deed' && r.ref === x.id && r.week === week)) return;
    add({ kind: 'deed', ref: x.id, refNo: x.no, party: x.holder, what: 'Rent of ' + x.propName + ', week of ' + week + ' (deed no. ' + x.no + ')', amount: rent });
  });
  const L = require('./licences');
  const end = addDays(week, 6);
  L.withState().forEach(l => {
    if (l.state !== 'current' || !l.untilIso || l.untilIso < week || l.untilIso > end) return;
    if (d.rows.some(r => r.kind === 'licence' && r.ref === l.id && r.until === l.untilIso)) return;
    const fee = Math.round(Number(l.fee) || L.feeFor(l.trade) || 0);
    if (fee <= 0) return;
    add({ kind: 'licence', ref: l.id, refNo: l.no, until: l.untilIso, party: l.holder, what: 'Renewal of licence no. ' + l.no + ' (' + L.tradeName(l.trade) + '), runs out ' + l.untilIso, amount: fee });
  });
  const Tx = require('./taxes');
  Tx.withState().forEach(t => {
    if (!(t.left > 0)) return;
    if (d.rows.some(r => r.kind === 'tax' && r.ref === t.id && r.state === 'pending')) return;
    add({ kind: 'tax', ref: t.id, refNo: t.no, party: t.who, what: Tx.kindName(t.kind) + (t.period ? ', ' + t.period : '') + ' (assessment no. ' + t.no + ')', amount: t.left });
  });
  if (!d.weeks.includes(week)) d.weeks.push(week);
  save(d);
  return { week, added, already: false };
}

function sync() {
  const d = load();
  let changed = false;
  let Tx = null;
  d.rows.forEach(r => {
    if (r.state !== 'pending' || r.kind !== 'tax') return;
    Tx = Tx || require('./taxes');
    const t = Tx.withState().find(x => x.id === r.ref);
    const left = t ? t.left : 0;
    if (!t || left <= 0) { r.state = t && t.forgiven ? 'waived' : 'collected'; r.note = t && t.forgiven ? 'Forgiven on the tax roll' : 'Rendered on the tax roll'; r.settledAt = new Date().toISOString(); changed = true; }
    else if (left !== r.amount) { r.amount = left; changed = true; }
  });
  if (changed) save(d);
  return d;
}

function all() { return sync().rows.slice().sort((a, b) => b.no - a.no); }
function get(id) { return load().rows.find(r => r.id === String(id || '')) || null; }
function overdue(r, ms) { return r.state === 'pending' && r.week < sundayOf(ms); }
function pending() { return all().filter(r => r.state === 'pending'); }

function summary(ms) {
  const p = pending();
  const od = p.filter(r => overdue(r, ms));
  return { count: p.length, owed: p.reduce((n, r) => n + r.amount, 0), overdue: od.length, overdueSum: od.reduce((n, r) => n + r.amount, 0), week: sundayOf(ms), reckoned: load().weeks.includes(sundayOf(ms)) };
}

function settle(id, what, b, by) {
  const d = load();
  const r = d.rows.find(x => x.id === String(id || ''));
  if (!r) throw new Error('Nothing owed answers to that.');
  if (r.state !== 'pending') throw new Error('That has already been settled.');
  if (what === 'waive') {
    const why = String((b && b.reason) || '').trim().slice(0, 200);
    if (!why) throw new Error('Say why it is waived.');
    r.state = 'waived'; r.note = why;
  } else if (what === 'collect') {
    let entry = null;
    if (r.kind === 'tax') {
      const Tx = require('./taxes');
      const row = Tx.render(r.ref, { amount: r.amount, note: 'Collected from what is owed, no. ' + r.no }, by);
      entry = row && row.treasuryNo ? { no: row.treasuryNo } : null;
      if (!entry) { const T = require('./treasury'); const e = T.ledger().filter(x => x.tax === r.ref).sort((a, z) => z.no - a.no)[0]; entry = e || null; }
    } else {
      const T = require('./treasury');
      if (r.kind === 'deed') {
        const deed = require('./deeds').get(r.ref);
        if (deed) try { require('./property').recordRent(deed.prop, { amount: r.amount, period: 'week of ' + r.week, note: 'Collected through the treasury, owed no. ' + r.no }, by); } catch (_) {}
      }
      entry = T.enter({ way: 'in', acct: 'checking', amount: r.amount, party: r.party, reason: r.what, cat: r.kind === 'deed' ? 'rent' : 'trade', deed: r.kind === 'deed' ? r.ref : '', licence: r.kind === 'licence' ? r.ref : '', due: r.id }, by);
      if (r.kind === 'licence') {
        const L = require('./licences');
        const rows = L.all();
        const l = rows.find(x => x.id === r.ref);
        if (l) { l.treasuryNo = entry.no; S.write('licences.json', rows); }
      }
    }
    r.state = 'collected';
    r.entryNo = entry ? entry.no : '';
  } else throw new Error('Collect it, or waive it.');
  r.settledAt = new Date().toISOString();
  r.by = by.username; r.byName = by.name;
  const fresh = load();
  const i = fresh.rows.findIndex(x => x.id === r.id);
  if (i >= 0) fresh.rows[i] = r;
  save(fresh);
  return r;
}

function rentPaid(propId, amount, period, by) {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return null;
  const Deeds = require('./deeds');
  const deed = Deeds.liveFor(propId);
  const T = require('./treasury');
  const P = require('./property');
  const prop = P.get(propId);
  const entry = T.enter({ way: 'in', acct: 'checking', amount: n, party: (deed && deed.holder) || (prop && prop.holder) || '', reason: 'Rent of ' + ((prop && prop.name) || 'a holding') + (period ? ', ' + period : '') + (deed ? ' (deed no. ' + deed.no + ')' : ''), cat: 'rent', deed: deed ? deed.id : '' }, by);
  if (deed) {
    const d = load();
    let left = n;
    d.rows.filter(r => r.kind === 'deed' && r.ref === deed.id && r.state === 'pending').sort((a, b) => a.week.localeCompare(b.week)).forEach(r => {
      if (left < r.amount) return;
      left -= r.amount;
      r.state = 'collected'; r.entryNo = entry.no; r.settledAt = new Date().toISOString(); r.by = by.username; r.byName = by.name; r.note = 'Rendered on the holding';
    });
    save(d);
  }
  return entry;
}

function due(ms) { return !load().weeks.includes(sundayOf(ms)); }

module.exports = { KINDS, TZ, sundayOf, reckon, sync, all, get, pending, overdue, summary, settle, due, localDate, rentPaid };
