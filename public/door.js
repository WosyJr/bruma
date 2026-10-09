(function () {
  var svg = document.getElementById('halleye');
  if (!svg) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PASS = {
    open:   { snow: .07, wind: .2 },
    riders: { snow: .34, wind: .5 },
    escort: { snow: .62, wind: .78 },
    shut:   { snow: 1,   wind: 1 }
  };
  var pm = document.querySelector('meta[name="bruma-pass"]');
  var pass = PASS[pm ? String(pm.getAttribute('content') || 'open') : 'open'] || PASS.open;

  var cv = document.getElementById('doorsnow');
  var ctx = cv && cv.getContext ? cv.getContext('2d') : null;
  var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  var flakes = [];

  function sizeSnow() {
    if (!ctx) return;
    W = Math.max(100, window.innerWidth);
    H = Math.max(100, window.innerHeight);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawSnow() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var want = Math.round(pass.snow * 170);
    while (flakes.length < want) {
      flakes.push({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .9,
        sw: Math.random() * 6.3 });
    }
    while (flakes.length > want) flakes.pop();
    for (var i = 0; i < flakes.length; i++) {
      var p = flakes[i];
      p.sw += .03;
      p.x += (0.7 + pass.wind * 4.2) * p.z + Math.sin(p.sw) * .6;
      p.y += (.34 + pass.wind * .62) * p.z;
      if (p.x > W + 6) { p.x = -6; p.y = Math.random() * H; }
      if (p.y > H + 6) { p.y = -6; p.x = Math.random() * W; }
      ctx.globalAlpha = (.18 + .4 * pass.snow) * p.z;
      ctx.fillStyle = '#F2E6CE';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.z * 1.5, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var NS = 'http://www.w3.org/2000/svg';
  var stria = document.getElementById('dstria');
  var rays = document.getElementById('drays');
  var iris = document.getElementById('diris');
  var pupil = document.getElementById('dpupil');
  var spark = document.getElementById('dspark');
  var ring1 = document.getElementById('dring1');
  var ring2 = document.getElementById('dring2');
  var lid = document.getElementById('dlid');
  var lidlow = document.getElementById('dlidlow');
  var halo = document.getElementById('dhalo');
  if (!iris || !pupil || !lid) return;

  var i, a;
  for (i = 0; i < 64; i++) {
    a = (i / 64) * Math.PI * 2;
    var r0 = 36 + (i % 3) * 4;
    var r1 = 78 - (i % 4) * 7;
    var l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', (250 + Math.cos(a) * r0).toFixed(1));
    l.setAttribute('y1', (200 + Math.sin(a) * r0).toFixed(1));
    l.setAttribute('x2', (250 + Math.cos(a) * r1).toFixed(1));
    l.setAttribute('y2', (200 + Math.sin(a) * r1).toFixed(1));
    stria.appendChild(l);
  }

  [-90, -58, -26, 26, 58, 90, 122, 154, 206, 238, 270, 302].forEach(function (deg, n) {
    var t = deg * Math.PI / 180;
    var p = document.createElementNS(NS, 'line');
    p.setAttribute('x1', (250 + Math.cos(t) * 248 * 1.02).toFixed(1));
    p.setAttribute('y1', (200 + Math.sin(t) * 168 * 1.02).toFixed(1));
    p.setAttribute('x2', (250 + Math.cos(t) * 248 * 1.13).toFixed(1));
    p.setAttribute('y2', (200 + Math.sin(t) * 168 * 1.13).toFixed(1));
    p.style.opacity = '0';
    p.style.transition = 'opacity .5s ease ' + (0.9 + n * 0.045) + 's';
    rays.appendChild(p);
  });

  var tx = 0, ty = 0, cx = 0, cy = 0, spin = 0;
  var blink = 0, nextBlink = 2600 + Math.random() * 3200;
  var dil = 0, started = 0, last = 0;

  window.addEventListener('mousemove', function (e) {
    var b = svg.getBoundingClientRect();
    if (!b.width) return;
    var px = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
    var py = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
    var d = Math.sqrt(px * px + py * py) || 1;
    var cl = Math.min(1, d) / d;
    tx = px * cl * 40;
    ty = py * cl * 26;
  }, { passive: true });

  svg.addEventListener('mouseenter', function () { dil = 7; });
  svg.addEventListener('mouseleave', function () { dil = 0; });

  var running = false;
  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(64, t - last);
    last = t;
    if (!started) started = t;
    var age = t - started;

    drawSnow();

    cx += (tx - cx) * 0.065;
    cy += (ty - cy) * 0.065;
    iris.setAttribute('transform', 'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ')');

    spin += dt * 0.0075;
    ring1.setAttribute('transform', 'rotate(' + spin.toFixed(2) + ' 250 200)');
    ring2.setAttribute('transform', 'rotate(' + (-spin * 1.75).toFixed(2) + ' 250 200)');

    var r = 33 + Math.sin(t / 1400) * 2.4 + dil;
    pupil.setAttribute('r', Math.max(15, r).toFixed(2));
    spark.setAttribute('opacity', (0.62 + Math.sin(t / 900) * 0.16).toFixed(3));
    halo.setAttribute('opacity', (0.38 + Math.sin(t / 1700) * 0.14).toFixed(3));

    nextBlink -= dt;
    if (nextBlink <= 0 && blink <= 0) { blink = 270; nextBlink = 3600 + Math.random() * 5200; }
    var open = 0;
    if (blink > 0) {
      blink -= dt;
      open = Math.max(0, Math.min(1, 1 - Math.abs(1 - (270 - blink) / 135)));
    }
    var intro = age < 1500 ? 1 - Math.min(1, Math.pow(age / 1200, 0.55)) : 0;
    var shut = Math.max(open, intro);
    lid.setAttribute('y', (-240 + shut * 445).toFixed(1));
    lidlow.setAttribute('y', (390 - shut * 230).toFixed(1));

    if (running) requestAnimationFrame(frame);
  }

  sizeSnow();
  window.addEventListener('resize', sizeSnow);

  if (reduce) {
    lid.setAttribute('y', '-240');
    lidlow.setAttribute('y', '390');
    [].forEach.call(rays.children, function (p) { p.style.opacity = '.62'; });
    drawSnow();
    return;
  }

  running = true;
  requestAnimationFrame(frame);
  setTimeout(function () {
    [].forEach.call(rays.children, function (p) { p.style.opacity = '.62'; });
  }, 60);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  });
})();
