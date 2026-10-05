const S = require('./store');
const O = require('./offices');

const FILE = 'guild-marks.json';

const MAPS = [
  { id: 'county', name: 'The County', file: '/county-map.png', note: 'The whole of Bruma and the Jeralls.' },
  { id: 'city', name: 'The City', file: '/city-map.png', note: 'Within the walls of Bruma itself.' }
];
const MAP_BY_ID = Object.fromEntries(MAPS.map(m => [m.id, m]));
const mapName = id => (MAP_BY_ID[id] ? MAP_BY_ID[id].name : 'The County');

const PATHS = {
  ground: 'M2 14 L8 4 L14 12 L20 2 L22 14',
  den: 'M3 16 L3 9 L12 3 L21 9 L21 16 M9 16 L9 11 L15 11 L15 16',
  line: 'M2 6 L8 14 L14 6 L20 14 M2 18 L22 18',
  lodge: 'M4 18 L4 9 L12 3 L20 9 L20 18 M12 18 L12 12',
  mine: 'M12 3 L12 20 M5 9 L19 9 M7 20 L17 20',
  seam: 'M2 16 L7 8 L12 15 L17 6 L22 13',
  quarry: 'M3 18 L8 6 L16 6 L21 18 Z',
  smelt: 'M6 20 L6 11 L12 4 L18 11 L18 20 M10 20 L10 15 L14 15 L14 20',
  contract: 'M5 3 L19 3 L19 21 L5 21 Z M9 9 L15 9 M9 13 L15 13',
  muster: 'M12 2 L12 22 M5 7 L19 7 M7 2 L7 7 M17 2 L17 7',
  patrol: 'M4 20 L10 4 L14 20 L20 4',
  danger: 'M12 3 L22 20 L2 20 Z M12 10 L12 14 M12 17 L12 17.5',
  site: 'M12 2 L15 9 L22 12 L15 15 L12 22 L9 15 L2 12 L9 9 Z',
  ward: 'M12 3 L20 7 L20 13 C20 18 12 21 12 21 C12 21 4 18 4 13 L4 7 Z',
  cache: 'M4 8 L20 8 L20 20 L4 20 Z M4 8 L12 3 L20 8 M10 14 L14 14',
  mark: 'M12 3 L21 20 L3 20 Z'
};

const COMMON = [
  { id: 'mark', name: 'A mark upon the map', note: 'Anything worth setting down.' }
];

const KINDS = {
  hunters: [
    { id: 'ground', name: 'Hunting ground', note: 'Where the guild takes game, and in what season.' },
    { id: 'den', name: 'Den or lair', note: 'A beast’s hole. Cleared or still working.' },
    { id: 'line', name: 'Trap line', note: 'Snares and lines run by the hall.' },
    { id: 'lodge', name: 'Lodge or camp', note: 'A standing camp of the guild.' },
    { id: 'danger', name: 'Danger to travellers', note: 'Worth telling the Watch about.' }
  ],
  miners: [
    { id: 'mine', name: 'Mine', note: 'A working mine of the guild.' },
    { id: 'seam', name: 'Seam or prospect', note: 'Found but not yet dug.' },
    { id: 'quarry', name: 'Quarry', note: 'Stone, not ore.' },
    { id: 'smelt', name: 'Smelter or works', note: 'Where ore is made into metal.' },
    { id: 'danger', name: 'Collapse or hazard', note: 'Shut, flooded or unsafe.' }
  ],
  fighters: [
    { id: 'contract', name: 'Contract', note: 'Work the hall has taken on.' },
    { id: 'patrol', name: 'Patrol route', note: 'A road the hall walks under contract.' },
    { id: 'muster', name: 'Muster point', note: 'Where the hall forms up.' },
    { id: 'danger', name: 'Trouble', note: 'Bandits, beasts, or worse.' },
    { id: 'lodge', name: 'Billet or camp', note: 'Where the hall is quartered.' }
  ],
  synod: [
    { id: 'site', name: 'Site of interest', note: 'A ruin, a ley, a thing worth study.' },
    { id: 'ward', name: 'Ward set', note: 'A warding laid by the Conclave.' },
    { id: 'cache', name: 'Cache', note: 'What the Conclave keeps, and where.' },
    { id: 'danger', name: 'Anomaly', note: 'Something gone wrong. Approach with care.' },
    { id: 'lodge', name: 'Hall or outpost', note: 'A holding of the Conclave.' }
  ]
};

