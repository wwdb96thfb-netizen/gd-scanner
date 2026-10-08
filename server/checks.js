// GD Scanner checklist: pure arithmetic and comparison rules. No network, no AI.
function num(x){ if(x==null||x==='') return null; var n=typeof x==='number'?x:parseFloat(String(x).replace(/,/g,'')); return isFinite(n)?n:null; }
function pd(s){ if(!s) return null; var m=String(s).match(/(\d{1,2})\D{1,3}(\d{1,2})\D{1,3}(\d{4})/); if(!m) return null; var d=Date.UTC(+m[3],+m[2]-1,+m[1]); return isNaN(d)?null:d; }
function nm(s){ return String(s||'').toLowerCase().replace(/\bm\/?s\b\.?/g,' ').replace(/\b(co|ltd|limited|pvt|private|company)\b\.?/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }
function same(a,b){ var A=nm(a),B=nm(b); if(A.length<3||B.length<3) return null; return A===B||A.indexOf(B)>=0||B.indexOf(A)>=0; }
function near(a,b,abs,rel){ return Math.abs(a-b)<=Math.max(abs,rel*Math.max(Math.abs(a),Math.abs(b))); }
function fmt(n){ return n==null?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:2}); }
function dstr(ms){ if(ms==null) return '—'; var d=new Date(ms); return ('0'+d.getUTCDate()).slice(-2)+'-'+('0'+(d.getUTCMonth()+1)).slice(-2)+'-'+d.getUTCFullYear(); }

