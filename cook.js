// Кулинарная обработка (зеркало tools/cook.py). Источники: USDA Table of Cooking Yields for Meat and Poultry (2014);
// USDA Table of Nutrient Retention Factors, Release 6 (2007); USDA SR Legacy (уварка круп: пары сухой/отварной); Сборник рецептур (1996) — масло при жарке.
(function(G){
const YIELD={meat:{boil:.70,stew:.70,fry:.72,bake:.73,grill:.72,steam:.78,soup:1},poultry:{boil:.73,stew:.72,fry:.75,bake:.74,grill:.73,steam:.80,soup:1},
 fish:{boil:.87,stew:.87,fry:.82,bake:.82,grill:.80,steam:.88,soup:1},veg:{boil:.97,stew:.90,fry:.80,bake:.75,grill:.78,steam:.97,soup:1},egg:{boil:1,fry:.9,bake:.9,steam:1,stew:1,grill:.9,soup:1},other:{boil:1,stew:.95,fry:.9,bake:.88,grill:.88,steam:1,soup:1}};
const FATRET={boil:.8,stew:.9,fry:.95,bake:.85,grill:.75,steam:.9};
const OIL={meat:{fry:4},poultry:{fry:4},fish:{fry:6},veg:{fry:8,stew:3,grill:2,bake:2},egg:{fry:5},other:{fry:6}};
const WATER={'гречка сухая':2.85,'рис сухой':2.81,'макароны сухие':2.35,'пшено сухое':3.18,'перловка сухая':2.86,'булгур сухой':3.0,'киноа сухая':3.07,'овсяные хлопья':4.5,'чечевица сухая':3.03,'нут сухой':2.3,'фасоль сухая':2.65,'горох сухой':3.08,'кускус сухой':3.36,'лапша рисовая сухая':3.37,'лапша яичная сухая':2.4,'манка сухая':4.0,'рис для суши':2.4};
const EV={soup:.85,boil:.9,stew:.6,bake:.7};
const RET={boil:{C:.5,B1:.65,B2:.8,B3:.65,B5:.65,B6:.55,B9:.55,B12:.75,A:.9,E:.9,K:.9,Ch:.85,Ca:.9,P:.85,Mg:.8,K_:.7,Na:.8,Fe:.9,Zn:.9,Cu:.85,Mn:.9,Se:.85,I:.8,O3:.9},
 soup:{C:.5,B1:.75,B2:.9,B3:.9,B5:.85,B6:.8,B9:.65,B12:.9,A:.9,E:.9,K:.9,Ch:.95},stew:{C:.6,B1:.7,B2:.85,B3:.8,B5:.8,B6:.65,B9:.65,B12:.8,A:.85,E:.85,Ch:.9,K_:.9,Mg:.9},
 fry:{C:.7,B1:.75,B2:.9,B3:.85,B5:.85,B6:.75,B9:.75,B12:.8,A:.8,E:.8,Ch:.9},bake:{C:.7,B1:.75,B2:.9,B3:.85,B5:.8,B6:.75,B9:.7,B12:.85,A:.85,E:.85,Ch:.9},
 grill:{C:.7,B1:.75,B2:.9,B3:.85,B5:.8,B6:.75,B9:.7,B12:.85,A:.85,E:.85,Ch:.9},steam:{C:.8,B1:.85,B2:.95,B3:.9,B5:.9,B6:.85,B9:.8,B12:.9,A:.95,E:.95,Ch:.95,K_:.9},raw:{}};
const METH=[['raw','без готовки'],['boil','варка'],['soup','суп'],['stew','тушение'],['fry','жарка'],['bake','запекание'],['grill','гриль'],['steam','на пару']];
function group(cat,n){ if(/кур|индей|утк|гус|перепел|цесар/.test(n||''))return 'poultry'; if(cat==='meat')return 'meat'; if(cat==='fish'||cat==='fishready')return 'fish'; if(cat==='veg')return 'veg'; if(cat==='egg')return 'egg'; return 'other' }
const COOKED=/отварн|вареный|вареная|вареное|соленая|соленые|консерв|копчен|жарен|запечен|тушен|на гриле|на пару/;
// ings: [{n,g,k,p,f,c,m,cat}] сырые; → {cooked,k,p,f,c (на 100 г), m (на 100 г), oil}
function recipe(ings,meth,K,cooked){ meth=meth||'raw'; const liq=ings.some(i=>/^(вода|молоко|бульон|кефир|сливки|кокосовое молоко)/.test(i.n));
  let w=0,k=0,p=0,f=0,c=0,hasOil=ings.some(i=>/^масло /.test(i.n)),oil=0; const m=new Array(K?K.length:0).fill(0), rt=RET[meth]||{};
  ings.forEach(i=>{ const g=+i.g||0; if(/^вода$/.test(i.n)){ w+=g*(EV[meth]||1); return }
    const gr=group(i.cat,i.n); let y=1,fr=1;
    if(WATER[i.n]) y=meth!=='soup'&&meth!=='raw'&&!liq?WATER[i.n]:1;
    else if(liq&&/^(молоко|кефир|сливки|бульон|кокосовое молоко)/.test(i.n)&&EV[meth]) y=EV[meth];
    else if(meth!=='raw'&&meth!=='soup'&&gr!=='other'&&!COOKED.test(i.n)){ y=(/фарш/.test(i.n)?.82:YIELD[gr][meth]||1); if(gr==='meat'||gr==='poultry')fr=FATRET[meth]||1 }
    if(meth==='fry'&&!hasOil&&gr!=='other'&&!COOKED.test(i.n)) oil+=g*(OIL[gr].fry||0)/100;
    w+=g*y; k+=(i.k*g/100)-(i.f*g/100*(1-fr))*9; p+=i.p*g/100; f+=i.f*g/100*fr; c+=i.c*g/100;
    if(i.m) i.m.forEach((x,j)=>m[j]+=(+x||0)*g/100*(rt[K[j]]==null?1:rt[K[j]])) });
  f+=oil*.98; k+=oil*.98*9; w+=oil*.98;
  // защита: взвешенный выход вне 0.4…2.5 от расчётного (устаревшее поле «выход», граммы вместо порций) → расчётный выход
  let W=cooked||w||1, warn=''; if(cooked&&w>0&&(cooked<w*.4||cooked>w*2.5)){ warn='выход '+cooked+' г неправдоподобен (расчёт '+Math.round(w)+' г)'; W=w }
  let o={cooked:Math.round(cooked&&!warn?cooked:w),k:k/W*100,p:p/W*100,f:f/W*100,c:c/W*100,m:m.map(x=>x/W*100),oil:Math.round(oil)};
  const bad=sane(o); if(bad&&W!==w&&w>0){ W=w; warn=bad; o={cooked:Math.round(w),k:k/W*100,p:p/W*100,f:f/W*100,c:c/W*100,m:m.map(x=>x/W*100),oil:Math.round(oil)} }
  if(warn){ o.warn=warn; if(typeof console!=='undefined')console.warn('[cook]',warn) } return o }
// физические пределы на 100 г: Б ≤ 90 (мясо/птица/рыба ≤ 35 сырое, ≤ 40 готовое), Б+Ж+У ≤ 100 г, ккал ≈ 4Б+9Ж+4У (Этуотер)
function sane(x,cat,name){ name=String(name||x.n||'').toLowerCase(); const p=+x.p||0,f=+x.f||0,c=+x.c||0,k=+x.k||0; if(p<0||f<0||c<0||k<0)return 'отрицательные значения';
  if(p>(/meat|fish|poultry/.test(cat||'')&&!/чипс|вял|сушен|сушён|джерк|снек|протеин|порош|сух/.test(name)?40:90))return 'белок '+p.toFixed(1)+' г/100 г'; if(f>100||c>100||p+f+c>101)return 'Б+Ж+У '+(p+f+c).toFixed(0)+' г/100 г';
  const a=4*p+9*f+4*c, alc=/ликер|ликёр|коктейл|вино|пиво|водк|коньяк|виски|ром|джин|глинтвейн|по-ирландски|сидр|шампан|настойк|бальзам|текил|сок|сушен|сушён|отруб|клетчат/.test(name); if(a>30&&!alc&&(k>a*1.5+40||k<a*.5-40))return 'Этуотер: '+Math.round(k)+' ккал vs '+Math.round(a); return '' }
const M={YIELD,FATRET,OIL,WATER,RET,METH,group,recipe,sane};
if(typeof module!=='undefined'&&module.exports)module.exports=M; else G.COOK=M;
})(typeof self!=='undefined'?self:this);
