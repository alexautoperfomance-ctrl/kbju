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
as(mic('молоко 3,2%','A')>mic('молоко 0,5%','A')*3,'жирность: витамин A ∝ жиру'); as(mic('молоко 3,2%','Ca')===mic('молоко 0,5%','Ca'),'жирность: кальций не меняется');
as(mic('брокколи отварная','C')<mic('брокколи','C'),'варка снижает витамин C'); as(mic('борщ','C')>0&&self.MSRC['борщ']==='c','борщ — по составу');
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
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad?1:0);
