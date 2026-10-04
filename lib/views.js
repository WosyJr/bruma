const C = require('./config');
const O = require('./offices');
const Pr = require('./proclaim');

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
<link rel="stylesheet" href="/style.css?v=16">
<link rel="icon" type="image/png" href="/bruma-seal.png">
<meta name="theme-color" content="#17110C">
<script src="/app.js?v=16" defer></script>${head || ''}</head>
<body>
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

module.exports = { esc, hidden, layout, message, empty, table, today, septims, when, hours, HALLS, OPEN, navFor, MONTHS, DAYS };
