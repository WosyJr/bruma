const V = require('./views');
const T = require('./town');
const esc = V.esc;
const hidden = V.hidden;

const WIN = [[40, 206], [86, 206], [60, 232], [140, 214], [178, 214], [214, 170], [244, 170], [214, 210], [244, 210], [300, 196], [350, 196], [324, 226], [400, 210], [438, 210], [472, 140], [472, 180], [520, 206], [570, 206], [545, 232], [614, 224]];
const LAMPS = [30, 150, 270, 390, 510, 620];
const ORDER = [5, 9, 1, 16, 12, 3, 14, 7, 18, 10, 0, 13, 6, 17, 2, 11, 15, 4, 19, 8];

function scene(lit, names, lamps, built) {
  const has = f => built.includes(f);
  const litSet = new Set(ORDER.slice(0, Math.min(lit, WIN.length)));
  const nameAt = {};
  ORDER.slice(0, Math.min(lit, WIN.length)).forEach((w, i) => { if (names[i]) nameAt[w] = names[i]; });
  return `<svg class="townscene" viewBox="0 0 640 300" role="img" aria-label="Bruma at night: ${lit} ${lit === 1 ? 'window' : 'windows'} lit and ${lamps} ${lamps === 1 ? 'lamp' : 'lamps'} burning on the wall">
  <defs><filter id="tglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#2A2A36"/></linearGradient></defs>
  <rect width="640" height="300" fill="url(#tsky)"/>
  <g fill="#E8ECF2" opacity=".7"><circle cx="40" cy="30" r="1"/><circle cx="120" cy="60" r="1.2"/><circle cx="300" cy="22" r="1"/><circle cx="410" cy="48" r="1.3"/><circle cx="560" cy="26" r="1"/><circle cx="600" cy="70" r="1"/><circle cx="200" cy="40" r=".8"/><circle cx="350" cy="64" r=".9"/></g>
  <circle cx="540" cy="52" r="18" fill="#E9E6D8" opacity=".9"/>
  <path d="M0 170 L80 110 L150 150 L230 90 L320 140 L400 80 L480 130 L560 95 L640 140 L640 300 L0 300Z" fill="#2E3440" opacity=".7"/>
  <g fill="#3A2E24" stroke="#1A120C" stroke-width="2">
    <path d="M20 300 V190 L70 150 L120 190 V300Z"/><path d="M120 300 V200 L160 168 L200 200 V300Z"/>
    <path d="M200 300 V150 h70 V300Z"/><path d="M190 152 L235 112 L280 152Z" fill="#4A3A2C"/>
    <path d="M280 300 V180 L330 140 L380 180 V300Z"/><path d="M380 300 V196 L420 166 L460 196 V300Z"/>
    <path d="M460 300 V120 h40 V300Z"/><path d="M452 122 L480 80 L508 122Z" fill="#4A3A2C"/>
    <path d="M500 300 V190 L550 155 L600 190 V300Z"/><path d="M600 300 V210 L630 188 L640 196 V300Z"/>
  </g>
  ${has('bell') ? '<g><rect x="219" y="66" width="32" height="48" fill="#4A3A2C" stroke="#1A120C" stroke-width="2"/><path d="M214 68 L235 38 L256 68Z" fill="#5A4632" stroke="#1A120C" stroke-width="2"/><path d="M228 82 a7 7 0 0 1 14 0 v10 h-14Z" fill="#160F0A"/><path d="M231 86 q4 -6 8 0 v6 h-8z" fill="#D8B45A"/></g>' : ''}
  ${has('beacon') ? '<g filter="url(#tglow)"><rect x="472" y="70" width="16" height="10" fill="#2A1E14"/><path d="M480 52 C488 62 490 70 480 74 C470 70 472 62 480 52Z" fill="#FFB45C"/><path d="M480 60 C484 66 484 70 480 72 C476 70 476 66 480 60Z" fill="#FFF1B8"/></g>' : ''}
  <g fill="#E8ECF2" opacity=".85"><path d="M14 192 L70 150 L126 192 L118 192 L70 158 L22 192Z"/><path d="M114 202 L160 168 L206 202 L198 202 L160 175 L122 202Z"/><path d="M274 182 L330 140 L386 182 L378 182 L330 148 L282 182Z"/><path d="M494 192 L550 155 L606 192 L598 192 L550 162 L502 192Z"/></g>
  <rect x="0" y="262" width="640" height="38" fill="#4A4038"/>
  <g fill="#5A5048">${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 40}" y="252" width="22" height="12"/>`).join('')}</g>
  ${has('gate') ? '<g><path d="M300 300 V270 a20 20 0 0 1 40 0 V300Z" fill="#160F0A" stroke="#8C6A2F" stroke-width="2"/><path d="M296 262 h48" stroke="#8C6A2F" stroke-width="3"/></g>' : ''}
  ${has('banners') ? `<g>${[90, 210, 450, 570].map(x => `<path d="M${x} 264 h14 v22 l-7 -5 l-7 5Z" fill="#8A1E1E" stroke="#D8B45A" stroke-width="1"/>`).join('')}</g>` : ''}
  ${has('statue') ? '<g fill="#8C8C8C" stroke="#3A3A3A" stroke-width="1.2"><rect x="398" y="284" width="20" height="8"/><path d="M402 284 v-14 h12 v14Z"/><circle cx="408" cy="266" r="4"/><path d="M414 272 l6 -10" stroke-width="2"/></g>' : ''}
  <g class="twins">${WIN.map((p, i) => `<rect class="twin${litSet.has(i) ? ' on' : ''}" x="${p[0]}" y="${p[1]}" width="12" height="14" rx="1"${nameAt[i] ? ` data-who="${esc(nameAt[i])}"` : ''}><title>${litSet.has(i) ? (nameAt[i] ? esc(nameAt[i]) + ' is in the County' : 'Someone is in the County') : 'A dark window'}</title></rect>`).join('')}</g>
  <g>${LAMPS.map((x, i) => `<g opacity="${i < lamps ? 1 : .15}"><rect x="${x - 1}" y="236" width="2" height="16" fill="#2A1E14"/><circle cx="${x}" cy="234" r="5" fill="#FFB45C"${i < lamps ? ' filter="url(#tglow)"' : ''}/></g>`).join('')}</g>
