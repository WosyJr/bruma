const V = require('../lib/views');
const O = require('../lib/offices');
const U = require('../lib/users');
const Sv = require('../lib/service');
const Papers = require('../lib/papers');

const esc = V.esc;

function since(iso) {
  if (!iso) return 'not recorded';
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000));
  if (d < 1) return 'today';
  if (d < 30) return d + (d === 1 ? ' day' : ' days');
  const m = Math.floor(d / 30);
  return m + (m === 1 ? ' month' : ' months');
}

function entryList(rows) {
  if (!rows.length) return V.empty('Nothing is written upon this record yet.');
  return `<ol class="career">${rows.map(r => {
    const k = Sv.KIND_BY_ID[r.kind] || Sv.KIND_BY_ID.note;
    return `<li class="cr ${esc(r.kind)}">
      <div class="crwhen">${esc(V.when(r.at))}</div>
      <div class="crbody">
        <div class="crkind"><span class="tag ${k.tag}">${esc(k.name)}</span>${
          r.officeName ? ` <span class="hint">${esc(r.officeName)}</span>` : ''}</div>
        ${r.text ? `<p style="white-space:pre-wrap;margin:6px 0 0">${esc(r.text)}</p>` : ''}
        <div class="hint" style="margin-top:6px">${r.auto ? 'Entered by the County' : 'Entered by ' + esc(r.byName)}</div>
      </div>
    </li>`;
  }).join('')}</ol>`;
}

