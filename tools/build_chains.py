# Меню сетей и товары магазинов → cdata/ (ленивая загрузка). Источник: снимок /workspace/kbju_chains (см. sources.md там).
# cdata/idx.js — маленький индекс названий/алиасов (грузится при старте); cdata/<slug>.json — меню сети; cdata/<store>-NNN.json — шарды товаров.
# python3 tools/build_chains.py [SRC]   (SRC по умолчанию /tmp/kc — снимок, т.к. другой воркер дописывает оригинал)
import json,re,glob,os,sys,collections
SRC=(sys.argv[1] if len(sys.argv)>1 else '/tmp/kc').rstrip('/')+'/'; OUT='/workspace/kbju/cdata/'
os.makedirs(OUT,exist_ok=True)
for f in glob.glob(OUT+'*'): os.remove(f)
FW=set(json.load(open('/tmp/foodwords.json')))
SHORT={'dodo-pizza':'Додо','dens-pizza':"Den's",'dominos-pizza':'Доминос','subjoy':'Сабджой','subway':'Subway','kofe-hauz':'Кофе Хауз','steyk-burger-miratorg':'Мираторг','cinnabon':'Cinnabon','volkonsky':'Волконский','mu-mu':'Му-Му','yakitoriya':'Якитория','shokoladnitsa':'Шоколадница',
 'burger-king':'Бургер Кинг','rostics':"Rostic's",'vkusno-i-tochka':'Вкусно и точка','papa-johns':"Papa John's",'pizza-hut':'Pizza Hut','anderson':'АндерСон','teremok':'Теремок','tanuki':'Тануки',
 'stars-coffee':'Stars Coffee','sushi-wok':'Суши Wok','yaposha':'Япоша','cofix':'Cofix','vilka-lozhka':'Вилка-Ложка','dva-berega':'Два Берега','sushkof':'Сушкоф','prime-star':'Прайм','sushi-master':'Суши Мастер'}
EXTRA={'vkusno-i-tochka':['вкусно и точка','вкусноточка','вкусно точка','вит','макдональдс','макдоналдс','макдак','мак','маке','мака','mcdonald\'s'],'rostics':['ростикс','ростик','ростикса','ростиксе','kfc','кфс','кфц','rostics'],
 'burger-king':['бк','бургер кинг','бургер кинге','бургер кинга','бургеркинг','burger king','bk'],'teremok':['теремок','теремке','теремка'],'tanuki':['тануки'],'cofix':['кофикс','cofix'],'anderson':['андерсон','андерсоне'],
 'papa-johns':['папа джонс','папа джонса','папа джонсе','papa johns'],'pizza-hut':['пицца хат','пицца хатт','пиццахат','pizza hut'],'surf-coffee':['сурф кофе','серф кофе','серф','surf'],'stars-coffee':['старс кофе','старс','stars coffee'],'sushi-wok':['суши вок','суши wok','sushi wok'],
 'yaposha':['япоша','япоше','япоши'],'dodo-pizza':['додо','додопицц','dodo'],'dens-pizza':['денс','den\'s','dens','ден'],'dominos-pizza':['доминос','домино','dominos','domino\'s'],'subjoy':['сабджой','subjoy'],'subway':['сабвей','сабвэй','сабвее','subway'],
 'mu-mu':['му-му','муму','му му','mu-mu'],'yakitoriya':['якитория','якитории','якиторию','якитори'],'shokoladnitsa':['шоколадница','шоколаднице','шоколадницы','шоко'],
 'pyaterochka':['пятерочка','пятерочке','пятерочки','пятерка','пятерке','пятерки','5ка','5-ка','пятёрочка'],'magnit':['магнит','магните','магнита','magnit'],'ashan':['ашан','ашане','ашана','auchan'],
 'okey':['окей','о кей','о\'кей','okey'],'azbuka-kafe':['азбука вкуса','азбуке вкуса','азбука','азбуке','кафе азбука вкуса'],'perekrestok-kafe':['перекресток кафе','перекресток select','перекресток селект','кафе перекресток'],
 'pyaterochka-kafe':['пятерочка кафе','кафе пятерочка','пятерка кафе'],'kofe-hauz':['кофе хауз','кофехауз','кофе хаус','coffee house'],'coffee-like':['кофе лайк','коффи лайк','coffee like','кофелайк'],
 'cinnabon':['синнабон','синабон','cinnabon'],'steyk-burger-miratorg':['мираторг','мираторге','miratorg'],'niyama':['нияма','нияме','ниямы','niyama'],'shtolle':['штолле','stolle'],
 'lavka':['яндекс лавка','яндекс лавке','лавка','лавке','лавки','лавку'],'vkusvill':['вкусвилл','вкусвилле','вкусвилла','вкус вилл','vkusvill'],'perekrestok':['перекресток','перекрестке','перекрестка','перекрёсток'],
 'metro':['метро','metro'],'yarche':['ярче','yarche'],'lenta':['лента','ленте','ленты','лента онлайн'],'igooods':['игудс','igooods','игуудс'],'dobryanka':['добрянка','добрянке','добрянки'],'bahetle':['бахетле','bahetle']}
