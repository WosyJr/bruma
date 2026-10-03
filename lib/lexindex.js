const Lex = require('./lexfmt');
const A = require('./archive');

let cache = null;
let cacheAt = 0;
const LIFE = 30000;

const BANDS = [
  { id: 'low', name: 'Low', tag: '' },
  { id: 'medium', name: 'Medium', tag: 'gold' },
  { id: 'high', name: 'High', tag: 'out' }
];
const BAND_BY_ID = Object.fromEntries(BANDS.map(b => [b.id, b]));

function fineOf(text) {
  const t = String(text || '');
  const range = /(\d[\d,]*)\s*[–—-]\s*(\d[\d,]*)\s*Septims/i.exec(t);
  if (range) {
    return { min: num(range[1]), max: num(range[2]), about: false };
  }
  const cap = /(?:≤|up to|no more than|at most)\s*(\d[\d,]*)\s*Septims/i.exec(t);
  if (cap) return { min: 0, max: num(cap[1]), about: false };
  const over = /(?:>|\\>|over|more than|above)\s*(\d[\d,]*)\s*Septims/i.exec(t);
  if (over) return { min: num(over[1]), max: 0, about: true };
  const flat = /(\d[\d,]*)\s*Septims/i.exec(t);
  if (flat) return { min: num(flat[1]), max: num(flat[1]), about: false };
  return null;
}

function num(s) { return Math.round(Number(String(s || '').replace(/[^0-9]/g, '')) || 0); }

function fineText(f) {
  if (!f) return '';
  if (f.about) return 'over ' + f.min.toLocaleString('en-GB');
  if (f.max && f.min && f.max !== f.min) return f.min.toLocaleString('en-GB') + '–' + f.max.toLocaleString('en-GB');
  const n = f.max || f.min;
  return n ? n.toLocaleString('en-GB') : '';
}

function build() {
  const out = [];
  const docs = A.all().filter(d => d.lex);
  docs.sort((a, b) => a.no - b.no);

  docs.forEach(d => {
    const titleName = String(d.title || '').replace(/^Lex Brumae\s*—\s*/, '');
    const roman = (/TITLE\s+([IVXL]+)/i.exec(d.title || '') || [])[1] || '';
    Lex.parse(d.text).forEach(b => {
      if (b.kind !== 'article') return;
      const def = b.fields.find(f => /definition/i.test(f.label));
      const pen = b.fields.find(f => /penalt/i.test(f.label));
      const bands = [];
      if (pen && pen.tiers && pen.tiers.length) {
        pen.tiers.forEach(t => {
          if (!BAND_BY_ID[t.tier]) return;
          bands.push({ band: t.tier, text: t.text, fine: fineOf(t.text) });
        });
      }
      out.push({
        no: String(b.no),
        n: Number(b.no),
        name: b.name,
        definition: def ? def.text : '',
        penalty: pen && !bands.length ? pen.text : '',
        bands,
        fine: pen && !bands.length ? fineOf(pen.text) : null,
        docId: d.id,
        title: titleName,
        roman
      });
    });
  });

  out.sort((a, b) => a.n - b.n);
  return out;
}

function all() {
  if (cache && Date.now() - cacheAt < LIFE) return cache;
  cache = build();
  cacheAt = Date.now();
  return cache;
}

function forget() { cache = null; cacheAt = 0; }

function get(no) {
  const key = String(no || '').trim();
  if (!key) return null;
  return all().find(a => a.no === key) || null;
}

function search(q) {
  const needle = String(q || '').trim().toLowerCase();
  const rows = all();
  if (!needle) return rows;
  return rows.filter(a => (a.no + ' ' + a.name + ' ' + a.definition + ' ' + a.title).toLowerCase().includes(needle));
}

function byTitle() {
  const map = new Map();
  all().forEach(a => {
    const k = a.docId;
    const row = map.get(k) || { docId: k, title: a.title, roman: a.roman, rows: [] };
    row.rows.push(a);
    map.set(k, row);
  });
  return Array.from(map.values());
}

function label(a) {
  if (!a) return '';
  return 'Article ' + a.no + ' · ' + a.name;
}

function bandOf(a, band) {
  if (!a) return null;
  const b = (a.bands || []).find(x => x.band === band);
  if (b) return b;
  if (a.penalty) return { band: '', text: a.penalty, fine: a.fine };
  return null;
}

function suggestFine(a, band) {
  const b = bandOf(a, band);
  if (!b || !b.fine) return 0;
  return b.fine.max || b.fine.min || 0;
}

module.exports = { BANDS, BAND_BY_ID, all, forget, get, search, byTitle, label, bandOf, suggestFine, fineText, fineOf };
