const S = require('./store');

const TYPES = 'honour-types.json';
const AWARDS = 'honours.json';

const PRESETS = [
  { id: 'pass', name: 'Shield of the Pass', colors: ['#2E5E8C', '#E9E6D8', '#2E5E8C'], note: 'For holding the Pale Pass, or bringing travellers through it, at hazard to oneself.' },
  { id: 'gate', name: 'Iron of the North Gate', colors: ['#5A5048', '#B8392E', '#5A5048'], note: 'For valour at the walls: a raid turned back, a gate held.' },
  { id: 'frost', name: 'Frostfall Cross', colors: ['#E9E6D8', '#8A1E1E', '#E9E6D8'], note: 'For wounds taken in the service of the County.' },
  { id: 'hearth', name: 'Hearthkeeper’s Ribbon', colors: ['#B8862F', '#6E2A1C', '#B8862F'], note: 'For care of the townsfolk beyond what the office asks.' },
  { id: 'seal', name: 'The Steward’s Seal', colors: ['#1F4A35', '#D7A54C', '#1F4A35'], note: 'For a ledger, a court or a roll kept so well it shames the rest.' },
  { id: 'jerall', name: 'Star of the Jerall', colors: ['#14223A', '#D7A54C', '#9FC3D6', '#D7A54C', '#14223A'], note: 'The County’s highest honour. Given rarely, by the Count’s own hand.' },
  { id: 'bear', name: 'The Bear of Bruma', colors: ['#3B2617', '#C8B79C', '#3B2617'], note: 'For strength: a beast faced, a wall held with bare hands, a cart lifted off a man.' },
  { id: 'wolf', name: 'Wolf of the Jerall', colors: ['#5A5048', '#E9E6D8', '#B8392E', '#E9E6D8', '#5A5048'], note: 'For the hunt: wolves, bandits or worse tracked down in the high snow.' },
  { id: 'lantern-bearer', name: 'Lantern-Bearer', colors: ['#2A1E14', '#FFB45C', '#2A1E14'], note: 'For a traveller found and brought in alive from the cold.' },
  { id: 'quill', name: 'The Clerk’s Quill', colors: ['#1F1710', '#E9E6D8', '#1F1710'], note: 'For writing that served the County: a charter drafted, a case set down so well it settled the matter.' },
  { id: 'coin', name: 'The Honest Coin', colors: ['#B8862F', '#1F4A35', '#B8862F'], note: 'For a trader or steward whose books never once came up short.' },
  { id: 'chapel', name: 'Candle of the Great Chapel', colors: ['#E9E6D8', '#D7A54C', '#E9E6D8'], note: 'For mercy shown where the law allowed none.' },
  { id: 'hammer', name: 'The Miners’ Hammer', colors: ['#5A5048', '#B87333', '#5A5048'], note: 'For a season of ore that kept the forges lit.' },
  { id: 'shield-wall', name: 'The Shield-Wall', colors: ['#8A1E1E', '#5A5048', '#8A1E1E'], note: 'For the watch that stood together on a night the walls were tried.' },
  { id: 'founder', name: 'Founder of Bruma', colors: ['#D7A54C', '#8A1E1E', '#D7A54C', '#8A1E1E', '#D7A54C'], note: 'For those who built the County in its first year.' }
];

const AUTO = [
  { id: 'years', name: 'Year of Service', colors: ['#6E4A1C', '#C9A06A', '#6E4A1C'], note: 'One for each full year sworn to the County. The site gives it on its own.', auto: true },
  { id: 'lantern', name: 'Lantern of the Watch', colors: ['#2A1E14', '#FFB45C', '#2A1E14'], note: 'For hours stood on the watch: bronze at 50, silver at 150, gold at 400. The site gives it on its own.', auto: true }
];
const LANTERN = [[400, 'gold'], [150, 'silver'], [50, 'bronze']];

const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const HEX = /^#[0-9A-Fa-f]{6}$/;