</svg>`;
}

function front(user, csrf, d) {
  const online = d.online;
  const names = user ? online.map(o => o.name) : [];
  const g = d.goal;
  return `<section class="card towncard">
  <div class="towngrid">
    <div class="townleft">
      <div class="eyebrow" style="margin-bottom:8px">Bruma tonight</div>
      ${scene(online.length, names, d.lamps, d.built)}
    </div>
    <div class="townright">
      <div><div class="tstat">${online.length}</div><p class="hint">${online.length === 1 ? 'officer of the County is' : 'officers of the County are'} in the hall now${user && online.length ? ': ' + online.slice(0, 8).map(o => esc(o.name)).join(', ') + (online.length > 8 ? ' and ' + (online.length - 8) + ' more' : '') : ''}</p></div>
      <div><div class="tstat small">${d.lamps}</div><p class="hint">${d.lamps === 1 ? 'lamp burns' : 'lamps burn'} on the wall, one for each guard on watch</p></div>
      ${d.built.length ? `<p class="hint">Built by the town: ${d.built.map(f => esc((T.FEATURES.find(x => x[0] === f) || [f, f])[1].toLowerCase())).join(', ')}.</p>` : ''}
      <div class="btnrow"><a class="btn ghost small" href="/herald">The Jerall Herald</a><a class="btn ghost small" href="/ballad">The ballad</a><a class="btn ghost small" href="/faces">Faces of Bruma</a><a class="btn ghost small" href="/inn">The Jerall View Inn</a></div>
    </div>
  </div>
</section>
${(() => {
  const gh = g ? `<section class="card goalcard">
      <div class="eyebrow" style="margin-bottom:6px">The ${esc(d.whose)} goal</div>
      <h3 style="margin:0 0 6px">${esc(g.title)}</h3>
      ${g.text ? `<p class="hint" style="margin:0 0 10px">${esc(g.text)}</p>` : ''}
      <div class="gbar"><i style="width:${g.pct}%"></i></div>
      <p style="margin:8px 0 0"><b>${V.septims(g.paid)}</b> of <b>${V.septims(g.target)}</b> handed over${g.pledged > g.paid ? ` · ${V.septims(g.pledged - g.paid)} more promised` : ''}</p>
      <form method="post" action="/goal/${esc(g.id)}/pledge" class="pledgeform">${hidden(csrf)}
        ${user ? '' : '<input name="name" maxlength="60" required placeholder="Your name" aria-label="Your name">'}
        <input name="amount" inputmode="numeric" required placeholder="Septims" aria-label="Septims to pledge">
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn go small" type="submit">Pledge</button>
      </form>
      <p class="hint" style="margin-top:6px">A pledge counts once it is handed over to the Steward in game. <a href="/goal">Who has pledged</a></p>
    </section>` : (d.mayGoals ? `<section class="card goalcard"><div class="eyebrow">The town’s goal</div><p class="hint" style="margin:6px 0 10px">No goal is set. Give the town something to build.</p><a class="btn ghost small" href="/goal">Set a goal</a></section>` : '');
  return gh ? `<div class="townsolo">${gh}</div>` : '';
})()}`;
}

const PORTRAIT_EMPTY = '<svg viewBox="0 0 80 100" aria-hidden="true"><rect width="80" height="100" fill="#2A1D12"/><path d="M14 100c2-22 12-32 26-32s24 10 26 32z" fill="#3A2A1C"/><circle cx="40" cy="44" r="15" fill="#3A2A1C"/></svg>';

function honour(user, csrf, d) {
  const f = d.face;
  if (!f) {
    return `<section class="honour empty" id="honour">
    <div class="hframe">${PORTRAIT_EMPTY}<span class="ribbon">Face of the Day</span></div>
    <div class="hwho">
      <div class="eyebrow">The Faces of Bruma</div>
      <div class="hname">This frame is waiting</div>
      <p class="hrole">Put up a portrait of your character, and one day it hangs here for the whole County to see.</p>
      <div class="hacts"><a class="btn go small" href="/faces#add">Put up your portrait</a></div>
    </div>
  </section>`;
  }
  const mineMissing = user && !T.faceOf(user.username);
  return `<section class="honour" id="honour">
  <div class="hframe"><img src="/faces/${esc(f.id)}/picture" alt="A portrait of ${esc(f.name)}"><span class="ribbon">Face of the Day</span></div>
  <div class="hwho">
    <div class="eyebrow">${esc(V.inworld(new Date().toISOString()))} · honoured by the County</div>
    <div class="hname">${esc(f.name)}</div>
    ${f.role ? `<p class="hrole">${esc(f.role)}</p>` : ''}
    ${f.line ? `<blockquote>“${esc(f.line)}”</blockquote>` : ''}
    <div class="hacts">
      ${d.cheered ? '<span class="btn go small is-done" aria-disabled="true">Cup raised</span>' : `<form method="post" action="/faces/${esc(f.id)}/cheer" class="inline">${hidden(csrf)}<button class="btn go small" type="submit">Raise a cup</button></form>`}
      <span class="cheers">${d.cheers ? d.cheers + (d.cheers === 1 ? ' cup raised today' : ' cups raised today') : 'Be the first to raise a cup'}</span>
      <a class="btn ghost small" href="/faces">All the Faces of Bruma</a>
      ${mineMissing ? '<a class="btn ghost small" href="/faces#add">Put up yours</a>' : ''}
    </div>
  </div>
