const S = require('./store');

const FILE = 'offices.json';

const PERMS = [
  ['The County', [
    ['hall', 'The Great Hall and their own desk'],
    ['proclaim', 'Issue proclamations in the name of the County'],
    ['officers', 'Enter and manage the officers of the County'],
    ['appoint', 'Put people on the rolls, but only in the offices this one may appoint to'],
    ['offices', 'Create and amend the offices themselves'],
    ['flourish', 'Turn the County\u2019s flourishes on and off']
  ]],
  ['The Watch', [
    ['watchclock', 'Clock on and off the watch'],
    ['watchlog', 'Read the whole shift log, not only their own'],
    ['watchroster', 'Keep the roster and the hours'],
    ['watchamend', 'Amend and strike entries in the log'],
    ['watchreport', 'File reports of the Watch and add to them']
  ]],
  ['The Property Roll', [
    ['propread', 'Read the roll and the county map'],
    ['propenter', 'Enter holdings and set who holds them'],
    ['propdeed', 'Draw deeds and record rents'],
    ['propstrike', 'Strike a holding from the roll']
  ]],
  ['The Treasury', [
    ['treasread', 'Read the ledger and the balance'],
    ['treasenter', 'Enter money in and out'],
    ['treascorrect', 'Enter corrections against the ledger'],
    ['treasclose', 'Close the month and settle the accounts']
  ]],
  ['The Guilds', [
    ['guildsee', 'See every guild roll'],
    ['guildown', 'Keep their own guild roll and its tithes'],
    ['guildpurse', 'See what their own guild has rendered and what it owes'],
    ['guildcharter', 'Grant, amend and revoke guild charters']
  ]],
  ['The Gaol', [
    ['gaolsee', 'See who is held in the gaol'],
    ['gaolcommit', 'Commit a person to the gaol'],
    ['gaolrelease', 'Release a person from the gaol']
  ]],
  ['The Trade of the County', [
    ['licsee', 'See the licences to trade'],
    ['licgrant', 'Grant and renew licences to trade'],
    ['licrevoke', 'Revoke a licence to trade'],
    ['licstrike', 'Strike a licence from the roll altogether']
  ]],
  ['The Petitions', [
    ['petsee', 'Read the petitions laid before the County'],
    ['petanswer', 'Answer a petition in the name of the County']
  ]],
  ['The Court', [
    ['courtsee', 'Read the matters before the court'],
    ['courtfile', 'Lay a matter before the court'],
    ['courtsit', 'Set hearings and give judgment'],
    ['courtstrike', 'Strike a matter from the court roll']
  ]],
  ['The Archive', [
    ['archread', 'Read the archive'],
    ['archwrite', 'Lay documents into the archive'],
    ['archstrike', 'Withdraw a document from the archive']
  ]]
];

const PERM_IDS = PERMS.reduce((all, g) => all.concat(g[1].map(p => p[0])), []);
const PERM_NAME = {};
PERMS.forEach(g => g[1].forEach(p => { PERM_NAME[p[0]] = p[1]; }));

const GUILDS = [
  { id: 'synod', name: 'The Synod', of: 'the Synod' },
  { id: 'miners', name: 'The Miners Guild', of: 'the Miners Guild' },
  { id: 'fighters', name: 'The Fighters Guild', of: 'the Fighters Guild' },
  { id: 'hunters', name: 'The Hunters Guild', of: 'the Hunters Guild' }
];
const GUILD_BY_ID = Object.fromEntries(GUILDS.map(g => [g.id, g]));