function custom() { return S.read(TYPES, []); }
function types() {
  const extra = custom().filter(t => !t.retired);
  return PRESETS.concat(extra);
}
function allTypes() { return PRESETS.concat(custom()).concat(AUTO); }
function type(id) { return allTypes().find(t => t.id === id) || null; }

const RESERVE = [
  ['The Frost-Walker', ['#9FC3D6', '#E9E6D8', '#9FC3D6'], 'For a crossing of the pass in a storm nobody else would face.'],
  ['The Open Hand', ['#1F4A35', '#E9E6D8', '#1F4A35'], 'For hospitality to a stranger that cost the giver dear.'],
  ['Keeper of the Keys', ['#2A1E14', '#D7A54C', '#2A1E14'], 'For long and faithful keeping of a gate, a gaol or a vault.'],
  ['The Raven’s Eye', ['#14223A', '#5A5048', '#14223A'], 'For a watcher who saw what others missed.'],
  ['Voice of the Hall', ['#6E2A1C', '#E9E6D8', '#6E2A1C'], 'For a petition argued, or an audience held, that changed the County’s mind.'],
  ['The Long Winter', ['#E9E6D8', '#2E5E8C', '#E9E6D8'], 'For a whole winter served without a day away.'],
  ['The Count’s Thanks', ['#8A1E1E', '#D7A54C', '#8A1E1E'], 'For a service the Count would rather not name.'],
  ['Healer’s Ribbon', ['#1F4A35', '#BFE5C8', '#1F4A35'], 'For a life saved by hand or by herb.'],
  ['The Stone-Setter', ['#5A5048', '#C8B79C', '#5A5048'], 'For building that will outlast the builder.'],
  ['The Pale Rider', ['#14223A', '#9FC3D6', '#14223A'], 'For a message carried over the pass when no rider should have gone.']
];
function reserve() {
  const taken = new Set(allTypes().map(t => t.name.toLowerCase()));
  return RESERVE.filter(r => !taken.has(r[0].toLowerCase())).map(r => ({ name: r[0], colors: r[1], note: r[2] }));
}

function typeAdd(b, by) {
  const pick = RESERVE.find(r => r[0] === String(b.pick || ''));
  if (pick && !String(b.name || '').trim()) b = Object.assign({}, b, { name: pick[0], note: String(b.note || '').trim() || pick[2], c1: pick[1][0], c2: pick[1][1], c3: pick[1][2] });
  const name = clean(b.name, 60);
  if (name.length < 3) throw new Error('Name the honour.');
  if (allTypes().some(t => t.name.toLowerCase() === name.toLowerCase())) throw new Error('An honour of that name already stands.');
  const colors = [b.c1, b.c2, b.c3].map(c => String(c || '').trim()).filter(c => HEX.test(c));
  if (colors.length < 2) throw new Error('Pick at least two colours for the ribbon.');
  const list = custom();
  const t = { id: 'c' + Date.now().toString(36), name, colors: colors.length === 2 ? [colors[0], colors[1], colors[0]] : colors, note: clean(b.note, 200), by: by.name, at: new Date().toISOString() };
  list.push(t);
  S.write(TYPES, list);
  return t;
}
function typeRetire(id) {
  const list = custom();
  const t = list.find(x => x.id === id);
  if (t) { t.retired = true; S.write(TYPES, list); }
}

