const I = require('../lib/inn');
const IV = require('../lib/innviews');
const J = require('../lib/innjack');
const PvP = require('../lib/innpvp');
const BV = require('../lib/innbackviews');
const O = require('../lib/offices');
const Wr = require('../lib/innwhere');
const GV = require('../lib/inngameviews');
const Hh = require('../lib/innhall');

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
    const patron = I.current(req);
    const seatedP = I.seated(patron);
    return { user: req.user, csrf: req.session.csrf, patron, house: I.house(), outcomes: I.outcomes(), requests: seatedP ? I.openRequests(patron.id) : [], net: seatedP ? (I.nets()[patron.id] || 0) : 0 };
  };
  const learned = (req, game) => !!(req.session.learned && req.session.learned[game]);

  app.use('/inn', (req, res, next) => {
    const orig = res.page.bind(res);
    res.page = (opts, code) => orig(Object.assign({}, opts, { body: IV.themed(opts.body) }), code);
    next();
  });


  function viewOf(game, d) {
    const t = I.table(d.patron ? d.patron.id : '', game);
    if (game === 'cards') return Object.assign(J.view(t, I.rulesOf(d.house), d.patron ? d.patron.purse : 0), { sides: t.round && t.round.sides || null, sideBets: t.sideBets || {} });
    return t;
  }

  app.get('/inn', (req, res) => {
    const d = base(req);
    d.backOpen = PvP.open().length;
    res.page({ title: 'The Jerall View Inn', wide: true, body: IV.lobby(d), after: IV.bardTag() + IV.doorWatch(d) });
  });

  app.post('/inn/ask', checkCsrf, (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/inn');
    if (limited('innask|' + (req.user ? req.user.username : req.ip), 5, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'The innkeeper has heard enough names from you for now. Try again later.' }; return res.redirect('/inn'); }
    try {
      if (!req.user && !req.session.innToken) req.session.innToken = I.newToken();
      const p = I.ask(b, req.user, req.session.innToken);
      req.session.flash = { text: p.returning ? 'The innkeeper knows the name. Once a keeper confirms it is you, your purse is waiting.' : 'Your name is in ' + I.KEEPER + '’s book. A keeper of the inn will let you in.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn');
  });

  const mine = (req, res, fn) => {
    const p = I.current(req);
    if (!I.seated(p)) { req.session.flash = { err: true, text: 'Ask for a seat at the door first.' }; return res.redirect('/inn'); }
    try { fn(p); } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(String((req.body || {}).back || '') === 'me' ? '/inn/me' : '/inn#purse');
  };

  app.post('/inn/cashout', checkCsrf, (req, res) => mine(req, res, p => {
    const r = I.cashOut(p.id, (req.body || {}).amount);
    req.session.flash = { text: I.septims(r.amount) + ' is set aside. The innkeeper will pay you in game.' };
  }));

  app.post('/inn/more', checkCsrf, (req, res, next) => {
    if (!/json/.test(String(req.get('accept') || ''))) return next();
    res.setHeader('Cache-Control', 'no-store');
    const p = I.current(req);
    if (!I.seated(p)) return res.status(403).json({ error: 'Ask for a seat at the door first.' });
    try {
      if (limited('innmore|' + p.id, 6, 60 * 60 * 1000)) throw new Error('You have asked a lot this hour. Wait for the innkeeper.');
      I.askMore(p.id, (req.body || {}).amount, (req.body || {}).note);
      res.json({ ok: true, text: 'The innkeeper knows you want more coin. Hand it over in game and your purse is filled.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/inn/more', checkCsrf, (req, res) => mine(req, res, p => {
    if (limited('innmore|' + p.id, 6, 60 * 60 * 1000)) throw new Error('You have asked a lot this hour. Wait for the innkeeper.');
    I.askMore(p.id, (req.body || {}).amount, (req.body || {}).note);
    req.session.flash = { text: 'The innkeeper knows you want more coin. Hand it over in game and your purse is filled.' };
  }));

  app.post('/inn/request/:id/withdraw', checkCsrf, (req, res) => mine(req, res, p => {
    I.settle(req.params.id, 'withdraw', { username: '', name: p.name }, undefined, p.id);
    req.session.flash = { text: 'Called off.' };
  }));

  app.post('/inn/leave', checkCsrf, (req, res) => {
    req.session.innToken = null;
    req.session.innPatron = null;
    req.session.innBet = null;
    req.session.flash = { text: 'You leave the warmth of the inn. Your purse stays in Brannoc’s book.' };
    res.redirect('/inn');
  });

  app.post('/inn/tip', checkCsrf, (req, res) => {
    const b = Object.assign({}, req.body || {});
    if (Array.isArray(b.amount)) b.amount = b.amount.filter(x => String(x).trim()).pop() || '';
    const back = I.IDS.includes(String(b.back || '')) ? '/inn/' + b.back : '/inn';
    const p = I.current(req);
    if (!I.seated(p)) { req.session.flash = { err: true, text: 'Ask for a seat at the door first.' }; return res.redirect('/inn'); }
    if (String(b.sure || '') !== '1') {
      const a = Math.floor(Number(String(b.amount || '').replace(/[^\d]/g, '')) || 0);
      return res.page({ title: 'Tip Brannoc', body: IV.tipConfirm({ csrf: req.session.csrf, amount: a, back: I.IDS.includes(String(b.back || '')) ? b.back : '', purse: p.purse, cap: I.rankOf(p.id).cap }) });
    }
    if (limited('inntip|' + p.id, 30, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'Brannoc waves you off. “Enough, enough.”' }; return res.redirect(back); }
    try { const t = I.tip(p.id, b.amount); req.session.flash = { text: 'You tip ' + I.septims(t.amount) + '. ' + t.say + ' Luck leans your way for a minute on stakes up to ' + I.septims(t.favour.cap) + '.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back);
  });

  app.get('/inn/upcoming.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const p = I.current(req);
    if (!I.seated(p)) return res.json({ now: Date.now(), list: [] });
    res.json({ now: Date.now(), list: I.upcoming(p.id) });
  });

  app.get('/inn/door.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const p = I.current(req);
    res.json({ status: p ? p.status : 'none' });
  });

  app.post('/inn/ledger/tourney', checkCsrf, need('inn'), (req, res) => {
    const b = req.body || {};
    try {
      if (b.act === 'cancel') { I.tourneyCancel(req.user); req.session.flash = { text: 'The tournament is called off and every buy-in handed back.' }; }
      else { const c = I.tourneyStart(b, req.user); req.session.flash = { text: 'Tournament ' + c.no + ' is open at ' + I.GAME[c.game].name + ': buy-in ' + I.septims(c.buyin) + ', ' + c.mins + ' minutes on the clock.' }; }
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#tourneycard');
  });

  app.post('/inn/ledger/theme', checkCsrf, need('inn'), (req, res) => {
    try {
      const t = I.setTheme((req.body || {}).theme, req.user);
      req.session.flash = { text: t.id === 'none' ? 'The hall wears its everyday look again.' : 'The hall is dressed for the ' + t.name + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#dresscard');
  });

  app.post('/inn/tourney/join', checkCsrf, (req, res) => {
    const b = req.body || {};
    const back = I.TOURNEY_GAMES.includes(String(b.back || '')) ? '/inn/' + b.back : '/inn';
    const p = I.current(req);
    try {
      const c = I.tourneyJoin(p ? p.id : '');
      req.session.flash = { text: 'You are in. ' + I.septims(c.buyin) + ' goes to the pot; your winnings at ' + I.GAME[c.game].short + ' count until time is called.' };
      return res.redirect('/inn/' + c.game);
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back);
  });

  app.get('/inn/tourney.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const d = base(req);
    const game = String(req.query.game || '') || undefined;
    const t = I.tourneyView(d.patron ? d.patron.id : '');
    res.json({ html: IV.tourneyBox(d, game), endAt: t.cur ? t.cur.endAt : 0 });
  });

  app.get('/inn/bard', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.type('html').send(IV.bardWindow()); });

  app.get('/inn/bard.json', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ list: Hh.bard().list }); });

  app.post('/inn/ledger/open', checkCsrf, need('inn'), (req, res) => {
    const b = req.body || {};
    const open = b.all === 'open' ? I.ALL_IDS : [].concat(b.open || []).map(String);
    const shut = I.setClosed(I.ALL_IDS.filter(g => !open.includes(g)), req.user);
    req.session.flash = { text: shut.length ? 'Closed tonight: ' + shut.map(g => I.GAME[g].name).join(', ') + '.' : 'Every table is open.' };
    res.redirect('/inn/ledger#opencard');
  });

  app.post('/inn/ledger/notice', checkCsrf, need('inn'), (req, res) => {
    const n = Hh.setNotice((req.body || {}).text, req.user);
    req.session.flash = { text: n ? 'The notice is nailed up at the door.' : 'The notice is taken down.' };
    res.redirect('/inn/ledger#hallcard');
  });

  app.post('/inn/ledger/happy', checkCsrf, need('inn'), (req, res) => {
    const b = req.body || {};
    try { const h = Hh.setHappy(String(b.game || ''), b.minutes, req.user, I.IDS); req.session.flash = { text: h ? 'Happy hour at ' + I.GAME[h.game].name + ' for ' + h.minutes + ' minutes.' : 'Happy hour is over.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#hallcard');
  });

  app.post('/inn/ledger/bard', checkCsrf, need('inn'), (req, res) => {
    try { const l = Hh.setBard((req.body || {}).list, req.user); req.session.flash = { text: l.length ? 'The bard has ' + l.length + (l.length === 1 ? ' song.' : ' songs.') : 'The bard’s list is empty.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#hallcard');
  });

  app.get('/inn/me', (req, res) => {
    const d = base(req);
    if (!I.seated(d.patron)) return res.redirect('/inn');
    d.record = I.record(d.patron.id);
    res.page({ title: 'My purse · The Jerall View Inn', body: IV.mePage(d), after: IV.bardTag() });
  });

  app.get('/inn/ledger', need('inn'), (req, res) => {
    res.page({ title: 'The Inn Ledger', active: 'innledger', wide: true, after: IV.watchTag(), body: IV.ledgerPage({ csrf: req.session.csrf, coin: I.coinInHand(), ledger: I.ledger(), house: I.house(), where: Wr.tonight(), next: Wr.tomorrow() }) });
  });

  app.post('/inn/ledger/where', checkCsrf, need('inn'), (req, res) => {
    const w = Wr.setTonight((req.body || {}).place, req.user);
    req.session.flash = { text: 'Tonight the tables are in ' + w.place + '.' };
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/house', checkCsrf, need('inn'), (req, res) => {
    try { I.setHouse(req.body || {}, req.user); req.session.flash = { text: 'The house rules are set.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/request/:id/:what', checkCsrf, need('inn'), (req, res) => {
    const what = String(req.params.what);
    try {
      const r = I.settle(req.params.id, what, req.user, (req.body || {}).amount);
      req.session.flash = { text: { paid: r.name + '’s cash-out of ' + I.septims(r.amount) + ' is marked paid.', returned: r.name + '’s ' + I.septims(r.amount) + ' is back in their purse.', added: I.septims(r.added) + ' added to ' + r.name + '’s purse.', declined: r.name + '’s request is declined.' }[r.status] || 'Done.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/all/accept', checkCsrf, need('inn'), (req, res) => {
    const L = I.ledger();
    L.waiting.forEach(p => I.decide(p.id, 'accept', req.user));
    L.returning.forEach(p => I.decide(p.id, 'device', req.user));
    const n = L.waiting.length + L.returning.length;
    req.session.flash = { text: n === 1 ? 'One patron let in.' : n + ' patrons let in. Fill their purses once they hand over coin.' };
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/keno/draw', checkCsrf, need('inn'), (req, res) => {
    const r = I.kenoDraw(Date.now(), true);
    req.session.flash = { text: r ? 'Draw ' + r.no + ' is made: ' + r.tickets + (r.tickets === 1 ? ' ticket' : ' tickets') + ', ' + I.septims(r.paid) + ' paid out.' : 'The lottery has started its clock.' };
    res.redirect('/inn/ledger');
  });

  app.post('/inn/ledger/:id/:what', checkCsrf, need('inn'), (req, res) => {
    const what = String(req.params.what);
    const b = req.body || {};
    try {
      if (what === 'merge') {
        const m = I.mergeGuest(req.params.id, req.user);
        req.session.flash = { text: m.from + ' is merged into ' + m.into + (m.amount ? ', and ' + I.septims(m.amount) + ' moved into their purse.' : '.') };
        return res.redirect('/inn/ledger');
      }
      if (what === 'purse') {
        const p = I.purse(req.params.id, String(b.kind || ''), b.amount, b.note, req.user);
        req.session.flash = { text: p.name + '’s purse now holds ' + I.septims(p.purse) + '.' };
      } else if (['accept', 'turn', 'forget', 'device', 'nodevice'].includes(what)) {
        const r = I.decide(req.params.id, what, req.user);
        const n = r.patron.name;
        req.session.flash = { text: { accept: n + ' is let in. Fill their purse once they hand over coin.', turn: n + ' is turned away.', forget: n + ' is forgotten. The name is free to ask again.' + (r.writtenOff ? ' ' + I.septims(r.writtenOff) + ' was written off their purse.' : ''), device: n + ' can sit down from that browser now.', nodevice: 'That browser is turned away. ' + n + '’s seat and purse are untouched.' }[what] };
      } else return res.status(404).end();
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger');
  });

  function liveRows() {
    const house = I.house();
    const nets = I.nets();
    return I.live(15).filter(p => I.IDS.includes(p.lastGame)).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(p => {
      const d = { user: null, csrf: '', patron: p, house, outcomes: {}, requests: [], net: 0 };
      d.view = viewOf(p.lastGame, d);
      return { favour: !!(p.favour && p.favour.until > Date.now()), tilt: (I.tilts().patrons[p.id] || {}).level || 0, id: p.id, name: p.name, game: p.lastGame, purse: p.purse, held: p.held || 0, net: nets[p.id] || 0, at: p.lastAt, html: IV.watchPart(p.lastGame, d) };
    });
  }

  function liveSummary(rows) {
    const since = Date.now() - 15 * 60000;
    const recent = I.feed(400).filter(x => Date.parse(x.at) >= since);
    const staked = recent.reduce((n, x) => n + x.staked, 0), returned = recent.reduce((n, x) => n + x.returned, 0);
    return { players: rows.length, rounds: recent.length, staked, house: staked - returned, rooms: PvP.open().length };
  }

  function liveBack() {
    return BV.liveBack(PvP.open().map(r => PvP.tick(r.id) || r).filter(r => r.status !== 'done').map(r => ({ r, html: BV.roomPart({ me: '', canSit: false, keeperEye: true, csrf: '', house: I.house() }, r).replace(/<form[\s\S]*?<\/form>/g, '') })));
  }

  app.get('/inn/ledger/live', need('inn'), (req, res) => {
    const rows = liveRows();
    res.page({ title: 'The tables, live', active: 'innledger', wide: true, after: IV.watchTag(), body: IV.livePage({ csrf: req.session.csrf, tilts: I.tilts(), rows, feed: I.feed(15), back: liveBack(), summary: liveSummary(rows) }) });
  });

  app.get('/inn/ledger/live.json', need('inn'), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const rows = liveRows();
    res.json({ cards: rows.map(r => ({ id: r.id, game: r.game, at: Date.parse(r.at) || 0, html: IV.liveCard(r) })), now: Date.now(), feed: IV.liveFeed(I.feed(15)), back: liveBack(), summary: IV.liveSummary(liveSummary(rows)) });
  });

  app.post('/inn/ledger/tilt', checkCsrf, need('inn'), (req, res) => {
    const b = req.body || {};
    try { const lv = I.setTilt(b.kind === 'table' ? 'table' : 'patron', b.key, b.level, req.user); res.json({ ok: true, level: lv }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/inn/fairness', need('inn'), (req, res) => {
    res.page({ title: 'How the tables ran', active: 'innledger', wide: true, after: IV.watchTag(), body: IV.fairnessPage({ csrf: req.session.csrf, coin: I.coinInHand(), week: I.week(require('../lib/town').weekKey()) }) });
  });

  app.post('/inn/ledger/reset', checkCsrf, need('inn'), (req, res) => {
    const b = req.body || {};
    if (String(b.confirm || '').trim().toUpperCase() !== 'RESET') { req.session.flash = { err: true, text: 'Type RESET to confirm.' }; return res.redirect('/inn/fairness'); }
    const scope = b.scope === 'everything' ? 'everything' : 'rounds';
    I.reset(scope, req.user);
    req.session.flash = { text: scope === 'everything' ? 'The inn is reset. Every patron, purse and round is cleared; the old records are kept in the data folder.' : 'The rounds are reset. Patrons keep their seats and purses; the old rounds are kept in the data folder.' };
    res.redirect(scope === 'everything' ? '/inn/ledger' : '/inn/fairness');
  });

  const keeper = req => !!(req.user && O.can(req.user, 'inn'));
  const roomData = (req, r) => {
    const patron = I.current(req);
    const seatedP = I.seated(patron);
    const me = seatedP ? patron.id : '';
    const sitting = me ? PvP.liveRoomOf(me) : null;
    return { user: req.user, csrf: req.session.csrf, house: I.house(), patron, me, canSit: seatedP && !sitting && patron.purse >= r.stake, keeperEye: keeper(req) && !(me && sitting) };
  };
  const canWatch = req => keeper(req) || I.seated(I.current(req));
  const stateOf = (req, r) => {
    const d = roomData(req, r);
    return { v: r.v, status: r.status, ev: r.ev || null, me: d.me ? PvP.seatOf(r, d.me) : -1, won: !!(d.me && r.ev && r.ev.kind === 'end' && (r.ev.winners || []).includes(d.me)), html: BV.roomPart(d, r), chat: BV.chatPart(r), log: BV.logPart(r), purse: d.patron && I.seated(d.patron) ? d.patron.purse : null };
  };

  app.get('/inn/back', (req, res) => {
    const d = base(req);
    d.open = PvP.open().map(r => PvP.tick(r.id) || r).filter(r => r.status !== 'done');
    d.recent = PvP.recent();
    res.page({ title: 'The back room · The Jerall View Inn', wide: true, body: BV.backPage(d), after: IV.bardTag() });
  });

  app.post('/inn/back/open', checkCsrf, (req, res) => {
    const p = I.current(req);
    if (!I.seated(p)) { req.session.flash = { err: true, text: 'Ask for a seat at the door first.' }; return res.redirect('/inn'); }
    if (limited('innroom|' + p.id, 20, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'You have opened a lot of tables this hour.' }; return res.redirect('/inn/back'); }
    try { const r = PvP.create(p.id, req.body || {}); return res.redirect('/inn/room/' + r.id); }
    catch (e) { req.session.flash = { err: true, text: e.message }; return res.redirect('/inn/back'); }
  });

  app.get('/inn/room/:id', (req, res, next) => {
    const r = PvP.tick(req.params.id);
    if (!r) return next();
    if (!canWatch(req)) { req.session.flash = { err: true, text: 'Ask for a seat at the door first.' }; return res.redirect('/inn'); }
    res.page({ title: r.title + ' · The back room', wide: true, body: BV.roomPage(roomData(req, r), r), after: IV.bardTag() });
  });

  app.get('/inn/room/:id/state.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!canWatch(req)) return res.status(403).json({ error: 'Ask for a seat at the door first.' });
    const r = PvP.tick(req.params.id);
    if (!r) return res.status(404).json({ error: 'That table has been cleared away.', gone: true });
    if (String(req.query.v || '') === String(r.v)) return res.json({ v: r.v, same: true });
    res.json(stateOf(req, r));
  });

  const ROOMACTS = ['join', 'start', 'leave', 'rebuy', 'back', 'say', 'throw', 'bank', 'bid', 'liar', 'fold', 'check', 'call', 'raise', 'allin', 'bet', 'insure', 'noinsure', 'hit', 'stand', 'double', 'split', 'surrender', 'place', 'move', 'take', 'pick', 'draw', 'choose', 'rematch'];
  app.post('/inn/room/:id/:what', checkCsrf, (req, res, next) => {
    const id = String(req.params.id);
    const what = String(req.params.what);
    if (!ROOMACTS.includes(what)) return next();
    const json = wantsJson(req);
    const back = '/inn/room/' + encodeURIComponent(id);
    const fail = (code, text) => json ? res.status(code).json({ error: text }) : (req.session.flash = { err: true, text }, res.redirect(back));
    const p = I.current(req);
    if (!I.seated(p) && !(what === 'leave' && p)) return fail(403, 'Ask for a seat at the door first.');
    if (limited('innpvp|' + p.id, 120, 60 * 1000)) return fail(429, 'Easy, traveller. Give the table a moment.');
    const b = req.body || {};
    try {
      if (what === 'rematch') { const nr = PvP.rematch(id, p.id); return json ? res.json({ go: '/inn/room/' + nr.id }) : res.redirect('/inn/room/' + nr.id); }
      if (what === 'join') PvP.join(id, p.id);
      else if (what === 'start') PvP.start(id, p.id);
      else if (what === 'leave') PvP.leave(id, p.id);
      else if (what === 'rebuy') PvP.rebuy(id, p.id);
      else if (what === 'back') PvP.back(id, p.id);
      else if (what === 'say') { if (limited('innsay|' + p.id, 20, 60 * 1000)) throw new Error('Slow down; let the others get a word in.'); PvP.say(id, p.id, b.text); }
      else PvP.act(id, p.id, what, { q: b.q, f: b.f, to: b.to, from: b.from, at: b.at, side: b.side, choice: b.choice, amount: b.amount, k: b.k, pp: b.pp, t3: b.t3 });
    } catch (e) { return fail(400, e.message); }
    if (what === 'leave' && !json) return res.redirect('/inn/back');
    if (!json) return res.redirect(back);
    const r = PvP.get(id);
    res.json(r ? stateOf(req, r) : { gone: true });
  });

  app.get('/inn/keno/state.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const d = base(req);
    if (!I.seated(d.patron)) return res.status(403).json({ error: 'Ask for a seat at the door first.' });
    d.view = viewOf('keno', d);
    const k = d.view;
    if (String(req.query.no || '') === String(k.no) && String(req.query.last || '') === String(k.last ? k.last.no : 0)) return res.json({ same: true, nextAt: k.nextAt, now: Date.now() });
    res.json({ no: k.no, nextAt: k.nextAt, now: Date.now(), last: k.last ? { no: k.last.no, balls: k.last.balls } : null, html: IV.part('keno', d), purse: d.patron.purse, tonight: I.tonightFor(d.patron.id, 'keno'), lastout: IV.lastOut('keno', d.outcomes.keno) });
  });

  const evState = (req, game) => {
    const d = base(req);
    d.view = viewOf(game, d);
    d.lastBet = (req.session.innBet || {})[game];
    const p = GV.eventParts(game, d);
    return { meta: p.meta, now: Date.now(), parts: { stage: p.stage, side: p.side, ctl: p.ctl, list: p.list, hist: p.hist }, purse: d.patron.purse, tonight: I.tonightFor(d.patron.id, game), lastout: IV.lastOut(game, d.outcomes[game]) };
  };

  app.get('/inn/:game/state.json', (req, res, next) => {
    const game = String(req.params.game);
    if (!GV.EVENT.includes(game)) return next();
    res.setHeader('Cache-Control', 'no-store');
    if (!I.seated(I.current(req))) return res.status(403).json({ error: 'Ask for a seat at the door first.' });
    res.json(evState(req, game));
  });

  app.post('/inn/ledger/bout', checkCsrf, need('inn'), (req, res) => {
    try { const pb = I.postBout(req.body || {}, req.user); req.session.flash = { text: pb.fighters[0].name + ' against ' + pb.fighters[1].name + ' is posted. Betting is open.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#arenabouts');
  });

  app.post('/inn/ledger/bout/:id/:what', checkCsrf, need('inn'), (req, res) => {
    const what = String(req.params.what);
    try {
      const pb = I.settleBout(req.params.id, what, req.user);
      req.session.flash = { text: what === 'close' ? 'Betting on ' + pb.fighters[0].name + ' against ' + pb.fighters[1].name + ' is closed.' : (what === 'void' ? 'The bout is called off; every stake is handed back.' : pb.fighters[pb.winner].name + ' won. ' + pb.bets.filter(b => b.returned).length + ' winning ' + (pb.bets.filter(b => b.returned).length === 1 ? 'bet is' : 'bets are') + ' paid.') };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/inn/ledger#arenabouts');
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
    if (I.GAME[game].retired) return res.redirect('/inn');
    if (!I.IDS.includes(game)) return res.redirect('/inn/back');
    const d = base(req);
    d.view = viewOf(game, d);
    d.lastBet = (req.session.innBet || {})[game];
    d.tutorial = !learned(req, game);
    d.tonight = I.seated(d.patron) ? I.tonightFor(d.patron.id, game) : null;
    res.page({ title: I.GAME[game].name + ' · The Jerall View Inn', wide: true, body: IV.tablePage(game, d), after: IV.bardTag() });
  });

  app.post('/inn/arena/cheer', checkCsrf, (req, res) => {
    const json = /json/.test(String(req.get('accept') || ''));
    const p = I.current(req);
    let out = null, err = '';
    try {
      if (!I.seated(p)) throw new Error('Ask for a seat at the door first.');
      if (limited('inncheer|' + p.id, 40, 60 * 1000)) throw new Error('Save your voice for the knockout.');
      out = I.cheer(p.id, (req.body || {}).side);
    } catch (e) { err = e.message; }
    if (json) { res.setHeader('Cache-Control', 'no-store'); return err ? res.status(400).json({ error: err }) : res.json(out); }
    if (err) req.session.flash = { err: true, text: err };
    res.redirect('/inn/arena');
  });

  app.post('/inn/:game/:what', checkCsrf, (req, res, next) => {
    const game = String(req.params.game);
    const what = String(req.params.what);
    if (!I.IDS.includes(game)) return next();
    const json = wantsJson(req);
    const back = '/inn/' + game;
    const fail = (code, text) => json ? res.status(code).json({ error: text }) : (req.session.flash = { err: true, text }, res.redirect(back));
    const patron = I.current(req);
    if (!I.seated(patron)) return fail(403, 'Ask for a seat at the door first.');
    if (limited('inn|' + patron.id, 240, 60 * 1000)) return fail(429, 'Easy, traveller. Give the innkeeper a moment.');
    const b = Object.assign({}, req.body || {});
    if (game === 'wheel' && !b.bets && b.place) b.bets = { [String(b.place)]: b.amount };
    const before = game === 'bones' ? I.table(patron.id, 'bones') : null;
    let out;
    try { out = I.act(patron.id, game, what, b); }
    catch (e) { return fail(400, e.message); }
    if (b.bet) req.session.innBet = Object.assign({}, req.session.innBet, { [game]: Math.floor(Number(b.bet)) || undefined });
    if (!json) return res.redirect(back);
    if (GV.EVENT.includes(game)) return res.json(Object.assign(evState(req, game), { cashedAt: out.cashedAt || null }));
    const d = base(req);
    d.view = viewOf(game, d);
    d.lastBet = (req.session.innBet || {})[game];
    const reply = { html: IV.part(game, d), purse: d.patron ? d.patron.purse : 0, lastout: IV.lastOut(game, d.outcomes[game]), happy: out.happy || 0, tonight: I.tonightFor(patron.id, game) };
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
    if (game === 'slots') { reply.grid = d.view.last.grid; reply.won = d.view.last.won; reply.jackpot = d.view.jackpot; }
    if (game === 'plinko') { const l = d.view.last; reply.drop = { path: l.path, slot: l.slot, mult: l.mult, returned: l.returned, staked: l.staked, risk: l.risk }; }
    if (game === 'scratch') { const l = d.view.last; reply.ticket = { seals: l.seals, mult: l.mult, returned: l.returned, staked: l.staked }; reply.ticketHtml = GV.sealTicket(l, true); }
    if (game === 'wheel') reply.spin = out.spin;
    if (game === 'six') reply.slot = out.slot;
    if (game === 'punto' && out.steps) {
      reply.frames = out.steps.map((st, i) => IV.HV.puntoPart(d, { P: st.P, B: st.B, frame: true, say: i === 0 ? 'Two cards each.' : (st.P.length > out.steps[i - 1].P.length ? 'The Player draws a third.' : 'The Banker draws a third.') }));
    }
    res.json(reply);
  });
};
