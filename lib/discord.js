const S = require('./store');

const FILE = 'discord.json';
const LOG_MAX = 40;

const EVENTS = [
  ['Official', [
    ['proclamation', 'public', 'A new proclamation', 'Its number, title and opening lines.'],
    ['pass', 'public', 'The Pale Pass changes', 'Coloured by state: open, riders, escort, shut.'],
    ['judgment', 'public', 'A judgment given', 'The matter, the judgment, any fine or term.'],
    ['gaol_in', 'public', 'Someone committed to the gaol', 'Their name and the writ number. Not the grounds.'],
    ['gaol_out', 'public', 'Someone released from the gaol', 'Their name and how long they were held.'],
    ['law', 'public', 'A new law laid in the archive', 'Anything laid on the Laws and Proclamations shelf.']
  ]],
  ['Town life', [
    ['goal_set', 'public', 'A town goal set', 'What the town is building and what it needs.'],
    ['goal_built', 'public', 'A town goal built', 'When the last septim is handed over.'],
    ['herald', 'public', 'The Jerall Herald, every Sundas at 8 in the evening', 'The week’s top stories.'],
    ['ghost', 'public', 'The pale figure caught', 'As it happens.'],
    ['face', 'public', 'The Face of the Day, every morning at 8', 'With their portrait, when the site address is known.'],
    ['ballad', 'public', 'A ballad sealed, every Morndas just after midnight', 'Last week’s ballad, line by line.']
  ]],
  ['Honours and service', [
    ['honour', 'public', 'An honour given', 'The officer, the honour and its citation.'],
    ['sworn', 'public', 'Someone sworn to the County', 'Their name and office.'],
    ['raised', 'public', 'Someone raised to a new office', 'Their name and new office.'],
    ['lantern', 'public', 'Lantern of the Watch milestones', 'At 50, 150 and 400 hours on the watch.']
  ]],
  ['The inn', [
    ['champion', 'public', 'Champion of the Jerall View, every Sundas at 8 in the evening', 'Most wins that week at Twenty-one and at Bones.'],
    ['streak', 'public', 'Luck of the Nine: five in a row at Twenty-one', 'Someone beats Old Brannoc five hands running.']
  ]],
  ['For officers only', [
    ['petition', 'officers', 'A new petition laid', 'Number, title and who laid it.'],
    ['gaps', 'officers', 'Guards on the rota who did not stand, every morning at 9', 'Who was set to a post yesterday and never clocked on.'],
    ['overdrawn', 'officers', 'The treasury overdrawn', 'The moment the balance drops below nothing.'],
    ['dues', 'officers', 'What is owed, every Sundas', 'Rents, licence renewals and taxes added to the treasury as pending, and how much is overdue.'],
    ['portrait', 'officers', 'A portrait waiting for approval', 'When a visitor sends one in.'],
    ['inn_ask', 'officers', 'A traveller asks for a seat at the inn', 'Their name, or a seated patron sitting down from a new browser.'],
    ['inn_purse', 'officers', 'A patron wants to cash out, or asks for more coin', 'Who, how much, and how they have done at the tables.']
  ]]
];
const EVENT_LIST = EVENTS.reduce((a, g) => a.concat(g[1].map(e => ({ id: e[0], channel: e[1], name: e[2], note: e[3], group: g[0] }))), []);
const EVENT_BY_ID = Object.fromEntries(EVENT_LIST.map(e => [e.id, e]));

const COLORS = {
  gold: 0xE09A3E, open: 0x4E9A5B, riders: 0x5B8DB8, escort: 0xD7A54C, shut: 0xB8392E,
  court: 0x8A1E1E, gaol: 0x5A5048, release: 0x7E9A6B, town: 0xC9A06A, ghost: 0xD9E6F2,
  herald: 0xEDE3D4, face: 0xB8862F, ballad: 0x9F8CF0, honour: 0xD7A54C, service: 0x2E5E8C,
  lantern: 0xFFB45C, inn: 0x2F5A3E, officers: 0x6E2A1C, warn: 0xF2B05C, bad: 0xB8392E
};
const FEATURE_LINES = {
  bell: 'A bell now hangs in the Great Chapel.',
  beacon: 'A beacon burns on the castle tower.',
  banners: 'Banners fly along the walls of Bruma.',
  statue: 'A statue stands in the market square.',
  gate: 'The new North Gate stands.'
};

let seenBase = '';
const queue = [];
let running = false;
const LOGFILE = 'discord-log.json';
const recent = S.read(LOGFILE, []).slice(0, LOG_MAX);

