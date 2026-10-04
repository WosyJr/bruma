const V = require('../lib/views');
const O = require('../lib/offices');
const P = require('../lib/petitions');
const Papers = require('../lib/papers');

const esc = V.esc;

function chip(p) {
  const s = P.STAGE_BY_ID[p.stage] || P.STAGES[0];
  return `<span class="tag ${s.tag}">${esc(s.name)}</span>`;
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/petitions', (req, res) => {
    const rows = P.answered().slice(0, 60);
    const s = P.summary();
    const code = String(req.query.code || '').trim();
    const mine = code ? P.byCode(code) : null;

    const track = code ? (mine ? `<section class="card">
  <div class="eyebrow" style="margin-bottom:8px">Petition no. ${mine.no} · ${esc(mine.code || code)}</div>
  <h3 style="margin:0 0 6px">${esc(mine.title)}</h3>
  <p class="lede" style="margin:0 0 12px">Laid by ${esc(mine.name)} on ${esc(V.when(mine.at))}.</p>
  <div style="margin-bottom:14px">${chip(mine)}</div>
  <p style="margin:0">${esc((P.STAGE_BY_ID[mine.stage] || P.STAGES[0]).say)}</p>
  ${mine.reply ? `<div class="replybox"><div class="eyebrow">The answer of the County</div>
    <p style="white-space:pre-wrap;margin:8px 0 0">${esc(mine.reply)}</p>
    <p class="hint" style="margin:10px 0 0">${esc(mine.repliedBy)} · ${esc(V.when(mine.repliedAt))}</p></div>` : ''}
  ${mine.matterNo ? `<p class="hint" style="margin-top:12px">It is before the court as matter no. ${esc(mine.matterNo)}. Judgments are posted among the <a href="/judgments">Judgments of the Court</a>.</p>` : ''}
</section>` : `<section class="card">
  <h3 style="margin-top:0">Nothing answers to ${esc(code)}</h3>
  <p class="lede" style="margin:0">Check the number on the paper you were given. If it is right as written, bring it
  to the Great Hall.</p>
</section>`) : '';

    const body = `
<section class="card">
  <h2>Petitions and their answers</h2>
  <p class="lede">What the County has been asked, and what it said back. Every petition is answered — granted,
  refused, or sent to the court — and the answer is posted here so that anyone may read it.</p>
  <div class="tiles" style="margin-top:18px">
    <div class="stat"><div class="k">Laid in all</div><div class="v">${s.total}</div><div class="n">petitions</div></div>
    <div class="stat"><div class="k">Answered</div><div class="v">${s.answered}</div><div class="n">of them</div></div>
    <div class="stat"><div class="k">Granted</div><div class="v">${s.granted}</div><div class="n">in whole or part</div></div>
    <div class="stat"><div class="k">Waiting</div><div class="v">${s.waiting}</div><div class="n">not yet read</div></div>
  </div>
  ${s.median !== null ? `<p class="hint" style="margin-top:14px">The County answers in ${s.median === 0 ? 'under a day' : s.median + (s.median === 1 ? ' day' : ' days')}, taking the middle of them.</p>` : ''}
</section>

<section class="card">
  <h3 style="margin-top:0">Follow your own petition</h3>
  <p class="lede">You were given a number when you laid it. Put it in here to see where it stands.</p>
  <form method="get" action="/petitions" class="checkform">
    <input type="search" name="code" value="${esc(code)}" placeholder="e.g. K6D-PQR" aria-label="Your number" maxlength="12" required>
    <button class="btn ghost" type="submit">Look it up</button>
  </form>
</section>

${track}

<section class="card">
  <h3 style="margin-top:0">Answered</h3>
  ${rows.length ? `<div class="rows">${rows.map(p => `<div class="row">
    <div class="main">
      <b style="font-family:var(--serif);font-size:18.5px">${esc(p.title)}</b>
      <div class="hint">${esc(P.askName(p.ask))} · laid by ${esc(p.name)}${p.where ? ' of ' + esc(p.where) : ''}</div>
      <div style="white-space:pre-wrap;margin-top:8px;color:var(--muted)">${esc(p.reply)}</div>
    </div>
    <div class="side">${chip(p)}<br>${esc(V.when(p.repliedAt || p.at))}</div>
  </div>`).join('')}</div>` : V.empty('The County has answered nothing yet.')}
</section>`;
    res.page({ title: 'Petitions', body, active: 'petitions', wide: true });
  });

  app.get('/petitions/manage', need('petsee'), (req, res) => {
    const u = req.user;
    const rows = P.all();
    const openRows = rows.filter(p => !P.CLOSED.has(p.stage));
    const done = rows.filter(p => P.CLOSED.has(p.stage)).slice(0, 40);
    const s = P.summary();
    const mayAnswer = O.can(u, 'petanswer');

    const card = p => `<article class="card petcard">
  <div class="gaolhead">
    <span class="gno">No. ${p.no}</span>${chip(p)}
    <span class="gdays">${esc(V.when(p.at))}</span>
  </div>
  <h3 style="margin:4px 0 2px">${esc(p.title)}</h3>
  <p class="hint" style="margin:0 0 10px">${esc(P.askName(p.ask))} · ${esc(p.name)}${p.where ? ' of ' + esc(p.where) : ''}${p.against ? ' · against ' + esc(p.against) : ''}</p>
  <p style="white-space:pre-wrap;margin:0 0 12px">${esc(p.about)}</p>
  ${p.reply ? `<div class="replybox"><div class="eyebrow">Answered</div>
    <p style="white-space:pre-wrap;margin:8px 0 0">${esc(p.reply)}</p>
    <p class="hint" style="margin:10px 0 0">${esc(p.repliedBy)} · ${esc(V.when(p.repliedAt))}</p></div>` : ''}
  ${p.code ? `<p class="hint" style="margin:10px 0 0">Their number: <a href="/petitions?code=${esc(p.code)}">${esc(p.code)}</a></p>` : ''}
  ${mayAnswer ? `<form method="post" action="/petitions/${esc(p.id)}" class="stack" style="margin-top:14px">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label>Standing</label><select name="stage">${P.STAGES.map(x =>
        `<option value="${x.id}"${x.id === p.stage ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div><label>Note to ourselves</label><input name="note" type="text" maxlength="1000" value="${esc(p.note)}"></div>
    </div>
    <label>The answer they will read</label>
    <textarea name="reply" rows="3" maxlength="8000">${esc(p.reply)}</textarea>
    <div class="btnrow"><button class="btn" type="submit">Answer it</button></div>
  </form>
  ${!p.matterId ? `<form method="post" action="/petitions/${esc(p.id)}/refer" class="inline">${V.hidden(req.session.csrf)}<button class="btn ghost small" type="submit">Send it to the court</button></form>` : `<p class="hint" style="margin:10px 0 0">Before the court as <a href="/court/${esc(p.matterId)}">matter no. ${esc(p.matterNo)}</a>.</p>`}
  ${p.reply ? `<a class="btn ghost small" href="/petitions/${esc(p.id)}/answer" target="_blank" rel="noopener">The answer to give out ↗</a>` : ''}` : ''}
</article>`;

    const body = `
<section class="card">
  <h2>Petitions laid before the County</h2>
  <p class="lede">Everything the people of Bruma have asked for. Read them, answer them, and the answer goes up on the
  public page where the petitioner — and everybody else — can see it.</p>
</section>

<div class="cols">
  <div>
    <section class="card tight"><h3 style="margin:0">Waiting on us</h3>
      <p class="hint" style="margin:4px 0 0">${openRows.length ? openRows.length + ' open.' : 'Nothing is waiting.'}</p></section>
    ${openRows.length ? `<div class="board one">${openRows.map(card).join('')}</div>` : `<section class="card">${V.empty('Nothing waits on the County.')}</section>`}
    <section class="card tight" style="margin-top:22px"><h3 style="margin:0">Closed</h3></section>
    ${done.length ? `<div class="board one">${done.map(card).join('')}</div>` : `<section class="card">${V.empty('Nothing closed yet.')}</section>`}
  </div>
  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Waiting to be read</div><div class="v">${s.waiting}</div><div class="n">petitions</div></div>
        <div class="stat"><div class="k">Open in all</div><div class="v">${s.open}</div><div class="n">not yet closed</div></div>
        <div class="stat"><div class="k">Granted</div><div class="v">${s.granted}</div><div class="n">so far</div></div>
        <div class="stat"><div class="k">Refused</div><div class="v">${s.refused}</div><div class="n">so far</div></div>
      </div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">How a petition runs</h3>
      <ol class="runs">
        ${P.STAGES.filter(x => x.id !== 'withdrawn').map(x => `<li><b>${esc(x.name)}</b><span>${esc(x.say)}</span></li>`).join('')}
      </ol>
      <p class="hint">The petitioner sees the standing and the answer, and nothing else. Notes to ourselves stay here.</p>
    </section>
    <section class="card tight">
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        <a class="btn ghost" href="/petitions">The public page</a>
        <a class="btn ghost" href="/petition">The form people fill in</a>
      </div>
    </section>
  </aside>
</div>`;
    res.page({ title: 'Petitions', body, active: 'petmanage', wide: true });
  });

  app.post('/petitions/:id', checkCsrf, need('petanswer'), wrap((req, res) => {
    try {
      const p = P.answer(req.params.id, req.body, req.user);
      req.session.flash = { text: 'Petition no. ' + p.no + ' is set down as ' + P.stageName(p.stage).toLowerCase() + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/petitions/manage'));
  }));

  app.post('/petitions/:id/refer', checkCsrf, need('petanswer'), wrap((req, res) => {
    try {
      const p = P.refer(req.params.id, req.user);
      req.session.flash = { text: 'Sent to the court as matter no. ' + p.matterNo + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/petitions/manage');
  }));

  app.get('/petitions/:id/answer', need('petsee'), (req, res) => {
    const p = P.get(req.params.id);
    if (!p) return res.say('No such petition', 'Nothing answers to that.', 404);
    if (!p.reply) return res.say('Not answered yet', 'That petition has no answer written upon it.', 404);
    const paper = Papers.forRef('petitions', p.id);

    const bodyHtml = [
      Papers.facts([
        ['Laid by', p.name],
        ['Of', p.where],
        ['What was asked', P.askName(p.ask)],
        ['Laid on', new Date(p.at).toISOString().slice(0, 10)],
        ['Standing', P.stageName(p.stage)],
        p.matterNo ? ['Before the court as', 'Matter no. ' + p.matterNo] : null
      ].filter(Boolean)),
      Papers.part('What was asked of the County', p.about),
      Papers.part('The answer of the County', p.reply)
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'petition',
      title: p.title,
      sub: 'Petition no. ' + p.no + ' · ' + P.stageName(p.stage),
      lead: `Upon the petition of <b>${Papers.esc(p.name)}</b>, laid before the County of Bruma, the County
        has considered the matter and answers as follows.`,
      body: bodyHtml,
      closing: p.stage === 'granted' ? 'Granted.' : p.stage === 'refused' ? 'Refused.' : 'Sent to the court.',
      motto: 'Hospitality to the stranger · Iron to the raider',
      signLine: 'Answered under the hand of',
      signedBy: p.repliedBy || 'The County of Bruma',
      signedOf: 'For the County of Bruma',
      code: paper ? paper.code : '',
      back: '/petitions/manage',
      fileName: 'petition-' + p.no + '-' + p.name
    }));
  });
};
