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
    ['streak', 'public', 'Five in a row at Twenty-one', 'Someone beats Old Brannoc five hands running.']
  ]],
  ['For officers only', [
    ['petition', 'officers', 'A new petition laid', 'Number, title and who laid it.'],
    ['gaps', 'officers', 'Guards on the rota who did not stand, every morning at 9', 'Who was set to a post yesterday and never clocked on.'],
    ['overdrawn', 'officers', 'The treasury overdrawn', 'The moment the balance drops below nothing.'],
    ['portrait', 'officers', 'A portrait waiting for approval', 'When a visitor sends one in.']
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
const recent = [];

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
function hookOf(slot) {
  const sl = SLOT_BY_ID[slot];
  const u = sl ? process.env[sl.env] : '';
  return /^https?:\/\/\S+$/.test(String(u || '')) ? String(u) : '';
}
function slots() {
  const names = settings().names || {};
  return SLOTS.map(x => ({ id: x[0], env: x[1], name: names[x[0]] || x[2], url: hookOf(x[0]) }));
}
function slotName(id) { const names = settings().names || {}; return names[id] || (SLOT_BY_ID[id] || {}).name || id; }
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

const cut = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+\n/g, '\n').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

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
function stamp(kind, fn) { return d => { const e = fn(d); if (base()) e.image = { url: base() + '/discord/' + kind + '.png' }; return e; }; }

const B = {
  proclamation: d => embed({ author: 'Proclamation no. ' + d.no, title: d.title, description: '> ' + String(d.text || '').split('\n').filter(Boolean).slice(0, 4).join('\n> '), url: '/proclamations/' + d.id, color: COLORS.gold, fields: [['Given', d.dated || ''], ['Under the hand of', d.hand || '']] }),
  pass: d => embed({ author: 'The Pale Pass', title: d.say, description: d.note || '', url: '/pass', color: COLORS[d.state] || COLORS.gold }),
  judgment: d => embed({ author: 'Matter no. ' + d.no, title: d.title, description: '> ' + String(d.judgment || '').split('\n').filter(Boolean).slice(0, 4).join('\n> '), url: '/judgments', color: COLORS.court, fields: [['Fine', d.fine ? Number(d.fine).toLocaleString('en-US') + ' septims' : ''], ['Term', d.term || ''], ['Under article', d.articles || '']] }),
  gaol_in: d => embed({ author: 'The Gaol of Bruma', title: d.who + ' is held', description: 'Committed under writ no. ' + d.no + '.' + (d.comes ? ' Comes up ' + d.comes + '.' : ''), color: COLORS.gaol }),
  gaol_out: d => embed({ author: 'The Gaol of Bruma', title: d.who + ' is released', description: 'Held ' + d.days + (d.days === 1 ? ' day' : ' days') + ' under writ no. ' + d.no + '.', color: COLORS.release }),
  law: d => embed({ author: 'Laid in the archive', title: d.title, description: d.text || d.note || '', url: '/laws', color: COLORS.gold }),
  goal_set: d => embed({ author: 'The town’s goal', title: d.title, description: d.text || 'The County asks the town to build it together.', url: '/goal', color: COLORS.town, fields: [['It needs', Number(d.target).toLocaleString('en-US') + ' septims'], ['How to help', 'Pledge on the site, then hand the septims to the Steward in game.', false]] }),
  goal_built: d => embed({ author: 'Built by the town', title: 'It is built: ' + d.title, description: (FEATURE_LINES[d.feature] || 'Every septim is handed over.') + ' ' + Number(d.paid).toLocaleString('en-US') + ' septims, given by the people of Bruma.' + (d.top ? ' ' + d.top.name + ' gave the most.' : ''), url: '/', color: COLORS.town }),
  herald: d => embed({ author: 'This week in Bruma', title: d.stories[0] ? d.stories[0][0] : 'The Jerall Herald', description: d.stories.map((s, i) => (i ? '**' + s[0] + '**\n' : '') + s[1]).join('\n\n'), url: '/herald', color: COLORS.herald }),
  ghost: d => embed({ author: 'On the Jerall road', title: 'The pale figure is caught', description: '**' + d.who + '** reached it before it faded. Keep your eyes open: it walks again.', url: '/herald', color: COLORS.ghost }),
  face: d => embed({ author: d.role || 'Of Bruma', title: d.name, description: d.line ? '*\u201c' + d.line + '\u201d*' : '', url: '/', color: COLORS.face, thumb: '/faces/' + d.id + '/picture' }),
  ballad: d => embed({ author: 'Sealed into the inn’s book', title: d.title, description: d.lines.slice(0, 14).map(l => '*' + l.line + '*').join('\n') + (d.lines.length > 14 ? '\n… and ' + (d.lines.length - 14) + ' lines more' : ''), url: '/ballad?week=' + d.week, color: COLORS.ballad, fields: [['Lines', String(d.lines.length)], ['Voices', String(new Set(d.lines.map(l => l.name)).size)]] }),
  honour: d => embed({ author: d.honourName, title: d.name, description: '> ' + d.citation, url: '/honours', color: d.color || COLORS.honour, fields: [['Given by', d.byName]] }),
  sworn: d => embed({ author: 'Records of Service', title: d.name + ' is sworn to the County', description: 'Placed as ' + d.officeName + '.', url: '/who', color: COLORS.service }),
  raised: d => embed({ author: 'Records of Service', title: d.name + ' is raised', description: 'Now ' + d.officeName + '.', url: '/who', color: COLORS.service }),
  lantern: d => embed({ author: 'Lantern of the Watch', title: d.name + ' earns the ' + d.tier + ' lantern', description: d.hours + ' hours stood on the walls of Bruma.', url: '/honours', color: COLORS.lantern }),
  champion: d => embed({ author: 'The Jerall View Inn', title: 'Champions of the week', description: 'Old Brannoc wipes down the table and names them.', url: '/inn', color: COLORS.inn, fields: [['Twenty-one', d.cards ? d.cards.name + ', ' + d.cards.wins + (d.cards.wins === 1 ? ' win' : ' wins') : ''], ['Bones', d.bones ? d.bones.name + ', ' + d.bones.wins + (d.bones.wins === 1 ? ' win' : ' wins') : ''], ['Hands and games', d.played ? String(d.played) : '']] }),
  streak: d => embed({ author: 'The Jerall View Inn', title: d.name + ' beat Old Brannoc five hands running', description: 'Brannoc stares at the deck as if it has betrayed him.', url: '/inn/cards', color: COLORS.inn }),
  petition: d => embed({ author: 'For officers', title: 'Petition no. ' + d.no + ' laid: ' + d.title, description: 'From ' + d.name + '.', url: '/petitions/' + d.id, color: COLORS.officers }),
  gaps: d => embed({ author: 'For officers', title: d.count + (d.count === 1 ? ' guard on the rota did not stand yesterday' : ' guards on the rota did not stand yesterday'), description: d.posts.join('\n'), url: '/watch/week', color: COLORS.warn }),
  overdrawn: d => embed({ author: 'For officers', title: 'The treasury is overdrawn', description: 'The balance stands at ' + Number(d.balance).toLocaleString('en-US') + ' septims after: ' + d.reason, url: '/treasury', color: COLORS.bad }),
  portrait: d => embed({ author: 'For officers', title: 'A portrait waits for approval', description: d.name + (d.role ? ', ' + d.role : '') + ' has sent one in.', url: '/faces', color: COLORS.officers })
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
  herald: { stories: [['The watch stood 46 hours', '7 guards kept the walls. Halvar Stone-Fist stood the most, 14 hours.'], ['Pale figure on the Jerall road', 'Seen 4 times. Mira the Traveller reached it first.'], ['At the Jerall View', 'Kairos beat Old Brannoc the most, 9 times. Halvar drew the most blackjacks, 3.']] },
  ghost: { who: 'Mira the Traveller' },
  face: { name: 'Narina Vici-Carvain', role: 'Countess of Bruma', line: 'Drinking is the best.', id: 'sample' },
  ballad: { title: 'The Ballad of the Long Frost', week: '2026-10-05', lines: [{ line: 'The frost came down on Bruma’s wall', name: 'Mira' }, { line: 'and froze the river white', name: 'Tao-Ves' }, { line: 'the watch stood fast through every squall', name: 'Halvar' }, { line: 'and kept the lanterns bright', name: 'Kairos' }] },
  honour: { name: 'Halvar Stone-Fist', honourName: 'Shield of the Pass', citation: 'Brought the Cyrodiil caravan through the pass in a whiteout.', byName: 'Narina Vici-Carvain', color: 0x2E5E8C },
  sworn: { name: 'Clerkus Vell', officeName: 'Clerk of the County' },
  raised: { name: 'Halvar Stone-Fist', officeName: 'Captain of the Watch' },
  lantern: { name: 'Halvar Stone-Fist', tier: 'silver', hours: 152 },
  champion: { cards: { name: 'Kairos', wins: 9 }, bones: { name: 'Mira the Traveller', wins: 4 }, played: 61 },
  streak: { name: 'Kairos' },
  petition: { no: 31, id: 'x', title: 'The well on the east road is fouled', name: 'Old Ysa' },
  gaps: { count: 2, posts: ['Halvar Stone-Fist \u00b7 The North Gate, 18:00 \u2013 22:00', 'Skug \u00b7 The Chapel steps, 08:00 \u2013 12:00'] },
  overdrawn: { balance: -340, reason: 'Paid out 1,200 septims for timber for the North Gate.' },
  portrait: { name: 'Mira the Traveller', role: 'Wanderer of the Jerall' }
};

Object.keys(B).forEach(k => { B[k] = stamp(k, B[k]); });

function payload(id, data) {
  const ev = EVENT_BY_ID[id];
  const em = B[id](data || SAMPLES[id]);
  return {
    username: ev && channelFor(id) === 'officers' ? 'Bruma · Officers' : 'County of Bruma',
    avatar_url: base() ? base() + '/discord/seal.png' : undefined,
    allowed_mentions: { parse: [] },
    embeds: [em]
  };
}

function note(entry) {
  recent.unshift(Object.assign({ at: new Date().toISOString() }, entry));
  recent.length = Math.min(recent.length, LOG_MAX);
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
          const r = await fetch(job.url + (job.url.includes('?') ? '&' : '?') + 'wait=true', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(job.body), signal: ctrl.signal });
          clearTimeout(t);
          status = r.status;
          if (r.status === 429) {
            let wait = 2000;
            try { const j = await r.json(); wait = Math.min(30000, Math.ceil((Number(j.retry_after) || 2) * 1000)); } catch (_) {}
            await new Promise(res => setTimeout(res, wait));
            continue;
          }
          ok = r.ok;
          if (!ok) { err = 'Discord answered ' + r.status; break; }
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
  const slot = channelFor(id);
  const url = hookOf(slot);
  if (!url) return false;
  try {
    queue.push({ event: id, channel: slot, url, body: payload(id, data) });
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    setImmediate(pump);
    return true;
  } catch (e) { note({ event: id, channel: ev.channel, ok: false, err: e.message }); return false; }
}
function emit(id, data) { try { return send(id, data); } catch (_) { return false; } }