function recordPanels(r, person, u, csrf, self) {
  const w = r.watch;
  return `
<div class="cols">
  <div>
    <section class="card">
      <h3 style="margin-top:0">The record</h3>
      ${entryList(r.entries)}
    </section>
  </div>
  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">In service</div><div class="v">${r.days}</div><div class="n">days</div></div>
        <div class="stat"><div class="k">Hours on the watch</div><div class="v">${w.hours}</div><div class="n">${w.shifts} ${w.shifts === 1 ? 'shift' : 'shifts'}</div></div>
        <div class="stat"><div class="k">Commendations</div><div class="v">${r.commendations}</div><div class="n">upon the record</div></div>
        <div class="stat"><div class="k">Marks against</div><div class="v">${r.marks}</div><div class="n">upon the record</div></div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0">At a glance</h3>
      <div class="rows tight">
        <div class="row"><div class="main">Office</div><div class="side">${esc(r.officeName) || '—'}</div></div>
        <div class="row"><div class="main">Sworn</div><div class="side">${r.since ? esc(V.when(r.since)) : '—'}</div></div>
        <div class="row"><div class="main">Served</div><div class="side">${esc(since(r.since))}</div></div>
        ${w.favourite ? `<div class="row"><div class="main">Most often at</div><div class="side">${esc(w.favourite)} · ${w.favouriteCount}×</div></div>` : ''}
        ${w.lastShift ? `<div class="row"><div class="main">Last stood</div><div class="side">${esc(V.when(w.lastShift))}</div></div>` : ''}
        ${w.onNow ? '<div class="row"><div class="main">Now</div><div class="side"><span class="tag in">On the watch</span></div></div>' : ''}
        <div class="row"><div class="main">Standing</div><div class="side">${r.active ? '<span class="tag in">In service</span>' : '<span class="tag out">Stood down</span>'}</div></div>
      </div>
    </section>

    <section class="card tight">
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        <a class="btn" href="/service/${esc(r.who)}/certificate" target="_blank" rel="noopener">The certificate of service ↗</a>
        ${O.can(u, 'officers') ? `<a class="btn ghost" href="/service">The whole roll</a>` : ''}
      </div>
    </section>

    ${O.can(u, 'officers') ? `<section class="card">
      <h3 style="margin-top:0">Write upon the record</h3>
      <form method="post" action="/service/${esc(r.who)}">${V.hidden(csrf)}
        <label for="kind">What kind of entry</label>
        <select id="kind" name="kind">${Sv.KINDS.filter(k => k.id !== 'sworn' && k.id !== 'raised' && k.id !== 'moved')
          .map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select>
        <label for="text">What is written</label>
        <textarea id="text" name="text" rows="3" maxlength="2000" placeholder="Held the north gate alone through the night of the raid."></textarea>
        <div class="btnrow"><button class="btn" type="submit">Enter it</button></div>
      </form>
      <p class="hint">Entries are not rubbed out. If one is wrong, write a correction after it.</p>
    </section>` : ''}
  </aside>
</div>`;
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/service', need('officers'), (req, res) => {
    const rows = Sv.roll();
    const body = `
<section class="card">
  <h2>Records of Service</h2>
  <p class="lede">Everyone who has served the County, how long they have stood, and what is written upon their name.
  A record is never rubbed out — a thing entered wrongly is corrected by a second entry after it.</p>
</section>

<section class="card">
  ${rows.length ? V.table([
    { head: 'Name', cell: r => `<a href="/service/${esc(r.username)}">${esc(r.name)}</a>` },
    { head: 'Office', cell: r => esc(r.officeName) },
    { head: 'Served', num: true, cell: r => r.days + 'd' },
    { head: 'Hours', num: true, cell: r => r.hours },
    { head: 'Shifts', num: true, cell: r => r.shifts },
    { head: 'Commended', num: true, cell: r => r.commendations || '<span class="dash">—</span>' },
    { head: 'Marks', num: true, cell: r => r.marks ? `<span class="tag out">${r.marks}</span>` : '<span class="dash">—</span>' },
    { head: 'Standing', cell: r => r.active ? '<span class="tag in">In service</span>' : '<span class="tag out">Stood down</span>' }
  ], rows) : V.empty('Nobody stands upon the rolls.')}
</section>`;
    res.page({ title: 'Records of Service', body, active: 'service', wide: true });
  });

  app.get('/service/:who', (req, res) => {
    const u = req.user;
    if (!u) return res.redirect('/login?to=' + encodeURIComponent(req.originalUrl));
    const who = String(req.params.who || '').toLowerCase();
    const self = who === u.username;
    if (!self && !O.can(u, 'officers')) return res.say('That door is not yours to open',
      'You may read your own record. The rest are kept by the Steward.', 403);
    const person = U.view(who);
    if (!person) return res.say('Nobody of that name', 'Nobody on the rolls answers to that.', 404);
    const r = Sv.record(who, person);

    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:8px">Record of service</div>
  <h2 style="margin:0 0 4px">${esc(r.name)}</h2>
  <p class="lede" style="margin:0">${esc(person.style || person.officeName)}${r.since ? ' · sworn ' + esc(V.when(r.since)) : ''}</p>
</section>
${recordPanels(r, person, u, req.session.csrf, self)}`;
    res.page({ title: r.name, body, active: self ? '' : 'service', wide: true });
  });

  app.post('/service/:who', checkCsrf, need('officers'), wrap((req, res) => {
    const who = String(req.params.who || '').toLowerCase();
    try {
      const person = U.view(who);
      if (!person) throw new Error('Nobody on the rolls answers to that.');
      Sv.enter(who, { ...req.body, name: person.name, officeName: person.officeName }, req.user);
      req.session.flash = { text: 'Entered upon the record of ' + person.name + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/service/' + who);
  }));

  app.get('/service/:who/certificate', (req, res) => {
    const u = req.user;
    if (!u) return res.redirect('/login?to=' + encodeURIComponent(req.originalUrl));
    const who = String(req.params.who || '').toLowerCase();
    const self = who === u.username;
    if (!self && !O.can(u, 'officers')) return res.say('That door is not yours to open',
      'You may draw your own certificate. The rest are drawn by the Steward.', 403);
    const person = U.view(who);
    if (!person) return res.say('Nobody of that name', 'Nobody on the rolls answers to that.', 404);
    const r = Sv.record(who, person);
    const paper = Sv.certificate(who, person, u);
    const w = r.watch;
    const notable = r.entries.filter(e => Sv.PRAISE.has(e.kind)).slice(0, 6);

    const bodyHtml = [
      Papers.three([
        ['In service', r.days + (r.days === 1 ? ' day' : ' days')],
        ['Hours on the watch', String(w.hours)],
        ['Commendations', String(r.commendations)]
      ]),
      Papers.facts([
        ['Office', r.officeName],
        ['Style', person.style],
        ['Sworn to the County', r.since ? new Date(r.since).toISOString().slice(0, 10) : ''],
        w.shifts ? ['Watches stood', String(w.shifts)] : null,
        w.favourite ? ['Most often posted at', w.favourite] : null,
        ['Standing', r.active ? 'In the service of the County' : 'Stood down']
      ].filter(Boolean)),
      notable.length ? `<div class="part"><h2>Noted upon the record</h2>${
        notable.map(e => `<p><b>${Papers.esc(Sv.kindName(e.kind))}</b>${
          e.text ? ' — ' + Papers.esc(e.text) : ''}</p>`).join('')}</div>` : '',
      Papers.part('Entered', 'This certificate sets out what is written upon the record of service kept by the County. '
        + 'It is true as at the day it was drawn, and the record itself may be seen at the Great Hall.')
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'service',
      title: r.name,
      sub: 'Record of service to the County of Bruma',
      lead: `This is to certify that <b>${Papers.esc(r.name)}</b> ${r.active ? 'stands' : 'stood'} in the service
        of the County of Bruma as ${Papers.esc(person.style || r.officeName)}.`,
      body: bodyHtml,
      closing: r.active ? 'In the service of the County.' : 'Served with honour.',
      motto: 'Hospitality to the stranger · Iron to the raider',
      signLine: 'Drawn under the hand of',
      signedBy: u.name,
      signedOf: 'For the County of Bruma',
      code: paper.code,
      back: '/service/' + who,
      fileName: 'service-' + r.name
    }));
  });
};
