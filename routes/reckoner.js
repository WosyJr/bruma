const V = require('../lib/views');
const O = require('../lib/offices');
const Lex = require('../lib/lexindex');
const Ct = require('../lib/court');

const esc = V.esc;
const DOT = ' · ';

function bandRow(a, b, band, q) {
  const meta = Lex.BAND_BY_ID[b.band] || { name: 'Penalty', tag: '' };
  const on = band === b.band;
  const style = 'text-decoration:none;color:inherit' + (on ? ';border-color:var(--accent);background:#241A10' : '');
  const href = '/reckoner?a=' + encodeURIComponent(a.no) + '&band=' + encodeURIComponent(b.band) + (q ? '&q=' + encodeURIComponent(q) : '');
  const coin = b.fine ? ' <b style="color:var(--eyebrow)">(' + esc(Lex.fineText(b.fine)) + ' septims)</b>' : '';
  return '<a class="lextier" style="' + style + '" href="' + esc(href) + '">'
    + '<span class="tag ' + meta.tag + '">' + esc(meta.name) + '</span>'
    + '<span>' + esc(b.text) + coin + '</span></a>';
}

function articleCard(a) {
  let out = '<article class="lexart" style="margin:0"><div class="lexhead">'
    + '<span class="lexno">Article ' + esc(a.no) + '</span>'
    + '<h4>' + esc(a.name) + '</h4>'
    + '<a class="lexlink" style="opacity:1" href="/laws/' + esc(a.docId) + '#art-' + esc(a.no) + '" title="Read it in the code">&#167;</a>'
    + '</div>';
  if (a.definition) out += '<div class="lexfield"><div class="lexlabel">Definition</div><p>' + esc(a.definition) + '</p></div>';
  return out;
}

