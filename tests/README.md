# Tests for the GD Verification System

These are the automated checks used while building the app. They run against a local copy of the server with a fake paper-reader (`fake`), never against the real server or real data.

## The checking rules are sealed

`server/checks.js` is published sealed: a small opener plus the locked rules. It opens itself on the server Mac with the Mac's own key,
`data/rules.key`, which is never published. The plain rules (`server/checks.plain.js`) are never published either.
To work on the rules: copy the key from the Mac, `node tests/rules.js open <keyfile>`, change `server/checks.plain.js`, then
`node tests/rules.js seal <keyfile>` and publish `server/checks.js`. For the tests, put the key at `$S/rules.key`.
The list of posts is kept on the Mac only, in `data/posts.json`.

## Setup (once per session)

```
S=/some/scratch/dir            # any empty working folder
mkdir -p $S/srv && cp tests/* $S/ && cp tests/fake $S/srv/fake && chmod +x $S/srv/fake
cp server/server.js server/checks.js $S/srv/     # repeat after every server change (and put the rules key at $S/rules.key)
cp $S/sharp.jpg $S/sharp2.jpg
(cd <repo> && python3 -m http.server 8798 &)     # serves index.html for the screen tests
```

Playwright with Chromium is needed for the screen tests (`NODE_PATH=$(npm root -g)`, `executablePath: /opt/pw-browsers/chromium`).

`start.sh $S` (sealed-only lock off unless `SEALLOCK=1`) wipes the test data and starts the server on port 8799. `NODEV=1` turns the one-phone lock off; without it the lock is on. `GD_LINK_LIFE_MS=3000` shortens link life for the expiry tests.

Test accounts: owner `admincode1`, officer `admin2code` (Maj Ali), posts `fieldcodeA`, `fieldcodeB`.

## Suites

| Suite | Start the server with | Run |
|---|---|---|
| Server API (116) | `NODEV=1 bash start.sh $S` | `node t_api.js` (from `$S`) |
| Phone screens (67) | same server, straight after t_api | copy `t_ui.js` into the repo as `_t.js`; `GD_NO_DEVLOCK=1 node _t.js $S` |
| Every button and its outcome (273) | `bash runbtn.sh $S` (starts its own server; takes about 8 minutes) | |
| One-phone lock, links, approval (API) | `GD_LINK_LIFE_MS=3000 bash start.sh $S` | `node t_lock.js` |
| Lock, username, fingerprint, forgot sign-in (screens) | `bash start.sh $S` | copy `t_lockui.js` into the repo as `_l.js`; `node _l.js $S` |
| Move to another Mac | `NODEV=1 bash start.sh $S`, then `node t_api.js` | `node t_move.js $S` |

| Control room on the Mac (API, 48) | `bash start.sh $S` (lock ON, fresh) | `node t_ctl.js $S` |
| Newer phone flows: fingerprint set-up, owner moves phone, reset, phone change (30) | `bash start.sh $S` | copy `t_phone2.js` into the repo as `_p.js`; `node _p.js $S` |
| Control room screens (69) | `NODEV=1 bash start.sh $S`, then `node t_api.js` | copy `t_room.js` into the repo as `_r.js`; `node _r.js $S` |
| Rules about records: who may delete or change a decided case (12) | `NODEV=1 bash start.sh $S`, then `node t_api.js` | `node t_rules.js $S` |
| Freeze, upload bursts, voice notes and video, adding to a sent case (API, 80) | `GD_FRESH_WAIT=1500 GD_RATE_N=4 GD_HEAVY_MAX=2 GD_ALERT_MAX=2 NODEV=1 bash start.sh $S` | `node t_new.js $S` |
| Freeze, recorder, playback, adding to a sent case, Operations Room (screens, 46; fake camera and microphone) | `GD_FRESH_WAIT=1500 NODEV=1 bash start.sh $S` | copy `t_newui.js` into the repo as `_n.js`; `node _n.js $S` (pictures in `$S/shots-new`) |
| Sealed requests: end-to-end encryption, replay, clock, lock (API, 20) | `SEALLOCK=1 NODEV=1 bash start.sh $S` | `node t_seal.js $S` |
| Security probe (prints what each role can reach) | `bash start.sh $S` | `node probe.js $S` |

Never commit the `_*.js` copies.
