// The checking rules are published only sealed. server/checks.js is a small opener plus the locked rules; it opens itself on the
// server Mac with the Mac's own key, data/rules.key, which is never published. The plain rules are never published either.
//   node tests/rules.js seal <keyfile>   reads server/checks.plain.js (not published), writes the sealed server/checks.js
//   node tests/rules.js open <keyfile>   reads the sealed server/checks.js, writes server/checks.plain.js to work on
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const [, , what, keyFile] = process.argv, dir = path.join(__dirname, '..', 'server');
const key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex'); if (key.length !== 32) throw new Error('the key must be 64 hex characters');
if (what === 'seal') {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv), ct = Buffer.concat([c.update(fs.readFileSync(path.join(dir, 'checks.plain.js'))), c.final()]);
  const blob = Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64');
  fs.writeFileSync(path.join(dir, 'checks.js'), `// GD Scanner checking rules, sealed. The rules are locked; the server Mac opens them with its own key (data/rules.key), which is never published.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), Module = require('module');
const SEALED = '${blob}';
let key; try { key = Buffer.from(fs.readFileSync(path.join(__dirname, 'data', 'rules.key'), 'utf8').trim(), 'hex'); } catch (e) { throw new Error('The checking rules are sealed and this Mac has no key (data/rules.key). Copy it from the old Mac.'); }
const b = Buffer.from(SEALED, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(b.length - 16));
const src = Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8');
const m = new Module(__filename, module); m.filename = __filename; m.paths = module.paths; m._compile(src, __filename); module.exports = m.exports;
`); console.log('sealed server/checks.js');
} else if (what === 'open') {
  const t = fs.readFileSync(path.join(dir, 'checks.js'), 'utf8'), blob = (t.match(/const SEALED = '([^']+)'/) || [])[1]; if (!blob) throw new Error('server/checks.js is not sealed');
  const b = Buffer.from(blob, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(b.length - 16));
  fs.writeFileSync(path.join(dir, 'checks.plain.js'), Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()])); console.log('opened server/checks.plain.js');
} else console.log('usage: node tests/rules.js seal|open <keyfile>');
