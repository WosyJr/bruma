const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');
const O = require('./offices');
const Pr = require('./proclaim');
const Fl = require('./flourish');

const ASSET_DIR = path.join(__dirname, '..', 'public');
const STAMPS = {};
function stamp(file) {
  if (STAMPS[file]) return STAMPS[file];
  let v = '0';
  try {
    v = crypto.createHash('sha1').update(fs.readFileSync(path.join(ASSET_DIR, file))).digest('hex').slice(0, 10);
  } catch (_) {
    try { v = String(fs.statSync(path.join(ASSET_DIR, file)).mtimeMs | 0); } catch (__) {}
  }
  STAMPS[file] = v;
  return v;
}

const esc = s => String(s === undefined || s === null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const hidden = csrf => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;

const MONTHS = ['Morning Star', "Sun's Dawn", 'First Seed', "Rain's Hand", 'Second Seed', 'Mid Year',
  "Sun's Height", 'Last Seed', 'Hearthfire', 'Frostfall', "Sun's Dusk", 'Evening Star'];
const DAYS = ['Sundas', 'Morndas', 'Tirdas', 'Middas', 'Turdas', 'Fredas', 'Loredas'];

function today(d) {
  const now = d || new Date();
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const n = now.getDate();
  const ord = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return { text: `${day}, the ${n}${ord} day of ${month}, 4E ${C.CURRENT_YEAR}`, month: now.getMonth(), day: now.getDay() };
}

function inworld(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const n = d.getDate();
  const ord = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return n + ord + ' of ' + MONTHS[d.getMonth()];
}

function septims(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('en-GB');
}

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function hours(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return r + 'm';
  if (!r) return h + 'h';
  return h + 'h ' + r + 'm';
}

const OPEN = [
  { id: 'proclamations', name: 'Proclamations', href: '/proclamations' },
  { id: 'pass', name: 'The Pale Pass', href: '/pass' },
  { id: 'laws', name: 'Laws & Charters', href: '/laws' },
  { id: 'the-guilds', name: 'The Guilds', href: '/the-guilds' },
  { id: 'holdings', name: 'Property', href: '/holdings' },
  { id: 'judgments', name: 'Judgments', href: '/judgments' },
  { id: 'who', name: 'The Court', href: '/who' },
  { id: 'petitions', name: 'Petitions', href: '/petitions' },
  { id: 'petition', name: 'Lay a Petition', href: '/petition' },
  { id: 'verify', name: 'Check a Paper', href: '/verify' }
];

const HALLS = [
  { id: 'hall', name: 'The Great Hall', href: '/hall', perm: 'hall' },
  { id: 'watch', name: 'The Watch', href: '/watch', perm: 'watchclock', alt: 'watchlog' },
  { id: 'property', name: 'The Property Roll', href: '/property', perm: 'propread' },
  { id: 'treasury', name: 'The Treasury', href: '/treasury', perm: 'treasread' },
  { id: 'taxes', name: 'The Tax Roll', href: '/taxes', perm: 'treasread' },
  { id: 'guilds', name: 'The Guilds', href: '/guilds', perm: 'guildsee', alt: 'guildown' },
  { id: 'people', name: 'People', href: '/people', perm: 'hall' },
  { id: 'court', name: 'The Court', href: '/court', perm: 'courtsee', alt: 'courtfile' },
  { id: 'gaol', name: 'The Gaol', href: '/gaol', perm: 'gaolsee' },
  { id: 'licences', name: 'Licences', href: '/licences', perm: 'licsee' },
  { id: 'archive', name: 'The Archive', href: '/archive', perm: 'archread' }
];

function navFor(u) {
  if (!u) return OPEN;
  const out = HALLS.filter(h => O.can(u, h.perm) || (h.alt && O.can(u, h.alt)));
  if (O.can(u, 'courtsit') || O.can(u, 'courtsee') || O.can(u, 'watchlog')) out.push({ id: 'reckoner', name: 'The Reckoner', href: '/reckoner' });
  if (O.can(u, 'petsee')) out.push({ id: 'petmanage', name: 'Petitions', href: '/petitions/manage' });
  if (O.can(u, 'proclaim')) out.push({ id: 'proclaim', name: 'Proclaim', href: '/proclaim' });
  if (O.can(u, 'officers')) out.push({ id: 'service', name: 'Service', href: '/service' });
  if (O.can(u, 'officers') || O.can(u, 'appoint')) out.push({ id: 'officers', name: 'The Officers', href: '/officers' });
  if (O.can(u, 'flourish')) out.push({ id: 'flourishes', name: 'Flourishes', href: '/flourishes' });
  out.push({ id: 'open', name: 'The Public Face', href: '/proclamations' });
  return out;
}

function flashBlock(f) {
  if (!f) return '';
  const cls = f.err ? 'flash bad' : 'flash';
  return `<div class="${cls}" role="status">${f.html || esc(f.text || f)}</div>`;
}

const WIND_FILTER = `<svg class="weave" aria-hidden="true" focusable="false"><defs>
<filter id="cloth" x="-14%" y="-6%" width="128%" height="112%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.007 0.019" numOctaves="2" seed="7" result="noise">
    <animate attributeName="baseFrequency" dur="14s" repeatCount="indefinite"
      values="0.007 0.019;0.011 0.026;0.006 0.016;0.007 0.019"></animate>
  </feTurbulence>
  <feDisplacementMap id="clothmap" in="SourceGraphic" in2="noise" scale="7"
    xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
</filter></defs></svg>`;

function passNow() {
  try {
    const p = Pr.pass();
    return (Pr.STATE_BY_ID[p.state] || Pr.STATES[0]).id;
  } catch (e) { return 'open'; }
}

function passStrip() {
  let p;
  try { p = Pr.pass(); } catch (e) { return ''; }
  const s = Pr.STATE_BY_ID[p.state] || Pr.STATES[0];
  const word = {
    open: 'the road north is clear',
    riders: 'riders and foot may cross',
    escort: 'cross only with an escort',
    shut: 'the road north is closed'
  }[s.id] || '';
  return `<a class="passstrip" href="/pass" data-pass="${esc(s.id)}">
  <span class="drift" aria-hidden="true"><i></i><i></i><i></i></span>
  <span class="passinner">
    <span class="passsay"><b>${esc(s.say)}</b><span class="password">${esc(word)}</span></span>
    <span class="passlook">${p.looked ? 'last looked ' + esc(when(p.looked)) : 'no word from the pass'}</span>
  </span>
</a>`;
}

function layout({ title, user, active, body, flash, csrf, head, wide }) {
  const t = today();
  let flourishOn = '';
  let unrest = 0;
  let ground = 'none';
  try {
    flourishOn = Fl.attr();
    ground = Fl.ground();
    if (ground !== 'none') unrest = Fl.unrest();
  } catch (e) { flourishOn = ''; ground = 'none'; }
  const nav = navFor(user);
  const right = user
    ? `<span class="who"><b>${esc(user.name)}</b><span class="style">${esc(user.title)}</span></span>
       <a class="btn ghost small" href="/me">My Papers</a>
       <form method="post" action="/logout" class="inline">${hidden(csrf)}<button class="btn ghost small" type="submit">Leave</button></form>`
    : '<a class="btn ghost small" href="/login">Enter the Hall</a>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(title ? title + ' · County of Bruma' : 'County of Bruma')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/style.css?v=${stamp('style.css')}">
<link rel="icon" type="image/png" href="/bruma-seal.png">
<meta name="theme-color" content="#17110C">
<meta name="bruma-unrest" content="${unrest}">
<meta name="bruma-ground" content="${esc(ground)}">
<meta name="bruma-pass" content="${esc(passNow())}">
<script src="/app.js?v=${stamp('app.js')}" defer></script><script src="/window.js?v=${stamp('window.js')}" defer></script>${flourishOn ? `<script src="/flourish.js?v=${stamp('flourish.js')}" defer></script>` : ''}${head || ''}</head>
<body class="${wide ? 'widepage' : ''}"${flourishOn ? ` data-flourish="${esc(flourishOn)}"` : ''}${ground !== 'none' ? ` data-ground="${esc(ground)}"` : ''}>${ground !== 'none' ? '<canvas class="skyfield" id="skyfield" aria-hidden="true"></canvas>' : ''}
${WIND_FILTER}
<header class="crest">
  <div class="crestinner">
    <span class="mast"><img class="arms" src="/bruma-banner.png" alt="The arms of the County of Bruma" width="200" height="523"></span>
    <div class="titles">
      <div class="eyebrow">By the hand of the County</div>
      <h1><a href="/">County of Bruma</a></h1>
      <div class="seat">The Jerall Mountains · Seat of the County · Imperial Province of Cyrodiil</div>
    </div>
    <div class="crestright">
      <div class="stamp">${esc(t.text)}</div>
      <div class="topright">${right}</div>
    </div>
  </div>
</header>

${nav.length ? `<nav class="halls" aria-label="The halls of the County">
  <div class="inner">${nav.map(h => `<a href="${h.href}"${active === h.id ? ' class="on" aria-current="page"' : ''}>${esc(h.name)}</a>`).join('')}</div>
</nav>` : ''}

${passStrip()}

<main class="${wide ? 'wrap wide' : 'wrap'}">
${flashBlock(flash)}
${body}
</main>

<footer class="foot">
  <span class="motto">Hospitality to the stranger. Iron to the raider.</span>
  <span>The County of Bruma · Castle Bruma · County of the Imperial Province of Cyrodiil</span>
</footer>
</body></html>`;
}

function passSetter(csrf, back, opts) {
  const o = opts || {};
  const p = Pr.pass();
  const now = Pr.STATE_BY_ID[p.state] || Pr.STATES[0];
  return `<section class="card passset">
  <div class="eyebrow" style="margin-bottom:6px">The Pale Pass</div>
  <h3 style="margin:0 0 4px;font-size:23px">${esc(now.say)}</h3>
  <p class="hint" style="margin:0 0 16px">${p.note ? esc(p.note) : 'Set how the road north stands. It changes the public notice the moment you press it.'}${
    p.looked ? ' \u00b7 last looked ' + esc(when(p.looked)) + (p.by ? ' by ' + esc(p.by) : '') : ''}</p>
  <div class="passbtns">
    ${Pr.STATES.map(st => `<form method="post" action="/pass/state" class="inline">${hidden(csrf)}
      <input type="hidden" name="state" value="${st.id}">
      <input type="hidden" name="back" value="${esc(back || '/hall')}">
      <button class="btn ${st.id === p.state ? 'go' : 'ghost'} passbtn" type="submit"${
        st.id === p.state ? ' aria-current="true"' : ''}>${esc(st.name)}</button>
    </form>`).join('')}
  </div>
  ${o.noteForm === false ? '' : `<form method="post" action="/pass/state" style="margin-top:16px">${hidden(csrf)}
    <input type="hidden" name="state" value="${esc(p.state)}">
    <input type="hidden" name="back" value="${esc(back || '/hall')}">
    <label for="passnote">What travellers should know</label>
    <textarea id="passnote" name="note" rows="2" maxlength="600" placeholder="Snow to the knee above the second waystation. Carts are turned back; riders and foot may go.">${esc(p.note || '')}</textarea>
    <div class="btnrow"><button class="btn ghost small" type="submit">Set the word</button>
    <a class="btn ghost small" href="/pass">See the public notice</a></div>
  </form>`}
</section>`;
}


const EYE = `<svg class="eye" id="halleye" viewBox="0 0 500 400" width="500" height="400"
  style="max-width:100%;height:auto" role="img" aria-label="The sigil of the County of Bruma: an open eye">
  <defs>
    <radialGradient id="dscl" cx="50%" cy="50%" r="54%">
      <stop offset="0%" stop-color="#2E2318"/><stop offset="62%" stop-color="#1D1610"/>
      <stop offset="100%" stop-color="#120D09"/>
    </radialGradient>
    <radialGradient id="diri" cx="42%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#F9CE7C"/><stop offset="38%" stop-color="#E09A3E"/>
      <stop offset="78%" stop-color="#8E5518"/><stop offset="100%" stop-color="#3E2409"/>
    </radialGradient>
    <radialGradient id="dglo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(240,170,70,.42)"/>
      <stop offset="100%" stop-color="rgba(240,170,70,0)"/>
    </radialGradient>
    <clipPath id="dalmond"><path d="M20 200 C110 78 390 78 480 200 C390 322 110 322 20 200 Z"/></clipPath>
  </defs>
  <ellipse cx="250" cy="200" rx="215" ry="150" fill="url(#dglo)" opacity=".5" id="dhalo"/>
  <g clip-path="url(#dalmond)">
    <path d="M20 200 C110 78 390 78 480 200 C390 322 110 322 20 200 Z" fill="url(#dscl)"/>
    <g id="diris">
      <circle cx="250" cy="200" r="86" fill="url(#diri)"/>
      <g id="dstria" stroke="#FFD894" stroke-width="1.1" opacity=".34"></g>
      <circle cx="250" cy="200" r="86" fill="none" stroke="#160E05" stroke-width="7" opacity=".85"/>
      <circle id="dring1" cx="250" cy="200" r="70" fill="none" stroke="#F2BC67" stroke-width="1.3"
        stroke-dasharray="15 11" opacity=".55"/>
      <circle id="dring2" cx="250" cy="200" r="55" fill="none" stroke="#E7D6AE" stroke-width="1"
        stroke-dasharray="3 9" opacity=".5"/>
      <circle id="dpupil" cx="250" cy="200" r="33" fill="#120B04"/>
      <circle id="dspark" cx="226" cy="176" r="12" fill="#FFF6E2" opacity=".78"/>
      <circle cx="276" cy="222" r="5" fill="#F2BC67" opacity=".32"/>
    </g>
    <rect id="dlid" x="0" y="-240" width="500" height="250" fill="#17110C"/>
    <rect id="dlidlow" x="0" y="390" width="500" height="250" fill="#17110C"/>
  </g>
  <path d="M20 200 C110 78 390 78 480 200 C390 322 110 322 20 200 Z" fill="none"
    stroke="#C9893A" stroke-width="3.4"/>
  <g id="drays" stroke="#C9893A" stroke-width="2.6" stroke-linecap="round" opacity=".62"></g>
</svg>`;

function doorPage({ title, csrf, to, flash }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#17110C">
<title>${esc(title || 'Enter the Hall')} \u00b7 County of Bruma</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/style.css?v=${stamp('style.css')}">
<link rel="icon" type="image/png" href="/bruma-seal.png">
<meta name="bruma-pass" content="${esc(passNow())}">
<script src="/door.js?v=${stamp('door.js')}" defer></script></head>
<body class="halldoor">
<canvas class="doorsnow" id="doorsnow" aria-hidden="true"></canvas>
<i class="doorvig" aria-hidden="true"></i>

<main class="doorplate">
  <div class="dooreye">${EYE}</div>
  <h1 class="doormark">County of Bruma</h1>
  <div class="doorrule" aria-hidden="true"></div>
  <p class="doorword"><b>The hall is kept by those who hold office in it.</b>Everything the County does in
  the open is at the gate, and needs no name.</p>

  <form class="doorform" method="post" action="/login">
    ${hidden(csrf)}
    <input type="hidden" name="to" value="${esc(to || '/hall')}">
    ${flash ? `<p class="doorbad" role="alert">${esc(flash.text || flash)}</p>` : ''}
    <label for="username"><span>Name upon the rolls</span>
      <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none"
        spellcheck="false" autofocus required></label>
    <label for="password"><span>Your word</span>
      <input id="password" name="password" type="password" autocomplete="current-password" required></label>
    <button class="doorgo" type="submit">Enter the Hall</button>
    <a class="doorback" href="/">&larr; Back to the County</a>
  </form>

  <p class="doorhint">No name upon the rolls? The Steward or the Count makes them. Ask in the hold.</p>
</main>

<footer class="doorfoot"><p>Hospitality to the stranger. Iron to the raider.</p></footer>
</body></html>`;
}

function message(title, text) {
  return `<section class="card"><h2>${esc(title)}</h2><p class="lede">${esc(text)}</p><p><a class="btn" href="/">Back to the County</a></p></section>`;
}

function empty(text) {
  return `<p class="empty">${esc(text)}</p>`;
}

function table(cols, rows) {
  if (!rows.length) return '';
  return `<div class="tablewrap"><table>
<thead><tr>${cols.map(c => `<th${c.num ? ' class="num"' : ''}>${esc(c.head)}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${cols.map(c => `<td${c.num ? ' class="num"' : ''}>${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>`;
}

module.exports = {
  doorPage, esc, hidden, layout, message, empty, table, today, inworld, septims, when, hours, passSetter, HALLS, OPEN, navFor, MONTHS, DAYS };