function testSend(channel) {
  const url = hookOf(channel);
  if (!url) throw new Error('No webhook is set for that channel.');
  const carries = EVENT_LIST.filter(e => channelFor(e.id) === channel && isOn(e.id)).map(e => e.name.replace(/,.*$/, '').toLowerCase());
  queue.push({ event: 'test', channel, url, body: { username: channel === 'officers' ? 'Bruma · Officers' : 'County of Bruma', allowed_mentions: { parse: [] }, embeds: [embed({ author: 'A word from the Great Hall', title: 'The County of Bruma is listening', description: carries.length ? 'This channel will carry: ' + carries.join(', ') + '.' : 'Nothing is set to post here yet. Choose what this channel carries on the Announcements page.', url: '/', color: COLORS.gold })] } });
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
    if (h >= 8 && hookOf(channelFor('face')) && isOn('face') && due('face', day)) {
      const f = T.faceOfDay(t);
      if (f) emit('face', { id: f.id, name: f.name, role: f.role, line: f.line });
    }
    if (h >= 9 && hookOf(channelFor('gaps')) && isOn('gaps') && due('gaps', day)) {
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
      if (hookOf(channelFor('herald')) && isOn('herald') && due('herald', wk)) {
        try { const H = require('../routes/town').heraldData; if (H) emit('herald', heraldStories(H(wk))); } catch (_) {}
      }
      if (hookOf(channelFor('champion')) && isOn('champion') && due('champion', wk)) {
        const Cd = require('./cards'), Bn = require('./bones');
        const c = Cd.board(wk), b = Bn.board(wk);
        if (c.top[0] || b.top[0]) emit('champion', { cards: c.top[0], bones: b.top[0], played: (c.hands || 0) + (b.games || 0) });
      }
    }
    if (t.getDay() === 1 && (h > 0 || m >= 5)) {
      const prev = T.weekKey(new Date(t.getTime() - 86400000 * 2));
      if (hookOf(channelFor('ballad')) && isOn('ballad') && due('ballad', prev)) {
        const lines = T.balladLines(prev);
        if (lines.length) emit('ballad', { title: T.balladTitle(prev), week: prev, lines });
      }
    }
  } catch (e) { note({ event: 'schedule', ok: false, err: e.message }); }
}

