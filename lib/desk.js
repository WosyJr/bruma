const O = require('./offices');
const W = require('./watch');
const P = require('./property');
const T = require('./treasury');
const Ct = require('./court');
const A = require('./archive');
const G = require('./guilds');
const Tax = require('./taxes');
const Pr = require('./proclaim');
const Gl = require('./gaol');
const Pt = require('./petitions');
const Lc = require('./licences');

function gather(u) {
  if (!u) return { groups: [], count: 0, urgent: 0 };
  const groups = [];
  const push = (head, items) => { if (items.length) groups.push({ head, items }); };

  const yours = [];
  try {
    if (O.can(u, 'watchclock')) {
      const mine = W.openShift(u.username);
      if (mine) {
        const mins = Math.round((Date.now() - new Date(mine.on)) / 60000);
        yours.push({
          text: 'You are on the watch at ' + W.postName(mine.post),
          note: 'Standing ' + require('./views').hours(mins) + '. Clock off when you come away.',
          link: '/watch',
          urgent: mins > 720
        });
      }
    }
  } catch (_) {}

  try {
    const mine = Ct.mine(u.username).filter(m => m.stage === 'judged');
    mine.slice(0, 3).forEach(m => yours.push({
      text: 'Your matter no. ' + m.no + ' has been judged',
      note: m.title,
      link: '/court/' + m.id
    }));
  } catch (_) {}

  push('Yours', yours);

  const court = [];
  try {
    if (O.can(u, 'courtsit')) {
      Ct.all().filter(m => m.stage === 'laid').forEach(m => court.push({
        text: 'No hearing is set upon matter no. ' + m.no,
        note: m.title + ' · laid by ' + m.laidByName,
        link: '/court/' + m.id,
        urgent: true
      }));
      Ct.all().filter(m => m.stage === 'heard').forEach(m => court.push({
        text: 'Matter no. ' + m.no + ' waits upon your judgment',
        note: m.title,
        link: '/court/' + m.id,
        urgent: true
      }));
    } else if (O.can(u, 'courtsee')) {
      const n = Ct.open().length;
      if (n) court.push({ text: n + (n === 1 ? ' matter stands' : ' matters stand') + ' before the court', link: '/court' });
    }
  } catch (_) {}
  push('The court', court.slice(0, 12));

  const purse = [];
  try {
    if (O.can(u, 'treasread')) {
      const s = T.summary();
      if (s.balance < 0) purse.push({ text: 'The treasury is overdrawn', note: s.balance.toLocaleString('en-GB') + ' septims', link: '/treasury', urgent: true });
    }
    if (O.can(u, 'treasenter')) {
      const tx = Tax.summary();
      if (tx.arrears > 0) purse.push({
        text: tx.arrears.toLocaleString('en-GB') + ' septims stand in arrears',
        note: tx.owing + (tx.owing === 1 ? ' assessment is' : ' assessments are') + ' unrendered',
        link: '/taxes'
      });
    }
  } catch (_) {}
  push('The purse', purse);

  const watch = [];
  try {
    if (O.can(u, 'watchroster')) {
      const duty = W.onDuty();
      if (!duty.length) watch.push({ text: 'Nobody stands the watch', note: 'No guard has clocked on.', link: '/watch', urgent: true });
      const stale = duty.filter(s => Date.now() - new Date(s.on) > 1000 * 60 * 60 * 16);
      stale.forEach(s => watch.push({
        text: s.name + ' has been on the watch over sixteen hours',
        note: 'At ' + W.postName(s.post) + '. They may have forgotten to clock off.',
        link: '/watch/log',
        urgent: true
      }));
    }
  } catch (_) {}
  push('The watch', watch.slice(0, 8));

  const cells = [];
  try {
    if (O.can(u, 'gaolsee')) {
      Gl.overdue().forEach(r => cells.push({
        text: r.who + ' is held past the day they should come up',
        note: Gl.groundName(r.why) + ' \u00b7 ' + Gl.daysHeld(r) + ' days held',
        link: '/gaol/' + r.id,
        urgent: true
      }));
      Gl.held().filter(r => (r.why === 'await' || r.why === 'surety') && Gl.daysHeld(r) >= 3 && !(r.dueIso && r.dueIso >= new Date().toISOString().slice(0, 10)))
        .forEach(r => cells.push({
          text: r.who + ' has waited ' + Gl.daysHeld(r) + ' days for the bench',
          note: 'Held to await the court with no day set.',
          link: '/gaol/' + r.id,
          urgent: Gl.daysHeld(r) >= 7
        }));
      const n = Gl.held().length;
      if (n && !cells.length) cells.push({ text: n + (n === 1 ? ' person is held' : ' people are held'), link: '/gaol' });
    }
  } catch (_) {}
  push('The gaol', cells.slice(0, 10));

  const asked = [];
  try {
    if (O.can(u, 'petanswer')) {
      Pt.waiting().slice(0, 8).forEach(p => asked.push({
        text: 'Petition no. ' + p.no + ' has not been read',
        note: p.title + ' \u00b7 ' + p.name,
        link: '/petitions/manage',
        urgent: Date.now() - new Date(p.at) > 1000 * 60 * 60 * 72
      }));
      const stale = Pt.open().filter(p => p.stage !== 'received' && !p.reply
        && Date.now() - new Date(p.at) > 1000 * 60 * 60 * 24 * 7);
      if (stale.length) asked.push({
        text: stale.length + (stale.length === 1 ? ' petition has' : ' petitions have') + ' gone a week without an answer',
        link: '/petitions/manage', urgent: true
      });
    } else if (O.can(u, 'petsee')) {
      const n = Pt.waiting().length;
      if (n) asked.push({ text: n + (n === 1 ? ' petition waits' : ' petitions wait') + ' to be read', link: '/petitions/manage' });
    }
  } catch (_) {}
  push('The petitions', asked.slice(0, 10));

  const trade = [];
  try {
    if (O.can(u, 'licgrant')) {
      const soon = Lc.expiring(14);
      if (soon.length) trade.push({
        text: soon.length + (soon.length === 1 ? ' licence runs out' : ' licences run out') + ' within a fortnight',
        note: soon.slice(0, 3).map(l => l.sign || l.holder).join(', '),
        link: '/licences'
      });
      const lapsed = Lc.withState().filter(l => l.state === 'lapsed');
      if (lapsed.length) trade.push({
        text: lapsed.length + (lapsed.length === 1 ? ' licence has lapsed' : ' licences have lapsed'),
        note: 'They are trading without one, or they have stopped.',
        link: '/licences', urgent: lapsed.length > 2
      });
    }
  } catch (_) {}
  push('The trade', trade.slice(0, 6));

  const county = [];
  try {
    if (O.can(u, 'propenter')) {
      const vacant = P.all().filter(h => h.state === 'vacant').length;
      if (vacant) county.push({ text: vacant + (vacant === 1 ? ' holding stands vacant' : ' holdings stand vacant'), link: '/property' });
      const disputed = P.all().filter(h => h.state === 'disputed').length;
      if (disputed) county.push({ text: disputed + (disputed === 1 ? ' holding is in dispute' : ' holdings are in dispute'), link: '/property', urgent: true });
    }
    if (O.can(u, 'guildcharter')) {
      O.GUILDS.forEach(g => {
        if (!G.charterFor(g.id)) county.push({ text: 'No charter is laid for ' + g.name, link: '/guilds/' + g.id });
      });
    }
    if (O.can(u, 'proclaim')) {
      const p = Pr.pass();
      if (!p.looked) county.push({ text: 'No word has been set upon the Pale Pass', note: 'The public notice says only that it is open.', link: '/proclaim' });
      else if (Date.now() - new Date(p.looked) > 1000 * 60 * 60 * 48) {
        county.push({ text: 'The notice of the Pale Pass is two days stale', note: 'Travellers read it.', link: '/proclaim' });
      }
    }
    if (O.can(u, 'archread')) {
      if (!A.all().some(d => d.lex)) county.push({ text: 'The Lex Brumae is not in the archive', link: '/archive' });
    }
  } catch (_) {}
  push('The county', county.slice(0, 10));

  let count = 0, urgent = 0;
  groups.forEach(g => g.items.forEach(i => { count += 1; if (i.urgent) urgent += 1; }));
  return { groups, count, urgent };
}

module.exports = { gather };
