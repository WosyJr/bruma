const V = require('../lib/views');
const O = require('../lib/offices');
const Tax = require('../lib/taxes');
const P = require('../lib/property');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/taxes', need('treasread'), (req, res) => {
    const u = req.user;
    const state = String(req.query.state || '');
    const period = String(req.query.period || '');
    const q = String(req.query.q || '');
    let rows = Tax.withState().sort((a, b) => b.no - a.no);
    if (state) rows = rows.filter(r => r.state === state);
    if (period) rows = rows.filter(r => r.period === period);
    const needle = q.trim().toLowerCase();
    if (needle) rows = rows.filter(r => (r.who + ' ' + r.where + ' ' + Tax.kindName(r.kind)).toLowerCase().includes(needle));

    const sum = Tax.summary();
    const mayEnter = O.can(u, 'treasenter');
    const held = P.all().filter(h => h.state === 'held' && h.holder).length;

    const body = `
<section class="card">
  <h2>The tax roll</h2>
  <p class="lede">What the County has laid upon its people, what has been rendered, and what stands in arrears.
  Every payment taken here is written straight into the Treasury.</p>
</section>

<div class="cols">
  <div>
    <section class="card">
      <h3 style="margin-top:0">The roll</h3>
      <form method="get" action="/taxes" class="fields">
        <div><label for="fstate">Standing</label><select id="fstate" name="state">
          <option value="">All</option>
          ${Object.keys(Tax.STATES).map(k => `<option value="${k}"${state === k ? ' selected' : ''}>${esc(Tax.STATES[k].name)}</option>`).join('')}
        </select></div>
        <div><label for="fperiod">Period</label><select id="fperiod" name="period">
          <option value="">Every period</option>
          ${Tax.periods().map(x => `<option value="${esc(x)}"${period === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}
        </select></div>
        <div><label for="fq">Search</label><input id="fq" name="q" type="text" value="${esc(q)}" placeholder="Name or holding"></div>
        <div style="display:flex;align-items:flex-end;gap:8px"><button class="btn ghost" type="submit" style="margin-bottom:0">Show</button>
        ${(state || period || q) ? `<a class="btn ghost small" href="/taxes" style="margin-bottom:0">Clear</a>` : ''}</div>
      </form>
      <div class="tablewrap capped">${rows.length ? V.table([
          { head: 'No.', num: true, cell: r => r.no },
          { head: 'Upon whom', cell: r => esc(r.who) },
          { head: 'What', cell: r => esc(Tax.kindName(r.kind)) },
          { head: 'Where', cell: r => esc(r.where || '') },
          { head: 'Period', cell: r => esc(r.period || '') },
          { head: 'Due', num: true, cell: r => V.septims(r.due) },
          { head: 'Rendered', num: true, cell: r => r.paid ? V.septims(r.paid) : '\u2014' },
          { head: 'Owing', num: true, cell: r => r.left ? V.septims(r.left) : '\u2014' },
          { head: 'Standing', cell: r => { const x = Tax.STATES[r.state]; return `<span class="tag ${x.tag}">${esc(x.name)}</span>`; } },
          { head: '', cell: r => `<a class="btn ghost small" href="/taxes/${esc(r.id)}">Open</a>` }
        ], rows) : V.empty('Nothing on the roll matches that.')}</div>
      <p class="hint" style="margin-top:12px">${rows.length} ${rows.length === 1 ? 'assessment' : 'assessments'} shown.</p>
    </section>
  </div>

  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Laid upon the County</div><div class="v">${V.septims(sum.due)}</div><div class="n">septims, ${sum.count} ${sum.count === 1 ? 'assessment' : 'assessments'}</div></div>
        <div class="stat"><div class="k">Rendered</div><div class="v">${V.septims(sum.paid)}</div><div class="n">${sum.due ? Math.round((sum.paid / sum.due) * 100) : 0}% of what is due</div></div>
        <div class="stat"><div class="k">In arrears</div><div class="v">${V.septims(sum.arrears)}</div><div class="n">${sum.owing} ${sum.owing === 1 ? 'unpaid' : 'unpaid'}</div></div>
      </div>
    </section>

    ${mayEnter ? `<section class="card">
      <h3 style="margin-top:0">Lay a tax</h3>
      <form method="post" action="/taxes">${V.hidden(req.session.csrf)}
        <label for="who">Upon whom</label><input id="who" name="who" type="text" placeholder="Olav" required>
        <label for="kind">What tax</label><select id="kind" name="kind">
          ${Tax.KINDS.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}
        </select>
        <label for="due">Septims due</label><input id="due" name="due" type="number" min="1" step="1" required>
        <label for="where">Upon what, and where</label><input id="where" name="where" type="text" placeholder="Olav's Tap and Tack">
        <label for="period">For what period</label><input id="period" name="period" type="text" placeholder="Frostfall, 4E 226">
        <div class="btnrow"><button class="btn go" type="submit">Lay it</button></div>
      </form>
    </section>

    <details class="fold">
      <summary>Lay it on the whole roll</summary>
      <div class="inner">
        <p class="hint" style="margin:0 0 12px">Assesses every holding held by somebody \u2014 ${held} of them. One already
        assessed for that period is left alone, so running it twice doubles nobody.</p>
        <form method="post" action="/taxes/sweep">${V.hidden(req.session.csrf)}
          <label for="skind">What tax</label><select id="skind" name="kind">
            ${Tax.KINDS.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}
          </select>
          <label for="speriod">For what period</label><input id="speriod" name="period" type="text" placeholder="Frostfall, 4E 226" required>
          <label for="rate">Septims each</label><input id="rate" name="rate" type="number" min="0" step="1" placeholder="Empty = a quarter of the rent">
          <div class="btnrow"><button class="btn" type="submit">Lay it on the roll</button></div>
        </form>
      </div>
    </details>` : ''}
  </aside>
