const crypto=require('crypto'),fs=require('fs');const B='http://127.0.0.1:8799',h=(c,p)=>crypto.createHash('sha256').update(c+':'+p).digest('hex'),dev=c=>c.repeat(32);
const ph=async(code,p,m,b,d,pin)=>{const r=await fetch(B+p+(p.includes('?')?'&':'?')+'dev='+d+(pin?'&pin='+pin:''),{method:m||'GET',headers:{'x-code':code,'content-type':'application/json'},body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return [r.status,j];};
(async()=>{const S=process.argv[2];
 await ph('admincode1','/api/pin','POST',{pin:h('admincode1','5555')},dev('a'));const OP=h('admincode1','5555');
 // officer A = admin2code ; create officer B
 await ph('admincode1','/api/people/admin2code/phone','POST',{action:'approve'},dev('a'),OP);let [s,j]=await ph('admin2code','/api/ping','GET',null,dev('b'));await ph('admincode1','/api/people/admin2code/phone','POST',{action:'approve'},dev('a'),OP);
 await ph('admin2code','/api/uname','POST',{uname:'offa'},dev('b'));await ph('admin2code','/api/pin','POST',{pin:h('admin2code','1111')},dev('b'));const AP=h('admin2code','1111');
 [s,j]=await ph('admincode1','/api/people','POST',{name:'Maj B',role:'admin'},dev('a'),OP);const cb=j.person.code;await ph(cb,'/api/ping','GET',null,dev('c'));await ph('admincode1','/api/people/'+cb+'/phone','POST',{action:'approve'},dev('a'),OP);
 await ph(cb,'/api/uname','POST',{uname:'offb'},dev('c'));await ph(cb,'/api/pin','POST',{pin:h(cb,'2222')},dev('c'));
 console.log('B works on his phone:',(await ph(cb,'/api/ping','GET',null,dev('c'),h(cb,'2222')))[0]);
 // officer A attacks B
 [s,j]=await ph('admin2code','/api/people','GET',null,dev('b'),AP);console.log('A can read B\'s link code from the people list:',j.people.some(p=>p.code===cb));
 console.log('A resets B PIN:',(await ph('admin2code','/api/people/'+cb+'/pin','DELETE',null,dev('b'),AP))[0],'| A releases B phone:',(await ph('admin2code','/api/people/'+cb+'/device','DELETE',null,dev('b'),AP))[0]);
 [s,j]=await ph(cb,'/api/pin','POST',{pin:h(cb,'9999')},dev('d'));console.log('A sets a new PIN on B\'s account from another phone:',s);[s,j]=await ph(cb,'/api/ping','GET',null,dev('d'),h(cb,'9999'));console.log('A is now signed in AS B:',s,j.name,j.admin);
 console.log('A removes officer B (should be refused):',(await ph('admin2code','/api/people/'+cb,'DELETE',null,dev('b'),AP))[0],'| A demotes B (should be refused):',(await ph('admin2code','/api/people/'+cb,'POST',{role:'field'},dev('b'),AP))[0]);
 console.log('A promotes a Post Staff to Officer:',(await ph('admin2code','/api/people/fieldcodeA','POST',{role:'admin'},dev('b'),AP))[0]);
 // post staff attempts
 await ph('admincode1','/api/people/fieldcodeB/device','DELETE',null,dev('a'),OP);await ph('fieldcodeB','/api/pin','POST',{pin:h('fieldcodeB','3333')},dev('e'));const FP=h('fieldcodeB','3333');
 for(const [m,p,b] of [['GET','/api/people'],['GET','/api/admin'],['GET','/api/search?q=a'],['POST','/api/watch',{value:'ABCD-1'}],['POST','/api/joinlink',{action:'off'}],['POST','/api/people',{name:'x',role:'admin'}],['GET','/api/control/state'],['POST','/api/control/backup',{}],['POST','/api/takeover',{uname:'x'}]]){const [st]=await ph('fieldcodeB',p,m,b,dev('e'),FP);console.log('Post Staff',m,p,'->',st);}
 // unauthenticated
 for(const p of ['/api/captures','/api/people','/api/control/state','/api/admin','/api/thumb/x/0','/control/alive','/control/beat']){const r=await fetch(B+p);console.log('No sign-in',p,'->',r.status);}
 console.log('wrong pin on GET repeatedly is counted?',await (async()=>{let c=0;for(let i=0;i<12;i++){const [st,jj]=await ph('fieldcodeB','/api/ping','GET',null,dev('e'),'0'.repeat(64));if(jj.locked)c++;}return c+' locked replies of 12; dayFails='+JSON.stringify(JSON.parse(fs.readFileSync(S+'/srv/data/config.json')).dayFails)})());
})();
