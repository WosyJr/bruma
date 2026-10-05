const O = require('./offices');

const CACHE = { at: 0, rows: null };
const TTL = 15000;

const clean = v => String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim();
const key = v => clean(v).toLowerCase();
const slugOf = v => key(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const SOURCES = [
  {
    id: 'office', name: 'On the rolls', perm: 'hall', single: true,
    load: () => {
      try {
        const U = require('./users');
        return U.list().map(p => ({
          who: p.name, at: p.created,
          title: p.officeName, note: p.style && p.style !== p.officeName ? p.style : '',
          link: '/service/' + p.username, state: p.active ? '' : 'out',
          standing: p.active ? 'In service' : 'Stood down',
          account: p.username
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'holding', name: 'Holdings', perm: 'propread',
    load: () => {
      try {
        const P = require('./property');
        return P.all().map(h => ({
          who: h.holder, at: (h.entered && h.entered.at) || '',
          title: h.name, note: [P.kindName ? P.kindName(h.kind) : h.kind, h.place].filter(Boolean).join(' · '),
          link: '/property?p=' + h.id, standing: h.state,
          state: h.state === 'disputed' ? 'out' : h.state === 'vacant' ? '' : 'in',
          money: h.rent ? h.rent + ' rent' : ''
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'matter', name: 'Before the court', perm: 'courtsee',
    load: () => {
      try {
        const Ct = require('./court');
        const out = [];
        Ct.all().forEach(m => {
          const base = {
            at: m.at, title: 'No. ' + m.no + ' — ' + m.title,
            link: '/court/' + m.id, standing: Ct.stageName(m.stage),
            state: m.stage === 'judged' ? 'in' : m.stage === 'withdrawn' || m.stage === 'struck' ? 'out' : 'gold',
            money: m.fine ? m.fine + ' fined' : ''
          };
          if (m.complainant) out.push({ ...base, who: m.complainant, note: 'Laid the matter · ' + Ct.kindName(m.kind) });
          if (m.respondent) out.push({ ...base, who: m.respondent, note: 'Answered the matter · ' + Ct.kindName(m.kind) });
        });
        return out;
      } catch (_) { return []; }
    }
  },
  {
    id: 'gaol', name: 'In the gaol', perm: 'gaolsee',
    load: () => {
      try {
        const G = require('./gaol');
        return G.all().map(r => ({
          who: r.who, at: r.committedAt,
          title: 'Entry no. ' + r.no + ' — ' + G.groundName(r.why),
          note: G.placeName(r.place) + ' · ' + G.daysHeld(r) + (G.daysHeld(r) === 1 ? ' day' : ' days'),
          link: '/gaol/' + r.id,
          standing: r.released ? G.releaseName(r.releaseWhy) : 'Held',
          state: r.released ? '' : 'out'
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'report', name: 'Named in a report of the Watch', perm: 'watchlog',
    load: () => {
      try {
        const R = require('./reports');
        const out = [];
        R.all().forEach(r => {
          (r.persons || []).forEach(p => {
            out.push({
              who: p.name, at: r.at,
              title: 'Report no. ' + r.no + ' — ' + r.title,
              note: [R.kindName(r.kind), R.roleName(p.role), p.race, r.location].filter(Boolean).join(' · '),
              link: '/watch/reports/' + r.id,
              standing: R.stateName(r.state),
              state: p.role === 'suspect' || p.role === 'arrested' ? 'out'
                : p.role === 'officer' ? 'in' : ''
            });
          });
        });
        return out;
      } catch (_) { return []; }
    }
  },
  {
    id: 'licence', name: 'Licences to trade', perm: 'licsee',
    load: () => {
      try {
        const L = require('./licences');
        return L.withState().map(l => ({
          who: l.holder, at: l.grantedAt,
          title: (l.sign || L.tradeName(l.trade)) + ' — no. ' + l.no,
          note: L.tradeName(l.trade) + (l.place ? ' · ' + l.place : ''),
          link: '/licences/' + l.id, standing: L.stateName(l.state),
          state: l.state === 'current' ? 'in' : 'out',
          money: l.fee ? l.fee + ' fee' : ''
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'tax', name: 'Taxes laid', perm: 'treasread',
    load: () => {
      try {
        const Tax = require('./taxes');
        return Tax.withState().map(t => ({
          who: t.who, at: t.at,
          title: Tax.kindName(t.kind) + ' — no. ' + t.no,
          note: [t.period, t.where].filter(Boolean).join(' · '),
          link: '/taxes/' + t.id, standing: t.state,
          state: t.state === 'rendered' ? 'in' : t.state === 'forgiven' ? '' : 'out',
          money: t.amount ? t.amount + ' laid' : ''
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'guild', name: 'Guild rolls', perm: 'guildsee', altPerm: 'guildown',
    load: () => {
      try {
        const G = require('./guilds');
        const out = [];
        O.GUILDS.forEach(g => {
          G.roll(g.id).forEach(m => out.push({
            who: m.name, at: m.admitted, guild: g.id,
            title: g.name, note: m.rankName + (m.trade ? ' · ' + m.trade : ''),
            link: '/guilds/' + g.id, standing: G.standingName(m.standing),
            state: m.standing === 'expelled' ? 'out' : m.standing === 'contract' ? 'gold' : 'in'
          }));
        });
        return out;
      } catch (_) { return []; }
    }
  },
  {
    id: 'petition', name: 'Petitions', perm: 'petsee',
    load: () => {
      try {
        const Pt = require('./petitions');
        const out = [];
        Pt.all().forEach(p => {
          out.push({
            who: p.name, at: p.at, title: 'No. ' + p.no + ' — ' + p.title,
            note: 'Laid the petition · ' + Pt.askName(p.ask),
            link: '/petitions/manage', standing: Pt.stageName(p.stage),
            state: p.stage === 'granted' ? 'in' : p.stage === 'refused' ? 'out' : 'gold'
          });
          if (p.against) out.push({
            who: p.against, at: p.at, title: 'No. ' + p.no + ' — ' + p.title,
            note: 'Named in a petition', link: '/petitions/manage',
            standing: Pt.stageName(p.stage), state: ''
          });
        });
        return out;
      } catch (_) { return []; }
    }
  },
  {
    id: 'purse', name: 'Money with the County', perm: 'treasread',
    load: () => {
      try {
        const T = require('./treasury');
        return T.ledger().map(r => ({
          who: r.party, at: r.at,
          title: (r.way === 'in' ? 'Rendered ' : 'Paid out ') + Number(r.amount).toLocaleString('en-GB') + ' septims',
          note: r.reason, link: '/treasury?q=' + encodeURIComponent(r.party || ''),
          standing: T.catName(r.cat), state: r.way === 'in' ? 'in' : '',
          money: (r.way === 'out' ? '-' : '') + r.amount
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'paper', name: 'Papers in their name', perm: 'hall',
    load: () => {
      try {
        const Papers = require('./papers');
        return Papers.rows().map(p => ({
          who: p.party, at: p.issuedAt,
          title: (Papers.KINDS[p.kind] || {}).name || 'A paper',
          note: p.title, link: '/verify?code=' + p.code,
          standing: p.standing || '', state: '', code: p.code
        }));
      } catch (_) { return []; }
    }
  },
  {
    id: 'watch', name: 'Watches stood', perm: 'watchlog',
    load: () => {
      try {
        const W = require('./watch');
        const by = new Map();
        W.shifts().forEach(s => {
          if (s.struck || !s.name) return;
          const k = key(s.name);
          const row = by.get(k) || { who: s.name, shifts: 0, minutes: 0, last: '' };
          row.shifts += 1;
          row.minutes += Number(s.minutes) || 0;
          if (!row.last || s.on > row.last) row.last = s.on;
          by.set(k, row);
        });
        return Array.from(by.values()).map(r => ({
          who: r.who, at: r.last,
          title: r.shifts + (r.shifts === 1 ? ' watch stood' : ' watches stood'),
          note: Math.round(r.minutes / 60) + ' hours in all',
          link: '/watch/log', standing: '', state: ''
        }));
      } catch (_) { return []; }
    }
  }
];

const SOURCE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s]));

function build() {
  const map = new Map();
  SOURCES.forEach(src => {
    let rows = [];
    try { rows = src.load() || []; } catch (_) { rows = []; }
    rows.forEach(r => {
      const name = clean(r.who);
      if (!name || name.length < 2) return;
      const k = key(name);
      const person = map.get(k) || {
        key: k, slug: slugOf(name), name,
        spellings: new Set(), account: '', office: '', style: '',
        active: true, groups: {}, count: 0, last: ''
      };
      person.spellings.add(name);
      if (name.length > person.name.length) person.name = name;
      if (src.id === 'office') {
        person.account = r.account || '';
        person.office = r.title || '';
        person.style = r.note || '';
        person.active = r.state !== 'out';
      }
      (person.groups[src.id] = person.groups[src.id] || []).push(r);
      person.count += 1;
      if (r.at && r.at > person.last) person.last = r.at;
      map.set(k, person);
    });
  });
  return Array.from(map.values()).map(p => ({
    ...p,
    spellings: Array.from(p.spellings).filter(s => s !== p.name)
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function all() {
  if (CACHE.rows && Date.now() - CACHE.at < TTL) return CACHE.rows;
  CACHE.rows = build();
  CACHE.at = Date.now();
  return CACHE.rows;
}

function bust() { CACHE.rows = null; CACHE.at = 0; }

function get(slug) {
  const s = String(slug || '').toLowerCase();
  return all().find(p => p.slug === s) || all().find(p => p.key === s) || null;
}

function maySee(u, srcId) {
  const src = SOURCE_BY_ID[srcId];
  if (!src || !u) return false;
  if (O.can(u, src.perm)) return true;
  return !!(src.altPerm && O.can(u, src.altPerm));
}

function visibleGroups(u, person) {
  if (!person) return [];
  return SOURCES.filter(s => maySee(u, s.id) && (person.groups[s.id] || []).length)
    .map(s => ({
      id: s.id, name: s.name,
      rows: (person.groups[s.id] || []).slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    }));
}

function visibleCount(u, person) {
  return visibleGroups(u, person).reduce((n, g) => n + g.rows.length, 0);
}

function marks(person) {
  const out = [];
  const g = person.groups;
  if (person.account) out.push({ text: person.active ? 'Officer' : 'Stood down', tag: person.active ? 'in' : 'out' });
  if ((g.gaol || []).some(r => r.state === 'out')) out.push({ text: 'Held', tag: 'out' });
  if ((g.licence || []).some(r => r.state === 'in')) out.push({ text: 'Licensed', tag: 'gold' });
  if ((g.holding || []).some(r => r.standing === 'held')) out.push({ text: 'Holds land', tag: '' });
  if ((g.matter || []).some(r => r.state === 'gold')) out.push({ text: 'Before the court', tag: 'gold' });
  if ((g.tax || []).some(r => r.state === 'out')) out.push({ text: 'Owes tax', tag: 'out' });
  if ((g.guild || []).length) out.push({ text: (g.guild[0].title || 'A guild').replace(/^The\s+/, ''), tag: '' });
  return out;
}

function search(u, q) {
  const needle = key(q);
  const rows = all().filter(p => visibleCount(u, p) > 0);
  if (!needle) return rows;
  return rows.filter(p => p.key.includes(needle)
    || p.spellings.some(s => key(s).includes(needle))
    || (p.office && key(p.office).includes(needle)));
}

function summary(u) {
  const rows = all().filter(p => visibleCount(u, p) > 0);
  return {
    known: rows.length,
    officers: rows.filter(p => p.account && p.active).length,
    held: rows.filter(p => (p.groups.gaol || []).some(r => r.state === 'out')).length,
    licensed: rows.filter(p => (p.groups.licence || []).some(r => r.state === 'in')).length,
    atCourt: rows.filter(p => (p.groups.matter || []).some(r => r.state === 'gold')).length
  };
}

module.exports = { SOURCES, SOURCE_BY_ID, all, bust, get, maySee, visibleGroups, visibleCount, marks, search, summary, slugOf };
