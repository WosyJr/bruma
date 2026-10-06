const V = require('../lib/views');
const O = require('../lib/offices');
const L = require('../lib/licences');
const Papers = require('../lib/papers');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/licences', need('licsee'), (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '');
    const rows = L.search(q);
    const s = L.summary();
    const byTrade = L.byTrade();
    const soon = L.expiring(21);
    const mayGrant = O.can(u, 'licgrant');
    const mayRevoke = O.can(u, 'licrevoke');
    const mayStrike = O.can(u, 'licstrike');

    const table = rows.length ? V.table([
      { head: 'No.', num: true, cell: r => `<a href="/licences/${esc(r.id)}">${r.no}</a>` },
      { head: 'Under the sign of', cell: r => esc(r.sign) || '<span class="dash">—</span>' },
      { head: 'Held by', cell: r => esc(r.holder) },
      { head: 'What is licensed', cell: r => esc(L.tradeName(r.trade)) },
      { head: 'Where', cell: r => esc(r.place) || '<span class="dash">—</span>' },
      { head: 'Runs until', cell: r => esc(r.until) || '<span class="dash">—</span>' },
      { head: 'Standing', cell: r => `<span class="tag ${(L.STATE_BY_ID[r.state] || {}).tag || ''}">${esc(L.stateName(r.state))}</span>` },
      { head: 'Fee', num: true, cell: r => V.septims(r.fee) },
      ...(mayRevoke || mayStrike ? [{ head: '', cell: r => `<div class="rowacts">${
        mayRevoke && r.state !== 'revoked'
          ? `<form method="post" action="/licences/${esc(r.id)}/state" class="inline">${V.hidden(req.session.csrf)}
              <input type="hidden" name="state" value="revoked">
              <input type="hidden" name="back" value="/licences${q ? '?q=' + encodeURIComponent(q) : ''}">
              <button class="btn ghost small" type="submit">Revoke</button></form>` : ''}${
        mayStrike ? `<a class="btn danger small" href="/licences/${esc(r.id)}#strike">Strike</a>` : ''}</div>` }] : [])
    ], rows) : V.empty(q ? 'No licence matches that.' : 'No licence has been granted yet.');

    const body = `
<section class="card">
  <h2>Licences to Trade</h2>
  <p class="lede">Nobody sells within the walls of Bruma without a licence of the County. The fee goes to the Treasury,
  the licence is written down here, and every licence carries a number any buyer may check.</p>
</section>

<div class="cols">
  <div>
    ${mayGrant ? `<details class="bigfold">
      <summary>Grant a licence to trade</summary>
      <form method="post" action="/licences">${V.hidden(req.session.csrf)}
        <div class="formgrid">
          <label class="f2"><span>Held by</span>
            <input name="holder" type="text" maxlength="120" required placeholder="Carmen Litte"></label>
          <label class="f2"><span>Under the sign of</span>
            <input name="sign" type="text" maxlength="120" placeholder="Novaroma"></label>
          <label class="f2"><span>What is licensed</span>
            <select name="trade">${L.TRADES.map(t =>
              `<option value="${t.id}">${esc(t.name)} \u2014 ${t.fee} septims</option>`).join('')}</select></label>
          <label class="f2"><span>Where</span>
            <input name="place" type="text" maxlength="140" placeholder="The Market, within the walls"></label>
          <label><span>Fee in septims</span>
            <input name="fee" type="number" min="0" step="10" value="150"></label>
          <label><span>Runs from</span>
            <input name="from" type="text" maxlength="80" placeholder="The 1st of Frostfall"></label>
          <label><span>Runs until</span>
            <input name="until" type="text" maxlength="80" placeholder="The 1st of Frostfall next"></label>
          <label><span>And on what real day</span>
            <input name="untilIso" type="date"></label>
          <label class="f4"><span>Upon what terms</span>
            <textarea name="terms" rows="2" maxlength="2000" placeholder="To keep the stall swept and to render honest weight."></textarea></label>
        </div>
        <div class="btnrow"><button class="btn go" type="submit">Grant it</button></div>
      </form>
    </details>` : ''}
    <section class="card">
      <h3 style="margin-top:0">The roll</h3>
      <form method="get" action="/licences" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <input type="text" name="q" value="${esc(q)}" placeholder="Name, sign, trade or place" style="max-width:320px">
        <button class="btn ghost" type="submit">Search</button>
        ${q ? '<a class="btn ghost small" href="/licences">Clear</a>' : ''}
      </form>
      <div class="tablewrap capped">${table}</div>
      <p class="hint" style="margin-top:12px">${rows.length} ${rows.length === 1 ? 'licence' : 'licences'}.</p>
    </section>

    <section class="card">
      <h3 style="margin-top:0">By trade</h3>
      ${byTrade.length ? V.table([
        { head: 'Trade', cell: r => esc(r.name) },
        { head: 'Granted', num: true, cell: r => r.count },
        { head: 'Current', num: true, cell: r => r.current },
        { head: 'Taken in fees', num: true, cell: r => V.septims(r.taken) }
      ], byTrade) : V.empty('Nothing granted yet.')}
    </section>
  </div>

  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Current</div><div class="v">${s.current}</div><div class="n">licences standing</div></div>
        <div class="stat"><div class="k">Lapsed</div><div class="v">${s.lapsed}</div><div class="n">need renewing</div></div>
        <div class="stat"><div class="k">Taken in fees</div><div class="v">${V.septims(s.taken)}</div><div class="n">septims, in all</div></div>
      </div>
    </section>

    ${soon.length ? `<section class="card">
      <h3 style="margin-top:0">Running out soon</h3>
      <div class="rows tight">${soon.map(l => `<div class="row">
        <div class="main"><a href="/licences/${esc(l.id)}">${esc(l.sign || l.holder)}</a></div>
        <div class="side">${esc(l.until || l.untilIso)}</div></div>`).join('')}</div>
    </section>` : ''}

  </aside>
</div>`;
    res.page({ title: 'Licences to Trade', body, active: 'licences', wide: true });
  });

  app.post('/licences', checkCsrf, need('licgrant'), wrap((req, res) => {
    try {
      const l = L.grant(req.body, req.user);
      req.session.flash = { text: 'Licence no. ' + l.no + ' granted to ' + l.holder + '. The fee is entered into the Treasury.' };
      return res.redirect('/licences/' + l.id);
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/licences');
  }));

  app.get('/licences/:id', need('licsee'), (req, res) => {
    const raw = L.get(req.params.id);
    if (!raw) return res.say('No such licence', 'Nothing on the roll answers to that.', 404);
    const l = { ...raw, state: L.stateOf(raw) };
    const u = req.user;
    const mayGrant = O.can(u, 'licgrant');
    const mayRevoke = O.can(u, 'licrevoke');
    const mayStrike = O.can(u, 'licstrike');
    const paper = Papers.forRef('licences', l.id);

    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:8px">Licence no. ${l.no}</div>
  <h2 style="margin:0 0 4px">${esc(l.sign || l.holder)}</h2>
  <p class="lede" style="margin:0">${esc(L.tradeName(l.trade))}${l.place ? ' · ' + esc(l.place) : ''}</p>
  <div style="margin-top:12px"><span class="tag ${(L.STATE_BY_ID[l.state] || {}).tag || ''}">${esc(L.stateName(l.state))}</span></div>
</section>

<div class="cols">
  <div>
    <section class="card">
      <h3 style="margin-top:0">What it says</h3>
      <div class="rows">
        <div class="row"><div class="main">Held by</div><div class="side">${esc(l.holder)}</div></div>
        <div class="row"><div class="main">What is licensed</div><div class="side">${esc(L.tradeName(l.trade))}</div></div>
        ${l.place ? `<div class="row"><div class="main">Where</div><div class="side">${esc(l.place)}</div></div>` : ''}
        ${l.from ? `<div class="row"><div class="main">Runs from</div><div class="side">${esc(l.from)}</div></div>` : ''}
        ${l.until ? `<div class="row"><div class="main">Runs until</div><div class="side">${esc(l.until)}</div></div>` : ''}
        <div class="row"><div class="main">Fee</div><div class="side">${V.septims(l.fee)} septims${l.treasuryNo ? ' · ledger no. ' + l.treasuryNo : ''}</div></div>
        <div class="row"><div class="main">Granted</div><div class="side">${esc(l.grantedByName)} · ${esc(V.when(l.grantedAt))}</div></div>
        ${paper ? `<div class="row"><div class="main">Check-number</div><div class="side"><a href="/verify?code=${esc(paper.code)}">${esc(paper.code)}</a></div></div>` : ''}
      </div>
      ${l.terms ? `<h3>Upon these terms</h3><p style="white-space:pre-wrap;margin:0">${esc(l.terms)}</p>` : ''}
      ${l.note ? `<p class="hint" style="margin-top:14px">${esc(l.note)}</p>` : ''}
    </section>

    ${l.renewals.length ? `<section class="card">
      <h3 style="margin-top:0">Renewed</h3>
      ${V.table([
        { head: 'When', cell: r => esc(V.when(r.at)) },
        { head: 'By', cell: r => esc(r.by) },
        { head: 'Runs until', cell: r => esc(r.until) || '—' },
        { head: 'Fee', num: true, cell: r => V.septims(r.fee) }
      ], l.renewals.slice().reverse())}
    </section>` : ''}
  </div>

  <aside>
    <section class="card tight">
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        ${paper ? `<a class="btn" href="/licences/${esc(l.id)}/paper" target="_blank" rel="noopener">The licence to give out ↗</a>` : ''}
        <a class="btn ghost" href="/licences">Back to the roll</a>
      </div>
    </section>

    ${mayGrant ? `<section class="card">
      <h3 style="margin-top:0">Renew it</h3>
      <form method="post" action="/licences/${esc(l.id)}/renew">${V.hidden(req.session.csrf)}
        <label for="runtil">Runs until</label>
        <input id="runtil" name="until" type="text" maxlength="80" value="${esc(l.until)}">
        <label for="runtiliso">And on what real day</label>
        <input id="runtiliso" name="untilIso" type="date" value="${esc(l.untilIso || '')}">
        <label for="rfee">Fee in septims</label>
        <input id="rfee" name="fee" type="number" min="0" step="10" value="${l.fee}">
        <div class="btnrow"><button class="btn" type="submit">Renew it</button></div>
      </form>
    </section>

    <section class="card">
      <h3 style="margin-top:0">Amend it</h3>
      <form method="post" action="/licences/${esc(l.id)}/amend">${V.hidden(req.session.csrf)}
        <label for="aholder">Held by</label>
        <input id="aholder" name="holder" type="text" maxlength="120" value="${esc(l.holder)}">
        <label for="asign">Under the sign of</label>
        <input id="asign" name="sign" type="text" maxlength="120" value="${esc(l.sign)}">
        <label for="atrade">What is licensed</label>
        <select id="atrade" name="trade">${L.TRADES.map(t =>
          `<option value="${t.id}"${t.id === l.trade ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        <label for="aplace">Where</label>
        <input id="aplace" name="place" type="text" maxlength="140" value="${esc(l.place)}">
        <label for="aterms">Upon what terms</label>
        <textarea id="aterms" name="terms" rows="3" maxlength="2000">${esc(l.terms)}</textarea>
        <div class="btnrow"><button class="btn ghost" type="submit">Set it down</button></div>
      </form>
    </section>` : ''}

    ${mayRevoke ? `<section class="card">
      <h3 style="margin-top:0">Stop it</h3>
      <form method="post" action="/licences/${esc(l.id)}/state">${V.hidden(req.session.csrf)}
        <label for="sstate">Set the standing to</label>
        <select id="sstate" name="state">${L.STATES.map(x =>
          `<option value="${x.id}"${x.id === l.state ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <label for="swhy">Why</label>
        <input id="swhy" name="why" type="text" maxlength="1000" placeholder="Short weight, twice found">
        <div class="btnrow"><button class="btn danger" type="submit">Set it</button></div>
      </form>
    </section>` : ''}

    ${mayStrike ? `<section class="card" id="strike">
      <h3 style="margin-top:0">Strike it from the roll</h3>
      <p class="hint" style="margin:0 0 12px">The licence leaves the roll altogether and its number stops answering
      at <b>/verify</b>. Fees already taken stay in the Treasury. This cannot be undone — to end a licence while
      keeping the record of it, revoke it above instead.</p>
      <form method="post" action="/licences/${esc(l.id)}/strike">${V.hidden(req.session.csrf)}
        <label for="kwhy">Why it is struck</label>
        <input id="kwhy" name="why" type="text" maxlength="300" placeholder="Entered twice in error">
        <label class="tick"><input type="checkbox" name="sure" value="1" required>
          <span>I mean to strike licence no. ${l.no} entirely <i>— ${esc(l.sign || l.holder)}</i></span></label>
        <div class="btnrow"><button class="btn danger" type="submit">Strike it</button></div>
      </form>
    </section>` : ''}
  </aside>
</div>`;
    res.page({ title: 'Licence no. ' + l.no, body, active: 'licences', wide: true });
  });

  app.post('/licences/:id/renew', checkCsrf, need('licgrant'), wrap((req, res) => {
    try { L.renew(req.params.id, req.body, req.user); req.session.flash = { text: 'The licence is renewed.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/licences/' + req.params.id);
  }));

  app.post('/licences/:id/amend', checkCsrf, need('licgrant'), wrap((req, res) => {
    try { L.amend(req.params.id, req.body, req.user); req.session.flash = { text: 'The licence is amended.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/licences/' + req.params.id);
  }));

  app.post('/licences/:id/state', checkCsrf, need('licrevoke'), wrap((req, res) => {
    try {
      const l = L.setState(req.params.id, req.body.state, req.body.why, req.user);
      req.session.flash = { text: 'Licence no. ' + l.no + ' is now ' + L.stateName(l.state).toLowerCase() + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/licences/' + req.params.id));
  }));

  app.post('/licences/:id/strike', checkCsrf, need('licstrike'), wrap((req, res) => {
    const l = L.get(req.params.id);
    if (!l) {
      req.session.flash = { err: true, text: 'No such licence.' };
      return res.redirect('/licences');
    }
    if (!req.body.sure) {
      req.session.flash = { err: true, text: 'Tick the box to strike a licence. Nothing was struck.' };
      return res.redirect('/licences/' + req.params.id);
    }
    L.strike(req.params.id);
    const why = String(req.body.why || '').trim().slice(0, 300);
    req.session.flash = { text: 'Licence no. ' + l.no + ' — ' + (l.sign || l.holder)
      + ' — is struck from the roll' + (why ? ': ' + why : '') + '.' };
    res.redirect('/licences');
  }));

  app.get('/licences/:id/paper', need('licsee'), (req, res) => {
    const raw = L.get(req.params.id);
    if (!raw) return res.say('No such licence', 'Nothing on the roll answers to that.', 404);
    const l = { ...raw, state: L.stateOf(raw) };
    const paper = Papers.forRef('licences', l.id);

    const bodyHtml = [
      Papers.three([
        ['What is licensed', L.tradeName(l.trade)],
        ['Where', l.place],
        ['Runs until', l.until || 'Until revoked']
      ]),
      Papers.facts([
        ['Held by', l.holder],
        ['Under the sign of', l.sign],
        ['Runs from', l.from],
        ['Fee rendered', V.septims(l.fee) + ' septims'],
        ['Granted', new Date(l.grantedAt).toISOString().slice(0, 10)],
        ['Standing today', L.stateName(l.state)]
      ]),
      Papers.part('Upon these terms', l.terms || 'To render honest weight, to keep the peace of the market, and to pay what is due to the County.'),
      `<div class="warn"><p>This licence may be <b>shown on demand</b> to any officer of the County.
      Trading without it, or after it has lapsed or been revoked, is answered for before the court.</p>
      <p>The County warrants nothing of the goods sold under it. A buyer with a complaint may lay a petition.</p></div>`
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'licence',
      title: l.sign || l.holder,
      sub: 'Licence no. ' + l.no + ' · ' + L.stateName(l.state),
      lead: `The County of Bruma licenses <b>${Papers.esc(l.holder)}</b> to carry on
        ${Papers.esc(L.tradeName(l.trade).toLowerCase())}${l.place ? ' at ' + Papers.esc(l.place) : ''} within
        the bounds of this County.`,
      body: bodyHtml,
      closing: l.state === 'current' ? 'Let them trade.' : L.stateName(l.state) + '.',
      motto: 'Honest weight · Honest coin',
      signLine: 'Granted under the hand of',
      signedBy: l.grantedByName,
      signedOf: 'For the County of Bruma',
      code: paper ? paper.code : '',
      back: '/licences/' + l.id,
      fileName: 'licence-' + (l.sign || l.holder)
    }));
  });
};
