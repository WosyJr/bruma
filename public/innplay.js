(function () {
  var inn = document.getElementById('inn');
  var tbl = document.getElementById('tbl');
  if (!inn || !tbl || inn.dataset.play) return;
  inn.dataset.play = '1';
  var game = inn.getAttribute('data-game');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noop = function () {};
  var Snd = window.InnSound || { click: noop, chip: noop, tick: noop, ball: noop, win: noop, big: noop, lose: noop, push: noop, dice: noop, card: noop };
  var UI = window.InnUI || {};
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  var setPurse = function (n) { if (UI.setPurse) UI.setPurse(n); else document.querySelectorAll('[data-purse]').forEach(function (el) { el.textContent = fmt(n); }); };
  var lastout = function (j) { if (j.tonight && UI.setTonight) UI.setTonight(j.tonight); if (!j.lastout) return; var lo = document.querySelector('[data-lastout]'); if (lo) lo.innerHTML = j.lastout; };
  var x2 = function (m) { return (Math.floor(m * 100) / 100).toFixed(2); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function send(form, sub, url) {
    var fd = new FormData(form);
    if (sub && sub.name) fd.append(sub.name, sub.value);
    var to = url || (sub && sub.getAttribute('formaction')) || form.getAttribute('action');
    return fetch(to, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fd).toString(), credentials: 'same-origin' })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); });
  }
  function sayIn(root, text, tone) {
    var s = (root || tbl).querySelector('[data-say]');
    if (!s) { s = document.createElement('p'); s.setAttribute('data-say', ''); (root || tbl).appendChild(s); }
    s.textContent = text || '';
    s.className = 'say' + (tone ? ' ' + tone : '');
  }
  function lock(on) { tbl.querySelectorAll('button, input, select').forEach(function (b) { if (on) { b.dataset.was = b.disabled ? '1' : ''; b.disabled = true; } else { b.disabled = b.dataset.was === '1'; } }); }
  function flash(tone) {
    if (window.InnBrannoc) window.InnBrannoc.mood(tone === 'good' ? 'win' : 'loss');
    if (reduce) return;
    inn.classList.remove('flash-good', 'flash-bad'); void inn.offsetWidth;
    inn.classList.add(tone === 'good' ? 'flash-good' : 'flash-bad');
  }
  function toneOf() { var s = tbl.querySelector('[data-say]'); return s ? (s.classList.contains('good') ? 'good' : (s.classList.contains('bad') ? 'bad' : '')) : ''; }

  (function () {
    if (!document.querySelector('[data-tourney]')) return;
    function tick() {
      var b = document.querySelector('[data-tourney]');
      if (!b) return;
      var end = Number(b.getAttribute('data-endat'));
      var el = b.querySelector('[data-tytime]');
      if (!el) return;
      var ms = end - Date.now();
      el.textContent = ms <= 0 ? 'time is called' : Math.floor(ms / 60000) + ':' + String(Math.floor(ms % 60000 / 1000)).padStart(2, '0') + ' left';
    }
    setInterval(tick, 1000);
    tick();
    setInterval(function () {
      if (document.hidden) return;
      fetch('/inn/tourney.json?game=' + encodeURIComponent(game || ''), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var b = document.querySelector('[data-tourney]');
          if (!b) return;
          if (!j.html) { b.remove(); return; }
          var t = document.createElement('div');
          t.innerHTML = j.html;
          var nb = t.firstElementChild;
          if (nb && nb.innerHTML !== b.innerHTML) b.replaceWith(nb);
        }).catch(function () {});
    }, 8000);
  })();

  if (game === 'scratch') {
    var skBusy = false;
    var waxEmblem = function (ctx, w) {
      var cx = w / 2, cy = w / 2;
      var g = ctx.createRadialGradient(cx - 14, cy - 16, 6, cx, cy, w * 0.52);
      g.addColorStop(0, '#B8433A'); g.addColorStop(0.55, '#8E2F24'); g.addColorStop(1, '#5E1C14');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (var i = 0; i <= 44; i++) {
        var a = i / 44 * Math.PI * 2;
        var r = w * 0.46 + Math.sin(a * 9) * 2.4 + Math.sin(a * 4 + 1) * 1.6;
        var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.33, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,190,.28)';
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.37, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.font = '600 ' + Math.round(w * 0.3) + 'px Georgia, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ᛟ', cx, cy + 1);
      ctx.fillStyle = 'rgba(255,235,210,.25)';
      ctx.beginPath(); ctx.ellipse(cx - 12, cy - 18, 16, 8, -0.6, 0, Math.PI * 2); ctx.fill();
    };
    var setupWax = function (cv, onDone) {
      var w = cv.width;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#E8D8B4';
      ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = 'rgba(196,174,126,.6)';
      ctx.lineWidth = 5;
      for (var st = -w; st < w * 2; st += 12) { ctx.beginPath(); ctx.moveTo(st, w); ctx.lineTo(st + w, 0); ctx.stroke(); }
      waxEmblem(ctx, w);
      var gone = false;
      var cracks = function () {
        var cx = w / 2, cy = w / 2;
        ctx.strokeStyle = 'rgba(30,8,4,.8)';
        ctx.lineWidth = 2.4;
        for (var i = 0; i < 7; i++) {
          var a = i / 7 * Math.PI * 2 + 0.4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          var r = 0, x = cx, y = cy;
          for (var sgm = 0; sgm < 4; sgm++) { r += w * 0.13; var aa = a + (Math.random() - 0.5) * 0.7; x = cx + Math.cos(aa) * r; y = cy + Math.sin(aa) * r; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      };
      var reveal = function () {
        if (gone) return;
        gone = true;
        Snd.card();
        if (reduce) { cv.remove(); onDone(); return; }
        cracks();
        setTimeout(function () {
          cv.classList.add('gone');
          setTimeout(function () { cv.remove(); onDone(); }, 300);
        }, 130);
      };
      cv.addEventListener('pointerdown', reveal);
      cv.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); } });
      cv.title = 'Break the seal';
      return { reveal: reveal };
    };
    tbl.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-play]');
      if (!form) return;
      e.preventDefault();
      if (skBusy) return;
      skBusy = true;
      Snd.click();
      var btn = form.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      send(form, e.submitter).then(function (r) {
        if (!r.ok) { skBusy = false; if (btn) btn.disabled = false; sayIn(tbl, r.j.error || 'The innkeeper did not hear you.', 'bad'); return; }
        var j = r.j;
        var box = tbl.querySelector('[data-tkbox]');
        box.innerHTML = j.ticketHtml;
        sayIn(tbl, 'The ink is dry. Break the seals.', '');
        var left = 3;
        var finish = function () {
          var t = j.ticket;
          var tone = t.mult > 1 ? 'good' : (t.mult === 1 ? '' : 'bad');
          var foot = box.querySelector('[data-tkfoot]');
          var name = t.seals[0].name;
          if (foot) foot.textContent = t.mult ? 'Three of ' + name + ': the ticket pays ×' + t.mult + ', ' + fmt(t.returned) + ' back.' : 'No three alike. The ticket keeps the stake.';
          sayIn(tbl, t.mult > 1 ? 'Three of ' + name + '! ×' + t.mult + ' pays ' + fmt(t.returned) + '.' : (t.mult === 1 ? 'Three Septims: the stake comes back to you.' : 'The wax hid nothing tonight.'), tone);
          setPurse(j.purse);
          lastout(j);
          if (j.happy) sayIn(tbl, tbl.querySelector('[data-say]').textContent + ' Happy hour adds ' + fmt(j.happy) + '.', tone);
          if (t.mult >= 20) { Snd.big(); flash('good'); if (UI.burst) UI.burst(); }
          else if (t.mult > 1) { Snd.win(); flash('good'); }
          else if (t.mult === 1) Snd.chip();
          else { Snd.lose(); flash('bad'); }
          skBusy = false;
          if (btn) btn.disabled = false;
        };
        var waxes = [];
        box.querySelectorAll('[data-wax]').forEach(function (cv) {
          waxes.push(setupWax(cv, function () { left--; if (!left) finish(); }));
        });
        var all = box.querySelector('[data-revealall]');
        if (all) all.addEventListener('click', function () { waxes.forEach(function (x) { x.reveal(); }); });
      }).catch(function () { skBusy = false; if (btn) btn.disabled = false; sayIn(tbl, 'The innkeeper did not hear you. Try again.', 'bad'); });
    });
  }

  if (game === 'slots') {
    var busy = false;
    var glyphOf = function (id) { var f = tbl.querySelector('[data-slots]'); var g = {}; try { g = JSON.parse(f.getAttribute('data-glyph')); } catch (e) {} return g[id] || ''; };
    var symHtml = function (id) { return '<span class="sl sl-' + id + '"><i>' + glyphOf(id) + '</i></span>'; };
    var spinReels = function (grid, done) {
      var felt = tbl.querySelector('[data-slots]');
      if (!felt || reduce) return done();
      var strip = []; try { strip = JSON.parse(felt.getAttribute('data-strip')); } catch (e) {}
      var reels = tbl.querySelectorAll('[data-reel]');
      var longest = 0;
      reels.forEach(function (rl, c) {
        var st = rl.querySelector('.strip');
        var cur = Array.prototype.map.call(st.children, function (x) { x.classList.remove('win'); return x.outerHTML; });
        var N = 16 + c * 6;
        var fill = [];
        for (var i = 0; i < N; i++) fill.push(symHtml(strip[Math.floor(Math.random() * strip.length)]));
        st.innerHTML = grid[c].map(symHtml).join('') + fill.join('') + cur.join('');
        st.style.transition = 'none';
        st.style.transform = 'translateY(-' + ((3 + N) / (N + 6) * 100) + '%)';
        void st.offsetHeight;
        var dur = 0.9 + c * 0.35;
        longest = Math.max(longest, dur);
        st.style.transition = 'transform ' + dur + 's cubic-bezier(.25,.1,.25,1.04)';
        requestAnimationFrame(function () { st.style.transform = 'translateY(0)'; });
        setTimeout(function () { Snd.tick(); rl.classList.add('stopped'); }, dur * 1000);
      });
      for (var t = 0; t < longest; t += 0.09) Snd.tick(t);
      setTimeout(done, longest * 1000 + 250);
    };
    tbl.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-play]');
      if (!form || !window.fetch) return;
      e.preventDefault();
      if (busy) return;
      busy = true;
      Snd.click();
      var sub = e.submitter;
      var req = send(form, sub);
      lock(true);
      req.then(function (r) {
        if (!r.ok) { busy = false; lock(false); sayIn(null, r.j.error || 'The lever sticks. Try again.', 'bad'); return; }
        spinReels(r.j.grid, function () {
          tbl.innerHTML = r.j.html;
          setPurse(r.j.purse);
          lastout(r.j);
          var s = tbl.querySelector('[data-say]');
          if (s && s.classList.contains('jackpot')) { Snd.big(); flash('good'); if (UI.burst) { UI.burst(); setTimeout(UI.burst, 500); } }
          else if (r.j.won) { var big = r.j.won >= 10 * (Number((form.querySelector('[data-stake]') || {}).value) || 1e12); big ? Snd.big() : Snd.win(); flash('good'); if (big && UI.burst) UI.burst(); }
          else if (toneOf() === 'bad') Snd.lose();
          busy = false;
          var b = tbl.querySelector('[data-key]:not([disabled])'); if (b) b.focus({ preventScroll: true });
        });
      }).catch(function () { busy = false; lock(false); sayIn(null, 'The innkeeper did not hear you. Try again.', 'bad'); });
    });
  }

  if (game === 'mines') {
    var mbusy = false;
    tbl.addEventListener('change', function (e) {
      if (!e.target.matches('[data-mines]')) return;
      var lad = tbl.querySelector('[data-mladder]'); if (!lad) return;
      var m = Number(e.target.value), out = [], bf = tbl.querySelector('[data-barrow]'), edge = bf ? Number(bf.getAttribute('data-edge')) || 0.92 : 0.92;
      [1, 2, 3, 5, 8].forEach(function (k) { if (k > 25 - m) return; var v = 1; for (var i = 0; i < k; i++) v *= (25 - i) / (25 - m - i); out.push(k + (k === 1 ? ' stone' : ' stones') + ' ×' + (Math.floor(v * edge * 100) / 100).toFixed(2)); });
      lad.textContent = out.join(' · ');
      var mins = {}; try { mins = JSON.parse(bf.getAttribute('data-mins')); } catch (x) {}
      var need = m >= 18 ? mins.c : (m >= 10 ? mins.b : mins.a), stk = tbl.querySelector('[data-stake]');
      if (stk && need && (Number(String(stk.value).replace(/[^\d]/g, '')) || 0) < need) { stk.value = need; stk.classList.remove('bumped'); void stk.offsetWidth; stk.classList.add('bumped'); }
    });
    tbl.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-play]');
      if (!form || !window.fetch) return;
      e.preventDefault();
      if (mbusy) return;
      mbusy = true;
      var sub = e.submitter;
      var tile = sub && sub.name === 'tile' ? Number(sub.value) : -1;
      if (sub && sub.classList.contains('stone') && !reduce) sub.classList.add('lifting');
      send(form, sub).then(function (r) {
        mbusy = false;
        if (!r.ok) { if (sub) sub.classList.remove('lifting'); sayIn(null, r.j.error || 'The stone will not move.', 'bad'); return; }
        tbl.innerHTML = r.j.html;
        setPurse(r.j.purse);
        lastout(r.j);
        var grid = tbl.querySelector('.bgrid');
        var cell = tile >= 0 && grid ? grid.children[tile] : null;
        if (cell && !reduce) cell.classList.add('flip');
        var t = toneOf();
        if (grid && grid.classList.contains('over')) {
          if (!reduce) grid.classList.add('reveal');
          if (t === 'bad') { Snd.lose(); flash('bad'); if (cell && !reduce) cell.classList.add('shake'); }
          else { Snd.win(); flash('good'); }
        } else if (tile >= 0) Snd.chip();
        else Snd.click();
        var b = tbl.querySelector('.stone:not([disabled])') || tbl.querySelector('[data-key]:not([disabled])');
        if (b && b.focus) b.focus({ preventScroll: true });
      }).catch(function () { mbusy = false; sayIn(null, 'The innkeeper did not hear you. Try again.', 'bad'); });
    });
  }

  if (game === 'plinko') {
    var inflight = 0;
    var felt = function () { return tbl.querySelector('[data-plinko]'); };
    var table = {}, geo = {};
    try { table = JSON.parse(felt().getAttribute('data-table')); geo = JSON.parse(felt().getAttribute('data-geo')); } catch (e) {}
    var tierOf = function (m) { return m >= 10 ? 'hot' : (m >= 2 ? 'warm' : (m >= 1 ? 'even' : 'cold')); };
    var paintRisk = function (risk) {
      var t = table[risk]; if (!t) return;
      tbl.querySelectorAll('[data-pslot]').forEach(function (g) {
        var i = Number(g.getAttribute('data-pslot'));
        g.setAttribute('class', 'pslot ' + tierOf(t[i]));
        var tx = g.querySelector('text'); if (tx) tx.textContent = t[i] + '×';
      });
    };
    var bumpMin = function (risk) { var f = felt(), mins = {}; try { mins = JSON.parse(f.getAttribute('data-mins')); } catch (x) {} var st = tbl.querySelector('[data-stake]'); var m = Number(mins[risk]) || 0; if (st && m && (Number(String(st.value).replace(/[^\d]/g, '')) || 0) < m) { st.value = m; st.classList.remove('bumped'); void st.offsetWidth; st.classList.add('bumped'); } };
    tbl.addEventListener('change', function (e) { if (e.target.matches('[data-risk]')) { paintRisk(e.target.value); bumpMin(e.target.value); Snd.click(); } });
    var r0 = tbl.querySelector('[data-risk]:checked'); if (r0) bumpMin(r0.value);
    var recent = function (d) {
      var box = tbl.querySelector('[data-avarecent]'); if (!box) return;
      var i = document.createElement('i'); i.className = 'pk ' + (d.mult >= 10 ? 'hot' : (d.mult >= 1 ? 'good' : 'bad')); i.textContent = d.mult + '×';
      box.insertBefore(i, box.firstChild);
      while (box.children.length > 14) box.lastChild.remove();
    };
    var dropBall = function (d, done) {
      var svg = tbl.querySelector('.avaboard');
      var layer = svg && svg.querySelector('[data-balls]');
      if (!layer || reduce) return done();
      var NS = 'http://www.w3.org/2000/svg';
      var ball = document.createElementNS(NS, 'circle');
      ball.setAttribute('r', '8'); ball.setAttribute('class', 'snow');
      layer.appendChild(ball);
      var pts = [[geo.mid + (Math.random() - 0.5) * 6, 0]];
      var c = 0;
      for (var k = 0; k < d.path.length; k++) { pts.push([geo.mid + (c - k / 2) * geo.gap, geo.top + k * geo.row - 10]); c += d.path[k]; }
      pts.push([geo.mid + (d.slot - 8) * geo.gap, geo.top + d.path.length * geo.row + 6]);
      var seg = 0, t0 = null, per = 105;
      var quiet = inflight > 2;
      (function step(ts) {
        if (!t0) t0 = ts;
        var k = (ts - t0) / (seg === 0 ? per * 1.6 : per);
        if (k >= 1) {
          seg++; t0 = ts; k = 0;
          if (seg < pts.length - 1 && !quiet) Snd.tick();
          if (seg >= pts.length - 1) {
            ball.setAttribute('cx', pts[pts.length - 1][0]); ball.setAttribute('cy', pts[pts.length - 1][1]);
            var slot = svg.querySelector('[data-pslot="' + d.slot + '"]');
            if (slot) { slot.classList.remove('hit'); void slot.getBBox(); slot.classList.add('hit'); setTimeout(function () { slot.classList.remove('hit'); }, 700); }
            setTimeout(function () { ball.remove(); }, 350);
            return done();
          }
        }
        var a = pts[seg], b = pts[seg + 1];
        var x = a[0] + (b[0] - a[0]) * k;
        var y = a[1] + (b[1] - a[1]) * k * k - (seg === 0 ? 0 : 9 * Math.sin(Math.PI * k) * (1 - k));
        ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1));
        requestAnimationFrame(step);
      })(performance.now());
    };
    tbl.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-play]');
      if (!form || !window.fetch) return;
      e.preventDefault();
      if (inflight >= 8) return;
      inflight++;
      Snd.click();
      send(form, e.submitter).then(function (r) {
        if (!r.ok) { inflight--; sayIn(felt(), r.j.error || 'The snow will not fall.', 'bad'); return; }
        dropBall(r.j.drop, function () {
          inflight--;
          var d = r.j.drop;
          setPurse(r.j.purse);
          lastout(r.j);
          recent(d);
          var tone = d.returned > d.staked ? 'good' : (d.returned < d.staked ? 'bad' : '');
          sayIn(felt(), 'The snowball lands on ×' + d.mult + '. ' + (d.returned ? 'Back to you: ' + fmt(d.returned) + '.' : 'Nothing back.'), tone);
          if (d.mult >= 10) { Snd.big(); flash('good'); if (UI.burst) UI.burst(); }
          else if (tone === 'good') Snd.win();
          else Snd.ball();
        });
      }).catch(function () { inflight--; sayIn(felt(), 'The innkeeper did not hear you. Try again.', 'bad'); });
    });
  }

  if (['crash', 'races', 'arena'].indexOf(game) >= 0) {
    var root = function () { return tbl.querySelector('[data-event]'); };
    var r0 = root();
    if (!r0) return;
    var meta = {}; try { meta = JSON.parse(r0.getAttribute('data-meta')); } catch (e) {}
    var skew = Number(r0.getAttribute('data-now')) - Date.now();
    var now = function () { return Date.now() + skew; };
    var seen = {};
    var tmp = document.createElement('div');
    var clock = function (ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    var keepInputs = function (el) {
      var vals = {};
      el.querySelectorAll('input[name], select[name]').forEach(function (i) {
        if (i.type === 'hidden') return;
        if (i.type === 'radio' || i.type === 'checkbox') { if (i.checked) vals[i.name + '=' + i.value] = true; }
        else vals[i.name] = i.value;
      });
      var f = document.activeElement && el.contains(document.activeElement) ? document.activeElement.getAttribute('name') : null;
      return { vals: vals, focus: f };
    };
    var putInputs = function (el, k) {
      el.querySelectorAll('input[name], select[name]').forEach(function (i) {
        if (i.type === 'hidden') return;
        if (i.type === 'radio' || i.type === 'checkbox') { if (k.vals[i.name + '=' + i.value]) i.checked = true; }
        else if (k.vals[i.name] !== undefined) i.value = k.vals[i.name];
      });
      if (k.focus) { var x = el.querySelector('[name="' + k.focus + '"]'); if (x) x.focus({ preventScroll: true }); }
    };
    var swapPart = function (name, html) {
      var el = tbl.querySelector('[data-ev="' + name + '"]');
      if (!el) return;
      if (seen[name] === html) return;
      if (seen[name] === undefined) { tmp.innerHTML = html; if (tmp.innerHTML === el.innerHTML) { seen[name] = html; return; } }
      seen[name] = html;
      var k = name === 'ctl' ? keepInputs(el) : null;
      el.innerHTML = html;
      if (k) putInputs(el, k);
      if (name === 'list' && !reduce) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      if (name === 'ctl') { var xf = el.querySelector('form[data-exotic]'); if (xf) exPrice(xf); }
    };
    var apply = function (j) {
      if (!j || !j.meta) return;
      if (j.now) skew = j.now - Date.now();
      var before = meta;
      meta = j.meta;
      ['stage', 'side', 'ctl', 'list', 'hist'].forEach(function (k) { if (j.parts[k] !== undefined) swapPart(k, j.parts[k]); });
      if (typeof j.purse === 'number') setPurse(j.purse);
      lastout(j);
      changed(before, meta);
    };
    var changed = function (a, b) {
      if (!a || a.no !== b.no || a.phase === b.phase) return;
      if (b.game === 'crash' && b.phase === 'crashed') {
        if (b.mine && !b.mine.cashed) { Snd.lose(); flash('bad'); } else Snd.ball();
      }
      if (b.game === 'crash' && b.phase === 'fly') Snd.chip();
      if ((b.game === 'races' || b.game === 'arena') && b.phase === 'done' && b.mine && b.mine.n) {
        if (b.mine.returned > b.mine.staked) { Snd.win(); flash('good'); } else if (b.mine.returned < b.mine.staked) { Snd.lose(); flash('bad'); }
      }
      if (b.game === 'races' && b.phase === 'run') Snd.push();
    };
    var polling = false;
    var poll = function () {
      if (polling || document.hidden) return;
      polling = true;
      fetch('/inn/' + game + '/state.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(apply)
        .catch(function () {})
        .then(function () { polling = false; });
    };
    var nextPoll = function () {
      var n = now(), wait = game === 'crash' ? (meta.phase === 'fly' ? 450 : 1000) : 2500;
      var edges = [meta.betUntil, meta.runAt, meta.endAt, meta.nextAt, meta.startAt].filter(function (t) { return t && t > n; });
      if (edges.length) wait = Math.min(wait, Math.min.apply(null, edges) - n + 120);
      setTimeout(function () { poll(); nextPoll(); }, Math.max(150, wait));
    };
    nextPoll();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });

    tbl.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-play]');
      if (!form || !window.fetch) return;
      e.preventDefault();
      var sub = e.submitter;
      if (form.dataset.sending) return;
      form.dataset.sending = '1';
      if (sub) sub.disabled = true;
      Snd.click();
      send(form, sub).then(function (r) {
        form.dataset.sending = '';
        if (sub) sub.disabled = false;
        if (!r.ok) {
          var box = tbl.querySelector('[data-ev="ctl"]');
          var p = box.querySelector('.say.err') || document.createElement('p');
          p.className = 'say bad err'; p.textContent = r.j.error || 'The bookmaker did not hear you.';
          box.insertBefore(p, box.firstChild);
          Snd.lose();
          return;
        }
        apply(r.j);
        if (r.j.cashedAt) { Snd.win(); flash('good'); } else Snd.chip();
      }).catch(function () { form.dataset.sending = ''; if (sub) sub.disabled = false; });
    });

    var exPrice = function (f) {
      var kind = (f.querySelector('input[name=kind]:checked') || {}).value || 'exacta';
      var third = f.querySelector('[data-third]'); if (third) third.hidden = kind !== 'trifecta';
      var ks = ['e1', 'e2', 'e3'].slice(0, kind === 'exacta' ? 2 : 3).map(function (n) { return f.querySelector('[name=' + n + ']').value; });
      var map = {}; try { map = JSON.parse(f.getAttribute(kind === 'exacta' ? 'data-exacta' : 'data-trifecta')); } catch (e) {}
      var dup = ks.some(function (v, i) { return ks.indexOf(v) !== i; });
      var out = f.querySelector('[data-exprice]'); if (out) out.textContent = dup ? 'pick different horses' : (map[ks.join('-')] || '–');
    };
    tbl.addEventListener('change', function (e) { var f = e.target.closest('form[data-exotic]'); if (f) exPrice(f); });
    var frame = function () {
      var n = now();
      var m = meta;
      if (game === 'crash') {
        var big = tbl.querySelector('[data-mult]'), note = tbl.querySelector('[data-note]'), curve = tbl.querySelector('[data-curve]'), trail = tbl.querySelector('[data-trail]'), head = tbl.querySelector('[data-head]'), cash = tbl.querySelector('[data-cashbtn]');
        var s0 = m.start || 1, t = 0, mult = s0;
        if (m.phase === 'fly') { t = Math.max(0, n - m.flyAt); mult = s0 * Math.exp(m.k * t / 1000); }
        if (m.phase === 'crashed' && m.point) { mult = m.point; t = Math.log(Math.max(m.point, s0) / s0) / m.k * 1000; }
        mult = Math.floor(mult * 100) / 100;
        if (big) { big.textContent = x2(mult) + '×'; big.classList.toggle('fell', m.phase === 'crashed'); big.classList.toggle('waiting', m.phase === 'bet'); big.classList.toggle('under', m.phase === 'fly' && mult < 1); }
        if (note) note.textContent = m.phase === 'bet' ? 'Takes off in ' + Math.max(0, Math.ceil((m.betUntil - n) / 1000)) + 's' : (m.phase === 'fly' ? 'Flight ' + m.no + ' is climbing' : 'The dragon fell at ×' + x2(m.point));
        if (cash) cash.textContent = 'Cash out · ' + fmt(Math.floor(Number(cash.getAttribute('data-amount')) * mult));
        if (curve) {
          var T = Math.max(t, 8000), M = Math.max(mult, 2), d = '';
          var X = function (ti) { return 40 + ti / T * 540; }, Y = function (mi) { return 230 - (mi - s0) / (M - s0) * 200; };
          var steps = 48;
          for (var i = 0; i <= steps; i++) { var ti = t * i / steps; var mi = s0 * Math.exp(m.k * ti / 1000); d += (i ? 'L' : 'M') + X(ti).toFixed(1) + ' ' + Y(Math.min(mi, mult)).toFixed(1); }
          if (m.phase === 'bet') d = 'M40 230';
          curve.setAttribute('d', d);
          if (trail) trail.setAttribute('d', m.phase === 'bet' ? 'M40 230' : d + 'L' + X(t).toFixed(1) + ' 230L40 230Z');
          if (head) { head.setAttribute('cx', m.phase === 'bet' ? 40 : X(t).toFixed(1)); head.setAttribute('cy', m.phase === 'bet' ? 230 : Y(mult).toFixed(1)); head.setAttribute('class', 'head' + (m.phase === 'crashed' ? ' fell' : '')); }
          var yl = tbl.querySelector('[data-ylab]');
          if (yl) { var lab = [s0, 1, M].filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (v) { return '<text x="34" y="' + (Y(v) + 4).toFixed(1) + '">' + (v >= 10 ? Math.round(v) : v.toFixed(1)) + '×</text>'; }).join(''); if (yl.innerHTML !== lab) yl.innerHTML = lab; }
        }
      }
      if (game === 'races') {
        var dc = tbl.querySelector('[data-dclock]');
        var horses = tbl.querySelectorAll('[data-horse]');
        var track = tbl.querySelector('.track');
        var w = track ? track.clientWidth - 28 : 0;
        if (m.phase === 'bet') {
          if (dc) dc.textContent = 'Race ' + m.no + ' · off in ' + clock(m.runAt - n);
          horses.forEach(function (h) { h.style.transform = 'translateX(0)'; h.style.left = ''; });
        } else if (m.frames) {
          var F = m.frames, S = F.length, L = 0;
          F[S - 1].forEach(function (v) { L = Math.max(L, v); });
          var p = m.phase === 'done' ? S : Math.min(S, Math.max(0, (n - m.runAt) / (m.endAt - m.runAt) * S));
          var i0 = Math.floor(p) - 1, f = p - Math.floor(p);
          var lead = -1, best = -1;
          horses.forEach(function (h) {
            var k = Number(h.getAttribute('data-horse'));
            var a = i0 >= 0 ? F[Math.min(i0, S - 1)][k] : 0, b = F[Math.min(i0 + 1, S - 1)][k];
            var pos = p >= S ? F[S - 1][k] : a + (b - a) * f;
            if (pos > best) { best = pos; lead = k; }
            h.style.left = '0';
            h.style.transform = 'translateX(' + (Math.min(1, pos / L) * w).toFixed(1) + 'px)';
            h.classList.toggle('gallop', m.phase === 'run' && !reduce);
          });
          if (dc) dc.textContent = m.phase === 'done' ? 'Race ' + m.no + ' is run · the next book opens in ' + clock(m.nextAt - n) : 'They’re off! ' + (lead >= 0 && m.names ? m.names[lead] + ' leads' : '') + ' · ' + clock(m.endAt - n);
        }
      }
      if (game === 'arena' && window.InnArena) { try { window.InnArena.tick(tbl, m, n, reduce, Snd); } catch (e) {} }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
