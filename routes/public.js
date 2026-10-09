const C = require('../lib/config');
const V = require('../lib/views');
const Sv = require('../lib/service');
const U = require('../lib/users');
const O = require('../lib/offices');
const W = require('../lib/watch');
const P = require('../lib/property');
const T = require('../lib/treasury');
const Ct = require('../lib/court');
const A = require('../lib/archive');
const G = require('../lib/guilds');
const Pr = require('../lib/proclaim');
const Desk = require('../lib/desk');
const Tax = require('../lib/taxes');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back }) {

  app.get('/', (req, res) => {
    const pass = Pr.pass();
    const passState = Pr.STATE_BY_ID[pass.state] || Pr.STATES[0];
    const word = Pr.latest();
    const later = Pr.all().slice(word ? 1 : 0, (word ? 1 : 0) + 4);
    const seat = U.list().filter(x => x.active).map(x => ({ p: x, o: O.get(x.office) }))
      .filter(x => x.o && x.o.all && x.o.id !== 'master')
      .sort((a, b) => (a.o.rank || 9) - (b.o.rank || 9))[0]
      || U.list().filter(x => x.active).map(x => ({ p: x, o: O.get(x.office) }))
        .filter(x => x.o && x.o.all).sort((a, b) => (a.o.rank || 9) - (b.o.rank || 9))[0];
    const seatName = seat ? seat.p.name : '';
    const seatStyle = seat ? (seat.p.style || seat.o.name) : 'The County of Bruma';
    const seatWords = seat ? (seat.p.style + ' ' + seat.o.name) : '';
    const title = /countess/i.test(seatWords) ? 'Countess' : /\bcount\b/i.test(seatWords) ? 'Count'
      : /steward/i.test(seatWords) ? 'Steward' : '';
    const whose = title ? 'the ' + title : 'the County';
    const possessive = title ? 'the ' + title + '\u2019s' : 'the County\u2019s';

    const icon = d => `<svg class="gicon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const HOUSE = icon('<path d="M4 10.5 12 4l8 6.5"/><path d="M5.6 9.9V20h12.8V9.9"/>');
    const PEAK = icon('<path d="m3 18 5.4-9 3.3 5.4L14.4 10 21 18Z"/>');
    const PURSE = icon('<path d="M4.6 9h14.8l-1 11H5.6Z"/><path d="M9 9V6.8a3 3 0 0 1 6 0V9"/>');

    const doors = [
      { icon: HOUSE, name: 'An Audience',
        text: (title ? 'The ' + title : 'The County') + ' hears petitioners in the great hall on the first and third day of each week. Come without appointment; come sober.',
        link: '/petition', cta: 'Ask to be heard' },
      { icon: PEAK, name: 'The Pale Pass',
        text: 'The road to Skyrim, and whether it is open. Snow, tolls, escorts, and what the watch has seen on the high road this week.',
        link: '/pass', cta: 'Road and weather' },
      { icon: PURSE, name: 'Market & Charter',
        text: 'Stall rights, trade charters, and the county’s grants of land. What is held, by whom, and on what terms.',
        link: '/holdings', cta: 'See the rolls' }
    ];

    const body = `
<section class="hero haswindow" data-pass="${esc(passState.id)}">
  <canvas id="passwin" aria-label="A view north to the Pale Pass" role="img"></canvas>
  <i class="sill" aria-hidden="true"></i>
  <div class="heroin">
    <h2>The County of Bruma</h2>
    <p class="lede">Northernmost county of Cyrodiil. Keeper of the Pale Pass, and the last warm hall before Skyrim.</p>
    <div class="btnrow">
      <a class="btn go" href="/proclamations">Read the ${esc(seat && /countess/i.test(seatStyle) ? 'Countess’s' : 'County’s')} word</a>
      <a class="btn ghost" href="/who">Who sits at court</a>
    </div>
  </div>
</section>

<div class="rule">
  <div class="line"></div>
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z" fill="#E09A3E"/></svg>
  <div class="line"></div>
</div>

<div class="doors">
  ${doors.map(d => `<a class="door" href="${d.link}">
    ${d.icon}
    <h3>${esc(d.name)}</h3>
    <p>${esc(d.text)}</p>
    <span class="dcta">${esc(d.cta)} →</span>
  </a>`).join('')}
</div>

<div class="hallcols" style="margin-top:34px">
  <div>
    <section class="card wordcard">
      <div class="eyebrow" style="margin-bottom:8px">The word of ${esc(whose)}</div>
      ${word ? `<h2 class="wordtitle">${esc(word.title)}</h2>
      <div class="wordbody">${word.text.split(/\n{2,}/).slice(0, 3).map(para =>
        `<p>${esc(para.length > 420 ? para.slice(0, 420) + '…' : para)}</p>`).join('')}</div>
      <div class="sigline">
        <span class="sigseal"><svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
          <circle cx="17" cy="17" r="13"/><circle cx="17" cy="17" r="8.4"/>
          <path d="M17 9.6c2.3 3 3.8 4.6 3.8 6.8a3.8 3.8 0 0 1-7.6 0c0-2.2 1.5-3.8 3.8-6.8Z" fill="currentColor" stroke="none"/>
        </svg></span>
        <span class="signames"><b>${esc(word.hand || seatStyle + (seatName ? ' ' + seatName : ''))}</b>
        <i>Given at Castle Bruma${word.dated ? ', ' + esc(word.dated) : ''}</i></span>
      </div>
      <div class="btnrow" style="margin-top:20px"><a class="btn ghost" href="/proclamations/${esc(word.id)}">Read it in full</a>
      <a class="btn ghost" href="/proclamations">All proclamations</a></div>`
      : `<h2 class="wordtitle">Nothing is proclaimed</h2>
         <div class="wordbody"><p>The County has posted no word yet. When it does, it is posted here and on the
         door of the Great Hall at the same hour.</p></div>`}
    </section>
  </div>
  <aside>
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:12px">Lately proclaimed</div>
      ${later.length ? `<ul class="procl">${later.map(p => `<li>
        <a href="/proclamations/${esc(p.id)}">${esc(p.title)}</a>
        <span>${esc(p.dated || V.inworld(p.at))}</span>
      </li>`).join('')}</ul>`
      : V.empty('Nothing else has been proclaimed.')}
      <div class="btnrow" style="margin-top:14px"><a class="btn ghost small" href="/proclamations">All of them</a></div>
    </section>

    <section class="card tight passcard" data-pass="${esc(passState.id)}">
      <div class="eyebrow" style="margin-bottom:8px">The Pale Pass</div>
      <div class="pcstate">${esc(passState.name)}</div>
      <div class="pcnote">${pass.note ? esc(pass.note) : esc(passState.say)}</div>
      <div class="btnrow" style="margin-top:12px"><a class="btn ghost small" href="/pass">The notice</a></div>
    </section>
  </aside>
</div>

<section class="card" style="margin-top:22px">
  <div class="eyebrow" style="margin-bottom:6px">The Court of Bruma</div>
  <h3 style="margin:0 0 14px;font-size:23px">What is open to anyone</h3>
  <div class="choose">
    <a href="/proclamations"><h3>Proclamations</h3><p>The word of the County as it is given, posted here as it is posted on the door of the Great Hall.</p></a>
    <a href="/laws"><h3>Laws &amp; Charters</h3><p>The Lex Brumae, the legal code of the County, title by title. The law is not kept behind a door.</p></a>
    <a href="/the-guilds"><h3>The Guilds</h3><p>The four halls that hold charter, what each may do, and whose hand the County deals with.</p></a>
    <a href="/judgments"><h3>Judgments</h3><p>What the court has decided, once it has decided it.</p></a>
    <a href="/petitions"><h3>Petitions</h3><p>What the County has been asked, and what it said back. Every petition is answered.</p></a>
    <a href="/verify"><h3>Check a Paper</h3><p>Every writ, deed and licence carries a number. Give it here and be told whether the paper is genuine.</p></a>
  </div>
</section>

<section class="card">
  <h3 style="margin-top:0">Behind the hall door</h3>
  <p class="lede">The watch and its hours, the treasury, the gaol, the guild rolls and the matters still before the
  bench are kept for those who hold office in the County. What happens in Bruma is found out in Bruma.</p>
  ${req.user ? `<p><a class="btn ghost" href="/hall">Into the Great Hall</a></p>`
    : `<p><a class="btn ghost" href="/login">Enter the Hall</a></p>`}
</section>`;

    res.page({ title: '', body, active: '' });
  });

  app.get('/hall', (req, res) => {
    if (!req.user) return res.redirect('/login?to=/hall');
    const u = req.user;
    const mine = W.openShift(u.username);
    const myWeek = W.thisWeek().find(r => r.who === u.username);
    const court = Ct.open();
    const myCourt = Ct.mine(u.username).filter(m => m.stage !== 'judged' && m.stage !== 'withdrawn');
    const treas = O.can(u, 'treasread') ? T.summary() : null;
    const halls = V.navFor(u).filter(h => h.id !== 'hall');
    const desk = Desk.gather(u);
    const tax = O.can(u, 'treasread') ? Tax.summary() : null;

    const deskRows = desk.groups.map(g => `<div style="margin-top:18px">
    <div class="eyebrow" style="margin-bottom:6px">${esc(g.head)}</div>
    <div class="rows" style="margin:0">${g.items.map(i => `<div class="row"${i.urgent ? ' style="border-left:2px solid var(--accent);padding-left:12px;margin-left:-14px"' : ''}>
      <div class="main"><a href="${esc(i.link)}" style="font-family:var(--serif);font-size:18px">${esc(i.text)}</a>${i.note ? `<div class="hint">${esc(i.note)}</div>` : ''}</div>
      ${i.urgent ? '<div class="side"><span class="tag out">pressing</span></div>' : ''}
    </div>`).join('')}</div>
  </div>`).join('');

    const waiting = [];
    desk.groups.forEach(g => (g.items || []).forEach(i => {
      if (waiting.length < 3 && i.link) waiting.push({ what: String(i.text || '').slice(0, 60), href: i.link });
    }));
    const ravenAttr = waiting.length
      ? ' data-ravens="' + esc(JSON.stringify(waiting)) + '"' : '';

    const body = `
<section class="card"${ravenAttr} style="position:relative">
  <h2>Good day, ${esc(u.name)}</h2>
  <p class="lede">${esc(u.title)}${u.all ? ' · every door in the County stands open to you' : ''}</p>
</section>

<section class="card">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap">
    <h3 style="margin:0">Your desk</h3>
    <span class="hint" style="margin:0">${desk.count
      ? desk.count + (desk.count === 1 ? ' thing wants your hand' : ' things want your hand') + (desk.urgent ? ' · ' + desk.urgent + ' pressing' : '')
      : 'Nothing waits upon you.'}</span>
  </div>
  ${deskRows || '<p class="lede" style="margin-top:14px">The desk is clear. Nothing in the County is waiting on you.</p>'}
</section>

${O.can(u, 'watchclock') ? `<section class="card">
  <h3 style="margin-top:0">Your watch</h3>
  ${mine
    ? `<p>You are <b>on the watch</b> at <b>${esc(W.postName(mine.post))}</b>, since ${esc(V.when(mine.on))}.</p>
       <form method="post" action="/watch/off">${V.hidden(req.session.csrf)}
         <input type="hidden" name="back" value="/hall">
         <label for="hallnote">Anything to set down before you stand off?</label>
         <textarea id="hallnote" name="note" placeholder="Quiet watch. Nothing to report." style="min-height:70px"></textarea>
         <div class="btnrow"><button class="btn danger" type="submit">Clock off</button>
         <a class="btn ghost" href="/watch">The Watch</a></div>
       </form>`
    : `<p>You are not on the watch.</p>
       <form method="post" action="/watch/on">${V.hidden(req.session.csrf)}
         <input type="hidden" name="back" value="/hall">
         <label for="hallpost">Where do you stand?</label>
         <select id="hallpost" name="post">${W.POSTS.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
         <div class="btnrow"><button class="btn go" type="submit">Clock on</button>
         <a class="btn ghost" href="/watch">The Watch</a></div>
       </form>`}
  ${myWeek ? `<p class="hint" style="margin-top:12px">You have stood <b>${esc(V.hours(myWeek.minutes))}</b> across ${myWeek.shifts} ${myWeek.shifts === 1 ? 'shift' : 'shifts'} this week.</p>` : ''}
</section>` : ''}

<div class="grid two">
  ${treas ? `<section class="card tight">
    <div class="k" style="font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faded)">In the treasury</div>
    <div class="big">${V.septims(treas.balance)}<span style="font-size:15px;color:var(--faded)"> septims</span></div>
    <p class="hint">This month: ${V.septims(treas.monthIn)} in, ${V.septims(treas.monthOut)} out.</p>
    <p style="margin:10px 0 0"><a href="/treasury">Open the ledger</a></p>
  </section>` : ''}

  ${tax && tax.arrears ? `<section class="card tight">
    <div class="k" style="font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faded)">In arrears</div>
    <div class="big">${V.septims(tax.arrears)}<span style="font-size:15px;color:var(--faded)"> septims</span></div>
    <p class="hint">${tax.owing} ${tax.owing === 1 ? 'assessment unrendered' : 'assessments unrendered'}.</p>
    <p style="margin:10px 0 0"><a href="/taxes">Open the tax roll</a></p>
  </section>` : ''}

  <section class="card tight">
    <div class="k" style="font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faded)">Before the court</div>
    <div class="big">${O.can(u, 'courtsee') ? court.length : myCourt.length}</div>
    <p class="hint">${O.can(u, 'courtsee') ? 'matters waiting upon the County' : 'of your own matters still open'}</p>
    <p style="margin:10px 0 0"><a href="/court">Open the court roll</a></p>
  </section>
</div>

<section class="card">
  <h3 style="margin-top:0">The halls open to you</h3>
  <div class="choose">
    ${halls.map(h => `<a href="${h.href}"><h3>${esc(h.name)}</h3><p>${esc(hallNote(h.id))}</p></a>`).join('')}
    <a href="/me"><h3>My Papers</h3><p>Your office, what it opens, and your password.</p></a>
  </div>
</section>`;

    res.page({ title: 'The Great Hall', body, active: 'hall' });
  });

  app.get('/login', (req, res) => {
    if (req.user) return res.redirect('/hall');
    const to = String(req.query.to || '/hall');
    const flash = req.session.flash;
    req.session.flash = null;
    res.set('Cache-Control', 'no-store');
    res.send(V.doorPage({
      title: 'Enter the Hall',
      csrf: req.session.csrf,
      to: to.startsWith('/') && !to.startsWith('//') ? to : '/hall',
      flash
    }));
  });

  const tries = new Map();
  function knock(key, max, windowMs) {
    const now = Date.now();
    const row = tries.get(key);
    if (!row || now - row.at > windowMs) { tries.set(key, { n: 1, at: now }); return true; }
    row.n += 1;
    if (tries.size > 5000) tries.clear();
    return row.n <= max;
  }

  app.get('/audit.json', (req, res) => {
    const key = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!C.AUDIT_KEY || !key || key !== C.AUDIT_KEY) return res.status(404).type('text/plain').send('');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ site: 'bruma', name: 'County of Bruma', events: require('../lib/ledger').events(req.query.since, req.query.limit) });
  });

  app.post('/login', checkCsrf, (req, res) => {
    if (!req.session.knocker) req.session.knocker = Math.random().toString(36).slice(2, 12);
    if (!knock('door|' + req.session.knocker, 12, 15 * 60 * 1000)) {
      req.session.flash = { err: true, text: 'Too many words tried at this door. Come back in a quarter of an hour.' };
      return res.redirect('/login');
    }
    const u = U.authenticate(req.body.username, req.body.password);
    if (!u) {
      req.session.flash = { err: true, text: 'That name and word do not answer to one another.' };
      return res.redirect('/login');
    }
    tries.delete('door|' + req.session.knocker);
    req.session.username = u.username;
    req.session.seen = Date.now();
    require('../lib/ledger').note({ username: u.username, name: u.name }, 'entered the hall', '', 'entered');
    const to = String(req.body.to || '/hall');
    res.redirect(u.mustChange ? '/me/password' : (to.startsWith('/') && !to.startsWith('//') ? to : '/hall'));
  });

  app.post('/logout', checkCsrf, (req, res) => {
    if (req.user) require('../lib/ledger').note(req.user, 'left the hall', '', 'left');
    req.session.username = null;
    req.session.flash = { text: 'You have left the hall.' };
    res.redirect('/');
  });

  app.get('/me', (req, res) => {
    if (!req.user) return res.redirect('/login?to=/me');
    const u = req.user;
    const me = U.view(u.username);
    const office = O.get(u.office);
    const svc = Sv.record(u.username, me);
    const opens = u.all
      ? [['Everything', 'The whole County, every hall and every power in it.']]
      : (office ? office.perms.map(p => [O.PERM_NAME[p] || p, '']) : []);

    const body = `
<section class="card">
  <h2>${esc(u.name)}</h2>
  <p class="lede">${esc(u.title)}</p>
  <div class="rows">
    <div class="row"><div class="main">Name upon the rolls</div><div class="side">${esc(u.username)}</div></div>
    <div class="row"><div class="main">Office</div><div class="side">${esc(u.officeName)}</div></div>
    ${me && me.lastLogin ? `<div class="row"><div class="main">Last entered the hall</div><div class="side">${esc(V.when(me.lastLogin))}</div></div>` : ''}
  </div>
</section>

<section class="card">
  <h3 style="margin-top:0">Your service</h3>
  <div class="tiles">
    <div class="stat"><div class="k">In service</div><div class="v">${svc.days}</div><div class="n">days</div></div>
    <div class="stat"><div class="k">Hours on the watch</div><div class="v">${svc.watch.hours}</div><div class="n">${svc.watch.shifts} ${svc.watch.shifts === 1 ? 'shift' : 'shifts'}</div></div>
    <div class="stat"><div class="k">Commendations</div><div class="v">${svc.commendations}</div><div class="n">upon your record</div></div>
    <div class="stat"><div class="k">Entries</div><div class="v">${svc.entries.length}</div><div class="n">upon your record</div></div>
  </div>
  <div class="btnrow" style="margin-top:16px">
    <a class="btn ghost" href="/service/${esc(u.username)}">Read your record</a>
    <a class="btn ghost" href="/service/${esc(u.username)}/certificate" target="_blank" rel="noopener">Your certificate of service \u2197</a>
  </div>
</section>

<section class="card">
  <h3 style="margin-top:0">What your office opens</h3>
  ${opens.length ? `<ul class="plain">${opens.map(o => `<li>${esc(o[0])}</li>`).join('')}</ul>` : V.empty('Your office opens nothing yet. Ask the Steward.')}
</section>

<section class="card">
  <h3 style="margin-top:0">Change your word</h3>
  <form method="post" action="/me/password">${V.hidden(req.session.csrf)}
    <div class="fields">
      <div><label for="old">Your word now</label><input id="old" name="old" type="password" autocomplete="current-password" required></div>
      <div><label for="next">A new word</label><input id="next" name="next" type="password" autocomplete="new-password" required></div>
    </div>
    <p class="hint">Ten characters at the least.</p>
    <div class="btnrow"><button class="btn" type="submit">Set it</button></div>
  </form>
</section>`;

    res.page({ title: 'My Papers', body, active: '' });
  });

  app.get('/me/password', (req, res) => {
    if (!req.user) return res.redirect('/login');
    if (!req.user.mustChange) return res.redirect('/me');
    const body = `
<section class="card" style="max-width:460px;margin:0 auto">
  <h2>Set your own word</h2>
  <p class="lede">You were given a word to get in. Choose your own before you go further.</p>
  <form method="post" action="/me/password">${V.hidden(req.session.csrf)}
    <label for="old">The word you were given</label>
    <input id="old" name="old" type="password" autocomplete="current-password" required autofocus>
    <label for="next">Your own word</label>
    <input id="next" name="next" type="password" autocomplete="new-password" required>
    <p class="hint">Ten characters at the least.</p>
    <div class="btnrow"><button class="btn" type="submit">Set it</button></div>
  </form>
</section>`;
    res.page({ title: 'Set your word', body });
  });

  app.post('/me/password', checkCsrf, wrap((req, res) => {
    if (!req.user) return res.redirect('/login');
    const ok = U.authenticate(req.user.username, req.body.old);
    if (!ok) {
      req.session.flash = { err: true, text: 'That is not your word as it stands.' };
      return res.redirect(req.user.mustChange ? '/me/password' : '/me');
    }
    try {
      U.update(req.user.username, { password: req.body.next, mustChange: false });
      req.session.flash = { text: 'Your word is set.' };
      res.redirect('/hall');
    } catch (e) {
      req.session.flash = { err: true, text: e.message };
      res.redirect(req.user.mustChange ? '/me/password' : '/me');
    }
  }));

  app.get(['/favicon.ico', '/favicon.svg'], (req, res) => res.redirect(301, '/bruma-seal.png'));
};

function hallNote(id) {
  return {
    watch: 'Clock on and off, and read the shift log and the hours.',
    property: 'The county map, every holding on it and who holds them.',
    treasury: 'The ledger of the County — money in, money out, and the balance.',
    guilds: 'The Synod, the Miners and the Fighters: charters, rolls and tithes.',
    court: 'Matters laid, hearings set and judgments given.',
    archive: 'Every document the County has set down.'
  }[id] || '';
}
