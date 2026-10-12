function initMap() {
  var map = document.getElementById('map');
  if (!map || map.dataset.ready) return;
  map.dataset.ready = '1';

  var pins = map.querySelectorAll('.pin');
  var form = document.getElementById('enterform');
  var start = document.getElementById('startplace');
  var cancel = document.getElementById('cancelplace');
  var note = document.getElementById('mapnote');
  var placing = false;

  var param = map.getAttribute('data-param') || 'p';
  var anchor = map.getAttribute('data-hash') || 'map';

  function url(id) {
    var u = new URL(window.location.href);
    u.searchParams.set(param, id);
    u.hash = anchor;
    return u.toString();
  }

  Array.prototype.forEach.call(pins, function (b) {
    b.addEventListener('click', function (e) {
      if (placing) return;
      e.stopPropagation();
      window.location.href = url(b.getAttribute('data-id'));
    });
  });

  function stop() {
    placing = false;
    map.id = 'map';
    if (cancel && cancel.parentNode && cancel.parentNode.className === 'maptabs') cancel.style.display = 'none';
    if (note) note.innerHTML = 'Click a pin to read it. Press <b>Enter a holding</b> above to set a new pin.';
    if (form) form.style.display = 'none';
  }

  if (start && form) {
    start.addEventListener('click', function () {
      placing = true;
      map.id = 'placing';
      if (cancel) cancel.style.display = '';
      if (note) note.innerHTML = '<b>Click the map</b> where it lies.';
      map.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cancel) cancel.addEventListener('click', stop);

  map.addEventListener('click', function (e) {
    if (!placing || !form) return;
    var r = map.getBoundingClientRect();
    var x = Math.round(((e.clientX - r.left) / r.width) * 10000) / 100;
    var y = Math.round(((e.clientY - r.top) / r.height) * 10000) / 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    document.getElementById('newx').value = x;
    document.getElementById('newy').value = y;

    var at = document.getElementById('atwhere');
    if (at) at.textContent = 'Set at ' + x.toFixed(1) + ' across and ' + y.toFixed(1) + ' down the map. Click the map again to move it.';

    var ghost = document.getElementById('ghostpin');
    if (!ghost) {
      ghost = document.createElement('span');
      ghost.id = 'ghostpin';
      ghost.className = 'pin on';
      ghost.style.pointerEvents = 'none';
      ghost.innerHTML = '<svg viewBox="0 0 28 36"><circle class="ring" cx="14" cy="13" r="13" fill="none" stroke="#F4D4A2" stroke-width="2" opacity="0.55"/>'
        + '<path d="M14 35C14 35 25 22.5 25 13A11 11 0 1 0 3 13c0 9.5 11 22 11 22z" fill="#1F1710" stroke="#F4D4A2" stroke-width="2"/></svg>';
      map.appendChild(ghost);
    }
    ghost.style.left = x + '%';
    ghost.style.top = y + '%';

    form.style.display = '';
    if (note) note.innerHTML = 'Pin set. Fill in the holding below, or click the map again to move it.';
    var name = document.getElementById('name');
    if (name) name.focus();
  });
}
initMap();

(function () {
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pins = document.querySelectorAll('.pin');
  Array.prototype.forEach.call(pins, function (p, i) {
    p.style.animationDelay = calm ? '0s' : (0.18 + Math.min(i, 24) * 0.035).toFixed(3) + 's';
  });

  if (calm) return;

  function countUp(el) {
    var raw = el.textContent.trim();
    var target = Number(raw.replace(/[^0-9.-]/g, ''));
    if (!isFinite(target) || target === 0 || Math.abs(target) > 99999999) return;
    var group = raw.indexOf(',') >= 0;
    var ms = 620;
    var start = performance.now();
    el.classList.add('counting');
    function frame(now) {
      var t = Math.min(1, (now - start) / ms);
      var eased = 1 - Math.pow(1 - t, 3);
      var v = Math.round(target * eased);
      el.textContent = group ? v.toLocaleString('en-GB') : String(v);
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.textContent = raw;
        setTimeout(function () { el.classList.remove('counting'); }, 300);
      }
    }
    requestAnimationFrame(frame);
  }

  var seen = [];
  var numbers = document.querySelectorAll('.stat .v, .big:not(.rib)');
  if (!numbers.length) return;

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(numbers, countUp);
    return;
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || seen.indexOf(e.target) >= 0) return;
      seen.push(e.target);
      countUp(e.target);
      watcher.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  Array.prototype.forEach.call(numbers, function (n) { watcher.observe(n); });
})();

