const V = require('../lib/views');
const O = require('../lib/offices');
const U = require('../lib/users');
const Pr = require('../lib/proclaim');
const P = require('../lib/property');
const A = require('../lib/archive');
const Ct = require('../lib/court');
const G = require('../lib/guilds');

const esc = V.esc;

const PUBLIC_SHELVES = ['charter', 'law'];

function passBanner(p) {
  const s = Pr.STATE_BY_ID[p.state] || Pr.STATES[0];
  return `<section class="card">
  <h3 style="margin-top:0">${esc(s.say)}</h3>
  ${p.note ? `<p class="lede" style="margin-bottom:10px">${esc(p.note)}</p>` : ''}
  <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <span class="tag ${s.tag}">${esc(s.name)}</span>
    ${p.looked ? `<span class="hint" style="margin:0">Last looked at ${esc(V.when(p.looked))}${p.by ? ' by ' + esc(p.by) : ''}</span>` : ''}
  </div>
</section>`;
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {

  app.get('/proclamations', (req, res) => {
    const rows = Pr.all();
    const one = rows[0] || null;
    const rest = rows.slice(1, 60);

    const body = `
<section class="card">
  <h2>Proclamations</h2>
  <p class="lede">The word of the County, as it is given. Posted here as it is posted on the door of the Great Hall.</p>
</section>

${one ? `<section class="card">
  <div class="eyebrow" style="margin-bottom:14px">The latest word</div>
  <h2 style="font-size:30px">${esc(one.title)}</h2>
  <p class="hint" style="margin:0 0 18px">${esc(one.hand)}${one.dated ? ' · ' + esc(one.dated) : ''}</p>
  <div style="white-space:pre-wrap;line-height:1.75;font-size:18px">${esc(one.text)}</div>
</section>` : V.empty('Nothing has been proclaimed yet.')}

${rest.length ? `<section class="card">
  <h3 style="margin-top:0">Lately proclaimed</h3>
  <ul class="plain">${rest.map(p => `<li>
    <a href="/proclamations/${esc(p.id)}" style="font-family:Alegreya,Georgia,serif;font-size:19px">${esc(p.title)}</a>
    <div class="hint">${esc(p.hand)}${p.dated ? ' · ' + esc(p.dated) : ''}</div>
  </li>`).join('')}</ul>
</section>` : ''}`;

    res.page({ title: 'Proclamations', body, active: 'proclamations' });
  });

  app.get('/proclamations/:id', (req, res) => {
    const p = Pr.get(req.params.id);
    if (!p || p.struck) return res.say('No such proclamation', 'Nothing proclaimed answers to that.', 404);
    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:14px">By the hand of the County</div>
  <h2>${esc(p.title)}</h2>
  <p class="hint" style="margin:0 0 20px">${esc(p.hand)}${p.dated ? ' · ' + esc(p.dated) : ''}</p>
  <div style="white-space:pre-wrap;line-height:1.75;font-size:18px">${esc(p.text)}</div>
  <p style="margin-top:24px"><a href="/proclamations">All proclamations</a></p>
</section>`;
    res.page({ title: p.title, body, active: 'proclamations' });
  });

  app.get('/pass', (req, res) => {
    const p = Pr.pass();
    const body = `
<section class="card">
  <h2>The Pale Pass</h2>
  <p class="lede">The road north out of Bruma, over the Jeralls and into Skyrim. Whether it may be travelled, and on what footing.</p>
</section>
${passBanner(p)}
<section class="card">
  <h3 style="margin-top:0">What to know before you go</h3>
  <ul class="plain">
    <li>The pass is high, and the weather turns inside an hour. Carry fuel.</li>
    <li>An escort leaves the north gate at first light on any day the pass is open.</li>
    <li>The County keeps waystations on the road. They are open to any traveller, and to be left as they were found.</li>
    <li>What is seen on the high road should be told to the watch at the north gate.</li>
  </ul>
</section>`;
    res.page({ title: 'The Pale Pass', body, active: 'pass' });
  });

  app.get('/laws', (req, res) => {
    const q = String(req.query.q || '');
    const rows = A.search(q, '').filter(d => PUBLIC_SHELVES.includes(d.shelf));

    const body = `
<section class="card">
  <h2>Laws &amp; Charters</h2>
  <p class="lede">What the County has set down and holds everyone to. The law of Bruma is not kept behind a door.</p>
  <form method="get" action="/laws" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search the laws and charters" style="max-width:320px">
    <button class="btn ghost" type="submit">Search</button>
    ${q ? `<a class="btn ghost small" href="/laws">Clear</a>` : ''}
  </form>
</section>

<section class="card">
  ${rows.length ? `<div class="rows">${rows.slice(0, 120).map(d => `<div class="row">
    <div class="main">
      <a href="/laws/${esc(d.id)}" style="font-family:Alegreya,Georgia,serif;font-size:19px">${esc(d.title)}</a>
      <div class="hint">${esc(A.shelfName(d.shelf))}${d.dated ? ' · ' + esc(d.dated) : ''}</div>
    </div>
    <div class="side">no. ${d.no}</div>
  </div>`).join('')}</div>` : V.empty(q ? 'Nothing in the laws matches that.' : 'No laws or charters have been set down yet.')}
</section>`;

    res.page({ title: 'Laws & Charters', body, active: 'laws' });
  });

  app.get('/laws/:id', (req, res) => {
    const d = A.get(req.params.id);
    if (!d || d.struck || !PUBLIC_SHELVES.includes(d.shelf)) {
      return res.say('Not among the public laws', 'That document is not one the County posts openly.', 404);
    }
    const body = `
<section class="card">
  <h2>${esc(d.title)}</h2>
  <p class="hint" style="margin:0 0 18px">${esc(A.shelfName(d.shelf))}${d.dated ? ' · ' + esc(d.dated) : ''}</p>
  ${d.note ? `<p class="lede">${esc(d.note)}</p>` : ''}
  ${d.link ? `<p><a class="btn ghost small" href="${esc(d.link)}" rel="noopener noreferrer" target="_blank">Open where it lives</a></p>` : ''}
  <p><a href="/laws">All laws and charters</a></p>
</section>
${d.text ? `<section class="card"><div style="white-space:pre-wrap;line-height:1.75;font-size:18px">${esc(d.text)}</div></section>` : ''}`;
    res.page({ title: d.title, body, active: 'laws' });
  });

  app.get('/judgments', (req, res) => {
    const rows = Ct.all().filter(m => m.stage === 'judged' && m.judgment)
      .sort((a, b) => String(b.judgedAt || '').localeCompare(String(a.judgedAt || '')));

    const body = `
<section class="card">
  <h2>Judgments of the Court</h2>
  <p class="lede">What the court has decided, once it has decided it. Matters still before the bench are not posted
  — come to the Great Hall and hear them.</p>
</section>

<section class="card">
  ${rows.length ? `<div class="rows">${rows.slice(0, 80).map(m => `<div class="row">
    <div class="main">
      <b style="font-family:Alegreya,Georgia,serif;font-size:19px">${esc(m.title)}</b>
      <div class="hint">${esc(Ct.kindName(m.kind))} · judged by ${esc(m.judgedBy || 'the court')}</div>
      <div style="white-space:pre-wrap;margin-top:8px;color:var(--muted)">${esc(m.judgment)}</div>
    </div>
    <div class="side">no. ${m.no}<br>${esc(V.when(m.judgedAt))}</div>
  </div>`).join('')}</div>` : V.empty('The court has given no judgment yet.')}
</section>`;

    res.page({ title: 'Judgments', body, active: 'judgments' });
  });

  app.get('/who', (req, res) => {
    const offices = O.all().filter(o => o.listed);
    const people = U.list().filter(p => p.active);
    const byOffice = {};
    people.forEach(p => { (byOffice[p.office] = byOffice[p.office] || []).push(p); });
    const guilds = G.counts();

    const body = `
<section class="card">
  <h2>Those who keep the County</h2>
  <p class="lede">The offices of Bruma and who holds them. Any of them may be written to, and all of them
  answer to the County. The watch is not named here — go to the gate and ask.</p>
</section>

<section class="card">
  <div class="grid two">
    ${offices.map(o => {
      const held = byOffice[o.id] || [];
      return `<div style="border-top:2px solid var(--accent);padding-top:18px">
        <div style="font-family:Alegreya,Georgia,serif;font-size:22px;color:var(--warm);margin-bottom:5px">${esc(o.name)}</div>
        <div style="font-size:15px;color:var(--faint);line-height:1.55;margin-bottom:9px">${esc(o.note || '')}</div>
        ${held.length
          ? held.map(p => `<div style="font-size:16px;color:var(--ink)">${esc(p.name)}${p.style ? ' <span style="color:var(--faint);font-size:14px">· ' + esc(p.style) + '</span>' : ''}</div>`).join('')
          : '<div style="font-size:15px;color:var(--faint);font-style:italic">Vacant</div>'}
      </div>`;
    }).join('')}
  </div>
</section>

<section class="card">
  <h3 style="margin-top:0">The guilds that hold charter</h3>
  <div class="grid three">
    ${O.GUILDS.map(g => {
      const charter = G.charterFor(g.id);
      return `<div class="stat"><div class="k">${esc(g.name)}</div>
        <div class="v" style="font-size:22px;font-family:Alegreya,Georgia,serif">${guilds[g.id] || 0} on the roll</div>
        <div class="n">${charter ? 'Chartered by the County' : 'No charter laid'}</div></div>`;
    }).join('')}
  </div>
</section>`;

    res.page({ title: 'Those who keep the County', body, active: 'who' });
  });

  app.get('/petition', (req, res) => {
    const body = `
<section class="card">
  <h2>Lay a petition before the County</h2>
  <p class="lede">Anyone under the County’s protection may lay a matter before it. Write plainly, say who you are,
  and say what you want done. It is read.</p>
  <form method="post" action="/petition">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="complainant">Your name</label><input id="complainant" name="complainant" type="text" required></div>
      <div><label for="title">What the matter is</label><input id="title" name="title" type="text" placeholder="A boundary stone moved on the Orange Road" required></div>
    </div>
    <div class="fields">
      <div><label for="kind">Kind</label><select id="kind" name="kind">
        ${Ct.KINDS.map(k => `<option value="${k.id}"${k.id === 'petition' ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}
      </select></div>
      <div><label for="respondent">Against whom, if anyone</label><input id="respondent" name="respondent" type="text"></div>
    </div>
    <label for="account">Set down what happened</label>
    <textarea id="account" name="account" style="min-height:160px" required></textarea>
    <div class="btnrow"><button class="btn" type="submit">Lay it before the County</button></div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">What happens next</h3>
  <ul class="plain">
    <li>It goes onto the court roll and is read by the Steward.</li>
    <li>If it needs a hearing, one is set, and you will be told where and when.</li>
    <li>Once judged, the judgment is posted among the <a href="/judgments">Judgments of the Court</a>.</li>
  </ul>
</section>`;
    res.page({ title: 'Lay a petition', body, active: 'petition' });
  });

  app.post('/petition', checkCsrf, wrap((req, res) => {
    const who = String(req.body.complainant || '').trim().slice(0, 120);
    if (!who) {
      req.session.flash = { err: true, text: 'Say who you are.' };
      return res.redirect('/petition');
    }
    try {
      const hand = { username: 'public:' + who.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40), name: who };
      const m = Ct.lay({
        title: req.body.title,
        kind: req.body.kind,
        complainant: who,
        respondent: req.body.respondent,
        account: req.body.account
      }, hand);
      req.session.flash = { text: 'Your petition is laid before the County as matter no. ' + m.no + '. It will be read.' };
      res.redirect('/petition');
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect('/petition');
    }
  }));

  app.get('/holdings', (req, res) => {
    const rows = P.search(String(req.query.q || ''));
    const q = String(req.query.q || '');
    const body = `
<section class="card">
  <h2>Who holds what in the County</h2>
  <p class="lede">The holdings of Bruma and who is seized of them. What each renders to the County is not posted here.</p>
  <form method="get" action="/holdings" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search name, holder or place" style="max-width:320px">
    <button class="btn ghost" type="submit">Search</button>
    ${q ? `<a class="btn ghost small" href="/holdings">Clear</a>` : ''}
  </form>
</section>

<section class="card">
  ${rows.length ? V.table([
      { head: 'No.', num: true, cell: r => r.no },
      { head: 'Holding', cell: r => esc(r.name) },
      { head: 'Kind', cell: r => esc(P.kindName(r.kind)) },
      { head: 'Where', cell: r => esc(r.place || '') },
      { head: 'Held by', cell: r => esc(r.holder || '—') },
      { head: 'Standing', cell: r => { const s = P.STATE_BY_ID[r.state] || P.STATES[1]; return `<span class="tag ${s.tag}">${esc(s.name)}</span>`; } }
    ], rows) : V.empty(q ? 'Nothing on the roll matches that.' : 'Nothing has been entered on the roll yet.')}
</section>`;
    res.page({ title: 'Who holds what', body, active: 'holdings' });
  });

  app.get('/proclaim', need('proclaim'), (req, res) => {
    const rows = Pr.every().slice(0, 40);
    const p = Pr.pass();

    const body = `
<section class="card">
  <h2>Proclaim</h2>
  <p class="lede">What you issue here is posted publicly, and anyone may read it without entering the hall.</p>
  <form method="post" action="/proclaim">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="title">Title</label><input id="title" name="title" type="text" placeholder="On the winter stores, and the keeping of the high road" required></div>
      <div><label for="hand">By whose hand</label><input id="hand" name="hand" type="text" value="${esc(req.user.name)}"></div>
      <div><label for="dated">Given at, and when</label><input id="dated" name="dated" type="text" placeholder="Castle Bruma, 17th of Sun’s Dusk"></div>
    </div>
    <label for="text">The proclamation</label>
    <textarea id="text" name="text" style="min-height:220px" required></textarea>
    <div class="btnrow"><button class="btn go" type="submit">Proclaim it</button></div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">The Pale Pass</h3>
  <p class="lede">What is set here shows on the public notice of the pass.</p>
  <form method="post" action="/proclaim/pass">${V.hidden(req.session.csrf)}
    <label for="state">How the pass stands</label>
    <select id="state" name="state">
      ${Pr.STATES.map(s => `<option value="${s.id}"${p.state === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select>
    <label for="note">What travellers should know</label>
    <textarea id="note" name="note" style="min-height:90px" placeholder="Snow to the knee above the second waystation. Carts are turned back; riders and foot may go.">${esc(p.note || '')}</textarea>
    <div class="btnrow"><button class="btn" type="submit">Set the notice</button>
    <a class="btn ghost" href="/pass">See the public notice</a></div>
  </form>
</section>

<section class="card">
  <h3 style="margin-top:0">What has been proclaimed</h3>
  ${rows.length ? V.table([
      { head: 'No.', num: true, cell: r => r.no },
      { head: 'Title', cell: r => `<a href="/proclamations/${esc(r.id)}">${esc(r.title)}</a>` + (r.struck ? ' <span class="tag out">taken down</span>' : '') },
      { head: 'By whose hand', cell: r => esc(r.hand) },
      { head: 'Given', cell: r => esc(r.dated || V.when(r.at)) },
      { head: '', cell: r => `<form method="post" action="/proclaim/${esc(r.id)}/strike" class="inline">${V.hidden(req.session.csrf)}
          <button class="btn ghost small" type="submit">${r.struck ? 'Post again' : 'Take down'}</button></form>` }
    ], rows) : V.empty('Nothing has been proclaimed yet.')}
</section>`;

    res.page({ title: 'Proclaim', body, active: 'proclaim', wide: true });
  });

  app.post('/proclaim', checkCsrf, need('proclaim'), wrap((req, res) => {
    try {
      const p = Pr.issue(req.body, req.user);
      req.session.flash = { text: '“' + p.title + '” is proclaimed, and posted publicly.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/proclaim');
  }));

  app.post('/proclaim/pass', checkCsrf, need('proclaim'), wrap((req, res) => {
    Pr.setPass(req.body, req.user);
    req.session.flash = { text: 'The notice of the pass is set.' };
    res.redirect('/proclaim');
  }));

  app.post('/proclaim/:id/strike', checkCsrf, need('proclaim'), wrap((req, res) => {
    const p = Pr.get(req.params.id);
    if (!p) return res.redirect('/proclaim');
    Pr.amend(req.params.id, { struck: !p.struck }, req.user);
    req.session.flash = { text: p.struck ? 'Posted again.' : 'Taken down from the board.' };
    res.redirect('/proclaim');
  }));
};