const STATES = [
  { id: 'open', name: 'Open', tag: 'in', ring: '#8FC7A1' },
  { id: 'working', name: 'Being worked', tag: 'gold', ring: '#E09A3E' },
  { id: 'watch', name: 'Watch it', tag: 'out', ring: '#D08E80' },
  { id: 'shut', name: 'Shut or done', tag: '', ring: '#A8967C' }
];
const STATE_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]));
const stateName = id => (STATE_BY_ID[id] ? STATE_BY_ID[id].name : 'Open');
const ringOf = id => (STATE_BY_ID[id] ? STATE_BY_ID[id].ring : '#E09A3E');

function kindsFor(guildId) {
  return (KINDS[guildId] || KINDS.miners).concat(COMMON);
}
function kindOf(guildId, id) {
  return kindsFor(guildId).find(k => k.id === String(id || '')) || kindsFor(guildId)[0];
}
function kindName(guildId, id) { return kindOf(guildId, id).name; }
function kindPath(id) { return PATHS[String(id || '')] || PATHS.mark; }

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);

function every() { return S.read(FILE, []); }

function all(guildId, mapId) {
  const g = String(guildId || '');
  return every().filter(m => m.guild === g && (!mapId || m.map === mapId))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function shown(guildId, mapId) {
  return all(guildId, mapId).filter(m => !m.hidden);
}

function countShownByMap(guildId) {
  const out = {};
  MAPS.forEach(m => { out[m.id] = 0; });
  shown(guildId).forEach(m => { out[m.map] = (out[m.map] || 0) + 1; });
  return out;
}

function shownCount(guildId) { return shown(guildId).length; }

function get(id) { return every().find(m => m.id === String(id || '')) || null; }

function nextNumber(rows) {
  return rows.reduce((n, r) => Math.max(n, Number(r.no) || 0), 0) + 1;
}

function countByMap(guildId) {
  const out = {};
  MAPS.forEach(m => { out[m.id] = 0; });
  all(guildId).forEach(m => { out[m.map] = (out[m.map] || 0) + 1; });
  return out;
}

function place(guildId, body, by) {
  if (!O.GUILD_BY_ID[guildId]) throw new Error('No such guild.');
  const name = clean(body.name, 120);
  if (!name) throw new Error('Give the mark a name.');
  const x = Number(body.x);
  const y = Number(body.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Click the map to set where it lies.');
  const rows = every();
  const row = {
    id: S.id(),
    no: nextNumber(rows.filter(r => r.guild === guildId)),
    guild: guildId,
    map: MAP_BY_ID[body.map] ? body.map : 'county',
    name,
    kind: kindOf(guildId, body.kind).id,
    state: STATE_BY_ID[body.state] ? body.state : 'open',
    who: clean(body.who, 120),
    note: clean(body.note, 1000),
    hidden: !!body.hidden,
    x: Math.min(100, Math.max(0, Math.round(x * 100) / 100)),
    y: Math.min(100, Math.max(0, Math.round(y * 100) / 100)),
    by: by.username,
    byName: by.name,
    at: new Date().toISOString()
  };
  rows.push(row);
  S.write(FILE, rows);
  return row;
}

function amend(id, body, by) {
  const rows = every();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such mark.');
  if (body.name !== undefined && clean(body.name, 120)) m.name = clean(body.name, 120);
  if (body.kind !== undefined) m.kind = kindOf(m.guild, body.kind).id;
  if (body.state !== undefined && STATE_BY_ID[body.state]) m.state = body.state;
  if (body.who !== undefined) m.who = clean(body.who, 120);
  if (body.note !== undefined) m.note = clean(body.note, 1000);
  if (body.hiddenset !== undefined) m.hidden = !!body.hidden;
  if (body.x !== undefined && Number.isFinite(Number(body.x))) m.x = Math.min(100, Math.max(0, Math.round(Number(body.x) * 100) / 100));
  if (body.y !== undefined && Number.isFinite(Number(body.y))) m.y = Math.min(100, Math.max(0, Math.round(Number(body.y) * 100) / 100));
  m.amended = { by: by.name, at: new Date().toISOString() };
  S.write(FILE, rows);
  return m;
}

function strike(id) {
  S.write(FILE, every().filter(m => m.id !== String(id || '')));
}

function summary(guildId) {
  const rows = all(guildId);
  const byState = {};
  STATES.forEach(s => { byState[s.id] = 0; });
  rows.forEach(m => { byState[m.state] = (byState[m.state] || 0) + 1; });
  return {
    total: rows.length, byState, byMap: countByMap(guildId),
    shown: rows.filter(m => !m.hidden).length,
    kept: rows.filter(m => m.hidden).length
  };
}

module.exports = {
  MAPS, MAP_BY_ID, mapName, KINDS, COMMON, STATES, STATE_BY_ID, stateName, ringOf,
  kindsFor, kindOf, kindName, kindPath,
  every, all, shown, get, place, amend, strike, countByMap, countShownByMap, shownCount, summary
};
