const V = require('../lib/views');
const U = require('../lib/users');
const O = require('../lib/offices');
const W = require('../lib/watch');
const P = require('../lib/property');
const T = require('../lib/treasury');
const Ct = require('../lib/court');
const A = require('../lib/archive');
const G = require('../lib/guilds');
const Pr = require('../lib/proclaim');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back }) {

  app.get('/', (req, res) => {
    const prop = P.summary();
    const pass = Pr.pass();
    const passState = Pr.STATE_BY_ID[pass.state] || Pr.STATES[0];
    const word = Pr.latest();
    const judged = Ct.all().filter(m => m.stage === 'judged' && m.judgment).length;

    const body = `
<section class="hero">
  <div class="heroin">
    <div class="eyebrow">The County Seat · Jerall Mountains</div>
    <h2>The County of Bruma</h2>
    <p class="lede">Northernmost county of Cyrodiil. Keeper of the Pale Pass, and the last warm hall before Skyrim.</p>
    <div class="btnrow">
      ${req.user
        ? `<a class="btn" href="/hall">Into the Great Hall</a><a class="btn ghost" href="/court">Who sits at court</a>`
        : `<a class="btn" href="/proclamations">Read the County’s word</a><a class="btn ghost" href="/login">Enter the Hall</a>`}
    </div>
  </div>
</section>

<div class="rule">
  <div class="line"></div>
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z" fill="#E09A3E"/></svg>
  <div class="line"></div>
</div>

<div class="grid three" style="margin-top:28px">
  <div class="stat"><div class="k">The Pale Pass</div>
    <div class="v" style="font-size:24px;line-height:1.35">${esc(passState.name)}</div>
    <div class="n">${pass.looked ? 'last looked ' + esc(V.when(pass.looked)) : 'no word yet'} · <a href="/pass">the notice</a></div></div>
  <div class="stat"><div class="k">Holdings on the roll</div><div class="v">${prop.total}</div>
    <div class="n">${prop.byState.vacant || 0} standing vacant · <a href="/holdings">who holds what</a></div></div>
  <div class="stat"><div class="k">Judgments given</div><div class="v">${judged}</div>
    <div class="n">posted by the court · <a href="/judgments">read them</a></div></div>
</div>

${word ? `<section class="card" style="margin-top:20px">
  <div class="eyebrow" style="margin-bottom:12px">The latest word of the County</div>
  <h3 style="margin-top:0;font-size:27px">${esc(word.title)}</h3>
  <p class="hint" style="margin:0 0 14px">${esc(word.hand)}${word.dated ? ' · ' + esc(word.dated) : ''}</p>
  <p style="color:var(--muted);line-height:1.7">${esc(word.text.slice(0, 340))}${word.text.length > 340 ? '…' : ''}</p>
  <div class="btnrow"><a class="btn ghost" href="/proclamations/${esc(word.id)}">Read it in full</a>
  <a class="btn ghost" href="/proclamations">All proclamations</a></div>
</section>` : ''}

<section class="card" style="margin-top:20px">
  <h3 style="margin-top:0">Open to anyone</h3>
  <div class="choose">
    <a href="/proclamations"><h3>Proclamations</h3><p>The word of the County as it is given, posted here as it is posted on the door of the Great Hall.</p></a>
    <a href="/pass"><h3>The Pale Pass</h3><p>Whether the road north may be travelled, on what footing, and what the watch saw on it last.</p></a>
    <a href="/laws"><h3>Laws &amp; Charters</h3><p>What the County holds everyone to, and the charters it has granted. The law is not kept behind a door.</p></a>
    <a href="/holdings"><h3>Who Holds What</h3><p>The holdings of Bruma and who is seized of them.</p></a>
    <a href="/judgments"><h3>Judgments</h3><p>What the court has decided, once it has decided it.</p></a>
    <a href="/who"><h3>The Court</h3><p>The offices of the County and who holds them. Any of them may be written to.</p></a>
    <a href="/petition"><h3>Lay a Petition</h3><p>Anyone under the County’s protection may lay a matter before it, with no account and no leave asked.</p></a>
  </div>
</section>

<section class="card">
  <h3 style="margin-top:0">Behind the hall door</h3>
  <p class="lede">The watch and its hours, the treasury, the guild rolls and the matters still before the bench
  are kept for those who hold office in the County. What happens in Bruma is found out in Bruma.</p>
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

    const body = `
<section class="card">
  <h2>Good day, ${esc(u.name)}</h2>
  <p class="lede">${esc(u.title)}${u.all ? ' · every door in the County stands open to you' : ''}</p>
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
    const body = `
<section class="card" style="max-width:460px;margin:0 auto">
  <h2>Enter the Hall</h2>
  <p class="lede">The County knows its own. Give your name and word.</p>
  <form method="post" action="/login">${V.hidden(req.session.csrf)}
    <input type="hidden" name="to" value="${esc(to)}">
    <label for="username">Name upon the rolls</label>
    <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" autofocus required>
    <label for="password">Word</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <div class="btnrow"><button class="btn" type="submit">Enter</button></div>
  </form>
  <p class="hint" style="margin-top:16px">No account? The Steward or the Count makes them. Ask in the hold.</p>
</section>`;
    res.page({ title: 'Enter the Hall', body });
  });

  app.post('/login', checkCsrf, (req, res) => {
    const u = U.authenticate(req.body.username, req.body.password);
    if (!u) {
      req.session.flash = { err: true, text: 'That name and word do not answer to one another.' };
      return res.redirect('/login');
    }
    req.session.username = u.username;
    const to = String(req.body.to || '/hall');
    res.redirect(u.mustChange ? '/me/password' : (to.startsWith('/') && !to.startsWith('//') ? to : '/hall'));
  });

  app.post('/logout', checkCsrf, (req, res) => {
    req.session.username = null;
    req.session.flash = { text: 'You have left the hall.' };
    res.redirect('/');
  });

  app.get('/me', (req, res) => {
    if (!req.user) return res.redirect('/login?to=/me');
    const u = req.user;
    const me = U.view(u.username);
    const office = O.get(u.office);
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
