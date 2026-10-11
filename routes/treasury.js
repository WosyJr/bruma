const V = require('../lib/views');
const O = require('../lib/offices');
const T = require('../lib/treasury');
const Du = require('../lib/dues');

const esc = V.esc;

function monthLabel(key) {
  const [y, m] = String(key || '').split('-');
  const i = Number(m) - 1;
  if (!V.MONTHS[i]) return key;
  return V.MONTHS[i] + ' ' + y;
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/treasury', need('treasread'), (req, res) => {
    const u = req.user;
    const way = String(req.query.way || '');
    const cat = String(req.query.cat || '');
    const month = String(req.query.month || '');
    const q = String(req.query.q || '');
    const acct = T.ACCT_BY_ID[req.query.acct] ? String(req.query.acct) : '';
    const filtered = T.filter({ way, cat, month, q, acct });
    const rows = filtered.slice(0, 300);
    const run = T.running(T.ledger(), acct);
    const owed = Du.all();
    const pend = owed.filter(r => r.state === 'pending');
    const dsum = Du.summary();
    const src = T.bySource();
    const mayReset = O.can(u, 'treascorrect');
    const corrected = T.correctedIds();
    const sum = T.summary();
    const months = T.months().slice(0, 18);
    const cats = T.byCategory(month || '');
    const mayEnter = O.can(u, 'treasenter');
    const filtering = !!(way || cat || month || q || acct);

    const ledger = rows.length ? V.table([
      { head: 'No.', num: true, cell: r => r.no },
      { head: 'When', cell: r => esc(V.when(r.at)) },
      { head: 'Way', cell: r => r.way === 'move' ? '<span class="tag on">moved</span>' : `<span class="tag ${r.way}">${r.way === 'in' ? 'in' : 'out'}</span>` },
      { head: 'Account', cell: r => r.way === 'move' ? esc(T.acctName(r.from)) + ' → ' + esc(T.acctName(r.to)) : esc(T.acctName(T.acctOf(r))) },
      { head: 'Septims', num: true, cell: r => (acct ? (T.effectOn(r, acct) < 0 ? '−' : '') : (r.way === 'out' ? '−' : '')) + V.septims(r.amount) },
      { head: 'Head', cell: r => esc(T.catName(r.cat)) },
      { head: 'Whom', cell: r => esc(r.party || '—') },
      { head: 'For what', cell: r => esc(r.reason)
          + (r.correctionOf ? ' <span class="tag gold">correction</span>' : corrected.has(r.id) ? ' <span class="tag out">corrected</span>' : '')
          + (r.matter ? ` <a href="/court/${esc(r.matter)}" class="tag">matter</a>` : '')
          + (r.tax ? ` <a href="/taxes/${esc(r.tax)}" class="tag">tax</a>` : '') },
      { head: 'Balance', num: true, cell: r => V.septims(run.get(r.id) || 0) },
      { head: '', cell: r => (O.can(u, 'treascorrect') && !r.correctionOf && !corrected.has(r.id))
          ? `<a class="btn ghost small" href="/treasury/${esc(r.id)}/correct">Correct</a>` : '' }
    ], rows) : V.empty('Nothing in the ledger matches that.');

    const body = `
<section class="card">
  <h2>The Treasury</h2>
  <p class="lede">The purse of the County. Every septim in and out is written down, and nothing written is ever
  rubbed out — a mistake is put right by a correction standing against it.</p>
</section>

<div class="cols">
  <div>
    <section class="card owedcard" id="owed">
      <div class="owedhead"><h3 style="margin:0">Owed to the County</h3>
      ${mayEnter ? `<form method="post" action="/treasury/reckon" class="inl">${V.hidden(req.session.csrf)}<button class="btn ghost small" type="submit">Reckon now</button></form>` : ''}</div>
      <p class="hint">Every Sundas the rent on each deed in force, any licence running out that week and every tax still owing are added here as pending. Nothing counts toward the balance until it is marked collected, and collected money goes into Checking. ${dsum.reckoned ? 'This week (from Sundas ' + esc(dsum.week) + ') is reckoned.' : 'This week is not reckoned yet.'}</p>
      ${pend.length ? `<div class="tablewrap"><table class="owedt"><thead><tr><th>No.</th><th>Week of</th><th>Kind</th><th>Whom</th><th>For what</th><th class="num">Septims</th><th></th></tr></thead><tbody>
        ${pend.map(r => `<tr class="${Du.overdue(r) ? 'overdue' : ''}"><td class="num">${r.no}</td><td>${esc(r.week)}${Du.overdue(r) ? ' <span class="tag out">overdue</span>' : ' <span class="tag gold">pending</span>'}</td><td>${esc(Du.KINDS[r.kind])}</td><td>${esc(r.party)}</td><td>${r.kind === 'deed' ? `<a href="/property/deeds/${esc(r.ref)}">${esc(r.what)}</a>` : r.kind === 'licence' ? `<a href="/licences/${esc(r.ref)}">${esc(r.what)}</a>` : `<a href="/taxes/${esc(r.ref)}">${esc(r.what)}</a>`}</td><td class="num">${V.septims(r.amount)}</td>
        <td>${mayEnter ? `<div class="owedacts"><form method="post" action="/treasury/owed/${esc(r.id)}/collect" class="inl">${V.hidden(req.session.csrf)}<button class="btn go small" type="submit">Collected</button></form>
          <details class="waive"><summary class="btn ghost small">Waive</summary><form method="post" action="/treasury/owed/${esc(r.id)}/waive" class="pform">${V.hidden(req.session.csrf)}<input name="reason" required maxlength="200" placeholder="Why" aria-label="Why it is waived"><button class="btn ghost small" type="submit">Waive it</button></form></details></div>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="hint" style="margin-top:10px">${pend.length} pending · ${V.septims(dsum.owed)} septims owed${dsum.overdue ? ` · <b>${dsum.overdue} overdue, ${V.septims(dsum.overdueSum)} septims</b>` : ''}.</p>` : V.empty('Nothing is owed. Everyone has paid up.')}
      ${owed.some(r => r.state !== 'pending') ? `<details class="settled"><summary>Settled lately</summary><ul class="plog">${owed.filter(r => r.state !== 'pending').slice(0, 25).map(r => `<li><span>${esc(V.when(r.settledAt))}</span><span><b>${esc(r.party)}</b> · ${esc(r.what)} · ${V.septims(r.amount)} · ${r.state === 'collected' ? 'collected' + (r.entryNo ? ', entry no. ' + r.entryNo : '') : 'waived: ' + esc(r.note || '')}${r.byName ? ' by ' + esc(r.byName) : ''}</span></li>`).join('')}</ul></details>` : ''}
    </section>

    <section class="card">
      <h3 style="margin-top:0">Where the money comes from</h3>
      <div class="tablewrap"><table class="srct"><thead><tr><th>Source</th><th class="num">This week</th><th class="num">This month</th><th class="num">All time</th><th class="num">Still owed</th><th class="num">Paid out</th></tr></thead><tbody>
        ${src.rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${V.septims(r.week)}</td><td class="num">${V.septims(r.month)}</td><td class="num">${V.septims(r.all)}</td><td class="num">${r.owed ? V.septims(r.owed) : '—'}</td><td class="num">${r.out ? V.septims(r.out) : '—'}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="num">${V.septims(src.total.week)}</td><td class="num">${V.septims(src.total.month)}</td><td class="num">${V.septims(src.total.all)}</td><td class="num">${V.septims(src.total.owed)}</td><td class="num">${V.septims(src.total.out)}</td></tr>
      </tbody></table></div>
      <p class="hint" style="margin-top:10px">Money received, by where it came from, after corrections. This week runs from Sundas ${esc(src.week)}. Exports and imports are their own heads when you enter them.</p>
    </section>

    <section class="card">
      <h3 style="margin-top:0">The ledger</h3>
      <form method="get" action="/treasury" class="fields">
        <div><label for="facct">Account</label><select id="facct" name="acct">
          <option value="">Both accounts</option>
          ${T.ACCOUNTS.map(a => `<option value="${a.id}"${acct === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}
        </select></div>
        <div><label for="fway">Which way</label><select id="fway" name="way">
          <option value="">Every way</option>
          <option value="in"${way === 'in' ? ' selected' : ''}>In only</option>
          <option value="out"${way === 'out' ? ' selected' : ''}>Out only</option>
          <option value="move"${way === 'move' ? ' selected' : ''}>Moved between accounts</option>
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
        ${filtering ? `<a class="btn ghost small" href="/treasury" style="margin-bottom:0">Clear</a>` : ''}</div>
      </form>
      <div class="tablewrap capped">${ledger}</div>
      <p class="hint" style="margin-top:12px">${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}${filtered.length > rows.length ? ', the newest ' + rows.length + ' shown' : ''}.</p>
    </section>

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
  </div>

  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Checking</div><div class="v">${V.septims(sum.checking)}</div><div class="n">the Coffers</div></div>
        <div class="stat"><div class="k">Savings</div><div class="v">${V.septims(sum.savings)}</div><div class="n">the Strongbox</div></div>
        <div class="stat"><div class="k">In the treasury</div><div class="v">${V.septims(sum.balance)}</div><div class="n">both accounts</div></div>
        <div class="stat"><div class="k">Owed to us</div><div class="v">${V.septims(dsum.owed)}</div><div class="n">${dsum.count} pending${dsum.overdue ? ', ' + dsum.overdue + ' overdue' : ''}</div></div>
        <div class="stat"><div class="k">In this month</div><div class="v">${V.septims(sum.monthIn)}</div><div class="n">received</div></div>
        <div class="stat"><div class="k">Out this month</div><div class="v">${V.septims(sum.monthOut)}</div><div class="n">paid out</div></div>
      </div>
    </section>

    ${mayEnter ? `<section class="card">
      <h3 style="margin-top:0">Enter money in or out</h3>
      <form method="post" action="/treasury/enter">${V.hidden(req.session.csrf)}
        <label for="way">Which way</label>
        <select id="way" name="way" required>
          <option value="in">In — money received</option>
          <option value="out">Out — money paid</option>
        </select>
        <label for="acct">Account</label>
        <select id="acct" name="acct">${T.ACCOUNTS.map(a => `<option value="${a.id}">${esc(a.name)} — ${esc(a.sub)}</option>`).join('')}</select>
        <label for="amount">Septims</label>
        <input id="amount" name="amount" type="number" min="1" step="1" required>
        <label for="cat">Against what head</label>
        <select id="cat" name="cat">
          ${T.CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
        <label for="party">From or to whom</label>
        <input id="party" name="party" type="text" placeholder="The Miners Guild">
        <label for="guild">Guild, if it is a guild matter</label>
        <select id="guild" name="guild">
          <option value="">Not a guild matter</option>
          ${O.GUILDS.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
        </select>
        <label for="reason">What it was for</label>
        <input id="reason" name="reason" type="text" placeholder="Tithe of the quarter, rendered in coin" required>
        <div class="btnrow"><button class="btn go" type="submit">Enter it</button></div>
      </form>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Move money</h3>
      <form method="post" action="/treasury/move">${V.hidden(req.session.csrf)}
        <label for="mfrom">From</label>
        <select id="mfrom" name="from">${T.ACCOUNTS.map(a => `<option value="${a.id}">${esc(a.name)} (${V.septims(T.balanceOf(a.id))})</option>`).join('')}</select>
        <label for="mto">To</label>
        <select id="mto" name="to">${T.ACCOUNTS.slice().reverse().map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>
        <label for="mamount">Septims</label>
        <input id="mamount" name="amount" type="number" min="1" step="1" required>
        <label for="mreason">Why <span class="hint">optional</span></label>
        <input id="mreason" name="reason" type="text" maxlength="300" placeholder="Put by for the winter">
        <div class="btnrow"><button class="btn go" type="submit">Move it</button></div>
      </form>
    </section>` : ''}
    ${mayReset ? `<details class="card resetcard"><summary>Reset the treasury</summary>
      <form method="post" action="/treasury/reset" class="stack" style="margin-top:12px">${V.hidden(req.session.csrf)}
        <label class="check"><input type="radio" name="scope" value="ledger" checked> <span><b>The ledger only</b>: every entry, and both accounts back to nothing. What is owed stays.</span></label>
        <label class="check"><input type="radio" name="scope" value="everything"> <span><b>Everything</b>: the ledger and everything owed. Deeds, licences and taxes themselves are not touched.</span></label>
        <label>Type RESET to confirm<input name="confirm" autocomplete="off" required></label>
        <button class="btn bad" type="submit">Reset</button>
        <p class="hint">Nothing is thrown away: the old files are kept beside the new ones in the data folder, named “before reset” with the date.</p>
      </form>
    </details>` : ''}
  </aside>
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

  app.post('/treasury/move', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const row = T.moveMoney(req.body || {}, req.user);
      req.session.flash = { text: V.septims(row.amount) + ' septims moved from ' + T.acctName(row.from) + ' to ' + T.acctName(row.to) + ' as no. ' + row.no + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/treasury');
  }));

  app.post('/treasury/reckon', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const r = Du.reckon(Date.now(), { force: true });
      req.session.flash = { text: r.added.length ? r.added.length + ' new ' + (r.added.length === 1 ? 'sum' : 'sums') + ' owed added, ' + V.septims(r.added.reduce((n, x) => n + x.amount, 0)) + ' septims.' : 'Nothing new is owed this week.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/treasury#owed');
  }));

  app.post('/treasury/owed/:id/:what', checkCsrf, need('treasenter'), wrap((req, res) => {
    try {
      const r = Du.settle(req.params.id, String(req.params.what), req.body || {}, req.user);
      req.session.flash = { text: r.state === 'collected' ? V.septims(r.amount) + ' septims from ' + r.party + ' collected into Checking.' : r.party + '’s ' + V.septims(r.amount) + ' is waived.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/treasury#owed');
  }));

  app.post('/treasury/reset', checkCsrf, need('treascorrect'), wrap((req, res) => {
    const b = req.body || {};
    if (String(b.confirm || '').trim().toUpperCase() !== 'RESET') { req.session.flash = { err: true, text: 'Type RESET to confirm.' }; return res.redirect('/treasury'); }
    const scope = b.scope === 'everything' ? 'everything' : 'ledger';
    T.reset(scope, req.user);
    req.session.flash = { text: scope === 'everything' ? 'The treasury is reset: the ledger, both accounts and everything owed. The old records are kept in the data folder.' : 'The ledger is reset and both accounts stand at nothing. What is owed is kept.' };
    res.redirect('/treasury');
  }));

  app.get('/treasury/:id/correct', need('treascorrect'), (req, res) => {
    const row = T.ledger().find(r => r.id === req.params.id);
    if (!row) return res.say('No such entry', 'Nothing in the ledger answers to that.', 404);
    const body = `
<section class="card" style="max-width:620px">
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
