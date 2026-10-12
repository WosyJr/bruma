const crypto = require('crypto');
const S = require('./store');
const R = require('./innrng');

const FILE = 'inn-events.json';
const K = 0.12;
const START = 0.5;
const CRASH_BET = 10000;
const CRASH_PAUSE = 4000;
const CRASH_CAP = 1000;
const RUN_MS = 20000;
const STEPS = 20;
const SHOW_MS = 10000;
const BOUT_MS = 30000;
const MARGIN = 0.9;

const HORSES = ['Frost', 'Shadowmere’s Get', 'Old Ingjard', 'Pale Lady', 'Whiterun Wind', 'Snow-Hoof', 'Ember Mane', 'The Jarl’s Grey', 'Bannered Belle', 'Riften Rascal', 'Hrothgar’s Pride', 'Dawnstar Dash'];
const SILKS = ['#C9A06A', '#7FB2D9', '#D9643A', '#5FA36A', '#B48CD9', '#E3D3B0'];
const FIGHTERS = [
  { name: 'Ulfgar the Unbroken', kind: 'Nord berserker', style: 'great', hp: 120, atk: [14, 24], def: 4, quick: 0.35, moves: { blade: 1 }, colour: '#8E5A2A' },
  { name: 'Ri’saad Swift-Claw', kind: 'Khajiit duellist', style: 'dagger', hp: 95, atk: [10, 18], def: 3, quick: 0.65, moves: { blade: 1 }, colour: '#B8862F' },
  { name: 'Gharol gro-Durz', kind: 'Orc champion', style: 'great', hp: 130, atk: [12, 22], def: 6, quick: 0.3, moves: { blade: 1 }, colour: '#4F6B32' },
  { name: 'Lydia of Riverwood', kind: 'Housecarl', style: 'shield', hp: 110, atk: [11, 19], def: 7, quick: 0.45, moves: { blade: 0.8, bash: 0.2 }, colour: '#6A7A8A' },
  { name: 'Brelyna Maryon', kind: 'Dunmer battlemage', style: 'mage', element: 'shock', hp: 90, atk: [13, 23], def: 2, quick: 0.55, moves: { spell: 0.75, blade: 0.25 }, colour: '#5A3A7A' },
  { name: 'Hjalti Iron-Hand', kind: 'Imperial legionary', style: 'shield', hp: 115, atk: [11, 20], def: 6, quick: 0.4, moves: { blade: 0.8, bash: 0.2 }, colour: '#9A2525' },
  { name: 'Shadow-Sings', kind: 'Argonian spearman', style: 'spear', hp: 105, atk: [11, 19], def: 4, quick: 0.6, moves: { blade: 1 }, colour: '#2F6A5A' },
  { name: 'Aela the Huntress', kind: 'Companion archer', style: 'archer', hp: 100, atk: [12, 21], def: 3, quick: 0.6, moves: { arrow: 0.75, blade: 0.25 }, colour: '#7A3A2A' },
  { name: 'Borkul the Beast', kind: 'Orc brawler', style: 'great', hp: 125, atk: [13, 23], def: 5, quick: 0.25, moves: { blade: 1 }, colour: '#5A6A2A' },
  { name: 'Ysolda Thrice-Scarred', kind: 'Nord shieldmaiden', style: 'shield', hp: 115, atk: [10, 18], def: 8, quick: 0.4, moves: { blade: 0.75, bash: 0.25 }, colour: '#3E5A7A' },
  { name: 'J’zargo the Ember', kind: 'Khajiit fire mage', style: 'mage', element: 'fire', hp: 88, atk: [14, 24], def: 2, quick: 0.5, moves: { spell: 0.8, blade: 0.2 }, colour: '#A2481E' },
  { name: 'Faendal Greenleaf', kind: 'Bosmer archer', style: 'archer', hp: 95, atk: [11, 20], def: 3, quick: 0.65, moves: { arrow: 0.8, blade: 0.2 }, colour: '#3E6A32' },
  { name: 'Sigrid Frost-Weaver', kind: 'Nord frost witch', style: 'mage', element: 'frost', hp: 92, atk: [12, 22], def: 3, quick: 0.5, moves: { spell: 0.75, blade: 0.25 }, colour: '#3A6A9A' }
];
const ENDS = { blade: 'by the blade', spell: 'by a spell', arrow: 'by an arrow' };

