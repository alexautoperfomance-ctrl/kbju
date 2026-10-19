// Микрофон (iOS Safari/PWA). 1-е нажатие — старт, 2-е — «Готово» (только тогда разбор).
// iOS: webkitSpeechRecognition завершается после фразы/паузы, а start() вне жеста пользователя отклоняется.
// Поэтому: (1) текст КАЖДОЙ сессии хранится отдельно и никогда не затирается (результаты новой сессии идут с индекса 0);
// (2) перезапуск пробуем сразу в onend; если отказ/ошибка — пауза: текст остаётся в поле, кнопка «Дальше 🎙» продолжает (жест);
// (3) ничего не разбирается само — только по «Готово».
(function(G){
const ERR={'no-speech':'','aborted':'','audio-capture':'Микрофон недоступен (занят другим приложением?)','not-allowed':'Нет доступа к микрофону — разреши в Настройки → Safari → Микрофон',
 'service-not-allowed':'Распознавание речи недоступно в этом режиме iOS','network':'Нет сети для распознавания речи','language-not-supported':'Русский язык распознавания недоступен'};
const HARD=/not-allowed|service-not-allowed|language-not-supported|audio-capture|network/;
function Mic(o){ const st=o.setTimeout||((f,d)=>setTimeout(f,d)), ct=o.clearTimeout||(t=>clearTimeout(t)), now=o.now||Date.now, WD=o.wd||8000, IDLE=o.idle||90000, MAX=o.max||400, log=o.log||(()=>{});
  const M={on:false,paused:false,sr:null,base:'',S:[],done:null,wd:null,retried:false,heard:0,n:0,fails:0};
  const text=()=>[M.base].concat(M.S.map(s=>(s.fin+' '+s.tmp))).map(s=>(s||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ');
  const write=()=>o.set(text());
  function kick(){ ct(M.wd); if(!M.on)return; M.wd=st(()=>{ if(!M.on)return; log('watchdog');
      if(!M.retried){ M.retried=true; log('retry'); kill(); if(!session())pause('Микрофон не ответил'); return }
      M.fails++; pause('Микрофон не ответил') },WD) }
  function kill(){ if(M.bt){(o.clearTimeout||clearTimeout)(M.bt);M.bt=null} M.empty=0; const r=M.sr; M.sr=null; if(r){ try{r.abort()}catch(e){} } }
  // true — сессия запущена; false — отказ (нужен жест пользователя)
  function session(){ if(!M.on)return false; let r; try{ r=new o.SR() }catch(e){ log('ctor-fail'); return false }
    const slot={fin:'',tmp:''}; M.S.push(slot); M.sr=r; M.n++; r.lang='ru-RU'; r.continuous=false; r.interimResults=true; r.maxAlternatives=1; let got=false; const live=()=>M.sr===r;
    r.onstart=()=>{ if(live()){log('start');kick()} }; r.onaudiostart=r.onspeechstart=()=>{ if(live())kick() };
    r.onresult=e=>{ // результаты сессии всегда с индекса 0 — пересобираем слот этой сессии (даже запоздалые — не теряем)
      let fin='',tmp=''; for(let i=0;i<e.results.length;i++){ const x=e.results[i], s=((x[0]&&x[0].transcript)||'').trim(); if(x.isFinal)fin+=s+' '; else tmp+=s+' ' }
      if(!fin.trim()&&!tmp.trim())return; slot.fin=fin.trim(); slot.tmp=tmp.trim(); log('result'+(fin?':final':':interim')); if(live()){ kick(); got=true; M.heard=now(); M.retried=false } write() };
    r.onerror=e=>{ if(!live())return; const c=(e&&e.error)||'unknown'; log('error:'+c); if(c==='aborted'||c==='no-speech')return;
      if(HARD.test(c)){ M.sr=null; if(M.n>1&&/not-allowed/.test(c)){ pause(); return } M.fails++; const m=ERR[c]; pause(m,c); o.fatal&&o.fatal(c,m) } };
    r.onend=()=>{ if(!live())return; log('end'); M.sr=null; if(slot.tmp){ slot.fin=(slot.fin+' '+slot.tmp).trim(); slot.tmp='' } write();
      if(!M.on)return; if(M.n>=MAX||now()-M.heard>IDLE){ log('idle'); pause('Долго тихо'); return }
      M.empty=got?0:(M.empty||0)+1; if(M.empty>=2){ const d=Math.min(2000,300*M.empty); M.bt=(o.setTimeout||setTimeout)(()=>{ if(M.on&&!M.sr&&!session())pause() },d); return } // пустые сессии подряд — backoff
      if(!session())pause() }; // перезапуск сразу (iOS может отказать — тогда «Дальше»)
    try{ r.start(); kick(); return true }catch(e){ log('start-throw'); M.S.pop(); M.sr=null; return false } }
  function pause(why){ ct(M.wd); kill(); M.on=false; M.paused=true; write(); o.ui&&o.ui(false); o.pause&&o.pause(why||''); log('paused') }
  function start(base,done){ if(M.on){ stop(); return false } Object.assign(M,{on:true,paused:false,base:(base||'').trim(),S:[],done,retried:false,heard:now(),n:0}); o.ui&&o.ui(true); o.status&&o.status('Слушаю… «Готово» — разобрать'); if(!session()){ M.fails++; pause('Не удалось включить микрофон') } return true }
  function resume(base){ if(M.on)return; if(base!=null){ M.base=base.trim(); M.S=[] } Object.assign(M,{on:true,paused:false,retried:false,heard:now()}); o.ui&&o.ui(true); o.status&&o.status('Слушаю дальше…'); if(!session()){ M.fails++; pause('Микрофон не включился') } }
  function stop(){ if(!M.on&&!M.paused&&!M.sr)return; const cb=M.done; M.on=false; M.paused=false; M.done=null; ct(M.wd); const r=M.sr; M.sr=null; if(r){ try{r.stop?r.stop():r.abort()}catch(e){} }
    M.S.forEach(s=>{ if(s.tmp){ s.fin=(s.fin+' '+s.tmp).trim(); s.tmp='' } }); write(); o.ui&&o.ui(false); o.status&&o.status('Нажми и говори'); log('stopped'); const t=text(); if(cb)cb(t) }
  function cancel(){ M.done=null; M.paused=false; if(M.on||M.sr){ M.on=false; ct(M.wd); kill(); o.ui&&o.ui(false) } }
  return {start,resume,stop,cancel,text,get on(){return M.on},get paused(){return M.paused},get fails(){return M.fails},M} }
const X={Mic,ERR};
if(typeof module!=='undefined'&&module.exports)module.exports=X; else G.MICX=X;
})(typeof self!=='undefined'?self:this);
