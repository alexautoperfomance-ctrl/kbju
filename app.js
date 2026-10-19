'use strict';
const VER='1.11.2';
const $=s=>document.querySelector(s), R=Math.round, esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MEALS=['завтрак','обед','ужин','перекус'], MI={завтрак:'🍳',обед:'🍲',ужин:'🍽️',перекус:'🍎'};
const KEY='kbju.v1';
let S=load(); function load(){ try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days){const x=Object.assign(def(),s); if(x.set)delete x.set.auto; return x}}catch(e){} return def() }
function def(){ return {days:{},water:{},recipes:[],custom:[],used:{},goals:{k:2200,p:140,f:70,c:240,w:2000},prof:{sex:'m',w:80,h:180,a:35,act:1.375,goal:'keep'},set:{water:true},v:1} }
function save(){ localStorage.setItem(KEY,JSON.stringify(S)) }
const dk=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const pd=k=>{const[a,b,c]=k.split('-').map(Number);return new Date(a,b-1,c)};
const addD=(k,n)=>{const d=pd(k);d.setDate(d.getDate()+n);return dk(d)};
let cur=dk(), tab='diary', statMode='day';
const day=k=>S.days[k]||[];
const tot=list=>list.reduce((a,e)=>(a.k+=e.k,a.p+=e.p,a.f+=e.f,a.c+=e.c,a),{k:0,p:0,f:0,c:0});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmtD=k=>{const d=pd(k),t=dk();const s=d.toLocaleDateString('ru-RU',{day:'numeric',month:'short',weekday:'short'});return k===t?'Сегодня, '+s.replace(/^[^,]+,\s*/,''):k===addD(t,-1)?'Вчера, '+s.replace(/^[^,]+,\s*/,''):s};
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2600)}
// ---------- индекс поиска ----------
let IX=null; function index(){ if(!IX){ const rec=S.recipes.map(r=>Object.assign(recipeNut(r),{n:r.name,s:r.syn||[],rid:r.id,po:R(ryOf(r)/Math.max(1,r.servings)),src:'recipe'}));
  const cus=S.custom.map(c=>Object.assign({},c,{used:S.used[c.n]})); const foods=self.FOODS.map(f=>S.used[f.n]?Object.assign({},f,{used:S.used[f.n]}):f);
  IX=KP.makeIndex(foods.concat(cus),rec) } return IX }
function dirty(){IX=null}
// ---------- речь ----------
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
// ---------- микронутриенты ----------
const MK=self.MK||[];
function microOf(name){ if(self.MICRO&&self.MICRO[name])return self.MICRO[name]; const c=S.custom.find(x=>x.n===name); if(c&&c.m)return c.m; const r=S.recipes.find(x=>x.name===name); if(r)return recipeNut(r).m; return null }
const microLookup=n=>microOf(n);
function microBlock(keys,id){ const a=MICROS.analyze(keys.map(day),S.prof,MK,microLookup); const low=a.list.filter(d=>d.st==='low').length, over=a.list.filter(d=>d.st==='over').length; lastAdv.micro=a;
  if(!a.days) return `<details class="card col" data-k="c_micro"><summary class="row"><h2 class="sp">🧪 Витамины и минералы</h2><span class="chev">›</span></summary><div class="mu">Нет записей.</div></details>`;
  return `<details class="card col" data-k="c_micro" ${S.set.c_micro?'open':''}><summary class="row"><h2 class="sp">🧪 Витамины и минералы</h2>${low?`<span class="chip cF">дефицит ${low}</span>`:''}${over?`<span class="chip cR">избыток ${over}</span>`:''}<span class="chev">›</span></summary>
  <div class="mu">${keys.length>1?'В среднем за день · ':''}% от нормы (МР 2.3.1.0253-21), профиль: ${S.prof.sex==='f'?'ж':'м'}, ${S.prof.a} лет</div>
  ${a.list.map(d=>`<div class="mr ${d.st}" data-mic="${d.k}"><span class="mn">${esc(d.n)}</span><span class="mb"><i style="width:${Math.min(100,d.pct)}%"></i></span><span class="ma">${R(d.amt)} ${d.u}</span><span class="mp">${R(d.pct)}%</span></div>`).join('')}
  <div class="mu" style="margin-top:4px">Натрий — без соли, добавленной при готовке. B7, йод, хром — оценочные. ${a.cov<.95?`Есть данные для ${R(a.cov*100)}% калорий.`:''}</div></details>` }
function openMicro(k){ const d=(lastAdv.micro&&lastAdv.micro.list||[]).find(x=>x.k===k); if(!d)return; const top=MICROS.rich(k,self.FOODS,MK,self.MICRO,6);
  sheet(`<div class="sh"><h2>${esc(d.n)}</h2><button class="x" data-close2="1">✕</button></div><div>${esc(d.role[0].toUpperCase()+d.role.slice(1))}.</div>
  <div class="kv"><span>Получено</span><b>${R(d.amt)} ${d.u} · ${R(d.pct)}%</b></div><div class="kv"><span>${d.t==='lim'?'Не больше':'Норма'}</span><b>${d.norm} ${d.u}${d.ul&&d.t!=='lim'?' · предел '+d.ul:''}</b></div>
  ${d.st==='low'?`<div class="hint">${esc(MICROS.gapAdvice(d,self.FOODS,MK,self.MICRO))}</div>`:''}
  <h3>${d.t==='lim'?'Больше всего содержат':'Богаты им'} (на порцию)</h3>${top.map(x=>`<div class="kv"><span>${esc(x.f.n)} <span class="mu">${R(x.g)} г</span></span><b>${R(x.amt)} ${d.u}</b></div>`).join('')}`,2) }
// ---------- советы ----------
const PRO=[['куриная грудка отварная','куриной грудки'],['творог 5%','творога 5%'],['тунец консервированный','тунца в с/с'],['йогурт греческий','греческого йогурта']];
const fdb=n=>self.FOODS.find(f=>f.n===n);
function gFor(nutr,need,name){const f=fdb(name);return f?R(need/(f[nutr]/100)/10)*10:0}
function contributors(list,key,n){ const m={}; list.forEach(e=>{m[e.name]=(m[e.name]||0)+e[key]}); return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n||2).filter(x=>x[1]>2).map(x=>x[0].toLowerCase()) }
function advice(list,g,opts){ opts=opts||{}; const t=tot(list), out=[]; if(!list.length)return [['📝','Пока ничего не записано. Нажми 🎙️ и расскажи, что ты съел.']];
  const h=new Date().getHours(), late=opts.final||h>=18||cur!==dk(), dP=g.p-t.p, dF=t.f-g.f, dC=t.c-g.c, dK=t.k-g.k;
  if(dK>g.k*.08) out.push(['🔥',`Перебор калорий: +${R(dK)} ккал к цели. `+(contributors(list,'k').length?`Больше всего дали: ${contributors(list,'k').join(', ')}.`:'')]);
  else if(late&&-dK>g.k*.15) out.push(['🍽️',`До цели не хватает ${R(-dK)} ккал — можно спокойно доесть: ${-dK>500?'полноценный ужин, например 200 г гречки и 150 г курицы':'перекус: творог, йогурт или банан'}.`]);
  if(dP>12&&(late||dP>g.p*.5)){ const a=PRO.slice(0,2).map(([n,r])=>`${gFor('p',dP,n)} г ${r}`); out.push(['🥩',`Не хватает ${R(dP)} г белка — добавь ${a[0]} или ${a[1]}.`]) }
  if(dF>8){ const c=contributors(list,'f'); out.push(['🥑',`Перебор жиров на ${R(dF)} г — меньше ${c.length?c.join(', '):'майонеза, сыра, жареного'}${c.some(x=>/майонез|сыр/.test(x))?'':'; меньше майонеза/сыра'}.`]) }
  else if(late&&g.f-t.f>20) out.push(['🥜',`Жиров мало (−${R(g.f-t.f)} г): горсть орехов (30 г) или ложка оливкового масла в салат.`]);
  if(dC>20){ const c=contributors(list,'c'); out.push(['🍞',`Углеводов больше нормы на ${R(dC)} г — урежь ${c.length?c.join(', '):'сладкое и хлеб'}.`]) }
  else if(late&&g.c-t.c>60) out.push(['🍚',`Углеводов мало (−${R(g.c-t.c)} г): ${gFor('c',g.c-t.c,'гречка')} г гречки или рис.`]);
  const sw=list.filter(e=>e.cat==='sweet').reduce((a,e)=>a+e.k,0); if(sw>t.k*.15&&sw>150) out.push(['🍬',`Сладкого на ${R(sw)} ккал (${R(sw/t.k*100)}% дня) — замени часть на фрукты.`]);
  if(late&&!list.some(e=>e.cat==='veg'||e.cat==='fruit'||/салат|овощ/.test(e.name.toLowerCase()))) out.push(['🥗','Не было овощей и фруктов — добавь салат или 200 г овощей.']);
  if(S.set.water&&opts.water!=null&&late&&opts.water<g.w*.6) out.push(['💧',`Воды ${opts.water} мл из ${g.w} — выпей ещё ${R((g.w-opts.water)/250)} стакана.`]);
  if(!out.length) out.push(['👍',dK>-g.k*.15?'Отличный баланс — всё в пределах цели.':'Пока всё по плану. Белок, жиры и углеводы в норме.']);
  return out }
function periodAdvice(keys){ const g=S.goals, days=keys.filter(k=>day(k).length); if(!days.length)return [['📝','За период нет записей.']];
  const ts=days.map(k=>tot(day(k))), av=['k','p','f','c'].reduce((a,x)=>(a[x]=ts.reduce((s,t)=>s+t[x],0)/ts.length,a),{}), all=days.flatMap(day), out=[];
  out.push(['📅',`Записей ${days.length} из ${keys.length} дн. В среднем ${R(av.k)} ккал/день (цель ${g.k}).`]);
  const over=ts.filter(t=>t.k>g.k*1.08).length; if(over) out.push(['🔥',`Перебор по калориям в ${over} дн.`+(av.k>g.k?` В среднем +${R(av.k-g.k)} ккал.`:'')]);
  if(g.p-av.p>10) out.push(['🥩',`Белка в среднем ${R(av.p)} г — не хватает ${R(g.p-av.p)} г в день. Добавляй ${gFor('p',g.p-av.p,'творог 5%')} г творога или ${gFor('p',g.p-av.p,'куриная грудка отварная')} г грудки.`]);
  else out.push(['✅',`Белок в среднем ${R(av.p)} г — норма выполняется.`]);
  if(av.f-g.f>8) out.push(['🥑',`Жиров в среднем на ${R(av.f-g.f)} г больше. Главные источники: ${contributors(all,'f',3).join(', ')}.`]);
  if(av.c-g.c>20) out.push(['🍞',`Углеводов в среднем на ${R(av.c-g.c)} г больше: ${contributors(all,'c',3).join(', ')}.`]);
  if(days.length<keys.length*.6) out.push(['ℹ️','Записывай каждый день — так статистика будет точнее.']);
  return out }
