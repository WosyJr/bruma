const V = require('../lib/views');
const O = require('../lib/offices');
const G = require('../lib/guilds');
const Lad = require('../lib/guildladder');
const T = require('../lib/treasury');
const Tax = require('../lib/taxes');

const esc = V.esc;

module.exports = function (app, { checkCsrf, wrap, back, need, needAny }) {

  app.get('/guilds', needAny('guildsee', 'guildown'), (req, res) => {
    const u = req.user;
    const mine = O.guildOf(u);
    const feed = G.recent(8);

    const hallCard = g => {
      const may = O.maySeeGuild(u, g.id);
      const s = G.hallSummary(g.id);
      const h = Lad.hall(g.id);
      const charter = G.charterFor(g.id);
      const wants = !s.steward;
      return `<article class="hallcard${may ? '' : ' shut'}${wants ? ' wants' : ''}">
      <div class="hcchip"><span class="tag ${wants ? 'gold' : charter ? 'in' : 'out'}">${wants ? 'Steward wanted' : charter ? 'Chartered' : 'No charter'}</span></div>
      <h3>${esc(g.name)}</h3>
      <div class="hcseat">${esc(h.hall)} · ${esc(h.seat)}</div>
      <p class="hcblurb">${esc(h.blurb)}${h.under ? ' ' + esc(h.under.charAt(0).toUpperCase() + h.under.slice(1)) + '.' : ''}</p>
      <div class="hcstats">
        <div><span class="hck">Steward</span><span class="hcv${wants ? ' vacant' : ''}">${esc(s.steward || 'seat vacant')}</span></div>
        <div><span class="hck">On the roll</span><span class="hcv">${s.onRoll}</span></div>
        <div><span class="hck">Contracts open</span><span class="hcv">${s.contractsOpen}</span></div>
      </div>
      <div class="hcbtns">
        ${may
          ? `<a class="btn go" href="/guilds/${esc(g.id)}">Enter the hall</a>
             <a class="btn ghost" href="/guilds/${esc(g.id)}#charter">Read the charter</a>`
          : `<span class="btn ghost" aria-disabled="true" style="opacity:.5">Not your hall</span>
             <a class="btn ghost" href="/the-guilds">Read the charter</a>`}
      </div>
      ${mine === g.id ? '<div class="hcyours">Yours</div>' : ''}
    </article>`;
    };

    const body = `
<section class="card hallhead">
  <div class="eyebrow">Chartered under the Guilds Act</div>
  <h2 style="margin:4px 0 8px">The Guilds of Bruma</h2>
  <p class="lede" style="margin:0;max-width:640px">Four halls hold charters in this county. Each keeps its own roll,
  its own ranks and its own contracts. Sign in with your guild to see yours; the county sees only what the charter
  says it may.</p>
</section>

<div class="hallgrid">${O.GUILDS.map(hallCard).join('')}</div>

<div class="hallcols" style="margin-top:22px">
  <div>
    <section class="card">
      <div class="eyebrow" style="margin-bottom:6px">Signing in</div>
      <h3 style="margin:0 0 12px;font-size:23px">One name, whichever halls you hold</h3>
      <p class="lede" style="margin:0 0 18px">You sign in once as yourself. What you then see is decided by the rolls:
      a ${esc(Lad.ladder('miners')[2].name)} of the Miners sees the Miners’ contracts, a Steward sees the whole hall,
      and the Countess sees every roll in the county.</p>
      <ul class="rulelist">
        <li>Belong to more than one guild — the halls simply both appear.</li>
        <li>A Steward promotes from the roll, and the rank changes what opens.</li>
        <li>Expelled under the charter, and the hall closes the same hour.</li>
      </ul>
      ${O.can(u, 'officers') ? '<div class="btnrow" style="margin-top:18px"><a class="btn go" href="/officers">Put someone on the rolls</a></div>' : ''}
    </section>
  </div>
  <aside>
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:12px">Lately on the rolls</div>
      ${feed.length ? `<div class="feed">${feed.map(f => `<div class="fd">
        <b>${esc(f.text)}</b>
        <i>${esc(V.inworld(f.at))} · ${esc(f.guildName)}</i>
      </div>`).join('')}</div>` : V.empty('Nothing has moved on the rolls yet.')}
    </section>
  </aside>
</div>`;
    res.page({ title: 'The Guilds', body, active: 'guilds', wide: true });
  });

  app.get('/guilds/:id', needAny('guildsee', 'guildown'), (req, res) => {
    const u = req.user;
    const g = O.GUILD_BY_ID[req.params.id];
    if (!g) return res.say('No such guild', 'No body of that name holds charter in the County.', 404);
    if (!O.maySeeGuild(u, g.id)) return res.say('That door is not yours to open', 'That guild roll is not open to your office.', 403);

    const roll = G.roll(g.id);
    const charter = G.charterFor(g.id);
    const seat = G.seat(g.id);
    const s = G.hallSummary(g.id);
    const ladder = Lad.ladder(g.id);
    const duties = Lad.duties(g.id);
    const rend = Lad.renders(g.id);
    const open = G.openContracts(g.id);
    const struck = G.struckRoll(g.id);
    const taken = G.contracts(g.id).filter(c => c.state === 'taken').slice(0, 8);

    const mayKeep = O.can(u, 'guildsee') || (O.can(u, 'guildown') && O.guildOf(u) === g.id);
    const mayCharter = O.can(u, 'guildcharter');
    const mayPurse = O.can(u, 'treasread') || (O.can(u, 'guildpurse') && O.guildOf(u) === g.id);

    const ledger = mayPurse ? T.forGuild(g.id) : [];
    const rendered = ledger.filter(r => r.way === 'in').reduce((n, r) => n + r.amount, 0);
    const paidOut = ledger.filter(r => r.way === 'out').reduce((n, r) => n + r.amount, 0);
    const assessments = mayPurse ? Tax.withState().filter(t => t.guild === g.id || (t.who || '').toLowerCase() === g.name.toLowerCase()) : [];
    const owing = assessments.filter(a => a.state === 'owing' || a.state === 'part')
      .reduce((n, a) => n + Math.max(0, (Number(a.amount) || 0) - (Number(a.paid) || 0)), 0);

    const mineStep = (() => {
      const me = roll.find(m => m.name.toLowerCase() === String(u.name || '').toLowerCase());
      return me ? me.step : -1;
    })();

    const body = `
<section class="card hallhead">
  <div class="hh">
    <div>
      <div class="eyebrow">${esc(Lad.section(g.id))}</div>
      <h2 style="margin:4px 0 8px">${esc(g.name)}</h2>
      <p class="lede" style="margin:0;max-width:560px">${esc(Lad.lede(g.id))}</p>
    </div>
    <div class="hhbtns">
      <a class="btn ghost" href="#charter">The charter</a>
      ${open.length ? '<a class="btn go" href="#contracts">Take a contract</a>' : ''}
    </div>
  </div>
</section>

<div class="tiles four">
  <div class="stat"><div class="k">On the roll</div><div class="v">${s.onRoll}</div></div>
  <div class="stat"><div class="k">Contracts open</div><div class="v">${s.contractsOpen}</div></div>
  <div class="stat"><div class="k">${esc(rend.label)}</div><div class="v">${s.rendered}</div></div>
  <div class="stat"><div class="k">Steward</div><div class="v${seat.steward ? '' : ' vacant'}">${esc(seat.steward || 'Vacant')}</div></div>
</div>

<div class="hallcols">
  <div>
    <section class="card">
      <div class="eyebrow" style="margin-bottom:6px">The ladder</div>
      <p class="hint" style="margin:0 0 16px">Ten ranks, as the charter sets them down. Promotions are granted by the
      Steward upon demonstrated merit, not merely time served.</p>
      <ol class="ladder">
        ${ladder.map(r => {
          const here = r.step === mineStep;
          const held = roll.filter(m => m.rank === r.id).length;
          return `<li class="rung${here ? ' here' : ''}">
            <span class="rl">${esc(r.letter)}</span>
            <span class="rn"><b>${esc(r.name)}</b><i>${esc(r.tier)}</i></span>
            <span class="rd">${esc(r.note)}</span>
            <span class="rh">${here ? '<em>you</em>' : (held ? held : '')}</span>
          </li>`;
        }).join('')}
      </ol>
    </section>

    <section class="card">
      <div class="eyebrow" style="margin-bottom:6px">Further duties</div>
      <p class="hint" style="margin:0 0 14px">${esc(ladder[6].name)} and above may be given a second office alongside their rank.</p>
      <div class="duties">
        ${duties.map(d => `<div class="duty">
          <b>${esc(d.name)}</b>
          <span>${esc(d.note)}</span>
          ${seat.duties && seat.duties[d.name] ? `<em>${esc(seat.duties[d.name])}</em>` : '<em class="vacant">Vacant</em>'}
        </div>`).join('')}
      </div>
    </section>

    <section class="card" id="charter">
      <div class="eyebrow" style="margin-bottom:6px">The charter</div>
      ${charter
        ? `<h3 style="margin:4px 0 12px">${esc(charter.title)}</h3>
           <div style="white-space:pre-wrap;line-height:1.72;color:var(--muted)">${esc(charter.text)}</div>
           <p class="hint" style="margin-top:16px">Laid by ${esc(charter.byName)} · ${esc(V.when(charter.at))}</p>`
        : V.empty('No charter has been laid for this guild. Until one is, the hall holds no standing in the County.')}
      ${mayCharter ? `<details class="fold" style="margin-top:18px">
        <summary>${charter ? 'Amend the charter' : 'Lay a charter'}</summary>
        <form method="post" action="/guilds/${esc(g.id)}/charter">${V.hidden(req.session.csrf)}
          <label for="ctitle">Title</label>
          <input id="ctitle" name="title" type="text" maxlength="160" value="${esc(charter ? charter.title : g.name + ' — Charter')}">
          <label for="ctext">What it says</label>
          <textarea id="ctext" name="text" rows="10" maxlength="20000">${esc(charter ? charter.text : '')}</textarea>
          <div class="btnrow"><button class="btn" type="submit">Set it down</button></div>
        </form>
      </details>` : ''}
    </section>

    ${mayPurse ? `<section class="card">
      <div class="eyebrow" style="margin-bottom:6px">What this hall renders</div>
      <p class="hint" style="margin:0 0 14px">What your guild has paid the County and what it still owes. The County’s
      own ledger is not open here.</p>
      <div class="tiles">
        <div class="stat"><div class="k">Rendered in all</div><div class="v">${V.septims(rendered)}</div><div class="n">septims to the County</div></div>
        <div class="stat"><div class="k">Had back</div><div class="v">${V.septims(paidOut)}</div><div class="n">septims paid out to you</div></div>
        <div class="stat"><div class="k">Owing now</div><div class="v${owing ? ' vacant' : ''}">${V.septims(owing)}</div><div class="n">septims unrendered</div></div>
      </div>
      ${assessments.length ? `<h3 style="margin-top:22px">Laid upon this hall</h3>${V.table([
        { head: 'No.', num: true, cell: a => a.no },
        { head: 'What', cell: a => esc(Tax.kindName(a.kind)) },
        { head: 'For', cell: a => esc(a.period) || '—' },
        { head: 'Laid', num: true, cell: a => V.septims(a.amount) },
        { head: 'Rendered', num: true, cell: a => V.septims(a.paid || 0) },
        { head: 'Standing', cell: a => `<span class="tag ${a.state === 'rendered' ? 'in' : a.state === 'forgiven' ? '' : 'out'}">${esc(a.state)}</span>` }
      ], assessments)}` : ''}
      ${ledger.length ? `<h3 style="margin-top:22px">Rendered and received</h3>${V.table([
        { head: 'When', cell: r => esc(V.when(r.at)) },
        { head: 'Way', cell: r => `<span class="tag ${r.way}">${r.way === 'in' ? 'rendered' : 'had back'}</span>` },
        { head: 'Septims', num: true, cell: r => V.septims(r.amount) },
        { head: 'For what', cell: r => esc(r.reason) }
      ], ledger.slice(0, 20))}` : V.empty('Nothing has passed between this hall and the County yet.')}
    </section>` : ''}
  </div>

  <aside>
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">The roll</div>
      ${roll.length ? `<div class="rollrows">${roll.map(m => mayKeep ? `<details class="rmem">
        <summary>
          <span class="rrn"><b>${esc(m.name)}</b><i>${esc(m.rankName)}${m.trade ? ' · ' + esc(m.trade) : ''}</i></span>
          <span class="tag ${(G.STANDING_BY_ID[m.standing] || {}).tag || ''}">${esc(G.standingName(m.standing))}</span>
        </summary>
        <form method="post" action="/guilds/${esc(g.id)}/members/${esc(m.id)}">${V.hidden(req.session.csrf)}
          <label><span>Rank</span><select name="rank">${ladder.map(r =>
            `<option value="${r.id}"${r.id === m.rank ? ' selected' : ''}>${esc(r.letter)} — ${esc(r.name)}</option>`).join('')}</select></label>
          <label><span>Standing</span><select name="standing">${G.STANDINGS.map(x =>
            `<option value="${x.id}"${x.id === m.standing ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label><span>Trade</span><input name="trade" type="text" maxlength="100" value="${esc(m.trade)}"></label>
          <div class="btnrow"><button class="btn small" type="submit">Set it down</button></div>
        </form>
        <form method="post" action="/guilds/${esc(g.id)}/members/${esc(m.id)}/strike" class="strikerow">${V.hidden(req.session.csrf)}
          <button class="btn danger small" type="submit">Strike from the roll</button>
          <span class="hint">They come off the roll. The record is kept and can be put back.</span>
        </form>
      </details>` : `<div class="rr">
        <div class="rrn"><b>${esc(m.name)}</b><i>${esc(m.rankName)}${m.trade ? ' · ' + esc(m.trade) : ''}</i></div>
        <span class="tag ${(G.STANDING_BY_ID[m.standing] || {}).tag || ''}">${esc(G.standingName(m.standing))}</span>
      </div>`).join('')}</div>` : V.empty('Nobody stands on this roll.')}
      ${mayKeep && struck.length ? `<details class="fold" style="margin-top:14px">
        <summary>Struck from the roll · ${struck.length}</summary>
        <div class="rollrows" style="margin-top:12px">${struck.map(m => `<div class="rr">
          <div class="rrn"><b>${esc(m.name)}</b><i>${esc(m.rankName)}${
            m.amended ? ' · struck by ' + esc(m.amended.by) : ''}</i></div>
          <span class="strikebtns">
            <form method="post" action="/guilds/${esc(g.id)}/members/${esc(m.id)}" class="inline">${V.hidden(req.session.csrf)}
              <input type="hidden" name="struck" value=""><button class="btn ghost small" type="submit">Put back</button></form>
            ${mayCharter ? `<form method="post" action="/guilds/${esc(g.id)}/members/${esc(m.id)}/remove" class="inline">${V.hidden(req.session.csrf)}
              <button class="btn ghost small" type="submit">Erase</button></form>` : ''}
          </span>
        </div>`).join('')}</div>
      </details>` : ''}
      ${mayKeep ? `<details class="fold" style="margin-top:14px">
        <summary>Admit someone</summary>
        <form method="post" action="/guilds/${esc(g.id)}/admit">${V.hidden(req.session.csrf)}
          <label for="mname">Their name</label>
          <input id="mname" name="name" type="text" maxlength="100" required>
          <label for="mgrade">At what rank</label>
          <select id="mgrade" name="grade">${ladder.map(r =>
            `<option value="${r.id}"${r.id === 'a' ? ' selected' : ''}>${esc(r.letter)} — ${esc(r.name)}</option>`).join('')}</select>
          <label for="mtrade">Their trade, if it is worth saying</label>
          <input id="mtrade" name="trade" type="text" maxlength="100">
          <div class="btnrow"><button class="btn" type="submit">Admit them</button></div>
        </form>
      </details>` : ''}
    </section>

    <section class="card tight" id="contracts">
      <div class="eyebrow" style="margin-bottom:10px">Contracts open</div>
      ${open.length ? `<div class="contracts">${open.map(c => `<div class="ct">
        <b>${esc(c.title)}</b>
        <i>${esc(c.cat) || 'Guild work'}${c.standing ? ' · standing order' : ''}${c.fee ? ' · ' + V.septims(c.fee) + ' septims' : ''}</i>
        ${mayKeep ? `<form method="post" action="/guilds/${esc(g.id)}/contracts/${esc(c.id)}" class="inline">${V.hidden(req.session.csrf)}
          <input type="hidden" name="state" value="taken">
          <input name="takenBy" type="text" maxlength="120" placeholder="Who takes it" required>
          <button class="btn ghost small" type="submit">Take it →</button></form>` : '<span class="takeit">Take it →</span>'}
      </div>`).join('')}</div>` : V.empty('No contract stands open.')}
      ${mayKeep ? `<details class="fold" style="margin-top:14px">
        <summary>Post a contract</summary>
        <form method="post" action="/guilds/${esc(g.id)}/contracts">${V.hidden(req.session.csrf)}
          <label for="ctitle2">What is wanted</label>
          <input id="ctitle2" name="title" type="text" maxlength="160" required placeholder="Reopen the Plundered Mine">
          <label for="ccat">Under what head</label>
          <input id="ccat" name="cat" type="text" maxlength="80" placeholder="Mines & caves">
          <label for="cfee">Fee in septims</label>
          <input id="cfee" name="fee" type="number" min="0" step="10" value="0">
          <label for="cnote">Anything further</label>
          <textarea id="cnote" name="note" rows="2" maxlength="2000"></textarea>
          <label class="check"><input type="checkbox" name="standing" value="1"> A standing order, not a one-off</label>
          <div class="btnrow"><button class="btn" type="submit">Post it</button></div>
        </form>
      </details>` : ''}
    </section>

    ${taken.length ? `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">Taken</div>
      <div class="rollrows">${taken.map(c => `<div class="rr">
        <div class="rrn"><b>${esc(c.title)}</b><i>${esc(c.takenBy)}</i></div>
        ${mayKeep ? `<form method="post" action="/guilds/${esc(g.id)}/contracts/${esc(c.id)}" class="inline">${V.hidden(req.session.csrf)}
          <input type="hidden" name="state" value="done"><button class="btn ghost small" type="submit">Done</button></form>` : ''}
      </div>`).join('')}</div>
    </section>` : ''}

    ${!seat.steward ? `<section class="card callout">
      <b>The hall wants a Steward</b>
      <p>Until one is confirmed, the Countess holds the seat and no promotions past ${esc(ladder[2].name)} may be granted.</p>
      ${mayCharter ? `<form method="post" action="/guilds/${esc(g.id)}/seat">${V.hidden(req.session.csrf)}
        <input name="steward" type="text" maxlength="120" placeholder="Name the Steward" required>
        <div class="btnrow"><button class="btn ghost small" type="submit">Put a name to the Countess →</button></div>
      </form>` : '<p class="hint">Put a name to the Countess.</p>'}
    </section>` : mayCharter ? `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">The seat</div>
      <form method="post" action="/guilds/${esc(g.id)}/seat">${V.hidden(req.session.csrf)}
        <label for="stw">Steward</label>
        <input id="stw" name="steward" type="text" maxlength="120" value="${esc(seat.steward)}">
        <label for="rnd">${esc(rend.label)}</label>
        <input id="rnd" name="rendered" type="number" min="0" step="1" value="${seat.rendered}">
        <div class="btnrow"><button class="btn ghost small" type="submit">Set it</button></div>
      </form>
    </section>` : ''}

    <section class="card tight">
      <div class="btnrow" style="flex-direction:column;align-items:stretch">
        <a class="btn ghost" href="/guilds">All the guilds</a>
        <a class="btn ghost" href="/the-guilds">What the public sees</a>
      </div>
    </section>
  </aside>
</div>`;
    res.page({ title: g.name, body, active: 'guilds', wide: true });
  });

  app.post('/guilds/:id/admit', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    const g = O.GUILD_BY_ID[req.params.id];
    try {
      if (!g || !O.maySeeGuild(req.user, req.params.id)) throw new Error('That roll is not yours to keep.');
      const m = G.admit(req.params.id, req.body, req.user);
      req.session.flash = { text: m.name + ' is admitted to ' + g.name + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id);
  }));

  app.post('/guilds/:id/members/:mid', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    try {
      if (!O.maySeeGuild(req.user, req.params.id)) throw new Error('That roll is not yours to keep.');
      const patch = Object.assign({}, req.body);
      const putBack = patch.struck !== undefined && !patch.struck;
      if (patch.struck !== undefined) patch.struck = !!patch.struck;
      const m = G.amendMember(req.params.mid, patch, req.user);
      req.session.flash = { text: putBack ? m.name + ' is back upon the roll.' : 'The roll is amended.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id);
  }));

  app.post('/guilds/:id/members/:mid/strike', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    try {
      if (!O.maySeeGuild(req.user, req.params.id)) throw new Error('That roll is not yours to keep.');
      const m = G.amendMember(req.params.mid, { struck: true }, req.user);
      req.session.flash = { text: m.name + ' is struck from the roll. The record is kept.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id);
  }));

  app.post('/guilds/:id/members/:mid/remove', checkCsrf, need('guildcharter'), wrap((req, res) => {
    try {
      if (!O.maySeeGuild(req.user, req.params.id)) throw new Error('That roll is not yours to keep.');
      const m = G.removeMember(req.params.mid);
      req.session.flash = { text: m.name + ' is erased from the book entirely.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id);
  }));

  app.post('/guilds/:id/contracts', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    try {
      if (!O.maySeeGuild(req.user, req.params.id)) throw new Error('That hall is not yours to keep.');
      const c = G.postContract(req.params.id, req.body, req.user);
      req.session.flash = { text: 'Contract posted: ' + c.title + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id + '#contracts');
  }));

  app.post('/guilds/:id/contracts/:cid', checkCsrf, needAny('guildsee', 'guildown'), wrap((req, res) => {
    try {
      if (!O.maySeeGuild(req.user, req.params.id)) throw new Error('That hall is not yours to keep.');
      const c = G.setContract(req.params.cid, req.body, req.user);
      req.session.flash = { text: c.state === 'taken' ? c.takenBy + ' has taken it.' : 'The contract is set down as ' + c.state + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id + '#contracts');
  }));

  app.post('/guilds/:id/seat', checkCsrf, need('guildcharter'), wrap((req, res) => {
    try { G.setSeat(req.params.id, req.body, req.user); req.session.flash = { text: 'The seat is set.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id);
  }));

  app.post('/guilds/:id/charter', checkCsrf, need('guildcharter'), wrap((req, res) => {
    try { G.setCharter(req.params.id, req.body, req.user); req.session.flash = { text: 'The charter is set down.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/guilds/' + req.params.id + '#charter');
  }));
};
