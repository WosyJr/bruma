const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const TIERS = ['Entry', 'Aspirant', 'Rookie', 'Experienced', 'Professional', 'Veteran', 'Expert', 'Master', 'Liaison', 'Leadership'];

function build(names, notes, tiers, prefix) {
  return names.map((n, i) => ({
    id: LETTERS[i].toLowerCase(),
    letter: LETTERS[i],
    code: (prefix || '') + LETTERS[i],
    name: n,
    tier: (tiers && tiers[i]) || TIERS[i],
    step: i,
    note: notes[i] || ''
  }));
}

const SHORT_TIERS = ['Entry', 'Aspirant', 'Professional', 'Liaison', 'Leadership', 'Steward'];

const LADDERS = {
  miners: build(
    ['Associate', 'Prospector', 'Bandsman', 'Foreman', 'Minemaster', 'Steward'],
    [
      'Entry rank, contracts done under supervision, no benefits.',
      'Aspirant rank, first independent contracts, standard equipment package, option to acquire goods and services from the Miners Guild, training privileges and housing and storing privileges.',
      'Professional rank, often assigned to long term contracts and duties, all previous benefits with the addition of cheaper services from Miners Guild vendors.',
      'Representatives and liaisons of a given Guildhall. Entrusted with advising and working closely with the Steward and managing most affairs of the Guildhall. All previous benefits along with a Foreman equipment package.',
      'Overall leadership of the guild entrusted with maintaining and establishing Guildhalls along with the affairs of the Guild at large. All previous benefits.',
      'Guildhall management for a given county/city/district.'
    ],
    SHORT_TIERS,
    'VI.'
  ),
  fighters: build(
    ['Associate', 'Footman', 'Swordhand', 'Shieldbearer', 'Warden', 'Serjeant', 'Blademaster', 'Champion', 'Marshal', 'Guildmaster'],
    [
      'Contracts under supervision. No benefits yet.',
      'First paid contracts, arms issued, a bunk in the hall.',
      'Standard field work, basic healthcare, more than one contract at a time.',
      'May lead a small detail. Better shares from contracts.',
      'Long-term contracts and standing duties. Cheaper services from guild vendors.',
      'Drills the hall and leads companies. More than two contracts at once.',
      'May act in the Steward’s stead on lesser matters. May take a second office.',
      'Operational command and guild duties under the Steward.',
      'Represents the hall, advises the Steward, manages its affairs.',
      'The guild at large — establishing and maintaining every hall.'
    ]
  ),
  synod: build(
    ['Associate', 'Acolyte', 'Scribe', 'Adept', 'Conjurer', 'Magister', 'Thaumaturge', 'Archivist', 'Councillor', 'Arch-Magister'],
    [
      'Study under supervision. No benefits yet.',
      'First independent study, reagents issued, a cell in the hall.',
      'Keeps the books and copies what the hall needs. Basic healthcare.',
      'May take students and set small work. Better shares from commissions.',
      'Long-term commissions and duties. Cheaper services from guild vendors.',
      'Sets the hall’s work and leads study. More than two commissions at once.',
      'May act in the Steward’s stead on lesser matters. May take a second office.',
      'Keeps the whole collection and its security under the Steward.',
      'Represents the hall, advises the Steward, manages its affairs.',
      'The guild at large — establishing and maintaining every hall.'
    ]
  ),
  hunters: build(
    ['Tracker', 'Pathfinder', 'Huntsman', 'Ranger', 'Huntmaster', 'Steward'],
    [
      'Entry rank, contracts done under supervision, no benefits.',
      'Aspirant rank, first independent contracts, standard equipment package, option to acquire goods and services from the Hunters Guild, training privileges and housing and storing privileges.',
      'Professional rank, often assigned to long term contracts and duties such as bounder duty, all previous benefits with the addition of cheaper services from Hunters Guild vendors.',
      'Representatives and liaisons of a given Guildhall. Entrusted with advising and working closely with the Steward and managing most affairs of the Guildhall. All previous benefits along with a Ranger equipment package.',
      'Overall leadership of the guild entrusted with maintaining and establishing Guildhalls along with the affairs of the Guild at large. All previous benefits.',
      'Guildhall management for a given county/city/district.'
    ],
    SHORT_TIERS,
    'VI.'
  )
};

