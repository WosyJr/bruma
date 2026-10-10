(function () {
  var walk = document.getElementById('ghostwalk');
  if (walk && !walk.dataset.ready) {
    walk.dataset.ready = '1';
    var fig = document.getElementById('ghostfig');
    var form = document.getElementById('ghostform');
    var backIn = form && form.querySelector('input[name="back"]');
    if (backIn) backIn.value = location.pathname + location.search;
    setTimeout(function () { walk.classList.add('go'); }, 1500 + Math.random() * 4000);
    fig.addEventListener('click', function () {
      walk.classList.remove('go');
      walk.classList.add('caught');
      form.hidden = false;
      var n = form.querySelector('input[name="name"]:not([type=hidden])');
      if (n) n.focus(); else form.submit();
    });
    fig.addEventListener('animationend', function () { if (!walk.classList.contains('caught')) walk.remove(); });
  }

  var OW = 600, OH = 800;
  function load(file, done) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () { done(null, img); };
      img.onerror = function () { done('That file is not a picture this browser can read.'); };
      img.src = r.result;
    };
    r.onerror = function () { done('That file could not be read.'); };
    r.readAsDataURL(file);
  }
  function cropper(form, img, out, note, btn) {
    var old = form.querySelector('.cropper');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.className = 'cropper';
    wrap.innerHTML = '<div class="cropstage" tabindex="0" aria-label="Drag to move the picture inside the frame. Arrow keys move it, plus and minus zoom."><canvas width="' + OW + '" height="' + OH + '"></canvas><i class="cropgrid" aria-hidden="true"></i></div>' +
      '<div class="cropctl"><p class="hint">Drag the picture to place it in the frame, and zoom until the face sits right. This is exactly how it will look.</p>' +
      '<label>Zoom<input type="range" min="1" max="4" step="0.01" value="1" data-zoom></label>' +
      '<div class="btnrow"><button type="button" class="btn ghost small" data-fit>Fit the whole picture</button><button type="button" class="btn ghost small" data-reset>Fill the frame</button></div></div>';
    var view = form.querySelector('[data-picture-view]');
    (view || out).insertAdjacentElement('afterend', wrap);
    if (view) view.hidden = true;
    var stage = wrap.querySelector('.cropstage');
    var cv = wrap.querySelector('canvas');
    var cx = cv.getContext('2d');
    var zoomIn = wrap.querySelector('[data-zoom]');
    var cover = Math.max(OW / img.naturalWidth, OH / img.naturalHeight);
    var contain = Math.min(OW / img.naturalWidth, OH / img.naturalHeight);
    var minK = contain / cover;
    zoomIn.min = String(Math.max(0.2, minK).toFixed(2));
    var st = { z: 1, x: 0, y: 0 };
    var timer = null;
    function clamp() {
      var w = img.naturalWidth * cover * st.z, h = img.naturalHeight * cover * st.z;
      var mx = Math.abs(w - OW) / 2, my = Math.abs(h - OH) / 2;
      st.x = Math.max(-mx, Math.min(mx, st.x));
      st.y = Math.max(-my, Math.min(my, st.y));
    }
    function draw() {
      clamp();
      var w = img.naturalWidth * cover * st.z, h = img.naturalHeight * cover * st.z;
      cx.fillStyle = '#1F1710';
      cx.fillRect(0, 0, OW, OH);
      cx.drawImage(img, (OW - w) / 2 + st.x, (OH - h) / 2 + st.y, w, h);
      clearTimeout(timer);
      if (btn) btn.disabled = true;
      timer = setTimeout(function () { out.value = cv.toDataURL('image/jpeg', 0.86); if (btn) btn.disabled = false; if (note) note.textContent = 'Ready.'; }, 180);
    }
    var drag = null;
    stage.addEventListener('pointerdown', function (e) { drag = { px: e.clientX, py: e.clientY, x: st.x, y: st.y }; stage.setPointerCapture(e.pointerId); stage.classList.add('grab'); });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var k = OW / stage.getBoundingClientRect().width;
      st.x = drag.x + (e.clientX - drag.px) * k;
      st.y = drag.y + (e.clientY - drag.py) * k;
      draw();
    });
    function stop() { drag = null; stage.classList.remove('grab'); }
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);
    stage.addEventListener('wheel', function (e) { e.preventDefault(); setZoom(st.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06)); }, { passive: false });
    stage.addEventListener('keydown', function (e) {
      var step = 12;
      if (e.key === 'ArrowLeft') st.x -= step; else if (e.key === 'ArrowRight') st.x += step;
      else if (e.key === 'ArrowUp') st.y -= step; else if (e.key === 'ArrowDown') st.y += step;
      else if (e.key === '+' || e.key === '=') return setZoom(st.z * 1.06);
      else if (e.key === '-') return setZoom(st.z / 1.06);
      else return;
      e.preventDefault();
      draw();
    });
    function setZoom(z) { st.z = Math.max(Number(zoomIn.min), Math.min(4, z)); zoomIn.value = String(st.z); draw(); }
    zoomIn.addEventListener('input', function () { st.z = Number(zoomIn.value); draw(); });
    wrap.querySelector('[data-fit]').addEventListener('click', function () { st.x = 0; st.y = 0; setZoom(Number(zoomIn.min)); });
    wrap.querySelector('[data-reset]').addEventListener('click', function () { st.x = 0; st.y = 0; setZoom(1); });
    draw();
  }
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('input[type=file][data-picture]')) return;
    var form = input.closest('form');
    var out = form.querySelector('input[name="' + input.getAttribute('data-picture') + '"]');
    var note = form.querySelector('[data-picture-note]');
    var btn = form.querySelector('button[type=submit]');
    out.value = '';
    var f = input.files && input.files[0];
    if (!f) return;
    if (note) note.textContent = 'Opening the picture…';
    load(f, function (err, img) {
      if (err) { if (note) note.textContent = err; input.value = ''; return; }
      if (note) note.textContent = '';
      cropper(form, img, out, note, btn);
    });
  });
})();
