const fs = require('fs');
const V = require('../lib/views');
const O = require('../lib/offices');
const T = require('../lib/town');
const TV = require('../lib/townviews');
const W = require('../lib/watch');
const Pr = require('../lib/proclaim');
const Cd = require('../lib/cards');
const Bn = require('../lib/bones');

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

function herald(key, user) {
  const thisWeek = T.weekKey();
  const past = key < thisWeek;
  const [a, b] = T.weekRange(key);
  const inWk = iso => { const t = Date.parse(iso); return t >= a && t < b; };
  const shifts = W.shifts().filter(s => !s.struck && inWk(s.on));
  const byWho = {};
  shifts.forEach(s => { byWho[s.who] = byWho[s.who] || { name: s.name, mins: 0 }; byWho[s.who].mins += W.minutesOf(s); });
  const ranked = Object.values(byWho).sort((x, y) => y.mins - x.mins);
  let gaps = 0;
  try { gaps = W.weekGrid(key).rows.reduce((n, r) => n + r.cells.filter(c => c.gap && c.past).length, 0); } catch (_) { gaps = 0; }
  const goalsAll = T.goals().map(T.goalView);
  const goal = goalsAll.find(g => g.metAt && inWk(g.metAt)) || (past ? null : T.current());
  const topP = goal ? goal.pledges.filter(p => p.paid).sort((x, y) => y.amount - x.amount)[0] : null;
  let petitions = 0, answered = 0, reports = 0;
  try { const P = require('../lib/petitions'); const ps = P.all().filter(p => inWk(p.at)); petitions = ps.length; answered = ps.filter(p => P.ANSWERED.has(p.stage)).length; } catch (_) {}
  try { reports = require('../lib/reports').every().filter(r => !r.struck && inWk(r.at)).length; } catch (_) {}
  const pass = Pr.pass();
  const prevKey = T.weekKey(a - 3 * 86400000);
  const nextKey = T.weekKey(b + 3 * 86400000);
  return {
    week: key, past, prev: prevKey, next: key < thisWeek ? nextKey : '',
    lead: T.heraldLead(key),
    watch: { hours: Math.round(shifts.reduce((n, s) => n + W.minutesOf(s), 0) / 60), guards: ranked.length, top: ranked[0] ? { name: ranked[0].name, hours: Math.round(ranked[0].mins / 60) } : null, gaps },
    goal: goal ? { title: goal.title, met: !!goal.metAt && inWk(goal.metAt), paid: goal.paid, target: goal.target, top: topP } : null,
    ghost: T.ghostWeek(key),
    ballad: T.balladLines(key), balladTitle: T.balladTitle(key),
    word: Pr.all().filter(p => inWk(p.at)),
    petitions, answered, reports,
    pass: (Pr.STATE_BY_ID[pass.state] || Pr.STATES[0]).name,
    face: T.faceOfDay(new Date(b - 86400000)),
    cards: Cd.board(key),
    bones: Bn.board(key),
    cheers: T.cheersWeek(key),
    mayHerald: O.can(user, 'herald')
  };
}

