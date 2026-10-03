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
