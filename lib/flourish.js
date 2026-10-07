const S = require('./store');

const FILE = 'flourish.json';

const GROUNDS = [
  { id: 'snow', name: 'Snow over stone', note: 'Quarried stone with snow falling across it, settling into a drift along the bottom the longer a page is open. Heavier when the Pale Pass is shut.' },
  { id: 'sky', name: 'The living sky', note: 'The sun and moon on the real clock, the town lighting its windows at dusk, and an aurora that burns harder the more trouble the County is in.' },
  { id: 'none', name: 'Nothing behind it', note: 'Plain dark. The ground the County had before any of this.' }
];
const GROUND_BY_ID = Object.fromEntries(GROUNDS.map(g => [g.id, g]));

const EFFECTS = [
  {
    id: 'sky', name: 'The Ground', where: 'Behind every page',
    note: 'What lies behind the County \u2014 snow falling over dark stone and settling along the bottom, or the living sky with the sun, the town and an aurora that reads how much trouble the County is in.'
  },
  {
    id: 'raven', name: 'The Raven Post', where: 'The Great Hall, for officers',
    note: 'A raven flies in and perches when something waits for you. Click it and it carries you to what it brought.'
  },
  {
    id: 'loom', name: 'The Loom', where: 'Every roll and table',
    note: 'Rows are woven in behind a shuttle rather than appearing all at once.'
  },
  {
    id: 'table', name: 'The War Table', where: 'The property and guild maps',
    note: 'The map becomes a table in a room, lit from one side, that leans as you move over it.'
  }
];
const BY_ID = Object.fromEntries(EFFECTS.map(e => [e.id, e]));
const IDS = EFFECTS.map(e => e.id);

function killed() {
  const v = String(process.env.FLOURISH || '').trim().toLowerCase();
  return v === 'off' || v === 'none' || v === '0' || v === 'false';
}

function saved() {
  const raw = S.read(FILE, null);
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

function state() {
  const on = {};
  const kill = killed();
  const s = saved();
  IDS.forEach(id => { on[id] = kill ? false : s[id] !== false; });
  return on;
}

function on(id) { return state()[String(id || '')] === true; }

function ground() {
  if (killed()) return 'none';
  const s = saved();
  const want = GROUND_BY_ID[s.ground] ? s.ground : 'snow';
  return state().sky ? want : 'none';
}

function setGround(id, by) {
  if (!GROUND_BY_ID[id]) throw new Error('No such ground.');
  const s = saved();
  s.ground = id;
  if (id !== 'none') s.sky = true;
  s.lastBy = (by && by.name) || '';
  s.lastAt = new Date().toISOString();
  S.write(FILE, s);
  return ground();
}

function set(id, want, by) {
  if (!BY_ID[id]) throw new Error('No such flourish.');
  const s = saved();
  s[id] = !!want;
  s.lastBy = (by && by.name) || '';
  s.lastAt = new Date().toISOString();
  S.write(FILE, s);
  return state();
}

function setAll(want, by) {
  const s = saved();
  IDS.forEach(id => { s[id] = !!want; });
  s.lastBy = (by && by.name) || '';
  s.lastAt = new Date().toISOString();
  S.write(FILE, s);
  return state();
}

function attr() {
  const st = state();
  return IDS.filter(id => st[id]).join(' ');
}

function lastTouch() {
  const s = saved();
  return { by: s.lastBy || '', at: s.lastAt || '' };
}

function unrest() {
  let score = 0;
  try {
    const J = require('./gaol');
    const held = J.all().filter(r => !r.released).length;
    score += Math.min(34, held * 9);
  } catch (_) {}
  try {
    const R = require('./reports');
    score += Math.min(24, R.summary().live * 5);
  } catch (_) {}
  try {
    const Ct = require('./court');
    score += Math.min(20, Ct.open().length * 5);
  } catch (_) {}
  try {
    const Pr = require('./proclaim');
    const p = Pr.pass();
    if (p.state === 'shut') score += 34;
    else if (p.state === 'escort') score += 18;
    else if (p.state === 'riders') score += 7;
  } catch (_) {}
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { EFFECTS, BY_ID, IDS, GROUNDS, GROUND_BY_ID, ground, setGround,
  state, on, set, setAll, attr, killed, lastTouch, unrest };
