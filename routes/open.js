const V = require('../lib/views');
const O = require('../lib/offices');
const U = require('../lib/users');
const Pr = require('../lib/proclaim');
const P = require('../lib/property');
const A = require('../lib/archive');
const Ct = require('../lib/court');
const G = require('../lib/guilds');
const pin = require('./property').pin;
const Lex = require('../lib/lexfmt');

const esc = V.esc;

const SMALL = new Set(['the','a','an','and','or','of','in','on','to','for','by','with','at','from','against','et']);
const titleCaseOf = n => String(n || '')
  .replace(/([A-Z])([A-Z']+)/g, (m, a, b) => a + b.toLowerCase())
  .split(/\s+/)
  .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase().replace(/[^a-z]/g, '')) ? w.toLowerCase() : w))
  .join(' ');
const splitLatin = n => {
  const tc = titleCaseOf(n);
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(tc);
  return m ? { name: m[1].trim(), latin: m[2].trim() } : { name: tc, latin: '' };
};

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
    const all = A.search('', '').filter(d => PUBLIC_SHELVES.includes(d.shelf));
    const lex = all.filter(d => d.lex).sort((a, b) => a.no - b.no);
    const other = all.filter(d => !d.lex);

    const hits = [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      all.forEach(d => {
        Lex.articles(d.text).forEach(a => {
          if ((a.no + ' ' + a.name).toLowerCase().includes(needle)) hits.push({ d, a });
        });
      });
    }
    const docHits = needle ? all.filter(d => (d.title + ' ' + d.text).toLowerCase().includes(needle)) : [];

    const roman = t => {
      const m = /TITLE\s+([IVXL]+)/i.exec(t.title || '');
      return m ? m[1] : '\u00a7';
    };
    const shortName = t => String(t.title || '').replace(/^Lex Brumae\s*\u2014\s*/, '').replace(/^TITLE\s+[IVXL]+\s*\u00b7\s*/i, '');
    const split = t => splitLatin(shortName(t));

    const body = `
<section class="card">
  <h2>Laws &amp; Charters</h2>
  <p class="lede">The <b>Lex Brumae</b> is the legal code of the County \u2014 ${lex.reduce((n, d) => n + Lex.articles(d.text).length, 0)} articles
  across ${lex.length} titles, binding on everyone within these borders. It is posted openly, and ignorance of it is no defence.</p>
  <form method="get" action="/laws" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search by offence, article number or word" style="max-width:360px">
    <button class="btn ghost" type="submit">Search the law</button>
    ${q ? `<a class="btn ghost small" href="/laws">Clear</a>` : ''}
  </form>
</section>

${q ? `<section class="card">
  <h3 style="margin-top:0">${hits.length + docHits.length ? 'What matches \u201c' + esc(q) + '\u201d' : 'Nothing in the law matches \u201c' + esc(q) + '\u201d'}</h3>
  ${hits.length ? `<div class="rows">${hits.slice(0, 60).map(h => `<div class="row">
    <div class="main"><a href="/laws/${esc(h.d.id)}#art-${esc(h.a.no)}" style="font-family:Alegreya,Georgia,serif;font-size:18px">Article ${esc(h.a.no)} \u00b7 ${esc(h.a.name)}</a>
      <div class="hint">${esc(shortName(h.d))}</div></div>
  </div>`).join('')}</div>` : ''}
  ${docHits.length ? `<p class="hint" style="margin-top:14px">Also found in: ${docHits.slice(0, 10).map(d => `<a href="/laws/${esc(d.id)}">${esc(shortName(d))}</a>`).join(' \u00b7 ')}</p>` : ''}
</section>` : ''}

${lex.length ? `<section class="card">
  <h3 style="margin-top:0">The Lex Brumae</h3>
  <div class="grid two" style="margin-top:16px">
    ${lex.map(d => `<a class="titlecard" href="/laws/${esc(d.id)}">
      <span class="roman">${esc(roman(d))}</span>
      <span><b>${esc(split(d).name)}</b>${split(d).latin ? `<i style="font-style:italic;color:var(--soft);font-size:14.5px;margin-top:2px">${esc(split(d).latin)}</i>` : ''}<i>${esc(Lex.summary(d.text) || 'Read it')}</i></span>
    </a>`).join('')}
  </div>