const DUTIES = {
  miners: [
    { name: 'Chirurgeon', note: 'Sees to any member hurt on contract work.' },
    { name: 'Shaftwright', note: 'Keeps contracts, reports and correspondence with other guilds.' },
    { name: 'Quartermaster', note: 'Equipment and provisions, maintenance and sale of gear.' }
  ],
  fighters: [
    { name: 'Chirurgeon', note: 'Sees to any member hurt on contract work.' },
    { name: 'Drillmaster', note: 'Trains the hall and sets the standard of arms.' },
    { name: 'Quartermaster', note: 'Equipment and provisions, maintenance and sale of gear.' },
    { name: 'Steward', note: 'Management of the hall for a county, city or district.' }
  ],
  synod: [
    { name: 'Physician', note: 'Sees to any member hurt in the hall’s work.' },
    { name: 'Keeper of the Books', note: 'Keeps commissions, reports and correspondence with other guilds.' },
    { name: 'Quartermaster', note: 'Reagents and apparatus, maintenance and sale of stock.' },
    { name: 'Steward', note: 'Management of the hall for a county, city or district.' }
  ],
  hunters: [
    { name: 'Chirurgeon', note: 'Sees to any member hurt on contract work.' },
    { name: 'Houndmaster', note: 'Keeps the hounds, the horses and the kennels.' },
    { name: 'Quartermaster', note: 'Bows, lines and provisions, maintenance and sale of gear.' }
  ]
};

const RENDERS = {
  miners: { label: 'Ore rendered, week', unit: 'loads' },
  fighters: { label: 'Contracts closed, week', unit: 'contracts' },
  synod: { label: 'Commissions filled, week', unit: 'commissions' },
  hunters: { label: 'Game rendered, week', unit: 'head' }
};

const CHARTER_SECTION = {
  miners: 'Chartered under Section 4 of the Guilds Act',
  fighters: 'Chartered under Section 2 of the Guilds Act',
  synod: 'Chartered under Section 1 of the Guilds Act',
  hunters: 'Chartered under Section 6 of the Guilds Act'
};

const LEDE = {
  miners: 'The lawful authority on prospecting, excavation and the refinement of minerals in this county, and the hand that cuts contracts with its citizens.',
  fighters: 'The lawful authority on arms, escort and the keeping of order under contract in this county, and the hand that cuts contracts with its citizens.',
  synod: 'The lawful authority on magical practice, instruction and the keeping of arcane record in this county, and the hand that cuts contracts with its citizens.',
  hunters: 'The lawful authority on game, pelts and the clearing of beasts from the roads of this county, and the hand that cuts contracts with its citizens.'
};

const HALLS = {
  miners: { hall: 'Gutted Mine', seat: 'County Bruma', under: 'under Zenithar',
    blurb: 'Prospecting, excavation and the refinement of ore. The lawful authority on digging in this county.' },
  fighters: { hall: 'Bruma Fighters Guild', seat: 'City of Bruma', under: '',
    blurb: 'Hired arms, escorts on the Pale Pass road, and the clearing of beasts and bandits under contract.' },
  synod: { hall: 'Bruma Synod Conclave', seat: 'City of Bruma', under: '',
    blurb: 'Magical research and counsel, and the keeping of what is dangerous. Answers to the Conclave before it answers to the county.' },
  hunters: { hall: "Hunter's Shack", seat: 'County Bruma', under: 'under Kynareth',
    blurb: 'Trackers, trappers and hunters. The lawful authority on game and woodland in this county.' }
};

function hall(guildId) { return HALLS[guildId] || HALLS.miners; }

const DEFAULT = LADDERS.miners;

function ladder(guildId) { return LADDERS[guildId] || DEFAULT; }
function rankOf(guildId, id) {
  const l = ladder(guildId);
  return l.find(r => r.id === String(id || '').toLowerCase()) || null;
}
function rankName(guildId, id) {
  const r = rankOf(guildId, id);
  return r ? r.name : 'Associate';
}
function duties(guildId) { return DUTIES[guildId] || DUTIES.miners; }
function renders(guildId) { return RENDERS[guildId] || RENDERS.miners; }
function section(guildId) { return CHARTER_SECTION[guildId] || 'Chartered under the Guilds Act'; }
function lede(guildId) { return LEDE[guildId] || LEDE.miners; }

const OLD_GRADES = { master: 'j', warden: 'h', journeyman: 'e', member: 'c', apprentice: 'a' };

const SHORTENED = {
  a: 'a', b: 'b', c: 'b', d: 'c', e: 'c', f: 'c', g: 'd', h: 'd', i: 'd', j: 'e'
};
const SHORTENED_GUILDS = ['miners', 'hunters'];

function normalise(guildId, grade) {
  const g = String(grade || '').toLowerCase();
  if (rankOf(guildId, g)) return g;
  const fromOldWord = OLD_GRADES[g];
  if (fromOldWord && rankOf(guildId, fromOldWord)) return fromOldWord;
  if (fromOldWord && SHORTENED[fromOldWord] && rankOf(guildId, SHORTENED[fromOldWord])) {
    return SHORTENED[fromOldWord];
  }
  if (SHORTENED[g] && rankOf(guildId, SHORTENED[g])) return SHORTENED[g];
  return 'a';
}

module.exports = { LETTERS, TIERS, SHORTENED, SHORTENED_GUILDS, LADDERS, DUTIES, RENDERS, HALLS, hall, ladder, rankOf, rankName, duties, renders, section, lede, normalise };