function settings() { const s = S.read(FILE, { on: {}, done: {} }); s.on = s.on || {}; s.done = s.done || {}; return s; }
function saveSettings(s) { S.write(FILE, s); }
function isOn(id) { const s = settings(); return s.on[id] !== false; }
function setOn(map) {
  const s = settings();
  EVENT_LIST.forEach(e => { s.on[e.id] = !!map[e.id]; });
  saveSettings(s);
}
const SLOTS = [
  ['public', 'DISCORD_WEBHOOK', 'The public channel'],
  ['officers', 'DISCORD_OFFICERS_WEBHOOK', 'The officers’ channel'],
  ['a', 'DISCORD_WEBHOOK_A', 'Channel A'],
  ['b', 'DISCORD_WEBHOOK_B', 'Channel B'],
  ['c', 'DISCORD_WEBHOOK_C', 'Channel C'],
  ['d', 'DISCORD_WEBHOOK_D', 'Channel D'],
  ['e', 'DISCORD_WEBHOOK_E', 'Channel E'],
  ['f', 'DISCORD_WEBHOOK_F', 'Channel F']
];
const SLOT_BY_ID = Object.fromEntries(SLOTS.map(x => [x[0], { id: x[0], env: x[1], name: x[2] }]));
function siteHooks() { return settings().hooks || {}; }
function hookOf(slot) {
  const sl = SLOT_BY_ID[slot];
  if (!sl) return '';
  const site = siteHooks()[slot];
  if (site && /^https?:\/\/\S+$/.test(String(site.url || ''))) return String(site.url);
  const u = process.env[sl.env];
  return /^https?:\/\/\S+$/.test(String(u || '')) ? String(u) : '';
}
function masked(u) {
  const m = /^(https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/)(\d+)\/[\w-]+$/.exec(String(u || ''));
  if (m) return m[1] + m[2] + '/\u2022\u2022\u2022\u2022';
  return String(u || '').replace(/^(https?:\/\/[^/]+\/).*$/, '$1\u2022\u2022\u2022\u2022');
}
function slots() {
  const st = settings();
  const names = st.names || {};
  const hooks = st.hooks || {};
  return SLOTS.map(x => {
    const site = hooks[x[0]] && hooks[x[0]].url ? hooks[x[0]] : null;
    const url = hookOf(x[0]);
    return { id: x[0], env: x[1], name: names[x[0]] || (site && site.info && site.info.name) || x[2], url, from: url ? (site ? 'site' : 'railway') : '', masked: masked(url), info: (site && site.info) || null };
  });
}
function setHook(slot, url) {
  if (!SLOT_BY_ID[slot]) return false;
  const s = settings();
  s.hooks = s.hooks || {};
  if (!url) { delete s.hooks[slot]; saveSettings(s); return true; }
  s.hooks[slot] = { url: String(url).trim(), at: new Date().toISOString() };
  saveSettings(s);
  return true;
}
async function learnHook(slot) {
  const s = settings();
  const h = /^own:/.test(slot) ? (s.own && s.own[slot.slice(4)]) : (s.hooks && s.hooks[slot]);
  if (!h || !looksDiscord(h.url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(h.url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) { h.info = { bad: 'Discord answered ' + r.status }; saveSettings(s); return h.info; }
    const j = await r.json();
    h.info = { name: String(j.name || '').slice(0, 40), channel: String(j.channel_id || ''), guild: String(j.guild_id || '') };
    if (!j.avatar && bannerFile('seal')) {
      try {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 6000);
        const r2 = await fetch(h.url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ avatar: 'data:image/png;base64,' + bannerFile('seal').toString('base64') }), signal: c2.signal });
        clearTimeout(t2);
        h.info.sealed = r2.ok;
      } catch (_) { h.info.sealed = false; }
    } else if (j.avatar) h.info.sealed = true;
    saveSettings(s);
    return h.info;
  } catch (e) { h.info = { bad: e.name === 'AbortError' ? 'Discord did not answer in time' : 'Could not reach Discord' }; saveSettings(s); return h.info; }
}
function slotName(id) {
  if (/^own:/.test(String(id))) { const ev = EVENT_BY_ID[String(id).slice(4)]; return 'its own channel' + (ev ? ' (' + ev.name.replace(/,.*$/, '') + ')' : ''); }
  const names = settings().names || {}; return names[id] || (SLOT_BY_ID[id] || {}).name || id;
}
function ownHook(id) { const o = settings().own || {}; const h = o[id]; return h && /^https?:\/\/\S+$/.test(String(h.url || '')) ? { url: String(h.url), masked: masked(h.url), info: h.info || null, at: h.at } : null; }
function setOwn(id, url) {
  if (!EVENT_BY_ID[id]) return false;
  const s = settings();
  s.own = s.own || {};
  if (!url) { delete s.own[id]; saveSettings(s); return true; }
  s.own[id] = { url: String(url).trim(), at: new Date().toISOString() };
  saveSettings(s);
  return true;
}
function hookFor(id) { const own = ownHook(id); return own ? own.url : hookOf(channelFor(id)); }
function targetName(id) { return ownHook(id) ? slotName('own:' + id) : slotName(channelFor(id)); }
function channelFor(id) {
  const ev = EVENT_BY_ID[id];
  const set = settings().channels || {};
  const chosen = set[id];
  return chosen && SLOT_BY_ID[chosen] ? chosen : (ev ? ev.channel : 'public');
}
function setChannels(map, names) {
  const s = settings();
  s.channels = s.channels || {};
  s.names = s.names || {};
  EVENT_LIST.forEach(e => { if (map[e.id] && SLOT_BY_ID[map[e.id]]) s.channels[e.id] = map[e.id]; });
  SLOTS.forEach(x => { if (names && names[x[0]] !== undefined) { const n = String(names[x[0]]).replace(/[\r\n]/g, '').trim().slice(0, 40); if (n) s.names[x[0]] = n; else delete s.names[x[0]]; } });
  saveSettings(s);
}
function looksDiscord(u) { return /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(String(u || '')); }
function base() { return String(process.env.SITE_URL || seenBase || '').replace(/\/+$/, ''); }
function seen(req) {
  if (seenBase || process.env.SITE_URL) return;
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').replace(/[^\w.:-]/g, '');
  if (!host || /^(localhost|127\.|0\.0\.0\.0)/.test(host)) return;
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';
  seenBase = proto + '://' + host;
}
const link = p => (base() ? base() + p : undefined);

