(function () {
  var tables = document.querySelector('[data-livetables]');
  var feed = document.querySelector('[data-livefeed]');
  var state = document.querySelector('[data-livestate]');
  var back = document.querySelector('[data-liveback]');
  var summary = document.querySelector('[data-livesummary]');
  if (!tables || !window.fetch) return;
  var busy = false, skew = 0, filter = '';
  try { filter = sessionStorage.getItem('liveFilter') || ''; } catch (e) {}

  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function ago() {
    tables.querySelectorAll('[data-live]').forEach(function (c) {
      var at = Number(c.getAttribute('data-at')) || 0, p = c.querySelector('[data-ago]');
      if (!p || !at) return;
      var s = Math.max(0, Math.round((Date.now() + skew - at) / 1000));
      p.textContent = s < 5 ? 'Last move just now' : (s < 60 ? 'Last move ' + s + ' seconds ago' : 'Last move ' + Math.round(s / 60) + (Math.round(s / 60) === 1 ? ' minute ago' : ' minutes ago'));
      c.classList.toggle('idle', s > 300);
    });
  }
  function applyFilter() {
    var csrf = document.querySelector('[data-csrf]');
  var thumbs = document.querySelector('[data-thumbs]');
  if (thumbs) { document.body.classList.remove('thumbs'); thumbs.open = false; thumbs.addEventListener('toggle', function () { document.body.classList.toggle('thumbs', thumbs.open); }); }
  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('select[data-tilt]');
    if (!sel || !csrf) return;
    var body = new URLSearchParams({ _csrf: csrf.value, kind: sel.getAttribute('data-tilt'), key: sel.getAttribute('data-key'), level: sel.value });
    sel.classList.remove('saved', 'failed');
    fetch('/inn/ledger/tilt', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      .then(function (r) { sel.classList.add(r.ok ? 'saved' : 'failed'); var card = sel.closest('[data-live]'); if (card) card.classList.toggle('tilted', sel.value !== '0'); })
      .catch(function () { sel.classList.add('failed'); });
  });
  document.querySelectorAll('[data-lf]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lf') === filter); });
    tables.querySelectorAll('[data-live]').forEach(function (c) { c.hidden = !!filter && c.getAttribute('data-game') !== filter; });
  }
  function flash(c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  function cards(list) {
    var empty = tables.querySelector('.empty');
    if (!list.length) { if (!empty) tables.innerHTML = '<p class="empty">Nobody has played in the last fifteen minutes.</p>'; return; }
    if (empty) empty.remove();
    var want = {};
    list.forEach(function (c, i) {
      want[c.id] = 1;
      var cur = tables.querySelector('[data-live="' + c.id + '"]');
      var fresh = el(c.html);
      if (!cur) {
        var at = tables.children[i] || null;
        tables.insertBefore(fresh, at);
        flash(fresh);
        return;
      }
      if (cur.getAttribute('data-h') === c.html) return;
      var felt = cur.querySelector('.livefelt'), nf = fresh.querySelector('.livefelt');
      if (felt && nf && felt.innerHTML !== nf.innerHTML) { felt.innerHTML = nf.innerHTML; flash(cur); }
      var head = cur.querySelector('.livehead'), nh = fresh.querySelector('.livehead');
      if (head && nh && head.innerHTML !== nh.innerHTML) head.innerHTML = nh.innerHTML;
      cur.setAttribute('data-at', c.at);
      cur.setAttribute('data-game', c.game);
      cur.setAttribute('data-h', c.html);
      var at2 = tables.children[i];
      if (at2 !== cur) tables.insertBefore(cur, at2 || null);
    });
    tables.querySelectorAll('[data-live]').forEach(function (c) { if (!want[c.getAttribute('data-live')]) c.remove(); });
  }
  function feedUpdate(html) {
    if (!feed) return;
    var nu = el('<div>' + html + '</div>');
    var oldIds = {};
    feed.querySelectorAll('li[data-id]').forEach(function (li) { oldIds[li.getAttribute('data-id')] = 1; });
    if (feed.innerHTML === nu.innerHTML) return;
    feed.innerHTML = nu.innerHTML;
    feed.querySelectorAll('li[data-id]').forEach(function (li) { if (!oldIds[li.getAttribute('data-id')]) li.classList.add('newrow'); });
  }
  function tick() {
    if (busy || document.hidden) return;
    busy = true;
    fetch('/inn/ledger/live.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (j.now) skew = j.now - Date.now();
        cards(j.cards || []);
        feedUpdate(j.feed);
        if (summary && summary.innerHTML !== j.summary) summary.innerHTML = j.summary;
        var bh = j.back || '<p class="empty">No tables are open in the back room.</p>';
        if (back && back.getAttribute('data-h') !== bh) { back.innerHTML = bh; back.setAttribute('data-h', bh); }
        applyFilter(); ago();
        if (state) { state.textContent = 'Live'; state.className = 'livestate on'; }
      })
      .catch(function () { if (state) { state.textContent = 'Lost the connection, trying again…'; state.className = 'livestate off'; } })
      .then(function () { busy = false; });
  }
  document.querySelectorAll('[data-lf]').forEach(function (b) {
    b.addEventListener('click', function () { filter = b.getAttribute('data-lf'); try { sessionStorage.setItem('liveFilter', filter); } catch (e) {} applyFilter(); });
  });
  tables.querySelectorAll('[data-live]').forEach(function (c) { c.setAttribute('data-h', ''); });
  applyFilter(); ago();
  setInterval(tick, 2000);
  setInterval(ago, 1000);
  document.addEventListener('visibilitychange', tick);
  tick();
})();
