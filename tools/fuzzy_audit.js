// node tools/fuzzy_audit.js [parser.js]  (до: git show 0270bd1:parser.js > /tmp/p.js) — считает ошибки на tests/fuzzy_cases.json
global.self=global; require('../db.js'); const P=require(process.argv[2]||'../parser.js'); const C=require('../tests/fuzzy_cases.json');
const ix=P.makeIndex(self.FOODS,[]), by={}; self.FOODS.forEach(f=>by[f.n]=f);
const eq=(a,b)=>a&&b&&(a.n===b.n||(a.k===b.k&&a.p===b.p&&a.f===b.f&&a.c===b.c));
let ok=0,unsureOk=0,silent=0,none=0,unsureBad=0; const bad=[];
for(const c of C){ const r=P.parse(c.q,{index:ix,meal:'обед'})[0]; const e=by[c.exp];
  if(!r||!r.food){ none++; bad.push(['нет',c]); continue }
  const top3=(r.cands||r.alts||[]).slice(0,3);
  if(eq(r.food,e)&&!r.unsure) ok++; else if(r.unsure&&top3.some(x=>eq(x,e))) unsureOk++; else if(r.unsure){unsureBad++;bad.push(['неувер., нет в топ-3',c,r.food.n])} else {silent++;bad.push(['ошибка молча',c,r.food.n])} }
console.log(JSON.stringify({cases:C.length,ok,unsureOk,silentWrong:silent,noMatch:none,unsureWithoutRight:unsureBad}));
if(process.env.V) bad.slice(0,+process.env.V).forEach(b=>console.log(b[0],JSON.stringify(b[1].q),'→',b[2]||'-','| ожид.',b[1].exp,'('+b[1].kind+')'));
module.exports={bad};
