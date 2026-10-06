(function () {
  var body = document.body;
  var ON = (body.getAttribute('data-flourish') || '').split(/\s+/).filter(Boolean);
  var has = function (k) { return ON.indexOf(k) >= 0; };
  if (!ON.length) return;
  var slow = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function meta(name, fallback) {
    var m = document.querySelector('meta[name="' + name + '"]');
    var v = m ? Number(m.getAttribute('content')) : NaN;
    return Number.isFinite(v) ? v : fallback;
  }

  if (has('sky')) sky();
  if (has('raven')) ravens();
  if (has('loom')) loom();
  if (has('table')) warTable();

  function sky() {
    var cv = document.getElementById('skyfield');
    if (!cv || !cv.getContext) return;
    var cx = cv.getContext('2d');
    var unrest = Math.max(0, Math.min(100, meta('bruma-unrest', 0))) / 100;
    var stars = [], windows = [], town = [], tower = 70, W = 0, H = 0, t0 = performance.now();

    function size() {
      var r = cv.getBoundingClientRect();
      var d = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(320, Math.round(r.width));
      H = Math.max(120, Math.round(r.height));
      cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
      stars = [];
      for (var i = 0; i < 190; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.78, r: Math.random() * 1.1 + 0.25, p: Math.random() * 6.28 });
      windows = []; town = []; tower = Math.min(120, H * 0.16);
      var base = H + 2;
      for (var b = 0; b < 18; b++) {
        var mid = Math.abs(b - 8.5) / 8.5;
        var bw = 26 + Math.random() * 30;
        var bx = (b / 18) * W + Math.random() * 8;
        var bh = H * 0.035 + (1 - mid) * (H * 0.055) + Math.random() * H * 0.022;
        town.push({ x: bx, w: bw, h: bh, roof: 8 + Math.random() * 9 });
        for (var wy = 0; wy < Math.floor(bh / 13); wy++) {
          for (var wx = 0; wx < Math.floor(bw / 14); wx++) {
            windows.push({ x: bx + 7 + wx * 13, y: base - bh + 9 + wy * 13, on: Math.random(), lit: 0 });
          }
        }
      }
      for (var ty = 0; ty < 5; ty++) windows.push({ x: W * 0.5 - 5, y: base - tower + 16 + ty * 16, on: Math.random() * 0.4, lit: 0 });
    }

    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }

    function colors(h) {
      var night = [[10, 11, 20], [20, 17, 26]], dawn = [[56, 40, 46], [168, 110, 68]],
        day = [[74, 102, 136], [150, 166, 182]], dusk = [[40, 27, 34], [172, 92, 46]];
      if (h < 4.5) return night;
      if (h < 7) return [mix(night[0], dawn[0], (h - 4.5) / 2.5), mix(night[1], dawn[1], (h - 4.5) / 2.5)];
      if (h < 9) return [mix(dawn[0], day[0], (h - 7) / 2), mix(dawn[1], day[1], (h - 7) / 2)];
      if (h < 16) return day;
      if (h < 18.5) return [mix(day[0], dusk[0], (h - 16) / 2.5), mix(day[1], dusk[1], (h - 16) / 2.5)];
      if (h < 20.5) return [mix(dusk[0], night[0], (h - 18.5) / 2), mix(dusk[1], night[1], (h - 18.5) / 2)];
      return night;
    }
    function nightness(h) {
      if (h >= 21 || h < 4.5) return 1;
      if (h < 6.5) return 1 - (h - 4.5) / 2;
      if (h > 19) return (h - 19) / 2;
      return 0;
    }
    function ridge(yBase, amp, seed, fill) {
      cx.beginPath(); cx.moveTo(0, H);
      for (var x = 0; x <= W; x += 7) {
        var y = yBase + Math.sin((x + seed) * 0.0062) * amp + Math.sin((x + seed) * 0.0183) * amp * 0.45 + Math.sin((x + seed) * 0.041) * amp * 0.16;
        cx.lineTo(x, y);
      }
      cx.lineTo(W, H); cx.closePath(); cx.fillStyle = fill; cx.fill();
    }

    function draw(now) {
      var d = new Date();
      var h = d.getHours() + d.getMinutes() / 60;
      var night = nightness(h), time = (now - t0) / 1000, un = unrest;
      var c = colors(h), g = cx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgb(c[0])); g.addColorStop(1, rgb(c[1]));
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);

      if (night > 0.02) {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i], tw = 0.55 + 0.45 * Math.sin(time * 1.5 + s.p);
          cx.globalAlpha = night * tw * 0.85; cx.fillStyle = '#F7EEDC';
          cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
        }
        cx.globalAlpha = 1;
      }

      if (night > 0.05 && un > 0.02) {
        var bands = 1 + Math.round(un * 4), speed = 0.08 + un * 0.45;
        for (var b = 0; b < bands; b++) {
          var off = b * 30, hue = 128 - un * 118 + b * 7, amp = 12 + un * 26 + b * 4;
          var grd = cx.createLinearGradient(0, 0, 0, H * 0.7);
          grd.addColorStop(0, 'hsla(' + hue + ',76%,56%,0)');
          grd.addColorStop(0.44, 'hsla(' + hue + ',80%,' + (52 + un * 10) + '%,' + (0.1 + un * 0.34) * night + ')');
          grd.addColorStop(1, 'hsla(' + (hue + 28) + ',78%,44%,0)');
          cx.beginPath(); cx.moveTo(-20, H);
          for (var x = -20; x <= W + 20; x += 9) {
            var y = H * 0.1 + off + Math.sin(x * 0.0072 + time * speed + b) * amp + Math.sin(x * 0.02 + time * speed * 1.7 + b * 2) * amp * 0.4;
            cx.lineTo(x, y);
          }
          for (var x2 = W + 20; x2 >= -20; x2 -= 9) {
            var y2 = H * 0.1 + off + 46 + un * 34 + Math.sin(x2 * 0.0072 + time * speed + b) * amp;
            cx.lineTo(x2, y2);
          }
          cx.closePath(); cx.fillStyle = grd; cx.fill();
        }
      }

      var ang = (h / 24 - 0.25) * 6.283;
      var bx = W * 0.5 + Math.cos(ang) * W * 0.46, by = H * 0.86 + Math.sin(ang) * H * 0.72;
      var isDay = h > 6 && h < 19.5;
      var halo = cx.createRadialGradient(bx, by, 0, bx, by, isDay ? 60 : 38);
      halo.addColorStop(0, isDay ? 'rgba(255,224,150,.85)' : 'rgba(234,234,222,.8)');
      halo.addColorStop(1, 'rgba(255,214,130,0)');
      cx.fillStyle = halo; cx.beginPath(); cx.arc(bx, by, isDay ? 60 : 38, 0, 6.283); cx.fill();
      cx.fillStyle = isDay ? '#FFE9AE' : '#E8E6DA';
      cx.beginPath(); cx.arc(bx, by, isDay ? 12 : 8, 0, 6.283); cx.fill();

      ridge(H * 0.70, H * 0.055, 0, 'rgba(26,22,30,' + (0.5 + night * 0.3) + ')');
      ridge(H * 0.80, H * 0.042, 420, 'rgba(20,16,23,' + (0.68 + night * 0.22) + ')');
      ridge(H * 0.89, H * 0.028, 900, '#131017');

      cx.fillStyle = '#0C0A09';
      for (var b2 = 0; b2 < town.length; b2++) {
        var T = town[b2];
        cx.fillRect(T.x, H - T.h, T.w, T.h + 20);
        cx.beginPath(); cx.moveTo(T.x - 3, H - T.h);
        cx.lineTo(T.x + T.w / 2, H - T.h - T.roof); cx.lineTo(T.x + T.w + 3, H - T.h);
        cx.closePath(); cx.fill();
      }
      cx.beginPath(); cx.moveTo(W * 0.5 - 16, H - tower);
      cx.lineTo(W * 0.5, H - tower - 26); cx.lineTo(W * 0.5 + 16, H - tower);
      cx.closePath(); cx.fill();
      cx.fillRect(W * 0.5 - 13, H - tower, 26, tower + 10);

      var want = h > 17.5 || h < 6.5 ? 1 : 0;
      for (var k = 0; k < windows.length; k++) {
        var wn = windows[k];
        var target = want && wn.on < night * 0.85 + 0.1 ? 1 : 0;
        wn.lit += (target - wn.lit) * (0.012 + wn.on * 0.05);
        if (wn.lit > 0.01) { cx.globalAlpha = wn.lit * 0.9; cx.fillStyle = '#E09A3E'; cx.fillRect(wn.x, wn.y, 5, 6); }
      }
      cx.globalAlpha = 1;
    }

    var raf = null, visible = true;
    function tick(now) { if (visible) draw(now); raf = requestAnimationFrame(tick); }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
    window.addEventListener('resize', size);
    size();
    if (slow) draw(performance.now()); else raf = requestAnimationFrame(tick);
  }

  function ravens() {
    var post = document.querySelector('[data-ravens]');
    if (!post) return;
    var items = [];
    try { items = JSON.parse(post.getAttribute('data-ravens') || '[]'); } catch (e) { return; }
    if (!items.length) return;
    items = items.slice(0, 3);

    var perch = document.createElement('div');
    perch.className = 'ravenperch';
    perch.setAttribute('aria-hidden', 'true');
    post.appendChild(perch);

    var SVG = '<svg viewBox="0 0 76 62" width="78" height="64">' +
      '<ellipse cx="40" cy="36" rx="19" ry="10" fill="#17120F"/>' +
      '<path d="M58 33 L74 42 L57 40 Z" fill="#14100D"/>' +
      '<circle cx="24" cy="29" r="8.5" fill="#17120F"/>' +
      '<path d="M16 28 L4 30.5 L16 33 Z" fill="#C9A06A"/>' +
      '<circle cx="22" cy="27" r="1.7" fill="#E8B870"/>' +
      '<path d="M38 40 L36 50 M45 40 L47 50" stroke="#3A2A1C" stroke-width="2.2" stroke-linecap="round"/>' +
      '<g class="wing"><path d="M34 31 C44 20 58 20 64 28 C56 33 44 35 34 31 Z" fill="#1F1915"/></g>' +
      '</svg>';

    items.forEach(function (it, i) {
      var a = document.createElement('a');
      a.className = 'raven';
      a.href = it.href || '/hall';
      a.title = it.what || 'Something waits';
      a.setAttribute('aria-label', it.what || 'Something waits for you');
      a.innerHTML = SVG + '<span class="ravensay">' + (it.what || '').replace(/[<>&]/g, '') + '</span>';
      perch.appendChild(a);
      var spot = { x: i * 66, y: 0 };
      if (slow) { a.style.transform = 'translate(' + spot.x + 'px,0)'; a.style.opacity = '1'; return; }
      var from = { x: 300 + i * 40, y: -70 - Math.random() * 30 };
      var start = null, dur = 1400 + Math.random() * 300, delay = 420 + i * 340;
      a.style.opacity = '0';
      requestAnimationFrame(function step(ts) {
        if (start === null) start = ts + delay;
        var p = (ts - start) / dur;
        if (p < 0) { requestAnimationFrame(step); return; }
        a.style.opacity = '1';
        p = Math.min(1, p);
        var e = 1 - Math.pow(1 - p, 2.4);
        var x = from.x + (spot.x - from.x) * e;
        var y = from.y + (spot.y - from.y) * e - Math.sin(p * 3.14) * 26;
        a.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + (p < 0.92 ? -6 : 0) + 'deg)';
        var w = a.querySelector('.wing');
        if (w) w.style.transform = p < 0.92 ? 'rotate(' + Math.sin(ts / 58) * 16 + 'deg)' : 'rotate(0deg)';
        if (p < 1) requestAnimationFrame(step); else a.classList.add('perched');
      });
    });
  }

  function loom() {
    if (slow) return;
    var tables = document.querySelectorAll('.tablewrap table, table.roll');
    if (!tables.length) return;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { weave(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '80px' }) : null;

    [].forEach.call(tables, function (tb) {
      var rows = tb.querySelectorAll('tbody tr');
      if (rows.length < 2 || rows.length > 60) return;
      tb.classList.add('loomed');
      if (io) io.observe(tb); else weave(tb);
    });

    function weave(tb) {
      var rows = tb.querySelectorAll('tbody tr');
      var wrap = tb.closest('.tablewrap') || tb.parentNode;
      var shuttle = document.createElement('i');
      shuttle.className = 'shuttle';
      shuttle.setAttribute('aria-hidden', 'true');
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      wrap.appendChild(shuttle);
      var step = rows.length > 24 ? 42 : rows.length > 12 ? 74 : 120;
      [].forEach.call(rows, function (tr, i) {
        setTimeout(function () {
          tr.classList.add('woven');
          var r = tr.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
          shuttle.style.top = (r.top - wr.top + r.height / 2 - 4) + 'px';
          shuttle.style.transition = 'none';
          shuttle.style.left = '4px';
          shuttle.style.opacity = '1';
          requestAnimationFrame(function () {
            shuttle.style.transition = 'left .42s cubic-bezier(.22,.9,.3,1), opacity .22s ease .3s';
            shuttle.style.left = Math.max(40, wr.width - 30) + 'px';
            shuttle.style.opacity = '0';
          });
          if (i === rows.length - 1) setTimeout(function () { shuttle.remove(); }, 700);
        }, i * step);
      });
    }
  }

  function warTable() {
    var maps = document.querySelectorAll('.mapwrap');
    if (!maps.length) return;
    [].forEach.call(maps, function (map) {
      var room = document.createElement('div');
      room.className = 'warroom';
      map.parentNode.insertBefore(room, map);
      room.appendChild(map);
      map.classList.add('ontable');

      var tilt = { x: 0, y: 0 }, raf = null;
      function apply() {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          map.style.transform = 'rotateX(' + (8 - tilt.y * 7) + 'deg) rotateZ(' + (tilt.x * 2.6) + 'deg)';
        });
      }
      room.addEventListener('mousemove', function (e) {
        var r = room.getBoundingClientRect();
        tilt.x = (e.clientX - r.left) / r.width - 0.5;
        tilt.y = (e.clientY - r.top) / r.height - 0.5;
        apply();
      });
      room.addEventListener('mouseleave', function () { tilt.x = 0; tilt.y = 0; apply(); });
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        tilt.x = Math.max(-1, Math.min(1, e.gamma / 34));
        tilt.y = Math.max(-1, Math.min(1, ((e.beta || 40) - 40) / 34));
        apply();
      });
      apply();
    });
  }
})();
