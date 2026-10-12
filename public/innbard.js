(function () {
  var host = document.getElementById('bard');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = '1';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  };
  var chan = null;
  try { chan = new BroadcastChannel('innbard'); } catch (e) { chan = null; }
  var state = { alive: false, title: '', playing: false, at: 0 };

  host.className = 'bard';
  document.body.classList.add('hasbard');
  host.innerHTML = '<div class="bardhint" data-hint hidden role="status"><b>♪ Music in the hall</b><span>Open Bard’s corner to play the house list or your own YouTube songs. It plays in its own little window, so the music keeps going while you move between tables. Drag the window’s edges to size it.</span><button type="button" class="btn go small" data-hintok>Got it</button></div>' +
    '<div class="bardmini"><div class="bardbar">' +
    '<button type="button" class="bardbtn" data-open aria-label="Open Bard’s corner">♪</button>' +
    '<button type="button" class="bardtitle linkish" data-open data-title>Bard’s corner</button>' +
    '<button type="button" class="bardbtn" data-toggle aria-label="Play or pause">⏯</button>' +
    '<button type="button" class="bardbtn" data-next aria-label="Next song" hidden>⏭</button>' +
    '</div><p class="hint bardnote" data-note hidden></p></div>';
  var q = function (s) { return host.querySelector(s); };

  function paint() {
    var alive = state.alive && Date.now() - state.at < 3500;
    q('[data-title]').textContent = alive && state.title ? (state.playing ? '♪ ' : '❚❚ ') + state.title : 'Bard’s corner';
    q('[data-next]').hidden = !alive;
    host.classList.toggle('playing', alive && state.playing);
  }
  function hear(m) {
    if (!m || m.type !== 'state') return;
    if (m.closed) { state.alive = false; paint(); return; }
    state = { alive: true, title: m.title || '', playing: !!m.playing, at: Date.now() };
    paint();
  }
  if (chan) { chan.onmessage = function (e) { hear(e.data); }; chan.postMessage({ type: 'ping' }); }
  window.addEventListener('storage', function (e) { if (e.key === 'bardBeat') { var m = store.get('bardBeat', null); if (m && Date.now() - (m.at || 0) < 3500) hear(m); } });
  var beat = store.get('bardBeat', null);
  if (beat && !beat.closed && Date.now() - (beat.at || 0) < 3500) hear(beat);
  setInterval(paint, 1500);

  function openWin() {
    var w = null;
    try { w = window.open('', 'innbard', 'popup=yes,width=460,height=700'); } catch (e) { w = null; }
    if (!w) { var n = q('[data-note]'); n.hidden = false; n.textContent = 'Your browser blocked the music window. Allow pop-ups for this site, then press ♪ again.'; return; }
    var blank = true;
    try { blank = !w.location.href || w.location.href === 'about:blank'; } catch (e) { blank = false; }
    if (blank) w.location.href = '/inn/bard';
    try { w.focus(); } catch (e) {}
    q('[data-note]').hidden = true;
  }
  function send(cmd) { if (chan) chan.postMessage({ type: 'cmd', cmd: cmd }); }

  host.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-hintok]')) { q('[data-hint]').hidden = true; return; }
    if (t.closest('[data-open]')) { q('[data-hint]').hidden = true; openWin(); return; }
    var alive = state.alive && Date.now() - state.at < 3500;
    if (t.closest('[data-toggle]')) { q('[data-hint]').hidden = true; if (alive) send('toggle'); else openWin(); return; }
    if (t.closest('[data-next]')) { send('next'); }
  });

  var shown = false;
  try { shown = sessionStorage.getItem('bardHint') === '1'; sessionStorage.setItem('bardHint', '1'); } catch (e) { shown = true; }
  if (!shown) {
    setTimeout(function () { q('[data-hint]').hidden = false; }, 700);
    setTimeout(function () { q('[data-hint]').hidden = true; }, 15000);
  }
  paint();
})();