const SEED = [
  { id: 'master', name: 'Master of the Hold', rank: 0, all: true, fixed: true, note: 'Holds the County and everything in it. This office cannot be emptied.' },
  { id: 'count', name: 'Count of Bruma', rank: 1, all: true, note: 'Holds the County. Everything in these halls is open to the Count.' },
  { id: 'countess', name: 'Countess of Bruma', rank: 1, all: true, note: 'Holds the County. Everything in these halls is open to the Countess.' },
  { id: 'steward', name: 'Steward of Bruma', rank: 2, all: true, note: 'Keeps the County on behalf of its holders, and may do all that they may do.' },
  {
    id: 'captain', name: 'Captain of the Watch', rank: 3,
    perms: ['hall', 'appoint', 'watchclock', 'watchlog', 'watchroster', 'watchamend', 'watchreport', 'propread', 'courtsee', 'courtfile', 'archread', 'gaolsee', 'gaolcommit', 'licsee', 'petsee'],
    appoints: ['guard'],
    note: 'Keeps the Watch, its roster and its log, and puts guards on the rolls.'
  },
  {
    id: 'guard', name: 'Guardsman of Bruma', rank: 6,
    perms: ['hall', 'watchclock', 'watchreport', 'propread', 'courtfile', 'archread', 'gaolsee', 'licsee'],
    note: 'Stands the watch. Clocks on and off, reads his own hours, and keeps the gaol.'
  },
  {
    id: 'synod-master', name: 'Master of the Synod', rank: 4, guild: 'synod',
    perms: ['hall', 'appoint', 'guildown', 'propread', 'courtfile', 'archread', 'guildpurse'],
    appoints: [],
    note: 'Keeps the roll of the Synod and renders its tithes.'
  },
  {
    id: 'miners-master', name: 'Master of the Miners Guild', rank: 4, guild: 'miners',
    perms: ['hall', 'appoint', 'guildown', 'propread', 'courtfile', 'archread', 'guildpurse'],
    appoints: [],
    note: 'Keeps the roll of the Miners Guild and renders its tithes.'
  },
  {
    id: 'fighters-master', name: 'Master of the Fighters Guild', rank: 4, guild: 'fighters',
    perms: ['hall', 'appoint', 'guildown', 'propread', 'courtfile', 'archread', 'guildpurse'],
    appoints: [],
    note: 'Keeps the roll of the Fighters Guild and renders its tithes.'
  },
  {
    id: 'hunters-master', name: 'Master of the Hunters Guild', rank: 4, guild: 'hunters',
    perms: ['hall', 'appoint', 'guildown', 'propread', 'courtfile', 'archread', 'guildpurse'],
    appoints: [],
    note: 'Keeps the roll of the Hunters Guild and renders its tithes.'
  },
  {
    id: 'clerk', name: 'Clerk of the County', rank: 5,
    perms: ['hall', 'watchlog', 'watchreport', 'propread', 'propenter', 'propdeed', 'treasread', 'treasenter', 'guildsee', 'courtsee', 'courtfile', 'archread', 'archwrite', 'gaolsee', 'licsee', 'licgrant', 'petsee', 'petanswer'],
    note: 'Enters what the County records: holdings, money and documents.'
  },
  {
    id: 'citizen', name: 'Citizen of Bruma', rank: 9,
    perms: ['hall', 'propread', 'courtfile', 'archread'],
    note: 'A subject of the County. May read the roll and lay a matter before the court.'
  }
];

const UNLISTED = new Set(['master', 'guard', 'citizen']);

function clean(o) {
  const perms = o.all ? PERM_IDS.slice() : (Array.isArray(o.perms) ? o.perms.filter(p => PERM_IDS.includes(p)) : []);
  const id = String(o.id || '').trim();
  return {
    id,
    name: String(o.name || '').trim(),
    rank: Number.isFinite(Number(o.rank)) ? Number(o.rank) : 9,
    all: !!o.all,
    fixed: !!o.fixed,
    listed: o.listed === undefined ? !UNLISTED.has(id) : !!o.listed,
    guild: GUILD_BY_ID[o.guild] ? o.guild : '',
    appoints: Array.isArray(o.appoints) ? o.appoints.map(x => String(x || '').trim()).filter(Boolean).slice(0, 20) : [],
    note: String(o.note || '').trim().slice(0, 300),
    perms
  };
}

