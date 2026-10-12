const crypto = require('crypto');
const S = require('./store');
const R = require('./innrng');

const FILE = 'inn-events.json';
const K = 0.08;
const CRASH_BET = 10000;
const CRASH_PAUSE = 4000;
const CRASH_CAP = 1000;
const RUN_MS = 20000;
const STEPS = 20;
const SHOW_MS = 10000;
const BOUT_MS = 24000;
const MARGIN = 0.9;

const HORSES = ['Frost', 'Shadowmere’s Get', 'Old Ingjard', 'Pale Lady', 'Whiterun Wind', 'Snow-Hoof', 'Ember Mane', 'The Jarl’s Grey', 'Bannered Belle', 'Riften Rascal', 'Hrothgar’s Pride', 'Dawnstar Dash'];
const SILKS = ['#C9A06A', '#7FB2D9', '#D9643A', '#5FA36A', '#B48CD9', '#E3D3B0'];
const FIGHTERS = [
  { name: 'Ulfgar the Unbroken', kind: 'Nord berserker', hp: 120, atk: [14, 24], def: 4, quick: 0.35 },
  { name: 'Ri’saad Swift-Claw', kind: 'Khajiit duellist', hp: 95, atk: [10, 18], def: 3, quick: 0.65 },
  { name: 'Gharol gro-Durz', kind: 'Orc champion', hp: 130, atk: [12, 22], def: 6, quick: 0.3 },
  { name: 'Lydia of Riverwood', kind: 'Housecarl', hp: 110, atk: [11, 19], def: 7, quick: 0.45 },
  { name: 'Brelyna Maryon', kind: 'Dunmer battlemage', hp: 90, atk: [13, 23], def: 2, quick: 0.55 },
  { name: 'Hjalti Iron-Hand', kind: 'Imperial legionary', hp: 115, atk: [11, 20], def: 6, quick: 0.4 },
  { name: 'Shadow-Sings', kind: 'Argonian spearman', hp: 105, atk: [11, 19], def: 4, quick: 0.6 },
  { name: 'Aela the Huntress', kind: 'Companion archer', hp: 100, atk: [12, 21], def: 3, quick: 0.6 },
  { name: 'Borkul the Beast', kind: 'Orc brawler', hp: 125, atk: [13, 23], def: 5, quick: 0.25 },
  { name: 'Ysolda Thrice-Scarred', kind: 'Nord shieldmaiden', hp: 115, atk: [10, 18], def: 8, quick: 0.4 }
];

const rnd = () => crypto.randomInt(1e9) / 1e9;
const pickN = (list, n) => R.shuffle(list.slice()).slice(0, n);

function load() { return S.read(FILE, {}) || {}; }
function save(e) { S.write(FILE, e, true); }

function crashPoint() {
  const u = rnd();
  const v = Math.floor(100 * 0.97 / (1 - u)) / 100;
  return Math.min(CRASH_CAP, Math.max(1, v));
}
const multAt = ms => Math.floor(Math.exp(K * Math.max(0, ms) / 1000) * 100) / 100;
const timeFor = m => Math.log(m) / K * 1000;

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
  const N = 4000;
  const cnt = horses.map(() => [0, 0, 0]);
  for (let n = 0; n < N; n++) { const o = raceSim(horses, STEPS).order; o.forEach((h, place) => { if (place < 3) for (let k = place; k < 3; k++) cnt[h][k]++; }); }
  horses.forEach((h, i) => {
    h.odds = { win: Math.max(1.1, round1(MARGIN / Math.max(cnt[i][0] / N, 0.005))), place: Math.max(1.05, round1(MARGIN / Math.max(cnt[i][1] / N, 0.01))), show: Math.max(1.05, round1(MARGIN / Math.max(cnt[i][2] / N, 0.02))) };
  });
  const runAt = now + Math.max(30000, every - RUN_MS - SHOW_MS);
  return { no, phase: 'bet', runAt, endAt: runAt + RUN_MS, nextAt: runAt + RUN_MS + SHOW_MS, horses, bets: [] };
}

function boutSim(a, b, withLog) {
  const hp = [a.hp, b.hp];
  const f = [a, b];
  const log = [];
  let turn = rnd() < (a.quick / (a.quick + b.quick)) ? 0 : 1;
  for (let k = 0; k < 60 && hp[0] > 0 && hp[1] > 0; k++) {
    const at = f[turn], df = f[1 - turn];
    const roll = rnd();
    let ev;
    if (roll < df.quick * 0.25) ev = { by: turn, kind: 'dodge', dmg: 0 };
    else if (roll < df.quick * 0.25 + 0.12) ev = { by: turn, kind: 'block', dmg: Math.max(1, Math.floor((at.atk[0] - df.def) / 3)) };
    else {
      const power = rnd() < 0.15;
      let d = at.atk[0] + Math.floor(rnd() * (at.atk[1] - at.atk[0] + 1)) - df.def;
      if (power) d = Math.floor(d * 1.7);
      ev = { by: turn, kind: power ? 'power' : 'hit', dmg: Math.max(1, d) };
    }
    hp[1 - turn] = Math.max(0, hp[1 - turn] - ev.dmg);
    ev.hp = hp.slice();
    if (withLog) log.push(ev);
    turn = 1 - turn;
  }
  return { winner: hp[0] > 0 ? 0 : 1, log };
}
function newBout(now, no, every) {
  let pair, w0 = 0;
  const N = 3000;
  for (let tries = 0; tries < 30; tries++) {
    pair = pickN(FIGHTERS, 2);
    w0 = 0;
    for (let n = 0; n < N; n++) if (boutSim(pair[0], pair[1]).winner === 0) w0++;
    if (w0 / N > 0.22 && w0 / N < 0.78) break;
  }
  const p0 = Math.min(0.97, Math.max(0.03, w0 / N));
  const startAt = now + Math.max(30000, every - BOUT_MS - SHOW_MS);
  return { no, kind: 'auto', phase: 'bet', startAt, endAt: startAt + BOUT_MS, nextAt: startAt + BOUT_MS + SHOW_MS, fighters: pair.map(x => ({ name: x.name, kind: x.kind, hp: x.hp })), stats: pair, odds: [Math.max(1.05, round1(MARGIN / p0)), Math.max(1.05, round1(MARGIN / (1 - p0)))], bets: [] };
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

module.exports = { FILE, K, CRASH_BET, CRASH_PAUSE, CRASH_CAP, RUN_MS, STEPS, SHOW_MS, BOUT_MS, FIGHTERS, HORSES, multAt, timeFor, crashPoint, newCrash, newRace, raceSim, newBout, boutSim, state, save, load, round1 };
