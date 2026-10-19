// node tests/mic.test.js — логика микрофона (mic.js) на моках iOS webkitSpeechRecognition и фейковых таймерах
const {Mic}=require('../mic.js'); let ok=0,bad=0; const as=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL:',m)}};
function env(script){ // script: массив поведений сессий по порядку
  let T=0,q=[],id=0; const E={field:'',status:'',kbd:null,done:null,ui:null,inst:[],fatal:null};
  const st=(f,d)=>{const i=++id;q.push({i,t:T+d,f});return i}, ct=i=>{q=q.filter(x=>x.i!==i)};
  const run=ms=>{ const end=T+ms; for(;;){ q.sort((a,b)=>a.t-b.t); const x=q[0]; if(!x||x.t>end)break; q.shift(); T=x.t; x.f() } T=end };
  class SR{ constructor(){ E.inst.push(this) }
    start(){ E.st=E.st||0; const b0=script[E.st]||{silent:true}; if(b0.throw){E.st++;throw new Error('InvalidState')} if(b0.ios&&E.gate&&!E.gate())throw new Error('not-allowed: user gesture required'); const b=this.b=b0; E.st++; if(b.throw||(b.ios&&E.gate&&!E.gate()))throw new Error('not-allowed: user gesture required'); this.alive=true; if(b.silent)return; st(()=>this.alive&&this.onstart&&this.onstart(),20);
      if(b.err){ st(()=>{ if(!this.alive)return; this.onerror({error:b.err}); this.alive=false; this.onend() },60); return }
      let t=100; (b.say||[]).forEach(([s,fin])=>{ st(()=>{ if(!this.alive)return; this.onresult({results:[Object.assign([{transcript:s}],{isFinal:!!fin})]}) },t); t+=100 });
      if(!b.hang)st(()=>{ if(!this.alive)return; this.alive=false; this.onend() },t+50) }
    abort(){ this.aborted=true; if(!this.alive)return; this.alive=false; st(()=>this.onend&&this.onend(),5) } }
  const m=Mic({SR,setTimeout:st,clearTimeout:ct,now:()=>T,set:t=>E.field=t,status:s=>E.status=s,pause:w=>E.paused=w||true,ui:u=>{E.ui=u;if(u)E.paused=false},fatal:(c,s)=>E.fatal=c});
  return {E,m,run} }
// 1) живой текст растёт в поле, перезапуск после паузы, всё копится; разбор только по «Готово»
{ const {E,m,run}=env([{say:[['посчитай-ка'],['посчитай-ка бжу 100 г',1]]},{say:[['готового риса',1]]},{err:'no-speech'},{say:[['это уже взвешенный'],['это уже взвешенный готовы свинина']]}]);
  m.start('',t=>E.done=t); as(E.ui===true&&m.on,'старт одним нажатием'); run(150); as(E.field==='посчитай-ка','interim сразу виден: '+E.field); run(250); as(E.field==='посчитай-ка бжу 100 г','финал в поле: '+E.field);
  run(5000); as(E.inst.length>=4&&E.inst.every(r=>r.lang==='ru-RU'&&r.interimResults),'перезапуски, ru-RU + interim'); as(m.on&&E.done==null,'сам не останавливается и не разбирает');
  m.stop(); run(50); as(E.done==='посчитай-ка бжу 100 г готового риса это уже взвешенный готовы свинина','всё накоплено, разбор после «Готово»: '+E.done); as(!m.on&&E.ui===false,'второе нажатие — стоп') }
// 2) interim без final, затем стоп — не теряется
{ const {E,m,run}=env([{say:[['двести грамм гречки']],hang:true}]); m.start('кефир',t=>E.done=t); run(300); as(E.field==='кефир двести грамм гречки','interim + старый текст поля: '+E.field); m.stop(); as(E.done==='кефир двести грамм гречки','interim сохранён при стопе') }
// 3) нет ответа: тихий повтор, затем пауза (текст цел, без разбора)
{ const {E,m,run}=env([{silent:true},{silent:true}]); m.start('рис',t=>E.done=t); run(8100); as(E.inst.length===2&&E.inst[0].aborted&&!E.paused&&m.on,'тихий повтор после 8 с'); run(8100); as(E.paused&&!m.on&&m.paused&&E.done==null&&E.field==='рис','потом пауза «Дальше», без разбора') }
// 4) повтор помог
{ const {E,m,run}=env([{silent:true},{say:[['банан',1]]}]); m.start('',t=>E.done=t); run(8500); as(!E.paused&&E.field==='банан'&&m.on,'повтор помог'); m.stop(); as(E.done==='банан','результат после повтора') }
// 5) start() бросает на первом нажатии — пауза, «Дальше» (жест) запускает
{ const {E,m,run}=env([{throw:true},{say:[['яблоко',1]]}]); m.start('',t=>E.done=t); as(m.paused&&E.done==null,'исключение start() → пауза'); m.resume(); run(500); as(E.field==='яблоко','«Дальше» продолжает: '+E.field) }
// 6) not-allowed на первой сессии — пауза + сообщение, без разбора
{ const {E,m,run}=env([{err:'not-allowed'}]); m.start('',t=>E.done=t); run(200); as(E.fatal==='not-allowed'&&!m.on&&E.inst.length===1&&E.done==null,'not-allowed: без перезапуска и разбора') }
// 7) нажатие во время перезапуска — стоп и разбор накопленного
{ const {E,m,run}=env([{say:[['суп',1]]},{silent:true}]); m.start('',t=>E.done=t); run(260); m.stop(); run(2000); as(!m.on&&E.done==='суп','стоп между сессиями') }
// 8) долгая тишина — пауза, не авто-разбор
{ const sc=[{say:[['гречка',1]]}]; for(let i=0;i<500;i++)sc.push({err:'no-speech'}); const {E,m,run}=env(sc); m.start('',t=>E.done=t); run(200000); as(m.paused&&E.done==null&&E.field==='гречка','долгая тишина → пауза, текст цел') }
// 9) СИМУЛЯЦИЯ iOS: onend после каждой фразы, start() вне жеста бросает, результаты новой сессии с индекса 0
{ let gesture=false; const phrases=['100 грамм риса','и 150 грамм курицы','ещё салат из огурцов'];
  const {E,m,run}=env(phrases.map(p=>({say:[[p.split(' ').slice(0,2).join(' ')],[p,1]],ios:true})));
  const SRp=E.inst; // патчим: сессия без жеста не стартует
  const orig=m.M; const wrapStart=()=>{}; // noop
  E.gate=()=>gesture;
  const tap=f=>{ gesture=true; try{f()}finally{gesture=false} };
  tap(()=>m.start('',t=>E.done=t)); run(400); as(E.field==='100 грамм риса','iOS: первая фраза: '+E.field);
  as(m.paused&&!m.on&&E.done==null,'iOS: перезапуск отклонён → пауза «Дальше», текст цел');
  tap(()=>m.resume(E.field)); run(400); as(E.field==='100 грамм риса и 150 грамм курицы','iOS: «Дальше» дописывает, не затирая: '+E.field);
  E.field+=' вареной'; tap(()=>m.resume(E.field)); run(150); as(E.field==='100 грамм риса и 150 грамм курицы вареной ещё салат','iOS: правка в поле сохранена, живой interim: '+E.field); run(300);
  tap(()=>m.stop()); as(E.done==='100 грамм риса и 150 грамм курицы вареной ещё салат из огурцов','iOS: разбор только по «Готово», весь текст: '+E.done) }
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad?1:0);
