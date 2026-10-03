const V = require('../lib/views');
const O = require('../lib/offices');
const A = require('../lib/archive');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/archive', need('archread'), (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '');
    const shelf = String(req.query.shelf || '');
    const rows = A.search(q, shelf);
    const counts = A.counts();
    const mayWrite = O.can(u, 'archwrite');

    const body = `
<section class="card">
  <h2>The Archive</h2>
  <p class="lede">Every charter, law, deed, order and dispatch the County has set down. Kept here, and searchable.</p>
  <form method="get" action="/archive" class="fields">
    <div><label for="q">Search</label><input id="q" name="q" type="text" value="${esc(q)}" placeholder="Title, date or anything written in it"></div>
    <div><label for="shelf">Shelf</label><select id="shelf" name="shelf">
      <option value="">Every shelf</option>
      ${A.SHELVES.map(s => `<option value="${s.id}"${shelf === s.id ? ' selected' : ''}>${esc(s.name)} (${counts[s.id] || 0})</option>`).join('')}
    </select></div>
    <div style="display:flex;align-items:flex-end;gap:8px"><button class="btn ghost" type="submit" style="margin-bottom:0">Search</button>
    ${(q || shelf) ? `<a class="btn ghost small" href="/archive" style="margin-bottom:0">Clear</a>` : ''}</div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">${q || shelf ? rows.length + (rows.length === 1 ? ' document' : ' documents') + ' found' : 'The shelves'}</h3>
  ${rows.length ? `<div class="rows">${rows.slice(0, 200).map(d => `<div class="row">
    <div class="main">
      <a href="/archive/${esc(d.id)}"><b>${esc(d.title)}</b></a>
      <div class="hint">${esc(A.shelfName(d.shelf))}${d.dated ? ' · ' + esc(d.dated) : ''}${d.note ? ' · ' + esc(d.note) : ''}</div>
    </div>
    <div class="side">no. ${d.no}<br>${esc(V.when(d.at))}</div>
  </div>`).join('')}</div>` : V.empty(q || shelf ? 'Nothing on the shelves matches that.' : 'The archive is empty. Nothing has been laid into it yet.')}
</section>

${mayWrite ? `<section class="card">
  <h3 style="margin-top:0">Lay a document into the archive</h3>
  <form method="post" action="/archive/lay">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="title">Title</label><input id="title" name="title" type="text" placeholder="Charter of the Miners Guild" required></div>
      <div><label for="nshelf">Shelf</label><select id="nshelf" name="shelf">
        ${A.SHELVES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
      </select></div>
      <div><label for="dated">Dated</label><input id="dated" name="dated" type="text" placeholder="3rd of Frostfall, 4E 226"></div>
    </div>
    <label for="text">The document itself</label>
    <textarea id="text" name="text" style="min-height:200px" placeholder="Paste or write the whole document here."></textarea>
    <div class="fields">
      <div><label for="link">Or a link to where it lives</label><input id="link" name="link" type="text" placeholder="https://docs.google.com/..."></div>
      <div><label for="note">Note</label><input id="note" name="note" type="text" placeholder="The original is in the Steward’s chest"></div>
    </div>
    <div class="btnrow"><button class="btn go" type="submit">Lay it in</button></div>
  </form>
</section>` : ''}`;

    res.page({ title: 'The Archive', body, active: 'archive' });
  });

  app.post('/archive/lay', checkCsrf, need('archwrite'), wrap((req, res) => {
    try {
      const d = A.lay(req.body, req.user);
      req.session.flash = { text: d.title + ' is laid into the archive as no. ' + d.no + '.' };
      res.redirect('/archive/' + d.id);
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/archive');
    }
  }));

  app.get('/archive/:id', need('archread'), (req, res) => {
    const d = A.get(req.params.id);
    if (!d || d.struck) return res.say('No such document', 'Nothing on the shelves answers to that.', 404);
    const u = req.user;

    const body = `
<section class="card">
  <h2>${esc(d.title)}</h2>
  <p class="lede">No. ${d.no} · ${esc(A.shelfName(d.shelf))}${d.dated ? ' · ' + esc(d.dated) : ''}</p>
  ${d.note ? `<p>${esc(d.note)}</p>` : ''}
  ${d.link ? `<p><a class="btn ghost small" href="${esc(d.link)}" rel="noopener noreferrer" target="_blank">Open where it lives</a></p>` : ''}
  <p class="hint">Laid in by ${esc(d.byName)} on ${esc(V.when(d.at))}${d.amended ? ', amended ' + esc(V.when(d.amended.at)) : ''}.</p>
  <p><a href="/archive">Back to the archive</a></p>
</section>

${d.text ? `<section class="card">
  <div style="white-space:pre-wrap;line-height:1.75">${esc(d.text)}</div>
</section>` : ''}

${O.can(u, 'archwrite') ? `<section class="card">
  <h3 style="margin-top:0">Amend it</h3>
  <form method="post" action="/archive/${esc(d.id)}/amend">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="title">Title</label><input id="title" name="title" type="text" value="${esc(d.title)}" required></div>
      <div><label for="shelf">Shelf</label><select id="shelf" name="shelf">
        ${A.SHELVES.map(s => `<option value="${s.id}"${d.shelf === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select></div>
      <div><label for="dated">Dated</label><input id="dated" name="dated" type="text" value="${esc(d.dated || '')}"></div>
    </div>
    <label for="text">The document</label>
    <textarea id="text" name="text" style="min-height:200px">${esc(d.text || '')}</textarea>
    <div class="fields">
      <div><label for="link">Link</label><input id="link" name="link" type="text" value="${esc(d.link || '')}"></div>
      <div><label for="note">Note</label><input id="note" name="note" type="text" value="${esc(d.note || '')}"></div>
    </div>
    <div class="btnrow"><button class="btn" type="submit">Amend</button></div>
  </form>
</section>` : ''}

${O.can(u, 'archstrike') ? `<section class="card">
  <h3 style="margin-top:0">Withdraw it</h3>
  <p class="lede">The document leaves the shelves. It is not destroyed.</p>
  <form method="post" action="/archive/${esc(d.id)}/strike">${V.hidden(req.session.csrf)}
    <button class="btn danger" type="submit">Withdraw ${esc(d.title)}</button>
  </form>
</section>` : ''}`;

    res.page({ title: d.title, body, active: 'archive' });
  });

  app.post('/archive/:id/amend', checkCsrf, need('archwrite'), wrap((req, res) => {
    try {
      A.amend(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The document is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/archive/' + req.params.id);
  }));

  app.post('/archive/:id/strike', checkCsrf, need('archstrike'), wrap((req, res) => {
    A.strike(req.params.id, req.user);
    req.session.flash = { text: 'Withdrawn from the shelves.' };
    res.redirect('/archive');
  }));
};
