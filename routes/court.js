const V = require('../lib/views');
const O = require('../lib/offices');
const Ct = require('../lib/court');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, needAny, need }) {

  app.get('/court', needAny('courtsee', 'courtfile'), (req, res) => {
    const u = req.user;
    const seeAll = O.can(u, 'courtsee');
    const rows = seeAll ? Ct.all() : Ct.mine(u.username);
    const open = rows.filter(m => m.stage !== 'judged' && m.stage !== 'withdrawn' && m.stage !== 'struck');
    const closed = rows.filter(m => m.stage === 'judged' || m.stage === 'withdrawn' || m.stage === 'struck');

    const body = `
<section class="card">
  <h2>The Court of the County</h2>
  <p class="lede">${seeAll
      ? 'Matters laid before the County, the hearings set upon them, and the judgments given.'
      : 'The matters you have laid before the County, and what has come of them.'}</p>
</section>

${O.can(u, 'courtfile') ? `<section class="card">
  <h3 style="margin-top:0">Lay a matter before the court</h3>
  <form method="post" action="/court/lay">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="title">What the matter is called</label><input id="title" name="title" type="text" placeholder="Theft of a mare from the north stable" required></div>
      <div><label for="kind">Kind</label><select id="kind" name="kind">
        ${Ct.KINDS.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}
      </select></div>
    </div>
    <div class="fields">
      <div><label for="complainant">Who complains</label><input id="complainant" name="complainant" type="text" value="${esc(u.name)}"></div>
      <div><label for="respondent">Against whom</label><input id="respondent" name="respondent" type="text"></div>
    </div>
    <label for="account">Set down what happened</label>
    <textarea id="account" name="account" placeholder="On the night of the sixth, the stable door was found open..." required></textarea>
    <div class="btnrow"><button class="btn go" type="submit">Lay it before the court</button></div>
  </form>
</section>` : ''}

<section class="card">
  <h3 style="margin-top:0">Before the court</h3>
  ${open.length ? V.table([
      { head: 'No.', num: true, cell: m => m.no },
      { head: 'Matter', cell: m => `<a href="/court/${esc(m.id)}">${esc(m.title)}</a>` },
      { head: 'Kind', cell: m => esc(Ct.kindName(m.kind)) },
      { head: 'Complains', cell: m => esc(m.complainant) },
      { head: 'Against', cell: m => esc(m.respondent || '—') },
      { head: 'Standing', cell: m => { const s = Ct.STAGE_BY_ID[m.stage] || Ct.STAGES[0]; return `<span class="tag ${s.tag}">${esc(s.name)}</span>`; } },
      { head: 'Hearing', cell: m => esc(m.hearing || '—') }
    ], open) : V.empty('Nothing waits upon the court.')}
</section>

${closed.length ? `<section class="card">
  <h3 style="margin-top:0">Closed matters</h3>
  ${V.table([
      { head: 'No.', num: true, cell: m => m.no },
      { head: 'Matter', cell: m => `<a href="/court/${esc(m.id)}">${esc(m.title)}</a>` },
      { head: 'Kind', cell: m => esc(Ct.kindName(m.kind)) },
      { head: 'Standing', cell: m => { const s = Ct.STAGE_BY_ID[m.stage] || Ct.STAGES[0]; return `<span class="tag ${s.tag}">${esc(s.name)}</span>`; } },
      { head: 'Judged by', cell: m => esc(m.judgedBy || '') },
      { head: 'When', cell: m => esc(V.when(m.judgedAt || m.at)) }
    ], closed.slice(0, 60))}
</section>` : ''}`;

    res.page({ title: 'The Court', body, active: 'court', wide: true });
  });

  app.post('/court/lay', checkCsrf, need('courtfile'), wrap((req, res) => {
    try {
      const m = Ct.lay(req.body, req.user);
      req.session.flash = { text: 'Laid before the court as matter no. ' + m.no + '.' };
      res.redirect('/court/' + m.id);
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/court');
    }
  }));

  app.get('/court/:id', needAny('courtsee', 'courtfile'), (req, res) => {
    const u = req.user;
    const m = Ct.get(req.params.id);
    if (!m) return res.say('No such matter', 'Nothing on the court roll answers to that.', 404);
    if (!O.can(u, 'courtsee') && m.laidBy !== u.username) {
      return res.say('That door is not yours to open', 'Only the court and the one who laid it may read this matter.', 403);
    }
    const s = Ct.STAGE_BY_ID[m.stage] || Ct.STAGES[0];
    const maySit = O.can(u, 'courtsit');

    const body = `
<section class="card">
  <h2>Matter no. ${m.no}</h2>
  <p class="lede">${esc(m.title)} · ${esc(Ct.kindName(m.kind))} · <span class="tag ${s.tag}">${esc(s.name)}</span></p>
  <div class="rows">
    <div class="row"><div class="main">Who complains</div><div class="side">${esc(m.complainant)}</div></div>
    <div class="row"><div class="main">Against whom</div><div class="side">${esc(m.respondent || '—')}</div></div>
    <div class="row"><div class="main">Laid</div><div class="side">${esc(m.laidByName)} · ${esc(V.when(m.at))}</div></div>
    ${m.hearing ? `<div class="row"><div class="main">Hearing set</div><div class="side">${esc(m.hearing)}</div></div>` : ''}
  </div>
  <h3>The account laid</h3>
  <div style="white-space:pre-wrap;line-height:1.7">${esc(m.account)}</div>
  <p style="margin-top:16px"><a href="/court">Back to the court roll</a></p>
</section>

${m.judgment ? `<section class="card">
  <h3 style="margin-top:0">Judgment</h3>
  <div style="white-space:pre-wrap;line-height:1.7">${esc(m.judgment)}</div>
  <p class="hint" style="margin-top:12px">Given by ${esc(m.judgedBy || '')} on ${esc(V.when(m.judgedAt))}.</p>
</section>` : ''}

<section class="card">
  <h3 style="margin-top:0">Papers upon the matter</h3>
  ${m.papers.length ? `<div class="rows">${m.papers.slice().reverse().map(p => `<div class="row">
    <div class="main"><b>${esc(p.kind)}</b><div style="white-space:pre-wrap;margin-top:3px">${esc(p.text)}</div></div>
    <div class="side">${esc(p.byName)}<br>${esc(V.when(p.at))}</div>
  </div>`).join('')}</div>` : V.empty('No papers have been entered upon it.')}

  <h3>Enter a paper</h3>
  <form method="post" action="/court/${esc(m.id)}/paper">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="kind">What it is</label><input id="kind" name="kind" type="text" placeholder="Statement, evidence, answer" value="Paper"></div>
    </div>
    <label for="text">What it says</label>
    <textarea id="text" name="text" required></textarea>
    <div class="btnrow"><button class="btn" type="submit">Enter it</button></div>
  </form>
</section>

${maySit ? `<section class="card">
  <h3 style="margin-top:0">Set a hearing</h3>
  <form method="post" action="/court/${esc(m.id)}/hearing">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="hearing">When it is to be heard</label><input id="hearing" name="hearing" type="text" value="${esc(m.hearing || '')}" placeholder="Fredas, the 12th of Frostfall, at noon"></div>
    </div>
    <label for="hnote">Note</label><input id="hnote" name="note" type="text" placeholder="Both parties to attend in the Great Hall">
    <div class="btnrow"><button class="btn" type="submit">Set it</button></div>
  </form>

  <h3>Give judgment</h3>
  <form method="post" action="/court/${esc(m.id)}/judge">${V.hidden(req.session.csrf)}
    <label for="stage">How the matter stands</label>
    <select id="stage" name="stage">
      ${Ct.STAGES.map(x => `<option value="${x.id}"${m.stage === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
    </select>
    <label for="judgment">The judgment of the court</label>
    <textarea id="judgment" name="judgment" placeholder="The court finds for the complainant...">${esc(m.judgment || '')}</textarea>
    <div class="btnrow"><button class="btn go" type="submit">Give it</button></div>
  </form>
</section>` : ''}`;

    res.page({ title: 'Matter no. ' + m.no, body, active: 'court' });
  });

  app.post('/court/:id/paper', checkCsrf, needAny('courtsee', 'courtfile'), wrap((req, res) => {
    const m = Ct.get(req.params.id);
    if (!m) return res.say('No such matter', 'Nothing on the court roll answers to that.', 404);
    if (!O.can(req.user, 'courtsee') && m.laidBy !== req.user.username) return res.say('That door is not yours to open', 'You may not enter papers upon that matter.', 403);
    try {
      Ct.addPaper(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The paper is entered upon the matter.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/court/' + req.params.id);
  }));

  app.post('/court/:id/hearing', checkCsrf, need('courtsit'), wrap((req, res) => {
    try {
      Ct.setHearing(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The hearing is set.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/court/' + req.params.id);
  }));

  app.post('/court/:id/judge', checkCsrf, need('courtsit'), wrap((req, res) => {
    try {
      Ct.judge(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The court has spoken.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/court/' + req.params.id);
  }));
};
