const C = require('../lib/closure');
const V = require('../lib/views');
const Svc = require('../lib/service');

module.exports = (app, ctx) => {
  const { checkCsrf, wrap, need } = ctx;

  app.get('/memorial', (req, res) => {
    res.page({
      title: 'The Lantern',
      active: null,
      noDoors: true,
      body: C.memorial(req.user, req.session.csrf)
    });
  });

  app.post('/memorial/roll', checkCsrf, (req, res) => {
    const out = C.addToRoll(req.user, req.body.character, req.body.words);
    if (out.error) {
      req.session.flash = { bad: true, text: out.error };
    } else {
      req.session.flash = { text: 'Your name is on the roll.' };
    }
    res.redirect('/memorial');
  });

  app.get('/memorial/service', (req, res) => {
    if (!req.user) return res.redirect('/login?to=%2Fmemorial%2Fservice');
    const mine = C.onRoll(req.user.id);
    res.page({
      title: 'Certificate of Service',
      noDoors: true,
      body: certificate(req.user, mine)
    });
  });

  app.post('/admin/closure', checkCsrf, need('master'), (req, res) => {
    const at = String(req.body.at || '').trim();
    const on = req.body.on === 'on' || req.body.on === '1';
    const next = { on: on };
    if (at) next.at = at;
    C.save(next);
    req.session.flash = { text: 'The closing is set.' };
    res.redirect(ctx.back(req, '/admin'));
  });

  app.post('/admin/closure/strike', checkCsrf, need('master'), (req, res) => {
    C.removeFromRoll(String(req.body.uid || ''));
    req.session.flash = { text: 'Struck from the roll.' };
    res.redirect(ctx.back(req, '/memorial'));
  });
};

function certificate(user, mine) {
  const esc = V.esc;
  const name = esc((mine && mine.name) || user.name || '');
  const style = esc((mine && mine.style) || user.title || '');
  return `<section class="card certpaper">
  <div class="certinner">
    <div class="eyebrow">County of Bruma &middot; Office of the Countess</div>
    <h2 class="certhead">Certificate of Service</h2>
    <div class="certrule" aria-hidden="true"></div>
    <p class="certbody">Be it known to all who read this, that</p>
    <p class="certname">${name}</p>
    ${style ? `<p class="certstyle">${style}</p>` : ''}
    <p class="certbody">kept faith with the County of Bruma, in the Jerall Mountains, in the
    Imperial Province of Cyrodiil, and served it honestly for as long as it stood.</p>
    ${mine && mine.words ? `<p class="certwords">&ldquo;${esc(mine.words)}&rdquo;</p>` : ''}
    <p class="certbody">Given under the hand of the County, and sealed, in the year 4E
    ${esc(String(require('../lib/config').CURRENT_YEAR))}, at the closing of the hall.</p>
    <div class="certseal" aria-hidden="true"></div>
    <p class="quiet certprint">Use your browser&rsquo;s print command to keep this as a PDF.</p>
  </div>
</section>`;
}
