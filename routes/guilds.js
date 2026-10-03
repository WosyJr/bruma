const V = require('../lib/views');
const O = require('../lib/offices');
const G = require('../lib/guilds');
const T = require('../lib/treasury');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, needAny }) {

  app.get('/guilds', needAny('guildsee', 'guildown'), (req, res) => {
    const u = req.user;
    const counts = G.counts();
    const mine = O.guildOf(u);

    const body = `
<section class="card">
  <h2>The Guilds of Bruma</h2>
  <p class="lede">Three bodies hold charter in the County. Each keeps its own roll and renders its own tithe to the Treasury.</p>
</section>

<div class="choose">
  ${O.GUILDS.map(g => {
    const may = O.maySeeGuild(u, g.id);
    const charter = G.charterFor(g.id);
    return `<a href="${may ? '/guilds/' + g.id : '#'}"${may ? '' : ' style="opacity:.5;pointer-events:none"'}>
      <h3>${esc(g.name)}</h3>
      <p>${counts[g.id] || 0} upon the roll${charter ? ' · chartered' : ' · no charter laid'}${mine === g.id ? ' · <b>yours</b>' : ''}</p>
      ${may ? '' : '<p class="hint">Not open to your office.</p>'}
    </a>`;
  }).join('')}
</div>`;

    res.page({ title: 'The Guilds', body, active: 'guilds' });
  });

  app.get('/guilds/:id', needAny('guildsee', 'guildown'), (req, res) => {
    const u = req.user;
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter in the County.', 404);
    if (!O.maySeeGuild(u, g.id)) return res.say('That door is not yours to open', 'That guild roll is not open to your office.', 403);

    const roll = G.roll(g.id);
    const charter = G.charterFor(g.id);
    const mayKeep = O.can(u, 'guildsee') || (O.can(u, 'guildown') && O.guildOf(u) === g.id);
    const mayCharter = O.can(u, 'guildcharter');
    const tithes = O.can(u, 'treasread') ? T.forGuild(g.id).slice(0, 12) : [];
    const tithed = T.forGuild(g.id).filter(r => r.way === 'in').reduce((n, r) => n + r.amount, 0);

    const body = `
<section class="card">
  <h2>${esc(g.name)}</h2>
  <p class="lede">${roll.length} upon the roll${tithed ? ' · ' + V.septims(tithed) + ' septims rendered in tithes' : ''}</p>
  <p><a href="/guilds">All the guilds</a></p>
</section>

<section class="card">
  <h3 style="margin-top:0">The charter</h3>
  ${charter
    ? `<p class="lede">${esc(charter.title)}</p>
       <div style="white-space:pre-wrap;line-height:1.7">${esc(charter.text)}</div>
       <p class="hint" style="margin-top:14px">Laid by ${esc(charter.byName)} on ${esc(V.when(charter.at))}.</p>`
    : V.empty('No charter has been laid for this guild.')}
  ${mayCharter ? `<details style="margin-top:14px"><summary style="cursor:pointer;color:var(--frost)">${charter ? 'Amend the charter' : 'Lay a charter'}</summary>
    <form method="post" action="/guilds/${esc(g.id)}/charter">${V.hidden(req.session.csrf)}
      <label for="title">Title</label>
      <input id="title" name="title" type="text" value="${esc(charter ? charter.title : g.name + ' — Charter')}">
      <label for="text">The charter itself</label>
      <textarea id="text" name="text" style="min-height:260px">${esc(charter ? charter.text : '')}</textarea>
      <div class="btnrow"><button class="btn" type="submit">${charter ? 'Amend it' : 'Lay it'}</button></div>
    </form>
  </details>` : ''}
</section>

<section class="card">
  <h3 style="margin-top:0">The roll</h3>
  ${roll.length ? V.table([
      { head: 'Name', cell: r => esc(r.name) },
      { head: 'Grade', cell: r => `<span class="tag${r.grade === 'master' ? ' gold' : ''}">${esc(G.gradeName(r.grade))}</span>` },
      { head: 'Trade', cell: r => esc(r.trade || '') },
      { head: 'Admitted', cell: r => esc(V.when(r.admitted)) },
      { head: 'Note', cell: r => esc(r.note || '') },
      { head: '', cell: r => mayKeep ? `<a class="btn ghost small" href="/guilds/${esc(g.id)}/member/${esc(r.id)}">Amend</a>` : '' }
    ], roll) : V.empty('Nobody stands upon this roll yet.')}

  ${mayKeep ? `<h3>Admit a member</h3>
  <form method="post" action="/guilds/${esc(g.id)}/admit">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="name">Name</label><input id="name" name="name" type="text" required></div>
      <div><label for="grade">Grade</label><select id="grade" name="grade">
        ${G.GRADES.map(x => `<option value="${x.id}"${x.id === 'member' ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select></div>
      <div><label for="trade">Trade</label><input id="trade" name="trade" type="text" placeholder="Smith, mason, healer"></div>
    </div>
    <label for="note">Note</label><input id="note" name="note" type="text">
    <div class="btnrow"><button class="btn go" type="submit">Admit them</button></div>
  </form>` : ''}
</section>

${O.can(u, 'treasread') ? `<section class="card">
  <h3 style="margin-top:0">Tithes and payments</h3>
  ${tithes.length ? V.table([
      { head: 'When', cell: r => esc(V.when(r.at)) },
      { head: 'Way', cell: r => `<span class="tag ${r.way}">${r.way === 'in' ? 'in' : 'out'}</span>` },
      { head: 'Septims', num: true, cell: r => V.septims(r.amount) },
      { head: 'For what', cell: r => esc(r.reason) }
    ], tithes) : V.empty('Nothing has passed between this guild and the Treasury.')}
</section>` : ''}`;

    res.page({ title: g.name, body, active: 'guilds' });
  });

  app.post('/guilds/:id/admit', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter in the County.', 404);
    if (!(O.can(req.user, 'guildsee') || O.guildOf(req.user) === g.id)) return res.say('That door is not yours to open', 'You do not keep that roll.', 403);
    try {
      const m = G.admit(g.id, req.body, req.user);
      req.session.flash = { text: m.name + ' is admitted to ' + g.name + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + g.id);
  }));

  app.get('/guilds/:id/member/:mid', needAny('guildsee', 'guildown'), (req, res) => {
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter.', 404);
    if (!(O.can(req.user, 'guildsee') || O.guildOf(req.user) === g.id)) return res.say('That door is not yours to open', 'You do not keep that roll.', 403);
    const m = G.members().find(x => x.id === req.params.mid);
    if (!m) return res.say('No such member', 'Nobody of that name stands on the roll.', 404);

    const body = `
<section class="card">
  <h2>${esc(m.name)}</h2>
  <p class="lede">${esc(g.name)} · admitted ${esc(V.when(m.admitted))}</p>
  <form method="post" action="/guilds/${esc(g.id)}/member/${esc(m.id)}">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="name">Name</label><input id="name" name="name" type="text" value="${esc(m.name)}" required></div>
      <div><label for="grade">Grade</label><select id="grade" name="grade">
        ${G.GRADES.map(x => `<option value="${x.id}"${m.grade === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select></div>
      <div><label for="trade">Trade</label><input id="trade" name="trade" type="text" value="${esc(m.trade || '')}"></div>
    </div>
    <label for="note">Note</label><input id="note" name="note" type="text" value="${esc(m.note || '')}">
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink)">
      <input type="checkbox" name="struck" value="1"${m.struck ? ' checked' : ''} style="width:auto"> Struck from the roll
    </label>
    <div class="btnrow"><button class="btn" type="submit">Amend</button>
    <a class="btn ghost" href="/guilds/${esc(g.id)}">Back to the roll</a></div>
  </form>
</section>`;
    res.page({ title: m.name, body, active: 'guilds' });
  });

  app.post('/guilds/:id/member/:mid', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter.', 404);
    if (!(O.can(req.user, 'guildsee') || O.guildOf(req.user) === g.id)) return res.say('That door is not yours to open', 'You do not keep that roll.', 403);
    try {
      G.amendMember(req.params.mid, { ...req.body, struck: !!req.body.struck }, req.user);
      req.session.flash = { text: 'The roll is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + g.id);
  }));

  app.post('/guilds/:id/charter', checkCsrf, needAny('guildcharter'), wrap((req, res) => {
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter.', 404);
    try {
      G.setCharter(g.id, req.body, req.user);
      req.session.flash = { text: 'The charter of ' + g.name + ' is laid.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + g.id);
  }));
};
