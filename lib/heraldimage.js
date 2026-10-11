const path = require('path');
const fs = require('fs');

let C = null;
function canvasLib() {
  if (C !== null) return C;
  try {
    C = require('@napi-rs/canvas');
    const dir = path.join(__dirname, '..', 'vendor', 'fonts');
    C.GlobalFonts.registerFromPath(path.join(dir, 'Alegreya.ttf'), 'HeraldSerif');
    C.GlobalFonts.registerFromPath(path.join(dir, 'Alegreya-Italic.ttf'), 'HeraldSerif');
    C.GlobalFonts.registerFromPath(path.join(dir, 'AlegreyaSans-Regular.ttf'), 'HeraldSans');
    C.GlobalFonts.registerFromPath(path.join(dir, 'AlegreyaSans-Bold.ttf'), 'HeraldSans');
  } catch (e) { C = false; }
  return C;
}
function available() { return !!canvasLib(); }

const n = v => Number(v || 0).toLocaleString('en-US');

function stories(h) {
  const out = [];
  if (h.lead) out.push({ head: h.lead.title, body: String(h.lead.body || '').split(/\n{2,}/).slice(0, 3).join('\n'), by: h.lead.by, lead: true });
  out.push({ head: h.watch.hours ? 'The watch stood ' + h.watch.hours + ' hours' : 'The walls stood unwatched', body: h.watch.hours ? h.watch.guards + (h.watch.guards === 1 ? ' guard' : ' guards') + ' kept the walls this week.' + (h.watch.top ? ' ' + h.watch.top.name + ' stood the most, ' + h.watch.top.hours + ' hours.' : '') + (h.watch.gaps ? ' ' + h.watch.gaps + (h.watch.gaps === 1 ? ' post went' : ' posts went') + ' a night without a hand.' : '') : 'Nobody clocked on this week.', big: h.watch.hours ? String(h.watch.hours) : '' });
  if (h.goal) out.push({ head: h.goal.met ? h.goal.title + ': it is built' : h.goal.title, body: h.goal.met ? 'The town handed over every septim it needed. It stands now for anyone to see.' : n(h.goal.paid) + ' of ' + n(h.goal.target) + ' septims are handed over.' + (h.goal.top ? ' ' + h.goal.top.name + ' leads with ' + n(h.goal.top.amount) + '.' : '') });
  if (h.ghost && h.ghost.seen) out.push({ head: 'Pale figure on the Jerall road', body: 'The ghost was seen ' + h.ghost.seen + (h.ghost.seen === 1 ? ' time' : ' times') + (h.ghost.caught.length ? '. ' + h.ghost.caught[0] + ' reached it first' + (h.ghost.caught.length > 1 ? ', and ' + (h.ghost.caught.length - 1) + ' more caught it after.' : '.') : ' and nobody caught it.') });
  if (h.ballad && h.ballad.length) out.push({ head: h.balladTitle, body: h.ballad.slice(0, 4).map(l => l.line).join(' / ') + (h.ballad.length > 4 ? ' …' : ''), italic: true });
  if (h.word && h.word.length) out.push({ head: h.word.length === 1 ? 'The County gave its word' : 'The County gave its word ' + h.word.length + ' times', body: h.word.slice(0, 3).map(p => p.title).join('; ') + '.' });
  if (h.petitions) out.push({ head: 'Petitions at the hall', body: h.petitions + (h.petitions === 1 ? ' petition was' : ' petitions were') + ' laid before the County, and ' + h.answered + ' answered.' });
  if (h.reports) out.push({ head: 'Reports of the Watch', body: 'The watch filed ' + h.reports + (h.reports === 1 ? ' report.' : ' reports.') });
  out.push({ head: 'The Pale Pass', body: 'As the week ends the pass is ' + String(h.pass || '').toLowerCase() + '.' });
  const bits = [];
  if (h.cards && h.cards.hands) { bits.push('At twenty-one, ' + h.cards.hands + (h.cards.hands === 1 ? ' hand was' : ' hands were') + ' played and Old Brannoc won ' + h.cards.dealer + '.'); if (h.cards.top && h.cards.top[0]) bits.push(h.cards.top[0].name + ' beat him the most, ' + h.cards.top[0].wins + (h.cards.top[0].wins === 1 ? ' time.' : ' times.')); }
  if (h.bones && h.bones.games) { bits.push('At bones, ' + h.bones.games + (h.bones.games === 1 ? ' game' : ' games') + '.'); if (h.bones.top && h.bones.top[0]) bits.push(h.bones.top[0].name + ' won the most, ' + h.bones.top[0].wins + '.'); }
  if (bits.length) out.push({ head: 'At the Jerall View', body: bits.join(' ') });
  if (h.honours && h.honours.length) out.push({ head: h.honours.length === 1 ? 'Honoured by the County' : h.honours.length + ' honours given', body: h.honours.slice(0, 4).map(a => a.name + ', the ' + a.honourName + ': ' + a.citation).join(' ') });
  if (h.cheers && h.cheers.length) out.push({ head: 'Cups raised', body: h.cheers.slice(0, 3).map(c => c.count + (c.count === 1 ? ' cup' : ' cups') + ' for ' + c.name).join('; ') + '.' });
  if (h.face) out.push({ head: 'A face of Bruma', body: h.face.name + (h.face.role ? ', ' + h.face.role : '') + (h.face.line ? '. “' + h.face.line + '”' : ''), face: h.face });
  return out;
}

