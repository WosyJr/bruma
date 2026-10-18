process.env.DATA_DIR = '/tmp/brumatest';
process.env.SESSION_SECRET = 'testsecret';
const fs = require('fs');
fs.rmSync('/tmp/brumatest', { recursive: true, force: true });
fs.mkdirSync('/tmp/brumatest', { recursive: true });

const I = require('/home/claude/bruma/lib/inn');
const Hh = require('/home/claude/bruma/lib/innhall');
const S = require('/home/claude/bruma/lib/store');

let pass = 0, fail = 0;
const ok = (c, m, extra) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || extra === undefined ? '' : '  <- ' + extra)); };

function seat(id, purse) {
  const rows = S.read('inn-patrons.json', []);
  rows.push({ id, name: 'Tester ' + id, username: 'u' + id, status: 'seated', purse, staked: 0 });
  S.write('inn-patrons.json', rows);
}
const get = id => S.read('inn-patrons.json', []).find(x => x.id === id);

seat('p1', 100000);

const t1 = I.tip('p1', 1000);
ok(t1.granted === true, 'a first tip grants favour');
ok(t1.favour.cap === 1000 * I.rankOf('p1').cap, 'the cap is the tip times the rank multiplier', t1.favour.cap);
const cap1 = t1.favour.cap;

const t2 = I.tip('p1', 50);
ok(t2.granted === false, 'a second tip inside the cooldown grants nothing');
ok(get('p1').favour.cap === cap1, 'and does not lower the cap it already had', get('p1').favour.cap);
ok(get('p1').purse === 100000 - 1050, 'but the coin is still taken, and the tip still counts');

const big = I.tip('p1', 20000);
ok(big.granted === false, 'even a large tip inside the cooldown grants nothing');
ok(get('p1').favour.cap === cap1, 'the cap cannot be ratcheted up by re-tipping', get('p1').favour.cap);

const r = get('p1');
r.tipFavourAt = Date.now() - Hh.TIP_COOLDOWN_MS - 1;
const rows = S.read('inn-patrons.json', []);
rows[rows.findIndex(x => x.id === 'p1')] = r;
S.write('inn-patrons.json', rows);

const t3 = I.tip('p1', 200);
ok(t3.granted === true, 'once the cooldown passes, favour is granted again');
ok(t3.favour.cap === 200 * I.rankOf('p1').cap, 'and the new cap comes from the new tip alone, not the old one', t3.favour.cap);

const ready = I.tipReady('p1');
ok(ready.ready === false && ready.at > Date.now(), 'tipReady reports when Brannoc is next moved');

const live = { id: 'x', favour: { until: Date.now() + 60000, cap: 5000 } };
const dead = { id: 'x', favour: { until: Date.now() - 1, cap: 5000 } };
const none = { id: 'x' };

let backs = 0;
for (let i = 0; i < 4000; i++) if (I.favourBack(live, 'crash', 1000, 0, Date.now())) backs++;
ok(backs > 250 && backs < 550, 'a loss within the cap is made good about one time in ten', backs + '/4000');

ok(I.favourBack(live, 'crash', 1000, 1500, Date.now()) === 0, 'a winning round is never touched');
ok(I.favourBack(live, 'crash', 1000, 1000, Date.now()) === 0, 'nor one that broke even');
let over = 0;
for (let i = 0; i < 2000; i++) if (I.favourBack(live, 'crash', 9000, 0, Date.now())) over++;
ok(over === 0, 'a stake above the cap gets nothing', over);
ok(I.favourBack(dead, 'crash', 1000, 0, Date.now()) === 0, 'expired favour gets nothing');
ok(I.favourBack(none, 'crash', 1000, 0, Date.now()) === 0, 'and a patron who never tipped gets nothing');

let amounts = new Set();
for (let i = 0; i < 4000; i++) { const b = I.favourBack(live, 'races', 1000, 400, Date.now()); if (b) amounts.add(b); }
ok(amounts.size === 1 && amounts.has(600), 'a partial loss is topped back to even, not overpaid', [...amounts].join(','));

const src = fs.readFileSync('/home/claude/bruma/lib/inn.js', 'utf8');
ok(/const back = favourBack\(pt, x\.game, x\.staked, x\.returned, now\);/.test(src),
  'the shared events settle through the same favour, in evPay');
ok(/const kback = favourBack\(ptk, 'keno'/.test(src), 'and the lottery draw does too');
ok(!/Math\.max\(live \? live\.cap : 0/.test(src), 'the old ratcheting cap is gone');
ok(/SHARED\.includes\(game\) && out\.settled/.test(src), 'a cash-out below evens on a shared game is covered too');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
