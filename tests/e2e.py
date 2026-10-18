# Playwright e2e, 440x956. Распознавание речи замокано (continuous=false + interim, iOS-подобные onend), TTS запрещён.
import asyncio,sys,re
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18437/'
FAKE='''
window.__tts=0; window.__sr={created:0,started:0,stopped:0};
window.__chunks=[]; // фразы, которые «говорит» пользователь, по одной на сессию распознавания
class FakeSR{constructor(){window.__sr.created++;this.continuous=false;this.interimResults=false}
 start(){window.__sr.started++; window.__sr.cfg=[this.continuous,this.interimResults,this.lang]; const t=window.__chunks.shift(); this._alive=true;
  if(t==null){ this._t=setTimeout(()=>this._end(),300); return }
  this._t1=setTimeout(()=>this._alive&&this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:t.slice(0,Math.ceil(t.length/2))}],{isFinal:false})]}),80);
  this._t2=setTimeout(()=>this._alive&&this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:t}],{isFinal:true})]}),180);
  this._t=setTimeout(()=>this._end(),300) /* как iOS: сессия сама заканчивается */ }
 _end(){ if(!this._alive)return; this._alive=false; clearTimeout(this._t); setTimeout(()=>this.onend&&this.onend(),10) }
 stop(){ window.__sr.stopped++; this._end() } abort(){ this._end() }}
window.webkitSpeechRecognition=FakeSR; window.SpeechRecognition=FakeSR;
if(window.speechSynthesis){ speechSynthesis.speak=()=>{window.__tts++} }
'''
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(); c=await b.new_context(viewport={'width':440,'height':956},device_scale_factor=2,locale='ru-RU',timezone_id='Asia/Novosibirsk')
    await c.add_init_script(FAKE); pg=await c.new_page()
    pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_selector('#nav button')
    assert 'v1.10.0' in await pg.inner_text('#ver')
    assert await pg.locator('text=🔊').count()==0, 'нет кнопок озвучки'
    # --- микрофон-переключатель: 3 сессии (iOS-рестарты) до нажатия «стоп»
    await pg.evaluate("window.__chunks=['на завтрак два яйца','и кофе с молоком','на обед 200 грамм гречки и куриная грудка']")
    await pg.click('#fab'); await pg.wait_for_selector('#mic')
    assert await pg.evaluate('window.__sr.started')==0, 'не стартует сам'
    await pg.click('#mic'); await pg.wait_for_timeout(150)
    assert 'on' in (await pg.get_attribute('#mic','class')), 'активное состояние'
    await pg.wait_for_timeout(1300)
    st=await pg.evaluate('window.__sr'); print('sr',st); assert st['started']>=3 and st['cfg'][0]==False and st['cfg'][1] and st['cfg'][2]=='ru-RU'
    assert await pg.locator('.pi').count()==0, 'до стопа не разбираем'
    vt=await pg.input_value('#vt'); print('vt:',vt); assert 'два яйца' in vt and 'кофе с молоком' in vt and 'гречки' in vt
    await pg.click('#mic'); await pg.wait_for_selector('.pi'); await pg.wait_for_timeout(200)
    assert 'on' not in (await pg.get_attribute('#mic','class') or '')
    names=await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'); print('voice items',names); assert len(names)==4
    n=await pg.evaluate('window.__sr.started'); await pg.wait_for_timeout(700); assert await pg.evaluate('window.__sr.started')==n, 'после стопа не перезапускается'
    await pg.fill('[data-ig="3"]','150'); await pg.dispatch_event('[data-ig="3"]','input')
    await pg.screenshot(path='shots/voice-confirm.png')
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(300)
    # --- клавиатурная диктовка (как на iOS) + маракуйя
    await pg.click('[data-addm="ужин"]'); await pg.wait_for_selector('#vt')
    await pg.fill('#vt','тарелку борща со сметаной, два куска черного хлеба и маракуйя 200 г'); await pg.click('#vparse'); await pg.wait_for_selector('.pi')
    print('text items',await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'))
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(300)
    await pg.click('[data-water="250"]'); await pg.click('[data-water="250"]')
    await pg.screenshot(path='shots/diary-compact.png'); await pg.screenshot(path='shots/diary.png')
    assert not await pg.evaluate("document.querySelector('details[data-k=d_micro]').open"), 'свёрнуто по умолчанию'
    vis=await pg.evaluate("(()=>{const m=[...document.querySelectorAll('.meal')];return [m[m.length-1].getBoundingClientRect().bottom,innerHeight]})()"); print('collapsed: last meal bottom',vis); assert vis[0]<800
    print('micro summary:',await pg.inner_text('#dmsum'))
    await pg.click('details[data-k=d_micro] summary h2'); await pg.wait_for_timeout(800)
    assert await pg.locator('.dmr').count()==30
    val=lambda k: pg.evaluate(f"(()=>{{const r=document.querySelector('.dmr[data-mic={k}]');return [parseInt(r.querySelector('.a').textContent),parseInt(r.querySelector('em').textContent),r.querySelector('i').style.width]}})()")
    ca0,b20,d0=await val('Ca'),await val('B2'),await val('D'); print('before milk Ca/B2/D',ca0,b20,d0)
    await pg.click('[data-addm="перекус"]'); await pg.wait_for_selector('#vt'); await pg.fill('#vt','два стакана молока 3,2%'); await pg.click('#vparse'); await pg.wait_for_selector('.pi'); await pg.click('[data-vsave]'); await pg.wait_for_timeout(900)
    ca1,b21,d1=await val('Ca'),await val('B2'),await val('D'); print('after milk Ca/B2/D',ca1,b21,d1)
    mca=await pg.evaluate("self.MICRO['молоко 3,2%'][self.MK.indexOf('Ca')]*5")
    assert abs((ca1[0]-ca0[0])-mca)<=2 and b21[0]>b20[0] and d1[0]>=d0[0] and ca1[2]!=ca0[2], 'живое обновление'
    assert await pg.evaluate("document.querySelector('details[data-k=d_micro]').open"), 'состояние запомнено'
    await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/diary-micros.png')
    await pg.click('.dmr[data-mic="Ca"]'); await pg.wait_for_selector('#sheet2.on'); assert 'Кальций' in await pg.inner_text('#sbody2'); await pg.click('[data-close2]')
    # удаление молока — значения падают
    await pg.click('.it:has-text("молоко 3,2%")'); await pg.click('[data-edel]'); await pg.wait_for_timeout(700); ca2=await val('Ca'); print('after delete Ca',ca2); assert ca2[0]==ca0[0]
    await pg.click('details[data-k=d_micro] summary h2')
    # --- детали записи
    await pg.click('.it:has-text("маракуйя")'); await pg.wait_for_selector('#dbody .dgrid')
    dt=await pg.inner_text('#sbody'); print('detail:',dt[:300].replace('\n',' | '))
    assert 'Витамин C' in dt and 'Калий' in dt and 'клетч' in dt and 'сахара' in dt and '%' in dt
    assert not re.search(r'\d[.,]\d',dt.replace('2,5','')), 'целые числа'
    rows=await pg.locator('#dbody .dr').count(); print('detail rows',rows); assert rows>=26
    await pg.wait_for_timeout(2700); await pg.screenshot(path='shots/entry-detail.png')
    k1=(await pg.inner_text('.dk div >> nth=0')); await pg.fill('#dg','100'); await pg.dispatch_event('#dg','input'); k2=await pg.inner_text('.dk div >> nth=0'); print('kcal 200→100 g:',k1.split()[0],k2.split()[0]); assert int(k2.split()[0])<int(k1.split()[0])
    await pg.select_option('#dm','перекус'); await pg.click('[data-esave]'); await pg.wait_for_timeout(200)
    S=await pg.evaluate('window.__kbju.S'); e=[x for d in S['days'].values() for x in d if x['name']=='маракуйя'][0]; print('edited',e['g'],e['meal']); assert e['g']==100 and e['meal']=='перекус'
    await pg.click('.it:has-text("маракуйя")'); await pg.click('[data-edel]'); await pg.wait_for_timeout(200); assert await pg.locator('.it:has-text("маракуйя")').count()==0
    # --- поиск: микрофон в поле поиска + детали из результатов
    await pg.click('[data-addm="перекус"]'); await pg.wait_for_selector('#vt'); await pg.fill('#vt','сырок'); await pg.click('#vparse'); await pg.wait_for_selector('.pi'); await pg.click('[data-pick="0"]')
    await pg.wait_for_selector('#sheet2.on'); await pg.fill('#pq',''); await pg.evaluate("window.__chunks=['творог']"); await pg.click('[data-mict="pq"]'); await pg.wait_for_timeout(250)
    assert 'on' in await pg.get_attribute('[data-mict="pq"]','class'); await pg.click('[data-mict="pq"]'); await pg.wait_for_timeout(400)
    print('search by voice:',await pg.input_value('#pq'),await pg.locator('#pres .res').count()); assert 'творог' in await pg.input_value('#pq') and await pg.locator('#pres .res').count()>0
    await pg.click('[data-pinfo="0"]'); await pg.wait_for_selector('#dbody .dgrid'); print('search detail ok'); await pg.click('[data-dpick]'); await pg.wait_for_timeout(200)
    await pg.click('[data-close]')
    # --- рецепт голосом (переключатель) + детали порции рецепта
    await pg.click('[data-tab="recipes"]'); await pg.click('[data-newrec="voice"]'); await pg.wait_for_selector('#mic')
    await pg.evaluate("window.__chunks=['500 грамм риса сухого, 400 грамм говядины','две моркови, луковица и три ложки подсолнечного масла']")
    await pg.click('#mic'); await pg.wait_for_timeout(900); await pg.click('#mic'); await pg.wait_for_selector('.pi'); await pg.wait_for_timeout(200)
    print('recipe ings',await pg.eval_on_selector_all('.pi .nm','e=>e.map(x=>x.textContent)'))
    await pg.click('[data-vsave]'); await pg.wait_for_selector('#rn'); await pg.fill('#rn','мой плов'); await pg.fill('#ry','1800'); await pg.fill('#rs','6'); await pg.click('[data-rsave]'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='shots/recipes.png')
    await pg.click('[data-recinfo]'); await pg.wait_for_selector('#dbody .dgrid'); rd=await pg.inner_text('#sbody2'); assert 'Витамин A' in rd; print('recipe detail ok')
    await pg.click('[data-dadd]'); await pg.wait_for_timeout(200)
    await pg.click('[data-tab="goals"]'); await pg.fill('#cw','92'); await pg.dispatch_event('#cw','input'); await pg.click('[data-applycalc]'); await pg.screenshot(path='shots/goals.png')
    # история только для статистики в тесте
    await pg.evaluate('''()=>{const S=window.__kbju.S;const F=self.FOODS;const pick=n=>F.find(f=>f.n===n);const L=['гречка','куриная грудка отварная','творог 5%','банан','борщ','пельмени','салат оливье','кофе с молоком','хлеб черный','шоколад молочный','яйцо','плов'];
      for(let i=1;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(i%9===0)continue;
       S.days[k]=[];for(let j=0;j<5+(i%4);j++){const f=pick(L[(i*7+j*5)%L.length]);const g=f.po||150;S.days[k].push({id:'t'+i+j,meal:['завтрак','обед','ужин','перекус'][j%4],name:f.n,g,k:Math.round(f.k*g/100),p:f.p*g/100,f:f.f*g/100,c:f.c*g/100,k100:f.k,p100:f.p,f100:f.f,c100:f.c,cat:f.cat})}}
      localStorage.setItem('kbju.v1',JSON.stringify(S))}''')
    await pg.reload(); await pg.wait_for_selector('#nav button')
    await pg.click('[data-tab="stats"]'); await pg.screenshot(path='shots/stats-day.png')
    await pg.click('details[data-k="c_micro"] summary h2'); await pg.evaluate("document.querySelector('details[data-k=c_micro]').scrollIntoView();window.scrollBy(0,-50)"); await pg.screenshot(path='shots/micros.png')
    assert await pg.locator('.mr').count()==30
    await pg.click('[data-sm="week"]'); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/stats.png'); await pg.screenshot(path='shots/stats-compact.png')
    await pg.click('details.nutri summary h2'); await pg.evaluate("document.querySelector('details.nutri').scrollIntoView();window.scrollBy(0,-62)"); await pg.screenshot(path='shots/nutritionist.png')
    nt=await pg.inner_text('details.nutri'); assert '/10' in nt and 'не медицинская' in nt
    await pg.click('[data-sm="month"]'); await pg.screenshot(path='shots/stats-month.png')
    txt=await pg.inner_text('#app'); print('fractions',[txt[max(0,m.start()-40):m.end()+5] for m in re.finditer(r'\d[.,]\d',txt.replace('2,5','').replace('3,2',''))][:3])
    await pg.click('[data-tab="more"]'); assert 'Озвуч' not in await pg.inner_text('#app'); await pg.screenshot(path='shots/settings.png')
    assert await pg.evaluate('window.__tts')==0, 'TTS не вызывался'
    await pg.click('[data-tab="diary"]'); await pg.wait_for_timeout(200)
    if not await pg.evaluate("document.querySelector('details[data-k=adv_day]').open"): await pg.click('details[data-k="adv_day"] summary h2')
    n1=await pg.locator('.tp').count(); assert n1>=1, 'нет советов по микро'
    lines=await pg.eval_on_selector_all('.tp','e=>e.map(x=>x.innerText)'); print('tips',n1,lines[:3])
    assert not any('Натрий' in l for l in lines) and all(l.count('%')>=3 for l in lines) and not re.search(r'\d[.,]\d',' '.join(lines))
    await pg.evaluate("document.querySelector('.tips').scrollIntoView();window.scrollBy(0,-60)"); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/tips-micros.png')
    k0=await pg.get_attribute('.tp >> nth=0','data-tk'); p0=await pg.inner_text('.tp >> nth=0 >> b'); fn=(await pg.get_attribute('.tp >> nth=0 >> .tpf >> nth=0','data-tipadd')).split('|')[0]
    await pg.click('.tp >> nth=0 >> .tpf >> nth=0'); await pg.wait_for_selector('.pi'); assert fn in await pg.inner_text('#vres'); await pg.click('[data-vsave]'); await pg.wait_for_timeout(700)
    p1=await pg.inner_text(f'.tp[data-tk="{k0}"] b') if await pg.locator(f'.tp[data-tk="{k0}"]').count() else 'закрыт'
    print('live tip',fn,p0,'→',p1); assert p1!=p0
    await pg.click('[data-tab="diary"]'); await pg.click('[data-addm="перекус"]'); await pg.wait_for_selector('#vt'); await pg.fill('#vt','3 маракуйи, кралик 200 г'); await pg.click('#vparse'); await pg.wait_for_selector('.pi >> nth=1')
    nt=await pg.inner_text('#vres'); print('confirm:',nt.replace(chr(10),' | ')[:240]); assert '3 шт ≈ 54 г мякоти' in nt and await pg.locator('.cands').count()>=1
    await pg.screenshot(path='shots/confirm-fuzzy.png'); await pg.click('[data-cand="1:0"]'); assert await pg.locator('.cands').count()==0
    await pg.click('[data-vsave]'); await pg.wait_for_timeout(500); await pg.click('[data-edit]:has-text("маракуйя") >> nth=-1'); await pg.wait_for_selector('#dnote'); assert '54 г мякоти' in await pg.inner_text('#dnote'); await pg.screenshot(path='shots/detail-edible.png')
    await pg.click('#sheet.on [data-close]'); await pg.wait_for_timeout(300)
    await pg.click('[data-tab="menu"]'); await pg.wait_for_selector('.mwk'); assert await pg.locator('.mwk button').count()==7
    await pg.click('[data-mday="2"]'); await pg.wait_for_timeout(100); mt=await pg.inner_text('.mtot'); print('menu tot',mt.replace(chr(10),' '))
    nums=[int(x) for x in re.findall(r'\d+',mt)]; assert abs(nums[0]-nums[1])/nums[1]<=0.03, 'ккал ±3%'
    assert await pg.locator('.meal').count()==5 and await pg.locator('.dmr').count()==29
    await pg.evaluate("window.scrollTo(0,0)"); await pg.screenshot(path='shots/menu-day.png')
    assert await pg.locator('.meal >> nth=0 >> .mi').count()>=3, 'завтрак из 3 блюд'
    assert await pg.locator('[data-mswap]').count()==await pg.locator('.mi').count(), 'у каждого блюда своя кнопка замены'
    assert await pg.locator('[data-mmeal]').count()==5 and await pg.locator('[data-mregen]').count()==1
    first=await pg.inner_text('.mi >> nth=0 >> .n'); g_other0=await pg.inner_text('.mi >> nth=3 >> .mu')
    await pg.click('[data-mswap="0:0"]'); await pg.wait_for_selector('#sheet.on .swo'); n=await pg.locator('.swo').count(); assert 3<=n<=5, f'вариантов {n}'
    opts1=[await pg.inner_text(f'.swo >> nth={j} >> .n') for j in range(n)]; assert first not in opts1
    print('swap opts:',opts1); await pg.evaluate("document.querySelector('#sheet').scrollTop=0"); await pg.screenshot(path='shots/menu-swap.png')
    await pg.click('[data-swmore]'); await pg.wait_for_timeout(200); opts2=[await pg.inner_text(f'.swo >> nth={j} >> .n') for j in range(await pg.locator('.swo').count())]; print('more:',opts2); assert not set(opts1)&set(opts2), 'следующие варианты другие'
    await pg.click('#sheet.on [data-close]'); await pg.wait_for_timeout(200); await pg.click('[data-mswap="0:0"]'); await pg.wait_for_selector('#sheet.on .swo')
    pick=await pg.inner_text('.swo >> nth=0 >> .n'); await pg.click('[data-swpick="0"]'); await pg.wait_for_timeout(300); assert await pg.inner_text('.mi >> nth=0 >> .n')==pick, 'выбор применён'
    mt=await pg.inner_text('.mtot'); nums=[int(x) for x in re.findall(r'\d+',mt)]; print('after swap',nums[:8]); assert abs(nums[0]-nums[1])/nums[1]<=0.03 and abs(nums[2]-nums[3])/nums[3]<=0.06, 'день сбалансирован после замены'
    assert not re.search(r'\d[.,]\d', await pg.inner_text('.meal >> nth=0')), 'без дробей'
    await pg.reload(); await pg.click('[data-tab="menu"]'); await pg.wait_for_selector('.mwk'); assert await pg.inner_text('.mi >> nth=0 >> .n')==pick, 'замена сохранилась после перезагрузки'
    m0=await pg.inner_text('.meal >> nth=2'); await pg.click('[data-mmeal="2"]'); await pg.wait_for_timeout(300); assert await pg.inner_text('.meal >> nth=2')!=m0, 'замена приёма'
    before=await pg.inner_text('.meal'); await pg.click('[data-mregen]'); await pg.wait_for_timeout(300); print('regen changed',before!=await pg.inner_text('.meal'))
    st=await pg.evaluate("JSON.parse(localStorage.getItem('kbju.v1')).menu.week.length"); assert st==7
    await pg.click('[data-madd="0"]'); await pg.wait_for_timeout(200); await pg.click('[data-tab="diary"]'); await pg.click('[data-tab="menu"]'); assert 'Ср' in await pg.inner_text('.mwk .on')
    await pg.click('details[data-k="m_set"] summary h2'); await pg.check('[data-mex="рыба"]'); await pg.wait_for_timeout(500)
    ex=await pg.evaluate("JSON.parse(localStorage.getItem('kbju.v1')).menu"); assert 'рыба' in ex['opt']['excl'] and not any(x['n'] in ('горбуша','треска','минтай','скумбрия','сельдь','хек') for d in ex['week'] for m in d['meals'] for x in m['items'])
    print('menu ok')
    print('sw',await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)"))
    await b.close()
  net=[e for e in errs if 'openfoodfacts' in e or 'ERR_FAILED' in e]; app=[e for e in errs if e not in net]
  print('app console errors:',app); sys.exit(1 if app else 0)
asyncio.run(main())
