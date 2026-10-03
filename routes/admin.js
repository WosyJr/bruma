const V = require('../lib/views');
const O = require('../lib/offices');
const U = require('../lib/users');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need, needAny }) {

  app.get('/officers', needAny('officers', 'appoint'), (req, res) => {
    const u = req.user;
    const full = O.can(u, 'officers');
    const mayAppoint = O.mayAppointTo(u);
    const offices = O.all().filter(o => full || mayAppoint.includes(o.id));
    const people = U.list().filter(p => full || mayAppoint.includes(p.office));
    const byOffice = {};
    people.forEach(p => { byOffice[p.office] = (byOffice[p.office] || 0) + 1; });

    const body = `
<section class="card">
  <h2>The officers of the County</h2>
  <p class="lede">${full
    ? 'Who stands in which office. The Count, the Countess and the Steward reach everything; everyone else reaches what their office opens.'
    : 'The offices your own office may appoint to, and who stands in them.'}</p>
</section>

${offices.length ? '' : V.empty('Your office may not appoint to any other yet. Ask the Steward to set which offices it appoints to.')}

<section class="card">
  <h3 style="margin-top:0">On the rolls</h3>
  ${people.length ? V.table([
      { head: 'Name', cell: p => `<a href="/officers/${esc(p.username)}">${esc(p.name)}</a>` },
      { head: 'Enters as', cell: p => esc(p.username) },
      { head: 'Office', cell: p => esc(p.officeName) + (O.get(p.office) && O.get(p.office).all ? ' <span class="tag gold">holds the County</span>' : '') },
      { head: 'Style', cell: p => esc(p.style || '') },
      { head: 'Standing', cell: p => p.active ? '<span class="tag in">standing</span>' : '<span class="tag out">set aside</span>' },
      { head: 'Last entered', cell: p => esc(V.when(p.lastLogin)) }
    ], people) : V.empty('Nobody stands on the rolls.')}
</section>

<section class="card">
  <h3 style="margin-top:0">Put someone on the rolls</h3>
  <form method="post" action="/officers">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="name">Their name</label><input id="name" name="name" type="text" placeholder="Hafid Hollow-Leg" required></div>
      <div><label for="username">Name they enter with</label><input id="username" name="username" type="text" placeholder="hafid" autocapitalize="none" required></div>
      <div><label for="office">Office</label><select id="office" name="office" required>
        ${offices.map(o => `<option value="${o.id}"${o.id === 'citizen' ? ' selected' : ''}>${esc(o.name)}${o.all ? ' — holds the County' : ''}</option>`).join('')}
      </select></div>
    </div>
    <div class="fields">
      <div><label for="style">Style, if they have one</label><input id="style" name="style" type="text" placeholder="Captain of the North Gate"></div>
      <div><label for="password">A word to get in with</label><input id="password" name="password" type="text" value="${esc(U.tempPassword())}" required></div>
    </div>
    <p class="hint">Give them that word yourself. They must set their own the first time they enter.</p>
    <div class="btnrow"><button class="btn go" type="submit"${offices.length ? '' : ' disabled'}>Put them on the rolls</button>
    ${full ? '<a class="btn ghost" href="/offices">The offices themselves</a>' : ''}</div>
  </form>
</section>

${full ? `<section class="card">
  <h3 style="margin-top:0">The offices</h3>
  ${V.table([
      { head: 'Office', cell: o => `<a href="/offices/${esc(o.id)}">${esc(o.name)}</a>` },
      { head: 'Opens', cell: o => o.all ? '<span class="tag gold">everything</span>' : o.perms.length + (o.perms.length === 1 ? ' power' : ' powers') },
      { head: 'Guild', cell: o => o.guild ? esc(O.GUILD_BY_ID[o.guild].name) : '—' },
      { head: 'Standing in it', num: true, cell: o => byOffice[o.id] || 0 },
      { head: 'What it is', cell: o => esc(o.note || '') }
    ], O.all())}
  <p style="margin:12px 0 0"><a class="btn ghost small" href="/offices">Make or amend an office</a></p>
</section>` : ''}`;

    res.page({ title: 'The officers', body, active: '', wide: true });
  });

  app.post('/officers', checkCsrf, needAny('officers', 'appoint'), wrap((req, res) => {
    try {
      if (!O.canAppointTo(req.user, req.body.office)) throw new Error('Your office may not appoint to that office.');
      const p = U.create(req.body);
      req.session.flash = { text: p.name + ' is on the rolls as ' + p.officeName + '. Give them the word you set; they must change it when they first enter.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/officers');
  }));

  app.get('/officers/:username', needAny('officers', 'appoint'), (req, res) => {
    const p = U.view(req.params.username);
    if (!p) return res.say('Nobody of that name', 'Nobody on the rolls answers to that.', 404);
    const full = O.can(req.user, 'officers');
    if (!full && !O.canAppointTo(req.user, p.office)) {
      return res.say('Not yours to amend', 'That officer does not stand in an office yours may appoint to.', 403);
    }
    const offices = O.all().filter(o => full || O.canAppointTo(req.user, o.id));

    const body = `
<section class="card">
  <h2>${esc(p.name)}</h2>
  <p class="lede">${esc(p.officeName)}${p.style ? ' · ' + esc(p.style) : ''} · enters as <b>${esc(p.username)}</b></p>
  <form method="post" action="/officers/${esc(p.username)}">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="name">Name</label><input id="name" name="name" type="text" value="${esc(p.name)}" required></div>
      <div><label for="office">Office</label><select id="office" name="office">
        ${offices.map(o => `<option value="${o.id}"${p.office === o.id ? ' selected' : ''}>${esc(o.name)}${o.all ? ' — holds the County' : ''}</option>`).join('')}
      </select></div>
      <div><label for="style">Style</label><input id="style" name="style" type="text" value="${esc(p.style || '')}"></div>
    </div>
    <label for="about">About them</label>
    <textarea id="about" name="about" style="min-height:80px">${esc(p.about || '')}</textarea>
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink)">
      <input type="checkbox" name="active" value="1"${p.active ? ' checked' : ''} style="width:auto"> Standing in office
    </label>
    <div class="btnrow"><button class="btn" type="submit">Amend</button>
    <a class="btn ghost" href="/officers">Back to the rolls</a></div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">Give them a new word</h3>
  <p class="lede">They will have to set their own the next time they enter.</p>
  <form method="post" action="/officers/${esc(p.username)}/word">${V.hidden(req.session.csrf)}
    <label for="password">The word</label>
    <input id="password" name="password" type="text" value="${esc(U.tempPassword())}" required>
    <div class="btnrow"><button class="btn" type="submit">Set it</button></div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">Strike them from the rolls</h3>
  <p class="lede">Everything they entered stays. Only the account goes.</p>
  <form method="post" action="/officers/${esc(p.username)}/strike">${V.hidden(req.session.csrf)}
    <button class="btn danger" type="submit">Strike ${esc(p.name)}</button>
  </form>
</section>`;

    res.page({ title: p.name, body, active: '' });
  });

  app.post('/officers/:username', checkCsrf, needAny('officers', 'appoint'), wrap((req, res) => {
    const target = U.view(req.params.username);
    if (target && !O.can(req.user, 'officers') && !O.canAppointTo(req.user, target.office)) {
      return res.say('Not yours to amend', 'That officer does not stand in an office yours may appoint to.', 403);
    }
    try {
      U.update(req.params.username, {
        name: req.body.name,
        office: req.body.office,
        style: req.body.style,
        about: req.body.about,
        active: !!req.body.active
      });
      req.session.flash = { text: 'The rolls are amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/officers/' + encodeURIComponent(req.params.username));
  }));

  app.post('/officers/:username/word', checkCsrf, needAny('officers', 'appoint'), wrap((req, res) => {
    const target = U.view(req.params.username);
    if (target && !O.can(req.user, 'officers') && !O.canAppointTo(req.user, target.office)) {
      return res.say('Not yours to amend', 'That officer does not stand in an office yours may appoint to.', 403);
    }
    try {
      U.update(req.params.username, { password: req.body.password, mustChange: true });
      req.session.flash = { text: 'The word is set. Give it to them yourself.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/officers/' + encodeURIComponent(req.params.username));
  }));

  app.post('/officers/:username/strike', checkCsrf, needAny('officers', 'appoint'), wrap((req, res) => {
    const target = U.view(req.params.username);
    if (target && !O.can(req.user, 'officers') && !O.canAppointTo(req.user, target.office)) {
      return res.say('Not yours to amend', 'That officer does not stand in an office yours may appoint to.', 403);
    }
    try {
      U.remove(req.params.username);
      req.session.flash = { text: 'Struck from the rolls.' };
      res.redirect('/officers');
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/officers/' + encodeURIComponent(req.params.username));
    }
  }));

  app.get('/offices', need('offices'), (req, res) => {
    const offices = O.all();
    const body = `
<section class="card">
  <h2>The offices of the County</h2>
  <p class="lede">An office is a bundle of powers. Everyone on the rolls stands in one.
  An office that <b>holds the County</b> reaches everything, whatever else is ticked.</p>
</section>

${offices.map(o => `<section class="card">
  <h3 style="margin-top:0">${esc(o.name)}${o.all ? ' <span class="tag gold">holds the County</span>' : ''}${o.fixed ? ' <span class="tag">fixed</span>' : ''}</h3>
  <form method="post" action="/offices/${esc(o.id)}">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="name-${esc(o.id)}">Name of the office</label><input id="name-${esc(o.id)}" name="name" type="text" value="${esc(o.name)}" required></div>
      <div><label for="rank-${esc(o.id)}">Where it sits (0 highest)</label><input id="rank-${esc(o.id)}" name="rank" type="number" min="0" max="99" value="${o.rank}"></div>
      <div><label for="guild-${esc(o.id)}">Guild it keeps</label><select id="guild-${esc(o.id)}" name="guild">
        <option value="">None</option>
        ${O.GUILDS.map(g => `<option value="${g.id}"${o.guild === g.id ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}
      </select></div>
    </div>
    <label for="note-${esc(o.id)}">What the office is</label>
    <input id="note-${esc(o.id)}" name="note" type="text" value="${esc(o.note || '')}">
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink);margin-top:14px">
      <input type="checkbox" name="all" value="1"${o.all ? ' checked' : ''} style="width:auto"${o.fixed ? ' disabled' : ''}>
      <b>Holds the County</b> — reaches every hall and every power, now and whatever is added later
    </label>
    ${o.fixed ? '<input type="hidden" name="all" value="1">' : ''}
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink);margin-top:8px">
      <input type="checkbox" name="listed" value="1"${o.listed ? ' checked' : ''} style="width:auto">
      <b>Named publicly</b> — this office and who holds it show on the public court page. Leave it off for
      anyone who should be found out in Bruma rather than read about.
    </label>
    ${o.all ? '' : `<fieldset><legend>What it opens</legend>
      ${O.PERMS.map(group => `<h3 style="margin:14px 0 4px;font-size:16px">${esc(group[0])}</h3>
        <div class="checks">${group[1].map(p => `<label><input type="checkbox" name="perms" value="${p[0]}"${o.perms.includes(p[0]) ? ' checked' : ''}> ${esc(p[1])}</label>`).join('')}</div>`).join('')}
    </fieldset>`}
    <div class="btnrow"><button class="btn" type="submit">Amend this office</button>
    ${!o.fixed ? `<button class="btn danger" type="submit" name="strike" value="1"${U.officeInUse(o.id) ? ' disabled title="Somebody still stands in it"' : ''}>Strike it</button>` : ''}</div>
  </form>
</section>`).join('')}

<section class="card">
  <h3 style="margin-top:0">Make a new office</h3>
  <form method="post" action="/offices">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="newname">Name</label><input id="newname" name="name" type="text" placeholder="Bailiff of the Pass" required></div>
      <div><label for="newrank">Where it sits</label><input id="newrank" name="rank" type="number" min="0" max="99" value="5"></div>
      <div><label for="newguild">Guild it keeps</label><select id="newguild" name="guild">
        <option value="">None</option>
        ${O.GUILDS.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
      </select></div>
    </div>
    <label for="newnote">What the office is</label>
    <input id="newnote" name="note" type="text">
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink);margin-top:14px">
      <input type="checkbox" name="listed" value="1" checked style="width:auto">
      <b>Named publicly</b> — shows on the public court page
    </label>
    <fieldset><legend>What it opens</legend>
      ${O.PERMS.map(group => `<h3 style="margin:14px 0 4px;font-size:16px">${esc(group[0])}</h3>
        <div class="checks">${group[1].map(p => `<label><input type="checkbox" name="perms" value="${p[0]}"> ${esc(p[1])}</label>`).join('')}</div>`).join('')}
    </fieldset>
    <div class="btnrow"><button class="btn go" type="submit">Make it</button></div>
  </form>
</section>`;

    res.page({ title: 'The offices', body, active: '', wide: true });
  });

  app.post('/offices', checkCsrf, need('offices'), wrap((req, res) => {
    try {
      const o = O.create({ ...req.body, perms: list(req.body.perms), appoints: list(req.body.appoints), all: !!req.body.all, listed: !!req.body.listed });
      req.session.flash = { text: 'The office of ' + o.name + ' now stands.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/offices');
  }));

  app.post('/offices/:id', checkCsrf, need('offices'), wrap((req, res) => {
    try {
      if (req.body.strike) {
        if (U.officeInUse(req.params.id)) throw new Error('Somebody still stands in that office. Move them first.');
        O.remove(req.params.id);
        req.session.flash = { text: 'The office is struck.' };
      } else {
        const o = O.amend(req.params.id, {
          name: req.body.name,
          rank: req.body.rank,
          guild: req.body.guild,
          note: req.body.note,
          all: !!req.body.all,
          listed: !!req.body.listed,
          appoints: list(req.body.appoints),
          perms: list(req.body.perms)
        });
        req.session.flash = { text: 'The office of ' + o.name + ' is amended.' };
      }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/offices');
  }));

  app.get('/offices/:id', need('offices'), (req, res) => res.redirect('/offices'));
};

function list(v) {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null || v === '') return [];
  return [v];
}
