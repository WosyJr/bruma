const fs = require('fs');
const path = require('path');
const C = require('./config');

const file = name => path.join(C.DATA_DIR, name);
const clone = v => JSON.parse(JSON.stringify(v));

let ver = Date.now();
const version = () => ver;
const touch = () => { ver++; };

function read(name, def) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch (_) { return clone(def); }
}

function write(name, data, quiet) {
  fs.mkdirSync(C.DATA_DIR, { recursive: true });
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file(name));
  if (!quiet) ver++;
  return data;
}

function update(name, def, fn) {
  const data = read(name, def);
  const out = fn(data);
  write(name, data);
  return out;
}

function append(name, obj) {
  fs.mkdirSync(C.DATA_DIR, { recursive: true });
  fs.appendFileSync(file(name), JSON.stringify(obj) + '\n');
  ver++;
}

function lines(name) {
  try {
    return fs.readFileSync(file(name), 'utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
      .filter(Boolean);
  } catch (_) { return []; }
}

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

module.exports = { read, write, update, append, lines, id, version, touch };