const cut = (s, n) => { const t = String(s == null ? '' : s).replace(/[ \t]+\n/g, '\n').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

function embed(o) {
  const e = { title: cut(o.title, 250), color: o.color || COLORS.gold, timestamp: new Date().toISOString(), footer: { text: o.footer || 'County of Bruma · Hospitality to the stranger, iron to the raider' } };
  if (o.author) e.author = { name: cut(o.author, 250) };
  if (o.description) e.description = cut(o.description, 1800);
  const u = o.url ? link(o.url) : undefined;
  if (u) e.url = u;
  if (o.fields) e.fields = o.fields.filter(f => f && f[1]).slice(0, 10).map(f => ({ name: cut(f[0], 250), value: cut(f[1], 1000), inline: f[2] !== false }));
  if (o.thumb && base()) e.thumbnail = { url: base() + o.thumb };
  return e;
}
const BANNER_DIR = require('path').join(__dirname, '..', 'public', 'discord');
const bannerCache = {};
function bannerFile(kind) {
  if (bannerCache[kind] !== undefined) return bannerCache[kind];
  try { bannerCache[kind] = require('fs').readFileSync(require('path').join(BANNER_DIR, kind + '.png')); } catch (_) { bannerCache[kind] = null; }
  return bannerCache[kind];
}
function stamp(kind, fn) { return d => { const e = fn(d); if (d && d.png) e.image = { url: 'attachment://herald.png' }; else if (bannerFile(kind)) e.image = { url: 'attachment://' + kind + '.png' }; else if (base()) e.image = { url: base() + '/discord/' + kind + '.png' }; return e; }; }

const more = (p, say) => { const u = link(p); return u ? '\n\n→ [' + say + '](' + u + ')' : ''; };
const PASS_WORD = { open: 'The road north is clear.', riders: 'Riders and foot may cross; carts wait.', escort: 'Cross only with an escort of the watch.', shut: 'No one crosses until the watch says otherwise.' };
const LANTERN_WORD = { bronze: 'Fifty hours, and the first lantern is lit.', silver: 'A hundred and fifty hours: the walls know their step.', gold: 'Four hundred hours. Few have stood so long.' };

const B = {
  proclamation: d => embed({ author: 'Proclamation no. ' + d.no + ' · By the hand of the County', title: d.title, description: '> ' + String(d.text || '').split('\n').filter(Boolean).slice(0, 4).join('\n> ') + more('/proclamations/' + d.id, 'Read the proclamation in full'), url: '/proclamations/' + d.id, color: COLORS.gold, fields: [['Given', d.dated || ''], ['Under the hand of', d.hand || '']] }),
  pass: d => embed({ author: 'The road north', title: d.say, description: (d.note ? d.note + '\n\n' : '') + PASS_WORD[d.state] + more('/pass', 'See the pass'), url: '/pass', color: COLORS[d.state] || COLORS.gold }),
  judgment: d => embed({ author: 'The Court of Bruma · Matter no. ' + d.no, title: d.title, description: '> ' + String(d.judgment || '').split('\n').filter(Boolean).slice(0, 4).join('\n> ') + more('/judgments', 'Read the judgment'), url: '/judgments', color: COLORS.court, fields: [['Fine', d.fine ? Number(d.fine).toLocaleString('en-US') + ' septims' : ''], ['Term', d.term || ''], ['Under article', d.articles || '']] }),
  gaol_in: d => embed({ author: 'The Gaol of Bruma', title: d.who + ' is committed to the gaol', description: '**' + d.who + '** is held under writ no. ' + d.no + '.' + (d.comes ? ' Comes before the court ' + d.comes + '.' : '') + '\n\nThe grounds are not read out. Officers may see them on the site.', color: COLORS.gaol }),
  gaol_out: d => embed({ author: 'The Gaol of Bruma', title: d.who + ' walks free', description: '**' + d.who + '** is released after ' + d.days + (d.days === 1 ? ' day' : ' days') + ' under writ no. ' + d.no + '. The gate stands open behind them.', color: COLORS.release }),
  law: d => embed({ author: 'Laid in the Archive', title: d.title, description: (d.text || d.note || '') + more('/laws', 'Read it in the Laws and Charters'), url: '/laws', color: COLORS.gold }),
  goal_set: d => embed({ author: 'The town builds', title: d.title, description: (d.text || 'The County asks the town to build it together.') + more('/goal', 'Pledge on the site'), url: '/goal', color: COLORS.town, fields: [['It needs', Number(d.target).toLocaleString('en-US') + ' septims'], ['How to help', 'Pledge on the site, then hand the septims to the Steward in game.', false]] }),
  goal_built: d => embed({ author: 'The town builds', title: 'It is built: ' + d.title, description: (FEATURE_LINES[d.feature] || 'Every septim is handed over.') + '\n\n**' + Number(d.paid).toLocaleString('en-US') + ' septims**, given by the people of Bruma.' + (d.top ? ' **' + d.top.name + '** gave the most.' : '') + more('/', 'See it on the County’s front'), url: '/', color: COLORS.town }),
  herald: d => embed({ author: 'The Jerall Herald · This week in Bruma', title: d.png ? 'This week’s paper is out' : (d.stories[0] ? d.stories[0][0] : 'The Jerall Herald'), description: d.png ? 'Price one copper. Hot off the press at the Jerall View.' + more('/herald', 'Read it on the site') : d.stories.map((s, i) => (i ? '**' + s[0] + '**\n' : '') + s[1]).join('\n\n') + more('/herald', 'Read the whole paper'), url: '/herald', color: COLORS.herald }),
  ghost: d => embed({ author: 'On the Jerall road', title: 'The pale figure is caught', description: '**' + d.who + '** reached it before it faded into the snow.\n\nKeep your eyes open on the road: it walks again.', url: '/herald', color: COLORS.ghost }),
  face: d => embed({ author: 'Face of the Day · ' + (d.role || 'Of Bruma'), title: d.name, description: (d.line ? '*“' + d.line + '”*\n\n' : '') + 'Raise a cup to them on the County’s front.' + more('/', 'Raise a cup'), url: '/', color: COLORS.face, thumb: '/faces/' + d.id + '/picture' }),
  ballad: d => embed({ author: 'Sealed into the inn’s book', title: d.title, description: d.lines.slice(0, 14).map(l => '*' + l.line + '*').join('\n') + (d.lines.length > 14 ? '\n*… and ' + (d.lines.length - 14) + ' lines more*' : '') + more('/ballad?week=' + d.week, 'Read the whole ballad'), url: '/ballad?week=' + d.week, color: COLORS.ballad, fields: [['Lines', String(d.lines.length)], ['Voices', String(new Set(d.lines.map(l => l.name)).size)]] }),
  honour: d => embed({ author: 'The Roll of Honour', title: d.name + ' is given the ' + d.honourName, description: '> ' + d.citation + '\n\nWritten upon their Record of Service, and worn as a ribbon beside their name.' + more('/honours', 'See the Roll of Honour'), url: '/honours', color: d.color || COLORS.honour, fields: [['Honour', d.honourName], ['Given by', d.byName]] }),
  sworn: d => embed({ author: 'Records of Service', title: d.name + ' is sworn to the County', description: '**' + d.name + '** took the oath and is placed as **' + d.officeName + '**.\n\nHospitality to the stranger, iron to the raider.' + more('/who', 'See who sits at court'), url: '/who', color: COLORS.service }),
  raised: d => embed({ author: 'Records of Service', title: d.name + ' is raised', description: '**' + d.name + '** is raised to **' + d.officeName + '**. The County thanks them for their service and expects more of it.' + more('/who', 'See who sits at court'), url: '/who', color: COLORS.service }),
  lantern: d => embed({ author: 'Lantern of the Watch', title: d.name + ' earns the ' + d.tier + ' lantern', description: '**' + d.name + '** has stood **' + d.hours + ' hours** on the walls of Bruma. ' + LANTERN_WORD[d.tier] + more('/honours', 'See the Roll of Honour'), url: '/honours', color: COLORS.lantern }),
  champion: d => embed({ author: 'The Jerall View Inn', title: 'Champions of the week', description: 'Old Brannoc wipes down the table and names them.' + more('/inn', 'Take a seat at the inn'), url: '/inn', color: COLORS.inn, fields: [['Twenty-one', d.cards ? '**' + d.cards.name + '**\n' + d.cards.wins + (d.cards.wins === 1 ? ' win' : ' wins') : ''], ['Bones', d.bones ? '**' + d.bones.name + '**\n' + d.bones.wins + (d.bones.wins === 1 ? ' win' : ' wins') : ''], ['Hands and games', d.played ? String(d.played) : '']] }),
  streak: d => embed({ author: 'The Jerall View Inn', title: d.name + ' beat Old Brannoc five hands running', description: 'Brannoc stares at the deck as if it has betrayed him. The whole inn heard about it.' + more('/inn/cards', 'Try your luck'), url: '/inn/cards', color: COLORS.inn }),
  inn_purse: d => embed({ author: 'For officers · The Jerall View Inn', title: d.kind === 'cashout' ? d.name + ' wants to cash out ' + Number(d.amount).toLocaleString('en-US') : d.name + ' asks for ' + (d.amount ? Number(d.amount).toLocaleString('en-US') + ' more' : 'more') + ' coin', description: (d.note ? '*' + d.note + '*\n' : '') + (d.net ? (d.net > 0 ? 'Won ' : 'Lost ') + Number(Math.abs(d.net)).toLocaleString('en-US') + ' at the tables so far. ' : '') + (d.kind === 'cashout' ? 'It is set aside from their purse. Pay them in game, then mark it paid.' : 'Once they hand the coin over in game, add it in the ledger.') + more('/inn/ledger', 'Open the Inn Ledger'), url: '/inn/ledger', color: COLORS.inn }),
  inn_ask: d => embed({ author: 'For officers · The Jerall View Inn', title: d.returning ? d.name + ' wants to sit down from another browser' : d.name + ' asks for a seat at the inn', description: (d.who ? '*' + d.who + '*\n' : '') + (d.code ? 'Passcode given: **' + d.code + '**\n' : '') + (d.kind === 'login' ? 'An officer of the County. ' : '') + 'Check the passcode and seat them in the Inn Ledger, then fill their purse once they hand over coin.' + more('/inn/ledger', 'Open the Inn Ledger'), url: '/inn/ledger', color: COLORS.inn }),
  petition: d => embed({ author: 'For officers · Petitions', title: 'Petition no. ' + d.no + ': ' + d.title, description: 'Laid by **' + d.name + '**. It waits for an answer.' + more('/petitions/' + d.id, 'Read the petition'), url: '/petitions/' + d.id, color: COLORS.officers }),
  gaps: d => embed({ author: 'For officers · The Watch', title: d.count + (d.count === 1 ? ' guard on the rota did not stand yesterday' : ' guards on the rota did not stand yesterday'), description: d.posts.map(p => '• ' + p).join('\n') + more('/watch/week', 'See the rota'), url: '/watch/week', color: COLORS.warn }),
  dues: d => embed({ author: 'For officers · The Treasury', title: d.count + (d.count === 1 ? ' sum' : ' sums') + ' owed this week: ' + Number(d.total).toLocaleString('en-US') + ' septims', description: [d.rent ? 'Rents: **' + Number(d.rent).toLocaleString('en-US') + '**' : '', d.licence ? 'Licence renewals: **' + Number(d.licence).toLocaleString('en-US') + '**' : '', d.tax ? 'Taxes owing: **' + Number(d.tax).toLocaleString('en-US') + '**' : ''].filter(Boolean).join('\n') + (d.overdue ? '\n' + d.overdue + ' still unpaid from earlier weeks, ' + Number(d.overdueSum).toLocaleString('en-US') + ' septims.' : '') + '\nMark each one collected once the coin is handed over.' + more('/treasury#owed', 'Open what is owed'), url: '/treasury#owed', color: COLORS.face }),
  overdrawn: d => embed({ author: 'For officers · The Treasury', title: 'The treasury is overdrawn', description: 'The balance stands at **' + Number(d.balance).toLocaleString('en-US') + ' septims** after: ' + d.reason + more('/treasury', 'Open the ledger'), url: '/treasury', color: COLORS.bad }),
  portrait: d => embed({ author: 'For officers · Faces of Bruma', title: 'A portrait waits for approval', description: '**' + d.name + '**' + (d.role ? ', ' + d.role + ',' : '') + ' has sent one in. Put it up or turn it away.' + more('/faces', 'See the portrait'), url: '/faces', color: COLORS.officers })
};

const SAMPLES = {
  proclamation: { no: 12, id: 'x', title: 'On the closing of the Pale Pass', text: 'By the hand of the Countess of Bruma: the Pale Pass is closed to all travel north of the third waystation until the snows ease. Riders found above the waystation without leave of the Captain will be turned back.', dated: '11th of Frostfall, 4E 226', hand: 'Narina Vici-Carvain, Countess of Bruma' },
  pass: { state: 'shut', say: 'The Pale Pass is shut', note: 'Snow to the shoulder above the third waystation. The watch will open it when the road is cleared.' },
  judgment: { no: 7, title: 'The County against Hrolf the Grey', judgment: 'Found to have carried skooma through the North Gate. Fined and to be held until the fine is paid.', fine: 500, term: '3 days', articles: 'IV.2' },
  gaol_in: { who: 'Hrolf the Grey', no: 14, comes: '13th of Frostfall' },
  gaol_out: { who: 'Hrolf the Grey', no: 14, days: 3 },
  law: { title: 'An Act on the Keeping of Wolves within the Walls', note: 'Laid by the Clerk of the County.' },
  goal_set: { title: 'A bell for the Great Chapel', text: 'The chapel has rung no bell since the Great War. Let it ring again.', target: 5000 },
  goal_built: { title: 'A bell for the Great Chapel', feature: 'bell', paid: 5000, top: { name: 'Kairos' } },
  herald: { stories: [['The watch stood 46 hours', '7 guards kept the walls. Halvar Stone-Fist stood the most, 14 hours.'], ['Pale figure on the Jerall road', 'Seen 4 times. Mira the Traveller reached it first.']] },
  ghost: { who: 'Mira the Traveller' },
  face: { name: 'Narina Vici-Carvain', role: 'Countess of Bruma', line: 'Drinking is the best.', id: 'sample' },
  ballad: { title: 'The Ballad of the Long Frost', week: '2026-10-05', lines: [{ line: 'The frost came down on Bruma’s wall', name: 'Mira' }, { line: 'and froze the river white', name: 'Tao-Ves' }, { line: 'the watch stood fast through every squall', name: 'Halvar' }, { line: 'and kept the lanterns bright', name: 'Kairos' }] },
  honour: { name: 'Halvar Stone-Fist', honourName: 'Shield of the Pass', citation: 'Brought the Cyrodiil caravan through the pass in a whiteout.', byName: 'Narina Vici-Carvain', color: 0x2E5E8C },
  sworn: { name: 'Clerkus Vell', officeName: 'Clerk of the County' },
  raised: { name: 'Halvar Stone-Fist', officeName: 'Captain of the Watch' },
  lantern: { name: 'Halvar Stone-Fist', tier: 'silver', hours: 152 },
  champion: { cards: { name: 'Kairos', wins: 9 }, bones: { name: 'Mira the Traveller', wins: 4 }, played: 61 },
  streak: { name: 'Kairos' },
  inn_ask: { name: 'Mira the Traveller', who: 'A trader from Cheydinhal', kind: 'guest', code: 'nightshade' },
  inn_purse: { name: 'Kairos', kind: 'cashout', amount: 1340, net: 340 },
  petition: { no: 31, id: 'x', title: 'The well on the east road is fouled', name: 'Old Ysa' },
  gaps: { count: 2, posts: ['Halvar Stone-Fist \u00b7 The North Gate, 18:00 \u2013 22:00', 'Skug \u00b7 The Chapel steps, 08:00 \u2013 12:00'] },
  dues: { count: 9, total: 2350, rent: 1600, licence: 500, tax: 250, overdue: 2, overdueSum: 300 },
  overdrawn: { balance: -340, reason: 'Paid out 1,200 septims for timber for the North Gate.' },
  portrait: { name: 'Mira the Traveller', role: 'Wanderer of the Jerall' }
};

Object.keys(B).forEach(k => { B[k] = stamp(k, B[k]); });

function payload(id, data) {
  const ev = EVENT_BY_ID[id];
  const em = B[id](data || SAMPLES[id]);
  return {
    username: ev && !ownHook(id) && channelFor(id) === 'officers' ? 'Bruma · Officers' : 'County of Bruma',
    avatar_url: base() ? base() + '/discord/seal.png' : undefined,
    allowed_mentions: { parse: [] },
    embeds: [em]
  };
}

function note(entry) {
  recent.unshift(Object.assign({ at: new Date().toISOString() }, entry));
  recent.length = Math.min(recent.length, LOG_MAX);
  try { S.write(LOGFILE, recent); } catch (_) {}
  if (!entry.ok) console.error('[discord] ' + (entry.event || '') + ' to ' + (entry.channel || '') + ' failed: ' + (entry.err || entry.status || 'unknown'));
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      let ok = false, status = 0, err = '';
      for (let tryN = 0; tryN < 3 && !ok; tryN++) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 10000);
          let r;
          if (job.files && job.files.length) {
            const fd = new FormData();
            fd.append('payload_json', JSON.stringify(job.body));
            job.files.forEach((f, i) => fd.append('files[' + i + ']', new Blob([f.data], { type: 'image/png' }), f.name));
            r = await fetch(job.url + (job.url.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', body: fd, signal: ctrl.signal });
          } else {
            r = await fetch(job.url + (job.url.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(job.body), signal: ctrl.signal });
          }
          clearTimeout(t);
          status = r.status;
          if (r.status === 429) {
            let wait = 2000;
            try { const j = await r.json(); wait = Math.min(30000, Math.ceil((Number(j.retry_after) || 2) * 1000)); } catch (_) {}
            await new Promise(res => setTimeout(res, wait));
            continue;
          }
          ok = r.ok;
          if (!ok) {
            let why = '';
            try { const j = await r.json(); why = j && j.message ? String(j.message) : ''; } catch (_) {}
            err = 'Discord answered ' + r.status + (why ? ': ' + why : '');
            if (r.status >= 500) { await new Promise(res => setTimeout(res, 2000)); continue; }
            break;
          }
        } catch (e) { err = e.name === 'AbortError' ? 'Discord did not answer in time' : e.message; await new Promise(res => setTimeout(res, 1500)); }
      }
      note({ event: job.event, channel: job.channel, ok, status, err, title: (job.body.embeds && job.body.embeds[0] && job.body.embeds[0].title) || '' });
      await new Promise(res => setTimeout(res, 1100));
    }
  } finally { running = false; }
}

