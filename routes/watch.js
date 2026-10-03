const V = require('../lib/views');
const O = require('../lib/offices');
const W = require('../lib/watch');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need, needAny }) {

  app.get('/watch', needAny('watchclock', 'watchlog'), (req, res) => {
    const u = req.user;
    const seeAll = W.maySeeAll(u);
    const mine = W.openShift(u.username);
    const duty = W.onDuty();
    const week = W.thisWeek();
    const myWeek = week.find(r => r.who === u.username);
    const recent = (seeAll ? W.log({}) : W.log({ who: u.username })).slice(0, 25);
    const notes = W.notes().slice(0, 8);

    const body = `
<section class="card">
  <h2>The Watch</h2>
  <p class="lede">Bruma stands at the Pale Pass. The watch is kept day and night, and every hour of it is written down.</p>
</section>

${O.can(u, 'watchclock') ? `<section class="card">
  <h3 style="margin-top:0">${mine ? 'You are on the watch' : 'Clock on'}</h3>
  ${mine
    ? `<p>At <b>${esc(W.postName(mine.post))}</b> since <b>${esc(V.when(mine.on))}</b>.</p>
       <form method="post" action="/watch/off">${V.hidden(req.session.csrf)}
         <input type="hidden" name="back" value="/watch">
         <label for="note">Set down what happened on your watch</label>
         <textarea id="note" name="note" placeholder="Quiet watch. Nothing to report."></textarea>
         <div class="btnrow"><button class="btn danger" type="submit">Clock off</button></div>
       </form>`
    : `<form method="post" action="/watch/on">${V.hidden(req.session.csrf)}
         <input type="hidden" name="back" value="/watch">
         <label for="post">Where do you stand?</label>
         <select id="post" name="post">${W.POSTS.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
         <div class="btnrow"><button class="btn go" type="submit">Clock on</button></div>
       </form>`}
</section>` : ''}

<div class="grid three">
  <div class="stat"><div class="k">Standing now</div><div class="v">${duty.length}</div><div class="n">${duty.length === 1 ? 'guard on the watch' : 'guards on the watch'}</div></div>
  <div class="stat"><div class="k">Your hours this week</div><div class="v">${esc(V.hours(myWeek ? myWeek.minutes : 0))}</div><div class="n">${myWeek ? myWeek.shifts : 0} ${myWeek && myWeek.shifts === 1 ? 'shift' : 'shifts'}</div></div>
  ${seeAll ? `<div class="stat"><div class="k">The watch this week</div><div class="v">${esc(V.hours(week.reduce((n, r) => n + r.minutes, 0)))}</div><div class="n">across ${week.length} ${week.length === 1 ? 'guard' : 'guards'}</div></div>` : ''}
</div>

${duty.length ? `<section class="card" style="margin-top:20px">
  <h3 style="margin-top:0">On the watch now</h3>
  ${V.table([
      { head: 'Guard', cell: r => esc(r.name) },
      { head: 'Post', cell: r => esc(W.postName(r.post)) },
      { head: 'On since', cell: r => esc(V.when(r.on)) },
      { head: '', num: true, cell: r => `<span class="tag on">standing</span>` }
    ], duty)}
</section>` : ''}

${seeAll ? `<section class="card">
  <h3 style="margin-top:0">Hours this week</h3>
  ${week.length ? V.table([
      { head: 'Guard', cell: r => esc(r.name) },
      { head: 'Shifts', num: true, cell: r => r.shifts },
      { head: 'Hours stood', num: true, cell: r => esc(V.hours(r.minutes)) },
      { head: 'Last off', cell: r => esc(V.when(r.last)) }
    ], week) : V.empty('Nobody has stood a full shift this week yet.')}
  <p style="margin:12px 0 0"><a href="/watch/log">The whole log</a> · <a href="/watch/roster">The roster</a></p>
</section>` : ''}

<section class="card">
  <h3 style="margin-top:0">${seeAll ? 'The last shifts' : 'Your last shifts'}</h3>
  ${recent.length ? V.table([
      { head: 'Guard', cell: r => esc(r.name) },
      { head: 'Post', cell: r => esc(W.postName(r.post)) },
      { head: 'On', cell: r => esc(V.when(r.on)) },
      { head: 'Off', cell: r => r.off ? esc(V.when(r.off)) : '<span class="tag on">standing</span>' },
      { head: 'Stood', num: true, cell: r => r.off ? esc(V.hours(r.minutes)) : '' },
      { head: 'Set down', cell: r => esc(r.note || '') }
    ], recent) : V.empty('No shifts stood yet.')}
</section>

<section class="card">
  <h3 style="margin-top:0">The day book</h3>
  <p class="lede">Standing orders and anything the watch should know.</p>
  ${O.can(u, 'watchroster') ? `<form method="post" action="/watch/note">${V.hidden(req.session.csrf)}
    <label for="book">Write into the book</label>
    <textarea id="book" name="text" placeholder="Doubled guard on the North Gate until the pass clears." style="min-height:70px"></textarea>
    <div class="btnrow"><button class="btn" type="submit">Write it</button></div>
  </form>` : ''}
  ${notes.length ? `<div class="rows">${notes.map(n => `<div class="row">
    <div class="main">${esc(n.text)}<div class="hint">${esc(n.name)} · ${esc(V.when(n.at))}</div></div>
    ${O.can(u, 'watchamend') ? `<div class="side"><form method="post" action="/watch/note/remove" class="inline">${V.hidden(req.session.csrf)}
      <input type="hidden" name="id" value="${esc(n.id)}"><button class="btn ghost small" type="submit">Strike</button></form></div>` : ''}
  </div>`).join('')}</div>` : V.empty('The book is empty.')}
</section>`;

    res.page({ title: 'The Watch', body, active: 'watch' });
  });

  app.post('/watch/on', checkCsrf, need('watchclock'), wrap((req, res) => {
    try {
      const row = W.clockOn(req.user, req.body.post);
      req.session.flash = { text: 'You are on the watch at ' + W.postName(row.post) + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/watch'));
  }));

  app.post('/watch/off', checkCsrf, need('watchclock'), wrap((req, res) => {
    try {
      const row = W.clockOff(req.user, req.body.note);
      req.session.flash = { text: 'Clocked off. You stood ' + V.hours(row.minutes) + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/watch'));
  }));

  app.get('/watch/log', need('watchlog'), (req, res) => {
    const who = String(req.query.who || '');
    const post = String(req.query.post || '');
    const rows = W.log({ who, post, struck: true }).slice(0, 400);
    const guards = Array.from(new Map(W.shifts().map(s => [s.who, s.name])).entries());

    const body = `
<section class="card">
  <h2>The shift log</h2>
  <p class="lede">Every shift stood in the County, newest first.</p>
  <form method="get" action="/watch/log" class="fields">
    <div><label for="who">Guard</label><select id="who" name="who">
      <option value="">Everyone</option>
      ${guards.map(g => `<option value="${esc(g[0])}"${who === g[0] ? ' selected' : ''}>${esc(g[1])}</option>`).join('')}
    </select></div>
    <div><label for="post">Post</label><select id="post" name="post">
      <option value="">Every post</option>
      ${W.POSTS.map(p => `<option value="${p.id}"${post === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}
    </select></div>
    <div style="display:flex;align-items:flex-end"><button class="btn ghost" type="submit" style="margin-bottom:0">Show</button></div>
  </form>
</section>

<section class="card">
  ${rows.length ? V.table([
      { head: 'Guard', cell: r => esc(r.name) + (r.struck ? ' <span class="tag out">struck</span>' : '') },
      { head: 'Post', cell: r => esc(W.postName(r.post)) },
      { head: 'On', cell: r => esc(V.when(r.on)) },
      { head: 'Off', cell: r => r.off ? esc(V.when(r.off)) : '<span class="tag on">standing</span>' },
      { head: 'Stood', num: true, cell: r => r.off ? esc(V.hours(r.minutes)) : '' },
      { head: 'Set down', cell: r => esc(r.note || '') },
      { head: '', cell: r => O.can(req.user, 'watchamend') ? `<a class="btn ghost small" href="/watch/shift/${esc(r.id)}">Amend</a>` : '' }
    ], rows) : V.empty('Nothing stands in the log for that.')}
  <p class="hint" style="margin-top:12px">${rows.length} ${rows.length === 1 ? 'shift' : 'shifts'} shown.</p>
</section>`;

    res.page({ title: 'The shift log', body, active: 'watch', wide: true });
  });

  app.get('/watch/shift/:id', need('watchamend'), (req, res) => {
    const row = W.shifts().find(s => s.id === req.params.id);
    if (!row) return res.say('No such shift', 'Nothing in the log answers to that.', 404);
    const body = `
<section class="card">
  <h2>Amend a shift</h2>
  <p class="lede">${esc(row.name)} · on ${esc(V.when(row.on))}${row.off ? ' · off ' + esc(V.when(row.off)) : ' · still standing'}</p>
  <form method="post" action="/watch/shift/${esc(row.id)}">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="post">Post</label><select id="post" name="post">
        ${W.POSTS.map(p => `<option value="${p.id}"${row.post === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select></div>
      <div><label for="minutes">Minutes stood</label><input id="minutes" name="minutes" type="number" min="0" max="1440" value="${Number(row.minutes) || 0}"></div>
    </div>
    <label for="note">Set down</label>
    <textarea id="note" name="note">${esc(row.note || '')}</textarea>
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink)">
      <input type="checkbox" name="struck" value="1"${row.struck ? ' checked' : ''} style="width:auto"> Strike this shift from the reckoning
    </label>
    <div class="btnrow"><button class="btn" type="submit">Amend</button><a class="btn ghost" href="/watch/log">Back to the log</a></div>
  </form>
  ${row.amended ? `<p class="hint">Last amended by ${esc(row.amended.by)} on ${esc(V.when(row.amended.at))}.</p>` : ''}
</section>`;
    res.page({ title: 'Amend a shift', body, active: 'watch' });
  });

  app.post('/watch/shift/:id', checkCsrf, need('watchamend'), wrap((req, res) => {
    try {
      W.amend(req.params.id, {
        post: req.body.post,
        note: req.body.note,
        minutes: req.body.minutes,
        struck: !!req.body.struck
      }, req.user);
      req.session.flash = { text: 'The shift is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/watch/log');
  }));

  app.get('/watch/roster', need('watchroster'), (req, res) => {
    const all = W.hoursByGuard('');
    const week = W.thisWeek();
    const weekBy = Object.fromEntries(week.map(r => [r.who, r]));
    const body = `
<section class="card">
  <h2>The roster</h2>
  <p class="lede">Everyone who has stood the watch, and what they have stood.</p>
</section>
<section class="card">
  ${all.length ? V.table([
      { head: 'Guard', cell: r => esc(r.name) },
      { head: 'Shifts in all', num: true, cell: r => r.shifts },
      { head: 'Hours in all', num: true, cell: r => esc(V.hours(r.minutes)) },
      { head: 'This week', num: true, cell: r => esc(V.hours(weekBy[r.who] ? weekBy[r.who].minutes : 0)) },
      { head: 'Last off', cell: r => esc(V.when(r.last)) }
    ], all) : V.empty('Nobody has stood a shift yet.')}
</section>`;
    res.page({ title: 'The roster', body, active: 'watch' });
  });

  app.post('/watch/note', checkCsrf, need('watchroster'), wrap((req, res) => {
    try { W.addNote(req.user, req.body.text); req.session.flash = { text: 'Written into the book.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/watch');
  }));

  app.post('/watch/note/remove', checkCsrf, need('watchamend'), wrap((req, res) => {
    W.removeNote(req.body.id);
    req.session.flash = { text: 'Struck from the book.' };
    res.redirect('/watch');
  }));
};
