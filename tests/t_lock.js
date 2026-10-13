const B='http://127.0.0.1:8799';let pass=0,fail=[];const T=(n,c,d)=>{if(c)pass++;else fail.push(n+(d!==undefined?'  ['+String(typeof d==='string'?d:JSON.stringify(d)).slice(0,220)+']':''));};
const dev=c=>(c.repeat(32)).slice(0,32);
const call=async(code,m,p,b,d,extra)=>{const r=await fetch(B+p+(p.includes('?')?'&':'?')+(d?'dev='+d:'x=1'),{method:m,headers:Object.assign({'x-code':code,'content-type':'application/json'},extra||{}),body:b?JSON.stringify(b):undefined});return {s:r.status,j:await r.json().catch(()=>({}))};};
const OD=dev('a'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 T('Owner signs in on his phone with no approval needed',(await call('admincode1','GET','/api/ping',null,OD)).s===200);
 const O=(m,p,b)=>call('admincode1',m,p,b,OD);const people=async()=>(await O('GET','/api/people')).j;
 // --- a link is for one phone, approved by an officer
 await O('POST','/api/people',{name:'New Guy',role:'field'});let P=(await people()).people.find(x=>x.name==='New Guy');const c=P.code;
 T('A new link is marked "not opened yet"',P.dev===false&&P.devPending===false&&P.linkDead===false&&P.linkLeft>=0,P);
 T('The link does nothing without a phone identity',(await call(c,'GET','/api/ping')).j.error==='device');
 const r1=await call(c,'GET','/api/ping',null,dev('b'));T('First phone to open the link must wait for approval',r1.s===401&&r1.j.error==='approve',r1);
 P=(await people()).people.find(x=>x.code===c);T('Officers see that a phone is waiting',P.devPending===true&&P.dev===false);
 T('Officers are told by a notice',((await O('GET','/api/captures')).j.notices||[]).some(n=>/New phone to approve: New Guy/.test(n.title)&&n.go==='people'));
 T('A second phone trying the same link is refused, even while the first waits',(await call(c,'GET','/api/ping',null,dev('c'))).j.error==='device');
 T('Still waiting after the other phone tried',(await call(c,'GET','/api/ping',null,dev('b'))).j.error==='approve');
 T('Approve this phone',(await O('POST','/api/people/'+c+'/phone',{action:'approve'})).s===200);
 T('After approval the first phone gets in',(await call(c,'GET','/api/ping',null,dev('b'))).s===200);
 T('...and any other phone is refused, straight away and for good',(await call(c,'GET','/api/ping',null,dev('c'))).j.error==='device'&&(await call(c,'GET','/api/ping',null,dev('b'))).s===200);
 T('A link in use cannot be re-issued without "Allow new phone"',(await O('POST','/api/people/'+c+'/link')).s===400);
 // --- refuse
 await O('POST','/api/people',{name:'Wrong Phone',role:'field'});const c2=(await people()).people.find(x=>x.name==='Wrong Phone').code;await call(c2,'GET','/api/ping',null,dev('d'));
 T('Refuse the waiting phone',(await O('POST','/api/people/'+c2+'/phone',{action:'refuse'})).s===200);
 T('A refused phone finds the link dead',(await call(c2,'GET','/api/ping',null,dev('d'))).j.error==='expired');P=(await people()).people.find(x=>x.code===c2);T('...and officers see the link as expired',P.linkDead===true&&P.devPending===false);
 T('Sending the link again makes it live',(await O('POST','/api/people/'+c2+'/link')).s===200&&(await call(c2,'GET','/api/ping',null,dev('e'))).j.error==='approve');
 // --- 24 hour life (3 seconds in this test)
 await O('POST','/api/people',{name:'Slow Guy',role:'field'});const c3=(await people()).people.find(x=>x.name==='Slow Guy').code;await sleep(3400);
 T('A link nobody opened in time has expired',(await call(c3,'GET','/api/ping',null,dev('f'))).j.error==='expired');P=(await people()).people.find(x=>x.code===c3);T('...shown as expired to officers',P.linkDead===true);
 await O('POST','/api/people/'+c3+'/link');T('A fresh link works again',(await call(c3,'GET','/api/ping',null,dev('f'))).j.error==='approve');
 await sleep(3400);T('A phone already waiting does not expire',(await call(c3,'GET','/api/ping',null,dev('f'))).j.error==='approve');
 await O('POST','/api/people/'+c3+'/phone',{action:'approve'});await sleep(3400);T('A link in use never expires',(await call(c3,'GET','/api/ping',null,dev('f'))).s===200);
 await O('DELETE','/api/people/'+c3+'/device');{const r1=await call(c3,'GET','/api/ping',null,dev('1'));T('"Allow new phone" is the approval: the next phone gets past the phone check without a second approval',r1.j.error!=='approve'&&r1.j.error!=='device',r1.j);const r2=await call(c3,'GET','/api/ping',null,dev('2'));T('...but only that one phone: another phone is refused',r2.j.error==='device',r2.j);}
 // --- people added before this update (no link date) still need their phone approved, and never expire
 T('An older account with no link date does not expire but its first phone still needs approval',(await call('fieldcodeB','GET','/api/ping',null,dev('2'))).j.error==='approve');
 // --- join link
 const J=(k,code,name)=>fetch(B+'/api/join',{method:'POST',headers:{'x-join':k,'content-type':'application/json'},body:JSON.stringify({name,role:'field',code})}).then(r=>r.status);
 let pj=await people();const k0=pj.joinKey;T('Join link is on to begin with',!!k0&&pj.joinOff===false);
 await O('POST','/api/joinlink',{action:'off'});pj=await people();T('Turned off: no link is shown and nobody can ask to join',pj.joinKey===''&&pj.joinOff===true&&(await J(k0,'joincode0000000001','Asker One'))===401);
 await O('POST','/api/joinlink',{action:'on'});T('Turned on again: the same link works',(await J(k0,'joincode0000000001','Asker One'))===200);
 await O('POST','/api/joinlink',{action:'renew'});pj=await people();const k1=pj.joinKey;T('New join link: the old one stops, the new one works',k1&&k1!==k0&&(await J(k0,'joincode0000000002','Asker Two'))===401&&(await J(k1,'joincode0000000002','Asker Two'))===200);
 T('Post staff cannot change the join link',(await call(c,'POST','/api/joinlink',{action:'off'},dev('b'))).s===403);
 const rq=(await people()).requests.find(x=>x.name==='Asker Two');await O('POST','/api/requests/'+rq.id,{action:'approve',role:'field'});
 T('Someone approved from a join request is on the phone he asked from: no second approval',(await call('joincode0000000002','GET','/api/ping',null,dev('3'))).s===200&&(await call('joincode0000000002','GET','/api/ping',null,dev('4'))).j.error==='device');
 console.log('\nLOCK TESTS PASSED '+pass+'   FAILED '+fail.length);fail.forEach(x=>console.log(' X',x));})().catch(e=>console.log('CRASHED',e));
