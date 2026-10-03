const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./config');
const O = require('./offices');

const FILE = () => path.join(C.DATA_DIR, 'people.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch (_) { return []; }
}

function save(rows) {
  fs.mkdirSync(C.DATA_DIR, { recursive: true });
  const tmp = FILE() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, FILE());
}

function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + h;
}

function verify(password, stored) {
  const [alg, salt, h] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !h) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(h, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

const norm = u => String(u || '').trim().toLowerCase();
const validUsername = u => /^[a-z0-9._-]{3,32}$/.test(u);

function passwordProblem(p) {
  if (!p || p.length < 10) return 'Passwords must be at least 10 characters.';
  if (p.length > 200) return 'That password is too long.';
  return '';
}

const activeMasters = rows => rows.filter(x => x.office === 'master' && x.active !== false).length;

function bootstrap() {
  const rows = load();
  if (rows.length) return;
  const u = norm(C.MASTER_USERNAME);
  const p = C.MASTER_PASSWORD;
  if (!u || !p) return;
  if (!validUsername(u) || passwordProblem(p)) {
    console.error('MASTER_USERNAME or MASTER_PASSWORD is not valid; no first account was made.');
    return;
  }
  save([{
    username: u, name: C.MASTER_NAME, office: 'master', style: '',
    hash: hash(p), mustChange: false, active: true, created: new Date().toISOString()
  }]);
  console.log('Made the first account, Master of the Hold: ' + u);
}

function publicView(u) {
  const o = O.get(u.office);
  return {
    username: u.username,
    name: u.name,
    office: u.office,
    officeName: o ? o.name : 'Unplaced',
    style: u.style || '',
    guild: o ? o.guild : '',
    about: u.about || '',
    active: u.active !== false,
    mustChange: !!u.mustChange,
    lastLogin: u.lastLogin || '',
    created: u.created || ''
  };
}

function list() { return load().map(publicView).sort((a, b) => a.name.localeCompare(b.name)); }
function find(username) { return load().find(u => u.username === norm(username)); }
function view(username) { const u = find(username); return u ? publicView(u) : null; }

function authenticate(username, password) {
  const rows = load();
  const u = rows.find(x => x.username === norm(username));
  const ok = u && u.active !== false && verify(String(password || ''), u.hash);
  if (!ok) { if (!u) verify('x', hash('y')); return null; }
  u.lastLogin = new Date().toISOString();
  save(rows);
  return publicView(u);
}

function create({ username, name, office, style, password }) {
  const rows = load();
  const un = norm(username);
  if (!validUsername(un)) throw new Error('Usernames are 3–32 characters: letters, numbers, dot, dash or underscore.');
  if (rows.some(u => u.username === un)) throw new Error('That name is already on the rolls of the County.');
  if (!String(name || '').trim()) throw new Error('Give them a name.');
  const o = O.get(office);
  if (!o) throw new Error('Choose an office for them.');
  const pp = passwordProblem(password);
  if (pp) throw new Error(pp);
  rows.push({
    username: un,
    name: String(name).trim().slice(0, 80),
    office: o.id,
    style: String(style || '').trim().slice(0, 120),
    hash: hash(password),
    mustChange: true,
    active: true,
    created: new Date().toISOString()
  });
  save(rows);
  return publicView(rows[rows.length - 1]);
}

function update(username, patch) {
  const rows = load();
  const u = rows.find(x => x.username === norm(username));
  if (!u) throw new Error('Nobody of that name stands on the rolls.');
  if (patch.office !== undefined) {
    const o = O.get(patch.office);
    if (!o) throw new Error('No such office.');
    if (u.office === 'master' && o.id !== 'master' && activeMasters(rows) <= 1) throw new Error('The last Master of the Hold cannot be moved to another office.');
    u.office = o.id;
  }
  if (patch.active !== undefined) {
    if (!patch.active && u.office === 'master' && activeMasters(rows) <= 1) throw new Error('The last Master of the Hold cannot be set aside.');
    u.active = !!patch.active;
  }
  if (patch.name !== undefined) u.name = String(patch.name).trim().slice(0, 80) || u.name;
  if (patch.style !== undefined) u.style = String(patch.style).trim().slice(0, 120);
  if (patch.about !== undefined) u.about = String(patch.about).trim().slice(0, 600);
  if (patch.password !== undefined) {
    const pp = passwordProblem(patch.password);
    if (pp) throw new Error(pp);
    u.hash = hash(patch.password);
    u.mustChange = !!patch.mustChange;
  }
  save(rows);
  return publicView(u);
}

function remove(username) {
  const rows = load();
  const u = rows.find(x => x.username === norm(username));
  if (!u) return;
  if (u.office === 'master' && activeMasters(rows) <= 1) throw new Error('The last Master of the Hold cannot be struck.');
  save(rows.filter(x => x !== u));
}

function officeInUse(id) { return load().some(u => u.office === String(id || '')); }

function tempPassword() {
  const words = ['frost', 'pine', 'jerall', 'silver', 'pass', 'snow', 'hearth', 'stone', 'raven', 'amber', 'lantern', 'cairn', 'spruce', 'rime'];
  const pick = () => words[crypto.randomInt(words.length)];
  return pick() + '-' + pick() + '-' + pick() + '-' + crypto.randomInt(10, 99);
}

function sessionUser(username) {
  const u = find(username);
  if (!u || u.active === false) return null;
  const o = O.get(u.office) || { id: u.office, name: 'Unplaced', perms: [], all: false, guild: '' };
  return {
    username: u.username,
    name: u.name,
    office: o.id,
    officeName: o.name,
    title: u.style || o.name,
    all: !!o.all,
    perms: o.perms || [],
    guild: o.guild || '',
    rank: o.rank,
    mustChange: !!u.mustChange
  };
}

module.exports = {
  bootstrap, list, find, view, authenticate, create, update, remove,
  officeInUse, tempPassword, passwordProblem, sessionUser, hash, verify
};
