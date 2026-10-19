# Меню сетей → chains.js (ленивая загрузка). Источник: /workspace/kbju_chains (официальные сайты, 2026-10-19; см. sources.md)
import json,re,glob
SRC='/workspace/kbju_chains/'
SHORT={'dodo-pizza':'Додо','dens-pizza':"Den's",'dominos-pizza':'Доминос','subjoy':'Сабджой','mu-mu':'Му-Му','yakitoriya':'Якитория','shokoladnitsa':'Шоколадница'}
def num(x):
    try: return None if x is None else float(x)
    except: return None
def r1(x): return None if x is None else round(x,1)
out=[]
for f in sorted(glob.glob(SRC+'chains/*.json')):
    d=json.load(open(f,encoding='utf8')); c=d['chain']; slug=c['slug']; items=[]; seen=set()
    for it in d['items']:
        nm=re.sub(r'\s+',' ',it['name']).strip()
        vs=[]
        for v in it.get('variants',[]):
            p100=v.get('per100') or {}; g=num(v.get('weight_g')) or num(v.get('volume_ml'))
            k=num(p100.get('kcal'))
            if k is None and v.get('per_portion') and g: 
                pp=v['per_portion']; k=num(pp.get('kcal'))*100/g if num(pp.get('kcal')) else None
                p100={x:(num(pp.get(x))*100/g if num(pp.get(x)) is not None else None) for x in('p','f','c')}
            if k is None: continue
            p,fa,cc=num(p100.get('p')),num(p100.get('f')),num(p100.get('c'))
            lab=re.sub(r'\s+',' ',v.get('label','')).strip()
            dm=v.get('diameter_cm') or (int(m.group(1)) if (m:=re.search(r'(\d{2})\s*см',lab)) else None)
            x={'l':lab,'k':r1(k)}
            if p is not None and fa is not None and cc is not None: x.update(p=r1(p),f=r1(fa),c=r1(cc))
            else: x['est']=1                                   # сеть публикует только ккал
            if g: x['g']=round(g)
            if dm: x['d']=int(dm)
            if re.search(r'тонк',lab,re.I): x['t']=1
            if v.get('slices'): x['sl']=int(v['slices'])
            if v.get('pieces'): x['pcs']=int(v['pieces'])
            if 'p' in x:
                a=4*p+9*fa+4*cc
                if k>900 or p+fa+cc>100 or fa>100 or abs(a-k)/max(a,k,1)>.35 or (fa>45 and not re.search(r'соус|масл|майонез|орех|сало|шоколад',(nm+' '+it.get('category','')).lower())): x['bad']=1  # физически неправдоподобно для блюда   # опубликованные цифры противоречивы
            if v.get('volume_ml'): x['ml']=1
            vs.append(x)
        if not vs: continue
        if slug=='dens-pizza' and nm=='Пепперони':  # подтверждено пользователем: 30 см 520 г, 260 ккал Б11 Ж11 У31
            for x in vs: x.update(k=260,p=11,f=11,c=31); x.pop('bad',None)
            for x in vs:
                if x.get('d')==30: x['g']=520
        if nm.lower() in seen:  # одно блюдо в нескольких разделах (Сабджой 15/30 см, Den's «Пепперони») — объединяем варианты
            ex=next(i for i in items if i['n'].lower()==nm.lower()); labs={x['l'] for x in ex['v']}; ex['v']+= [x for x in vs if x['l'] not in labs]; continue
        seen.add(nm.lower())
        items.append({'n':nm,'cat':it.get('category',''),'u':it.get('source_url',''),'v':vs})
    out.append({'slug':slug,'name':c['name'],'short':SHORT.get(slug,c['name']),'site':c.get('website',''),'items':items})
js='// Меню сетей (официальные сайты, 2026-10-19). Сгенерировано tools/build_chains.py из /workspace/kbju_chains. Загружается лениво.\nself.CHAINS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('/workspace/kbju/chains.js','w',encoding='utf8').write(js)
for c in out: print(c['slug'],len(c['items']),sum(len(i['v']) for i in c['items']),'bad',sum(1 for i in c['items'] for v in i['v'] if v.get('bad')),'est',sum(1 for i in c['items'] for v in i['v'] if v.get('est')))
print(len(js)//1024,'KB')