</section>`;
}

function ghost(token, csrf, user) {
  return `<div class="ghostwalk" id="ghostwalk" data-token="${esc(token)}">
  <button type="button" class="ghostfig" id="ghostfig" aria-label="A pale figure on the road. Catch it."><svg viewBox="0 0 56 86" aria-hidden="true"><path d="M28 4c12 0 20 10 20 24v50l-6-6-7 8-7-8-7 8-7-8-6 6V28C8 14 16 4 28 4z" fill="#D9E6F2" opacity=".86"/><circle cx="21" cy="28" r="3" fill="#2A3340"/><circle cx="35" cy="28" r="3" fill="#2A3340"/></svg></button>
  <form method="post" action="/ghost" class="ghostform" id="ghostform" hidden>${hidden(csrf)}<input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="back" value="">
    <p><b>You caught the pale figure on the Jerall road.</b></p>
    ${user ? `<input type="hidden" name="name" value="${esc(user.name)}">` : '<input name="name" maxlength="60" placeholder="Your name, for the Herald" aria-label="Your name">'}
    <button class="btn go small" type="submit">Set it down</button>
  </form>
</div><script src="/town.js?v=${V.stamp('town.js')}" defer></script>`;
}

function goalPage(user, csrf, d) {
  const g = d.goal;
  const pledgeRow = (goal, p) => `<li class="${p.paid ? 'paid' : ''}"><b>${esc(p.name)}</b> · ${V.septims(p.amount)}${p.signed ? '' : ' <span class="hint">(not signed in)</span>'} · <span class="hint">${esc(V.when(p.at))}</span> ${p.paid ? '<span class="chip ok">Handed over</span>' : '<span class="chip">Promised</span>'}
    ${d.mayGoals ? `<form method="post" action="/goal/${esc(goal.id)}/pledge/${esc(p.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="act" value="${p.paid ? 'unpaid' : 'paid'}"><button class="btn ghost small" type="submit">${p.paid ? 'Not handed over' : 'Mark handed over'}</button></form>
    <form method="post" action="/goal/${esc(goal.id)}/pledge/${esc(p.id)}" class="inline">${hidden(csrf)}<input type="hidden" name="act" value="strike"><button class="btn ghost small" type="submit">Strike</button></form>` : ''}</li>`;
  return `<section class="card">
  <h2>The town’s goals</h2>
  <p class="lede">Something for the whole County to build. When the septims are handed over, it is built, and the drawing of Bruma on the front page changes for good.</p>
  ${g ? `<div class="eyebrow" style="margin-top:18px">Now</div><h3 style="margin:4px 0 6px">${esc(g.title)}</h3>${g.text ? `<p>${esc(g.text)}</p>` : ''}
  <div class="gbar"><i style="width:${g.pct}%"></i></div><p><b>${V.septims(g.paid)}</b> of <b>${V.septims(g.target)}</b> handed over · ${V.septims(g.pledged)} pledged in all</p>
  ${g.pledges.length ? `<ul class="pledgelist">${g.pledges.map(p => pledgeRow(g, p)).join('')}</ul>` : V.empty('Nobody has pledged yet.')}
  ${d.mayGoals ? `<form method="post" action="/goal/${esc(g.id)}/close" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Close this goal unbuilt</button></form>` : ''}`
  : V.empty('No goal is open.')}
  ${d.mayGoals ? `<details class="addwrap" style="margin-top:20px"${g ? '' : ' open'}><summary>Set a new goal</summary>
    <form method="post" action="/goal" class="stack">${hidden(csrf)}
      <label>What the town is building<input name="title" maxlength="120" required placeholder="e.g. A bell for the Great Chapel"></label>
      <label>A line about it<textarea name="text" rows="2" maxlength="600"></textarea></label>
      <label>Septims needed<input name="target" inputmode="numeric" required></label>
      <label>When it is built, the front page shows<select name="feature"><option value="">Nothing new</option>${T.FEATURES.filter(f => !d.built.includes(f[0])).map(f => `<option value="${f[0]}">${esc(f[1])}</option>`).join('')}</select></label>
      ${g ? '<p class="hint">Setting a new goal closes the one that is open now.</p>' : ''}
      <button class="btn go" type="submit">Set the goal</button>
    </form></details>` : ''}
  ${d.done.length ? `<div class="eyebrow" style="margin-top:24px">Built</div><ul class="procl">${d.done.map(x => `<li><span>${esc(x.title)}</span><span>${V.septims(x.paid)} · ${esc(V.when(x.metAt))}</span></li>`).join('')}</ul>` : ''}
