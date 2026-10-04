const S = require('./store');
const O = require('./offices');
const Lad = require('./guildladder');

const MEMBERS = 'guild-members.json';
const CHARTERS = 'guild-charters.json';
const CONTRACTS = 'guild-contracts.json';
const SEATS = 'guild-seats.json';

const STANDINGS = [
  { id: 'hall', name: 'In hall', tag: '' },
  { id: 'contract', name: 'On contract', tag: 'gold' },
  { id: 'away', name: 'Away', tag: '' },
  { id: 'probation', name: 'Probation', tag: 'on' },
  { id: 'expelled', name: 'Expelled', tag: 'out' }
];
const STANDING_BY_ID = Object.fromEntries(STANDINGS.map(s => [s.id, s]));
const standingName = id => (STANDING_BY_ID[id] ? STANDING_BY_ID[id].name : 'In hall');

const GRADES = [
  { id: 'master', name: 'Master', rank: 0 },
  { id: 'warden', name: 'Warden', rank: 1 },
  { id: 'journeyman', name: 'Journeyman', rank: 2 },
  { id: 'member', name: 'Member', rank: 3 },
  { id: 'apprentice', name: 'Apprentice', rank: 4 }
];
const GRADE_BY_ID = Object.fromEntries(GRADES.map(g => [g.id, g]));
const gradeName = id => (GRADE_BY_ID[id] ? GRADE_BY_ID[id].name : 'Member');

function members() { return S.read(MEMBERS, []); }

function roll(guildId) {
  const g = String(guildId || '');
  return members().filter(m => m.guild === g && !m.struck).map(m => {
    const rank = Lad.normalise(g, m.rank || m.grade);
    const r = Lad.rankOf(g, rank);
    return { ...m, rank, rankName: r ? r.name : 'Associate', step: r ? r.step : 0,
      standing: STANDING_BY_ID[m.standing] ? m.standing : 'hall' };
  }).sort((a, b) => b.step - a.step || a.name.localeCompare(b.name));
}

function admit(guildId, { name, grade, trade, note }, by) {
  if (!O.GUILD_BY_ID[guildId]) throw new Error('No such guild.');
  const n = String(name || '').trim().slice(0, 100);
  if (!n) throw new Error('Give the member a name.');
  const list = members();
  const row = {
    id: S.id(),
    guild: guildId,
    name: n,
    rank: Lad.normalise(guildId, grade),
    grade: GRADE_BY_ID[grade] ? grade : 'member',
    standing: 'hall',
    trade: String(trade || '').trim().slice(0, 100),
    note: String(note || '').trim().slice(0, 400),
    admitted: new Date().toISOString(),
    by: by.username,
    struck: false
  };
  list.push(row);
  S.write(MEMBERS, list);
  return row;
}

function amendMember(id, patch, by) {
  const list = members();
  const m = list.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such member.');
  if (patch.name !== undefined) m.name = String(patch.name).trim().slice(0, 100) || m.name;
  if (patch.grade !== undefined && GRADE_BY_ID[patch.grade]) m.grade = patch.grade;
  if (patch.rank !== undefined) m.rank = Lad.normalise(m.guild, patch.rank);
  if (patch.standing !== undefined && STANDING_BY_ID[patch.standing]) m.standing = patch.standing;
  if (patch.trade !== undefined) m.trade = String(patch.trade).trim().slice(0, 100);
  if (patch.note !== undefined) m.note = String(patch.note).trim().slice(0, 400);
  if (patch.struck !== undefined) m.struck = !!patch.struck;
  m.amended = { by: by.username, at: new Date().toISOString() };
  S.write(MEMBERS, list);
  return m;
}

function charters() { return S.read(CHARTERS, []); }

function charterFor(guildId) {
  return charters().find(c => c.guild === String(guildId || '')) || null;
}

function setCharter(guildId, { title, text }, by) {
  if (!O.GUILD_BY_ID[guildId]) throw new Error('No such guild.');
  const list = charters();
  const existing = list.find(c => c.guild === guildId);
  const row = {
    guild: guildId,
    title: String(title || '').trim().slice(0, 160) || (O.GUILD_BY_ID[guildId].name + ' — Charter'),
    text: String(text || '').trim().slice(0, 20000),
    by: by.username,
    byName: by.name,
    at: new Date().toISOString()
  };
  if (existing) list[list.indexOf(existing)] = row; else list.push(row);
  S.write(CHARTERS, list);
  return row;
}

function counts() {
  const out = {};
  O.GUILDS.forEach(g => { out[g.id] = 0; });
  members().forEach(m => { if (!m.struck) out[m.guild] = (out[m.guild] || 0) + 1; });
  return out;
}