</div>`;

    res.page({ title: 'The tax roll', body, active: 'taxes', wide: true });
  });

  app.post('/taxes', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const r = Tax.assess(req.body, req.user);
      req.session.flash = { text: V.septims(r.due) + ' septims laid upon ' + r.who + ' as assessment no. ' + r.no + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/taxes');
  }));

  app.post('/taxes/sweep', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const made = Tax.assessFromRoll(req.body, req.user);
      const total = made.reduce((n, r) => n + r.due, 0);
      req.session.flash = { text: made.length + (made.length === 1 ? ' assessment' : ' assessments') + ' laid, ' + V.septims(total) + ' septims in all.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/taxes');
  }));

  app.get('/taxes/:id', need('treasread'), (req, res) => {
    const r = Tax.withState().find(x => x.id === req.params.id);
    if (!r) return res.say('No such assessment', 'Nothing on the tax roll answers to that.', 404);
    const paid = Tax.paidOn(r.id);
    const s = Tax.STATES[r.state];
    const mayEnter = O.can(req.user, 'treasenter');

    const body = `
<section class="card">
  <h2>Assessment no. ${r.no}</h2>
  <p class="lede">${esc(Tax.kindName(r.kind))} upon <b>${esc(r.who)}</b>${r.period ? ' · ' + esc(r.period) : ''}
  · <span class="tag ${s.tag}">${esc(s.name)}</span></p>
  <div class="rows">
    <div class="row"><div class="main">Upon what</div><div class="side">${esc(r.where || '—')}</div></div>
    <div class="row"><div class="main">Due</div><div class="side">${V.septims(r.due)} septims</div></div>
    <div class="row"><div class="main">Rendered</div><div class="side">${V.septims(r.paid)} septims</div></div>
    <div class="row"><div class="main">Still owing</div><div class="side"><b>${V.septims(r.left)} septims</b></div></div>
    <div class="row"><div class="main">Laid</div><div class="side">${esc(r.byName)} · ${esc(V.when(r.laid))}</div></div>
  </div>
  ${r.note ? `<p>${esc(r.note)}</p>` : ''}
  <p style="margin-top:14px"><a href="/taxes">Back to the roll</a></p>
</section>

${mayEnter && r.left > 0 ? `<section class="card">
  <h3 style="margin-top:0">Take payment</h3>
  <p class="lede">What you enter here goes into the Treasury the same moment, under <b>Taxes and levies</b>.</p>
  <form method="post" action="/taxes/${esc(r.id)}/render">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="amount">Septims rendered</label><input id="amount" name="amount" type="number" min="1" step="1" value="${r.left}" required></div>
      <div><label for="pnote">Note</label><input id="pnote" name="note" type="text" placeholder="Rendered in coin at the castle door"></div>
    </div>
    <div class="btnrow"><button class="btn go" type="submit">Take it</button></div>
  </form>
</section>` : ''}

${paid.length ? `<section class="card">
  <h3 style="margin-top:0">What has been rendered</h3>
  ${V.table([
      { head: 'When', cell: x => esc(V.when(x.at)) },
      { head: 'Septims', num: true, cell: x => V.septims(x.amount) },
      { head: 'Taken by', cell: x => esc(x.byName) },
      { head: 'Treasury', cell: x => x.treasuryNo ? 'no. ' + esc(x.treasuryNo) : '—' },
      { head: 'Note', cell: x => esc(x.note || '') }
    ], paid)}
</section>` : ''}

${mayEnter ? `<section class="card">
  <h3 style="margin-top:0">Amend it</h3>
  <form method="post" action="/taxes/${esc(r.id)}/amend">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="who">Upon whom</label><input id="who" name="who" type="text" value="${esc(r.who)}" required></div>
      <div><label for="due">Septims due</label><input id="due" name="due" type="number" min="1" step="1" value="${r.due}"></div>
      <div><label for="period">Period</label><input id="period" name="period" type="text" value="${esc(r.period || '')}"></div>
    </div>
    <label for="note">Note</label><input id="note" name="note" type="text" value="${esc(r.note || '')}">
    <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink)">
      <input type="checkbox" name="forgiven" value="1"${r.forgiven ? ' checked' : ''} style="width:auto">
      <b>Forgiven</b> — the County does not press it. It leaves the arrears and nothing is owed.
    </label>
    <div class="btnrow"><button class="btn" type="submit">Amend</button>
    <button class="btn danger" type="submit" formaction="/taxes/${esc(r.id)}/strike">Strike it from the roll</button></div>
  </form>
</section>` : ''}`;

    res.page({ title: 'Assessment no. ' + r.no, body, active: 'taxes' });
  });

  app.post('/taxes/:id/render', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const x = Tax.render(req.params.id, req.body, req.user);
      req.session.flash = { text: V.septims(x.amount) + ' septims rendered by ' + x.who + ', and entered into the Treasury.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/taxes/' + req.params.id);
  }));

  app.post('/taxes/:id/amend', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      Tax.amend(req.params.id, { ...req.body, forgiven: !!req.body.forgiven }, req.user);
      req.session.flash = { text: 'The assessment is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/taxes/' + req.params.id);
  }));

  app.post('/taxes/:id/strike', checkCsrf, need('treasenter'), wrap((req, res) => {
    Tax.strike(req.params.id);
    req.session.flash = { text: 'Struck from the tax roll. What was rendered stays in the Treasury.' };
    res.redirect('/taxes');
  }));
};
