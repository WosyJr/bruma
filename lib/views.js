const C = require('./config');
const O = require('./offices');

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

const HALLS = [
  { id: 'hall', name: 'The Great Hall', href: '/hall', perm: 'hall' },
  { id: 'watch', name: 'The Watch', href: '/watch', perm: 'watchclock', alt: 'watchlog' },
  { id: 'property', name: 'The Property Roll', href: '/property', perm: 'propread' },
  { id: 'treasury', name: 'The Treasury', href: '/treasury', perm: 'treasread' },
  { id: 'guilds', name: 'The Guilds', href: '/guilds', perm: 'guildsee', alt: 'guildown' },
  { id: 'court', name: 'The Court', href: '/court', perm: 'courtsee', alt: 'courtfile' },
  { id: 'archive', name: 'The Archive', href: '/archive', perm: 'archread' }
];

function navFor(u) {
  if (!u) return [];
  const out = HALLS.filter(h => O.can(u, h.perm) || (h.alt && O.can(u, h.alt)));
  if (O.can(u, 'officers')) out.push({ id: 'officers', name: 'The Officers', href: '/officers' });
  return out;
}

function flashBlock(f) {
  if (!f) return '';
  const cls = f.err ? 'flash bad' : 'flash';
  return `<div class="${cls}" role="status">${f.html || esc(f.text || f)}</div>`;
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
<link rel="stylesheet" href="/style.css?v=5">
<link rel="icon" type="image/png" href="/bruma-seal.png">
<meta name="theme-color" content="#17110C">
<script src="/app.js?v=5" defer></script>${head || ''}</head>
<body>
<div class="topbar">
  <span class="stamp">${esc(t.text)}</span>
  <span class="topright">${right}</span>
</div>

<header class="crest">
  <div class="crestinner">
    <img class="arms" src="/bruma-banner.png" alt="The arms of the County of Bruma" width="200" height="523">
    <div>
      <div class="eyebrow">By the hand of the County</div>
      <h1><a href="/">County of Bruma</a></h1>
      <div class="seat">The Jerall Mountains · Seat of the County · Imperial Province of Cyrodiil</div>
    </div>
  </div>
</header>

${nav.length ? `<nav class="halls" aria-label="The halls of the County">
  <div class="inner">${nav.map(h => `<a href="${h.href}"${active === h.id ? ' class="on" aria-current="page"' : ''}>${esc(h.name)}</a>`).join('')}</div>
</nav>` : ''}

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

module.exports = { esc, hidden, layout, message, empty, table, today, septims, when, hours, HALLS, navFor, MONTHS, DAYS };
