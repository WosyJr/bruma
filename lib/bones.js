const R = require('./innrng');

const GOAL = 50;
const LUCK = 10;
const KEEPER = 'Old Brannoc';

const roll = rng => [R.die(rng), R.die(rng), R.die(rng)];

function judge(d) {
  if (d.includes(1)) return { frost: true, gain: 0, luck: false };
  const luck = d[0] === d[1] && d[1] === d[2];
  return { frost: false, gain: d[0] + d[1] + d[2] + (luck ? LUCK : 0), luck };
}

function blank(first) {
  return { you: 0, inn: 0, pot: 0, best: 0, turn: '', over: true, winner: '', last: [], stake: 0, first: first || 'inn', say: KEEPER + ' slides three bones across the table. “Put down a stake and we’ll play to fifty.”', tone: '', log: [] };
}

function note(g, line) {
  g.log.unshift(line);
  g.log = g.log.slice(0, 8);
}

function finish(g, winner) {
  g.over = true;
  g.winner = winner;
  g.turn = '';
  if (winner === 'you') { g.say = KEEPER + ' slaps the table. “Well thrown. Take your winnings.”'; g.tone = 'good'; note(g, 'You win, ' + g.you + ' to ' + g.inn + '.'); }
  else { g.say = KEEPER + ' sweeps up the bones and the stake. “The house keeps its warmth tonight.”'; g.tone = 'bad'; note(g, KEEPER + ' wins, ' + g.inn + ' to ' + g.you + '.'); }
}

function keeperTurn(g, rng) {
  const steps = [];
  const want = g.inn + 15 >= GOAL ? GOAL - g.inn : (g.you >= 38 ? 20 : 15);
  g.pot = 0;
  g.turn = 'inn';
  for (let i = 0; i < 14; i++) {
    const d = roll(rng);
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
      finish(g, 'inn');
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

function start(prev, stake, rng) {
  if (prev && !prev.over) throw new Error('Finish this game first.');
  const first = prev && prev.first === 'you' ? 'inn' : 'you';
  const g = { you: 0, inn: 0, pot: 0, best: 0, turn: 'you', over: false, winner: '', last: [], stake, first, say: '', tone: '', log: [] };
  if (first === 'you') { g.say = 'Your stake is down. Your throw first.'; note(g, 'A new game for ' + stake + '. You throw first.'); return { game: g, steps: [] }; }
  note(g, 'A new game for ' + stake + '. ' + KEEPER + ' throws first.');
  return { game: g, steps: keeperTurn(g, rng) };
}

function act(g, what, rng) {
  if (!g || g.over) throw new Error('Put down a stake to start a game.');
  if (g.turn !== 'you') throw new Error('Wait for your throw.');
  if (what === 'throw') {
    const d = roll(rng);
    const j = judge(d);
    g.last = d;
    if (j.frost) {
      note(g, 'You throw ' + d.join(' ') + '. Frost.' + (g.pot ? ' You lose a pot of ' + g.pot + '.' : ''));
      g.pot = 0;
      const mine = { who: 'you', dice: d, pot: 0, you: g.you, say: 'Frost on the bone. The pot melts away.', tone: 'bad' };
      return { game: g, steps: [mine].concat(keeperTurn(g, rng)) };
    }
    g.pot += j.gain;
    note(g, 'You throw ' + d.join(' ') + (j.luck ? ', three alike, Bruma’s luck +' + LUCK : '') + '. Pot ' + g.pot + '.');
    if (g.you + g.pot >= GOAL) {
      g.best = Math.max(g.best, g.pot);
      g.you += g.pot;
      g.pot = 0;
      finish(g, 'you');
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
    return { game: g, steps: [mine].concat(keeperTurn(g, rng)) };
  }
  throw new Error('The innkeeper does not follow.');
}

module.exports = { GOAL, LUCK, KEEPER, blank, start, act, judge, keeperTurn };
