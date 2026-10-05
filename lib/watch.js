const S = require('./store');
const O = require('./offices');

const SHIFTS = 'watch-shifts.json';
const NOTES = 'watch-notes.json';

const POSTS = [
  { id: 'gate-north', name: 'The North Gate' },
  { id: 'gate-south', name: 'The South Gate' },
  { id: 'walls', name: 'The Walls' },
  { id: 'castle', name: 'Castle Bruma' },
  { id: 'chapel', name: 'The Chapel District' },
  { id: 'market', name: 'The Market' },
  { id: 'patrol-silver', name: 'Patrol — The Silver Road' },
  { id: 'patrol-pass', name: 'Patrol — Pale Pass' },
  { id: 'patrol-county', name: 'Patrol — The County' },
  { id: 'gaol', name: 'The Gaol' }
];
const POST_BY_ID = Object.fromEntries(POSTS.map(p => [p.id, p]));
const postName = id => (POST_BY_ID[id] ? POST_BY_ID[id].name : 'Unposted');

function shifts() { return S.read(SHIFTS, []); }

function openShift(username) {
  return shifts().find(s => s.who === username && !s.off) || null;
}

function clockOn(user, post) {
  const list = shifts();
  if (list.some(s => s.who === user.username && !s.off)) throw new Error('You are already on the watch. Clock off first.');
  const row = {
    id: S.id(),
    who: user.username,
    name: user.name,
    post: POST_BY_ID[post] ? post : 'walls',
    on: new Date().toISOString(),
    off: '',
    minutes: 0,
    note: '',
    struck: false
  };
  list.unshift(row);
  S.write(SHIFTS, list);
  return row;
}

function clockOff(user, note) {
  const list = shifts();
  const row = list.find(s => s.who === user.username && !s.off);
  if (!row) throw new Error('You are not on the watch.');
  row.off = new Date().toISOString();
  row.minutes = Math.max(1, Math.round((new Date(row.off) - new Date(row.on)) / 60000));
  row.note = String(note || '').trim().slice(0, 500);
  S.write(SHIFTS, list);
  return row;
}

function clockOffOther(id, note, by) {
  const list = shifts();
  const row = list.find(s => s.id === String(id || ''));
  if (!row) throw new Error('No such shift.');
  if (row.struck) throw new Error('That shift has been struck from the reckoning.');
  if (row.off) throw new Error(row.name + ' is already clocked off.');
  row.off = new Date().toISOString();
  row.minutes = Math.max(1, Math.round((new Date(row.off) - new Date(row.on)) / 60000));
  const n = String(note || '').trim().slice(0, 500);
  row.note = n || (row.note || '');
  row.offBy = by.username;
  row.offByName = by.name;
  S.write(SHIFTS, list);
  return row;
}

function amend(id, patch, by) {
  const list = shifts();
  const row = list.find(s => s.id === String(id || ''));
  if (!row) throw new Error('No such shift.');
  if (patch.post !== undefined && POST_BY_ID[patch.post]) row.post = patch.post;
  if (patch.note !== undefined) row.note = String(patch.note).trim().slice(0, 500);
  if (patch.minutes !== undefined) {
    const m = Number(patch.minutes);
    if (Number.isFinite(m) && m >= 0 && m <= 1440) row.minutes = Math.round(m);
  }
  if (patch.struck !== undefined) row.struck = !!patch.struck;
  row.amended = { by: by.username, at: new Date().toISOString() };
  S.write(SHIFTS, list);
  return row;
}

function onDuty() {
  return shifts().filter(s => !s.off && !s.struck);
}

function log(opts) {
  const o = opts || {};
  let list = shifts().filter(s => o.struck ? true : !s.struck);
  if (o.who) list = list.filter(s => s.who === o.who);
  if (o.post) list = list.filter(s => s.post === o.post);
  if (o.since) list = list.filter(s => s.on >= o.since);
  return list;
}

