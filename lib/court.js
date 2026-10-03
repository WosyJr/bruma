const S = require('./store');

const FILE = 'court.json';

const KINDS = [
  { id: 'plea', name: 'Plea between subjects' },
  { id: 'crime', name: 'Crime against the peace' },
  { id: 'debt', name: 'Debt or contract' },
  { id: 'land', name: 'Land or boundary' },
  { id: 'guild', name: 'Guild matter' },
  { id: 'petition', name: 'Petition to the County' }
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindName = id => (KIND_BY_ID[id] ? KIND_BY_ID[id].name : 'Matter');

const STAGES = [
  { id: 'laid', name: 'Laid before the court', tag: '' },
  { id: 'set', name: 'Hearing set', tag: 'on' },
  { id: 'heard', name: 'Heard, awaiting judgment', tag: 'gold' },
  { id: 'judged', name: 'Judgment given', tag: 'in' },
  { id: 'withdrawn', name: 'Withdrawn', tag: 'out' },
  { id: 'struck', name: 'Struck from the roll', tag: 'out' }
];
const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));
const stageName = id => (STAGE_BY_ID[id] ? STAGE_BY_ID[id].name : 'Laid before the court');

function all() { return S.read(FILE, []); }
function open() { return all().filter(m => m.stage !== 'judged' && m.stage !== 'withdrawn' && m.stage !== 'struck'); }
function get(id) { return all().find(m => m.id === String(id || '')) || null; }

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function lay({ title, kind, complainant, respondent, account }, by) {
  const t = String(title || '').trim().slice(0, 160);
  if (!t) throw new Error('Give the matter a title.');
  const a = String(account || '').trim().slice(0, 8000);
  if (!a) throw new Error('Set down what the matter is.');
  const rows = all();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    title: t,
    kind: KIND_BY_ID[kind] ? kind : 'plea',
    complainant: String(complainant || '').trim().slice(0, 120) || by.name,
    respondent: String(respondent || '').trim().slice(0, 120),
    account: a,
    stage: 'laid',
    hearing: '',
    judgment: '',
    laidBy: by.username,
    laidByName: by.name,
    at: new Date().toISOString(),
    papers: []
  };
  rows.unshift(row);
  S.write(FILE, rows);
  return row;
}

function setHearing(id, { hearing, note }, by) {
  const rows = all();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such matter.');
  m.hearing = String(hearing || '').trim().slice(0, 160);
  m.stage = m.hearing ? 'set' : m.stage;
  m.papers.push({ id: S.id(), kind: 'Hearing set', text: (m.hearing ? 'Set for ' + m.hearing + '. ' : '') + String(note || '').trim().slice(0, 1000), by: by.username, byName: by.name, at: new Date().toISOString() });
  S.write(FILE, rows);
  return m;
}

function addPaper(id, { kind, text }, by) {
  const rows = all();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such matter.');
  const t = String(text || '').trim().slice(0, 8000);
  if (!t) throw new Error('There is nothing written on that paper.');
  m.papers.push({ id: S.id(), kind: String(kind || 'Paper').trim().slice(0, 60), text: t, by: by.username, byName: by.name, at: new Date().toISOString() });
  S.write(FILE, rows);
  return m;
}

function judge(id, { judgment, stage }, by) {
  const rows = all();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such matter.');
  const j = String(judgment || '').trim().slice(0, 8000);
  if (stage === 'judged' && !j) throw new Error('A judgment must say something.');
  m.stage = STAGE_BY_ID[stage] ? stage : 'judged';
  if (j) {
    m.judgment = j;
    m.judgedBy = by.name;
    m.judgedAt = new Date().toISOString();
    m.papers.push({ id: S.id(), kind: 'Judgment', text: j, by: by.username, byName: by.name, at: m.judgedAt });
  }
  S.write(FILE, rows);
  return m;
}

function mine(username) {
  const un = String(username || '');
  return all().filter(m => m.laidBy === un);
}

function summary() {
  const rows = all();
  const byStage = {};
  STAGES.forEach(s => { byStage[s.id] = 0; });
  rows.forEach(m => { byStage[m.stage] = (byStage[m.stage] || 0) + 1; });
  return { total: rows.length, open: open().length, byStage };
}

module.exports = { KINDS, KIND_BY_ID, kindName, STAGES, STAGE_BY_ID, stageName, all, open, get, lay, setHearing, addPaper, judge, mine, summary };