function checkGD(g,add){
  var mn=String(g.machine_no||'').replace(/\s+/g,'').toUpperCase();
  var m=mn.match(/^([A-Z]{3,5})-([A-Z]{1,3})-(\d+)-(\d{2})-(\d{2})-(\d{4})$/);
  var gdDate=pd(g.gd_date);
  if(!mn) add('amber',1,'GD number could not be read','Retake the photo so the machine number box at the bottom left is sharp.');
  else if(!m) add('red',1,'GD number has an unusual format',mn+' does not follow station, type, serial, date.');
  else { var inside=pd(m[4]+'-'+m[5]+'-'+m[6]);
    if(gdDate!=null&&gdDate!==inside) add('red',1,'Date inside the GD number does not match the GD date','Number says '+dstr(inside)+'. GD date says '+dstr(gdDate)+'.');
    else add('ok',1,'GD number format and date agree',mn);
    if(gdDate==null) gdDate=inside; }
  var st=m?m[1]:null;
  if(st){ var refs=[['IGM number',g.igm_no],['BL / Index number',g.bl_no],['Payment number',g.cash_no]].filter(function(r){return r[1];});
    var bad=refs.filter(function(r){return String(r[1]).toUpperCase().indexOf(st)<0;});
    if(!refs.length) add('skip',2,'Station code not compared','IGM, BL and payment numbers were not readable.');
    else if(bad.length) add('red',2,'Station code differs inside the same GD',bad.map(function(r){return r[0]+' '+r[1];}).join('; ')+' should carry '+st+'.');
    else add('ok',2,'Same station code on every reference',st); }
  var idx=num(g.index_no), bl=String(g.bl_no||'').match(/-0*(\d+)\s*$/);
  if(idx!=null&&bl){ if(idx!==+bl[1]) add('red',3,'Index number does not match the BL / Index reference','Index '+idx+' against '+g.bl_no+'.'); else add('ok',3,'Index number matches',''); }
  else add('skip',3,'Index number not compared','Could not read both values.');
  var igm=pd(g.igm_date), cm=String(g.cash_no||'').match(/(\d{2})(\d{2})(\d{4})\s*$/), cash=cm?pd(cm[1]+'-'+cm[2]+'-'+cm[3]):null;
  if(gdDate!=null&&(igm!=null||cash!=null)){ var b=[];
    if(igm!=null&&igm>gdDate) b.push('IGM is dated after the GD');
    if(cash!=null&&cash<gdDate) b.push('payment is dated before the GD');
    if(b.length) add('red',4,'Dates are out of order',b.join('; ')+'.'); else add('ok',4,'IGM, GD and payment dates are in order',''); }
  else add('skip',4,'Dates not compared','Could not read enough dates.');
  var miss=[['importer name',g.importer],['NTN',g.ntn],['STRN',g.strn]].filter(function(r){return !r[1];}).map(function(r){return r[0];});
  if(miss.length) add('amber',5,'Importer details incomplete','Missing or unreadable: '+miss.join(', ')+'.'); else add('ok',5,'Importer name, NTN and STRN present','');

  var items=Array.isArray(g.items)?g.items:[];
  var info={mn:mn,serial:m?+m[3]:null,gdDate:gdDate,qty:null,plant:false};
  if(!items.length){ add('amber',9,'No item lines could be read','Retake the photo with the item section in focus.'); return info; }
  var rate=num(g.exchange_rate), ins=num(g.insurance_pct), land=num(g.landing_pct); if(ins==null) ins=1; if(land==null) land=1;
  var hsN=0,hsP=[],orP=[],orN=0,unN=0,unP=[],re=[],pkN=0,pkP=[],txN=0,txP=[],sum={},sQ=0,sT=0,sC=0,qOk=true,tOk=true,cOk=true;
  items.forEach(function(it,i){
    var L='Item '+(it.no||i+1), desc=String(it.description||'').toLowerCase(), hs=String(it.hs_code||'').replace(/\D/g,'');
    if(/^(0[6-9]|1[0-4])/.test(hs)) info.plant=true;
    if(/walnut/.test(desc)&&hs){ var exp=/in\s*-?\s*shell/.test(desc)?'08023100':(/shelled|kern/.test(desc)?'08023200':null);
      if(exp){ hsN++; if(hs.slice(0,8)!==exp) hsP.push(L+': "'+it.description+'" should be '+exp.slice(0,4)+'.'+exp.slice(4)+', GD shows '+it.hs_code); } }
    var o=same(it.origin,g.exporter_country); if(o!==null){ orN++; if(!o) orP.push(L+': origin '+it.origin+', exporter in '+g.exporter_country); }
    var q=num(it.qty_kg),ud=num(it.unit_declared),ua=num(it.unit_assessed),td=num(it.total_declared),ta=num(it.total_assessed),cv=num(it.customs_value_assessed_pkr);
    if(q==null) qOk=false; else sQ+=q; if(ta==null) tOk=false; else sT+=ta; if(cv==null) cOk=false; else sC+=cv;
    if(q!=null&&ua!=null&&ta!=null){ unN++; if(!near(q*ua,ta,0.5,0.001)) unP.push(L+': '+fmt(q)+' × $'+ua+' = $'+fmt(q*ua)+', GD shows $'+fmt(ta)); }
    if(q!=null&&ud&&td!=null){ var dq=td/ud; if(!near(dq,q,1,0.01)) re.push(L+': declared value equals '+fmt(dq)+' kg, duty charged on '+fmt(q)+' kg'); }
    if(ud!=null&&ua!=null&&!near(ud,ua,0.0001,0.001)) re.push(L+': unit value changed from $'+ud+' to $'+ua);
    if(ta!=null&&rate&&cv!=null){ pkN++; var e=ta*rate*(1+ins/100)*(1+land/100); if(!near(e,cv,5,0.0003)) pkP.push(L+': worked out Rs '+fmt(Math.round(e))+', GD shows Rs '+fmt(cv)); }
    var lv=Array.isArray(it.levies)?it.levies:[], A=function(c){ var s=0; lv.forEach(function(x){ if(String(x.code||'').toUpperCase()===c) s+=num(x.amount_pkr)||0; }); return s; };
    lv.forEach(function(x){ var c=String(x.code||'').toUpperCase(), r=num(x.rate_pct), a=num(x.amount_pkr); if(a!=null) sum[c]=(sum[c]||0)+a;
      if(cv==null||r==null||a==null) return; var duty=A('CD')+A('RD')+A('ACD');
      var base=['CD','RD','ACD'].indexOf(c)>=0?cv:(['ST','AST','FED'].indexOf(c)>=0?cv+duty:(c==='IT'?cv+duty+A('FED')+A('ST')+A('AST'):null));
      if(base==null) return; txN++; if(!near(base*r/100,a,3,0.0003)) txP.push(L+' '+c+': '+r+'% works out to Rs '+fmt(Math.round(base*r/100))+', GD shows Rs '+fmt(a)); });
  });
  if(qOk) info.qty=sQ;
  if(!hsN) add('skip',7,'HS code not compared with the description','No HS rule is loaded for this product yet.'); else if(hsP.length) add('red',7,'HS code does not match the goods',hsP.join('; ')+'.'); else add('ok',7,'HS code matches the description','');
  if(!orN) add('skip',8,'Origin not compared','Origin or exporter country not readable.'); else if(orP.length) add('red',8,'Origin differs from the exporter country',orP.join('; ')+'.'); else add('ok',8,'Origin matches the exporter country','');
  var net=num(g.net_wt_mt), gross=num(g.gross_wt_mt);
  if(qOk&&net!=null){ if(!near(sQ,net*1000,1,0.01)) add('red',9,'Item quantities do not add up to the net weight','Items total '+fmt(sQ)+' kg. Net weight box says '+fmt(net*1000)+' kg.'); else add('ok',9,'Item quantities equal the net weight',fmt(sQ)+' kg'); }
  else add('skip',9,'Weights not compared','Could not read every quantity and the net weight.');
  if(gross!=null&&net!=null&&gross<net-0.0005) add('red',9,'Gross weight is less than net weight','Gross '+gross+' MT, net '+net+' MT.');
  var pk=num(g.packages); if(pk&&qOk){ var per=sQ/pk; if(per<1||per>100) add('amber',10,'Package count looks odd for the weight','About '+fmt(per)+' kg per '+(g.package_type||'package')+'.'); else add('ok',10,'Package count fits the weight','About '+fmt(per)+' kg per '+(g.package_type||'package')+'. Compare with the physical stock.'); }
  if(re.length) add('amber',11,'Customs changed what was declared',re.join('; ')+'. Ask the seller why.'); else add('ok',11,'Declared and assessed figures agree','');
  if(!unN) add('skip',12,'Unit value arithmetic not checked',''); else if(unP.length) add('red',12,'Unit value × quantity does not equal the total',unP.join('; ')+'.'); else add('ok',12,'Unit value × quantity equals the total','');
  var cfr=num(g.cfr_usd); if(tOk&&cfr!=null){ if(!near(sT,cfr,1,0.001)) add('red',13,'Item values do not add up to the CFR value','Items total $'+fmt(sT)+'. CFR box says $'+fmt(cfr)+'.'); else add('ok',13,'Item values equal the CFR value','$'+fmt(cfr)); } else add('skip',13,'CFR total not compared','');
  if(!pkN) add('skip',14,'Rupee value not checked','Exchange rate or customs value not readable.'); else if(pkP.length) add('red',14,'Rupee customs value does not follow from the dollar value',pkP.join('; ')+'.'); else add('ok',14,'Rupee customs value follows from the dollar value','');
  if(!txN) add('skip',15,'Tax arithmetic not checked',''); else if(txP.length) add('red',15,'A tax amount does not equal rate × base',txP.join('; ')+'.'); else add('ok',15,'Every tax equals rate × base',txN+' lines checked');
  var tp=[], tn=0, grand=0, tots=Array.isArray(g.totals)?g.totals:[];
  tots.forEach(function(t){ var c=String(t.code||'').toUpperCase(), a=num(t.amount_pkr); if(a==null) return; grand+=a; if(sum[c]==null&&a===0) return; tn++; if(!near(sum[c]||0,a,3,0.0002)) tp.push(c+': items add to Rs '+fmt(sum[c]||0)+', total says Rs '+fmt(a)); });
  var paid=num(g.total_paid_pkr); if(paid!=null&&tots.length){ tn++; if(!near(grand,paid,3,0.0002)) tp.push('taxes add to Rs '+fmt(grand)+', total paid says Rs '+fmt(paid)); }
  var av=num(g.assessed_value_pkr); if(av!=null&&cOk){ tn++; if(!near(sC,av,5,0.0002)) tp.push('customs values add to Rs '+fmt(sC)+', assessed value says Rs '+fmt(av)); }
  if(!tn) add('skip',16,'Totals not checked',''); else if(tp.length) add('red',16,'Totals do not add up',tp.join('; ')+'.'); else add('ok',16,'Totals add up',paid!=null?'Total paid Rs '+fmt(paid):'');
  add('skip',17,'Value not compared with the valuation ruling','Ruling minimum values are not loaded yet.');
  add('skip',18,'Exchange rate not compared with the official rate',rate?'GD uses '+rate+'.':'');
  return info;
}