function all() {
  const rows = S.read(FILE, null);
  if (!Array.isArray(rows) || !rows.length) {
    const seeded = SEED.map(clean);
    S.write(FILE, seeded);
    return seeded;
  }
  const out = rows.map(clean).filter(o => o.id && o.name);
  let grew = false;
  if (!out.some(o => o.id === 'master')) { out.unshift(clean(SEED[0])); grew = true; }
  SEED.forEach(seed => {
    if (out.some(o => o.id === seed.id)) return;
    out.push(clean(seed));
    grew = true;
  });
  out.forEach(o => {
    if (o.all) return;
    if (o.perms.includes('watchclock') || o.perms.includes('watchlog')) {
      if (!o.perms.includes('watchreport')) { o.perms.push('watchreport'); grew = true; }
    }
    if (o.perms.includes('licrevoke') && !o.perms.includes('licstrike')) {
      o.perms.push('licstrike'); grew = true;
    }
  });
  out.forEach(o => {
    if (o.all || !o.guild) return;
    if (!o.perms.includes('guildown')) return;
    const i = o.perms.indexOf('treasread');
    if (i >= 0) { o.perms.splice(i, 1); grew = true; }
    ['treasenter', 'treascorrect', 'treasclose', 'propenter', 'propdeed', 'propstrike'].forEach(p => {
      const j = o.perms.indexOf(p);
      if (j >= 0) { o.perms.splice(j, 1); grew = true; }
    });
    if (!o.perms.includes('guildpurse')) { o.perms.push('guildpurse'); grew = true; }
  });
  if (grew) S.write(FILE, out);
  return out.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}

function get(id) { return all().find(o => o.id === String(id || '')) || null; }

function save(rows) { return S.write(FILE, rows.map(clean)); }

function create(patch) {
  const rows = all();
  const id = String(patch.id || patch.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!id) throw new Error('Give the office a name.');
  if (rows.some(o => o.id === id)) throw new Error('An office of that name already stands.');
  const row = clean({ ...patch, id, fixed: false });
  if (!row.name) throw new Error('Give the office a name.');
  rows.push(row);
  save(rows);
  return row;
}

function amend(id, patch) {
  const rows = all();
  const o = rows.find(x => x.id === String(id || ''));
  if (!o) throw new Error('No such office.');
  if (o.fixed && patch.all === false) throw new Error('The Master of the Hold cannot be stripped of the Hold.');
  const next = clean({ ...o, ...patch, id: o.id, fixed: o.fixed });
  rows[rows.indexOf(o)] = next;
  save(rows);
  return next;
}

function remove(id) {
  const rows = all();
  const o = rows.find(x => x.id === String(id || ''));
  if (!o) return;
  if (o.fixed) throw new Error('The Master of the Hold cannot be struck.');
  save(rows.filter(x => x !== o));
}

function can(u, perm) {
  if (!u) return false;
  if (u.all) return true;
  return (u.perms || []).includes(perm);
}

function holdsTheCounty(u) { return !!(u && u.all); }

function mayAppointTo(u) {
  if (!u) return [];
  if (can(u, 'officers')) return all().map(o => o.id);
  if (!can(u, 'appoint')) return [];
  const mine = get(u.office);
  const list = (mine && mine.appoints) || [];
  return list.filter(id => get(id));
}

function canAppointTo(u, officeId) {
  return mayAppointTo(u).includes(String(officeId || ''));
}

function guildOf(u) {
  if (!u) return '';
  return GUILD_BY_ID[u.guild] ? u.guild : '';
}

function maySeeGuild(u, guildId) {
  if (!u) return false;
  if (can(u, 'guildsee')) return true;
  return can(u, 'guildown') && guildOf(u) === String(guildId || '');
}

module.exports = {
  PERMS, PERM_IDS, PERM_NAME, GUILDS, GUILD_BY_ID, SEED,
  all, get, create, amend, remove, save, can, holdsTheCounty, mayAppointTo, canAppointTo, guildOf, maySeeGuild
};