MERGE={'shokoladnitsa-eda':'shokoladnitsa','sushidays-nsk':'sushidays','ebidoebi':'yobidoyobi'}       # дубли одной сети: объединяем (первым — источник с полными Б/Ж/У)
STORES={'lavka':(['lavka'],'Яндекс Лавка'),'vkusvill':(['vkusvill'],'ВкусВилл'),'igooods':(['igooods'],'igooods'),'metro':(['metro'],'Метро'),'bahetle':(['bahetle-sib','bahetle-lavka'],'Бахетле'),
 'dobryanka':(['dobryanka'],'Добрянка'),'lenta':(['lenta','lenta-eda','lenta-igooods'],'Лента'),'perekrestok':(['perekrestok'],'Перекрёсток'),'yarche':(['yarche'],'Ярче'),'pyaterochka':(['pyaterochka-eda'],'Пятёрочка'),'magnit':(['magnit-eda'],'Магнит'),'ashan':(['ashan-eda'],'АШАН'),'okey':(['okey-eda'],"О'КЕЙ"),
 'azbuka-kafe':(['azbuka-vkusa-kafe-eda'],'Кафе Азбука вкуса'),'perekrestok-kafe':(['perekrestok-kafe-eda'],'Перекрёсток Кафе Select')}
KAFE_INTO={'pyaterochka-kafe-eda':'pyaterochka-kafe'}   # товары «Пятёрочка Кафе» — в меню одноимённой сети
def num(x):
    try: return None if x is None or x=='' else float(x)
    except: return None
def r1(x): return None if x is None else round(x,1)
def nrm(s): return re.sub(r'\s+',' ',re.sub(r"[«»\"!.,()—–]",' ',s.lower().replace('ё','е'))).strip()
ALC=re.compile(r'ликер|ликёр|коктейл|вино|пиво|водк|коньяк|виски|\bром\b|джин|глинтвейн|сидр|шампан|настойк|бальзам|текил|сироп|подсласт|эритрит|стевия|клетчат|отруб|сушен|сушён|жвачк|резинк|без сахара|полиол|мальтит',re.I)
DRY=re.compile(r'чипс|вял|сушен|сушён|джерк|снек|протеин|порош|сух|изолят|гейнер|батончик протеин|желатин|казеин|сывороточ|пармезан|спирулин|соев.*текстур|мука|глютен',re.I)
def bad(nm,k,p,f,c):   # None — ок; иначе причина
    if min(k,p,f,c)<0: return 'отрицательные'
    if k>902: return 'ккал>900'
    if p>40 and not DRY.search(nm): return 'белок>40'
    if p+f+c>101: return 'Б+Ж+У>100'
    a=4*p+9*f+4*c
    if a>30 and not ALC.search(nm) and (k>a*1.5+40 or k<a*.5-40): return 'Этуотер'
    return None
