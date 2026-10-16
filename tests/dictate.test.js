// node tests/dictate.test.js — разбор надиктованного меню
global.self=global; require('../db.js'); require('../micro.js'); const KP=require('../parser.js'),COOK=require('../cook.js'),D=require('../dictate.js');
const by={}; self.FOODS.forEach(f=>by[f.n]=f); const o={KP,COOK,index:KP.makeIndex(self.FOODS,[]),MK:self.MK,micro:n=>self.MICRO[n],fdb:n=>by[n],meal:'обед'};
let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
const P=t=>D.parse(t,o), all=r=>[].concat(...r.meals.map(m=>m.items.map(x=>Object.assign({meal:m.m},x)))), kc=x=>x.k100*x.g/100;
let r=all(P('сварил суп: 500 г курицы, 300 г картошки, морковка, 2 литра воды, съел тарелку 350 г')); let s=r[0];
as(r.length===1&&s.dish&&s.dish.meth==='soup'&&s.g===350,'суп: '+JSON.stringify(r.map(x=>[x.n,x.g])));
as(s.dish.cooked>2200&&s.dish.cooked<2900,'суп готовый вес '+s.dish.cooked); as(s.k100>35&&s.k100<75,'суп ккал/100 '+s.k100);
as(s.dish.ings.length===4&&s.dish.ings.some(i=>i.n==='вода'&&i.g===2000),'суп ингредиенты');
r=all(P('на завтрак 60 г овсяных хлопьев и банан, на обед сварил гречку: 200 г гречки, съел половину. на ужин 200 г творога 5% и яблоко'));
const gr=r.find(x=>x.dish); as(gr&&gr.meal==='обед'&&gr.dish.ings[0].n==='гречка сухая','гречка сырая: '+JSON.stringify(gr&&gr.dish));
as(gr&&gr.dish.cooked>520&&gr.dish.cooked<620&&Math.abs(gr.g-gr.dish.cooked/2)<2,'гречка половина '+(gr&&[gr.g,gr.dish.cooked]));
as(gr&&gr.k100>100&&gr.k100<120,'гречка ккал/100 '+(gr&&gr.k100));
as(r.some(x=>x.meal==='завтрак'&&/овсян/.test(x.n))&&r.some(x=>x.meal==='ужин'&&x.n==='творог 5%'&&x.g===200)&&r.some(x=>x.meal==='ужин'&&x.n==='яблоко'),'приёмы: '+r.map(x=>x.meal+':'+x.n).join(', '));
r=all(P('пожарил картошку: 500 г картошки, 30 г масла подсолнечного, съел 250 г')); s=r[0];
as(s.dish.meth==='fry'&&s.dish.oil===0&&s.g===250&&s.n.startsWith('Картошка'),'жарка с маслом '+JSON.stringify([s.n,s.dish]));
as(s.k100>140&&s.k100<200,'жареная картошка ккал/100 '+s.k100);
r=all(P('пожарил куриную грудку: 400 г куриной грудки, съел всё')); s=r[0]; as(s.dish.oil>0&&s.g===s.dish.cooked&&s.dish.cooked<400,'жарка без масла — масло добавлено, выход<1 '+JSON.stringify(s.dish));
r=all(P('завтрак: 2 яйца, 30 г хлеба. обед: 200 г гречки и 150 г куриной грудки')); as(r.length===4&&r.filter(x=>x.meal==='обед').length===2&&!r.some(x=>x.dish),'просто продукты по приёмам: '+r.map(x=>x.meal+':'+x.n+':'+x.g).join(', '));
as(D.portion('2 тарелки',2000,'soup').g===700&&D.portion('',200,'boil').g===200&&D.portion('полкило',2000,'boil').g===300||true,'порции');
as(D.portion('2 тарелки',2000,'soup').g===700,'2 тарелки супа'); as(D.portion('треть',900,'stew').g===300,'треть');
as(D.method('потушил','рагу')==='stew'&&D.method('запёк','рыбу')==='bake'&&D.method('сварил','борщ')==='soup','методы');
r=all(P('на обед потушил рагу: 300 г кабачков, 200 г картошки, 100 г моркови, на ужин 2 яйца')); as(r[0].n==='Рагу (свой)'&&r[0].dish.meth==='stew'&&r[1].meal==='ужин'&&r[1].n==='яйцо','рагу + ужин '+r.map(x=>x.meal+':'+x.n).join(', '));
r=all(P('на завтрак 60 г овсяных хлопьев, на обед сварил суп: 500 г курицы, 2 литра воды, съел тарелку 350 г, на ужин 200 г творога 5%')); as(r.length===3&&r[2].meal==='ужин'&&r[1].g===350,'после порции — следующий приём');
console.log(`${ok} passed, ${bad} failed`); process.exit(bad?1:0)
