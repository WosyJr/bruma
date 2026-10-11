const crypto = require('crypto');

const int = n => crypto.randomInt(n);

function shuffle(a, rng) {
  const r = rng || int;
  for (let i = a.length - 1; i > 0; i--) {
    const j = r(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const die = rng => (rng || int)(6) + 1;

module.exports = { int, shuffle, die };
