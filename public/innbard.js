(function () {
  var host = document.getElementById('bard');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = '1';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var house = [], mine = store.get('bardMine', []), now = store.get('bardNow', null), vol = store.get('bardVol', 40);
  var player = null, apiLoading = false, apiReady = false, tab = now && now.src === 'mine' ? 'mine' : 'house', open = false, saveTimer = null;
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function parse(link) {
    var s = String(link || '').trim(), m = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})/), list = m ? m[1] : '';
    m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    var id = m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : '');
    return id || list ? { id: id, list: list } : null;
  }
  function listOf(src) { return src === 'mine' ? mine : house; }
  function current() { if (!now) return null; var l = listOf(now.src); return l[now.idx] || null; }

  host.className = 'bard';
  host.innerHTML = '<div class="bardpanel" data-panel hidden><div class="bardhead"><b>Bard’s corner</b><button type="button" class="linkish" data-close aria-label="Close">✕</button></div>' +
    '<div class="bardtabs" role="tablist"><button type="button" data-tab="house">The house list</button><button type="button" data-tab="mine">Your own</button></div>' +
    '<ul class="bardlist" data-list></ul>' +
    '<form class="bardadd" data-add hidden><input name="title" maxlength="60" placeholder="Name it (optional)" aria-label="Song name"><input name="link" placeholder="Paste a YouTube link" aria-label="YouTube link" required><button class="btn go small" type="submit">Add</button></form>' +
    '<p class="hint" data-note></p></div>' +
    '<div class="bardmini" data-mini><div class="bardframe" data-frame hidden><div id="bardplayer"></div></div>' +
    '<div class="bardbar"><button type="button" class="bardbtn" data-toggle aria-label="Open the bard’s corner">♪</button><span class="bardtitle" data-title>Bard’s corner</span>' +
    '<button type="button" class="bardbtn" data-play hidden aria-label="Play or pause">⏯</button><button type="button" class="bardbtn" data-next hidden aria-label="Next song">⏭</button><button type="button" class="bardbtn" data-stop hidden aria-label="Stop the music">■</button>' +
    '<input type="range" min="0" max="100" value="' + vol + '" data-vol aria-label="Volume" hidden></div>' +
    '<button type="button" class="btn go small bardresume" data-resume hidden>▶ Carry on with the music</button></div>';
  var q = function (s) { return host.querySelector(s); };

  function paintList() {
    host.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); });
    var l = listOf(tab), ul = q('[data-list]');
    ul.innerHTML = l.length ? l.map(function (s, i) {
      var on = now && now.src === tab && now.idx === i;
      return '<li class="' + (on ? 'on' : '') + '"><button type="button" class="bardsong" data-i="' + i + '">' + (on ? '♪ ' : '') + esc(s.title || 'Song ' + (i + 1)) + '</button>' + (tab === 'mine' ? '<button type="button" class="linkish" data-del="' + i + '" aria-label="Remove">✕</button>' : '') + '</li>';
    }).join('') : '<li class="hint">' + (tab === 'house' ? 'The keepers have not set a list yet.' : 'Paste a YouTube link below to add your own. Only you hear it.') + '</li>';
    q('[data-add]').hidden = tab !== 'mine';
    q('[data-note]').textContent = tab === 'mine' ? 'Your songs stay in this browser.' : '';
  }
  function paintBar() {
    var c = current(), on = !!(now && c);
    q('[data-title]').textContent = on ? (c.title || 'Song') : 'Bard’s corner';
    ['[data-play]', '[data-next]', '[data-stop]', '[data-vol]'].forEach(function (s) { q(s).hidden = !on; });
    q('[data-frame]').hidden = !(on && (player || now.playing));
    host.classList.toggle('playing', on);
  }
  function save() {
    if (!now) { store.set('bardNow', null); return; }
    try { if (player && player.getCurrentTime) now.t = Math.floor(player.getCurrentTime() || 0); if (player && player.getPlayerState) now.playing = player.getPlayerState() === 1 || player.getPlayerState() === 3; } catch (e) {}
    store.set('bardNow', now);
  }
  function api(then) {
    if (apiReady && window.YT && window.YT.Player) return then();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { apiReady = true; if (prev) try { prev(); } catch (e) {} then(); };
    if (apiLoading) return;
    apiLoading = true;
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = function () { q('[data-title]').textContent = 'YouTube would not load.'; };
    document.head.appendChild(s);
  }
  function start(src, idx, t, auto) {
    var l = listOf(src);
    if (!l.length) return;
    idx = ((idx % l.length) + l.length) % l.length;
    var c = l[idx];
    now = { src: src, idx: idx, t: t || 0, playing: true };
    store.set('bardNow', now);
    paintBar(); paintList();
    api(function () {
      var vars = { autoplay: 1, start: Math.floor(t || 0), playsinline: 1, rel: 0, modestbranding: 1 };
      if (c.list) { vars.listType = 'playlist'; vars.list = c.list; }
      if (player && player.destroy) { try { player.destroy(); } catch (e) {} }
      var box = q('[data-frame]'); box.innerHTML = '<div id="bardplayer"></div>';
      player = new window.YT.Player('bardplayer', {
        host: 'https://www.youtube-nocookie.com', width: 200, height: 113, videoId: c.id || undefined, playerVars: vars,
        events: {
          onReady: function (e) { try { e.target.setVolume(vol); if (auto !== false) e.target.playVideo(); } catch (x) {} setTimeout(function () { try { var st = e.target.getPlayerState(); if (st !== 1 && st !== 3 && now && now.playing) q('[data-resume]').hidden = false; } catch (x) {} }, 2000); },
          onStateChange: function (e) { if (e.data === 1) q('[data-resume]').hidden = true; if (e.data === 0 && !c.list) start(now.src, now.idx + 1, 0); save(); },
          onError: function () { q('[data-title]').textContent = 'That song will not play here. Skipping…'; setTimeout(function () { start(now.src, now.idx + 1, 0); }, 1500); }
        }
      });
    });
    if (!saveTimer) saveTimer = setInterval(save, 2000);
  }
  function stop() {
    if (player && player.destroy) { try { player.destroy(); } catch (e) {} }
    player = null; now = null; store.set('bardNow', null);
    q('[data-frame]').innerHTML = '<div id="bardplayer"></div>';
    q('[data-resume]').hidden = true;
    paintBar(); paintList();
  }

  host.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-toggle]')) { open = !open; q('[data-panel]').hidden = !open; if (open) paintList(); return; }
    if (t.closest('[data-close]')) { open = false; q('[data-panel]').hidden = true; return; }
    var tb = t.closest('[data-tab]'); if (tb) { tab = tb.getAttribute('data-tab'); paintList(); return; }
    var so = t.closest('[data-i]'); if (so) { start(tab, Number(so.getAttribute('data-i')), 0); return; }
    var del = t.closest('[data-del]'); if (del) { var i = Number(del.getAttribute('data-del')); mine.splice(i, 1); store.set('bardMine', mine); if (now && now.src === 'mine' && now.idx === i) stop(); else paintList(); return; }
    if (t.closest('[data-play]')) { if (!player) return start(now.src, now.idx, now.t); try { var st = player.getPlayerState(); if (st === 1) { player.pauseVideo(); now.playing = false; } else { player.playVideo(); now.playing = true; } } catch (x) {} save(); return; }
    if (t.closest('[data-next]')) { if (now) start(now.src, now.idx + 1, 0); return; }
    if (t.closest('[data-stop]')) { stop(); return; }
    if (t.closest('[data-resume]')) { q('[data-resume]').hidden = true; if (player && player.playVideo) { try { player.playVideo(); } catch (x) { start(now.src, now.idx, now.t); } } else if (now) start(now.src, now.idx, now.t); }
  });
  q('[data-vol]').addEventListener('input', function (e) { vol = Number(e.target.value); store.set('bardVol', vol); try { if (player) player.setVolume(vol); } catch (x) {} });
  q('[data-add]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, yt = parse(f.link.value);
    if (!yt) { q('[data-note]').textContent = 'That is not a YouTube link.'; return; }
    mine.push({ title: f.title.value.trim() || 'My song ' + (mine.length + 1), id: yt.id, list: yt.list });
    mine = mine.slice(-40);
    store.set('bardMine', mine);
    f.reset(); paintList();
  });
  window.addEventListener('pagehide', save);

  fetch('/inn/bard.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (j) { house = j.list || []; })
    .catch(function () {})
    .then(function () {
      paintBar();
      if (now && current() && now.playing) start(now.src, now.idx, now.t);
      else if (now && current()) { paintBar(); }
    });
})();
