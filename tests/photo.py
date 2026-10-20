# Playwright e2e: фото этикетки (настоящий Tesseract с CDN) и блюда без этикетки. python3 tests/photo.py, сервер на :18438
from PIL import Image,ImageDraw,ImageFont
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
im=Image.new('RGB',(1100,560),(250,248,240)); d=ImageDraw.Draw(im)
f1=ImageFont.truetype(F.replace('Sans.','Sans-Bold.'),44); f2=ImageFont.truetype(F,30)
d.text((40,30),'Сырок творожный глазированный',font=f1,fill=(20,20,20))
L=['Состав: творог, сахар, масло сливочное, глазурь.','Пищевая ценность в 100 г продукта:','белки 8,5 г, жиры 23,0 г, углеводы 32,0 г.','Энергетическая ценность 1530 кДж / 367 ккал.','Масса нетто 40 г. Хранить при +2...+6 °C.']
for i,l in enumerate(L): d.text((40,130+i*70),l,font=f2,fill=(30,30,30))
im=im.rotate(2,expand=True,fillcolor=(200,200,200)); im.save('/tmp/lbl.jpg',quality=85)
Image.new('RGB',(800,600),(180,120,60)).save('/tmp/dish.jpg')
import asyncio,sys
from playwright.async_api import async_playwright
URL='http://127.0.0.1:18438/'
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(); c=await b.new_context(viewport={'width':440,'height':956},locale='ru-RU',timezone_id='Asia/Novosibirsk'); pg=await c.new_page()
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(URL); await pg.wait_for_selector('#nav button'); print(await pg.inner_text('#ver'))
    await pg.click('[data-addm="обед"]'); await pg.wait_for_selector('#phin',state='attached')
    await pg.set_input_files('#phin','/tmp/lbl.jpg'); await pg.wait_for_selector('#phst')
    for i in range(180):
      await pg.wait_for_timeout(1000); st=await pg.inner_text('#phst')
      if not st.startswith('⏳'): break
    print('status:',st); await pg.screenshot(path='/tmp/ph_sheet.png'); vals=[await pg.input_value('#ph'+x) for x in 'kpfcg']; print('vals',vals)
    print('names', await pg.eval_on_selector_all('[data-phname]','e=>e.map(x=>x.textContent)'))
    ocr=await pg.eval_on_selector('.phocr','e=>e.textContent') if await pg.locator('.phocr').count() else ''; print('OCR:',ocr[:400])
    if await pg.locator('[data-phname]').count(): await pg.click('[data-phname="0"]')
    else: await pg.fill('#phn','Сырок творожный глазированный')
    print('meal', await pg.input_value('#phm'))
    await pg.click('[data-phsave]'); await pg.wait_for_timeout(400)
    S=await pg.evaluate('window.__kbju.S'); d=list(S['days'].values())[0]; print('entry',d[-1]); print('custom',S['custom'][-1])
    # блюдо без этикетки
    await pg.click('[data-addm="ужин"]'); await pg.set_input_files('#phin','/tmp/dish.jpg')
    for i in range(120):
      await pg.wait_for_timeout(1000); st=await pg.inner_text('#phst')
      if not st.startswith('⏳'): break
    print('dish status:',st)
    await pg.fill('#phn','борщ'); await pg.wait_for_timeout(400)
    sug=await pg.eval_on_selector_all('[data-phsug]','e=>e.map(x=>x.textContent)'); print('sug',sug)
    await pg.click('[data-phsug="0"]'); await pg.wait_for_timeout(200)
    print('dish vals',[await pg.input_value('#ph'+x) for x in 'nkpfcgm'])
    await pg.click('[data-phsave]'); await pg.wait_for_timeout(400)
    S=await pg.evaluate('window.__kbju.S'); d=list(S['days'].values())[0]; print('entry2',{k:d[-1][k] for k in ['meal','name','g','k']}, 'custom count',len(S['custom']))
    # голос потом находит сохранённый продукт
    print('parse', await pg.evaluate("window.__kbju.parse('сырок творожный глазированный').map(x=>x.food&&x.food.n+' '+x.g)"))
    await pg.screenshot(path='/tmp/ph_diary.png')
    print('errors',errs); assert vals[:4]==['367','8.5','23','32'] and not errs
    await b.close()
asyncio.run(main())
