// GD Scanner checklist: pure arithmetic and comparison rules. No network, no AI.
function num(x){ if(x==null||x==='') return null; var n=typeof x==='number'?x:parseFloat(String(x).replace(/,/g,'')); return isFinite(n)?n:null; }
function pd(s){ if(!s) return null; var m=String(s).match(/(\d{1,2})\D{1,3}(\d{1,2})\D{1,3}(\d{4})/); if(!m) return null; var d=Date.UTC(+m[3],+m[2]-1,+m[1]); return isNaN(d)?null:d; }
function nm(s){ return String(s||'').toLowerCase().replace(/\bm\/?s\b\.?/g,' ').replace(/\b(co|ltd|limited|pvt|private|company)\b\.?/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }
function same(a,b){ var A=nm(a),B=nm(b); if(A.length<3||B.length<3) return null; return A===B||A.indexOf(B)>=0||B.indexOf(A)>=0; }
function near(a,b,abs,rel){ return Math.abs(a-b)<=Math.max(abs,rel*Math.max(Math.abs(a),Math.abs(b))); }
function fmt(n){ return n==null?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:2}); }
function dstr(ms){ if(ms==null) return '—'; var d=new Date(ms); return ('0'+d.getUTCDate()).slice(-2)+'-'+('0'+(d.getUTCMonth()+1)).slice(-2)+'-'+d.getUTCFullYear(); }

