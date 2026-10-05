const S = require('./store');

const FILE = 'archive.json';

const SHELVES = [
  { id: 'charter', name: 'Charters and Grants' },
  { id: 'law', name: 'Laws and Proclamations' },
  { id: 'deed', name: 'Deeds and Conveyances' },
  { id: 'account', name: 'Accounts and Ledgers' },
  { id: 'watch', name: 'Orders of the Watch' },
  { id: 'court', name: 'Judgments of the Court' },
  { id: 'letter', name: 'Letters and Dispatches' },
  { id: 'misc', name: 'Miscellany' }
];
const SHELF_BY_ID = Object.fromEntries(SHELVES.map(s => [s.id, s]));
const shelfName = id => (SHELF_BY_ID[id] ? SHELF_BY_ID[id].name : 'Miscellany');

function all() { return S.read(FILE, []).filter(d => !d.struck); }
function every() { return S.read(FILE, []); }
function get(id) { return every().find(d => d.id === String(id || '')) || null; }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function lay({ title, shelf, text, link, dated, note }, by) {
  const t = String(title || '').trim().slice(0, 180);
  if (!t) throw new Error('Give the document a title.');
  const body = String(text || '').trim().slice(0, 60000);
  const url = String(link || '').trim().slice(0, 500);
  if (!body && !url) throw new Error('A document needs either its text or a link to where it lives.');
  if (url && !/^https?:\/\//i.test(url)) throw new Error('A link must begin with http:// or https://');
  const rows = every();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    title: t,
    shelf: SHELF_BY_ID[shelf] ? shelf : 'misc',
    text: body,
    link: url,
    dated: String(dated || '').trim().slice(0, 80),
    note: String(note || '').trim().slice(0, 400),
    by: by.username,
    byName: by.name,
    at: new Date().toISOString(),
    struck: false
  };
  rows.unshift(row);
  S.write(FILE, rows);
  return row;
}

function amend(id, patch, by) {
  const rows = every();
  const d = rows.find(x => x.id === String(id || ''));
  if (!d) throw new Error('No such document.');
  if (patch.title !== undefined) d.title = String(patch.title).trim().slice(0, 180) || d.title;
  if (patch.shelf !== undefined && SHELF_BY_ID[patch.shelf]) d.shelf = patch.shelf;
  if (patch.text !== undefined) d.text = String(patch.text).trim().slice(0, 60000);
  if (patch.link !== undefined) {
    const url = String(patch.link).trim().slice(0, 500);
    if (url && !/^https?:\/\//i.test(url)) throw new Error('A link must begin with http:// or https://');
    d.link = url;
  }
  if (patch.dated !== undefined) d.dated = String(patch.dated).trim().slice(0, 80);
  if (patch.note !== undefined) d.note = String(patch.note).trim().slice(0, 400);
  d.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return d;
}

function strike(id, by) {
  const rows = every();
  const d = rows.find(x => x.id === String(id || ''));
  if (!d) return null;
  d.struck = true;
  d.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return d;
}

function search(q, shelf) {
  const needle = String(q || '').trim().toLowerCase();
  let rows = all();
  if (shelf && SHELF_BY_ID[shelf]) rows = rows.filter(d => d.shelf === shelf);
  if (needle) rows = rows.filter(d => (d.title + ' ' + d.note + ' ' + d.dated + ' ' + d.text).toLowerCase().includes(needle));
  return rows.sort((a, b) => b.no - a.no);
}

function counts() {
  const out = {};
  SHELVES.forEach(s => { out[s.id] = 0; });
  all().forEach(d => { out[d.shelf] = (out[d.shelf] || 0) + 1; });
  return out;
}

module.exports = { SHELVES, SHELF_BY_ID, shelfName, all, every, get, lay, amend, strike, search, counts };

function seedLex() {
  const rows = every();
  if (rows.some(d => d.lex)) return 0;
  let { LEX } = { LEX: [] };
  try { LEX = require('./lextext').LEX || []; } catch (_) { return 0; }
  if (!LEX.length) return 0;
  let no = rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0);
  const at = new Date().toISOString();
  const made = LEX.map((d, i) => ({
    id: S.id() + i.toString(36),
    no: ++no,
    title: d.title,
    shelf: 'law',
    text: d.text,
    link: '',
    dated: 'Ratified by order of the Count and the Court of Bruma',
    note: 'Part of the Lex Brumae, the legal code of the County.',
    by: 'county',
    byName: 'The Court of Bruma',
    at,
    lex: true,
    struck: false
  }));
  S.write(FILE, made.concat(rows));
  return made.length;
}

module.exports.seedLex = seedLex;

const AMENDMENTS = [
  {
    id: 'art55-civic-standing',
    find: 'Definition: No Beastfolk including, but not limited to, Khajiit and Argonians \\- may own property, dwellings, or commercial holdings within the city walls of Bruma unless granted formal exception by the Court of Bruma.',
    put: 'Definition: No person lacking recognised civic standing within the County of Bruma may own, possess, or hold title to any property, dwelling, or commercial holding within the city walls of Bruma, unless granted a formal exception by the Court of Bruma.'
  }
];

function mendLex() {
  const rows = every();
  const done = [];
  let changed = false;
  rows.forEach(d => {
    if (!d.lex || typeof d.text !== 'string') return;
    AMENDMENTS.forEach(a => {
      if (!d.text.includes(a.find)) return;
      d.text = d.text.split(a.find).join(a.put);
      d.amended = { by: 'The Court of Bruma', at: new Date().toISOString(), what: a.id };
      if (!done.includes(a.id)) done.push(a.id);
      changed = true;
    });
  });
  if (changed) S.write(FILE, rows);
  return done;
}

module.exports.mendLex = mendLex;
module.exports.AMENDMENTS = AMENDMENTS;