function send(id, data, opts) {
  const ev = EVENT_BY_ID[id];
  if (!ev || !B[id]) return false;
  const o = opts || {};
  if (!o.force && !isOn(id)) return false;
  const own = ownHook(id);
  const slot = own ? 'own:' + id : channelFor(id);
  const url = own ? own.url : hookOf(slot);
  if (!url) return false;
  try {
    const files = data && data.png ? [{ name: 'herald.png', data: data.png }] : (bannerFile(id) ? [{ name: id + '.png', data: bannerFile(id) }] : null);
    queue.push({ event: id, channel: slot, url, body: payload(id, data), files });
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    setImmediate(pump);
    return true;
  } catch (e) { note({ event: id, channel: ev.channel, ok: false, err: e.message }); return false; }
}
function emit(id, data) { try { return send(id, data); } catch (_) { return false; } }

function testSend(channel) {
  const ownId = /^own:/.test(channel) ? channel.slice(4) : '';
  const url = ownId ? (ownHook(ownId) || {}).url : hookOf(channel);
  if (!url) throw new Error('No webhook is set for that channel.');
  const carries = EVENT_LIST.filter(e => (ownId ? e.id === ownId : (channelFor(e.id) === channel && !ownHook(e.id))) && isOn(e.id)).map(e => e.name.replace(/,.*$/, '').toLowerCase());
  const te = embed({ author: 'A word from the Great Hall', title: 'The County of Bruma is listening', description: carries.length ? 'This channel will carry: ' + carries.join(', ') + '.' : 'Nothing is set to post here yet. Choose what this channel carries on the Announcements page.', url: '/', color: COLORS.gold });
  if (bannerFile('proclamation')) te.image = { url: 'attachment://proclamation.png' };
  queue.push({ event: 'test', channel, url, body: { username: channel === 'officers' ? 'Bruma · Officers' : 'County of Bruma', avatar_url: base() ? base() + '/discord/seal.png' : undefined, allowed_mentions: { parse: [] }, embeds: [te] }, files: bannerFile('proclamation') ? [{ name: 'proclamation.png', data: bannerFile('proclamation') }] : null });
  setImmediate(pump);
}

