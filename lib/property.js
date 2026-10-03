const S = require('./store');

const FILE = 'property.json';
const RENTS = 'rents.json';

const MAPS = [
  { id: 'county', name: 'The County', file: '/county-map.png', note: 'The whole of Bruma and the Jeralls.' },
  { id: 'city', name: 'The City', file: '/city-map.png', note: 'Within the walls of Bruma itself.' }
];
const MAP_BY_ID = Object.fromEntries(MAPS.map(m => [m.id, m]));
const mapName = id => (MAP_BY_ID[id] ? MAP_BY_ID[id].name : 'The County');

const KINDS = [
  { id: 'house', name: 'House', d: 'M4 12 14 4l10 8v12H4z' },
  { id: 'manor', name: 'Manor', d: 'M3 24V11l11-7 11 7v13z M11 24v-7h6v7z' },
  { id: 'farm', name: 'Farm', d: 'M4 24V12h20v12z M9 24v-6h4v6z' },
  { id: 'shop', name: 'Shop or Stall', d: 'M4 10h20v4H4z M6 14v10h14V14z' },
  { id: 'inn', name: 'Inn or Tavern', d: 'M5 6h14v8a7 7 0 0 1-14 0z M19 8h4v4h-4z' },
  { id: 'mine', name: 'Mine', d: 'M3 22 14 6l11 16z M14 14v8' },
  { id: 'mill', name: 'Mill', d: 'M14 14 4 6 M14 14l10-8 M14 14v10' },
  { id: 'tower', name: 'Tower or Post', d: 'M10 24V8h8v16z M9 8h10l-5-5z' },
  { id: 'chapel', name: 'Chapel or Shrine', d: 'M14 3v8 M10 7h8 M6 24V13l8-5 8 5v11z' },
  { id: 'ruin', name: 'Ruin', d: 'M4 24V12l5 4 4-8 4 6 5-3v13z' },
  { id: 'land', name: 'Open Land', d: 'M3 20c4-6 8-6 11 0s8 6 11 0' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Holding');
const kindPath = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].d : KINDS[0].d);

const STATES = [
  { id: 'held', name: 'Held', tag: 'on' },
  { id: 'vacant', name: 'Vacant', tag: '' },
  { id: 'crown', name: 'Held by the County', tag: 'gold' },
  { id: 'disputed', name: 'In dispute', tag: 'out' },
  { id: 'ruined', name: 'Ruined', tag: 'out' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));

function all(mapId) {
  const rows = S.read(FILE, []).filter(p => !p.struck);
  if (!mapId) return rows;
  const key = MAP_BY_ID[mapId] ? mapId : 'county';
  return rows.filter(p => (MAP_BY_ID[p.map] ? p.map : 'county') === key);
}

function countByMap() {
  const out = {};
  MAPS.forEach(m => { out[m.id] = 0; });
  all().forEach(p => { const k = MAP_BY_ID[p.map] ? p.map : 'county'; out[k] = (out[k] || 0) + 1; });
  return out;
}

function every() { return S.read(FILE, []); }

function get(id) { return every().find(p => p.id === String(id || '')) || null; }

function nextNumber(rows) {
  const n = rows.reduce((m, p) => Math.max(m, Number(p.no) || 0), 0);
  return n + 1;
}

function clean(patch, base) {
  const b = base || {};
  const x = Number(patch.x !== undefined ? patch.x : b.x);
  const y = Number(patch.y !== undefined ? patch.y : b.y);
  return {
    map: MAP_BY_ID[patch.map] ? patch.map : (MAP_BY_ID[b.map] ? b.map : 'county'),
    name: String(patch.name !== undefined ? patch.name : b.name || '').trim().slice(0, 120),
    kind: KIND_BY_ID[patch.kind] ? patch.kind : (b.kind || 'house'),
    state: STATE_BY_ID[patch.state] ? patch.state : (b.state || 'vacant'),
    holder: String(patch.holder !== undefined ? patch.holder : b.holder || '').trim().slice(0, 120),
    place: String(patch.place !== undefined ? patch.place : b.place || '').trim().slice(0, 120),
    rent: Math.max(0, Math.round(Number(patch.rent !== undefined ? patch.rent : b.rent) || 0)),
    note: String(patch.note !== undefined ? patch.note : b.note || '').trim().slice(0, 1000),
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, Math.round(x * 100) / 100)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, Math.round(y * 100) / 100)) : 50
  };
}

function enter(patch, by) {
  const rows = every();
  const body = clean(patch);
  if (!body.name) throw new Error('Give the holding a name.');
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    ...body,
    struck: false,
    entered: { by: by.username, at: new Date().toISOString() }
  };
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function amend(id, patch, by) {
  const rows = every();
  const row = rows.find(p => p.id === String(id || ''));
  if (!row) throw new Error('No such holding.');
  Object.assign(row, clean(patch, row));
  row.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return row;
}

function strike(id, by) {
  const rows = every();
  const row = rows.find(p => p.id === String(id || ''));
  if (!row) return null;
  row.struck = true;
  row.amended = { by: by.username, at: new Date().toISOString() };
  S.write(FILE, rows);
  return row;
}

function rents() { return S.read(RENTS, []); }

function recordRent(propId, { amount, period, note }, by) {
  const p = get(propId);
  if (!p) throw new Error('No such holding.');
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) throw new Error('A rent must be more than nothing.');
  const list = rents();
  const row = {
    id: S.id(),
    prop: p.id,
    propName: p.name,
    holder: p.holder,
    amount: n,
    period: String(period || '').trim().slice(0, 60),
    note: String(note || '').trim().slice(0, 300),
    by: by.username,
    at: new Date().toISOString()
  };
  list.unshift(row);
  S.write(RENTS, list);
  return row;
}

function rentsFor(propId) {
  return rents().filter(r => r.prop === String(propId || ''));
}

function summary() {
  const rows = all();
  const byState = {};
  STATES.forEach(s => { byState[s.id] = 0; });
  let rentRoll = 0;
  rows.forEach(p => {
    byState[p.state] = (byState[p.state] || 0) + 1;
    if (p.state === 'held') rentRoll += Number(p.rent) || 0;
  });
  return { total: rows.length, byState, rentRoll };
}

function search(q, mapId) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = all(mapId).sort((a, b) => a.no - b.no);
  if (!needle) return rows;
  return rows.filter(p => (p.name + ' ' + p.holder + ' ' + p.place + ' ' + kindName(p.kind)).toLowerCase().includes(needle));
}

module.exports = {
  MAPS, MAP_BY_ID, mapName, countByMap,
  KINDS, KIND_BY_ID, kindName, kindPath, STATES, STATE_BY_ID,
  all, every, get, enter, amend, strike, rents, recordRent, rentsFor, summary, search
};
