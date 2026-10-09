const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const C = require('./lib/config');
const V = require('./lib/views');
const U = require('./lib/users');
const O = require('./lib/offices');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cookieSession({
  name: 'bruma',
  keys: [C.SESSION_SECRET],
  sameSite: 'lax',
  secure: C.PRODUCTION,
  httpOnly: true
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use(express.urlencoded({ extended: true, limit: '2mb', parameterLimit: 2000 }));

app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(18).toString('hex');
  if (req.session.username) {
    const now = Date.now();
    const seen = Number(req.session.seen) || 0;
    if (!seen || now - seen > C.IDLE_MINUTES * 60 * 1000) {
      req.session.username = null;
      req.session.seen = null;
      req.session.flash = { text: 'The hall closed while you were away. Enter again.' };
    } else if (now - seen > 60 * 1000) {
      req.session.seen = now;
    }
  }
  req.user = req.session.username ? U.sessionUser(req.session.username) : null;
  if (req.session.username && !req.user) req.session.username = null;

  res.page = (opts, status) => {
    const flash = req.session.flash;
    req.session.flash = null;
    res.status(status || 200).send(V.layout({
      ...opts,
      user: req.user,
      csrf: req.session.csrf,
      flash: opts.flash || flash
    }));
  };
  res.say = (title, text, status) => res.page({ title, body: V.message(title, text) }, status);
  next();
});

app.use(require('./lib/ledger').middleware);

app.use((req, res, next) => {
  if (!req.user || !req.user.mustChange) return next();
  const p = req.path;
  if (p === '/me/password' || p === '/logout' || p === '/login' || p.startsWith('/style') || p.startsWith('/app.js')) return next();
  if (req.method === 'POST') return next();
  res.redirect('/me/password');
});

function checkCsrf(req, res, next) {
  if (req.body && req.body._csrf && req.body._csrf === req.session.csrf) return next();
  res.say('The seal is broken', 'This page sat open too long, or came from somewhere else. Go back, reload it, and try again.', 403);
}

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const back = (req, fallback) => {
  const b = String((req.body && req.body.back) || '');
  return b.startsWith('/') && !b.startsWith('//') ? b : fallback;
};

function need(perm) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login?to=' + encodeURIComponent(req.originalUrl));
    if (O.can(req.user, perm)) return next();
    next('forbidden');
  };
}

function needAny() {
  const perms = Array.prototype.slice.call(arguments);
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login?to=' + encodeURIComponent(req.originalUrl));
    if (perms.some(p => O.can(req.user, p))) return next();
    next('forbidden');
  };
}

const ctx = { checkCsrf, wrap, back, need, needAny };

require('./routes/public')(app, ctx);
require('./routes/open')(app, ctx);
require('./routes/watch')(app, ctx);
require('./routes/property')(app, ctx);
require('./routes/treasury')(app, ctx);
require('./routes/taxes')(app, ctx);
require('./routes/reckoner')(app, ctx);
require('./routes/guilds')(app, ctx);
require('./routes/court')(app, ctx);
require('./routes/gaol')(app, ctx);
require('./routes/people')(app, ctx);
require('./routes/petitions')(app, ctx);
require('./routes/licences')(app, ctx);
require('./routes/service')(app, ctx);
require('./routes/verify')(app, ctx);
require('./routes/archive')(app, ctx);
require('./routes/admin')(app, ctx);

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use((req, res) => res.say('No such hall', 'Nothing in the County answers to that path.', 404));

app.use((err, req, res, next) => {
  if (typeof res.say !== 'function') {
    console.error(err);
    return res.status(500).type('html').send('<!doctype html><title>Something went amiss</title><body style="font-family:Georgia,serif;max-width:640px;margin:60px auto;padding:0 20px"><h1>Something went amiss</h1><p>The clerks could not finish that. Try again shortly.</p></body>');
  }
  if (err === 'forbidden') {
    return res.say('That door is not yours to open', 'Your office does not reach this part of the County. If you need it, ask the Steward.', 403);
  }
  console.error(err);
  res.say('Something went amiss', 'The clerks could not finish that. ' + V.esc(err && err.message ? err.message : '') + ' Try again shortly.', 500);
});

U.bootstrap();
O.all();
try {
  const Arch = require('./lib/archive');
  const n = Arch.seedLex();
  if (n) console.log('Laid the Lex Brumae into the archive: ' + n + ' titles.');
  const mended = Arch.mendLex();
  if (mended.length) console.log('Amended the Lex Brumae: ' + mended.join(', ') + '.');
  try {
    const fixed = require('./lib/reports').mendParties();
    if (fixed) console.log('Set one party upon ' + fixed + ' report paper(s).');
  } catch (e) { console.error('Could not mend the report papers:', e.message); }
  try {
    const moved = require('./lib/guilds').mendShortLadders();
    if (moved) console.log('Set ' + moved + ' guild member(s) upon the shortened ladders.');
  } catch (e) { console.error('Could not mend the guild ladders:', e.message); }
} catch (e) { console.error('Could not seed the Lex Brumae:', e.message); }

if (require.main === module) {
  app.listen(C.PORT, () => console.log('The County of Bruma is listening on ' + C.PORT));
}
module.exports = app;
