global.self=global; require('../db.js'); const P=require('../parser.js'); const ix=P.makeIndex(self.FOODS,[{n:'мой плов',k:180,p:8,f:8,c:20,po:300}]);
const p=s=>P.parse(s,{index:ix,meal:'обед'}).map(r=>`${r.meal}|${r.food?r.food.n:'??'+r.text}|${r.g}`).join(' ; ');
for(const s of process.argv.slice(2))console.log(s,'\n  =>',p(s));
