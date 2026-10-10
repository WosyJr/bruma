(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var tut = document.getElementById('tut');
  if (tut && !tut.dataset.ready) {
    tut.dataset.ready = '1';
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
      if (form && window.fetch) {
        fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString(), credentials: 'same-origin' }).catch(function () {});
      }
      var first = document.querySelector('#inn [data-act]:not([hidden])');
      if (first) first.focus();
    };
    var open = function () {
      go(0);
      tut.hidden = false;
      document.body.classList.add('tutopen');
      next.focus();
    };
    back.addEventListener('click', function () { go(at - 1); });
    next.addEventListener('click', function () { go(at + 1); });
    tut.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('submit', function (e) { if (!window.fetch) return; e.preventDefault(); close(f); });
    });
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
  if (!inn || inn.dataset.ready || !inn.querySelector('[data-act]')) return;
  inn.dataset.ready = '1';
  var game = inn.getAttribute('data-game');
  var q = function (s) { return inn.querySelector(s); };
  var say = q('[data-say]');
  var acts = Array.prototype.slice.call(inn.querySelectorAll('[data-act]'));
  var act = function (n) { return q('[data-act="' + n + '"]'); };
  var busy = false;
  var speak = function (text, tone) { say.textContent = text || ''; say.className = 'say' + (tone ? ' ' + tone : ''); };
  var lock = function (on) { busy = on; acts.forEach(function (b) { b.disabled = on; }); };

  var SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
  var NAMES = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  function card(c, fresh) {
    var el = document.createElement('span');
    if (c === '??') { el.className = 'pcard back'; el.setAttribute('aria-label', 'A card face down'); }
    else {
      var r = c.slice(0, -1), su = c.slice(-1);
      el.className = 'pcard' + (su === 'h' || su === 'd' ? ' red' : '');
      el.setAttribute('aria-label', r + ' of ' + NAMES[su]);
      var i = document.createElement('i'); i.appendChild(document.createTextNode(r)); i.appendChild(document.createElement('br')); i.appendChild(document.createTextNode(SUIT[su]));
      var b = document.createElement('b'); b.textContent = SUIT[su];
      el.appendChild(i); el.appendChild(b);
    }
    if (fresh && !reduce) el.classList.add('dealt');
    return el;
  }
  function paintHand(who, cards) {
    var box = q('[data-cards="' + who + '"]');
    var had = Array.prototype.map.call(box.children, function (c) { return c.getAttribute('aria-label') || ''; });
    box.innerHTML = '';
    (cards.length ? cards : ['', '']).forEach(function (c, i) {
      if (!c) { var g = document.createElement('span'); g.className = 'pcard ghost'; box.appendChild(g); return; }
      var el = card(c, false);
      if (!reduce && had[i] !== el.getAttribute('aria-label')) el.classList.add('dealt');
      box.appendChild(el);
    });
  }
  function paintCards(v) {
    paintHand('inn', v.inn);
    paintHand('you', v.you);
    q('[data-total="inn"]').textContent = v.started ? String(v.innTotal) : '';
    q('[data-total="you"]').textContent = v.started ? (v.youSoft ? 'soft ' : '') + v.youTotal : '';
    speak(v.say, v.tone);
  }
  function finishCards(v) {
    paintCards(v);
    act('hit').hidden = v.over;
    act('stand').hidden = v.over;
    act('deal').hidden = !v.over;
    act('deal').textContent = 'Deal another hand';
    var st = q('[data-streak]');
    if (st) st.textContent = v.streak > 1 ? v.streak + ' wins in a row' : '';
    lock(false);
    var f = acts.filter(function (b) { return !b.hidden; })[0];
    if (f) f.focus();
  }

  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  var GOAL = Number(inn.dataset.goal) || 50;
  function die(v) {
    var d = document.createElement('span');
    d.className = 'die' + (v === 1 ? ' frost' : '') + (v ? '' : ' blank');
    if (v) d.setAttribute('aria-label', String(v));
    for (var i = 0; i < 9; i++) { var b = document.createElement('b'); if (v && PIPS[v].indexOf(i) > -1) b.className = 'on'; d.appendChild(b); }
    return d;
  }
  function showDice(vals) {
    var box = q('[data-bones]');
    box.innerHTML = '';
    (vals && vals.length ? vals : [0, 0, 0]).forEach(function (v) { box.appendChild(die(v)); });
    box.classList.remove('rolling');
    void box.offsetWidth;
    if (!reduce) box.classList.add('rolling');
  }
  function score(who, n) {
    q('[data-score="' + who + '"]').textContent = n;
    q('[data-track="' + who + '"]').style.width = Math.min(100, Math.round(n / GOAL * 100)) + '%';
  }
  function seat(who) { inn.querySelectorAll('.iseat').forEach(function (el) { el.classList.toggle('turn', el.getAttribute('data-seat') === who); }); }
  function finishBones(g) {
    score('you', g.you); score('inn', g.inn);
    q('[data-pot]').textContent = g.pot;
    speak(g.say, g.tone);
    seat(g.over ? '' : g.turn);
    var log = q('[data-log]');
    log.innerHTML = '';
    (g.log.length ? g.log : ['The fire is lit. A new game.']).forEach(function (l) { var d = document.createElement('div'); d.textContent = l; log.appendChild(d); });
    act('throw').hidden = g.over || g.turn !== 'you';
    act('bank').hidden = g.over || !g.pot;
    act('new').hidden = !g.over;
    lock(false);
    var f = acts.filter(function (b) { return !b.hidden; })[0];
    if (f) f.focus();
  }

  function play(r) {
    var steps = r.steps || [];
    var i = 0;
    (function next() {
      if (i >= steps.length) {
        if (game === 'cards') return finishCards(r.state);
        if (!steps.length) showDice([0, 0, 0]);
        return finishBones(r.game);
      }
      var s = steps[i++];
      if (game === 'cards') paintCards(s);
      else {
        seat(s.who);
        showDice(s.dice);
        q('[data-pot]').textContent = s.pot;
        if (typeof s.you === 'number') score('you', s.you);
        if (typeof s.inn === 'number') score('inn', s.inn);
        speak(s.say, s.tone);
      }
      var wait = i < steps.length ? 900 : (game === 'cards' ? 650 : 0);
      if (reduce) wait = Math.min(wait, 350);
      setTimeout(next, wait);
    })();
  }

  inn.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-inn]');
    if (!form || !window.fetch) return;
    e.preventDefault();
    if (busy) return;
    lock(true);
    fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString(), credentials: 'same-origin' })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) { lock(false); speak(r.j.error || 'The innkeeper did not hear you.', 'bad'); return; }
        play(r.j);
      })
      .catch(function () { lock(false); speak('The innkeeper did not hear you. Try again.', 'bad'); });
  });
})();
