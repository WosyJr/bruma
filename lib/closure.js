const S = require('./store');

const KEY = 'closure';
const DEFAULT_AT = '2026-11-17T23:59:00';
const LAST_DAYS = 7;

const esc = s => String(s === undefined || s === null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function settings() {
  const row = S.read(KEY, {});
  return {
    at: row.at || process.env.CLOSING_AT || DEFAULT_AT,
    on: row.on === undefined ? true : !!row.on,
    roll: Array.isArray(row.roll) ? row.roll : []
  };
}

function save(next) {
  const now = settings();
  S.write(KEY, Object.assign({}, now, next));
  return settings();
}

function closesAt() {
  const t = new Date(settings().at);
  return isNaN(t.getTime()) ? new Date(DEFAULT_AT) : t;
}

function msLeft(now) {
  return closesAt().getTime() - (now || Date.now());
}

function left(now) {
  const ms = Math.max(0, msLeft(now));
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
    total: ms
  };
}

function phase(now) {
  if (!settings().on) return 'off';
  const ms = msLeft(now);
  if (ms <= 0) return 'closed';
  if (ms <= LAST_DAYS * 86400000) return 'last';
  return 'open';
}

function isClosed(now) { return phase(now) === 'closed'; }
function isFinal(now) { const p = phase(now); return p === 'last' || p === 'closed'; }

function dayText() {
  const d = closesAt();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const n = d.getDate();
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd'
    : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return 'the ' + n + suffix + ' of ' + months[d.getMonth()];
}

function roll() {
  return settings().roll.slice().sort((a, b) => (a.at || 0) - (b.at || 0));
}

function onRoll(uid) {
  if (!uid) return null;
  return settings().roll.find(r => String(r.uid) === String(uid)) || null;
}

function addToRoll(user, character, words) {
  if (!user) return { error: 'You must be signed in to put your name down.' };
  if (isClosed()) return { error: 'The roll is closed.' };
  const who = String(character || user.name || '').trim().slice(0, 80);
  if (!who) return { error: 'Give the name you went by.' };
  const line = String(words || '').trim().slice(0, 240);
  const s = settings();
  const list = s.roll.filter(r => String(r.uid) !== String(user.id));
  list.push({
    uid: String(user.id),
    name: who,
    style: String(user.title || '').slice(0, 80),
    words: line,
    at: Date.now()
  });
  save({ roll: list });
  return { ok: true };
}

function removeFromRoll(uid) {
  const s = settings();
  save({ roll: s.roll.filter(r => String(r.uid) !== String(uid)) });
  return { ok: true };
}

function ticker(now) {
  const l = left(now);
  const bit = (n, u) => `<span class="ctick"><span class="cn">${String(n).padStart(2, '0')}</span><span class="cu">${u}</span></span>`;
  return `<div class="cticks">${bit(l.days, 'days')}${bit(l.hours, 'hours')}${bit(l.minutes, 'minutes')}</div>`;
}

function notice(user, now) {
  const p = phase(now);
  if (p === 'off' || p === 'closed') return '';
  const final = p === 'last';
  const mine = user ? onRoll(user.id) : null;
  return `<aside class="closenote${final ? ' final' : ''}" role="note">
  <div class="closeinner">
    <div class="eyebrow">${final ? 'The final days' : 'A notice from the Countess'}</div>
    <h3>${final
      ? 'Bruma closes its gate within the week'
      : 'Bruma closes its gate on ' + esc(dayText())}</h3>
    <p>${final
      ? 'New writs and filings are no longer being taken, so that nothing is left half written on the day. Everything already filed stays readable, and stays readable after the gate shuts.'
      : 'Sovngarde is winding down, and the county with it. Everything here works as it always has until then. Put your name on the roll and it will be carried onto what stands afterwards.'}</p>
    ${ticker(now)}
    <div class="closerow">
      <a class="btn small" href="/memorial">${mine ? 'Your name is on the roll' : (final ? 'Add your name, last call' : 'Add your name to the roll')}</a>
      <a class="btn ghost small" href="/archive">Read the archive</a>
    </div>
  </div>
</aside>`;
}

