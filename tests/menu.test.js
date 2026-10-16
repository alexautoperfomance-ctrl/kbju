// node tests/menu.test.js — генератор меню: допуски, исключения, разнообразие; печатает долю попаданий по нутриентам
global.self=global; require('../db.js'); require('../micro.js'); const MI=require('../micros.js'), ME=require('../menu.js');
let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
const PROF=[[{sex:'m',a:35},{k:2200,p:140,f:70,c:240}],[{sex:'f',a:30},{k:1700,p:100,f:55,c:190}],[{sex:'m',a:55},{k:2600,p:150,f:85,c:300}],[{sex:'f',a:45},{k:1500,p:110,f:50,c:150}]];
const EXS=[{meals:5},{meals:4,excl:['рыба']},{meals:5,excl:['молочное']},{meals:3,excl:['свинина','глютен']},{meals:5,simple:true},{meals:4,excl:['мясо']}];
const hit={}, tot={}; let days=0, t0=Date.now(), macroAll=0;
for(const [prof,goals] of PROF) for(const opt of EXS){ const ctx={foods:self.FOODS,MICRO:self.MICRO,MK:self.MK,norms:MI.norms(prof),goals};
  const w=ME.genWeek(ctx,opt); as(w.length===7,'7 дней');
  w.forEach((d,i)=>{ days++; const items=[].concat(...d.meals.map(m=>m.items));
    Object.entries(d.check).forEach(([k,v])=>{ tot[k]=(tot[k]||0)+1; hit[k]=(hit[k]||0)+(v?1:0) }); if(d.check.k&&d.check.p&&d.check.f&&d.check.c)macroAll++;
    as(items.every(x=>x.g%5===0&&x.g>=x.lo&&x.g<=x.hi),'граммы кратны 5 и в границах');
    as(d.meals.length===ME.mealsFor(opt.meals).length,'число приёмов '+opt.meals);
    (opt.excl||[]).forEach(e=>as(!items.some(x=>ME.EXCL[e](x.n)),'исключено '+e+': '+items.map(x=>x.n)));
    as(!d.micro.some(m=>m.t==='lim'&&m.amt>(m.ul||m.norm)),'лимиты (Na, сахар, холестерин) не превышены');
    as(!d.micro.some(m=>m.t!=='lim'&&m.ul&&m.amt>m.ul),'верхние пределы не превышены');
    if(i){ const main=x=>/brk|soup|meat|fish/.test(x.grp), prev=new Set([].concat(...w[i-1].meals.map(m=>m.items)).filter(main).map(x=>x.n)); as(!items.filter(main).some(x=>prev.has(x.n)),'основное блюдо не повторяется в соседний день') }
    ME.notes(d).forEach(n=>as(n.pct<100&&n.t.length>5,'честная заметка о недоборе')) });
  const prot=new Set(), side=new Set(); w.forEach(d=>d.meals.forEach(m=>m.items.forEach(x=>{ if(/meat|fish/.test(x.grp))prot.add(x.n); if(x.grp==='side')side.add(x.n) })));
  as(prot.size>=6&&side.size>=4,'разнообразие за неделю: белок '+prot.size+', гарниры '+side.size) }
// замена и пересчёт
{ const ctx={foods:self.FOODS,MICRO:self.MICRO,MK:self.MK,norms:MI.norms({sex:'m',a:35}),goals:{k:2200,p:140,f:70,c:240}}; const w=ME.genWeek(ctx,{meals:5});
  const d=JSON.parse(JSON.stringify(w[0])), n0=d.meals[2].items[2].n; ME.swapItem(ctx,{meals:5},d,2,2,5); as(d.meals[2].items[2].n!==n0,'замена позиции'); as(d.check.k,'после замены калории в допуске');
  const d2=ME.regenDay(ctx,{meals:5},w,0,123); as(JSON.stringify(d2.meals)!==JSON.stringify(w[0].meals),'другой вариант дня');
  as(JSON.stringify(ME.genWeek(ctx,{meals:5}).map(x=>x.meals))===JSON.stringify(w.map(x=>x.meals)),'детерминированность (стабильная неделя)') }
const rate=k=>Math.round(hit[k]/tot[k]*100);
console.log(`\nдней: ${days}, ${Math.round((Date.now()-t0)/days)} мс/день; калории+БЖУ все в допуске: ${Math.round(macroAll/days*100)}%`);
console.log('попадания, %: '+Object.keys(tot).map(k=>k+' '+rate(k)).join(' · '));
as(rate('k')>=95,'калории ±3% ≥95% дней'); ['p','f','c'].forEach(k=>as(rate(k)>=90,k+' ±5% ≥90% дней'));
console.log(`${ok} passed, ${bad} failed`); process.exit(bad?1:0);