</section>` : ''}

${other.length ? `<section class="card">
  <h3 style="margin-top:0">Charters and other instruments</h3>
  <div class="rows">${other.map(d => `<div class="row">
    <div class="main"><a href="/laws/${esc(d.id)}" style="font-family:Alegreya,Georgia,serif;font-size:19px">${esc(d.title)}</a>
      <div class="hint">${esc(A.shelfName(d.shelf))}${d.dated ? ' \u00b7 ' + esc(d.dated) : ''}</div></div>
    <div class="side">no. ${d.no}</div>
  </div>`).join('')}</div>
</section>` : ''}

${!lex.length && !other.length ? V.empty('No laws or charters have been set down yet.') : ''}`;

    res.page({ title: 'Laws & Charters', body, active: 'laws', wide: true });
  });

  app.get('/laws/:id', (req, res) => {
    const d = A.get(req.params.id);
    if (!d || d.struck || !PUBLIC_SHELVES.includes(d.shelf)) {
      return res.say('Not among the public laws', 'That document is not one the County posts openly.', 404);
    }
    const arts = Lex.articles(d.text);
    const shortName = String(d.title || '').replace(/^Lex Brumae\s*\u2014\s*/, '');
    const roman = /TITLE\s+([IVXL]+)/i.exec(d.title || '');
    const siblings = A.search('', '').filter(x => x.lex && PUBLIC_SHELVES.includes(x.shelf)).sort((a, b) => a.no - b.no);
    const at = siblings.findIndex(x => x.id === d.id);
    const prev = at > 0 ? siblings[at - 1] : null;
    const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : null;
    const trim = t => String(t || '').replace(/^Lex Brumae\s*\u2014\s*/, '').replace(/^TITLE\s+[IVXL]+\s*\u00b7\s*/i, '');
    const titleName = n => splitLatin(n);

    const body = `
<section class="card">
  <div class="eyebrow" style="margin-bottom:10px">${d.lex ? 'The Lex Brumae' + (roman ? ' \u00b7 Title ' + esc(roman[1]) : '') : esc(A.shelfName(d.shelf))}</div>
  <h2>${esc(titleName(trim(d.title) || shortName).name)}</h2>
  ${titleName(trim(d.title)).latin ? `<p class="seat" style="margin:2px 0 6px;font-size:19px">${esc(titleName(trim(d.title)).latin)}</p>` : ''}
  <p class="hint" style="margin:0">${esc(d.dated || '')}${arts.length ? ' \u00b7 ' + esc(Lex.summary(d.text)) : ''}</p>
  ${d.link ? `<p style="margin-top:14px"><a class="btn ghost small" href="${esc(d.link)}" rel="noopener noreferrer" target="_blank">Open where it lives</a></p>` : ''}
</section>

<div class="lexcols">
  <div>
    <section class="card">
      ${d.text ? Lex.render(d.text) : V.empty('This document has no text set down.')}
    </section>

    <section class="card">
      <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap">
        ${prev ? `<a class="btn ghost small" href="/laws/${esc(prev.id)}">\u2190 ${esc(titleName(trim(prev.title)).name)}</a>` : '<span></span>'}
        ${next ? `<a class="btn ghost small" href="/laws/${esc(next.id)}">${esc(titleName(trim(next.title)).name)} \u2192</a>` : '<span></span>'}
      </div>
      <p style="margin:14px 0 0"><a href="/laws">All laws and charters</a></p>
    </section>
  </div>

  <aside>
    ${arts.length ? `<section class="card tight lextoc">
      <div class="eyebrow" style="margin-bottom:10px">In this title</div>
      <ol>${arts.map(a => `<li><a href="#art-${esc(a.no)}"><span>${esc(a.no)}</span>${esc(a.name)}</a></li>`).join('')}</ol>
    </section>` : ''}
    ${siblings.length ? `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">The other titles</div>
      <ul class="plain" style="margin:0">${siblings.filter(x => x.id !== d.id).map(x =>
        `<li style="padding:6px 0"><a href="/laws/${esc(x.id)}" style="font-size:15px">${esc(titleName(trim(x.title)).name)}</a></li>`).join('')}</ul>
    </section>` : ''}
  </aside>
</div>`;

    res.page({ title: titleName(trim(d.title)).name, body, active: 'laws', wide: true });
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


  app.get('/the-guilds', (req, res) => {
    const counts = G.counts();
    const offices = O.all();
    const people = U.list().filter(p => p.active);

    const masterOf = gid => {
      const o = offices.find(x => x.guild === gid && x.listed);
      if (!o) return null;
      const who = people.filter(p => p.office === o.id);
      return { office: o, who };
    };

    const body = `
<section class="card">
  <h2>The Guilds of Bruma</h2>
  <p class="lede">Three bodies hold charter in the County. A charter is a public thing \u2014 it says what the guild
  may do and what it owes. Who stands on a guild roll, and what it renders, is the guild\u2019s own business.</p>
</section>

${O.GUILDS.map(g => {
  const charter = G.charterFor(g.id);
  const m = masterOf(g.id);
  return `<section class="card">
    <div class="eyebrow" style="margin-bottom:10px">Chartered by the County</div>
    <h3 style="margin-top:0;font-size:28px">${esc(g.name)}</h3>
    <div class="grid three" style="margin:16px 0 18px">
      <div class="stat"><div class="k">On the roll</div><div class="v">${counts[g.id] || 0}</div>
        <div class="n">${(counts[g.id] || 0) === 1 ? 'member' : 'members'}</div></div>
      <div class="stat"><div class="k">${esc(m && m.office ? m.office.name : 'Master')}</div>
        <div class="v" style="font-size:21px;font-family:var(--serif)">${m && m.who.length ? esc(m.who[0].name) : 'Vacant'}</div>
        <div class="n">${m && m.who.length && m.who[0].style ? esc(m.who[0].style) : 'the hand the County deals with'}</div></div>
      <div class="stat"><div class="k">Charter</div>
        <div class="v" style="font-size:21px;font-family:var(--serif)">${charter ? 'Laid' : 'None'}</div>
        <div class="n">${charter ? 'read it below' : 'not yet laid before the County'}</div></div>
    </div>
    ${charter
      ? `<h3 style="font-size:20px">${esc(charter.title)}</h3>
         <div style="white-space:pre-wrap;line-height:1.75">${esc(charter.text)}</div>`
      : V.empty('No charter has been laid for this guild. Until one is, it holds nothing of the County.')}
  </section>`;
}).join('')}

<section class="card">
  <h3 style="margin-top:0">Joining a guild</h3>
  <p class="lede">The County does not admit anyone to a guild. Each guild keeps its own roll and admits by its own
  charter \u2014 find its hall in Bruma and ask the Master. If a guild has wronged you, that is a matter for the
  court, and you may <a href="/petition">lay it there</a>.</p>
</section>`;

    res.page({ title: 'The Guilds of Bruma', body, active: 'the-guilds' });
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
  <h2>Property of the County</h2>
  <p class="lede">The holdings of Bruma and who is seized of them. What each renders to the County is not posted here.</p>
  <form method="get" action="/holdings" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search name, holder or place" style="max-width:320px">
    <button class="btn ghost" type="submit">Search</button>
    ${q ? `<a class="btn ghost small" href="/holdings">Clear</a>` : ''}
  </form>
</section>

<section class="card">
  ${P.MAPS.map(m => {
    const on = P.all(m.id);
    if (!on.length) return '';
    return `<h3 style="margin-top:0">${esc(m.name)}</h3>
    <p class="hint" style="margin:0 0 12px">${esc(m.note)} \u00b7 ${on.length} ${on.length === 1 ? 'holding' : 'holdings'}</p>
    <div class="mapwrap" style="margin-bottom:22px">
      <img src="${esc(m.file)}" alt="A map of ${esc(m.name)}">
      ${on.map(h => pin(h, false)).join('')}
    </div>`;
  }).join('')}
  ${P.all().length ? '<p class="mapnote">Hover a pin to see what stands there and who holds it.</p>' : V.empty('Nothing has been pinned on either map yet.')}
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
    res.page({ title: 'Property', body, active: 'holdings' });
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