function rollHtml() {
  const list = roll();
  if (!list.length) return '<p class="quiet">No names yet.</p>';
  return `<div class="rollnames">${list.map(r => `<span class="rollname">
    <b>${esc(r.name)}</b>${r.style ? `<i>${esc(r.style)}</i>` : ''}
    ${r.words ? `<em>${esc(r.words)}</em>` : ''}</span>`).join('')}</div>`;
}

function rollForm(user, csrf) {
  if (isClosed()) return '';
  if (!user) {
    return `<p class="quiet"><a href="/login?to=%2Fmemorial">Enter the hall</a> to put your name on the roll.</p>`;
  }
  const mine = onRoll(user.id);
  return `<form method="post" action="/memorial/roll" class="rollform">
    <input type="hidden" name="_csrf" value="${esc(csrf)}">
    <label class="fld" for="rollname">The name you went by</label>
    <input type="text" id="rollname" name="character" maxlength="80" required
      value="${esc(mine ? mine.name : (user.name || ''))}">
    <label class="fld" for="rollwords">A line of your own, if you want one</label>
    <input type="text" id="rollwords" name="words" maxlength="240"
      value="${esc(mine ? mine.words : '')}" placeholder="Held the gate. Poured the ale. Lost at hazard.">
    <button class="btn" type="submit">${mine ? 'Change my line' : 'Put my name down'}</button>
  </form>`;
}

function memorial(user, csrf) {
  const closed = isClosed();
  const s = settings();
  return `<section class="memorial">
  <div class="lantern" aria-hidden="true"></div>
  <div class="eyebrow">${closed ? 'The gate is closed' : 'While the gate is still open'}</div>
  <h2>Bruma keeps the lantern lit</h2>
  <p class="memdates">4E ${esc(String(require('./config').CURRENT_YEAR - 2))} &mdash; 4E ${esc(String(require('./config').CURRENT_YEAR))} &middot; the realm of Sovngarde</p>
  <p class="memwords">The county kept its roads, heard its cases, and poured for anyone who came in out of
  the cold. What was written here stays written. The hall is quiet now, but the lamp above the door is
  still burning for whoever walks back up the pass.</p>
  <div class="memrule" aria-hidden="true"></div>
  <div class="rollwrap">
    <div class="eyebrow">Those who held the county</div>
    ${rollHtml()}
    ${rollForm(user, csrf)}
  </div>
  <div class="memfoot">
    <a class="btn" href="/archive">Read the archive</a>
    ${user ? '<a class="btn ghost" href="/memorial/service">Your certificate of service</a>' : ''}
  </div>
  ${!closed ? `<p class="quiet memsoon">The gate closes on ${esc(dayText())}. Until then the county runs as it always has.</p>` : ''}
</section>`;
}

const ALLOW_CLOSED = [
  /^\/memorial/, /^\/archive/, /^\/verify/, /^\/style\.css/, /^\/app\.js/,
  /^\/window\.js/, /^\/flourish\.js/, /^\/favicon/, /^\/bruma-/, /^\/logout/
];

function middleware(req, res, next) {
  if (!isClosed()) return next();
  const p = req.path;
  if (req.method !== 'GET') {
    if (p === '/logout') return next();
    return res.redirect('/memorial');
  }
  if (ALLOW_CLOSED.some(rx => rx.test(p))) return next();
  if (/\.(png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$/i.test(p)) return next();
  return res.redirect('/memorial');
}

module.exports = {
  settings, save, closesAt, phase, left, isClosed, isFinal, dayText,
  roll, onRoll, addToRoll, removeFromRoll, notice, memorial, rollHtml,
  middleware, LAST_DAYS
};
