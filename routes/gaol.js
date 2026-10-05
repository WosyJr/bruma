const V = require('../lib/views');
const O = require('../lib/offices');
const G = require('../lib/gaol');
const Ct = require('../lib/court');
const Papers = require('../lib/papers');

const esc = V.esc;

function days(n) { return n + (n === 1 ? ' day' : ' days'); }

function card(r, u, csrf) {
  const held = !r.released;
  const over = held && r.dueIso && r.dueIso < new Date().toISOString().slice(0, 10);
  const mayOut = O.can(u, 'gaolrelease');
  const mayKeep = O.can(u, 'gaolcommit');
  const paper = Papers.forRef('gaol', r.id);
  return `<article class="card gaolcard${over ? ' over' : ''}">
  <div class="gaolhead">
    <span class="gno">No. ${r.no}</span>
    <span class="tag ${held ? (over ? 'out' : 'on') : ''}">${held ? (over ? 'Held past the day' : 'Held') : G.releaseName(r.releaseWhy)}</span>
    <span class="gdays">${days(G.daysHeld(r))}</span>
  </div>
  <h3 style="margin:4px 0 2px"><a href="/gaol/${esc(r.id)}">${esc(r.who)}</a></h3>
  <p class="hint" style="margin:0 0 10px">${esc(G.groundName(r.why))} · ${esc(G.placeName(r.place))}</p>
  <div class="rows tight">
    ${r.matterNo ? `<div class="row"><div class="main">Upon matter</div><div class="side"><a href="/court/${esc(r.matterId)}">no. ${esc(r.matterNo)}</a></div></div>` : ''}
    ${r.articles && r.articles.length ? `<div class="row"><div class="main">Charged under</div><div class="side">${
      r.articles.map(a => `<a href="/reckoner?a=${esc(a)}">Article ${esc(a)}</a>`).join(' · ')}</div></div>` : ''}
    ${r.term ? `<div class="row"><div class="main">Term</div><div class="side">${esc(r.term)}</div></div>` : ''}
    ${r.due ? `<div class="row"><div class="main">Comes up</div><div class="side">${esc(r.due)}</div></div>` : ''}
    <div class="row"><div class="main">Committed by</div><div class="side">${esc(r.committedByName)} · ${esc(V.when(r.committedAt))}</div></div>
    ${r.released ? `<div class="row"><div class="main">Released by</div><div class="side">${esc(r.releasedByName)} · ${esc(V.when(r.releasedAt))}</div></div>` : ''}
  </div>
  <div class="btnrow" style="margin-top:12px">
    ${paper ? `<a class="btn ghost small" href="/gaol/${esc(r.id)}/writ" target="_blank" rel="noopener">The writ to give out ↗</a>` : ''}
    <a class="btn ghost small" href="/gaol/${esc(r.id)}">The book</a>
    ${held && mayOut ? `<a class="btn small" href="/gaol/${esc(r.id)}#out">Release</a>` : ''}
  </div>
</article>`;
}

