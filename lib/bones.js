const crypto = require('crypto');
const S = require('./store');
const T = require('./town');

const GOAL = 50;
const LUCK = 10;
const KEEPER = 'Old Brannoc';
const GAMES = 'town-bones.json';

const roll = () => [0, 0, 0].map(() => crypto.randomInt(1, 7));

function judge(d) {
  if (d.includes(1)) return { frost: true, gain: 0, luck: false };
  const luck = d[0] === d[1] && d[1] === d[2];
  return { frost: false, gain: d[0] + d[1] + d[2] + (luck ? LUCK : 0), luck };
}

function fresh() {
  return { you: 0, inn: 0, pot: 0, best: 0, turn: 'you', over: false, winner: '', last: [], say: KEEPER + ' slides three bones across the table. “Your throw, traveller.”', tone: '', log: [] };
}

function note(g, line) {
  g.log.unshift(line);
  g.log = g.log.slice(0, 8);
}

function record(g, who) {
  const list = S.read(GAMES, []);
  list.push({ name: who.name, key: who.key, signed: who.signed, won: g.winner === 'you', you: g.you, inn: g.inn, best: g.best, at: new Date().toISOString() });
  S.write(GAMES, list.slice(-20000));
}

function finish(g, winner, who) {
  g.over = true;
  g.winner = winner;
  g.turn = '';
  if (winner === 'you') { g.say = KEEPER + ' slaps the table. “Well thrown. Your name goes on the board.”'; g.tone = 'good'; note(g, 'You win, ' + g.you + ' to ' + g.inn + '.'); }
  else { g.say = KEEPER + ' sweeps up the bones. “The house keeps its warmth tonight.”'; g.tone = 'bad'; note(g, KEEPER + ' wins, ' + g.inn + ' to ' + g.you + '.'); }
  record(g, who);
}

function keeperTurn(g, who) {
  const steps = [];
  const want = g.inn + 15 >= GOAL ? GOAL - g.inn : (g.you >= 38 ? 20 : 15);
  g.pot = 0;
  g.turn = 'inn';
  for (let i = 0; i < 14; i++) {
    const d = roll();
    const j = judge(d);
    if (j.frost) {
      const lost = g.pot;
      g.pot = 0;
      note(g, KEEPER + ' throws ' + d.join(' ') + '. Frost.' + (lost ? ' He loses ' + lost + '.' : ''));
      steps.push({ who: 'inn', dice: d, pot: 0, inn: g.inn, say: 'Frost bites ' + KEEPER + '. He mutters into his ale. Your throw.', tone: 'good' });
      break;
    }
    g.pot += j.gain;
    note(g, KEEPER + ' throws ' + d.join(' ') + (j.luck ? ', three alike, +' + LUCK : '') + '. Pot ' + g.pot + '.');
    if (g.inn + g.pot >= GOAL) {
      g.inn += g.pot;
      g.pot = 0;
      g.last = d;
      finish(g, 'inn', who);
      steps.push({ who: 'inn', dice: d, pot: 0, inn: g.inn, say: g.say, tone: g.tone });
      return steps;
    }
    if (g.pot >= want) {
      g.inn += g.pot;
      note(g, KEEPER + ' calls it at ' + g.pot + '. He has ' + g.inn + '.');
      steps.push({ who: 'inn', dice: d, pot: 0, inn: g.inn, say: '“I’ll take that,” says ' + KEEPER + ', banking ' + g.pot + '. Your throw.', tone: '' });
      g.pot = 0;
      break;
    }
    steps.push({ who: 'inn', dice: d, pot: g.pot, say: KEEPER + ' eyes the bones and throws again.', tone: '' });
  }
  g.pot = 0;
  g.turn = 'you';
  const end = steps[steps.length - 1];
  g.last = end ? end.dice : [];
  g.say = end ? end.say : 'Your throw.';
  g.tone = end ? end.tone : '';
  return steps;
}

function act(g, what, who) {
  if (what === 'new') return { game: fresh(), steps: [] };
  if (!g) g = fresh();
  if (g.over) throw new Error('This game is done. Start a new one.');
  if (g.turn !== 'you') throw new Error('Wait for your throw.');
  if (what === 'throw') {
    const d = roll();
    const j = judge(d);
    g.last = d;
    if (j.frost) {
      note(g, 'You throw ' + d.join(' ') + '. Frost.' + (g.pot ? ' You lose a pot of ' + g.pot + '.' : ''));
      g.pot = 0;
      const mine = { who: 'you', dice: d, pot: 0, you: g.you, say: 'Frost on the bone. The pot melts away.', tone: 'bad' };
      return { game: g, steps: [mine].concat(keeperTurn(g, who)) };
    }
    g.pot += j.gain;
    note(g, 'You throw ' + d.join(' ') + (j.luck ? ', three alike, Bruma’s luck +' + LUCK : '') + '. Pot ' + g.pot + '.');
    if (g.you + g.pot >= GOAL) {
      g.best = Math.max(g.best, g.pot);
      g.you += g.pot;
      g.pot = 0;
      finish(g, 'you', who);
      return { game: g, steps: [{ who: 'you', dice: d, pot: 0, you: g.you, say: g.say, tone: g.tone }] };
    }
    g.say = j.luck ? 'Three alike. Bruma’s luck: +' + LUCK + '.' : (g.pot >= 20 ? '“Bold. Call it, or tempt the frost?”' : '“Again, or call it?”');
    g.tone = j.luck ? 'good' : '';
    return { game: g, steps: [{ who: 'you', dice: d, pot: g.pot, you: g.you, say: g.say, tone: g.tone }] };
  }
  if (what === 'bank') {
    if (!g.pot) throw new Error('There is nothing in the pot to call.');
    g.best = Math.max(g.best, g.pot);
    g.you += g.pot;
    note(g, 'You call it and bank ' + g.pot + '. You have ' + g.you + '.');
    g.pot = 0;
    const mine = { who: 'you', dice: g.last, pot: 0, you: g.you, say: 'You bank it. ' + KEEPER + ' picks up the bones.', tone: '' };
    return { game: g, steps: [mine].concat(keeperTurn(g, who)) };
  }
  throw new Error('The innkeeper does not follow.');
}

function board(key) {
  const list = S.read(GAMES, []).filter(x => T.inWeek(x.at, key));
  const by = {};
  list.forEach(x => {
    const k = x.name.toLowerCase();
    by[k] = by[k] || { name: x.name, wins: 0, games: 0, best: 0 };
    by[k].games += 1;
    if (x.won) by[k].wins += 1;
    by[k].best = Math.max(by[k].best, x.best || 0);
  });
  const rows = Object.values(by);
  const top = rows.filter(r => r.wins).sort((a, b) => b.wins - a.wins || a.games - b.games).slice(0, 10);
  const lucky = rows.slice().sort((a, b) => b.best - a.best)[0] || null;
  return { games: list.length, keeperWins: list.filter(x => !x.won).length, top, lucky: lucky && lucky.best ? lucky : null };
}

module.exports = { GOAL, LUCK, KEEPER, fresh, act, board };
