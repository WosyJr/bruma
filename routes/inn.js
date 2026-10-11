const I = require('../lib/inn');
const IV = require('../lib/innviews');
const J = require('../lib/innjack');

const tries = new Map();
function limited(key, max, ms) {
  const t = Date.now();
  const list = (tries.get(key) || []).filter(x => t - x < ms);
  if (list.length >= max) { tries.set(key, list); return true; }
  list.push(t);
  tries.set(key, list);
  if (tries.size > 5000) tries.clear();
  return false;
}

module.exports = function (app, { checkCsrf, need }) {
  const wantsJson = req => /json/.test(String(req.get('accept') || ''));
  const base = req => {
    if (req.session.bones) req.session.bones = null;
    return { user: req.user, csrf: req.session.csrf, patron: I.current(req), house: I.house(), outcomes: I.outcomes() };
  };
  const learned = (req, game) => !!(req.session.learned && req.session.learned[game]);

  function viewOf(game, d) {
    const t = I.table(d.patron ? d.patron.id : '', game);
    if (game === 'cards') return J.view(t, I.rulesOf(d.house), d.patron ? d.patron.purse : 0);
    return t;
  }

  app.get('/inn', (req, res) => {
    const d = base(req);
    res.page({ title: 'The Jerall View Inn', wide: true, body: IV.lobby(d) });
  });

  app.post('/inn/ask', checkCsrf, (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/inn');
    if (limited('innask|' + (req.user ? req.user.username : req.ip), 5, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'The innkeeper has heard enough names from you for now. Try again later.' }; return res.redirect('/inn'); }
    try {
      const p = I.ask(b, req.user);
      if (!req.user) req.session.innPatron = p.id;
      req.session.flash = { text: 'Your name is in ' + I.KEEPER + '’s book. A keeper of the inn will seat you.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn');
  });

  app.post('/inn/signin', checkCsrf, (req, res) => {
    const b = req.body || {};
    if (limited('innsign|' + req.ip, 10, 10 * 60 * 1000)) { req.session.flash = { err: true, text: 'Too many tries. Wait a few minutes and try again.' }; return res.redirect('/inn'); }
    try { const p = I.signIn(b.name, b.pass); req.session.innPatron = p.id; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn');
  });

  app.post('/inn/leave', checkCsrf, (req, res) => {
    req.session.innPatron = null;
    req.session.innBet = null;
    req.session.flash = { text: 'You leave the warmth of the inn. Your purse stays in Brannoc’s book.' };
    res.redirect('/inn');
  });

  app.get('/inn/me', (req, res) => {
    const d = base(req);
    if (!d.patron) return res.redirect('/inn');
    d.record = I.record(d.patron.id);
    res.page({ title: 'My purse · The Jerall View Inn', body: IV.mePage(d) });
  });

  app.get('/inn/ledger', need('inn'), (req, res) => {
    res.page({ title: 'The Inn Ledger', active: 'innledger', wide: true, body: IV.ledgerPage({ csrf: req.session.csrf, ledger: I.ledger(), house: I.house() }) });
  });

  app.post('/inn/ledger/house', checkCsrf, need('inn'), (req, res) => {
    try { I.setHouse(req.body || {}, req.user); req.session.flash = { text: 'The house rules are set.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/:id/:what', checkCsrf, need('inn'), (req, res) => {
    const what = String(req.params.what);
    const b = req.body || {};
    try {
      if (what === 'purse') {
        const p = I.purse(req.params.id, String(b.kind || ''), b.amount, b.note, req.user);
        req.session.flash = { text: p.name + '’s purse now holds ' + I.septims(p.purse) + '.' };
      } else if (['accept', 'turn', 'forget', 'resetpass'].includes(what)) {
        const r = I.decide(req.params.id, what, req.user);
        const n = r.patron.name;
        req.session.flash = { text: { accept: n + ' is seated. Fill their purse once they hand over coin.', turn: n + ' is turned away.', forget: n + ' is forgotten. The name is free to ask again.', resetpass: 'New passphrase for ' + n + ': ' + r.pass + '. Tell them in game; it will not be shown again.' }[what] };
      } else return res.status(404).end();
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger');
  });

  app.get('/inn/fairness', need('inn'), (req, res) => {
    res.page({ title: 'How the tables ran', active: 'innledger', wide: true, body: IV.fairnessPage({ week: I.week(require('../lib/town').weekKey()) }) });
  });

  app.post('/inn/:game/learned', checkCsrf, (req, res) => {
    const game = String(req.params.game);
    if (!I.GAME[game]) return res.status(404).end();
    req.session.learned = Object.assign({}, req.session.learned, { [game]: 1 });
    if (wantsJson(req)) return res.json({ ok: true });
    res.redirect('/inn/' + game);
  });

  app.get('/inn/:game', (req, res, next) => {
    const game = String(req.params.game);
    if (!I.GAME[game]) return next();
    const d = base(req);
    d.view = viewOf(game, d);
    d.lastBet = (req.session.innBet || {})[game];
    d.tutorial = !learned(req, game);
    res.page({ title: I.GAME[game].name + ' · The Jerall View Inn', wide: true, body: IV.tablePage(game, d) });
  });

  app.post('/inn/:game/:what', checkCsrf, (req, res, next) => {
    const game = String(req.params.game);
    const what = String(req.params.what);
    if (!I.GAME[game]) return next();
    const json = wantsJson(req);
    const back = '/inn/' + game;
    const fail = (code, text) => json ? res.status(code).json({ error: text }) : (req.session.flash = { err: true, text }, res.redirect(back));
    const patron = I.current(req);
    if (!patron) return fail(403, 'Ask for a seat at the door first.');
    if (limited('inn|' + patron.id, 240, 60 * 1000)) return fail(429, 'Easy, traveller. Give the innkeeper a moment.');
    const b = Object.assign({}, req.body || {});
    if (game === 'wheel' && !b.bets && b.place) b.bets = { [String(b.place)]: b.amount };
    const before = game === 'bones' ? I.table(patron.id, 'bones') : null;
    let out;
    try { out = I.act(patron.id, game, what, b); }
    catch (e) { return fail(400, e.message); }
    if (b.bet) req.session.innBet = Object.assign({}, req.session.innBet, { [game]: Math.floor(Number(b.bet)) || undefined });
    if (!json) return res.redirect(back);
    const d = base(req);
    d.view = viewOf(game, d);
    d.lastBet = (req.session.innBet || {})[game];
    const reply = { html: IV.part(game, d), purse: d.patron ? d.patron.purse : 0, lastout: IV.lastOut(game, d.outcomes[game]) };
    if (game === 'cards' && out.settled && d.view.frames && d.view.frames.length > 1) {
      const hands = d.view.hands.map(h => Object.assign({}, h, { result: '', active: false }));
      reply.frames = d.view.frames.map((f, i) => IV.cardsPart(d, { dealer: f, dealerTotal: J.total(f).n, hands, say: i ? I.KEEPER + ' draws. He has ' + J.total(f).n + '.' : I.KEEPER + ' turns his card.', tone: '', staked: 0, frame: true }));
    }
    if (game === 'bones' && out.steps && out.steps.length) {
      let you = what === 'start' ? 0 : before.you, inn = what === 'start' ? 0 : before.inn;
      reply.frames = out.steps.map(s => {
        if (typeof s.you === 'number') you = s.you;
        if (typeof s.inn === 'number') inn = s.inn;
        return IV.bonesPart(d, { dice: s.dice, pot: s.pot, you, inn, say: s.say, tone: s.tone, turn: s.who, frame: true, over: false });
      });
    }
    if (game === 'wheel') reply.spin = out.spin;
    res.json(reply);
  });
};