function runChecks(pages,meta){
  var flags=[], gds=[], pqs=[];
  pages.forEach(function(p,i){
    var add=function(l,n,t,d){ flags.push({l:l,n:n,t:t,d:d||'',p:i+1}); };
    if(p.type==='gd'&&p.gd){ gds.push({g:p.gd,info:checkGD(p.gd,add),p:i+1}); }
    else if(p.type==='pq'&&p.pq){ pqs.push({q:p.pq,p:i+1}); if(!p.pq.gd_no) add('amber',19,'Release order does not show a GD number','Could not read the GD number on the release order.'); }
    else if(p.type==='unread') add('amber',0,'Photo could not be read',p.err||'Retake the photo and upload again.');
    else add('skip',0,'Page is not a GD or a plant quarantine release order',p.what||'');
  });
  var add=function(l,n,t,d){ flags.push({l:l,n:n,t:t,d:d||'',p:0}); };
  var G=gds[0];
  pqs.forEach(function(x){ var q=x.q; if(!G){ add('amber',19,'No GD scanned with this release order','Scan the GD it quotes: '+(q.gd_no||'?')+' dated '+(q.gd_date||'?')+'.'); return; }
    var hit=gds.filter(function(y){ var s=num(String(q.gd_no||'').replace(/\D/g,'')); return s!=null&&s===y.info.serial&&(pd(q.gd_date)==null||pd(q.gd_date)===y.info.gdDate); })[0];
    if(q.gd_no){ if(!hit) add('red',19,'Release order belongs to a different GD','It quotes GD '+q.gd_no+' dated '+(q.gd_date||'?')+'. The GD scanned is '+(G.info.serial||'?')+' dated '+dstr(G.info.gdDate)+'.'); else add('ok',19,'Release order quotes this GD',''); }
    var g=(hit||G).g, inf=(hit||G).info, mis=[], cmp=0;
    [['Importer',q.importer,g.importer],['Exporter',q.exporter,g.exporter]].forEach(function(r){ var s=same(r[1],r[2]); if(s===null) return; cmp++; if(!s) mis.push(r[0]+': "'+r[1]+'" on the release order, "'+r[2]+'" on the GD'); });
    var c1=String(q.container||'').replace(/[^A-Z0-9]/gi,'').toUpperCase(), c2=String(g.container||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
    if(c1&&c2){ cmp++; if(c1!==c2) mis.push('Container: '+c1+' on the release order, '+c2+' on the GD'); }
    if(!cmp) add('skip',20,'Parties and container not compared',''); else if(mis.length) add('red',20,'Papers name different parties or cargo',mis.join('; ')+'.'); else add('ok',20,'Same importer, exporter and container on both papers','');
    var qq=num(q.quantity_kg); if(qq!=null&&inf.qty!=null&&!near(qq,inf.qty,1,0.01)) add('amber',20,'Quantity differs between the papers','Release order '+fmt(qq)+' kg, GD '+fmt(inf.qty)+' kg.');
    var arr=pd(q.arrival_date), insp=pd(q.inspection_date), tl=[];
    if(arr!=null&&inf.gdDate!=null){ if(inf.gdDate<arr) tl.push('GD is dated before the goods arrived'); else if(inf.gdDate-arr>2*864e5) tl.push('GD filed more than 48 hours after arrival'); }
    if(insp!=null&&inf.gdDate!=null&&insp<inf.gdDate) tl.push('inspection is dated before the GD');
    if(insp!=null&&arr!=null&&insp<arr) tl.push('inspection is dated before arrival');
    if(tl.length) add('amber',21,'Timeline needs an explanation',tl.join('; ')+'.'); else if(arr!=null||insp!=null) add('ok',21,'Arrival, GD and inspection dates are in order','');
  });
  if(G&&!pqs.length&&G.info.plant) add('amber',19,'No plant quarantine release order scanned','These are plant or food goods. Ask for the release order that quotes this GD.');
  if(G&&meta&&meta.seller){ var s=same(meta.seller,G.g.importer); if(s===false) add('amber',22,'Seller is not the importer on the GD','Seller: '+meta.seller+'. Importer: '+G.g.importer+'. Ask for the sale invoices that link them.'); else if(s) add('ok',22,'Seller is the importer on the GD',''); }
  var v=flags.some(function(f){return f.l==='red';})?'red':(flags.some(function(f){return f.l==='amber';})?'amber':'ok');
  return {flags:flags,verdict:v,
    gdNos:gds.map(function(x){return x.info.mn;}).filter(Boolean),
    containers:gds.map(function(x){return String(x.g.container||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();}).filter(Boolean)};
}

function dbFlags(cases){
  var byGd={}, byCt={}, out={};
  cases.forEach(function(c){ (c.gdNos||[]).forEach(function(g){ (byGd[g]=byGd[g]||[]).push(c); }); (c.containers||[]).forEach(function(k){ (byCt[k]=byCt[k]||[]).push(c); }); });
  var put=function(c,f){ (out[c.key]=out[c.key]||[]).push(f); };
  Object.keys(byGd).forEach(function(g){ var L=byGd[g]; if(L.length<2) return; L.forEach(function(c){ put(c,{l:'red',n:23,t:'Same GD number appears in '+(L.length-1)+' other file'+(L.length>2?'s':''),d:g+'. Open the other files and compare seller, goods and quantity offered.',p:0}); }); });
  Object.keys(byCt).forEach(function(k){ var L=byCt[k], gd={}; L.forEach(function(c){ (c.gdNos||[]).forEach(function(g){ gd[g]=1; }); }); if(Object.keys(gd).length<2) return; L.forEach(function(c){ put(c,{l:'amber',n:24,t:'Same container appears on different GDs',d:k+' is on '+Object.keys(gd).join(', ')+'.',p:0}); }); });
  return out;
}
module.exports={runChecks:runChecks,dbFlags:dbFlags};
