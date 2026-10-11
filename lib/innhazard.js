const R = require('./innrng');

const SIDE = { 2: 33, 3: 16, 4: 10, 5: 7, 6: 6, 7: 4, 8: 6, 9: 7, 10: 10, 11: 16, 12: 33 };
const MAINS = [5, 6, 7, 8, 9];
const CASTER = 'Hjalmar';

function comeOut(main, n) {
  if (n === main) return 'nick';
  if (n === 2 || n === 3) return 'out';
  if (n === 11) return main === 7 ? 'nick' : 'out';
  if (n === 12) return main === 6 || main === 8 ? 'nick' : 'out';
  return null;
}

function fresh() { return { phase: 'done', main: 0, chance: 0, bet: 0, throws: [], side: null, staked: 0, returned: 0, result: '', say: '“Name your main, traveller, five to nine, and I’ll call the throws,” says ' + CASTER + '.', tone: '' }; }

const live = g => g && g.phase === 'chase';

function throwOnce(g, side, rng) {
  const d = [R.die(rng), R.die(rng)];
  const n = d[0] + d[1];
  g.throws.push(d);
  let sideLine = '';
  if (side) {
    const won = side.total === n;
    const ret = won ? side.amount * (SIDE[side.total] + 1) : 0;
    g.returned += ret;
    sideLine = won ? ' Your side bet on ' + side.total + ' pays ' + SIDE[side.total] + ' to 1.' : ' Your side bet on ' + side.total + ' is lost.';
    g.sides.push({ total: side.total, amount: side.amount, won, ret });
  }
  return { d, n, sideLine };
}

function start(g, bet, main, side, rng) {
  if (live(g)) throw new Error('Finish this throw first.');
  if (!MAINS.includes(main)) throw new Error('The main must be five to nine.');
  g = { phase: 'chase', main, chance: 0, bet, throws: [], sides: [], staked: bet + (side ? side.amount : 0), returned: 0, result: '', say: '', tone: '' };
  const t = throwOnce(g, side, rng);
  const c = comeOut(main, t.n);
  if (c === 'nick') return end(g, true, 'You throw ' + t.n + ' on a main of ' + main + '. A nick: you win outright.' + t.sideLine);
  if (c === 'out') return end(g, false, 'You throw ' + t.n + ' on a main of ' + main + '. Thrown out.' + t.sideLine);
  g.chance = t.n;
  g.say = 'You throw ' + t.n + '. That is your chance. Throw it again before the main of ' + main + ' comes.' + t.sideLine;
  g.tone = '';
  return g;
}

function again(g, side, rng) {
  if (!live(g)) throw new Error('Name a main and stake to start.');
  if (side) g.staked += side.amount;
  const t = throwOnce(g, side, rng);
  if (t.n === g.chance) return end(g, true, 'You throw ' + t.n + ': your chance. You win.' + t.sideLine);
  if (t.n === g.main) return end(g, false, 'You throw ' + t.n + ': the main. You lose.' + t.sideLine);
  g.say = 'You throw ' + t.n + '. Still chasing ' + g.chance + ', the main is ' + g.main + '.' + t.sideLine;
  g.tone = '';
  return g;
}

function end(g, won, say) {
  g.phase = 'done';
  g.result = won ? 'win' : 'lose';
  if (won) g.returned += g.bet * 2;
  g.say = say;
  g.tone = g.returned > g.staked ? 'good' : (g.returned < g.staked ? 'bad' : '');
  return g;
}

module.exports = { SIDE, MAINS, CASTER, comeOut, fresh, start, again, live };
