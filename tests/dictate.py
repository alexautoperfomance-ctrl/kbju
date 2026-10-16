# Playwright 440x956: надиктовать своё меню в «🍽 Меню» (замоканное распознавание речи)
import asyncio,sys,re
from playwright.async_api import async_playwright
FAKE=re.search(r"FAKE='''(.*?)'''",open('tests/e2e.py').read(),re.S).group(1)
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18437/'
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(); c=await b.new_context(viewport={'width':440,'height':956},device_scale_factor=2,locale='ru-RU',timezone_id='Asia/Novosibirsk')
    await c.add_init_script(FAKE); pg=await c.new_page()
    pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_selector('#nav button'); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_selector('#nav button')
    await pg.click('[data-tab="menu"]'); await pg.wait_for_selector('.mwk'); await pg.click('[data-mdict]'); await pg.wait_for_selector('#dmic')
    await pg.evaluate("window.__chunks=['на завтрак 60 г овсяных хлопьев и банан','на обед сварил суп: 500 г курицы, 300 г картошки, морковка, 2 литра воды, съел тарелку 350 г','на ужин 200 г творога 5% и яблоко']")
    await pg.click('#dmic'); await pg.wait_for_timeout(2500); print('said:',await pg.input_value('#dt')); await pg.click('#dmic'); await pg.wait_for_selector('#dres .dday')
    txt=await pg.inner_text('#dres'); print(txt.replace('\n',' | ')[:600])
    assert 'Суп (свой)' in txt and 'Завтрак' in txt and 'Ужин' in txt and 'готового ≈' in txt, 'разобрано'
    assert await pg.locator('#dres .dmr').count()>=15 and await pg.locator('#dres .dmr.low').count()>=1, 'микро-бары с дефицитами'
    assert await pg.locator('#dres [data-dtip]').count()>=1, 'советы по дефицитам'
    k0=await pg.inner_text('#dres .mtot b >> nth=0')
    g=pg.locator('[data-dg]').filter(has=pg.locator('xpath=.')).nth(0)
    sp=pg.locator('#dres .it:has-text("Суп (свой)") [data-dg]'); await sp.fill('500'); await sp.dispatch_event('change'); await pg.wait_for_timeout(200)
    k1=await pg.inner_text('#dres .mtot b >> nth=0'); print('kcal',k0,'→',k1); assert int(k1)>int(k0)
    await pg.click('[data-dsr]'); await pg.wait_for_timeout(200); assert 'рецепт сохранён' in await pg.inner_text('#dres')
    assert await pg.evaluate("JSON.parse(localStorage.getItem('kbju.v1')).recipes.some(r=>r.name==='суп (мой)'&&r.meth==='soup'&&r.yield>2000)")
    await pg.click('[data-dtip] >> nth=0'); await pg.wait_for_timeout(200); assert 'Перекус' in await pg.inner_text('#dres')
    await pg.locator('#sheet .sbody, #sbody').first.evaluate("e=>e.scrollTop=0"); await pg.screenshot(path='shots/menu-dictate.png')
    await pg.click('[data-dmadd="0"]'); await pg.wait_for_timeout(200)
    n1=await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('kbju.v1'));return Object.values(s.days).flat().length})()"); assert n1>=1
    await pg.fill('#ddate','2026-10-10'); await pg.click('[data-dadd]'); await pg.wait_for_timeout(200)
    dd=await pg.evaluate("JSON.parse(localStorage.getItem('kbju.v1')).days['2026-10-10']"); print('diary 10.10:',[(e['meal'],e['name'],e['g'],round(e['k'])) for e in dd])
    assert any(e['name']=='Суп (свой)' and e['g']==500 and e['meal']=='обед' for e in dd)
    await pg.select_option('#dwd','2'); await pg.click('[data-dsave]'); await pg.wait_for_selector('.mwk .on'); assert 'Ср' in await pg.inner_text('.mwk .on')
    mt=await pg.inner_text('#app'); assert 'Свой день' in mt and 'Суп (свой)' in mt, 'день меню'
    await pg.reload(); await pg.click('[data-tab="menu"]'); await pg.wait_for_selector('.mwk'); assert 'Суп (свой)' in await pg.inner_text('#app')
    await pg.click('[data-maddday]'); await pg.wait_for_timeout(200)
    print('errors:',errs); assert not errs; await b.close(); print('dictate ok')
asyncio.run(main())
