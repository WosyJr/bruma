const S = require('./store');
const Wr = require('./innwhere');

const NOTICE = 'inn-notice.json';
const HAPPY = 'inn-happy.json';
const BARD = 'inn-bard.json';
const HOUR = 3600000;
const BONUS = 0.1;
const MIN_TIP = 50;
const FAVOUR_MS = 60000;
const FAVOUR = 0.1;
const FAVOUR_CAP = 5;
const TIP_COOLDOWN_MS = 5 * 60 * 1000;

const THEME = 'inn-theme.json';
const THEMES = [
  { id: 'none', name: 'No dressing', line: '' },
  { id: 'newlife', name: 'New Life Festival', line: 'Garlands of snowberries hang from the beams, and candles burn in every window.', strip: ['❄', '🕯', '❄', '✦', '❄', '🕯', '❄'] },
  { id: 'harvest', name: 'Harvest’s End', line: 'Sheaves of wheat stand by the door, and the hall smells of fresh bread and mead.', strip: ['🌾', '🍂', '🍎', '🌾', '🍂', '🍺', '🌾'] },
  { id: 'witches', name: 'Witches’ Festival', line: 'Carved gourds grin from the sills, and something rustles in the rafters.', strip: ['🎃', '🦇', '🕯', '🕸', '🕯', '🦇', '🎃'] },
  { id: 'midyear', name: 'Mid Year Celebration', line: 'Red and gold banners hang for the old victories, and the mead flows freely.', strip: ['🎺', '🔥', '⚜', '✦', '⚜', '🔥', '🎺'] }
];
const THEME_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t]));
function theme() {
  const t = S.read(THEME, null);
  return (t && THEME_BY_ID[t.id]) || THEMES[0];
}
function setTheme(id0, by) {
  const t = THEME_BY_ID[String(id0 || '')];
  if (!t) throw new Error('There is no such dressing.');
  S.write(THEME, { id: t.id, by: by ? by.name : '', at: new Date().toISOString() });
  return t;
}

const clean = (v, n) => String(v === undefined || v === null ? '' : v).replace(/\r/g, '').trim().slice(0, n);

function notice() {
  const n = S.read(NOTICE, null);
  if (!n || !n.text || n.night !== Wr.nightOf()) return null;
  return n;
}
function setNotice(text, by) {
  const t = clean(text, 600);
  if (!t) { S.write(NOTICE, {}); return null; }
  const n = { text: t, by: by.name, at: new Date().toISOString(), night: Wr.nightOf() };
  S.write(NOTICE, n);
  return n;
}

function happy(now) {
  const h = S.read(HAPPY, null);
  if (!h || !h.game || !(h.until > (now || Date.now()))) return null;
  return h;
}
function setHappy(game, minutes, by, ids) {
  if (!game) { S.write(HAPPY, {}); return null; }
  if (!ids.includes(game)) throw new Error('There is no such table.');
  const m = Math.max(5, Math.min(240, Math.floor(Number(minutes) || 60)));
  const h = { game, until: Date.now() + m * 60000, minutes: m, by: by.name, at: new Date().toISOString() };
  S.write(HAPPY, h);
  return h;
}
function bonusFor(game, staked, returned, now) {
  const h = happy(now);
  if (!h || h.game !== game || !(returned > staked)) return 0;
  return Math.floor((returned - staked) * BONUS);
}

function ytParse(link) {
  const s = String(link || '').trim();
  let m = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})/);
  const list = m ? m[1] : '';
  m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  const id = m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : '');
  if (!id && !list) return null;
  return { id, list };
}
function bard() { const b = S.read(BARD, {}); return { list: b.list || [], by: b.by || '', at: b.at || '' }; }
function setBard(text, by) {
  const out = [];
  String(text || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 60).forEach(line => {
    const parts = line.split('|');
    const link = parts.length > 1 ? parts.slice(1).join('|') : parts[0];
    const yt = ytParse(link);
    if (!yt) throw new Error('Not a YouTube link: ' + line.slice(0, 80));
    out.push({ title: clean(parts.length > 1 ? parts[0] : '', 80) || 'Song ' + (out.length + 1), id: yt.id, list: yt.list });
  });
  S.write(BARD, { list: out, by: by.name, at: new Date().toISOString() });
  return out;
}
const bardText = () => bard().list.map(x => x.title + ' | ' + (x.id ? 'https://youtu.be/' + x.id : 'https://www.youtube.com/playlist?list=' + x.list) + (x.id && x.list ? '?list=' + x.list : '')).join('\n');

