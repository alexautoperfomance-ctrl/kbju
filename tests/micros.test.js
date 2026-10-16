// node tests/micros.test.js — микронутриенты: база, нормы, суммирование, дефициты, нутрициолог
global.self=global; require('../db.js'); require('../micro.js'); const M=require('../micros.js'), N=require('../nutri.js');
let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
const K=self.MK, I=k=>K.indexOf(k), mic=(n,k)=>self.MICRO[n][I(k)], F=n=>self.FOODS.find(f=>f.n===n);
const E=(n,g,meal)=>{const f=F(n);return {name:n,g,meal:meal||'обед',cat:f.cat,k:f.k*g/100,p:f.p*g/100,f:f.f*g/100,c:f.c*g/100}};
// база
as(K.length===30,'30 нутриентов'); as(self.FOODS.every(f=>Array.isArray(self.MICRO[f.n])&&self.MICRO[f.n].length===K.length),'микро для каждого продукта');
const src=Object.values(self.MSRC); as(src.filter(x=>x==='u').length>=400,'≥400 продуктов напрямую из USDA');
as(mic('скумбрия','D')>=10&&mic('скумбрия','O3')>1500,'скумбрия: D и омега-3'); as(mic('апельсин','C')>40,'апельсин: C'); as(mic('говяжья печень','A')>3000&&mic('говяжья печень','B12')>40,'печень: A, B12');
as(mic('гречка','Mg')>40,'гречка: магний'); as(mic('творог 5%','Ca')>50,'творог: кальций'); as(mic('шпинат','K')>300,'шпинат: K'); as(mic('семечки подсолнечника','E')>25,'семечки: E');
as(mic('молоко 3,2%','A')>mic('молоко 0,5%','A')*3,'жирность: витамин A ∝ жиру'); as(Math.abs(mic('молоко 3,2%','Ca')/mic('молоко 0,5%','Ca')-1)<.06,'жирность: кальций не меняется');
as(mic('брокколи отварная','C')<mic('брокколи','C'),'варка снижает витамин C'); as(mic('борщ','C')>0&&/[cr]/.test(self.MSRC['борщ']),'борщ — по составу');
as(mic('рис','B1')<100&&mic('хлеб белый','Fe')<2,'без американского обогащения'); as(mic('вода','Ca')<20&&mic('масло подсолнечное','Ca')===0,'вода/масло');
// нормы
const nm=(p,k)=>M.norms(p).find(d=>d.k===k).norm;
as(nm({sex:'f',a:30},'Fe')===18&&nm({sex:'m',a:30},'Fe')===10&&nm({sex:'f',a:55},'Fe')===10,'железо по полу/возрасту'); as(nm({sex:'m',a:70},'D')===20&&nm({sex:'m',a:40},'Ca')===1000&&nm({sex:'m',a:70},'Ca')===1200,'D, Ca 65+');
as(nm({sex:'m',a:30},'C')===100&&nm({sex:'m',a:30},'I')===150&&nm({sex:'f',a:30},'Se')===55,'C, йод, селен');
// анализ
const lk=n=>self.MICRO[n];
let a=M.analyze([[E('гречка',200),E('куриная грудка отварная',200),E('хлеб белый',60),E('кофе',200)]],{sex:'m',a:35},K,lk);
const g=k=>a.list.find(d=>d.k===k);
as(g('D').st==='low'&&g('C').st==='low','дефицит D и C'); as(a.list[0].st==='low','дефициты первыми'); as(Math.abs(g('Mg').amt-(mic('гречка','Mg')*2+mic('куриная грудка отварная','Mg')*2+mic('хлеб белый','Mg')*.6+mic('кофе','Mg')*2))<1,'сумма магния');
const adv=M.gapAdvice(g('D'),self.FOODS,K,self.MICRO); as(/Витамин D \d+% нормы — добавь .+ \d+ (г|шт).*врачом/.test(adv),'совет по D: '+adv);
as(/брокколи|перец|киви|смородин|апельсин/.test(M.gapAdvice(g('C'),self.FOODS,K,self.MICRO)),'совет по C из богатых продуктов');
a=M.analyze([[E('сельдь соленая',300),E('соевый соус',60),E('торт',300),E('лимонад',1000)]],{sex:'m',a:35},K,lk);
as(a.list.find(d=>d.k==='Na').st==='over','избыток натрия'); as(a.list.find(d=>d.k==='Sug').st==='over','избыток сахара');
// неделя: среднее
a=M.analyze([[E('апельсин',200)],[],[E('апельсин',0)]],{sex:'m',a:35},K,lk); as(Math.round(a.list.find(d=>d.k==='C').amt)===Math.round(mic('апельсин','C')),'среднее по дням с записями');
// рецепт: агрегирование (как в app.js)
const ings=[{n:'рис сухой',g:500},{n:'говядина',g:400},{n:'морковь',g:200}], y=1800, rm=K.map((_,j)=>ings.reduce((s,i)=>s+lk(i.n)[j]*i.g/y,0));
const ca=mic('морковь','A')*200/1800; as(rm[I('A')]>=ca&&rm[I('A')]<ca+10,'рецепт: витамин A в основном из моркови');
// акузатив
as(M.acc('скумбрия')==='скумбрию'&&M.acc('капуста брюссельская')==='капусту брюссельскую'&&M.acc('говяжья вырезка')==='говяжью вырезку'&&M.acc('перец болгарский')==='перец болгарский','винительный падеж');
// нутрициолог
a=M.analyze([[E('макароны',300),E('сосиски',150)]],{sex:'m',a:35},K,lk);
const r=N.analyze({days:[{key:'d',entries:[E('макароны',300),E('сосиски',150)],water:0}],goals:{k:2200,p:140,f:70,c:240,w:2000},prof:{w:80,goal:'keep'},mode:'day',micro:a.list,microAdvice:d=>M.gapAdvice(d,self.FOODS,K,self.MICRO)});
as(r.metrics.microDef.length>=3&&r.metrics.microDef.every(d=>/добавь/.test(d.t)),'нутрициолог: дефициты с советами');
as(r.plan.some(p=>/^Для .+: добавь/.test(p)),'дефициты в плане на завтра');
as(![...r.metrics.microDef.map(d=>d.t),...r.plan].some(t=>/\d[.,]\d/.test(t.replace(/\d+%/g,''))),'только целые числа');
// v1.6 советы по дефицитам
{ const lk=n=>self.MICRO[n], day=[E('гречка',200),E('куриная грудка',150),E('огурец',100)], a=M.analyze([day],{sex:'m',a:35},K,lk);
  const tl=M.tipList(a.list,self.FOODS,K,self.MICRO,{kcalLeft:1500}), low=a.list.filter(d=>d.st==='low'&&d.k!=='Na'&&d.t!=='lim');
  as(tl.length===low.length,'строка на каждый дефицит ('+tl.length+'/'+low.length+')'); as(!tl.some(x=>x.k==='Na'||x.k==='Sug'||x.k==='Chol'),'без натрия и лимитов');
  as(tl.every((x,i)=>!i||tl[i-1].pct<=x.pct),'сортировка по наибольшему разрыву'); as(tl.every(x=>x.foods.length>=2&&x.foods.length<=3),'2–3 продукта');
  const all=new Set(Object.values(M.TIP).join('|').split('|')); as(tl.every(x=>x.foods.every(f=>M.TIP[x.k].split('|').includes(f.n))),'только из списка нутриента');
  as(![...all].some(n=>/карп|сазан|печень трески|кровян/.test(n)),'нет странных продуктов'); as([...all].every(n=>F(n)&&self.MICRO[n]),'все продукты списка есть в базе');
  const D=tl.find(x=>x.k==='D'); as(D&&/скумбрия|сельдь|горбуша|лосось|форель|яйцо/.test(D.foods[0].n),'вит. D → рыба/яйца: '+(D&&D.foods.map(f=>f.n)));
  as(D.foods.every(f=>f.cv>=4&&f.g>=10&&f.g<=250),'реалистичные порции');
  as(tl.some(x=>x.foods.some(f=>f.also.length>=2)),'есть продукт, закрывающий несколько дефицитов');
  const tight=M.tipList(a.list,self.FOODS,K,self.MICRO,{kcalLeft:0}), kc=x=>x.foods.reduce((s,f)=>s+f.kc,0)/x.foods.length;
  as(tight.reduce((s,x)=>s+kc(x),0)<=tl.reduce((s,x)=>s+kc(x),0),'без запаса калорий — продукты легче');
  as(M.portTxt(F('яйцо'),100)==='2 шт'&&M.portTxt(F('скумбрия'),100)==='100 г','формат порций');
  const full=[...day,E('скумбрия',300),E('творог 5%',400),E('шпинат',200),E('чечевица',300),E('морковь',200),E('апельсин',300),E('куриная печень',100),E('тыквенные семечки',60),E('морская капуста',150),E('брокколи',300)];
  const b=M.analyze([full],{sex:'m',a:35},K,lk), tb=M.tipList(b.list,self.FOODS,K,self.MICRO,{});
  as(tb.length<tl.length&&!tb.some(x=>x.k==='D'),'после еды дефицитов меньше ('+tl.length+'→'+tb.length+')'); }
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad?1:0);
