// Генерирует опечатки/обрезки/ASR-варианты названий → tests/fuzzy_cases.json
global.self=global; require('../db.js');
const base=self.FOODS.filter(f=>f.src==='base'&&!/\d|%/.test(f.n));
const V=[ ['обрезка -1',w=>w.length>=6?w.slice(0,-1):null],['обрезка -2',w=>w.length>=8?w.slice(0,-2):null],['й→и',w=>/й/.test(w)?w.replace('й','и'):null],
 ['о→а безуд.',w=>{const i=w.indexOf('о',1);return i>0?w.slice(0,i)+'а'+w.slice(i+1):null}],['е→и',w=>{const i=w.indexOf('е',1);return i>0&&i<w.length-1?w.slice(0,i)+'и'+w.slice(i+1):null}],
 ['звонк→глух',w=>{const m={'г':'к','д':'т','з':'с','б':'п','в':'ф','ж':'ш'};const c=w[w.length-1];return m[c]?w.slice(0,-1)+m[c]:null}],['нн→н',w=>/нн/.test(w)?w.replace('нн','н'):null],
 ['замена буквы',w=>{if(w.length<7)return null;const i=Math.floor(w.length/2);const c=w[i];const sub={'а':'о','о':'а','е':'и','и':'е','с':'з','т':'д','к':'г','ш':'щ','ц':'с'}[c];return sub?w.slice(0,i)+sub+w.slice(i+1):null}],
 ['пропуск буквы',w=>w.length>=7?w.slice(0,3)+w.slice(4):null],['вин. падеж',w=>/а$/.test(w)?w.slice(0,-1)+'у':/я$/.test(w)?w.slice(0,-1)+'ю':null],['род. падеж',w=>/а$/.test(w)?w.slice(0,-1)+'ы':/я$/.test(w)?w.slice(0,-1)+'и':null]];
const cases=[]; base.forEach((f,i)=>{ const ws=f.n.split(' '); let li=0; ws.forEach((w,j)=>{if(w.length>ws[li].length)li=j});
  const vs0=V.map(([k,fn])=>[k,fn(ws[li])]).filter(x=>x[1]&&x[1]!==ws[li]); const seen=new Set(), vs=vs0.filter(x=>!seen.has(x[1])&&seen.add(x[1]));
  // по 3 варианта на продукт, детерминированно
  for(let j=0;j<Math.min(3,vs.length);j++){ const [k,w]=vs[(i+j)%vs.length]; const q=ws.slice(); q[li]=w; cases.push({q:q.join(' '),exp:f.n,kind:k}) } });
require('fs').writeFileSync(__dirname+'/../tests/fuzzy_cases.json',JSON.stringify(cases,null,0).replace(/\},\{/g,'},\n{'));
console.log(cases.length,'cases');
