// Account freeze, protection against bursts of uploads, and voice notes / videos on a case.
// Start the server with:  GD_RATE_N=4 GD_HEAVY_MAX=2 GD_ALERT_MAX=2 NODEV=1 bash start.sh $S     then: node t_new.js
const crypto = require('crypto'); const B = 'http://127.0.0.1:8799'; const jpg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]).toString('base64');
let pass = 0, fail = 0; const T = (name, cond, info) => { cond ? pass++ : fail++; if (!cond) console.log('FAIL', name, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); };
const call = async (code, m, p, b, q) => { const r = await fetch(B + p + (q || ''), { method: m, headers: Object.assign({ 'content-type': 'application/json' }, code ? { 'x-code': code } : {}), body: b === undefined ? undefined : (typeof b === 'string' ? b : JSON.stringify(b)) }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {}, h: r.headers }; };
const raw = async (code, p, buf) => { const r = await fetch(B + p, { method: 'POST', headers: { 'x-code': code, 'content-type': 'application/octet-stream' }, body: buf }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = async code => (await call(code, 'GET', '/api/captures')).j.list || [];
const up = (code, id, n) => call(code, 'POST', '/api/capture', { id, takenAt: new Date().toISOString(), location: 'Post North', gps: { lat: 24.9, lon: 67.1, acc: 10 }, pages: Array.from({ length: n || 1 }, () => ({ view: jpg, top: jpg, ph: '00ff00ff00ff00ff' })) });
(async () => {
  // ---------- freeze
  T('post can use the app before', (await call('fieldcodeA', 'GET', '/api/ping')).s === 200);
  T('post staff cannot freeze', (await call('fieldcodeB', 'POST', '/api/people/fieldcodeA/freeze', { action: 'freeze', hours: 24 })).s === 403);
  T('officer cannot freeze another officer', (await call('admin2code', 'POST', '/api/people/admin2code/freeze', { action: 'freeze' })).s === 400);
  T('bad action refused', (await call('admin2code', 'POST', '/api/people/fieldcodeA/freeze', { action: 'x' })).s === 400);
  let r = await call('admin2code', 'POST', '/api/people/fieldcodeA/freeze', { action: 'freeze', hours: 24, reason: '  Under   inquiry ' });
  T('officer freezes a post for 24 hours', r.s === 200 && r.j.until > Date.now() + 23.9 * 3600e3, r);
  r = await call('fieldcodeA', 'GET', '/api/ping');
  T('frozen account gets 423 frozen', r.s === 423 && r.j.error === 'frozen', r);
  T('frozen reply says who, why and until when', r.j.by === 'Maj Ali' && r.j.reason === 'Under inquiry' && r.j.until > Date.now() && !!r.j.at, r.j);
  T('frozen account cannot send a case', (await up('fieldcodeA', 'frozen-case-001')).s === 423);
  T('frozen account cannot list cases', (await call('fieldcodeA', 'GET', '/api/captures')).s === 423);
  let pe = (await call('admincode1', 'GET', '/api/people')).j.people.find(x => x.code === 'fieldcodeA');
  T('People list shows the freeze', pe.frozen && pe.frozen.byName === 'Maj Ali' && pe.frozen.reason === 'Under inquiry', pe);
  T('other posts unaffected', (await call('fieldcodeB', 'GET', '/api/ping')).s === 200);
  T('officer unfreezes', (await call('admin2code', 'POST', '/api/people/fieldcodeA/freeze', { action: 'unfreeze' })).s === 200);
  T('account works again', (await call('fieldcodeA', 'GET', '/api/ping')).s === 200);
  pe = (await call('admincode1', 'GET', '/api/people')).j.people.find(x => x.code === 'fieldcodeA');
  T('People list cleared', pe.frozen === null, pe);
  // Owner freezes an officer until unfrozen
  r = await call('admincode1', 'POST', '/api/people/admin2code/freeze', { action: 'freeze', hours: 0 });
  T('Owner freezes an officer until unfrozen', r.s === 200 && r.j.until === 0, r);
  r = await call('admin2code', 'GET', '/api/people');
  T('frozen officer is shut out of officer pages', r.s === 423 && r.j.until === 0, r);
  T('frozen officer cannot unfreeze himself', (await call('admin2code', 'POST', '/api/people/admin2code/freeze', { action: 'unfreeze' })).s === 423);
  T('Owner is never frozen', (await call('admin2code', 'POST', '/api/people/admincode1/freeze', { action: 'freeze' })).s === 423);
  T('Owner unfreezes the officer', (await call('admincode1', 'POST', '/api/people/admin2code/freeze', { action: 'unfreeze' })).s === 200);
  T('officer back', (await call('admin2code', 'GET', '/api/people')).s === 200);
  T('freezing nobody -> 404', (await call('admincode1', 'POST', '/api/people/nobodyhere/freeze', { action: 'freeze' })).s === 404);

  // ---------- fair turns: post A sends 4 slow cases, post B one; B is read second, not last
  const A = ['slowa1aaaaaa', 'slowa2aaaaaa', 'slowa3aaaaaa', 'slowa4aaaaaa'];
  for (const id of A) T('post A case accepted ' + id, (await up('fieldcodeA', id)).s === 200);
  T('post B case accepted', (await up('fieldcodeB', 'slowb1bbbbbb')).s === 200);
  let done = null; for (let i = 0; i < 80; i++) { const L = await list('admincode1'), mine = L.filter(c => /^slow/.test(c.id)); if (mine.length === 5 && mine.every(c => c.status === 'done')) { done = mine; break; } await sleep(500); }
  T('all five read', !!done);
  if (done) { const order = done.slice().sort((a, b) => String(a.doneAt).localeCompare(String(b.doneAt))).map(c => c.id); T('post B case read second, not after all of post A', order.indexOf('slowb1bbbbbb') <= 1, order); }

  // ---------- rate limit (GD_RATE_N=4): post A has sent 4 cases; the 5th waits on the phone
  r = await up('fieldcodeA', 'rate-five-0001');
  T('5th case in 10 min -> 429 slow', r.s === 429 && r.j.error === 'slow' && r.j.retry > 0 && r.h.get('retry-after'), r);
  r = await call('fieldcodeA', 'POST', '/api/page', { id: 'rate-five-0002', n: 0, view: jpg }, '?id=rate-five-0002');
  T('first photo of a new case is also held back', r.s === 429 && r.j.error === 'slow', r);
  T('resending a case already received is not counted', (await up('fieldcodeA', A[0])).j.dup === true);
  T('another post is not slowed', (await up('fieldcodeB', 'rate-other-0001')).s === 200);
  const lg = require('fs').readFileSync(process.argv[2] ? process.argv[2] + '/srv/log.txt' : __dirname + '/srv/log.txt', 'utf8');
  T('log records the slowing once', (lg.match(/SLOWED: Post A/g) || []).length === 1);
  let nt = (await call('admincode1', 'GET', '/api/captures')).j.notices || [];
  T('officers are told once', nt.filter(x => /Many cases from Post A/.test(x.title)).length === 1, nt.map(x => x.title));

  // ---------- upload gate (GD_HEAVY_MAX=2): many big uploads at the same moment
  const big = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(6e6), Buffer.from([0xff, 0xd9])]).toString('base64');
  const res = await Promise.all(Array.from({ length: 8 }, (_, i) => call('fieldcodeB', 'POST', '/api/page', { id: 'gate-test-000' + i, n: 0, view: big, top: big })));
  const ok = res.filter(x => x.s === 200).length, busy = res.filter(x => x.s === 429 && x.j.error === 'busy').length;
  T('some uploads taken, the rest told to wait', ok >= 1 && busy >= 1 && ok + busy === 8, res.map(x => x.s));
  T('server still answers at once', (await call('admincode1', 'GET', '/api/ping')).s === 200);
  await sleep(300);
  T('after the burst, uploads are taken again', (await call('fieldcodeB', 'POST', '/api/page', { id: 'gate-test-0009', n: 0, view: jpg })).s === 200);

  // ---------- recordings
  T('case for recordings', (await up('fieldcodeB', 'media-case-0001')).s === 200);
  const audio = crypto.randomBytes(2.5e6), K = 'aa11bb22cc33', q = (k, off, total, kind, mime) => '/api/media/media-case-0001?k=' + k + '&kind=' + (kind || 'audio') + '&mime=' + encodeURIComponent(mime || 'audio/mp4') + '&secs=42&off=' + off + '&total=' + total;
  r = await raw('fieldcodeB', q(K, 0, audio.length), audio.subarray(0, 1e6)); T('first piece taken', r.s === 200 && r.j.have === 1e6, r);
  r = await raw('fieldcodeB', q(K, 0, audio.length), audio.subarray(0, 1e6)); T('piece sent twice: told where to carry on', r.s === 200 && r.j.have === 1e6, r);
  r = await raw('fieldcodeB', q(K, 1e6, audio.length), audio.subarray(1e6, 2e6)); T('second piece', r.j.have === 2e6, r);
  r = await raw('fieldcodeB', q(K, 2e6, audio.length), audio.subarray(2e6)); T('last piece completes it', r.s === 200 && r.j.done === true, r);
  r = await raw('fieldcodeB', q(K, 2e6, audio.length), audio.subarray(2e6)); T('finished recording sent again: no duplicate', r.j.done === true);
  let c = (await list('fieldcodeB')).find(x => x.id === 'media-case-0001');
  T('case shows the voice note', c && c.media && c.media.length === 1 && c.media[0].kind === 'audio' && c.media[0].secs === 42 && c.media[0].bytes === audio.length && c.media[0].byName === 'Post B', c && c.media);
  let g = await fetch(B + '/api/media/media-case-0001/' + K, { headers: { 'x-code': 'fieldcodeB' } }); let gb = Buffer.from(await g.arrayBuffer());
  T('plays back exactly what was sent', g.status === 200 && g.headers.get('content-type') === 'audio/mp4' && gb.equals(audio));
  g = await fetch(B + '/api/media/media-case-0001/' + K, { headers: { 'x-code': 'admincode1', range: 'bytes=100-199' } }); gb = Buffer.from(await g.arrayBuffer());
  T('officer can play a part (phones ask for parts)', g.status === 206 && gb.length === 100 && gb.equals(audio.subarray(100, 200)) && g.headers.get('content-range') === 'bytes 100-199/' + audio.length);
  g = await fetch(B + '/api/media/media-case-0001/' + K + '?code=fieldcodeB', { headers: { range: 'bytes=-50' } });
  T('link with code works for the phone player; last bytes', g.status === 206 && (await g.arrayBuffer()).byteLength === 50);
  T('another post cannot play it', (await fetch(B + '/api/media/media-case-0001/' + K, { headers: { 'x-code': 'fieldcodeA' } })).status === 404);
  T('another post cannot add to it', (await raw('fieldcodeA', q('ffff0000ffff', 0, 10), Buffer.alloc(10))).s === 404);
  T('wrong kind for the type refused', (await raw('fieldcodeB', q('bad0000mime1', 0, 10, 'audio', 'video/mp4'), Buffer.alloc(10))).s === 400);
  T('unknown type refused', (await raw('fieldcodeB', q('bad0000mime2', 0, 10, 'audio', 'application/zip'), Buffer.alloc(10))).s === 400);
  T('too large refused before upload', (await raw('fieldcodeB', q('bad0000big01', 0, 13e6), Buffer.alloc(10))).s === 413);
  T('piece longer than the total refused', (await raw('fieldcodeB', q('bad0000len01', 0, 5), Buffer.alloc(10))).s === 400);
  r = await raw('admin2code', q('video0000001', 0, 3000, 'video', 'video/mp4'), crypto.randomBytes(3000)); T('officer adds a video', r.j.done === true, r);
  r = await raw('fieldcodeB', q('video0000002', 0, 500, 'video', 'video/quicktime'), crypto.randomBytes(500)); T('iPhone camera video (.mov) accepted', r.j.done === true, r);
  for (let i = 3; i <= 5; i++) await raw('fieldcodeB', q('fill000000' + i + 'x', 0, 100), crypto.randomBytes(100));
  T('7th recording refused (6 per case)', (await raw('fieldcodeB', q('fill0000007x', 0, 100), crypto.randomBytes(100))).s === 409);
  c = (await list('admincode1')).find(x => x.id === 'media-case-0001');
  T('case marked as having new uploads by the post', c.fresh && c.fresh.audio === 4 && c.fresh.video === 1 && c.fresh.byName === 'Post B', c.fresh);
  await sleep(1800); nt = (await call('admincode1', 'GET', '/api/captures')).j.notices || [];
  T('officers get one notice for the burst, not one per recording', nt.filter(x => /^New uploads: case/.test(x.title)).length === 1 && /4 voice notes and 1 video/.test((nt.find(x => /^New uploads/.test(x.title)) || {}).body), nt.map(x => x.title + ' / ' + x.body));
  T('officer cannot take off a post\'s recording', (await call('admin2code', 'DELETE', '/api/media/media-case-0001/' + K)).s === 403);
  T('post cannot take back what he sent', (await call('fieldcodeB', 'DELETE', '/api/media/media-case-0001/fill0000005x')).s === 403);
  T('Owner can take one off', (await call('admincode1', 'DELETE', '/api/media/media-case-0001/video0000001')).s === 200);
  c = (await list('admincode1')).find(x => x.id === 'media-case-0001');
  T('list now has 5', c.media.length === 5, c.media.map(x => x.k));
  // ---------- more photos on a sent case
  const pg = { kind: 'doc', ph: '0123456789abcdef', view: jpg, top: jpg, thumb: jpg };
  T('another post cannot add a photo', (await call('fieldcodeA', 'POST', '/api/more/media-case-0001', Object.assign({ k: 'morephoto001' }, pg))).s === 404);
  T('photo without a key refused', (await call('fieldcodeB', 'POST', '/api/more/media-case-0001', pg)).s === 400);
  const before = (await list('admincode1')).find(x => x.id === 'media-case-0001');
  r = await call('fieldcodeB', 'POST', '/api/more/media-case-0001', Object.assign({ k: 'morephoto001' }, pg)); T('post adds a forgotten photo', r.s === 200 && r.j.n === before.nPages, r);
  T('same photo sent twice is kept once', (await call('fieldcodeB', 'POST', '/api/more/media-case-0001', Object.assign({ k: 'morephoto001' }, pg))).j.dup === true);
  c = (await list('admincode1')).find(x => x.id === 'media-case-0001');
  T('case has one more page, marked added and not read', c.nPages === before.nPages + 1 && c.pages[c.nPages - 1].type === 'added' && c.pages[c.nPages - 1].byName === 'Post B', [c.nPages, c.pages[c.nPages - 1]]);
  T('earlier pages untouched', JSON.stringify(c.pages.slice(0, before.nPages)) === JSON.stringify(before.pages), '');
  T('new-uploads marker counts the photo', c.fresh.photo === 1, c.fresh);
  T('the photo can be viewed', (await fetch(B + '/api/photo/media-case-0001/' + (c.nPages - 1), { headers: { 'x-code': 'admincode1' } })).status === 200);
  T('the case is not read again by itself', c.status === 'done');
  T('post cannot ask for a re-check', (await call('fieldcodeB', 'POST', '/api/retry/media-case-0001')).s === 403);
  T('officer marks as seen', (await call('admin2code', 'POST', '/api/fresh/media-case-0001')).s === 200 && !(await list('admincode1')).find(x => x.id === 'media-case-0001').fresh);
  await call('fieldcodeB', 'POST', '/api/more/media-case-0001', Object.assign({ k: 'morephoto002' }, pg));
  T('new upload marks it again', !!(await list('admincode1')).find(x => x.id === 'media-case-0001').fresh);
  T('officer has it checked again', (await call('admin2code', 'POST', '/api/retry/media-case-0001')).s === 200);
  T('adding while it is being read waits', (await call('fieldcodeB', 'POST', '/api/more/media-case-0001', Object.assign({ k: 'morephoto003' }, pg))).s === 429);
  for (let i = 0; i < 40; i++) { c = (await list('admincode1')).find(x => x.id === 'media-case-0001'); if (c.status === 'done') break; await sleep(300); }
  T('after the check every page is read and the marker is cleared', c.status === 'done' && !c.fresh && c.pages.length === c.nPages && !c.pages.some(p => p.type === 'added'), [c.status, c.fresh, c.pages.map(p => p.type)]);
  T('recordings stay after the check', c.media.length === 5);
  const fs = require('fs'), dir = (process.argv[2] || __dirname) + '/srv/data/captures/media-case-0001/media';
  T('file taken off is kept on the Mac, renamed', fs.readdirSync(dir).some(f => /^removed-\d+-video0000001\.mp4$/.test(f)), fs.readdirSync(dir));
  // frozen: no playback either
  await call('admincode1', 'POST', '/api/people/fieldcodeB/freeze', { action: 'freeze', hours: 1 });
  T('frozen account cannot play recordings', (await fetch(B + '/api/media/media-case-0001/' + K, { headers: { 'x-code': 'fieldcodeB' } })).status === 423);
  await call('admincode1', 'POST', '/api/people/fieldcodeB/freeze', { action: 'unfreeze' });

  console.log('New-feature tests passed: ' + pass + '  failed: ' + fail); process.exit(fail ? 1 : 0);
})();
