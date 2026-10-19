# Playwright: iOS-причуды webkitSpeechRecognition. python tests/mic.py [URL]
import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18437/'
FAKE='''
window.__m={mode:'final-only',chunks:[],created:0,aborted:0,log:[]};
class FakeSR{constructor(){__m.created++}
 start(){ const m=__m.mode, t=__m.chunks.shift(); this.alive=true; __m.log.push('start:'+m);
  if(m==='silent')return;                                   // никаких событий вообще
  if(m==='throw')throw new Error('InvalidStateError');
  setTimeout(()=>this.alive&&this.onstart&&this.onstart(),20);
  if(m==='service-not-allowed'||m==='not-allowed'){ setTimeout(()=>{ if(!this.alive)return; this.onerror&&this.onerror({error:m}); this.alive=false; this.onend&&this.onend() },60); return }
  if(m==='no-speech'||t==null){ setTimeout(()=>{ if(!this.alive)return; this.onerror&&this.onerror({error:'no-speech'}); this.alive=false; this.onend&&this.onend() },60); return }
  if(m==='hang-after-result'){ setTimeout(()=>this.alive&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:t}],{isFinal:false})]}),60); return } // interim и тишина, без onend
  // final-only: без interim, onend сразу после onresult
  setTimeout(()=>{ if(!this.alive)return; this.onresult({resultIndex:0,results:[Object.assign([{transcript:t}],{isFinal:true})]}); this.alive=false; this.onend&&this.onend() },80) }
 stop(){ this.abort() } abort(){ __m.aborted++; if(!this.alive)return; this.alive=false; setTimeout(()=>this.onend&&this.onend(),5) }}
window.webkitSpeechRecognition=FakeSR; delete window.SpeechRecognition; window.SpeechRecognition=undefined;
'''
ok=0
def chk(c,m):
  global ok
  if not c: raise AssertionError(m)
  ok+=1; print('ok:',m)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    async def page(extra=''):
      c=await b.new_context(viewport={'width':440,'height':956},locale='ru-RU',timezone_id='Asia/Novosibirsk'); await c.add_init_script(FAKE+extra); pg=await c.new_page()
      errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); await pg.goto(URL); await pg.wait_for_selector('#nav button')
      await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('kbju.v1')||'{}'); })()"); return pg,errs
    async def openv(pg): await pg.click('#fab'); await pg.wait_for_selector('#mic')
    red=lambda pg: pg.evaluate("document.querySelector('#mic').classList.contains('on')")
    # 1) только финальные результаты, onend сразу после onresult → рестарты, текст копится, стоп разбирает
    pg,errs=await page(); await openv(pg)
    await pg.evaluate("__m.mode='final-only';__m.chunks=['200 грамм гречки','и куриная грудка','банан']")
    await pg.click('#mic'); await pg.wait_for_timeout(1200)
    v=await pg.input_value('#vt'); chk('гречки' in v and 'грудка' in v and 'банан' in v,'final-only: весь текст сохранён: '+v); chk(await red(pg),'кнопка активна, пока не нажали стоп')
    await pg.click('#mic'); await pg.wait_for_timeout(300); chk(not await red(pg),'2-е нажатие — стоп'); chk(await pg.locator('.pi').count()==3,'разобрано 3 позиции')
    n=await pg.evaluate('__m.created'); await pg.wait_for_timeout(800); chk(await pg.evaluate('__m.created')==n,'после стопа перезапусков нет')
    # 2) паузы: no-speech подряд → продолжаем слушать (iOS), с backoff, стоп по нажатию
    await pg.fill('#vt',''); await pg.evaluate("__m.mode='no-speech'"); await pg.click('#mic'); await pg.wait_for_timeout(6000)
    chk(await red(pg),'no-speech: всё ещё слушаем'); cr=await pg.evaluate('__m.created')-n; chk(2<=cr<=12,f'no-speech: рестартов {cr} (backoff)'); await pg.click('#mic'); await pg.wait_for_timeout(200); chk(not await red(pg),'стоп после пауз')
    # 3) interim и зависание без onend → стоп всё равно срабатывает сразу, interim сохранён
    await pg.fill('#vt',''); await pg.evaluate("__m.mode='hang-after-result';__m.chunks=['кефир 250']"); await pg.click('#mic'); await pg.wait_for_timeout(300)
    chk('кефир' in await pg.input_value('#vt'),'interim виден сразу'); await pg.click('#mic'); await pg.wait_for_timeout(100)
    chk(not await red(pg),'стоп при зависшей сессии'); chk(await pg.evaluate('__m.aborted')>=1,'вызван abort()'); chk('кефир' in await pg.input_value('#vt'),'interim не потерян')
    # 4) нет событий вообще → сторож 8 с сбрасывает кнопку
    await pg.fill('#vt',''); await pg.evaluate("__m.mode='silent'"); await pg.click('#mic'); await pg.wait_for_timeout(500); chk(await red(pg),'silent: слушаем')
    await pg.wait_for_timeout(8200); chk(await red(pg),'сторож 8 с: тихий повтор'); await pg.wait_for_timeout(8200); chk(not await red(pg),'сторож: после повтора кнопка сброшена'); chk('8 с' in await pg.inner_text('#mst') or 'клавиатур' in await pg.inner_text('#mst'),'сообщение сторожа')
    # 5) service-not-allowed → понятное сообщение, кнопка не залипает, фокус в поле (диктовка клавиатуры)
    await pg.evaluate("__m.mode='service-not-allowed'"); await pg.click('#mic'); await pg.wait_for_timeout(400)
    chk(not await red(pg),'service-not-allowed: кнопка сброшена'); t=await pg.inner_text('#mst'); chk('клавиатур' in t and 'недоступно' in t,'сообщение + подсказка: '+t)
    chk(await pg.evaluate("document.activeElement&&document.activeElement.id")=='vt','фокус в поле для диктовки клавиатуры')
    # 6) отладочная строка событий
    await pg.click('#sheet.on [data-close]'); await pg.click('[data-tab="more"]'); await pg.check('#smicdbg'); await pg.click('[data-tab="diary"]'); await openv(pg)
    await pg.evaluate("__m.mode='final-only';__m.chunks=['яблоко']"); await pg.click('#mic'); await pg.wait_for_timeout(400); await pg.click('#mic'); await pg.wait_for_timeout(200)
    dbg=await pg.inner_text('#micdbg'); chk('start' in dbg and 'result:final' in dbg and 'stopped' in dbg,'debug-строка: '+dbg); await pg.screenshot(path='shots/mic-debug.png')
    chk(not errs,'нет ошибок JS: '+str(errs))
    # 7) PWA (standalone) + not-allowed → авто-переход на клавиатуру
    pg,errs=await page("Object.defineProperty(navigator,'standalone',{get:()=>true});"); await openv(pg)
    await pg.evaluate("__m.mode='not-allowed'"); await pg.click('#mic'); await pg.wait_for_timeout(400)
    chk(not await red(pg),'PWA not-allowed: сброс'); chk(await pg.evaluate("document.activeElement.id")=='vt','PWA: фокус в поле'); chk('клавиатуре' in await pg.inner_text('#mst'),'PWA: подсказка 🎤')
    # 8) start() бросает исключение
    await pg.evaluate("__m.mode='throw'"); await pg.click('#mic'); await pg.wait_for_timeout(800); chk(not await red(pg),'start() throw: повтор и сброс')
    # 9) без SpeechRecognition вообще
    pg,errs=await page("delete window.webkitSpeechRecognition; window.webkitSpeechRecognition=undefined;"); await openv(pg); await pg.click('#mic'); await pg.wait_for_timeout(200)
    chk(await pg.evaluate("document.activeElement.id")=='vt' and 'клавиатуре' in await pg.inner_text('#mst'),'нет SR: диктовка клавиатуры')
    await b.close()
  print(f'{ok} passed')
asyncio.run(main())