// ---------- рендер ----------
function ring(v,g,size,color,label,sub){ const r=size/2-7,C=2*Math.PI*r,p=Math.min(1,g?v/g:0),over=g&&v>g;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#eef1ef" stroke-width="11"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${over?'var(--red)':color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C*p} ${C}" transform="rotate(-90 ${size/2} ${size/2})"/><text x="50%" y="46%" text-anchor="middle" font-size="${size/5.2}" font-weight="700" fill="currentColor">${label}</text><text x="50%" y="64%" text-anchor="middle" font-size="${size/11}" fill="#738078">${sub}</text></svg>` }
function bar(name,v,g,col){ return `<div class="bar"><div class="t"><span>${name}</span><span><b>${R(v)}</b> / ${R(g)} г</span></div><div class="tr"><i style="width:${Math.min(100,g?v/g*100:0)}%;background:${v>g*1.1?'var(--red)':col}"></i></div></div>` }
function summary(t,g,mul){ mul=mul||1; const left=R(g.k*mul-t.k);
  return `<div class="sum">${ring(t.k,g.k*mul,92,'var(--K)',R(t.k),left>=0?'осталось '+left:'перебор '+(-left))}<div class="bars">${bar('Белки',t.p,g.p*mul,'var(--P)')}${bar('Жиры',t.f,g.f*mul,'var(--F)')}${bar('Углеводы',t.c,g.c*mul,'var(--C)')}<div class="mu">цель ${R(g.k*mul)} ккал</div></div></div>` }
const chips=e=>`<span class="chip cP">Б ${R(e.p)}</span><span class="chip cF">Ж ${R(e.f)}</span><span class="chip cC">У ${R(e.c)}</span>`;
function advHtml(list,sayId,extra,n2){ const k='adv_'+sayId; return `<details class="card col" data-k="${k}" ${S.set[k]?'open':''}><summary class="row"><h2 class="sp">💡 Советы <span class="mu">${list.length+(n2||0)}</span></h2><span class="chev">›</span></summary>${list.map(([i,t])=>`<div class="adv"><span>${i}</span><span>${esc(t)}</span></div>`).join('')}${extra||''}</details>` }
// дефициты дня → 2–3 продукта с порцией и % нормы; тап — в экран подтверждения
function tipsHtml(L,g){ const a=lastAdv.micro; if(!a||!L.length)return ''; const t=tot(L);
  const tl=MICROS.tipList(a.list,self.FOODS,MK,self.MICRO,{kcalLeft:g.k-t.k}); lastAdv.tips=tl; if(!tl.length)return '';
  const cnt={}; tl.forEach(x=>x.foods.forEach(f=>{ if(f.also.length) cnt[f.n]=Math.max(cnt[f.n]||0,f.also.filter(k=>tl.some(y=>y.k===k)).length+1) }));
  const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="tips"><div class="tph">🧪 Добрать витамины и минералы <span class="mu">· тап — добавить</span></div>${best&&best[1]>=3?`<div class="tpb">⭐ ${esc(best[0])} закрывает сразу ${best[1]} ${best[1]%10>=2&&best[1]%10<=4&&(best[1]%100<12||best[1]%100>14)?'дефицита':'дефицитов'}</div>`:''}`+
   tl.map(x=>`<div class="tp" data-tk="${x.k}"><b>${SHORT[x.k]||esc(x.n)} ${R(x.pct)}%</b> — ${x.foods.map(f=>`<button class="tpf" data-tipadd="${esc(f.n)}|${R(f.g)}">${best&&best[1]>=3&&f.n===best[0]?'⭐':''}${esc(f.n)} ${MICROS.portTxt(f.f,f.g)} <i>+${R(f.cv)}%</i></button>`).join(', ')}</div>`).join('')+`</div>` }
let lastAdv={};
function render(){ $('#dlabel').textContent=tab==='diary'||(tab==='stats'&&statMode==='day')?fmtD(cur):({menu:'Меню на неделю',stats:'Статистика',recipes:'Рецепты',goals:'Цели',more:'Ещё'})[tab];
  $('#prev').style.visibility=$('#next').style.visibility=(tab==='diary'||tab==='stats')?'visible':'hidden';
  $('#nav').innerHTML=[['diary','📒','Дневник'],['menu','🍽','Меню'],['stats','📊','Статистика'],['recipes','🍲','Рецепты'],['goals','🎯','Цели'],['more','⚙️','Ещё']].map(([k,i,n])=>`<button data-tab="${k}" class="${tab===k?'on':''}"><b>${i}</b>${n}</button>`).join('');
  $('#app').innerHTML=({diary:vDiary,menu:vMenu,stats:vStats,recipes:vRecipes,goals:vGoals,more:vMore})[tab](); if(tab==='diary')animMicro(); if(!render.keep)window.scrollTo(0,0); render.keep=false }
function vDiary(){ const L=day(cur), t=tot(L), g=S.goals, w=S.water[cur]||0; const adv=advice(L,g,{water:w}); lastAdv.day=adv;
  let h=`<div class="card">${summary(t,g)}</div>`+calHtml()+diaryMicro(L);
  h+=`<div class="card">`+MEALS.map(m=>{ const es=L.filter(e=>e.meal===m), mt=tot(es);
    return `<div class="meal"><div class="mh">${MI[m]} ${m[0].toUpperCase()+m.slice(1)} <span class="mu">${es.length?R(mt.k)+' ккал':''}</span><button class="add" data-addm="${m}">＋</button></div>`+
     es.map(e=>`<div class="it il" data-edit="${e.id}"><span class="n">${esc(e.name)}</span><span class="mu">${R(e.g)}г</span><span class="mac">${R(e.p)}·${R(e.f)}·${R(e.c)}</span><span class="k">${R(e.k)}</span></div>`).join('')+`</div>` }).join('')+`</div>`;
  if(S.set.water) h+=`<div class="card row wrow"><b>💧 ${w}<span class="mu"> / ${g.w} мл</span></b><div class="wt sp">${Array.from({length:Math.ceil(g.w/250)},(_,i)=>`<i class="${i<w/250?'f':''}"></i>`).join('')}</div><button class="btn s sm" data-water="-250">−</button><button class="btn sm" data-water="250">＋250</button></div>`;
  const th=tipsHtml(L,g); return h+advHtml(adv,'day',th,lastAdv.tips?lastAdv.tips.length:0) }
// календарь: неделя (всегда) / месяц (по ▾); точка — статус дня по калориям
let calM=null; const MON=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const monOf=k=>pd(k.slice(0,7)+'-01'), wkStart=k=>addD(k,-((pd(k).getDay()+6)%7));
function calSt(k){ const L=day(k); if(!L.length)return ''; const r=tot(L).k/(S.goals.k||1); return r<.85?'lo':r>1.1?'hi':'ok' }
function calCell(k,m){ const t=dk(), st=calSt(k), kc=st?R(tot(day(k)).k):'';
  return `<button class="cd${k===t?' td':''}${k===cur?' sel':''}${m!=null&&pd(k).getMonth()!==m?' oth':''}${k>t?' fut':''}" data-cal="${k}"><b>${pd(k).getDate()}</b><i class="${st}"></i>${S.set.cal&&kc?`<s>${kc}</s>`:''}</button>` }
function calHtml(){ const open=!!S.set.cal, t=dk(); if(!calM||!open)calM=dk(monOf(cur)); let days=[], m=null;
  if(open){ const f=monOf(calM); m=f.getMonth(); let k=wkStart(dk(f)); do{ for(let i=0;i<7;i++){days.push(k);k=addD(k,1)} }while(pd(k).getMonth()===m) }
  else{ const s=wkStart(cur); for(let i=0;i<7;i++)days.push(addD(s,i)) }
  const mf=monOf(calM), title=open?MON[mf.getMonth()]+' '+mf.getFullYear():MON[pd(cur).getMonth()]+' '+pd(cur).getFullYear();
  return `<div class="card cal"><div class="row ch"><button class="cn" data-calm="-1">‹</button><span class="sp ct">${title}</span>${cur!==t?'<button class="ctd" data-caltoday="1">Сегодня</button>':''}<button class="cn" data-calm="1">›</button><button class="cn" data-caltog="1">${open?'▴':'▾'}</button></div>
  <div class="cg">${WD.map(w=>`<span class="wd">${w}</span>`).join('')}${days.map(k=>calCell(k,m)).join('')}</div>${open?'<div class="mu cl"><i class="lo"></i>мало <i class="ok"></i>норма <i class="hi"></i>перебор</div>':''}</div>` }
function calClick(d){ if(d.cal){cur=d.cal;render.keep=true;render();return true}
  if(d.caltoday){cur=dk();calM=null;render.keep=true;render();return true}
  if(d.caltog){S.set.cal=!S.set.cal;save();calM=null;render.keep=true;render();return true}
  if(d.calm){ if(S.set.cal){const f=monOf(calM);f.setMonth(f.getMonth()+ +d.calm);calM=dk(f)} else cur=addD(cur,7*d.calm); render.keep=true;render();return true } return false }
const SHORT={A:'Вит. A',D:'Вит. D',E:'Вит. E',K:'Вит. K',C:'Вит. C',B1:'B1',B2:'B2',B3:'B3 (PP)',B5:'B5',B6:'B6',B7:'B7 биотин',B9:'B9 фолаты',B12:'B12',Ch:'Холин',Ca:'Кальций',P:'Фосфор',Mg:'Магний',K_:'Калий',Na:'Натрий',Fe:'Железо',Zn:'Цинк',Cu:'Медь',Mn:'Марганец',Se:'Селен',I:'Йод',Cr:'Хром',Fib:'Клетчатка',O3:'Омега-3',Sug:'Сахара',Chol:'Холестерин'};
let microPrev={};
function diaryMicro(L){ const a=MICROS.analyze([L],S.prof,MK,microLookup); lastAdv.micro=a; const low=a.list.filter(d=>d.st==='low').length, over=a.list.filter(d=>d.st==='over').length, ok=a.list.length-low-over;
  const order=MICROS.norms(S.prof).map(d=>d.k), list=order.map(k=>a.list.find(d=>d.k===k));
  return `<details class="card col dm" data-k="d_micro" ${S.set.d_micro?'open':''}><summary class="row"><h2 class="sp">🧪 Витамины и минералы <span class="chev">▾</span></h2><span class="mu" id="dmsum">${L.length?`<b class="lo">дефицит ${low}</b> · норма ${ok}${over?` · <b class="hi">избыток ${over}</b>`:''}`:'нет записей'}</span></summary>
  <div class="dmg">${list.map(d=>{ const w=Math.min(100,d.pct); return `<div class="dmr ${d.st}" data-mic="${d.k}"><span class="n">${SHORT[d.k]||esc(d.n)}</span><span class="b"><i data-w="${w}" style="width:${microPrev[d.k]!=null?microPrev[d.k]:0}%"></i><em>${R(d.pct)}%</em></span><span class="a">${R(d.amt)}/${R(d.norm)} ${d.u}</span></div>` }).join('')}</div>
  <div class="mu" style="margin-top:3px;font-size:.66rem">Норма МР 2.3.1.0253-21 · натрий без соли при готовке · B7, йод, хром — оценка</div></details>` }
function animMicro(){ requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('.dmr i[data-w]').forEach(i=>{ i.style.width=i.dataset.w+'%'; microPrev[i.parentNode.parentNode.dataset.mic]=+i.dataset.w }))) }
function periodKeys(mode){ const n=mode==='week'?7:30; return Array.from({length:n},(_,i)=>addD(cur,i-n+1)) }
function chart(keys,key,goal,col,unit){ const W=400,H=95,vals=keys.map(k=>tot(day(k))[key]),mx=Math.max(goal*1.25,...vals,1),bw=W/keys.length;
  let s=`<svg viewBox="0 0 ${W} ${H+16}" width="100%"><line x1="0" x2="${W}" y1="${H-goal/mx*H}" y2="${H-goal/mx*H}" stroke="#738078" stroke-dasharray="4 4" stroke-width="1"/>`;
  vals.forEach((v,i)=>{const h=v/mx*H; s+=`<rect x="${i*bw+bw*.15}" y="${H-h}" width="${bw*.7}" height="${h}" rx="${Math.min(4,bw*.2)}" fill="${v>goal*1.08&&key==='k'?'#e04848':col}"/>`;
   if(keys.length<=7||i%5===0) s+=`<text x="${i*bw+bw/2}" y="${H+13}" font-size="11" text-anchor="middle" fill="#738078">${keys.length<=7?pd(keys[i]).toLocaleDateString('ru-RU',{weekday:'short'}):pd(keys[i]).getDate()}</text>`});
  return s+`</svg>` }
function macroChart(keys){ const W=400,H=80,bw=W/keys.length; let mx=1; const ts=keys.map(k=>tot(day(k))); ts.forEach(t=>mx=Math.max(mx,t.p*4+t.f*9+t.c*4));
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%">`; ts.forEach((t,i)=>{let y=H;[['p',4,'#3b82f6'],['f',9,'#f59e0b'],['c',4,'#a855f7']].forEach(([k,m,c])=>{const h=t[k]*m/mx*H;y-=h;s+=`<rect x="${i*bw+bw*.15}" y="${y}" width="${bw*.7}" height="${h}" fill="${c}"/>`})}); return s+'</svg>' }
function topFoods(list){ const m={}; list.forEach(e=>{const x=m[e.name]||(m[e.name]={n:e.name,k:0,c:0,p:0});x.k+=e.k;x.c++;x.p+=e.p}); return Object.values(m).sort((a,b)=>b.k-a.k).slice(0,8) }
function vStats(){ const seg=`<div class="seg">${[['day','День'],['week','Неделя'],['month','Месяц']].map(([k,n])=>`<button data-sm="${k}" class="${statMode===k?'on':''}">${n}</button>`).join('')}</div>`; const g=S.goals;
  if(statMode==='day'){ const L=day(cur),t=tot(L),kc=t.p*4+t.f*9+t.c*4||1;
    let h=seg+`<div class="card">${summary(t,g)}</div><div class="card"><h2>По приёмам пищи</h2>${MEALS.map(m=>{const x=tot(L.filter(e=>e.meal===m));return `<div class="kv"><span>${MI[m]} ${m}</span><span><b>${R(x.k)}</b> ккал · ${chips(x)}</span></div>`}).join('')}
     <h3>Доля калорий</h3><div class="tr" style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:#eef1ef"><i style="width:${t.p*4/kc*100}%;background:var(--P)"></i><i style="width:${t.f*9/kc*100}%;background:var(--F)"></i><i style="width:${t.c*4/kc*100}%;background:var(--C)"></i></div>
     <div class="mu">Белки ${R(t.p*4/kc*100)}% · Жиры ${R(t.f*9/kc*100)}% · Углеводы ${R(t.c*4/kc*100)}%</div></div>`;
    const tf=topFoods(L); h+=`<details class="card col" data-k="c_topd" ${S.set.c_topd?'open':''}><summary class="row"><h2 class="sp">Топ продуктов дня</h2><span class="chev">›</span></summary>${tf.length?tf.map(x=>`<div class="kv"><span>${esc(x.n)}</span><b>${R(x.k)} ккал</b></div>`).join(''):'<div class="empty">Нет записей</div>'}</details>`;
    lastAdv.stat=advice(L,g,{water:S.water[cur]||0}); return h+vNutri([cur])+microBlock([cur])+advHtml(lastAdv.stat,'stat') }
  const keys=periodKeys(statMode), act=keys.filter(k=>day(k).length), n=Math.max(1,act.length), all=keys.flatMap(day), T=tot(all), av={k:T.k/n,p:T.p/n,f:T.f/n,c:T.c/n};
  let h=seg+`<div class="card"><h2>Среднее за день <span class="mu">(${act.length} дн. с записями)</span></h2>${summary(av,g)}</div>`+vNutri(keys)+microBlock(keys);
  h+=`<div class="card"><h2>Калории <span class="mu">— пунктир: цель ${g.k}</span></h2>${chart(keys,'k',g.k,'#0f7a5a')}</div>`;
  h+=`<div class="card"><h2>Б/Ж/У (ккал) <span class="mu"><span style="color:var(--P)">■</span> Б <span style="color:var(--F)">■</span> Ж <span style="color:var(--C)">■</span> У</span></h2>${macroChart(keys)}<div class="g3" style="margin-top:6px;text-align:center"><div><b>${R(av.p)}</b><div class="mu">белки ср., г</div></div><div><b>${R(av.f)}</b><div class="mu">жиры ср., г</div></div><div><b>${R(av.c)}</b><div class="mu">углеводы ср., г</div></div></div></div>`;
  h+=`<details class="card col" data-k="c_prot" ${S.set.c_prot?'open':''}><summary class="row"><h2 class="sp">Белок по дням</h2><span class="chev">›</span></summary>${chart(keys,'p',g.p,'#3b82f6')}</details>`;
  const tf=topFoods(all); h+=`<details class="card col" data-k="c_top" ${S.set.c_top?'open':''}><summary class="row"><h2 class="sp">Топ продуктов</h2><span class="chev">›</span></summary>${tf.length?tf.map(x=>`<div class="kv"><span>${esc(x.n)} <span class="mu">×${x.c}</span></span><b>${R(x.k)} ккал</b></div>`).join(''):'<div class="empty">Нет записей</div>'}</details>`;
  lastAdv.stat=periodAdvice(keys); return h+advHtml(lastAdv.stat,'stat') }
function vNutri(keys){ const ma=MICROS.analyze(keys.map(day),S.prof,MK,microLookup); const r=NUTRI.analyze({days:keys.map(k=>({key:k,entries:day(k),water:S.water[k]||0})),goals:S.goals,prof:S.prof,tdee:mifflin(S.prof).tdee,mode:statMode,trackWater:S.set.water,micro:ma.list,microAdvice:d=>MICROS.gapAdvice(d,self.FOODS,MK,self.MICRO)});
  const col=r.score>=8?'var(--g)':r.score>=5?'var(--F)':'var(--red)';
  return `<details class="card nutri" ${S.set.nutriOpen?'open':''}><summary class="row"><h2 class="sp" style="margin:0">🩺 Нутрициолог</h2>${r.empty?'':`<span class="score" style="background:${col}">${r.score}/10</span>`}<span class="chev">›</span></summary>
  ${r.empty?`<div class="mu" style="margin-top:6px">${esc(r.plan[0])}</div>`:`
  <h3>👍 Сильные стороны</h3>${r.strengths.map(x=>`<div class="adv"><span>✅</span><span>${esc(x.t)}</span></div>`).join('')||'<div class="mu">—</div>'}
  <h3>⚠️ Что улучшить</h3>${r.problems.map(x=>`<div class="adv"><span>🔸</span><span>${esc(x.t)}${x.swap?`<br><b class="swap">→ ${esc(x.swap)}</b>`:''}</span></div>`).join('')||'<div class="mu">Серьёзных проблем нет.</div>'}
  ${r.metrics.microDef.length||r.metrics.microOver.length?`<h3>🧪 Витамины и минералы</h3>${r.metrics.microDef.map(x=>`<div class="adv"><span>🔹</span><span>${esc(x.t)}</span></div>`).join('')}${r.metrics.microOver.map(x=>`<div class="adv"><span>🔺</span><span>${esc(x.t)}</span></div>`).join('')}`:''}
  <h3>📋 План на завтра</h3><ol class="plan">${r.plan.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
  <div class="mu">Расход ~${R(r.tdee)} ккал · клетчатка ~${R(r.metrics.fiber)} г · овощи/фрукты ~${R(r.metrics.veg)} г · разных продуктов за 7 дн.: ${r.metrics.distinctWeek}</div>`}
  <div class="mu" style="margin-top:6px;font-size:.72rem">ℹ️ Автоматический разбор по правилам, не медицинская рекомендация. При заболеваниях — к врачу/диетологу.</div></details>` }
function recipeNut(r){ const ings=r.ings.map(i=>{ const f=fdb(i.n); return Object.assign({},i,{cat:i.cat||(f&&f.cat)||'',m:i.m||(self.MICRO&&self.MICRO[i.n])}) });
  const raw=ings.reduce((a,i)=>a+(+i.g||0),0); const x=COOK.recipe(ings,r.meth||'raw',MK,ywOf(r)); return {k:x.k,p:x.p,f:x.f,c:x.c,raw,m:x.m,cooked:x.cooked,oil:x.oil,y:ywOf(r)||x.cooked} }
const ywOf=r=>(r.yw||(r.yw===undefined&&r.yield))&&r.yield?r.yield:0; const ryOf=r=>recipeNut(r).y;
// ---------- 🍽 Меню: сбалансированная неделя ----------
const WD=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], MEXCL=['рыба','мясо','свинина','молочное','яйца','глютен','орехи'];
function mctx(){ return {foods:self.FOODS,MICRO:self.MICRO,MK,norms:MICROS.norms(S.prof),goals:{k:S.goals.k,p:S.goals.p,f:S.goals.f,c:S.goals.c}} }
let MCTX=null; const mc=()=>MCTX&&MCTX.gk===mgk()?MCTX:(MCTX=Object.assign(mctx(),{gk:mgk()}));
function mgk(){ return [S.goals.k,S.goals.p,S.goals.f,S.goals.c,(S.prof||{}).sex,(S.prof||{}).a].join('|') }
function mopt(){ return S.menu&&S.menu.opt||{meals:5,excl:[],simple:false} }
function mGen(opt){ const t0=Date.now(), w=MENU.genWeek(mc(),Object.assign({},opt,{seed:opt.seed})); S.menu={opt,gk:mgk(),sel:S.menu&&S.menu.sel||0,week:w.map(d=>({seed:d.seed,meals:d.meals.map(m=>({k:m.k,m:m.m,items:m.items.map(x=>({n:x.n,g:x.g,lo:x.lo,hi:x.hi,typ:x.typ,grp:x.grp,slot:x.slot}))}))}))}; save(); return Date.now()-t0 }
function mDay(i){ const d=S.menu.week[i]; return MENU.evalDay({meals:JSON.parse(JSON.stringify(d.meals))},mc()) }
function mStore(i,d){ S.menu.week[i]={seed:d.seed||S.menu.week[i].seed,meals:d.meals.map(m=>({k:m.k,m:m.m,items:m.items.map(x=>({n:x.n,g:x.g,lo:x.lo,hi:x.hi,typ:x.typ,grp:x.grp,slot:x.slot,v:x.v,e:x.e}))})),own:d.own}; save() }
let SWP=null;
function openSwap(mi,ii,skip){ const i=S.menu.sel||0, dd=mDay(i), it=dd.meals[mi]&&dd.meals[mi].items[ii]; if(!it)return; let opts=MENU.swapOptions(mc(),S.menu.opt,dd,mi,ii,{n:5,skip});
  if(!opts.length&&skip.length){ skip=[]; opts=MENU.swapOptions(mc(),S.menu.opt,dd,mi,ii,{n:5}) } SWP={mi,ii,skip,opts,n:it.n};
  const f=fdb(it.n)||{k:0}, g=S.goals, dl=(a,b)=>{ const x=R(a-b); return x?`<i class="${Math.abs(x)/b>.03?'bad':''}">${x>0?'+':''}${x}</i>`:'' };
  sheet(`<div class="sh"><h2>🔄 Заменить</h2><button class="x" data-close="1">✕</button></div>
   <div class="mu swcur">${MI[dd.meals[mi].m]||'🍎'} ${esc(dd.meals[mi].m)} · сейчас: <b>${esc(it.n)}</b> ${R(it.g)} г · ${R(f.k*it.g/100)} ккал · ${esc(MENU.ROLE[it.grp]||'')}</div>
   ${opts.length?opts.map((o,j)=>`<button class="swo" data-swpick="${j}"><span class="n">${esc(o.n)}</span><span class="mu">${R(o.g)} г</span><span class="k">${R(o.k)}</span><span class="swd ${Math.abs(o.tot.k-g.k)/g.k>.03?'bad':''}">день ${R(o.tot.k)} ккал · Б ${R(o.tot.p)} Ж ${R(o.tot.f)} У ${R(o.tot.c)}</span></button>`).join(''):'<div class="card hint">Других вариантов этой роли нет (проверь исключения в настройках меню).</div>'}
   <div class="row" style="margin-top:8px"><button class="btn s sp" data-swmore="1">🔄 Ещё варианты</button></div>
   <div class="mu" style="margin-top:6px">Цель: ${R(g.k)} ккал · Б ${R(g.p)} Ж ${R(g.f)} У ${R(g.c)}. После выбора граммы остальных блюд дня подстраиваются под цели.</div>`) }
function vMenu(){ if(!S.menu||!S.menu.week)mGen(mopt()); const M=S.menu, i=M.sel||0, d=mDay(i), g=S.goals, o=M.opt;
  const dlt=(a,b,tol)=>{ const e=Math.abs(a-b)/b; return e<=tol?'ok':'bad' };
  let h=`<div class="card mwk">${WD.map((n,j)=>`<button class="${j===i?'on':''}" data-mday="${j}">${n}</button>`).join('')}</div>`;
  if(M.gk!==mgk()) h+=`<div class="card hint">Цели или профиль изменились — <button class="btn sm" data-mweek="1">пересоставить неделю</button></div>`;
  h+=`<div class="card row"><button class="btn sp" data-mdict="1">🎙️ Надиктовать своё меню</button></div>`+(S.menu.week[i].own?`<div class="card hint">✍️ Свой день (надиктован)</div>`:'');
  h+=`<div class="card"><div class="mtot"><div class="${dlt(d.tot.k,g.k,.03)}"><b>${R(d.tot.k)}</b><span>/ ${R(g.k)} ккал</span></div><div class="cP ${dlt(d.tot.p,g.p,.05)}"><b>${R(d.tot.p)}</b><span>/ ${R(g.p)} Б</span></div><div class="cF ${dlt(d.tot.f,g.f,.05)}"><b>${R(d.tot.f)}</b><span>/ ${R(g.f)} Ж</span></div><div class="cC ${dlt(d.tot.c,g.c,.05)}"><b>${R(d.tot.c)}</b><span>/ ${R(g.c)} У</span></div></div>
   <div class="row" style="margin-top:6px"><button class="btn s sm sp" data-mregen="1">🔄 Заменить день</button><button class="btn sm sp" data-maddday="1">＋ Весь день в дневник</button></div></div>`;
  h+=`<div class="card">`+d.meals.map((m,mi)=>`<div class="meal"><div class="mh">${MI[m.m]||'🍎'} ${m.m[0].toUpperCase()+m.m.slice(1)} <span class="mu">${R(m.tot.k)} ккал · ${R(m.tot.p)}·${R(m.tot.f)}·${R(m.tot.c)}</span>${m.items.some(x=>x.v)?'':`<button class="sw mreg" data-mmeal="${mi}" aria-label="Заменить приём">🔄</button>`}<button class="add" data-madd="${mi}" aria-label="В дневник">＋</button></div>`+
    m.items.map((x,ii)=>{ const f=fdb(x.n)||{k:0}; return `<div class="it il mi"><span class="n">${esc(x.n)}</span><span class="mu">${R(x.g)}г</span><span class="k">${R(f.k*x.g/100)}</span>${x.v?'':`<button class="sw" data-mswap="${mi}:${ii}" aria-label="Заменить блюдо">🔄</button>`}</div>` }).join('')+`</div>`).join('')+`</div>`;
  const nt=MENU.notes(d), ml=d.micro.filter(m=>m.k!=='Na');
  h+=`<details class="card col" data-k="m_micro" ${S.set.m_micro!==false?'open':''}><summary class="row"><h2 class="sp">🧪 Витамины и минералы <span class="mu">${ml.filter(m=>m.t!=='lim'&&m.amt>=m.norm*.995).length}/${ml.filter(m=>m.t!=='lim').length} в норме</span></h2><span class="chev">›</span></summary>
   <div class="dmg">${ml.map(m=>{ const lim=m.t==='lim', st=lim?(m.amt>(m.ul||m.norm)?'over':''):m.ul&&m.amt>m.ul?'over':m.pct<99.5?'low':'', w=Math.min(100,m.pct);
     return `<div class="dmr ${st}"><span class="n">${SHORT[m.k]||esc(m.n)}</span><span class="b"><i style="width:${w}%"></i><em>${R(m.pct)}%</em></span><span class="a">${R(m.amt)}/${R(lim?(m.ul||m.norm):m.norm)} ${m.u}</span></div>` }).join('')}</div>
   ${nt.length?`<div class="mnote">${nt.map(n=>`⚠️ ${esc(n.t)} (${R(n.pct)}%)`).join('<br>')}</div>`:''}</details>`;
  h+=`<details class="card col" data-k="m_set" ${S.set.m_set?'open':''}><summary class="row"><h2 class="sp">⚙️ Настройки меню</h2><span class="chev">›</span></summary>
   <div class="mu">Исключить:</div><div class="mex">${MEXCL.map(e=>`<label><input type="checkbox" data-mex="${e}" ${o.excl.includes(e)?'checked':''}> ${e}</label>`).join('')}</div>
   <div class="row" style="margin-top:6px"><label class="sp"><input type="checkbox" id="msimple" ${o.simple?'checked':''}> 💰 простое/бюджетное</label><select id="mmeals">${[3,4,5].map(n=>`<option value="${n}" ${o.meals===n?'selected':''}>${n} приёма</option>`).join('')}</select></div>
   <div class="row" style="margin-top:6px"><button class="btn sp" data-mweek="1">🔄 Пересоставить неделю</button></div>
   <div class="mu" style="margin-top:4px">Меню считается под цели (${R(g.k)} ккал, Б/Ж/У) и нормы микроэлементов по полу и возрасту.</div></details>`;
  return h }
function mAdd(items,meal,dt){ dt=dt||dk(); const L=S.days[dt]=day(dt).slice(); let k=0;
  items.forEach(([x,m])=>{ const f=x.e?{n:x.n,k:x.e.k,p:x.e.p,f:x.e.f,c:x.e.c,cat:'',src:'dict',m:x.e.m}:fdb(x.n); if(!f)return; const n=KP.nutr(f,x.g); L.push({id:uid(),meal:m,name:f.n,g:R(x.g),k:n.k,p:n.p,f:n.f,c:n.c,k100:f.k,p100:f.p,f100:f.f,c100:f.c,cat:f.cat||'',src:f.src||'',m100:f.m||undefined}); S.used[f.n]=(S.used[f.n]||0)+1; k+=n.k });
  save(); dirty(); toast(`В дневник (${dt===dk()?'сегодня':fmtD(dt)}): ${items.length} · ${R(k)} ккал`) }
// ---------- 🎙️ Диктовка своего меню ----------
let DX=null;
function dictOpt(){ return {KP,COOK,index:index(),MK,micro:n=>microOf(n),fdb,meal:KP.defaultMeal()} }
function openDict(){ sheet(`<div class="sh"><h2>🎙️ Своё меню</h2><button class="x" data-close="1">✕</button></div>
  <div class="mu">Скажи, что ел по приёмам. Готовил сам — назови сырые ингредиенты и сколько съел: «на обед сварил суп: 500 г курицы, 300 г картошки, морковка, 2 литра воды, съел тарелку 350 г».</div>
  <textarea id="dt" rows="3" placeholder="на завтрак 60 г овсянки, на обед сварил суп: …">${esc(DX&&DX.text||'')}</textarea>
  <button class="mic" id="dmic" data-mict="dt" data-mica="dict" aria-label="Микрофон">🎙️</button><div class="mu" style="text-align:center" id="mst">${SR?'Нажми и говори, ещё раз — стоп':'Нажми 🎤 на клавиатуре'}</div>
  <div class="row"><button class="btn sp" data-dparse="1">Разобрать</button></div><div id="dres"></div>`); if(DX)dictRender() }
function dictRun(text){ const r=DICT.parse(text,dictOpt()); DX={text,meals:r.meals,unknown:r.unknown}; dictRender() }
function dictEntries(){ return [].concat(...DX.meals.map(m=>m.items.filter(x=>!x.unk).map(x=>({name:x.n,g:x.g,k:x.k100*x.g/100,p:x.p100*x.g/100,f:x.f100*x.g/100,c:x.c100*x.g/100,m100:x.m100,meal:m.m})))) }
function dictRender(){ const el=$('#dres'); if(!el||!DX)return; const g=S.goals, L=dictEntries(), t=tot(L);
  const dlt=(a,b,tol)=>Math.abs(a-b)/b<=tol?'ok':'bad';
  if(!L.length){ el.innerHTML=`<div class="card hint">Не понял ни одного продукта${DX.unknown.length?': «'+DX.unknown.map(esc).join('», «')+'»':''}. Попробуй «200 г гречки».</div>`; return }
  let h=`<div class="card"><div class="mtot"><div class="${dlt(t.k,g.k,.03)}"><b>${R(t.k)}</b><span>/ ${R(g.k)} ккал</span></div><div class="cP ${dlt(t.p,g.p,.05)}"><b>${R(t.p)}</b><span>/ ${R(g.p)} Б</span></div><div class="cF ${dlt(t.f,g.f,.05)}"><b>${R(t.f)}</b><span>/ ${R(g.f)} Ж</span></div><div class="cC ${dlt(t.c,g.c,.05)}"><b>${R(t.c)}</b><span>/ ${R(g.c)} У</span></div></div></div>`;
  h+=`<div class="card dday">`+DX.meals.map((m,mi)=>{ const mt=tot(m.items.filter(x=>!x.unk).map(x=>({k:x.k100*x.g/100,p:x.p100*x.g/100,f:x.f100*x.g/100,c:x.c100*x.g/100})));
    return `<div class="meal"><div class="mh">${MI[m.m]||'🍎'} ${m.m[0].toUpperCase()+m.m.slice(1)} <span class="mu">${R(mt.k)} ккал · ${R(mt.p)}·${R(mt.f)}·${R(mt.c)}</span><button class="add" data-dmadd="${mi}" aria-label="Приём в дневник">＋</button></div>`+
    m.items.map((x,ii)=>x.unk?`<div class="it il mi bad"><span class="n">❓ «${esc(x.unk)}» — не найдено</span><button class="sw" data-ddel="${mi}:${ii}">✕</button></div>`:
     `<div class="it il mi"><span class="n">${esc(x.n)}</span><input class="dg" type="number" inputmode="numeric" data-dg="${mi}:${ii}" value="${R(x.g)}"><span class="mu">г</span><span class="k">${R(x.k100*x.g/100)}</span><button class="sw" data-ddel="${mi}:${ii}" aria-label="Убрать">✕</button></div>`+
     (x.dish?`<div class="mu dnote">🍲 ${esc((COOK.METH.find(z=>z[0]===x.dish.meth)||[0,x.dish.meth])[1])}: ${x.dish.ings.map(i=>esc(i.n)+' '+i.g).join(', ')} → готового ≈${R(x.dish.cooked)} г${x.dish.oil?' (+'+x.dish.oil+' г масла впиталось)':''} · ${R(x.k100)} ккал/100 г${x.why?' · '+esc(x.why):''} <button class="lnk" data-dsr="${mi}:${ii}">${S.recipes.some(r=>r.name===x.dish.rn)?'✓ рецепт сохранён':'💾 сохранить как рецепт'}</button></div>`:'')).join('')+`</div>` }).join('')+`</div>`;
  const a=MICROS.analyze([L],S.prof,MK,microLookup), ml=a.list.filter(m=>m.k!=='Na').sort((x,y)=>MK.indexOf(x.k)-MK.indexOf(y.k));
  h+=`<div class="card"><h2>🧪 Витамины и минералы <span class="mu">${ml.filter(m=>m.t!=='lim'&&m.pct>=99.5).length}/${ml.filter(m=>m.t!=='lim').length} в норме</span></h2><div class="dmg">${ml.map(m=>{ const lim=m.t==='lim', st=lim?(m.amt>(m.ul||m.norm)?'over':''):m.ul&&m.amt>m.ul?'over':m.pct<99.5?'low':'', w=Math.min(100,m.pct);
     return `<div class="dmr ${st}"><span class="n">${SHORT[m.k]||esc(m.n)}</span><span class="b"><i style="width:${w}%"></i><em>${R(m.pct)}%</em></span><span class="a">${R(m.amt)}/${R(lim?(m.ul||m.norm):m.norm)} ${m.u}</span></div>` }).join('')}</div></div>`;
  const tl=MICROS.tipList(a.list,self.FOODS,MK,self.MICRO,{kcalLeft:g.k-t.k});
  if(tl.length)h+=`<div class="card tips"><div class="tph">🧪 Чем закрыть дефициты <span class="mu">· тап — добавить в перекус</span></div>`+tl.map(x=>`<div class="tp"><b>${SHORT[x.k]||esc(x.n)} ${R(x.pct)}%</b> — ${x.foods.map(f=>`<button class="tpf" data-dtip="${esc(f.n)}|${R(f.g)}">${esc(f.n)} ${MICROS.portTxt(f.f,f.g)} <i>+${R(f.cv)}%</i></button>`).join(', ')}</div>`).join('')+`</div>`;
  h+=`<div class="card"><div class="row"><input type="date" id="ddate" value="${DX.date||dk()}"><button class="btn sp" data-dadd="1">＋ В дневник</button></div>
   <div class="row" style="margin-top:6px"><select id="dwd">${WD.map((n,j)=>`<option value="${j}" ${j===(S.menu&&S.menu.sel||0)?'selected':''}>${n}</option>`).join('')}</select><button class="btn s sp" data-dsave="1">📅 Сохранить как день меню</button></div></div>`;
  el.innerHTML=h }
function dictEdit(t){ if(!DX)return; const d=t.dataset; if(d.dg!=null){ const [mi,ii]=d.dg.split(':').map(Number); DX.meals[mi].items[ii].g=Math.max(0,+t.value||0); dictRender() } }
function dictItems(ms){ return [].concat(...ms.map(m=>m.items.filter(x=>!x.unk&&x.g>0).map(x=>[{n:x.n,g:x.g,e:{k:x.k100,p:x.p100,f:x.f100,c:x.c100,m:x.m100}},m.m]))) }
function dictVec(x){ const c=mc(); if(!c.S)c.S=MENU.setup(c); return [x.k100,x.p100,x.f100,x.c100].concat(c.S.NM.map(d=>{ const j=MK.indexOf(d.k); return j<0||!x.m100?0:(+x.m100[j]||0) })).map(v=>v/100) }
function dictClick(d,t){
  if(d.mdict){ openDict(); return true }
  if(!DX&&!d.dparse)return false;
  if(d.dparse){ const v=$('#dt').value; if(v.trim())dictRun(v); return true }
  if(d.ddel){ const [mi,ii]=d.ddel.split(':').map(Number); DX.meals[mi].items.splice(ii,1); if(!DX.meals[mi].items.length)DX.meals.splice(mi,1); dictRender(); return true }
  if(d.dtip){ const [n,gg]=d.dtip.split('|'), f=fdb(n); if(!f)return true; let m=DX.meals.find(z=>z.m==='перекус'); if(!m)DX.meals.push(m={m:'перекус',items:[]}); m.items.push({n:f.n,g:+gg,k100:f.k,p100:f.p,f100:f.f,c100:f.c,m100:microOf(f.n)}); dictRender(); toast(`${f.n} ${gg} г → перекус`); return true }
  if(d.dsr){ const [mi,ii]=d.dsr.split(':').map(Number), x=DX.meals[mi].items[ii], nm=x.n.replace(/ \(свой\)$/,'').toLowerCase()+' (мой)';
    if(!S.recipes.some(r=>r.name===nm)){ S.recipes.push({id:uid(),name:nm,syn:[],meth:x.dish.meth,yield:x.dish.cooked,yw:false,servings:1,ings:x.dish.ings.map(i=>{ const f=fdb(i.n)||{}; return {n:i.n,g:i.g,k:f.k||0,p:f.p||0,f:f.f||0,c:f.c||0,cat:f.cat||''} })}); IX=null; save(); dirty(); toast('Рецепт «'+nm+'» сохранён') }
    x.dish.rn=nm; dictRender(); return true }
  if(d.dadd||d.dmadd!=null){ const dt=($('#ddate')&&$('#ddate').value)||dk(); DX.date=dt; mAdd(dictItems(d.dadd?DX.meals:[DX.meals[+d.dmadd]]),null,dt); return true }
  if(d.dsave){ const i=+$('#dwd').value; if(!S.menu||!S.menu.week)mGen(mopt());
    S.menu.week[i]={seed:S.menu.week[i].seed,own:true,meals:DX.meals.map((m,k)=>({k:m.m+k,m:m.m,items:m.items.filter(x=>!x.unk&&x.g>0).map(x=>({n:x.n,g:x.g,v:dictVec(x),e:{k:x.k100,p:x.p100,f:x.f100,c:x.c100,m:x.m100}}))})).filter(m=>m.items.length)};
    S.menu.sel=i; save(); closeSheet(); render(); toast(`Сохранено как ${WD[i]} в меню недели`); return true }
  return false }

function menuClick(d,t){
  if(d.mday!=null){ S.menu.sel=+d.mday; save(); render(); return true }
  if(d.mregen){ const i=S.menu.sel||0, w=S.menu.week.map((_,j)=>mDay(j)); const nd=MENU.regenDay(mc(),S.menu.opt,w,i,(Date.now()>>>0)); mStore(i,nd); render.keep=true; render(); toast('Новый вариант дня'); return true }
  if(d.mswap){ const [mi,ii]=d.mswap.split(':').map(Number); openSwap(mi,ii,[]); return true }
  if(d.swmore){ openSwap(SWP.mi,SWP.ii,SWP.skip.concat(SWP.opts.map(o=>o.n))); return true }
  if(d.swpick!=null){ const i=S.menu.sel||0, dd=mDay(i), r=SWP.opts[+d.swpick], old=dd.meals[SWP.mi].items[SWP.ii].n; if(!r||old!==SWP.n)return true; MENU.applySwap(mc(),dd,SWP.mi,SWP.ii,r); mStore(i,dd); closeSheet(); render.keep=true; render(); toast(`${old} → ${r.n}, граммы дня пересчитаны`); return true }
  if(d.mmeal!=null){ const i=S.menu.sel||0, dd=mDay(i), mi=+d.mmeal; MENU.regenMeal(mc(),S.menu.opt,dd,mi,(Date.now()>>>0)); mStore(i,dd); render.keep=true; render(); toast(`${dd.meals[mi].m[0].toUpperCase()+dd.meals[mi].m.slice(1)}: новый вариант, день пересчитан`); return true }
  if(d.maddday){ const dd=mDay(S.menu.sel||0); mAdd([].concat(...dd.meals.map(m=>m.items.map(x=>[x,m.m])))); return true }
  if(d.madd!=null){ const dd=mDay(S.menu.sel||0), m=dd.meals[+d.madd]; mAdd(m.items.map(x=>[x,m.m])); return true }
  if(d.mweek){ const o=mopt(); o.seed=Date.now()>>>0; mGen(o); render(); toast('Неделя пересоставлена'); return true }
  return false }
function menuChange(t){ if(!S.menu)return false; const o=Object.assign({},mopt());
  if(t.dataset.mex){ o.excl=MEXCL.filter(e=>document.querySelector(`[data-mex="${e}"]`).checked) } else if(t.id==='msimple'){ o.simple=t.checked } else if(t.id==='mmeals'){ o.meals=+t.value } else return false;
  S.set.m_set=true; mGen(o); render.keep=true; render(); toast('Меню пересоставлено'); return true }
function vRecipes(){ let h=`<div class="card"><div class="row"><h2 class="sp">Мои рецепты</h2><button class="btn sm" data-newrec="1">＋ Рецепт</button></div><div class="mu">Добавляй голосом по названию: «мой плов 300 грамм» или «порция борща мамы».</div></div>`;
  if(!S.recipes.length) h+=`<div class="card empty">Рецептов пока нет.<br>Создай рецепт вручную или надиктуй ингредиенты.<br><br><button class="btn" data-newrec="voice">🎙️ Надиктовать рецепт</button></div>`;
  S.recipes.forEach(r=>{const n=recipeNut(r),sv=n.y/Math.max(1,r.servings);h+=`<div class="card"><div class="row"><h2 class="sp">${esc(r.name)}</h2><button class="btn s sm" data-recinfo="${r.id}" aria-label="Состав порции">ⓘ</button><button class="btn s sm" data-editrec="${r.id}">✎</button><button class="btn sm" data-userec="${r.id}">В дневник</button></div>
   <div class="mu">${r.ings.length} ингр. · выход ${R(n.y)} г · ${r.servings} порц. по ${R(sv)} г</div>
   <div class="kv"><span>на 100 г</span><span><b>${R(n.k)}</b> ккал · ${chips(n)}</span></div><div class="kv"><span>на порцию</span><span><b>${R(n.k*sv/100)}</b> ккал · ${chips({p:n.p*sv/100,f:n.f*sv/100,c:n.c*sv/100})}</span></div></div>`});
  return h }
function mifflin(p){ const b=10*p.w+6.25*p.h-5*p.a+(p.sex==='m'?5:-161), tdee=b*p.act, k=tdee*(p.goal==='lose'?.82:p.goal==='gain'?1.1:1);
  const pr=p.w*(p.goal==='lose'?2:p.goal==='gain'?1.8:1.6), f=p.w*(p.goal==='lose'?.8:1), c=Math.max(50,(k-pr*4-f*9)/4); return {bmr:b,tdee,k:R(k/10)*10,p:R(pr),f:R(f),c:R(c)} }
function vGoals(){ const g=S.goals,p=S.prof,m=mifflin(p);
  return `<div class="card"><h2>Дневные цели</h2><div class="g2"><div><label>Калории, ккал</label><input type="number" inputmode="numeric" id="gk" value="${g.k}"></div><div><label>Вода, мл</label><input type="number" inputmode="numeric" id="gw" value="${g.w}"></div></div>
  <div class="g3"><div><label>Белки, г</label><input type="number" inputmode="numeric" id="gp" value="${g.p}"></div><div><label>Жиры, г</label><input type="number" inputmode="numeric" id="gf" value="${g.f}"></div><div><label>Углеводы, г</label><input type="number" inputmode="numeric" id="gc" value="${g.c}"></div></div>
  <div class="mu" style="margin:6px 0" id="gsum"></div><button class="btn w" data-savegoals="1">Сохранить цели</button></div>
  <div class="card"><h2>Калькулятор (Миффлин — Сан Жеор)</h2><div class="g2"><div><label>Пол</label><select id="cs"><option value="m" ${p.sex==='m'?'selected':''}>мужской</option><option value="f" ${p.sex==='f'?'selected':''}>женский</option></select></div><div><label>Возраст</label><input id="ca" type="number" inputmode="numeric" value="${p.a}"></div>
  <div><label>Вес, кг</label><input id="cw" type="number" inputmode="decimal" value="${p.w}"></div><div><label>Рост, см</label><input id="ch" type="number" inputmode="numeric" value="${p.h}"></div></div>
  <label>Активность</label><select id="cact">${[[1.2,'минимальная (сидячая работа)'],[1.375,'лёгкая (1–3 тренировки)'],[1.55,'средняя (3–5 тренировок)'],[1.725,'высокая (6–7 тренировок)'],[1.9,'очень высокая (физ. труд + спорт)']].map(([v,n])=>`<option value="${v}" ${p.act==v?'selected':''}>${n}</option>`).join('')}</select>
  <label>Цель</label><select id="cg">${[['lose','похудение (−18%)'],['keep','поддержание'],['gain','набор массы (+10%)']].map(([v,n])=>`<option value="${v}" ${p.goal===v?'selected':''}>${n}</option>`).join('')}</select>
  <div id="calc" style="margin-top:8px">${calcHtml(m)}</div><button class="btn w s" data-applycalc="1">Применить к целям</button></div>` }
const calcHtml=m=>`<div class="kv"><span>Базовый обмен</span><b>${R(m.bmr)} ккал</b></div><div class="kv"><span>С активностью</span><b>${R(m.tdee)} ккал</b></div><div class="kv"><span>Рекомендуемо</span><b>${m.k} ккал · Б ${m.p} · Ж ${m.f} · У ${m.c}</b></div>`;
function vMore(){ return `<div class="card"><h2>Настройки</h2><div class="tog"><span>💧 Учёт воды</span><input type="checkbox" id="swater" ${S.set.water?'checked':''}></div><div class="row" style="margin:6px 0"><button class="btn s sp" data-sources="1">📚 Источники данных</button></div><div class="tog"><span>🐞 Отладка микрофона (строка событий)</span><input type="checkbox" id="smicdbg" ${S.set.micdbg?'checked':''}></div>
  <div class="mu">Голос: ${SR?'распознавание речи доступно':'встроенное распознавание недоступно — используй 🎤 на клавиатуре iPhone'}${isIOS?' · iOS':''}${standalone?' · приложение':''}</div></div>
  <div class="card"><h2>Данные</h2><div class="mu">Всё хранится только на этом устройстве. Делай резервную копию.</div><div class="row" style="margin-top:8px"><button class="btn s sp" data-export="1">⬇️ Экспорт</button><label class="btn s sp" style="margin:0;text-align:center;color:var(--g);font-size:.95rem">⬆️ Импорт<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
  <button class="btn r w" style="margin-top:8px" data-wipe="1">Удалить все данные</button></div>
  <div class="card"><h2>О приложении</h2><div class="mu">Версия ${VER} · база ${self.FOODS.length} продуктов и блюд (таблицы хим. состава Скурихина, USDA FoodData Central, типовые рецептуры) + Open Food Facts онлайн. Значения ориентировочные.</div>
  <button class="btn s sm" style="margin-top:8px" data-update="1">Проверить обновление</button></div>` }
// ---------- шиты ----------
function sheet(html,n){ const s=$(n===2?'#sheet2':'#sheet'); $(n===2?'#sbody2':'#sbody').innerHTML=html; s.classList.add('on') }
function closeSheet(n){ $(n===2?'#sheet2':'#sheet').classList.remove('on'); micCancel() }
let V={items:[],mode:'diary',meal:null}; // голосовой ввод
function openVoice(meal,mode){ V={items:[],mode:mode||'diary',meal:meal||null}; renderVoice() }
function renderVoice(){ const rm=V.mode==='recipe', ex=rm?'«500 грамм риса, 400 грамм говядины, 2 моркови, луковица, 3 ложки масла»':'«на завтрак два яйца и кофе с молоком, на обед 200 грамм гречки и куриная грудка»';
  sheet(`<div class="sh"><h2>${rm?'Ингредиенты голосом':'Что ты съел?'}</h2><button class="x" data-close="1">✕</button></div>
  <button class="mic" id="mic" data-mict="vt" data-mica="parse" aria-label="Микрофон">🎙️</button><div class="mu" style="text-align:center" id="mst">${SR?'Нажми и говори':'Нажми 🎙️ или 🎤 на клавиатуре'}</div>
  ${!SR||isIOS?`<div class="hint">${SR?'Если микрофон не сработал — ':''}нажми в поле ниже и используй 🎤 <b>диктовку на клавиатуре iPhone</b>, затем «Разобрать».</div>`:''}
  <textarea id="vt" placeholder="${ex}"></textarea><div class="row" style="margin-top:6px">${rm?'':`<select id="vmeal" style="width:auto"><option value="">приём по фразе/времени</option>${MEALS.map(m=>`<option ${V.meal===m?'selected':''}>${m}</option>`).join('')}</select>`}<button class="btn sp" id="vparse">Разобрать</button></div>
  <div id="vres" style="margin-top:10px"></div>`); }
function renderItems(){ const el=$('#vres'); if(!el)return; if(!V.items.length){el.innerHTML='';return} const rm=V.mode==='recipe';
  const t=tot(V.items.filter(i=>i.food));
  el.innerHTML=V.items.map((it,i)=>`<div class="pi"><div class="top"><button class="nm ${it.food?'':'bad'}" data-pick="${i}">${it.food?esc(it.food.n):'❓ «'+esc(it.text)+'» — не нашлось'} <span class="mu">▾</span></button><b>${it.food?R(it.k)+' ккал':''}</b></div>
   <div class="ctl">${rm?'<span></span>':`<select data-imeal="${i}">${MEALS.map(m=>`<option ${it.meal===m?'selected':''}>${m}</option>`).join('')}</select>`}<div class="row"><input type="number" inputmode="numeric" data-ig="${i}" value="${R(it.g)}"><span class="mu">г</span></div><button class="x" data-idel="${i}">✕</button></div>
   ${it.food?`<div class="mu" style="margin-top:4px">${chips(it)} <span>«${esc(it.raw)}»</span></div>`:''}${it.note?`<div class="mu inote">🍽 ${esc(it.note)}</div>`:''}
   ${!it.food?`<div class="cands"><span class="mu">${it.cands&&it.cands.length?'Похожее: ':'В базе нет. '}</span>${(it.cands||[]).map((c,j)=>`<button class="chip" data-cand="${i}:${j}">${esc(c.n)}</button>`).join('')}<button class="chip" data-pick="${i}">найти / добавить…</button></div>`:''}
   ${it.unsure&&it.cands&&it.cands.length>1?`<div class="cands"><span class="mu">Точно? </span>${it.cands.map((c,j)=>`<button class="chip${j===0?' on':''}" data-cand="${i}:${j}">${esc(c.n)}</button>`).join('')}<button class="chip" data-pick="${i}">другое…</button></div>`:''}</div>`).join('')+
   `<div class="card" style="margin-top:6px"><div class="kv"><span>Итого</span><span><b>${R(t.k)}</b> ккал · ${chips(t)}</span></div><div class="row" style="margin-top:8px"><button class="btn sp" data-vsave="1">${rm?'Готово':'✅ Записать в дневник'}</button></div></div>` }
function doParse(text){ const mealSel=$('#vmeal')&&$('#vmeal').value; const r=KP.parse(text,{index:index(),meal:mealSel||V.meal||(cur===dk()?null:'обед')||KP.defaultMeal(),noMeals:V.mode==='recipe'||!!mealSel});
  r.forEach(x=>{ if(!x.meal)x.meal=mealSel||V.meal||KP.defaultMeal(); if(mealSel)x.meal=mealSel }); V.items=V.items.concat(r); renderItems();
  if(!r.length)toast('Не понял. Попробуй: «200 грамм гречки»') }
function recalc(it){ if(it.food)Object.assign(it,KP.nutr(it.food,it.g)) }
// Микрофон-переключатель (iOS-устойчивый): 1-е нажатие — старт, 2-е — ВСЕГДА стоп.
// Сессии continuous=false; управляемый перезапуск, пока пользователь не нажал «стоп» (лимит + backoff).
// Финальный и промежуточный текст сразу пишется в поле — ничего не теряется. Сторож 8 с. Ошибки → понятные сообщения; в PWA при сбое — диктовка клавиатуры.
const MIC={sr:null,on:false,target:null,btn:null,base:'',sess:'',tmp:'',done:null,restarts:0,empty:0,got:false,wd:null,rt:null,fails:0,t0:0};
const MIC_MAX=25, MIC_WD=8000, STANDALONE=!!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
const MIC_ERR={'no-speech':'Не слышу речь — говори ближе к микрофону','aborted':'','audio-capture':'Микрофон недоступен (занят другим приложением?)',
 'not-allowed':'Нет доступа к микрофону — разреши в Настройки → Safari → Микрофон','service-not-allowed':'Распознавание речи недоступно в этом режиме iOS',
 'network':'Нет сети для распознавания речи','language-not-supported':'Русский язык распознавания недоступен','bad-grammar':'Ошибка распознавания','phrases-not-supported':'Ошибка распознавания'};
const MIC_HARD=/not-allowed|service-not-allowed|language-not-supported|audio-capture|network/;
function mlog(ev){ if(!S.set.micdbg)return; const el=$('#micdbg'); if(!el)return; const t=MIC.t0?((Date.now()-MIC.t0)/1000).toFixed(1):'0.0';
  mlog.l=(mlog.l||[]).concat(t+'s '+ev).slice(-10); el.textContent='🎙 '+mlog.l.join(' · '); el.style.display='block' }
function mst(t){ const st=$('#mst'); if(st)st.textContent=t; else if(t)toast(t) }
function micKbd(target,why){ micReset(); const el=$('#'+target); if(el){ el.focus(); try{el.setSelectionRange(el.value.length,el.value.length)}catch(e){} }
  mst((why?why+'. ':'')+'Нажми 🎤 на клавиатуре iPhone и диктуй'); toast((why?why+'. ':'')+'Используй 🎤 на клавиатуре iPhone'); mlog('fallback:kbd') }
function micStart(target,btn,done){ if(MIC.on||MIC.sr){ mlog('tap:stop'); micStop(); return }
  if(!SR){ micKbd(target,'Распознавание речи не поддерживается'); return }
  if(MIC.fails>=2&&STANDALONE){ micKbd(target,'Микрофон в режиме приложения не работает'); return }
  const el=$('#'+target); Object.assign(MIC,{on:true,target,btn,done,base:el&&el.value.trim()?el.value.trim()+' ':'',sess:'',tmp:'',restarts:0,empty:0,t0:Date.now()}); mlog.l=[]; mlog('tap:start'+(STANDALONE?' pwa':''));
  micUI(); mst('Слушаю… нажми ещё раз, чтобы закончить'); micSession() }
function micWrite(){ const el=$('#'+MIC.target); if(!el)return; const cur=(MIC.sess+(MIC.tmp?' '+MIC.tmp:'')).trim(); el.value=(MIC.base+(cur&&MIC.base.trim()&&!/[,;]\s*$/.test(MIC.base)?', ':'')+cur).replace(/\s+/g,' ').trimStart(); el.dispatchEvent(new Event('input',{bubbles:true})) }
function micCommit(){ const add=(MIC.sess+' '+MIC.tmp).replace(/\s+/g,' ').trim(); if(add)MIC.base=(MIC.base.trim()?MIC.base.trim().replace(/[,;]$/,'')+', ':'')+add+' '; MIC.sess='';MIC.tmp=''; micWrite() }
function micKick(){ clearTimeout(MIC.wd); if(MIC.on)MIC.wd=setTimeout(()=>{ mlog('watchdog'); const t=MIC.target; micStop(true); mst('Микрофон не ответил за 8 с — попробуй ещё раз или 🎤 на клавиатуре'); if(STANDALONE||MIC.fails>=1)micKbd(t,'Микрофон не ответил'); MIC.fails++ },MIC_WD) }
function micSession(){ let r; try{ r=new SR() }catch(e){ mlog('ctor-fail'); micKbd(MIC.target,'Распознавание недоступно'); return }
  MIC.sr=r; MIC.got=false; r.lang='ru-RU'; r.continuous=false; r.interimResults=true; r.maxAlternatives=1;
  const live=()=>MIC.sr===r;
  r.onstart=()=>{ if(live()){mlog('start');micKick()} }; r.onaudiostart=()=>{ if(live()){mlog('audio');micKick()} }; r.onspeechstart=()=>{ if(live()){mlog('speech');micKick()} };
  r.onresult=e=>{ if(!live())return; micKick(); let fin='',tmp=''; for(let i=0;i<e.results.length;i++){ const x=e.results[i], s=(x[0]&&x[0].transcript||'').trim(); if(x.isFinal)fin+=s+' '; else tmp+=s+' ' }
    MIC.sess=fin.trim(); MIC.tmp=tmp.trim(); MIC.got=MIC.got||!!(fin+tmp).trim(); mlog('result'+(fin?':final':':interim')); micWrite() };
  r.onerror=e=>{ if(!live())return; const c=e.error||'unknown'; mlog('error:'+c); if(c==='aborted')return;
    if(MIC_HARD.test(c)){ MIC.fails++; const t=MIC.target, m=MIC_ERR[c]; micCommit(); micStop(true); if(STANDALONE||/service-not-allowed|language/.test(c))micKbd(t,m); else mst(m+' — или 🎤 на клавиатуре'); return }
    if(c==='no-speech'&&MIC.empty>=2)mst(MIC_ERR[c]); else if(MIC_ERR[c]==null)mst('Ошибка микрофона: '+c) };
  r.onend=()=>{ if(!live())return; mlog('end'); micCommit(); if(!MIC.got)MIC.empty++; else MIC.empty=0; MIC.sr=null;
    if(MIC.on&&MIC.restarts<MIC_MAX&&MIC.empty<4){ MIC.restarts++; const d=Math.min(1500,120*Math.pow(2,Math.max(0,MIC.empty))); clearTimeout(MIC.rt); MIC.rt=setTimeout(()=>{ if(MIC.on)micSession() },d); micKick() }
    else { const e=MIC.on&&MIC.empty>=4; micStop(e); if(e)mst('Ничего не распознано — попробуй ещё раз или 🎤 на клавиатуре') } };
  try{ r.start(); mlog('start()'); micKick() }catch(e){ mlog('start-throw:'+(e.name||'')); MIC.fails++; MIC.sr=null; const t=MIC.target; micStop(true); micKbd(t,'Не удалось включить микрофон') } }
// стоп: снять флаг, abort(), сбросить UI, вернуть текст колбэку
function micStop(quiet){ const r=MIC.sr, cb=MIC.done; micCommit(); MIC.on=false; MIC.sr=null; MIC.done=null; clearTimeout(MIC.wd); clearTimeout(MIC.rt);
  if(r){ try{r.abort()}catch(e){} } micUI(); if(!quiet)mst('Нажми и говори'); mlog('stopped'); const el=$('#'+MIC.target); if(cb&&el&&el.value.trim())cb(el.value.trim()) }
function micReset(){ const r=MIC.sr; MIC.on=false; MIC.sr=null; MIC.done=null; clearTimeout(MIC.wd); clearTimeout(MIC.rt); if(r){try{r.abort()}catch(e){}} micUI() }
function micUI(){ document.querySelectorAll('.micb,.mic').forEach(b=>b.classList.toggle('on',MIC.on&&b===MIC.btn)) }
function micCancel(){ if(MIC.on||MIC.sr){ micCommit(); micReset(); mlog('cancel') } }
const micBtn=(target,act)=>`<button class="micb" data-mict="${target}" data-mica="${act}" aria-label="Диктовать">🎙️</button>`;
const pl=(n,a,b,c)=>{n=Math.abs(n)%100;const m=n%10;return n>10&&n<20?c:m===1?a:m>1&&m<5?b:c};
function saveVoice(){ const ok=V.items.filter(i=>i.food&&i.g>0), miss=V.items.filter(i=>!i.food); if(miss.length&&!confirm('Не нашлось: '+miss.map(i=>'«'+i.text+'»').join(', ')+'. Записать остальное без них?'))return; if(!ok.length){toast('Нечего сохранять — выбери продукт');return}
  if(V.mode==='recipe'){ RE.ings=RE.ings.concat(ok.map(i=>({n:i.food.n,g:R(i.g),k:i.food.k,p:i.food.p,f:i.food.f,c:i.food.c,m:i.food.m||microOf(i.food.n)||undefined}))); closeSheet(); openRecipe(); return }
  const L=S.days[cur]=day(cur).slice(); ok.forEach(i=>{ L.push({id:uid(),meal:i.meal,name:i.food.n,g:R(i.g),k:i.k,p:i.p,f:i.f,c:i.c,k100:i.food.k,p100:i.food.p,f100:i.food.f,c100:i.food.c,cat:i.food.cat||'',src:i.food.src||'',m100:i.food.m||undefined,note:i.note||undefined}); S.used[i.food.n]=(S.used[i.food.n]||0)+1 });
  save(); dirty(); closeSheet(); render(); toast(`Записано: ${ok.length} · ${R(tot(ok).k)} ккал`) }
// ---------- выбор продукта ----------
let PK=null; // {cb, q}
function openPicker(q,cb,alts){ PK={cb}; sheet(`<div class="sh"><h2>Выбор продукта</h2><button class="x" data-close2="1">✕</button></div><div class="row"><input id="pq" placeholder="Поиск: творог, борщ, сырники…" value="${esc(q||'')}">${micBtn('pq','search')}<button class="btn s" data-scan="1" title="Штрихкод">▥</button></div>
  <div class="row" style="margin-top:6px"><button class="btn s sm" data-off="1">🌐 Open Food Facts</button><button class="btn s sm" data-custom="1">＋ Свой продукт</button></div><div id="pres"></div>`,2);
  showRes(alts&&alts.length&&!q?alts:null); if(!alts||!alts.length||q)showRes() }
function resHtml(list){ return list.map((f,i)=>`<div class="res" data-pf="${i}"><div class="n"><div>${esc(f.n)}${f.src==='off'||f.src==='offru'?' <span class="mu">OFF</span>':f.src==='recipe'?' <span class="mu">рецепт</span>':''}</div><div class="mu">${chips(f)}${f.pc?' · 1 шт ≈ '+f.pc+' г':''}</div></div><b>${R(f.k)}</b><span class="mu">/100 г</span><button class="inf" data-pinfo="${i}" aria-label="Состав">ⓘ</button></div>`).join('')||'<div class="empty">Ничего не найдено. Попробуй Open Food Facts или добавь свой продукт.</div>' }
let PR=[]; function showRes(list){ const q=($('#pq')||{}).value||''; PR=list||(q.trim()?KP.search(index(),q,25).map(x=>x.food):[]); $('#pres').innerHTML=resHtml(PR) }
function offMap(p){ const n=p.nutriments||{}, k=n['energy-kcal_100g']!=null?n['energy-kcal_100g']:(n.energy_100g||n['energy-kj_100g']||0)/4.184, br=Array.isArray(p.brands)?p.brands[0]:p.brands;
  const OM={A:['vitamin-a',1e6],D:['vitamin-d',1e6],E:['vitamin-e',1e3],K:['vitamin-k',1e6],C:['vitamin-c',1e3],B1:['vitamin-b1',1e6],B2:['vitamin-b2',1e6],B3:['vitamin-pp',1e3],B5:['pantothenic-acid',1e3],B6:['vitamin-b6',1e6],B7:['biotin',1e6],B9:['vitamin-b9',1e6],B12:['vitamin-b12',1e6],Ch:['choline',1e3],Ca:['calcium',1e3],P:['phosphorus',1e3],Mg:['magnesium',1e3],K_:['potassium',1e3],Na:['sodium',1e3],Fe:['iron',1e3],Zn:['zinc',1e3],Cu:['copper',1e6],Mn:['manganese',1e6],Se:['selenium',1e6],I:['iodine',1e6],Cr:['chromium',1e6],Fib:['fiber',1],Sug:['sugars',1],Chol:['cholesterol',1e3],O3:['omega-3-fat',1e3]};
  const mm=MK.map(k=>{const o=OM[k],v=o&&n[o[0]+'_100g']; return v!=null&&!isNaN(+v)?+(+v*o[1]).toFixed(1):0});
  return {m:mm,n:((p.product_name_ru||p.product_name||'Продукт')+(br?' ('+String(br).split(',')[0]+')':'')).trim(),k:R(k),p:+(n.proteins_100g||0).toFixed(1),f:+(n.fat_100g||0).toFixed(1),c:+(n.carbohydrates_100g||0).toFixed(1),po:p.serving_quantity?R(+p.serving_quantity):100,src:'off',code:p.code} }
async function offSearch(){ const q=$('#pq').value.trim(); if(!q)return; $('#pres').innerHTML='<div class="empty">Ищу в Open Food Facts…</div>'; const F='code,product_name,product_name_ru,brands,nutriments,serving_quantity';
  const ok=p=>p.nutriments&&(p.nutriments['energy-kcal_100g']!=null||p.nutriments.energy_100g!=null||p.nutriments['energy-kj_100g']!=null);
  const cgi=async()=>{const j=await (await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(q)+'&search_simple=1&json=1&page_size=24&fields='+F)).json();return j.products||[]};
  const tries=[cgi,()=>new Promise(r=>setTimeout(r,1500)).then(cgi)];
  for(const t of tries){ try{ const r=(await t()).filter(ok).map(offMap); if(r.length){PR=r;$('#pres').innerHTML=resHtml(PR);return} }catch(e){} }
  $('#pres').innerHTML='<div class="empty">Ничего не нашлось или нет связи с Open Food Facts</div>' }
