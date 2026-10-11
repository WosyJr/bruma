(function () {
  var tables = document.querySelector('[data-livetables]');
  var feed = document.querySelector('[data-livefeed]');
  var state = document.querySelector('[data-livestate]');
  if (!tables || !window.fetch) return;
  var busy = false;
  function tick() {
    if (busy || document.hidden) return;
    busy = true;
    fetch('/inn/ledger/live.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (tables.innerHTML !== j.tables) tables.innerHTML = j.tables;
        if (feed && feed.innerHTML !== j.feed) feed.innerHTML = j.feed;
        if (state) { state.textContent = 'Live'; state.className = 'live on'; }
      })
      .catch(function () { if (state) { state.textContent = 'Lost the connection, trying again…'; state.className = 'live off'; } })
      .then(function () { busy = false; });
  }
  setInterval(tick, 2000);
  document.addEventListener('visibilitychange', tick);
})();
