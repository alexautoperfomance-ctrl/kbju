// node tests/nutri.test.js — тесты «Нутрициолога»
global.self=global; require('../db.js'); const N=require('../nutri.js'); const F=n=>self.FOODS.find(f=>f.n===n);
const E=(n,g,meal)=>{const f=F(n); if(!f)throw new Error('нет '+n); return {name:f.n,g,meal,cat:f.cat,k:f.k*g/100,p:f.p*g/100,f:f.f*g/100,c:f.c*g/100}};
const goals={k:2200,p:140,f:70,c:240,w:2000}, prof={w:80,goal:'keep'};
let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
const days=(n,fn)=>Array.from({length:n},(_,i)=>({key:'d'+i,entries:fn(i),water:1000}));
const noDigitsFrac=r=>![...r.strengths,...r.problems].some(x=>/\d[.,]\d/.test(x.t+(x.swap||'')))&&!r.plan.some(x=>/\d[.,]\d/.test(x.replace(/\d+%/g,'')))&&!/\d[.,]\d/.test(r.speech.replace(/10%/g,''));
// 1. пустой
let r=N.analyze({days:days(1,()=>[]),goals,prof,mode:'day'}); as(r.empty&&r.plan.length,'пустой день');
// 2. плохой рацион: фастфуд, майонез, сладкое, без завтрака, алкоголь
const junk=()=>[E('шаурма',350,'обед'),E('картофель фри',150,'обед'),E('лимонад',500,'обед'),E('пельмени',300,'ужин'),E('майонез',40,'ужин'),E('торт',150,'ужин'),E('пиво',1000,'ужин'),E('колбаса копченая',80,'перекус')];
r=N.analyze({days:days(7,junk),goals,prof,mode:'week',trackWater:true});
as(r.score<=4,'оценка плохого рациона низкая: '+r.score); as(r.problems.length===3,'3 проблемы');
as(r.problems.every(p=>p.swap&&/\d/.test(p.swap)),'у каждой проблемы конкретная замена с цифрами');
as(r.problems.some(p=>/Профицит|вес будет расти/.test(p.t)),'профицит и прогноз веса');
as(r.metrics.alcoK>300&&r.metrics.upf>25&&r.metrics.sugar>50&&r.metrics.noBreakfast===7,'алкоголь/UPF/сахар/завтрак');
as(r.metrics.wkg>0.3,'прогноз набора веса');
as(noDigitsFrac(r),'только целые числа');
as(/Оценка \d+ из 10/.test(r.speech),'озвучка с оценкой');
as(r.plan.length>=3&&/Цель/.test(r.plan[0]),'план на завтра');
const sw=r.problems.map(p=>p.swap).join(' ');
// 3. хороший рацион
const good=i=>[E('овсянка',250,'завтрак'),E('яйцо вареное',110,'завтрак'),E('яблоко',180,'завтрак'),E('гречка',200,'обед'),E('куриная грудка отварная',200,'обед'),E('салат из свежих овощей',200,'обед'),
  E('творог 5%',200,'перекус'),E('банан',120,'перекус'),E(['треска запеченная','горбуша запеченная','индейка тушеная'][i%3],200,'ужин'),E(['брокколи на пару','капуста цветная отварная','кабачок тушеный'][i%3],250,'ужин'),E(['хлеб цельнозерновой','рис бурый','чечевица'][i%3],120,'ужин'),E(['грецкие орехи','миндаль','кешью'][i%3],25,'перекус')];
r=N.analyze({days:days(7,good),goals,prof,mode:'week',trackWater:true});
as(r.score>=7,'хороший рацион ≥7: '+r.score+' '+JSON.stringify(r.problems.map(p=>p.t))); as(r.strengths.length===3,'3 сильные стороны');
as(r.strengths.some(s=>/Белок в норме/.test(s.t)),'белок в норме'); as(r.metrics.fiber>=20&&r.metrics.veg>=400,'клетчатка/овощи: '+Math.round(r.metrics.fiber)+' '+Math.round(r.metrics.veg));
as(noDigitsFrac(r),'целые числа (хороший)');
// 4. белок на кг
r=N.analyze({days:days(1,()=>[E('макароны',400,'обед'),E('хлеб белый',100,'ужин'),E('яблоко',180,'завтрак')]),goals,prof:{w:90,goal:'keep'},mode:'day'});
as(r.problems.some(p=>/Белка мало/.test(p.t)&&/90 кг/.test(p.t)),'белок на кг веса');
// 5. замена майонеза — минус ккал
r=N.analyze({days:days(3,()=>[E('майонез',60,'обед'),E('салат оливье',300,'обед'),E('куриная грудка отварная',300,'ужин'),E('сыр российский',80,'ужин'),E('яйцо',110,'завтрак')]),goals,prof,mode:'week'});
as(r.problems.some(p=>/майонез.*сметану 10%.*минус ~\d+ ккал/.test(p.swap)),'замена майонеза: '+JSON.stringify(r.problems.map(p=>p.swap)));
// 6. похудение: сильный дефицит
r=N.analyze({days:days(5,()=>[E('огурец',200,'обед'),E('яблоко',180,'завтрак'),E('кефир 1%',250,'ужин')]),goals,prof:{w:80,goal:'lose'},tdee:2600,mode:'week'});
as(r.problems.some(p=>/Дефицит слишком большой/.test(p.t)),'слишком большой дефицит');
// 7. регулярность и разнообразие
r=N.analyze({days:days(30,i=>i%3?[]:[E('гречка',200,'обед'),E('котлета',160,'ужин'),E('чай',200,'завтрак')]),goals,prof,mode:'month'});
as(r.problems.some(p=>/однообразный|только в/.test(p.t)),'регулярность/разнообразие'); as(r.metrics.regular<50,'регулярность %');
r=N.analyze({days:days(3,()=>[E('гречка',200,'обед'),E('куриная грудка отварная',300,'ужин')]),goals,prof,tdee:2600,mode:'week'});
as(r.problems.some(p=>/поддержание/.test(p.t)),'дефицит при цели «поддержание»');
// 8. классификация
as(N.RX.fried.test('картофель жареный')&&N.RX.alco.test('пиво')&&!N.RX.alco.test('пиво безалкогольное')&&N.RX.upf.test('колбаса вареная')&&N.RX.sweet.test('шоколад молочный'),'категории');
as(N.fiber100({name:'чечевица',cat:'grain'})===6&&N.fiber100({name:'курица',cat:'meat'})===0,'клетчатка');
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad?1:0);
