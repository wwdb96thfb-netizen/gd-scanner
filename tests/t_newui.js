// Screens for: freezing an account (officer's People page and the frozen phone), voice notes and videos (scan screen and an open case),
// and the Operations Room (freeze controls, recordings in the case drawer).
// Start the server with:  NODEV=1 bash start.sh $S     Copy into the repo as _n.js and run: node _n.js $S  (shots go to $S/shots-new)
const { chromium } = require('playwright'); const S = process.argv[2]; const B = 'http://127.0.0.1:8799'; const fs = require('fs');
const jpg = 'data:image/jpeg;base64,' + fs.readFileSync(S + '/sharp.jpg').toString('base64'); const SH = S + '/shots-new'; fs.mkdirSync(SH, { recursive: true });
const call = async (code, m, p, b) => { const r = await fetch(B + p, { method: m, headers: { 'x-code': code, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const up = (code, id, n) => call(code, 'POST', '/api/capture', { id, takenAt: new Date().toISOString(), location: 'Post Creek', gps: { lat: 24.9, lon: 67.1, acc: 9 }, pages: Array.from({ length: n || 4 }, (_, i) => ({ view: jpg, top: jpg, ph: (id.slice(0, 8) + '00000000').slice(0, 15) + i })) });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  let pass = 0; const fail = [], OPEN = []; const T = (n, c, d) => { if (c) pass++; else fail.push(n + (d !== undefined ? '  [' + String(d).slice(0, 220) + ']' : '')); };
  const G = async (n, f) => { try { await f(); } catch (e) { fail.push(n + ' CRASHED: ' + String(e).split('\n').slice(0, 3).join(' ').slice(0, 260)); } };
  const mk = async (code, pin) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: { latitude: 24.9, longitude: 67.1 }, permissions: ['geolocation', 'camera', 'microphone'] }); const p = await ctx.newPage(); p.setDefaultTimeout(6000);
    p.on('pageerror', e => fail.push('JS ERROR (' + code + '): ' + String(e).slice(0, 200)));
    p.on('request', q => { const u = q.url(); if (u.startsWith(B) && !/\/api\/(x|hello)(\?|$)/.test(u)) OPEN.push(code + ' ' + q.method() + ' ' + u.slice(B.length, B.length + 60)); if (u.startsWith(B) && (q.headers()['x-code'] || /[?&]code=/.test(u))) OPEN.push(code + ' code visible: ' + u.slice(B.length, B.length + 60)); });
    await p.goto('http://127.0.0.1:8798/index.html?t=gdtesttesttesttesttest12&s=http://127.0.0.1:8799&c=' + code); await p.waitForTimeout(1500);
    if (await p.isVisible('#g-intro')) await p.click('#g-start'); if (await p.isVisible('#g-loc')) { await p.check('#g-agree'); await p.click('#g-allow'); await p.waitForTimeout(800); }
    if (await p.isVisible('#g-pin')) { await p.evaluate(() => { var e = document.getElementById('g-un'); if (e) e.value = 'u' + String(cfg.c || 'x').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12); }); await p.fill('#g-p1', pin); if (await p.isVisible('#g-p2')) await p.fill('#g-p2', pin); await p.click('#g-ok'); await p.waitForTimeout(2000); }
    await p.evaluate(() => { window.__t = []; var _t = toast; toast = function (m, bad) { __t.push((bad ? 'RED ' : '') + m); _t(m, bad); }; }); return p; };
  const tab = async (p, t) => { await p.click('.tabs button[data-p="' + t + '"]'); await p.waitForTimeout(400); };
  const closeCards = async p => { for (let k = 0; k < 6 && await p.isVisible('#dcard'); k++) { await p.locator('#dc-in .btn').first().click(); await p.waitForTimeout(150); } };
  const people = async p => { await closeCards(p); await tab(p, 'people'); await p.click('#grp-chips button[data-g="people"]'); await p.waitForTimeout(600); };

  await up('fieldcodeA', 'bbbbbbb1-clean-rec', 2); for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 500)); const L = (await call('fieldcodeA', 'GET', '/api/captures')).j.list || []; if ((L.find(x => x.id === 'bbbbbbb1-clean-rec') || {}).status === 'done') break; }   // sent before the PIN is set
  const PA = await mk('fieldcodeA', '1111'), A = await mk('admin2code', '3333');
  // ---------------- freeze from the officer's phone
  await G('freeze from phone', async () => {
    await people(A); const row = A.locator('#people > .person:has(b:text-is("Post A"))');
    await row.locator('button', { hasText: 'Freeze' }).first().click(); await A.waitForTimeout(200);
    T('freeze form opens with a time choice and a reason', await row.locator('.frzask').isVisible() && await row.locator('.frzask select').count() === 1);
    await row.locator('.frzask select').selectOption('72'); await row.locator('.frzask input').fill('Missed two reports');
    await row.screenshot({ path: SH + '/1-freeze-form.png' });
    await row.locator('button', { hasText: 'Yes, freeze' }).click(); await A.waitForTimeout(1500);
    const pe = (await call('admincode1', 'GET', '/api/people')).j.people.find(x => x.code === 'fieldcodeA');
    T('server has the freeze for 3 days with the reason', pe.frozen && pe.frozen.reason === 'Missed two reports' && Math.abs(pe.frozen.until - Date.now() - 72 * 3600e3) < 120e3, JSON.stringify(pe.frozen));
    const row2 = A.locator('#people > .person:has(b:text-is("Post A"))');
    T('row shows Frozen with an Unfreeze button', /Frozen until/.test(await row2.innerText()) && await row2.locator('button', { hasText: 'Unfreeze' }).isVisible(), await row2.innerText());
    T('Freeze button hidden while frozen', !(await row2.locator('.pbtns button', { hasText: /^Freeze$/ }).isVisible()));
    await row2.screenshot({ path: SH + '/2-frozen-row.png' });
    const off = A.locator('#people > .person:has(b:text-is("Maj Ali"))'); T('officer has no Freeze for himself', await off.locator('.pbtns button', { hasText: /^Freeze$/ }).count() === 0 || !(await off.locator('.pbtns button', { hasText: /^Freeze$/ }).isVisible()));
  });
  // ---------------- the frozen phone
  await G('frozen phone', async () => {
    await PA.evaluate(() => { S.server = null; S.finding = null; return findServer(); }); await PA.waitForTimeout(1500);
    T('frozen phone shows the frozen screen', await PA.isVisible('#g-frz'));
    const t = await PA.innerText('#g-frz'); T('it says who, why and until when', /Frozen by Maj Ali/.test(t) && /Missed two reports/.test(t) && /opens again by itself on/.test(t), t);
    await PA.screenshot({ path: SH + '/3-frozen-phone.png' });
    await A.locator('#people > .person:has(b:text-is("Post A"))').locator('button', { hasText: 'Unfreeze' }).click(); await A.waitForTimeout(1200);
    await PA.click('#gf-check'); await PA.waitForTimeout(1500);
    T('after Unfreeze and Check again, the app opens', !(await PA.isVisible('#g-frz')) && await PA.isHidden('#gate'));
    T('he is told it is open again', (await PA.evaluate(() => __t.join(' | '))).includes('open again'));
  });
  // ---------------- recording on the scan screen
  await G('record on scan screen', async () => {
    await closeCards(PA); await tab(PA, 'scan');
    T('scan screen offers voice note and video', await PA.isVisible('#b-rec-a') && await PA.isVisible('#b-rec-v'));
    await PA.click('#b-rec-a'); await PA.waitForTimeout(400); T('recorder opens', await PA.isVisible('.rsheet'));
    await PA.screenshot({ path: SH + '/4-recorder-voice.png' });
    await PA.locator('.rsheet button', { hasText: 'Start recording' }).click(); await PA.waitForTimeout(2600);
    T('timer runs while recording', /0:0[1-3] \/ 3:00/.test(await PA.innerText('.rtime')), await PA.innerText('.rtime'));
    await PA.screenshot({ path: SH + '/5-recording.png' });
    await PA.locator('.rsheet button', { hasText: 'Stop' }).click(); await PA.waitForTimeout(800);
    T('take can be played back before attaching', await PA.locator('.rsheet audio').count() === 1 && await PA.locator('.rsheet button', { hasText: 'Attach to case' }).isVisible());
    await PA.screenshot({ path: SH + '/6-take.png' });
    await PA.locator('.rsheet button', { hasText: 'Attach to case' }).click(); await PA.waitForTimeout(300);
    T('sheet closes and microphone is let go', !(await PA.isVisible('.rsheet')) && await PA.evaluate(() => !document.body.classList.contains('noscroll')));
    T('scan screen lists the voice note', /Voice note · 0:0[23]/.test(await PA.innerText('#scan-recl')), await PA.innerText('#scan-recl'));
    // video too, then send the case with both
    await PA.click('#b-rec-v'); await PA.waitForTimeout(1200); T('video preview is live', await PA.evaluate(() => { var v = document.querySelector('.rsheet video'); return !!(v && v.srcObject); }));
    await PA.locator('.rsheet button', { hasText: 'Start recording' }).click(); await PA.waitForTimeout(2200); await PA.locator('.rsheet button', { hasText: 'Stop' }).click(); await PA.waitForTimeout(800);
    await PA.screenshot({ path: SH + '/7-video-take.png' });
    await PA.locator('.rsheet button', { hasText: 'Attach to case' }).click(); await PA.waitForTimeout(300);
    await PA.setInputFiles('#f-files', [S + '/sharp.jpg', S + '/sharp2.jpg']); await PA.waitForTimeout(2500);
    await PA.screenshot({ path: SH + '/8-scan-with-recordings.png', fullPage: true });
    await PA.click('#b-send'); let L = []; for (let i = 0; i < 40; i++) { await PA.waitForTimeout(700); L = (await call('admincode1', 'GET', '/api/captures')).j.list || []; const c = L.find(x => x.byName === 'Post A' && (x.media || []).length === 2); if (c) break; }
    const c = L.find(x => x.byName === 'Post A' && (x.media || []).length === 2);
    T('case reaches the server with both recordings', !!c, JSON.stringify(L.map(x => [x.id, (x.media || []).length])));
    T('recording store on the phone is empty again', await PA.evaluate(() => mqAll().then(a => a.length)) === 0);
    if (c) { const kinds = c.media.map(x => x.kind).sort().join(','); T('one voice note and one video', kinds === 'audio,video', kinds); T('lengths recorded', c.media.every(x => x.secs >= 1 && x.secs <= 4), JSON.stringify(c.media)); }
  });
  // ---------------- recording on an existing case; officer plays it
  await G('record on a case, officer plays', async () => {
    await closeCards(PA); await tab(PA, 'files'); await PA.evaluate(() => { S.ver = ''; return refresh().then(() => { S.open = 'bbbbbbb1-clean-rec'; S.filesSig = ''; drawFiles(); }); }); await PA.waitForTimeout(400);
    const sc = 'details.case[data-id="bbbbbbb1-clean-rec"] .body';
    T('open case has an "Add more to this case" section', /ADD MORE TO THIS CASE/i.test(await PA.innerText(sc)), (await PA.innerText(sc)).slice(0, 600));
    if (!(await PA.locator(sc + ' button', { hasText: 'Record video' }).count())) console.log('DEBUG', await PA.innerText(sc), await PA.evaluate(() => JSON.stringify(S.mq)));
    await closeCards(PA);   /* an order card may have popped up over the case */
    await PA.locator(sc + ' button', { hasText: 'Record video' }).click(); await PA.waitForTimeout(1200);
    await PA.locator('.rsheet button', { hasText: 'Start recording' }).click(); await PA.waitForTimeout(2200); await PA.locator('.rsheet button', { hasText: 'Stop' }).click(); await PA.waitForTimeout(800);
    await PA.locator('.rsheet button', { hasText: 'Attach to case' }).click();
    let c = null; for (let i = 0; i < 30; i++) { await PA.waitForTimeout(600); c = ((await call('admincode1', 'GET', '/api/captures')).j.list || []).find(x => x.id === 'bbbbbbb1-clean-rec'); if (c && (c.media || []).length) break; }
    T('video uploads to the case by itself', c && c.media.length === 1 && c.media[0].kind === 'video', c && JSON.stringify(c.media));
    await PA.waitForTimeout(5500); await PA.evaluate(() => { S.filesSig = ''; drawFiles(); }); await PA.waitForTimeout(300);
    T('post sees it on the case with a Play button', await PA.locator(sc + ' .recrow button', { hasText: 'Play' }).count() === 1, await PA.innerText(sc));
    await PA.locator(sc + ' .recs').screenshot({ path: SH + '/9-case-recordings-post.png' });
    // officer plays it
    await closeCards(A); await tab(A, 'files'); await A.evaluate(() => { S.ver = ''; return refresh().then(() => { S.open = 'bbbbbbb1-clean-rec'; S.filesSig = ''; drawFiles(); }); }); await A.waitForTimeout(400);
    await A.locator(sc + ' .recrow button', { hasText: 'Play' }).click(); await A.waitForTimeout(2500);
    const st = await A.evaluate(s => { const v = document.querySelector(s + ' .recrow video'); return v ? { rs: v.readyState, d: v.duration, err: v.error && v.error.code } : null; }, sc);
    T('officer\'s phone plays the video from the server', st && st.rs >= 1 && !st.err && st.d > 0, JSON.stringify(st));
    await A.locator(sc + ' .recs').screenshot({ path: SH + '/10-case-recordings-officer.png' });
    const keep = await A.evaluate(s => { const v = document.querySelector(s + ' .recrow video'); v.loop = true; v.muted = true; return v.play().then(() => { window.__v = v; return true; }).catch(e => String(e)); }, sc); await A.waitForTimeout(300);
    await A.evaluate(() => { S.list = S.list.map(c => Object.assign({}, c, { __x: Date.now() })); S.filesSig = ''; drawFiles(); }); await A.waitForTimeout(3500);
    await A.evaluate(() => { S.filesSig = ''; drawFiles(); }); await A.waitForTimeout(300);
    T('a playing video is not interrupted when the list refreshes', keep === true && await A.evaluate(s => { const v = document.querySelector(s + ' .recrow video'); return !!v && v === window.__v && !v.paused && document.contains(v); }, sc), keep);
    await A.evaluate(() => { window.__v.pause(); }); await A.evaluate(() => { S.filesSig = ''; drawFiles(); }); await A.waitForTimeout(300);
    T('after pausing, the list refreshes and the same player stays in the case', await A.evaluate(s => document.querySelector(s + ' .recrow video') === window.__v, sc));
  });
  // ---------------- a post adds a forgotten photo; the officer is shown it and has the case checked again
  await G('add photo to a sent case', async () => {
    const sc = 'details.case[data-id="bbbbbbb1-clean-rec"] .body';
    await closeCards(PA); await tab(PA, 'files'); await PA.evaluate(() => { S.ver = ''; return refresh().then(() => { S.open = 'bbbbbbb1-clean-rec'; S.filesSig = ''; drawFiles(); }); }); await PA.waitForTimeout(400);
    T('post sees "Add more to this case" with Add photos', /ADD MORE TO THIS CASE/i.test(await PA.innerText(sc)) && await PA.locator(sc + ' button', { hasText: 'Add photos' }).isVisible());
    T('post has no Remove on what he sent', await PA.locator(sc + ' .recrow button', { hasText: 'Remove' }).count() === 0);
    await PA.locator(sc + ' .recs input[type=file][accept="image/*"]').setInputFiles([S + '/sharp.jpg']);
    let c = null; for (let i = 0; i < 30; i++) { await PA.waitForTimeout(600); c = ((await call('admincode1', 'GET', '/api/captures')).j.list || []).find(x => x.id === 'bbbbbbb1-clean-rec'); if (c && c.fresh && c.fresh.photo) break; }
    T('photo reaches the case, marked new', c && c.fresh && c.fresh.photo === 1 && c.pages[c.nPages - 1].type === 'added', c && JSON.stringify(c.fresh));
    await PA.locator(sc).screenshot({ path: SH + '/13-post-add-more.png' });
    await closeCards(A); await tab(A, 'files'); await A.evaluate(() => { S.ver = ''; return refresh().then(() => { S.filesSig = ''; drawFiles(); }); }); await A.waitForTimeout(500);
    const tile = A.locator('details.case[data-id="bbbbbbb1-clean-rec"] > summary'); T('officer sees a New uploads badge on the case', /New uploads/i.test(await tile.innerText()), await tile.innerText());
    await A.evaluate(() => { S.open = 'bbbbbbb1-clean-rec'; S.filesSig = ''; drawFiles(); }); await A.waitForTimeout(300);
    const fb = A.locator(sc + ' .freshbox'); T('opened case starts with the new-uploads box', await fb.isVisible() && /Post A added 1 photo and 1 video/.test(await fb.innerText()), await fb.innerText().catch(() => ''));
    await A.evaluate(s => document.querySelectorAll(s + ' details').forEach(d => { d.open = true; }), sc);
    T('added photo is listed as not read yet', /added later by Post A, not read yet/.test(await A.innerText(sc)));
    await fb.screenshot({ path: SH + '/14-officer-new-uploads.png' });
    await fb.locator('button', { hasText: 'Check again with the new uploads' }).click();
    for (let i = 0; i < 40; i++) { await A.waitForTimeout(600); c = ((await call('admincode1', 'GET', '/api/captures')).j.list || []).find(x => x.id === 'bbbbbbb1-clean-rec'); if (c.status === 'done' && !c.fresh) break; }
    T('after the check the photo is read and the box goes', c.status === 'done' && !c.fresh && !c.pages.some(p => p.type === 'added'), JSON.stringify([c.status, c.fresh]));
  });
  // ---------------- burst: a phone told to wait keeps the case and says so
  await G('busy server message', async () => {
    await PA.evaluate(() => { S.busyUntil = Date.now() + 60000; S.busyWhy = 'slow'; S.outbox.push({ id: 'zz-local', takenAt: new Date().toISOString(), pages: [] }); drawConn(); });
    const t = await PA.innerText('#conn'); T('top bar says many cases were sent and they go by themselves', /Many cases sent quickly\. 1 waiting\. They go by themselves\./.test(t), t);
    await PA.evaluate(() => { S.outbox = S.outbox.filter(x => x.id !== 'zz-local'); S.busyUntil = 0; drawConn(); });
  });
  // ---------------- Operations Room
  await G('operations room', async () => {
    const cfg = JSON.parse(fs.readFileSync(S + '/srv/data/config.json', 'utf8')); const ctx = await b.newContext({ viewport: { width: 1360, height: 860 } }); const p = await ctx.newPage(); p.setDefaultTimeout(6000);
    p.on('pageerror', e => fail.push('JS ERROR (room): ' + String(e).slice(0, 200)));
    await p.goto(B + '/control?k=' + cfg.controlKey); await p.waitForTimeout(1200);
    if (await p.isVisible('#lock')) { await p.fill('#l-un', 'x'); await p.fill('#l-pin', '0000'); await p.click('#lf button'); await p.waitForTimeout(2000); }
    T('signed in to the Operations Room', !(await p.isVisible('#lock')));
    await p.click('[data-p="people"]').catch(() => {}); await p.waitForTimeout(1200);
    const row = p.locator('#people .it', { hasText: 'Post B' }); T('Operations Room has Freeze on a member', await row.locator('select[aria-label^="Freeze"]').count() === 1);
    await row.locator('select[aria-label^="Freeze"]').selectOption('24'); await p.waitForTimeout(200);
    T('choosing a time shows reason and Freeze', await row.locator('input[aria-label="Reason for freezing"]').isVisible() && await row.locator('button', { hasText: 'Freeze' }).isVisible());
    await row.locator('input[aria-label="Reason for freezing"]').fill('Phone lost'); const fb = row.locator('button', { hasText: 'Freeze' }); await fb.click(); T('asks to confirm', /Sure\?/.test(await fb.innerText())); await fb.click(); await p.waitForTimeout(1800);
    const rowB = p.locator('#people .it', { hasText: 'Post B' }); T('shows Frozen chip and Unfreeze', /Frozen until/.test(await rowB.innerText()) && await rowB.locator('button', { hasText: 'Unfreeze' }).isVisible(), await rowB.innerText());
    await p.screenshot({ path: SH + '/11-room-people.png' });
    T('Post B is frozen on the server', (await call('fieldcodeB', 'GET', '/api/ping')).s === 423);
    await rowB.locator('button', { hasText: 'Unfreeze' }).click(); await p.waitForTimeout(1500); T('Unfreeze works', (await call('fieldcodeB', 'GET', '/api/ping')).s === 200);
    await p.click('[data-p="cases"]'); await p.waitForTimeout(1000); await p.evaluate(() => openCase('bbbbbbb1-clean-rec')); await p.waitForTimeout(800);
    T('case drawer lists the recording', /Voice notes and video/i.test(await p.innerText('#d-in')));
    await p.locator('#d-in button', { hasText: 'Play' }).first().click(); await p.waitForTimeout(2000);
    T('drawer plays it', await p.evaluate(() => { const v = document.querySelector('#d-in video, #d-in audio'); return !!(v && v.src && !v.error); }));
    await p.screenshot({ path: SH + '/12-room-drawer.png' });
    await call('fieldcodeB', 'POST', '/api/capture', { id: 'ccccccc1-clean-more', takenAt: new Date().toISOString(), location: 'Post Creek', gps: { lat: 24.9, lon: 67.1, acc: 9 }, pages: [{ view: jpg, top: jpg, ph: 'cccccccc00000000' }] });
    for (let i = 0; i < 30; i++) { await p.waitForTimeout(500); const c = ((await call('admincode1', 'GET', '/api/captures')).j.list || []).find(x => x.id === 'ccccccc1-clean-more'); if (c && c.status === 'done') break; }
    T('post adds a photo by API', (await call('fieldcodeB', 'POST', '/api/more/ccccccc1-clean-more', { k: 'roomphoto001', view: jpg, top: jpg, thumb: jpg })).s === 200);
    await p.click('[data-p="cases"]'); await p.waitForTimeout(3500); await p.evaluate(() => { sigs = {}; load(); }); await p.waitForTimeout(1500);
    T('cases table shows New uploads', /New uploads/.test(await p.locator('#all tr', { hasText: 'Post Creek' }).first().innerText()), await p.locator('#all tr', { hasText: 'Post Creek' }).first().innerText());
    await p.evaluate(() => openCase('ccccccc1-clean-more')); await p.waitForTimeout(800);
    T('drawer shows the new-uploads box', /New uploads: Post B added 1 photo/.test(await p.innerText('#d-in')));
    await p.screenshot({ path: SH + '/15-room-new-uploads.png' });
    await p.locator('#d-in button', { hasText: 'Mark as seen' }).click(); await p.waitForTimeout(1500);
    T('Mark as seen clears it', !((await call('admincode1', 'GET', '/api/captures')).j.list || []).find(x => x.id === 'ccccccc1-clean-more').fresh);
  });
  T('phones talk to the server only in sealed form (no code, no path, no photo in the open)', OPEN.length === 0, OPEN.slice(0, 5).join(' | '));
  await b.close(); console.log('NEW UI TESTS PASSED ' + pass + '   FAILED ' + fail.length); fail.forEach(f => console.log(' X ' + f)); process.exit(fail.length ? 1 : 0);
})();
