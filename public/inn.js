(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var Snd = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem('innSound') !== 'off'; } catch (e) { on = true; }
    function ac() {
      if (!on) return null;
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      if (!ctx) { try { ctx = new A(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, t0, dur, type, vol, slide) {
      var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, c.currentTime + t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + t0 + dur);
      g.gain.setValueAtTime(0.0001, c.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
    }
    function noise(t0, dur, vol, freq, q) {
      var c = ac(); if (!c) return;
      var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 2500; f.Q.value = q || 1;
      g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(c.currentTime + t0);
    }
    return {
      get on() { return on; },
      set: function (v) { on = v; try { localStorage.setItem('innSound', v ? 'on' : 'off'); } catch (e) {} if (v) ac(); },
      click: function () { noise(0, 0.03, 0.15, 3000, 2); },
      card: function (t) { noise(t || 0, 0.07, 0.35, 3800, 0.8); noise((t || 0) + 0.02, 0.05, 0.2, 1400, 1); },
      chip: function () { tone(2400, 0, 0.05, 'triangle', 0.12); tone(3100, 0.03, 0.06, 'triangle', 0.09); noise(0, 0.04, 0.12, 5000, 3); },
      dice: function () { for (var i = 0; i < 7; i++) { noise(i * 0.045 + Math.random() * 0.02, 0.04, 0.28, 1800 + Math.random() * 1500, 2); } noise(0.36, 0.06, 0.3, 900, 1.5); },
      tick: function (t) { tone(1600, t || 0, 0.025, 'square', 0.04); },
      ball: function () { tone(900, 0, 0.08, 'triangle', 0.12, 500); noise(0.02, 0.08, 0.15, 2600, 2); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.32, 'triangle', 0.14); }); for (var i = 0; i < 6; i++) tone(2600 + Math.random() * 900, 0.35 + i * 0.05, 0.08, 'sine', 0.05); },
      big: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.08, 0.4, 'triangle', 0.15); }); },
      lose: function () { tone(330, 0, 0.28, 'sawtooth', 0.06, 196); tone(247, 0.18, 0.4, 'triangle', 0.08, 147); },
      push: function () { tone(440, 0, 0.18, 'sine', 0.08); tone(440, 0.16, 0.18, 'sine', 0.06); },
      door: function () { tone(196, 0, 0.5, 'triangle', 0.08); noise(0, 0.2, 0.1, 400, 0.7); }
    };
  })();
  window.InnSound = Snd;

  var head = document.querySelector('.innhead .innwho');
  if (head && !document.querySelector('[data-mute]')) {
    var mb = document.createElement('button');
    mb.type = 'button'; mb.className = 'btn ghost small soundbtn'; mb.setAttribute('data-mute', '');
    var paint = function () { mb.textContent = Snd.on ? '♪ Sound on' : '♪ Sound off'; mb.setAttribute('aria-pressed', String(Snd.on)); mb.classList.toggle('off', !Snd.on); };
    mb.addEventListener('click', function () { Snd.set(!Snd.on); paint(); if (Snd.on) Snd.chip(); });
    paint();
    head.insertBefore(mb, head.firstChild);
  }

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
  function setPurse(n) {
    document.querySelectorAll('[data-purse]').forEach(function (el) {
      var from = Number(String(el.textContent).replace(/[^\d-]/g, '')) || 0;
      var to = Number(n) || 0;
      if (from === to) { el.textContent = fmt(to); return; }
      el.classList.remove('pup', 'pdown'); void el.offsetWidth; el.classList.add(to > from ? 'pup' : 'pdown');
      if (reduce) { el.textContent = fmt(to); return; }
      var t0 = null, dur = 650;
      (function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(Math.round(from + (to - from) * e));
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  function result() {
    var s = tbl.querySelector('[data-say]');
    var tone = s ? (s.classList.contains('good') ? 'good' : (s.classList.contains('bad') ? 'bad' : '')) : '';
    if (!tone) return;
    var big = /blackjack|Luck|ONE HIT|35 to 1|pays out the pot|counts it out/i.test(s.textContent);
    if (tone === 'good') { big ? Snd.big() : Snd.win(); } else Snd.lose();
    if (reduce) return;
    inn.classList.remove('flash-good', 'flash-bad'); void inn.offsetWidth;
    inn.classList.add(tone === 'good' ? 'flash-good' : 'flash-bad');
    if (tone === 'good' && big) burst();
  }
  function burst() {
    var box = document.createElement('div');
    box.className = 'coinburst';
    for (var i = 0; i < 18; i++) { var c = document.createElement('i'); c.style.setProperty('--dx', (Math.random() * 2 - 1) * 180 + 'px'); c.style.setProperty('--dy', -(60 + Math.random() * 160) + 'px'); c.style.setProperty('--r', Math.random() * 720 + 'deg'); c.style.animationDelay = Math.random() * 0.15 + 's'; box.appendChild(c); }
    inn.appendChild(box);
    setTimeout(function () { box.remove(); }, 1600);
  }
  function say(text, tone) { var s = tbl.querySelector('[data-say]'); if (!s) return; s.textContent = text || ''; s.className = 'say' + (tone ? ' ' + tone : ''); }
  function lockAll(on) { tbl.querySelectorAll('button, input, select').forEach(function (b) { if (on) { b.dataset.was = b.disabled ? '1' : ''; b.disabled = true; } else { b.disabled = b.dataset.was === '1'; } }); }
  function focusFirst() { var b = tbl.querySelector('[data-key]:not([disabled])'); if (b) b.focus({ preventScroll: true }); }

  function swap(html) {
    var before = Array.prototype.map.call(tbl.querySelectorAll('.cards'), function (c) { return c.children.length; });
    tbl.innerHTML = html;
    var n = 0;
    tbl.querySelectorAll('.cards').forEach(function (c, i) {
      var had = before[i] || 0;
      Array.prototype.forEach.call(c.children, function (el, k) {
        if (k >= had && !el.classList.contains('ghost')) {
          if (!reduce) { el.classList.add('dealt'); el.style.animationDelay = (n * 0.09) + 's'; }
          Snd.card(n * 0.09); n++;
        }
      });
    });
    wire();
  }

  function shake() {
    var d = tbl.querySelector('[data-dice]');
    if (!d) return;
    if (reduce) { Snd.dice(); return; }
    Snd.dice();
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
      Snd.chip();
      var mk = place.querySelector('.chipmark');
      if (mk && !reduce) { mk.classList.remove('drop'); void mk.offsetWidth; mk.classList.add('drop'); }
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
    var ticks = 0, tt = 0;
    while (tt < 3.3 && ticks < 60) { Snd.tick(tt); tt += 0.035 + Math.pow(ticks / 60, 2.2) * 0.42; ticks++; }
    sp.style.transition = 'transform 3.4s cubic-bezier(.12,.62,.08,1)';
    requestAnimationFrame(function () { sp.style.transform = 'rotate(' + target + 'deg)'; });
    var fired = false;
    var end = function () { if (fired) return; fired = true; if (ball) { ball.removeAttribute('hidden'); ball.classList.add('landed'); } Snd.ball(); setTimeout(then, 450); };
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
      if (game === 'wheel') { var w = tbl.querySelector('.wnum'); if (w && !reduce) w.classList.add('pop'); }
      result();
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
    Snd.click();
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
