(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var tut = document.getElementById('tut');
  if (tut && !tut.dataset.ready) {
    tut.dataset.ready = '1';
    if (tut.parentNode !== document.body) document.body.appendChild(tut);
    var steps = tut.querySelectorAll('.tutstep');
    var dots = tut.querySelectorAll('.tutdots i');
    var back = tut.querySelector('[data-tutback]');
    var next = tut.querySelector('[data-tutnext]');
    var done = tut.querySelector('[data-tutdone]');
    var num = tut.querySelector('[data-tutn]');
    var at = 0;
    var go = function (i) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, k) { s.hidden = k !== at; });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === at); });
      back.hidden = at === 0;
      next.hidden = at === steps.length - 1;
      done.hidden = at !== steps.length - 1;
      num.textContent = String(at + 1);
    };
    var close = function (form) {
      tut.hidden = true;
      document.body.classList.remove('tutopen');
      if (form && window.fetch) fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString(), credentials: 'same-origin' }).catch(function () {});
      var first = document.querySelector('#tbl button:not([disabled]), #tbl input:not([disabled])');
      if (first) first.focus();
    };
    var open = function () { go(0); tut.hidden = false; document.body.classList.add('tutopen'); next.focus(); };
    back.addEventListener('click', function () { go(at - 1); });
    next.addEventListener('click', function () { go(at + 1); });
    tut.querySelectorAll('form').forEach(function (f) { f.addEventListener('submit', function (e) { if (!window.fetch) return; e.preventDefault(); close(f); }); });
    tut.addEventListener('click', function (e) { if (e.target === tut) close(tut.querySelector('form.tutskip')); });
    document.addEventListener('keydown', function (e) {
      if (tut.hidden) return;
      if (e.key === 'Escape') close(tut.querySelector('form.tutskip'));
      else if (e.key === 'ArrowRight') go(at + 1);
      else if (e.key === 'ArrowLeft') go(at - 1);
    });
    document.querySelectorAll('[data-tutopen]').forEach(function (b) { b.addEventListener('click', open); });
    go(0);
    if (!tut.hidden) { document.body.classList.add('tutopen'); next.focus(); }
  }

  var inn = document.getElementById('inn');
  var tbl = document.getElementById('tbl');
  if (!inn || !tbl || inn.dataset.ready) return;
  inn.dataset.ready = '1';
  var game = inn.getAttribute('data-game');
  var busy = false;

  var ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var bets = {};
  var history = [];
  var chip = 5;

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function setPurse(n) { document.querySelectorAll('[data-purse]').forEach(function (el) { el.textContent = fmt(n); }); }
  function say(text, tone) { var s = tbl.querySelector('[data-say]'); if (!s) return; s.textContent = text || ''; s.className = 'say' + (tone ? ' ' + tone : ''); }
  function lockAll(on) { tbl.querySelectorAll('button, input, select').forEach(function (b) { if (on) { b.dataset.was = b.disabled ? '1' : ''; b.disabled = true; } else { b.disabled = b.dataset.was === '1'; } }); }
  function focusFirst() { var b = tbl.querySelector('[data-key]:not([disabled])'); if (b) b.focus({ preventScroll: true }); }

  function swap(html) {
    var before = Array.prototype.map.call(tbl.querySelectorAll('.cards'), function (c) { return c.children.length; });
    tbl.innerHTML = html;
    if (!reduce) {
      tbl.querySelectorAll('.cards').forEach(function (c, i) {
        var had = before[i] || 0;
        Array.prototype.forEach.call(c.children, function (el, k) { if (k >= had && !el.classList.contains('ghost')) el.classList.add('dealt'); });
      });
    }
    wire();
  }

  function shake() {
    var d = tbl.querySelector('[data-dice]');
    if (!d || reduce) return;
    d.classList.remove('rolling');
    void d.offsetWidth;
    d.classList.add('rolling');
  }

  function paintBets() {
    var cloth = tbl.querySelector('[data-cloth]');
    if (!cloth) return;
    cloth.querySelectorAll('[data-place]').forEach(function (el) {
      var k = el.getAttribute('data-place');
      var mark = el.querySelector('.chipmark');
      if (bets[k]) {
        if (!mark) { mark = document.createElement('span'); mark.className = 'chipmark'; el.appendChild(mark); }
        mark.textContent = bets[k] >= 1000 ? Math.round(bets[k] / 100) / 10 + 'k' : String(bets[k]);
        el.classList.add('bet');
      } else {
        if (mark) mark.remove();
        el.classList.remove('bet');
      }
    });
    var total = Object.keys(bets).reduce(function (n, k) { return n + bets[k]; }, 0);
    var t = tbl.querySelector('[data-total]');
    if (t) t.textContent = fmt(total);
    var h = tbl.querySelector('[data-bets]');
    if (h) h.value = JSON.stringify(bets);
  }

  function wire() {
    if (game !== 'wheel') return;
    var h = tbl.querySelector('[data-bets]');
    try { bets = h && h.value ? JSON.parse(h.value) || {} : {}; } catch (e) { bets = {}; }
    history = [];
    var on = tbl.querySelector('[data-chipval].on');
    if (on) chip = Number(on.getAttribute('data-chipval'));
    tbl.querySelectorAll('[data-chipval]').forEach(function (c) { c.classList.toggle('on', Number(c.getAttribute('data-chipval')) === chip); c.setAttribute('aria-checked', String(Number(c.getAttribute('data-chipval')) === chip)); });
    paintBets();
  }

  tbl.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]');
    if (c) { var inp = tbl.querySelector('[data-stake]'); if (inp) { inp.value = c.getAttribute('data-chip'); inp.focus(); } return; }
    if (game !== 'wheel' || busy) return;
    var cv = e.target.closest('[data-chipval]');
    if (cv) { chip = Number(cv.getAttribute('data-chipval')); tbl.querySelectorAll('[data-chipval]').forEach(function (x) { x.classList.toggle('on', x === cv); x.setAttribute('aria-checked', String(x === cv)); }); return; }
    if (e.target.closest('[data-clear]')) { bets = {}; history = []; paintBets(); return; }
    if (e.target.closest('[data-undo]')) { var last = history.pop(); if (last) { bets[last[0]] -= last[1]; if (bets[last[0]] <= 0) delete bets[last[0]]; paintBets(); } return; }
    var place = e.target.closest('[data-cloth] [data-place]');
    if (place) {
      var k = place.getAttribute('data-place');
      bets[k] = (bets[k] || 0) + chip;
      history.push([k, chip]);
      paintBets();
    }
  });

  tbl.addEventListener('contextmenu', function (e) {
    var place = e.target.closest('[data-cloth] [data-place]');
    if (!place || game !== 'wheel') return;
    e.preventDefault();
    var k = place.getAttribute('data-place');
    if (bets[k]) { delete bets[k]; history = history.filter(function (h) { return h[0] !== k; }); paintBets(); }
  });

  function spinTo(n, then) {
    var sp = tbl.querySelector('[data-spinner]');
    var ball = tbl.querySelector('[data-ball]');
    if (!sp || reduce) return then();
    var a = 360 / ORDER.length;
    var idx = ORDER.indexOf(n);
    var m = /rotate\((-?[\d.]+)deg\)/.exec(sp.style.transform || '');
    var cur = m ? Number(m[1]) : 0;
    var target = Math.floor(cur / 360) * 360 - 360 * 5 - idx * a;
    if (ball) ball.setAttribute('hidden', '');
    say('No more bets. The wheel turns…', '');
    sp.style.transition = 'transform 3.4s cubic-bezier(.12,.62,.08,1)';
    requestAnimationFrame(function () { sp.style.transform = 'rotate(' + target + 'deg)'; });
    var fired = false;
    var end = function () { if (fired) return; fired = true; if (ball) ball.removeAttribute('hidden'); setTimeout(then, 450); };
    sp.addEventListener('transitionend', end, { once: true });
    setTimeout(end, 3700);
  }

  function play(j) {
    var frames = j.frames || [];
    var finish = function () {
      swap(j.html);
      setPurse(j.purse);
      if (j.lastout) { var lo = document.querySelector('[data-lastout]'); if (lo) lo.innerHTML = j.lastout; }
      if (game === 'hazard') shake();
      busy = false;
      focusFirst();
    };
    if (game === 'wheel' && typeof j.spin === 'number') return spinTo(j.spin, finish);
    var i = 0;
    (function next() {
      if (i >= frames.length) return finish();
      swap(frames[i++]);
      if (game === 'bones') shake();
      setTimeout(next, reduce ? 300 : 800);
    })();
  }

  tbl.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-inn]');
    if (!form || !window.fetch || !window.URLSearchParams) return;
    e.preventDefault();
    if (busy) return;
    var sub = e.submitter;
    var url = (sub && sub.getAttribute('formaction')) || form.getAttribute('action');
    var fd = new FormData(form);
    if (game === 'wheel') {
      if (!Object.keys(bets).length) { say('Put a chip on the cloth first.', 'bad'); return; }
      fd.set('bets', JSON.stringify(bets));
      fd.delete('place'); fd.delete('amount');
    }
    busy = true;
    lockAll(true);
    fetch(url, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fd).toString(), credentials: 'same-origin' })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { busy = false; lockAll(false); say(r.j.error || 'The innkeeper did not hear you.', 'bad'); return; }
        play(r.j);
      })
      .catch(function () { busy = false; lockAll(false); say('The innkeeper did not hear you. Try again.', 'bad'); });
  });

  document.addEventListener('keydown', function (e) {
    if (busy || e.ctrlKey || e.metaKey || e.altKey) return;
    if (tut && !tut.hidden) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    var k = String(e.key || '').toLowerCase();
    if (k.length !== 1) return;
    var b = tbl.querySelector('[data-key="' + k + '"]:not([disabled])');
    if (b) { e.preventDefault(); b.click(); }
  });

  wire();
})();