(function () {
  var buttons = document.querySelectorAll('[data-picture]');
  if (!buttons.length) return;
  var loading = null;

  function library() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (loading) return loading;
    loading = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = '/html2canvas.min.js?v=1';
      s.onload = function () { window.html2canvas ? ok(window.html2canvas) : no(new Error('not loaded')); };
      s.onerror = function () { no(new Error('could not be fetched')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function flatten(doc) {
    var all = doc.querySelectorAll('*');
    Array.prototype.forEach.call(all, function (el) {
      var cs = doc.defaultView.getComputedStyle(el);
      if (/gradient/i.test(cs.backgroundImage)) el.style.backgroundImage = 'none';
      if (cs.boxShadow && cs.boxShadow !== 'none') el.style.boxShadow = 'none';
      if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') {
        el.style.webkitBackgroundClip = 'border-box';
        el.style.backgroundClip = 'border-box';
        el.style.color = '#F7EEDC';
      }
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-nopicture]'), function (el) { el.remove(); });
  }

  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      var target = document.querySelector(b.getAttribute('data-picture'));
      if (!target) return;
      var name = (b.getAttribute('data-picture-name') || 'bruma') + '.png';
      var was = b.textContent;
      b.textContent = 'Drawing…';
      b.disabled = true;

      library().then(function (h2c) {
        return h2c(target, {
          backgroundColor: '#17110C',
          scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
          logging: false,
          useCORS: true,
          onclone: function (doc) { flatten(doc); }
        });
      }).then(function (canvas) {
        return new Promise(function (ok) { canvas.toBlob(ok, 'image/png'); });
      }).then(function (blob) {
        if (!blob) throw new Error('nothing was drawn');
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        b.textContent = 'Saved';
        setTimeout(function () { b.textContent = was; b.disabled = false; }, 1600);
      }).catch(function (e) {
        b.textContent = 'It would not draw';
        b.title = String(e && e.message ? e.message : e);
        setTimeout(function () { b.textContent = was; b.disabled = false; }, 2600);
      });
    });
  });
})();

