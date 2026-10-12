(function () {
  var W = 880, H = 380, GROUND = 304, BASE = [300, 580];
  var EL = { fire: ['#FFB347', '#E8541E'], frost: ['#D8F2FF', '#5AB4E8'], shock: ['#F4ECFF', '#9A7BFF'] };
  var SKIN = ['#D9B38C', '#C99A72', '#8A6A4A', '#B8C9A8', '#E3C3A0'];
  var ease = function (k) { return k < 0 ? 0 : (k > 1 ? 1 : k * k * (3 - 2 * k)); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var seeded = function (n) { var x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
  var ready = {};

  function setup(cv) {
    if (cv.__ready) return cv.__ctx;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.__ready = true; cv.__ctx = ctx;
    return ctx;
  }

  function backdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1A120C'); g.addColorStop(0.45, '#2A1C12'); g.addColorStop(1, '#130C08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var row = 0; row < 3; row++) {
      for (var i = 0; i < 34; i++) {
        var x = 10 + i * 26 + (row % 2) * 13, y = 70 + row * 22 + Math.sin(t / 380 + i * 1.7 + row) * 2;
        ctx.fillStyle = row === 2 ? '#2B1D14' : (row === 1 ? '#22170F' : '#1C130C');
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 11, y + 7, 22, 22);
      }
    }
    ctx.fillStyle = '#3A2A1C'; ctx.fillRect(0, 138, W, 14);
    ctx.fillStyle = '#4A3624'; for (var p = 0; p < W; p += 44) ctx.fillRect(p, 128, 10, 26);
    [70, W - 70].forEach(function (tx, k) {
      ctx.fillStyle = '#3A2A1C'; ctx.fillRect(tx - 4, 150, 8, 70);
      var fl = 1 + Math.sin(t / 90 + k * 3) * 0.12 + Math.sin(t / 37 + k) * 0.06;
      var rg = ctx.createRadialGradient(tx, 140, 2, tx, 140, 120 * fl);
      rg.addColorStop(0, 'rgba(255,170,80,.35)'); rg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = rg; ctx.fillRect(tx - 130, 20, 260, 260);
      ctx.fillStyle = '#FFB347'; ctx.beginPath(); ctx.ellipse(tx, 142, 7 * fl, 15 * fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFE29A'; ctx.beginPath(); ctx.ellipse(tx, 146, 3.5 * fl, 8 * fl, 0, 0, Math.PI * 2); ctx.fill();
    });
    var fg = ctx.createRadialGradient(W / 2, GROUND + 10, 30, W / 2, GROUND + 10, 460);
    fg.addColorStop(0, '#7A6040'); fg.addColorStop(1, '#2E2216');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 22, 430, 70, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 22, 300, 46, 0, 0, Math.PI * 2); ctx.stroke();
  }

  function limb(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function weapon(ctx, f, hx, hy, ang, dir, pose) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang * dir); ctx.scale(dir, 1);
    var steel = '#D8DEE6', wood = '#6A4A2A';
    if (f.style === 'great') { limb(ctx, -6, 0, 52, 0, 5, wood); ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(42, -4); ctx.quadraticCurveTo(62, -24, 66, -2); ctx.quadraticCurveTo(62, 20, 42, 4); ctx.fill(); }
    else if (f.style === 'spear') { limb(ctx, -30, 0, 70, 0, 4, wood); ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(70, -5); ctx.lineTo(88, 0); ctx.lineTo(70, 5); ctx.fill(); }
    else if (f.style === 'dagger') { limb(ctx, 0, 0, 22, 0, 4, steel); limb(ctx, -3, -5, -3, 5, 3, '#8A6A2A'); }
    else if (f.style === 'archer' && !pose.melee) {
      ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-4, 0, 30, -1.25, 1.25); ctx.stroke();
      var pull = pose.draw || 0;
      ctx.strokeStyle = '#EDE3D4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(5, -28); ctx.lineTo(-4 - pull * 26, 0); ctx.lineTo(5, 28); ctx.stroke();
      if (pull > 0.05) { limb(ctx, -4 - pull * 26, 0, 30, 0, 2, '#C9A06A'); ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(30, -3); ctx.lineTo(38, 0); ctx.lineTo(30, 3); ctx.fill(); }
    }
    else if (f.style === 'mage' && !pose.melee) {
      var c = EL[f.element] || EL.fire, k = pose.cast || 0;
      var rg = ctx.createRadialGradient(8, 0, 1, 8, 0, 8 + k * 16);
      rg.addColorStop(0, c[0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(8, 0, 8 + k * 16, 0, Math.PI * 2); ctx.fill();
    }
    else { limb(ctx, 0, 0, 40, 0, 4, steel); limb(ctx, 2, -7, 2, 7, 4, '#8A6A2A'); ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(40, -2); ctx.lineTo(48, 0); ctx.lineTo(40, 2); ctx.fill(); }
    ctx.restore();
  }

  function fighter(ctx, f, x, dir, pose, t, i) {
    var y = GROUND;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 42, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y - (pose.hop || 0));
    ctx.scale(1.25, 1.25);
    if (pose.down) { ctx.rotate(-dir * pose.down * Math.PI / 2.1); ctx.translate(0, pose.down * 4); }
    var skin = SKIN[i % SKIN.length], col = f.colour || '#7A5A3A', dark = '#1A120C';
    var bob = Math.sin(t / 260 + i * 2) * 1.6 * (1 - (pose.down || 0));
    var lean = (pose.lean || 0) * dir;
    var hip = [0, -58 + bob], sh = [lean * 14, -104 + bob], head = [lean * 18, -120 + bob];
    var st = pose.stride || 0;
    limb(ctx, hip[0], hip[1], -12 - st * 8, 0, 9, dark);
    limb(ctx, hip[0], hip[1], 14 + st * 8, 0, 9, dark);
    limb(ctx, -12 - st * 8, -2, -18 - st * 8, 0, 8, '#3A2A1C');
    limb(ctx, 14 + st * 8, -2, 20 + st * 8, 0, 8, '#3A2A1C');
    var back = [sh[0] - dir * 6, sh[1] + 4];
    var bh = [back[0] - dir * 8 + (pose.guard ? dir * 24 : 0), back[1] + 30 - (pose.guard ? 16 : 0)];
    if (f.style === 'archer' && !pose.melee) bh = [sh[0] + dir * 30, sh[1] + 8];
    if (f.style === 'great' || f.style === 'spear') bh = [sh[0] + dir * 24, sh[1] + 22];
    limb(ctx, back[0], back[1], bh[0], bh[1], 7, skin);
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hip[0] - 16, hip[1] + 6); ctx.lineTo(sh[0] - 15, sh[1]); ctx.lineTo(sh[0] + 15, sh[1]); ctx.lineTo(hip[0] + 16, hip[1] + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3A2A1C'; ctx.fillRect(hip[0] - 16, hip[1] - 2, 32, 6);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(head[0], head[1], 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (f.style === 'mage') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(head[0] - 15, head[1] + 2); ctx.quadraticCurveTo(head[0], head[1] - 30, head[0] + 15, head[1] + 2); ctx.closePath(); ctx.fill(); }
    else if (f.style === 'shield' || f.style === 'great') { ctx.fillStyle = '#8A8F96'; ctx.beginPath(); ctx.arc(head[0], head[1] - 2, 13.5, Math.PI, 0); ctx.fill(); if (f.style === 'great') { limb(ctx, head[0] - 12, head[1] - 8, head[0] - 20, head[1] - 22, 3, '#EDE3D4'); limb(ctx, head[0] + 12, head[1] - 8, head[0] + 20, head[1] - 22, 3, '#EDE3D4'); } }
    else if (f.style === 'archer') { ctx.fillStyle = '#4A3A22'; ctx.beginPath(); ctx.arc(head[0], head[1] - 3, 13.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(head[0] + dir * 6, head[1] - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    var arm = pose.arm === undefined ? -0.4 : pose.arm;
    var hand = [sh[0] + dir * 6 + Math.cos(arm) * 30 * dir, sh[1] + 6 + Math.sin(arm) * 30];
    if (f.style === 'archer' && !pose.melee) hand = [sh[0] + dir * 6 - dir * (pose.draw || 0) * 18, sh[1] + 8];
    if (f.style === 'mage' && !pose.melee && pose.cast) hand = [sh[0] + dir * 34, sh[1] + 4 - pose.cast * 10];
    limb(ctx, sh[0] + dir * 6, sh[1] + 6, hand[0], hand[1], 7, skin);
    if (f.style === 'shield') {
      var sx = sh[0] + dir * (pose.guard ? 26 : 14), sy = sh[1] + (pose.guard ? 22 : 34);
      ctx.fillStyle = '#6A4A2A'; ctx.strokeStyle = '#B8B8B8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B8B8B8'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (f.style === 'dagger') weapon(ctx, f, bh[0], bh[1], 0.6, dir, pose);
    var wa = arm + (f.style === 'archer' && !pose.melee ? -arm : 0);
    if (f.style === 'great' || f.style === 'spear') wa = arm - 0.2;
    weapon(ctx, f, hand[0], hand[1], f.style === 'archer' && !pose.melee ? 0 : wa, dir, pose);
    if (pose.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,' + (0.45 * pose.flash) + ')'; ctx.beginPath(); ctx.ellipse(0, -70, 30, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  function sparks(ctx, x, y, k, n, col, seed) {
    for (var i = 0; i < n; i++) {
      var a = seeded(seed + i) * Math.PI * 2, sp = 20 + seeded(seed + i + 50) * 60;
      var px = x + Math.cos(a) * sp * k, py = y + Math.sin(a) * sp * k + k * k * 30;
      ctx.fillStyle = col; ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  function bolt(ctx, x1, y1, x2, y2, el, k, seed) {
    var c = EL[el] || EL.fire;
    var x = lerp(x1, x2, k), y = lerp(y1, y2, k) - Math.sin(Math.PI * k) * 18;
    if (el === 'shock') {
      ctx.strokeStyle = c[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1);
      for (var i = 1; i <= 8; i++) { var kk = i / 8 * k; ctx.lineTo(lerp(x1, x2, kk), lerp(y1, y2, kk) + (seeded(seed + i + Math.floor(k * 12)) - 0.5) * 22); }
      ctx.stroke(); ctx.strokeStyle = c[0]; ctx.lineWidth = 1.2; ctx.stroke();
      return;
    }
    for (var tl = 0; tl < 6; tl++) {
      var kt = Math.max(0, k - tl * 0.03), tx = lerp(x1, x2, kt), ty = lerp(y1, y2, kt) - Math.sin(Math.PI * kt) * 18;
      ctx.fillStyle = c[1]; ctx.globalAlpha = 0.5 - tl * 0.07; ctx.beginPath(); ctx.arc(tx, ty, 10 - tl, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    var rg = ctx.createRadialGradient(x, y, 1, x, y, 16);
    rg.addColorStop(0, c[0]); rg.addColorStop(0.6, c[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  }

  function arrowFly(ctx, x1, y1, x2, y2, k) {
    var x = lerp(x1, x2, k), y = lerp(y1, y2, k) - Math.sin(Math.PI * k) * 14;
    var a = Math.atan2((y2 - y1) - 14 * Math.PI * Math.cos(Math.PI * k), x2 - x1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    limb(ctx, -26, 0, 4, 0, 2, '#C9A06A');
    ctx.fillStyle = '#D8DEE6'; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, 0); ctx.lineTo(4, 3); ctx.fill();
    ctx.fillStyle = '#EDE3D4'; ctx.fillRect(-28, -4, 6, 3); ctx.fillRect(-28, 1, 6, 3);
    ctx.restore();
  }

  function swingTrail(ctx, x, dir, k) {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - Math.abs(k - 0.5) * 2)) + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + dir * 10, GROUND - 100, 62, dir > 0 ? -2.0 : Math.PI + 2.0 - 2.6 * k, dir > 0 ? -2.0 + 2.6 * k : Math.PI + 2.0, false); ctx.stroke(); ctx.restore();
  }

  function floatText(ctx, x, y, text, col, k, big) {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
    ctx.font = (big ? '700 30px ' : '700 22px ') + 'Georgia, serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(text, x, y - k * 46);
    ctx.fillStyle = col; ctx.fillText(text, x, y - k * 46); ctx.restore();
  }

  function banner(ctx, text, sub) {
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 230, 14, 460, sub ? 62 : 42);
    ctx.font = '600 24px Georgia, serif'; ctx.fillStyle = '#FFF6E2'; ctx.fillText(text, W / 2, 43);
    if (sub) { ctx.font = '14px ui-monospace, monospace'; ctx.fillStyle = '#CFC2A4'; ctx.fillText(sub, W / 2, 66); }
    ctx.restore();
  }

  function draw(cv, m, now, onImpact) {
    var ctx = setup(cv);
    var F = m.styles || [{}, {}];
    var t = now;
    var pose = [{}, {}], x = BASE.slice(), shake = 0, fx = [];
    var L = m.log ? m.log.length : 0;
    var step = (m.endAt - m.startAt) / (L + 1);
    var done = m.phase === 'done' || (m.phase === 'fight' && now >= m.startAt + step * L);
    var cur = -1, k = 0;
    if (m.phase === 'fight' && L && !done) { cur = Math.floor((now - m.startAt) / step); k = (now - m.startAt) / step - cur; if (cur >= L) { cur = L - 1; k = 1; } }
    if (m.phase === 'fight' && now < m.startAt + step * 0.5 && cur <= 0) {
      var w = ease(Math.min(1, (now - m.startAt) / (step * 0.5)));
      x = [lerp(140, BASE[0], w), lerp(W - 140, BASE[1], w)]; pose[0].stride = pose[1].stride = Math.sin(now / 90) * (1 - w);
    }
    if (cur >= 0) {
      var ev = m.log[cur], a = ev.by, d = 1 - a, dirA = a === 0 ? 1 : -1;
      var mv = ev.move || 'blade', fA = F[a] || {};
      var melee = mv === 'blade' || mv === 'bash' || !((fA.style === 'archer' && mv === 'arrow') || (fA.style === 'mage' && mv === 'spell'));
      if (mv === 'arrow' || mv === 'spell') melee = false;
      var hitAt = 0.6, after = Math.max(0, (k - hitAt) / (1 - hitAt));
      var final = cur === L - 1;
      if (melee) {
        pose[a].melee = true;
        var reach = BASE[d] - dirA * (F[a].style === 'spear' ? 145 : 112);
        var go = k < 0.45 ? ease(k / 0.45) : (k < 0.7 ? 1 : 1 - ease((k - 0.7) / 0.3));
        x[a] = lerp(BASE[a], reach, go);
        pose[a].stride = k < 0.45 ? Math.sin(k * 30) : 0;
        pose[a].arm = k < 0.45 ? lerp(-0.4, -2.2, ease(k / 0.45)) : (k < 0.62 ? lerp(-2.2, 0.9, ease((k - 0.45) / 0.17)) : lerp(0.9, -0.4, ease((k - 0.62) / 0.38)));
        if (mv === 'bash') { pose[a].arm = -0.2; pose[a].guard = true; pose[a].lean = go * 0.5; }
        else pose[a].lean = go * (ev.kind === 'power' ? 0.6 : 0.3);
        if (mv !== 'bash') { ctx.__trail = [x[a], dirA, (k - 0.45) / 0.2]; }
      } else if (mv === 'arrow') {
        pose[a].draw = k < 0.4 ? ease(k / 0.4) : 0;
      } else {
        pose[a].cast = k < 0.4 ? ease(k / 0.4) : Math.max(0, 1 - (k - 0.4) * 4);
        pose[a].lean = -0.1;
      }
      if (k >= hitAt) {
        var dirD = -dirA;
        if (ev.kind === 'dodge') { var hk = Math.sin(Math.min(1, after * 1.6) * Math.PI); pose[d].hop = hk * 26; x[d] = BASE[d] - dirA * -1 * 0 + dirA * hk * 34; pose[d].lean = -0.4 * hk; }
        else if (ev.kind === 'block') { pose[d].guard = true; x[d] = BASE[d] + dirA * 8 * (1 - after); }
        else { var push = (ev.kind === 'power' ? 34 : 16) * Math.sin(Math.min(1, after * 2) * Math.PI / 2) * (final ? 1.4 : 1); x[d] = BASE[d] + dirA * push * (final ? 1 : (1 - after)); pose[d].flash = Math.max(0, 1 - after * 2); pose[d].lean = -0.3 * (1 - after); if (ev.kind === 'power') shake = (1 - after) * 8; }
        if (final && ev.kind !== 'dodge' && ev.kind !== 'block') pose[d].down = ease(Math.max(0, (after - 0.25) / 0.75));
      } else if (melee || k > 0.3) {
        if (ev.kind === 'block' && k > 0.4) pose[d].guard = true;
      }
      fx.push({ ev: ev, a: a, d: d, k: k, after: after, hitAt: hitAt, melee: melee, cur: cur, final: final });
      if (onImpact && k >= hitAt && ready[cur] !== m.no + ':' + cur) { ready[cur] = m.no + ':' + cur; onImpact(ev, final); }
    }
    if (done && L) { var last = m.log[L - 1]; var loser = 1 - last.by; pose[loser].down = 1; pose[last.by].arm = -2.4; pose[last.by].melee = true; x[loser] = BASE[loser] + (last.by === 0 ? 1 : -1) * 30; }
    ctx.save();
    if (shake) ctx.translate((seeded(now) - 0.5) * shake, (seeded(now + 1) - 0.5) * shake);
    backdrop(ctx, t);
    var order = pose[0].down ? [0, 1] : [1, 0];
    order.forEach(function (i) { fighter(ctx, F[i] || {}, x[i], i === 0 ? 1 : -1, pose[i], t, i); });
    if (ctx.__trail) { var tr = ctx.__trail; swingTrail(ctx, tr[0], tr[1], tr[2]); ctx.__trail = null; }
    fx.forEach(function (f) {
      var ev = f.ev, dirA = f.a === 0 ? 1 : -1, sx = x[f.a] + dirA * 50, sy = GROUND - 128, tx = x[f.d], ty = GROUND - 112;
      if (ev.move === 'arrow' && !f.melee && f.k >= 0.4 && f.k < f.hitAt) arrowFly(ctx, sx, sy, ev.kind === 'dodge' ? tx + dirA * 140 : tx - dirA * 14, ev.kind === 'dodge' ? ty - 30 : ty, (f.k - 0.4) / (f.hitAt - 0.4));
      if (ev.move === 'spell' && !f.melee && f.k >= 0.35 && f.k < f.hitAt) bolt(ctx, sx, sy, ev.kind === 'dodge' ? tx + dirA * 160 : tx, ev.kind === 'dodge' ? ty - 40 : ty, ev.el, (f.k - 0.35) / (f.hitAt - 0.35), f.cur * 31);
      if (f.k >= f.hitAt) {
        var ix = tx - dirA * 22, iy = GROUND - 112;
        if (ev.kind === 'block') { sparks(ctx, ix, iy, f.after, 18, '#FFE29A', f.cur * 7); floatText(ctx, tx, GROUND - 180, 'Blocked ' + ev.dmg, '#CFE4FF', f.after); }
        else if (ev.kind === 'dodge') floatText(ctx, tx, GROUND - 180, 'Dodged!', '#BFE6FF', f.after);
        else {
          var col = ev.move === 'spell' ? (EL[ev.el] || EL.fire)[1] : '#E2574A';
          sparks(ctx, ix, iy, f.after, ev.kind === 'power' ? 26 : 14, ev.move === 'spell' ? (EL[ev.el] || EL.fire)[0] : '#FF8A6A', f.cur * 13);
          if (ev.move === 'arrow' && f.after < 0.9) arrowFly(ctx, ix - dirA * 6, iy, ix, iy, 1);
          floatText(ctx, tx, GROUND - 180, (ev.kind === 'power' ? 'CRUSHING ' : '') + '−' + ev.dmg, ev.kind === 'power' ? '#FFD36A' : '#FFF6E2', f.after, ev.kind === 'power');
          if (ev.move === 'spell') { var rg = ctx.createRadialGradient(ix, iy, 2, ix, iy, 60 * (1 - f.after) + 8); rg.addColorStop(0, (EL[ev.el] || EL.fire)[0]); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 1 - f.after; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ix, iy, 70, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        }
      }
    });
    ctx.restore();
    if (m.phase === 'bet') banner(ctx, 'Bout ' + m.no, 'The fighters step in when the betting closes');
    if (done && L) { var lw = m.log[L - 1].by; banner(ctx, (m.names || [])[lw] + ' wins!', m.phase === 'done' ? 'The next pair is coming' : 'The crowd roars'); }
  }

  window.InnArena = { draw: draw };
})();
