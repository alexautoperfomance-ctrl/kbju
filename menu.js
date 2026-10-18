// Генератор сбалансированного меню: шаблоны приёмов пищи + оптимизация граммов и выбора (офлайн)
(function(G){
const R=Math.round;
// группы продуктов: [название, мин г, макс г, типичная г]
const P={
 brk:[['овсянка',150,300,220],['гречка',120,250,180],['пшенка',150,280,200],['творог 5%',100,250,180],['яйцо вареное',50,150,100],['омлет',100,220,150],['сырники',100,200,150],['рисовая каша на молоке',150,280,200],['овсянка на молоке',150,300,220]],
 fruit:[['яблоко',100,250,180],['банан',80,200,120],['апельсин',100,260,150],['киви',70,210,140],['груша',100,250,180],['мандарин',75,230,150],['клубника',100,250,150],['черника',80,200,120],['смородина черная',60,200,100],['хурма',100,220,170],['грейпфрут',120,300,200],['персик',100,250,150]],
 soup:[['борщ',250,350,300],['щи',250,350,300],['суп куриный',250,350,300],['суп гороховый',250,350,300],['суп овощной',250,350,300],['суп рассольник',250,350,300],['уха',250,350,300],['суп грибной',250,350,300],['суп с фрикадельками',250,350,300]],
 side:[['гречка',100,250,180],['рис бурый',100,250,170],['булгур',100,250,170],['перловка',100,250,170],['макароны из твердых сортов',100,230,160],['картофель отварной',120,300,200],['пюре картофельное',120,280,200],['киноа',100,220,160],['чечевица',100,220,150],['нут',100,200,140],['фасоль вареная',100,200,140],['пшенка',100,250,170]],
 meat:[['куриная грудка',100,200,150],['филе индейки',100,200,150],['говядина',90,180,130],['телятина',100,200,150],['свиная вырезка',100,180,130],['кролик',100,200,150],['говяжья печень',60,120,100],['куриная печень',60,120,100],['котлета куриная',80,180,120],['гуляш',120,250,180],['тефтели',100,220,160]],
 fish:[['горбуша',100,200,150],['треска',120,250,170],['минтай',120,250,170],['хек',120,250,170],['скумбрия',80,160,120],['сельдь',60,130,90],['лосось',80,170,120],['кета',100,200,150],['тунец',90,170,120],['пикша',120,250,170],['кальмар',100,200,150],['креветки',100,200,150]],
 veg:[['салат из свежих овощей',100,300,200],['огурец',80,250,150],['помидор',80,250,150],['капуста белокочанная',80,250,150],['морковь',50,150,100],['брокколи',80,250,150],['перец болгарский',60,200,120],['шпинат',30,120,60],['капуста квашеная',60,200,100],['свекла',60,200,120],['кабачок',100,250,180],['капуста цветная',80,250,150],['рагу овощное',150,300,220],['винегрет',100,250,150],['морская капуста',30,120,60],['тыква',100,250,150],['фасоль стручковая',80,200,150]],
 dairy:[['кефир',150,300,250],['йогурт',120,250,150],['творог 5%',80,200,150],['ряженка',150,300,250],['молоко',150,300,250],['йогурт греческий',100,200,150]].concat([]),
 dairy0:[],
 add:[['хлеб цельнозерновой',0,90,40],['хлеб черный',0,90,40],['тыквенные семечки',0,40,15],['семечки подсолнечника',0,40,15],['грецкие орехи',0,40,20],['миндаль',0,40,20],['фундук',0,40,20],['кешью',0,40,20],['семена льна',0,25,10],['кунжут',0,20,10],['курага',0,50,25],['чернослив',0,50,25]],
 oil:[['масло подсолнечное',0,25,10],['масло оливковое',0,25,10],['сметана',0,40,15]],
 cheese:[['сыр российский',0,40,20],['сыр адыгейский',0,60,30],['брынза',0,50,25],['хлеб цельнозерновой',0,80,40]]};
// шаблоны: приём пищи → слоты (группы-кандидаты)
const T={'завтрак':[['brk'],['fruit'],['add','cheese']],'обед':[['soup'],['side'],['meat','fish'],['veg'],['oil']],'ужин':[['meat','fish'],['veg'],['veg'],['side'],['oil'],['cheese','dairy']],
 'перекус':[['dairy','fruit'],['add']],'перекус2':[['fruit'],['add']]};
const MAIN={brk:1,soup:1,meat:1,fish:1,side:1};
const EXCL={
 'рыба':n=>/^(горбуша|треска|минтай|хек|скумбрия|сельдь|лосось|кета|тунец|пикша|кальмар|креветки|уха|морская капуста)/.test(n),
 'мясо':n=>/^(курин|филе инд|говя|телят|свин|кролик|котлета|гуляш|тефтели|борщ|щи|суп куриный|суп гороховый|суп рассольник|суп с фрикад)/.test(n),
 'свинина':n=>/свин|гуляш|тефтели|суп гороховый|борщ/.test(n),
 'молочное':n=>/творог|кефир|йогурт|ряженка|молок|сыр|брынза|сметана|сырники|омлет/.test(n),
 'яйца':n=>/яйц|омлет|сырники/.test(n),
 'глютен':n=>/хлеб|макарон|булгур|перловка|сырники|тефтели|котлета/.test(n),
 'орехи':n=>/орех|миндаль|фундук|кешью/.test(n)};
const PRICY=/лосось|форель|креветки|киноа|телятина|кролик|клубника|черника|тунец|кальмар|йогурт греческий|кешью|миндаль|фундук|смородина|хурма|киви|говяжья печень/;
function rng(seed){ let a=seed>>>0||1; return ()=>{ a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296 } }
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function setup(ctx){ // ctx: {foods,MICRO,MK,norms,goals}
  const by={}; ctx.foods.forEach(f=>by[f.n]=f); const K=ctx.MK, NM=ctx.norms;
  const vec=n=>{ const f=by[n], m=ctx.MICRO[n]; if(!f||!m)return null; return [f.k,f.p,f.f,f.c].concat(NM.map(d=>{const i=K.indexOf(d.k);return i<0?0:(+m[i]||0)})).map(x=>x/100) };
  const V={}; Object.values(P).forEach(l=>l.forEach(([n])=>{ if(!V[n]){const v=vec(n); if(v)V[n]=v} }));
  const W={Ca:2.5,Ch:1.5,D:1.5,I:1.5,B7:.6,Cr:.6}; return {by,V,NM:NM.map(d=>Object.assign({},d,{w:W[d.k]||1}))} }
function lossOf(t,goal,NM){ let L=0; const md=[[t[0],goal.k,.02,3],[t[1],goal.p,.035,1.5],[t[2],goal.f,.035,1.5],[t[3],goal.c,.035,1.5]];
  for(const [a,b,tol,w] of md){ const e=(a-b)/b, x=Math.max(0,Math.abs(e)-tol); L+=w*(20*e*e+4000*x*x) }
  for(let j=0;j<NM.length;j++){ const d=NM[j], a=t[4+j];
    if(d.t==='lim'){ const u=d.ul||d.norm; if(a>u*.97){const x=(a-u*.97)/u; L+=400*x*x+(a>u?50:0)} continue }
    if(d.norm){ const r=a/d.norm; if(r<1.03){const x=1.03-r; L+=(d.w||1)*(12*x*x+(r<1?2+3*x:0))} }
    if(d.ul&&a>d.ul*.95){const x=(a-d.ul*.95)/d.ul; L+=400*x*x+(a>d.ul?50:0)} }
  return L }
function total(items,V,n){ const t=new Array(n).fill(0); items.forEach(it=>{ const v=it.v||V[it.n]; if(!v)return; for(let j=0;j<n;j++)t[j]+=v[j]*it.g }); return t }
const realism=items=>items.reduce((s,it)=>s+.15*((it.g-it.typ)/Math.max(30,it.typ))**2,0);
// подбор граммов: покоординатный спуск шагами 40/20/10/5 в границах
function fitGrams(items,ctx,S,passes){ const n=4+S.NM.length, t=total(items,S.V,n); let L=lossOf(t,ctx.goals,S.NM)+realism(items);
  for(const st of [40,20,10,5]){ for(let p=0;p<(passes||6);p++){ let imp=false;
    for(const it of items){ const v=it.v||S.V[it.n]; if(!v||it.v)continue; for(const s of [st,-st]){ const g2=it.g+s; if(g2<it.lo||g2>it.hi)continue;
      for(let j=0;j<n;j++)t[j]+=v[j]*s; const g0=it.g; it.g=g2; const L2=lossOf(t,ctx.goals,S.NM)+realism(items);
      if(L2<L-1e-9){L=L2;imp=true;break} it.g=g0; for(let j=0;j<n;j++)t[j]-=v[j]*s } }
    if(!imp)break } }
  return L }
function mealsFor(n){ return n<=3?['завтрак','обед','ужин']:n===4?['завтрак','обед','перекус','ужин']:['завтрак','перекус','обед','перекус2','ужин'] }
function poolFor(groups,opt,S){ const ex=(opt.excl||[]).map(e=>EXCL[e]).filter(Boolean);
  const out=[]; groups.forEach(gk=>P[gk].forEach(([n,lo,hi,typ])=>{ if(!S.V[n]||ex.some(f=>f(n))||(opt.simple&&PRICY.test(n)))return; out.push({n,lo:gk==='add'||gk==='cheese'?Math.max(lo,10):gk==='oil'?Math.max(lo,5):lo,hi,typ,grp:gk}) })); return out }
// разнообразие: штраф за повтор в соседний день / за неделю
function varPen(c,ctxV,meal){ if(!ctxV)return 0; let p=0; const k=c.n; if(ctxV.adj&&ctxV.adj.has(k))p+=MAIN[c.grp]?60:4; p+=(ctxV.week[k]||0)*(MAIN[c.grp]?3:1); return p }
function genDay(ctx,opt,seed,vctx){ let best=null; for(let r=0;r<3;r++){ const d=genDay1(ctx,opt,seed+r*104729,vctx); d.L=score(d,vctx); if(!best||d.L<best.L)best=d; if(ok(d))break } return best }
const ok=d=>d.check.k&&d.check.p&&d.check.f&&d.check.c&&Object.values(d.check).filter(x=>!x).length<=1;
function score(d,vctx){ return Object.entries(d.check).reduce((s,[k,v])=>s+(v?0:/^[kpfc]$/.test(k)?50:/^(Na|Sug|Chol)$/.test(k)?80:3),0)+d.meals.reduce((s,m)=>s+m.items.reduce((a,x)=>a+varPen(x,vctx),0),0)*.1 }
function genDay1(ctx,opt,seed,vctx){ const S=ctx.S||(ctx.S=setup(ctx)); const rnd=rng(seed); const meals=mealsFor(opt.meals||5);
  const slots=[]; meals.forEach(m=>T[m].forEach((groups,si)=>{ const pool=poolFor(groups,opt,S); if(pool.length)slots.push({m:m==='перекус2'?'перекус':m,mk:m,si,pool}) }));
  const pick=sl=>{ const used=new Set(slots.map(s=>s.it&&s.it.n)); const c=sl.pool.filter(c=>!used.has(c.n)); const w=c.map(x=>Math.exp(-varPen(x,vctx)/3)*(.5+rnd())); let b=0; w.forEach((x,i)=>{if(x>w[b])b=i}); return c[b] };
  slots.forEach(sl=>{ const c=pick(sl); sl.it=c?Object.assign({},c,{g:c.typ}):null }); for(let i=slots.length-1;i>=0;i--) if(!slots[i].it)slots.splice(i,1);
  const items=()=>slots.map(s=>s.it); let L=fitGrams(items(),ctx,S)+slots.reduce((s,x)=>s+varPen(x.it,vctx),0);
  // локальный поиск по выбору продуктов
  for(let round=0;round<5;round++){ let imp=false;
    for(const sl of slots){ const used=new Set(slots.map(s=>s.it.n)); const cands=sl.pool.filter(c=>!used.has(c.n)).sort(()=>rnd()-.5).slice(0,8);
      for(const c of cands){ const old=sl.it, snap=slots.map(s=>s.it.g); sl.it=Object.assign({},c,{g:c.typ});
        const L2=fitGrams(items(),ctx,S,3)+slots.reduce((s,x)=>s+varPen(x.it,vctx),0);
        if(L2<L-.01){L=L2;imp=true} else { sl.it=old; slots.forEach((s,i)=>s.it.g=snap[i]) } } }
    if(!imp)break }
  fitGrams(items(),ctx,S,10); return pack(slots,ctx,S) }
function repair(items,ctx,S){ const n=4+S.NM.length; for(let it=0;it<60;it++){ const t=total(items,S.V,n); let bad=-1;
    S.NM.forEach((d,j)=>{ const u=d.t==='lim'?(d.ul||d.norm):d.ul; if(u&&t[4+j]>u&&bad<0)bad=j });
    if(bad<0)return; let b=null,bv=0; items.forEach(x=>{ const v=(x.v||S.V[x.n])[4+bad]*x.g; if(v>bv&&x.g-5>=x.lo){bv=v;b=x} }); if(!b)return; b.g-=5 } }
function pack(slots,ctx,S){ repair(slots.map(s=>s.it),ctx,S); const meals=[]; slots.forEach(s=>{ if(s.it.g<5)return; let m=meals.find(x=>x.k===s.mk); if(!m)meals.push(m={k:s.mk,m:s.m,items:[]}); m.items.push({n:s.it.n,g:s.it.g,lo:s.it.lo,hi:s.it.hi,typ:s.it.typ,grp:s.it.grp,slot:s.mk+':'+s.si}) });
  return evalDay({meals},ctx) }
function evalDay(day,ctx){ const S=ctx.S||(ctx.S=setup(ctx)); const all=[].concat(...day.meals.map(m=>m.items)), n=4+S.NM.length, t=total(all,S.V,n);
  day.tot={k:t[0],p:t[1],f:t[2],c:t[3]}; day.micro=S.NM.map((d,j)=>({k:d.k,n:d.n,u:d.u,t:d.t,amt:t[4+j],norm:d.norm,ul:d.ul,pct:d.norm?t[4+j]/d.norm*100:0}));
  day.meals.forEach(m=>{ const mt=total(m.items,S.V,4); m.tot={k:mt[0],p:mt[1],f:mt[2],c:mt[3]} }); day.check=check(day,ctx.goals); return day }
function check(day,g){ const e=(a,b)=>Math.abs(a-b)/b, r={k:e(day.tot.k,g.k)<=.03,p:e(day.tot.p,g.p)<=.05,f:e(day.tot.f,g.f)<=.05,c:e(day.tot.c,g.c)<=.05};
  day.micro.forEach(m=>{ r[m.k]=m.t==='lim'?m.amt<=(m.ul||m.norm):(m.amt>=m.norm*.995&&(!m.ul||m.amt<=m.ul)) }); return r }
const NOTE={D:'витамин D трудно добрать едой — обсуди с врачом анализ и добавку',I:'йод — используй йодированную соль, морскую рыбу',B7:'биотин в базе учтён неполно — фактически его обычно больше',Cr:'хром в базе учтён неполно',
 O3:'омега-3 — нужна жирная рыба 2–3 раза в неделю',K_:'калий — больше овощей, картофеля, бобовых',Fib:'клетчатка — больше овощей, бобовых, цельных круп',Ca:'кальций — без молочного добрать трудно',B12:'B12 — без животных продуктов нужна добавка',E:'витамин E — орехи, семечки, растительное масло'};
function notes(day){ return day.micro.filter(m=>m.t!=='lim'&&m.norm&&m.amt<m.norm*.995).map(m=>({k:m.k,n:m.n,pct:m.pct,t:NOTE[m.k]||`${m.n} — не добрано едой в пределах калорий`})) }
function genWeek(ctx,opt){ const days=[], week={}; const base=opt.seed||hash(JSON.stringify([ctx.goals,opt.excl,opt.simple,opt.meals]));
  for(let i=0;i<7;i++){ const prev=days[i-1], adj=new Set(prev?[].concat(...prev.meals.map(m=>m.items.map(x=>x.n))):[]);
    const d=genDay(ctx,opt,base+i*7919,{adj,week}); d.seed=base+i*7919; [].concat(...d.meals.map(m=>m.items)).forEach(x=>week[x.n]=(week[x.n]||0)+1); days.push(d) }
  return days }
function regenDay(ctx,opt,week,i,seed){ const adj=new Set(); [week[i-1],week[i+1]].forEach(d=>d&&d.meals.forEach(m=>m.items.forEach(x=>adj.add(x.n))));
  const wk={}; week.forEach((d,j)=>j!==i&&d.meals.forEach(m=>m.items.forEach(x=>wk[x.n]=(wk[x.n]||0)+1)));
  const d=genDay(ctx,opt,seed,{adj,week:wk}); d.seed=seed; return d }
// замена одной позиции + перебалансировка граммов всего дня
function swapItem(ctx,opt,day,mi,ii,seed){ const S=ctx.S||(ctx.S=setup(ctx)); const it=day.meals[mi].items[ii]; const used=new Set([].concat(...day.meals.map(m=>m.items.map(x=>x.n))));
  const groups=it.grp==='meat'||it.grp==='fish'?['meat','fish']:[it.grp]; const pool=poolFor(groups,opt,S).filter(c=>!used.has(c.n)); if(!pool.length)return day;
  const all=()=>[].concat(...day.meals.map(m=>m.items)); const rnd=rng(seed); const cands=pool.sort(()=>rnd()-.5).slice(0,6); let best=null,bl=1e18; const orig=all().map(x=>x.g);
  for(const c of cands){ day.meals[mi].items[ii]=Object.assign({},c,{g:c.typ,slot:it.slot}); const L=fitGrams(all(),ctx,S,6); if(L<bl){bl=L;best={c,gs:all().map(x=>x.g)}} all().forEach((x,k)=>{ if(x!==day.meals[mi].items[ii])x.g=orig[k] }) }
  day.meals[mi].items[ii]=Object.assign({},best.c,{g:best.c.typ,slot:it.slot}); all().forEach((x,k)=>x.g=best.gs[k]); return evalDay(day,ctx) }
// роль позиции → группы-кандидаты (по слоту шаблона, иначе по группе)
const ROLE={brk:'каша/завтрак',fruit:'фрукт',soup:'суп',side:'гарнир',meat:'белок',fish:'белок',veg:'овощи',dairy:'молочное',add:'добавка',oil:'заправка',cheese:'сыр/хлеб'};
function groupsOf(it){ const sl=(it.slot||'').split(':'), t=T[sl[0]]&&T[sl[0]][+sl[1]]; if(t&&t.includes(it.grp))return t; return it.grp==='meat'||it.grp==='fish'?['meat','fish']:[it.grp] }
// варианты замены: 3–5 кандидатов той же роли, близких по калорийности; для каждого — перебалансированные граммы дня
function swapOptions(ctx,opt,day,mi,ii,o){ o=o||{}; const S=ctx.S||(ctx.S=setup(ctx)); const it=day.meals[mi].items[ii]; if(!it||it.v)return [];
  const used=new Set([].concat(...day.meals.map(m=>m.items.map(x=>x.n)))), skip=new Set(o.skip||[]), kc=n=>S.V[n][0]*100;
  const k0=kc(it.n)*it.g/100; let pool=poolFor(groupsOf(it),opt,S).filter(c=>!used.has(c.n)&&!skip.has(c.n));
  pool.forEach(c=>c.d=Math.abs(kc(c.n)*c.typ/100-k0)/Math.max(50,k0)); pool.sort((a,b)=>a.d-b.d); pool=pool.slice(0,Math.max(o.n||5,8));
  const all=()=>[].concat(...day.meals.map(m=>m.items)), orig=all().map(x=>x.g), res=[];
  for(const c of pool){ day.meals[mi].items[ii]=Object.assign({},c,{g:c.typ,slot:it.slot}); const hs=all().map(x=>x.hi); all().forEach(x=>{ if(!x.v)x.hi=Math.round(x.hi*1.3) }); let L=fitGrams(all(),ctx,S,12); repair(all(),ctx,S); all().forEach((x,k)=>x.hi=hs[k]); if(day.meals[mi].items[ii].g>c.hi)day.meals[mi].items[ii].g=c.hi;
    res.push({n:c.n,grp:c.grp,role:ROLE[c.grp]||c.grp,L:L+c.d*2,gs:all().map(x=>Math.round(x.g)),lo:c.lo,hi:c.hi,typ:c.typ});
    all().forEach((x,k)=>x.g=orig[k]) }
  day.meals[mi].items[ii]=it; all().forEach((x,k)=>x.g=orig[k]);
  res.sort((a,b)=>a.L-b.L); return res.slice(0,o.n||5).map(r=>{ const g=r.gs[all().indexOf(it)], t=total(all().map((x,k)=>({n:x===it?r.n:x.n,v:x===it?null:x.v,g:x===it?g:r.gs[k]})),S.V,4);
    return Object.assign(r,{g,k:S.V[r.n][0]*g,tot:{k:t[0],p:t[1],f:t[2],c:t[3]}}) }) }
function applySwap(ctx,day,mi,ii,r){ const it=day.meals[mi].items[ii], all=[].concat(...day.meals.map(m=>m.items)), k=all.indexOf(it);
  day.meals[mi].items[ii]={n:r.n,g:r.gs[k],lo:r.lo,hi:r.hi,typ:r.typ,grp:r.grp,slot:it.slot};
  [].concat(...day.meals.map(m=>m.items)).forEach((x,j)=>{ if(j!==k)x.g=r.gs[j] }); return evalDay(day,ctx) }
// заменить весь приём: новые позиции той же роли, граммы дня перебалансируются
function regenMeal(ctx,opt,day,mi,seed){ const S=ctx.S||(ctx.S=setup(ctx)), rnd=rng(seed), m=day.meals[mi]; const all=()=>[].concat(...day.meals.map(z=>z.items));
  const used=new Set(all().map(x=>x.n)); m.items=m.items.map(it=>{ if(it.v)return it; const pool=poolFor(groupsOf(it),opt,S).filter(c=>!used.has(c.n)); if(!pool.length)return it;
    const c=pool[Math.floor(rnd()*pool.length)]; used.add(c.n); return Object.assign({},c,{g:c.typ,slot:it.slot}) });
  fitGrams(all(),ctx,S,10); repair(all(),ctx,S); all().forEach(x=>x.g=Math.round(x.g)); return evalDay(day,ctx) }
const M={P,T,EXCL,ROLE,genDay,genWeek,regenDay,swapItem,swapOptions,applySwap,regenMeal,groupsOf,evalDay,check,notes,mealsFor,hash,setup};
if(typeof module!=='undefined'&&module.exports)module.exports=M; else G.MENU=M;
})(typeof self!=='undefined'?self:this);