async function offBarcode(code){ $('#pres').innerHTML='<div class="empty">Штрихкод '+esc(code)+'…</div>';
  try{ const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=code,product_name,product_name_ru,brands,nutriments,serving_quantity'); const j=await r.json();
    if(j.status===1&&j.product){PR=[offMap(j.product)];$('#pres').innerHTML=resHtml(PR)} else $('#pres').innerHTML='<div class="empty">Товар '+esc(code)+' не найден в Open Food Facts. Добавь его как свой продукт.</div>' }catch(e){ $('#pres').innerHTML='<div class="empty">Нет связи</div>' } }
let scanStop=null;
async function scan(){ const box=$('#pres'); box.innerHTML='<video id="cam" playsinline muted></video><div class="mu" style="text-align:center">Наведи камеру на штрихкод</div><button class="btn s w" data-scanstop="1">Остановить</button>';
  const v=$('#cam'); let stream;
  try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}); }catch(e){ box.innerHTML='<div class="empty">Нет доступа к камере</div>'; return }
  v.srcObject=stream; await v.play().catch(()=>{}); let alive=true; scanStop=()=>{alive=false;stream.getTracks().forEach(t=>t.stop());scanStop=null};
  const done=code=>{ if(!alive)return; scanStop&&scanStop(); if(navigator.vibrate)navigator.vibrate(60); offBarcode(code) };
  if('BarcodeDetector' in window){ try{ const bd=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']}); const loop=async()=>{ if(!alive)return; try{const r=await bd.detect(v); if(r[0])return done(r[0].rawValue)}catch(e){} requestAnimationFrame(loop) }; loop(); return }catch(e){} }
  try{ if(!window.ZXing) await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
    const rd=new ZXing.BrowserMultiFormatReader(); const old=scanStop; scanStop=()=>{try{rd.reset()}catch(e){} old&&old()};
    rd.decodeFromVideoElementContinuously(v,(res)=>{ if(res)done(res.getText()) }); }catch(e){ box.insertAdjacentHTML('beforeend','<div class="empty">Сканер не загрузился — введи цифры штрихкода в поиск.</div>') } }
function customForm(){ $('#pres').innerHTML=`<div class="card" style="margin-top:8px"><label>Название</label><input id="cn" value="${esc($('#pq').value)}"><div class="g4"><div><label>Ккал/100</label><input id="ck" type="number" inputmode="decimal"></div><div><label>Б</label><input id="cp" type="number" inputmode="decimal"></div><div><label>Ж</label><input id="cf" type="number" inputmode="decimal"></div><div><label>У</label><input id="cc" type="number" inputmode="decimal"></div></div><label>Порция, г</label><input id="cpo" type="number" inputmode="numeric" value="100"><button class="btn w" style="margin-top:8px" data-csave="1">Сохранить продукт</button></div>` }
function pickFood(f){ if(f.src==='off'&&!S.custom.some(c=>c.n===f.n)){S.custom.push(f);save();dirty()} scanStop&&scanStop(); closeSheet(2); PK&&PK.cb(f) }
// ---------- рецепт ----------
let RE=null;
function openRecipe(r){ if(r)RE=JSON.parse(JSON.stringify(r)); if(!RE)RE={id:uid(),name:'',ings:[],yield:0,servings:1,_new:true}; const n=recipeNut(RE), raw=RE.ings.reduce((a,i)=>a+i.g,0);
  sheet(`<div class="sh"><h2>${RE._new?'Новый рецепт':'Рецепт'}</h2><button class="x" data-close="1">✕</button></div><label>Название (как будешь говорить)</label><div class="row"><input id="rn" value="${esc(RE.name)}" placeholder="мой плов">${micBtn('rn','none')}</div>
  <h3>Ингредиенты</h3>${RE.ings.map((i,k)=>`<div class="it"><div class="n"><div>${esc(i.n)}</div><div class="mu">${R(i.k*i.g/100)} ккал</div></div><input style="width:80px" type="number" inputmode="numeric" data-rg="${k}" value="${R(i.g)}"><span class="mu">г</span><button data-rdel="${k}">✕</button></div>`).join('')||'<div class="mu">Пока пусто</div>'}
  <div class="row" style="margin-top:6px"><button class="btn s sp" data-radd="1">＋ Ингредиент</button><button class="btn s sp" data-rvoice="1">🎙️ Надиктовать</button></div>
  <div class="g2"><div><label>Способ приготовления</label><select id="rm">${COOK.METH.map(([k,t])=>`<option value="${k}" ${(RE.meth||'raw')===k?'selected':''}>${t}</option>`).join('')}</select></div><div><label>Порций</label><input id="rs" type="number" inputmode="numeric" value="${RE.servings}"></div></div>
  <div class="g2"><div><label>Выход готового, г ${RE.yw?'<span class="mu">(взвешено)</span>':'<span class="mu">(расчёт)</span>'}</label><input id="ry" type="number" inputmode="numeric" value="${R(n.y)}"></div><div style="align-self:end">${RE.yw?'<button class="btn s sm" data-ryreset="1">↺ по расчёту</button>':''}</div></div>
  <div class="mu">Сырые ингредиенты: ${R(raw)} г → готовое ≈ ${R(n.cooked)} г${n.oil?` (+${n.oil} г впитанного масла)`:''} по коэффициентам USDA. Взвесил готовое — впиши свой вес.</div>
  <div class="card" style="margin-top:8px"><div class="kv"><span>на 100 г</span><span><b>${R(n.k)}</b> ккал · ${chips(n)}</span></div><div class="kv"><span>на порцию</span><span><b>${R(n.k*n.y/Math.max(1,RE.servings)/100)}</b> ккал</span></div></div>
  <div class="row"><button class="btn sp" data-rsave="1">Сохранить</button>${RE._new?'':'<button class="btn r" data-rremove="1">Удалить</button>'}</div>`) }
function syncRecipe(){ const n=$('#rn'); if(!n)return; RE.name=n.value.trim(); if(RE.yw===undefined)RE.yw=!!RE.yield; if($('#rm'))RE.meth=$('#rm').value; const y=+$('#ry').value||0; if(y&&Math.abs(y-recipeNut(RE).y)>=1){RE.yield=y;RE.yw=true} RE.servings=Math.max(1,+$('#rs').value||1); document.querySelectorAll('[data-rg]').forEach(x=>RE.ings[+x.dataset.rg].g=+x.value||0) }
// ---------- запись ----------
// Детали порции: КБЖУ, клетчатка, сахара, все витамины/минералы с % нормы
function detailHtml(name,g,f100,m100){ const nm=MICROS.norms(S.prof), k=MK, n=KP.nutr(f100,g), m=m100||microOf(name);
  const row=d=>{ const i=k.indexOf(d.k); if(i<0||!m)return ''; const a=(+m[i]||0)*g/100, p=d.norm?a/d.norm*100:0, st=d.t==='lim'?(a>(d.ul||d.norm)?'over':''):(d.ul&&a>d.ul?'over':'');
    return `<div class="dr ${st}"><span>${esc(d.n)}</span><b>${R(a)} ${d.u}</b><span class="mp">${R(p)}%</span></div>` };
  const fib=nm.find(d=>d.k==='Fib'), sug=nm.find(d=>d.k==='Sug'), iF=k.indexOf('Fib'), iS=k.indexOf('Sug');
  return `<div class="dk"><div><b>${R(n.k)}</b><span>ккал</span></div><div class="cP"><b>${R(n.p)}</b><span>белки</span></div><div class="cF"><b>${R(n.f)}</b><span>жиры</span></div><div class="cC"><b>${R(n.c)}</b><span>углев.</span></div>
   <div><b>${m?R((+m[iF]||0)*g/100):'—'}</b><span>клетч.</span></div><div><b>${m?R((+m[iS]||0)*g/100):'—'}</b><span>сахара</span></div></div>
   <div class="mu" style="margin:2px 0 4px">${R(f100.k)} ккал на 100 г · % — от дневной нормы (${R(n.k/Math.max(1,S.goals.k)*100)}% калорий)</div>
   ${m?`<div class="dgrid">${nm.filter(d=>d.k!=='Fib'&&d.k!=='Sug').map(row).join('')}</div>`:'<div class="mu">Для этого продукта нет данных о витаминах и минералах.</div>'}` }
let DT=null; // {name,f100,m100,g,mode,id}
const MSRCT={u:'USDA SR Legacy',d:'USDA + коэффициенты приготовления (выход, сохранность R6)',r:'расчёт по рецептуре из USDA-ингредиентов',c:'оценка по типовому составу',o:'Open Food Facts (упаковка)',e:'оценка'};
function srcLine(n){ const f=fdb(n); if(!f)return ''; const m=self.MSRC&&self.MSRC[n];
  const kb=f.ds==='ru-ref'?'российский справочник'+(f.rs?' ('+f.rs+')':''):f.ds==='recipe'?'рецептура (расчёт)':f.ds==='off-ru'?'Open Food Facts Россия'+(f.code?' · '+f.code:''):f.src==='derived'?'производное':'база (Скурихин/USDA)';
  return `<div class="mu" style="margin-top:2px;font-size:.66rem">📚 КБЖУ: ${esc(kb)} · микро: ${esc(MSRCT[m]||'—')} · <button class="lnk" data-sources="1">источники</button></div>` }
function openSources(){ const n=self.FOODS.length, c=k=>self.FOODS.filter(f=>f.ds===k).length, ms=k=>Object.values(self.MSRC).filter(x=>x===k).length;
  sheet(`<div class="sh"><h2>📚 Источники данных</h2><button class="x" data-close="1">✕</button></div><div class="srcs">
  <p><b>База: ${n} позиций.</b> Значения на 100 г съедобной части.</p>
  <p><b>КБЖУ</b><br>• «Химический состав российских пищевых продуктов», Скурихин И.М., Тутельян В.А. (2002) — молочные, колбасы, хлеб, крупы, кондитерские; ${c('ru-ref')} позиций помечены как российский справочник. <i>Файл не скачивался — справочные значения внесены вручную по известным таблицам.</i><br>
  • Сборник рецептур блюд и кулинарных изделий для предприятий общественного питания (1996) — рецептуры и выходы; ${c('recipe')+c('ru-ref')>0?self.FOODS.filter(f=>f.ds==='recipe').length:0} блюд рассчитаны по рецептуре. <i>Тоже не скачивался.</i><br>
  • USDA FoodData Central, SR Legacy (2018, public domain) — скачано; фрукты, овощи, рыба, мясо, орехи, ингредиенты блюд.<br>
  • Open Food Facts (ODbL), экспорт с фильтром «страна: Россия» — скачано; ${c('off-ru')} популярных упакованных продуктов с проверкой КБЖУ (Атуотер ±15%).</p>
  <p><b>Приготовление</b><br>• USDA Table of Cooking Yields for Meat and Poultry (2014) — выход мяса/птицы при варке, жарке, тушении, запекании, гриле.<br>• USDA SR Legacy: пары «сухой/отварной» — уварка круп, бобовых, макарон.<br>• USDA Table of Nutrient Retention Factors, Release 6 (2007) — сохранность витаминов и минералов.<br>• Впитывание масла при жарке — по нормам Сборника рецептур / USDA FNDDS.</p>
  <p><b>Микронутриенты</b>: USDA ${ms('u')} · производные ${ms('d')} · по рецептуре ${ms('r')} · по составу ${ms('c')} · OFF ${ms('o')} · оценка ${ms('e')}. Нормы — МР 2.3.1.0253-21.</p>
  <p class="mu">Значения — справочные средние; конкретный продукт может отличаться. Для упакованных продуктов точнее этикетка или штрихкод.</p></div>`) }
function edNote(o){ const f=fdb(o.name); if(o.note)return `<div class="mu" id="dnote" style="margin-top:4px">🍽 ${esc(o.note)}</div>`; if(!f||!f.rf)return '';
  const w=f.cat==='nut'?'ядра':/яйц/.test(f.n)?'без скорлупы':/fish|meat/.test(f.cat||'')?'без костей':'мякоти';
  return `<div class="mu" id="dnote" style="margin-top:4px">🍽 Вес — съедобная часть${f.pc?` · 1 шт ≈ ${R(f.pc)} г ${w}`:''} · отходы ${R(f.rf)}%</div>` }
function openDetail(o){ DT=o; const isE=o.mode==='entry';
  sheet(`<div class="sh"><h2 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(o.name)}</h2><button class="x" data-close${isE?'':'2'}="1">✕</button></div>
  <div class="row"><div style="width:96px"><input id="dg" type="number" inputmode="numeric" value="${R(o.g)}" aria-label="Граммы"></div><span class="mu">г</span>
   ${isE||o.mode==='add'?`<select id="dm" class="sp">${MEALS.map(m=>`<option ${o.meal===m?'selected':''}>${m}</option>`).join('')}</select>`:'<span class="sp"></span>'}</div>
  ${edNote(o)}${srcLine(o.name)}<div id="dbody" style="margin-top:6px">${detailHtml(o.name,o.g,o.f100,o.m100)}</div>
  <div class="row" style="margin-top:8px">${isE?`<button class="btn sp" data-esave="${o.id}">Сохранить</button><button class="btn s" data-ecopy="${o.id}">На сегодня</button><button class="btn r" data-edel="${o.id}">Удалить</button>`:o.mode==='add'?`<button class="btn sp" data-dadd="1">＋ В дневник</button>`:o.mode==='pick'?`<button class="btn sp" data-dpick="1">Выбрать</button>`:''}</div>`,isE?1:2) }
function openEntry(e){ openDetail({mode:'entry',id:e.id,name:e.name,g:e.g,meal:e.meal,f100:{k:e.k100,p:e.p100,f:e.f100,c:e.c100},m100:e.m100,note:e.note}) }
function openEntryOld(e){ sheet(`<div class="sh"><h2>${esc(e.name)}</h2><button class="x" data-close="1">✕</button></div><div class="g2"><div><label>Граммы</label><input id="eg" type="number" inputmode="numeric" value="${R(e.g)}"></div><div><label>Приём пищи</label><select id="em">${MEALS.map(m=>`<option ${e.meal===m?'selected':''}>${m}</option>`).join('')}</select></div></div>
  <div class="mu" style="margin:6px 0">на 100 г: ${R(e.k100)} ккал · Б ${R(e.p100)} · Ж ${R(e.f100)} · У ${R(e.c100)}</div><div class="row"><button class="btn sp" data-esave="${e.id}">Сохранить</button><button class="btn s" data-ecopy="${e.id}">На сегодня</button><button class="btn r" data-edel="${e.id}">Удалить</button></div>`) }
function addEntry(f,g,meal){ const n=KP.nutr(f,g); (S.days[cur]=day(cur).slice()).push({id:uid(),meal,name:f.n,g:R(g),k:n.k,p:n.p,f:n.f,c:n.c,k100:f.k,p100:f.p,f100:f.f,c100:f.c,cat:f.cat||'',src:f.src||'',m100:f.m||undefined}); S.used[f.n]=(S.used[f.n]||0)+1; save(); dirty() }
// ---------- события ----------
document.addEventListener('click',e=>{ const mr=e.target.closest('[data-mic]'); if(mr){openMicro(mr.dataset.mic);return}
  const t=e.target.closest('button,[data-edit],[data-pf],.sheet'); if(!t)return; const d=t.dataset;
  if(t.classList.contains('sheet')){ if(e.target===t)closeSheet(t.id==='sheet2'?2:1); return }
  if(dictClick(d,t))return; if(tab==='menu'&&menuClick(d,t))return;
  if(tab==='diary'&&calClick(d))return;
  if(d.tab){tab=d.tab;render();return} if(d.sm){statMode=d.sm;render();return}
  if(t.id==='prev'||t.id==='next'){cur=addD(cur,t.id==='prev'?-1:1);render();return}
  if(t.id==='fab'){openVoice();return} if(d.addm){openVoice(d.addm);return}
  if(d.close){closeSheet();return} if(d.close2){scanStop&&scanStop();closeSheet(2);return}
  if(d.mict){ const act=d.mica; micStart(d.mict,t,v=>{ if(act==='parse'){ if(v){V.items=[];doParse(v)} } else if(act==='dict'){ if(v)dictRun(v) } else if(act==='search'){ showRes() } }); return } if(t.id==='vparse'){ const v=$('#vt').value; if(v.trim()){V.items=[];doParse(v)} return }
  if(d.idel){V.items.splice(+d.idel,1);renderItems();return}
  if(d.pick){ const i=+d.pick, it=V.items[i]; openPicker(it.food?'':it.text,f=>{it.food=f; it.unsure=false; it.note=''; if(!it.num&&!it.unit)it.g=KP.grams(f,null,null,1); recalc(it); renderItems()},it.alts); return }
  if(d.cand){ const [i,j]=d.cand.split(':').map(Number), it=V.items[i], f=it.cands[j]; it.food=f; it.unsure=false; if(!(it.unit==='g'||(it.num>=20&&!it.unit)))it.g=KP.grams(f,it.num,it.unit?[0,it.unit,1]:null,1)||it.g; it.note=''; recalc(it); renderItems(); return }
  if(d.tipadd){ const [n,gg]=d.tipadd.split('|'), f=fdb(n); if(!f)return; openVoice(cur===dk()?KP.defaultMeal():'перекус'); const it={meal:V.meal||KP.defaultMeal(),text:n,raw:'совет',g:+gg,num:+gg,unit:'g',food:f,alts:[],cands:[]}; recalc(it); V.items=[it]; renderItems(); return }
  if(d.vsave){saveVoice();return}
  if(d.pinfo!=null){ const f=PR[+d.pinfo]; openDetail({mode:'pick',name:f.n,g:f.pc&&f.pc<=250?f.pc:(f.po||100),f100:f,m100:f.m,food:f}); return }
  if(d.dpick){ const f=DT.food; closeSheet(2); pickFood(f); return }
  if(d.recinfo){ const r=S.recipes.find(x=>x.id===d.recinfo), n=recipeNut(r); openDetail({mode:'add',name:r.name,g:R(n.y/Math.max(1,r.servings)),meal:KP.defaultMeal(),f100:n,m100:n.m,food:Object.assign({},n,{n:r.name,src:'recipe'})}); return }
  if(d.dadd){ const g=+$('#dg').value||DT.g; addEntry(DT.food,g,$('#dm').value); closeSheet(2); cur=dk(); tab='diary'; render(); toast(`${DT.name}: ${R(g)} г`); return }
  if(d.pf!=null){ pickFood(PR[+d.pf]); return } if(d.off){offSearch();return} if(d.scan){scan();return} if(d.scanstop){scanStop&&scanStop();showRes();return} if(d.custom){customForm();return}
  if(d.csave){ const f={n:$('#cn').value.trim(),k:+$('#ck').value||0,p:+$('#cp').value||0,f:+$('#cf').value||0,c:+$('#cc').value||0,po:+$('#cpo').value||100,src:'custom'}; if(!f.n)return toast('Введите название'); S.custom.push(f); save(); dirty(); pickFood(f); return }
  if(d.edit){ const en=day(cur).find(x=>x.id===d.edit); if(en)openEntry(en); return }
  if(d.esave){ const en=day(cur).find(x=>x.id===d.esave); en.g=+$('#dg').value||en.g; en.meal=$('#dm').value; Object.assign(en,KP.nutr({k:en.k100,p:en.p100,f:en.f100,c:en.c100},en.g)); save(); closeSheet(); render(); return }
  if(d.edel){ S.days[cur]=day(cur).filter(x=>x.id!==d.edel); save(); closeSheet(); render(); toast('Удалено'); return }
  if(d.ecopy){ const en=day(cur).find(x=>x.id===d.ecopy); const k=dk(); (S.days[k]=day(k).slice()).push(Object.assign({},en,{id:uid()})); save(); closeSheet(); render(); toast('Добавлено на сегодня'); return }
  if(d.water){ S.water[cur]=Math.max(0,(S.water[cur]||0)+ +d.water); save(); render(); return }
  if(d.sources){ e.preventDefault&&e.preventDefault(); openSources(); return }
  if(d.ryreset){ syncRecipe(); RE.yw=false; RE.yield=0; openRecipe(); return }
  if(d.newrec){ RE=null; openRecipe(); if(d.newrec==='voice')setTimeout(()=>{syncRecipe();openVoice(null,'recipe')},50); return }
  if(d.editrec){ RE=null; openRecipe(S.recipes.find(r=>r.id===d.editrec)); return }
  if(d.userec){ const r=S.recipes.find(x=>x.id===d.userec), n=recipeNut(r), sv=R(n.y/Math.max(1,r.servings)); addEntry(Object.assign({},n,{n:r.name,src:'recipe'}),sv,KP.defaultMeal()); cur=dk(); tab='diary'; render(); toast(`${r.name}: порция ${sv} г`); return }
  if(d.radd){ syncRecipe(); openPicker('',f=>{RE.ings.push({n:f.n,g:f.po||100,k:f.k,p:f.p,f:f.f,c:f.c,m:f.m||microOf(f.n)||undefined}); openRecipe()}); return }
  if(d.rvoice){ syncRecipe(); openVoice(null,'recipe'); return } if(d.rdel){ syncRecipe(); RE.ings.splice(+d.rdel,1); openRecipe(); return }
  if(d.rsave){ syncRecipe(); if(!RE.name)return toast('Назови рецепт'); if(!RE.ings.length)return toast('Добавь ингредиенты'); if(!RE.yw){RE.yield=recipeNut(RE).cooked;RE.yw=false} delete RE._new;
    const i=S.recipes.findIndex(r=>r.id===RE.id); if(i>=0)S.recipes[i]=RE; else S.recipes.push(RE); save(); dirty(); RE=null; closeSheet(); tab='recipes'; render(); toast('Рецепт сохранён'); return }
  if(d.rremove){ if(!confirm('Удалить рецепт?'))return; S.recipes=S.recipes.filter(r=>r.id!==RE.id); save(); dirty(); RE=null; closeSheet(); render(); return }
  if(d.savegoals){ ['k','p','f','c','w'].forEach(k=>S.goals[k]=R(+$('#g'+k).value||S.goals[k])); save(); toast('Цели сохранены'); render(); return }
  if(d.applycalc){ readProf(); const m=mifflin(S.prof); Object.assign(S.goals,{k:m.k,p:m.p,f:m.f,c:m.c}); save(); render(); toast('Цели обновлены по калькулятору'); return }
  if(d.export){ const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='kbju-'+dk()+'.json'; document.body.appendChild(a); a.click(); a.remove(); return }
  if(d.wipe){ if(confirm('Удалить все записи, рецепты и цели?')&&confirm('Точно? Это необратимо.')){ S=def(); save(); dirty(); render() } return }
  if(d.update){ navigator.serviceWorker&&navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).then(()=>location.reload()); return }
});
function readProf(){ const p=S.prof; p.sex=$('#cs').value; p.a=+$('#ca').value||p.a; p.w=+$('#cw').value||p.w; p.h=+$('#ch').value||p.h; p.act=+$('#cact').value; p.goal=$('#cg').value }
document.addEventListener('input',e=>{ const t=e.target,d=t.dataset;
  if(d.ig!=null){ const it=V.items[+d.ig]; it.g=+t.value||0; it.note=''; const nt=t.closest('.pi').querySelector('.inote'); if(nt)nt.remove(); recalc(it); const top=t.closest('.pi').querySelector('.top b'); if(top&&it.food)top.textContent=R(it.k)+' ккал'; const cm=t.closest('.pi').querySelector('.mu[style]'); if(cm&&it.food)cm.innerHTML=chips(it)+' <span>«'+esc(it.raw)+'»</span>'; const tt=tot(V.items.filter(i=>i.food)), kv=$('#vres .card .kv span:last-child'); if(kv)kv.innerHTML='<b>'+R(tt.k)+'</b> ккал · '+chips(tt); return }
  if(t.id==='dg'&&DT){ DT.g=+t.value||0; $('#dbody').innerHTML=detailHtml(DT.name,DT.g,DT.f100,DT.m100); return }
  if(t.id==='pq'){ clearTimeout(showRes.t); showRes.t=setTimeout(()=>showRes(),120); return }
  if(['cs','ca','cw','ch','cact','cg'].includes(t.id)){ readProf(); save(); $('#calc').innerHTML=calcHtml(mifflin(S.prof)); return }
  if(/^g[kpfc]$/.test(t.id)){ const k=+$('#gk').value,s=(+$('#gp').value)*4+(+$('#gf').value)*9+(+$('#gc').value)*4; $('#gsum').textContent=`Б/Ж/У дают ${R(s)} ккал (${k?R(s/k*100):0}% от цели)`; return }
  if(t.id==='swater'){S.set.water=t.checked;save();return}
  if(t.id==='smicdbg'){S.set.micdbg=t.checked;save();const el=$('#micdbg');if(el){el.style.display=t.checked?'block':'none';el.textContent=t.checked?'🎙 отладка включена — нажми микрофон':''}return}
});
document.addEventListener('toggle',e=>{ const t=e.target; if(!t.classList)return; if(t.classList.contains('nutri')){S.set.nutriOpen=t.open;save()} else if(t.dataset&&t.dataset.k){S.set[t.dataset.k]=t.open;save()} },true);
document.addEventListener('change',e=>{ const t=e.target,d=t.dataset; if(t.id==='rm'&&RE){ syncRecipe(); openRecipe(); return } if(d.dg!=null||d.dmeal!=null){ dictEdit(t); return } if(tab==='menu'&&menuChange(t))return; if(d.imeal!=null){V.items[+d.imeal].meal=t.value;return}
  if(t.id==='imp'&&t.files[0]){ t.files[0].text().then(x=>{ const j=JSON.parse(x); if(!j.days)throw 0; if(!confirm('Заменить текущие данные импортом?'))return; S=Object.assign(def(),j); save(); dirty(); render(); toast('Импортировано') }).catch(()=>toast('Неверный файл')) } });
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='pq'){e.preventDefault();showRes()} });
$('#ver').textContent='v'+VER; render();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{reg.update();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update()})}).catch(e=>console.warn('SW',e));
let reloading=false; navigator.serviceWorker&&navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(!reloading&&localStorage.getItem('kbju.swseen')){reloading=true;location.reload()} localStorage.setItem('kbju.swseen','1') });
window.__kbju={get S(){return S},parse:t=>KP.parse(t,{index:index()})};
