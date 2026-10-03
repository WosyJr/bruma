const V = require('../lib/views');
const O = require('../lib/offices');
const Ct = require('../lib/court');
const Lex = require('../lib/lexindex');
const T = require('../lib/treasury');

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
    ${O.can(u, 'courtsit') ? `<label for="articles">Charge it under the Lex Brumae, if it is a crime</label>
    <select id="articles" name="articles" multiple size="6">
      ${Lex.all().map(a => `<option value="${esc(a.no)}">Article ${esc(a.no)} \u00b7 ${esc(a.name)}</option>`).join('')}
    </select>
    <p class="hint">Hold Ctrl (or Cmd) to pick more than one. It can be charged later.</p>` : ''}
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
      { head: 'Under', cell: m => (m.articles || []).length ? m.articles.map(a => `<span class="tag">Art. ${esc(a)}</span>`).join(' ') : '\u2014' },
      { head: 'Fine', num: true, cell: m => m.fine ? V.septims(m.fine) : '\u2014' },
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
    const fines = T.forMatter(m.id);
    const suggest = [];
    (m.articles || []).forEach(no => {
      const a = Lex.get(no);
      if (!a) return;
      a.bands.forEach(b => {
        if (!b.fine) return;
        const name = (Lex.BAND_BY_ID[b.band] || {}).name || 'Penalty';
        if (!suggest.some(x => x.name === name)) suggest.push({ name, fine: Lex.fineText(b.fine) });
      });
      if (!a.bands.length && a.fine) suggest.push({ name: 'Set', fine: Lex.fineText(a.fine) });
    });

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

${fines.length ? `<section class="card">
  <h3 style="margin-top:0">Into the Treasury</h3>
  ${V.table([
      { head: 'Entry', num: true, cell: r => 'no. ' + r.no },
      { head: 'When', cell: r => esc(V.when(r.at)) },
      { head: 'Septims', num: true, cell: r => V.septims(r.amount) },
      { head: 'From', cell: r => esc(r.party || '') },
      { head: 'Head', cell: r => esc(T.catName(r.cat)) }
    ], fines)}
</section>` : ''}

