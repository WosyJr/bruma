(function () {
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var q = function (s) { return document.querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var house = [], mine = store.get('bardMine', []), now = store.get('bardNow', null), vol = store.get('bardVol', 40);
  var tab = now && now.src === 'mine' ? 'mine' : 'house';
  var player = null, apiReady = false, chan = null;
  try { chan = new BroadcastChannel('innbard'); } catch (e) { chan = null; }

  function parse(link) {
    var s = String(link || '').trim(), m = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})/), list = m ? m[1] : '';
    m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    var id = m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : '');
    return id || list ? { id: id, list: list } : null;
  }
  function listOf(src) { return src === 'mine' ? mine : house; }
  function current() { if (!now) return null; return listOf(now.src)[now.idx] || null; }
  function playing() { try { var st = player && player.getPlayerState ? player.getPlayerState() : -1; return st === 1 || st === 3; } catch (e) { return false; } }
  function title() { var c = current(); return c ? (c.title || 'A song') : ''; }
  function tell() {
    var msg = { type: 'state', title: title(), playing: playing(), at: Date.now() };
    if (chan) chan.postMessage(msg);
    store.set('bardBeat', msg);
  }
  function save() {
    if (now) { try { if (player && player.getCurrentTime) now.t = Math.floor(player.getCurrentTime() || 0); } catch (e) {} now.playing = playing() || (now.playing && !player); }
    store.set('bardNow', now);
  }
  function paint() {
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
    var l = listOf(tab);
    q('[data-list]').innerHTML = l.length ? l.map(function (s, i) {
      var on = now && now.src === tab && now.idx === i;
      return '<li class="' + (on ? 'on' : '') + '"><button type="button" class="bardsong" data-i="' + i + '">' + (on ? '♪ ' : '') + esc(s.title || 'Song ' + (i + 1)) + '</button>' + (tab === 'mine' ? '<button type="button" class="linkish" data-del="' + i + '" aria-label="Remove">✕</button>' : '') + '</li>';
    }).join('') : '<li class="hint">' + (tab === 'house' ? 'The keepers have not set a list yet.' : 'Paste a YouTube link below. Only you hear your own songs.') + '</li>';
    q('[data-add]').hidden = tab !== 'mine';
    q('[data-note]').textContent = tab === 'mine' ? 'Your songs stay in this browser.' : '';
    q('[data-title]').textContent = title() || 'Nothing playing';
    q('[data-empty]').hidden = !!current();
    document.title = (title() ? '♪ ' + title() + ' · ' : '') + 'Bard’s corner';
  }
  function api(then) {
    if (apiReady && window.YT && window.YT.Player) return then();
    window.onYouTubeIframeAPIReady = function () { apiReady = true; then(); };
    if (document.getElementById('ytapi')) return;
    var s = document.createElement('script'); s.id = 'ytapi'; s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () { q('[data-title]').textContent = 'YouTube would not load.'; };
    document.head.appendChild(s);
  }
  function start(src, idx, t) {
    var l = listOf(src);
    if (!l.length) return;
    idx = ((idx % l.length) + l.length) % l.length;
    var c = l[idx];
    now = { src: src, idx: idx, t: t || 0, playing: true };
    tab = src;
    store.set('bardNow', now);
    paint();
    api(function () {
      var vars = { autoplay: 1, start: Math.floor(t || 0), playsinline: 1, rel: 0, modestbranding: 1 };
      if (c.list) { vars.listType = 'playlist'; vars.list = c.list; }
      if (player && player.destroy) { try { player.destroy(); } catch (e) {} }
      q('.bwvideo').querySelector('#bardplayer') || q('.bwvideo').insertAdjacentHTML('afterbegin', '<div id="bardplayer"></div>');
      player = new window.YT.Player('bardplayer', {
        host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', videoId: c.id || undefined, playerVars: vars,
        events: {
          onReady: function (e) { try { e.target.setVolume(vol); e.target.playVideo(); } catch (x) {} setTimeout(function () { if (!playing()) q('[data-start]').hidden = false; }, 1800); },
          onStateChange: function (e) { if (e.data === 1) q('[data-start]').hidden = true; if (e.data === 0 && !c.list) start(now.src, now.idx + 1, 0); save(); tell(); },
          onError: function () { q('[data-title]').textContent = 'That song will not play outside YouTube. Skipping…'; setTimeout(function () { start(now.src, now.idx + 1, 0); }, 1500); }
        }
      });
    });
  }
  function toggle() {
    if (!player) { var c = current(); if (c) start(now.src, now.idx, now.t); else if (house.length) start('house', 0, 0); else if (mine.length) start('mine', 0, 0); return; }
    try { if (playing()) player.pauseVideo(); else player.playVideo(); } catch (e) {}
    setTimeout(function () { save(); tell(); }, 200);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var tb = t.closest('[data-tab]'); if (tb) { tab = tb.getAttribute('data-tab'); paint(); return; }
    var so = t.closest('[data-i]'); if (so) { start(tab, Number(so.getAttribute('data-i')), 0); return; }
    var del = t.closest('[data-del]'); if (del) { var i = Number(del.getAttribute('data-del')); mine.splice(i, 1); store.set('bardMine', mine); paint(); return; }
    if (t.closest('[data-toggle]')) return toggle();
    if (t.closest('[data-next]')) { if (now) start(now.src, now.idx + 1, 0); return; }
    if (t.closest('[data-prev]')) { if (now) start(now.src, now.idx - 1, 0); return; }
    if (t.closest('[data-start]')) { q('[data-start]').hidden = true; try { player.playVideo(); } catch (x) { if (now) start(now.src, now.idx, now.t); } }
  });
  var vin = q('[data-vol]'); vin.value = vol;
  vin.addEventListener('input', function () { vol = Number(vin.value); store.set('bardVol', vol); try { if (player) player.setVolume(vol); } catch (x) {} });
  q('[data-add]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, yt = parse(f.link.value);
    if (!yt) { q('[data-note]').textContent = 'That is not a YouTube link.'; return; }
    mine.push({ title: f.title.value.trim() || 'My song ' + (mine.length + 1), id: yt.id, list: yt.list });
    mine = mine.slice(-40); store.set('bardMine', mine); f.reset(); paint();
  });
  window.addEventListener('storage', function (e) { if (e.key === 'bardMine') { mine = store.get('bardMine', []); paint(); } });
  if (chan) chan.onmessage = function (e) {
    var m = e.data || {};
    if (m.type === 'ping') return tell();
    if (m.type !== 'cmd') return;
    if (m.cmd === 'toggle') toggle();
    if (m.cmd === 'next' && now) start(now.src, now.idx + 1, 0);
    if (m.cmd === 'play' && !playing()) toggle();
  };
  setInterval(function () { save(); tell(); }, 1000);
  window.addEventListener('pagehide', function () { save(); store.set('bardBeat', { type: 'state', closed: true, at: Date.now() }); if (chan) chan.postMessage({ type: 'state', closed: true }); });

  fetch('/inn/bard.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); }).then(function (j) { house = j.list || []; }).catch(function () {})
    .then(function () {
      paint();
      if (now && current()) start(now.src, now.idx, now.t);
      else if (house.length) start('house', 0, 0);
    });
})();
