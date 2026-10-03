const S = require('./store');

const FILE = 'proclamations.json';
const PASS = 'pass.json';

const STATES = [
  { id: 'open', name: 'Open', tag: 'in', say: 'The Pale Pass is open' },
  { id: 'riders', name: 'Open to riders', tag: 'on', say: 'The Pale Pass is open to riders and foot' },
  { id: 'escort', name: 'Open with escort', tag: 'gold', say: 'The Pale Pass is open to those who travel with an escort' },
  { id: 'shut', name: 'Shut', tag: 'out', say: 'The Pale Pass is shut' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));

function all() { return S.read(FILE, []).filter(p => !p.struck); }
function every() { return S.read(FILE, []); }
function get(id) { return every().find(p => p.id === String(id || '')) || null; }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function issue({ title, text, dated, by: hand }, by) {
  const t = String(title || '').trim().slice(0, 180);
  if (!t) throw new Error('Give the proclamation a title.');
  const body = String(text || '').trim().slice(0, 20000);
  if (!body) throw new Error('A proclamation must say something.');
  const rows = every();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    title: t,
    text: body,
    dated: String(dated || '').trim().slice(0, 90),
    hand: String(hand || '').trim().slice(0, 120) || by.name,
    by: by.username,
    at: new Date().toISOString(),
    struck: false
  };
  rows.unshift(row);
  S.write(FILE, rows);
  return row;
}

function amend(id, patch, by) {
  const rows = every();
  const p = rows.find(x => x.id === String(id || ''));
  if (!p) throw new Error('No such proclamation.');
  if (patch.title !== undefined) p.title = String(patch.title).trim().slice(0, 180) || p.title;
  if (patch.text !== undefined) p.text = String(patch.text).trim().slice(0, 20000) || p.text;
  if (patch.dated !== undefined) p.dated = String(patch.dated).trim().slice(0, 90);
  if (patch.hand !== undefined) p.hand = String(patch.hand).trim().slice(0, 120);
  if (patch.struck !== undefined) p.struck = !!patch.struck;
  p.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return p;
}

function strike(id, by) {
  const rows = every();
  const p = rows.find(x => x.id === String(id || ''));
  if (!p) return null;
  p.struck = true;
  p.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return p;
}

function latest() { return all()[0] || null; }

function pass() {
  const p = S.read(PASS, null);
  if (p && STATE_BY_ID[p.state]) return p;
  return { state: 'open', note: '', looked: '', by: '' };
}

function setPass({ state, note }, by) {
  const s = STATE_BY_ID[state] ? state : 'open';
  return S.write(PASS, {
    state: s,
    note: String(note || '').trim().slice(0, 600),
    looked: new Date().toISOString(),
    by: by.name
  });
}

module.exports = { STATES, STATE_BY_ID, all, every, get, issue, amend, strike, latest, pass, setPass };
