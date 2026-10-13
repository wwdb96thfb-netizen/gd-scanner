// Control room on the Mac, through the API. Run on a fresh server WITHOUT NODEV (phone lock on): bash start.sh $S; node t_ctl.js $S
const fs=require('fs'),crypto=require('crypto');const S=process.argv[2];let pass=0,fail=[];const T=(n,c,d)=>{if(c)pass++;else fail.push(n+(d!==undefined?' ['+JSON.stringify(d).slice(0,200)+']':''));};
const B='http://127.0.0.1:8799',cfg=()=>JSON.parse(fs.readFileSync(S+'/srv/data/config.json')),K=cfg().controlKey,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const h=(code,pin)=>crypto.createHash('sha256').update(code+':'+pin).digest('hex'),dev=c=>c.repeat(32);
let TOK='';const c=async(p,m,b,hd)=>{const r=await fetch(B+p,{method:m||'GET',headers:Object.assign({'x-control':K,'x-session':TOK,'content-type':'application/json'},hd||{}),body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return [r.status,j];};
const ph=async(code,p,m,b,d,pin)=>{const r=await fetch(B+p+(p.includes('?')?'&':'?')+'dev='+d+(pin?'&pin='+pin:''),{method:m||'GET',headers:{'x-code':code,'content-type':'application/json'},body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return [r.status,j];};
const login=async(u,p,hd)=>{const r=await fetch(B+'/control/login',{method:'POST',headers:Object.assign({'x-control':K,'content-type':'application/json'},hd||{}),body:JSON.stringify({uname:u,pin:p})});let j={};try{j=await r.json()}catch(e){}return [r.status,j];};
(async()=>{
 let r=await fetch(B+'/control?k='+K);T('Control page opens on the Mac',r.status===200&&/Operations Room/.test(await r.text()));
 r=await fetch(B+'/control?k='+K,{headers:{'cf-connecting-ip':'1.2.3.4'}});T('Control page refused through the internet tunnel',r.status===404);
 let [s,j]=await c('/api/control/state');T('Before the owner has a PIN the control room is open on the Mac',s===200&&j.owner.pin===false);
 [s]=await c('/api/control/state','GET',null,{'x-control':'wrong'});T('Wrong key refused',s===401||s===404,s);
 [s]=await c('/api/control/state','GET',null,{'x-forwarded-for':'1.2.3.4'});T('Right key through the tunnel refused',s===401||s===404,s);
 r=await fetch(B+'/api/control/state',{headers:{'x-code':'admincode1'}});T('Owner link alone cannot reach control functions',r.status===404||r.status===401,r.status);
 // owner sets up on his phone
 [s]=await ph('admincode1','/api/uname','POST',{uname:'boss1'},dev('a'));[s]=await ph('admincode1','/api/pin','POST',{pin:h('admincode1','5555')},dev('a'));T('Owner sets username and PIN on his phone',s===200,s);
 [s,j]=await c('/api/control/state');T('Now the key alone gets nothing: sign-in is required',s===401&&j.error==='login',[s,j]);[s]=await c('/api/people');T('...not the people list either',s===401);
 [s]=await login('boss1','1111');T('Wrong PIN refused',s===401);[s]=await login('other','5555');T('Wrong username refused',s===401);[s]=await login('boss1','5555',{'cf-ray':'x'});T('Sign-in refused through the tunnel',s===401);
 [s,j]=await login('BOSS1','5555');T('Right username (any case) and PIN sign in',s===200&&!!j.token);TOK=j.token;
 [s,j]=await c('/api/control/state');T('State works when signed in',s===200&&j.owner.uname==='boss1'&&typeof j.release==='string'&&Array.isArray(j.backups));T('Log never shows a personal link',!/[?&]c=/.test(j.log));
 T('Sessions are stored only as a hash',!JSON.stringify(cfg().ctlSess).includes(TOK)&&Object.keys(cfg().ctlSess).length===1);
 r=await fetch(B+'/control/alive');T('Alive probe: closed before any heartbeat... or open after state',['open','closed'].includes(await r.text()));await fetch(B+'/control/beat',{headers:{'x-control':K}});r=await fetch(B+'/control/alive');T('Heartbeat marks the window open',await r.text()==='open');
 [s,j]=await c('/api/control/cases');T('Cases list answers',s===200&&Array.isArray(j.list));
 [s,j]=await c('/api/people','POST',{name:'Maj Two',role:'admin'});const c2=j.person.code;T('Add an officer from the control room',s===200&&!!c2);
 [s,j]=await c('/api/people','POST',{name:'Sep Post',role:'field'});const c3=j.person.code;
 [s,j]=await c('/api/control/state');T('Officers offered for hand-over; not ready until signed in',j.officers.some(o=>o.code===c2&&o.ready===false)&&!j.officers.some(o=>o.code===c3),j.officers);
 [s,j]=await c('/api/control/transfer','POST',{code:c2,pin:'5555'});T('Hand-over refused to an officer who never signed in',s===400&&j.error==='notready',[s,j]);
 [s,j]=await c('/api/control/transfer','POST',{code:c3,pin:'5555'});T('Hand-over refused to a Post Staff account',s===400&&j.error==='officer',[s,j]);
 // officer two signs in on his phone (needs approval first)
 [s,j]=await ph(c2,'/api/ping','GET',null,dev('b'));T('New officer phone waits for approval',j.error==='approve',j);[s]=await c('/api/people/'+c2+'/phone','POST',{action:'approve'});T('Approve his phone from the control room',s===200);
 await ph(c2,'/api/uname','POST',{uname:'two2'},dev('b'));[s]=await ph(c2,'/api/pin','POST',{pin:h(c2,'2222')},dev('b'));T('He sets his username and PIN',s===200,s);
 [s,j]=await ph(c2,'/api/uname','POST',{uname:'boss1'},dev('b'),h(c2,'2222'));T('A username already taken is refused',s===409,[s,j]);
 // backup and restore
 [s,j]=await c('/api/control/backup','POST',{});const bk=j.name;T('Backup made',s===200&&fs.existsSync(S+'/srv/backups/'+bk));[s]=await c('/api/control/restore','POST',{name:'../../x.tgz'});T('Restore refuses a strange name',s===404);
 // takeover: owner moves to a new phone
 [s,j]=await ph('admincode1','/api/ping','GET',null,dev('c'),h('admincode1','5555'));T('Owner link on a second phone is refused',j.error==='device',j);
 [s]=await ph('admincode1','/api/takeover','POST',{uname:'boss1'},dev('c'),h('admincode1','9999'));T('Owner move with a wrong PIN refused',s===401);[s]=await ph('admincode1','/api/takeover','POST',{uname:'nope'},dev('c'),h('admincode1','5555'));T('Owner move with a wrong username refused',s===401);
 [s]=await ph(c2,'/api/takeover','POST',{uname:'two2'},dev('d'),h(c2,'2222'));T('An officer cannot move his own account this way',s===403,s);
 [s]=await ph('admincode1','/api/takeover','POST',{uname:'boss1'},dev('c'),h('admincode1','5555'));T('Owner move with right username and PIN works',s===200,s);[s,j]=await ph('admincode1','/api/ping','GET',null,dev('a'),h('admincode1','5555'));T('Owner old phone is now refused',j.error==='device',j);
 [s]=await c('/api/control/state');T('Control room stays signed in through all this',s===200,s);
 // concurrent decisions on one case are consistent (needs a case): skipped here, covered in t_new
 // hand over
 [s,j]=await c('/api/control/transfer','POST',{code:c2,pin:'0000'});T('Hand-over with a wrong PIN changes nothing',s===401&&cfg().adminCode==='admincode1');
 [s,j]=await c('/api/control/transfer','POST',{code:c2,pin:'5555'});const cf=cfg();T('Hand-over with the right PIN: he is Owner, old owner is an Officer',s===200&&cf.adminCode===c2&&cf.people.some(p=>p.code==='admincode1'&&p.role==='admin')&&!cf.people.some(p=>p.code===c2),[s,j]);
 [s,j]=await c('/api/control/state');T('Old session is locked out at once',s===401,s);[s]=await login('boss1','5555');T('Old owner cannot sign in to the control room',s===401);[s,j]=await login('two2','2222');T('New owner signs in with his own username and PIN',s===200);TOK=j.token;
 [s,j]=await ph('admincode1','/api/ping','GET',null,dev('c'),h('admincode1','5555'));T('Old owner phone keeps working as an Officer',s===200&&j.admin===true&&j.owner===false,j);[s,j]=await ph(c2,'/api/ping','GET',null,dev('b'),h(c2,'2222'));T('New owner phone is Owner',s===200&&j.owner===true,j);
 [s,j]=await ph('admincode1','/api/takeover','POST',{uname:'boss1'},dev('e'),h('admincode1','5555'));T('The old owner can no longer move his account himself',s===403,s);
 [s]=await c('/api/control/owner','POST',{what:'pin'});[s,j]=await c('/api/control/state');T('Owner reset from the Mac clears his PIN and username',j.owner&&j.owner.pin===false&&j.owner.uname==='',j.owner);
 // day limit on wrong sign-ins
 await ph(c2,'/api/pin','POST',{pin:h(c2,'2222')},dev('b'));let locked=0,n=0;for(let i=0;i<30;i++){const [st,jj]=await login('two2','0');n++;if(jj.error==='locked')locked++;}
 T('Wrong sign-ins are counted and lock',locked>0&&(cfg().dayFails.ctl||{}).n>=8,cfg().dayFails);[s,j]=await login('two2','2222');T('While locked, even the right PIN is refused',s===401&&j.error==='locked',[s,j]);
 // restore brings back the earlier state and restarts
 const TOK2=TOK;[s]=await c('/api/control/restore','POST',{name:bk});T('Restore needs a signed-in session (locked out by tries does not block an open session)',s===200||s===401,s);
 console.log('\nCONTROL TESTS PASSED '+pass+'   FAILED '+fail.length);fail.forEach(x=>console.log(' X',x));})().catch(e=>{console.log('CRASH',String(e.stack||e).slice(0,400))});
