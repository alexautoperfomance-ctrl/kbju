// Микрофон (iOS Safari/PWA): 1-е нажатие — старт, 2-е — стоп. iOS обрывает сессию после паузы — перезапускаем,
// пока пользователь не нажал «стоп», копим финальный+промежуточный текст всех сессий и сразу пишем в поле.
// Нет ответа — один тихий перезапуск, потом подсказка про 🎤 на клавиатуре.
(function(G){
const ERR={'no-speech':'','aborted':'','audio-capture':'Микрофон недоступен (занят другим приложением?)','not-allowed':'Нет доступа к микрофону — разреши в Настройки → Safari → Микрофон',
 'service-not-allowed':'Распознавание речи недоступно в этом режиме iOS','network':'Нет сети для распознавания речи','language-not-supported':'Русский язык распознавания недоступен'};
const HARD=/not-allowed|service-not-allowed|language-not-supported|audio-capture|network/;
function Mic(o){ const st=o.setTimeout||((f,d)=>setTimeout(f,d)), ct=o.clearTimeout||(t=>clearTimeout(t)), now=o.now||Date.now, WD=o.wd||8000, IDLE=o.idle||90000, MAX=o.max||400, log=o.log||(()=>{});
  const M={on:false,sr:null,base:'',acc:'',sess:'',tmp:'',done:null,wd:null,rt:null,retried:false,heard:0,empty:0,n:0,fails:0};
  const text=()=>[M.base,M.acc,M.sess,M.tmp].map(s=>(s||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ');
  const write=()=>o.set(text());
  function commit(){ const s=(M.sess+' '+M.tmp).trim(); if(s)M.acc=(M.acc+' '+s).trim(); M.sess='';M.tmp='' }
  function kick(){ ct(M.wd); if(!M.on)return; M.wd=st(()=>{ if(!M.on)return; log('watchdog');
      if(!M.retried){ M.retried=true; log('retry'); kill(); session(); return }
      M.fails++; stop(true); o.kbd&&o.kbd('Микрофон не ответил') },WD) }
  function kill(){ const r=M.sr; M.sr=null; commit(); if(r){ try{r.abort()}catch(e){} } }
  function session(){ if(!M.on)return; let r; try{ r=new o.SR() }catch(e){ log('ctor-fail'); stop(true); o.kbd&&o.kbd('Распознавание недоступно'); return }
    M.sr=r; M.n++; r.lang='ru-RU'; r.continuous=false; r.interimResults=true; r.maxAlternatives=1; let got=false; const live=()=>M.sr===r;
    r.onstart=()=>{ if(live()){log('start');kick()} }; r.onaudiostart=r.onspeechstart=()=>{ if(live())kick() };
    r.onresult=e=>{ if(!live())return; kick(); let fin='',tmp=''; for(let i=0;i<e.results.length;i++){ const x=e.results[i], s=((x[0]&&x[0].transcript)||'').trim(); if(x.isFinal)fin+=s+' '; else tmp+=s+' ' }
      log('result'+(fin?':final':':interim')); M.sess=fin.trim(); M.tmp=tmp.trim(); if((fin+tmp).trim()){ got=true; M.heard=now(); M.retried=false } write() };
    r.onerror=e=>{ if(!live())return; const c=(e&&e.error)||'unknown'; log('error:'+c); if(c==='aborted'||c==='no-speech')return;
      if(HARD.test(c)){ M.fails++; stop(true); const m=ERR[c]; o.fatal?o.fatal(c,m):o.status&&o.status(m); return } };
    r.onend=()=>{ if(!live())return; log('end'); M.sr=null; commit(); write(); M.empty=got?0:M.empty+1;
      if(!M.on)return; if(M.n>=MAX||now()-M.heard>IDLE){ log('idle'); stop(); return }
      ct(M.rt); M.rt=st(session,Math.min(1000,80*Math.pow(2,Math.min(M.empty,4)))); kick() };
    try{ r.start(); kick() }catch(e){ log('start-throw'); M.sr=null; if(!M.retried){ M.retried=true; ct(M.rt); M.rt=st(session,300); return } M.fails++; stop(true); o.kbd&&o.kbd('Не удалось включить микрофон') } }
  function start(base,done){ if(M.on){ stop(); return false } Object.assign(M,{on:true,base:(base||'').trim(),acc:'',sess:'',tmp:'',done,retried:false,heard:now(),empty:0,n:0}); o.ui&&o.ui(true); o.status&&o.status('Слушаю… нажми ещё раз, чтобы закончить'); session(); return true }
  function stop(quiet){ if(!M.on&&!M.sr)return; const cb=M.done; M.on=false; M.done=null; ct(M.wd); ct(M.rt); kill(); write(); o.ui&&o.ui(false); if(!quiet)o.status&&o.status('Нажми и говори'); log('stopped'); const t=text(); if(cb&&t)cb(t) }
  function cancel(){ if(!M.on&&!M.sr)return; M.done=null; stop(true) }
  return {start,stop,cancel,text,get on(){return M.on},get fails(){return M.fails},M} }
const X={Mic,ERR};
if(typeof module!=='undefined'&&module.exports)module.exports=X; else G.MICX=X;
})(typeof self!=='undefined'?self:this);
