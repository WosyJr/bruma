const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const TIERS = ['Entry', 'Aspirant', 'Rookie', 'Experienced', 'Professional', 'Veteran', 'Expert', 'Master', 'Liaison', 'Leadership'];

function build(names, notes) {
  return names.map((n, i) => ({
    id: LETTERS[i].toLowerCase(),
    letter: LETTERS[i],
    name: n,
    tier: TIERS[i],
    step: i,
    note: notes[i] || ''
  }));
}

const LADDERS = {
  miners: build(
    ['Associate', 'Prospector', 'Hewer', 'Pitman', 'Bandsman', 'Overseer', 'Shaftwright', 'Delvemaster', 'Foreman', 'Minemaster'],
    [
      'Contracts under supervision. No benefits yet.',
      'First independent contracts, equipment package, housing and storing.',
      'Standard field work, basic healthcare, more than one contract at a time.',
      'May organise and lead small details. Better shares from contracts.',
      'Long-term contracts and duties. Cheaper services from guild vendors.',
      'Organises long contracts and leads teams. More than two contracts at once.',
      'May act in the Steward’s stead on lesser matters. May take a second office.',
      'Operational command and guild duties under the Steward.',
      'Represents the hall, advises the Steward, manages its affairs.',
      'The guild at large — establishing and maintaining every hall.'
    ]
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
    ['Associate', 'Tracker', 'Snarer', 'Stalker', 'Bowhand', 'Ranger', 'Beastmaster', 'Pathfinder', 'Warden of the Wild', 'Huntmaster'],
    [
      'Contracts under supervision. No benefits yet.',
      'First independent contracts, bow and kit issued, a bunk in the hall.',
      'Lines, traps and pelts. Basic healthcare, more than one contract at a time.',
      'May lead a small party. Better shares from contracts.',
      'Long-term contracts and duties. Cheaper services from guild vendors.',
      'Takes the long patrols and leads parties. More than two contracts at once.',
      'May act in the Steward’s stead on lesser matters. May take a second office.',
      'Knows every road and run in the County. Guild duties under the Steward.',
      'Represents the hall, advises the Steward, manages its affairs.',
      'The guild at large — establishing and maintaining every hall.'
    ]
  )
};

const DUTIES = {
  miners: [
    { name: 'Chirurgeon', note: 'Sees to any member hurt on contract work.' },
    { name: 'Shaftwright', note: 'Keeps contracts, reports and correspondence with other guilds.' },
    { name: 'Quartermaster', note: 'Equipment and provisions, maintenance and sale of gear.' },
    { name: 'Steward', note: 'Management of the hall for a county, city or district.' }
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
    { name: 'Quartermaster', note: 'Bows, lines and provisions, maintenance and sale of gear.' },
    { name: 'Steward', note: 'Management of the hall for a county, city or district.' }
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
function normalise(guildId, grade) {
  const g = String(grade || '').toLowerCase();
  if (rankOf(guildId, g)) return g;
  return OLD_GRADES[g] || 'a';
}

module.exports = { LETTERS, TIERS, LADDERS, DUTIES, RENDERS, ladder, rankOf, rankName, duties, renders, section, lede, normalise };