IDX=json.load(open(SRC+'index.json'))
meta={c['slug']:c for c in IDX['chains']}
rep=collections.OrderedDict(); drops=collections.Counter(); idx=[]
chains={}
for f in sorted(glob.glob(SRC+'chains/*.json')):
    d=json.load(open(f,encoding='utf8')); c=d['chain']; slug0=c['slug']; slug=MERGE.get(slug0,slug0)
    C=chains.setdefault(slug,{'slug':slug,'name':None,'short':None,'site':c.get('website',''),'items':[],'al':set(),'seen':set(),'bad':0,'est':0,'drop':collections.Counter()})
    if slug0==slug: C['name']=re.sub(r'\s*\(.*\)$','',c['name']).strip() or c['name']
    C['al'].update(a for a in c.get('aliases',[]))
    items=C['items']; seen=C['seen']
    for it in d['items']:
        nm=re.sub(r'\s+',' ',it['name']).strip(); vs=[]
        for v in it.get('variants',[]):
            p100=v.get('per100') or {}; g=num(v.get('weight_g')) or num(v.get('volume_ml'))
            k=num(p100.get('kcal'))
            if k is None and v.get('per_portion') and g:
                pp=v['per_portion']; k=num(pp.get('kcal'))*100/g if num(pp.get('kcal')) else None
                p100={x:(num(pp.get(x))*100/g if num(pp.get(x)) is not None else None) for x in('p','f','c')}
            if k is None: C['drop']['нет ккал']+=1; continue
            p,fa,cc=num(p100.get('p')),num(p100.get('f')),num(p100.get('c'))
            lab=re.sub(r'\s+',' ',v.get('label','')).strip()
            dm=v.get('diameter_cm') or (int(m.group(1)) if (m:=re.search(r'(\d{2})\s*см',lab)) else None)
            x={'l':lab,'k':r1(k)}
            if p is not None and fa is not None and cc is not None: x.update(p=r1(p),f=r1(fa),c=r1(cc))
            else: x['est']=1; C['est']+=1                      # сеть публикует только ккал
            if g: x['g']=round(g)
            if dm: x['d']=int(dm)
            if re.search(r'тонк',lab,re.I): x['t']=1
            if v.get('slices'): x['sl']=int(v['slices'])
            if v.get('pieces'): x['pcs']=int(v['pieces'])
            if 'p' in x and v.get('volume_ml') and k>80 and re.search(r'капучино|латте|флэт|флет|американо|эспрессо|кортадо',nm.lower()) and g and g>=150:   # похоже, опубликовано на порцию, а не на 100 мл
                m_=100/g; x.update(k=r1(k*m_),p=r1(p*m_),f=r1(fa*m_),c=r1(cc*m_)); k,p,fa,cc=x['k'],x['p'],x['f'],x['c']; x['pp']=1; C['drop']['пересчитано (порция→100 мл)']+=1
            if 'p' in x:
                why=bad(nm+' '+it.get('category',''),k,p,fa,cc) or ('quality_flag' if v.get('quality_flag') or it.get('quality_flag') else None)
                if why or (fa>45 and not re.search(r'соус|масл|майонез|орех|сало|шоколад',(nm+' '+it.get('category','')).lower())): x['bad']=1; C['bad']+=1; C['drop']['помечено: '+(why or 'жир>45')]+=1   # берётся типичное значение
            if v.get('volume_ml'): x['ml']=1
            vs.append(x)
        if not vs: continue
        if slug=='dens-pizza' and nm=='Пепперони':  # подтверждено пользователем: 30 см 520 г, 260 ккал Б11 Ж11 У31
            for x in vs: x.update(k=260,p=11,f=11,c=31); x.pop('bad',None)
            for x in vs:
                if x.get('d')==30: x['g']=520
        if nm.lower() in seen:
            ex=next(i for i in items if i['n'].lower()==nm.lower()); labs={x['l'] for x in ex['v']}; ex['v']+= [x for x in vs if x['l'] not in labs]; continue
        seen.add(nm.lower()); items.append({'n':nm,'cat':it.get('category',''),'u':it.get('source_url',''),'v':vs})
AMB={'фарш','буханка','мясо и рыба','хачапури и вино','грабли','азбука','азбуке','магнит','окей','маке','мака','брусника','горчица','ерш','процесс','прайм','prime','старс','stars','мак','ден','метро','metro','белок','nemo','krems','machete','valhalla','квантум','мечтатели','чайхона','потехин','хамовники','фарфор','перчини','рыбарис'}  # обычные слова — только после «в/из/кафе…»
def aliases(slug,base,name):
    base=[a for a in base if not (slug=='subjoy' and re.search(r'subway|сабв',a,re.I)) and not (slug=='steyk-burger-miratorg' and nrm(a)=='стейк бургер мираторг')]
    al=set(nrm(a) for a in base)|set(nrm(a) for a in EXTRA.get(slug,[])); al.add(nrm(name))
    out=[]
    for a in sorted(al,key=len,reverse=True):
        if len(a)<2: continue
        amb=1 if a in AMB or len(a)<=2 and a not in ('бк','bk') else 0
        out.append([a,amb])
    return out
