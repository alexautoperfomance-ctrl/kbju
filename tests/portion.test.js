// node tests/portion.test.js — v1.17.0: ≥200 фраз «блюдо без граммов» → порция в реалистичном диапазоне,
// ккал/100 г найденного блюда в пределах ±25% от справочного (медиана ≥2 заведений, tools/dishes_chain.json, либо СР/Скурихин).
global.self=global; require('../db.js'); require('./chains_node.js'); const P=require('../parser.js'); const ix=P.makeIndex(self.FOODS,[]);
const D=require('../tools/dishes_chain.json'); const BY={}; self.FOODS.forEach(f=>BY[f.n]=f);
let ok=0,bad=0; const as=(c,m)=>{ if(c)ok++; else{bad++;console.log('FAIL:',m)} };
function range(n){ if(/^пицц/.test(n))return[100,400];  // 2 куска (размер не назван)
  if(/суп|борщ|щи\b|солянк|уха|рассольник|харчо|окрошк|бульон|рамен|том ям|лагман|фо бо/.test(n))return[200,550];
  if(/суши|гункан|сашими|нигири/.test(n))return[20,300];  // штука или сет
  if(/пирожок|пирожк|слойк|круассан|пончик|эклер|маффин|кекс|сырок|беляш|самса|ватрушк|торт|пирожн|чизкейк|тирамису|медовик|наполеон|брауни|десерт|трайфл|пудинг|панна/.test(n))return[30,250];
  return[60,500] }
// детерминированная выборка по всем типам: каждое 5-е новое блюдо + все сверенные со справочником
const pick=D.filter((x,i)=>BY[x.n]&&(i%5===0||BY[x.n].ds!=='chains')).slice(0,260);
as(pick.length>=200,'фраз в выборке: '+pick.length);
for(const x of pick){ const ref=BY[x.n].ds==='chains'?x.k:BY[x.n].k, r=P.parse(x.n,{index:ix})[0];
  if(!r||!r.food){ as(false,x.n+' → не найдено'); continue }
  const [lo,hi]=range(x.n), k100=r.k/r.g*100;
  as(r.g>=lo&&r.g<=hi,`${x.n}: порция ${r.g} г ∉ [${lo},${hi}] (${r.food.n})`);
  as(Math.abs(k100-ref)/ref<=0.25,`${x.n}: ${Math.round(k100)} ккал/100 г vs справ. ${ref} (${r.food.n})`);
  as(r.por||/^пицц/.test(r.food.n)||!!r.note,`${x.n}: помечено как порция по умолчанию`) }
console.log(`${ok} passed, ${bad} failed`); process.exit(bad?1:0)
