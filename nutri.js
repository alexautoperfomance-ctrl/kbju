// «Нутрициолог»: офлайн-анализ рациона по правилам. Чистая функция — тестируется в node.
(function(G){'use strict';
const R=Math.round;
const RX={sweet:/торт|шоколад|конфет|печень|пирожн|мороже|пломбир|эскимо|сгущ|варень|джем|повидл|мармелад|зефир|пастил|халв|нутелл|вафл|пряник|кекс|маффин|пончик|чизкейк|тирамису|батончик|сникерс|марс|твикс|киткат|сырок глазир|^сахар|мед$|карамел|медовик|наполеон|слойк/,
 sugary:/лимонад|газировк|кола(?! зеро)|сок |^сок|морс|компот|кисель|энергетик|сироп|с сахаром|какао|раф|молочный коктейль|смузи/,
 upf:/колбас|сосиск|сарделк|ветчин|бекон|буженин|шпикачк|чипс|наггетс|быстрого приготовления|доширак|майонез|лимонад|энергетик|батончик|сухарик|кириешк|кетчуп|фри|бургер|чизбургер|биг мак|хот дог|крабов|паштет|пицц|шаурм|шаверм|сырок глазир|рыбные палочки|сырные палочки|луковые кольца|попкорн|тушенк|колбаски/,
 fried:/жарен|фри|чебурек|беляш|пончик|драники|наггетс|в кляре|яичниц|отбивн|шницел|чипс|оладь|пирожок|самса|луковые кольца|сырные палочки|по-киевски|поджарк/,
 alco:/^пиво(?! безалк)|пиво темн|^вино|водк|коньяк|виски|шампанск|^ром|текил|джин|ликер|сидр|коктейль алког|^коктейль$|кофе по-ирландски/,
 veg:/салат|овощ|рагу|винегрет|борщ|щи|окрошк|лечо|икра кабачк|капуста|брокколи|огур|помидор|томат|кабач|баклажан|перец|морков|свекл|шпинат|тыкв/,
 legume:/фасол|чечевиц|нут|горох|горош|хумус|фалафел/,whole:/гречк|овсян|бур|перлов|булгур|киноа|черный|цельнозерн|ржан|отруб|мюсли|гранол|хлебц/,nut:/орех|миндал|фундук|арахис|кешью|фисташ|семечк|семена|кунжут|чиа|курага|изюм|чернослив|финик/};
// клетчатка (г/100 г) — оценка по категории/названию
function fiber100(e){ const n=e.name.toLowerCase(), c=e.cat||'';
  if(RX.legume.test(n))return 6; if(RX.nut.test(n)||c==='nut')return 7; if(/отруб/.test(n))return 40; if(/сух|хлопья|мюсли|гранол/.test(n)&&c==='grain')return 9;
  if(c==='fruit'||/^яблок|банан|груш/.test(n))return /сок/.test(n)?0.2:2.2; if(c==='veg')return 2.3;
  if(RX.whole.test(n))return c==='bread'?6:2.5; if(c==='grain')return 1.2; if(c==='bread')return 2.5; if(RX.veg.test(n))return 1.5; return 0 }
function vegG(e){ const n=e.name.toLowerCase(),c=e.cat||''; if(/сок|компот|варенье|джем/.test(n))return 0; if(c==='veg'||c==='fruit')return e.g; if(RX.veg.test(n)&&c==='dish')return e.g*.4; return 0 }
const SWAPS=[ // [кого заменяем, на что, его название в базе, причина]
 [/майонез(?! легк)/,'сметану 10%',{k:115},'майонез'],[/^сыр (российский|голландский|гауда|чеддер|маасдам)/,'сыр лёгкий 15–17% или моцареллу',{k:270},'жирный сыр'],
 [/колбаса|сосиск|сарделк|бекон/,'запечённую куриную грудку',{k:148},'колбасные изделия'],[/шоколад|конфет|печень|торт|пирожн|вафл|батончик|пончик|кекс/,'яблоко или ягоды',{k:47},'сладости'],
 [/лимонад|кола(?! зеро)|энергетик/,'воду или колу без сахара',{k:0},'сладкие напитки'],[/^сок /,'целый фрукт',{k:47},'сок'],[/картофель фри|картофель жареный/,'запечённый картофель',{k:114},'жареный картофель'],
 [/хлеб белый|батон|булочк|круассан/,'хлеб цельнозерновой',{k:247},'белый хлеб'],[/^пиво(?! безалк)|^вино/,'безалкогольное пиво или воду с лимоном',{k:26},'алкоголь'],
 [/чипс|сухарик|кириешк/,'горсть орехов (20 г) или хлебцы',{k:300},'чипсы'],[/жарен/,'то же блюдо, запечённое или на пару',null,'жареное'],
 [/масло (подсолнечное|растительное|сливочное)/,'на 1 ложку меньше масла, готовить на сковороде с антипригарным покрытием',null,'масло'],[/сметана (2|3)0/,'сметану 10% или греческий йогурт',{k:115},'жирная сметана']];
function swapFor(top,days){ // top: [{n,k,g,f}] средние за день
  for(const t of top){ const n=t.n.toLowerCase(); for(const [re,to,alt,lab] of SWAPS) if(re.test(n)){ const k100=t.k/t.g*100, d=alt?R((k100-alt.k)*t.g/100):R(t.k*.25);
      if(d>=20) return {from:t.n,to,kcal:d,text:`замени ${t.n.toLowerCase()} (${R(t.g)} г/день) на ${to} — минус ~${d} ккал в день`} } }
  return null }
function agg(list,key){ const m={}; list.forEach(e=>{const x=m[e.name]||(m[e.name]={n:e.name,k:0,f:0,g:0,c:0,cnt:0});x.k+=e.k;x.f+=e.f;x.g+=e.g;x.c+=e.c;x.cnt++}); return Object.values(m).sort((a,b)=>b[key]-a[key]) }
function analyze(o){ const g=o.goals, w=(o.prof&&o.prof.w)||70, keys=o.days.map(d=>d.key), logged=o.days.filter(d=>d.entries.length), N=Math.max(1,logged.length), P=o.days.length;
  if(!logged.length) return {empty:true,score:0,strengths:[],problems:[],plan:['Записывай всё, что ешь, хотя бы 3 дня — тогда я смогу дать разбор.'],speech:'Пока нет данных для анализа.'};
  const all=logged.flatMap(d=>d.entries), S=k=>all.reduce((a,e)=>a+(+e[k]||0),0)/N;
  const m={k:S('k'),p:S('p'),f:S('f'),c:S('c')}; m.pkg=m.p/w; const kc=m.p*4+m.f*9+m.c*4||1; m.pct={p:m.p*4/kc*100,f:m.f*9/kc*100,c:m.c*4/kc*100};
  const gk=g.p*4+g.f*9+g.c*4||1; m.gpct={p:g.p*4/gk*100,f:g.f*9/gk*100,c:g.c*4/gk*100};
  const tdee=o.tdee||g.k; m.bal=m.k-tdee; m.wkg=m.bal*7/7700; // кг/нед
  const mealK={}; all.forEach(e=>mealK[e.meal]=(mealK[e.meal]||0)+e.k); const tk=all.reduce((a,e)=>a+e.k,0)||1; m.meal={}; ['завтрак','обед','ужин','перекус'].forEach(x=>m.meal[x]=(mealK[x]||0)/tk*100);
  m.noBreakfast=logged.filter(d=>!d.entries.some(e=>e.meal==='завтрак')).length; m.heavyDinner=logged.filter(d=>{const t=d.entries.reduce((a,e)=>a+e.k,0)||1;return d.entries.filter(e=>e.meal==='ужин').reduce((a,e)=>a+e.k,0)/t>.4}).length;
  m.fiber=all.reduce((a,e)=>a+fiber100(e)*e.g/100,0)/N; m.veg=all.reduce((a,e)=>a+vegG(e),0)/N;
  const cls=re=>all.filter(e=>re.test(e.name.toLowerCase()));
  m.sweetK=cls(RX.sweet).reduce((a,e)=>a+e.k,0)/N; m.sugar=(cls(RX.sweet).reduce((a,e)=>a+e.c*.6,0)+cls(RX.sugary).reduce((a,e)=>a+e.c*.9,0))/N;
  m.upf=cls(RX.upf).reduce((a,e)=>a+e.k,0)/N/Math.max(1,m.k)*100; m.fried=cls(RX.fried).length/N; m.alcoK=cls(RX.alco).reduce((a,e)=>a+e.k,0)/N; m.alcoDays=logged.filter(d=>d.entries.some(e=>RX.alco.test(e.name.toLowerCase()))).length;
  m.water=o.trackWater?logged.reduce((a,d)=>a+(d.water||0),0)/N:null;
  m.distinct=new Set(all.map(e=>e.name)).size; m.distinctWeek=new Set(o.days.slice(-7).flatMap(d=>d.entries.map(e=>e.name))).size; m.regular=logged.length/P*100; m.perDay=all.length/N;
  const topK=agg(all,'k').map(x=>({n:x.n,k:x.k/N,f:x.f/N,g:x.g/N,c:x.c/N,cnt:x.cnt})), topF=agg(all,'f').map(x=>({n:x.n,k:x.k/N,f:x.f/N,g:x.g/N}));
  m.topK=topK.slice(0,5); m.topF=topF.slice(0,3);
  // ----- оценка -----
  const good=[],bad=[]; let sc=10; const pen=(v,txt,swap,w)=>{bad.push({t:txt,swap,w});sc-=v}, plus=(txt,w)=>good.push({t:txt,w});
  const pk=R(m.pkg*10)/10, ptarget=Math.max(1.4,g.p/w);
  if(m.pkg<1.2) pen(2,`Белка мало: ${R(m.p)} г в день — ${R(m.p/(ptarget*w)*100)}% нормы для веса ${R(w)} кг (нужно ~${R(ptarget*w)} г).`,`добавь ${R((ptarget*w-m.p)/0.17/10)*10} г творога 5% или куриной грудки — плюс ~${R(ptarget*w-m.p)} г белка`,3);
  else if(m.pkg<ptarget-.15) pen(1,`Белка чуть меньше нормы: ${R(m.p)} г — ${R(m.p/(ptarget*w)*100)}% от ~${R(ptarget*w)} г для веса ${R(w)} кг.`,`добавь на перекус 150 г греческого йогурта — плюс ~15 г белка`,2);
  else plus(`Белок в норме: ${R(m.p)} г в день — ${R(m.p/(ptarget*w)*100)}% нормы для веса ${R(w)} кг.`,3);
  const dev=Math.abs(m.bal)/tdee*100, goalT=(o.prof&&o.prof.goal)||'keep';
  const trend=m.wkg<-.05?`вес будет снижаться примерно на ${grams(-m.wkg)} в неделю`:m.wkg>.05?`вес будет расти примерно на ${grams(m.wkg)} в неделю`:'вес будет стабильным';
  if(goalT==='lose'&&m.wkg<-1) pen(1.5,`Дефицит слишком большой (${R(-m.bal)} ккал): ${trend}, есть риск потерять мышцы.`,`добавь ${R(Math.min(400,-m.bal-500))} ккал: например, 150 г гречки и 100 г творога`,2);
  else if(goalT==='lose'&&m.wkg<=-.15) plus(`Калории под цель: ${trend}.`,2);
  else if((goalT==='lose'&&m.wkg>-.05)||(goalT==='keep'&&m.wkg>.2)||(goalT==='gain'&&m.wkg>.6)) pen(Math.min(2,dev/10),`Профицит: в среднем ${R(m.k)} ккал при расходе ~${R(tdee)}, ${trend}.`,swapFor(topK,N)?.text||`сократи порции гарнира на треть — минус ~150 ккал`,3);
  else if(goalT==='keep'&&m.wkg<-.3) pen(Math.min(2,dev/12),`Калорий меньше расхода на ${R(-m.bal)} ккал (${R(m.k)} при ~${R(tdee)}): ${trend}, хотя цель — поддержание.`,`добавь ${R(Math.min(500,-m.bal)/10)*10} ккал: 150 г гречки с маслом и 200 г творога`,3);
  else if(goalT==='gain'&&m.wkg<.1) pen(1,`Для набора маловато: ${trend}.`,`добавь 30 г орехов и банан — плюс ~300 ккал`,2);
  else plus(`Калорийность сбалансирована: ${R(m.k)} ккал, ${trend}.`,2);
  const df=m.pct.f-m.gpct.f, dc=m.pct.c-m.gpct.c;
  if(df>7) pen(1,`Жиров ${R(m.pct.f)}% калорий (цель ${R(m.gpct.f)}%). Больше всего: ${m.topF.map(x=>x.n.toLowerCase()).join(', ')}.`,swapFor(topF,N)?.text||'меньше масла при готовке — минус ~90 ккал на ложку',2);
  else if(dc>8) pen(1,`Углеводов ${R(m.pct.c)}% калорий (цель ${R(m.gpct.c)}%).`,swapFor(topK.filter(x=>x.c>x.f),N)?.text||'сделай половину гарнира овощами — минус ~100 ккал',2);
  else if(Math.abs(df)<=5&&Math.abs(dc)<=6) plus(`Хорошее соотношение Б/Ж/У: ${R(m.pct.p)}/${R(m.pct.f)}/${R(m.pct.c)}%.`,2);
  if(m.veg<250) pen(m.veg<120?1.5:.8,`Овощей и фруктов около ${R(m.veg)} г в день при норме 400+ г, клетчатки ~${R(m.fiber)} г (норма 25–30).`,`добавь к обеду и ужину по 150 г салата из свежих овощей и 1 яблоко — плюс ~8 г клетчатки`,2);
  else if(m.fiber>=22) plus(`Достаточно растительной пищи: ~${R(m.veg)} г овощей/фруктов, клетчатки ~${R(m.fiber)} г.`,2);
  else plus(`Овощей и фруктов ~${R(m.veg)} г в день — хорошо.`,1);
  if(m.sugar>50||m.sweetK>250) pen(1.2,`Сахара много: ~${R(m.sugar)} г в день (ориентир до 50), сладостей на ${R(m.sweetK)} ккал.`,swapFor(topK.filter(x=>RX.sweet.test(x.n.toLowerCase())||RX.sugary.test(x.n.toLowerCase())),N)?.text||'сладкое — 1 раз в день и после еды; вместо второго десерта — фрукт',2);
  else if(m.sugar<25) plus(`Сладкого мало — ~${R(m.sugar)} г сахара в день.`,1);
  if(m.upf>25) pen(1,`Много ультра-обработанных продуктов: ${R(m.upf)}% калорий.`,swapFor(topK.filter(x=>RX.upf.test(x.n.toLowerCase())),N)?.text||'замени колбасу и полуфабрикаты на домашнее мясо/рыбу',2);
  if(m.fried>=1.5) pen(.7,`Жареное почти каждый приём: ~${R(m.fried)} блюда в день.`,'запекай в духовке или на гриле — минус ~60–100 ккал на блюдо',1);
  if(m.alcoK>100||m.alcoDays>Math.max(1,N/3)) pen(m.alcoK>250?1.5:.8,`Алкоголь: ~${R(m.alcoK)} ккал в день в среднем, дней с алкоголем ${m.alcoDays}.`,`замени ${(cls(RX.alco)[0]||{name:'пиво'}).name.toLowerCase()} на безалкогольное — минус ~${R(m.alcoK*.6)} ккал`,2);
  if(m.water!=null){ if(m.water<g.w*.6) pen(.5,`Воды ~${R(m.water)} мл при цели ${g.w}.`,`ставь бутылку 500 мл на стол и выпивай до обеда — плюс ${R(g.w-m.water)} мл`,1); else if(m.water>=g.w*.9) plus(`Питьевой режим соблюдается: ~${R(m.water)} мл.`,1) }
  if(m.noBreakfast>N/2&&m.meal.ужин>40) pen(.8,`Пропускаешь завтрак (${m.noBreakfast} из ${N} дн.) и ешь плотно вечером: на ужин ${R(m.meal.ужин)}% калорий.`,'перенеси 300–400 ккал с ужина на завтрак: омлет из 2 яиц и хлеб',2);
  else if(m.heavyDinner>N/2) pen(.6,`Тяжёлые ужины: в ${m.heavyDinner} дн. ужин больше 40% калорий.`,'сделай ужин легче: рыба/курица 150 г + овощи, гарнир перенеси на обед',1);
  else if(m.meal.завтрак>=15&&m.meal.ужин<=35) plus(`Калории хорошо распределены по дню: завтрак ${R(m.meal.завтрак)}%, ужин ${R(m.meal.ужин)}%.`,1);
  if(P>=7){ if(m.distinctWeek<15) pen(.6,`Рацион однообразный: ${m.distinctWeek} разных продуктов за неделю (лучше 20–30).`,'добавь за неделю 2 новых овоща, рыбу и бобовые',1); else if(m.distinctWeek>=22) plus(`Разнообразное питание: ${m.distinctWeek} разных продуктов за неделю.`,1);
    if(m.regular<70) pen(.5,`Записи есть только в ${R(m.regular)}% дней — анализ неточный.`,'записывай каждый приём сразу голосом — это 10 секунд',m.regular<50?2.5:1); else plus(`Регулярный дневник: записи в ${R(m.regular)}% дней.`,1) }
  if(m.perDay<2.5) pen(.5,`В среднем всего ${R(m.perDay)} записи в день — возможно, что-то не записано.`,'записывай перекусы и напитки тоже',1);
  good.sort((a,b)=>b.w-a.w); bad.sort((a,b)=>b.w-a.w);
  const score=Math.max(1,Math.min(10,R(sc)));
  // ----- план на завтра -----
  const plan=[`Цель: ${g.k} ккал, белок ${g.p} г (${R(g.p*.3)} г на завтрак, ${R(g.p*.35)} на обед, ${R(g.p*.35)} на ужин).`];
  bad.slice(0,3).forEach(b=>{ if(b.swap)plan.push(cap(b.swap)+'.') });
  if(plan.length<4) plan.push('Овощи в каждый основной приём — минимум 400 г за день.');
  if(m.water!=null&&plan.length<5) plan.push(`Вода — ${g.w} мл.`);
  const label=o.mode==='day'?'за день':o.mode==='week'?'за неделю':'за месяц';
  const speech=`Разбор ${label}. Оценка ${score} из 10. `+(good[0]?'Хорошо: '+good.slice(0,2).map(x=>x.t).join(' '):'')+(bad[0]?' Главное исправить: '+bad[0].t+' Совет: '+bad[0].swap+'.':'')+' План на завтра: '+plan.slice(1,3).join(' ');
  return {score,strengths:good.slice(0,3),problems:bad.slice(0,3),plan:plan.slice(0,5),metrics:m,speech,tdee} }
const grams=kg=>kg>=.95?R(kg)+' кг':R(kg*1000/50)*50+' г'; const cap=s=>s[0].toUpperCase()+s.slice(1);
const N={analyze,fiber100,RX};
if(typeof module!=='undefined'&&module.exports)module.exports=N; else G.NUTRI=N;
})(typeof self!=='undefined'?self:this);
