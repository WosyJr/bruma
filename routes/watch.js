const V = require('../lib/views');
const O = require('../lib/offices');
const W = require('../lib/watch');
const R = require('../lib/reports');

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
    const mayRoster = O.can(u, 'watchroster');
    const weekTotal = week.reduce((n, r) => n + r.minutes, 0);
    const rsum = R.summary();
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
    <div class="hhbtns">
      ${O.can(u, 'watchreport') || O.can(u, 'watchlog')
        ? `<a class="btn ghost" href="/watch/reports">Reports${rsum.live ? ' <b>' + rsum.live + '</b>' : ''}</a>` : ''}
      ${seeAll ? '<a class="btn ghost" href="/watch/log">The whole log</a>' : ''}
      ${seeAll && O.can(u, 'watchroster') ? '<a class="btn ghost" href="/watch/roster">The roster</a>' : ''}
    </div>
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
        <th>Guard</th><th>Post</th><th>On</th><th>Off</th><th class="num">Stood</th>${
          mayRoster ? '<th class="num"></th>' : ''}</tr></thead><tbody>
        ${today.map(sh => `<tr${sh.off ? '' : ' class="live"'}>
          <td><b>${esc(sh.name)}</b></td>
          <td>${esc(W.postName(sh.post))}</td>
          <td>${esc(stamp(sh.on))}</td>
          <td>${sh.off
            ? esc(stamp(sh.off)) + (sh.offByName ? `<br><span class="byhand">by ${esc(sh.offByName)}</span>` : '')
            : '<span class="onnow">— on watch</span>'}</td>
          <td class="num">${esc(V.hours(W.minutesOf(sh)))}</td>
          ${mayRoster ? `<td class="num">${!sh.off && sh.who !== u.username
            ? `<form method="post" action="/watch/off/${esc(sh.id)}" class="inline">${V.hidden(req.session.csrf)}
                 <button class="btn ghost small" type="submit">Clock off</button></form>`
            : ''}</td>` : ''}
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
          <span class="pstr">
            <span class="tag ${p.state === 'manned' ? 'in' : p.state === 'returned' ? '' : 'out'}">${
              p.state === 'manned' ? 'Manned' : p.state === 'returned' ? 'Returned' : 'Empty'}</span>
            ${mayRoster && p.state === 'manned' ? duty.filter(d => d.post === p.id && d.who !== u.username).map(d =>
              `<form method="post" action="/watch/off/${esc(d.id)}" class="inline">${V.hidden(req.session.csrf)}
                 <button class="btn ghost small" type="submit" title="Clock ${esc(d.name)} off">Clock off</button></form>`).join('') : ''}
          </span>
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

  app.post('/watch/off/:id', checkCsrf, need('watchroster'), wrap((req, res) => {
    try {
      const row = W.clockOffOther(req.params.id, req.body.note, req.user);
      req.session.flash = { text: row.name + ' is clocked off. They stood ' + V.hours(row.minutes) + '.' };
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
      { head: 'Off', cell: r => r.off
          ? esc(V.when(r.off)) + (r.offByName ? '<br><span class="byhand">by ' + esc(r.offByName) + '</span>' : '')
          : '<span class="tag on">standing</span>' },
      { head: 'Stood', num: true, cell: r => r.off ? esc(V.hours(r.minutes)) : '' },
      { head: 'Set down', cell: r => esc(r.note || '') },
      { head: '', cell: r => [
          !r.off && O.can(req.user, 'watchroster')
            ? `<form method="post" action="/watch/off/${esc(r.id)}" class="inline">${V.hidden(req.session.csrf)}<input type="hidden" name="back" value="/watch/log"><button class="btn ghost small" type="submit">Clock off</button></form>`
            : '',
          O.can(req.user, 'watchamend') ? `<a class="btn ghost small" href="/watch/shift/${esc(r.id)}">Amend</a>` : ''
        ].filter(Boolean).join(' ') }
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

  const reportFields = (r, gkinds) => {
    const o = r || {};
    const persons = (o.persons || []).concat([{ name: '', race: '', role: 'involved' }, { name: '', race: '', role: 'involved' }, { name: '', race: '', role: 'involved' }]);
    return `<div class="formgrid">
      <label class="f3"><span>Heading</span>
        <input name="title" type="text" maxlength="180" value="${esc(o.title || '')}" required
          placeholder="Khajiit skulking around Castle Bruma Great Hall"></label>
      <label><span>What kind</span>
        <select name="kind">${R.KINDS.map(k =>
          `<option value="${k.id}"${k.id === o.kind ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <label class="f2"><span>Date and time</span>
        <input name="when" type="text" maxlength="120" value="${esc(o.when || '')}"
          placeholder="03/10/4E 226 · 1700 Eastern Stars"></label>
      <label class="f2"><span>Where</span>
        <input name="location" type="text" maxlength="180" value="${esc(o.location || '')}"
          placeholder="Castle Bruma, the Great Hall"></label>
      <label class="f4"><span>Assisting — one to a line</span>
        <textarea name="assisting" rows="2" placeholder="Guardsman Maximus the Colovian">${esc((o.assisting || []).join('\n'))}</textarea></label>
    </div>

    <div class="eyebrow" style="margin:22px 0 2px">Persons</div>
    <p class="hint" style="margin:0 0 4px">Name everyone the report touches. Leave a row empty to drop it.</p>
    <div class="personrows" data-personrows>
      ${persons.map(p => `<div class="prow">
        <input name="pname" type="text" maxlength="120" value="${esc(p.name || '')}" placeholder="Name">
        <input name="prace" type="text" maxlength="60" value="${esc(p.race || '')}" placeholder="Race or kin">
        <select name="prole">${R.ROLES.map(x =>
          `<option value="${x.id}"${x.id === p.role ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <button class="btn ghost small prowdrop" type="button" data-dropperson title="Take this row off">×</button>
      </div>`).join('')}
    </div>
    <div class="btnrow" style="margin-top:4px">
      <button class="btn ghost small" type="button" data-addperson>Add another person</button>
      <span class="hint" style="margin:0">As many as the report needs. Empty rows are dropped when you set it down.</span>
    </div>

    <div class="formgrid">
      <label class="f4"><span>Event — what happened</span>
        <textarea name="event" rows="7" required style="height:auto"
          placeholder="Khajiit found going skulking around the Great hall of the Castle of Bruma...">${esc(o.event || '')}</textarea></label>
      <label class="f4"><span>Actions taken</span>
        <textarea name="actions" rows="3" style="height:auto"
          placeholder="Report made, Khajiit to still be arrested and questioned">${esc(o.actions || '')}</textarea></label>
      <label class="f2"><span>Disposition</span>
        <input name="disposition" type="text" maxlength="1000" value="${esc(o.disposition || '')}"
          placeholder="Fined 200 septims and escorted from the city"></label>
      <label><span>Standing</span>
        <select name="state">${R.STATES.map(x =>
          `<option value="${x.id}"${x.id === o.state ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label><span>Matter before the court</span>
        <select name="matter"><option value="">— none —</option>${(gkinds.matters || []).map(m =>
          `<option value="${esc(m.id)}"${m.id === o.matter ? ' selected' : ''}>No. ${m.no} — ${esc(m.title)}</option>`).join('')}</select></label>
      <label class="f2"><span>Entry in the gaol</span>
        <select name="commitment"><option value="">— none —</option>${(gkinds.commits || []).map(c =>
          `<option value="${esc(c.id)}"${c.id === o.commitment ? ' selected' : ''}>No. ${c.no} — ${esc(c.who)}</option>`).join('')}</select></label>
    </div>`;
  };

  const ties = () => {
    let matters = [];
    let commits = [];
    try { matters = require('../lib/court').all().slice(0, 60); } catch (_) {}
    try { commits = require('../lib/gaol').all().slice(0, 60); } catch (_) {}
    return { matters, commits };
  };

  const mayReadReport = (u, r) => O.can(u, 'watchlog') || r.by === u.username
    || (r.addenda || []).some(a => a.by === u.username);

  const reportCard = r => {
    const st = R.STATE_BY_ID[r.state] || R.STATES[0];
    const people = (r.persons || []).slice(0, 4);
    return `<section class="card repcard">
      <div class="gaolhead">
        <span class="gno">Report no. ${r.no} · ${esc(R.kindName(r.kind))}</span>
        <span class="tag ${st.tag}">${esc(st.name)}</span>
        <span class="gdays">${esc(r.when || V.when(r.at))}</span>
      </div>
      <h3 style="margin:6px 0 4px"><a href="/watch/reports/${esc(r.id)}">${esc(r.title)}</a></h3>
      <p class="hint" style="margin:0 0 10px">${esc(r.byName)}${
        r.location ? ' · ' + esc(r.location) : ''}${
        (r.addenda || []).length ? ' · ' + (r.addenda || []).length + ' added' : ''}</p>
      ${people.length ? `<div class="pchips">${people.map(p => {
        const ro = R.ROLE_BY_ID[p.role] || R.ROLES[4];
        return `<span class="pchip ${ro.tag}"><b>${esc(p.name)}</b>${esc(ro.name)}</span>`;
      }).join('')}${(r.persons || []).length > 4 ? `<span class="pchip">+${(r.persons || []).length - 4}</span>` : ''}</div>` : ''}
      <p class="repsnip">${esc(String(r.event || '').replace(/\s+/g, ' ').slice(0, 260))}${
        String(r.event || '').length > 260 ? '…' : ''}</p>
    </section>`;
  };

  app.get('/watch/reports', needAny('watchreport', 'watchlog'), (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '');
    const kind = R.KIND_BY_ID[req.query.kind] ? String(req.query.kind) : '';
    const state = R.STATE_BY_ID[req.query.state] ? String(req.query.state) : '';
    const seeAll = O.can(u, 'watchlog');
    const found = R.search(q, kind, state);
    const rows = seeAll ? found : found.filter(r => mayReadReport(u, r));
    const sum = R.summary();
    const mayFile = O.can(u, 'watchreport');
    const filter = (k, v, label, n) => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (k === 'kind' ? v : kind) p.set('kind', k === 'kind' ? v : kind);
      if (k === 'state' ? v : state) p.set('state', k === 'state' ? v : state);
      const on = k === 'kind' ? kind === v : state === v;
      return `<a class="btn ${on ? '' : 'ghost'} small" href="/watch/reports${p.toString() ? '?' + p : ''}">${
        esc(label)}${n === undefined ? '' : ` <b>${n}</b>`}</a>`;
    };

    const body = `
<section class="card hhead">
  <div class="hhrow">
    <div>
      <div class="eyebrow">The watch of Bruma</div>
      <h2 style="margin:4px 0 8px">Reports</h2>
      <p class="lede" style="margin:0;max-width:560px">What the Watch saw, what it did about it, and how it
      stands now. ${seeAll ? 'A report is never edited away — what is added later is added underneath, under the hand that added it.'
        : 'You see the reports you filed or added to.'}</p>
    </div>
    <div class="hhbtns">
      ${mayFile ? '<a class="btn go" href="/watch/reports/file">File a report</a>' : ''}
      <a class="btn ghost" href="/watch">Back to the Watch</a>
    </div>
  </div>
</section>

<div class="grid three">
  <div class="stat"><div class="k">Reports filed</div><div class="v">${sum.total}</div>
    <div class="n">${sum.thisWeek} this week</div></div>
  <div class="stat"><div class="k">Still live</div><div class="v">${sum.live}</div>
    <div class="n">open or under investigation</div></div>
  <div class="stat"><div class="k">Added underneath</div><div class="v">${sum.addenda}</div>
    <div class="n">${sum.addenda === 1 ? 'addendum' : 'addenda'} by other hands</div></div>
</div>

<section class="card">
  <form method="get" action="/watch/reports" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search a name, a place, a word" style="max-width:320px;margin:0">
    ${kind ? `<input type="hidden" name="kind" value="${esc(kind)}">` : ''}
    ${state ? `<input type="hidden" name="state" value="${esc(state)}">` : ''}
    <button class="btn ghost" type="submit">Search</button>
    ${q || kind || state ? '<a class="btn ghost small" href="/watch/reports">Clear</a>' : ''}
  </form>
  <div class="btnrow" style="margin-bottom:8px">
    ${filter('kind', '', 'Every kind', sum.total)}
    ${R.KINDS.map(k => filter('kind', k.id, k.name.replace(/ Report$/, ''), sum.byKind[k.id] || 0)).join('')}
  </div>
  <div class="btnrow">
    ${filter('state', '', 'Any standing')}
    ${R.STATES.map(s => filter('state', s.id, s.name, sum.byState[s.id] || 0)).join('')}
  </div>
</section>

${rows.length ? `<div class="board one">${rows.map(reportCard).join('')}</div>`
  : `<section class="card">${V.empty(q || kind || state
      ? 'No report answers to that.'
      : 'No report has been filed yet.')}</section>`}`;

    res.page({ title: 'Reports of the Watch', body, active: 'watch', wide: true });
  });

  app.get('/watch/reports/file', need('watchreport'), (req, res) => {
    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:6px">The watch of Bruma</div>
  <h2 style="margin:4px 0 8px">File a report</h2>
  <p class="lede">Write it as you would write it out by hand. Your name and office go on it as the hand that
  reported — you do not write them yourself.</p>
  <form method="post" action="/watch/reports">${V.hidden(req.session.csrf)}
    ${reportFields(null, ties())}
    <div class="btnrow" style="margin-top:20px">
      <button class="btn go" type="submit">File it</button>
      <a class="btn ghost" href="/watch/reports">Never mind</a>
    </div>
  </form>
</section>`;
    res.page({ title: 'File a report', body, active: 'watch', wide: true });
  });

  app.post('/watch/reports', checkCsrf, need('watchreport'), wrap((req, res) => {
    try {
      const r = R.file(req.body, req.user);
      req.session.flash = { text: 'Report no. ' + r.no + ' is filed.' };
      return res.redirect('/watch/reports/' + r.id);
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      return res.redirect('/watch/reports/file');
    }
  }));

  app.get('/watch/reports/:id', needAny('watchreport', 'watchlog'), (req, res) => {
    const u = req.user;
    const r = R.get(req.params.id);
    if (!r) return res.say('No such report', 'Nothing in the Watch’s reports answers to that.', 404);
    if (!mayReadReport(u, r)) return res.say('Not yours to read', 'That report was filed by another hand.', 403);
    const Papers = require('../lib/papers');
    const paper = Papers.forRef('reports', r.id);
    const st = R.STATE_BY_ID[r.state] || R.STATES[0];
    const mayAdd = O.can(u, 'watchreport');
    const mayAmend = O.can(u, 'watchamend');
    const adds = (r.addenda || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));

    let matter = null;
    let commit = null;
    try { matter = r.matter ? require('../lib/court').get(r.matter) : null; } catch (_) {}
    try { commit = r.commitment ? require('../lib/gaol').get(r.commitment) : null; } catch (_) {}

    const body = `
<section class="card">
  <div class="gaolhead">
    <span class="gno">Report no. ${r.no} · ${esc(R.kindName(r.kind))}</span>
    <span class="tag ${st.tag}">${esc(st.name)}</span>
    <span class="gdays">${esc(R.kindNote(r.kind))}</span>
  </div>
  <h2 style="margin:8px 0 14px">${esc(r.title)}</h2>
  <div class="rows tight">
    <div class="row"><div class="main">Date and time</div>
      <div class="side">${esc(r.when) || '<span class="dash">—</span>'}</div></div>
    <div class="row"><div class="main">Reported by</div>
      <div class="side">${esc(r.byName)}${r.byStyle ? ' · ' + esc(r.byStyle) : ''}</div></div>
    ${(r.assisting || []).length ? `<div class="row"><div class="main">Assisting</div>
      <div class="side">${(r.assisting || []).map(esc).join(', ')}</div></div>` : ''}
    <div class="row"><div class="main">Where</div>
      <div class="side">${esc(r.location) || '<span class="dash">—</span>'}</div></div>
    <div class="row"><div class="main">Filed</div><div class="side">${esc(V.when(r.at))}</div></div>
    ${r.amended ? `<div class="row"><div class="main">Last amended</div>
      <div class="side">${esc(r.amended.by)} · ${esc(V.when(r.amended.at))}</div></div>` : ''}
  </div>
  <div class="btnrow" style="margin-top:16px">
    <a class="btn ghost small" href="/watch/reports/${esc(r.id)}/doc" target="_blank" rel="noopener">The report to give out ↗</a>
    ${paper ? `<a class="btn ghost small" href="/verify?code=${esc(paper.code)}">${esc(paper.code)}</a>` : ''}
    <a class="btn ghost small" href="/watch/reports">All reports</a>
  </div>
</section>

${(r.persons || []).length ? `<section class="card">
  <div class="eyebrow" style="margin-bottom:12px">Persons</div>
  ${V.table([
    { head: 'Name', cell: p => `<a href="/people?q=${encodeURIComponent(p.name)}">${esc(p.name)}</a>` },
    { head: 'Race or kin', cell: p => esc(p.race) || '<span class="dash">—</span>' },
    { head: 'How they come into it', cell: p => {
      const ro = R.ROLE_BY_ID[p.role] || R.ROLES[4];
      return `<span class="tag ${ro.tag}">${esc(ro.name)}</span>`;
    } }
  ], r.persons)}
</section>` : ''}

<section class="card">
  <div class="eyebrow" style="margin-bottom:12px">Event</div>
  <div class="repbody">${esc(r.event)}</div>
  ${r.actions ? `<div class="eyebrow" style="margin:24px 0 10px">Actions taken</div>
    <div class="repbody">${esc(r.actions)}</div>` : ''}
  ${r.disposition ? `<div class="eyebrow" style="margin:24px 0 10px">Disposition</div>
    <p style="margin:0;font-size:17px;color:var(--bright)">${esc(r.disposition)}</p>` : ''}
</section>

${matter || commit ? `<section class="card">
  <div class="eyebrow" style="margin-bottom:12px">Where this went</div>
  <div class="rows tight">
    ${matter ? `<div class="row"><div class="main">Before the court</div>
      <div class="side"><a href="/court/${esc(matter.id)}">No. ${matter.no} — ${esc(matter.title)}</a></div></div>` : ''}
    ${commit ? `<div class="row"><div class="main">In the gaol</div>
      <div class="side"><a href="/gaol/${esc(commit.id)}">No. ${commit.no} — ${esc(commit.who)}</a></div></div>` : ''}
  </div>
</section>` : ''}

<section class="card">
  <div class="eyebrow" style="margin-bottom:12px">Added underneath · ${adds.length}</div>
  ${adds.length ? adds.map(a => `<div class="addendum">
    <div class="ahead"><b>${esc(a.byName)}</b>${a.byStyle ? `<i>${esc(a.byStyle)}</i>` : ''}
      <span>${esc(a.when || V.when(a.at))}</span></div>
    <div class="repbody">${esc(a.text)}</div>
    ${mayAmend ? `<form method="post" action="/watch/reports/${esc(r.id)}/addendum/${esc(a.id)}/strike" class="inline">${
      V.hidden(req.session.csrf)}<button class="btn danger small" type="submit">Strike this</button></form>` : ''}
  </div>`).join('') : `<p class="hint" style="margin:0">Nothing has been added to this report.</p>`}

  ${mayAdd ? `<details class="fold" style="margin-top:18px"><summary>Add to this report</summary>
    <form method="post" action="/watch/reports/${esc(r.id)}/addendum">${V.hidden(req.session.csrf)}
      <div class="formgrid">
        <label class="f2"><span>Date and time</span>
          <input name="when" type="text" maxlength="120" placeholder="03/10/4E 226 · 2115 Eastern Stars"></label>
        <label class="f4"><span>What you are adding</span>
          <textarea name="text" rows="6" required style="height:auto"
            placeholder="The same Khajiit was caught once again attempting to break into the Keep..."></textarea></label>
      </div>
      <div class="btnrow"><button class="btn go" type="submit">Add it</button></div>
    </form>
  </details>` : ''}
</section>

${mayAmend ? `<section class="card">
  <div class="eyebrow" style="margin-bottom:12px">Keeping the record</div>
  <form method="post" action="/watch/reports/${esc(r.id)}/state" class="inline" style="margin-bottom:14px">${V.hidden(req.session.csrf)}
    <div class="btnrow">${R.STATES.map(s => `<button class="btn ${s.id === r.state ? '' : 'ghost'} small"
      type="submit" name="state" value="${s.id}">${esc(s.name)}</button>`).join('')}</div>
  </form>
  <details class="fold"><summary>Amend this report</summary>
    <form method="post" action="/watch/reports/${esc(r.id)}">${V.hidden(req.session.csrf)}
      ${reportFields(r, ties())}
      <div class="btnrow" style="margin-top:20px"><button class="btn" type="submit">Set it down</button></div>
    </form>
  </details>
  <form method="post" action="/watch/reports/${esc(r.id)}/strike" style="margin-top:14px">${V.hidden(req.session.csrf)}
    <button class="btn danger small" type="submit">Strike this report from the record</button>
  </form>
</section>` : ''}`;

    res.page({ title: 'Report no. ' + r.no, body, active: 'watch', wide: true });
  });

  app.post('/watch/reports/:id', checkCsrf, need('watchamend'), wrap((req, res) => {
    try {
      R.amend(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The report is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/watch/reports/' + req.params.id);
  }));

  app.post('/watch/reports/:id/state', checkCsrf, need('watchamend'), wrap((req, res) => {
    try {
      const r = R.setState(req.params.id, req.body.state, req.user);
      req.session.flash = { text: 'Report no. ' + r.no + ' now stands ' + R.stateName(r.state).toLowerCase() + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/watch/reports/' + req.params.id);
  }));

  app.post('/watch/reports/:id/addendum', checkCsrf, need('watchreport'), wrap((req, res) => {
    try {
      R.addendum(req.params.id, req.body, req.user);
      req.session.flash = { text: 'Added to the report under your hand.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/watch/reports/' + req.params.id);
  }));

  app.post('/watch/reports/:id/addendum/:aid/strike', checkCsrf, need('watchamend'), wrap((req, res) => {
    R.removeAddendum(req.params.id, req.params.aid);
    req.session.flash = { text: 'Struck from the report.' };
    res.redirect('/watch/reports/' + req.params.id);
  }));

  app.post('/watch/reports/:id/strike', checkCsrf, need('watchamend'), wrap((req, res) => {
    R.strike(req.params.id);
    req.session.flash = { text: 'The report is struck from the record.' };
    res.redirect('/watch/reports');
  }));

  app.get('/watch/reports/:id/doc', needAny('watchreport', 'watchlog'), (req, res) => {
    const Papers = require('../lib/papers');
    const r = R.get(req.params.id);
    if (!r) return res.say('No such report', 'Nothing in the Watch’s reports answers to that.', 404);
    if (!mayReadReport(req.user, r)) return res.say('Not yours to read', 'That report was filed by another hand.', 403);
    const paper = Papers.forRef('reports', r.id);
    const adds = (r.addenda || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));

    const bodyHtml = [
      Papers.three([
        ['Report no.', String(r.no)],
        ['What kind', R.kindName(r.kind)],
        ['Standing', R.stateName(r.state)]
      ]),
      Papers.facts([
        ['Date and time', r.when],
        ['Reported by', r.byName + (r.byStyle ? ' · ' + r.byStyle : '')],
        ['Assisting', (r.assisting || []).join(', ')],
        ['Where', r.location],
        ['Filed', new Date(r.at).toISOString().slice(0, 10)]
      ]),
      (r.persons || []).length
        ? Papers.part('Persons', (r.persons || []).map(p =>
            p.name + (p.race ? ' — ' + p.race : '') + ' — ' + R.roleName(p.role)).join('\n\n'))
        : '',
      Papers.part('Event', r.event),
      Papers.part('Actions taken', r.actions),
      r.disposition ? Papers.band('Disposition', r.disposition, '') : '',
      adds.length ? adds.map(a => Papers.part('Added by ' + a.byName
        + (a.when ? ' · ' + a.when : ''), a.text)).join('') : '',
      `<div class="warn"><p>This is a <b>report of the Watch</b>, not a judgment. Nothing written here is
      proved until it is laid before the court and answered there.</p>
      <p>A person named in it may ask the Great Hall what is written against their name.</p></div>`
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'report',
      title: r.title,
      sub: 'Report no. ' + r.no + ' · ' + R.kindName(r.kind) + ' · ' + R.stateName(r.state),
      lead: `Set down by <b>${Papers.esc(r.byName)}</b> of the Watch of Bruma${
        r.when ? ', ' + Papers.esc(r.when) : ''}.`,
      body: bodyHtml,
      closing: R.stateName(r.state) + '.',
      motto: 'Seen · Written · Kept',
      signLine: 'Reported under the hand of',
      signedBy: r.byName,
      signedOf: r.byStyle || 'Of the Watch of Bruma',
      code: paper ? paper.code : '',
      back: '/watch/reports/' + r.id,
      fileName: 'report-' + r.no + '-' + r.title
    }));
  });
};
