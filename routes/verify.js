const V = require('../lib/views');
const Papers = require('../lib/papers');

const esc = V.esc;

module.exports = function (app) {

  app.get('/verify', (req, res) => {
    const code = String(req.query.code || '').trim();
    const r = code ? Papers.verify(code) : null;

    const found = r && r.found ? `<section class="card checkcard ${r.inForce ? 'good' : 'bad'}">
  <div class="checkmark">${r.inForce ? '✓' : '!'}</div>
  <div class="eyebrow" style="margin-bottom:6px">${esc(r.kindName)}</div>
  <h3 style="margin:0 0 6px">${esc(r.title)}</h3>
  <p class="lede" style="margin:0 0 14px">This paper stands upon the rolls of the County of Bruma.</p>
  <div style="margin-bottom:16px"><span class="stampword ${r.inForce ? 'in' : 'out'}">${esc(String(r.standing || '').toUpperCase())}</span></div>
  <div class="rows tight">
    ${r.party ? `<div class="row"><div class="main">Whose paper</div><div class="side">${esc(r.party)}</div></div>` : ''}
    ${r.no ? `<div class="row"><div class="main">Number</div><div class="side">${esc(r.no)}</div></div>` : ''}
    ${r.issuedBy ? `<div class="row"><div class="main">Given by</div><div class="side">${esc(r.issuedBy)}</div></div>` : ''}
    <div class="row"><div class="main">Given on</div><div class="side">${esc(V.when(r.issuedAt))}</div></div>
    ${(r.facts || []).map(f => `<div class="row"><div class="main">${esc(f[0])}</div><div class="side">${esc(f[1])}</div></div>`).join('')}
  </div>
  ${r.inForce ? '' : '<p class="hint" style="margin-top:14px">Note the standing above. A paper upon the rolls is not always still in force.</p>'}
  ${r.gone ? '<p class="hint" style="margin-top:14px">The record behind this paper has been struck from the rolls. The number was genuine when it was given.</p>' : ''}
</section>` : '';

    const missing = r && !r.found ? `<section class="card checkcard bad">
  <div class="checkmark">✗</div>
  <h3 style="margin:0 0 6px">No paper of the County answers to <b>${esc(r.code)}</b></h3>
  <p class="lede" style="margin:0">Check the number again. If it is right as it is written, that paper did not come
  from Bruma, and it should be brought to the Great Hall.</p>
</section>` : '';

    const body = `
<section class="card">
  <h2>Check a paper</h2>
  <p class="lede">Every writ, deed, licence, judgment and demand the County gives out carries a check-number at the foot
  of it. Give that number here and you will be told whether the paper is genuine, whose it is, and what standing it has
  today. Nothing else about it is shown.</p>
  <form method="get" action="/verify" class="checkform">
    <input type="search" name="code" value="${esc(code)}" placeholder="e.g. K6D-PQR" aria-label="Check-number"
      maxlength="12" autocomplete="off" required>
    <button class="btn" type="submit">Check it</button>
  </form>
</section>

${found}${missing}

<section class="card">
  <h3 style="margin-top:0">What a genuine paper looks like</h3>
  <ul class="plain">
    <li>It carries the arms of Bruma at the head and the seal of Castle Bruma at the foot.</li>
    <li>It names who gave it and on what day.</li>
    <li>It carries a check-number in two parts, like <b>K6D-PQR</b>, printed at the very bottom.</li>
    <li>That number can be checked here by anyone, at any hour, without entering the hall.</li>
  </ul>
  <p class="hint">A paper with no number, or with a number that does not answer here, is worth nothing. Officers of the
  County are not obliged to honour it, and the court will want to know where it came from.</p>
</section>`;
    res.page({ title: 'Check a paper', body, active: 'verify' });
  });
};
