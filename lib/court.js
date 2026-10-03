const S = require('./store');
const Lex = require('./lexindex');

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

const cleanArticles = v => {
  const list = Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]);
  const out = [];
  list.forEach(x => {
    const no = String(x || '').trim();
    if (no && Lex.get(no) && !out.includes(no)) out.push(no);
  });
  return out.slice(0, 12);
};

function lay({ title, kind, complainant, respondent, account, articles }, by) {
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
    articles: cleanArticles(articles),
    band: '',
    fine: 0,
    term: '',
    paid: 0,
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

function charge(id, { articles }, by) {
  const rows = all();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such matter.');
  const was = (m.articles || []).slice();
  m.articles = cleanArticles(articles);
  const added = m.articles.filter(a => !was.includes(a));
  const dropped = was.filter(a => !m.articles.includes(a));
  if (added.length || dropped.length) {
    const say = [];
    if (added.length) say.push('Charged under ' + added.map(a => 'Article ' + a).join(', ') + '.');
    if (dropped.length) say.push('No longer charged under ' + dropped.map(a => 'Article ' + a).join(', ') + '.');
    m.papers.push({ id: S.id(), kind: 'Charge', text: say.join(' '), by: by.username, byName: by.name, at: new Date().toISOString() });
  }
  S.write(FILE, rows);
  return m;
}

function judge(id, { judgment, stage, band, fine, term }, by) {
  const rows = all();
  const m = rows.find(x => x.id === String(id || ''));
  if (!m) throw new Error('No such matter.');
  const j = String(judgment || '').trim().slice(0, 8000);
  if (stage === 'judged' && !j) throw new Error('A judgment must say something.');
  const amount = Math.max(0, Math.round(Number(fine) || 0));
  if (amount > 10000000) throw new Error('That is more coin than anyone in the County has. Check the figure.');

  m.stage = STAGE_BY_ID[stage] ? stage : 'judged';
  if (Lex.BAND_BY_ID[band]) m.band = band; else if (band === '') m.band = '';
  m.term = String(term || '').trim().slice(0, 160);

  const already = Number(m.fine) || 0;
  m.fine = amount;

  if (j) {
    m.judgment = j;
    m.judgedBy = by.name;
    m.judgedAt = new Date().toISOString();
    m.papers.push({ id: S.id(), kind: 'Judgment', text: j, by: by.username, byName: by.name, at: m.judgedAt });
  }
  S.write(FILE, rows);

  if (amount > 0 && amount !== already && m.stage === 'judged') {
    try {
      const T = require('./treasury');
      const row = T.enter({
        way: 'in',
        amount,
        party: m.respondent || m.complainant || 'Unnamed',
        reason: 'Fine upon matter no. ' + m.no + (m.articles && m.articles.length ? ' (Article ' + m.articles.join(', ') + ')' : ''),
        cat: 'fine',
        matter: m.id
      }, by);
      const rows2 = all();
      const m2 = rows2.find(x => x.id === m.id);
      if (m2) {
        m2.treasuryNo = row.no;
        m2.papers.push({ id: S.id(), kind: 'Fine', text: 'A fine of ' + amount.toLocaleString('en-GB') + ' septims was entered into the Treasury as entry no. ' + row.no + '.', by: by.username, byName: by.name, at: new Date().toISOString() });
        S.write(FILE, rows2);
        return m2;
      }
    } catch (e) {
      const rows3 = all();
      const m3 = rows3.find(x => x.id === m.id);
      if (m3) {
        m3.papers.push({ id: S.id(), kind: 'Fine', text: 'The fine could not be entered into the Treasury: ' + e.message, by: by.username, byName: by.name, at: new Date().toISOString() });
        S.write(FILE, rows3);
        return m3;
      }
    }
  }
  return m;
}

function underArticle(no) {
  const key = String(no || '');
  return all().filter(m => (m.articles || []).includes(key));
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

module.exports = { KINDS, KIND_BY_ID, kindName, STAGES, STAGE_BY_ID, stageName, all, open, get, lay, setHearing, addPaper, charge, judge, underArticle, mine, summary, cleanArticles };