</section>`;
}

function balladPage(user, csrf, d) {
  const key = d.week;
  const lines = T.balladLines(key);
  return `<section class="card">
  <div class="eyebrow">Pinned up at the Jerall View Inn</div>
  <h2>The ballad of Bruma</h2>
  <p class="lede">One line each, one line a day. On Sundas night this week’s ballad is sealed into the inn’s book and a new one begins.</p>
  <div class="balladsheet"><h3>${esc(T.balladTitle(key))}</h3>
    ${lines.length ? lines.map(l => `<div class="bline"><span>${esc(l.line)}</span><small>${esc(l.name)}${d.mayTown ? ` <form method="post" action="/ballad/${esc(l.id)}/strike" class="inline">${hidden(csrf)}<button class="linkish" type="submit">strike</button></form>` : ''}</small></div>`).join('') : '<p class="bempty">The first line is yours to write.</p>'}
  </div>
  <form method="post" action="/ballad" class="stack" style="margin-top:16px;max-width:560px">${hidden(csrf)}
    <label>The next line<input name="line" maxlength="90" required placeholder="Keep it to one line"></label>
    ${user ? '' : '<label>Your name<input name="name" maxlength="60" required></label>'}
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn go" type="submit">Add it</button>
  </form>
  ${d.past.length ? `<div class="eyebrow" style="margin-top:26px">The inn’s book</div><ul class="procl">${d.past.map(w => `<li><a href="/ballad?week=${esc(w.week)}">${esc(w.title)}</a><span>${w.lines} ${w.lines === 1 ? 'line' : 'lines'} · week of ${esc(V.inworld(w.week + 'T12:00:00'))}</span></li>`).join('')}</ul>` : ''}
</section>`;
}

function balladSealed(key, d, csrf) {
  const lines = T.balladLines(key);
  return `<section class="card"><p><a href="/ballad">← This week’s ballad</a></p>
  <div class="balladsheet sealed"><h3>${esc(T.balladTitle(key))}</h3>${lines.map(l => `<div class="bline"><span>${esc(l.line)}</span><small>${esc(l.name)}${d.mayTown ? ` <form method="post" action="/ballad/${esc(l.id)}/strike" class="inline">${hidden(csrf)}<button class="linkish" type="submit">strike</button></form>` : ''}</small></div>`).join('') || '<p class="bempty">Nothing was written that week.</p>'}
  <p class="sealmark">Sealed into the inn’s book, week of ${esc(V.inworld(key + 'T12:00:00'))}</p></div></section>`;
}

function facesPage(user, csrf, d) {
  const mine = user ? T.faceOf(user.username) : null;
  const form = (action, extra, btn, note) => `<form method="post" action="${action}" class="stack" style="max-width:560px">${hidden(csrf)}
      <label>A picture of your character${mine ? ' (leave empty to keep the one you have)' : ''}<input type="file" accept="image/png,image/jpeg" data-picture="picture"${mine ? '' : ' required'}><input type="hidden" name="picture"></label>
      <img data-picture-view hidden alt="" class="picprev"><span class="hint" data-picture-note></span>
      ${extra}
      <label>Who you are in Bruma<input name="role" maxlength="80" value="${esc(mine ? mine.role : '')}" placeholder="e.g. Guard of the Walls · four years in Bruma"></label>
      <label>A line in your own words<input name="line" maxlength="160" value="${esc(mine ? mine.line : '')}"></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn go" type="submit">${btn}</button>
      ${note ? `<p class="hint">${note}</p>` : ''}
    </form>`;
  const pending = d.mayTown && d.pending.length ? `<div class="pendwrap"><div class="eyebrow">Waiting for your approval · ${d.pending.length}</div>
    <div class="facegrid">${d.pending.map(f => `<figure class="facetile pend"><img src="/faces/${esc(f.id)}/picture" alt="A portrait sent in by ${esc(f.name)}" loading="lazy"><figcaption><b>${esc(f.name)}</b>${f.role ? `<span>${esc(f.role)}</span>` : ''}${f.line ? `<i>“${esc(f.line)}”</i>` : ''}<span class="hint">Sent in ${esc(V.when(f.at))}</span>
      <div class="pendacts"><form method="post" action="/faces/${esc(f.id)}/approve" class="inline">${hidden(csrf)}<button class="btn go small" type="submit">Put it up</button></form><form method="post" action="/faces/${esc(f.id)}/remove" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Turn it away</button></form></div></figcaption></figure>`).join('')}</div></div>` : '';
  return `<section class="card">
  <h2>Faces of Bruma</h2>
  <p class="lede">The people of the County, as they would have you see them. Each day one of them is the Face of the Day at the top of the front page.</p>
  ${pending}
  ${d.list.length ? `<div class="facegrid">${d.list.map(f => `<figure class="facetile${d.today && d.today.id === f.id ? ' today' : ''}"><img src="/faces/${esc(f.id)}/picture" alt="A portrait of ${esc(f.name)}" loading="lazy"><figcaption><b>${esc(f.name)}</b>${f.role ? `<span>${esc(f.role)}</span>` : ''}${f.line ? `<i>“${esc(f.line)}”</i>` : ''}${d.today && d.today.id === f.id ? '<span class="chip ok">Face of the Day</span>' : ''}${d.mayTown ? `<form method="post" action="/faces/${esc(f.id)}/remove" class="inline">${hidden(csrf)}<button class="linkish" type="submit">take down</button></form>` : ''}</figcaption></figure>`).join('')}</div>` : V.empty('Nobody has put up a portrait yet. Yours could be the first.')}
  <div id="add"></div>
  ${user
    ? `<details class="addwrap" style="margin-top:20px"${mine ? '' : ' open'}><summary>${mine ? 'Change your portrait' : 'Put up your portrait'}</summary>${form('/faces', '', 'Put it up', '')}</details>`
    : `<details class="addwrap" style="margin-top:20px" open><summary>Send in your portrait</summary>${form('/faces/send', '<label>Your character’s name<input name="name" maxlength="60" required></label>', 'Send it in', 'It goes up once the Steward has looked it over. Use a picture of your character, not of yourself.')}</details>`}
  <script src="/town.js?v=${V.stamp('town.js')}" defer></script>
