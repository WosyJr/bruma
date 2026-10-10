const crypto = require('crypto');
const S = require('./store');

const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const now = () => new Date().toISOString();
const sid = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');

function weekKey(d) {
  const t = new Date(d || Date.now());
  const day = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - day);
  t.setHours(0, 0, 0, 0);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
function dayKey(d) {
  const t = new Date(d || Date.now());
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
function weekRange(key) {
  const a = new Date(key + 'T00:00:00');
  const b = new Date(a); b.setDate(a.getDate() + 7);
  return [a.getTime(), b.getTime()];
}
const inWeek = (iso, key) => { const t = Date.parse(iso); const [a, b] = weekRange(key); return t >= a && t < b; };

const ONLINE_MS = 10 * 60 * 1000;
const seen = new Map();
function touch(user) {
  if (!user || !user.username) return;
  seen.set(user.username, { name: user.name, at: Date.now() });
  if (seen.size > 2000) seen.clear();
}
function online() {
  const t = Date.now();
  const out = [];
  seen.forEach((v, k) => { if (t - v.at < ONLINE_MS) out.push({ username: k, name: v.name }); });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
function forget(username) { seen.delete(username); }

const FEATURES = [
  ['bell', 'A bell for the Great Chapel'],
  ['beacon', 'A beacon on the castle tower'],
  ['banners', 'Banners along the walls'],
  ['statue', 'A statue in the market square'],
  ['gate', 'A new North Gate']
];
const FEATURE_IDS = FEATURES.map(f => f[0]);
const GOALS = 'town-goals.json';

function goals() { return S.read(GOALS, []); }
function goalGet(id) { return goals().find(g => g.id === id) || null; }
function goalView(g) {
  const pledges = (g.pledges || []).filter(p => !p.struck);
  const pledged = pledges.reduce((n, p) => n + p.amount, 0);
  const paid = pledges.filter(p => p.paid).reduce((n, p) => n + p.amount, 0);
  return { ...g, pledges: pledges.slice().reverse(), pledged, paid, pct: g.target ? Math.min(100, Math.round(paid / g.target * 100)) : 0, met: !!g.metAt };
}
function current() { const g = goals().filter(x => !x.metAt && !x.closed).pop(); return g ? goalView(g) : null; }
function built() { return goals().filter(g => g.metAt && g.feature).map(g => g.feature); }
function goalSet(b, by) {
  const title = clean(b.title, 120);
  if (!title) throw new Error('Name the goal.');
  const target = Math.round(Number(String(b.target || '').replace(/[,\s]/g, '')));
  if (!(target > 0)) throw new Error('Set the sum the goal needs.');
  const feature = FEATURE_IDS.includes(b.feature) ? b.feature : '';
  const list = goals();
  list.filter(g => !g.metAt && !g.closed).forEach(g => { g.closed = { by: by.name, at: now() }; });
  const g = { id: sid(), title, text: text(b.text, 600), target, feature, pledges: [], by: by.name, at: now() };
  list.push(g);
  S.write(GOALS, list);
  return goalView(g);
}
function pledge(goalId, b, by) {
  const list = goals();
  const g = list.find(x => x.id === goalId && !x.metAt && !x.closed);
  if (!g) throw new Error('That goal is no longer open.');
  const name = by ? by.name : clean(b.name, 60);
  if (!name) throw new Error('Give your name, as the County knows you.');
  const amount = Math.round(Number(String(b.amount || '').replace(/[,\s]/g, '')));
  if (!(amount > 0) || amount > 1000000) throw new Error('Pledge a sum of septims.');
  g.pledges = (g.pledges || []).concat([{ id: sid(), name, amount, signed: !!by, paid: false, at: now() }]);
  S.write(GOALS, list);
  return goalView(g);
}
function pledgeMark(goalId, pledgeId, act, by) {
  const list = goals();
  const g = list.find(x => x.id === goalId);
  if (!g) throw new Error('No such goal.');
  const p = (g.pledges || []).find(x => x.id === pledgeId);
  if (!p) throw new Error('No such pledge.');
  if (act === 'paid') { p.paid = true; p.paidBy = by.name; p.paidAt = now(); }
  else if (act === 'unpaid') { p.paid = false; }
  else if (act === 'strike') { p.struck = { by: by.name, at: now() }; }
  const v = goalView(g);
  if (!g.metAt && v.paid >= g.target) g.metAt = now();
  S.write(GOALS, list);
  return goalView(g);
}
function goalClose(goalId, by) {
  const list = goals();
  const g = list.find(x => x.id === goalId);
  if (g && !g.metAt) g.closed = { by: by.name, at: now() };
  S.write(GOALS, list);
}

const GHOSTS = 'town-ghost.json';
const GHOST_ODDS = Math.max(2, Number(process.env.GHOST_ODDS) || 200);
function ghostRoll(session) {
  if (crypto.randomInt(GHOST_ODDS) !== 0) return null;
  const token = crypto.randomBytes(9).toString('hex');
  session.ghost = { token, at: Date.now() };
  const list = S.read(GHOSTS, []);
  list.push({ kind: 'seen', at: now() });
  S.write(GHOSTS, list.slice(-2000));
  return token;
}
function ghostClaim(session, token, name) {
  const g = session.ghost;
  session.ghost = null;
  if (!g || !token || g.token !== token || Date.now() - g.at > 45000) throw new Error('The figure is gone.');
  const who = clean(name, 60) || 'A traveller';
  const list = S.read(GHOSTS, []);
  list.push({ kind: 'caught', name: who, at: now() });
  S.write(GHOSTS, list.slice(-2000));
  return who;
}
function ghostWeek(key) {
  const list = S.read(GHOSTS, []).filter(x => inWeek(x.at, key));
  return { seen: list.filter(x => x.kind === 'seen').length, caught: list.filter(x => x.kind === 'caught').map(x => x.name) };
}
function ghostCatchers(n) { return S.read(GHOSTS, []).filter(x => x.kind === 'caught').slice(-(n || 5)).reverse(); }

const BALLAD = 'town-ballad.json';
const BALLAD_TITLES = ['The Ballad of the Long Frost', 'The Song of the Pale Pass', 'The Lay of the Jerall Road', 'The Ballad of the Castle Hearth', 'The Song of the North Gate', 'The Lay of the Snow Wolf', 'The Ballad of the Market Square', 'The Song of the Great Chapel'];
function balladTitle(key) {
  const n = Math.floor(Date.parse(key + 'T00:00:00') / (7 * 86400000));
  return BALLAD_TITLES[((n % BALLAD_TITLES.length) + BALLAD_TITLES.length) % BALLAD_TITLES.length];
}
function balladLines(key) { return S.read(BALLAD, []).filter(l => l.week === key && !l.struck); }
function balladWeeks() {
  const keys = Array.from(new Set(S.read(BALLAD, []).filter(l => !l.struck).map(l => l.week))).sort().reverse();
  return keys.map(k => ({ week: k, title: balladTitle(k), lines: balladLines(k).length }));
}
function balladAdd(b, by, key2) {
  const line = clean(b.line, 90);
  if (line.length < 3) throw new Error('Write your line.');
  const name = by ? by.name : clean(b.name, 60);
  if (!name) throw new Error('Give your name.');
  const list = S.read(BALLAD, []);
  const today = dayKey();
  if (list.some(l => l.key === key2 && l.day === today)) throw new Error('One line a day. Come back tomorrow.');
  const week = weekKey();
  const l = { id: sid(), week, day: today, line, name, signed: !!by, key: key2, at: now() };
  list.push(l);
  S.write(BALLAD, list);
  return l;
}
function balladStrike(id, by) {
  const list = S.read(BALLAD, []);
  const l = list.find(x => x.id === id);
  if (l) { l.struck = { by: by.name, at: now() }; S.write(BALLAD, list); }
  return l;
}

const FACES = 'town-faces.json';
function faces() { return S.read(FACES, []).filter(f => !f.removed); }
function faceOf(username) { return faces().find(f => f.username === username) || null; }
function faceSave(user, b) {
  const list = S.read(FACES, []);
  let f = list.find(x => x.username === user.username && !x.removed);
  const line = clean(b.line, 160);
  const role = clean(b.role, 80);
  if (!f) {
    if (!b.picture) throw new Error('Choose a picture of your character.');
    f = { id: sid(), username: user.username, name: user.name, at: now() };
    list.push(f);
  }
  f.name = user.name;
  f.line = line;
  f.role = role;
  if (b.picture) {
    const m = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.picture));
    if (!m) throw new Error('That picture could not be read. Choose a PNG or JPG.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 1500000) throw new Error('That picture is too large.');
    const ok = (buf[0] === 0x89 && buf[1] === 0x50) || (buf[0] === 0xFF && buf[1] === 0xD8);
    if (!ok) throw new Error('That file is not a picture.');
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(require('./config').DATA_DIR, 'faces');
    fs.mkdirSync(dir, { recursive: true });
    const ext = buf[0] === 0x89 ? 'png' : 'jpg';
    if (f.file) { try { fs.unlinkSync(path.join(dir, f.file)); } catch (_) {} }
    f.file = f.id + '-' + Date.now().toString(36) + '.' + ext;
    fs.writeFileSync(path.join(dir, f.file), buf);
  }
  f.updatedAt = now();
  S.write(FACES, list);
  return f;
}
function faceRemove(id, by) {
  const list = S.read(FACES, []);
  const f = list.find(x => x.id === id);
  if (f) { f.removed = { by: by.name, at: now() }; S.write(FACES, list); }
  return f;
}
function faceFile(id) {
  const f = faces().find(x => x.id === id);
  if (!f || !f.file) return null;
  const path = require('path');
  return { path: path.join(require('./config').DATA_DIR, 'faces', f.file), type: f.file.endsWith('.png') ? 'image/png' : 'image/jpeg' };
}
function faceOfDay(d) {
  const list = faces().slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (!list.length) return null;
  const n = Math.floor(Date.parse(dayKey(d) + 'T12:00:00') / 86400000);
  return list[n % list.length];
}

const HERALD = 'town-herald.json';
function heraldLead(key) { return S.read(HERALD, {})[key] || null; }
function heraldSetLead(key, b, by) {
  const all = S.read(HERALD, {});
  const title = clean(b.title, 120);
  const body = text(b.body, 2500);
  if (!title && !body) { delete all[key]; S.write(HERALD, all); return null; }
  if (!title) throw new Error('Give the story a headline.');
  all[key] = { title, body, by: by.name, at: now() };
  S.write(HERALD, all);
  return all[key];
}

module.exports = {
  weekKey, dayKey, weekRange, inWeek, touch, online, forget,
  FEATURES, FEATURE_IDS, goals, goalGet, goalView, current, built, goalSet, pledge, pledgeMark, goalClose,
  ghostRoll, ghostClaim, ghostWeek, ghostCatchers,
  balladTitle, balladLines, balladWeeks, balladAdd, balladStrike,
  faces, faceOf, faceSave, faceRemove, faceFile, faceOfDay,
  heraldLead, heraldSetLead
};