${m.judgment ? `<section class="card">
  <h3 style="margin-top:0">Judgment</h3>
  <div style="white-space:pre-wrap;line-height:1.7">${esc(m.judgment)}</div>
  ${(m.band || m.fine || m.term) ? `<div class="rows" style="margin-top:16px">
    ${m.band ? `<div class="row"><div class="main">Band</div><div class="side"><span class="tag ${(Lex.BAND_BY_ID[m.band] || {}).tag || ''}">${esc((Lex.BAND_BY_ID[m.band] || {}).name || m.band)}</span></div></div>` : ''}
    ${m.fine ? `<div class="row"><div class="main">Fine</div><div class="side">${V.septims(m.fine)} septims${m.treasuryNo ? ' \u00b7 Treasury no. ' + esc(m.treasuryNo) : ''}</div></div>` : ''}
    ${m.term ? `<div class="row"><div class="main">Sentence</div><div class="side">${esc(m.term)}</div></div>` : ''}
  </div>` : ''}
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

${(m.articles || []).length ? `<section class="card">
  <h3 style="margin-top:0">Charged under the Lex Brumae</h3>
  ${m.articles.map(no => {
    const a = Lex.get(no);
    if (!a) return `<p class="lexprose">Article ${esc(no)} \u2014 no longer in the code.</p>`;
    return `<article class="lexart">
      <div class="lexhead">
        <span class="lexno">Article ${esc(a.no)}</span>
        <h4>${esc(a.name)}</h4>
        <a class="lexlink" style="opacity:1" href="/laws/${esc(a.docId)}#art-${esc(a.no)}" title="Read it in the code">&#167;</a>
      </div>
      ${a.definition ? `<div class="lexfield"><div class="lexlabel">Definition</div><p>${esc(a.definition)}</p></div>` : ''}
      ${a.bands.length
        ? `<div class="lexfield"><div class="lexlabel">Penalty by band</div><div class="lextiers">${a.bands.map(b => `<div class="lextier"${m.band === b.band ? ' style="border-color:var(--accent);background:#241A10"' : ''}>
            <span class="tag ${Lex.BAND_BY_ID[b.band] ? Lex.BAND_BY_ID[b.band].tag : ''}">${esc(Lex.BAND_BY_ID[b.band] ? Lex.BAND_BY_ID[b.band].name : 'Penalty')}</span>
            <span>${esc(b.text)}${b.fine ? ` <b style="color:var(--eyebrow)">(${esc(Lex.fineText(b.fine))} septims)</b>` : ''}</span>
          </div>`).join('')}</div></div>`
        : a.penalty ? `<div class="lexfield"><div class="lexlabel">Penalty</div><p>${esc(a.penalty)}</p></div>` : ''}
    </article>`;
  }).join('')}
</section>` : ''}

${maySit ? `<section class="card">
  <h3 style="margin-top:0">Charge it under the law</h3>
  <form method="post" action="/court/${esc(m.id)}/charge">${V.hidden(req.session.csrf)}
    <label for="articles">Articles of the Lex Brumae</label>
    <select id="articles" name="articles" multiple size="8">
      ${Lex.all().map(a => `<option value="${esc(a.no)}"${(m.articles || []).includes(a.no) ? ' selected' : ''}>Article ${esc(a.no)} \u00b7 ${esc(a.name)}</option>`).join('')}
    </select>
    <p class="hint">Hold Ctrl (or Cmd) to pick more than one. Clearing them all drops the charge.</p>
    <div class="btnrow"><button class="btn" type="submit">Charge it</button>
    <a class="btn ghost" href="/reckoner">The penalty reckoner</a></div>
  </form>
</section>

<section class="card">
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
    <div class="fields">
      <div><label for="stage">How the matter stands</label>
        <select id="stage" name="stage">
          ${Ct.STAGES.map(x => `<option value="${x.id}"${m.stage === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
        </select></div>
      <div><label for="band">Band of the offence</label>
        <select id="band" name="band">
          <option value="">No band</option>
          ${Lex.BANDS.map(x => `<option value="${x.id}"${m.band === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
        </select></div>
      <div><label for="fine">Fine in septims</label>
        <input id="fine" name="fine" type="number" min="0" step="1" value="${Number(m.fine) || ''}" placeholder="0"></div>
    </div>
    ${suggest.length ? `<p class="hint">The code suggests: ${suggest.map(x => `<b>${esc(x.name)}</b> ${esc(x.fine)}`).join(' \u00b7 ')} septims. The bench may depart from it, and should say why.</p>` : ''}
    <label for="term">Term, labour or other sentence</label>
    <input id="term" name="term" type="text" value="${esc(m.term || '')}" placeholder="Thirty days in the gaol, and the horse restored">
    <label for="judgment">The judgment of the court</label>
    <textarea id="judgment" name="judgment" placeholder="The court finds for the complainant...">${esc(m.judgment || '')}</textarea>
    <p class="hint">A fine entered here is written into the Treasury against this matter the moment the judgment is given.</p>
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

  app.post('/court/:id/charge', checkCsrf, need('courtsit'), wrap((req, res) => {
    try {
      const m = Ct.charge(req.params.id, { articles: req.body.articles }, req.user);
      req.session.flash = { text: (m.articles || []).length
        ? 'Charged under ' + m.articles.map(a => 'Article ' + a).join(', ') + '.'
        : 'The charge is dropped. No article stands against this matter.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/court/' + req.params.id);
  }));

  app.post('/court/:id/judge', checkCsrf, need('courtsit'), wrap((req, res) => {
    try {
      const m = Ct.judge(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The court has spoken.' + (m.fine ? ' A fine of ' + V.septims(m.fine) + ' septims is entered into the Treasury.' : '') };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/court/' + req.params.id);
  }));
};