const rnd = () => crypto.randomInt(1e9) / 1e9;
const pickN = (list, n) => R.shuffle(list.slice()).slice(0, n);

function load() { return S.read(FILE, {}) || {}; }
function save(e) { S.write(FILE, e, true); }

function crashPoint() {
  const u = rnd();
  const v = Math.floor(100 * 0.94 / (1 - u)) / 100;
  return Math.min(CRASH_CAP, Math.max(START, v));
}
const multAt = ms => Math.floor(START * Math.exp(K * Math.max(0, ms) / 1000) * 100) / 100;
const timeFor = m => Math.log(Math.max(m, START) / START) / K * 1000;

function newCrash(now, no) {
  const p = crashPoint();
  return { no, phase: 'bet', betUntil: now + CRASH_BET, flyAt: now + CRASH_BET, point: p, crashTime: now + CRASH_BET + timeFor(p), bets: [] };
}

function raceSim(horses, steps) {
  const pos = horses.map(() => 0);
  const frames = [];
  for (let s = 0; s < steps; s++) {
    horses.forEach((h, i) => { pos[i] += h.pace + (rnd() - 0.5) * h.spread; });
    frames.push(pos.map(x => Math.round(x * 100) / 100));
  }
  const order = horses.map((h, i) => i).sort((a, b) => pos[b] - pos[a]);
  return { frames, order };
}
const round1 = x => Math.round(x * 10) / 10;
function newRace(now, no, every) {
  const names = pickN(HORSES, 6);
  const horses = names.map((name, i) => ({ name, silk: SILKS[i], pace: 5 + rnd() * 0.35, spread: 5 + rnd() * 2 }));
  const N = 12000;
  const cnt = horses.map(() => [0, 0, 0]);
  const ex = {}, tri = {};
  for (let n = 0; n < N; n++) {
    const o = raceSim(horses, STEPS).order;
    o.forEach((h, place) => { if (place < 3) for (let k = place; k < 3; k++) cnt[h][k]++; });
    const e = o[0] + '-' + o[1], t = e + '-' + o[2];
    ex[e] = (ex[e] || 0) + 1; tri[t] = (tri[t] || 0) + 1;
  }
  const exacta = {}, trifecta = {};
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
    if (a === b) continue;
    exacta[a + '-' + b] = Math.min(400, Math.max(2, Math.round(MARGIN / Math.max((ex[a + '-' + b] || 0) / N, 0.00225))));
    for (let c = 0; c < 6; c++) { if (c === a || c === b) continue; const k = a + '-' + b + '-' + c; trifecta[k] = Math.min(1500, Math.max(3, Math.round(MARGIN / Math.max((tri[k] || 0) / N, 0.0006)))); }
  }
  horses.forEach((h, i) => {
    h.odds = { win: Math.max(1.1, round1(MARGIN / Math.max(cnt[i][0] / N, 0.005))), place: Math.max(1.05, round1(MARGIN / Math.max(cnt[i][1] / N, 0.01))), show: Math.max(1.05, round1(MARGIN / Math.max(cnt[i][2] / N, 0.02))) };
  });
  const runAt = now + Math.max(30000, every - RUN_MS - SHOW_MS);
  return { no, phase: 'bet', runAt, endAt: runAt + RUN_MS, nextAt: runAt + RUN_MS + SHOW_MS, horses, exacta, trifecta, bets: [] };
}

