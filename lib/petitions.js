const S = require('./store');
const Papers = require('./papers');

const FILE = 'petitions.json';

const STAGES = [
  { id: 'received', name: 'Received', tag: '', say: 'It has come in and waits to be read.' },
  { id: 'read', name: 'Read', tag: 'on', say: 'It has been read by the County.' },
  { id: 'heard', name: 'Heard', tag: 'gold', say: 'It was heard in the Great Hall.' },
  { id: 'referred', name: 'Referred to the court', tag: 'gold', say: 'It was sent to the court as a matter.' },
  { id: 'granted', name: 'Granted', tag: 'in', say: 'The County has granted it.' },
  { id: 'refused', name: 'Refused', tag: 'out', say: 'The County has refused it.' },
  { id: 'withdrawn', name: 'Withdrawn', tag: 'out', say: 'It was taken back by the one who laid it.' }
];
const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));
const stageName = id => (STAGE_BY_ID[id] ? STAGE_BY_ID[id].name : 'Received');
const ANSWERED = new Set(['granted', 'refused', 'referred']);
const CLOSED = new Set(['granted', 'refused', 'withdrawn']);

const ASKS = [
  { id: 'relief', name: 'Relief or help from the County' },
  { id: 'leave', name: 'Leave to do a thing' },
  { id: 'wrong', name: 'A wrong to be put right' },
  { id: 'land', name: 'Land, a holding or a boundary' },
  { id: 'trade', name: 'Trade, a stall or a licence' },
  { id: 'watch', name: 'Something for the watch' },
  { id: 'other', name: 'Something else' }
];
const ASK_BY_ID = Object.fromEntries(ASKS.map(a => [a.id, a]));
const askName = id => (ASK_BY_ID[id] ? ASK_BY_ID[id].name : 'Something else');

const clean = (v, n) => String(v === undefined || v === null ? '' : v).trim().slice(0, n);

function all() { return S.read(FILE, []); }
function get(id) { return all().find(p => p.id === String(id || '')) || null; }
function open() { return all().filter(p => !CLOSED.has(p.stage)); }
function answered() { return all().filter(p => ANSWERED.has(p.stage) && p.reply); }
function waiting() { return all().filter(p => p.stage === 'received'); }

function byCode(code) {
  const paper = Papers.get(code);
  if (paper && paper.module === 'petitions') return get(paper.ref);
  return null;
}

function nextNumber(rows) {
  return rows.reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1;
}

function lay(body) {
  const name = clean(body.name, 120);
  if (!name) throw new Error('Say who you are.');
  const title = clean(body.title, 160);
  if (!title) throw new Error('Say in a line what the matter is.');
  const about = clean(body.about, 8000);
  if (!about) throw new Error('Set down what happened and what you want done.');

  const rows = all();
  const row = {
    id: S.id(),
    no: nextNumber(rows),
    name,
    where: clean(body.where, 120),
    against: clean(body.against, 120),
    ask: ASK_BY_ID[body.ask] ? body.ask : 'other',
    title,
    about,
    stage: 'received',
    reply: '',
    repliedBy: '',
    repliedAt: '',
    matterId: '',
    matterNo: '',
    note: '',
    at: new Date().toISOString()
  };
  rows.unshift(row);
  S.write(FILE, rows);

  const paper = Papers.codeFor({
    kind: 'petition', module: 'petitions', ref: row.id, no: 'Petition ' + row.no,
    title: row.title, party: row.name, link: '/petitions/' + row.id,
    issuedBy: row.name, standing: 'Received',
    facts: [['What is asked', askName(row.ask)]]
  });
  row.code = paper.code;
  const again = all();
  const mine = again.find(x => x.id === row.id);
  if (mine) { mine.code = paper.code; S.write(FILE, again); }
  return row;
}

function answer(id, body, by) {
  const rows = all();
  const p = rows.find(x => x.id === String(id || ''));
  if (!p) throw new Error('No such petition.');
  const stage = STAGE_BY_ID[body.stage] ? body.stage : p.stage;
  const reply = clean(body.reply, 8000);
  if (ANSWERED.has(stage) && !reply) throw new Error('An answer must say something. Write the reply the petitioner will read.');
  p.stage = stage;
  if (body.reply !== undefined) p.reply = reply;
  if (body.note !== undefined) p.note = clean(body.note, 1000);
  if (reply) {
    p.repliedBy = by.name;
    p.repliedAt = new Date().toISOString();
  }
  S.write(FILE, rows);
  Papers.codeFor({
    kind: 'petition', module: 'petitions', ref: p.id, no: 'Petition ' + p.no,
    title: p.title, party: p.name, link: '/petitions/' + p.id,
    issuedBy: p.name, standing: stageName(p.stage)
  });
  return p;
}

function refer(id, by) {
  const rows = all();
  const p = rows.find(x => x.id === String(id || ''));
  if (!p) throw new Error('No such petition.');
  if (p.matterId) throw new Error('That petition is already before the court as matter no. ' + p.matterNo + '.');
  const Ct = require('./court');
  const m = Ct.lay({
    title: p.title,
    kind: 'petition',
    complainant: p.name,
    respondent: p.against,
    account: p.about
  }, { username: by.username, name: by.name });
  p.matterId = m.id;
  p.matterNo = m.no;
  p.stage = 'referred';
  if (!p.reply) p.reply = 'This petition has been sent to the court, and will be heard as matter no. ' + m.no + '.';
  p.repliedBy = by.name;
  p.repliedAt = new Date().toISOString();
  S.write(FILE, rows);
  return p;
}

function strike(id) {
  S.write(FILE, all().filter(p => p.id !== String(id || '')));
  Papers.drop('petitions', String(id || ''));
}

function summary() {
  const rows = all();
  const ans = rows.filter(p => ANSWERED.has(p.stage));
  const days = ans.filter(p => p.repliedAt)
    .map(p => Math.max(0, Math.round((new Date(p.repliedAt) - new Date(p.at)) / 86400000)));
  return {
    total: rows.length,
    waiting: rows.filter(p => p.stage === 'received').length,
    open: open().length,
    answered: ans.length,
    granted: rows.filter(p => p.stage === 'granted').length,
    refused: rows.filter(p => p.stage === 'refused').length,
    median: days.length ? days.sort((a, b) => a - b)[Math.floor(days.length / 2)] : null
  };
}

Papers.resolve('petitions', ref => {
  const p = get(ref);
  if (!p) return { gone: true, standing: 'Struck from the roll', inForce: false };
  return {
    title: p.title, party: p.name, standing: stageName(p.stage),
    inForce: !CLOSED.has(p.stage) || p.stage === 'granted',
    facts: [['What was asked', askName(p.ask)],
      ['Laid by', p.name],
      ['Standing', stageName(p.stage)],
      p.matterNo ? ['Before the court as', 'Matter no. ' + p.matterNo] : null].filter(Boolean)
  };
});

module.exports = {
  STAGES, STAGE_BY_ID, stageName, ANSWERED, CLOSED, ASKS, ASK_BY_ID, askName,
  all, get, open, answered, waiting, byCode, lay, answer, refer, strike, summary
};
