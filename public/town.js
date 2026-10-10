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

  var MAX = 900;
  function shrink(file, done) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k));
        c.height = Math.max(1, Math.round(img.naturalHeight * k));
        var x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        done(null, c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { done('That file is not a picture this browser can read.'); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('input[type=file][data-picture]')) return;
    var form = input.closest('form');
    var out = form.querySelector('input[name="' + input.getAttribute('data-picture') + '"]');
    var view = form.querySelector('[data-picture-view]');
    var note = form.querySelector('[data-picture-note]');
    var btn = form.querySelector('button[type=submit]');
    out.value = '';
    var f = input.files && input.files[0];
    if (!f) return;
    if (btn) btn.disabled = true;
    if (note) note.textContent = 'Preparing the picture…';
    shrink(f, function (err, url) {
      if (btn) btn.disabled = false;
      if (err) { if (note) note.textContent = err; input.value = ''; return; }
      out.value = url;
      if (view) { view.src = url; view.hidden = false; }
      if (note) note.textContent = 'Ready.';
    });
  });
})();
