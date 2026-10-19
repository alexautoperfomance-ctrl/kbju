// node tests/mic.test.js — логика микрофона (mic.js) на моках iOS webkitSpeechRecognition и фейковых таймерах
const {Mic}=require('../mic.js'); let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
function env(script){ // script: массив поведений сессий по порядку
  let T=0,q=[],id=0; const E={field:'',status:'',kbd:null,done:null,ui:null,inst:[],fatal:null};
  const st=(f,d)=>{const i=++id;q.push({i,t:T+d,f});return i}, ct=i=>{q=q.filter(x=>x.i!==i)};
  const run=ms=>{ const end=T+ms; for(;;){ q.sort((a,b)=>a.t-b.t); const x=q[0]; if(!x||x.t>end)break; q.shift(); T=x.t; x.f() } T=end };
  class SR{ constructor(){ this.k=E.inst.length; this.b=script[this.k]||{silent:true}; E.inst.push(this) }
    start(){ const b=this.b; this.alive=true; if(b.throw)throw new Error('InvalidState'); if(b.silent)return; st(()=>this.alive&&this.onstart&&this.onstart(),20);
      if(b.err){ st(()=>{ if(!this.alive)return; this.onerror({error:b.err}); this.alive=false; this.onend() },60); return }
      let t=100; (b.say||[]).forEach(([s,fin])=>{ st(()=>{ if(!this.alive)return; this.onresult({results:[Object.assign([{transcript:s}],{isFinal:!!fin})]}) },t); t+=100 });
      if(!b.hang)st(()=>{ if(!this.alive)return; this.alive=false; this.onend() },t+50) }
    abort(){ this.aborted=true; if(!this.alive)return; this.alive=false; st(()=>this.onend&&this.onend(),5) } }
  const m=Mic({SR,setTimeout:st,clearTimeout:ct,now:()=>T,set:t=>E.field=t,status:s=>E.status=s,kbd:w=>E.kbd=w,ui:u=>E.ui=u,fatal:(c,s)=>E.fatal=c});
  return {E,m,run} }
// 1) iOS обрывает после паузы: 3 сессии подряд, текст копится, interim тоже, лишних запятых нет
{ const {E,m,run}=env([{say:[['посчитай-ка бжу'],['посчитай-ка бжу 100 г',1]]},{say:[['готового риса',1]]},{err:'no-speech'},{say:[['это уже взвешенный'],['это уже взвешенный готовы свинина']]}]);
  m.start('',t=>E.done=t); as(E.ui===true&&m.on,'старт одним нажатием'); run(400); as(E.field==='посчитай-ка бжу 100 г','финальный текст в поле: '+E.field);
  run(5000); as(E.inst.length>=4,'автоперезапуск после onend и no-speech: '+E.inst.length); as(E.inst.every(r=>r.lang==='ru-RU'&&r.interimResults),'ru-RU + interim');
  as(m.on,'не останавливается сам на паузах'); m.stop(); run(50);
  as(E.done==='посчитай-ка бжу 100 г готового риса это уже взвешенный готовы свинина','всё накоплено, колбэк разбора после стопа: '+E.done); as(!m.on&&E.ui===false,'второе нажатие — стоп') }
// 2) interim без final, затем стоп — промежуточный текст не теряется
{ const {E,m,run}=env([{say:[['двести грамм гречки']],hang:true}]); m.start('кефир',t=>E.done=t); run(300); as(E.field==='кефир двести грамм гречки','interim виден + старый текст поля: '+E.field); m.stop(); as(E.done==='кефир двести грамм гречки','interim сохранён при стопе') }
// 3) нет ответа: один тихий перезапуск, затем подсказка про клавиатуру
{ const {E,m,run}=env([{silent:true},{silent:true}]); m.start('',t=>E.done=t); run(8100); as(E.inst.length===2&&E.inst[0].aborted&&E.kbd===null&&m.on,'тихий повтор после 8 с'); run(8100); as(E.kbd==='Микрофон не ответил'&&!m.on,'потом подсказка: '+E.kbd) }
// 4) тихий повтор помог — работаем дальше без подсказки
{ const {E,m,run}=env([{silent:true},{say:[['банан',1]]}]); m.start('',t=>E.done=t); run(8500); as(E.kbd===null&&E.field==='банан'&&m.on,'повтор помог'); m.stop(); as(E.done==='банан','результат после повтора') }
// 5) start() бросает — один повтор
{ const {E,m,run}=env([{throw:true},{say:[['яблоко',1]]}]); m.start('',t=>E.done=t); run(1000); as(E.field==='яблоко'&&E.kbd===null,'повтор после исключения start()') }
{ const {E,m,run}=env([{throw:true},{throw:true}]); m.start('',()=>{}); run(1000); as(E.kbd&&!m.on,'два исключения → клавиатура') }
// 6) жёсткая ошибка — стоп с сообщением
{ const {E,m,run}=env([{err:'not-allowed'}]); m.start('',()=>{}); run(200); as(E.fatal==='not-allowed'&&!m.on&&E.inst.length===1,'not-allowed: стоп без перезапуска') }
// 7) повторное нажатие во время перезапуска (между сессиями) — всё равно стоп
{ const {E,m,run}=env([{say:[['суп',1]]},{silent:true}]); m.start('',t=>E.done=t); run(260); m.start('',()=>{}); run(2000); as(!m.on&&E.done==='суп'&&E.inst.length<=2,'стоп между сессиями: '+E.inst.length) }
// 8) долгая тишина без речи — авто-стоп с разбором накопленного
{ const sc=[{say:[['гречка',1]]}]; for(let i=0;i<500;i++)sc.push({err:'no-speech'}); const {E,m,run}=env(sc); m.start('',t=>E.done=t); run(200000); as(!m.on&&E.done==='гречка','авто-стоп после долгой тишины') }
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad?1:0);
