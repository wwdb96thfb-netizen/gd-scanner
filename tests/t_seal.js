// Sealed requests (end-to-end encryption between the phone and the Mac).
// Start the server with the lock ON:  SEALLOCK=1 NODEV=1 bash start.sh $S     then: node t_seal.js $S
const crypto = require('crypto'); const B = 'http://127.0.0.1:8799'; const jpg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]).toString('base64');
let pass = 0, fail = 0; const T = (n, c, d) => { c ? pass++ : fail++; if (!c) console.log('FAIL', n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)); };
const idOf = c => crypto.createHash('sha256').update(c).digest('hex').slice(0, 16), keyOf = s => crypto.createHash('sha256').update('gd-e2e-v1:' + s).digest();
const box = (secret, head, body) => { const h = Buffer.from(JSON.stringify(head)), len = Buffer.alloc(4); len.writeUInt32BE(h.length); const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyOf(secret), iv); const ct = Buffer.concat([c.update(Buffer.concat([len, h, body || Buffer.alloc(0)])), c.final()]); return Buffer.concat([iv, ct, c.getAuthTag()]); };
const unbox = (secret, buf) => { const d = crypto.createDecipheriv('aes-256-gcm', keyOf(secret), buf.subarray(0, 12)); d.setAuthTag(buf.subarray(buf.length - 16)); const p = Buffer.concat([d.update(buf.subarray(12, buf.length - 16)), d.final()]), n = p.readUInt32BE(0); return { head: JSON.parse(p.subarray(4, 4 + n)), body: p.subarray(4 + n) }; };
let lastOuter = null;
const S = async (secret, m, p, body, hdr, opt) => { opt = opt || {}; const b = body === undefined ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const env = opt.raw || box(opt.key || secret, { m, p, h: Object.assign(body !== undefined && !Buffer.isBuffer(body) ? { 'content-type': 'application/json' } : {}, hdr || {}), t: opt.t || Date.now(), n: crypto.randomBytes(16).toString('hex') }, b); lastOuter = env;
  const r = await fetch(B + '/api/x', { method: 'POST', headers: { 'x-id': opt.id || idOf(secret), 'content-type': 'application/octet-stream' }, body: env });
  if (r.status !== 200) return { outer: r.status, j: await r.json().catch(() => ({})) };
  const o = unbox(secret, Buffer.from(await r.arrayBuffer())); let j = null; try { j = JSON.parse(o.body.toString()); } catch (e) {} return { outer: 200, s: o.head.s, h: o.head.h, j: j || {}, body: o.body }; };
