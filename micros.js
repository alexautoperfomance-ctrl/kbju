// Витамины и минералы: нормы (МР 2.3.1.0253-21; где нет — EFSA/NIH), суммирование, дефициты. Чистые функции.
(function(G){'use strict';
const R=Math.round;
// key, название, ед., норма(sex,age), верхний предел (UL; null), тип: 'n' норма, 'lim' — ограничить, роль
const DEF=[
 ['A','Витамин A','мкг',(s)=>s==='f'?800:900,3000,'n','зрение, кожа, иммунитет'],
 ['D','Витамин D','мкг',(s,a)=>a>=65?20:15,100,'n','кости и зубы, усвоение кальция, иммунитет'],
 ['E','Витамин E','мг',()=>15,300,'n','антиоксидант, защищает клетки от окисления'],
 ['K','Витамин K','мкг',()=>120,null,'n','свёртываемость крови и здоровье костей'],
 ['C','Витамин C','мг',()=>100,2000,'n','иммунитет, коллаген, усвоение железа'],
 ['B1','B1 тиамин','мкг',()=>1500,null,'n','энергообмен и работа нервной системы'],
 ['B2','B2 рибофлавин','мкг',()=>1800,null,'n','энергообмен, кожа и слизистые'],
 ['B3','B3 (PP) ниацин','мг',()=>20,null,'n','энергообмен, кожа, нервная система'],
 ['B5','B5 пантотеновая','мг',()=>5,null,'n','синтез гормонов и обмен жиров'],
 ['B6','B6 пиридоксин','мкг',()=>2000,25000,'n','обмен белка, нервная система, кроветворение'],
 ['B7','B7 биотин','мкг',()=>50,null,'n','обмен жиров и углеводов, кожа, волосы'],
 ['B9','B9 фолаты','мкг',()=>400,null,'n','деление клеток и кроветворение'],
 ['B12','B12 кобаламин','мкг',()=>3,null,'n','кроветворение и нервная система'],
 ['Ch','Холин','мг',()=>500,3500,'n','печень, память, клеточные мембраны'],
 ['Ca','Кальций','мг',(s,a)=>a>=65?1200:1000,2500,'n','кости, зубы, мышцы и нервы'],
 ['P','Фосфор','мг',()=>700,4000,'n','кости и энергетический обмен'],
 ['Mg','Магний','мг',(s)=>s==='f'?400:420,null,'n','мышцы, нервы, сердце, сон'],
 ['K_','Калий','мг',()=>3500,null,'n','давление, сердце, водный баланс'],
 ['Na','Натрий','мг',()=>1300,2300,'lim','водный баланс; избыток повышает давление'],
 ['Fe','Железо','мг',(s,a)=>s==='f'&&a<50?18:10,45,'n','перенос кислорода (гемоглобин)'],
 ['Zn','Цинк','мг',()=>12,25,'n','иммунитет, заживление, тестостерон'],
 ['Cu','Медь','мкг',()=>1000,5000,'n','кроветворение, соединительная ткань'],
 ['Mn','Марганец','мкг',()=>2000,11000,'n','обмен веществ, кости, антиоксидантная защита'],
 ['Se','Селен','мкг',(s)=>s==='f'?55:70,300,'n','щитовидная железа, антиоксидант'],
 ['I','Йод','мкг',()=>150,600,'n','гормоны щитовидной железы'],
 ['Cr','Хром','мкг',()=>40,null,'n','обмен углеводов, чувствительность к инсулину'],
 ['Fib','Клетчатка','г',(s)=>s==='f'?20:25,null,'n','пищеварение, сытость, сахар крови'],
 ['O3','Омега-3','мг',(s)=>s==='f'?1100:1600,null,'n','сердце, сосуды, мозг'],
 ['Sug','Сахара','г',()=>50,50,'lim','общие сахара; лучше до 50 г в день'],
 ['Chol','Холестерин','мг',()=>300,300,'lim','избыток — риск для сосудов']];
function norms(prof){ const s=(prof&&prof.sex)||'m', a=(prof&&prof.a)||35; return DEF.map(([k,n,u,f,ul,t,role])=>({k,n,u,norm:f(s,a),ul,t,role})) }
// вектор микронутриентов записи: из записи (m100) или из базы по названию
function vec(e,lookup){ const m=e.m100||(lookup&&lookup(e.name)); if(!m)return null; return m.map(x=>(+x||0)*e.g/100) }
function sum(entries,lookup,K){ const t=new Array(K.length).fill(0); let covered=0,tot=0; entries.forEach(e=>{ tot+=e.k||0; const v=vec(e,lookup); if(v){covered+=e.k||0; v.forEach((x,i)=>t[i]+=x)} }); return {t,cov:tot?covered/tot:1} }
function analyze(days,prof,K,lookup){ // days: [[entries]...] → среднее за день с записями
  const act=days.filter(d=>d.length), N=Math.max(1,act.length), acc=new Array(K.length).fill(0); let cov=0;
  act.forEach(d=>{const s=sum(d,lookup,K);s.t.forEach((x,i)=>acc[i]+=x);cov+=s.cov});
  const out=norms(prof).map(d=>{ const i=K.indexOf(d.k), amt=i>=0?acc[i]/N:0, pct=d.norm?amt/d.norm*100:0;
    const st=d.t==='lim'?(amt>(d.ul||d.norm)?'over':'ok'):(d.ul&&amt>d.ul?'over':pct<70?'low':'ok'); return Object.assign(d,{amt,pct,st}) });
  const rank=x=>x.st==='low'?x.pct:x.st==='over'?200:1000+x.pct; out.sort((a,b)=>rank(a)-rank(b));
  return {list:out,days:act.length,cov:act.length?cov/act.length:1} }
// продукты, богатые нутриентом (на типичную порцию)
const SKIP=/протеин|гейнер|дрожж|желатин|специи|соль|сахарозамен|печень|ливерн|паштет|сазан|нельма|муксун|омуль|облепиха|фейхоа|сухая|сухой|сухие|какао|отруби|снежок|бифидок|яичниц|омлет|копчен|соленая|консервир|хлопья/, FAM=/^(скумбрия|лосось|горбуша|сельдь|яйцо|творог|молоко|кефир|гречка|овсянка|чечевица|фасоль|шпинат|брокколи|морковь|апельсин|киви|перец болгарский|капуста|говядина|куриная грудка|индейка|треска|минтай|тыквенные|миндаль|грецкие|банан|картофель|сыр российский|йогурт|свекла|смородина|печень)/, CATS=/^(meat|fish|fishready|egg|dairy|dairyfix|veg|fruit|nut|grain)$/;
function rich(key,foods,K,MICRO,n){ const i=K.indexOf(key); if(i<0)return[]; return foods.filter(f=>f.src==='base'&&CATS.test(f.cat||'')&&!SKIP.test(f.n)&&MICRO[f.n]&&(!G.MSRC||G.MSRC[f.n]!=='e')).map(f=>{const g=f.pc&&f.pc<=250?f.pc:(f.po||100);return {f,g,amt:MICRO[f.n][i]*g/100,sc:MICRO[f.n][i]*g/100*(FAM.test(f.n)?1.6:1)}}).sort((a,b)=>b.sc-a.sc).slice(0,n||5) }
function acc(n){ const w=n.split(' '), nf=x=>x.replace(/ия$/,'ию').replace(/([^иь])я$/,'$1ю').replace(/([^о])а$/,'$1у'), af=x=>x.replace(/ая$/,'ую').replace(/яя$/,'юю').replace(/ья$/,'ью');
  if(/(ая|яя|ья)$/.test(w[0])){ w[0]=af(w[0]); if(w[1])w[1]=nf(w[1]) } else { w[0]=nf(w[0]); if(w[1]&&/(ая|яя|ья)$/.test(w[1]))w[1]=af(w[1]) } return w.join(' ') }
const pcs=(f,g)=>f.pc&&f.pc<=250&&f.pc>=40&&!f.pl?R(g/f.pc)+' шт':R(g/10)*10+' г';
function gapAdvice(d,foods,K,MICRO){ const need=d.norm-d.amt; const r=rich(d.k,foods,K,MICRO,8).filter((x,j,a)=>a.findIndex(y=>y.f.n.split(' ')[0]===x.f.n.split(' ')[0])===j).slice(0,2);
  const opt=r.map(x=>{ const per=MICRO[x.f.n][K.indexOf(d.k)]/100; let g=Math.min(x.g*1.5,need/Math.max(per,1e-6)); g=Math.max(x.f.pc&&x.f.pc>=40?x.f.pc:30,g); return `${acc(x.f.n.toLowerCase())} ${pcs(x.f,g)}` });
  const tail=/^(D|B12|Fe|I)$/.test(d.k)?'; при долгом дефиците обсуди с врачом анализы и добавки':'';
  return `${d.n} ${R(d.pct)}% нормы — добавь ${opt.join(' или ')}${tail}` }
const fmt=d=>`${R(d.amt)} ${d.u}`;
const M={acc,DEF,norms,analyze,rich,gapAdvice,vec,sum,fmt};
if(typeof module!=='undefined'&&module.exports)module.exports=M; else G.MICROS=M;
})(typeof self!=='undefined'?self:this);
