const D = require('./discord');

function wrap(mod, name, fn) {
  const orig = mod[name];
  if (typeof orig !== 'function' || orig.__announced) return;
  const w = function (...args) {
    let before;
    try { before = fn.before ? fn.before(...args) : undefined; } catch (_) { before = undefined; }
    const out = orig.apply(this, args);
    try { fn.after(out, args, before); } catch (_) {}
    return out;
  };
  w.__announced = true;
  mod[name] = w;
}

const hex = c => parseInt(String(c || '#D7A54C').replace('#', ''), 16);

function install() {
  const Pr = require('./proclaim');
  wrap(Pr, 'issue', { after: r => D.emit('proclamation', r) });
  wrap(Pr, 'setPass', {
    before: () => Pr.pass().state,
    after: (r, a, was) => { if (r && r.state !== was) D.emit('pass', { state: r.state, say: (Pr.STATE_BY_ID[r.state] || {}).say || r.state, note: r.note }); }
  });

  const Ct = require('./court');
  wrap(Ct, 'judge', {
    before: id => (Ct.get(id) || {}).stage,
    after: (m, a, was) => { if (m && m.stage === 'judged' && was !== 'judged') D.emit('judgment', { no: m.no, title: m.title, judgment: m.judgment, fine: m.fine, term: m.term, articles: (m.articles || []).join(', ') }); }
  });

  const G = require('./gaol');
  wrap(G, 'commit', { after: r => D.emit('gaol_in', { who: r.who, no: r.no, comes: r.comes || r.hearing || '' }) });
  wrap(G, 'release', { after: r => D.emit('gaol_out', { who: r.who, no: r.no, days: G.daysHeld ? G.daysHeld(r) : 0 }) });

  const A = require('./archive');
  wrap(A, 'lay', { after: r => { if (r && r.shelf === 'law') D.emit('law', { title: r.title, text: r.text, note: r.note }); } });

  const T = require('./town');
  wrap(T, 'goalSet', { after: g => D.emit('goal_set', g) });
  wrap(T, 'pledgeMark', {
    before: gid => !!(T.goalGet(gid) || {}).metAt,
    after: (g, a, was) => {
      if (g && g.metAt && !was) {
        const top = (g.pledges || []).filter(p => p.paid).sort((x, y) => y.amount - x.amount)[0];
        D.emit('goal_built', { title: g.title, feature: g.feature, paid: g.paid, top });
      }
    }
  });
  wrap(T, 'ghostClaim', { after: who => D.emit('ghost', { who }) });
  wrap(T, 'faceSubmit', { after: f => D.emit('portrait', { name: f.name, role: f.role }) });

  const H = require('./honours');
  wrap(H, 'award', { after: a => { const t = H.type(a.honour) || {}; const c = t.colors || []; D.emit('honour', { name: a.name, honourName: a.honourName, citation: a.citation, byName: a.byName, color: hex(c[Math.floor(c.length / 2)]) }); } });

  const Sv = require('./service');
  const svc = { after: (row, a) => { const kind = a[1]; const extra = a[3] || {}; if (kind === 'sworn' || kind === 'raised') D.emit(kind, { name: extra.name || (row && row.name) || a[0], officeName: extra.officeName || (row && row.officeName) || '' }); } };
  wrap(Sv, 'note', svc);

  const W = require('./watch');
  const lantern = {
    before: (who) => Sv.watchService(typeof who === 'object' ? who.username : (W.shifts().find(s => s.id === who) || {}).who).hours,
    after: (row, a, was) => {
      if (!row) return;
      const now = Sv.watchService(row.who).hours;
      const tier = [[400, 'gold'], [150, 'silver'], [50, 'bronze']].find(([h]) => was < h && now >= h);
      if (tier) D.emit('lantern', { name: row.name || row.who, tier: tier[1], hours: now });
    }
  };
  wrap(W, 'clockOff', lantern);
  wrap(W, 'clockOffOther', lantern);

  const Inn = require('./inn');
  wrap(Inn, 'act', { after: r => { if (r && r.luck) D.emit('streak', { name: r.patron.name }); } });
  wrap(Inn, 'ask', { after: p => { if (p) D.emit('inn_ask', { name: p.name, who: p.who, kind: p.kind }); } });

  const Pt = require('./petitions');
  wrap(Pt, 'lay', { after: p => D.emit('petition', { no: p.no, id: p.id, title: p.title, name: p.name || 'someone' }) });

  const Tr = require('./treasury');
  wrap(Tr, 'enter', {
    before: () => Tr.balance(),
    after: (row, a, was) => { const now = Tr.balance(); if (was >= 0 && now < 0) D.emit('overdrawn', { balance: now, reason: (row && row.reason) || (row && row.party) || 'an entry' }); }
  });

  D.start();
}

module.exports = { install };
