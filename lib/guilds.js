const S = require('./store');
const O = require('./offices');

const MEMBERS = 'guild-members.json';
const CHARTERS = 'guild-charters.json';

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
  return members().filter(m => m.guild === g && !m.struck)
    .sort((a, b) => (GRADE_BY_ID[a.grade] || { rank: 9 }).rank - (GRADE_BY_ID[b.grade] || { rank: 9 }).rank || a.name.localeCompare(b.name));
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
    grade: GRADE_BY_ID[grade] ? grade : 'member',
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

module.exports = { GRADES, GRADE_BY_ID, gradeName, members, roll, admit, amendMember, charters, charterFor, setCharter, counts };