module.exports = function (app, { checkCsrf, wrap, back, need, needAny }) {

  app.get('/gaol', need('gaolsee'), (req, res) => {
    const u = req.user;
    const inside = G.held();
    const out = G.past().slice(0, 40);
    const s = G.summary();
    const mayKeep = O.can(u, 'gaolcommit');
    const matters = Ct.open();

    const body = `
<section class="card">
  <h2>The Gaol</h2>
  <p class="lede">Who the County holds, on what ground, and when they come up. Nobody is held here without a writ,
  and every writ says why. The book is kept by the Watch and answers to the Court.</p>
</section>

<div class="cols">
  <div>
    ${mayKeep ? `<details class="bigfold">
      <summary>Commit a person to the gaol</summary>
      <form method="post" action="/gaol">${V.hidden(req.session.csrf)}
        <div class="formgrid">
          <label class="f2"><span>Who is held</span>
            <input name="who" type="text" maxlength="120" required placeholder="A name"></label>
          <label><span>On what ground</span>
            <select name="why">${G.GROUNDS.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
          <label><span>Held where</span>
            <select name="place">${G.PLACES.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
          <label class="f2"><span>Upon which matter</span>
            <select name="matterId"><option value="">\u2014 none \u2014</option>${
              matters.map(m => `<option value="${esc(m.id)}">no. ${esc(m.no)} \u2014 ${esc(m.title)}</option>`).join('')}</select></label>
          <label class="f2"><span>Taken where, and by whom</span>
            <input name="taken" type="text" maxlength="160" placeholder="At the North Gate, by Guardsman Hjorm"></label>
          <label><span>Term, if one is set</span>
            <input name="term" type="text" maxlength="160" placeholder="Thirty days"></label>
          <label><span>Comes up on</span>
            <input name="due" type="text" maxlength="80" placeholder="The 12th of Sun\u2019s Dawn"></label>
          <label><span>And on what real day</span>
            <input name="dueIso" type="date"></label>
          <label class="f4"><span>Set down why they are held</span>
            <textarea name="account" rows="3" maxlength="4000" required></textarea></label>
        </div>
        <div class="btnrow"><button class="btn go" type="submit">Commit them</button></div>
      </form>
    </details>` : ''}
    <section class="card tight">
      <h3 style="margin:0 0 4px">Held now</h3>
      <p class="hint" style="margin:0">${inside.length ? inside.length + (inside.length === 1 ? ' person is held.' : ' people are held.') : 'Nobody is held. The cells are empty.'}</p>
    </section>
    ${inside.length ? `<div class="board">${inside.map(r => card(r, u, req.session.csrf)).join('')}</div>`
      : `<section class="card">${V.empty('Nobody is in the gaol.')}</section>`}

    <section class="card tight" style="margin-top:22px">
      <h3 style="margin:0">Let out</h3>
    </section>
    ${out.length ? `<div class="board">${out.map(r => card(r, u, req.session.csrf)).join('')}</div>`
      : `<section class="card">${V.empty('Nobody has been let out yet.')}</section>`}
  </div>

  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Held now</div><div class="v">${s.held}</div><div class="n">in the cells</div></div>
        <div class="stat"><div class="k">Awaiting the bench</div><div class="v">${s.awaiting}</div><div class="n">not yet heard</div></div>
        <div class="stat"><div class="k">Serving</div><div class="v">${s.serving}</div><div class="n">upon a sentence</div></div>
        <div class="stat"><div class="k">Longest held</div><div class="v">${s.longest}</div><div class="n">days</div></div>
      </div>
    </section>


    <section class="card">
      <h3 style="margin-top:0">How the gaol is kept</h3>
      <ul class="plain small">
        <li>Nobody is held without a ground entered in the book.</li>
        <li>Anyone held to await the bench is brought before it as soon as it sits.</li>
        <li>A writ of commitment is given to the person held, and may be checked at <a href="/verify">/verify</a>.</li>
        <li>The book is never rubbed out. A release is written after, not over.</li>
      </ul>
    </section>
  </aside>
</div>`;
    res.page({ title: 'The Gaol', body, active: 'gaol', wide: true });
  });

  app.post('/gaol', checkCsrf, need('gaolcommit'), wrap((req, res) => {
    try {
      const r = G.commit(req.body, req.user);
      req.session.flash = { text: r.who + ' is committed as no. ' + r.no + '. The writ is ready to give out.' };
      return res.redirect('/gaol/' + r.id);
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/gaol');
  }));

  app.get('/gaol/:id', need('gaolsee'), (req, res) => {
    const r = G.get(req.params.id);
    if (!r) return res.say('No such entry', 'Nothing in the gaol book answers to that.', 404);
    const u = req.user;
    const mayOut = O.can(u, 'gaolrelease');
    const mayKeep = O.can(u, 'gaolcommit');
    const paper = Papers.forRef('gaol', r.id);
    const outPaper = Papers.forRef('gaol', r.id + ':out');
    const held = !r.released;

    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:8px">The Gaol · entry no. ${r.no}</div>
  <h2 style="margin:0 0 4px">${esc(r.who)}</h2>
  <p class="lede" style="margin:0">${esc(G.groundName(r.why))} · ${esc(G.placeName(r.place))} · ${esc(days(G.daysHeld(r)))}</p>
  <div style="margin-top:12px"><span class="tag ${held ? 'on' : ''}">${held ? 'Held' : G.releaseName(r.releaseWhy)}</span></div>
</section>

<div class="cols">
  <div>
    <section class="card">
      <h3 style="margin-top:0">The ground of it</h3>
      <p style="white-space:pre-wrap;margin:0">${esc(r.account)}</p>
    </section>

    <section class="card">
      <h3 style="margin-top:0">The book</h3>
      <div class="rows">${r.log.slice().reverse().map(l => `<div class="row">
        <div class="main">${esc(l.text)}</div>
        <div class="side">${esc(l.by)}<br>${esc(V.when(l.at))}</div>
      </div>`).join('')}</div>
      ${mayKeep && held ? `<form method="post" action="/gaol/${esc(r.id)}/entry" style="margin-top:16px">${V.hidden(req.session.csrf)}
        <label for="text">Write into the book</label>
        <input id="text" name="text" type="text" maxlength="1000" placeholder="Fed and watered. Quiet all night." required>
        <div class="btnrow"><button class="btn ghost" type="submit">Enter it</button></div>
      </form>` : ''}
    </section>

    ${held && mayOut ? `<section class="card" id="out">
      <h3 style="margin-top:0">Release them</h3>
      <form method="post" action="/gaol/${esc(r.id)}/release">${V.hidden(req.session.csrf)}
        <label for="rwhy">Why they go</label>
        <select id="rwhy" name="why">${G.RELEASE.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
        <label for="rnote">What is written upon it</label>
        <textarea id="rnote" name="note" rows="3" maxlength="1000"></textarea>
        <div class="btnrow"><button class="btn go" type="submit">Let them out</button></div>
      </form>
    </section>` : ''}
  </div>

  <aside>
    <section class="card tight">
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        ${paper ? `<a class="btn" href="/gaol/${esc(r.id)}/writ" target="_blank" rel="noopener">The writ of commitment ↗</a>` : ''}
        ${outPaper ? `<a class="btn ghost" href="/gaol/${esc(r.id)}/warrant" target="_blank" rel="noopener">The warrant of release ↗</a>` : ''}
        <a class="btn ghost" href="/gaol">Back to the gaol</a>
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0">What is entered</h3>
      <div class="rows tight">
        <div class="row"><div class="main">Committed</div><div class="side">${esc(V.when(r.committedAt))}</div></div>
        <div class="row"><div class="main">By</div><div class="side">${esc(r.committedByName)}</div></div>
        ${r.taken ? `<div class="row"><div class="main">Taken</div><div class="side">${esc(r.taken)}</div></div>` : ''}
        ${r.term ? `<div class="row"><div class="main">Term</div><div class="side">${esc(r.term)}</div></div>` : ''}
        ${r.due ? `<div class="row"><div class="main">Comes up</div><div class="side">${esc(r.due)}</div></div>` : ''}
        ${r.matterNo ? `<div class="row"><div class="main">Matter</div><div class="side"><a href="/court/${esc(r.matterId)}">no. ${esc(r.matterNo)}</a></div></div>` : ''}
        ${paper ? `<div class="row"><div class="main">Check-number</div><div class="side"><a href="/verify?code=${esc(paper.code)}">${esc(paper.code)}</a></div></div>` : ''}
      </div>
    </section>

    ${r.articles && r.articles.length ? `<section class="card">
      <h3 style="margin-top:0">Charged under</h3>
      <ul class="plain">${r.articles.map(a => `<li><a href="/reckoner?a=${esc(a)}">Article ${esc(a)}</a></li>`).join('')}</ul>
    </section>` : ''}

    ${mayKeep && held ? `<section class="card">
      <h3 style="margin-top:0">Amend the entry</h3>
      <form method="post" action="/gaol/${esc(r.id)}/amend">${V.hidden(req.session.csrf)}
        <label for="aplace">Held where</label>
        <select id="aplace" name="place">${G.PLACES.map(p => `<option value="${p.id}"${p.id === r.place ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <label for="awhy">On what ground</label>
        <select id="awhy" name="why">${G.GROUNDS.map(g => `<option value="${g.id}"${g.id === r.why ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <label for="aterm">Term</label>
        <input id="aterm" name="term" type="text" maxlength="160" value="${esc(r.term)}">
        <label for="adue">Comes up</label>
        <input id="adue" name="due" type="text" maxlength="80" value="${esc(r.due)}">
        <label for="adueiso">On what real day</label>
        <input id="adueiso" name="dueIso" type="date" value="${esc(r.dueIso || '')}">
        <div class="btnrow"><button class="btn ghost" type="submit">Set it down</button></div>
      </form>
    </section>` : ''}
  </aside>
</div>`;
    res.page({ title: 'The Gaol · ' + r.who, body, active: 'gaol', wide: true });
  });

  app.post('/gaol/:id/amend', checkCsrf, need('gaolcommit'), wrap((req, res) => {
    try { G.amend(req.params.id, req.body, req.user); req.session.flash = { text: 'The entry is amended.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/gaol/' + req.params.id);
  }));

  app.post('/gaol/:id/entry', checkCsrf, need('gaolsee'), wrap((req, res) => {
    try { G.entry(req.params.id, req.body.text, req.user); req.session.flash = { text: 'Written into the book.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/gaol/' + req.params.id);
  }));

  app.post('/gaol/:id/release', checkCsrf, need('gaolrelease'), wrap((req, res) => {
    try {
      const r = G.release(req.params.id, req.body, req.user);
      req.session.flash = { text: r.who + ' is let out. ' + G.releaseName(r.releaseWhy) + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/gaol/' + req.params.id);
  }));

  app.get('/gaol/:id/writ', need('gaolsee'), (req, res) => {
    const r = G.get(req.params.id);
    if (!r) return res.say('No such entry', 'Nothing in the gaol book answers to that.', 404);
    const paper = Papers.forRef('gaol', r.id);
    if (!paper) return res.say('No writ', 'No writ was ever drawn upon that entry.', 404);

    const bodyHtml = [
      Papers.facts([
        ['On what ground', G.groundName(r.why)],
        ['Held at', G.placeName(r.place)],
        ['Taken', r.taken],
        ['Term', r.term],
        ['Comes up', r.due],
        r.matterNo ? ['Upon matter', 'No. ' + r.matterNo] : null,
        r.articles && r.articles.length ? ['Charged under', r.articles.map(a => 'Article ' + a).join(', ')] : null,
        ['Committed', new Date(r.committedAt).toISOString().slice(0, 10)]
      ].filter(Boolean)),
      Papers.part('The ground of this commitment', r.account),
      `<div class="warn"><p>This person is held by the County and is <b>not to be taken from the gaol</b>
      by any hand but that of an officer of Bruma.</p>
      <p>Anyone who aids, hides or carries off a person held under this writ answers for it before the court
      in their stead.</p></div>`,
      r.released ? Papers.part('Afterwards', G.releaseName(r.releaseWhy) + '. ' + (r.releaseNote || '')) : ''
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'commitment',
      title: 'Commitment of ' + r.who,
      sub: 'Entry no. ' + r.no + ' upon the gaol book of the County',
      lead: `By order of the County, <b>${Papers.esc(r.who)}</b> is taken into the keeping of Bruma and held
        at ${Papers.esc(G.placeName(r.place))}, ${Papers.esc(G.groundName(r.why).toLowerCase())}.`,
      body: bodyHtml,
      closing: r.released ? 'Spent.' : 'By order of the County.',
      motto: 'Hospitality to the stranger · Iron to the raider',
      signLine: 'Committed under the hand of',
      signedBy: r.committedByName,
      signedOf: 'For the County of Bruma',
      code: paper.code,
      back: '/gaol/' + r.id,
      fileName: 'commitment-' + r.who
    }));
  });

  app.get('/gaol/:id/warrant', need('gaolsee'), (req, res) => {
    const r = G.get(req.params.id);
    if (!r) return res.say('No such entry', 'Nothing in the gaol book answers to that.', 404);
    const paper = Papers.forRef('gaol', r.id + ':out');
    if (!paper) return res.say('No warrant', 'That person has not been released under warrant.', 404);

    const bodyHtml = [
      Papers.facts([
        ['Held from', new Date(r.committedAt).toISOString().slice(0, 10)],
        ['Let out', new Date(r.releasedAt).toISOString().slice(0, 10)],
        ['Days held', String(G.daysHeld(r))],
        ['Why released', G.releaseName(r.releaseWhy)],
        r.matterNo ? ['Upon matter', 'No. ' + r.matterNo] : null
      ].filter(Boolean)),
      Papers.part('What is written upon it', r.releaseNote),
      `<div class="warn"><p>This person has answered the County and is <b>free to go about</b>.
      No officer is to hold them again upon this ground.</p></div>`
    ].join('');

    res.type('html').send(Papers.doc({
      kind: 'release',
      title: 'Release of ' + r.who,
      sub: 'Upon entry no. ' + r.no + ' of the gaol book',
      lead: `<b>${Papers.esc(r.who)}</b> is released from the keeping of the County, having been held
        ${Papers.esc(days(G.daysHeld(r)))}.`,
      body: bodyHtml,
      closing: 'Let them go free.',
      motto: 'Hospitality to the stranger · Iron to the raider',
      signLine: 'Released under the hand of',
      signedBy: r.releasedByName,
      signedOf: 'For the County of Bruma',
      code: paper.code,
      back: '/gaol/' + r.id,
      fileName: 'release-' + r.who
    }));
  });
};
