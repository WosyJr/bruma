const V = require('../lib/views');
const O = require('../lib/offices');
const Pe = require('../lib/people');

const esc = V.esc;

function chips(person) {
  return Pe.marks(person).map(m => `<span class="tag ${m.tag}">${esc(m.text)}</span>`).join('');
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/people', need('hall'), (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '');
    const only = String(req.query.has || '');
    let rows = Pe.search(u, q);
    if (only && Pe.SOURCE_BY_ID[only]) rows = rows.filter(p => (p.groups[only] || []).length);
    const s = Pe.summary(u);
    const shown = rows.slice(0, 300);
    const sources = Pe.SOURCES.filter(x => Pe.maySee(u, x.id));

    const line = p => {
      const groups = Pe.visibleGroups(u, p);
      const tally = groups.map(g => `<span class="tally" title="${esc(g.name)}">${esc(g.name)} <b>${g.rows.length}</b></span>`).join('');
      return `<a class="prow" href="/people/${esc(p.slug)}">
      <span class="pn">
        <b>${esc(p.name)}</b>
        ${p.office ? `<i>${esc(p.style || p.office)}</i>` : p.spellings.length ? `<i>also ${esc(p.spellings.slice(0, 2).join(', '))}</i>` : ''}
      </span>
      <span class="pmarks">${chips(p)}</span>
      <span class="ptally">${tally}</span>
    </a>`;
    };

    const body = `
<section class="card hallhead">
  <div class="hh">
    <div>
      <div class="eyebrow">Everyone the County knows of</div>
      <h2 style="margin:4px 0 8px">People</h2>
      <p class="lede" style="margin:0;max-width:600px">Every name written down anywhere in the County — on the rolls,
      on a holding, in the gaol book, on a licence, before the court — gathered under one name so you can see at a
      glance what is attached to a person.</p>
    </div>
  </div>
</section>

<div class="tiles four">
  <div class="stat"><div class="k">Names known</div><div class="v">${s.known}</div></div>
  <div class="stat"><div class="k">On the rolls</div><div class="v">${s.officers}</div></div>
  <div class="stat"><div class="k">Held now</div><div class="v${s.held ? ' vacant' : ''}">${s.held}</div></div>
  <div class="stat"><div class="k">Before the court</div><div class="v${s.atCourt ? ' vacant' : ''}">${s.atCourt}</div></div>
</div>

<section class="card" style="margin-top:20px">
  <form method="get" action="/people" class="peoplebar">
    <input type="search" name="q" value="${esc(q)}" placeholder="A name, or part of one" aria-label="Search people">
    <select name="has" aria-label="Who has">
      <option value="">Anything attached</option>
      ${sources.map(x => `<option value="${x.id}"${only === x.id ? ' selected' : ''}>Has ${esc(x.name.toLowerCase())}</option>`).join('')}
    </select>
    <button class="btn ghost" type="submit">Look</button>
    ${q || only ? '<a class="btn ghost small" href="/people">Clear</a>' : ''}
  </form>
  <p class="hint" style="margin:14px 0 0">${rows.length} ${rows.length === 1 ? 'name' : 'names'}${
    rows.length > shown.length ? ', the first ' + shown.length + ' shown' : ''}. You see only what your office opens.</p>
</section>

${shown.length ? `<div class="people">${shown.map(line).join('')}</div>`
  : `<section class="card">${V.empty('Nobody answers to that.')}</section>`}`;

    res.page({ title: 'People', body, active: 'people', wide: true });
  });

  app.get('/people/:slug', need('hall'), (req, res) => {
    const u = req.user;
    const p = Pe.get(req.params.slug);
    if (!p) return res.say('Nobody of that name', 'No name in the County answers to that.', 404);
    const groups = Pe.visibleGroups(u, p);
    const n = Pe.visibleCount(u, p);
    const hidden = Pe.SOURCES.filter(s => !Pe.maySee(u, s.id) && (p.groups[s.id] || []).length).length;

    const row = r => `<div class="arow${r.state ? ' ' + r.state : ''}">
    <div class="am">
      <b>${r.link ? `<a href="${esc(r.link)}">${esc(r.title)}</a>` : esc(r.title)}</b>
      ${r.note ? `<i>${esc(r.note)}</i>` : ''}
    </div>
    <div class="as">
      ${r.standing ? `<span class="tag ${r.state || ''}">${esc(r.standing)}</span>` : ''}
      ${r.at ? `<span class="aw">${esc(V.when(r.at))}</span>` : ''}
    </div>
  </div>`;

    const body = `
<section class="card hallhead">
  <div class="hh">
    <div>
      <div class="eyebrow">What the County has upon this name</div>
      <h2 style="margin:4px 0 6px">${esc(p.name)}</h2>
      <p class="lede" style="margin:0">${p.office ? esc(p.style || p.office) : 'Not upon the rolls of the County'}${
        p.spellings.length ? ' · also written ' + esc(p.spellings.join(', ')) : ''}</p>
      <div class="marks">${chips(p)}</div>
    </div>
    <div class="hhbtns">
      ${p.account ? `<a class="btn ghost" href="/service/${esc(p.account)}">Record of service</a>` : ''}
      <a class="btn ghost" href="/people">All people</a>
    </div>
  </div>
</section>

<div class="hallcols">
  <div>
    ${groups.length ? groups.map(g => `<section class="card">
      <div class="eyebrow" style="margin-bottom:12px">${esc(g.name)} · ${g.rows.length}</div>
      <div class="attach">${g.rows.map(row).join('')}</div>
    </section>`).join('')
    : `<section class="card">${V.empty('Nothing your office opens is attached to this name.')}</section>`}
  </div>
  <aside>
    <section class="card tight">
      <div class="tiles">
        <div class="stat"><div class="k">Things attached</div><div class="v">${n}</div><div class="n">that you may see</div></div>
        <div class="stat"><div class="k">Last written down</div><div class="v" style="font-size:18px;line-height:1.35">${esc(V.when(p.last)) || '—'}</div></div>
      </div>
    </section>

    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">Where this name appears</div>
      <div class="rows tight">
        ${groups.map(g => `<div class="row"><div class="main"><a href="/people?has=${esc(g.id)}">${esc(g.name)}</a></div><div class="side">${g.rows.length}</div></div>`).join('')}
      </div>
      ${hidden ? `<p class="hint" style="margin-top:12px">${hidden} other ${hidden === 1 ? 'kind of record is' : 'kinds of record are'} attached to this name
      that your office does not open.</p>` : ''}
    </section>

    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">Act upon this name</div>
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        ${O.can(u, 'courtfile') ? '<a class="btn ghost" href="/court">Lay a matter</a>' : ''}
        ${O.can(u, 'gaolcommit') ? '<a class="btn ghost" href="/gaol">Commit them</a>' : ''}
        ${O.can(u, 'licgrant') ? '<a class="btn ghost" href="/licences">Grant a licence</a>' : ''}
        ${O.can(u, 'propenter') ? '<a class="btn ghost" href="/property">Enter a holding</a>' : ''}
      </div>
      <p class="hint" style="margin-top:12px">Names are matched as they are written. Spell a name the same way each
      time and everything gathers under it.</p>
    </section>
  </aside>
</div>`;

    res.page({ title: p.name, body, active: 'people', wide: true });
  });
};
