// Разбор русской речи/текста о еде → продукты, количества, приёмы пищи. Общий для голоса и клавиатуры.
(function(G){
'use strict';
const ONES={ноль:0,один:1,одна:1,одно:1,одну:1,одного:1,одной:1,раз:1,два:2,две:2,двух:2,три:3,трех:3,четыре:4,четырех:4,пять:5,пяти:5,шесть:6,шести:6,семь:7,семи:7,восемь:8,восьми:8,девять:9,девяти:9,
 десять:10,десяти:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,
 двадцать:20,двадцати:20,тридцать:30,тридцати:30,сорок:40,сорока:40,пятьдесят:50,пятидесяти:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,
 сто:100,ста:100,двести:200,двухсот:200,триста:300,трехсот:300,четыреста:400,четырехсот:400,пятьсот:500,пятисот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900,
 тысяча:1000,тысячу:1000,тысячи:1000,полтора:1.5,полторы:1.5,полутора:1.5,половина:.5,половину:.5,половинка:.5,половинку:.5,половинки:.5,пол:.5,
 пара:2,пару:2,парочку:2,парочка:2,пары:2,четверть:.25,треть:.33,несколько:2,пяток:5,десяток:10,дюжина:12};
const MEALS=[[/^(завтрак\S*|позавтракал\S*|утр(ом|о))$/,'завтрак'],[/^(обед\S*|пообедал\S*|ланч\S*|днем)$/,'обед'],[/^(ужин\S*|поужинал\S*|вечер(ом)?)$/,'ужин'],[/^(перекус\S*|перекусил\S*|полдник\S*|второй\s?завтрак)$/,'перекус']];
// единицы: [регэксп, тип, граммы]
const UNITS=[[/^(г|гр|грамм\S*|граммов)$/,'g',1],[/^(кг|кило|килограмм\S*)$/,'g',1000],[/^(мл|миллилитр\S*)$/,'g',1],[/^(л|литр\S*|литра)$/,'g',1000],
 [/^(шт|штук\S*|штуч\S*)$/,'pc'],[/^стакан\S*$/,'g',250],[/^(кружк\S*|кружек|кружечк\S*)$/,'g',300],[/^(чашк\S*|чашек|чашечк\S*)$/,'g',200],
 [/^(ложк\S*|ложек|ложечк\S*|ложечек)$/,'spoon'],[/^порци\S*$/,'po'],[/^(тарелк\S*|тарелок|тарелочк\S*|миск\S*|мисок)$/,'g',300],
 [/^(кус|кусок|куска|куски|кусков|кусочек|кусочка|кусочков|кусочки)$/,'pcs'],[/^(ломтик\S*|ломт\S*|слайс\S*)$/,'slice'],
 [/^(банк\S*|банок|баночк\S*)$/,'can'],[/^(бутылк\S*|бутылок|бутылочк\S*)$/,'g',500],[/^(пачк\S*|пачек|упаковк\S*|упаковок|пакет\S*)$/,'pack'],
 [/^(горст\S*)$/,'g',30],[/^(щепот\S*)$/,'g',1],[/^(зубчик\S*|зубчиков)$/,'g',5],[/^половник\S*$/,'g',100],[/^плитк\S*$/,'g',100],
 [/^(бокал\S*|фужер\S*)$/,'g',150],[/^(рюмк\S*|рюмок|стопк\S*|стопок)$/,'g',50],[/^шот\S*$/,'g',40],[/^(ковш\S*)$/,'g',250],[/^(батон|батона|батоны|батонов|батоном)$/,'g',400],[/^(буханк\S*)$/,'g',600]];
const SIZE={большой:1.4,большая:1.4,большое:1.4,большую:1.4,большие:1.4,больших:1.4,огромный:1.7,огромная:1.7,огромную:1.7,маленький:.7,маленькая:.7,маленькое:.7,маленькую:.7,маленьких:.7,небольшой:.75,небольшая:.75,небольшую:.75,средний:1,средняя:1,среднюю:1,полный:1,полную:1};
const FILLER=new Set('я мы съел съела съели поел поела поели скушал скушала покушал покушала ел ела пил пила выпил выпила выпили сегодня был была были было потом затем еще также а ну вот так типа примерно около где-то где то еще и ещё плюс кроме того сначала после это у меня мне взял взяла заказал заказала приготовил приготовила сделал сделала перекусил'.split(' '));
const STOP=new Set('и с со в во на по из для к ко от до за под при о об а же'.split(' '));
const SPOON_TSP=/^(чайн\S*|ч)$/, SPOON_TBSP=/^(столов\S*|ст)$/;
const IRR={мой:'мой',моя:'мой',мое:'мой',мои:'мой',моего:'мой',моей:'мой',мою:'мой',моих:'мой',моим:'мой',моему:'мой',яиц:'яйц',яичк:'яйц',яичка:'яйц',яички:'яйц',чая:'чай',чаю:'чай',чаем:'чай',чаек:'чай',чайку:'чай',чайка:'чай',щей:'щи',щами:'щи',огурчик:'огурц',огурчика:'огурц',огурчики:'огурц',огурец:'огурц',
 помидорк:'помидор',помидорку:'помидор',помидорки:'помидор',яблочко:'яблок',яблочка:'яблок',яблочки:'яблок',морковку:'морков',морковка:'морков',морковки:'морков',морковь:'морков',моркови:'морков',хлебушек:'хлеб',хлебушка:'хлеб',
 супчик:'суп',супчика:'суп',кофеек:'коф',кофейку:'коф',кофейка:'коф',кофе:'коф',картошечку:'картошк',картошечки:'картошк',пюрешка:'пюр',пюрешку:'пюр',пюре:'пюр',салатик:'салат',салатика:'салат',
 кашу:'каш',каши:'каш',кашка:'каш',кашки:'каш',кашку:'каш',творожок:'творог',творожка:'творог',сырок:'сырок',сырка:'сырок',сырочек:'сырок',котлеток:'котлет',котлетку:'котлет',курочку:'куриц',курочка:'куриц',курочки:'куриц',
 пельмешки:'пельмен',пельмешек:'пельмен',шаверму:'шаверм',шаурму:'шаурм',овсянку:'овсянк',гречу:'греч',гречу:'греч',лук:'лук',лука:'лук',луком:'лук',мясо:'мяс',мяса:'мяс',мясом:'мяс',рыбу:'рыб',рыбы:'рыб',рыбой:'рыб',
 сала:'сал',салом:'сал',сало:'сал',масло:'масл',масла:'масл',маслом:'масл',маслица:'масл',сахара:'сахар',сахаром:'сахар',сахарку:'сахар',меду:'мед',медку:'мед',медом:'мед',молочка:'молок',молочком:'молок',кефирчик:'кефир',кефирчика:'кефир'};
const ENDS=['иями','ями','ами','ией','иям','ием','иях','ого','его','ому','ему','ыми','ими','ая','яя','ое','ее','ые','ие','ый','ий','ой','ей','ую','юю','ом','ем','ам','ям','ах','ях','ов','ев','ью','ы','и','а','я','у','ю','е','о','ь','й'];
function stem(w){ if(IRR[w])return IRR[w]; if(/\d/.test(w)||w.length<=3)return w;
  for(const e of ENDS) if(w.endsWith(e)&&w.length-e.length>=3){w=w.slice(0,-e.length);break}
  w=w.replace(/(е|о)чк$/,'к'); return IRR[w]||w }
function norm(s){ return (' '+String(s).toLowerCase().replace(/ё/g,'е')+' ')
  .replace(/(?:диаметр\S*\s+|круг\S*\s+)?(\d{2})\s*(?:см|сантиметр\S*)(?=[\s.,;]|$)/g,' диам$1 ').replace(/(?:на\s+)?тонк\S*\s+тест\S*/g,' тонкоетесто ').replace(/(?:на\s+)?(?:традиционн\S*|пышн\S*|толст\S*)\s+тест\S*/g,' ').replace(/(\s)круг(?=\s)/g,'$1').replace(/макаронс\S*/g,'макаруны').replace(/(^|\s)(4|четыр\S*)\s+сыр\S*/g,(m,a,o,i,str)=>!/^\d/.test(o)||/пицц|додо|денс|доминос|dodo|domino/.test(str)?a+'четыресыра':m).replace(/(трайфл\S*|трифл\S*)\s+в\s+стаканчик\S*/g,'$1').replace(/(\d)[,.](\d)/g,'$1.$2').replace(/(\d)\s*(процент\S*|%)/g,'$1% ')
  .replace(/(\d)(г|гр|кг|мл|л|шт)(?=[\s.,;]|$)/g,'$1 $2')
  .replace(/(\s)пол(?=(бутылк|упаковк|стакан|тарелк|порци|литр|кило|банк|ложк|кружк|чашк|пачк|плитк|батон|буханк|кусочк|кусок|куска|банан|яблок|апельсин|авокадо|огурц|помидор|грейпфрут|лимон|пицц|лепешк|лаваш|булк|багет|шаурм|шаверм|пачк))/g,'$1пол ')
  .replace(/[«»"!?()]/g,' ').replace(/ - /g,' ').replace(/\s+/g,' ') }
function tokens(s){ return (norm(s).match(/[a-zа-я0-9.%-]+/g)||[]).map(t=>t.replace(/^-+|-+$/g,'')).filter(Boolean) }
function numVal(t){ if(/^\d+(\.\d+)?$/.test(t))return parseFloat(t); return t in ONES?ONES[t]:null }
// склеивает "двести пятьдесят", "два с половиной", "полтора"
function readNum(ts,i){ let v=numVal(ts[i]); if(v===null||/%$/.test(ts[i]))return null; let j=i+1;
  if(v>=1&&v<1000&&Number.isInteger(v)) while(j<ts.length){const n=numVal(ts[j]); if(n!==null&&n<v&&!/%/.test(ts[j])&&!(v<20)){v+=n;j++}else break}
  if(ts[j]==='тысяч'||ts[j]==='тысячи'){v*=1000;j++}
  if(ts[j]==='с'&&/^половин/.test(ts[j+1]||'')){v+=.5;j+=2}
  return {v,j} }
function unitOf(t){ for(const u of UNITS) if(u[0].test(t)) return u; return null }
// ---------- индекс продуктов ----------
function makeIndex(foods,recipes){ const list=[]; const add=(f,isR)=>{ const names=[f.n].concat(f.s||[]);
   list.push({f,r:!!isR,ns:names.map(n=>{const w=tokens(n).filter(t=>!STOP.has(t)); const a=w.map(stem); a.raw=w; return a})}) };
  (foods||[]).forEach(f=>add(f,false)); (recipes||[]).forEach(f=>add(f,true)); return list }
function lev(a,b,max){ if(Math.abs(a.length-b.length)>max)return max+1; let p=[];for(let j=0;j<=b.length;j++)p[j]=j;
  for(let i=1;i<=a.length;i++){ const c=[i]; let mn=i; for(let j=1;j<=b.length;j++){ c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); if(c[j]<mn)mn=c[j] }
    if(mn>max)return max+1; p=c } return p[b.length] }
// похожесть основ: 1 — точно/префикс, 0.6–0.8 — опечатка (редакционное расстояние), 0 — нет
function sim(a,b){ if(a===b)return 1; a=a.replace(/й/g,'и'); b=b.replace(/й/g,'и'); if(a===b)return .95; const m=Math.min(a.length,b.length); if(/\d/.test(a+b))return 0;
  if(m>=4&&(a.startsWith(b)||b.startsWith(a)))return a.length-b.length>=2?.85:1; let k=0; while(k<m&&a[k]===b[k])k++; if(m>=4&&k>=4&&k>=m*.75)return .88;
  if(a[0]!==b[0]||m<3)return 0; if(m<=4)return lev(a,b,1)<=1&&a.length===b.length?.65:0; const L=Math.max(a.length,b.length);
  // обрезанные окончания: сравниваем и с началом длинного слова
  const d=Math.min(lev(a,b,2),a.length<b.length?lev(a,b.slice(0,a.length),1)+.5:9);
  if(d<=1&&L>=5)return .8-(d>=1?(d-1)*.4:0); if(d<=1.5&&m>=5)return .7; if(d<=2&&m>=7&&k>=2)return .6; return 0 }
function same(a,b){ return sim(a,b)>=.88 }
function scoreName(q,n){ let mq=0,fz=0,used=new Set(); q.forEach((t,qi)=>{ let bi=-1,bs=0; n.forEach((x,ii)=>{ if(used.has(ii))return; let v=sim(t,x); if(v<.9&&q.raw&&n.raw){ const w=sim(q.raw[qi],n.raw[ii]); if(w>v)v=Math.min(w,.8) } if(v>bs){bs=v;bi=ii} });
   if(bi>=0){mq+=bs;used.add(bi);if(bs<.9)fz++; if(q.raw&&n.raw&&q.raw[qi]&&q.raw[qi].length>=4&&n.raw[bi]){ const e=w=>w.replace(/(ой|ом|а|я|ы|и|у|ю|е)$/,''); if(q.raw[qi]===n.raw[bi]||e(q.raw[qi])===e(n.raw[bi]))mq+=.1 }} });
  if(!mq)return {s:-1,fz:0}; const extra=n.length-used.size; return {s:mq*10-extra*3.2-(q.length-used.size)*6+(sim(q[0],n[0])>=.9?1.5:0),fz,all:used.size===q.length} }
function search(index,text,lim){ const qw=tokens(String(text).replace(/без\s+\S+/g,' ')).filter(t=>!STOP.has(t)&&!FILLER.has(t)&&!SIZE[t]&&!(t in ONES)), q=qw.map(stem); q.raw=qw; if(!q.length)return [];
  const out=[]; for(const it of index){ let b=-1e9,fz=0,al=false; it.ns.forEach((n,ni)=>{const r=scoreName(q,n),s=r.s+(ni===0?.3:0); if(s>b){b=s;fz=r.fz;al=r.all}})
   if(b>0&&it.f.src==='offru'&&fz)continue;
   if(b>0){ if(it.r)b+=1; if(it.f.src==='derived')b-=.6; if(it.f.src==='off'||it.f.src==='offru')b-=.3; if(it.f.used)b+=Math.min(1.5,it.f.used*.3); out.push({it,b,fz,al}) } }
  out.sort((a,b)=>b.b-a.b); return out.slice(0,lim||8).map(x=>({food:x.it.f,recipe:x.it.r,score:x.b,fz:x.fz,all:x.al,full:!x.fz&&x.b>=q.length*10-1})) }
// ---------- разбор ----------
function defaultMeal(d){ const h=(d||new Date()).getHours(); return h>=4&&h<11?'завтрак':h<16&&h>=11?'обед':h>=16&&h<18?'перекус':h>=18&&h<23?'ужин':'перекус' }
function grams(food,num,unit,size,tsp){ const pc=food&&food.pc, po=food&&food.po; let n=num==null?null:num, g;
  if(!unit&&n!=null&&n<=2&&n%1!==0&&food&&(/drink/.test(food.cat||'')||/пив|кол|лимонад|сок|вод|квас|энергетик|сидр|чай|морс|лимонад/.test(food.n.toLowerCase())||food.ml)) return Math.round(n*1000); // «пиво 0,5» = 0,5 л
  if(!unit){ if(n==null) g=pc&&pc<=300&&!food.pl?pc:(po||pc||100); else if(n>=20) g=n; else g=n*(pc||po||100) }
  else if(unit[1]==='g') g=(n==null?1:n)*unit[2];
  else if(unit[1]==='pc'||unit[1]==='pcs') g=(n==null?1:n)*(pc||(unit[1]==='pcs'?Math.min(po||80,120):po)||100);
  else if(unit[1]==='slice') g=(n==null?1:n)*(pc&&pc<=40?pc:20);
  else if(unit[1]==='po') g=(n==null?1:n)*(po||pc||250);
  else if(unit[1]==='spoon') g=(n==null?1:n)*(tsp?5:15)*(food&&/мед|сметан|варень|джем|арахисов|нутелл|паст/.test(food.n)?1.4:food&&/^(сахар|соль|мук)|какао/.test(food.n)?.8:1);
  else if(unit[1]==='can') g=(n==null?1:n)*(food&&/drink|напит/.test(food.cat||'')||food&&/пив|кол|лимонад|энергетик|сок/.test(food.n)?330:food&&/кукуруз|горош|фасол/.test(food.n)?340:185);
  else if(unit[1]==='pack') g=(n==null?1:n)*(pc&&pc>=40?pc:food&&/чипс|сухарик|кириешк/.test(food.n)?100:200);
  return Math.max(1,Math.round(g*(size||1))) }
function nutr(food,g){ const m=g/100; return {k:Math.round(food.k*m),p:Math.round(food.p*m*10)/10,f:Math.round(food.f*m*10)/10,c:Math.round(food.c*m*10)/10} }
function splitMeals(ts,def){ const segs=[]; let cur={meal:def,ts:[]};
  for(let i=0;i<ts.length;i++){ const t=ts[i]; let m=null; for(const [re,name] of MEALS) if(re.test(t)){m=name;break}
   if(t==='второй'&&/^завтрак/.test(ts[i+1]||'')){m='перекус';i++}
   if(t==='на'&&ts[i+1]==='ночь'){m='ужин';i++}
   if(m){ while(cur.ts.length&&/^(на|в|во|за|к|а|и|потом|затем|ещё|еще|был|была|было|был|сегодня)$/.test(cur.ts[cur.ts.length-1]))cur.ts.pop();
     if(cur.ts.length)segs.push(cur); cur={meal:m,ts:[]}; while(/^(у|меня|был|была|было|были|я|съел|съела|ел|ела)$/.test(ts[i+1]||''))i++; continue }
   cur.ts.push(t) }
  if(cur.ts.length)segs.push(cur); return segs }
function splitItems(ts){ const out=[]; let cur=[];
  const SEP=/^(и|плюс|да|потом|затем|еще|ещё|также|а|ну|после|сверху|вприкуску|заел|заела|запил|запила)$/;
  for(const t of ts){ if(t===','||t===';'||SEP.test(t)){ if(cur.length)out.push(cur); cur=[]; continue } cur.push(t) }
  if(cur.length)out.push(cur); return out }
const WHOLE=/^(кожур|кожиц|шкурк|скорлуп|целиком|целый|целая|целое|целые|целую|целой|неочищ|нечищ)/;
function parseChunk(index,ts){ // одна позиция: количество + продукт
  ts=ts.filter(t=>!FILLER.has(t)); let whole=false; ts=ts.filter((t,i)=>{ if(WHOLE.test(t)){whole=true;return false} if(/^(с|со|в)$/.test(t)&&WHOLE.test(ts[i+1]||''))return false; return true }); let num=null,unit=null,size=1,tsp=false,food=[];
  let diam=null,thin=false;
  for(let i=0;i<ts.length;i++){ const t=ts[i];
    { const dm=/^диам(\d+)$/.exec(t); if(dm){diam=+dm[1];continue} if(t==='тонкоетесто'){thin=true;continue} }
    if(SIZE[t]){size*=SIZE[t];continue}
    if(SPOON_TSP.test(t)&&unitOf(ts[i+1]||'')&&unitOf(ts[i+1])[1]==='spoon'){tsp=true;continue}
    if(SPOON_TBSP.test(t)&&unitOf(ts[i+1]||'')){continue}
    if(num===null&&!/%$/.test(t)&&!/^(из|от)$/.test(ts[i-1]||'')){ const r=readNum(ts,i); if(r&&!/%$/.test(ts[r.j]||'')){ num=r.v; i=r.j-1; continue } }
    const u=unit?null:unitOf(t); if(u&&(num!==null||food.length===0||i<ts.length-1||true)){ if(!(u[1]==='g'&&u[2]===1000&&t==='л'&&num===null&&food.length)) {unit=u; if(/^чайн/.test(ts[i-1]||''))tsp=true; continue} }
    food.push(t) }
  if(num==null&&unit&&unit[1]==='g'&&/^(грамм|гр|г)/.test('')){}
  const text=food.join(' ').trim(); return {num,unit,size,tsp,text,whole,diam,thin} }
function edibleWord(f){ return f&&f.cat==='nut'?'ядра':f&&/яйц/.test(f.n)?'без скорлупы':f&&/fish|meat/.test(f.cat||'')?'без костей':'мякоти' }
// ---------- сети (меню с официальных сайтов; данные в chains.js грузятся лениво) ----------
const PRE='(^|\\s)(?:(?:из|в|во|от)\\s+)?';
const CHAIN_RE=[['dodo-pizza',new RegExp(PRE+'(?:додо|dodo|додопицц\\S*)(?:\\s+пицц\\S*)?(?=\\s|$)')],['dens-pizza',new RegExp(PRE+"(?:денс\\S*|den'?s|dens|ден)(?:\\s+пицц\\S*)?(?=\\s|$)")],
 ['dominos-pizza',new RegExp(PRE+"(?:доминос\\S*|домино|dominos|domino'?s?)(?:\\s+пицц\\S*)?(?=\\s|$)")],['subjoy',new RegExp(PRE+'(?:сабджо\\S*|subjoy|сабвей\\S*|subway)(?=\\s|$)')],
 ['mu-mu',new RegExp(PRE+'(?:му-му|муму|mu-mu|mumu|му\\s+му)(?=\\s|$)')],['yakitoriya',new RegExp(PRE+'(?:якитори\\S*|yakitoriya)(?=\\s|$)')],['shokoladnitsa',new RegExp(PRE+'(?:шоколадниц\\S*|шоко|shoko\\S*)(?=\\s|$)')]];
const CHAIN_META=[["dodo-pizza", "Додо Пицца", "Додо", 146], ["dens-pizza", "Den's Pizza (Новосибирск)", "Den's", 51], ["dominos-pizza", "Domino's Pizza", "Доминос", 130], ["subjoy", "Сабджой", "Сабджой", 51], ["mu-mu", "Му-Му", "Му-Му", 231], ["yakitoriya", "Якитория", "Якитория", 194], ["shokoladnitsa", "Шоколадница", "Шоколадница", 153]];
function chainDetect(t){ for(const [slug,re] of CHAIN_RE){ const m=re.exec(t); if(m)return {slug,rest:t.slice(0,m.index)+(m[1]||'')+' '+t.slice(m.index+m[0].length)} } return null }
function chainIn(text){ return !!chainDetect(norm(text)) }
let CUR_CHAIN=null; const CIDX={};
function chainIndex(slug){ if(CIDX[slug])return CIDX[slug]; const C=(G.CHAINS||[]).find(c=>c.slug===slug); if(!C)return null;
  const foods=C.items.map(it=>{ const n=it.n.toLowerCase().replace(/[«»"]/g,''); const short=n.replace(/^(пицца|сэндвич|салат|суп|ролл|роллы|напиток|десерт)\s+/,''); return {n,s:short!==n?[short]:[],_it:it} });
  return CIDX[slug]={C,ix:makeIndex(foods,[])} }
function genericFor(index,name){ const t=name.toLowerCase().replace(/[«»"()]/g,' ').trim(), w=tokens(t); for(const q of [t,w[0]||'']){ if(!q)continue; const a=search(index,q,1)[0]; if(a&&a.score>=tokens(q).length*10*.6)return a.food } return null }
function chainMatch(slug,ch,index){ const ci=chainIndex(slug); if(!ci||!ch.text)return null; const qt=ch.text.replace(/(^|\s)пицц\S*/g,' ').trim()||ch.text; const res=search(ci.ix,qt,4); const b=res[0]; if(!b)return null;
  const q=qt.split(/\s+/).filter(Boolean).length||1; if(!(b.full||b.all||b.score>=q*10*.6))return null;
  return {food:chainFood(ci.C,b.food._it,ch,index),alts:res.slice(1).map(a=>chainFood(ci.C,a.food._it,{},index))} }
function chainFood(C,it,ch,index){ let vs=it.v, v=vs[0];
  if(vs.some(x=>x.d)){ const want=ch.diam||30, thin=!!ch.thin; const c=vs.filter(x=>x.d), sc=x=>Math.abs(x.d-want)*2+(!!x.t!==thin?3:0); c.sort((a,b)=>sc(a)-sc(b)); v=c[0] }
  let k=v.k,p=v.p,f=v.f,c=v.c,cnote='';
  if(v.bad||v.est){ const g=genericFor(index,it.n);
    if(v.bad&&g){ k=g.k;p=g.p;f=g.f;c=g.c; cnote='данные сети ошибочны, взято типичное' }
    else { const e=g?[4*g.p,9*g.f,4*g.c]:[60,105,135], s=e[0]+e[1]+e[2]||1; p=Math.round(k*e[0]/s/4*10)/10; f=Math.round(k*e[1]/s/9*10)/10; c=Math.round(k*e[2]/s/4*10)/10; cnote=v.bad?'данные сети противоречивы — Б/Ж/У оценены':'Б/Ж/У оценены (сеть публикует только ккал)' } }
  const pz=v.d&&(/пицц/i.test(it.cat+' '+it.n)||(/pizza/.test(C.slug)&&v.d>=20&&!/напит|соус|десерт|закуск/i.test(it.cat)));
  const food={n:it.n+(v.d?' '+v.d+' см':'')+(v.t?', тонкое':'')+' ('+C.short+')',k,p,f,c,cat:'chain',src:'chain',url:it.u,chain:C.short,cnote,po:v.g||250}; if(v.ml)food.ml=1;
  if(pz){ food.pizza=true; food.pz={[v.d]:v.g||Math.round(520*(v.d/30)**2)}; food.pzd=v.d; if(v.sl)food.pzsl=v.sl } else if(v.g&&!v.ml) food.pc=v.g;
  return food }
// пицца: вес целой по диаметру (pz у брендов, иначе 520 г на 30 см — Den's Pizza «Пепперони» — по площади), кусков: <20 см — 4, <25 — 6, иначе 8; тонкое тесто ×0.75
function pizza(food,d,thin){ d=d||food.pzd||30; const z=food.pz; let W; if(food.chain)thin=false; /* у сети уже выбран вариант теста */
  if(z&&z[d])W=z[d]; else if(z){ const ks=Object.keys(z).map(Number).sort((a,b)=>Math.abs(a-d)-Math.abs(b-d)); W=z[ks[0]]*(d/ks[0])**2 } else W=520*(d/30)**2;
  if(thin)W*=.75; W=Math.round(W/5)*5; const n=food.pzsl||(d<20?4:d<25?6:8); return {d,thin:!!thin,W,n,sl:Math.round(W/n)} }
// не нашлось: ближайшие по буквам (триграммы), чтобы предложить, а не подставлять молча
function suggest(index,text,n){ const tg=w=>{w='  '+w+' ';const s=new Set();for(let i=0;i<w.length-2;i++)s.add(w.slice(i,i+3));return s};
  const q=tg(tokens(text).join(' ')); if(q.size<3)return []; const out=[];
  for(const it of index){ if(it.f.src==='offru')continue; let b=0; [it.f.n].concat(it.f.s||[]).forEach(nm=>{ const t=tg(String(nm).toLowerCase().replace(/ё/g,'е')); let c=0; q.forEach(x=>{if(t.has(x))c++}); const v=2*c/(q.size+t.size); if(v>b)b=v }); if(b>=.3)out.push([b,it.f]) }
  return out.sort((a,b)=>b[0]-a[0]).slice(0,n||3).map(x=>x[1]) }
function resolve(index,ch,raw,meal){ let alts=search(index,ch.text,6); const cm=CUR_CHAIN?chainMatch(CUR_CHAIN,ch,index):null; if(cm)alts=[{food:cm.food,score:999,full:true,all:true,fz:0}].concat(cm.alts.map(f=>({food:f,score:1,fz:0}))); const best=alts[0]||null; const food=best&&best.food;
  let g=grams(food,ch.num,ch.unit,ch.size,ch.tsp), note='';
  const pcs=food&&food.pc&&(!ch.unit||/^pcs?$/.test(ch.unit[1]))&&!(ch.num>=20&&!ch.unit);
  if(food&&food.rf&&ch.whole&&!pcs){ const g0=g; g=Math.max(1,Math.round(g*(1-food.rf/100))); note=g0+' г целиком ≈ '+g+' г '+edibleWord(food) }
  else if(food&&food.rf&&pcs){ const n=Math.round((ch.num==null?1:ch.num)*10)/10; note=n+' шт ≈ '+g+' г '+edibleWord(food) }
  if(food&&(food.pizza||/^пицц/.test(food.n))&&!(ch.unit&&ch.unit[1]==='g')&&!(ch.num>=20&&!ch.unit)){ const pz=pizza(food,ch.diam,ch.thin), u=ch.unit&&ch.unit[1];
    const n=ch.num==null?null:ch.num, word=(k)=>{const a=Math.abs(k)%100,b=a%10;return a>10&&a<20?'кусков':b===1?'кусок':b>=2&&b<=4?'куска':'кусков'};
    const tag='пицца '+pz.d+' см'+(pz.thin?', тонкое тесто':'')+': целая '+pz.W+' г = '+pz.n+' '+word(pz.n)+(ch.diam||food.pzd&&food.pzd!==30?'':' (размер не назван — считаю 30 см)');
    if(u==='pcs'||u==='slice'){ const k=n==null?1:n; g=Math.round(k*pz.sl); note=k+' '+word(k)+' × '+pz.sl+' г = '+g+' г · '+tag }
    else if(ch.whole||u==='pc'||(n!=null&&!u)){ const k=ch.whole&&n==null?1:(n==null?1:n); g=Math.round(k*pz.W); note=(k===.5?'половина':k===1?'целая':k+' шт')+' = '+g+' г · '+tag }
    else if(!u){ g=2*pz.sl; note='2 куска × '+pz.sl+' г = '+g+' г (количество не названо) · '+tag } }
  // «сырник», «блин», «ролл» (ед. ч.) у блюд, записанных во мн. ч. — одна штука, а не порция
  if(food&&food.pl&&food.pc&&ch.num==null&&!ch.unit&&!/^(пицц|ролл)/.test(food.n)){ const qw=ch.text.split(/\s+/).filter(Boolean), nw=food.n.split(/\s+/); const sing=qw.some(w=>nw.some(x=>/(ы|и)$/.test(x)&&x!==w&&x.slice(0,4)===w.slice(0,4)&&!/(ы|и|ов|ей)$/.test(w))); if(sing){ g=Math.round(food.pc*(ch.size||1)); note='1 шт ≈ '+g+' г' } }
  const q=ch.text.split(/\s+/).filter(Boolean).length||1;
  const unsure=!!(best&&(best.fz>0||best.score<q*10*.55||(alts[1]&&!best.full&&alts[1].score>best.score-1&&alts[1].food.k!==food.k)));
  // обобщённое мясо («свинина») без уточнения: по умолчанию готовый средний отруб, но предлагаем уточнить отруб
  let amb=null; if(food&&food.amb&&food.amb.length&&best.full){ amb=[food].concat(food.amb.map(n=>{const a=search(index,n,1)[0];return a&&a.food.n===n?a.food:null}).filter(Boolean)) }
  const cands=amb?amb.slice(0,3):[]; if(!amb)alts.forEach(a=>{ if(cands.length<3&&!cands.some(c=>c.n===a.food.n||(c.k===a.food.k&&c.p===a.food.p&&c.f===a.food.f)))cands.push(a.food) }); const r={meal,text:ch.text,raw,g,num:ch.num,unit:ch.unit&&ch.unit[1],food,recipe:!!(best&&best.recipe),alts:alts.map(a=>a.food),full:!!(best&&best.full),all:!!(best&&best.all),unsure:unsure||!!(amb&&amb.length>1),cands,note};
  if(!food){ r.cands=suggest(index,ch.text,3); r.miss=true }
  if(food&&food.cnote)r.note=food.cnote+(r.note?' · '+r.note:'');
  if(cm){ r.unsure=false; r.cands=[food].concat(cm.alts).slice(0,3) }
  if(food)Object.assign(r,nutr(food,g)); return r }
function chunkHasQty(ts){ return ts.some((t,i)=>readNum(ts,i)||unitOf(t)) }
function parse(text,opt){ opt=opt||{}; const index=opt.index||makeIndex(opt.foods||[],opt.recipes||[]);
  let nt=norm(text); const chd=chainDetect(nt); CUR_CHAIN=chd&&G.CHAINS?chd.slug:null; if(chd)nt=chd.rest;
  const ts0=(nt.replace(/(^|\s)(с|со|в)\s+(кожур|кожиц|шкурк|скорлуп)[а-я]*/g,' целиком').replace(/[,;]/g,' , ').match(/[a-zа-я0-9.%-]+|,/g)||[]);
  for(let i=0;i<ts0.length;i++){ const r=readNum(ts0,i); if(r&&/^процент/.test(ts0[r.j]||'')){ ts0.splice(i,r.j-i+1,r.v+'%') } }
  const segs=opt.noMeals?[{meal:opt.meal||null,ts:ts0}]:splitMeals(ts0,opt.meal||defaultMeal(opt.now));
  const res=[];
  for(const seg of segs){ let chunks=splitItems(seg.ts);
    // склеить «кофе с молоком и сахаром», если целиком есть в базе
    for(let i=0;i<chunks.length-1;i++){ if(chunkHasQty(chunks[i+1].filter(t=>!FILLER.has(t))))continue; const j=chunks[i].concat(['и'],chunks[i+1]); const c=parseChunk(index,j);
      const b=search(index,c.text,1)[0]; if(b&&b.full){chunks.splice(i,2,j);i--} }
    // разбить по числам: «два яйца три банана»
    const ch2=[]; for(const c of chunks){ let cur=[],hasQ=false,hasF=false; for(let i=0;i<c.length;i++){ const r=/^(из|от)$/.test(c[i-1]||'')?null:readNum(c,i);
        if(r&&!/%$/.test(c[r.j]||'')&&hasF&&(hasQ||(r.j<c.length&&!unitOf(c[r.j]||'')?r.j<c.length:unitOf(c[r.j]||'')&&c.slice(r.j+1).some(x=>!WHOLE.test(x))))){ ch2.push(cur);cur=[];hasQ=false;hasF=false }
        if(r&&!/%$/.test(c[r.j]||'')){ for(let k=i;k<r.j;k++)cur.push(c[k]); i=r.j-1; hasQ=true; continue }
        if(unitOf(c[i])){cur.push(c[i]);hasQ=true;continue} if(!FILLER.has(c[i])&&!STOP.has(c[i])&&!SIZE[c[i]])hasF=true; cur.push(c[i]) } if(cur.length)ch2.push(cur) }
    for(const c of ch2){ const raw=c.join(' ').replace(/диам(\d+)/g,'$1 см').replace(/тонкоетесто/g,'тонкое тесто').replace(/четыресыра/g,'четыре сыра'); const pc=parseChunk(index,c); if(!pc.text)continue;
      let r=resolve(index,pc,raw,seg.meal);
      // «гречка с котлетой» → две позиции, если целиком не нашлось
      if(!r.full&&!(r.all&&r.food&&/\s(с|со)\s/.test(' '+r.food.n+' '))&&/\s(с|со)\s/.test(' '+pc.text+' ')){ const parts=(' '+pc.text+' ').split(/\s(?:с|со)\s/).map(s=>s.trim()).filter(Boolean);
        if(parts.length>1){ const rs=parts.map((p,k)=>resolve(index,k===0?Object.assign({},pc,{text:p}):{num:null,unit:null,size:1,text:p},k?p:raw,seg.meal));
          if(rs.every(x=>x.food)){ rs.forEach(x=>res.push(x)); continue } } }
      res.push(r) } }
  return res }
const P={chainIn,CHAIN_META,parse,search,makeIndex,tokens,stem,norm,grams,nutr,defaultMeal,readNum};
if(typeof module!=='undefined'&&module.exports)module.exports=P; else G.KP=P;
})(typeof self!=='undefined'?self:this);
