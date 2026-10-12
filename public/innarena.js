(function () {
  var W = 880, H = 400, GROUND = 336, BASE = [300, 580], SC = 1.45;
  var EL = { fire: ['#FFE29A', '#FF8A2A', '#C2381A'], frost: ['#F2FBFF', '#8FD3FF', '#3A86C8'], shock: ['#FBF6FF', '#B79BFF', '#6A4AE0'] };
  var SKIN = { nord: '#E8C6A2', imperial: '#D9AE86', orc: '#7F9B58', khajiit: '#C99A55', dunmer: '#8B93A3', argonian: '#5F8C6B', bosmer: '#C4A174', breton: '#E5C9AE' };
  var STEEL = '#C9D0D8', STEEL2 = '#8A929C', IRON = '#5A5F66', LEATHER = '#5A3A22', DARK = '#140D08', GOLD = '#D9B25A';
  var ease = function (k) { return k < 0 ? 0 : (k > 1 ? 1 : k * k * (3 - 2 * k)); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var seeded = function (n) { var x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
  var fired = {};

  function setup(cv, w, h) {
    if (cv.__ready) return cv.__ctx;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.__ready = true; cv.__ctx = ctx;
    return ctx;
  }

  function limb(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function shade(hex, k) {
    var n = parseInt(String(hex || '#777777').slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.round(clamp(k < 0 ? c * (1 + k) : c + (255 - c) * k, 0, 255)); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  function crowd(ctx, t, cheer) {
    var cols = ['#1C130C', '#22170F', '#2B1D14', '#33241A'];
    for (var row = 0; row < 4; row++) {
      for (var i = 0; i < 36; i++) {
        var x = 8 + i * 25 + (row % 2) * 12, side = x < W / 2 ? 0 : 1;
        var c = cheer[side] || 0;
        var jump = c > 0 ? Math.abs(Math.sin(t / 110 + i * 1.3 + row)) * 9 * c : 0;
        var y = 64 + row * 24 - Math.sin(i / 35 * Math.PI) * 14 + Math.sin(t / 420 + i * 1.7 + row) * 1.5 - jump;
        ctx.fillStyle = cols[row];
        ctx.beginPath(); ctx.arc(x, y, 8.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 10, y + 7, 20, 26);
        if (c > 0.3 && (i + row) % 3 === 0) { limb(ctx, x - 6, y + 10, x - 12, y - 10 - jump * 0.4, 4, cols[row]); limb(ctx, x + 6, y + 10, x + 12, y - 10 - jump * 0.4, 4, cols[row]); }
      }
    }
  }

  function backdrop(ctx, t, cheer, flags) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120C08'); g.addColorStop(0.4, '#26190F'); g.addColorStop(1, '#100A06');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    crowd(ctx, t, cheer);
    ctx.fillStyle = '#3A2A1C'; ctx.fillRect(0, 168, W, 16);
    ctx.fillStyle = '#4A3624'; for (var p = 0; p < W; p += 44) ctx.fillRect(p, 156, 10, 30);
    [[220, flags[0]], [W - 220, flags[1]]].forEach(function (b, k) {
      var x = b[0], sway = Math.sin(t / 700 + k * 2) * 3;
      poly(ctx, [x - 18, 0, x + 18, 0, x + 18 + sway, 92, x + sway, 78, x - 18 + sway, 92], b[1], null);
      disc(ctx, x + sway * 0.5, 40, 9, 'rgba(255,226,154,.55)');
    });
    [70, W - 70].forEach(function (tx, k) {
      ctx.fillStyle = '#3A2A1C'; ctx.fillRect(tx - 4, 178, 8, 76);
      var fl = 1 + Math.sin(t / 90 + k * 3) * 0.12 + Math.sin(t / 37 + k) * 0.06;
      var rg = ctx.createRadialGradient(tx, 168, 2, tx, 168, 130 * fl);
      rg.addColorStop(0, 'rgba(255,170,80,.38)'); rg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = rg; ctx.fillRect(tx - 140, 30, 280, 280);
      ctx.fillStyle = '#FFB347'; ctx.beginPath(); ctx.ellipse(tx, 168, 7 * fl, 16 * fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFE29A'; ctx.beginPath(); ctx.ellipse(tx, 172, 3.5 * fl, 8 * fl, 0, 0, Math.PI * 2); ctx.fill();
    });
    var fg = ctx.createRadialGradient(W / 2, GROUND + 10, 30, W / 2, GROUND + 10, 480);
    fg.addColorStop(0, '#8A6C48'); fg.addColorStop(1, '#2E2216');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 18, 440, 74, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 18, 310, 48, 0, 0, Math.PI * 2); ctx.stroke();
    for (var s = 0; s < 40; s++) disc(ctx, 80 + seeded(s) * 720, GROUND - 10 + seeded(s + 9) * 70, 1 + seeded(s + 3) * 1.5, 'rgba(40,28,18,.5)');
  }

  function head(ctx, f, hx, hy, dir, glow) {
    var race = f.race || 'nord', skin = SKIN[race] || SKIN.nord, col = f.colour || '#7A5A3A', st = f.style;
    var helm = st === 'great' || st === 'shield';
    ctx.lineWidth = 1.6; ctx.strokeStyle = DARK;
    if (!helm && st !== 'mage' && race !== 'argonian' && race !== 'khajiit') {
      ctx.fillStyle = f.hair || '#3A2A1C'; ctx.beginPath(); ctx.ellipse(hx - dir * 6, hy + 4, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (race === 'khajiit') {
      poly(ctx, [hx - 12, hy - 6, hx - 9, hy - 22, hx - 2, hy - 12], skin, DARK, 1.5);
      poly(ctx, [hx + 12, hy - 6, hx + 9, hy - 22, hx + 2, hy - 12], skin, DARK, 1.5);
    }
    if (race === 'argonian') {
      for (var h = 0; h < 4; h++) limb(ctx, hx - dir * 6, hy - 10 + h * 5, hx - dir * (20 + h * 2), hy - 18 + h * 7, 3, f.hair || '#A2481E');
    }
    if (race === 'dunmer' || race === 'bosmer') {
      poly(ctx, [hx - dir * 9, hy - 2, hx - dir * 20, hy - 10, hx - dir * 10, hy + 4], skin, DARK, 1.2);
    }
    ctx.fillStyle = skin; ctx.beginPath();
    if (race === 'argonian') ctx.ellipse(hx + dir * 3, hy, 13, 13, 0, 0, Math.PI * 2);
    else ctx.arc(hx, hy, 13.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (race === 'argonian' || race === 'khajiit') {
      ctx.fillStyle = race === 'khajiit' ? '#E8CFA0' : shade(skin, 0.15);
      ctx.beginPath(); ctx.ellipse(hx + dir * 11, hy + 4, race === 'argonian' ? 11 : 7, race === 'argonian' ? 6 : 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      disc(ctx, hx + dir * (race === 'argonian' ? 20 : 16), hy + 2, 1.6, DARK);
    }
    if (race === 'khajiit') { limb(ctx, hx - 4, hy - 12, hx - 2, hy - 6, 1.6, '#6A4A22'); limb(ctx, hx + 3, hy - 12, hx + 3, hy - 6, 1.6, '#6A4A22'); }
    if (race === 'orc') {
      ctx.fillStyle = '#EDE3D4';
      poly(ctx, [hx + dir * 6, hy + 8, hx + dir * 8, hy + 1, hx + dir * 10, hy + 8], '#EDE3D4');
      limb(ctx, hx + dir * 2, hy - 7, hx + dir * 13, hy - 5, 3, shade(skin, -0.35));
    }
    var eye = race === 'dunmer' ? '#E23A2A' : (glow ? '#9FE8FF' : DARK);
    disc(ctx, hx + dir * 7, hy - 2, race === 'dunmer' ? 2.2 : 1.9, eye);
    if (f.name && /Huntress/.test(f.name)) { limb(ctx, hx + dir * 2, hy - 1, hx + dir * 13, hy - 1, 2.4, '#7A1F18'); }
    if (st === 'great' && race === 'orc') {
      ctx.fillStyle = '#2E3A22'; ctx.beginPath(); ctx.arc(hx, hy - 2, 14.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.strokeStyle = DARK; ctx.stroke();
      for (var sp = -1; sp <= 1; sp++) poly(ctx, [hx + sp * 7 - 3, hy - 14 + Math.abs(sp) * 2, hx + sp * 9, hy - 26 + Math.abs(sp) * 4, hx + sp * 7 + 3, hy - 14 + Math.abs(sp) * 2], '#3E4A2E', DARK, 1);
    } else if (st === 'great') {
      ctx.fillStyle = IRON; ctx.beginPath(); ctx.arc(hx, hy - 2, 14.5, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillRect(hx - 15, hy - 4, 30, 4);
      [-1, 1].forEach(function (s) {
        ctx.strokeStyle = '#EDE3D4'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx + s * 12, hy - 8); ctx.quadraticCurveTo(hx + s * 26, hy - 12, hx + s * 22, hy - 30); ctx.stroke();
      });
    } else if (st === 'shield') {
      ctx.fillStyle = STEEL2; ctx.beginPath(); ctx.arc(hx, hy - 1, 14.8, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.strokeStyle = DARK; ctx.lineWidth = 1.6; ctx.stroke();
      limb(ctx, hx + dir * 10, hy - 6, hx + dir * 10, hy + 6, 3, STEEL2);
      if (race === 'imperial') { ctx.fillStyle = '#B3261E'; ctx.beginPath(); ctx.ellipse(hx - dir * 2, hy - 17, 16, 6, -dir * 0.2, Math.PI, 0); ctx.fill(); }
      else { ctx.fillStyle = STEEL; ctx.fillRect(hx - 2, hy - 18, 4, 6); }
    } else if (st === 'mage') {
      ctx.fillStyle = shade(col, -0.15); ctx.strokeStyle = DARK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hx - dir * 16, hy + 12); ctx.quadraticCurveTo(hx - dir * 20, hy - 18, hx - dir * 2, hy - 20); ctx.quadraticCurveTo(hx + dir * 14, hy - 20, hx + dir * 16, hy - 6);
      ctx.quadraticCurveTo(hx + dir * 6, hy - 14, hx - dir * 6, hy - 10); ctx.quadraticCurveTo(hx - dir * 10, hy + 2, hx - dir * 8, hy + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (st === 'archer' && race === 'bosmer') {
      ctx.fillStyle = '#3E4A2A'; ctx.beginPath(); ctx.arc(hx, hy - 1, 14.8, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
    } else if (st === 'dagger') {
      ctx.fillStyle = '#2A1E14'; ctx.fillRect(hx - 13, hy - 8, 26, 5);
      limb(ctx, hx - dir * 12, hy - 6, hx - dir * 20, hy + 2, 2.4, '#2A1E14');
    }
  }

  function weapon(ctx, f, hx, hy, ang, dir, pose) {
    var arm = f.arm || ({ great: 'greatsword', shield: 'sword', dagger: 'daggers', spear: 'spear', archer: 'bow', mage: 'staff' })[f.style] || 'sword';
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang * dir); ctx.scale(dir, 1);
    var wood = '#6A4A2A';
    if (pose.melee && (arm === 'bow' || arm === 'staff')) arm = arm === 'bow' ? 'knife' : 'mace';
    if (arm === 'greatsword') {
      limb(ctx, -10, 0, 8, 0, 5, LEATHER); limb(ctx, 8, -10, 8, 10, 5, GOLD);
      poly(ctx, [10, -5, 78, -4, 92, 0, 78, 4, 10, 5], STEEL, DARK, 1.2); limb(ctx, 14, 0, 76, 0, 1.2, STEEL2);
    } else if (arm === 'hammer') {
      limb(ctx, -14, 0, 60, 0, 5, wood);
      poly(ctx, [52, -16, 72, -16, 74, 16, 50, 16], IRON, DARK, 1.5); poly(ctx, [74, -8, 82, -6, 82, 6, 74, 8], STEEL2, DARK, 1);
      limb(ctx, 52, -10, 72, -10, 1.5, STEEL);
    } else if (arm === 'axe') {
      limb(ctx, -14, 0, 62, 0, 5, wood);
      ctx.fillStyle = STEEL; ctx.strokeStyle = DARK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(50, -3); ctx.quadraticCurveTo(66, -26, 74, -22); ctx.quadraticCurveTo(80, 0, 74, 22); ctx.quadraticCurveTo(66, 26, 50, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      poly(ctx, [50, -3, 40, -12, 44, 0, 40, 12, 50, 3], STEEL2, DARK, 1);
    } else if (arm === 'spear') {
      limb(ctx, -36, 0, 76, 0, 4, wood);
      poly(ctx, [74, -6, 96, 0, 74, 6, 70, 0], STEEL, DARK, 1); limb(ctx, 70, -3, 70, 3, 3, '#A2481E');
    } else if (arm === 'daggers' || arm === 'knife') {
      limb(ctx, -4, 0, 4, 0, 4, LEATHER); limb(ctx, 4, -5, 4, 5, 3, GOLD);
      poly(ctx, [5, -3, 30, -1, 36, 0, 30, 1, 5, 3], STEEL, DARK, 1);
    } else if (arm === 'mace') {
      limb(ctx, -6, 0, 34, 0, 4, wood); disc(ctx, 38, 0, 7, IRON);
    } else if (arm === 'bow') {
      ctx.strokeStyle = '#7A4A22'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(-6, 0, 36, -1.2, 1.2); ctx.stroke();
      limb(ctx, 4, -33, 6, -40, 3, '#C9A06A'); limb(ctx, 4, 33, 6, 40, 3, '#C9A06A');
      var pull = pose.draw || 0;
      ctx.strokeStyle = '#EDE3D4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(6, -34); ctx.lineTo(-6 - pull * 30, 0); ctx.lineTo(6, 34); ctx.stroke();
      if (pull > 0.05) { limb(ctx, -6 - pull * 30, 0, 34, 0, 2, '#C9A06A'); poly(ctx, [34, -3.5, 44, 0, 34, 3.5], STEEL); }
    } else if (arm === 'staff') {
      var c = EL[f.element] || EL.fire, k = pose.cast || 0;
      var rg = ctx.createRadialGradient(10, 0, 1, 10, 0, 10 + k * 26);
      rg.addColorStop(0, c[0]); rg.addColorStop(0.5, c[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(10, 0, 10 + k * 26, 0, Math.PI * 2); ctx.fill();
    } else {
      limb(ctx, -6, 0, 6, 0, 4, LEATHER); limb(ctx, 6, -9, 6, 9, 4, GOLD);
      poly(ctx, [8, -3.5, 50, -3, 58, 0, 50, 3, 8, 3.5], STEEL, DARK, 1); limb(ctx, 10, 0, 48, 0, 1, STEEL2);
    }
    ctx.restore();
  }

  function staffBack(ctx, f, x, y, dir) {
    var c = EL[f.element] || EL.fire;
    limb(ctx, x, y + 50, x + dir * 4, y - 70, 4, '#4A2E1A');
    var rg = ctx.createRadialGradient(x + dir * 4, y - 76, 1, x + dir * 4, y - 76, 14);
    rg.addColorStop(0, c[0]); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x + dir * 4, y - 76, 14, 0, Math.PI * 2); ctx.fill();
    disc(ctx, x + dir * 4, y - 76, 4.5, c[1]);
  }

  function shield(ctx, f, sx, sy) {
    if (f.race === 'imperial') {
      poly(ctx, [sx - 15, sy - 30, sx + 15, sy - 30, sx + 17, sy + 30, sx - 17, sy + 30], '#9A2525', GOLD, 3);
      disc(ctx, sx, sy, 6, GOLD); limb(ctx, sx - 10, sy - 18, sx + 10, sy + 18, 2, GOLD); limb(ctx, sx + 10, sy - 18, sx - 10, sy + 18, 2, GOLD);
      return;
    }
    ctx.fillStyle = '#6A4A2A'; ctx.strokeStyle = STEEL2; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (var b = -1; b <= 1; b += 2) limb(ctx, sx + b * 8, sy - 22, sx + b * 8, sy + 22, 1.5, '#4A3220');
    disc(ctx, sx, sy, 6.5, STEEL);
    ctx.strokeStyle = f.colour || '#3E5A7A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.stroke();
  }

  function fighter(ctx, f, x, dir, pose, t, i) {
    var y = GROUND, col = f.colour || '#7A5A3A', skin = SKIN[f.race] || SKIN.nord, st = f.style;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 52, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y - (pose.hop || 0));
    ctx.scale(SC, SC);
    if (pose.down) { ctx.rotate(-dir * pose.down * Math.PI / 2.1); ctx.translate(0, pose.down * 4); }
    var bob = Math.sin(t / 260 + i * 2) * 1.6 * (1 - (pose.down || 0));
    var lean = (pose.lean || 0) * dir;
    var hip = [0, -60 + bob], sh = [lean * 14, -106 + bob], hd = [lean * 18, -124 + bob];
    var stp = pose.stride || 0;
    var heavy = st === 'great' || st === 'shield';
    var legC = st === 'mage' ? DARK : (heavy ? IRON : LEATHER);
    var feet = [[-13 - stp * 8, 0], [15 + stp * 8, 0]];
    feet.forEach(function (ft) {
      var kx = (hip[0] + ft[0]) / 2 + dir * 4, ky = (hip[1] + ft[1]) / 2;
      limb(ctx, hip[0], hip[1], kx, ky, 10, legC); limb(ctx, kx, ky, ft[0], ft[1] - 4, 9, legC);
      if (heavy) disc(ctx, kx, ky, 4.5, STEEL2);
      poly(ctx, [ft[0] - 6, ft[1] - 12, ft[0] + 6, ft[1] - 12, ft[0] + 7 + dir * 5, ft[1], ft[0] - 7, ft[1]], st === 'mage' ? '#2A1E14' : (heavy ? STEEL2 : '#3A2A1C'), DARK, 1);
    });
    if (f.arm === 'staff') staffBack(ctx, f, sh[0] - dir * 22, sh[1] + 30, dir);
    if (st === 'archer') { ctx.save(); ctx.translate(sh[0] - dir * 12, sh[1] + 10); ctx.rotate(-dir * 0.4); poly(ctx, [-5, -22, 5, -22, 6, 26, -6, 26], '#5A3A22', DARK, 1); for (var q = -1; q <= 1; q++) limb(ctx, q * 3, -22, q * 3, -32, 2, '#C9A06A'); ctx.restore(); }
    if (st === 'great' || (st === 'shield' && f.race !== 'imperial')) {
      ctx.fillStyle = shade(col, -0.35); ctx.beginPath(); ctx.moveTo(sh[0] - dir * 6, sh[1]); ctx.quadraticCurveTo(sh[0] - dir * 30, hip[1] + 10, sh[0] - dir * 24 + Math.sin(t / 300) * 2, -8); ctx.lineTo(sh[0] - dir * 4, hip[1] + 12); ctx.closePath(); ctx.fill();
    }
    var back = [sh[0] - dir * 8, sh[1] + 4];
    var bh = [back[0] - dir * 8 + (pose.guard ? dir * 26 : 0), back[1] + 32 - (pose.guard ? 18 : 0)];
    if (st === 'archer' && !pose.melee) bh = [sh[0] + dir * 34, sh[1] + 8];
    if (f.arm === 'greatsword' || f.arm === 'hammer' || f.arm === 'axe' || st === 'spear') bh = [sh[0] + dir * 24, sh[1] + 24];
    limb(ctx, back[0], back[1], bh[0], bh[1], 8, heavy ? STEEL2 : skin);
    disc(ctx, bh[0], bh[1], 4.5, heavy ? IRON : LEATHER);
    if (st === 'mage') {
      poly(ctx, [hip[0] - 22, -4, sh[0] - 15, sh[1], sh[0] + 15, sh[1], hip[0] + 22, -4], col, DARK, 2);
      limb(ctx, sh[0], sh[1] + 4, hip[0] + dir * 4, -6, 2, shade(col, 0.25));
      ctx.fillStyle = GOLD; ctx.fillRect(hip[0] - 16, hip[1] - 1, 32, 4);
    } else {
      var torso = heavy ? (st === 'shield' ? STEEL : shade(col, -0.1)) : shade(col, -0.05);
      poly(ctx, [hip[0] - 17, hip[1] + 8, sh[0] - 17, sh[1], sh[0] + 17, sh[1], hip[0] + 17, hip[1] + 8], torso, DARK, 2);
      if (st === 'shield') { poly(ctx, [hip[0] - 9, hip[1] + 18, sh[0] - 8, sh[1] + 10, sh[0] + 8, sh[1] + 10, hip[0] + 9, hip[1] + 18], col, null); limb(ctx, sh[0] - 12, sh[1] + 6, sh[0] + 12, sh[1] + 6, 1.5, STEEL2); }
      if (st === 'great') { limb(ctx, sh[0] - 12, sh[1] + 2, hip[0] + 12, hip[1], 5, LEATHER); ctx.fillStyle = '#8A7A5A'; ctx.fillRect(sh[0] - 18, sh[1] - 3, 36, 6); }
      if (st === 'spear' || st === 'dagger') for (var sc = 0; sc < 3; sc++) limb(ctx, sh[0] - 12 + lean * 2, sh[1] + 12 + sc * 10, sh[0] + 12 + lean * 2, sh[1] + 12 + sc * 10, 1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = '#3A2A1C'; ctx.fillRect(hip[0] - 17, hip[1] - 2, 34, 7); disc(ctx, hip[0] + dir * 2, hip[1] + 1.5, 3, GOLD);
      if (heavy) { poly(ctx, [hip[0] - 17, hip[1] + 5, hip[0] - 3, hip[1] + 5, hip[0] - 5, hip[1] + 22, hip[0] - 18, hip[1] + 19], st === 'shield' ? col : LEATHER, DARK, 1); poly(ctx, [hip[0] + 17, hip[1] + 5, hip[0] + 3, hip[1] + 5, hip[0] + 5, hip[1] + 22, hip[0] + 18, hip[1] + 19], st === 'shield' ? col : LEATHER, DARK, 1); }
    }
    if (heavy) { ctx.fillStyle = STEEL2; ctx.strokeStyle = DARK; ctx.lineWidth = 1.5; [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(sh[0] + s * 15, sh[1] + 3, 11, 8, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }); }
    else if (st !== 'mage') { ctx.fillStyle = LEATHER; [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(sh[0] + s * 14, sh[1] + 3, 8, 6, 0, Math.PI, 0); ctx.fill(); }); }
    head(ctx, f, hd[0], hd[1], dir, pose.cast > 0.3);
    var arm = pose.arm === undefined ? -0.4 : pose.arm;
    var hand = [sh[0] + dir * 6 + Math.cos(arm) * 32 * dir, sh[1] + 6 + Math.sin(arm) * 32];
    if (st === 'archer' && !pose.melee) hand = [sh[0] + dir * 6 - dir * (pose.draw || 0) * 20, sh[1] + 8];
    if (st === 'mage' && !pose.melee && pose.cast) hand = [sh[0] + dir * 36, sh[1] + 4 - pose.cast * 12];
    var elbow = [(sh[0] + dir * 6 + hand[0]) / 2 - dir * 2, (sh[1] + 6 + hand[1]) / 2 + 4];
    limb(ctx, sh[0] + dir * 6, sh[1] + 6, elbow[0], elbow[1], 8.5, heavy ? STEEL2 : (st === 'mage' ? col : skin));
    limb(ctx, elbow[0], elbow[1], hand[0], hand[1], 8, heavy ? STEEL2 : (st === 'mage' ? col : skin));
    if (st === 'shield') shield(ctx, f, sh[0] + dir * (pose.guard ? 28 : 15), sh[1] + (pose.guard ? 22 : 36));
    if (f.arm === 'daggers') weapon(ctx, f, bh[0], bh[1], 0.7, dir, pose);
    var wa = arm + (st === 'archer' && !pose.melee ? -arm : 0);
    if (f.arm === 'greatsword' || f.arm === 'hammer' || f.arm === 'axe' || st === 'spear') wa = arm - 0.2;
    weapon(ctx, f, hand[0], hand[1], st === 'archer' && !pose.melee ? 0 : wa, dir, pose);
    disc(ctx, hand[0], hand[1], 4.8, heavy ? IRON : (st === 'mage' ? skin : LEATHER));
    if (pose.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,' + (0.5 * pose.flash) + ')'; ctx.beginPath(); ctx.ellipse(0, -72, 34, 64, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  function sparks(ctx, x, y, k, n, col, seed, big) {
    for (var i = 0; i < n; i++) {
      var a = seeded(seed + i) * Math.PI * 2, sp = (20 + seeded(seed + i + 50) * 70) * (big ? 1.5 : 1);
      var px = x + Math.cos(a) * sp * k, py = y + Math.sin(a) * sp * k + k * k * 40;
      ctx.globalAlpha = Math.max(0, 1 - k);
      limb(ctx, px, py, px - Math.cos(a) * 6, py - Math.sin(a) * 6, 2.4, col);
    }
    ctx.globalAlpha = 1;
  }

  function bolt(ctx, x1, y1, x2, y2, el, k, seed) {
    var c = EL[el] || EL.fire;
    var x = lerp(x1, x2, k), y = lerp(y1, y2, k) - Math.sin(Math.PI * k) * 20;
    if (el === 'shock') {
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? c[0] : c[2]; ctx.lineWidth = pass ? 1.6 : 6; ctx.globalAlpha = pass ? 1 : 0.6;
        ctx.beginPath(); ctx.moveTo(x1, y1);
        for (var i = 1; i <= 10; i++) { var kk = i / 10 * k; ctx.lineTo(lerp(x1, x2, kk), lerp(y1, y2, kk) + (seeded(seed + i + Math.floor(k * 14)) - 0.5) * 30); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var g = ctx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, c[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (el === 'frost') {
      var ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      poly(ctx, [-34, 0, -6, -7, 18, 0, -6, 7], c[1], c[0], 1.5); poly(ctx, [-6, -7, 18, 0, -2, -2], c[0]);
      ctx.restore();
      for (var m = 0; m < 8; m++) { var mk = Math.max(0, k - m * 0.03); disc(ctx, lerp(x1, x2, mk) + (seeded(seed + m) - 0.5) * 10, lerp(y1, y2, mk) - Math.sin(Math.PI * mk) * 20 + (seeded(seed + m + 4) - 0.5) * 10, 3, 'rgba(216,242,255,' + (0.5 - m * 0.05) + ')'); }
      return;
    }
    for (var tl = 0; tl < 10; tl++) {
      var kt = Math.max(0, k - tl * 0.025), tx = lerp(x1, x2, kt), ty = lerp(y1, y2, kt) - Math.sin(Math.PI * kt) * 20 + (seeded(seed + tl + Math.floor(k * 20)) - 0.5) * 6;
      ctx.fillStyle = tl < 3 ? c[1] : c[2]; ctx.globalAlpha = 0.6 - tl * 0.055; ctx.beginPath(); ctx.arc(tx, ty, 13 - tl, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    var rg = ctx.createRadialGradient(x, y, 1, x, y, 20);
    rg.addColorStop(0, c[0]); rg.addColorStop(0.55, c[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
  }

  function spellHit(ctx, x, y, el, after, seed) {
    var c = EL[el] || EL.fire;
    var r = 20 + after * 70;
    ctx.globalAlpha = Math.max(0, 1 - after);
    var rg = ctx.createRadialGradient(x, y, 2, x, y, r);
    rg.addColorStop(0, c[0]); rg.addColorStop(0.5, c[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (el === 'frost') for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2 + seed; poly(ctx, [x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a + 0.15) * (24 + after * 20), y + Math.sin(a + 0.15) * (24 + after * 20), x + Math.cos(a + 0.3) * 8, y + Math.sin(a + 0.3) * 8], c[0]); }
    if (el === 'shock') for (var j = 0; j < 5; j++) { var b = seeded(seed + j) * Math.PI * 2; limb(ctx, x, y, x + Math.cos(b) * (30 + after * 30), y + Math.sin(b) * (30 + after * 30), 2, c[0]); }
    if (el === 'fire') { ctx.strokeStyle = c[1]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function arrowFly(ctx, x1, y1, x2, y2, k) {
    var x = lerp(x1, x2, k), y = lerp(y1, y2, k) - Math.sin(Math.PI * k) * 14;
    var a = Math.atan2((y2 - y1) - 14 * Math.PI * Math.cos(Math.PI * k), x2 - x1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.globalAlpha = 0.35; limb(ctx, -60, 0, -26, 0, 1.5, '#EDE3D4'); ctx.globalAlpha = 1;
    limb(ctx, -30, 0, 4, 0, 2.2, '#C9A06A');
    poly(ctx, [4, -3.5, 14, 0, 4, 3.5], STEEL);
    ctx.fillStyle = '#EDE3D4'; ctx.fillRect(-32, -5, 7, 3); ctx.fillRect(-32, 2, 7, 3);
    ctx.restore();
  }

  function swingTrail(ctx, x, dir, k, power) {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.strokeStyle = power ? 'rgba(255,214,120,' + (0.7 * (1 - Math.abs(k - 0.5) * 2)) + ')' : 'rgba(255,255,255,' + (0.5 * (1 - Math.abs(k - 0.5) * 2)) + ')'; ctx.lineWidth = power ? 10 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + dir * 12, GROUND - 140, 84, dir > 0 ? -2.0 : Math.PI + 2.0 - 2.6 * k, dir > 0 ? -2.0 + 2.6 * k : Math.PI + 2.0, false); ctx.stroke(); ctx.restore();
  }

  function floatText(ctx, x, y, text, col, k, size) {
    if (k <= 0 || k >= 1) return;
    var pop = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : (k < 0.2 ? 1.2 - (k - 0.12) / 0.08 * 0.2 : 1);
    ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
    ctx.translate(x, y - k * 40); ctx.scale(pop, pop);
    ctx.font = '700 ' + (size || 22) + 'px Georgia, serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore();
  }

  function caption(ctx, x, y, text, col, k, size, track) {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25;
    ctx.font = '700 ' + (size || 16) + 'px Georgia, serif'; ctx.textAlign = 'center';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (track || 3) + 'px';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y); ctx.restore();
  }

  function banner(ctx, text, sub) {
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 250, 14, 500, sub ? 64 : 44);
    ctx.font = '600 25px Georgia, serif'; ctx.fillStyle = '#FFF6E2'; ctx.fillText(text, W / 2, 44);
    if (sub) { ctx.font = '14px ui-monospace, monospace'; ctx.fillStyle = '#CFC2A4'; ctx.fillText(sub, W / 2, 68); }
    ctx.restore();
  }

  function landed(ev) { return ev.kind === 'hit' || ev.kind === 'power'; }
  function comboAt(log, idx) {
    var by = log[idx].by, n = 0;
    for (var j = idx; j >= 0; j--) {
      var ev = log[j];
      if (ev.by === by) { if (landed(ev)) n++; else if (j === idx) return 0; else break; }
      else if (landed(ev)) break;
    }
    return n;
  }
  function meters(log, upto, styles) {
    var st = [100, 100], mg = [100, 100];
    for (var j = 0; j < upto && j < log.length; j++) {
      var ev = log[j], a = ev.by, d = 1 - a;
      if (ev.move === 'spell') mg[a] -= 30; else st[a] -= ev.kind === 'power' ? 30 : 18;
      if (ev.kind === 'dodge') st[d] -= 12; else if (ev.kind === 'block') st[d] -= 9;
      [0, 1].forEach(function (i) { st[i] = clamp(st[i] + 9, 6, 100); mg[i] = clamp(mg[i] + 8, 4, 100); });
    }
    return { st: st, mg: [styles[0] && styles[0].style === 'mage' ? mg[0] : 100, styles[1] && styles[1].style === 'mage' ? mg[1] : 100] };
  }
  function critName(ev, f) {
    if (ev.move === 'spell') return 'OVERCHARGED';
    if (ev.move === 'arrow') return 'PIERCING SHOT';
    if (ev.move === 'bash') return 'SHIELD SLAM';
    if (f && (f.arm === 'hammer' || f.arm === 'axe' || f.arm === 'greatsword')) return 'CRUSHING BLOW';
    return 'CRITICAL STRIKE';
  }

  function timeline(m, now) {
    var L = m.log ? m.log.length : 0;
    var step = (m.endAt - m.startAt) / (L + 1);
    var out = { L: L, step: step, cur: -1, k: 0, done: m.phase === 'done' || (m.phase === 'fight' && now >= m.endAt), shown: 0 };
    if (m.phase !== 'fight' || !L || out.done) { out.shown = out.done ? L : 0; return out; }
    var c = Math.floor((now - m.startAt) / step);
    if (c >= L - 1) { out.cur = L - 1; out.k = clamp((now - m.startAt - step * (L - 1)) / (step * 2), 0, 1); }
    else { out.cur = Math.max(0, c); out.k = clamp((now - m.startAt) / step - out.cur, 0, 1); }
    out.shown = out.cur + (out.k >= (out.cur === L - 1 ? 0.42 : 0.6) ? 1 : 0);
    return out;
  }

  var cheerFx = [];
  function cheerBurst(side, now) { for (var i = 0; i < 6; i++) cheerFx.push({ side: side, at: now + i * 70, x: (side ? W / 2 + 40 : 40) + Math.random() * (W / 2 - 80), seed: Math.random() * 1000 }); }

  function draw(cv, m, now, onImpact) {
    var ctx = setup(cv, W, H);
    var F = m.styles || [{}, {}];
    F = F.map(function (s, i) { return Object.assign({ name: (m.names || [])[i] }, s); });
    var tl = timeline(m, now);
    var pose = [{}, {}], x = BASE.slice(), shake = 0, fx = [], flash = null, zoom = null, ko = null, combo = null, crit = null;
    var L = tl.L, cur = tl.cur, k = tl.k;
    if (m.phase === 'fight' && now < m.startAt + tl.step * 0.5 && cur <= 0) {
      var w = ease(Math.min(1, (now - m.startAt) / (tl.step * 0.5)));
      x = [lerp(140, BASE[0], w), lerp(W - 140, BASE[1], w)]; pose[0].stride = pose[1].stride = Math.sin(now / 90) * (1 - w);
    }
    if (cur >= 0) {
      var ev = m.log[cur], a = ev.by, d = 1 - a, dirA = a === 0 ? 1 : -1;
      var mv = ev.move || 'blade', fA = F[a] || {};
      var melee = !(mv === 'arrow' || mv === 'spell');
      var final = cur === L - 1;
      var hitAt = final ? 0.42 : 0.6;
      var kk = k;
      if (!final && k > hitAt && k < hitAt + 0.08 && landed(ev)) kk = hitAt + (k - hitAt) * 0.15;
      var after = Math.max(0, (kk - hitAt) / (1 - hitAt));
      var kp = final ? Math.min(1, kk / hitAt * 0.6) : kk;
      if (melee) {
        pose[a].melee = true;
        var reach = BASE[d] - dirA * ((fA.style === 'spear') ? 160 : 124);
        var go = kp < 0.45 ? ease(kp / 0.45) : (kk < 0.7 || final ? 1 : 1 - ease((kk - 0.7) / 0.3));
        if (final && after > 0.5) go = 1 - ease((after - 0.5) / 0.5) * 0.6;
        x[a] = lerp(BASE[a], reach, go);
        pose[a].stride = kp < 0.45 ? Math.sin(kp * 30) : 0;
        pose[a].arm = kp < 0.45 ? lerp(-0.4, -2.2, ease(kp / 0.45)) : (kk < hitAt + 0.02 ? lerp(-2.2, 0.9, ease((kp - 0.45) / 0.15)) : lerp(0.9, -0.4, ease(after)));
        if (mv === 'bash') { pose[a].arm = -0.2; pose[a].guard = true; pose[a].lean = go * 0.5; }
        else pose[a].lean = go * (ev.kind === 'power' ? 0.6 : 0.3);
        if (mv !== 'bash') fx.push({ trail: true, x: x[a], dir: dirA, k: (kp - 0.45) / 0.18, power: ev.kind === 'power' });
      } else if (mv === 'arrow') {
        pose[a].draw = kp < 0.4 ? ease(kp / 0.4) : 0;
      } else {
        pose[a].cast = kp < 0.4 ? ease(kp / 0.4) : Math.max(0, 1 - (kp - 0.4) * 4);
        pose[a].lean = -0.1;
      }
      if (kk >= hitAt) {
        if (ev.kind === 'dodge') { var hk = Math.sin(Math.min(1, after * 1.6) * Math.PI); pose[d].hop = hk * 28; x[d] = BASE[d] + dirA * hk * 38; pose[d].lean = -0.4 * hk; }
        else if (ev.kind === 'block') { pose[d].guard = true; x[d] = BASE[d] + dirA * 10 * (1 - after); shake = (1 - after) * 2; }
        else {
          var push = (ev.kind === 'power' ? 38 : 18) * Math.sin(Math.min(1, after * 2) * Math.PI / 2) * (final ? 2.2 : 1);
          x[d] = BASE[d] + dirA * push * (final ? 1 : (1 - after)); pose[d].flash = Math.max(0, 1 - after * 2); pose[d].lean = -0.3 * (1 - after);
          shake = (1 - after) * (final ? 14 : (ev.kind === 'power' ? 10 : 3));
          if (mv === 'spell' && after < 0.35) flash = { col: (EL[ev.el] || EL.fire)[1], a: 0.28 * (1 - after / 0.35) };
          if (ev.kind === 'power' && !final) crit = { text: critName(ev, fA), x: x[d], k: after };
          var cn = comboAt(m.log, cur);
          if (cn >= 2) combo = { n: cn, side: a, k: after };
        }
        if (final && landed(ev)) { pose[d].down = ease(Math.max(0, (after - 0.2) / 0.6)); zoom = { k: ease(Math.min(1, after * 2.4)), x: x[d] }; ko = { k: after, side: d }; }
      } else if (ev.kind === 'block' && kk > 0.4) pose[d].guard = true;
      if (final && kk < hitAt) zoom = { k: ease(kk / hitAt) * 0.35, x: (x[0] + x[1]) / 2 };
      fx.push({ ev: ev, a: a, d: d, k: kp, kk: kk, after: after, hitAt: hitAt, melee: melee, cur: cur, final: final });
      if (onImpact && kk >= hitAt && fired[m.no + ':' + (m.replay || 0)] !== cur) { fired[m.no + ':' + (m.replay || 0)] = cur; onImpact(ev, final); }
    }
    if (tl.done && L) { var last = m.log[L - 1]; var loser = 1 - last.by; pose[loser].down = 1; pose[last.by].arm = -2.4; pose[last.by].melee = true; x[loser] = BASE[loser] + (last.by === 0 ? 1 : -1) * 40; }
    var cheer = [0, 0];
    cheerFx = cheerFx.filter(function (c) { return now - c.at < 1800; });
    cheerFx.forEach(function (c) { if (now >= c.at) cheer[c.side] = Math.max(cheer[c.side], 1 - (now - c.at) / 1800); });
    ctx.save();
    if (zoom && zoom.k > 0) { var z = 1 + zoom.k * 0.22; ctx.translate(zoom.x, GROUND - 90); ctx.scale(z, z); ctx.translate(-zoom.x, -(GROUND - 90)); }
    if (shake) ctx.translate((seeded(now) - 0.5) * shake, (seeded(now + 1) - 0.5) * shake);
    backdrop(ctx, now, cheer, [F[0].colour || '#7A2A22', F[1].colour || '#2A3A6A']);
    var order = pose[0].down ? [0, 1] : [1, 0];
    order.forEach(function (i) { fighter(ctx, F[i] || {}, x[i], i === 0 ? 1 : -1, pose[i], now, i); });
    fx.forEach(function (f) {
      if (f.trail) { swingTrail(ctx, f.x, f.dir, f.k, f.power); return; }
      var ev = f.ev, dirA = f.a === 0 ? 1 : -1, sx = x[f.a] + dirA * 66, sy = GROUND - 172, tx = x[f.d], ty = GROUND - 150;
      if (ev.move === 'arrow' && f.k >= 0.4 && f.kk < f.hitAt) arrowFly(ctx, sx, sy, ev.kind === 'dodge' ? tx + dirA * 160 : tx - dirA * 16, ev.kind === 'dodge' ? ty - 36 : ty, Math.min(1, (f.k - 0.4) / (f.hitAt - 0.4 || 1)));
      if (ev.move === 'spell' && f.k >= 0.35 && f.kk < f.hitAt) bolt(ctx, sx, sy, ev.kind === 'dodge' ? tx + dirA * 180 : tx, ev.kind === 'dodge' ? ty - 46 : ty, ev.el, Math.min(1, (f.k - 0.35) / (f.hitAt - 0.35 || 1)), f.cur * 31);
      if (f.kk >= f.hitAt) {
        var ix = tx - dirA * 26, iy = GROUND - 150;
        if (ev.kind === 'block') { sparks(ctx, ix, iy, f.after, 20, '#FFE29A', f.cur * 7); floatText(ctx, tx, GROUND - 236, 'Blocked ' + ev.dmg, '#CFE4FF', f.after); }
        else if (ev.kind === 'dodge') floatText(ctx, tx, GROUND - 236, 'Dodged!', '#BFE6FF', f.after);
        else {
          sparks(ctx, ix, iy, f.after, ev.kind === 'power' ? 30 : 16, ev.move === 'spell' ? (EL[ev.el] || EL.fire)[0] : '#FF8A6A', f.cur * 13, ev.kind === 'power' || f.final);
          if (ev.move === 'arrow' && f.after < 0.9) arrowFly(ctx, ix - dirA * 8, iy, ix, iy, 1);
          if (ev.move === 'spell') spellHit(ctx, ix, iy, ev.el, f.after, f.cur);
          floatText(ctx, tx, GROUND - 236, '−' + ev.dmg, ev.kind === 'power' ? '#FFD36A' : '#FFF6E2', f.after, ev.kind === 'power' || f.final ? 40 : 26);
        }
      }
    });
    cheerFx.forEach(function (c) { var q = (now - c.at) / 1800; if (q > 0 && q < 1) floatText(ctx, c.x, 150 + seeded(c.seed) * 30, '📣', '#FFF6E2', q, 24); });
    ctx.restore();
    if (flash) { ctx.fillStyle = flash.col; ctx.globalAlpha = flash.a; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (crit) caption(ctx, crit.x, GROUND - 200, crit.text, '#FFD36A', crit.k, 18, 4);
    if (combo) caption(ctx, combo.side === 0 ? 170 : W - 170, 120, combo.n + ' HIT COMBO', '#FFF6E2', combo.k, 26, 2);
    if (ko || (tl.done && L)) {
      var bar = ko ? ease(Math.min(1, ko.k * 3)) * 34 : 34;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    }
    if (ko && ko.k > 0.15) { var kq = (ko.k - 0.15) / 0.85; ctx.save(); ctx.translate(W / 2, H / 2 - 20); var sc = kq < 0.15 ? 2.2 - kq / 0.15 * 1.2 : 1; ctx.scale(sc, sc); ctx.font = '700 72px Georgia, serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText('K.O.', 0, 0); ctx.fillStyle = '#F4C774'; ctx.fillText('K.O.', 0, 0); ctx.restore(); }
    if (m.replay) { ctx.save(); ctx.font = '700 13px ui-monospace, monospace'; ctx.fillStyle = '#E2574A'; disc(ctx, 26, 52, 5, '#E2574A'); ctx.fillText('REPLAY', 38, 57); ctx.restore(); }
    if (m.phase === 'bet') banner(ctx, (m.title ? 'Title bout ' : 'Bout ') + m.no, 'The fighters step in when the betting closes');
    if (tl.done && L && !m.replay) {
      var lw = m.log[L - 1].by;
      banner(ctx, (m.names || [])[lw] + ' wins!', m.belt === 'took' ? 'and takes the champion’s belt' : (m.belt === 'kept' ? 'and keeps the champion’s belt' : (m.belt === 'won' ? 'and is the first to hold the belt' : (m.phase === 'done' ? 'The next pair is coming' : 'The crowd roars'))));
    }
    return tl;
  }

  function portrait(cv, f) {
    if (!cv || cv.__drawn === f.name + f.race) return;
    var ctx = setup(cv, 76, 76);
    var g = ctx.createRadialGradient(38, 30, 4, 38, 38, 46); g.addColorStop(0, shade(f.colour || '#5A3A26', 0.25)); g.addColorStop(1, '#140D08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 76, 76);
    ctx.save(); ctx.translate(38, 42); ctx.scale(1.9, 1.9);
    var heavy = f.style === 'great' || f.style === 'shield';
    poly(ctx, [-20, 22, -16, 10, 16, 10, 20, 22], f.style === 'shield' ? STEEL : (f.style === 'mage' ? f.colour : shade(f.colour || '#5A3A26', -0.1)), DARK, 1.2);
    if (heavy) { ctx.fillStyle = STEEL2; [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * 14, 12, 9, 6, 0, Math.PI, 0); ctx.fill(); }); }
    head(ctx, f, 0, -4, 1, false);
    ctx.restore();
    cv.__drawn = f.name + f.race;
  }

  var ELW = { fire: 'a ball of fire', frost: 'a lance of ice', shock: 'a storm of lightning' };
  function first(n) { return String(n || '').split(/[\s’']/)[0]; }
  function lineFor(ev, idx, m) {
    var F = m.styles || [{}, {}], A = first(m.names[ev.by]), D = first(m.names[1 - ev.by]), fA = F[ev.by] || {}, fD = F[1 - ev.by] || {};
    var wpn = fA.weapon && !/fire|frost|lightning/.test(fA.weapon) ? fA.weapon.replace(/^twin /, '').replace(/ and .*/, '') : 'blade';
    var v = (m.no * 7 + idx * 3) % 3;
    var hp = ev.hp[1 - ev.by], max = m.hp[1 - ev.by];
    var s;
    if (ev.kind === 'dodge') s = ev.move === 'arrow' ? [D + ' ducks; the arrow hums past.', 'The arrow finds only sand. ' + D + ' is quick!', D + ' twists aside from the shot.'][v]
      : (ev.move === 'spell' ? [D + ' rolls clear of ' + ELW[ev.el] + '.', A + '’s spell bursts on empty sand.', D + ' leaps through the smoke untouched.'][v]
      : [D + ' slips aside. The ' + wpn + ' cuts only air.', A + ' swings wide. ' + D + ' dances away.', 'A miss! ' + D + ' was never there.'][v]);
    else if (ev.kind === 'block') s = fD.style === 'shield' ? [D + ' takes it on the shield. Only ' + ev.dmg + ' gets through.', 'Steel rings on wood. ' + D + ' holds.', D + ' catches it on the shield rim: ' + ev.dmg + '.'][v]
      : [D + ' turns the blow aside: ' + ev.dmg + ' through the guard.', D + ' parries! Just ' + ev.dmg + '.', 'Blocked, mostly. ' + ev.dmg + ' gets in.'][v];
    else if (ev.move === 'spell') s = ev.kind === 'power' ? A + ' unleashes ' + ELW[ev.el] + '. Overcharged, ' + ev.dmg + '!' : [A + ' answers with ' + ELW[ev.el] + '. ' + ev.dmg + ' through the guard.', A + ' hurls ' + ELW[ev.el] + ' for ' + ev.dmg + '.', ELW[ev.el].charAt(0).toUpperCase() + ELW[ev.el].slice(1) + ' from ' + A + ': ' + ev.dmg + '.'][v];
    else if (ev.move === 'arrow') s = ev.kind === 'power' ? 'A piercing shot! ' + A + ' hits ' + D + ' for ' + ev.dmg + '!' : [A + ' looses. The arrow strikes home for ' + ev.dmg + '.', 'Thwack! ' + A + '’s arrow bites for ' + ev.dmg + '.', A + ' draws and fires: ' + ev.dmg + '.'][v];
    else if (ev.move === 'bash') s = A + ' slams the shield into ' + D + ' for ' + ev.dmg + '.';
    else s = ev.kind === 'power' ? [A + ' brings the ' + wpn + ' down: a crushing blow for ' + ev.dmg + '!', 'What a hit! ' + A + ' lands the ' + wpn + ' for ' + ev.dmg + '!', A + ' puts everything into it: ' + ev.dmg + '!'][v]
      : [A + ' lands the ' + wpn + ' for ' + ev.dmg + '.', A + ' cuts in for ' + ev.dmg + '.', 'The ' + wpn + ' connects. ' + ev.dmg + ' to ' + D + '.'][v];
    if (landed(ev)) {
      var cn = comboAt(m.log, idx);
      if (cn >= 3) s += ' That’s ' + cn + ' in a row!';
      if (hp > 0 && hp < max * 0.25) s += ' ' + D + ' staggers… the crowd is on its feet!';
    }
    return s;
  }
  function intro(m) {
    var r = m.recs || [[0, 0], [0, 0]];
    var who = function (i) { return m.names[i] + ', ' + (m.kinds[i] || '').toLowerCase() + ', ' + r[i][0] + '–' + r[i][1] + (m.champ === m.names[i] ? ', the champion' : ''); };
    return [(m.title ? 'A title bout! ' : '') + 'Bout ' + m.no + '. In this corner, ' + who(0) + '.', 'And facing them, ' + who(1) + '. Place your bets!'];
  }

  var S = { tbl: null, shown: -1, no: null, replay: null, lastCheers: null, hpPrev: null };
  function setW(el, pct) { if (el) el.style.width = clamp(pct, 0, 100).toFixed(1) + '%'; }

  function tick(tbl, live, now, reduce, Snd) {
    var stage = tbl.querySelector('[data-arena]');
    if (!stage) return;
    if (stage !== S.stage) { S.stage = stage; S.shown = -1; wire(stage, tbl); }
    if (live.no !== S.no) { S.no = live.no; S.replay = null; S.lastCheers = null; S.shown = -1; }
    var m = live;
    if (S.replay) {
      var rp = S.replay, rn = Date.now();
      if (rn > rp.endAt + 2500) S.replay = null;
      else { m = Object.assign({}, live, { phase: rn >= rp.endAt ? 'done' : 'fight', startAt: rp.startAt, endAt: rp.endAt, replay: rp.id }); now = rn; }
    }
    var styles = (m.styles || []).map(function (s, i) { return Object.assign({ name: m.names[i] }, s); });
    [0, 1].forEach(function (i) { portrait(stage.querySelector('[data-port="' + i + '"]'), styles[i] || {}); });
    if (live.cheers) {
      if (S.lastCheers) [0, 1].forEach(function (i) { if (live.cheers[i] > S.lastCheers[i]) { cheerBurst(i, now); var el = tbl.querySelector('[data-cheers="' + i + '"]'); if (el) el.textContent = live.cheers[i]; } });
      S.lastCheers = live.cheers.slice();
    }
    var ring = stage.querySelector('[data-ring]');
    var tl = null;
    if (ring && ring.offsetParent !== null) {
      try { tl = draw(ring, m, now, reduce ? null : function (ev, fin) { if (!Snd) return; if (fin) { Snd.big(); return; } if (ev.kind === 'dodge') Snd.tick(); else if (ev.kind === 'block') Snd.chip(); else if (ev.move === 'spell') Snd.ball(); else if (ev.kind === 'power') Snd.dice(); else Snd.card(); }); } catch (e) {}
    }
    if (!tl) tl = timeline(m, now);
    var clockEl = stage.querySelector('[data-aclock]'), round = stage.querySelector('[data-around]'), list = stage.querySelector('[data-blows]');
    var clock = function (ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    var rb = stage.querySelector('[data-replay]');
    if (rb) rb.hidden = !(tl.done && tl.L) || !!S.replay;
    if (m.phase === 'bet') {
      if (clockEl) clockEl.textContent = clock(m.startAt - now);
      if (round) round.textContent = (m.title ? 'Title bout · ' : '') + 'Bout ' + m.no + ' · starts in';
      if (list && S.shown !== 0) { list.innerHTML = ''; intro(m).reverse().forEach(function (t) { var li = document.createElement('li'); li.className = 'intro'; li.textContent = t; list.appendChild(li); }); S.shown = 0; }
      hud(stage, m, 0);
      return;
    }
    if (!m.log) return;
    var want = tl.shown;
    if (list) {
      if (want < S.shown || S.shown < 0) { list.innerHTML = ''; S.shown = 0; }
      while (S.shown < want) {
        var ev = m.log[S.shown];
        var li = document.createElement('li');
        li.className = ev.kind + (ev.move === 'spell' ? ' spell el-' + ev.el : '');
        li.textContent = lineFor(ev, S.shown, m);
        list.insertBefore(li, list.firstChild);
        S.shown++;
        var hitCard = stage.querySelector('.ahf.f' + (1 - ev.by));
        if (want - S.shown < 1 && tl.cur >= 0 && hitCard && !reduce && landed(ev)) { hitCard.classList.remove('struck'); void hitCard.offsetWidth; hitCard.classList.add('struck'); }
      }
      if (want === tl.L && tl.L && !list.querySelector('.ko')) {
        var last = m.log[tl.L - 1];
        var ko = document.createElement('li'); ko.className = 'ko';
        ko.textContent = m.names[1 - last.by] + ' goes down. ' + m.names[last.by] + ' wins the bout' + (m.belt === 'took' ? ' and takes the belt!' : (m.belt === 'kept' ? ' and keeps the belt!' : '!'));
        list.insertBefore(ko, list.firstChild);
      }
      while (list.children.length > 6) list.lastChild.remove();
    }
    hud(stage, m, want);
    if (round) round.textContent = (m.title ? 'Title bout · ' : '') + 'Bout ' + m.no + (tl.done ? '' : ' · Round ' + (Math.floor(Math.max(0, want) / 8) + 1));
    if (clockEl) clockEl.textContent = S.replay ? 'Replay' : (live.phase === 'done' ? (now < live.nextAt ? 'K.O.' : '—') : (tl.done ? 'K.O.' : clock(m.endAt - now)));
    var sub = stage.querySelector('.aodds');
    if (sub && live.phase === 'done' && !S.replay) sub.textContent = 'Next bout in ' + clock(live.nextAt - Date.now());
  }

  function hud(stage, m, want) {
    var hp = want && m.log ? m.log[want - 1].hp : m.hp;
    var mt = meters(m.log || [], want, m.styles || []);
    [0, 1].forEach(function (i) {
      var pct = hp[i] / m.hp[i] * 100;
      setW(stage.querySelector('[data-hp="' + i + '"]'), pct);
      setW(stage.querySelector('[data-chip="' + i + '"]'), pct);
      var num = stage.querySelector('[data-hpn="' + i + '"]'); if (num) num.textContent = hp[i] + ' / ' + m.hp[i];
      setW(stage.querySelector('[data-st="' + i + '"]'), mt.st[i]);
      setW(stage.querySelector('[data-mg="' + i + '"]'), mt.mg[i]);
    });
  }

  function wire(stage, tbl) {
    var rb = stage.querySelector('[data-replay]');
    if (rb && !rb.__w) {
      rb.__w = true;
      rb.addEventListener('click', function () {
        var n = Date.now();
        S.replay = { id: n, startAt: n, endAt: n + 22000 };
        S.shown = -1;
        rb.hidden = true;
      });
    }
    if (!tbl.__cheerw) {
      tbl.__cheerw = true;
      tbl.addEventListener('submit', function (e) {
        var f = e.target.closest && e.target.closest('form[data-cheer]');
        if (!f) return;
        e.preventDefault();
        var btn = f.querySelector('button'); if (btn) btn.disabled = true;
        fetch('/inn/arena/cheer', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(f)).toString() })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.cheers) {
              cheerBurst(j.side, Date.now());
              S.lastCheers = j.cheers.slice();
              [0, 1].forEach(function (i) { var el = tbl.querySelector('[data-cheers="' + i + '"]'); if (el) el.textContent = j.cheers[i]; });
              if (window.InnUI && window.InnUI.say) window.InnUI.say('The crowd roars for ' + first(((S.lastMeta || {}).names || [])[j.side] || 'your fighter') + '!');
            } else if (j && j.error && window.InnUI && window.InnUI.say) window.InnUI.say(j.error, 'bad');
          })
          .catch(function () {})
          .then(function () { setTimeout(function () { if (btn) btn.disabled = false; }, 900); });
      });
    }
  }

  window.InnArena = { draw: draw, tick: function (tbl, m, now, reduce, Snd) { S.lastMeta = m; tick(tbl, m, now, reduce, Snd); }, lineFor: lineFor, comboAt: comboAt, meters: meters };
})();