function pickMove(f) {
  const r = rnd();
  let acc = 0;
  for (const [k, w] of Object.entries(f.moves || { blade: 1 })) { acc += w; if (r < acc) return k; }
  return 'blade';
}
function boutSim(a, b, withLog) {
  const hp = [a.hp, b.hp];
  const f = [a, b];
  const log = [];
  let turn = rnd() < (a.quick / (a.quick + b.quick)) ? 0 : 1;
  let n = 0, last = null;
  for (let k = 0; k < 60 && hp[0] > 0 && hp[1] > 0; k++) {
    const at = f[turn], df = f[1 - turn];
    const move = pickMove(at);
    const roll = rnd();
    const dodge = df.quick * (move === 'arrow' ? 0.3 : (move === 'spell' ? 0.2 : 0.25));
    const block = move === 'spell' ? 0.06 : (df.style === 'shield' ? 0.2 : 0.12);
    let ev;
    if (roll < dodge) ev = { by: turn, move, kind: 'dodge', dmg: 0 };
    else if (roll < dodge + block) ev = { by: turn, move, kind: 'block', dmg: Math.max(1, Math.floor((at.atk[0] - df.def) / 3)) };
    else {
      const power = rnd() < (move === 'bash' ? 0.05 : 0.15);
      let d = at.atk[0] + Math.floor(rnd() * (at.atk[1] - at.atk[0] + 1)) - (move === 'spell' ? Math.floor(df.def / 2) : df.def);
      if (move === 'bash') d = Math.floor(d * 0.6);
      if (power) d = Math.floor(d * 1.7);
      ev = { by: turn, move, kind: power ? 'power' : 'hit', dmg: Math.max(1, d) };
    }
    if (move === 'spell') ev.el = at.element || 'fire';
    hp[1 - turn] = Math.max(0, hp[1 - turn] - ev.dmg);
    ev.hp = hp.slice();
    n++;
    last = ev;
    if (withLog) log.push(ev);
    turn = 1 - turn;
  }
  const end = last ? (last.move === 'bash' ? 'blade' : last.move) : 'blade';
  return { winner: hp[0] > 0 ? 0 : 1, log, blows: n, end };
}
function newBout(now, no, every) {
  let pair, w0 = 0, sims = [];
  const N = 3000;
  for (let tries = 0; tries < 30; tries++) {
    pair = pickN(FIGHTERS, 2);
    sims = [];
    for (let n = 0; n < N; n++) sims.push(boutSim(pair[0], pair[1]));
    w0 = sims.filter(x => x.winner === 0).length;
    if (w0 / N > 0.22 && w0 / N < 0.78) break;
  }
  const p0 = Math.min(0.97, Math.max(0.03, w0 / N));
  const lens = sims.map(x => x.blows).sort((x, y) => x - y);
  const line = lens[Math.floor(N / 2)] + 0.5;
  const over = sims.filter(x => x.blows > line).length / N;
  const props = { line, over: Math.max(1.05, round1(MARGIN / Math.max(over, 0.03))), under: Math.max(1.05, round1(MARGIN / Math.max(1 - over, 0.03))), ends: {} };
  Object.keys(ENDS).forEach(k => { const pk = sims.filter(x => x.end === k).length / N; if (pk >= 0.03) props.ends[k] = Math.max(1.05, round1(MARGIN / pk)); });
  if (Object.keys(props.ends).length < 2) props.ends = {};
  const startAt = now + Math.max(30000, every - BOUT_MS - SHOW_MS);
  return { no, kind: 'auto', phase: 'bet', startAt, endAt: startAt + BOUT_MS, nextAt: startAt + BOUT_MS + SHOW_MS, fighters: pair.map(x => ({ name: x.name, kind: x.kind, hp: x.hp, style: x.style, element: x.element || '', colour: x.colour })), stats: pair, odds: [Math.max(1.05, round1(MARGIN / p0)), Math.max(1.05, round1(MARGIN / (1 - p0)))], props, bets: [] };
}

function propWins(bt, fight, props) {
  if (bt.prop === 'over') return fight.log.length > props.line;
  if (bt.prop === 'under') return fight.log.length < props.line;
  if (ENDS[bt.prop]) { const l = fight.log[fight.log.length - 1]; return (l.move === 'bash' ? 'blade' : l.move) === bt.prop; }
  return bt.side === fight.winner;
}

function state() {
  const e = load();
  e.crash = e.crash || null;
  e.race = e.race || null;
  e.bout = e.bout || null;
  e.posted = e.posted || [];
  e.history = e.history || { crash: [], race: [], bout: [] };
  e.no = e.no || { crash: 0, race: 0, bout: 0, posted: 0 };
  return e;
}

module.exports = { START, ENDS, propWins, FILE, K, CRASH_BET, CRASH_PAUSE, CRASH_CAP, RUN_MS, STEPS, SHOW_MS, BOUT_MS, FIGHTERS, HORSES, multAt, timeFor, crashPoint, newCrash, newRace, raceSim, newBout, boutSim, state, save, load, round1 };