</section>`;
}

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
function card(c) {
  if (c === '??') return '<span class="pcard back" aria-label="A card face down"></span>';
  const r = c.slice(0, -1), su = c.slice(-1);
  return `<span class="pcard${su === 'h' || su === 'd' ? ' red' : ''}" aria-label="${esc(r)} of ${({ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' })[su]}"><i>${esc(r)}<br>${SUIT[su]}</i><b>${SUIT[su]}</b></span>`;
}
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function bone(v) {
  return `<span class="die${v === 1 ? ' frost' : ''}${v ? '' : ' blank'}"${v ? ` aria-label="${v}"` : ''}>${Array.from({ length: 9 }, (_, i) => `<b${v && PIPS[v].includes(i) ? ' class="on"' : ''}></b>`).join('')}</span>`;
}

const TUTORIALS = {
  cards: [
    ['The aim', 'Finish closer to <b>21</b> than Old Brannoc, without going over. Go over 21 and you <b>bust</b>: the hand is lost straight away.', ['7h', 'Kc', '4s'], 'You: 7 + 10 + 4 = <b>21</b>'],
    ['What cards are worth', 'Number cards count what they show. <b>J, Q and K count 10.</b> An <b>ace counts 11</b>, or 1 if 11 would bust you. A hand with an ace counted as 11 is called <b>soft</b>.', ['As', '6d'], 'Soft 17: the ace counts 11 for now'],
    ['Your turn', 'You get two cards face up. Brannoc gets one up and one <b>face down</b>. Press <b>Hit</b> for another card, as many times as you dare. Press <b>Stand</b> when you are happy.', ['10s', '6h'], 'On 16 against his 10, most people hit'],
    ['Brannoc’s turn', 'When you stand he turns his hidden card and <b>must draw until he has 17 or more</b>. If he busts, you win. Otherwise the higher hand wins, and a tie is a <b>push</b>.', ['9c', '8d'], 'He has 17, so he stops'],
    ['Blackjack', 'An ace and a ten-card on the deal is <b>blackjack</b> and wins outright. Every win puts your name on this week’s board, and the board goes in the Herald. Play as many hands as you like.', ['Ah', 'Qs'], 'Blackjack']
  ],
  bones: [
    ['The aim', 'First to <b>50</b> wins. You and Old Brannoc take turns throwing three bones.', [6, 4, 3], 'Throw: 6 + 4 + 3 = <b>13</b> into your pot'],
    ['Grow your pot', 'Each throw adds to your <b>pot</b> for this turn. Throw again to grow it, or press <b>Call it</b> to bank the pot into your score.', [5, 5, 2], 'Pot is now 13 + 12 = <b>25</b>'],
    ['Watch for frost', 'Any bone showing a <b>single pip is frost</b>. Frost melts your whole pot and the turn passes to Brannoc. The bigger the pot, the more it hurts.', [1, 6, 4], 'Frost: the pot of 25 is gone'],
    ['Bruma’s luck', '<b>Three alike</b> is Bruma’s luck and adds <b>+10</b>. Bank before the frost finds you. Every win puts your name on the board, and the biggest pot of the week goes in the Herald.', [4, 4, 4], '12 + 10 for Bruma’s luck = <b>22</b>']
  ]
};

function tutorial(game, csrf, open) {
  const steps = TUTORIALS[game];
  const pic = v => game === 'cards' ? v.map(card).join('') : v.map(bone).join('');
  return `<div class="tut" id="tut" data-tut="${game}"${open ? '' : ' hidden'}>
  <div class="tutbox" role="dialog" aria-modal="true" aria-labelledby="tuthead">
    <div class="eyebrow">How to play · <span data-tutn>1</span> of ${steps.length}</div>
    ${steps.map((st, i) => `<div class="tutstep" data-step="${i}"${i ? ' hidden' : ''}>
      <h3${i ? '' : ' id="tuthead"'}>${st[0]}</h3>
      <p>${st[1]}</p>
      <div class="tutpic"><div class="${game === 'cards' ? 'cards' : 'bones'}">${pic(st[2])}</div><span>${st[3]}</span></div>
    </div>`).join('')}
    <div class="tutdots">${steps.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
    <div class="tutacts">
      <button type="button" class="btn ghost small" data-tutback hidden>Back</button>
      <button type="button" class="btn go" data-tutnext>Next</button>
      <form method="post" action="/inn/${game}/learned" data-tutdone hidden>${hidden(csrf)}<button class="btn go" type="submit">${game === 'cards' ? 'Deal me in' : 'Hand me the bones'}</button></form>
      <form method="post" action="/inn/${game}/learned" class="tutskip">${hidden(csrf)}<button class="linkish" type="submit">Skip, I know how</button></form>
    </div>
  </div>
</div>
<noscript><style>.tutstep[hidden]{display:block!important}.tutdots,[data-tutnext]{display:none}[data-tutdone]{display:inline!important}</style></noscript>`;
}

function seatBar(d, I, game) {
  return `<div class="innhead">
      <div><div class="eyebrow"><a href="/inn">The Jerall View Inn</a></div><h2>${game === 'cards' ? 'Twenty-one' : 'Bones'} at ${esc(I.KEEPER)}’s table</h2></div>
      <div class="innwho">${d.name ? 'Playing as <b>' + esc(d.name) + '</b>' : ''}<button type="button" class="btn ghost small" data-tutopen>How to play</button></div>
    </div>`;
}

function nameForm(csrf, I, to) {
  return `<form method="post" action="/inn/name" class="iname">${hidden(csrf)}<input type="hidden" name="to" value="${esc(to)}">
      <p>${esc(I.KEEPER)} looks up from the fire. “Sit, sit. What do they call you?”</p>
      <div class="inrow"><input name="name" maxlength="40" required placeholder="Your character’s name" aria-label="Your character’s name"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn go" type="submit">Sit down</button></div>
      <p class="hint">Your name goes on the board when you win. Officers who have entered the hall sit down as themselves.</p>
    </form>`;
}

function boardCard(title, b, unit, extra) {
  return `<section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">${title}</div>
      ${b.top.length ? `<ol class="iboard">${b.top.map(r => `<li><span>${esc(r.name)}</span><span>${r.wins} ${r.wins === 1 ? 'win' : 'wins'}</span></li>`).join('')}</ol>` : V.empty('Nobody has beaten Old Brannoc this week.')}
      ${extra}
      <p class="hint">${unit}</p>
    </section>`;
}

function innLobby(user, csrf, d) {
  const C = d.cards, B = d.bones;
  return `<section class="innlobby">
  <div class="card lobbyhead">
    <div class="eyebrow">The Jerall View Inn · by the North Gate</div>
    <h2>Two tables by the fire</h2>
    <p class="lede">Old Brannoc keeps a deck and a cup of bones behind the bar, and he never says no to a game. No septims change hands. Win and your name goes on this week’s board, and the board goes in the Herald.</p>
    ${d.name ? `<p class="hint">Sitting down as <b>${esc(d.name)}</b>.</p>` : nameForm(csrf, d.I, '/inn')}
  </div>
  <div class="lobbytables">
    <a class="tablecard" href="/inn/cards">
      <div class="cards">${['Ah', 'Ks'].map(card).join('')}</div>
      <h3>Twenty-one</h3>
      <p>Blackjack against the innkeeper. Get closer to 21 than he does without going over.</p>
      <span class="hint">${C.hands} ${C.hands === 1 ? 'hand' : 'hands'} this week${C.top[0] ? ' · ' + esc(C.top[0].name) + ' leads with ' + C.top[0].wins : ''}</span>
      <span class="dcta">Take a seat →</span>
    </a>
    <a class="tablecard" href="/inn/bones">
      <div class="bones">${[6, 6, 6].map(bone).join('')}</div>
      <h3>Bones</h3>
      <p>Throw three bones and build a pot. Bank it before the frost takes it. First to 50.</p>
      <span class="hint">${B.games} ${B.games === 1 ? 'game' : 'games'} this week${B.top[0] ? ' · ' + esc(B.top[0].name) + ' leads with ' + B.top[0].wins : ''}</span>
      <span class="dcta">Take a seat →</span>
    </a>
  </div>
</section>`;
}

function cardsPage(user, csrf, d) {
  const g = d.state;
  const I = d.I;
  const b = d.board;
  const hand = cards => cards.length ? cards.map(card).join('') : '<span class="pcard ghost"></span><span class="pcard ghost"></span>';
  const tot = (n, soft) => n === null || n === undefined ? '' : (soft ? 'soft ' : '') + n;
  return `<section class="innwrap">
  <div class="inn" id="inn" data-game="cards">
    ${seatBar(d, I, 'cards')}
    ${d.name ? `<div class="felt">
      <div class="hand"><div class="hlabel"><span>${esc(I.KEEPER)}</span><b data-total="inn">${tot(g.started ? g.innTotal : null)}</b></div><div class="cards" data-cards="inn">${hand(g.inn)}</div></div>
      <p class="say ${esc(g.tone || '')}" data-say>${esc(g.say)}</p>
      <div class="hand"><div class="hlabel"><span>You</span><b data-total="you">${tot(g.started ? g.youTotal : null, g.youSoft)}</b></div><div class="cards" data-cards="you">${hand(g.you)}</div></div>
      <div class="iacts">
        <form method="post" action="/inn/cards/hit" data-inn>${hidden(csrf)}<button class="btn go" type="submit" data-act="hit"${g.over ? ' hidden' : ''}>Hit</button></form>
        <form method="post" action="/inn/cards/stand" data-inn>${hidden(csrf)}<button class="btn ghost" type="submit" data-act="stand"${g.over ? ' hidden' : ''}>Stand</button></form>
        <form method="post" action="/inn/cards/deal" data-inn>${hidden(csrf)}<button class="btn go" type="submit" data-act="deal"${g.over ? '' : ' hidden'}>${g.started ? 'Deal another hand' : 'Deal me in'}</button></form>
      </div>
      <p class="streak" data-streak>${g.streak > 1 ? g.streak + ' wins in a row' : ''}</p>
    </div>` : nameForm(csrf, I, '/inn/cards')}
  </div>
  <div class="innside">
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">The short of it</div>
      <ul class="irules">
        <li>Closer to <b>21</b> than ${esc(I.KEEPER)} wins. Over 21 is a bust.</li>
        <li>J, Q, K count 10. An ace counts 11 or 1.</li>
        <li><b>Hit</b> for a card, <b>Stand</b> to stop. He draws to 17.</li>
        <li>Ace and a ten-card on the deal is <b>blackjack</b>.</li>
      </ul>
    </section>
    ${boardCard('Twenty-one this week', b, `${b.hands} ${b.hands === 1 ? 'hand' : 'hands'} played · ${esc(I.KEEPER)} won ${b.keeperWins}`, b.lucky ? `<p class="ilucky">Most blackjacks: <b>${esc(b.lucky.name)}</b>, ${b.lucky.bj}</p>` : '')}
    <a class="btn ghost small" href="/inn/bones" style="align-self:flex-start">Try Bones instead</a>
  </div>
</section>
${tutorial('cards', csrf, d.tutorial)}<script src="/inn.js?v=${V.stamp('inn.js')}" defer></script>`;
}

function bonesPage(user, csrf, d) {
  const g = d.game;
  const I = d.I;
  const b = d.board;
  const dice = (g.last && g.last.length ? g.last : [0, 0, 0]).map(bone).join('');
  const seat = (who, label, score) => `<div class="iseat${g.turn === who ? ' turn' : ''}" data-seat="${who}"><span class="lbl">${esc(label)}</span><span class="score" data-score="${who}">${score}</span><span class="of">of ${I.GOAL}</span><span class="track"><i data-track="${who}" style="width:${Math.min(100, Math.round(score / I.GOAL * 100))}%"></i></span></div>`;
  return `<section class="innwrap">
  <div class="inn" id="inn" data-game="bones" data-goal="${I.GOAL}">
    ${seatBar(d, I, 'bones')}
    ${d.name ? `<div class="itable">
      ${seat('you', 'You', g.you)}
      <div class="imid">
        <div class="bones" data-bones aria-live="polite">${dice}</div>
        <div class="pot">THIS POT <b data-pot>${g.pot}</b></div>
        <div class="iacts">
          <form method="post" action="/inn/bones/throw" data-inn>${hidden(csrf)}<button class="btn go" type="submit" data-act="throw"${g.over || g.turn !== 'you' ? ' hidden' : ''}>Throw the bones</button></form>
          <form method="post" action="/inn/bones/bank" data-inn>${hidden(csrf)}<button class="btn ghost" type="submit" data-act="bank"${g.over || !g.pot ? ' hidden' : ''}>Call it</button></form>
          <form method="post" action="/inn/bones/new" data-inn>${hidden(csrf)}<button class="btn go" type="submit" data-act="new"${g.over ? '' : ' hidden'}>Another game</button></form>
        </div>
        <p class="say ${esc(g.tone || '')}" data-say>${esc(g.say)}</p>
      </div>
      ${seat('inn', I.KEEPER, g.inn)}
    </div>
    <div class="ilog" data-log>${g.log.map(l => `<div>${esc(l)}</div>`).join('') || '<div>The fire is lit. A new game.</div>'}</div>` : nameForm(csrf, I, '/inn/bones')}
  </div>
  <div class="innside">
    <section class="card tight">
      <div class="eyebrow" style="margin-bottom:10px">The short of it</div>
      <ul class="irules">
        <li>Throw three bones; their total goes in your <b>pot</b>.</li>
        <li>Throw again, or <b>call it</b> to bank the pot.</li>
        <li>A single pip is <b>frost</b>: the pot is lost.</li>
        <li>Three alike is <b>+${I.LUCK}</b>. First to ${I.GOAL} wins.</li>
      </ul>
    </section>
    ${boardCard('Bones this week', b, `${b.games} ${b.games === 1 ? 'game' : 'games'} thrown · ${esc(I.KEEPER)} won ${b.keeperWins}`, b.lucky ? `<p class="ilucky">Biggest pot: <b>${esc(b.lucky.name)}</b>, ${b.lucky.best}</p>` : '')}
    <a class="btn ghost small" href="/inn/cards" style="align-self:flex-start">Try Twenty-one instead</a>
  </div>
</section>
${tutorial('bones', csrf, d.tutorial)}<script src="/inn.js?v=${V.stamp('inn.js')}" defer></script>`;
}

function heraldPage(user, csrf, h) {
  const story = (head, body, extra) => `<article><h4>${esc(head)}</h4>${extra || ''}<p>${body}</p></article>`;
  const arts = [];
  if (h.lead) arts.push(`<article class="leadstory"><h4>${esc(h.lead.title)}</h4>${h.lead.body.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}<p class="byline">— ${esc(h.lead.by)}</p></article>`);
  arts.push(story(h.watch.hours ? 'The watch stood ' + h.watch.hours + ' hours' : 'The walls stood unwatched', h.watch.hours ? `${esc(h.watch.guards)} ${h.watch.guards === 1 ? 'guard' : 'guards'} kept the walls this week.${h.watch.top ? ' ' + esc(h.watch.top.name) + ' stood the most, ' + h.watch.top.hours + ' hours.' : ''}${h.watch.gaps ? ' ' + h.watch.gaps + ' posts went a night without a hand.' : ''}` : 'Nobody clocked on this week.', h.watch.hours ? `<div class="fig">${h.watch.hours}</div>` : ''));
  if (h.goal) arts.push(story(h.goal.met ? h.goal.title + ': it is built' : h.goal.title, h.goal.met ? 'The town handed over every septim it needed. It stands now for anyone to see.' : `${V.septims(h.goal.paid)} of ${V.septims(h.goal.target)} septims are handed over.${h.goal.top ? ' ' + esc(h.goal.top.name) + ' leads with ' + V.septims(h.goal.top.amount) + '.' : ''}`));
  if (h.ghost.seen) arts.push(story('Pale figure on the Jerall road', h.ghost.caught.length ? `The ghost was seen ${h.ghost.seen} ${h.ghost.seen === 1 ? 'time' : 'times'}. ${esc(h.ghost.caught[0])} reached it first${h.ghost.caught.length > 1 ? ', and ' + (h.ghost.caught.length - 1) + ' more after' : ''}.` : `The ghost was seen ${h.ghost.seen} ${h.ghost.seen === 1 ? 'time' : 'times'} and nobody caught it.`));
  if (h.ballad.length) arts.push(story(h.balladTitle, h.ballad.slice(0, 4).map(l => esc(l.line)).join(' / ') + (h.ballad.length > 4 ? ' …' : '') + ` <a href="/ballad${h.past ? '?week=' + esc(h.week) : ''}">Read it all</a>`));
  if (h.word.length) arts.push(story(h.word.length === 1 ? 'The County gave its word' : 'The County gave its word ' + h.word.length + ' times', h.word.slice(0, 3).map(p => `<a href="/proclamations/${esc(p.id)}">${esc(p.title)}</a>`).join('; ') + '.'));
  if (h.petitions) arts.push(story('Petitions at the hall', `${h.petitions} ${h.petitions === 1 ? 'petition was' : 'petitions were'} laid before the County, and ${h.answered} answered.`));
  if (h.reports) arts.push(story('Reports of the Watch', `The watch filed ${h.reports} ${h.reports === 1 ? 'report' : 'reports'}.`));
  arts.push(story('The Pale Pass', `As the week ends the pass is <b>${esc(h.pass.toLowerCase())}</b>.`));
  if ((h.cards && h.cards.hands) || (h.bones && h.bones.games)) {
    const bits = [];
    if (h.cards && h.cards.hands) bits.push(`At twenty-one, ${h.cards.hands} ${h.cards.hands === 1 ? 'hand was' : 'hands were'} played and Old Brannoc won ${h.cards.keeperWins}.${h.cards.top[0] ? ' ' + esc(h.cards.top[0].name) + ' beat him the most, ' + h.cards.top[0].wins + (h.cards.top[0].wins === 1 ? ' time.' : ' times.') : ''}${h.cards.lucky ? ' ' + esc(h.cards.lucky.name) + ' drew the most blackjacks, ' + h.cards.lucky.bj + '.' : ''}`);
    if (h.bones && h.bones.games) bits.push(`At bones, ${h.bones.games} ${h.bones.games === 1 ? 'game was' : 'games were'} thrown.${h.bones.top[0] ? ' ' + esc(h.bones.top[0].name) + ' won the most, ' + h.bones.top[0].wins + '.' : ''}${h.bones.lucky ? ' The biggest pot was ' + esc(h.bones.lucky.name) + '’s, ' + h.bones.lucky.best + '.' : ''}`);
    arts.push(story('At the Jerall View', bits.join(' ') + ' <a href="/inn">Take a seat</a>'));
  }
  if (h.cheers && h.cheers.length) arts.push(story('Cups raised', h.cheers.slice(0, 3).map(c => `${c.count} ${c.count === 1 ? 'cup' : 'cups'} for ${esc(c.name)}`).join('; ') + '.'));
  if (h.face) arts.push(`<article><h4>A face of Bruma</h4><div class="hface"><img src="/faces/${esc(h.face.id)}/picture" alt="" loading="lazy"><p><b>${esc(h.face.name)}</b>${h.face.role ? ', ' + esc(h.face.role) : ''}${h.face.line ? '. “' + esc(h.face.line) + '”' : ''}</p></div></article>`);
  return `<section class="heraldwrap">
  <div class="heraldnav">${h.prev ? `<a class="btn ghost small" href="/herald?week=${esc(h.prev)}">← The week before</a>` : '<span></span>'}${h.next ? `<a class="btn ghost small" href="/herald${h.next === T.weekKey() ? '' : '?week=' + esc(h.next)}">The week after →</a>` : ''}</div>
  <div class="herald">
    <div class="hmast"><h2>The Jerall Herald</h2><p>${h.past ? 'Week of ' : 'This week so far · '}${esc(V.inworld(h.week + 'T12:00:00'))} · price one copper</p></div>
    <div class="hcols">${arts.join('')}</div>
  </div>
  ${h.mayHerald ? `<details class="addwrap" style="margin-top:18px"><summary>${h.lead ? 'Change' : 'Write'} this week’s lead story</summary>
    <form method="post" action="/herald" class="stack" style="max-width:640px">${hidden(csrf)}<input type="hidden" name="week" value="${esc(h.week)}">
      <label>Headline<input name="title" maxlength="120" value="${esc(h.lead ? h.lead.title : '')}"></label>
      <label>The story<textarea name="body" rows="6" maxlength="2500">${esc(h.lead ? h.lead.body : '')}</textarea></label>
      <button class="btn go" type="submit">Set it</button><p class="hint">Leave both empty to take the story out.</p>
    </form></details>` : ''}
</section>`;
}

module.exports = { scene, front, honour, ghost, goalPage, balladPage, balladSealed, facesPage, innLobby, cardsPage, bonesPage, card, bone, heraldPage };
