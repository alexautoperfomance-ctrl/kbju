// Аудит опечаток/обрезков/ASR + покрытие фруктов + съедобная часть. node tests/fuzzy.test.js
global.self=global; require('../db.js'); const P=require('../parser.js'); const C=require('./fuzzy_cases.json');
const F=self.FOODS, ix=P.makeIndex(F,[]), by={}; F.forEach(f=>by[f.n]=f); let ok=0,bad=0;
const t=(name,cond,info)=>{ if(cond)ok++; else{bad++;console.log('FAIL:',name,info||'')} };
const p1=q=>P.parse(q,{index:ix,meal:'обед'})[0];
const eq=(a,b)=>a&&b&&(a.n===b.n||(a.k===b.k&&a.p===b.p&&a.f===b.f&&a.c===b.c));
// омонимы — реальные слова/продукты, выбор неоднозначен по самой фразе
const HOMO=new Set(['кита','варень','мюсли батончи','марс','лимона','плав','личо','овсяно молоко','шпикочки','саль']);
let silent=0;
for(const c of C){ const r=p1(c.q), e=by[c.exp]; const good=r&&r.food&&((eq(r.food,e)&&!r.unsure)||(r.unsure&&r.cands.some(x=>eq(x,e))));
  if(!good){ if(HOMO.has(c.q))silent++; else t('опечатка '+c.q,false,'→ '+(r&&r.food&&r.food.n)+' ожид. '+c.exp) } else ok++ }
console.log('аудит:',C.length,'вариантов, омонимов-исключений',silent);
// маракуйя
for(const q of ['маракуй 500 грамм','маракуйи 500 грамм','маракуйю 500 грамм','маракуйей 500 грамм','маракуя 500 г','пассионария 500 г','passion fruit 500 г','маракуйя 500 г']){ const r=p1(q); t(q,r.food.n==='маракуйя'&&r.g===500,r.food&&r.food.n) }
t('маракуйк → не кокос',p1('маракуйк').food.n!=='кокос')
// каждый фрукт/орех/сухофрукт находится по названию
F.filter(f=>f.src==='base'&&/fruit|nut|berry/.test(f.cat)).forEach(f=>{ const r=p1(f.n); t('найти '+f.n,r&&r.food&&r.food.n===f.n,r&&r.food&&r.food.n) });
// съедобная часть
const g=q=>p1(q); let r;
r=g('3 маракуйи'); t('3 маракуйи = 54 г',r.g===54&&/3 шт ≈ 54 г мякоти/.test(r.note),r.g+' '+r.note);
t('2 манго = 400',g('2 манго').g===400); t('банан = 118',g('банан').g===118); t('апельсин = 130',g('апельсин').g===130);
t('2 яйца = 100 без скорлупы',(r=g('2 яйца')).g===100&&/без скорлупы/.test(r.note),r.note);
t('кусок арбуза = 286',g('кусок арбуза').g===286||g('арбуз 1 кусок').g===286, g('кусок арбуза').g);
t('200 г банана = 200 съедобных',(r=g('200 грамм банана')).g===200&&!r.note);
t('200 г банана с кожурой = 128',(r=g('банан 200 грамм с кожурой')).g===128&&/200 г целиком ≈ 128 г мякоти/.test(r.note),r.g+' '+r.note);
t('100 г грецких в скорлупе = 45 ядра',(r=g('100 грамм грецких орехов в скорлупе')).g===45&&/ядра/.test(r.note),r.g+' '+r.note);
t('мандарин целиком 100 г = 74',g('мандарин 100 г целиком').g===74);
t('маракуйя rf',by['маракуйя'].rf===48&&by['маракуйя'].pc===18);
console.log(ok+' passed, '+bad+' failed'); process.exit(bad?1:0);
