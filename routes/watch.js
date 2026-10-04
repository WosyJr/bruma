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
    const posts = W.postState();
    const unmanned = posts.filter(p => p.state === 'empty').length;
    const today = seeAll ? W.stoodToday() : W.stoodToday().filter(s => s.who === u.username);
    const missed = W.missedThisWeek();
    const notes = W.notes().slice(0, 6);
    const high = W.hoursHigh(week);
    const weekTotal = week.reduce((n, r) => n + r.minutes, 0);
    const clock = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const sameDay = t => new Date(t).toDateString() === new Date().toDateString();
    const stamp = t => clock(t) + (sameDay(t) ? '' : ' yest.');
    const partOfDay = t => { const h = new Date(t).getHours();
      return h < 5 ? 'in the deep of night' : h < 12 ? 'this morning' : h < 18 ? 'this afternoon' : 'this evening'; };

    const body = `
<section class="card hallhead">
  <div class="hh">
    <div>
      <div class="eyebrow">The watch of Bruma</div>
      <h2 style="margin:4px 0 8px">Clock on, clock off</h2>
      <p class="lede" style="margin:0;max-width:480px">Every shift the watch stands is written down here. Nobody is
      paid, promoted or pulled up on their hours from memory.</p>
    </div>
    ${seeAll ? `<div class="hhbtns">
      <a class="btn ghost" href="/watch/log">The whole log</a>
      ${O.can(u, 'watchroster') ? '<a class="btn ghost" href="/watch/roster">The roster</a>' : ''}
    </div>` : ''}
  </div>
</section>

${O.can(u, 'watchclock') ? `<section class="card onwatch${mine ? ' standing' : ''}">
  <div class="owrow">
    <div class="owl">
      <div class="eyebrow">${mine ? 'You are on watch' : 'You are not on watch'}</div>
      <div class="owpost">${mine ? esc(W.postName(mine.post)) : 'Clock on to stand'}</div>
      <div class="owsince">${mine
        ? 'On since <b>' + esc(clock(mine.on)) + '</b> ' + esc(partOfDay(mine.on)) + ' · <b>' + esc(V.hours(W.minutesOf(mine))) + '</b> stood'
        : 'Choose a post and clock on. The hours only count once they are written down.'}</div>
    </div>
    <div class="owr">
      ${mine
        ? `<form method="post" action="/watch/off" class="inline">${V.hidden(req.session.csrf)}
             <input type="hidden" name="back" value="/watch">
             <input type="hidden" name="note" value="">
             <button class="btn go" type="submit">Clock off</button></form>
           <a class="btn ghost" href="#offnote">Change post</a>`
        : `<form method="post" action="/watch/on" class="owon">${V.hidden(req.session.csrf)}
             <input type="hidden" name="back" value="/watch">
             <select name="post" aria-label="Where do you stand">${W.POSTS.map(p =>
               `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
             <button class="btn go" type="submit">Clock on</button></form>`}
    </div>
  </div>
</section>` : ''}

<div class="tiles four">
  <div class="stat"><div class="k">On watch now</div><div class="v">${duty.length}</div></div>
  <div class="stat"><div class="k">Posts unmanned</div><div class="v${unmanned ? ' vacant' : ''}">${unmanned}</div></div>
  <div class="stat"><div class="k">${seeAll ? 'Hours this week' : 'Your hours this week'}</div><div class="v">${
    seeAll ? Math.round(weekTotal / 60) : Math.round((myWeek ? myWeek.minutes : 0) / 60)}</div></div>
  <div class="stat"><div class="k">Shifts missed</div><div class="v${missed ? ' vacant' : ''}">${missed}</div></div>
</div>

