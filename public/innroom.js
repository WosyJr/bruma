(function () {
  var room = document.getElementById('room');
  var tbl = document.getElementById('roomtbl');
  if (!room || !tbl || !window.fetch || room.dataset.ready) return;
  room.dataset.ready = '1';
  var id = room.getAttribute('data-room');
  var v = Number(room.getAttribute('data-v')) || 0;
  var evn = Number(room.getAttribute('data-ev')) || 0;
  var me = Number(room.getAttribute('data-me'));
  var chat = document.querySelector('[data-chat]');
  var log = document.querySelector('[data-roomlog]');
  var busy = false, sending = false, pending = null, skew = 0, lastTick = -1, gone = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function S() { return window.InnSound || null; }
  function play(name) { var s = S(); if (s && s[name]) try { s[name](); } catch (e) {} }

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function setPurse(n) {
    if (n === null || n === undefined) return;
    document.querySelectorAll('[data-purse]').forEach(function (el) {
      var from = Number(String(el.textContent).replace(/[^\d-]/g, '')) || 0;
      if (from === n) return;
      el.classList.remove('pup', 'pdown'); void el.offsetWidth; el.classList.add(n > from ? 'pup' : 'pdown');
      el.textContent = fmt(n);
    });
  }

  function keepVals() {
    var out = {};
    tbl.querySelectorAll('[data-keep]').forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) out['r:' + el.name] = el.value; }
      else out[(el.name || '') + (el.hasAttribute('data-raiseslide') ? ':slide' : '')] = el.value;
    });
    return out;
  }
  function restoreVals(o, sameTurn) {
    if (!sameTurn) return;
    tbl.querySelectorAll('[data-keep]').forEach(function (el) {
      if (el.type === 'radio') { if (o['r:' + el.name] !== undefined) el.checked = el.value === o['r:' + el.name]; }
      else { var k = (el.name || '') + (el.hasAttribute('data-raiseslide') ? ':slide' : ''); if (o[k] !== undefined) el.value = o[k]; }
    });
  }
  function turnKey() { var t = tbl.querySelector('.pvtimer'); return t ? t.getAttribute('data-deadline') + '|' + (t.classList.contains('mine') ? 1 : 0) : ''; }

  function sound(ev, j) {
    if (!ev || ev.n <= evn) return;
    evn = ev.n;
    var k = ev.kind;
    if (k === 'end') { play(j.won ? 'win' : (j.me >= 0 ? 'lose' : 'chip')); return; }
    if (k === 'dice') play('dice');
    else if (k === 'card') { play('card'); setTimeout(function () { play('card'); }, 120); }
    else if (k === 'chip') play('chip');
    else if (k === 'fold') play('click');
    else if (k === 'turn') play('tick');
    else if (k === 'join') play('door');
    else if (k === 'talk') play('click');
    else if (k === 'mill') play('win');
    else if (k === 'reveal') play('card');
    else if (k === 'coin') play('chip');
  }

  function counts() { return Array.prototype.map.call(tbl.querySelectorAll('.cards'), function (c) { return c.querySelectorAll('.pcard:not(.ghost)').length; }); }
  function animate(prev, was) {
    if (reduce) return;
    var n = 0;
    tbl.querySelectorAll('.cards').forEach(function (c, i) {
      var cards = c.querySelectorAll('.pcard:not(.ghost)');
      for (var k = (prev[i] || 0); k < cards.length; k++) { cards[k].classList.add('dealt'); cards[k].style.animationDelay = (n * 0.1) + 's'; n++; }
    });
    var coin = tbl.querySelector('[data-coin]');
    if (coin && was.coin !== null && coin.getAttribute('data-n') !== was.coin) { coin.classList.add('flipping'); play('ball'); setTimeout(function () { coin.classList.remove('flipping'); }, 1300); }
    var rv = tbl.querySelector('[data-reveal]');
    if (rv && rv.getAttribute('data-reveal') !== was.reveal) rv.classList.add('show');
    var dice = tbl.querySelector('[data-dice]');
    if (dice && room.getAttribute('data-roll') === '1') { dice.classList.add('rolling'); setTimeout(function () { dice.classList.remove('rolling'); }, 600); }
  }

  function apply(j) {
    if (!j) return;
    if (j.gone) { gone = true; tbl.innerHTML = '<div class="pvdone"><p>That table has been cleared away.</p><a class="btn go" href="/inn/back">To the back room</a></div>'; return; }
    if (j.same) return;
    if (j.v === undefined) return;
    if (j.v < v) return;
    var a = document.activeElement;
    var typing = a && tbl.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT') && a.type !== 'radio';
    var before = turnKey();
    if (typing && j.html && turnKeyOf(j.html) === before) { pending = j; return; }
    pending = null;
    var vals = keepVals();
    var prevBoard = counts();
    var cEl = tbl.querySelector('[data-coin]'), rEl = tbl.querySelector('[data-reveal]');
    var was = { coin: cEl ? cEl.getAttribute('data-n') : null, reveal: rEl ? rEl.getAttribute('data-reveal') : null };
    room.setAttribute('data-roll', j.ev && j.ev.n > evn && j.ev.kind === 'dice' ? '1' : '0');
    v = j.v;
    me = j.me;
    tbl.innerHTML = j.html;
    restoreVals(vals, turnKey() === before);
    if (chat && j.chat !== undefined && chat.innerHTML !== j.chat) { chat.innerHTML = j.chat; chat.scrollTop = chat.scrollHeight; }
    if (log && j.log !== undefined) log.innerHTML = j.log;
    setPurse(j.purse);
    sound(j.ev, j);
    animate(prevBoard, was);
    wire();
    countdown();
  }
  function turnKeyOf(html) { var m = /class="pvtimer([^"]*)" data-deadline="(\d+)"/.exec(html); return m ? m[2] + '|' + (/mine/.test(m[1]) ? 1 : 0) : ''; }

  function poll() {
    if (busy || sending || gone || document.hidden) return;
    busy = true;
    fetch('/inn/room/' + encodeURIComponent(id) + '/state.json?v=' + v, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(apply)
      .catch(function () {})
      .then(function () { busy = false; });
  }

  function flash(text) {
    var f = tbl.querySelector('.pverr');
    if (!f) { f = document.createElement('p'); f.className = 'pverr'; f.setAttribute('role', 'alert'); tbl.insertBefore(f, tbl.firstChild); }
    f.textContent = text;
    play('lose');
  }

  function send(form, action, sub) {
    if (sending) return;
    sending = true;
    var fd = new FormData(form);
    var body = new URLSearchParams();
    fd.forEach(function (val, key) { body.append(key, val); });
    if (sub && sub.name) body.append(sub.name, sub.value);
    form.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    play('click');
    fetch(action, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        sending = false;
        if (!x.ok) { form.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); flash(x.j.error || 'That did not work.'); return; }
        if (/\/leave$/.test(action)) { window.location.href = '/inn/back'; return; }
        if (x.j.go) { window.location.href = x.j.go; return; }
        if (/\/join$/.test(action) && !document.querySelector('[data-say-form]')) { window.location.reload(); return; }
        if (/\/say$/.test(action)) { var inp = form.querySelector('input[name=text]'); if (inp) inp.value = ''; }
        pending = null;
        if (document.activeElement && tbl.contains(document.activeElement)) document.activeElement.blur();
        apply(x.j);
      })
      .catch(function () { sending = false; form.submit(); });
  }

  function wire() {
    tbl.querySelectorAll('form[data-room]').forEach(function (f) {
      if (f.dataset.wired) return;
      f.dataset.wired = '1';
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var sub = e.submitter;
        var action = sub && sub.getAttribute('formaction') ? sub.getAttribute('formaction') : f.getAttribute('action');
        send(f, action, sub);
      });
    });
    morrisWire();
    draughtsWire();
    var num = tbl.querySelector('[data-raise]'), sl = tbl.querySelector('[data-raiseslide]');
    if (num && sl) {
      sl.addEventListener('input', function () { num.value = sl.value; });
      num.addEventListener('input', function () { sl.value = num.value; });
      tbl.querySelectorAll('[data-raiseto]').forEach(function (b) { b.addEventListener('click', function () { num.value = sl.value = b.getAttribute('data-raiseto'); play('chip'); }); });
    }
    tbl.querySelectorAll('.facepick input').forEach(function (r) { r.addEventListener('change', function () { play('tick'); }); });
  }

  var msel = -1;
  function morrisWire() {
    var w = tbl.querySelector('[data-morris]');
    if (!w || w.getAttribute('data-turn') !== '1') return;
    var me = Number(w.getAttribute('data-me')), ph = w.getAttribute('data-phase'), take = w.getAttribute('data-take') === '1';
    var board = w.getAttribute('data-board').split(',').map(Number);
    var adj = []; try { adj = JSON.parse(w.getAttribute('data-adj')); } catch (e) {}
    var form = tbl.querySelector('form.mform');
    if (!form) return;
    var go = function (fields) {
      ['from', 'to', 'at'].forEach(function (k) { var el = form.querySelector('[data-m' + k + ']'); if (el) el.value = fields[k] === undefined ? '' : fields[k]; });
      send(form, form.getAttribute('action'));
    };
    var paint = function () {
      w.querySelectorAll('[data-pt]').forEach(function (g) {
        var i = Number(g.getAttribute('data-pt'));
        var pc = g.querySelector('.mp'), dot = g.querySelector('.mpt');
        if (pc) pc.classList.toggle('sel', i === msel);
        if (dot) { var ok = msel >= 0 && board[i] === -1 && (ph === 'fly' || (adj[msel] || []).indexOf(i) >= 0); dot.classList.toggle('tgt', ok); dot.setAttribute('r', ok ? 7 : 4); }
      });
    };
    var pick = function (i) {
      if (take) { if (board[i] === 1 - me) { play('lose'); go({ at: i }); } return; }
      if (ph === 'place') { if (board[i] === -1) { play('chip'); go({ to: i }); } return; }
      if (board[i] === me) { msel = msel === i ? -1 : i; play('tick'); paint(); return; }
      if (msel >= 0 && board[i] === -1 && (ph === 'fly' || (adj[msel] || []).indexOf(i) >= 0)) { var f = msel; msel = -1; play('chip'); go({ from: f, to: i }); }
    };
    w.querySelectorAll('[data-pt]').forEach(function (g) {
      g.addEventListener('click', function () { pick(Number(g.getAttribute('data-pt'))); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(Number(g.getAttribute('data-pt'))); } });
    });
    paint();
  }

  var dsel = -1;
  function draughtsWire() {
    var w = tbl.querySelector('[data-draughts]');
    if (!w || w.getAttribute('data-turn') !== '1') return;
    var legal = []; try { legal = JSON.parse(w.getAttribute('data-legal')); } catch (e) {}
    var chain = Number(w.getAttribute('data-chain'));
    if (chain >= 0) dsel = chain;
    var form = tbl.querySelector('form.dform');
    if (!form) return;
    var paint = function () {
      w.querySelectorAll('[data-sq]').forEach(function (h) {
        var i = Number(h.getAttribute('data-sq'));
        var ok = dsel >= 0 && legal.some(function (m) { return m[0] === dsel && m[1] === i; });
        var can = legal.some(function (m) { return m[0] === i; });
        h.classList.toggle('tgt', ok);
        h.classList.toggle('src', can);
        h.classList.toggle('picked', i === dsel);
      });
    };
    w.querySelectorAll('[data-sq]').forEach(function (h) {
      h.addEventListener('click', function () {
        var i = Number(h.getAttribute('data-sq'));
        if (legal.some(function (m) { return m[0] === i; }) && chain < 0) { dsel = dsel === i ? -1 : i; play('tick'); paint(); return; }
        if (dsel >= 0 && legal.some(function (m) { return m[0] === dsel && m[1] === i; })) {
          form.querySelector('[data-dfrom]').value = dsel; form.querySelector('[data-dto]').value = i;
          dsel = -1; play('chip'); send(form, form.getAttribute('action'));
        }
      });
    });
    paint();
  }

  tbl.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]');
    if (c) { var inp = tbl.querySelector('[data-stake]'); if (inp) { inp.value = c.getAttribute('data-chip'); play('chip'); } }
  });

  function countdown() {
    var t = tbl.querySelector('.pvtimer');
    if (!t) return;
    var srv = Number(t.getAttribute('data-now'));
    if (srv) skew = srv - Date.now();
  }
  setInterval(function () {
    var t = tbl.querySelector('.pvtimer');
    if (!t) return;
    var dl = Number(t.getAttribute('data-deadline')), tot = Number(t.getAttribute('data-total')) || 45000;
    var left = Math.max(0, dl - (Date.now() + skew));
    var s = Math.ceil(left / 1000);
    var lbl = t.querySelector('[data-left]'), bar = t.querySelector('i');
    if (lbl) lbl.textContent = s + 's';
    if (bar) bar.style.width = Math.min(100, left / tot * 100) + '%';
    t.classList.toggle('low', s <= 10);
    if (t.classList.contains('mine') && s <= 5 && s > 0 && s !== lastTick) { lastTick = s; play('tick'); }
  }, 250);

  var sayForm = document.querySelector('[data-say-form]');
  if (sayForm) sayForm.addEventListener('submit', function (e) { e.preventDefault(); send(sayForm, sayForm.getAttribute('action')); });
  var lastPhrase = 0;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-phrase]');
    if (!b || !sayForm) return;
    if (Date.now() - lastPhrase < 2500) return;
    lastPhrase = Date.now();
    var inp = sayForm.querySelector('input[name=text]');
    var em = sayForm.querySelector('input[name=emote]');
    var was = inp.value;
    inp.value = b.getAttribute('data-phrase');
    if (em) em.value = b.getAttribute('data-emote') ? '1' : '';
    send(sayForm, sayForm.getAttribute('action'));
    inp.value = was;
    if (em) em.value = '';
  });

  document.addEventListener('focusout', function () { setTimeout(function () { if (pending && !(document.activeElement && tbl.contains(document.activeElement))) apply(pending); }, 50); });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') && e.key !== 'Enter') return;
    if (e.key === 'Enter') return;
    var b = tbl.querySelector('button[data-key="' + e.key.toLowerCase() + '"]:not([disabled])');
    if (b) { e.preventDefault(); b.click(); }
  });

  wire();
  countdown();
  setInterval(poll, 1500);
  document.addEventListener('visibilitychange', poll);
})();
