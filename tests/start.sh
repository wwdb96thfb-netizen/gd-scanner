S=$1
for p in $(pgrep -x node); do kill $p 2>/dev/null; done; sleep 1
rm -rf $S/srv/data/captures; mkdir -p $S/srv/data/captures
echo '{"topic":"gdtesttesttesttesttest12","adminCode":"admincode1","joinKey":"joinkeyjoinkeyjoinke","people":[{"name":"Maj Ali","code":"admin2code","role":"admin"},{"name":"Post A","code":"fieldcodeA","role":"field"},{"name":"Post B","code":"fieldcodeB","role":"field"}]}' > $S/srv/data/config.json
echo '["Post North","Post West","Post South","Post East","Post Bay","Post Creek","Post Basti","Post Shrine","Bn HQ"]' > $S/srv/data/posts.json
[ -f $S/rules.key ] && cp $S/rules.key $S/srv/data/rules.key   # the checking rules are sealed; the test server needs the key
cd $S/srv; GD_SEAL_LOCK=${SEALLOCK:-0} GD_NO_DEVLOCK=$NODEV GD_NO_TUNNEL=1 GD_NO_UPDATE=1 GD_NO_OPEN=1 GD_PORT=8799 CLAUDE_BIN=$S/srv/fake nohup node server.js > log.txt 2>&1 &
echo $! > $S/srv/pid; sleep 2