<div class="hallcols">
  <div>
    <section class="card">
      <div class="eyebrow" style="margin-bottom:12px">Stood today</div>
      ${today.length ? `<div class="tablewrap"><table class="watchtable"><thead><tr>
        <th>Guard</th><th>Post</th><th>On</th><th>Off</th><th class="num">Stood</th></tr></thead><tbody>
        ${today.map(sh => `<tr${sh.off ? '' : ' class="live"'}>
          <td><b>${esc(sh.name)}</b></td>
          <td>${esc(W.postName(sh.post))}</td>
          <td>${esc(stamp(sh.on))}</td>
          <td>${sh.off ? esc(stamp(sh.off)) : '<span class="onnow">— on watch</span>'}</td>
          <td class="num">${esc(V.hours(W.minutesOf(sh)))}</td>
        </tr>`).join('')}
      </tbody></table></div>
      <p class="hint" style="margin-top:12px">A guard who forgets to clock off is closed out at the end of the watch
      and marked, so the hours stay honest.</p>` : V.empty('Nobody has stood yet today.')}
    </section>

    ${mine ? `<section class="card" id="offnote">
      <div class="eyebrow" style="margin-bottom:10px">Coming off</div>
      <form method="post" action="/watch/off">${V.hidden(req.session.csrf)}
        <input type="hidden" name="back" value="/watch">
        <label for="note">Set down what happened on your watch</label>
        <textarea id="note" name="note" rows="3" placeholder="Quiet watch. Nothing to report."></textarea>
        <div class="btnrow"><button class="btn go" type="submit">Clock off</button></div>
      </form>
    </section>` : ''}

    <section class="card">
      <div class="eyebrow" style="margin-bottom:10px">The day book</div>
      <p class="hint" style="margin:0 0 14px">Standing orders and anything the watch should know.</p>
      ${O.can(u, 'watchroster') ? `<form method="post" action="/watch/note">${V.hidden(req.session.csrf)}
        <textarea name="text" rows="2" placeholder="Doubled guard on the North Gate until the pass clears."></textarea>
        <div class="btnrow"><button class="btn ghost" type="submit">Write it</button></div>
      </form>` : ''}
      ${notes.length ? `<div class="rows">${notes.map(n => `<div class="row">
        <div class="main">${esc(n.text)}<div class="hint">${esc(n.name)} · ${esc(V.when(n.at))}</div></div>
        ${O.can(u, 'watchamend') ? `<div class="side"><form method="post" action="/watch/note/remove" class="inline">${V.hidden(req.session.csrf)}
          <input type="hidden" name="id" value="${esc(n.id)}"><button class="btn ghost small" type="submit">Strike</button></form></div>` : ''}
      </div>`).join('')}</div>` : V.empty('The book is empty.')}
    </section>
  </div>

  <aside>
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:12px">The posts</div>
      <div class="postlist">
        ${posts.map(p => `<div class="pst ${esc(p.state)}">
          <div class="pstn"><b>${esc(p.name)}</b><i>${
            p.state === 'manned' ? esc(p.who)
            : p.state === 'returned' ? 'patrol returned ' + esc(clock(p.last))
            : p.last ? 'nobody since ' + esc(clock(p.last)) : 'nobody yet'}</i></div>
          <span class="tag ${p.state === 'manned' ? 'in' : p.state === 'returned' ? '' : 'out'}">${
            p.state === 'manned' ? 'Manned' : p.state === 'returned' ? 'Returned' : 'Empty'}</span>
        </div>`).join('')}
      </div>
    </section>

    ${seeAll && week.length ? `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:12px">Hours this week</div>
      <div class="bars">
        ${week.map(r => `<div class="bar">
          <div class="brn">${esc(r.name)}<span>${Math.round(r.minutes / 60)}h</span></div>
          <div class="brt"><i style="width:${Math.max(3, Math.round((r.minutes / high) * 100))}%"></i></div>
        </div>`).join('')}
      </div>
    </section>` : ''}

    ${!seeAll && myWeek ? `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:12px">Your week</div>
      <div class="rows tight">
        <div class="row"><div class="main">Shifts stood</div><div class="side">${myWeek.shifts}</div></div>
        <div class="row"><div class="main">Hours stood</div><div class="side">${esc(V.hours(myWeek.minutes))}</div></div>
        <div class="row"><div class="main">Last off</div><div class="side">${esc(V.when(myWeek.last))}</div></div>
      </div>
    </section>` : ''}
  </aside>
</div>`;

    res.page({ title: 'The Watch', body, active: 'watch', wide: true });
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
