// Rules about records. NODEV=1 bash start.sh $S; node t_api.js; node t_rules.js $S
const fs=require('fs');const S=process.argv[2];let pass=0,fail=[];const T=(n,c,d)=>{if(c)pass++;else fail.push(n+(d!==undefined?' ['+JSON.stringify(d).slice(0,200)+']':''));};const B='http://127.0.0.1:8799';
const call=async(code,m,p,b)=>{const r=await fetch(B+p,{method:m,headers:{'x-code':code,'content-type':'application/json'},body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return {s:r.status,j};};
(async()=>{const list=async()=>(await call('admincode1','GET','/api/captures')).j.list;let L=await list();
 const dec=L.filter(c=>c.status==='done'&&(c.order||c.decision||c.release));T('there are decided cases to test with',dec.length>=2,L.map(c=>[c.id,!!c.order,!!c.release]));
 const fin=dec.find(c=>c.release||(c.order&&c.order.order!=='docs')),post=fin.byName==='Post A'?'fieldcodeA':'fieldcodeB';
 const good=[{what:'Walnut kernels',pkgs:5,unit:'Cartons',each:10,eachUnit:'kg'}];
 let r=await call(post,'POST','/api/found/'+fin.id,{items:good});T('After a final decision the post cannot change goods found',r.s===403&&(r.j.error==='decided'||r.j.error==='locked'),[r.s,r.j]);
 r=await call(post,'POST','/api/driver/'+fin.id,{name:'First Driver',idn:'4210112345671'});const had=r.s===403;T('The post may still add a driver when none was recorded (or is refused if one was)',r.s===200||r.s===403,[r.s,r.j]);r=await call(post,'POST','/api/driver/'+fin.id,{name:'Someone Else',idn:'4210199999991'});T('...but cannot change the driver once recorded',r.s===403,[r.s,r.j]);
 const unl=dec.find(c=>!c.release)||fin;r=await call('admincode1','POST','/api/found/'+unl.id,{items:good});const r2=await call('admincode1','POST','/api/found/'+unl.id,{items:[{what:'Cloth (fabric)',pkgs:2,unit:'Bales'}]});
 const meta=JSON.parse(fs.readFileSync(S+'/srv/data/captures/'+unl.id+'/meta.json'));T('An officer can still correct it, and the earlier entry is kept',r.s===200&&r2.s===200&&(meta.foundHist||[]).length>=1&&meta.foundHist[meta.foundHist.length-1].replacedBy,[r.s,r2.s,(meta.foundHist||[]).length]);
 r=await call('admin2code','DELETE','/api/capture/'+unl.id);T('An officer cannot delete a decided case',r.s===403,[r.s,r.j]);r=await call('fieldcodeA','DELETE','/api/capture/'+unl.id);T('A post cannot delete a case',r.s===403,r.s);
 L=await list();T('The case is still there',L.some(c=>c.id===unl.id));
 r=await call('admincode1','DELETE','/api/capture/'+unl.id);L=await list();const bin=fs.existsSync(S+'/srv/data/deleted')?fs.readdirSync(S+'/srv/data/deleted'):[];
 T('The Owner can delete it; it leaves the list',r.s===200&&!L.some(c=>c.id===unl.id));T('...and its folder is set aside, not destroyed',bin.some(d=>d.startsWith(unl.id))&&fs.existsSync(S+'/srv/data/deleted/'+bin.find(d=>d.startsWith(unl.id))+'/meta.json'),bin);
 const log=fs.readFileSync(S+'/srv/log.txt','utf8');T('The log names who deleted and who sent it, without any link code',/deleted case/.test(log)&&!/fieldcode[AB]|admin2code|admincode1/.test(log.split('\n').filter(l=>/deleted case/.test(l)).join('\n')));
 T('The start-up text no longer prints the owner link',!/[?&]c=admincode1/.test(log));
 console.log('\nRULES TESTS PASSED '+pass+'   FAILED '+fail.length);fail.forEach(x=>console.log(' X',x));})().catch(e=>console.log('CRASH',String(e.stack||e).slice(0,400)));