function awards() { return S.read(AWARDS, []); }
function awardsOf(username) {
  const un = String(username || '').toLowerCase();
  return awards().filter(a => a.who === un && !a.struck).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function award(username, b, by) {
  const U = require('./users');
  const person = U.view(username);
  if (!person) throw new Error('Nobody on the rolls answers to that.');
  const t = types().find(x => x.id === b.honour);
  if (!t) throw new Error('Choose an honour.');
  const citation = clean(b.citation, 300);
  if (citation.length < 6) throw new Error('Write the citation: what it is given for.');
  const list = awards();
  const a = { id: S.id(), who: person.username, name: person.name, honour: t.id, honourName: t.name, citation, by: by.username, byName: by.name, at: new Date().toISOString() };
  list.push(a);
  S.write(AWARDS, list.slice(-20000));
  try { require('./service').enter(person.username, { kind: 'commended', text: 'Awarded the ' + t.name + '. ' + citation, name: person.name, officeName: person.officeName }, by); } catch (_) {}
  return a;
}

function strike(id, by) {
  const list = awards();
  const a = list.find(x => x.id === id && !x.struck);
  if (!a) return null;
  a.struck = { by: by.username, byName: by.name, at: new Date().toISOString() };
  S.write(AWARDS, list);
  try { require('./service').enter(a.who, { kind: 'note', text: 'The ' + a.honourName + ' awarded ' + a.at.slice(0, 10) + ' is withdrawn.', name: a.name }, by); } catch (_) {}
  return a;
}

function autoFor(username) {
  const out = [];
  try {
    const Sv = require('./service');
    const U = require('./users');
    const person = U.view(username);
    const r = Sv.record(username, person);
    const years = Math.floor(r.days / 365);
    if (years >= 1) out.push({ honour: 'years', count: years, label: years + (years === 1 ? ' year' : ' years') + ' sworn' });
    const tier = LANTERN.find(([h]) => r.watch.hours >= h);
    if (tier) out.push({ honour: 'lantern', tier: tier[1], label: tier[1].charAt(0).toUpperCase() + tier[1].slice(1) + ', ' + r.watch.hours + ' hours on the watch' });
  } catch (_) {}
  return out;
}

function bar(username) {
  const got = awardsOf(username);
  const counts = new Map();
  got.forEach(a => { const c = counts.get(a.honour) || { honour: a.honour, count: 0, latest: a }; c.count += 1; counts.set(a.honour, c); });
  const order = ['jerall'].concat(PRESETS.map(p => p.id).filter(x => x !== 'jerall'));
  const placed = Array.from(counts.values()).sort((a, b) => {
    const ia = order.indexOf(a.honour), ib = order.indexOf(b.honour);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return placed.map(c => ({ honour: c.honour, count: c.count, label: c.latest.citation })).concat(autoFor(username));
}

function roll() {
  const by = new Map();
  awards().filter(a => !a.struck).forEach(a => {
    const list = by.get(a.honour) || [];
    list.push(a);
    by.set(a.honour, list);
  });
  return types().map(t => ({ type: t, holders: (by.get(t.id) || []).sort((a, b) => String(b.at).localeCompare(String(a.at))) }));
}

function inWeek(key) {
  const T = require('./town');
  return awards().filter(a => !a.struck && T.inWeek(a.at, key));
}

module.exports = { PRESETS, AUTO, RESERVE, reserve, types, allTypes, type, typeAdd, typeRetire, custom, awards, awardsOf, award, strike, autoFor, bar, roll, inWeek };

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function stripes(colors) {
  const n = colors.length;
  return 'linear-gradient(90deg,' + colors.map((c, i) => `${c} ${(i / n * 100).toFixed(2)}% ${((i + 1) / n * 100).toFixed(2)}%`).join(',') + ')';
}
function ribbon(entry, size) {
  const t = type(entry.honour);
  if (!t) return '';
  const tip = t.name + (entry.label ? ' — ' + entry.label : '');
  const mark = entry.tier ? `<b class="ribtier ${entry.tier}"></b>` : entry.count > 1 ? `<i>${entry.count}</i>` : '';
  return `<span class="rib${size ? ' ' + size : ''}" style="background:${stripes(t.colors)}" title="${esc(tip)}" role="img" aria-label="${esc(tip)}">${mark}</span>`;
}
function ribbons(username, size) {
  const b = bar(username);
  return b.length ? `<span class="ribs">${b.map(e => ribbon(e, size)).join('')}</span>` : '';
}

module.exports.ribbon = ribbon;
module.exports.ribbons = ribbons;
module.exports.stripes = stripes;