function due(key, stamp) {
  const s = settings();
  if (s.done[key] === stamp) return false;
  s.done[key] = stamp;
  saveSettings(s);
  return true;
}

function tick(now) {
  const t = now || new Date();
  try {
    const T = require('./town');
    const day = T.dayKey(t);
    const h = t.getHours(), m = t.getMinutes();
    if (h >= 8 && hookFor('face') && isOn('face') && due('face', day)) {
      const f = T.faceOfDay(t);
      if (f) emit('face', { id: f.id, name: f.name, role: f.role, line: f.line });
    }
    if (h >= 9 && hookFor('gaps') && isOn('gaps') && due('gaps', day)) {
      const y = new Date(t.getTime() - 86400000);
      const W = require('./watch');
      const yk = T.dayKey(y);
      const grid = W.weekGrid(T.weekKey(y));
      const posts = [];
      grid.rows.forEach(r => r.cells.filter(c => c.day === yk).forEach(c => c.people.filter(x => x.kind === 'set').forEach(x => posts.push(x.name + ' \u00b7 ' + r.name + ', ' + x.hours))));
      if (posts.length) emit('gaps', { count: posts.length, posts });
    }
    if (t.getDay() === 0 && h >= 20) {
      const wk = T.weekKey(t);
      if (hookFor('herald') && isOn('herald') && due('herald', wk)) {
        try { emit('herald', heraldPost(wk)); } catch (_) {}
      }
      if (hookFor('champion') && isOn('champion') && due('champion', wk)) {
        const Inn = require('./inn');
        const c = Inn.board('cards', wk), b = Inn.board('bones', wk);
        if (c.top[0] || b.top[0]) emit('champion', { cards: c.top[0], bones: b.top[0], played: (c.hands || 0) + (b.games || 0) });
      }
    }
    if (t.getDay() === 1 && (h > 0 || m >= 5)) {
      const prev = T.weekKey(new Date(t.getTime() - 86400000 * 2));
      if (hookFor('ballad') && isOn('ballad') && due('ballad', prev)) {
        const lines = T.balladLines(prev);
        if (lines.length) emit('ballad', { title: T.balladTitle(prev), week: prev, lines });
      }
    }
  } catch (e) { note({ event: 'schedule', ok: false, err: e.message }); }
}