function wrap(ctx, text, width) {
  const lines = [];
  String(text).split('\n').forEach(par => {
    let line = '';
    par.split(/\s+/).filter(Boolean).forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > width && line) { lines.push(line); line = w; } else line = t;
    });
    lines.push(line);
  });
  return lines;
}

function render(h, opts) {
  const K = canvasLib();
  if (!K) return null;
  const o = opts || {};
  const W = 1200, PAD = 48, COLS = 3, GAP = 34;
  const colW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const list = stories(h);
  const probe = K.createCanvas(10, 10).getContext('2d');
  const BODY = '19px HeraldSerif', HEAD = '600 24px HeraldSerif', ITAL = 'italic 19px HeraldSerif';
  const LH = 27, HLH = 30;
  let faceImg = null;
  if (list.some(s => s.face)) {
    try { const T = require('./town'); const f = T.faceFile(list.find(s => s.face).face.id); if (f && fs.existsSync(f)) { faceImg = new K.Image(); faceImg.src = fs.readFileSync(f); } } catch (e) { faceImg = null; }
  }
  const blocks = list.map(s => {
    probe.font = HEAD;
    const headLines = wrap(probe, s.head, colW);
    probe.font = s.italic ? ITAL : BODY;
    const bodyW = s.face && faceImg ? colW - 86 : colW;
    const bodyLines = wrap(probe, s.body, bodyW);
    let hgt = headLines.length * HLH + 6 + bodyLines.length * LH + 22;
    if (s.big) hgt += 70;
    if (s.by) hgt += LH;
    if (s.face && faceImg) hgt = Math.max(hgt, headLines.length * HLH + 6 + 96 + 22);
    return { s, headLines, bodyLines, hgt };
  });
  const cols = Array.from({ length: COLS }, () => ({ h: 0, items: [] }));
  const total = blocks.reduce((a, b) => a + b.hgt, 0);
  const target = total / COLS;
  let ci = 0;
  blocks.forEach((b, i) => {
    if (ci < COLS - 1 && cols[ci].h > 0 && cols[ci].h + b.hgt / 2 > target && blocks.length - i >= 1) ci++;
    cols[ci].items.push(b); cols[ci].h += b.hgt;
  });
  const TOP = 190;
  const H = TOP + Math.max(...cols.map(c => c.h)) + 56;
  const cv = K.createCanvas(W, H);
  const x = cv.getContext('2d');
  x.fillStyle = '#EFE3C8'; x.fillRect(0, 0, W, H);
  const grain = x.createLinearGradient(0, 0, W, H); grain.addColorStop(0, 'rgba(120,80,30,0.06)'); grain.addColorStop(1, 'rgba(60,40,10,0.10)');
  x.fillStyle = grain; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1F1409'; x.textAlign = 'center'; x.font = '700 72px HeraldSerif';
  x.fillText('The Jerall Herald', W / 2, 92);
  x.font = '600 14px HeraldSans'; x.fillStyle = '#6E4A1C';
  const dateline = ((h.past ? 'WEEK OF ' : 'THIS WEEK SO FAR  ·  ') + String(o.dateline || h.week)).toUpperCase() + '  ·  PRICE ONE COPPER';
  x.fillText(dateline.split('').join(String.fromCharCode(8202)), W / 2, 126);
  x.textAlign = 'left';
  x.fillStyle = '#2A1D12'; x.fillRect(PAD, 148, W - PAD * 2, 2); x.fillRect(PAD, 153, W - PAD * 2, 1);
  cols.forEach((c, i) => {
    const cx = PAD + i * (colW + GAP);
    if (i) { x.fillStyle = 'rgba(42,29,18,0.35)'; x.fillRect(cx - GAP / 2, TOP - 20, 1, H - TOP - 30); }
    let cy = TOP;
    c.items.forEach(b => {
      const s = b.s;
      x.fillStyle = '#1F1409'; x.font = HEAD;
      b.headLines.forEach(l => { x.fillText(l, cx, cy); cy += HLH; });
      cy += 6;
      if (s.big) {
        x.strokeStyle = '#2A1D12'; x.lineWidth = 1.5; x.strokeRect(cx + 0.5, cy - 4, colW - 1, 58);
        x.font = '600 38px HeraldSans'; x.textAlign = 'center'; x.fillStyle = '#1F1409'; x.fillText(s.big, cx + colW / 2, cy + 38); x.textAlign = 'left';
        cy += 70;
      }
      let bx = cx;
      if (s.face && faceImg) {
        try { x.drawImage(faceImg, cx, cy - 16, 72, 96); } catch (e) {}
        bx = cx + 86;
      }
      x.font = s.italic ? ITAL : BODY; x.fillStyle = '#3A2A1C';
      b.bodyLines.forEach(l => { x.fillText(l, bx, cy); cy += LH; });
      if (s.by) { x.font = ITAL; x.fillStyle = '#6E4A1C'; x.fillText('— ' + s.by, bx, cy); cy += LH; }
      if (s.face && faceImg) cy = Math.max(cy, cy - b.bodyLines.length * LH + 96);
      cy += 22;
    });
  });
  x.font = 'italic 14px HeraldSerif'; x.fillStyle = '#8A5A1E'; x.textAlign = 'center';
  x.fillText('County of Bruma  ·  Hospitality to the stranger, iron to the raider', W / 2, H - 22);
  return cv.toBuffer('image/png');
}

module.exports = { available, stories, render };
