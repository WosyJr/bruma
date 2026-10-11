const V = require('../lib/views');
const O = require('../lib/offices');
const U = require('../lib/users');
const H = require('../lib/honours');

const esc = V.esc;
const PALETTE = ['#8A1E1E', '#B8392E', '#6E2A1C', '#B8862F', '#D7A54C', '#E9E6D8', '#9FC3D6', '#2E5E8C', '#14223A', '#1F4A35', '#5A5048', '#2A1E14'];

function honourCard(t, holders, mayHonours, csrf) {
  return `<article class="hcard">
    <div class="hhead"><span class="rib big" style="background:${H.stripes(t.colors)}"></span>
      <div><h3>${esc(t.name)}</h3><p class="hint">${esc(t.note || '')}</p></div></div>
    ${holders.length ? `<ul class="hholders">${holders.map(a => `<li><b>${esc(a.name)}</b>${a.count > 1 ? ` <span class="hint">×${a.count}</span>` : ''}<span>${esc(a.citation || a.label || '')}</span><small>${a.at ? esc(V.when(a.at)) : ''}</small></li>`).join('')}</ul>`
      : '<p class="hempty">Not yet given.</p>'}
    ${mayHonours && String(t.id).startsWith('c') ? `<form method="post" action="/honours/type/${esc(t.id)}/retire" class="inline">${V.hidden(csrf)}<button class="linkish" type="submit">retire this honour</button></form>` : ''}
  </article>`;
}

module.exports = function (app, { checkCsrf, wrap, need }) {
  app.get('/honours', (req, res) => {
    const may = O.can(req.user, 'honours');
    const people = U.list().filter(p => p.active !== false);
    const auto = H.AUTO.map(t => ({ type: t, holders: people.map(p => {
      const e = H.autoFor(p.username).find(x => x.honour === t.id);
      return e ? { name: p.name, label: e.label, count: e.count || 0, sortKey: e.count || ({ gold: 3, silver: 2, bronze: 1 })[e.tier] || 0 } : null;
    }).filter(Boolean).sort((a, b) => b.sortKey - a.sortKey) }));
    const body = `
<section class="card">
  <div class="eyebrow">Kept at the Great Hall</div>
  <h2>The Roll of Honour</h2>
  <p class="lede">What the County has given its officers, and why. Each honour is a ribbon; it is worn on the Records of Service and on the officer’s portrait in the Faces of Bruma.</p>
</section>
<section class="hgrid">${H.roll().map(r => honourCard(r.type, r.holders, may, req.session.csrf)).join('')}</section>
<section class="card"><h3 style="margin-top:0">Earned by standing</h3><p class="hint">These two the County gives on its own, from the rolls and the watch.</p></section>
<section class="hgrid">${auto.map(r => honourCard(r.type, r.holders, false, req.session.csrf)).join('')}</section>
${may ? `<section class="card">
  <h3 style="margin-top:0">Add an honour to the roll</h3>
  <form method="post" action="/honours/type" class="stack" style="max-width:620px">${V.hidden(req.session.csrf)}
    <label>Its name<input name="name" maxlength="60" required placeholder="e.g. The Bear of Bruma"></label>
    <label>What it is given for<input name="note" maxlength="200"></label>
    <div class="hcolors">${['c1', 'c2', 'c3'].map((c, i) => `<label>${['Edges', 'Centre', 'Edges again (or leave)'][i]}<select name="${c}" data-ribpick>${i === 2 ? '<option value="">Same as the edges</option>' : ''}${PALETTE.map((p, k) => `<option value="${p}"${(i === 0 && k === 7) || (i === 1 && k === 4) ? ' selected' : ''} style="background:${p}">${p}</option>`).join('')}</select></label>`).join('')}
      <span class="rib big" data-ribprev></span></div>
    <button class="btn go" type="submit">Add it to the roll</button>
  </form>
  <p class="hint">Honours are given from each officer’s Record of Service.</p>
</section>
<script>(function(){var s=document.querySelectorAll('[data-ribpick]'),p=document.querySelector('[data-ribprev]');function d(){var c=[].map.call(s,function(x){return x.value}).filter(Boolean);if(c.length===2)c.push(c[0]);var n=c.length;p.style.background='linear-gradient(90deg,'+c.map(function(x,i){return x+' '+(i/n*100)+'% '+((i+1)/n*100)+'%'}).join(',')+')';}[].forEach.call(s,function(x){x.addEventListener('change',d)});d();})();</script>` : ''}`;
    res.page({ title: 'The Roll of Honour', body, wide: true });
  });

  app.post('/honours/type', checkCsrf, need('honours'), (req, res) => {
    try { const t = H.typeAdd(req.body || {}, req.user); req.session.flash = { text: 'The ' + t.name + ' stands on the roll.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/honours');
  });

  app.post('/honours/type/:id/retire', checkCsrf, need('honours'), (req, res) => {
    H.typeRetire(String(req.params.id));
    req.session.flash = { text: 'Retired. Those who hold it keep it.' };
    res.redirect('/honours');
  });

  app.post('/service/:who/honour', checkCsrf, need('honours'), wrap((req, res) => {
    const who = String(req.params.who || '').toLowerCase();
    try {
      if (who === req.user.username) throw new Error('No officer honours themselves.');
      const a = H.award(who, req.body || {}, req.user);
      req.session.flash = { text: a.name + ' is given the ' + a.honourName + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/service/' + who + '#honours');
  }));

  app.post('/service/:who/honour/:id/strike', checkCsrf, need('honours'), wrap((req, res) => {
    const a = H.strike(String(req.params.id), req.user);
    req.session.flash = { text: a ? 'The ' + a.honourName + ' is withdrawn, and the record says so.' : 'Nothing to withdraw.' };
    res.redirect('/service/' + String(req.params.who || '').toLowerCase() + '#honours');
  }));
};