module.exports = function (app, { checkCsrf, wrap, back, need }) {
  app.post('/goal', checkCsrf, need('goals'), wrap((req, res) => {
    try { const g = T.goalSet(req.body || {}, req.user); req.session.flash = { text: 'The goal is set: ' + g.title + '.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/goal');
  }));

  app.get('/goal', (req, res) => {
    const done = T.goals().filter(g => g.metAt).map(T.goalView).reverse();
    res.page({ title: 'The town’s goals', body: TV.goalPage(req.user, req.session.csrf, { goal: T.current(), mayGoals: O.can(req.user, 'goals'), built: T.built(), done }) });
  });

  app.post('/goal/:id/pledge', checkCsrf, wrap((req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/');
    if (!req.user && limited('pledge|' + req.ip, 5, 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'Enough pledges from you this hour.' }; return res.redirect('/'); }
    try { const g = T.pledge(String(req.params.id), b, req.user); req.session.flash = { text: 'Your pledge is written down. Hand the septims to the Steward in game and it will count toward ' + g.title.charAt(0).toLowerCase() + g.title.slice(1) + '.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/'));
  }));

  app.post('/goal/:id/pledge/:pid', checkCsrf, need('goals'), wrap((req, res) => {
    try {
      const g = T.pledgeMark(String(req.params.id), String(req.params.pid), String((req.body || {}).act || ''), req.user);
      req.session.flash = { text: g.met ? 'Every septim is in. It is built, and the front page shows it.' : 'Set down.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/goal');
  }));

  app.post('/goal/:id/close', checkCsrf, need('goals'), wrap((req, res) => {
    T.goalClose(String(req.params.id), req.user);
    req.session.flash = { text: 'The goal is closed.' };
    res.redirect('/goal');
  }));

  app.post('/ghost', checkCsrf, (req, res) => {
    const b = req.body || {};
    try {
      const who = T.ghostClaim(req.session, String(b.token || ''), req.user ? req.user.name : b.name);
      req.session.flash = { text: who + ' caught the pale figure on the Jerall road. It will be in the Herald.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect(back(req, '/'));
  });

  app.get('/ballad', (req, res) => {
    const want = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.week || '')) ? T.weekKey(new Date(req.query.week + 'T12:00:00')) : '';
    const week = T.weekKey();
    const d = { week, past: T.balladWeeks().filter(w => w.week !== week), mayTown: O.can(req.user, 'town') };
    if (want && want !== week) return res.page({ title: T.balladTitle(want), body: TV.balladSealed(want, d, req.session.csrf) });
    res.page({ title: 'The ballad of Bruma', body: TV.balladPage(req.user, req.session.csrf, d) });
  });

  app.post('/ballad', checkCsrf, (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/ballad');
    const key = req.user ? 'u:' + req.user.username : 'ip:' + req.ip;
    try { T.balladAdd(b, req.user, key); req.session.flash = { text: 'Your line is pinned up with the rest.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/ballad');
  });

  app.post('/ballad/:id/strike', checkCsrf, need('town'), (req, res) => {
    T.balladStrike(String(req.params.id), req.user);
    req.session.flash = { text: 'The line is struck.' };
    res.redirect(back(req, '/ballad'));
  });

  app.get('/faces', (req, res) => {
    const mayTown = O.can(req.user, 'town');
    res.page({ title: 'Faces of Bruma', body: TV.facesPage(req.user, req.session.csrf, { list: T.faces().slice().reverse(), today: T.faceOfDay(), mayTown, pending: mayTown ? T.facesPending() : [] }) });
  });

  app.post('/faces/send', checkCsrf, (req, res) => {
    const b = req.body || {};
    if (b.website) return res.redirect('/faces');
    if (req.user) return res.redirect(307, '/faces');
    if (limited('face|' + req.ip, 3, 24 * 60 * 60 * 1000)) { req.session.flash = { err: true, text: 'You have sent in enough portraits today.' }; return res.redirect('/faces'); }
    try { T.faceSubmit(b); req.session.flash = { text: 'Your portrait is with the Steward. It goes up once it has been looked over.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/faces');
  });

  app.post('/faces/:id/approve', checkCsrf, need('town'), (req, res) => {
    try { const f = T.faceApprove(String(req.params.id), req.user); req.session.flash = { text: f.name + '’s portrait is up.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/faces');
  });

  app.post('/faces/:id/cheer', checkCsrf, (req, res) => {
    const key = req.user ? 'u:' + req.user.username : 's:' + (req.session.cheerKey || (req.session.cheerKey = require('crypto').randomBytes(8).toString('hex')));
    try {
      const id = String(req.params.id);
      const r = T.cheer(id, key, req.user ? '' : require('crypto').createHash('sha256').update(String(req.ip)).digest('hex').slice(0, 16));
      req.session.flash = { text: r.already ? 'You have raised your cup today already.' : 'Your cup is raised.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/#honour');
  });

  app.post('/faces', checkCsrf, need('hall'), (req, res) => {
    try { T.faceSave(req.user, req.body || {}); req.session.flash = { text: 'Your portrait is up.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/faces');
  });

  app.post('/faces/:id/remove', checkCsrf, need('town'), (req, res) => {
    T.faceRemove(String(req.params.id), req.user);
    req.session.flash = { text: 'The portrait is taken down.' };
    res.redirect('/faces');
  });

  app.get('/faces/:id/picture', (req, res) => {
    const f = T.faceFile(String(req.params.id), O.can(req.user, 'town'));
    if (!f || !fs.existsSync(f.path)) return res.status(404).end();
    res.setHeader('Cache-Control', O.can(req.user, 'town') ? 'private, no-store' : 'public, max-age=3600');
    res.type(f.type).send(fs.readFileSync(f.path));
  });

  const innWho = req => req.user ? { name: req.user.name, key: 'u:' + req.user.username, signed: true } : (req.session.innName ? { name: req.session.innName, key: 's:' + req.session.innName.toLowerCase(), signed: false } : null);
  const innId = req => req.session.innId || (req.session.innId = require('crypto').randomBytes(12).toString('hex'));
  const learned = (req, game) => !!(req.session.learned && req.session.learned[game]);
  const cleanName = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 40);

  app.get('/inn', (req, res) => {
    const who = innWho(req);
    res.page({ title: 'The Jerall View Inn', body: TV.innLobby(req.user, req.session.csrf, { name: who ? who.name : '', cards: Cd.board(T.weekKey()), bones: Bn.board(T.weekKey()), I: Cd }) });
  });

  app.get('/inn/cards', (req, res) => {
    const who = innWho(req);
    res.page({ title: 'Twenty-one · The Jerall View Inn', wide: true, body: TV.cardsPage(req.user, req.session.csrf, { state: Cd.view(Cd.table(innId(req))), name: who ? who.name : '', board: Cd.board(T.weekKey()), I: Cd, tutorial: !learned(req, 'cards') }) });
  });

  app.get('/inn/bones', (req, res) => {
    const who = innWho(req);
    res.page({ title: 'Bones · The Jerall View Inn', wide: true, body: TV.bonesPage(req.user, req.session.csrf, { game: req.session.bones || Bn.fresh(), name: who ? who.name : '', board: Bn.board(T.weekKey()), I: Bn, tutorial: !learned(req, 'bones') }) });
  });

  app.post('/inn/name', checkCsrf, (req, res) => {
    const b = req.body || {};
    const to = ['/inn', '/inn/cards', '/inn/bones'].includes(b.to) ? b.to : '/inn';
    if (b.website) return res.redirect(to);
    const n = cleanName(b.name);
    if (n.length < 2) { req.session.flash = { err: true, text: 'Give the innkeeper a name.' }; return res.redirect(to); }
    req.session.innName = n;
    res.redirect(to);
  });

  app.post('/inn/:game/learned', checkCsrf, (req, res) => {
    const game = String(req.params.game);
    if (!['cards', 'bones'].includes(game)) return res.status(404).end();
    req.session.learned = Object.assign({}, req.session.learned, { [game]: 1 });
    if (/json/.test(String(req.get('accept') || ''))) return res.json({ ok: true });
    res.redirect('/inn/' + game);
  });

  app.post('/inn/:game/:what', checkCsrf, (req, res) => {
    const json = /json/.test(String(req.get('accept') || ''));
    const game = String(req.params.game);
    const what = String(req.params.what);
    const back = '/inn/' + (game === 'bones' ? 'bones' : 'cards');
    const fail = (code, text) => json ? res.status(code).json({ error: text }) : (req.session.flash = { err: true, text }, res.redirect(back));
    const who = innWho(req);
    if (!who) return fail(400, 'Tell the innkeeper your name first.');
    const moves = { cards: ['deal', 'hit', 'stand'], bones: ['throw', 'bank', 'new'] };
    if (!moves[game] || !moves[game].includes(what)) return fail(404, 'The innkeeper does not follow.');
    if (limited('inn|' + (req.user ? req.user.username : req.ip), 240, 60 * 1000)) return fail(429, 'Easy, traveller. Give the innkeeper a moment.');
    try {
      let out;
      if (game === 'cards') out = Cd.act(innId(req), what, who);
      else { const r = Bn.act(req.session.bones, what, who); req.session.bones = r.game; out = r; }
      if (json) return res.json(out);
      res.redirect(back);
    } catch (e) { fail(400, e.message); }
  });

  app.get('/herald', (req, res) => {
    const thisWeek = T.weekKey();
    const want = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.week || '')) ? T.weekKey(new Date(req.query.week + 'T12:00:00')) : thisWeek;
    const key = want > thisWeek ? thisWeek : want;
    res.page({ title: 'The Jerall Herald', wide: true, body: TV.heraldPage(req.user, req.session.csrf, herald(key, req.user)) });
  });

  app.post('/herald', checkCsrf, need('herald'), (req, res) => {
    const b = req.body || {};
    const key = /^\d{4}-\d{2}-\d{2}$/.test(String(b.week || '')) ? T.weekKey(new Date(b.week + 'T12:00:00')) : T.weekKey();
    try { const l = T.heraldSetLead(key, b, req.user); req.session.flash = { text: l ? 'The lead story is set.' : 'The lead story is taken out.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/herald' + (key === T.weekKey() ? '' : '?week=' + key));
  });
};
