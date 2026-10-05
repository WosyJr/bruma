const crypto = require('crypto');
const S = require('./store');

const FILE = 'papers.json';
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY349';

const esc = s => String(s === undefined || s === null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const KINDS = {
  commitment: { name: 'A Writ of Commitment', noun: 'writ of commitment', standing: 'held' },
  release: { name: 'A Warrant of Release', noun: 'warrant of release', standing: 'released' },
  judgment: { name: 'A Judgment of the Court', noun: 'judgment', standing: 'given' },
  deed: { name: 'A Deed of the County', noun: 'deed', standing: 'in force' },
  demand: { name: 'A Demand of Tax', noun: 'demand', standing: 'owing' },
  charter: { name: 'A Charter of the County', noun: 'charter', standing: 'in force' },
  licence: { name: 'A Licence to Trade', noun: 'licence', standing: 'current' },
  service: { name: 'A Certificate of Service', noun: 'certificate', standing: 'true' },
  report: { name: 'A Report of the Watch', noun: 'report', standing: 'filed' },
  petition: { name: 'An Answer of the County', noun: 'answer', standing: 'answered' },
  proclamation: { name: 'A Proclamation of the County', noun: 'proclamation', standing: 'standing' }
};

const RESOLVERS = {};
const MODULES = ['gaol', 'court', 'property', 'taxes', 'licences', 'service', 'petitions', 'archive', 'deeds', 'reports'];

function resolve(module, fn) { RESOLVERS[module] = fn; }

function loadAll() {
  MODULES.forEach(m => { try { require('./' + m); } catch (_) {} });
}

function mint() {
  const pick = n => Array.from({ length: n }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  return pick(3) + '-' + pick(3);
}

function rows() { return S.read(FILE, []); }

function register(entry) {
  const list = rows();
  let code = String(entry.code || '').trim().toUpperCase();
  if (!code || list.some(p => p.code === code)) {
    do { code = mint(); } while (list.some(p => p.code === code));
  }
  const row = {
    code,
    kind: KINDS[entry.kind] ? entry.kind : 'proclamation',
    module: String(entry.module || '').slice(0, 40),
    ref: String(entry.ref || '').slice(0, 60),
    no: String(entry.no === undefined ? '' : entry.no).slice(0, 40),
    title: String(entry.title || '').trim().slice(0, 200),
    party: String(entry.party || '').trim().slice(0, 140),
    link: String(entry.link || '').slice(0, 200),
    issuedBy: String(entry.issuedBy || '').trim().slice(0, 120),
    issuedAt: entry.issuedAt || new Date().toISOString(),
    standing: String(entry.standing || (KINDS[entry.kind] || {}).standing || '').slice(0, 60),
    facts: Array.isArray(entry.facts) ? entry.facts.slice(0, 10).map(f => [String(f[0] || '').slice(0, 60), String(f[1] || '').slice(0, 160)]) : []
  };
  list.unshift(row);
  S.write(FILE, list.slice(0, 20000));
  return row;
}

function get(code) {
  const key = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!key) return null;
  return rows().find(p => p.code === key || p.code.replace('-', '') === key.replace('-', '')) || null;
}

function forRef(module, ref) {
  return rows().find(p => p.module === String(module || '') && p.ref === String(ref || '')) || null;
}

function codeFor(entry) {
  const found = forRef(entry.module, entry.ref);
  if (found) return found;
  return register(entry);
}

function drop(module, ref) {
  S.write(FILE, rows().filter(p => !(p.module === String(module || '') && p.ref === String(ref || ''))));
}

function verify(code) {
  const row = get(code);
  if (!row) return { found: false, code: String(code || '').trim().toUpperCase() };
  loadAll();
  let live = null;
  try { if (RESOLVERS[row.module]) live = RESOLVERS[row.module](row.ref); } catch (_) { live = null; }
  const kind = KINDS[row.kind] || KINDS.proclamation;
  return {
    found: true,
    code: row.code,
    kindName: kind.name,
    title: (live && live.title) || row.title,
    party: (live && live.party) || row.party,
    no: row.no,
    issuedBy: row.issuedBy,
    issuedAt: row.issuedAt,
    standing: (live && live.standing) || row.standing,
    inForce: live ? !!live.inForce : true,
    gone: !!(live && live.gone),
    facts: (live && live.facts) || row.facts,
    link: row.link
  };
}

const STYLE = `
:root{--ground:#17110C;--card:#1C150E;--edge:#3A2A1C;--edge2:#5A4228;--ink:#EDE3D4;
  --bright:#F7EEDC;--muted:#C8B79C;--faint:#B5A287;--eyebrow:#C9A06A;--accent:#E09A3E;
  --link:#E8B870;--deep:#0E0A07;--serif:Alegreya,Georgia,serif;--sans:'Alegreya Sans',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:16.5px;line-height:1.62;
  padding:0 0 60px}
.bar{display:flex;gap:9px;justify-content:center;padding:16px;background:var(--deep);
  border-bottom:1px solid var(--edge);position:sticky;top:0;z-index:9}
.bar button,.bar a{font-family:var(--sans);font-size:14.5px;padding:8px 16px;border-radius:3px;cursor:pointer;
  background:transparent;border:1px solid var(--edge2);color:var(--ink);text-decoration:none;line-height:1.3}
.bar .go{background:var(--accent);border-color:var(--accent);color:#1A1109;font-weight:500}
.bar button:hover,.bar a:hover{border-color:var(--eyebrow);color:var(--bright)}
.sheet{max-width:780px;margin:30px auto;background:var(--card);
  border:1px solid var(--edge2);padding:4px}
.inner{border:1px solid var(--edge);padding:44px 54px 38px}
.crown{text-align:center;padding-bottom:18px;border-bottom:1px solid var(--edge)}
.crown img{width:70px;height:auto;display:block;margin:0 auto 12px;opacity:.95}
.house{font-family:var(--serif);font-size:25px;color:var(--bright);letter-spacing:.02em;margin:0}
.seat{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--eyebrow);margin-top:7px}
.kind{text-align:center;font-size:11.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--eyebrow);
  margin:26px 0 8px}
h1{font-family:var(--serif);font-weight:500;font-size:40px;line-height:1.1;text-align:center;
  color:var(--bright);margin:0 0 8px}
.sub{text-align:center;font-family:var(--serif);font-style:italic;font-size:17.5px;color:var(--muted);margin:0 0 26px}
.lead{font-size:17px;margin:0 0 22px}
.lead b{color:var(--bright);font-weight:600}
.band{border:1px solid var(--edge2);background:linear-gradient(180deg,rgba(224,154,62,.09),transparent);
  text-align:center;padding:18px 20px;margin:24px 0}
.band .bk{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--eyebrow)}
.band .bv{font-family:var(--serif);font-size:38px;color:var(--accent);line-height:1.15;margin-top:4px}
.band .bn{font-size:13.5px;color:var(--faint);font-style:italic;margin-top:5px}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}
.three .box{border:1px solid var(--edge);padding:12px 13px;text-align:center}
.three .bk{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--eyebrow)}
.three .bv{font-family:var(--serif);font-size:19px;color:var(--bright);margin-top:5px;line-height:1.25}
.facts{border:1px solid var(--edge);margin:22px 0;padding:4px 16px}
.facts dl{display:grid;grid-template-columns:auto 1fr;gap:0 22px;margin:0}
.facts dt{font-size:10.5px;letter-spacing:.17em;text-transform:uppercase;color:var(--eyebrow);
  padding:10px 0;border-bottom:1px solid rgba(58,42,28,.6);align-self:center}
.facts dd{margin:0;padding:10px 0;border-bottom:1px solid rgba(58,42,28,.6);color:var(--bright);
  font-family:var(--serif);font-size:17px}
.facts dl > dt:nth-last-of-type(1),.facts dl > dd:nth-last-of-type(1){border-bottom:none}
.part{margin:26px 0 0}
.part h2{font-size:11.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--eyebrow);
  text-align:center;font-weight:400;margin:0 0 14px;padding-top:20px;border-top:1px solid var(--edge)}
.part p{margin:0 0 13px;white-space:pre-wrap}
.warn{border:1px solid rgba(185,69,47,.5);border-left:3px solid #B9452F;background:rgba(185,69,47,.08);
  padding:14px 17px;margin:22px 0}
.warn p{margin:0 0 10px}
.warn p:last-child{margin:0}
.warn b{color:#E8B5AC}
.closing{text-align:center;margin:30px 0 8px}
.closing .big{font-family:var(--serif);font-size:25px;color:var(--accent)}
.closing .motto{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--eyebrow);margin-top:7px}
.sign{margin-top:34px;padding-top:22px;border-top:1px solid var(--edge);text-align:center}
.sign .by{font-family:var(--serif);font-style:italic;color:var(--muted);font-size:15.5px}
.sign .nm{font-family:var(--serif);font-size:24px;color:var(--bright);margin-top:12px;
  display:inline-block;padding:0 36px 7px;border-bottom:1px solid var(--edge2)}
.sign .of{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--eyebrow);margin-top:9px}
.check{margin-top:26px;padding-top:16px;border-top:1px dashed var(--edge2);text-align:center}
.check .cn{font-size:13px;letter-spacing:.06em;color:var(--muted)}
.check .cn b{font-family:var(--sans);font-size:19px;letter-spacing:.26em;color:var(--bright);margin-left:7px}
.check .cw{font-size:12.5px;font-style:italic;color:var(--faint);margin-top:9px;line-height:1.5}
@media (max-width:720px){.inner{padding:28px 22px 26px}h1{font-size:30px}.three{grid-template-columns:1fr}
  .facts dl{grid-template-columns:1fr}.facts dt{padding-bottom:0;border-bottom:none}.sheet{margin:16px 10px}}
@media print{
  body{background:#fff;color:#1A1409;padding:0}
  .bar{display:none}
  .sheet{margin:0;border-color:#6B5636;background:#FBF6EA;max-width:none}
  .inner{border-color:#BCA47E}
  .house,h1,.facts dd,.three .bv,.sign .nm{color:#15100A}
  .sub,.muted,.facts dt,.seat,.kind,.part h2,.sign .of,.closing .motto,.check .cn{color:#7A5F32}
  .band{background:#F2E7CF;border-color:#BCA47E}
  .band .bv,.closing .big{color:#8A5A14}
  .warn{background:#F6E6E0;border-color:#9B4A34}
  .warn b{color:#7A2A17}
  .check .cn b{color:#15100A}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

function facts(pairs) {
  const rowsOut = (pairs || []).filter(p => p && p[1]);
  if (!rowsOut.length) return '';
  return `<div class="facts"><dl>${rowsOut.map(p =>
    `<dt>${esc(p[0])}</dt><dd>${esc(p[1])}</dd>`).join('')}</dl></div>`;
}

function three(boxes) {
  const list = (boxes || []).filter(b => b && b[1]);
  if (!list.length) return '';
  return `<div class="three">${list.map(b =>
    `<div class="box"><div class="bk">${esc(b[0])}</div><div class="bv">${esc(b[1])}</div></div>`).join('')}</div>`;
}

function band(label, value, note) {
  if (!value) return '';
  return `<div class="band"><div class="bk">${esc(label)}</div><div class="bv">${esc(value)}</div>${
    note ? `<div class="bn">${esc(note)}</div>` : ''}</div>`;
}

function part(head, text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return `<div class="part"><h2>${esc(head)}</h2>${
    t.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
}

function doc(o) {
  const kind = KINDS[o.kind] || KINDS.proclamation;
  const name = (o.fileName || o.title || 'bruma-paper').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(o.title || kind.name)} · County of Bruma</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;1,400&family=Alegreya+Sans:wght@400;500;700&display=swap">
<link rel="icon" type="image/png" href="/bruma-seal.png">
<style>${STYLE}</style></head>
<body>
<div class="bar" data-nopicture>
  <a href="${esc(o.back || '/')}">← Back</a>
  <button class="go" type="button" onclick="window.print()">Print</button>
  <button type="button" id="pic">Save as picture</button>
</div>
<div class="sheet" id="sheet"><div class="inner">
  <div class="crown">
    <img src="/bruma-seal.png" alt="">
    <p class="house">The County of Bruma</p>
    <div class="seat">The Jerall Mountains · Imperial Province of Cyrodiil</div>
  </div>
  <div class="kind">${esc(kind.name)}</div>
  <h1>${esc(o.title || '')}</h1>
  ${o.sub ? `<p class="sub">${esc(o.sub)}</p>` : ''}
  ${o.lead ? `<p class="lead">${o.lead}</p>` : ''}
  ${o.body || ''}
  ${o.closing ? `<div class="closing"><div class="big">${esc(o.closing)}</div>${
    o.motto ? `<div class="motto">${esc(o.motto)}</div>` : ''}</div>` : ''}
  <div class="sign">
    <div class="by">${esc(o.signLine || 'Given under the hand of the County')}</div>
    <div class="nm">${esc(o.signedBy || 'The County of Bruma')}</div>
    <div class="of">${esc(o.signedOf || 'Under the seal of Castle Bruma')}</div>
  </div>
  <div class="check">
    <div class="cn">Under the hand and number<b>${esc(o.code || '')}</b></div>
    <div class="cw">Entered so upon the rolls of the County. Anyone doubting this paper may bring it to the Great Hall,
    or ask after this number at <b style="font-family:inherit;font-size:inherit;letter-spacing:0;color:inherit">/verify</b>,
    and be told whether it is genuine and what standing it has.</div>
  </div>
</div></div>
<script>
(function(){
  var b=document.getElementById('pic');
  if(!b)return;
  b.addEventListener('click',function(){
    var was=b.textContent;b.textContent='Drawing…';b.disabled=true;
    function go(h){
      return h(document.getElementById('sheet'),{backgroundColor:'#17110C',
        scale:Math.min(2,window.devicePixelRatio||1)*1.5,logging:false,useCORS:true,
        onclone:function(d){
          Array.prototype.forEach.call(d.querySelectorAll('*'),function(el){
            var cs=d.defaultView.getComputedStyle(el);
            if(/gradient/i.test(cs.backgroundImage))el.style.backgroundImage='none';
            if(cs.boxShadow&&cs.boxShadow!=='none')el.style.boxShadow='none';
            el.style.animation='none';el.style.transition='none';
          });
          Array.prototype.forEach.call(d.querySelectorAll('[data-nopicture]'),function(el){el.remove();});
        }});
    }
    function run(){
      go(window.html2canvas).then(function(c){return new Promise(function(ok){c.toBlob(ok,'image/png');});})
      .then(function(bl){
        var u=URL.createObjectURL(bl),a=document.createElement('a');
        a.href=u;a.download='${name}.png';document.body.appendChild(a);a.click();a.remove();
        setTimeout(function(){URL.revokeObjectURL(u);},4000);
        b.textContent='Saved';setTimeout(function(){b.textContent=was;b.disabled=false;},1600);
      }).catch(function(){b.textContent='It would not draw';setTimeout(function(){b.textContent=was;b.disabled=false;},2400);});
    }
    if(window.html2canvas)return run();
    var s=document.createElement('script');s.src='/html2canvas.min.js?v=1';
    s.onload=run;s.onerror=function(){b.textContent='It would not draw';b.disabled=false;};
    document.head.appendChild(s);
  });
})();
</script>
</body></html>`;
}

module.exports = { KINDS, esc, mint, rows, register, get, forRef, codeFor, drop, verify, resolve,
  doc, facts, three, band, part };