(function () {
  var crest = document.querySelector('.crest');
  var mast = document.querySelector('.mast');
  if (!crest || !mast) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var map = document.getElementById('clothmap');
  var GALE = { open: 0.1, riders: 0.38, escort: 0.68, shut: 1 };
  var pm = document.querySelector('meta[name="bruma-pass"]');
  var gale = GALE[pm ? String(pm.getAttribute('content') || 'open') : 'open'];
  if (typeof gale !== 'number') gale = 0.1;

  var base = 5 + gale * 10;
  var want = 0;
  var have = 0;
  var gust = 0;
  var last = 0;
  var running = false;
  var started = performance.now();

  mast.style.setProperty('--gale', gale.toFixed(3));

  function onMove(e) {
    var w = window.innerWidth || 1;
    var next = ((e.clientX / w) * 2 - 1);
    var moved = Math.abs(next - want);
    want = Math.max(-1, Math.min(1, next));
    gust = Math.min(1, gust + moved * 2.2);
    last = performance.now();
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function frame(now) {
    have += (want - have) * 0.07;
    gust *= 0.94;
    var breath = Math.sin((now - started) / (1500 - gale * 700)) * gale;
    mast.style.setProperty('--wind', (have + breath * 0.5).toFixed(4));
    if (map) map.setAttribute('scale', (base + gust * 16 + Math.abs(breath) * 5).toFixed(2));
    if (gale < 0.2 && Math.abs(want - have) < 0.002 && gust < 0.01 && now - last > 400) {
      running = false;
      if (map) map.setAttribute('scale', base.toFixed(2));
      return;
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('blur', function () { want = 0; gust = 0; last = performance.now();
    if (!running) { running = true; requestAnimationFrame(frame); } });
  if (gale >= 0.2) { running = true; requestAnimationFrame(frame); }
  else if (map) map.setAttribute('scale', base.toFixed(2));
})();

(function () {
  var strip = document.querySelector('.passstrip');
  if (!strip) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (strip.getAttribute('data-pass') !== 'shut') return;

  var drift = strip.querySelector('.drift');
  if (!drift) return;
  var base = 0.72;

  function gustIt() {
    var peak = base + 0.22;
    drift.animate(
      [{ opacity: base }, { opacity: peak, offset: 0.35 }, { opacity: base }],
      { duration: 900 + Math.random() * 700, easing: 'ease-in-out' }
    );
    setTimeout(gustIt, 2600 + Math.random() * 4200);
  }
  setTimeout(gustIt, 1800 + Math.random() * 2000);
})();

(function () {
  function rows(btn) { return btn.closest('form').querySelector('[data-personrows]'); }
  document.addEventListener('click', function (e) {
    var add = e.target.closest && e.target.closest('[data-addperson]');
    if (add) {
      var box = rows(add);
      if (!box) return;
      var last = box.querySelector('.prow:last-child');
      if (!last) return;
      var copy = last.cloneNode(true);
      copy.querySelectorAll('input').forEach(function (i) { i.value = ''; });
      var sel = copy.querySelector('select');
      if (sel) sel.selectedIndex = 0;
      box.appendChild(copy);
      var first = copy.querySelector('input');
      if (first) first.focus();
      return;
    }
    var drop = e.target.closest && e.target.closest('[data-dropperson]');
    if (drop) {
      var row = drop.closest('.prow');
      var box2 = rows(drop);
      if (!row || !box2) return;
      if (box2.querySelectorAll('.prow').length <= 1) {
        row.querySelectorAll('input').forEach(function (i) { i.value = ''; });
        return;
      }
      row.remove();
    }
  });
})();

document.addEventListener('change', function (e) {
  var sel = e.target.closest && e.target.closest('[data-lictrade]');
  if (!sel) return;
  var form = sel.closest('form');
  if (!form) return;
  var fee = form.querySelector('[data-licfee]');
  var opt = sel.options[sel.selectedIndex];
  if (fee && opt && opt.getAttribute('data-fee')) fee.value = opt.getAttribute('data-fee');
});

(function () {
  var grps = document.querySelectorAll('[data-grp]');
  if (!grps.length) return;
  Array.prototype.forEach.call(grps, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      Array.prototype.forEach.call(grps, function (o) { if (o !== d) o.removeAttribute('open'); });
    });
  });
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(grps, function (d) { if (d.open && !d.contains(e.target)) d.removeAttribute('open'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') Array.prototype.forEach.call(grps, function (d) { d.removeAttribute('open'); });
  });
})();

(function () {
  var doors = document.querySelectorAll('[data-door]');
  if (!doors.length) return;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  Array.prototype.forEach.call(doors, function (a) {
    var key = 'door:' + a.getAttribute('data-door');
    var stamp = a.getAttribute('data-stamp') || '';
    var dot = a.querySelector('.dot');
    var was = get(key);
    if (stamp && was !== null && was !== stamp && dot) dot.hidden = false;
    if (was === null) set(key, stamp);
    a.addEventListener('click', function () { set(key, stamp); });
  });
  var here = document.querySelector('[data-door="' + location.pathname + '"]');
  if (here) set('door:' + location.pathname, here.getAttribute('data-stamp') || '');
})();

(function () {
  var box = document.getElementById('gate');
  var src = document.getElementById('gatewrits');
  if (!box || !src) return;
  var writs;
  try { writs = JSON.parse(src.textContent); } catch (e) { return; }
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var today = new Date().toISOString().slice(0, 10);
  var pick = null;
  for (var i = 0; i < writs.length; i++) {
    var w = writs[i];
    if (get('gate:' + w.id) === 'read') continue;
    if (get('gate:' + w.id) === 'later:' + today) continue;
    pick = w; break;
  }
  if (!pick) return;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  box.querySelector('[data-gate-ey]').textContent = 'By the hand of the County · Proclamation no. ' + pick.no;
  box.querySelector('[data-gate-title]').textContent = pick.title;
  box.querySelector('[data-gate-text]').innerHTML = pick.text.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<p><a href="' + esc(pick.href) + '">Read it in full →</a></p>';
  box.querySelector('[data-gate-sig]').textContent = pick.hand + (pick.dated ? ' · ' + pick.dated : '');
  box.hidden = false;
  document.body.style.overflow = 'hidden';
  var close = function () { box.hidden = true; document.body.style.overflow = ''; };
  var tell = function () {
    var form = document.querySelector('input[name=_csrf]');
    if (!form) return;
    try { fetch('/gate/seen', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '_csrf=' + encodeURIComponent(form.value) + '&id=' + encodeURIComponent(pick.id), credentials: 'same-origin' }); } catch (e) {}
  };
  box.querySelector('[data-gate-read]').addEventListener('click', function () { set('gate:' + pick.id, 'read'); tell(); close(); });
  Array.prototype.forEach.call(box.querySelectorAll('[data-gate-later]'), function (b) { b.addEventListener('click', function () { set('gate:' + pick.id, 'later:' + today); close(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) { set('gate:' + pick.id, 'later:' + today); close(); } });
  var rb = box.querySelector('[data-gate-read]'); if (rb) rb.focus();
})();

function initOwn() {
  var sels = document.querySelectorAll('[data-own-toggle]');
  Array.prototype.forEach.call(sels, function (s) {
    var box = document.getElementById(s.getAttribute('data-own-toggle'));
    if (!box || s.dataset.ready) return;
    s.dataset.ready = '1';
    s.addEventListener('change', function () { box.hidden = s.value !== 'own'; if (s.value === 'own') { var i = box.querySelector('input[type=url]'); if (i) i.focus(); } });
  });
}
initOwn();

(function () {
  var main = document.querySelector('main.wrap');
  if (!main || !window.fetch || !window.DOMParser || !window.URLSearchParams) return;
  var own = !!(main.querySelector('script') || document.getElementById('inn') || document.getElementById('room') || document.querySelector('[data-livetables], [data-nolive]'));
  if (own) return;
  var v = null, busy = false, dirty = false, pending = false;
  main.addEventListener('input', function (e) { if (e.target.closest('form')) dirty = true; });
  main.addEventListener('change', function (e) { if (e.target.closest('form')) dirty = true; });

  function toast(html) {
    var t = document.createElement('div');
    t.className = 'livetoast';
    t.setAttribute('role', 'status');
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3800);
    setTimeout(function () { t.remove(); }, 4400);
  }
  var touched = 0;
  main.addEventListener('pointerdown', function () { touched = Date.now(); });
  main.addEventListener('keydown', function () { touched = Date.now(); });
  function keyOf(d, i) { var s = d.querySelector('summary'); return (s ? s.textContent.replace(/\s+/g, ' ').trim() : '') || ('#' + i); }
  function calm(el) { if (el.nodeType === 1) { el.classList.add('liveswap'); } }
  function morph(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { var n = b.cloneNode(true); calm(n); a.parentNode.replaceChild(n, a); return; }
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.nodeType !== 1) return;
    if (a !== main) {
      for (var i = a.attributes.length - 1; i >= 0; i--) { var nmA = a.attributes[i].name; if (!b.hasAttribute(nmA) && nmA !== 'open' && nmA !== 'data-ready' && nmA !== 'class') a.removeAttribute(nmA); }
      for (var j = 0; j < b.attributes.length; j++) { var at = b.attributes[j]; if (at.name === 'class') continue; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
      var keep = (a.getAttribute('class') || '').split(/\s+/).filter(function (c) { return c === 'liveswap' || c === 'counting'; });
      var want = (b.getAttribute('class') || '').split(/\s+/).filter(Boolean).concat(keep).join(' ');
      if ((a.getAttribute('class') || '') !== want) { if (want) a.setAttribute('class', want); else a.removeAttribute('class'); }
      if (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') return;
    }
    if (a.innerHTML === b.innerHTML) return;
    var ac = Array.prototype.slice.call(a.childNodes), bc = Array.prototype.slice.call(b.childNodes);
    if (ac.length !== bc.length) {
      var same = 0;
      while (same < ac.length && same < bc.length && ac[same].nodeType === bc[same].nodeType && (ac[same].nodeType !== 1 || ac[same].outerHTML === bc[same].outerHTML)) same++;
      for (var k = ac.length - 1; k >= same; k--) a.removeChild(ac[k]);
      for (var m = same; m < bc.length; m++) { var c = bc[m].cloneNode(true); calm(c); a.appendChild(c); }
      return;
    }
    for (var q = 0; q < ac.length; q++) morph(ac[q], bc[q]);
  }
  function opened() { var o = {}; main.querySelectorAll('details').forEach(function (d, i) { if (d.open) o[keyOf(d, i)] = 1; }); return o; }
  function swap(html, showFlash) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nm = doc.querySelector('main.wrap');
    if (!nm) return false;
    var flash = nm.querySelector('.flash');
    if (flash && showFlash) { toast(flash.outerHTML); }
    if (flash && !showFlash) flash.remove();
    var cur = main.cloneNode(true);
    var cf = cur.querySelector('.flash'); if (cf) cf.remove();
    if (!showFlash && cur.innerHTML === nm.innerHTML) return true;
    var open = opened();
    var y = window.scrollY;
    var oldFlash = main.querySelector('.flash');
    if (showFlash && flash && oldFlash) oldFlash.remove();
    if (flash && showFlash) flash.remove();
    morph(main, nm);
    main.querySelectorAll('details').forEach(function (d, i) { if (open[keyOf(d, i)]) d.open = true; });
    window.scrollTo(0, y);
    var ns = doc.querySelector('.passstrip, .pass'), os = document.querySelector('.passstrip, .pass');
    if (ns && os && ns.outerHTML !== os.outerHTML) os.outerHTML = ns.outerHTML;
    dirty = false;
    initMap(); initOwn();
    return true;
  }
  function editing() {
    var a = document.activeElement;
    if (a && main.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'submit' && a.type !== 'button') return true;
    return dirty || !!document.getElementById('placing') || Date.now() - touched < 4000;
  }
  function refresh() {
    if (busy) return;
    if (editing()) { pending = true; return; }
    busy = true; pending = false;
    fetch(window.location.href, { credentials: 'same-origin', headers: { 'X-Live': '1' } })
      .then(function (r) { if (!r.ok || r.redirected) throw new Error(r.status); return r.text(); })
      .then(function (h) { if (!editing()) swap(h, false); else pending = true; })
      .catch(function () {})
      .then(function () { busy = false; });
  }
  function tick() {
    if (document.hidden) return;
    fetch('/live/v', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (v !== null && j.v !== v) refresh(); else if (pending) refresh(); v = j.v; })
      .catch(function () {});
  }
  tick();
  setInterval(tick, 4000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!main.contains(f)) return;
    if ((f.getAttribute('method') || 'get').toLowerCase() !== 'post') return;
    try { sessionStorage.setItem('liveScroll', JSON.stringify({ path: window.location.pathname, y: window.scrollY, at: Date.now() })); } catch (err) {}
  });
  (function () {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('liveScroll') || 'null'); sessionStorage.removeItem('liveScroll'); } catch (err) {}
    if (!saved || saved.path !== window.location.pathname || Date.now() - saved.at > 20000) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, saved.y);
    requestAnimationFrame(function () { window.scrollTo(0, saved.y); });
    var fl = main.querySelector('.flash');
    if (fl && saved.y > 200) toast(fl.outerHTML);
  })();

  window.BrumaInit = function () { initMap(); initOwn(); };
})();

document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-copy]');
  if (!b) return;
  var src = b.parentNode.querySelector('[data-copyme]');
  if (!src) return;
  var t = src.textContent;
  var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
  try { navigator.clipboard.writeText(t).then(done, function () {}); } catch (err) {}
});
