const S = require('./store');
const U = require('./users');

const FILE = 'ledger.log';

const VERBS = [
  [/\/strike$/, 'struck', 'struck'],
  [/\/remove$/, 'removed', 'struck'],
  [/\/release$/, 'released from the gaol', 'laid'],
  [/^\/gaol$/, 'committed to the gaol', 'laid'],
  [/\/judge$/, 'gave judgment upon', 'laid'],
  [/^\/proclaim$/, 'proclaimed', 'laid'],
  [/^\/proclaim\/pass$|^\/pass\/state$/, 'set the state of the Pale Pass', 'other'],
  [/\/addendum$/, 'added to', 'laid'],
  [/\/amend$/, 'amended', 'laid'],
  [/\/entry$/, 'wrote an entry upon', 'laid'],
  [/\/appoint$/, 'appointed', 'laid'],
  [/\/seal$/, 'sealed', 'laid'],
  [/\/sign$/, 'signed', 'laid'],
  [/\/grant$/, 'granted', 'laid'],
  [/\/refuse$/, 'refused', 'other'],
  [/\/note$/, 'noted upon', 'other']
];

const SKIP = /^\/(login|logout|me\/|style|app\.js|healthz|audit\.json)/;

function describe(path) {
  const clean = String(path || '').split('?')[0];
  if (SKIP.test(clean)) return null;
  const parts = clean.split('/').filter(Boolean);
  for (const [re, verb, kind] of VERBS) {
    if (re.test(clean)) {
      const hall = parts[0] || '';
      const target = parts.length > 2 ? parts.slice(1, -1).join('/') : parts.length === 2 && !re.test('/' + parts[1]) ? parts[1] : '';
      return { act: verb, what: [hall, target].filter(Boolean).join(' · '), kind };
    }
  }
  if (parts.length === 1) return { act: 'laid upon', what: parts[0], kind: 'laid' };
  if (parts.length === 2) return { act: 'wrote to', what: parts.join(' · '), kind: 'laid' };
  return { act: 'wrote to', what: parts.slice(0, 2).join(' · '), kind: 'laid' };
}

function note(user, act, what, kind, link) {
  if (!user) return;
  S.append(FILE, { at: new Date().toISOString(), by: user.username, name: user.name, act, what: what || '', kind: kind || 'other', link: link || '' });
}

function middleware(req, res, next) {
  if (req.method !== 'POST' || !req.user) return next();
  const d = describe(req.path);
  if (!d) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    note(req.user, d.act, d.what, d.kind, d.kind === 'struck' ? '' : req.path.replace(/\/(strike|remove|judge|amend|entry|addendum|appoint|seal|sign|grant|refuse|note)$/, ''));
  });
  next();
}

function events(sinceIso, limit) {
  const since = sinceIso ? String(sinceIso) : '';
  const rows = S.lines(FILE).filter(r => r.at && (!since || r.at >= since));
  rows.forEach(r => { if (!r.name) { const u = U.get ? U.get(r.by) : null; r.name = u ? u.name : r.by; } });
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, Math.max(1, Math.min(2000, Number(limit) || 500)));
}

module.exports = { note, middleware, events, describe };