function tonightBets(all) {
  const night = Wr.nightOf();
  const since = Date.now() - 36 * HOUR;
  return all.filter(x => Date.parse(x.at) >= since && Wr.nightOf(Date.parse(x.at)) === night);
}
function boards(all, GAME) {
  const list = tonightBets(all);
  if (!list.length) return null;
  const win = list.slice().sort((a, b) => b.net - a.net)[0];
  const by = {};
  list.forEach(x => { const k = (x.username ? 'u:' + x.username : 'p:' + x.patron); by[k] = by[k] || { name: x.name, staked: 0, rounds: 0 }; by[k].staked += x.staked; by[k].rounds++; });
  const roller = Object.values(by).sort((a, b) => b.staked - a.staked)[0];
  const lucky = list.filter(x => x.staked > 0 && x.returned > x.staked).sort((a, b) => b.returned / b.staked - a.returned / a.staked)[0];
  const short = g => (GAME[g] || { short: g }).short;
  return {
    win: win && win.net > 0 ? { name: win.name, net: win.net, game: short(win.game) } : null,
    roller: roller ? { name: roller.name, staked: roller.staked, rounds: roller.rounds } : null,
    lucky: lucky ? { name: lucky.name, mult: Math.round(lucky.returned / lucky.staked * 10) / 10, game: short(lucky.game) } : null
  };
}
function crier(all, GAME, tips) {
  const since = Date.now() - 24 * HOUR;
  const items = [];
  all.filter(x => Date.parse(x.at) >= since && x.staked > 0 && x.net > 0).forEach(x => {
    const mult = x.returned / x.staked;
    const g = GAME[x.game] || { name: x.game };
    if (x.detail && x.detail.jackpot) items.push({ at: x.at, patron: x.patron, text: x.name + ' lined up five dragons and took the Dragon’s Hoard: ' + x.returned.toLocaleString('en-US') + ' septims!' });
    else if (mult >= 10) items.push({ at: x.at, patron: x.patron, text: x.name + ' hit ×' + (Math.round(mult * 10) / 10) + ' at ' + g.name + '!' });
    else if (x.net >= 5000) items.push({ at: x.at, patron: x.patron, text: x.name + ' took ' + x.net.toLocaleString('en-US') + ' off the house at ' + g.name + '.' });
  });
  (tips || []).filter(x => Date.parse(x.at) >= since && x.amount >= 50).forEach(x => items.push({ at: x.at, patron: x.patron, text: x.name + ' tipped Old Brannoc ' + x.amount.toLocaleString('en-US') + '. He raises a tankard.' }));
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
}

const THANKS = [
  'Brannoc pockets it with a nod. “The Nine see a generous hand, traveller.”',
  '“Ha! You’ll get the good mead tonight,” Brannoc says, tapping his nose.',
  'Brannoc bows low. “Talos guide your dice.”',
  '“Kind of you,” Brannoc grunts, and shuffles a little slower for you.',
  'The coin vanishes into Brannoc’s apron. “I never saw it. Thank you.”'
];
const thanks = () => THANKS[require('crypto').randomInt(THANKS.length)];

module.exports = { THEMES, theme, setTheme, MIN_TIP, FAVOUR_MS, FAVOUR, FAVOUR_CAP, TIP_COOLDOWN_MS, notice, setNotice, happy, setHappy, bonusFor, BONUS, ytParse, bard, setBard, bardText, boards, crier, thanks, tonightBets };
