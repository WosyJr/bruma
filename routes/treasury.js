const V = require('../lib/views');
const O = require('../lib/offices');
const T = require('../lib/treasury');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/treasury', need('treasread'), (req, res) => {
    const u = req.user;
    const way = String(req.query.way || '');
    const cat = String(req.query.cat || '');
    const month = String(req.query.month || '');
    const q = String(req.query.q || '');
    const filtered = T.filter({ way, cat, month, q });
    const rows = filtered.slice(0, 300);
    const run = T.running(T.ledger());
    const corrected = T.correctedIds();
    const sum = T.summary();
    const months = T.months().slice(0, 18);
    const cats = T.byCategory(month || '');
    const mayEnter = O.can(u, 'treasenter');

    const body = `
<section class="card">
  <h2>The Treasury</h2>
  <p class="lede">The purse of the County. Every septim in and out is written down, and nothing written is ever rubbed out
  — a mistake is put right by a correction standing against it.</p>
</section>

<div class="grid three">
  <div class="stat"><div class="k">In the treasury</div><div class="v">${V.septims(sum.balance)}</div><div class="n">septims</div></div>
  <div class="stat"><div class="k">In this month</div><div class="v">${V.septims(sum.monthIn)}</div><div class="n">received</div></div>
  <div class="stat"><div class="k">Out this month</div><div class="v">${V.septims(sum.monthOut)}</div><div class="n">paid out</div></div>
</div>

${mayEnter ? `<section class="card" style="margin-top:20px">
  <h3 style="margin-top:0">Enter money in or out</h3>
  <form method="post" action="/treasury/enter">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="way">Which way</label><select id="way" name="way" required>
        <option value="in">In — money received</option>
        <option value="out">Out — money paid</option>
      </select></div>
      <div><label for="amount">Septims</label><input id="amount" name="amount" type="number" min="1" step="1" required></div>
      <div><label for="cat">Against what head</label><select id="cat" name="cat">
        ${T.CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </select></div>
    </div>
    <div class="fields">
      <div><label for="party">From or to whom</label><input id="party" name="party" type="text" placeholder="The Miners Guild"></div>
      <div><label for="guild">Guild, if it is a guild matter</label><select id="guild" name="guild">
        <option value="">Not a guild matter</option>
        ${O.GUILDS.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
      </select></div>
    </div>
    <label for="reason">What it was for</label>
    <input id="reason" name="reason" type="text" placeholder="Tithe of the quarter, rendered in coin" required>
    <div class="btnrow"><button class="btn go" type="submit">Enter it in the ledger</button></div>
  </form>
</section>` : ''}

<section class="card">
  <h3 style="margin-top:0">The ledger</h3>
  <form method="get" action="/treasury" class="fields">
    <div><label for="fway">Which way</label><select id="fway" name="way">
      <option value="">Both ways</option>
      <option value="in"${way === 'in' ? ' selected' : ''}>In only</option>
      <option value="out"${way === 'out' ? ' selected' : ''}>Out only</option>
    </select></div>
    <div><label for="fcat">Head</label><select id="fcat" name="cat">
      <option value="">Every head</option>
      ${T.CATEGORIES.map(c => `<option value="${c.id}"${cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select></div>
    <div><label for="fmonth">Month</label><select id="fmonth" name="month">
      <option value="">Every month</option>
      ${months.map(m => `<option value="${m.key}"${month === m.key ? ' selected' : ''}>${esc(monthLabel(m.key))}</option>`).join('')}
    </select></div>
    <div><label for="fq">Search</label><input id="fq" name="q" type="text" value="${esc(q)}" placeholder="Name or reason"></div>
    <div style="display:flex;align-items:flex-end;gap:8px"><button class="btn ghost" type="submit" style="margin-bottom:0">Show</button>
    ${(way || cat || month || q) ? `<a class="btn ghost small" href="/treasury" style="margin-bottom:0">Clear</a>` : ''}</div>
  </form>

  ${rows.length ? V.table([
      { head: 'No.', num: true, cell: r => r.no },
      { head: 'When', cell: r => esc(V.when(r.at)) },
      { head: 'Way', cell: r => `<span class="tag ${r.way}">${r.way === 'in' ? 'in' : 'out'}</span>` },
      { head: 'Septims', num: true, cell: r => (r.way === 'out' ? '−' : '') + V.septims(r.amount) },
      { head: 'Head', cell: r => esc(T.catName(r.cat)) },
      { head: 'Whom', cell: r => esc(r.party || '—') },
      { head: 'For what', cell: r => esc(r.reason) + (r.correctionOf ? ' <span class="tag gold">correction</span>' : corrected.has(r.id) ? ' <span class="tag out">corrected</span>' : '') },
      { head: 'Entered by', cell: r => esc(r.byName || r.by) },
      { head: 'Balance', num: true, cell: r => V.septims(run.get(r.id) || 0) },
      { head: '', cell: r => (O.can(u, 'treascorrect') && !r.correctionOf && !corrected.has(r.id))
          ? `<a class="btn ghost small" href="/treasury/${esc(r.id)}/correct">Correct</a>` : '' }
    ], rows) : V.empty('Nothing in the ledger matches that.')}
  <p class="hint" style="margin-top:12px">${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}${filtered.length > rows.length ? ', the newest ' + rows.length + ' shown' : ''}.</p>
</section>

<div class="grid two">
  <section class="card">
    <h3 style="margin-top:0">By head${month ? ', ' + esc(monthLabel(month)) : ''}</h3>
    ${cats.length ? V.table([
        { head: 'Head', cell: r => esc(r.name) },
        { head: 'In', num: true, cell: r => r.in ? V.septims(r.in) : '—' },
        { head: 'Out', num: true, cell: r => r.out ? V.septims(r.out) : '—' },
        { head: 'Entries', num: true, cell: r => r.count }
      ], cats) : V.empty('Nothing entered yet.')}
  </section>

  <section class="card">
    <h3 style="margin-top:0">By month</h3>
    ${months.length ? V.table([
        { head: 'Month', cell: r => `<a href="/treasury?month=${esc(r.key)}">${esc(monthLabel(r.key))}</a>` },
        { head: 'In', num: true, cell: r => V.septims(r.in) },
        { head: 'Out', num: true, cell: r => V.septims(r.out) },
        { head: 'Net', num: true, cell: r => (r.in - r.out < 0 ? '−' : '') + V.septims(Math.abs(r.in - r.out)) }
      ], months) : V.empty('Nothing entered yet.')}
  </section>
</div>`;

    res.page({ title: 'The Treasury', body, active: 'treasury', wide: true });
  });

  app.post('/treasury/enter', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const row = T.enter(req.body, req.user);
      req.session.flash = { text: V.septims(row.amount) + ' septims entered ' + (row.way === 'in' ? 'in' : 'out') + ' as no. ' + row.no + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/treasury'));
  }));

  app.get('/treasury/:id/correct', need('treascorrect'), (req, res) => {
    const row = T.ledger().find(r => r.id === req.params.id);
    if (!row) return res.say('No such entry', 'Nothing in the ledger answers to that.', 404);
    const body = `
<section class="card">
  <h2>Correct entry no. ${row.no}</h2>
  <p class="lede">The entry stays where it is. A second entry of <b>${V.septims(row.amount)} septims
  ${row.way === 'in' ? 'out' : 'in'}</b> is written against it, and the two cancel.</p>
  <div class="rows">
    <div class="row"><div class="main">As entered</div><div class="side">${V.septims(row.amount)} septims ${esc(row.way)}</div></div>
    <div class="row"><div class="main">Against</div><div class="side">${esc(T.catName(row.cat))}</div></div>
    <div class="row"><div class="main">For</div><div class="side">${esc(row.reason)}</div></div>
    <div class="row"><div class="main">Entered by</div><div class="side">${esc(row.byName || row.by)} · ${esc(V.when(row.at))}</div></div>
  </div>
  <form method="post" action="/treasury/${esc(row.id)}/correct">${V.hidden(req.session.csrf)}
    <label for="reason">Why it is being put right</label>
    <input id="reason" name="reason" type="text" placeholder="Entered twice in error" required>
    <div class="btnrow"><button class="btn danger" type="submit">Write the correction</button>
    <a class="btn ghost" href="/treasury">Never mind</a></div>
  </form>
</section>`;
    res.page({ title: 'Correct an entry', body, active: 'treasury' });
  });

  app.post('/treasury/:id/correct', checkCsrf, need('treascorrect'), wrap((req, res) => {
    try {
      T.correct(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The correction is written. The ledger balances again.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/treasury');
  }));
};

function monthLabel(key) {
  const [y, m] = String(key || '').split('-');
  const i = Number(m) - 1;
  if (!V.MONTHS[i]) return key;
  return V.MONTHS[i] + ' ' + y;
}
