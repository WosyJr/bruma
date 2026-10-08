(function () {
  var cv = document.getElementById('passwin');
  if (!cv || !cv.getContext) return;
  var win = cv.parentNode;
  var ctx = cv.getContext('2d');
  var slow = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function meta(name, fallback) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? String(m.getAttribute('content') || fallback) : fallback;
  }

  var PASS = {
    open:   { snow: .05, wind: .22, haze: .08, lamps: 0,  gate: 0,   aurora: 1,  stars: 1,   chill: 0 },
    riders: { snow: .3,  wind: .5,  haze: .3,  lamps: .3, gate: .25, aurora: .7, stars: .75, chill: .25 },
    escort: { snow: .62, wind: .82, haze: .6,  lamps: 1,  gate: .55, aurora: .2, stars: .25, chill: .5 },
    shut:   { snow: 1,   wind: 1,   haze: 1,   lamps: 0,  gate: 1,   aurora: 0,  stars: 0,   chill: 1 }
  };
  var state = meta('bruma-pass', 'open');
  var b = PASS[state] || PASS.open;

  var mx = 0, my = 0, px = 0, py = 0;
  var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  var far = null, shProf = null, flakes = [], stars = [], lamps = [];

  for (var s = 0; s < 70; s++) {
    stars.push({ x: Math.random(), y: Math.random() * .4, t: Math.random() * 6.3 });
  }
  for (var l = 0; l < 4; l++) lamps.push({ p: Math.random() });

  function size() {
    var r = cv.getBoundingClientRect();
    W = Math.max(200, r.width); H = Math.max(160, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    far = null;
  }

  function noise(i, seed) {
    return Math.sin(i * .55 + seed) * .6 + Math.sin(i * 1.27 + seed * 2.3) * .3
         + Math.sin(i * 2.9 + seed * .7) * .14;
  }

  function build() {
    far = [];
    for (var L = 0; L < 3; L++) {
      var pts = [], steps = 44, seed = L * 13.7 + 2.1;
      var baseY = H * (0.28 + L * 0.052), amp = H * (0.15 - L * 0.034);
      for (var i = 0; i <= steps; i++) {
        pts.push([(i / steps) * (W * 1.5) - W * 0.25, baseY - noise(i, seed) * amp]);
      }
      far.push({ pts: pts, depth: (L + 1) / 3 });
    }
    shProf = [];
    for (var S = 0; S < 2; S++) {
      var a = [], st = 26, sd = 31.4 + S * 9.3;
      for (var q = 0; q <= st; q++) a.push(noise(q, sd));
      shProf.push(a);
    }
  }

  function hx(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, c, t) {
    var A = hx(a), B = hx(c);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t)
      + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }

  function vanish() { return { x: W * 0.5 + px * 16, y: H * 0.455 + py * 7 }; }
  function edgeAt(e) {
    var v = vanish(), cx = W * 0.5 + px * 70;
    return {
      x: v.x + (cx - v.x) * e, y: v.y + (H + 34 - v.y) * e,
      half: 4 + (W * 0.135 - 4) * (e * e * .66 + e * .34)
    };
  }

  function shoulder(S) {
    var v = vanish(), prof = shProf[S], steps = prof.length - 1;
    var peak = H * (S ? 0.30 : 0.17), amp = H * (S ? 0.055 : 0.07);
    var lip = S ? 22 : 7;
    for (var k = 0; k < 2; k++) {
      var side = k ? 1 : -1;
      var outX = side < 0 ? -W * 0.16 : W * 1.16;
      var nx = v.x + side * (10 + S * 22), ny = v.y + 3 + S * 10;
      var i, f, e, E;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      for (i = 1; i <= steps; i++) {
        f = i / steps;
        ctx.lineTo(nx + (outX - nx) * f, ny - peak * Math.pow(f, .58) + prof[i] * amp * f);
      }
      ctx.lineTo(outX, H + 44);
      for (e = 1; e >= -0.001; e -= 1 / 16) {
        E = edgeAt(Math.max(0, e));
        ctx.lineTo(E.x + side * (E.half + lip * (0.25 + e)), E.y);
      }
      ctx.closePath();
      ctx.fillStyle = S ? mix('#0D141D', '#1A242E', b.haze) : mix('#19242F', '#2A3642', b.haze);
      ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(228,241,253,' + (S ? .075 : .13) + ')';
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      for (i = 1; i <= steps; i++) {
        f = i / steps;
        ctx.lineTo(nx + (outX - nx) * f, ny - peak * Math.pow(f, .58) + prof[i] * amp * f);
      }
      for (i = steps; i >= 1; i--) {
        f = i / steps;
        ctx.lineTo(nx + (outX - nx) * f, ny - peak * Math.pow(f, .58) + prof[i] * amp * f + 9 + 30 * f);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  var last = 0;
  function draw(t) {
    var dt = last ? Math.min(60, t - last) : 16;
    last = t;
    px += (mx - px) * .06; py += (my - py) * .06;
    if (!far) build();

    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix('#14233A', '#1A2733', b.haze));
    sky.addColorStop(.52, mix('#3A3348', '#2C3A47', b.haze));
    sky.addColorStop(1, mix('#5B3A24', '#43515E', b.haze));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    var i;
    if (b.stars > .02) {
      for (i = 0; i < stars.length; i++) {
        var st = stars[i];
        ctx.globalAlpha = b.stars * (.3 + Math.sin(t / 700 + st.t) * .3);
        ctx.fillStyle = '#EAF2FF';
        ctx.fillRect(st.x * W - px * 4, st.y * H - py * 3, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    }

    if (b.aurora > .02) {
      for (var a = 0; a < 3; a++) {
        ctx.beginPath();
        for (var xx = 0; xx <= W; xx += 14) {
          var yy = H * (.12 + a * .05) + Math.sin(xx / 150 + t / 2100 + a) * H * .05
                 + Math.sin(xx / 61 + t / 1500) * H * .02 - py * 5;
          if (xx === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
        var ag = ctx.createLinearGradient(0, H * .04, 0, H * .34);
        ag.addColorStop(0, 'rgba(86,210,160,0)');
        ag.addColorStop(.55, 'rgba(86,210,160,' + (.12 * b.aurora) + ')');
        ag.addColorStop(1, 'rgba(120,110,220,0)');
        ctx.fillStyle = ag; ctx.fill();
      }
    }

    for (var r = 0; r < far.length; r++) {
      var R = far[r];
      var shift = px * (5 + R.depth * 22), lift = py * (2 + R.depth * 8);
      ctx.fillStyle = mix(mix('#2F4055', '#1A2430', R.depth), mix('#485D70', '#232F3B', R.depth), b.haze);
      ctx.beginPath();
      ctx.moveTo(R.pts[0][0] + shift, R.pts[0][1] + lift);
      for (var q = 1; q < R.pts.length; q++) ctx.lineTo(R.pts[q][0] + shift, R.pts[q][1] + lift);
      ctx.lineTo(W + 200, H + 50); ctx.lineTo(-200, H + 50); ctx.closePath();
      ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(224,238,250,' + (.08 + .1 * R.depth) + ')';
      ctx.beginPath();
      ctx.moveTo(R.pts[0][0] + shift, R.pts[0][1] + lift);
      for (var q2 = 1; q2 < R.pts.length; q2++) ctx.lineTo(R.pts[q2][0] + shift, R.pts[q2][1] + lift);
      for (var q3 = R.pts.length - 1; q3 >= 0; q3--) {
        ctx.lineTo(R.pts[q3][0] + shift, R.pts[q3][1] + lift + 12 + R.depth * 14);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    var e0 = edgeAt(0);
    ctx.beginPath();
    ctx.moveTo(e0.x - e0.half, e0.y);
    ctx.lineTo(e0.x + e0.half, e0.y);
    for (var re = 0.1; re <= 1.0001; re += 0.1) { var RE = edgeAt(re); ctx.lineTo(RE.x + RE.half, RE.y); }
    for (var rf = 1; rf >= 0; rf -= 0.1) { var RF = edgeAt(rf); ctx.lineTo(RF.x - RF.half, RF.y); }
    ctx.closePath();
    var rg = ctx.createLinearGradient(0, e0.y, 0, H);
    rg.addColorStop(0, 'rgba(232,243,255,' + (.2 + .4 * (1 - b.haze)) + ')');
    rg.addColorStop(1, 'rgba(150,170,192,' + (.03 + .09 * (1 - b.haze)) + ')');
    ctx.fillStyle = rg; ctx.fill();

    var v2 = vanish(), gw = e0.half + 9, gt = e0.y - 24;
    ctx.strokeStyle = 'rgba(20,14,9,' + (.55 + .35 * (1 - b.haze)) + ')';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(v2.x - gw, e0.y + 4); ctx.lineTo(v2.x - gw, gt);
    ctx.moveTo(v2.x + gw, e0.y + 4); ctx.lineTo(v2.x + gw, gt);
    ctx.moveTo(v2.x - gw - 4, gt); ctx.lineTo(v2.x + gw + 4, gt);
    ctx.stroke();
    if (b.gate > .04) {
      ctx.strokeStyle = 'rgba(224,154,62,' + (.4 + .5 * b.gate) + ')';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(v2.x - gw, gt + (1 - b.gate) * 17);
      ctx.lineTo(v2.x + gw, gt + (1 - b.gate) * 17 + 2);
      ctx.stroke();
    }

    if (b.lamps > .05) {
      for (var li = 0; li < lamps.length; li++) {
        var lp = lamps[li];
        lp.p += dt / 24000;
        if (lp.p > 1) lp.p = 0;
        var ee = Math.pow(lp.p, 2);
        var LE = edgeAt(ee);
        var lx = LE.x + (li - 1.5) * LE.half * .28, ly = LE.y, rr = 3 + ee * 9;
        ctx.globalAlpha = b.lamps * (.5 + Math.sin(t / 180 + li) * .25);
        var lg2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, rr);
        lg2.addColorStop(0, 'rgba(255,198,110,.95)'); lg2.addColorStop(1, 'rgba(255,170,70,0)');
        ctx.fillStyle = lg2; ctx.beginPath(); ctx.arc(lx, ly, rr, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    shoulder(0);
    shoulder(1);

    for (var vs = -1; vs <= 1; vs += 2) {
      ctx.beginPath();
      for (var ve = 0; ve <= 1.0001; ve += 0.08) {
        var VE = edgeAt(ve);
        var vx = VE.x + vs * (VE.half + 1);
        if (ve === 0) ctx.moveTo(vx, VE.y); else ctx.lineTo(vx, VE.y);
      }
      ctx.strokeStyle = 'rgba(214,232,250,' + (.1 + .16 * (1 - b.haze)) + ')';
      ctx.lineWidth = 2.2; ctx.stroke();
    }

    var fx = v2.x + gw + 16, fy = e0.y + 4;
    ctx.globalAlpha = (.5 + Math.sin(t / 230) * .2) * (.35 + .65 * (1 - b.haze));
    var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 22);
    fg.addColorStop(0, 'rgba(255,190,95,.9)'); fg.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, 22, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;

    var want = Math.round(b.snow * 150);
    while (flakes.length < want) {
      flakes.push({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .9,
        sw: Math.random() * 6.3 });
    }
    while (flakes.length > want) flakes.pop();
    for (var f = 0; f < flakes.length; f++) {
      var p = flakes[f];
      p.sw += .035;
      p.x += (1.2 + b.wind * 5.2) * p.z + Math.sin(p.sw) * .7;
      p.y += (.35 + b.wind * .7) * p.z;
      if (p.x > W + 6) { p.x = -6; p.y = Math.random() * H; }
      if (p.y > H + 6) { p.y = -6; p.x = Math.random() * W; }
      ctx.globalAlpha = (.26 + .5 * b.snow) * p.z;
      ctx.fillStyle = '#F2F8FF';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.z * 1.7, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (b.haze > .05) {
      ctx.fillStyle = 'rgba(206,224,240,' + (b.haze * .3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (running) requestAnimationFrame(draw);
  }

  var running = false;
  function start() { if (!running && !slow) { running = true; last = 0; requestAnimationFrame(draw); } }
  function stop() { running = false; }

  win.addEventListener('mousemove', function (e) {
    var r = win.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - .5) * 2;
    my = ((e.clientY - r.top) / r.height - .5) * 2;
  }, { passive: true });
  win.addEventListener('mouseleave', function () { mx = 0; my = 0; });

  size();
  window.addEventListener('resize', size);

  if (slow) { draw(0); } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0 }).observe(cv);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
})();