function weekKey(d) {
  const t = new Date(d || Date.now());
  const day = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - day);
  t.setHours(0, 0, 0, 0);
  return t.toISOString().slice(0, 10);
}

function hoursByGuard(sinceIso) {
  const out = new Map();
  shifts().forEach(s => {
    if (s.struck || !s.off) return;
    if (sinceIso && s.on < sinceIso) return;
    const row = out.get(s.who) || { who: s.who, name: s.name, minutes: 0, shifts: 0, last: '' };
    row.minutes += Number(s.minutes) || 0;
    row.shifts += 1;
    if (!row.last || s.off > row.last) row.last = s.off;
    out.set(s.who, row);
  });
  return Array.from(out.values()).sort((a, b) => b.minutes - a.minutes);
}

function thisWeek() {
  const k = weekKey();
  return hoursByGuard(k + 'T00:00:00.000Z');
}

function notes() { return S.read(NOTES, []); }

function addNote(user, text) {
  const t = String(text || '').trim().slice(0, 1000);
  if (!t) throw new Error('Write something into the book.');
  const list = notes();
  list.unshift({ id: S.id(), who: user.username, name: user.name, text: t, at: new Date().toISOString() });
  S.write(NOTES, list.slice(0, 500));
  return list[0];
}

function removeNote(id) {
  S.write(NOTES, notes().filter(n => n.id !== String(id || '')));
}

function maySeeAll(u) { return O.can(u, 'watchlog'); }

function dayStart() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.toISOString();
}

function stoodToday() {
  const from = dayStart();
  return shifts().filter(s => !s.struck && (s.on >= from || !s.off || (s.off && s.off >= from)))
    .sort((a, b) => String(b.on).localeCompare(String(a.on)));
}

function minutesOf(s) {
  if (s.off) return Number(s.minutes) || 0;
  return Math.max(0, Math.round((Date.now() - new Date(s.on)) / 60000));
}

function postState() {
  const open = onDuty();
  const all = shifts().filter(s => !s.struck && s.off)
    .sort((a, b) => String(b.off).localeCompare(String(a.off)));
  return POSTS.map(p => {
    const here = open.filter(s => s.post === p.id);
    const last = all.find(s => s.post === p.id);
    const patrol = /^patrol-/.test(p.id);
    let state = 'empty';
    if (here.length) state = 'manned';
    else if (patrol && last) state = 'returned';
    return {
      id: p.id, name: p.name, patrol,
      state,
      who: here.map(s => s.name).join(', '),
      since: here.length ? here[0].on : '',
      last: last ? last.off : ''
    };
  });
}

function missedThisWeek() {
  const k = weekKey() + 'T00:00:00.000Z';
  return shifts().filter(s => !s.struck && s.off && s.autoClosed && s.on >= k).length;
}

function hoursHigh(rows) {
  return (rows || []).reduce((m, r) => Math.max(m, r.minutes), 0) || 1;
}

function closeStale(hours) {
  const edge = Date.now() - (Number(hours) || 18) * 3600000;
  const list = shifts();
  let n = 0;
  list.forEach(s => {
    if (s.off || s.struck) return;
    if (new Date(s.on).getTime() > edge) return;
    s.off = new Date(new Date(s.on).getTime() + (Number(hours) || 18) * 3600000).toISOString();
    s.minutes = Math.round((Number(hours) || 18) * 60);
    s.autoClosed = true;
    s.note = (s.note ? s.note + ' ' : '') + 'Closed out at the end of the watch; the guard did not clock off.';
    n += 1;
  });
  if (n) S.write(SHIFTS, list);
  return n;
}

module.exports = {
  POSTS, POST_BY_ID, postName, shifts, openShift, clockOn, clockOff, amend,
  onDuty, log, hoursByGuard, thisWeek, weekKey, notes, addNote, removeNote, maySeeAll, clockOffOther,
  dayStart, stoodToday, minutesOf, postState, missedThisWeek, hoursHigh, closeStale
};
