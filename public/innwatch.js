(function () {
  if (window.__innwatch) return;
  window.__innwatch = true;
  var box = document.getElementById('innwatch');
  if (!box) { box = document.createElement('div'); box.id = 'innwatch'; box.className = 'innwatch'; document.body.appendChild(box); }
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var here = (location.pathname.match(/^\/inn\/(crash|races|arena|keno)$/) || [])[1] || '';
  var ICON = { crash: '🜂', races: '♞', arena: '⚔︎', keno: '◉' };
  var NAMES = { crash: 'The Dragon’s Climb', races: 'The Chorrol Downs', arena: 'The Arena', keno: 'The Jarl’s Lottery' };
  var skew = 0, shown = {};
  try { shown = JSON.parse(sessionStorage.getItem('innWatchShown') || '{}'); } catch (e) { shown = {}; }

  function card(item) {
    var el = document.createElement('div');
    el.className = 'watchpop';
    el.setAttribute('role', 'alert');
    el.innerHTML = '<span class="wpicon" aria-hidden="true">' + (ICON[item.game] || '♪') + '</span><div class="wpbody"><b>' + esc(item.text) + ' in <span data-left>…</span></b><span>You have ' + fmt(item.bet) + ' riding on it' + (item.on ? ' (' + esc(item.on) + ')' : '') + '.</span><span class="wpacts"><a class="btn go small" href="/inn/' + item.game + '">Go watch</a><button type="button" class="linkish" data-later>Not now</button></span></div>';
    box.appendChild(el);
    if (window.InnSound && window.InnSound.chip) try { window.InnSound.chip(); } catch (e) {}
    var tick = function () {
      if (!el.isConnected) return;
      var s = Math.ceil((item.at - (Date.now() + skew)) / 1000);
      if (s < -4) { el.remove(); return; }
      var l = el.querySelector('[data-left]'); if (l) l.textContent = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : 'now';
      setTimeout(tick, 500);
    };
    tick();
    el.querySelector('[data-later]').addEventListener('click', function () { el.remove(); });
  }
  function poll() {
    if (document.hidden) return;
    fetch('/inn/upcoming.json', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.now) skew = j.now - Date.now();
        (j.list || []).forEach(function (it) {
          var left = it.at - (Date.now() + skew);
          if (it.game === here || shown[it.key] || left > 25000 || left < -2000) return;
          shown[it.key] = 1;
          try { sessionStorage.setItem('innWatchShown', JSON.stringify(shown)); } catch (e) {}
          card(it);
        });
      })
      .catch(function () {});
  }
  if (document.querySelector('[data-bard]')) { poll(); setInterval(poll, 5000); }

  var HINTS = [
    ['.crier', 'crier', 'The crier', 'Every big win in the hall goes across here. Hover over it to stop it.'],
    ['.nightboards', 'boards', 'Tonight’s boards', 'The biggest win, the high roller and the luckiest roll of the night. They start fresh when the night turns at noon.'],
    ['.pursebar', 'purse', 'Your purse', 'Every stake comes out of it and every win goes back in. Ask for more coin here and hand it over in game.'],
    ['.backdoor', 'backdoor', 'The back room', 'Play against other patrons: dice, cards, Hold’em, board games. The house only takes its cut.'],
    ['[data-tonight]', 'tonight', 'How you stand', 'What you have won or lost tonight, and at this table. It changes with every round.'],
    ['.tipcard', 'tip', 'Tip the dealer', 'Tip Brannoc 50 or more and luck leans your way for a minute.'],
    ['[data-lastout]', 'lastout', 'The last 20', 'What this table has thrown, dealt or spun lately, newest first.'],
    ['.hoard', 'hoard', 'The Dragon’s Hoard', 'A dragon on all five reels takes the whole hoard. Every spin feeds it.'],
    ['.sidebets', 'sidebets', 'Side bets', 'A pair, or a poker hand with Brannoc’s up card. They pay the moment the cards are dealt.'],
    ['.ctrips', 'trips', 'Three alike', 'Name the number: three of it pays 180 to 1.'],
    ['.riskset', 'risk', 'Risk', 'Higher risk makes the edges richer and the middle leaner, and raises the smallest drop.'],
    ['[data-mines]', 'draugr', 'Draugr', 'More draugr: bigger steps up each stone, and a higher smallest stake.'],
    ['.climb', 'climb', 'The climb', 'The dragon takes off at 0.50×. Cash out too early and you get back less than you staked. Wait too long and it falls.'],
    ['form[data-exotic]', 'exotic', 'Bet the order', 'Name the first two (exacta) or first three (trifecta) in order for much bigger prices.'],
    ['.propsrow', 'props', 'Side bets', 'Bet how long the bout lasts, or how it ends: by the blade, a spell or an arrow.'],
    ['canvas[data-ring]', 'ring', 'The ring', 'The bout plays out here blow by blow. Everyone in the hall sees the same fight.'],
    ['[data-scratch]', 'seals', 'The Three Seals', 'Click each seal to break the wax. Three alike pays, up to the Dragon at 100 times.'],
    ['[data-tourney]', 'tourney', 'A tournament', 'Join for the buy-in. Your winnings at that table count until time is called, and the top three split the pot.'],
    ['[data-rankcard]', 'rank', 'Your standing', 'Every septim you stake counts toward Copper, Silver, Gold and Dragon. Higher standing stretches Brannoc’s favour.'],
    ['.pvphrases', 'phrases', 'Table talk', 'One tap tosses a phrase across the table. Or type your own below.'],
    ['a[href="/inn/ledger/night"]', 'nightsheet', 'The night’s sheet', 'One printable page of the whole night: tables, coin, tips and tournaments.'],
    ['.coincard', 'coin', 'Coin in hand', 'What the keepers should be holding in game, what is owed to patrons, and what is the house’s own.'],
    ['#tourneycard', 'tourneycard', 'A tournament', 'Open a timed contest at the Lever, the Avalanche or the Seals. Buy-ins make the pot; the house keeps its cut.'],
    ['#dresscard', 'dress', 'Dressing the hall', 'Dress every inn page for a festival: New Life, Harvest’s End, the Witches’ Festival or Mid Year.'],
    ['#hallcard', 'hallcard', 'The hall tonight', 'Nail up tonight’s notice, start a happy hour, and set the bard’s songs.'],
    ['.livefilter', 'livefilter', 'One table at a time', 'Pick a table to see only the patrons playing it.'],
    ['[data-thumbs]', 'thumbs', 'House settings', 'Open this to lean on a table or a patron. It folds itself away every time the page loads.']
  ];
  var seen = store.get('innHints', {});
  var showing = null, count = 0, MAX = 2;
  function place(pop, target) {
    var r = target.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 32);
    pop.style.width = w + 'px';
    var left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2));
    var ph = pop.offsetHeight, above = r.top > ph + 24;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (above ? r.top + window.scrollY - ph - 14 : r.bottom + window.scrollY + 14) + 'px';
    pop.classList.toggle('below', !above);
    var ax = Math.max(18, Math.min(w - 18, r.left + r.width / 2 - left));
    pop.style.setProperty('--ax', ax + 'px');
  }
  function show(h, target) {
    if (showing || count >= MAX || seen[h[1]]) return;
    showing = h; count++;
    seen[h[1]] = 1; store.set('innHints', seen);
    var pop = document.createElement('div');
    pop.className = 'tiphint';
    pop.setAttribute('role', 'status');
    pop.innerHTML = '<b>' + esc(h[2]) + '</b><span>' + esc(h[3]) + '</span><button type="button" class="btn small" data-ok>Got it</button>';
    document.body.appendChild(pop);
    place(pop, target);
    var close = function () { if (!pop.isConnected) return; pop.classList.add('out'); setTimeout(function () { pop.remove(); showing = null; scan(); }, reduce ? 0 : 250); window.removeEventListener('resize', re); };
    var re = function () { place(pop, target); };
    window.addEventListener('resize', re);
    pop.querySelector('[data-ok]').addEventListener('click', close);
    setTimeout(close, 14000);
  }
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 60 && r.top < window.innerHeight - 60 && getComputedStyle(el).visibility !== 'hidden'; }
  function scan() {
    if (showing || count >= MAX) return;
    if (document.querySelector('#tut:not([hidden]), #broke, .bardhint:not([hidden])')) { setTimeout(scan, 2000); return; }
    for (var i = 0; i < HINTS.length; i++) {
      var h = HINTS[i];
      if (seen[h[1]]) continue;
      var el = document.querySelector(h[0]);
      if (el && visible(el)) { show(h, el); return; }
    }
  }
  var timer = null;
  window.addEventListener('scroll', function () { clearTimeout(timer); timer = setTimeout(scan, 400); }, { passive: true });
  setTimeout(scan, 2500);
})();
