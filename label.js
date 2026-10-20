// 📷 Разбор текста этикетки (OCR) → КБЖУ на 100 г, масса нетто, варианты названия. Общий для браузера и тестов.
(function(G){
'use strict';
// типичные ошибки OCR в числах: О/o→0, З→3, l/I/|→1, б→6, S→5
function fixNum(s){ return s.replace(/[OoОо]/g,'0').replace(/[З]/g,'3').replace(/[lI|]/g,'1').replace(/[б]/g,'6').replace(/[S]/g,'5') }
const NUM='([0-9OoОоЗlI|бS]{1,4}(?:[.,][0-9OoОо]{1,2})?)';
const num=s=>{ const v=parseFloat(fixNum(s).replace(',','.')); return isNaN(v)?null:v };
function norm(t){ return String(t||'').replace(/\r/g,'').replace(/[–—−]/g,'-').replace(/ё/gi,'е').replace(/[ \t]+/g,' ') }
// первое число после ключевого слова (в пределах ~28 символов, без перехода через другое ключевое слово)
function after(t,re,stop){ const m=t.match(new RegExp('(?:'+re+')[^0-9OoОоЗ]{0,28}?'+NUM,'i')); if(!m)return null; const gap=m[0].slice(0,m[0].length-m[1].length);
  if(stop&&new RegExp(stop,'i').test(gap.replace(new RegExp(re,'i'),'')))return null; return num(m[1]) }
// число перед ключевым словом: «7,5 г белков»
function before(t,re){ const m=t.match(new RegExp(NUM+'\\s*г?\\.?\\s*(?:'+re+')','i')); return m?num(m[1]):null }
const KW='бел|жир|углев|энерг|калор|ккал|кдж';
function kcal(t){ let m;
  if((m=t.match(new RegExp(NUM+'\\s*(?:к\\s?кал|kcal)(?!ори)','i')))){ const v=num(m[1]); if(v!=null&&v<=950)return v }   // «250 ккал»
  if((m=t.match(new RegExp('(?:ккал|kcal)[^0-9]{0,6}'+NUM,'i')))){ const v=num(m[1]); if(v!=null&&v<=950)return v } // «ккал 250»
  const kj=t.match(new RegExp(NUM+'\\s*к\\s*д\\s*ж','i')); if(kj){ const v=num(kj[1]); if(v)return Math.round(v/4.184) }
  const e=after(t,'калорийн|энергетическ\\S*\\s+ценност\\S*'); return e!=null&&e<=950?e:null }
function weight(t){ const m=t.match(/(?:масса|нетто|вес|объем|m\s*нетто)[^0-9]{0,22}([0-9]+(?:[.,][0-9]+)?)\s*(кг|г|гр|л|мл)(?![А-Яа-яA-Za-z])/i)||t.match(/(?:^|[^0-9.,])([0-9]+(?:[.,][0-9]+)?)\s*(кг|г|гр|мл|л)\s*(?:нетто|e(?![a-z])|℮)/i);
  if(!m)return null; let v=parseFloat(m[1].replace(',','.')); if(/^(кг|л)$/i.test(m[2]))v*=1000; return v>=5&&v<=5000?Math.round(v):null }
function names(raw){ return String(raw||'').split(/\n+/).map(s=>s.replace(/[^A-Za-zА-Яа-яЁё0-9 «»"'.,%-]/g,' ').replace(/\s+/g,' ').trim())
  .filter(s=>{ const L=(s.match(/[А-Яа-яЁёA-Za-z]/g)||[]).length; return s.length>=4&&s.length<=48&&L/s.length>.7&&!new RegExp(KW+'|состав|хранит|изготов|годен|гост|ту |адрес|услови|пищев|содерж|масса|нетто|ооо|тел','i').test(s) })
  .slice(0,4) }
function parse(raw){ const t=norm(raw).replace(/\n/g,' ');
  const per100=/(?:в|на)\s*100\s*(?:г|гр|мл|g)/i.test(t)||/100\s*(?:г|мл)\s*(?:продукт|содерж)/i.test(t);
  const portion=(t.match(/(?:в|на)\s*(?:1\s*)?порци\S*\s*\(?\s*([0-9]+)\s*г/i)||[])[1];
  let p=after(t,'бел\\S*','жир|углев'), f=after(t,'жир\\S*','бел|углев'), c=after(t,'углевод\\S*','бел|жир');
  if(p==null)p=before(t,'бел'); if(f==null)f=before(t,'жир'); if(c==null)c=before(t,'углев');
  let k=kcal(t), found=[p,f,c,k].filter(v=>v!=null).length;
  for(const x of ['p','f','c']){ const v={p,f,c}[x]; if(v!=null&&v>100){ if(x==='p')p=null; if(x==='f')f=null; if(x==='c')c=null } } // мусор OCR
  const atw=(p||0)*4+(f||0)*9+(c||0)*4; let warn='';
  if(k==null&&p!=null&&f!=null&&c!=null){ k=Math.round(atw); warn='Калории посчитаны по Б/Ж/У' }
  else if(k!=null&&p!=null&&f!=null&&c!=null&&atw>0&&Math.abs(atw-k)/Math.max(k,atw)>.2) warn='Калории не сходятся с Б/Ж/У — проверь цифры';
  if(found&&!per100&&portion) warn=(warn?warn+'. ':'')+'На этикетке, похоже, значения на порцию '+portion+' г — проверь, что вписаны значения на 100 г';
  return {k,p,f,c,found,per100,portion:portion?+portion:null,net:weight(norm(raw)),names:names(raw),warn} }
G.LBL={parse,fixNum};
})(typeof self!=='undefined'?self:globalThis);
if(typeof module!=='undefined')module.exports=(typeof self!=='undefined'?self:globalThis).LBL;
