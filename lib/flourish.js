const S = require('./store');

const FILE = 'flourish.json';

const EFFECTS = [
  {
    id: 'sky', name: 'The Living Sky', where: 'Behind the crest, every page',
    note: 'The sun and moon on the real clock, the town lighting its windows at dusk, and an aurora that burns harder the more trouble the County is in.'
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

module.exports = { EFFECTS, BY_ID, IDS, state, on, set, setAll, attr, killed, lastTouch, unrest };
