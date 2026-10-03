const esc = s => String(s === undefined || s === null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const strip = s => String(s || '')
  .replace(/\*\*/g, '')
  .replace(/^\**\s*/, '')
  .replace(/\s*\**$/, '')
  .replace(/\s+/g, ' ')
  .trim();

const TIER = { low: 'Low', medium: 'Medium', high: 'High' };
const TIER_TAG = { low: '', medium: 'gold', high: 'out' };

function parse(text) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let article = null;
  let field = null;

  const closeArticle = () => {
    if (article) blocks.push(article);
    article = null;
    field = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;

    const sec = /^#*\s*Section\s+([IVXL0-9]+)\s*\|\s*(.+)$/i.exec(strip(line));
    if (sec) {
      closeArticle();
      blocks.push({ kind: 'section', no: sec[1], name: strip(sec[2]) });
      continue;
    }

    const art = /^#*\s*Article\s+(\d+)\s*\|\s*(.+)$/i.exec(strip(line));
    if (art) {
      closeArticle();
      article = { kind: 'article', no: art[1], name: strip(art[2]), fields: [], notes: [] };
      continue;
    }

    const sub = /^\s{2,}\*\s*(.+)$/.exec(line);
    const bullet = /^\s*\*\s*(.+)$/.exec(line);

    if (sub && field && field.tiers) {
      const body = strip(sub[1]);
      const m = /^([A-Za-z][A-Za-z ]{0,20}?)\s*:\s*(.*)$/.exec(body);
      if (m && TIER[m[1].trim().toLowerCase()]) {
        field.tiers.push({ tier: m[1].trim().toLowerCase(), text: strip(m[2]) });
      } else {
        field.tiers.push({ tier: '', text: body });
      }
      continue;
    }

    if (bullet) {
      const body = strip(bullet[1]);
      const m = /^([A-Za-z][A-Za-z –-]{0,28}?)\s*:\s*(.*)$/.exec(body);
      if (m) {
        const label = m[1].trim();
        const rest = strip(m[2]);
        field = { label, text: rest, tiers: rest ? null : [] };
        if (article) article.fields.push(field);
        else blocks.push({ kind: 'line', label, text: rest });
      } else {
        if (article) article.notes.push(body);
        else blocks.push({ kind: 'prose', text: body });
        field = null;
      }
      continue;
    }

    const body = strip(line);
    if (!body) continue;
    if (article) article.notes.push(body);
    else blocks.push({ kind: 'prose', text: body });
    field = null;
  }

  closeArticle();
  return blocks;
}

function fieldHtml(f) {
  const label = `<div class="lexlabel">${esc(f.label)}</div>`;
  if (f.tiers && f.tiers.length) {
    return `<div class="lexfield">${label}
      <div class="lextiers">${f.tiers.map(t => `<div class="lextier">
        <span class="tag ${TIER_TAG[t.tier] || ''}">${esc(TIER[t.tier] || 'Penalty')}</span>
        <span>${esc(t.text)}</span>
      </div>`).join('')}</div>
    </div>`;
  }
  return `<div class="lexfield">${label}<p>${esc(f.text)}</p></div>`;
}

function render(text) {
  const blocks = parse(text);
  if (!blocks.length) return `<div style="white-space:pre-wrap;line-height:1.75">${esc(text)}</div>`;

  return blocks.map(b => {
    if (b.kind === 'section') {
      return `<div class="lexsection"><span class="eyebrow">Section ${esc(b.no)}</span><h3>${esc(b.name)}</h3></div>`;
    }
    if (b.kind === 'prose') return `<p class="lexprose">${esc(b.text)}</p>`;
    if (b.kind === 'line') return `<p class="lexprose"><b>${esc(b.label)}:</b> ${esc(b.text)}</p>`;
    return `<article class="lexart" id="art-${esc(b.no)}">
      <div class="lexhead">
        <span class="lexno">Article ${esc(b.no)}</span>
        <h4>${esc(b.name)}</h4>
        <a class="lexlink" href="#art-${esc(b.no)}" aria-label="Link to Article ${esc(b.no)}">&#167;</a>
      </div>
      ${b.fields.map(fieldHtml).join('')}
      ${b.notes.map(n => `<p class="lexnote">${esc(n)}</p>`).join('')}
    </article>`;
  }).join('');
}

function articles(text) {
  return parse(text).filter(b => b.kind === 'article').map(b => ({ no: b.no, name: b.name }));
}

function summary(text) {
  const arts = articles(text);
  if (!arts.length) return '';
  const first = Number(arts[0].no);
  const last = Number(arts[arts.length - 1].no);
  if (arts.length === 1) return 'Article ' + first;
  return arts.length + ' articles · ' + first + '–' + last;
}

module.exports = { parse, render, articles, summary, esc };