module.exports = function (app, { needAny }) {

  app.get('/reckoner', needAny('courtsit', 'courtsee', 'watchlog'), (req, res) => {
    const q = String(req.query.q || '');
    const pick = String(req.query.a || '');
    const band = String(req.query.band || '');
    const rows = Lex.search(q);
    const a = pick ? Lex.get(pick) : null;
    const chosen = a ? Lex.bandOf(a, band) : null;
    const laid = a ? Ct.underArticle(a.no) : [];

    let main = '';

    if (a) {
      let card = articleCard(a);
      if (a.bands.length) {
        card += '<div class="lexfield"><div class="lexlabel">Choose the band</div><div class="lextiers">'
          + a.bands.map(b => bandRow(a, b, band, q)).join('') + '</div></div>';
      } else if (a.penalty) {
        card += '<div class="lexfield"><div class="lexlabel">Penalty</div><p>' + esc(a.penalty) + '</p></div>';
      }
      card += '</article>';
      main += '<section class="card">' + card + '</section>';
    }

    if (a && chosen) {
      const meta = Lex.BAND_BY_ID[chosen.band] || { name: 'As set down' };
      main += `<section class="card" id="reckoning">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap">
    <div class="eyebrow">What it carries</div>
    <button type="button" class="btn ghost small" data-nopicture
      data-picture="#reckoning" data-picture-name="article-${esc(a.no)}-${esc(chosen.band || 'penalty')}">Save as picture</button>
  </div>
  <h3 style="margin:10px 0 2px">Article ${esc(a.no)}${DOT}${esc(a.name)}</h3>
  <p class="hint" style="margin:0 0 16px">${esc(String(a.title).replace(/^TITLE\s+[IVXL]+\s*·\s*/i, ''))}</p>
  <div class="grid three">
    <div class="stat"><div class="k">Band</div>
      <div class="v" style="font-size:24px;font-family:var(--serif)">${esc(meta.name)}</div>
      <div class="n">as the code sets it down</div></div>
    <div class="stat"><div class="k">Fine</div>
      <div class="v">${chosen.fine ? esc(Lex.fineText(chosen.fine)) : '—'}</div>
      <div class="n">${chosen.fine ? 'septims' : 'no coin named'}</div></div>
    <div class="stat"><div class="k">Laid under it</div>
      <div class="v">${laid.length}</div>
      <div class="n">${laid.length === 1 ? 'matter so far' : 'matters so far'}</div></div>
  </div>
  <h3>In full</h3>
  <p class="lexprose" style="margin-bottom:0">${esc(chosen.text)}</p>
</section>`;
      if (O.can(req.user, 'courtsit')) {
        main += '<section class="card"><p class="lede" style="margin:0">This is a reckoning, not a sentence. '
          + 'The bench may depart from it, and should say in the judgment why.</p>'
          + '<p style="margin:14px 0 0"><a class="btn ghost" href="/court">Take it to the court roll</a></p></section>';
      }
    }

    if (a && laid.length) {
      main += '<section class="card"><h3 style="margin-top:0">Matters laid under Article ' + esc(a.no) + '</h3>'
        + V.table([
            { head: 'No.', num: true, cell: m => m.no },
            { head: 'Matter', cell: m => '<a href="/court/' + esc(m.id) + '">' + esc(m.title) + '</a>' },
            { head: 'Standing', cell: m => { const st = Ct.STAGE_BY_ID[m.stage] || Ct.STAGES[0]; return '<span class="tag ' + st.tag + '">' + esc(st.name) + '</span>'; } },
            { head: 'Fine', num: true, cell: m => m.fine ? V.septims(m.fine) : '—' }
          ], laid)
        + '</section>';
    }

    if (!a) {
      const head = q
        ? rows.length + (rows.length === 1 ? ' article matches' : ' articles match')
        : 'Every article of the code';
      let list = '';
      if (rows.length) {
        list = '<div class="rows">' + rows.slice(0, 120).map(x => {
          const href = '/reckoner?a=' + encodeURIComponent(x.no) + (q ? '&q=' + encodeURIComponent(q) : '');
          const gist = x.definition.length > 120 ? x.definition.slice(0, 120) + '…' : x.definition;
          const side = x.bands.length ? x.bands.length + ' bands' : (x.penalty || '').slice(0, 24);
          return '<div class="row"><div class="main">'
            + '<a href="' + esc(href) + '" style="font-family:var(--serif);font-size:18px">Article ' + esc(x.no) + DOT + esc(x.name) + '</a>'
            + '<div class="hint">' + esc(gist) + '</div></div>'
            + '<div class="side">' + esc(side) + '</div></div>';
        }).join('') + '</div>';
      } else {
        list = V.empty('Nothing in the code matches that.');
      }
      main += '<section class="card"><h3 style="margin-top:0">' + esc(head) + '</h3>' + list + '</section>';
    }

    const titles = Lex.byTitle().map(t => {
      const name = String(t.title).replace(/^TITLE\s+[IVXL]+\s*·\s*/i, '');
      const span = t.rows.length + ' articles' + DOT + t.rows[0].no + '–' + t.rows[t.rows.length - 1].no;
      return '<li style="padding:7px 0"><a href="/laws/' + esc(t.docId) + '" style="font-size:15px">' + esc(name) + '</a>'
        + '<div class="hint" style="margin:2px 0 0">' + esc(span) + '</div></li>';
    }).join('');

    const body = `
<section class="card">
  <h2>The penalty reckoner</h2>
  <p class="lede">Find the article, pick the band, and the code tells you what it carries. Use it so two officers
  reckon the same offence the same way.</p>
  <form method="get" action="/reckoner" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="text" name="q" value="${esc(q)}" placeholder="Search by offence, number or wording" style="max-width:360px">
    <button class="btn ghost" type="submit">Search</button>
    ${(q || pick) ? '<a class="btn ghost small" href="/reckoner">Start again</a>' : ''}
  </form>
</section>

<div class="lexcols">
  <div>${main}</div>
  <aside>
    <section class="card tight lextoc">
      <div class="eyebrow" style="margin-bottom:10px">By title</div>
      <ul class="plain" style="margin:0">${titles}</ul>
    </section>
  </aside>
</div>`;

    res.page({ title: 'The penalty reckoner', body, active: 'reckoner', wide: true });
  });
};