function heraldStories(h) {
  const s = [];
  if (h.lead) s.push([h.lead.title, cut(h.lead.body, 300)]);
  s.push([h.watch.hours ? 'The watch stood ' + h.watch.hours + ' hours' : 'The walls stood unwatched', h.watch.hours ? h.watch.guards + (h.watch.guards === 1 ? ' guard' : ' guards') + ' kept the walls.' + (h.watch.top ? ' ' + h.watch.top.name + ' stood the most, ' + h.watch.top.hours + ' hours.' : '') : 'Nobody clocked on this week.']);
  if (h.goal) s.push([h.goal.met ? h.goal.title + ': it is built' : h.goal.title, h.goal.met ? 'The town handed over every septim.' : Number(h.goal.paid).toLocaleString('en-US') + ' of ' + Number(h.goal.target).toLocaleString('en-US') + ' septims handed over.']);
  if (h.honours && h.honours.length) s.push(['Honoured by the County', h.honours.slice(0, 3).map(a => a.name + ', the ' + a.honourName).join('; ') + '.']);
  if (h.ghost && h.ghost.seen) s.push(['Pale figure on the Jerall road', 'Seen ' + h.ghost.seen + (h.ghost.seen === 1 ? ' time.' : ' times.') + (h.ghost.caught.length ? ' ' + h.ghost.caught[0] + ' reached it first.' : ' Nobody caught it.')]);
  if (h.cards && h.cards.top && h.cards.top[0]) s.push(['At the Jerall View', h.cards.top[0].name + ' beat Old Brannoc the most at twenty-one, ' + h.cards.top[0].wins + ' times.']);
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
  return { public: hookOf('public'), officers: hookOf('officers'), slots: slots(), base: base(), recent: recent.slice(), queued: queue.length };
}

module.exports = { EVENTS, EVENT_LIST, EVENT_BY_ID, SAMPLES, SLOTS, slots, slotName, channelFor, setChannels, settings, isOn, setOn, send, emit, payload, testSend, tick, start, status, seen, looksDiscord, heraldStories, FEATURE_LINES };
