import asyncio,json,random,datetime,sys
from playwright.async_api import async_playwright
URL='http://127.0.0.1:18437/'
FAKE='''
window.__said=[];window.__tts=[];
class FakeSR{constructor(){this.lang='';}start(){const t=window.__nextTranscript||'';setTimeout(()=>{this.onresult&&this.onresult({results:[Object.assign([{transcript:t}],{isFinal:true})]});setTimeout(()=>this.onend&&this.onend(),50)},200)}stop(){this.onend&&this.onend()}}
window.webkitSpeechRecognition=FakeSR;window.SpeechRecognition=FakeSR;
const _s=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{window.__tts.push(u.text)};
'''
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(); c=await b.new_context(viewport={'width':440,'height':956},device_scale_factor=2,locale='ru-RU',timezone_id='Asia/Novosibirsk')
    await c.add_init_script(FAKE); pg=await c.new_page()
    pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_selector('#nav button')
    assert 'v1.0.0' in await pg.inner_text('#ver')
    # голос: завтрак+обед
    await pg.evaluate("window.__nextTranscript='на завтрак два яйца и кофе с молоком, на обед 200 грамм гречки и куриная грудка'")
    await pg.click('#fab'); await pg.wait_for_selector('.pi'); await pg.wait_for_timeout(300)
    names=await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'); print('voice items',names); assert len(names)==4
    # правка граммов
    await pg.fill('[data-ig="3"]','150'); await pg.dispatch_event('[data-ig="3"]','input')
    await pg.screenshot(path='shots/voice-confirm.png')
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(300)
    tts=await pg.evaluate('window.__tts'); print('tts',tts[-1][:120]); assert tts
    # текстовый путь (как диктовка iOS)
    await pg.click('[data-addm="ужин"]'); await pg.wait_for_timeout(500); await pg.wait_for_selector('#vt')
    await pg.fill('#vt','тарелку борща со сметаной, два куска черного хлеба и чай с сахаром'); await pg.click('#vparse'); await pg.wait_for_selector('.pi')
    print('text items',await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'))
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(300)
    await pg.click('[data-water="250"]'); await pg.click('[data-water="250"]')
    await pg.screenshot(path='shots/diary.png',full_page=False)
    # правка записи
    await pg.click('.it'); await pg.fill('#eg','120'); await pg.click('[data-esave]')
    # рецепт голосом
    await pg.click('[data-tab="recipes"]'); await pg.evaluate("window.__nextTranscript='500 грамм риса сухого, 400 грамм говядины, две моркови, луковица и три ложки подсолнечного масла'")
    await pg.click('[data-newrec="voice"]'); await pg.wait_for_selector('.pi'); await pg.wait_for_timeout(300)
    print('recipe ings',await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'))
    await pg.click('[data-vsave]'); await pg.wait_for_selector('#rn'); await pg.fill('#rn','мой плов'); await pg.fill('#ry','1800'); await pg.fill('#rs','6'); await pg.click('[data-rsave]'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='shots/recipes.png',full_page=False)
    # рецепт по имени голосом
    await pg.evaluate("window.__nextTranscript='на перекус мой плов 300 грамм'"); await pg.click('#fab'); await pg.wait_for_selector('.pi'); await pg.wait_for_timeout(300)
    n=await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'); print('recipe by voice',n); assert 'мой плов' in n[0]
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(200)
    # цели
    await pg.click('[data-tab="goals"]'); await pg.fill('#cw','92'); await pg.dispatch_event('#cw','input'); await pg.click('[data-applycalc]')
    g=await pg.evaluate('window.__kbju.S.goals'); print('goals',g)
    await pg.screenshot(path='shots/goals.png',full_page=False)
    # история для статистики (только в тесте)
    await pg.evaluate('''()=>{const S=window.__kbju.S;const F=self.FOODS;const pick=n=>F.find(f=>f.n===n);const L=['гречка','куриная грудка отварная','творог 5%','банан','борщ','пельмени','салат оливье','кофе с молоком','хлеб черный','шоколад молочный','яйцо','плов'];
      for(let i=1;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(i%9===0)continue;
       S.days[k]=[];for(let j=0;j<5+(i%4);j++){const f=pick(L[(i*7+j*5)%L.length]);const g=f.po||150;S.days[k].push({id:'t'+i+j,meal:['завтрак','обед','ужин','перекус'][j%4],name:f.n,g,k:Math.round(f.k*g/100),p:f.p*g/100,f:f.f*g/100,c:f.c*g/100,k100:f.k,p100:f.p,f100:f.f,c100:f.c,cat:f.cat})}}
      localStorage.setItem('kbju.v1',JSON.stringify(S))}''')
    await pg.reload(); await pg.wait_for_selector('#nav button')
    await pg.click('[data-tab="stats"]'); await pg.screenshot(path='shots/stats-day.png',full_page=False)
    await pg.click('[data-sm="week"]'); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/stats.png',full_page=False); await pg.evaluate('window.scrollTo(0,600)'); await pg.screenshot(path='shots/stats-week-bottom.png')
    await pg.click('[data-sm="month"]'); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/stats-month.png',full_page=False)
    print('month advice',await pg.inner_text('.adv'))
    txt=await pg.inner_text('#app'); import re
    fr=re.findall(r'\d+[.,]\d+',txt.replace('2,5','').replace('3,2','')); print('fractions',fr[:5])
    # поиск/OFF
    await pg.click('[data-tab="diary"]'); await pg.click('#fab'); await pg.wait_for_timeout(600); await pg.fill('#vt','сырок'); await pg.click('#vparse'); await pg.wait_for_selector('.pi'); await pg.click('[data-pick="0"]')
    await pg.fill('#pq','кефир'); await pg.click('[data-off]'); await pg.wait_for_timeout(6000); print('OFF results',await pg.locator('#sbody2 .res').count()); await pg.screenshot(path='shots/off-search.png')
    await pg.click('[data-close2]'); await pg.click('[data-close]')
    await pg.click('[data-tab="more"]'); await pg.screenshot(path='shots/settings.png',full_page=False)
    sw=await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)"); print('sw',sw)
    await b.close()
  net=[e for e in errs if 'openfoodfacts' in e or 'ERR_FAILED' in e]; app=[e for e in errs if e not in net]
  print('OFF network errors (external):',len(net)); print('app console errors:',app); sys.exit(1 if app else 0)
asyncio.run(main())
