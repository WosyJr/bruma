(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var Snd = (function () {
    var ctx = null, out = null, on = true;
    try { on = localStorage.getItem('innSound') !== 'off'; } catch (e) { on = true; }
    function ac() {
      if (!on) return null;
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      if (!ctx) {
        try {
          ctx = new A();
          var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.5;
          var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
          var master = ctx.createGain(); master.gain.value = 0.55;
          master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
          out = master;
        } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, t0, dur, type, vol, slide, attack) {
      var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0), at = attack || 0.012;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol || 0.05, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function bell(f, t0, dur, vol) { tone(f, t0, dur, 'sine', vol, 0, 0.006); tone(f * 2.01, t0, dur * 0.6, 'sine', (vol || 0.05) * 0.25, 0, 0.006); }
    function hush(t0, dur, vol, freq, type) {
      var c = ac(); if (!c) return;
      var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) { var k = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.min(1, k * 3)) * Math.pow(1 - k, 1.5); }
      var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = type || 'lowpass'; f.frequency.value = freq || 1400; f.Q.value = 0.7;
      g.gain.value = vol || 0.08;
      src.connect(f); f.connect(g); g.connect(out);
      src.start(c.currentTime + (t0 || 0));
    }
    return {
      get on() { return on; },
      set: function (v) { on = v; try { localStorage.setItem('innSound', v ? 'on' : 'off'); } catch (e) {} if (v) ac(); },
      click: function () { tone(740, 0, 0.06, 'sine', 0.035); },
      card: function (t) { hush(t || 0, 0.11, 0.1, 1600); tone(150, (t || 0) + 0.05, 0.08, 'sine', 0.035); },
      chip: function () { bell(1568, 0, 0.18, 0.035); bell(2093, 0.045, 0.2, 0.028); },
      dice: function () { for (var i = 0; i < 5; i++) { hush(i * 0.06 + Math.random() * 0.02, 0.05, 0.09, 900 + Math.random() * 400); tone(210 + Math.random() * 60, i * 0.06, 0.05, 'sine', 0.03); } },
      tick: function (t) { tone(988, t || 0, 0.05, 'sine', 0.025); },
      ball: function () { tone(660, 0, 0.12, 'sine', 0.04, 520); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { bell(f, i * 0.1, 0.7, 0.05); }); },
      big: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { bell(f, i * 0.09, 0.9, 0.05); }); },
      lose: function () { tone(392, 0, 0.35, 'triangle', 0.04, 0, 0.03); tone(311, 0.2, 0.55, 'triangle', 0.04, 0, 0.03); },
      push: function () { bell(587, 0, 0.35, 0.035); bell(587, 0.18, 0.35, 0.03); },
      door: function () { tone(165, 0, 0.12, 'sine', 0.06); hush(0, 0.08, 0.06, 500); tone(165, 0.16, 0.12, 'sine', 0.05); hush(0.16, 0.08, 0.05, 500); }
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

  var Broke = (function () {
    var open = false;
    function csrf() { var c = document.querySelector('input[name=_csrf]'); return c ? c.value : ''; }
    function show(again) {
      again = again === true;
      if (open || document.getElementById('broke')) { var f = document.querySelector('#broke input[name=amount]'); if (f) f.focus(); return; }
      if (!again && !document.querySelector('#inn[data-game]')) return;
      open = true;
      var tries = again ? 1 : 0;
      var wrap = document.createElement('div');
      wrap.id = 'broke'; wrap.className = 'broke';
      wrap.innerHTML = '<div class="brokebox" role="alertdialog" aria-modal="true" aria-labelledby="brokehead">' +
        '<button type="button" class="brokex" data-brokex aria-label="Close">✕</button>' +
        '<div class="brokecoin" aria-hidden="true">◉</div>' +
        '<h3 id="brokehead">Your purse is empty</h3>' +
        '<p>Old Brannoc turns your purse upside down. Not a septim falls out.</p>' +
        '<form method="post" action="/inn/more" class="brokeform"><input type="hidden" name="_csrf" value="' + csrf().replace(/"/g, '') + '"><input name="amount" inputmode="numeric" placeholder="How much" aria-label="Septims you want"><input type="hidden" name="note" value="Out of coin at the tables"><button class="btn go" type="submit">Ask for more coin</button></form>' +
        '<p class="hint" data-brokesay>Hand the coin over in game and a keeper fills your purse.</p></div>';
      document.body.appendChild(wrap);
      var box = wrap.querySelector('.brokebox');
      var say = wrap.querySelector('[data-brokesay]');
      var lines = ['Not so fast, traveller.', 'Brannoc blocks the door.', 'The purse is still empty.'];
      function attempt(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        tries++;
        if (tries >= 2) { close(); return; }
        var w = window.innerWidth, h = window.innerHeight, bw = box.offsetWidth, bh = box.offsetHeight;
        var x = Math.max(8, Math.random() * Math.max(8, w - bw - 16)), y = Math.max(8, Math.random() * Math.max(8, h - bh - 16));
        box.classList.add('dodged');
        box.style.left = x + 'px'; box.style.top = y + 'px';
        box.classList.remove('wiggle'); void box.offsetWidth; box.classList.add('wiggle');
        say.textContent = lines[Math.floor(Math.random() * lines.length)] + ' Try that again.';
        if (window.InnSound) window.InnSound.lose();
      }
      function close() { open = false; wrap.remove(); document.removeEventListener('keydown', key, true); try { sessionStorage.setItem('innBroke', String(Date.now())); } catch (e) {} }
      function key(e) { if (e.key === 'Escape') attempt(e); }
      wrap.querySelector('[data-brokex]').addEventListener('click', attempt);
      wrap.addEventListener('click', function (e) { if (e.target === wrap) attempt(e); });
      document.addEventListener('keydown', key, true);
      if (window.InnSound) window.InnSound.lose();
      var inp = wrap.querySelector('input[name=amount]'); if (inp) setTimeout(function () { inp.focus(); }, 50);
      var form = wrap.querySelector('.brokeform');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button'); btn.disabled = true;
        fetch('/inn/more', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j.error) { say.textContent = j.error; btn.disabled = false; return; }
            tries = 1;
            form.outerHTML = '<p class="brokesent" data-brokesent>✓ Your request is with the innkeeper.</p><button type="button" class="btn ghost small" data-brokedone>Back to the table</button>';
            say.textContent = j.text || 'Hand the coin over in game and your purse is filled.';
            var done = wrap.querySelector('[data-brokedone]'); if (done) { done.addEventListener('click', close); done.focus(); }
          })
          .catch(function () { say.textContent = 'The innkeeper did not hear you. Try again.'; btn.disabled = false; });
      });
    }
    function check(n) { if (Number(n) === 0) show(); }
    return { show: show, check: check };
  })();
  var Brannoc = (function () {
    var host = document.querySelector('#inn[data-game]');
    if (!host) return null;
    var game = host.getAttribute('data-game');
    var lastAt = 0, lastMood = 0, el = null, hideT = null;
    function show(j) {
      if (!j || !j.text) return;
      if (!el) {
        el = document.createElement('div');
        el.className = 'brannocbub';
        el.innerHTML = '<span class="bwho">🍺 Old Brannoc</span><span class="bline"></span>';
        document.body.appendChild(el);
      }
      el.querySelector('.bline').textContent = j.text;
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
      clearTimeout(hideT);
      hideT = setTimeout(function () { el.classList.remove('on'); }, 9500);
    }
    function fetchLine(mood) {
      if (document.hidden) return;
      lastAt = Date.now();
      fetch('/inn/mutter.json?game=' + encodeURIComponent(game) + (mood ? '&mood=' + mood : ''), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(show)
        .catch(function () {});
    }
    function loop() {
      var wait = 70000 + Math.random() * 50000;
      setTimeout(function () { if (Date.now() - lastAt > 55000) fetchLine(''); loop(); }, wait);
    }
    setTimeout(function () { fetchLine(''); }, 22000 + Math.random() * 38000);
    loop();
    return {
      mood: function (m) {
        if (Date.now() - lastMood < 50000 || Math.random() > 0.35) return;
        lastMood = Date.now();
        fetchLine(m);
      }
    };
  })();
  window.InnBrannoc = Brannoc;

  window.InnBroke = Broke;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="/inn#purse"]');
    if (!a || !document.querySelector('#inn[data-game], #room')) return;
    e.preventDefault();
    Broke.show(true);
  });
  document.querySelectorAll('form[data-tipform]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var sure = form.querySelector('input[name=sure]');
      if (sure && sure.value === '1') return;
      e.preventDefault();
      var other = form.querySelector('input[name=amount]:not([type=hidden])');
      var raw = e.submitter && e.submitter.name === 'amount' ? e.submitter.value : (other ? other.value : '');
      var amt = Math.floor(Number(String(raw).replace(/[^\d]/g, '')) || 0);
      var card = form.closest('.tipcard') || form.parentNode;
      var old = card.querySelector('.tipask'); if (old) old.remove();
      var box = document.createElement('div');
      box.className = 'tipask'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Confirm the tip');
      if (amt < 50) {
        box.innerHTML = '<p>Brannoc takes tips of 50 or more.</p><div class="btnrow"><button type="button" class="btn ghost small" data-tipno>All right</button></div>';
      } else {
        box.innerHTML = '<p><b>Tip Brannoc ' + fmt(amt) + '?</b> It goes to the house and can’t be taken back.</p><div class="btnrow"><button type="button" class="btn go small" data-tipyes>Yes, tip ' + fmt(amt) + '</button><button type="button" class="btn ghost small" data-tipno>No, keep it</button></div>';
      }
      form.hidden = true;
      form.insertAdjacentElement('afterend', box);
      var yes = box.querySelector('[data-tipyes]'), no = box.querySelector('[data-tipno]');
      no.addEventListener('click', function () { box.remove(); form.hidden = false; });
      if (yes) {
        yes.addEventListener('click', function () {
          yes.disabled = true;
          if (other) other.value = String(amt);
          form.querySelectorAll('button[name=amount]').forEach(function (b) { b.removeAttribute('name'); });
          sure.value = '1';
          form.submit();
        });
        yes.focus();
      } else no.focus();
    });
  });
  (function () {
    var pm = document.querySelector('[data-purse]');
    if (!pm || String(pm.textContent).replace(/[^\d]/g, '') !== '0') return;
    var last = 0; try { last = Number(sessionStorage.getItem('innBroke')) || 0; } catch (e) {}
    if (Date.now() - last > 10 * 60000) setTimeout(Broke.show, 400);
  })();

  var inn = document.getElementById('inn');
  var tbl = document.getElementById('tbl');
  if (!inn || !tbl || inn.dataset.ready) return;
  inn.dataset.ready = '1';
  var game = inn.getAttribute('data-game');
  var busy = false;
  var CLOTH = ['wheel', 'cage', 'six', 'punto'].indexOf(game) >= 0;

  var ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var bets = {};
  var history = [];
  var chip = 5;

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function setPurse(n) {
    document.querySelectorAll('[data-purse]').forEach(function (el) {
      var from = Number(String(el.textContent).replace(/[^\d-]/g, '')) || 0;
      var to = Number(n) || 0;
      if (to === 0 && from > 0) setTimeout(Broke.show, 900);
      if (from === to) { el.textContent = fmt(to); return; }
      el.classList.remove('pup', 'pdown'); void el.offsetWidth; el.classList.add(to > from ? 'pup' : 'pdown');
      if (reduce) { el.textContent = fmt(to); return; }
      var t0 = null, dur = 650, token = (el.__pt || 0) + 1;
      el.__pt = token;
      setTimeout(function () { if (el.__pt === token) el.textContent = fmt(to); }, dur + 120);
      (function step(ts) {
        if (el.__pt !== token) return;
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
    if (window.InnBrannoc) window.InnBrannoc.mood(tone === 'good' ? 'win' : 'loss');
    if (tone === 'good') { big ? Snd.big() : Snd.win(); } else Snd.lose();
    if (window.InnBrannoc) window.InnBrannoc.mood(tone === 'good' ? 'win' : 'loss');
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
          if (n < 6) Snd.card(n * 0.09); n++;
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
    if (game === 'keno') kenoWire();
    if (!CLOTH) return;
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
    if (c) { var inp = (c.closest('form') || tbl).querySelector('[data-stake]') || tbl.querySelector('[data-stake]'); if (inp) { inp.value = c.getAttribute('data-chip'); inp.focus(); } return; }
    if (game === 'keno' && !busy) { kenoClick(e); return; }
    if (!CLOTH || busy) return;
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
    if (!place || !CLOTH) return;
    e.preventDefault();
    var k = place.getAttribute('data-place');
    if (bets[k]) { delete bets[k]; history = history.filter(function (h) { return h[0] !== k; }); paintBets(); }
  });

  function spinTo(n, then, slot) {
    var sp = tbl.querySelector('[data-spinner]');
    var ball = tbl.querySelector('[data-ball]');
    if (!sp || reduce) return then();
    var slots = Number(sp.getAttribute('data-slots')) || ORDER.length;
    var a = 360 / slots;
    var idx = typeof slot === 'number' ? slot : ORDER.indexOf(n);
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
      setTonight(j.tonight);
      if (j.lastout) { var lo = document.querySelector('[data-lastout]'); if (lo) lo.innerHTML = j.lastout; }
      if (game === 'hazard' || game === 'cage') shake();
      if (game === 'wheel') { var w = tbl.querySelector('.wnum'); if (w && !reduce) w.classList.add('pop'); }
      if (j.happy) { var hs = tbl.querySelector('[data-say]'); if (hs) hs.textContent += ' Happy hour adds ' + fmt(j.happy) + '.'; }
      result();
      busy = false;
      focusFirst();
    };
    if (game === 'wheel' && typeof j.spin === 'number') return spinTo(j.spin, finish);
    if (game === 'six' && typeof j.slot === 'number') return spinTo(null, finish, j.slot);
    if (game === 'cage') {
      var cg = tbl.querySelector('[data-cage]');
      Snd.dice();
      if (cg && !reduce) { cg.classList.remove('turning'); void cg.offsetWidth; cg.classList.add('turning'); setTimeout(function () { Snd.dice(); }, 450); return setTimeout(finish, 1100); }
      return finish();
    }
    var i = 0;
    (function next() {
      if (i >= frames.length) return finish();
      swap(frames[i++]);
      if (game === 'bones') shake();
      setTimeout(next, reduce ? 300 : (game === 'punto' ? 1000 : 800));
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
    if (CLOTH) {
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

  var kpicks = [];
  function kenoWire() {
    var h = tbl.querySelector('[data-kpicks]');
    kpicks = h && h.value ? h.value.split(',').map(Number).filter(Boolean) : [];
    kenoPaint();
  }
  function kenoPaint() {
    tbl.querySelectorAll('[data-kn]').forEach(function (b) { var on = kpicks.indexOf(Number(b.getAttribute('data-kn'))) >= 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    var h = tbl.querySelector('[data-kpicks]'); if (h) h.value = kpicks.join(',');
    var c = tbl.querySelector('[data-kcount]'); if (c) c.textContent = kpicks.length;
    var felt = tbl.querySelector('[data-keno]'), pay = tbl.querySelector('[data-kpay]');
    if (!felt || !pay) return;
    var table = {}; try { table = JSON.parse(felt.getAttribute('data-pay')) || {}; } catch (e) {}
    var t = table[kpicks.length];
    if (!t) { pay.innerHTML = '<span class="hint">Pick numbers to see what they pay.</span>'; return; }
    var ks = Object.keys(t).map(Number).sort(function (a, b) { return b - a; });
    pay.innerHTML = '<span class="lbl">' + kpicks.length + (kpicks.length === 1 ? ' number' : ' numbers') + ': what a septim brings back</span><span class="kpaylist">' + ks.map(function (k) { return '<span><b>' + k + '</b> hit' + (k === 1 ? '' : 's') + ' → ×' + t[k] + '</span>'; }).join('') + '</span>';
  }
  function kenoClick(e) {
    var b = e.target.closest('[data-kn]');
    if (b) {
      var n = Number(b.getAttribute('data-kn')), i = kpicks.indexOf(n);
      if (i >= 0) kpicks.splice(i, 1); else if (kpicks.length < 10) kpicks.push(n); else { say('Ten numbers is the most on one ticket.', 'bad'); return; }
      Snd.tick(); kenoPaint(); return;
    }
    if (e.target.closest('[data-kclear]')) { kpicks = []; kenoPaint(); return; }
    if (e.target.closest('[data-kquick]')) {
      var want = kpicks.length || 6, pool = []; for (var k = 1; k <= 80; k++) pool.push(k);
      kpicks = []; while (kpicks.length < want) { kpicks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
      Snd.chip(); kenoPaint();
    }
  }
  if (game === 'keno') {
    var skew = 0, kbusy = false, revealing = false;
    var felt0 = tbl.querySelector('[data-keno]');
    if (felt0) skew = Number(felt0.getAttribute('data-now')) - Date.now();
    setInterval(function () {
      var f = tbl.querySelector('[data-keno]'), c = tbl.querySelector('[data-kclock]');
      if (!f || !c) return;
      var left = Math.max(0, Number(f.getAttribute('data-next')) - (Date.now() + skew));
      var s = Math.ceil(left / 1000);
      c.textContent = revealing ? 'Drawing…' : (left <= 0 ? 'Now' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
      c.classList.toggle('low', s <= 10 && !revealing);
    }, 250);
    var kpoll = function () {
      if (kbusy || busy || revealing || document.hidden) return;
      var f = tbl.querySelector('[data-keno]'); if (!f) return;
      kbusy = true;
      fetch('/inn/keno/state.json?no=' + f.getAttribute('data-no') + '&last=' + f.getAttribute('data-last'), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.now) skew = j.now - Date.now();
          if (j.same) { f.setAttribute('data-next', j.nextAt); return; }
          if (!j.html) return;
          var newDraw = j.last && Number(f.getAttribute('data-last')) !== j.last.no;
          var done = function () {
            var a = document.activeElement && tbl.contains(document.activeElement) ? document.activeElement.getAttribute('name') : null;
            var keep = kpicks.slice(), stakeV = tbl.querySelector('[data-stake]') ? tbl.querySelector('[data-stake]').value : null;
            swap(j.html);
            if (!newDraw) { kpicks = keep; kenoPaint(); }
            var st = tbl.querySelector('[data-stake]'); if (st && stakeV !== null) st.value = stakeV;
            if (a) { var el = tbl.querySelector('[name="' + a + '"]'); if (el) el.focus(); }
            setPurse(j.purse);
            setTonight(j.tonight);
            if (j.lastout) { var lo = document.querySelector('[data-lastout]'); if (lo) lo.innerHTML = j.lastout; }
          };
          if (!newDraw) return done();
          revealing = true;
          var box = tbl.querySelector('[data-kballs]');
          var mine = kpicks.slice();
          if (box) box.innerHTML = '';
          tbl.querySelectorAll('[data-kn]').forEach(function (b) { b.classList.remove('drawn'); });
          var i = 0, hits = 0;
          (function drop() {
            if (i >= j.last.balls.length) { revealing = false; done(); if (hits) { Snd.win(); } return; }
            var n = j.last.balls[i++];
            var hit = mine.indexOf(n) >= 0; if (hit) hits++;
            if (box) { var s2 = document.createElement('span'); s2.className = 'kball drop' + (hit ? ' hit' : ''); s2.textContent = n; box.appendChild(s2); }
            var cell = tbl.querySelector('[data-kn="' + n + '"]'); if (cell) cell.classList.add('drawn');
            hit ? Snd.chip() : Snd.ball();
            setTimeout(drop, reduce ? 60 : 380);
          })();
        })
        .catch(function () {})
        .then(function () { kbusy = false; });
    };
    setInterval(kpoll, 2000);
  }

  function setTonight(t) {
    if (!t) return;
    var sg = function (n) { return (n > 0 ? '+' : (n < 0 ? '−' : '')) + fmt(Math.abs(n)); };
    [['[data-tonight]', t.all], ['[data-here]', t.here]].forEach(function (p) { var el = document.querySelector(p[0]); if (!el) return; var was = el.textContent; el.textContent = sg(p[1]); el.className = p[1] > 0 ? 'up' : (p[1] < 0 ? 'down' : ''); if (was !== el.textContent && !reduce) { el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 700); } });
  }
  (function favourClock() {
    var f = document.querySelector('[data-favour]');
    if (!f) return;
    var until = Number(f.getAttribute('data-favour'));
    var tick = function () { var left = Math.ceil((until - Date.now()) / 1000); if (left <= 0) { f.remove(); return; } var b = f.querySelector('[data-favourleft]'); if (b) b.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); setTimeout(tick, 1000); };
    tick();
  })();
  window.InnUI = { setTonight: setTonight, setPurse: setPurse, result: result, burst: burst, say: say, fmt: fmt };
  wire();
})();
