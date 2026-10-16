// Диктовка своего меню: «сварил суп: 500 г курицы, …, съел тарелку 350 г» + обычные продукты по приёмам.
(function(G){
const VERB=/(?:(?:на|в)\s+(завтрак|обед|ужин|перекус)\s+)?(?:я\s+)?(сварил[аи]?|приготовил[аи]?|пожарил[аи]?|потушил[аи]?|запёк|запек|запекл[аи]|испёк|испек|испекл[аи]|сделал[аи]?|натушил[аи]?)\s+([^:]{2,40}?)\s*(?:из)?\s*:\s*/gi;
const EAT=/,?\s*(?:и\s+|а\s+)?(?:съел[аи]?|съем|поел[аи]?)\s+(?:(?:на|в)\s+(завтрак|обед|ужин|перекус)\s+)?([^.;,]*)/i;
const MEAL_RE=/(?:^|\s)(?:на|в)\s+(завтрак|обед|ужин|перекус)|(?:^|\s)(завтрак|обед|ужин|перекус)\s*[:—-]/gi;
function method(v,name){ v=v.toLowerCase(); name=name.toLowerCase();
  if(/на пару/.test(name))return 'steam'; if(/^пожар/.test(v))return 'fry'; if(/туш/.test(v))return 'stew'; if(/зап[её]|исп[её]/.test(v))return 'bake';
  if(/суп|борщ|щи|бульон|солянк|уха|рассольник|харчо|окрошк/.test(name))return 'soup'; if(/салат/.test(name))return 'raw';
  if(/^свар/.test(v))return 'boil'; if(/жарен|котлет|омлет|яичниц|оладь|блин/.test(name))return 'fry'; return 'stew' }
const DRY={гречка:'гречка сухая',рис:'рис сухой','рис бурый':'рис сухой',макароны:'макароны сухие','макароны из твердых сортов':'макароны сухие',овсянка:'овсяные хлопья',пшено:'пшено сухое',перловка:'перловка сухая',булгур:'булгур сухой',киноа:'киноа сухая',чечевица:'чечевица сухая',нут:'нут сухой',фасоль:'фасоль сухая',горох:'горох сухой',кускус:'кускус сухой',манка:'манка сухая'};
function rawOf(f,fdb){ const d=DRY[f.n]&&fdb(DRY[f.n]); if(d)return d; const b=f.n.replace(/\s+(отварн\w*|варен\w*|варён\w*|жарен\w*|туш[её]н\w*|запеч[её]нн?\w*|на пару|на гриле)$/,''); return b!==f.n&&fdb(b)||f }
function nomin(s){ if(/^(рагу|пюре|жаркое|оливье|сациви|харчо|рататуй)/.test(s))return s; return s.replace(/^(\S+?)([^аеёиоуыэюя\s])у(?=\s|$)/,'$1$2а').replace(/^(\S+?)ю(?=\s|$)/,'$1я') }
const NUM={одну:1,одна:1,один:1,две:2,два:2,три:3,четыре:4,пол:.5,половину:.5,полторы:1.5};
function portion(s,cooked,meth){ s=(s||'').toLowerCase().trim(); let m;
  if(!s)return {g:Math.min(cooked,meth==='soup'?350:300),why:'порция по умолчанию'};
  if(m=s.match(/(\d+(?:[.,]\d+)?)\s*(кг|килограмм)/))return {g:+m[1].replace(',','.')*1000};
  if(m=s.match(/(\d+(?:[.,]\d+)?)\s*(г|гр|грам)/))return {g:+m[1].replace(',','.')};
  if(/всё|все|целиком|всю/.test(s))return {g:cooked,why:'всё блюдо'};
  if(m=s.match(/(четверть|треть|половин\w*|пол)/))return {g:cooked*(/четв/.test(m[1])?.25:/треть/.test(m[1])?1/3:.5),why:m[1]+' блюда'};
  const n=(m=s.match(/(\d+|одну|одна|один|две|два|три|четыре|полторы)\s/))?(NUM[m[1]]||+m[1]):1;
  if(/тарел|миск|порц|половник|кусо|кусок/.test(s)){ const u=/половник/.test(s)?150:/кус/.test(s)?150:meth==='soup'?350:300; return {g:Math.min(cooked,n*u),why:n+' × '+u+' г'} }
  return {g:Math.min(cooked,300),why:'порция по умолчанию'} }
function parse(text,o){ // o: {KP,COOK,index,MK,fdb(n),micro(n),meal}
  text=' '+String(text||'').replace(/\s+/g,' ')+' '; const out=[], spans=[]; let m; VERB.lastIndex=0; const hits=[];
  while(m=VERB.exec(text))hits.push({i:m.index,end:VERB.lastIndex,meal:m[1],verb:m[2],name:m[3].trim()});
  hits.forEach((h,j)=>{ const stop=j+1<hits.length?hits[j+1].i:text.length; let body=text.slice(h.end,stop); let tail='';
    const dot=body.search(/[.;!?](\s|$)/); if(dot>=0){ tail=body.slice(dot+1); body=body.slice(0,dot) }
    const mk=body.search(/(?:,\s*|\s)(?:а\s+|потом\s+)?(?:на|в)\s+(?:завтрак|обед|ужин|перекус)(?=[\s,:]|$)|(?:,\s*|\s)(?:завтрак|обед|ужин|перекус)\s*[:—-]/i); if(mk>=0){ tail=body.slice(mk)+' '+tail; body=body.slice(0,mk) }
    let eat='', meal=h.meal; const em=body.match(EAT); if(em){ eat=em[2]; meal=meal||em[1]; tail=body.slice(em.index+em[0].length)+' '+tail; body=body.slice(0,em.index) }
    if(!meal){ const pm=text.slice(0,h.i).match(/(завтрак|обед|ужин|перекус)[^а-я]*$/i); if(pm)meal=pm[1].toLowerCase() }
    spans.push([h.i,stop-tail.length]);
    const meth=method(h.verb,h.name), raw=o.KP.parse(body,{index:o.index,noMeals:true,meal:'обед'}).filter(x=>x.food);
    const ings=raw.map(x=>{ const f=rawOf(x.food,o.fdb); return {n:f.n,g:x.g,k:f.k,p:f.p,f:f.f,c:f.c,cat:f.cat||'',m:o.micro(f.n)} });
    if(!ings.length)return; const r=o.COOK.recipe(ings,meth,o.MK), pr=portion(eat,r.cooked,meth);
    const nm=nomin(h.name.replace(/^(себе|нам)\s+/,'').toLowerCase()); out.push({meal:(meal||o.meal||'обед').toLowerCase(),n:nm.charAt(0).toUpperCase()+nm.slice(1)+' (свой)',g:Math.round(pr.g),why:pr.why||'',
      k100:r.k,p100:r.p,f100:r.f,c100:r.c,m100:r.m,dish:{meth,cooked:r.cooked,oil:r.oil,ings:ings.map(i=>({n:i.n,g:Math.round(i.g)}))}}) });
  let rest=text; spans.slice().reverse().forEach(([a,b])=>{ rest=rest.slice(0,a)+' , '+rest.slice(b) });
  const lastMeal=(s,i)=>{ const pm=s.slice(0,i).match(/(завтрак|обед|ужин|перекус)/gi); return pm?pm[pm.length-1].toLowerCase():null };
  if(rest.replace(/[\s.,;]/g,'').length>2){ const ctx=lastMeal(text,spans.length?spans[0][0]:0); o.KP.parse(rest.replace(/(\s*[,.]\s*){2,}/g,', ').replace(/^[\s,.]+|[\s,.]+$/g,''),{index:o.index,meal:ctx||o.meal}).forEach(x=>{ if(!x.food){ out.push({meal:x.meal||o.meal,unk:x.text,g:x.g||0}); return }
    const f=x.food; out.push({meal:x.meal||o.meal,n:f.n,g:Math.round(x.g),k100:f.k,p100:f.p,f100:f.f,c100:f.c,m100:o.micro(f.n)}) }) }
  const ORD=['завтрак','перекус','обед','ужин'], meals=[];
  out.forEach(x=>{ const mm=ORD.includes(x.meal)?x.meal:'перекус'; let g=meals.find(z=>z.m===mm); if(!g)meals.push(g={m:mm,items:[]}); g.items.push(x) });
  meals.sort((a,b)=>ORD.indexOf(a.m)-ORD.indexOf(b.m)); return {meals,unknown:out.filter(x=>x.unk).map(x=>x.unk)} }
const M={parse,portion,method};
if(typeof module!=='undefined'&&module.exports)module.exports=M; else G.DICT=M;
})(typeof self!=='undefined'?self:this);
