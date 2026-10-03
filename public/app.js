(function () {
  var map = document.getElementById('map');
  if (!map) return;

  var pins = map.querySelectorAll('.pin');
  var form = document.getElementById('enterform');
  var start = document.getElementById('startplace');
  var cancel = document.getElementById('cancelplace');
  var note = document.getElementById('mapnote');
  var placing = false;

  function url(id) {
    var u = new URL(window.location.href);
    u.searchParams.set('p', id);
    u.hash = 'map';
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
    if (note) note.innerHTML = 'Click a pin to read it. Press <b>Enter a holding</b> above to set a new pin.';
    if (form) form.style.display = 'none';
  }

  if (start && form) {
    start.addEventListener('click', function () {
      placing = true;
      map.id = 'placing';
      if (note) note.innerHTML = '<b>Click the map</b> where the holding stands.';
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
})();

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
  var numbers = document.querySelectorAll('.stat .v, .big');
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