(async () => {
  let r = await S('fieldcodeA', 'GET', '/api/ping'); T('sealed ping answers inside the seal', r.outer === 200 && r.s === 200 && r.j.ok && r.j.name === 'Post A', r);
  T('what travels is scrambled: no code, no path in the bytes', !lastOuter.includes(Buffer.from('fieldcodeA')) && !lastOuter.includes(Buffer.from('/api/ping')));
  r = await S('fieldcodeA', 'GET', '/api/ping', undefined, {}, { key: 'someotherkey' }); T('a box locked with the wrong key is refused', r.outer === 400 && r.j.error === 'seal', r);
  const env = box('fieldcodeA', { m: 'GET', p: '/api/ping', h: {}, t: Date.now(), n: crypto.randomBytes(16).toString('hex') });
  r = await S('fieldcodeA', 'GET', '', undefined, {}, { raw: env }); T('first use of a box works', r.s === 200);
  r = await S('fieldcodeA', 'GET', '', undefined, {}, { raw: env }); T('the same box sent again (replay) is refused', r.outer === 400 && r.j.error === 'replay', r);
  r = await S('fieldcodeA', 'GET', '/api/ping', undefined, {}, { t: Date.now() - 3600e3 }); T('a phone with a wrong clock is told the server time', r.outer === 400 && r.j.error === 'clock' && Math.abs(r.j.now - Date.now()) < 5000, r);
  r = await S('nosuchperson1234', 'GET', '/api/ping'); T('unknown account: plain "code" answer, nothing else', r.outer === 401 && r.j.error === 'code', r);
  r = await S('fieldcodeA', 'GET', '/api/x'); T('a box cannot ask for another box', r.outer === 400, r);
  r = await S('fieldcodeA', 'GET', '/control'); T('a box cannot reach the Operations Room', r.outer === 400, r);
  // the whole case flow, sealed
  r = await S('fieldcodeA', 'POST', '/api/capture', { id: 'sealcase-0001', takenAt: new Date().toISOString(), location: 'Post Creek', gps: { lat: 24.9, lon: 67.1, acc: 9 }, pages: [{ view: jpg, top: jpg, ph: '00ff00ff00ff00ff' }] });
  T('case sent sealed', r.s === 200 && r.j.ok, r);
  let c = null; for (let i = 0; i < 30; i++) { r = await S('fieldcodeA', 'GET', '/api/captures'); c = (r.j.list || []).find(x => x.id === 'sealcase-0001'); if (c && c.status === 'done') break; await new Promise(x => setTimeout(x, 300)); }
  T('case read and listed, sealed', c && c.status === 'done', c && c.status);
  r = await S('fieldcodeA', 'GET', '/api/thumb/sealcase-0001/0'); T('picture comes back sealed, as an image', r.s === 200 && /image\/jpeg/.test(r.h['content-type']) && r.body[0] === 0xff, r.h);
  const aud = crypto.randomBytes(300000);
  r = await S('fieldcodeA', 'POST', '/api/media/sealcase-0001?k=sealaudio001&kind=audio&mime=audio%2Fmp4&secs=5&off=0&total=' + aud.length, aud, { 'content-type': 'application/octet-stream' }); T('recording uploaded sealed', r.s === 200 && r.j.done, r);
  r = await S('fieldcodeA', 'GET', '/api/media/sealcase-0001/sealaudio001', undefined, { range: 'bytes=0-99999' }); T('recording played sealed in pieces (range)', r.s === 206 && r.body.length === 100000 && r.body.equals(aud.subarray(0, 100000)) && /\/300000$/.test(r.h['content-range']), r.h);
  r = await S('fieldcodeB', 'GET', '/api/media/sealcase-0001/sealaudio001'); T('another post still cannot open it', r.s === 404);
  // the lock: once a phone talks sealed, its code is refused in the open
  const plain = await fetch(B + '/api/ping', { headers: { 'x-code': 'fieldcodeA' } }); T('open request with a sealed account\'s code is refused', plain.status === 426);
  const plainB = await fetch(B + '/api/ping', { headers: { 'x-code': 'admin2code' } }); T('an account that never used sealing still works in the open (older phones)', plainB.status === 200);
  // joining, sealed with the join key
  r = await S('joinkeyjoinkeyjoinke', 'POST', '/api/join', { name: 'Sealed Joiner', code: 'sealedjoinercode1234', role: 'field' }, {}, { id: 'join' }); T('join request sealed with the join key', r.s === 200 && r.j.ok, r);
  r = await S('sealedjoinercode1234', 'GET', '/api/ping'); T('a waiting joiner can ask sealed and is told he is pending', r.s === 403 && r.j.error === 'pending', r);
  // freeze still applies inside the seal
  await fetch(B + '/api/people/fieldcodeB/freeze', { method: 'POST', headers: { 'x-code': 'admincode1', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'freeze', hours: 1 }) });
  r = await S('fieldcodeB', 'GET', '/api/ping'); T('frozen account told so inside the seal', r.s === 423 && r.j.error === 'frozen', r);
  await fetch(B + '/api/people/fieldcodeB/freeze', { method: 'POST', headers: { 'x-code': 'admincode1', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'unfreeze' }) });
  console.log('SEAL TESTS PASSED ' + pass + '   FAILED ' + fail); process.exit(fail ? 1 : 0);
})();