for src,dst in KAFE_INTO.items():
    C=chains.get(dst)
    if not C: continue
    for f in sorted(glob.glob(SRC+f'products/{src}-[0-9]*.json')):
        for it in json.load(open(f,encoding='utf8'))['items']:
            nm=re.sub(r'\s+',' ',it['name']).strip(); p100=it.get('per100') or {}; k,p,fa,cc=(num(p100.get(x)) for x in ('kcal','p','f','c'))
            if k is None or nm.lower() in C['seen']: continue
            if p is None or fa is None or cc is None: x={'l':'','k':r1(k),'est':1}; C['est']+=1
            else:
                why=bad(nm,k,p,fa,cc) or ('quality_flag' if it.get('quality_flag') else None)
                if why: C['drop']['отброшено (товар): '+why]+=1; continue
                x={'l':'','k':r1(k),'p':r1(p),'f':r1(fa),'c':r1(cc)}
            g=num(it.get('weight_g'))
            if g: x['g']=round(g)
            C['seen'].add(nm.lower()); C['items'].append({'n':nm,'cat':it.get('category') or '','u':it.get('url',''),'v':[x]})
for slug,C in chains.items():
    if not C['items']: continue
    sh=SHORT.get(slug,C['name']); js={'slug':slug,'name':C['name'],'short':sh,'site':C['site'],'items':C['items']}
    fn=slug+'.json'; open(OUT+fn,'w',encoding='utf8').write(json.dumps(js,ensure_ascii=False,separators=(',',':')))
    idx.append({'s':slug,'n':C['name'],'sh':sh,'k':'c','f':[fn],'c':len(C['items']),'a':aliases(slug,C['al'],C['name'])})
    rep[slug]=(C['name'],'сеть',len(C['items']),sum(len(i['v']) for i in C['items']),C['bad'],C['est'],dict(C['drop']))
# магазины: компактные строки [name,k,p,f,c,g,fl] fl: 1=мл 2=только ккал
for st,(srcs,name) in STORES.items():
    rows=[]; seen=set(); dr=collections.Counter(); est=0
    for s in srcs:
        for f in sorted(glob.glob(SRC+f'products/{s}-[0-9]*.json')):
            for it in json.load(open(f,encoding='utf8'))['items']:
                nm=re.sub(r'\s+',' ',it['name']).strip(); key=nm.lower()
                if key in seen: dr['дубль']+=1; continue
                p100=it.get('per100') or {}; k,p,fa,cc=(num(p100.get(x)) for x in ('kcal','p','f','c'))
                if k is None: dr['нет ккал']+=1; continue
                fl=0; g=num(it.get('weight_g')) or num(it.get('volume_ml'))
                if it.get('volume_ml') and not it.get('weight_g'): fl|=1
                if p is None or fa is None or cc is None: fl|=2; est+=1; p=fa=cc=None
                else:
                    why=bad(nm+' '+(it.get('category') or ''),k,p,fa,cc) or ('quality_flag' if it.get('quality_flag') else None)
                    if why: dr[why]+=1; continue
                if (mm:=re.search(r'(\d+)\s*/\s*(\d+)\s*г',nm)): g=int(mm.group(1))+int(mm.group(2))
                if g and (g<=0 or g>20000): g=None
                if it.get('sold_by_weight'): g=None
                seen.add(key); rows.append([nm,r1(k),r1(p),r1(fa),r1(cc),round(g) if g else 0,fl])
    rows.sort(key=lambda r:r[0].lower()); files=[]; SH=2500
    for i in range(0,len(rows),SH):
        fn=f'{st}-{i//SH+1:03d}.json'; open(OUT+fn,'w',encoding='utf8').write(json.dumps({'slug':st,'rows':rows[i:i+SH]},ensure_ascii=False,separators=(',',':'))); files.append(fn)
    al=[]
    for s in srcs:
        try: al+= [json.load(open(SRC+f'products/{s}-index.json')).get('name','')]
        except: pass
    idx.append({'s':st,'n':name,'sh':name,'k':'s','f':files,'c':len(rows),'a':aliases(st,[],name)})
    rep[st]=(name,'магазин',len(rows),len(rows),0,est,dict(dr))
open(OUT+'idx.js','w',encoding='utf8').write('// Индекс сетей и магазинов (снимок kbju_chains 2026-10-19). Сгенерировано tools/build_chains.py\nself.CHAIN_IDX='+json.dumps(idx,ensure_ascii=False,separators=(',',':'))+';\n')
json.dump(rep,open('/tmp/chain_report.json','w'),ensure_ascii=False,indent=0)
tot=collections.Counter()
for s,(n,k,a,b,bd,e,dr) in rep.items(): print(f'{s:32} {k:7} items {a:5} var {b:5} bad {bd:3} est {e:4} {dr}'); tot[k]+=a
print(tot, 'idx KB',os.path.getsize(OUT+'idx.js')//1024, 'total MB',sum(os.path.getsize(f) for f in glob.glob(OUT+'*'))/1e6)
