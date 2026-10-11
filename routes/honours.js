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
${may ? `<div class="grid two" style="margin-top:22px;align-items:start">
<section class="card">
  <h3 style="margin-top:0">Give an honour</h3>
  <form method="post" action="/honours/give" class="stack">${V.hidden(req.session.csrf)}
    <label>To whom<select name="who" required><option value="">Choose an officer</option>${people.map(p => `<option value="${esc(p.username)}">${esc(p.name)} · ${esc(p.officeName || '')}</option>`).join('')}</select></label>
    <label>The honour<select name="honour" required data-hpick>${H.types().map(t => `<option value="${esc(t.id)}" data-colors="${esc(t.colors.join(','))}">${esc(t.name)}</option>`).join('')}</select></label>
    <div class="hribline"><span class="rib big" data-hprev></span><span class="hint" data-hnote></span></div>
    <label>The citation<textarea name="citation" rows="2" maxlength="300" required placeholder="Held the north gate alone through the night of the raid."></textarea></label>
    <button class="btn go" type="submit">Give it</button>
  </form>
</section>
<section class="card">
  <h3 style="margin-top:0">Add an honour to the roll</h3>
  <form method="post" action="/honours/type" class="stack">${V.hidden(req.session.csrf)}
    <label>Its name<select name="pick" data-pick>${H.reserve().map(r => `<option value="${esc(r.name)}" data-colors="${esc(r.colors.join(','))}" data-note="${esc(r.note)}">${esc(r.name)}</option>`).join('')}<option value="">Something else…</option></select></label>
    <label data-own hidden>Call it<input name="name" maxlength="60" placeholder="e.g. The Grey Fox"></label>
    <label>What it is given for<input name="note" maxlength="200" data-note></label>
    <div class="hcolors">${['c1', 'c2', 'c3'].map((c, i) => `<label>${['Edges', 'Centre', 'Edges again (or leave)'][i]}<select name="${c}" data-ribpick>${i === 2 ? '<option value="">Same as the edges</option>' : ''}${PALETTE.map(p => `<option value="${p}" style="background:${p}">${p}</option>`).join('')}</select></label>`).join('')}
      <span class="rib big" data-ribprev></span></div>
    <button class="btn go" type="submit">Add it to the roll</button>
  </form>
</section>
</div>
<script>(function(){
var pick=document.querySelector('[data-pick]'),own=document.querySelector('[data-own]'),note=document.querySelector('input[data-note]'),s=document.querySelectorAll('[data-ribpick]'),p=document.querySelector('[data-ribprev]');
function grad(c){var n=c.length;return 'linear-gradient(90deg,'+c.map(function(x,i){return x+' '+(i/n*100)+'% '+((i+1)/n*100)+'%'}).join(',')+')';}
function draw(){var c=[].map.call(s,function(x){return x.value}).filter(Boolean);if(c.length===2)c.push(c[0]);p.style.background=grad(c);}
function set(cols){[].forEach.call(s,function(x,i){var v=cols[i]||'';if(i===2&&cols.length>=3&&cols[2]===cols[0])v=cols[2];x.value=[].some.call(x.options,function(o){return o.value===v})?v:x.options[0].value;});draw();}
function fromPick(){var o=pick.options[pick.selectedIndex];var custom=!o.value;own.hidden=!custom;own.querySelector('input').required=custom;if(!custom){set(o.getAttribute('data-colors').split(','));note.value=o.getAttribute('data-note')||'';}}
pick.addEventListener('change',fromPick);[].forEach.call(s,function(x){x.addEventListener('change',draw)});fromPick();
var hp=document.querySelector('[data-hpick]'),hv=document.querySelector('[data-hprev]'),hn=document.querySelector('[data-hnote]');var notes=${JSON.stringify(Object.fromEntries(H.types().map(t => [t.id, t.note || ''])))};
function hdraw(){var o=hp.options[hp.selectedIndex];hv.style.background=grad(o.getAttribute('data-colors').split(','));hn.textContent=notes[o.value]||'';}
hp.addEventListener('change',hdraw);hdraw();
})();</script>` : ''}`;
    res.page({ title: 'The Roll of Honour', body, wide: true });
  });

  app.post('/honours/give', checkCsrf, need('honours'), wrap((req, res) => {
    const who = String((req.body || {}).who || '').toLowerCase();
    try {
      if (!who) throw new Error('Choose whom it is given to.');
      const a = H.award(who, req.body || {}, req.user);
      req.session.flash = { text: a.name + ' is given the ' + a.honourName + '.' };
    } catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/honours');
  }));

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