function heraldPost(wk) {
  const H = require('../routes/town').heraldData;
  const h = H(wk);
  const d = heraldStories(h);
  try { const HI = require('./heraldimage'); const png = HI.render(h, { dateline: require('./views').inworld(wk + 'T12:00:00') }); if (png) d.png = png; } catch (_) {}
  return d;
}

function heraldStories(h) {
  const s = [];
  if (h.lead) s.push([h.lead.title, cut(h.lead.body, 300)]);
  s.push([h.watch.hours ? 'The watch stood ' + h.watch.hours + ' hours' : 'The walls stood unwatched', h.watch.hours ? h.watch.guards + (h.watch.guards === 1 ? ' guard' : ' guards') + ' kept the walls.' + (h.watch.top ? ' ' + h.watch.top.name + ' stood the most, ' + h.watch.top.hours + ' hours.' : '') : 'Nobody clocked on this week.']);
  if (h.goal) s.push([h.goal.met ? h.goal.title + ': it is built' : h.goal.title, h.goal.met ? 'The town handed over every septim.' : Number(h.goal.paid).toLocaleString('en-US') + ' of ' + Number(h.goal.target).toLocaleString('en-US') + ' septims handed over.']);
  if (h.honours && h.honours.length) s.push(['Honoured by the County', h.honours.slice(0, 3).map(a => a.name + ', the ' + a.honourName).join('; ') + '.']);
  if (h.ghost && h.ghost.seen) s.push(['Pale figure on the Jerall road', 'Seen ' + h.ghost.seen + (h.ghost.seen === 1 ? ' time.' : ' times.') + (h.ghost.caught.length ? ' ' + h.ghost.caught[0] + ' reached it first.' : ' Nobody caught it.')]);
  s.push(['The Pale Pass', 'As the week ends the pass is ' + String(h.pass || '').toLowerCase() + '.']);
  return { stories: s.slice(0, 4) };
}

let timer = null;
function start() {
  if (timer) return;
  timer = setInterval(() => tick(), 5 * 60 * 1000);
  if (timer.unref) timer.unref();
  setTimeout(() => tick(), 15000).unref();
}

function status() {
  return { public: hookOf('public'), officers: hookOf('officers'), slots: slots(), base: base(), recent: recent.slice(), failed: recent.filter(r => !r.ok).length, queued: queue.length };
}

module.exports = { EVENTS, EVENT_LIST, EVENT_BY_ID, SAMPLES, SLOTS, slots, slotName, setHook, learnHook, hookOf, ownHook, setOwn, hookFor, targetName, heraldPost, channelFor, setChannels, settings, isOn, setOn, send, emit, payload, testSend, tick, start, status, seen, looksDiscord, heraldStories, FEATURE_LINES };
