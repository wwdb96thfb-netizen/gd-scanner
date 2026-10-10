const {chromium}=require('playwright');const S=process.argv[2];const B='http://127.0.0.1:8799';
const jpg='data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0xff,0xd9]).toString('base64');
const call=async(code,m,p,b)=>{const r=await fetch(B+p,{method:m,headers:{'x-code':code,'content-type':'application/json'},body:b?JSON.stringify(b):undefined});return {s:r.status,j:await r.json().catch(()=>({}))};};
const up=(code,id,n,found)=>call(code,'POST','/api/capture',{id,takenAt:new Date().toISOString(),location:'Rehri',gps:{lat:24.9,lon:67.1,acc:9},found,pages:Array.from({length:n||4},(_,i)=>({view:jpg,top:jpg,ph:(id.slice(0,8)+'00000000').slice(0,15)+i}))});
const F=[{what:'Walnut kernels',pkgs:10,unit:'Cartons',each:5,eachUnit:'kg'}];
(async()=>{
 // ---- files in every state, all sent by Post A
 const ids={crit:'aaaaaaa1-crit-new',docs:'aaaaaaa2-crit-docs',seize:'aaaaaaa3-crit-seize',court:'aaaaaaa4-crit-court',rel:'aaaaaaa5-crit-rel',clean:'aaaaaaa6-clean-new',cdone:'aaaaaaa7-clean-done',idc:'aaaaaaa8-idcard-x'};
 for(const k in ids){await up('fieldcodeA',ids[k],4,k==='crit'?null:F);await new Promise(r=>setTimeout(r,400));}
 for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,700));const L=(await call('admincode1','GET','/api/captures')).j.list;if(L.length>=8&&L.every(c=>c.status==='done'))break;}
 const o=[];o.push(await call('admin2code','POST','/api/order/'+ids.docs,{order:'docs',note:'Get the sales tax invoice'}));
 o.push(await call('admin2code','POST','/api/order/'+ids.seize,{order:'seize',note:'Unload at HQ'}));
 o.push(await call('admin2code','POST','/api/order/'+ids.court,{order:'seize'}));o.push(await call('fieldcodeA','POST','/api/ack/'+ids.court,{remark:'done'}));
 o.push(await call('fieldcodeA','POST','/api/report/'+ids.court,{vehicle:'TKA-1',driver:'Gul',contact:'0300',owner:'X',goods:'Walnut',packages:'10 cartons',weight:'50',marks:'',from:'Hub',to:'Karachi',kept:'HQ warehouse',reason:'No papers',remarks:''}));
 o.push(await call('admin2code','POST','/api/review/'+ids.court,{result:'confirmed',remark:'ok'}));o.push(await call('admin2code','POST','/api/case/'+ids.court,{status:'filed',caseNo:'CC-1/2026',court:'Customs Court',filedOn:'2026-10-10',warehouse:'HQ'}));
 o.push(await call('admin2code','POST','/api/order/'+ids.rel,{order:'release',orderedBy:'Comdt'}));o.push(await call('fieldcodeA','POST','/api/decision/'+ids.cdone,{action:'released'}));
 await call('admincode1','POST','/api/people',{name:'Col Viewer',role:'viewer'});await call('admincode1','POST','/api/watch',{value:'TKA-9999',note:'test'});
 const viewer=(await call('admincode1','GET','/api/people')).j.people.find(x=>x.role==='viewer').code;
 console.log('setup statuses',o.map(x=>x.s).join(','));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const problems=[],notes={},EFX={};let LAST='';
 const SKIP=/^(Lock the app now|Forgot PIN\?|Yes, delete for everyone|Remove|Yes, remove)$/;
 for(const [role,code,pin] of [['POST A (has files)','fieldcodeA','1111'],['POST B (no files)','fieldcodeB','2222'],['ADMIN','admin2code','3333'],['VIEW ONLY',viewer,'4444'],['OWNER','admincode1','5555']]){
  const ctx=await b.newContext({viewport:{width:375,height:667},geolocation:{latitude:24.9,longitude:67.1},permissions:['geolocation']});const p=await ctx.newPage();p.setDefaultTimeout(6000);
  await p.addInitScript(()=>{window.__fx=[];window.print=()=>{__fx.push('PRINT')};try{navigator.share=function(d){__fx.push('SHARE '+String((d&&(d.text||d.title||d.url))||'').slice(0,50));return Promise.resolve();};}catch(e){}
   try{navigator.clipboard.writeText=function(t){__fx.push('COPY '+String(t).slice(0,50));return Promise.resolve();};}catch(e){}
   const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){__fx.push('DOWNLOAD '+(this.download||this.href.slice(0,40)));};
   const oo=window.open;window.open=function(u){__fx.push('OPEN '+String(u).slice(0,50));return null;};});
  const reqs=[];p.on('response',r=>{const u=r.url();if(u.startsWith(B)&&r.request().method()!=='GET')reqs.push(r.request().method()+' '+u.replace(B,'').split('?')[0].replace(/[a-z0-9]{8}-[a-z0-9-]+/g,':id').replace(/people\/[a-z0-9]+/,'people/:c')+' '+r.status());});
  const snap=()=>p.evaluate(()=>{const v=id=>{const e=document.getElementById(id);return !!(e&&!e.hidden&&e.offsetParent!==null);};return {sheet:v('sheet')?(document.getElementById('sheet').innerText||'').slice(0,40).replace(/\s+/g,' '):'',zoom:v('zoom'),dcard:v('dcard'),gate:v('gate'),tab:(document.querySelector('.tabs button.on')||{dataset:{}}).dataset.p,open:document.querySelectorAll('details[open]').length,vis:[...document.querySelectorAll('body *')].filter(e=>e.offsetParent!==null).length,txt:document.body.innerText.length,theme:document.documentElement.getAttribute('data-theme')||document.body.className};});
  const bad=(t)=>{problems.push(role+' | '+t);};
  p.on('pageerror',e=>bad('JS ERROR: '+String(e.stack||e).slice(0,400)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|net::/.test(m.text()))bad('CONSOLE: '+m.text().slice(0,300));});
  p.on('response',r=>{const u=r.url();if(u.startsWith(B)&&r.status()>=400){const path=u.replace(B,'').split('?')[0];const k=role+' | HTTP '+r.status()+' '+r.request().method()+' '+path.replace(/[a-z0-9]{8}-[a-z0-9-]+/g,':id');notes[k]=(notes[k]||0)+1;}});
  await p.goto('http://127.0.0.1:8798/index.html?t=gdtesttesttesttesttest12&s=http://127.0.0.1:8799&c='+code);await p.waitForTimeout(1500);
  if(await p.isVisible('#g-intro'))await p.click('#g-start');if(await p.isVisible('#g-loc')){await p.check('#g-agree');await p.click('#g-allow');await p.waitForTimeout(800);}
  if(await p.isVisible('#g-pin')){await p.fill('#g-p1',pin);if(await p.isVisible('#g-p2'))await p.fill('#g-p2',pin);await p.click('#g-ok');await p.waitForTimeout(2000);}
  if(await p.isVisible('#gate')){bad('could not sign in: '+await p.innerText('#s-gpin'));continue;}
  const tidy=async()=>{for(let k=0;k<4;k++){if(await p.isVisible('#dcard'))await p.locator('#dc-in .btn').first().click().catch(()=>{});else if(await p.isVisible('#sheet'))await p.click('#sheet-done').catch(()=>{});else if(await p.isVisible('#zoom'))await p.click('#zoom-x').catch(()=>{});else break;await p.waitForTimeout(120);} if(await p.isVisible('#gate')){bad('app locked after pressing "'+LAST+'": '+(await p.innerText('#gate')).replace(/\s+/g,' ').slice(0,160));if(await p.isVisible('#g-p1')){await p.fill('#g-p1',pin);if(await p.isVisible('#g-p2'))await p.fill('#g-p2',pin);await p.click('#g-ok');await p.waitForTimeout(1500);}}};
  const overflow=async(where)=>{const o=await p.evaluate(()=>{const w=document.documentElement.clientWidth;return [...document.querySelectorAll('body *')].filter(e=>{if(e.closest('[hidden]')||e.closest('#print')||e.closest('#zoom')||e.closest('.appbar')||e.closest('#zoom-wm'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.right>w+2;}).slice(0,2).map(e=>e.tagName+'.'+String(e.className).slice(0,30)+' text="'+(e.innerText||'').slice(0,30)+'"');});if(o.length)bad('WIDER THAN SCREEN in '+where+': '+o.join(' ; '));};
  const sweep=async(scope,where)=>{let n=await p.locator(scope+' button:visible, '+scope+' summary:visible').count(),done=0;
   for(let i=0;i<Math.min(n,70);i++){const el=p.locator(scope+' button:visible, '+scope+' summary:visible').nth(i);if(!(await el.count()))break;const txt=((await el.innerText().catch(()=>''))||await el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40);
    if(SKIP.test(txt)||await el.isDisabled().catch(()=>true))continue;
    LAST=txt+' in '+where;const b0=await snap();reqs.length=0;await p.evaluate(()=>{__fx.length=0;if(!window.__tw){window.__tw=1;var _t=toast;toast=function(m,b){__fx.push((b?'RED-TOAST ':'TOAST ')+String(m).slice(0,60));_t(m,b);};}});
    try{await el.scrollIntoViewIfNeeded();await el.click({timeout:3000});done++;await p.waitForTimeout(450);const a=await snap();const fx=(await p.evaluate(()=>__fx.slice())).concat(reqs.slice());
     if(a.sheet&&a.sheet!==b0.sheet)fx.push('SHEET "'+a.sheet+'"');if(a.zoom&&!b0.zoom)fx.push('ZOOM');if(a.dcard&&!b0.dcard)fx.push('ORDERCARD');if(a.gate&&!b0.gate)fx.push('LOCKED');if(a.tab!==b0.tab)fx.push('TAB '+a.tab);if(a.open!==b0.open)fx.push(a.open>b0.open?'OPENS':'CLOSES');if(a.theme!==b0.theme)fx.push('THEME');
     if(!fx.length&&(a.vis!==b0.vis||a.txt!==b0.txt))fx.push('screen changed ('+(a.vis-b0.vis)+' items, '+(a.txt-b0.txt)+' chars)');
     const tag=(await el.evaluate(e=>e.tagName+(e.id?'#'+e.id:'')).catch(()=>'?'));(EFX[role]=EFX[role]||{})[where.replace(/file .*/,'file')+' | '+tag+' "'+txt+'" => '+(fx.join(' + ')||'NOTHING')]=1;}catch(e){bad('CANNOT CLICK "'+txt+'" in '+where+': '+String(e).split('\n')[0].slice(0,120));}
    await p.waitForTimeout(160);await tidy();}
   await overflow(where);return done;};
  let total=0;const tabs=await p.locator('.tabs button:visible').evaluateAll(L=>L.map(x=>x.dataset.p));
  for(const t of tabs){await p.click('.tabs button[data-p="'+t+'"]');await p.waitForTimeout(500);await tidy();
   if(t==='files'){ // open every file and press everything inside it
    await p.evaluate(()=>{var b=document.getElementById('b-morechips');if(b&&!b.hidden)b.click();});
    for(const f of await p.locator('#chips button[data-f]:visible').evaluateAll(L=>L.map(x=>x.dataset.f))){await p.click('#chips button[data-f="'+f+'"]');await p.waitForTimeout(150);}
    await p.click('#chips button[data-f="all"]').catch(()=>{});
    const fl=await p.evaluate(()=>S.list.map(c=>c.id));
    for(const id of fl){await p.evaluate(i=>{S.open=i;S.filesSig='';drawFiles();},id);await p.waitForTimeout(250);const sc='details.case[data-id="'+id+'"] .body';if(!(await p.locator(sc).count())){bad('file did not open: '+id);continue;}
     // fill selects so save buttons have something to save
     for(const sel of await p.locator(sc+' select:visible').all()){const opts=await sel.locator('option').evaluateAll(L=>L.map(o=>o.value).filter(Boolean));if(opts.length)await sel.selectOption(opts[0]).catch(()=>{});}
     for(const inp of await p.locator(sc+' input[type=text]:visible, '+sc+' textarea:visible').all()){if(!(await inp.inputValue().catch(()=>'x')))await inp.fill('test').catch(()=>{});}
     total+=await sweep(sc,'file '+id.slice(9));}
    if(p.locator('#q')&&await p.isVisible('#q')){await p.fill('#q','walnut');await p.press('#q','Enter');await p.waitForTimeout(900);await p.fill('#q','');await p.press('#q','Enter');await p.waitForTimeout(400);}
   } else if(t==='people'){for(const g of await p.locator('#grp-chips button:visible').evaluateAll(L=>L.map(x=>x.dataset.g))){await p.click('#grp-chips button[data-g="'+g+'"]');await p.waitForTimeout(500);total+=await sweep('#p-people .grp[data-g="'+g+'"]','Admin/'+g);}
   } else total+=await sweep('#p-'+t,'tab '+t);
   await overflow('tab '+t);}
  const toasts=await p.evaluate(()=>window.__t||[]);console.log(role.padEnd(20),'tabs:',tabs.join(','),'| buttons pressed:',total);if(EFX[role])Object.keys(EFX[role]).sort().forEach(x=>console.log(x));console.log('PROBLEMS SO FAR',JSON.stringify([...new Set(problems)]));await ctx.close();}
 for(const r in EFX){console.log('\n== '+r);Object.keys(EFX[r]).sort().forEach(x=>console.log(x));}
 console.log('\nPROBLEMS ('+problems.length+')');[...new Set(problems)].forEach(x=>console.log(' -',x));
 console.log('\nREFUSED OR FAILED REQUESTS');Object.keys(notes).sort().forEach(k=>console.log(' ',String(notes[k]).padStart(3),k));
 await b.close();})().catch(e=>{console.log('SWEEP CRASHED',String(e.stack||e).slice(0,600));process.exit(1);});