function conf(s){ return String(s||'').toUpperCase().replace(/[1L]/g,'I').replace(/0/g,'O').replace(/5/g,'S').replace(/8/g,'B'); }

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
    var bad=refs.filter(function(r){return conf(r[1]).indexOf(conf(st))<0;});
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
  var dSum=0,hsN=0,hsP=[],orP=[],orN=0,unN=0,unP=[],re=[],pkN=0,pkP=[],txN=0,txP=[],sum={},sQ=0,sT=0,sC=0,qOk=true,tOk=true,cOk=true;
  items.forEach(function(it,i){
    var L='Item '+(it.no||i+1), desc=String(it.description||'').toLowerCase(), hs=String(it.hs_code||'').replace(/\D/g,'');
    if(/^(0[6-9]|1[0-4])/.test(hs)) info.plant=true;
    if(/walnut/.test(desc)&&hs){ var exp=/in\s*-?\s*shell/.test(desc)?'08023100':(/shelled|kern/.test(desc)?'08023200':null);
      if(exp){ hsN++; if(hs.slice(0,8)!==exp) hsP.push(L+': "'+it.description+'" should be '+exp.slice(0,4)+'.'+exp.slice(4)+', GD shows '+it.hs_code); } }
    else if(hs){ var hr=hsRule(desc); if(hr){ hsN++; if(!hr.hs.some(function(x){ return hs.indexOf(x)===0; })) hsP.push(L+': "'+it.description+'" belongs under '+hr.say+', GD shows '+it.hs_code); } }
    var o=same(it.origin,g.exporter_country); if(o!==null){ orN++; if(!o) orP.push(L+': origin '+it.origin+', exporter in '+g.exporter_country); }
    var q=num(it.qty_kg),ud=num(it.unit_declared),ua=num(it.unit_assessed),td=num(it.total_declared),ta=num(it.total_assessed),cv=num(it.customs_value_assessed_pkr);
    if(q==null) qOk=false; else sQ+=q; if(ta==null) tOk=false; else sT+=ta; if(cv==null) cOk=false; else sC+=cv;
    if(q!=null&&ua!=null&&ta!=null){ unN++; if(!near(q*ua,ta,0.5,0.001)) unP.push(L+': '+fmt(q)+' × $'+ua+' = $'+fmt(q*ua)+', GD shows $'+fmt(ta)); }
    if(q!=null&&ud&&td!=null){ var dq=td/ud; dSum+=dq; if(!near(dq,q,1,0.01)) re.push(L+': declared value equals '+fmt(dq)+' kg, duty charged on '+fmt(q)+' kg'); }
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
  if(qOk&&net!=null){ if(!near(sQ,net*1000,1,0.01)){
      // Customs often finds more at examination than was declared and charges duty on the higher figure. The weight box then still shows the declared weight. That is not tampering.
      if(re.length&&net*1000<sQ&&dSum>0&&near(dSum,net*1000,1,0.06)) add('ok',9,'Weight box shows the declared weight; Customs assessed more','Declared about '+fmt(Math.round(dSum))+' kg (weight box '+fmt(net*1000)+' kg). Duty was charged on '+fmt(sQ)+' kg, which is what this GD covers.');
      else if(re.length&&net*1000<sQ) add('amber',9,'Items add up to more than the weight box','Items total '+fmt(sQ)+' kg, weight box '+fmt(net*1000)+' kg. Customs changed the declared figures on this GD, which may explain it.');
      else add('red',9,'Item quantities do not add up to the net weight','Items total '+fmt(sQ)+' kg. Net weight box says '+fmt(net*1000)+' kg.'); } else add('ok',9,'Item quantities equal the net weight',fmt(sQ)+' kg'); }
  else add('skip',9,'Weights not compared','Could not read every quantity and the net weight.');
  if(gross!=null&&net!=null&&gross<net-0.0005) add('red',9,'Gross weight is less than net weight','Gross '+gross+' MT, net '+net+' MT.');
  var pk=num(g.packages); if(pk&&qOk){ var per=sQ/pk; if(per<1||per>100) add('amber',10,'Package count looks odd for the weight','About '+fmt(per)+' kg per '+(g.package_type||'package')+'.'); else add('ok',10,'Package count fits the weight','About '+fmt(per)+' kg per '+(g.package_type||'package')+'. Compare with the physical stock.'); }
  if(re.length) add('ok',11,'Customs raised the declared figures at examination',re.join('; ')+'. Duty was charged on the assessed figures, and those are what the GD covers. It does show the importer first declared less.'); else add('ok',11,'Declared and assessed figures agree','');
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

// Goods that posts commonly meet, and the HS chapter or heading each belongs under. Heading level only: a wrong heading is a clear mismatch.
var HS_RULES=[
  [/\b(betel|areca)\s*nuts?\b/,null,['080280'],'0802.80 (areca nuts)'],
  [/\balmonds?\b/,/oil|milk|flavou?r|essence/,['080211','080212'],'0802.11 or 0802.12 (almonds)'],
  [/\bpistachios?\b/,/flavou?r|paste/,['080251','080252'],'0802.51 or 0802.52 (pistachios)'],
  [/\bcashew/,/shell liquid|flavou?r/,['080131','080132'],'0801.31 or 0801.32 (cashew nuts)'],
  [/\braisins?\b/,null,['080620'],'0806.20 (dried grapes)'],
  [/\b(black|green)\s+tea\b/,/whitener|bag paper|machine|filter/,['0902'],'heading 0902 (tea)'],
  [/\bcardamoms?\b/,null,['0908'],'heading 0908 (cardamom)'],
  [/\bcumin\b/,null,['0909'],'heading 0909 (cumin)'],
  [/\bblack\s+pepper\b/,null,['0904'],'heading 0904 (pepper)'],
  [/\b(used|old|retreaded|second\s*hand)\b.*\b(tyres?|tires?)\b/,/tube|flap|machine|rim\b/,['4012'],'heading 4012 (used or retreaded tyres)'],
  [/\b(tyres?|tires?)\b/,/tube|flap|machine|rim\b|used|old|retread|second|lever|valve|cord|repair|sealant|inflat|gauge|changer/,['4011'],'heading 4011 (new tyres)'],
  [/\bcigarettes?\b/,/paper|filter|lighter|case|machine|electronic|holder|tow/,['2402'],'heading 2402 (cigarettes)'],
  [/\b(mobile|cellular|smart)\s*phones?\b/,/cover|case|charger|accessor|parts?\b|batter|glass|protector|cable|holder|stand|pouch|lcd|screen/,['8517'],'heading 8517 (telephones)'],
  [/\blaptops?\b|\bnotebook\s+computers?\b/,/bag|charger|adapt|parts?\b|batter|stand|cover|keyboard|screen|sleeve|cooler/,['8471'],'heading 8471 (computers)'],
  [/\b(led|lcd|smart)\s*(tv|television)s?\b|\btelevision\s+sets?\b/,/parts?\b|panel|remote|stand|bracket|mount|board|kit/,['8528'],'heading 8528 (televisions)'],
  [/\bsolar\s*(panels?|modules?)\b|\bphotovoltaic\s+(panels?|modules?)\b/,/stand|structure|mount|cable|cleaning|frame/,['8541','8501'],'heading 8541 (solar panels)'],
  [/\b(used|second\s*hand|worn)\s+(clothing|clothes|garments)\b/,null,['6309'],'heading 6309 (worn clothing)'],
  [/\bfabrics?\b|\bcloth\b/,/used|worn|clothing|clothes|glass|wire|metal|emery|abrasive|softener|dye|machine|cutter|filter/,['50','51','52','53','54','55','56','57','58','59','60'],'chapters 50 to 60 (textile fabrics)'],
  [/\bmotor\s*cycles?\b|\bmotor\s*bikes?\b/,/parts?\b|helmet|tyre|tire|chain|batter|oil|cover|accessor/,['8711'],'heading 8711 (motorcycles)'],
  [/\bsugar\b/,/free|confection|candy|machine|mill|cane juice|substitute|bag|sachet/,['1701','1702'],'heading 1701 or 1702 (sugar)'],
  [/\brice\b/,/machine|cooker|bran|paper|husk|mill|flour|bag/,['1006'],'heading 1006 (rice)'],
  [/\bpalm\s+(oil|olein)\b/,/soap|fatty acid/,['1511'],'heading 1511 (palm oil)'],
  [/\bsoya?\s*bean\s+oil\b/,null,['1507'],'heading 1507 (soyabean oil)'],
  [/\burea\b/,/formaldehyde|resin|moulding/,['3102'],'heading 3102 (nitrogen fertiliser)'],
  [/\bdiesel\b/,/engine|generator|pump|filter|parts?\b|injector|nozzle|loader|truck|vehicle|additive/,['2710'],'heading 2710 (petroleum oils)'],
  [/\bblankets?\b/,/electric|fire|insulation/,['6301'],'heading 6301 (blankets)'],
  [/\b(footwear|shoes)\b/,/polish|lace|sole|parts?\b|rack|brush|box|machine|horn|cover|upper/,['64'],'chapter 64 (footwear)']
];
function hsRule(desc){ for(var i=0;i<HS_RULES.length;i++){ var r=HS_RULES[i]; if(r[0].test(desc)&&!(r[1]&&r[1].test(desc))) return {hs:r[2],say:r[3]}; } return null; }
function runChecks(pages,meta){
  var flags=[], gds=[], pqs=[], invs=[], vehs=[], docs=[], labels=[], seen={};
  pages.forEach(function(p,i){
    var add=function(l,n,t,d){ flags.push({l:l,n:n,t:t,d:d||'',p:i+1}); };
    var key=p.type==='gd'&&p.gd?'gd:'+conf(String(p.gd.machine_no||'').replace(/\s+/g,'')):(p.type==='pq'&&p.pq?'pq:'+conf(String(p.pq.ro_no||'').replace(/\s+/g,''))+'|'+String(p.pq.gd_no||'').replace(/\D/g,''):'');
    if(key.length>4){ if(seen[key]){ add('skip',0,'Page '+(i+1)+' is another photo of the same paper as page '+seen[key],'Only the first photo of each paper is checked.'); return; } seen[key]=i+1; }
    if(p.type==='gd'&&p.gd){ gds.push({g:p.gd,info:checkGD(p.gd,add),p:i+1}); }
    else if(p.type==='pq'&&p.pq){ pqs.push({q:p.pq,p:i+1}); if(!p.pq.gd_no) add('amber',19,'Release order does not show a GD number','Could not read the GD number on the release order.'); }
    else if(p.type==='inv'&&p.inv){ invs.push({v:p.inv,p:i+1}); }
    else if(p.type==='veh'){ var reg=String((p.veh||{}).reg_no||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
      if(reg.length>=3){ if(!vehs.some(function(x){return x.replace(/[^A-Z0-9]/g,'')===reg;})) vehs.push(String(p.veh.reg_no).trim().toUpperCase().slice(0,20)); add('ok',37,'Vehicle number recorded',String(p.veh.reg_no)); }
      else add('amber',37,'Vehicle number could not be read','Retake the photo with the number plate sharp and filling the frame.'); }
    else if(p.type==='doc'){ docs.push({d:p.doc||{},p:i+1,name:String((p.doc||{}).title||p.what||'document')}); add('skip',0,'Other document kept on file',p.what||(p.doc||{}).title||''); }
    else if(p.type==='goods'){ var gl=p.goods||{}; if(String(gl.product||gl.label_text||'').trim().length>=4||gl.made_in||gl.mfg_date) labels.push({g:gl,p:i+1}); }
    else if(p.type==='unread') add('amber',0,'Photo could not be read',p.err||'Retake the photo and upload again.');
    else add('skip',0,'Page is not a GD, a release order or a sales tax invoice',p.what||'');
  });
  var add=function(l,n,t,d){ flags.push({l:l,n:n,t:t,d:d||'',p:0}); };
  var G=gds[0];
  // What is printed on the packing, compared with what the GD says the goods are.
  // Marks on the packing that the paper cannot fake: where it says it was made, and when.
  if(G&&labels.length){ var seenMk={}, itsO=(Array.isArray(G.g.items)?G.g.items:[]).map(function(it){ return String(it.origin||''); }).filter(Boolean);
    labels.forEach(function(L){ var mi=String(L.g.made_in||'').trim(), md=String(L.g.mfg_date||'').trim();
      if(mi.length>=3&&itsO.length&&!seenMk['o'+mi.toLowerCase()]){ seenMk['o'+mi.toLowerCase()]=1; var okO=itsO.some(function(o){ return same(mi,o)||(/prc|china/i.test(mi)&&/china/i.test(o)); });
        if(okO) flags.push({l:'ok',n:47,t:'Country printed on the packing agrees with the GD',d:'Packing says "'+mi+'".',p:L.p}); else flags.push({l:'amber',n:47,t:'Packing says made in '+mi+', the GD says origin '+itsO[0],d:'Goods of another country are being carried under this GD, or the packing has been reused. Open the packages and check the goods themselves.',p:L.p}); }
      if(md&&G.info.gdDate!=null&&!seenMk['d'+md]){ seenMk['d'+md]=1; var t=pd(md); if(t==null){ var mm=md.match(/(\d{1,2})\D{1,3}(\d{4})/); if(mm) t=Date.UTC(+mm[2],+mm[1]-1,1); }
        if(t!=null){ if(t>G.info.gdDate+864e5) flags.push({l:'red',n:48,t:'Goods were made after the GD was filed',d:'Packing shows manufacture or packing date '+md+'. The GD is dated '+dstr(G.info.gdDate)+'. Goods made after the GD cannot have been imported under it.',p:L.p}); else flags.push({l:'ok',n:48,t:'Date on the packing is before the GD date',d:'Packing date '+md+', GD '+dstr(G.info.gdDate)+'.',p:L.p}); } } });
  }
  if(G&&labels.length){ var LSTOP=/^(super|export|quality|premium|best|brand|product|produce|made|china|pakistan|iran|india|weight|gross|kilogram|grams?|fresh|natural|pure|special|grade|class|packed|packing|carton|cartons|bags?|company|trading|traders|enterprises|limited|private|store|keep|handle|care|fragile|this|side|with|from|100)$/;
    var ltok=function(t){ return String(t||'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(function(x){ return x.length>=4; }).map(function(x){ return x.replace(/(ies)$/,'y').replace(/s$/,''); }).filter(function(x){ return !LSTOP.test(x); }); };
    var KERN=/kern|kernal|shelled|giri|magaz/i, INSH=/in\s*-?\s*shells?|unshelled|with\s+shell|whole/i, kind=function(t){ return INSH.test(t)?'S':(KERN.test(t)?'K':''); };
    var its=(Array.isArray(G.g.items)?G.g.items:[]).map(function(it){ var d=String(it.description||''); return {d:d,t:ltok(d),k:kind(d)}; }), doneL={};
    labels.forEach(function(L){ var name=String(L.g.product||'').trim()||String(L.g.label_text||'').trim().slice(0,60), key=name.toLowerCase(); if(doneL[key]) return; doneL[key]=1;
      var lt=ltok(L.g.product).concat(ltok(L.g.label_text)).filter(function(x){ return !/^(shell|shelled|kernel|kernal)$/.test(x); }), lk=kind(String(L.g.product||'')+' '+String(L.g.label_text||''));
      if(String(L.g.product||L.g.label_text||'').trim().length<4) return;
      if(!lt.length||!its.length) return;
      var share=its.filter(function(it){ return lt.some(function(x){ return it.t.indexOf(x)>=0; }); });
      var good=share.filter(function(it){ return !(lk&&it.k&&lk!==it.k); });
      var extra=(L.g.net_wt_each?' Each package is marked '+L.g.net_wt_each+'.':'');
      if(good.length) flags.push({l:'ok',n:45,t:'Printing on the packing agrees with the GD',d:'Packing says "'+name+'". GD lists "'+good[0].d.split('=')[0].trim()+'".'+extra,p:L.p});
      else if(share.length) flags.push({l:'amber',n:45,t:'Packing is marked '+(lk==='K'?'shelled (kernel)':'in shell')+' but the GD lists it '+(lk==='K'?'in shell':'shelled'),d:'Packing says "'+name+'". GD lists "'+share[0].d.split('=')[0].trim()+'". Open the packages and enter what is inside.'+extra,p:L.p});
      else flags.push({l:'amber',n:45,t:'Printing on the packing does not match the goods on the GD',d:'Packing says "'+name+'". GD lists: '+its.map(function(it){ return it.d.split('=')[0].trim(); }).join('; ')+'. Packing can be reused, so open the packages and enter what is inside.'+extra,p:L.p}); });
  }
  docs.forEach(function(x){ var d=x.d, at=function(l,n,t,dd){ flags.push({l:l,n:n,t:t,d:dd||'',p:x.p}); }, an=function(v){ return conf(String(v||'').replace(/[^A-Z0-9]/gi,'').toUpperCase()); };
    var dv=an(d.vehicle_no);
    if(dv.length>=4&&vehs.length){ if(vehs.some(function(v){ return an(v)===dv; })) at('ok',39,'Vehicle on the '+x.name+' is the vehicle photographed',String(d.vehicle_no)); else at('red',39,'Vehicle on the '+x.name+' is not the vehicle photographed','Document shows '+d.vehicle_no+'. Photographed: '+vehs.join(', ')+'.'); }
    if(!G) return;
    var dg=an(d.gd_no), dn=num(String(d.gd_no||'').replace(/\D/g,'')), mn=an(G.info.mn);
    if(dg.length>=3){ var hit=gds.some(function(y){ var m=an(y.info.mn); return (m&&(dg.indexOf(m)>=0||m.indexOf(dg)>=0))||(dn!=null&&dn===y.info.serial); });
      if(hit) at('ok',38,'The '+x.name+' quotes this GD',''); else at('red',38,'The '+x.name+' quotes a different GD','It quotes '+d.gd_no+'. The GD scanned is '+(G.info.mn||G.info.serial||'?')+'.'); }
    var qs=String(d.quantity||''), qm=qs.replace(/,/g,'').match(/([\d.]+)\s*(kgs?|kilo\w*|m\.?t\.?|tons?|tonnes?)\b/i);
    if(qm&&G.info.qty!=null){ var kg=parseFloat(qm[1])*(/^k/i.test(qm[2])?1:1000);
      if(isFinite(kg)&&kg>0){ if(kg>G.info.qty*1.02) at('red',38,'The '+x.name+' shows more goods than the GD covers','Document '+fmt(kg)+' kg, GD '+fmt(G.info.qty)+' kg.'); else at('ok',38,'Quantity on the '+x.name+' is within the GD quantity',fmt(kg)+' kg'); } }
    if(/bilty|builty|bill of lading|lorry|consignment|challan|delivery|packing|gate pass|invoice/i.test(x.name)&&d.parties&&G.g.importer){
      var w=String(G.g.importer).toUpperCase().replace(/[^A-Z0-9 ]/g,' ').split(/\s+/).filter(function(t){ return t.length>2&&!/^(PVT|LTD|LIMITED|PRIVATE|AND|THE|CO|COMPANY|TRADERS|TRADING|ENTERPRISES|INTERNATIONAL)$/.test(t); }), P=String(d.parties).toUpperCase();
      if(w.length&&!w.some(function(t){ return P.indexOf(t)>=0; })) at('amber',38,'Importer on the GD is not named on the '+x.name,'GD importer: '+G.g.importer+'. Document names: '+d.parties+'.'); }
  });
  pqs.forEach(function(x){ var q=x.q; if(!G){ add('amber',19,'No GD scanned with this release order','Scan the GD it quotes: '+(q.gd_no||'?')+' dated '+(q.gd_date||'?')+'.'); return; }
    var hit=gds.filter(function(y){ var s=num(String(q.gd_no||'').replace(/\D/g,'')); return s!=null&&s===y.info.serial&&(pd(q.gd_date)==null||pd(q.gd_date)===y.info.gdDate); })[0];
    if(q.gd_no&&!hit){ // A release order for some other consignment proves nothing about this GD either way. It is set aside, and the holder is asked which consignment the goods belong to.
      add('amber',19,'Release order is for a different consignment','It quotes GD '+q.gd_no+' dated '+(q.gd_date||'?')+(q.importer?', importer '+q.importer:'')+'. The GD scanned is '+(G.info.serial||'?')+' dated '+dstr(G.info.gdDate)+(G.g.importer?', importer '+G.g.importer:'')+'. This paper does not support this GD. Ask which consignment the goods come from, and for the invoice of the importer they were bought from.'); return; }
    if(q.gd_no) add('ok',19,'Release order quotes this GD','');
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
  if(G&&!pqs.length&&G.info.plant) add('skip',19,'Plant quarantine release order not shown','It is needed to clear plant and food goods at import, but is not normally carried with a load inland. Ask for it only if other points raise doubt.');
  if(G&&meta&&meta.seller){ var s=same(meta.seller,G.g.importer); if(s===false) add('amber',22,'Seller is not the importer on the GD','Seller: '+meta.seller+'. Importer: '+G.g.importer+'. Ask for the sale invoices that link them.'); else if(s) add('ok',22,'Seller is the importer on the GD',''); }
  var digits=function(x){ return String(x||'').replace(/\D/g,''); };
  if(G){ var gi=G.info, g0=G.g, taken=meta&&meta.takenAt?Date.parse(meta.takenAt):NaN;
    if(gi.gdDate!=null&&!isNaN(taken)){ var days=Math.floor((taken-gi.gdDate)/864e5);
      if(days<-1) add('red',30,'GD is dated after the day it was photographed','GD date '+dstr(gi.gdDate)+'.');
      else if(days>90) add('amber',30,'GD is '+days+' days old','Importers do sell stock over weeks, so an older GD is not wrong in itself. After three months, ask for the sales tax invoice for this load and check the running total on the GD. Ask when and how the goods travelled.');
      else add('ok',30,'GD is recent',days+' day'+(days===1?'':'s')+' old'); }
    var its=Array.isArray(g0.items)?g0.items:[], paid={}; its.forEach(function(it){ (Array.isArray(it.levies)?it.levies:[]).forEach(function(x){ var c=String(x.code||'').toUpperCase(); paid[c]=(paid[c]||0)+(num(x.amount_pkr)||0); }); });
    if((/^GBS/.test(gi.mn)||/sust|sost/i.test(String(g0.customs_office||'')))&&its.length){
      if(!(paid.ST>0)&&!(paid.IT>0)){ var loc=String(meta&&meta.location||''), inGB=/gilgit|sost|sust|hunza|skardu|baltistan|chilas|ghizer|astore|nagar|diamer|gahkuch|khunjerab/i.test(loc);
        add(loc&&!inGB?'red':'amber',34,'No sales tax or income tax was paid on this Sost GD','Goods cleared tax-free at Sost are for use inside Gilgit-Baltistan only. '+(loc&&!inGB?'This file was captured at '+loc+'.':'Confirm where the goods are being sold.')); }
      else add('ok',34,'Sales tax and income tax were paid at import',''); } }
  invs.forEach(function(x){ var iv=x.v; if(!G){ add('amber',31,'No GD scanned with this sales tax invoice','Scan the GD the invoice relies on.'); return; }
    var idt=pd(iv.date); if(idt!=null&&G.info.gdDate!=null){ if(idt<G.info.gdDate) add('red',31,'Sales tax invoice is dated before the GD','Invoice '+dstr(idt)+', GD '+dstr(G.info.gdDate)+'. An importer can only invoice goods after the GD is filed and the taxes are paid.'); else add('ok',31,'Invoice is dated after the GD',''); }
    var ss=same(iv.seller,G.g.importer), n1=digits(iv.seller_ntn).slice(0,7), n2=digits(G.g.ntn).slice(0,7);
    if(ss===false) add('amber',32,'Invoice seller is not the importer on the GD','Seller "'+iv.seller+'", importer "'+G.g.importer+'". Ask for every invoice in the chain back to the importer.');
    else if(ss&&n1&&n2&&n1!==n2) add('red',32,'Invoice shows a different NTN from the GD for the same firm','Invoice '+n1+', GD '+n2+'.');
    else if(ss) add('ok',32,'Invoice seller is the importer on the GD','');
    var iq=num(iv.quantity_kg); if(iq!=null&&G.info.qty!=null){ if(iq>G.info.qty*1.02) add('red',33,'Invoice sells more than the GD imported','Invoice '+fmt(iq)+' kg, GD '+fmt(G.info.qty)+' kg.'); else add('ok',33,'Invoice quantity is within the GD quantity',''); }
  });
  var off=num(meta&&meta.offeredKg); if(G&&off!=null&&G.info.qty!=null){ if(off>G.info.qty*1.02) add('red',25,'More is on offer than the GD covers','Offered '+fmt(off)+' kg, GD '+fmt(G.info.qty)+' kg.'); else add('ok',25,'Quantity on offer is within the GD quantity',''); }
  var v=flags.some(function(f){return f.l==='red';})?'red':(flags.some(function(f){return f.l==='amber';})?'amber':'ok');
  return {flags:flags,verdict:v,vehicles:vehs,
    gdNos:gds.map(function(x){return x.info.mn;}).filter(Boolean),
    containers:gds.map(function(x){return String(x.g.container||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();}).filter(Boolean)};
}

// Cross-file matches. Every key below is an "address" in the index: only files sharing that key are compared.
function dbFlags(cases){
  var out={}, U=function(s){ return String(s||'').replace(/[^A-Z0-9]/gi,'').toUpperCase(); };
  var put=function(c,f){ var L=(out[c.key]=out[c.key]||[]); if(!L.some(function(x){return x.n===f.n&&x.t===f.t;})) L.push(f); };
  var others=function(L,c){ var o=L.filter(function(x){return x!==c;}).map(function(x){return x.label;}).filter(Boolean); return o.length?' Other file'+(o.length>1?'s':'')+': '+o.slice(0,3).join('; ')+(o.length>3?' and more':'')+'.':''; };
  var uniq=function(L){ return Array.from(new Set(L)); };
  var byGd={}, byCt={}, byRo={}, byNtn={}, byName={}, byNear={}, byBand={}, vehOf={}, disp={}, D=function(k){ return disp[k]||k; };
  var add=function(map,k,v){ (map[k]=map[k]||[]).push(v); };
  cases.forEach(function(c){ c._gd=[]; var seen={};
    (c.pages||[]).forEach(function(p){
      if(p.type==='gd'&&p.gd){ var g=p.gd, mn=String(g.machine_no||'').replace(/\s+/g,'').toUpperCase(); var ck=conf(mn); if(!mn||seen[ck]) return; seen[ck]=1; disp[ck]=disp[ck]||mn; mn=ck;
        var items=Array.isArray(g.items)?g.items:[], q=0, ok=items.length>0; items.forEach(function(it){ var x=num(it.qty_kg); if(x==null) ok=false; else q+=x; });
        var m=mn.match(/-(\d{2})-(\d{2})-(\d{4})$/), date=pd(g.gd_date)||(m?pd(m[1]+'-'+m[2]+'-'+m[3]):null), ntn=String(g.ntn||'').replace(/\D/g,'').slice(0,7), ct=U(g.container);
        var G={mn:mn,qty:ok?q:null,date:date,ntn:ntn,name:g.importer}; c._gd.push(G); add(byGd,mn,c);
        if(ct) add(byCt,ct,{c:c,mn:mn});
        if(ntn.length>=5&&g.importer) add(byNtn,ntn,{c:c,name:g.importer});
        if(nm(g.importer).length>=3&&ntn.length>=5) add(byName,nm(g.importer),{c:c,ntn:ntn});
        if(ok&&date!=null&&(ntn||nm(g.importer))) add(byNear,(ntn||nm(g.importer))+'|'+q+'|'+date,{c:c,mn:mn}); }
      else if(p.type==='pq'&&p.pq){ var r=p.pq, no=U(r.ro_no); if(!no) return; var yr=(String(r.issue_date||r.inspection_date||r.gd_date||'').match(/\d{4}/)||[''])[0];
        add(byRo,no+'|'+U(r.place_of_issue)+'|'+yr,{c:c,quoted:String(r.gd_no||'').replace(/\D/g,''),label:r.ro_no}); } });
    vehOf[c.key]=(c.pages||[]).filter(function(p){return p.type==='veh'&&p.veh;}).map(function(p){return U(p.veh.reg_no);}).filter(function(x){return x.length>=3;});
    (c.hashes||[]).forEach(function(hh){ if(!/^[0-9a-f]{16}$/.test(hh||'')) return; for(var b=0;b<4;b++) add(byBand,b+':'+hh.substr(b*4,4),{c:c,h:hh}); });
  });
  Object.keys(byGd).forEach(function(k){ var L=uniq(byGd[k]); if(L.length<2) return; L.forEach(function(c){ put(c,{l:'red',n:23,t:'Same GD number appears in '+(L.length-1)+' other file'+(L.length>2?'s':''),d:D(k)+'. One GD covers one consignment. Compare seller, goods and quantity.'+others(L,c),p:0}); }); });
  Object.keys(byGd).forEach(function(k){ var L=uniq(byGd[k]), regs=[]; L.forEach(function(c){ vehOf[c.key].forEach(function(r){ if(regs.indexOf(r)<0) regs.push(r); }); });
    var withVeh=L.filter(function(c){return vehOf[c.key].length;}); if(regs.length<2||withVeh.length<2) return;
    withVeh.forEach(function(c){ put(c,{l:'amber',n:35,t:'The same GD was photographed with different vehicles',d:D(k)+' appears with '+regs.slice(0,4).join(', ')+'. One GD normally travels on one vehicle. Ask why.'+others(withVeh,c),p:0}); }); });
  Object.keys(byCt).forEach(function(k){ var L=byCt[k], gd=uniq(L.map(function(x){return x.mn;})); if(gd.length<2) return; uniq(L.map(function(x){return x.c;})).forEach(function(c){ put(c,{l:'amber',n:24,t:'Same container appears on different GDs',d:k+' is on '+gd.map(D).join(', ')+'.',p:0}); }); });
  Object.keys(byGd).forEach(function(k){ var L=uniq(byGd[k]), qty=null; L.forEach(function(c){ c._gd.forEach(function(g){ if(g.mn===k&&g.qty!=null&&qty==null) qty=g.qty; }); });
    var offers=L.filter(function(c){ return num(c.offeredKg)>0; }); if(qty==null||offers.length<2) return; var sum=0; offers.forEach(function(c){ sum+=num(c.offeredKg); });
    if(sum>qty*1.02) offers.forEach(function(c){ put(c,{l:'red',n:25,t:'This GD is oversold across files',d:offers.length+' files offer '+fmt(sum)+' kg in total under '+D(k)+', which covers '+fmt(qty)+' kg.'+others(offers,c),p:0}); }); });
  Object.keys(byRo).forEach(function(k){ var L=byRo[k], cs=uniq(L.map(function(x){return x.c;})); if(cs.length<2) return;
    var quoted=uniq(L.map(function(x){return x.quoted;}).filter(Boolean)), sets=uniq(cs.map(function(c){ return c._gd.map(function(g){return D(g.mn);}).sort().join('+'); }).filter(Boolean));
    cs.forEach(function(c){ var lab=L[0].label;
      if(quoted.length>1) put(c,{l:'red',n:26,t:'Same release order shows different GD numbers in different files',d:'Release order '+lab+' quotes GD '+quoted.join(' and ')+'. One of them has been altered or misread.'+others(cs,c),p:0});
      else if(sets.length>1) put(c,{l:'red',n:26,t:'Same release order is presented with different GDs',d:'Release order '+lab+' is filed with '+sets.join(' and ')+'.'+others(cs,c),p:0});
      else put(c,{l:'amber',n:26,t:'Same release order appears in '+(cs.length-1)+' other file'+(cs.length>2?'s':''),d:'Release order '+lab+'.'+others(cs,c),p:0}); }); });
  Object.keys(byNtn).forEach(function(k){ var L=byNtn[k], names=[]; L.forEach(function(x){ if(!names.some(function(n){ return same(n,x.name)!==false; })) names.push(x.name); }); if(names.length<2) return;
    uniq(L.map(function(x){return x.c;})).forEach(function(c){ put(c,{l:'amber',n:27,t:'Same NTN appears under different importer names',d:'NTN '+k+': '+names.slice(0,4).join(' / ')+'. One may be a misread, or a name is being used without its owner.',p:0}); }); });
  Object.keys(byName).forEach(function(k){ var L=byName[k], ns=uniq(L.map(function(x){return x.ntn;})); if(ns.length<2) return;
    uniq(L.map(function(x){return x.c;})).forEach(function(c){ put(c,{l:'amber',n:27,t:'Same importer name appears with different NTNs',d:ns.slice(0,4).join(' / ')+'.',p:0}); }); });
  Object.keys(byNear).forEach(function(k){ var L=byNear[k], gd=uniq(L.map(function(x){return x.mn;})); if(gd.length<2) return;
    uniq(L.map(function(x){return x.c;})).forEach(function(c){ put(c,{l:'amber',n:28,t:'Near-duplicate of another file with a different GD number',d:'Same importer, same quantity and same date, but GD numbers '+gd.map(D).join(' and ')+'. Check whether one is an altered copy or a misread.',p:0}); }); });
  var ham=function(a,b){ var d=0; for(var i=0;i<16;i+=4){ var x=parseInt(a.substr(i,4),16)^parseInt(b.substr(i,4),16); while(x){ d+=x&1; x>>=1; } } return d; }, done={};
  Object.keys(byBand).forEach(function(k){ var L=byBand[k]; if(L.length<2||L.length>60) return;
    for(var i=0;i<L.length;i++) for(var j=i+1;j<L.length;j++){ var A=L[i],B=L[j]; if(A.c===B.c) continue; var id=A.c.key<B.c.key?A.c.key+'|'+B.c.key:B.c.key+'|'+A.c.key; if(done[id]) continue; if(ham(A.h,B.h)>3) continue; done[id]=1;
      put(A.c,{l:'amber',n:29,t:'The same photo was uploaded in another file',d:'A forwarded picture is not the same as holding the paper. Ask to see the original.'+(B.c.label?' Other file: '+B.c.label+'.':''),p:0});
      put(B.c,{l:'amber',n:29,t:'The same photo was uploaded in another file',d:'A forwarded picture is not the same as holding the paper. Ask to see the original.'+(A.c.label?' Other file: '+A.c.label+'.':''),p:0}); } });
  cases.forEach(function(c){ delete c._gd; });
  return out;
}
module.exports={runChecks:runChecks,dbFlags:dbFlags};
