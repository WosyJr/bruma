(function () {
  var TAU = Math.PI * 2;
  var SEED = 1;
  function srnd() { SEED = (SEED * 1103515245 + 12345) & 0x7fffffff; return SEED / 0x7fffffff; }
  function sr(a, b) { return a + srnd() * (b - a); }
  function off(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function lin(c, x1, y1, x2, y2, stops) {
    var g = c.createLinearGradient(x1, y1, x2, y2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function rad(c, x, y, r0, r1, stops) {
    var g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round((n >> 16 & 255) * f)), g = Math.min(255, Math.round((n >> 8 & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function path(c, pts) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) c.quadraticCurveTo(p[0], p[1], p[2], p[3]); else c.lineTo(p[0], p[1]);
    }
    c.closePath();
  }
  function limbShape(c, x1, y1, x2, y2, w1, w2, bulge, bt) {
    var ang = Math.atan2(y2 - y1, x2 - x1), px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
    bt = bt === undefined ? 0.36 : bt;
    var mx = x1 + (x2 - x1) * bt, my = y1 + (y2 - y1) * bt;
    var wf = (w1 + w2) / 2 + bulge, wb = (w1 + w2) / 2 + bulge * 0.35;
    c.beginPath();
    c.moveTo(x1 + px * w1, y1 + py * w1);
    c.quadraticCurveTo(mx + px * wf, my + py * wf, x2 + px * w2, y2 + py * w2);
    c.arc(x2, y2, w2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.quadraticCurveTo(mx - px * wb, my - py * wb, x1 - px * w1, y1 - py * w1);
    c.arc(x1, y1, w1, ang - Math.PI / 2, ang + Math.PI / 2, true);
    c.closePath();
  }
  function bootShape(c, ax, ay, dir) {
    c.beginPath();
    c.moveTo(ax - 28 * dir, ay - 16);
    c.lineTo(ax + 16 * dir, ay - 20);
    c.quadraticCurveTo(ax + 44 * dir, ay - 14, ax + 54 * dir, ay + 8);
    c.quadraticCurveTo(ax + 58 * dir, ay + 24, ax + 34 * dir, ay + 26);
    c.lineTo(ax - 26 * dir, ay + 24);
    c.quadraticCurveTo(ax - 40 * dir, ay + 16, ax - 36 * dir, ay - 2);
    c.closePath();
  }
  function plate(c, pathFn, lo, mid, hi, x1, y1, x2, y2) {
    pathFn();
    c.fillStyle = lin(c, x1, y1, x2, y2, [[0, hi], [0.28, mid], [0.72, lo], [1, lo]]);
    c.fill();
    c.save(); pathFn(); c.clip();
    c.strokeStyle = 'rgba(255,245,228,0.5)'; c.lineWidth = 3;
    c.save(); c.translate(0, 3); pathFn(); c.stroke(); c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 4;
    c.save(); c.translate(0, -5); pathFn(); c.stroke(); c.restore();
    c.restore();
    pathFn(); c.strokeStyle = 'rgba(8,8,10,0.85)'; c.lineWidth = 2.2; c.stroke();
  }
  function muscle(c, pathFn, lo, mid, hi, lx, ly) {
    pathFn(); c.fillStyle = mid; c.fill();
    c.save(); pathFn(); c.clip();
    c.fillStyle = rad(c, lx, ly, 2, 92, [[0, hi], [0.55, mid], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(lx - 130, ly - 130, 260, 260);
    c.fillStyle = lin(c, 0, ly + 20, 0, ly + 130, [[0, 'rgba(0,0,0,0)'], [1, lo]]);
    c.fillRect(-240, ly, 480, 220);
    c.restore();
    pathFn(); c.strokeStyle = 'rgba(10,6,4,0.65)'; c.lineWidth = 2; c.stroke();
  }
  function wear(c, pathFn, n) {
    c.save(); pathFn(); c.clip();
    for (var i = 0; i < n; i++) {
      c.strokeStyle = 'rgba(0,0,0,' + sr(0.1, 0.3) + ')'; c.lineWidth = sr(0.8, 2.4);
      var x = sr(-190, 190), y = sr(-560, 10), l = sr(6, 34), a = sr(-0.6, 0.6);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      if (i % 3 === 0) {
        c.strokeStyle = 'rgba(255,240,220,' + sr(0.08, 0.2) + ')';
        c.beginPath(); c.moveTo(x, y + 1.6); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l + 1.6); c.stroke();
      }
    }
    c.restore();
  }
  function furTuft(c, cx, cy, rx, ry, col, col2, n) {
    for (var i = 0; i < n; i++) {
      var a = sr(0, TAU), d = sr(0.3, 1);
      var x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      var len = sr(9, 28), ang = a + sr(-0.5, 0.5);
      c.strokeStyle = srnd() > 0.5 ? col : col2;
      c.lineWidth = sr(1.6, 4.2); c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(ang) * len * 0.6, y + Math.sin(ang) * len * 0.6 + 4, x + Math.cos(ang) * len, y + Math.sin(ang) * len + 9);
      c.stroke();
    }
  }
  function hairStrands(c, x, y, col, n, dx, dy, spread) {
    c.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      c.strokeStyle = col; c.lineWidth = sr(3, 8); c.globalAlpha = sr(0.5, 1);
      var ox = x + sr(-spread, spread), oy = y + sr(-spread * 0.5, spread * 0.5);
      c.beginPath(); c.moveTo(ox, oy);
      c.bezierCurveTo(ox + dx * 0.4, oy + dy * 0.3 + sr(-14, 14), ox + dx * 0.8, oy + dy * 0.7 + sr(-16, 16), ox + dx + sr(-16, 16), oy + dy + sr(-14, 20));
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  var METAL = { steel: ['#1A1D22', '#444B55', '#BAC4D0'], iron: ['#161A1E', '#363D46', '#8E98A4'], dark: ['#101316', '#2A3038', '#6A737E'], bronze: ['#3A2810', '#7E5E22', '#D8B86A'] };
  var BRASS_LO = '#4A3410', BRASS = '#9A742A', BRASS_HI = '#E8C977';
  var LEATH = ['#231307', '#4E2C12', '#8A5526'];
  var ELCOL = { fire: ['#FFE6A8', '#FF8A28', '#B03410'], frost: ['#F0FBFF', '#8ED8FF', '#2E74B8'], shock: ['#F8F2FF', '#B79BFF', '#5A36D8'] };

  var RACE = {
    orc: { skin: ['#2A3E1C', '#587438', '#90AC60'], tusks: true, brow: true, build: 1.08, ear: 'none' },
    nord: { skin: ['#6E4430', '#C29070', '#F0CBAA'], build: 1.04, ear: 'none' },
    imperial: { skin: ['#5E3822', '#AE7850', '#E2B98E'], build: 1, ear: 'none' },
    breton: { skin: ['#5E3822', '#B07E58', '#E6C09A'], build: 0.96, ear: 'none' },
    dunmer: { skin: ['#2E2A38', '#6A6678', '#A6A2B4'], red: true, build: 0.95, ear: 'point' },
    bosmer: { skin: ['#4E3620', '#9A7246', '#D2AE7E'], build: 0.9, ear: 'point' },
    khajiit: { skin: ['#4A3416', '#A07840', '#D8B472'], muzzle: true, build: 0.96, ear: 'cat' },
    argonian: { skin: ['#1E3A2A', '#447050', '#78A478'], snout: true, spines: true, build: 0.98, ear: 'none' }
  };

  var KITS = {
    'Ulfgar the Unbroken': { race: 'nord', armour: 'fur', metal: 'iron', cloth: ['#2A1A10', '#5E3A1E', '#9A6A34'], helm: 'none', hair: '#C9A05A', hairStyle: 'long', beard: true, cape: false, weapon: 'greatsword', build: 1.1 },
    'Ri’saad Swift-Claw': { race: 'khajiit', armour: 'leather', metal: 'dark', cloth: ['#2A1A26', '#5A3A52', '#8E6A86'], helm: 'hood', hair: '#8A6230', hairStyle: 'none', cape: false, weapon: 'daggers', offhand: 'dagger', build: 0.92 },
    'Gharol gro-Durz': { race: 'orc', armour: 'plate', metal: 'steel', cloth: ['#240907', '#5E1C15', '#A8432C'], helm: 'horned', hair: '#140C06', hairStyle: 'none', cape: true, weapon: 'hammer', build: 1.12 },
    'Lydia of Riverwood': { race: 'nord', armour: 'plate', metal: 'steel', cloth: ['#10202E', '#2A4A68', '#5A86AE'], helm: 'open', hair: '#3A2416', hairStyle: 'long', cape: false, weapon: 'sword', offhand: 'shield', build: 0.98 },
    'Brelyna Maryon': { race: 'dunmer', armour: 'robe', metal: 'dark', cloth: ['#1C1030', '#432A72', '#8A62C8'], helm: 'hood', hair: '#CFC6BA', hairStyle: 'long', cape: false, weapon: 'staff', element: 'shock', build: 0.9 },
    'Hjalti Iron-Hand': { race: 'imperial', armour: 'plate', metal: 'steel', cloth: ['#3A0C08', '#8E1C14', '#D24A2A'], helm: 'crest', hair: '#2A1A10', hairStyle: 'none', cape: true, weapon: 'sword', offhand: 'scutum', build: 1.02 },
    'Shadow-Sings': { race: 'argonian', armour: 'leather', metal: 'bronze', cloth: ['#10281E', '#2A5A42', '#58A078'], helm: 'none', hair: '#A2481E', hairStyle: 'none', cape: false, weapon: 'spear', build: 0.98 },
    'Aela the Huntress': { race: 'nord', armour: 'leather', metal: 'dark', cloth: ['#2A1208', '#6A2E14', '#A85A2A'], helm: 'none', hair: '#A2481E', hairStyle: 'long', warpaint: true, cape: false, weapon: 'bow', build: 0.96 },
    'Borkul the Beast': { race: 'orc', armour: 'fur', metal: 'iron', cloth: ['#1C2410', '#3E5020', '#6E8A3A'], helm: 'none', hair: '#140C06', hairStyle: 'braid', cape: false, weapon: 'axe', build: 1.14 },
    'Ysolda Thrice-Scarred': { race: 'nord', armour: 'mail', metal: 'iron', cloth: ['#1A2030', '#36486A', '#6A86B8'], helm: 'open', hair: '#E0C080', hairStyle: 'braid', scars: true, cape: false, weapon: 'sword', offhand: 'shield', build: 1.02 },
    'J’zargo the Ember': { race: 'khajiit', armour: 'robe', metal: 'bronze', cloth: ['#2E1206', '#7E3010', '#CC6A20'], helm: 'hood', hair: '#8A5A2A', hairStyle: 'none', cape: false, weapon: 'staff', element: 'fire', build: 0.94 },
    'Faendal Greenleaf': { race: 'bosmer', armour: 'leather', metal: 'bronze', cloth: ['#162410', '#2E4A20', '#5E8A3A'], helm: 'hood', hair: '#4E3418', hairStyle: 'long', cape: false, weapon: 'bow', build: 0.88 },
    'Sigrid Frost-Weaver': { race: 'nord', armour: 'robe', metal: 'steel', cloth: ['#0E2030', '#1E4A6E', '#4E96C8'], helm: 'none', hair: '#EDE3D4', hairStyle: 'long', cape: true, weapon: 'staff', element: 'frost', build: 0.96 }
  };

  function kitFor(f) {
    var k = KITS[f && f.name];
    if (k) return k;
    var race = (f && f.race) || 'nord';
    var arm = (f && f.arm) || 'sword';
    var wm = { greatsword: 'greatsword', hammer: 'hammer', axe: 'axe', spear: 'spear', bow: 'bow', staff: 'staff', daggers: 'daggers', sword: 'sword', knife: 'daggers', mace: 'hammer' };
    return { race: RACE[race] ? race : 'nord', armour: f && f.style === 'mage' ? 'robe' : (f && f.style === 'shield' ? 'plate' : 'leather'),
      metal: 'iron', cloth: ['#1E1208', '#4A2E18', '#8A5A2A'], helm: f && f.style === 'mage' ? 'hood' : 'open',
      hair: (f && f.hair) || '#3A2416', hairStyle: 'long', cape: false,
      weapon: wm[arm] || 'sword', offhand: f && f.style === 'shield' ? 'shield' : '', element: f && f.element, build: 1 };
  }

  function weaponArt(c, kit, pose, hand, el) {
    var M = METAL[kit.metal] || METAL.iron;
    var swing = pose.swing || 0;
    var w = kit.weapon;
    c.save(); c.translate(hand[0], hand[1]);
    if (w === 'hammer' || w === 'axe' || w === 'greatsword') c.rotate(-2.26 - swing * 1.5);
    else if (w === 'spear') c.rotate(-0.35 - swing * 0.6);
    else if (w === 'sword') c.rotate(-1.5 - swing * 1.2);
    else if (w === 'daggers') c.rotate(-0.9 - swing * 1.1);
    else if (w === 'staff') c.rotate(-1.9);
    else c.rotate(-0.1);
    if (w === 'hammer' || w === 'axe' || w === 'greatsword' || w === 'spear' || w === 'staff') {
      var len = w === 'spear' ? 300 : (w === 'staff' ? 250 : 206);
      var haft = function () { path(c, [[-40, -13], [len, -11], [len, 11], [-40, 13]]); };
      plate(c, haft, '#2A1A0A', '#5A3B18', '#9A6E34', -40, -14, -40, 14);
      c.fillStyle = LEATH[0];
      for (var gr = 0; gr < 6; gr++) { c.save(); c.translate(-32 + gr * 13, 0); c.rotate(0.22); c.fillRect(-6, -15, 11, 30); c.restore(); }
    }
    if (w === 'hammer') {
      var hp = function () { path(c, [[186, -56], [268, -62], [280, -54, 282, -30], [284, 0], [282, 30, 278, 52], [268, 62, 186, 56], [178, 30, 178, 0], [178, -30, 186, -56]]); };
      plate(c, hp, M[0], M[1], M[2], 180, -64, 270, 64);
      wear(c, hp, 14);
      c.fillStyle = BRASS;
      [[196, -38], [196, 36], [258, -40], [258, 38]].forEach(function (p) { ell(c, p[0], p[1], 7.5, 7.5); c.fill(); });
      plate(c, function () { path(c, [[178, -22], [150, -30], [138, 0], [150, 30], [178, 22]]); }, M[0], M[1], M[2], 136, -30, 180, 30);
    } else if (w === 'axe') {
      var ap = function () { path(c, [[176, -16], [214, -92], [268, -74], [276, -4], [258, 56], [206, 44], [180, 16]]); };
      plate(c, ap, M[0], M[1], M[2], 176, -92, 276, 56);
      wear(c, ap, 12);
      c.fillStyle = 'rgba(240,248,255,0.5)';
      path(c, [[216, -84], [262, -68], [268, -20], [238, -34]]); c.fill();
      plate(c, function () { path(c, [[176, -12], [136, -50], [142, 14], [178, 18]]); }, M[0], M[1], M[2], 134, -50, 180, 18);
    } else if (w === 'greatsword') {
      var gp = function () { path(c, [[40, -16], [300, -13], [334, 0], [300, 13], [40, 16]]); };
      plate(c, gp, M[0], M[1], M[2], 40, -16, 40, 16);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      path(c, [[46, -9], [300, -7], [318, 0], [300, 2], [46, 4]]); c.fill();
      plate(c, function () { path(c, [[26, -46], [46, -46], [46, 46], [26, 46]]); }, BRASS_LO, BRASS, BRASS_HI, 26, -46, 46, 46);
      c.fillStyle = BRASS; ell(c, -36, 0, 13, 13); c.fill();
    } else if (w === 'spear') {
      plate(c, function () { path(c, [[296, -10], [372, 0], [296, 10], [286, 0]]); }, M[0], M[1], M[2], 286, -10, 372, 10);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      path(c, [[300, -5], [360, 0], [300, 2]]); c.fill();
      c.fillStyle = '#A2481E'; c.fillRect(272, -16, 10, 32);
      c.strokeStyle = '#8A6230'; c.lineWidth = 3;
      for (var fe = 0; fe < 4; fe++) { c.beginPath(); c.moveTo(268, -14 + fe * 9); c.lineTo(238, -26 + fe * 13); c.stroke(); }
    } else if (w === 'staff') {
      var ec = ELCOL[el] || ELCOL.fire;
      plate(c, function () { path(c, [[236, -18], [264, -34], [286, -10], [280, 18], [252, 26], [236, 14]]); }, M[0], M[1], M[2], 236, -34, 286, 26);
      var gl = rad(c, 262, -4, 2, 54, [[0, ec[0]], [0.35, ec[1]], [1, 'rgba(0,0,0,0)']]);
      c.fillStyle = gl; ell(c, 262, -4, 54, 54); c.fill();
      c.fillStyle = ec[0]; ell(c, 262, -4, 13, 13); c.fill();
    } else if (w === 'sword') {
      var sp = function () { path(c, [[34, -13], [250, -10], [278, 0], [250, 10], [34, 13]]); };
      plate(c, sp, M[0], M[1], M[2], 34, -13, 34, 13);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      path(c, [[40, -7], [250, -5], [264, 0], [250, 1], [40, 3]]); c.fill();
      plate(c, function () { path(c, [[20, -36], [36, -36], [36, 36], [20, 36]]); }, BRASS_LO, BRASS, BRASS_HI, 20, -36, 36, 36);
      c.fillStyle = BRASS; ell(c, -32, 0, 11, 11); c.fill();
    } else if (w === 'daggers') {
      var dp = function () { path(c, [[18, -9], [132, -6], [152, 0], [132, 6], [18, 9]]); };
      plate(c, dp, M[0], M[1], M[2], 18, -9, 18, 9);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      path(c, [[22, -4], [132, -3], [142, 0], [132, 0], [22, 2]]); c.fill();
      plate(c, function () { path(c, [[6, -22], [20, -22], [20, 22], [6, 22]]); }, BRASS_LO, BRASS, BRASS_HI, 6, -22, 20, 22);
    } else if (w === 'bow') {
      var draw = pose.draw || 0;
      c.strokeStyle = '#5A3A1A'; c.lineWidth = 13; c.lineCap = 'round';
      c.beginPath(); c.arc(-10, 0, 112, -1.22, 1.22); c.stroke();
      c.strokeStyle = '#8A6230'; c.lineWidth = 5;
      c.beginPath(); c.arc(-10, 0, 112, -1.22, 1.22); c.stroke();
      c.strokeStyle = '#E8E0CE'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(28, -104); c.lineTo(-18 - draw * 76, 0); c.lineTo(28, 104); c.stroke();
      if (draw > 0.05) {
        c.strokeStyle = '#B08A4A'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(-18 - draw * 76, 0); c.lineTo(120, 0); c.stroke();
        plate(c, function () { path(c, [[118, -9], [156, 0], [118, 9]]); }, METAL.steel[0], METAL.steel[1], METAL.steel[2], 118, -9, 156, 9);
        c.fillStyle = '#E8E0CE';
        path(c, [[-14 - draw * 76, -12], [6 - draw * 76, -4], [-14 - draw * 76, -2]]); c.fill();
        path(c, [[-14 - draw * 76, 12], [6 - draw * 76, 4], [-14 - draw * 76, 2]]); c.fill();
      }
    }
    c.restore();
  }

  function offhandArt(c, kit, x, y) {
    var M = METAL[kit.metal] || METAL.iron;
    if (kit.offhand === 'scutum') {
      c.save(); c.translate(x, y); c.rotate(0.1);
      var sp = function () { path(c, [[-34, -74], [34, -74], [40, 0], [34, 74], [-34, 74], [-40, 0]]); };
      plate(c, sp, '#3A0C08', '#8E1C14', '#D2412A', -36, -74, 36, 74);
      c.save(); sp(); c.clip();
      c.fillStyle = BRASS;
      ell(c, 0, 0, 15, 15); c.fill();
      c.strokeStyle = BRASS; c.lineWidth = 5;
      c.beginPath(); c.moveTo(-26, -44); c.lineTo(26, 44); c.stroke();
      c.beginPath(); c.moveTo(26, -44); c.lineTo(-26, 44); c.stroke();
      c.strokeStyle = BRASS_HI; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-34, -70); c.lineTo(34, -70); c.stroke();
      c.beginPath(); c.moveTo(-34, 70); c.lineTo(34, 70); c.stroke();
      c.restore();
      c.restore();
    } else if (kit.offhand === 'shield') {
      c.save(); c.translate(x, y);
      plate(c, function () { ell(c, 0, 0, 62, 62); }, '#1E1206', '#4A2E18', '#8A5A2A', -62, -62, 62, 62);
      c.save(); ell(c, 0, 0, 62, 62); c.clip();
      c.strokeStyle = 'rgba(30,18,8,0.6)'; c.lineWidth = 4;
      for (var pl = -60; pl < 60; pl += 15) { c.beginPath(); c.moveTo(pl, -64); c.lineTo(pl, 64); c.stroke(); }
      c.restore();
      plate(c, function () { ell(c, 0, 0, 62, 62); }, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 0, 0, 1, 1);
      c.strokeStyle = M[1]; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 58, 0, TAU); c.stroke();
      c.strokeStyle = M[2]; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 60, -2.4, -0.4); c.stroke();
      plate(c, function () { ell(c, 0, 0, 19, 19); }, M[0], M[1], M[2], -19, -19, 19, 19);
      c.restore();
    } else if (kit.offhand === 'dagger') {
      c.save(); c.translate(x, y); c.rotate(2.3);
      var dp2 = function () { path(c, [[14, -8], [112, -5], [130, 0], [112, 5], [14, 8]]); };
      plate(c, dp2, M[0], M[1], M[2], 14, -8, 14, 8);
      plate(c, function () { path(c, [[4, -19], [16, -19], [16, 19], [4, 19]]); }, BRASS_LO, BRASS, BRASS_HI, 4, -19, 16, 19);
      c.restore();
    }
  }

  function headArt(c, kit, R) {
    var S = R.skin, hair = kit.hair || '#3A2416';
    var nose = R.snout ? 20 : R.muzzle ? 16 : 10;
    var headSh = function () {
      c.beginPath();
      c.moveTo(-42, -534);
      c.bezierCurveTo(-42, -572, -18, -586, 6, -586);
      c.bezierCurveTo(30, -586, 44, -570, 46, -548);
      c.lineTo(48, -540);
      c.bezierCurveTo(50 + nose, -536, 50 + nose * 1.1, -528, 46, -524);
      c.lineTo(44, -520);
      c.bezierCurveTo(50, -516, 48, -508, 40, -504);
      c.bezierCurveTo(36, -494, 22, -488, 6, -489);
      c.bezierCurveTo(-14, -490, -30, -500, -36, -512);
      c.bezierCurveTo(-41, -520, -42, -526, -42, -534);
      c.closePath();
    };
    if (R.spines) {
      c.fillStyle = kit.hair || '#A2481E';
      for (var sp = 0; sp < 4; sp++) {
        path(c, [[-18 - sp * 6, -572 + sp * 12], [-54 - sp * 12, -586 + sp * 16], [-20 - sp * 6, -560 + sp * 12]]); c.fill();
      }
    }
    if (R.ear === 'cat') {
      c.fillStyle = S[1];
      path(c, [[-14, -570], [-22, -616], [12, -582]]); c.fill();
      path(c, [[18, -574], [34, -618], [40, -572]]); c.fill();
      c.fillStyle = '#E8CFA0';
      path(c, [[-12, -576], [-17, -604], [6, -582]]); c.fill();
      path(c, [[22, -578], [32, -606], [35, -576]]); c.fill();
    }
    if (R.ear === 'point') {
      c.fillStyle = S[1];
      path(c, [[-34, -556], [-74, -586], [-30, -534]]); c.fill();
      c.strokeStyle = S[0]; c.lineWidth = 2; c.stroke();
    }
    if (kit.hairStyle === 'long' && kit.helm !== 'hood') {
      c.save();
      path(c, [[-40, -566], [-62, -520, -70, -462], [-76, -414], [-50, -408, -34, -440], [-22, -488, -26, -552]]);
      c.fillStyle = lin(c, -70, -560, -24, -410, [[0, hair], [1, shade(hair, 0.42)]]); c.fill();
      hairStrands(c, -34, -552, shade(hair, 0.7), 12, -46, 110, 14);
      c.restore();
    }
    muscle(c, headSh, S[0], S[1], S[2], 10, -566);
    c.save(); headSh(); c.clip();

    c.fillStyle = 'rgba(0,0,0,0.26)';
    path(c, [[-44, -548], [-6, -552, 30, -548], [48, -544], [48, -534], [30, -538, -6, -542], [-44, -538]]); c.fill();
    if (R.brow) { c.fillStyle = 'rgba(0,0,0,0.3)'; path(c, [[-40, -552], [0, -560, 44, -552], [50, -544], [44, -542, 0, -548], [-40, -544]]); c.fill(); }

    c.fillStyle = 'rgba(0,0,0,0.18)';
    path(c, [[-42, -520], [-26, -506, 2, -500], [2, -492], [-24, -498, -40, -512]]); c.fill();

    if (kit.warpaint) {
      c.fillStyle = 'rgba(126,22,16,0.66)';
      path(c, [[0, -556], [46, -552], [48, -524], [0, -526]]); c.fill();
    }

    function eye(ex, ey, s) {
      c.fillStyle = 'rgba(0,0,0,0.5)'; ell(c, ex, ey, 7.4 * s, 5.4 * s, 0.08); c.fill();
      c.fillStyle = '#F2EADC'; ell(c, ex, ey + 0.4 * s, 6.4 * s, 4.2 * s, 0.08); c.fill();
      c.fillStyle = R.red ? '#D8301E' : '#5A4428'; ell(c, ex + 1.6 * s, ey + 0.4 * s, 3.2 * s, 3.4 * s); c.fill();
      c.fillStyle = '#0A0806'; ell(c, ex + 1.8 * s, ey + 0.4 * s, 1.5 * s, 1.8 * s); c.fill();
      c.fillStyle = 'rgba(255,248,232,0.85)'; ell(c, ex + 0.8 * s, ey - 0.8 * s, 1.1 * s, 1 * s); c.fill();
      c.strokeStyle = 'rgba(16,10,6,0.75)'; c.lineWidth = 2.2 * s;
      c.beginPath(); c.moveTo(ex - 6.6 * s, ey - 1.4 * s); c.quadraticCurveTo(ex, ey - 6 * s, ex + 6.6 * s, ey - 1.8 * s); c.stroke();
    }
    eye(30, -534, 1);
    eye(-6, -530, 0.82);

    c.strokeStyle = 'rgba(14,8,4,0.4)'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(42, -528); c.quadraticCurveTo(46, -521, 38, -518); c.stroke();

    c.strokeStyle = 'rgba(20,10,6,0.55)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(14, -508); c.quadraticCurveTo(28, -505, 38, -509); c.stroke();
    c.strokeStyle = 'rgba(255,224,200,0.14)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, -511); c.quadraticCurveTo(28, -508, 38, -512); c.stroke();

    c.fillStyle = 'rgba(255,230,200,0.1)';
    ell(c, 24, -520, 15, 9, -0.2); c.fill();

    if (R.ear === 'none' || !R.ear) {
      c.fillStyle = shade(S[1], 0.86); ell(c, -26, -530, 8, 12, 0.2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2; c.beginPath(); c.arc(-26, -530, 4.5, 0.6, 4.2); c.stroke();
    }

    if (kit.scars) {
      c.strokeStyle = 'rgba(214,186,164,0.55)'; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(16, -562); c.lineTo(34, -514); c.stroke();
      c.strokeStyle = 'rgba(70,40,30,0.4)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(17.6, -562); c.lineTo(35.6, -514); c.stroke();
    }
    if (R.muzzle) {
      c.fillStyle = 'rgba(240,226,190,0.45)'; ell(c, 40, -512, 20, 13, 0.1); c.fill();
      c.fillStyle = '#2A1A10'; ell(c, 50, -516, 5, 4, 0.2); c.fill();
      c.strokeStyle = 'rgba(40,26,14,0.5)'; c.lineWidth = 1.6;
      for (var wk = 0; wk < 3; wk++) { c.beginPath(); c.moveTo(48, -512 + wk * 4); c.lineTo(76, -520 + wk * 7); c.stroke(); }
    }
    if (R.snout) {
      c.fillStyle = S[0]; ell(c, 52, -516, 18, 11, 0.15); c.fill();
      c.fillStyle = '#121A12'; ell(c, 62, -520, 4, 3); c.fill();
    }
    c.restore();
    if (R.tusks) {
      c.fillStyle = '#E8E4D2';
      path(c, [[8, -500], [4, -476], [20, -496]]); c.fill();
      path(c, [[36, -502], [42, -480], [48, -500]]); c.fill();
    }
    if (kit.hairStyle !== 'none' && kit.helm !== 'hood' && kit.helm !== 'horned' && kit.helm !== 'crest') {
      c.save();
      path(c, [[-42, -534], [-42, -578, 2, -588], [36, -582, 42, -558], [34, -564, 2, -568], [-28, -566, -36, -530]]);
      c.fillStyle = lin(c, 0, -588, 0, -534, [[0, shade(hair, 1.25)], [0.5, hair], [1, shade(hair, 0.55)]]); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.6; c.stroke();
      hairStrands(c, 4, -576, shade(hair, 0.78), 9, -34, 16, 22);
      c.restore();
    }

    if (kit.beard) {
      c.save();
      path(c, [[-28, -516], [-26, -496, -8, -482], [10, -470], [28, -480, 36, -500], [38, -512], [26, -502, 2, -500], [-16, -502]]);
      c.fillStyle = lin(c, 0, -516, 0, -470, [[0, hair], [1, shade(hair, 0.5)]]); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.6; c.stroke();
      hairStrands(c, 4, -504, shade(hair, 0.76), 8, -4, 26, 12);
      c.restore();
    }
    if (kit.hairStyle === 'braid' && kit.helm !== 'hood') {
      c.save();
      c.strokeStyle = hair; c.lineWidth = 11; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-28, -560); c.quadraticCurveTo(-66, -520, -74, -452); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
      for (var bk = 0; bk < 5; bk++) { c.beginPath(); c.moveTo(-34 - bk * 8, -552 + bk * 20); c.lineTo(-48 - bk * 7, -548 + bk * 20); c.stroke(); }
      c.restore();
    }
  }

  function helmArt(c, kit) {
    var M = METAL[kit.metal] || METAL.iron;
    if (kit.helm === 'hood') {
      var hood = function () {
        c.beginPath();
        c.moveTo(-58, -514);
        c.bezierCurveTo(-66, -578, -16, -602, 18, -598);
        c.bezierCurveTo(44, -594, 54, -576, 52, -558);
        c.lineTo(34, -562);
        c.bezierCurveTo(32, -578, 16, -586, -2, -582);
        c.bezierCurveTo(-28, -578, -38, -552, -34, -518);
        c.bezierCurveTo(-30, -492, -16, -474, -2, -466);
        c.lineTo(-22, -458);
        c.bezierCurveTo(-44, -474, -54, -492, -58, -514);
        c.closePath();
      };
      plate(c, hood, kit.cloth[0], kit.cloth[1], kit.cloth[2], -58, -600, 20, -460);
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.42)';
      path(c, [[-34, -566], [2, -578, 36, -570], [48, -560], [44, -548], [2, -558, -32, -550]]); c.fill();
      c.restore();
      return;
    }
    if (kit.helm === 'none') return;
    var helm = function () { path(c, [[-50, -534], [-46, -582, -4, -592], [38, -600, 54, -564], [58, -546, 52, -534], [20, -544, -10, -542], [-34, -540, -50, -534]]); };
    plate(c, helm, M[0], M[1], M[2], -40, -598, 40, -530);
    wear(c, helm, 10);
    c.save(); helm(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, -596); c.quadraticCurveTo(-4, -564, 0, -534); c.stroke();
    c.strokeStyle = 'rgba(226,236,248,0.3)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(5, -596); c.quadraticCurveTo(1, -564, 5, -534); c.stroke();
    c.restore();
    c.fillStyle = BRASS;
    [[-30, -552], [-6, -568], [22, -572], [44, -556]].forEach(function (p) {
      ell(c, p[0], p[1], 6, 6); c.fill();
      c.fillStyle = BRASS_HI; ell(c, p[0] - 1.8, p[1] - 2, 2.6, 2.2); c.fill(); c.fillStyle = BRASS;
    });
    if (kit.helm === 'horned') {
      [[-40, -552, -1], [48, -558, 1]].forEach(function (h) {
        c.save(); c.translate(h[0], h[1]); c.scale(h[2], 1);
        var hp = function () { path(c, [[0, 0], [30, -20, 58, -58], [76, -86, 70, -112], [62, -96, 44, -74], [24, -48, -6, -28]]); };
        plate(c, hp, '#1E1A14', '#5C5140', '#B8A88C', 0, 0, 60, -100);
        c.restore();
      });
    }
    if (kit.helm === 'crest') {
      c.fillStyle = kit.cloth[1];
      path(c, [[-18, -586], [10, -626], [40, -596], [34, -582], [6, -604], [-10, -580]]); c.fill();
      c.fillStyle = kit.cloth[2];
      path(c, [[-14, -588], [10, -620], [32, -596], [8, -608]]); c.fill();
      c.fillStyle = M[1];
      path(c, [[36, -566], [52, -556], [46, -520], [34, -530]]); c.fill();
    }
  }

  function drawFighter(c, kit, pose) {
    SEED = 20260612;
    var R = RACE[kit.race] || RACE.nord;
    var S = R.skin, M = METAL[kit.metal] || METAL.iron;
    var swing = pose.swing || 0;
    var bw = (kit.build || 1) * (R.build || 1);
    var robe = kit.armour === 'robe', furk = kit.armour === 'fur', leath = kit.armour === 'leather', mail = kit.armour === 'mail';
    var plated = kit.armour === 'plate' || mail;
    c.save();
    c.scale(bw, 1);

    if (kit.cape) {
      var lift = swing * 70, outer = -206 - swing * 54, hem = -64 - lift;
      var capePath = function () {
        c.beginPath();
        c.moveTo(-94, -478);
        c.bezierCurveTo(-164, -444, outer + 10, -348, outer, -234);
        c.bezierCurveTo(outer - 4, -176, outer + 24, hem - 46, outer + 52, hem - 6);
        var x0 = outer + 52, x1 = -40, n = 4;
        for (var i = 0; i < n; i++) {
          var xa = x0 + (x1 - x0) * (i / n), xb = x0 + (x1 - x0) * ((i + 1) / n);
          c.quadraticCurveTo((xa + xb) / 2, hem + (i % 2 ? -30 : 36), xb, hem + (i % 2 ? 2 : -8));
        }
        c.bezierCurveTo(-26, -196, -52, -342, -64, -476);
        c.closePath();
      };
      capePath();
      c.fillStyle = lin(c, outer, -400, -40, -120, [[0, kit.cloth[2]], [0.3, kit.cloth[1]], [0.78, kit.cloth[0]], [1, '#140405']]);
      c.fill();
      c.save(); capePath(); c.clip();
      for (var f = 0; f < 9; f++) {
        var t = f / 8, tx = -90 + t * 44, bx = outer + 44 + (-44 - outer - 44) * t;
        c.strokeStyle = 'rgba(14,4,4,' + sr(0.3, 0.55) + ')'; c.lineWidth = sr(12, 26);
        c.beginPath(); c.moveTo(tx, -474); c.bezierCurveTo(tx - 30 - t * 20, -360, bx - 14, -210, bx, hem + 6); c.stroke();
        c.strokeStyle = 'rgba(255,200,170,' + sr(0.08, 0.2) + ')'; c.lineWidth = sr(4, 9);
        c.beginPath(); c.moveTo(tx + 10, -474); c.bezierCurveTo(tx - 20 - t * 20, -360, bx - 4, -210, bx + 12, hem + 6); c.stroke();
      }
      c.fillStyle = lin(c, 0, hem - 90, 0, hem + 40, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]);
      c.fillRect(outer - 40, hem - 100, 300, 160);
      c.restore();
      capePath(); c.strokeStyle = 'rgba(12,4,3,0.7)'; c.lineWidth = 2.4; c.stroke();
    }

    var pauldL = function () { path(c, [[-92, -484], [-146, -470, -158, -430], [-162, -398, -138, -384], [-102, -376, -86, -404], [-82, -444, -92, -484]]); };
    if (!robe) {
      if (kit.helm === 'horned') {
        c.fillStyle = '#14171B';
        path(c, [[-142, -462], [-170, -492], [-150, -484], [-132, -470]]); c.fill();
      }
      plate(c, pauldL, M[0], M[1], M[2], -156, -484, -90, -380);
      wear(c, pauldL, 12);
      if (furk) furTuft(c, -122, -392, 38, 15, '#3A2E20', '#6A5236', 30);
    }

    var fsh = [-78, -454];
    var fel = [-158 + swing * 10, -412 - swing * 18];
    var fhd = [-150 + swing * 40, -508 - swing * 52];
    if (kit.weapon === 'bow') { fel = [-120, -452]; fhd = [-200, -452]; }
    if (kit.offhand === 'shield' || kit.offhand === 'scutum') { fel = [-130, -404]; fhd = [-166, -344]; }
    muscle(c, function () { limbShape(c, fsh[0], fsh[1], fel[0], fel[1], 26, 19, 7); }, shade(S[0], 0.85), shade(S[1], 0.86), shade(S[2], 0.88), fsh[0] - 10, fsh[1] + 10);
    if (robe) { plate(c, function () { limbShape(c, fsh[0], fsh[1], fel[0], fel[1], 33, 24, 9); }, kit.cloth[0], kit.cloth[1], kit.cloth[2], fsh[0] - 30, fsh[1] - 20, fel[0], fel[1]); }
    muscle(c, function () { limbShape(c, fel[0], fel[1], fhd[0], fhd[1], 18, 14, 5); }, shade(S[0], 0.85), shade(S[1], 0.86), shade(S[2], 0.88), fel[0] - 8, fel[1]);

    var SHIN = robe ? [kit.cloth[0], kit.cloth[1], kit.cloth[2]] : (leath || furk ? LEATH : M);
    var fhip = [-52, -284], fkn = [-158, -176], fank = [-236, -44];
    muscle(c, function () { limbShape(c, fhip[0], fhip[1], fkn[0], fkn[1], 40, 25, 11, 0.3); }, S[0], shade(S[1], 0.8), S[1], fhip[0] - 16, fhip[1]);
    if (!robe) plate(c, function () { limbShape(c, fhip[0] - 4, fhip[1] + 6, fhip[0] + (fkn[0] - fhip[0]) * 0.66, fhip[1] + (fkn[1] - fhip[1]) * 0.66, 40, 28, 10, 0.3); }, SHIN[0], SHIN[1], SHIN[2], fhip[0] - 40, fhip[1], fhip[0] + 20, fkn[1]);
    plate(c, function () { limbShape(c, fkn[0], fkn[1], fank[0], fank[1], 24, 16, 8, 0.3); }, SHIN[0], SHIN[1], SHIN[2], fkn[0] - 20, fkn[1], fkn[0] + 24, fank[1]);
    if (plated) plate(c, function () { ell(c, fkn[0] - 4, fkn[1] + 2, 23, 20, -0.5); }, M[0], M[1], M[2], fkn[0] - 20, fkn[1] - 20, fkn[0] + 18, fkn[1] + 18);
    plate(c, function () { bootShape(c, fank[0], fank[1], -1); }, '#0E0C0A', '#241D15', '#50412F', fank[0] - 40, fank[1] - 20, fank[0] + 30, fank[1] + 26);

    var hip = [44, -286], kn = [152, -186], ank = [176, -34];
    muscle(c, function () { limbShape(c, hip[0], hip[1], kn[0], kn[1], 44, 28, 14, 0.32); }, S[0], S[1], S[2], hip[0] - 14, hip[1] + 6);
    if (!robe) {
      c.save(); limbShape(c, hip[0], hip[1], kn[0], kn[1], 44, 28, 14, 0.32); c.clip();
      for (var st = 0; st < 3; st++) {
        (function (i2) {
          var ty = hip[1] + 14 + i2 * 30, tx = hip[0] + i2 * 24;
          plate(c, function () { path(c, [[tx - 50, ty + 4], [tx + 44, ty - 8], [tx + 50, ty + 14], [tx - 48, ty + 26]]); }, LEATH[0], LEATH[1], LEATH[2], tx - 50, ty - 6, tx + 50, ty + 22);
        })(st);
      }
      c.restore();
    } else {
      plate(c, function () { limbShape(c, hip[0], hip[1] + 6, hip[0] + (kn[0] - hip[0]) * 0.62, hip[1] + (kn[1] - hip[1]) * 0.62, 44, 32, 12, 0.3); }, SHIN[0], SHIN[1], SHIN[2], hip[0] - 40, hip[1], hip[0] + 30, kn[1]);
    }
    plate(c, function () { limbShape(c, kn[0], kn[1], ank[0], ank[1], 27, 18, 9, 0.3); }, SHIN[0], SHIN[1], SHIN[2], kn[0] - 26, kn[1], kn[0] + 28, ank[1]);
    if (plated) plate(c, function () { ell(c, kn[0] + 2, kn[1] - 2, 26, 23, -0.1); }, M[0], M[1], M[2], kn[0] - 22, kn[1] - 24, kn[0] + 22, kn[1] + 20);
    plate(c, function () { bootShape(c, ank[0], ank[1], 1); }, '#100D0B', '#2C241A', '#5E4C36', ank[0] - 40, ank[1] - 22, ank[0] + 40, ank[1] + 26);

    var torso = function () {
      path(c, [[-96, -452], [-70, -480, -14, -488], [40, -494, 86, -468],
        [100, -430, 96, -392], [92, -344, 80, -300], [40, -278, -8, -278],
        [-54, -280, -84, -300], [-96, -346, -100, -396]]);
    };
    muscle(c, torso, S[0], S[1], S[2], -26, -456);
    c.save(); torso(); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -456); c.quadraticCurveTo(-2, -400, -6, -300); c.stroke();
    for (var ab = 0; ab < 3; ab++) {
      c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-48, -386 + ab * 30); c.quadraticCurveTo(-6, -376 + ab * 30, 38, -388 + ab * 30); c.stroke();
    }
    c.restore();

    if (robe) {
      var rb = function () {
        path(c, [[-96, -456], [-60, -486, -6, -492], [48, -496, 90, -468],
          [108, -400, 116, -300], [128, -180, 136, -80], [40, -58, -60, -62],
          [-86, -180, -96, -300], [-104, -392, -96, -456]]);
      };
      plate(c, rb, kit.cloth[0], kit.cloth[1], kit.cloth[2], -70, -500, 70, -70);
      c.save(); rb(); c.clip();
      for (var fo = 0; fo < 8; fo++) {
        c.strokeStyle = 'rgba(0,0,0,' + sr(0.2, 0.42) + ')'; c.lineWidth = sr(8, 20);
        c.beginPath(); c.moveTo(-80 + fo * 24, -470);
        c.bezierCurveTo(-90 + fo * 26, -340, -70 + fo * 28, -200, -60 + fo * 28, -62); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = sr(3, 7);
        c.beginPath(); c.moveTo(-72 + fo * 24, -470);
        c.bezierCurveTo(-82 + fo * 26, -340, -62 + fo * 28, -200, -52 + fo * 28, -62); c.stroke();
      }
      c.restore();
      plate(c, function () { path(c, [[-96, -300], [108, -306], [112, -272], [-100, -266]]); }, LEATH[0], LEATH[1], LEATH[2], -90, -306, 90, -268);
    } else {
      var breast = function () {
        path(c, [[-92, -456], [-62, -482, -10, -488], [38, -492, 82, -466],
          [94, -436, 88, -404], [40, -390, -6, -392], [-56, -394, -86, -406]]);
      };
      if (mail) {
        plate(c, breast, M[0], M[1], M[2], -70, -492, 70, -392);
        c.save(); breast(); c.clip();
        for (var ry = -492; ry < -386; ry += 9) {
          for (var rx = -96; rx < 96; rx += 10) {
            c.fillStyle = 'rgba(0,0,0,0.3)'; ell(c, rx + (ry % 18 ? 5 : 0), ry, 4.4, 3.6); c.fill();
            c.fillStyle = 'rgba(220,230,240,0.16)'; ell(c, rx + (ry % 18 ? 5 : 0) - 1, ry - 1.2, 2.6, 2); c.fill();
          }
        }
        c.restore();
      } else if (furk) {
        plate(c, breast, LEATH[0], LEATH[1], LEATH[2], -70, -492, 70, -392);
        furTuft(c, -20, -470, 70, 20, '#3A2E20', '#7A6244', 56);
        plate(c, function () { path(c, [[-40, -470], [40, -474], [44, -396], [-44, -392]]); }, M[0], M[1], M[2], -40, -474, 44, -392);
      } else if (leath) {
        plate(c, breast, LEATH[0], LEATH[1], LEATH[2], -70, -492, 70, -392);
        c.save(); breast(); c.clip();
        c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 4;
        for (var ls = 0; ls < 4; ls++) { c.beginPath(); c.moveTo(-90, -470 + ls * 24); c.quadraticCurveTo(0, -458 + ls * 24, 90, -472 + ls * 24); c.stroke(); }
        c.restore();
        plate(c, function () { path(c, [[-44, -486], [-24, -488], [20, -392], [0, -390]]); }, LEATH[0], LEATH[1], LEATH[2], -44, -488, 20, -390);
      } else {
        plate(c, breast, M[0], M[1], M[2], -70, -492, 70, -392);
        wear(c, breast, 18);
        c.save(); breast(); c.clip();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(-4, -488); c.lineTo(-4, -392); c.stroke();
        c.fillStyle = BRASS;
        [[-62, -462], [-62, -422], [60, -462], [60, -422]].forEach(function (p) { ell(c, p[0], p[1], 8, 8); c.fill(); });
        c.restore();
      }
      var lames = plated ? 4 : 2, lstep = plated ? 26 : 34;
      for (var lame = 0; lame < lames; lame++) {
        (function (i2) {
          var yy = -368 + i2 * lstep;
          plate(c, function () { path(c, [[-88 + i2 * 3, yy], [84 - i2 * 3, yy - 4], [88 - i2 * 4, yy + 20], [-90 + i2 * 4, yy + 24]]); },
            plated ? M[0] : LEATH[0], plated ? M[1] : LEATH[1], plated ? M[2] : LEATH[2], -80, yy - 6, 80, yy + 22);
        })(lame);
      }
      plate(c, function () { path(c, [[-96, -300], [94, -306], [98, -272], [-100, -266]]); }, LEATH[0], LEATH[1], LEATH[2], -90, -306, 90, -268);
      plate(c, function () { path(c, [[-24, -306], [26, -310], [30, -262], [-28, -258]]); }, BRASS_LO, BRASS, BRASS_HI, -22, -310, 28, -258);
    }

    var pauldR = function () { path(c, [[88, -480], [142, -466, 156, -424], [160, -390, 134, -376], [96, -368, 80, -398], [76, -438, 88, -480]]); };
    if (!robe) {
      plate(c, pauldR, M[0], M[1], M[2], 76, -482, 158, -372);
      wear(c, pauldR, 12);
      if (furk) furTuft(c, 118, -396, 40, 16, '#3A2E20', '#6A5236', 32);
    }

    var sh = [96, -448];
    var el = [168 - swing * 44, -502 - swing * 10];
    var hd = [120 - swing * 96, -586 - swing * 40];
    var w = kit.weapon;
    if (w === 'bow') { el = [160, -452]; hd = [214, -452]; }
    else if (w === 'spear') { el = [152, -444]; hd = [196, -404 - swing * 40]; }
    else if (w === 'staff') { el = [150, -470]; hd = [176, -414]; }
    else if (w === 'sword' || w === 'daggers') { el = [164 - swing * 30, -488 - swing * 16]; hd = [150 - swing * 70, -556 - swing * 30]; }
    muscle(c, function () { limbShape(c, sh[0], sh[1], el[0], el[1], 31, 23, 10); }, S[0], S[1], S[2], sh[0] + 6, sh[1] + 4);
    if (robe) plate(c, function () { limbShape(c, sh[0], sh[1], el[0], el[1], 38, 26, 11); }, kit.cloth[0], kit.cloth[1], kit.cloth[2], sh[0] - 20, sh[1] - 30, el[0], el[1]);
    muscle(c, function () { limbShape(c, el[0], el[1], hd[0], hd[1], 22, 16, 7); }, S[0], S[1], S[2], el[0] + 4, el[1]);
    if (!robe) {
      plate(c, function () { limbShape(c, el[0] + (hd[0] - el[0]) * 0.2, el[1] + (hd[1] - el[1]) * 0.2, el[0] + (hd[0] - el[0]) * 0.74, el[1] + (hd[1] - el[1]) * 0.74, 21, 18, 4); },
        M[0], M[1], M[2], el[0] - 20, el[1], el[0] + 30, hd[1]);
    }

    weaponArt(c, kit, pose, hd, kit.element);
    if (kit.offhand) offhandArt(c, kit, fhd[0] - 10, fhd[1] + 10);

    function gauntlet(x, y, r, rot, bare) {
      var G = bare ? [S[0], S[1], S[2]] : (robe || leath || furk ? LEATH : M);
      c.save(); c.translate(x, y); c.rotate(rot || 0);
      plate(c, function () { path(c, [[-r * 0.9, -r * 0.6], [-r * 0.2, -r * 1.05, r * 0.5, -r * 0.82], [r * 1.05, -r * 0.5, r * 1.0, r * 0.1], [r * 0.9, r * 0.72, r * 0.1, r * 0.8], [-r * 0.7, r * 0.86, -r * 0.92, r * 0.2]]); },
        G[0], G[1], G[2], -r, -r, r, r);
      c.save();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = r * 0.14; c.lineCap = 'round';
      for (var fi = 0; fi < 3; fi++) {
        var fy = -r * 0.42 + fi * r * 0.44;
        c.beginPath(); c.moveTo(r * 0.14, fy); c.quadraticCurveTo(r * 0.78, fy - r * 0.08, r * 0.86, fy + r * 0.2); c.stroke();
      }
      c.strokeStyle = 'rgba(255,238,214,0.2)'; c.lineWidth = r * 0.1;
      for (var fj = 0; fj < 3; fj++) {
        var fy2 = -r * 0.48 + fj * r * 0.44;
        c.beginPath(); c.moveTo(r * 0.18, fy2); c.quadraticCurveTo(r * 0.76, fy2 - r * 0.08, r * 0.84, fy2 + r * 0.18); c.stroke();
      }
      c.restore();
      c.restore();
    }
    var bareHand = robe || leath;
    gauntlet(hd[0], hd[1], 22, Math.atan2(hd[1] - el[1], hd[0] - el[0]), bareHand);
    if (!kit.offhand) gauntlet(fhd[0], fhd[1], 19, Math.atan2(fhd[1] - fel[1], fhd[0] - fel[0]), bareHand);

    muscle(c, function () { limbShape(c, -2, -466, 2, -524, 29, 26, 4); }, shade(S[0], 0.8), shade(S[1], 0.82), shade(S[2], 0.85), -16, -496);
    c.save();
    c.translate(2, -18);
    headArt(c, kit, R);
    helmArt(c, kit);
    c.restore();
    c.restore();
  }

  var CACHE = {};
  var SS = 1, FW = 760, FH = 760, OX = 380, OY = 700, STEPS = 6;

  function frame(kit, pose, key) {
    var k = key + '|' + Math.round((pose.swing || 0) * STEPS);
    if (CACHE[k]) return CACHE[k];
    var w = FW * SS, h = FH * SS;
    var l = off(w, h), c = l.getContext('2d');
    c.save(); c.translate(OX * SS, OY * SS); c.scale(SS, SS); c.scale(0.86, 0.86);
    drawFighter(c, kit, pose);
    c.restore();
    var sil = off(w, h), sx = sil.getContext('2d');
    sx.drawImage(l, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#000'; sx.fillRect(0, 0, w, h);
    var grime = off(w, h), gx = grime.getContext('2d');
    gx.fillStyle = '#FFFFFF'; gx.fillRect(0, 0, w, h);
    SEED = 777;
    for (var gi = 0; gi < 60; gi++) {
      var gxp = sr(w * 0.2, w * 0.8), gyp = sr(h * 0.35, h - 40 * SS), gr = sr(18, 80) * SS * 0.5;
      var dk = Math.round(sr(80, 160));
      var gg = gx.createRadialGradient(gxp, gyp, 2, gxp, gyp, gr);
      gg.addColorStop(0, 'rgba(' + dk + ',' + Math.round(dk * 0.88) + ',' + Math.round(dk * 0.7) + ',' + sr(0.2, 0.5) + ')');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      gx.fillStyle = gg; gx.beginPath(); gx.arc(gxp, gyp, gr, 0, TAU); gx.fill();
    }
    var gf = gx.createLinearGradient(0, h - 330 * SS, 0, h - 20 * SS);
    gf.addColorStop(0, 'rgba(255,255,255,0)'); gf.addColorStop(1, 'rgba(124,102,70,0.5)');
    gx.fillStyle = gf; gx.fillRect(0, h - 340 * SS, w, 330 * SS);
    gx.globalCompositeOperation = 'destination-in'; gx.drawImage(sil, 0, 0);
    var out = off(w, h), ox2 = out.getContext('2d');
    ox2.drawImage(l, 0, 0);
    ox2.globalCompositeOperation = 'multiply';
    ox2.drawImage(grime, 0, 0);
    ox2.globalCompositeOperation = 'destination-in';
    ox2.drawImage(sil, 0, 0);
    function rimLayer(dx, dy, col) {
      var r = off(w, h), rx = r.getContext('2d');
      rx.drawImage(sil, 0, 0);
      rx.globalCompositeOperation = 'source-in';
      rx.fillStyle = col; rx.fillRect(0, 0, w, h);
      rx.globalCompositeOperation = 'destination-out';
      rx.drawImage(sil, dx, dy);
      return r;
    }
    ox2.globalCompositeOperation = 'lighter';
    ox2.save(); ox2.filter = 'blur(' + 1.6 * SS + 'px)';
    ox2.drawImage(rimLayer(-5 * SS, 1, 'rgba(255,150,56,0.85)'), 0, 0);
    ox2.drawImage(rimLayer(5 * SS, 1, 'rgba(255,186,110,0.5)'), 0, 0);
    ox2.restore();
    var res = { img: out, w: w, h: h, ox: OX * SS, oy: OY * SS, ss: SS };
    var keys = Object.keys(CACHE);
    if (keys.length > 160) delete CACHE[keys[0]];
    CACHE[k] = res;
    return res;
  }

  var QUEUE = [], warming = false;
  function pump() {
    if (!QUEUE.length) { warming = false; return; }
    warming = true;
    var job = QUEUE.shift();
    try { frame(job.kit, { swing: job.sw }, job.key); } catch (e) { }
    (window.requestIdleCallback || window.requestAnimationFrame)(pump);
  }
  function warm(f, key) {
    var kit = kitFor(f);
    for (var i = 0; i <= STEPS; i++) {
      var sw = i / STEPS;
      if (CACHE[key + '|' + i]) continue;
      QUEUE.push({ kit: kit, sw: sw, key: key });
    }
    if (!warming) (window.requestIdleCallback || window.requestAnimationFrame)(pump);
  }

  window.InnFighters = { kitFor: kitFor, KITS: KITS, RACE: RACE, drawFighter: drawFighter, frame: frame, warm: warm, STEPS: STEPS, clear: function () { CACHE = {}; QUEUE = []; } };
})();
