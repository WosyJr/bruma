const V = require('../lib/views');
const O = require('../lib/offices');
const P = require('../lib/property');

const esc = V.esc;

const PIN_RING = { held: '#E09A3E', vacant: '#A8967C', crown: '#CBA55E', disputed: '#D1533A', ruined: '#7A6B58' };

function pin(p, on) {
  const st = P.STATE_BY_ID[p.state] || P.STATES[1];
  const ring = PIN_RING[p.state] || '#E09A3E';
  return `<button type="button" class="pin${on ? ' on' : ''}" style="left:${p.x}%;top:${p.y}%" data-id="${esc(p.id)}"
    title="${esc(p.name)} — ${esc(st.name)}${p.holder ? ', held by ' + esc(p.holder) : ''}">
    <svg viewBox="0 0 28 36" aria-hidden="true">
      <circle class="ring" cx="14" cy="13" r="13" fill="none" stroke="${ring}" stroke-width="2" opacity=".55"/>
      <path d="M14 35C14 35 25 22.5 25 13A11 11 0 1 0 3 13c0 9.5 11 22 11 22z" fill="#1F1710" stroke="${ring}" stroke-width="2"/>
      <g transform="translate(7 6) scale(0.5)" fill="none" stroke="${ring}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">
        <path d="${P.kindPath(p.kind)}"/>
      </g>
    </svg>
    <span class="pinlabel" aria-hidden="true">
      <b>${esc(p.name)}</b>
      <i>${esc(P.kindName(p.kind))}${p.place ? ' \u00b7 ' + esc(p.place) : ''}</i>
      <u>${p.holder ? 'Held by ' + esc(p.holder) : esc(st.name)}</u>
    </span>
  </button>`;
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/property', need('propread'), (req, res) => {
    const u = req.user;
    const q = String(req.query.q || '');
    const sel = String(req.query.p || '');
    const mapId = P.MAP_BY_ID[req.query.map] ? String(req.query.map) : 'county';
    const theMap = P.MAP_BY_ID[mapId];
    const rows = P.search(q, mapId);
    const all = P.all(mapId);
    const counts = P.countByMap();
    const sum = P.summary();
    const chosen = sel ? P.get(sel) : null;
    const mayEnter = O.can(u, 'propenter');

    const body = `
<section class="card">
  <h2>The Property Roll</h2>
  <p class="lede">Every holding in the County, pinned where it stands. ${mayEnter ? 'Press <b>Enter a holding</b>, then click the map where it lies.' : 'Click a pin to read what is held there.'}</p>
  <div class="btnrow" style="margin-bottom:4px">
    ${P.MAPS.map(m => `<a class="btn ${m.id === mapId ? '' : 'ghost'}" href="/property?map=${esc(m.id)}${q ? '&q=' + encodeURIComponent(q) : ''}">${esc(m.name)} <span style="opacity:.7">\u00b7 ${counts[m.id] || 0}</span></a>`).join('')}
  </div>
  <p class="hint" style="margin:0 0 12px">${esc(theMap.note)}</p>
  <div class="btnrow">
    ${mayEnter ? `<button class="btn go" type="button" id="startplace">Enter a holding</button>` : ''}
    <form method="get" action="/property" class="inline" style="display:flex;gap:8px;align-items:center">
      <input type="hidden" name="map" value="${esc(mapId)}">
      <input type="text" name="q" value="${esc(q)}" placeholder="Search name, holder or place" style="width:260px">
      <button class="btn ghost" type="submit">Search</button>
    </form>
    ${q ? `<a class="btn ghost small" href="/property?map=${esc(mapId)}">Clear</a>` : ''}
  </div>
</section>

<div class="grid three">
  <div class="stat"><div class="k">Holdings on the roll</div><div class="v">${sum.total}</div><div class="n">${sum.byState.held || 0} held, ${sum.byState.vacant || 0} vacant</div></div>
  <div class="stat"><div class="k">Held by the County</div><div class="v">${sum.byState.crown || 0}</div><div class="n">${sum.byState.disputed || 0} in dispute</div></div>
  <div class="stat"><div class="k">The rent roll</div><div class="v">${V.septims(sum.rentRoll)}</div><div class="n">septims, when all is rendered</div></div>
</div>

<section class="card" style="margin-top:20px">
  <div class="mapwrap" id="map" data-place="${mayEnter ? '1' : ''}">
    <img src="${esc(theMap.file)}" alt="A map of ${esc(theMap.name)}" id="mapimg">
    ${all.map(p => pin(p, p.id === sel)).join('')}
  </div>
  <p class="mapnote" id="mapnote">${mayEnter ? 'Click a pin to read it. Press <b>Enter a holding</b> above to set a new pin.' : 'Click a pin to read what is held there.'}</p>
</section>

${chosen ? holdingCard(chosen, u, req.session.csrf) : ''}

<section class="card">
  <h3 style="margin-top:0">${q ? 'Holdings matching “' + esc(q) + '”' : 'The roll'}</h3>
  ${rows.length ? V.table([
      { head: 'No.', num: true, cell: r => r.no },
      { head: 'Holding', cell: r => `<a href="/property?map=${esc(mapId)}&p=${esc(r.id)}${q ? '&q=' + encodeURIComponent(q) : ''}#map">${esc(r.name)}</a>` },
      { head: 'Kind', cell: r => esc(P.kindName(r.kind)) },
      { head: 'Where', cell: r => esc(r.place || '') },
      { head: 'Held by', cell: r => esc(r.holder || '—') },
      { head: 'Standing', cell: r => { const s = P.STATE_BY_ID[r.state] || P.STATES[1]; return `<span class="tag ${s.tag}">${esc(s.name)}</span>`; } },
      { head: 'Rent', num: true, cell: r => r.rent ? V.septims(r.rent) : '—' }
    ], rows) : V.empty(q ? 'Nothing on the roll matches that.' : 'The roll is empty. Nothing has been entered yet.')}
</section>

${mayEnter ? `<section class="card" id="enterform" style="display:none">
  <h3 style="margin-top:0">Enter a holding</h3>
  <form method="post" action="/property/enter">${V.hidden(req.session.csrf)}
    <input type="hidden" name="x" id="newx"><input type="hidden" name="y" id="newy">
    <input type="hidden" name="map" value="${esc(mapId)}">
    <p class="hint" id="atwhere"></p>
    ${holdingFields({}, req.session.csrf)}
    <div class="btnrow"><button class="btn" type="submit">Enter it on the roll</button>
    <button class="btn ghost" type="button" id="cancelplace">Never mind</button></div>
  </form>
</section>` : ''}`;

    res.page({ title: 'The Property Roll', body, active: 'property', wide: true });
  });

  app.post('/property/enter', checkCsrf, need('propenter'), wrap((req, res) => {
    try {
      const row = P.enter(req.body, req.user);
      req.session.flash = { text: row.name + ' is entered on the roll as holding no. ' + row.no + '.' };
      res.redirect('/property?map=' + encodeURIComponent(row.map) + '&p=' + encodeURIComponent(row.id) + '#map');
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/property');
    }
  }));

  app.get('/property/:id/amend', need('propenter'), (req, res) => {
    const p = P.get(req.params.id);
    if (!p) return res.say('No such holding', 'Nothing on the roll answers to that.', 404);
    const body = `
<section class="card">
  <h2>Amend holding no. ${p.no}</h2>
  <p class="lede">${esc(p.name)}</p>
  <form method="post" action="/property/${esc(p.id)}/amend">${V.hidden(req.session.csrf)}
    ${holdingFields(p, req.session.csrf)}
    <div class="fields">
      <div><label for="x">Across the map (0–100)</label><input id="x" name="x" type="number" step="0.01" min="0" max="100" value="${p.x}"></div>
      <div><label for="y">Down the map (0–100)</label><input id="y" name="y" type="number" step="0.01" min="0" max="100" value="${p.y}"></div>
    </div>
    <div class="btnrow"><button class="btn" type="submit">Amend</button>
    <a class="btn ghost" href="/property?map=${esc(p.map || 'county')}&p=${esc(p.id)}#map">Back to the roll</a></div>
  </form>
</section>

${O.can(req.user, 'propstrike') ? `<section class="card">
  <h3 style="margin-top:0">Strike it from the roll</h3>
  <p class="lede">The holding leaves the map and the roll. Its rents stay recorded.</p>
  <form method="post" action="/property/${esc(p.id)}/strike">${V.hidden(req.session.csrf)}
    <button class="btn danger" type="submit">Strike ${esc(p.name)}</button>
  </form>
</section>` : ''}`;
    res.page({ title: 'Amend a holding', body, active: 'property' });
  });

  app.post('/property/:id/amend', checkCsrf, need('propenter'), wrap((req, res) => {
    try {
      const row = P.amend(req.params.id, req.body, req.user);
      req.session.flash = { text: 'The holding is amended.' };
      res.redirect('/property?map=' + encodeURIComponent(row.map) + '&p=' + encodeURIComponent(req.params.id) + '#map');
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/property');
    }
  }));

  app.post('/property/:id/strike', checkCsrf, need('propstrike'), wrap((req, res) => {
    P.strike(req.params.id, req.user);
    req.session.flash = { text: 'Struck from the roll.' };
    res.redirect('/property');
  }));

  app.post('/property/:id/rent', checkCsrf, need('propdeed'), wrap((req, res) => {
    try {
      const r = P.recordRent(req.params.id, req.body, req.user);
      req.session.flash = { text: V.septims(r.amount) + ' septims rendered on ' + r.propName + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    const h = P.get(req.params.id);
    res.redirect('/property?map=' + encodeURIComponent((h && h.map) || 'county') + '&p=' + encodeURIComponent(req.params.id) + '#map');
  }));
};

function holdingFields(p, csrf) {
  return `
  <div class="fields">
    <div><label for="name">Name of the holding</label><input id="name" name="name" type="text" value="${esc(p.name || '')}" placeholder="Olav’s Tap and Tack" required></div>
    <div><label for="place">Where it lies</label><input id="place" name="place" type="text" value="${esc(p.place || '')}" placeholder="Bruma, the Market"></div>
  </div>
  <div class="fields">
    <div><label for="kind">Kind</label><select id="kind" name="kind">
      ${P.KINDS.map(k => `<option value="${k.id}"${p.kind === k.id ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}
    </select></div>
    <div><label for="state">Standing</label><select id="state" name="state">
      ${P.STATES.map(s => `<option value="${s.id}"${p.state === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select></div>
  </div>
  <div class="fields">
    <div><label for="holder">Held by</label><input id="holder" name="holder" type="text" value="${esc(p.holder || '')}" placeholder="Leave empty if vacant"></div>
    <div><label for="rent">Rent in septims</label><input id="rent" name="rent" type="number" min="0" step="1" value="${Number(p.rent) || 0}"></div>
  </div>
  <label for="note">Anything else set down</label>
  <textarea id="note" name="note" placeholder="Two floors and a cellar. The roof wants mending.">${esc(p.note || '')}</textarea>`;
}

function holdingCard(p, u, csrf) {
  const st = P.STATE_BY_ID[p.state] || P.STATES[1];
  const rents = P.rentsFor(p.id).slice(0, 10);
  const rendered = P.rentsFor(p.id).reduce((n, r) => n + r.amount, 0);
  return `
<section class="card" id="chosen">
  <h3 style="margin-top:0">Holding no. ${p.no} · ${esc(p.name)}</h3>
  <p class="lede">${esc(P.kindName(p.kind))}${p.place ? ' · ' + esc(p.place) : ''} · <span class="tag ${st.tag}">${esc(st.name)}</span></p>
  <div class="rows">
    <div class="row"><div class="main">Held by</div><div class="side">${esc(p.holder || 'Nobody')}</div></div>
    <div class="row"><div class="main">Rent due</div><div class="side">${p.rent ? V.septims(p.rent) + ' septims' : 'None'}</div></div>
    <div class="row"><div class="main">Rendered in all</div><div class="side">${V.septims(rendered)} septims</div></div>
  </div>
  ${p.note ? `<p>${esc(p.note)}</p>` : ''}
  <div class="btnrow">
    ${O.can(u, 'propenter') ? `<a class="btn ghost small" href="/property/${esc(p.id)}/amend">Amend</a>` : ''}
    <a class="btn ghost small" href="/property?map=${esc(p.map || 'county')}">Close</a>
  </div>

  ${O.can(u, 'propdeed') ? `<h3>Record a rent rendered</h3>
  <form method="post" action="/property/${esc(p.id)}/rent">${V.hidden(csrf)}
    <div class="fields">
      <div><label for="amount">Septims</label><input id="amount" name="amount" type="number" min="1" step="1" value="${Number(p.rent) || ''}" required></div>
      <div><label for="period">For what period</label><input id="period" name="period" type="text" placeholder="Hearthfire, 4E 226"></div>
    </div>
    <label for="rnote">Note</label><input id="rnote" name="note" type="text" placeholder="Rendered in full, in coin">
    <div class="btnrow"><button class="btn go" type="submit">Record it</button></div>
  </form>` : ''}

  ${rents.length ? `<h3>Rents rendered</h3>${V.table([
      { head: 'When', cell: r => esc(V.when(r.at)) },
      { head: 'Period', cell: r => esc(r.period || '') },
      { head: 'From', cell: r => esc(r.holder || '') },
      { head: 'Septims', num: true, cell: r => V.septims(r.amount) },
      { head: 'Note', cell: r => esc(r.note || '') }
    ], rents)}` : ''}
</section>`;
}

module.exports.pin = pin;