function contracts(guildId) {
  const g = String(guildId || '');
  return S.read(CONTRACTS, []).filter(c => !g || c.guild === g)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function openContracts(guildId) { return contracts(guildId).filter(c => c.state === 'open'); }

function postContract(guildId, body, by) {
  if (!O.GUILD_BY_ID[guildId]) throw new Error('No such guild.');
  const title = String(body.title || '').trim().slice(0, 160);
  if (!title) throw new Error('Give the contract a title.');
  const list = S.read(CONTRACTS, []);
  const row = {
    id: S.id(),
    guild: guildId,
    title,
    cat: String(body.cat || '').trim().slice(0, 80),
    fee: Math.max(0, Math.round(Number(body.fee) || 0)),
    standing: !!body.standing,
    note: String(body.note || '').trim().slice(0, 2000),
    state: 'open',
    takenBy: '',
    takenAt: '',
    by: by.username,
    byName: by.name,
    at: new Date().toISOString()
  };
  list.unshift(row);
  S.write(CONTRACTS, list);
  return row;
}

function setContract(id, patch, by) {
  const list = S.read(CONTRACTS, []);
  const c = list.find(x => x.id === String(id || ''));
  if (!c) throw new Error('No such contract.');
  if (patch.state && ['open', 'taken', 'done', 'withdrawn'].includes(patch.state)) {
    c.state = patch.state;
    if (patch.state === 'taken') { c.takenBy = String(patch.takenBy || '').trim().slice(0, 120); c.takenAt = new Date().toISOString(); }
  }
  if (patch.title !== undefined && String(patch.title).trim()) c.title = String(patch.title).trim().slice(0, 160);
  if (patch.cat !== undefined) c.cat = String(patch.cat).trim().slice(0, 80);
  if (patch.fee !== undefined) c.fee = Math.max(0, Math.round(Number(patch.fee) || 0));
  if (patch.note !== undefined) c.note = String(patch.note).trim().slice(0, 2000);
  c.amended = { by: by.name, at: new Date().toISOString() };
  S.write(CONTRACTS, list);
  return c;
}

function dropContract(id) {
  S.write(CONTRACTS, S.read(CONTRACTS, []).filter(c => c.id !== String(id || '')));
}

function seats() { return S.read(SEATS, {}); }

function seat(guildId) {
  const s = seats()[String(guildId || '')] || {};
  return { steward: s.steward || '', duties: s.duties || {}, rendered: Number(s.rendered) || 0 };
}

function setSeat(guildId, patch, by) {
  if (!O.GUILD_BY_ID[guildId]) throw new Error('No such guild.');
  const all = seats();
  const cur = seat(guildId);
  if (patch.steward !== undefined) cur.steward = String(patch.steward).trim().slice(0, 120);
  if (patch.rendered !== undefined) cur.rendered = Math.max(0, Math.round(Number(patch.rendered) || 0));
  if (patch.duty && patch.dutyName !== undefined) {
    cur.duties = cur.duties || {};
    cur.duties[String(patch.duty).slice(0, 40)] = String(patch.dutyName).trim().slice(0, 120);
  }
  cur.by = by.name;
  cur.at = new Date().toISOString();
  all[guildId] = cur;
  S.write(SEATS, all);
  return cur;
}

function recent(limit) {
  const out = [];
  const gname = id => (O.GUILD_BY_ID[id] || {}).name || '';
  const shortName = id => gname(id).replace(/^The\s+/, '').replace(/\s+Guild$/, '');
  members().forEach(m => {
    if (m.struck) return;
    const r = Lad.rankOf(m.guild, Lad.normalise(m.guild, m.rank || m.grade));
    out.push({
      at: m.admitted,
      guild: m.guild,
      guildName: shortName(m.guild),
      text: r && r.step > 0
        ? m.name + ' raised to ' + r.name
        : m.name + ' admitted to the hall'
    });
    if (m.amended && m.standing === 'expelled') {
      out.push({ at: m.amended.at, guild: m.guild, guildName: shortName(m.guild),
        text: m.name + ' expelled under the charter' });
    }
  });
  S.read(CONTRACTS, []).forEach(c => {
    out.push({ at: c.at, guild: c.guild, guildName: shortName(c.guild),
      text: 'Contract posted: ' + c.title });
    if (c.state === 'taken' && c.takenAt) {
      out.push({ at: c.takenAt, guild: c.guild, guildName: shortName(c.guild),
        text: 'Contract taken: ' + c.title });
    }
    if (c.state === 'done') {
      out.push({ at: (c.amended && c.amended.at) || c.takenAt || c.at, guild: c.guild,
        guildName: shortName(c.guild), text: 'Contract closed: ' + c.title });
    }
  });
  const st = seats();
  Object.keys(st).forEach(id => {
    const row = st[id];
    if (row && row.steward && row.at) {
      out.push({ at: row.at, guild: id, guildName: shortName(id),
        text: row.steward + ' confirmed as Steward of the hall' });
    }
  });
  charters().forEach(c => {
    out.push({ at: c.at, guild: c.guild, guildName: shortName(c.guild),
      text: 'Charter laid for the hall' });
  });
  return out.filter(r => r.at).sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, Number(limit) || 8);
}

function hallSummary(guildId) {
  const r = roll(guildId);
  const s = seat(guildId);
  return {
    onRoll: r.length,
    inHall: r.filter(m => m.standing === 'hall').length,
    onContract: r.filter(m => m.standing === 'contract').length,
    probation: r.filter(m => m.standing === 'probation').length,
    contractsOpen: openContracts(guildId).length,
    rendered: s.rendered,
    steward: s.steward
  };
}

module.exports = { GRADES, GRADE_BY_ID, gradeName, STANDINGS, STANDING_BY_ID, standingName,
  members, roll, admit, amendMember, charters, charterFor, setCharter, counts,
  contracts, openContracts, postContract, setContract, dropContract, recent,
  seats, seat, setSeat, hallSummary };
