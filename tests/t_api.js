const crypto=require('crypto');const B='http://127.0.0.1:8799';const jpg='data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0xff,0xd9]).toString('base64');
let pass=0,fail=0;const T=(name,cond,info)=>{cond?pass++:fail++;if(!cond)console.log('FAIL',name,info===undefined?'':JSON.stringify(info).slice(0,300));};
const call=async(code,m,p,b,q)=>{const r=await fetch(B+p+(q||''),{method:m,headers:Object.assign({'content-type':'application/json'},code?{'x-code':code}:{}),body:b===undefined?undefined:(typeof b==='string'?b:JSON.stringify(b))});let j=null;try{j=await r.json();}catch(e){}return {s:r.status,j:j||{}};};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const H=(c,p)=>crypto.createHash('sha256').update(c+':'+p).digest('hex');
const list=async(code,q)=>(await call(code,'GET','/api/captures',undefined,q)).j.list||[];
const waitDone=async(code,id,q)=>{for(let i=0;i<40;i++){const c=(await list(code,q)).find(x=>x.id===id);if(c&&c.status==='done')return c;await sleep(300);}return null;};
const up=(code,id,extra,n)=>call(code,'POST','/api/capture',Object.assign({id,takenAt:new Date().toISOString(),location:'Post North',gps:{lat:24.9,lon:67.1,acc:10},pages:Array.from({length:n||3},()=>({view:jpg,top:jpg,ph:'00ff00ff00ff00ff'}))},extra||{}));
(async()=>{
 // --- auth
 T('no code -> 401',(await call(null,'GET','/api/captures')).s===401);
 T('wrong code -> 401',(await call('nope','GET','/api/captures')).s===401);
 T('root page answers',(await fetch(B+'/')).status===200);
 const n=crypto.randomBytes(16).toString('hex'),uid=crypto.createHash('sha256').update('fieldcodeA').digest('hex').slice(0,16);const h=await call(null,'GET','/api/hello?u='+uid+'&n='+n);
 T('hello proof is correct',h.j.proof===crypto.createHmac('sha256','fieldcodeA').update(n).digest('hex'),h);
 T('hello for unknown user -> 404',(await call(null,'GET','/api/hello?u=0000000000000000&n='+n)).s===404);
 // --- join flow
 T('join with wrong key -> 401',(await fetch(B+'/api/join',{method:'POST',headers:{'x-join':'bad','content-type':'application/json'},body:JSON.stringify({name:'X',code:'newpersoncode12345'})})).status===401);
 const jr=await fetch(B+'/api/join',{method:'POST',headers:{'x-join':'joinkeyjoinkeyjoinke','content-type':'application/json'},body:JSON.stringify({name:'New Man',code:'newpersoncode12345',role:'admin'})});T('join request accepted',jr.status===200);
 T('pending person -> 403 pending',(await call('newpersoncode12345','GET','/api/captures')).j.error==='pending');
 let pe=(await call('admincode1','GET','/api/people')).j;T('admin sees the request',pe.requests&&pe.requests.length===1,pe);
 T('post staff cannot list people',(await call('fieldcodeA','GET','/api/people')).s===403);
 T('approve as post staff role',(await call('admin2code','POST','/api/requests/'+pe.requests[0].id,{action:'approve',role:'field'})).s===200);
 T('approved person can now read',(await call('newpersoncode12345','GET','/api/captures')).s===200);
 const add=await call('admincode1','POST','/api/people',{name:'Temp',role:'field'});T('add person',add.s===200&&add.j.person.code);
 T('change role',(await call('admincode1','POST','/api/people/'+add.j.person.code,{role:'admin'})).s===200);
 T('remove person',(await call('admincode1','DELETE','/api/people/'+add.j.person.code)).s===200);T('removed person -> 401',(await call(add.j.person.code,'GET','/api/captures')).s===401);
 // --- PIN
 const pA=H('fieldcodeA','1234');T('set PIN',(await call('fieldcodeA','POST','/api/pin',{pin:pA})).s===200);
 T('without PIN -> 401 pin',(await call('fieldcodeA','GET','/api/captures')).j.error==='pin');
 T('wrong PIN -> 401',(await call('fieldcodeA','GET','/api/captures',undefined,'?pin='+H('fieldcodeA','0000'))).s===401);
 const qA='?pin='+pA;T('right PIN -> 200',(await call('fieldcodeA','GET','/api/captures',undefined,qA)).s===200);
 T('second phone cannot overwrite PIN',(await call('fieldcodeA','POST','/api/pin',{pin:H('fieldcodeA','9999')})).s===401);
 const pA2=H('fieldcodeA','5678');T('change PIN with old one',(await call('fieldcodeA','POST','/api/pin',{pin:pA2},qA)).s===200);const q2='?pin='+pA2;
 await call('newpersoncode12345','POST','/api/pin',{pin:H('newpersoncode12345','4321')});let lk=0;for(let i=0;i<9;i++)lk=(await call('newpersoncode12345','POST','/api/pin',{pin:H('newpersoncode12345','1')})).j.locked;T('PIN locks after repeated wrong tries',lk===true);
 T('garbage PIN rejected as form',(await call('fieldcodeB','POST','/api/pin',{pin:'x'})).s===400);
 T('admin resets PIN',(await call('admincode1','DELETE','/api/people/fieldcodeA/pin')).s===200);T('after reset no PIN needed',(await call('fieldcodeA','GET','/api/captures')).s===200);
 // --- uploads
 T('bad id rejected',(await up('fieldcodeA','BAD ID!')).s>=400);
 T('no pages rejected',(await call('fieldcodeA','POST','/api/capture',{id:'eeeeeeee-0000',pages:[]})).s>=400);
 T('invalid JSON does not crash',(await call('fieldcodeA','POST','/api/capture','{not json')).s>=400);
 T('server alive after bad input',(await call('fieldcodeA','GET','/api/ping')).s===200);
 T('upload critical file',(await up('fieldcodeA','aaaaaaaa-crit')).s===200);
 T('same id twice is harmless',[200,409].includes((await up('fieldcodeA','aaaaaaaa-crit')).s));
 let c=await waitDone('fieldcodeA','aaaaaaaa-crit');T('critical file checked',!!c,c);T('has GPS',c&&c.gps&&c.gps.lat===24.9);T('vehicle read',c&&c.vehicles[0]==='TKA-CRIT',c&&c.vehicles);
 T('result is critical (Sost tax-free in Karachi)',c&&c.flags.some(f=>f.l==='red'&&f.n===34));
 // chunked upload
 const id2='bbbbbbbb-clean';T('have: nothing yet',(await call('fieldcodeB','GET','/api/have/'+id2)).s===200);
 for(let k=0;k<3;k++)T('page '+k,(await call('fieldcodeB','POST','/api/page',{id:id2,n:k,kind:'doc',ph:'1111222233334444',thumb:jpg,view:jpg,top:jpg})).s===200);
 T('other user cannot add to this upload',(await call('fieldcodeA','POST','/api/page',{id:id2,n:3,kind:'doc',view:jpg,top:jpg})).s===403);
 T('page number out of range rejected',(await call('fieldcodeB','POST','/api/page',{id:id2,n:99,view:jpg,top:jpg})).s>=400);
 T('finish chunked upload',(await call('fieldcodeB','POST','/api/capture',{id:id2,nPages:3,takenAt:new Date().toISOString(),location:'Post Creek',found:[{what:'Walnut kernels (shelled)',pkgs:199,unit:'Cartons',each:5,eachUnit:'kg'}]})).s===200);
 let c2=await waitDone('fieldcodeB',id2);T('clean file checked',!!c2);T('clean file not critical',c2&&!c2.flags.some(f=>f.l==='red'),c2&&c2.flags.filter(f=>f.l==='red'));
 T('goods found matched to GD item 2',c2&&c2.flags.some(f=>f.n===43&&f.l==='ok'),c2&&c2.flags.filter(f=>f.n===43));
 // --- visibility
 T('post A sees only own file',(await list('fieldcodeA')).every(x=>x.id==='aaaaaaaa-crit'));
 T('admin sees both',(await list('admin2code')).length===2);
 T('thumb: other post blocked',(await call('fieldcodeA','GET','/api/thumb/'+id2+'/0')).s===404);
 T('thumb: owner allowed',(await fetch(B+'/api/thumb/'+id2+'/0?code=fieldcodeB')).status===200);
 T('photo: admin allowed',(await fetch(B+'/api/photo/'+id2+'/0?code=admin2code')).status===200);
 T('post cannot delete',(await call('fieldcodeA','DELETE','/api/capture/aaaaaaaa-crit')).s===403);
 T('post cannot re-read',(await call('fieldcodeA','POST','/api/retry/aaaaaaaa-crit')).s===403);
 T('post cannot use watchlist',(await call('fieldcodeA','POST','/api/watch',{value:'TKA-CRIT'})).s===403);
 // --- decisions
 T('post cannot decide a critical file',(await call('fieldcodeA','POST','/api/decision/aaaaaaaa-crit',{action:'released'})).j.error==='officer');
 T('post cannot decide an ordinary file either; an officer can',(await call('fieldcodeB','POST','/api/decision/'+id2,{action:'released',remark:'ok'})).s===403&&(await call('admin2code','POST','/api/decision/'+id2,{action:'released',remark:'ok'})).s===200);
 T('post cannot decide another post\'s file',(await call('fieldcodeA','POST','/api/decision/'+id2,{action:'held'})).s===404);
 T('post cannot issue admin decision',(await call('fieldcodeA','POST','/api/order/aaaaaaaa-crit',{order:'release'})).s===403);
 T('bad order rejected',(await call('admin2code','POST','/api/order/aaaaaaaa-crit',{order:'burn'})).s===400);
 T('admin asks for documents',(await call('admin2code','POST','/api/order/aaaaaaaa-crit',{order:'docs',note:'invoice'})).s===200);
 T('admin orders seizure',(await call('admin2code','POST','/api/order/aaaaaaaa-crit',{order:'seize',note:'fake papers'})).s===200);
 c=(await list('fieldcodeA'))[0];T('post sees seizure order + history',c.order.order==='seize'&&c.orders.length===2&&c.decision.action==='seized',c.order);
 T('post confirms',(await call('fieldcodeA','POST','/api/ack/aaaaaaaa-crit',{remark:'done'})).s===200);
 // --- seizure report
 for(const e of ['report','review','case']){T('removed function '+e+' is gone from the server for a post',[403,404].includes((await call('fieldcodeA','POST','/api/'+e+'/aaaaaaaa-crit',{vehicle:'X',result:'confirmed',status:'filed'})).s));T('...and for an officer',(await call('admin2code','POST','/api/'+e+'/aaaaaaaa-crit',{vehicle:'X',result:'confirmed',status:'filed'})).s===404);}
 { // only the Owner manages an Officer; only the Owner makes an Officer
  const o2=(await call('admincode1','POST','/api/people',{name:'Maj Other',role:'admin'})).j.person.code;
  T('officer cannot add an Officer',(await call('admin2code','POST','/api/people',{name:'X Y',role:'admin'})).s===403);T('officer can add Post Staff',(await call('admin2code','POST','/api/people',{name:'Tmp Post',role:'field'})).s===200);
  T('officer cannot promote to Officer',(await call('admin2code','POST','/api/people/fieldcodeA',{role:'admin'})).s===403);T('officer can make someone Bn Staff and back',(await call('admin2code','POST','/api/people/fieldcodeA',{role:'viewer'})).s===200&&(await call('admin2code','POST','/api/people/fieldcodeA',{role:'field'})).s===200);
  T('officer cannot reset another officer PIN',(await call('admin2code','DELETE','/api/people/'+o2+'/pin')).s===403);T('officer cannot release another officer phone',(await call('admin2code','DELETE','/api/people/'+o2+'/device')).s===403);T('officer cannot issue another officer a fresh link',(await call('admin2code','POST','/api/people/'+o2+'/link',{})).s===403);T('officer cannot approve forgot sign-in for an officer',(await call('admin2code','POST','/api/people/'+o2+'/forgot',{action:'approve'})).s===403);
  T('officer can still reset a post PIN',(await call('admin2code','DELETE','/api/people/fieldcodeA/pin')).s===200);
  T('owner can do all of it for an officer',(await call('admincode1','DELETE','/api/people/'+o2+'/pin')).s===200&&(await call('admincode1','DELETE','/api/people/'+o2+'/device')).s===200);
  await call('admincode1','DELETE','/api/people/'+o2);T('officer cannot add a removed Officer back',(await call('admin2code','POST','/api/people/'+o2+'/restore',{})).s===403);T('owner can',(await call('admincode1','POST','/api/people/'+o2+'/restore',{})).s===200);await call('admincode1','DELETE','/api/people/'+o2);await call('admincode1','DELETE','/api/people/'+o2+'/forget');
  const tp=(await call('admincode1','GET','/api/people')).j.people.find(x=>x.name==='Tmp Post');if(tp){await call('admincode1','DELETE','/api/people/'+tp.code);await call('admincode1','DELETE','/api/people/'+tp.code+'/forget');}
 }
 // --- release lock
 T('upload 2nd critical',(await up('fieldcodeA','cccccccc-crit-two')).s===200);await waitDone('fieldcodeA','cccccccc-crit-two');
 T('admin2 orders release',(await call('admin2code','POST','/api/order/cccccccc-crit-two',{order:'release',note:'verified'})).s===200);
 for(const [nm,cc,m,p,b] of [['change order','admin2code','POST','/api/order/cccccccc-crit-two',{order:'seize'}],['change decision','admin2code','POST','/api/decision/cccccccc-crit-two',{action:'seized'}],['edit goods','admin2code','POST','/api/found/cccccccc-crit-two',{what:'Tea',pkgs:1}],['delete','admin2code','DELETE','/api/capture/cccccccc-crit-two'],['re-read','admin2code','POST','/api/retry/cccccccc-crit-two'],['post edits goods','fieldcodeA','POST','/api/found/cccccccc-crit-two',{what:'Tea',pkgs:1}]])
   T('locked: '+nm,(await call(cc,m,p,b)).j.error==='locked');
 T('post can still confirm release carried out',(await call('fieldcodeA','POST','/api/ack/cccccccc-crit-two',{})).s===200);
 c=(await list('admin2code')).find(x=>x.id==='cccccccc-crit-two');T('release names the admin',c.release&&c.release.byName==='Maj Ali',c.release);
 T('Owner can change it',(await call('admincode1','POST','/api/order/cccccccc-crit-two',{order:'seize',note:'on review'})).s===200);
 c=(await list('admincode1')).find(x=>x.id==='cccccccc-crit-two');T('release record removed by Owner',!c.release&&c.decision.action==='seized');
 // --- same GD across files, cumulative goods
 c=(await list('admincode1'));T('same GD in two files flagged',c.filter(x=>/crit/.test(x.id)).every(x=>x.flags.some(f=>f.n===23)));
 T('vehicle history empty for different vehicles',c.every(x=>Array.isArray(x.history)));
 await call('admincode1','POST','/api/found/aaaaaaaa-crit',{items:[{what:'Walnut kernels (shelled)',pkgs:600,unit:'Cartons',each:5,eachUnit:'kg'}]});
 await call('admincode1','POST','/api/found/cccccccc-crit-two',{items:[{what:'Walnut kernels (shelled)',pkgs:500,unit:'Cartons',each:5,eachUnit:'kg'},{what:'Iranian diesel',pkgs:2,unit:'Barrels',each:200,eachUnit:'L'}]});
 c=(await list('admincode1')).find(x=>x.id==='cccccccc-crit-two');T('GD used beyond its quantity flagged (3000+2500 > 5000)',c.flags.some(f=>f.n===44&&f.l==='red'),c.flags.filter(f=>f.n>=43));T('goods not on GD flagged',c.flags.some(f=>f.n===43&&f.l==='red'&&/diesel/i.test(f.t)));
 // --- watchlist
 T('watch too short rejected',(await call('admincode1','POST','/api/watch',{value:'ab'})).s===400);
 T('watch added',(await call('admin2code','POST','/api/watch',{value:'tka crit',note:'known'})).s===200);
 c=(await list('admincode1'));T('watchlist hit on vehicle',c.some(x=>x.flags.some(f=>f.n===41)));
 const ad=(await call('admincode1','GET','/api/admin')).j;const manual=ad.watch.filter(w=>!w.auto);T('admin info',manual.length===1&&ad.vapid&&ad.usage.pages>0,ad);T('seized vehicles were added to the watchlist automatically',ad.watch.filter(w=>w.auto).length>=1,ad.watch);
 T('watch removed',(await call('admincode1','DELETE','/api/watch/'+manual[0].id)).s===200);T('manual watch flag gone',!(await list('admincode1')).some(x=>x.flags.some(f=>f.n===41&&f.l==='red')));
 // --- owner name, push validation
 {const r=await call('admin2code','POST','/api/me',{name:'Hacker'});T('non-owner name change is only a request until approved',r.s===200&&r.j.pending===true&&r.j.name!=='Hacker'&&(await call('admincode1','GET','/api/captures')).j.name!=='Hacker');await call('admincode1','POST','/api/namereq/admin2code',{action:'reject'});}
 T('owner sets name',(await call('admincode1','POST','/api/me',{name:'Lt Col Test'})).j.name==='Lt Col Test');T('name is used',(await call('admincode1','GET','/api/ping')).j.name==='Lt Col Test');
 T('push: bad endpoint rejected',(await call('admincode1','POST','/api/push',{sub:{endpoint:'https://evil.example/x',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}}})).s===400);
 T('push: valid shape accepted',(await call('fieldcodeA','POST','/api/push',{sub:{endpoint:'https://fcm.googleapis.com/fcm/send/abc',keys:{p256dh:'B'+'a'.repeat(86),auth:'b'.repeat(22)}}})).s===200);
 // --- reading failure and delete
 T('upload unreadable',(await up('fieldcodeB','dddddddd-crash')).s===200);const cr=await waitDone('fieldcodeB','dddddddd-crash');T('unreadable file finishes, not stuck',!!cr,cr);
 T('admin deletes a file',(await call('admin2code','DELETE','/api/capture/dddddddd-crash')).s===200);T('file gone',!(await list('admincode1')).some(x=>x.id==='dddddddd-crash'));
 T('unknown route -> 404',(await call('admincode1','GET','/api/nothing')).s===404);
 // --- conditional refresh
 const v=(await call('admincode1','GET','/api/captures')).j.ver;T('unchanged list returns "same"',(await call('admincode1','GET','/api/captures',undefined,'?v='+encodeURIComponent(v))).j.same===true);
 // --- burst
 const t0=Date.now();const rs=await Promise.all(Array.from({length:60},()=>call('admincode1','GET','/api/captures')));T('60 requests at once all answered',rs.every(r=>r.s===200));
 console.log('\nAPI tests passed:',pass,' failed:',fail,' (60 parallel requests took',Date.now()-t0,'ms)');
})().catch(e=>console.log('TEST SCRIPT ERROR',e));
