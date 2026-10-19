# Сборка встроенной базы: значения на 100 г (Скурихин/таблицы хим. состава + USDA FDC, вручную), плюс
# производные варианты (способы приготовления по коэффициентам потерь воды/жира, жирность молочки).
import json,re,sys
sys.path.insert(0,'tools'); import cook
DCOOK={}
DER={}
items={}; order=[]
def add(name,syn,k,p,f,c,pc=None,por=None,cat='',src='base',base=None):
    name=name.replace('ё','е').strip()
    if src=='derived' and base and base in items and name.startswith(base+' '):
        suf=name[len(base):]; syn=list(syn)+[x+suf for x in items[base]['s'][:4]]
    if src=='derived' and base: DER[name.replace('ё','е').strip()]=base
    if name in items: return
    if k is None: k=round(4*p+9*f+4*c)
    items[name]=dict(n=name,s=[x.replace('ё','е').strip() for x in syn if x.strip()],k=round(k),p=round(p,1),f=round(f,1),c=round(c,1),pc=pc,po=por,cat=cat,src=src); order.append(name)
ADJ={'m':['отварной','жареный','тушеный','запеченный'],'f':['отварная','жареная','тушеная','запеченная'],
     'n':['отварное','жареное','тушеное','запеченное'],'p':['отварные','жареные','тушеные','запеченные']}
VAR={'m':'вареный','f':'вареная','n':'вареное','p':'вареные'}
COOK=[(1.3,0,0),(1.25,6,0),(1.2,3,0),(1.3,2,0)]  # множитель (потеря воды), +жир, +углеводы
VEGC=[(1.0,0,0),(1.0,3,0.5),(1.0,7,1),(1.15,1.5,0)]
RU={}
for line in open('tools/ru_ref.txt',encoding='utf8'):
    if not line.strip() or line[0]=='#': continue
    a=line.rstrip('\n').split(';'); RU[a[0].replace('ё','е')]=dict(k=float(a[1]),p=float(a[2]),f=float(a[3]),c=float(a[4]),cat=a[5],s=[x for x in a[6].split('/') if x],src=a[7])
cat='';rows=[]
for line in open('tools/data_base.txt',encoding='utf8'):
    line=line.strip()
    if not line or line.startswith('#'): continue
    if line.startswith('@'): cat=line[1:]; continue
    a=line.split(';'); n,syn=a[0],a[1].split('/') if a[1] else []
    k,p,f,c=map(float,a[2:6])
    if n.replace('ё','е') in RU: r=RU[n.replace('ё','е')]; k,p,f,c=r['k'],r['p'],r['f'],r['c']
    pc=float(a[6]) if a[6] else None; po=float(a[7]) if a[7] else None; g=a[8]
    add(n,syn,k,p,f,c,pc,po,cat); items[n.replace('ё','е')]['pl']=1 if g=='p' else 0; rows.append((n,syn,k,p,f,c,pc,po,g,cat))
EX=json.load(open('tools/extra_resolved.json',encoding='utf8'))
for x in EX:
    pc=float(x['pc']) if x['pc'] else None
    add(x['n'],x['s'].split('/') if x['s'] else [],x['k'],x['p'],x['f'],x['c'],pc,float(x['po']),'dairy' if x['cat']=='dairyfix' else x['cat'],'base')
    items[x['n']]['pl']=1 if x['g']=='p' else 0
    if x['rf'] and float(x['rf'])>0: items[x['n']]['rf']=float(x['rf'])
    if x['cat'] in('fruit','veg','fish','meat') and not re.search(r'консерв|сушен|коктейль|кишмиш|красный',x['n']):
        rows.append((x['n'],x['s'].split('/') if x['s'] else [],x['k'],x['p'],x['f'],x['c'],pc,float(x['po']),x['g'],x['cat']))
# съедобная часть одной штуки (г) и отходы % (USDA refuse / типовой вес)
RF={'яблоко':(182,10),'груша':(178,10),'банан':(118,36),'апельсин':(130,27),'мандарин':(76,26),'грейпфрут':(246,50),'лимон':(58,47),'лайм':(44,16),'киви':(69,14),'ананас':(905,49),
 'манго':(200,31),'персик':(150,4),'нектарин':(142,9),'абрикос':(35,7),'слива':(66,6),'вишня':(None,9),'черешня':(None,10),'арбуз':(286,48),'дыня':(150,49),'гранат':(282,44),
 'хурма':(168,16),'инжир':(50,1),'фейхоа':(40,30),'помело':(600,48),'маракуйя':(18,48),'авокадо':(136,33),'кокос':(None,48),
 'грецкие орехи':(5,55),'миндаль':(1,60),'фундук':(1,54),'арахис':(1,27),'кешью':(1,0),'фисташки':(1,50),'кедровые орехи':(None,60),'семечки подсолнечника':(None,46),'тыквенные семечки':(None,30),
 'яйцо':(50,12),'яйцо вареное':(50,12),'перепелиное яйцо':(9,8),'картофель':(150,20),'морковь':(61,11),'свекла':(82,10),'лук репчатый':(100,10),'чеснок':(3,13),'огурец':(100,3),'помидор':(120,9),
 'перец болгарский':(119,18),'кабачок':(196,5),'баклажан':(300,19),'батат':(130,28),'тыква':(None,30),'капуста белокочанная':(None,20),'капуста цветная':(None,39),'брокколи':(None,39),'редис':(15,10),
 'кукуруза початок':(100,45),'креветки':(10,50),'курица':(None,32),'куриное бедро':(120,21),'куриная голень':(100,30),'куриное крыло':(45,46),'сельдь':(None,40),'скумбрия':(None,35),'финики':(7,10),'чернослив':(8,12),'курага':(8,0)}
for n,(pc,rf) in RF.items():
    if n in items:
        if pc: items[n]['pc']=pc
        if rf: items[n]['rf']=rf
for (n,syn,k,p,f,c,pc,po,g,cat) in rows:
    if n in items and items[n].get('pc'): pc=items[n]['pc']
    if cat in('meat','fish','veg') and n not in('свиное сало','бекон','креветки','мидии','кальмар','лук зеленый','укроп','петрушка','кинза','салат листовой','авокадо','оливки','огурцы соленые','капуста квашеная','томаты консервированные','имбирь','чеснок','шпинат','лимон'):
        # способы приготовления по выходу USDA [Y]/[YF], вытапливанию жира и впитыванию масла (tools/cook.py)
        for i,meth in enumerate(['boil','fry','stew','bake']):
            adj=ADJ[g][i]; syns=[adj+' '+n]+[s+' '+adj for s in syn[:3]]
            if i==0: syns+= [n+' '+VAR[g],VAR[g]+' '+n]
            o,y,oil=cook.cooked100(dict(k=k,p=p,f=f,c=c),cat,n,meth)
            add(n+' '+adj,syns,o['k'],o['p'],o['f'],o['c'],pc,po,cat,'derived',n); DCOOK[n+' '+adj]=dict(b=n,m=meth,y=y,oil=oil)
        if cat=='meat':  # «готовая/готовый» без способа = запечённое/жареное без масла (сухой жар), USDA roasted там, где есть (GEN/COOKED ниже)
            GOT={'m':'готовый','f':'готовая','n':'готовое','p':'готовые'}[g]
            o,y,oil=cook.cooked100(dict(k=k,p=p,f=f,c=c),cat,n,'bake')
            add(n+' '+GOT,['готовая '+n,'готовый '+n,'готовое '+n,'готовые '+n,n+' приготовленная']+[s+' '+GOT for s in syn[:3]]+(['вырезка готовая','готовая вырезка'] if n=='свиная вырезка' else []),o['k'],o['p'],o['f'],o['c'],pc,po,cat,'derived',n); DCOOK[n+' '+GOT]=dict(b=n,m='bake',y=y,oil=oil)
        for suf,meth in ((' на гриле','grill'),(' на пару','steam')):
            o,y,oil=cook.cooked100(dict(k=k,p=p,f=f,c=c),cat,n,meth)
            add(n+suf,[s+suf for s in syn[:2]]+([n+' гриль'] if meth=='grill' else []),o['k'],o['p'],o['f'],o['c'],pc,po,cat,'derived',n); DCOOK[n+suf]=dict(b=n,m=meth,y=y,oil=oil)
        if cat=='fish': add(n+' копченая' if g=='f' else n+(' копченые' if g=='p' else ' копченый'),[],None,p*1.3,f*1.25,c,pc,po,cat,'derived',n)
        if cat=='fish': add(n+(' соленая' if g=='f' else ' соленый'),[],None,p*1.1,f*1.05,0,pc,po,cat,'derived',n)
        if cat=='meat' and n in('говядина','свинина','баранина','курица','индейка','кролик','утка'):
            add(n+' в соусе',[],None,p*1.0,f*1.0+4,3,None,250,cat,'derived',n)
    if cat=='fruit' and n not in('лимон','лайм','кокос','помело'):
        add('сок '+n,['свежевыжатый '+n,'фреш '+n],k*0.95,p*0.5,f*0.2,c*1.0,None,200,'drink','derived',n)
        add('компот из '+n,[],k*0.55+15,0.2,0,(k*0.55+15)/4,None,250,'drink','derived',n)
        add('варенье из '+n,['джем '+n],270,0.4,0.2,67,None,20,'sweet','derived',n)
        if c*4.2<=85 and k<=110: add(n+' сушеный',['сушеный '+n,'сухофрукты '+n],k*4.2,p*4,f*3,c*4.2,None,30,'nut','derived',n)  # сушка ~в 4 раза (USDA dried/raw); для калорийных плодов не строим
        add(n+' замороженный',['замороженная '+n],k,p,f,c,None,100,'fruit','derived',n)
DAIRY=[('молоко',['молочко'],[0.5,1,1.5,2.5,3.2,3.5,4,6],3.0,4.7,250),
 ('кефир',['кефирчик'],[0,1,1.5,2.5,3.2],3.0,4.0,250),('ряженка',[],[1,2.5,4,6],2.9,4.2,250),
 ('йогурт',['йогурт натуральный'],[0,1.5,2,2.5,3.2,5],4.3,6.0,150),('сметана',['сметанка'],[10,15,20,25,30],2.6,3.0,20),
 ('творог',['творожок рассыпчатый'],[0,0.5,1,2,5,9,18],None,None,150),('снежок',[],[2.5],2.7,9.0,250),
 ('бифидок',[],[1,2.5],2.8,4.0,250),('молоко топленое',['топленое молоко'],[4,6],3.0,4.7,250),('молоко козье',['козье молоко'],[4],3.6,4.5,250)]
TV={0:(18,1.8),0.5:(18,1.8),1:(16,1.3),2:(18,3.3),5:(17.2,1.8),9:(16.7,2),18:(14,2.8)}
for nm,syn,fats,p,c,po in DAIRY:
    for fa in fats:
        if nm=='творог': p,c=TV[fa]
        lab=('%g'%fa).replace('.',',')
        names=[f'{nm} {lab}%']; sy=[f'{nm} {"%g"%fa}%',f'{nm} {"%g"%fa} процента',f'{nm} {"%g"%fa} процентов',f'{nm} {"%g"%fa} процентный']
        if fa==0: sy+=[f'обезжиренный {nm}',f'{nm} обезжиренный',f'{nm} обезжиренное',f'обезжиренное {nm}',f'обезжиренная {nm}']
        add(names[0],sy,None,p,fa,c,None,po,'dairy','derived',n)
    # базовое имя без процента = средняя жирность
    mid={'молоко':2.5,'кефир':2.5,'ряженка':4,'йогурт':2.5,'сметана':20,'творог':5,'снежок':2.5,'бифидок':2.5,'молоко топленое':4,'молоко козье':4}[nm]
    if nm=='творог': p,c=TV[5]
    add(nm,syn,None,p,mid,c,None,po,'dairy','base')
EXTRA=[('протеин сывороточный',['протеин порошок','протеин изолят'],370,80,3,6,None,30,'drink'),
 ('гейнер',[],380,20,3,68,None,60,'drink'),('сахарозаменитель',['стевия','подсластитель'],0,0,0,0,1,1,'sweet'),
 ('соль',['соль поваренная'],0,0,0,0,None,2,'fat'),('специи',['перец черный','приправа'],250,10,4,40,None,2,'fat'),
 ('желатин',[],355,87.2,0.4,0.7,None,10,'fat'),('мука пшеничная',['мука'],334,10.3,1.1,70,None,30,'grain'),
 ('крахмал',['крахмал картофельный'],313,0.1,0,78.2,None,10,'grain'),('дрожжи',[],75,12.7,2.7,0,None,10,'grain'),
 ('какао порошок',['какао-порошок'],289,24.3,15,10.2,None,5,'sweet'),('кофе растворимый',['нескафе','растворимый кофе'],2,0.2,0,0.3,None,200,'drink')]
for n,sy,k,p,f,c,pc,po,ct in EXTRA: add(n,sy,k,p,f,c,pc,po,ct)
# ---------- блюда по стандартным рецептурам (tools/dishes.txt) ----------
DISH=[]; miss=set()
for line in open('tools/dishes.txt',encoding='utf8'):
    line=line.strip()
    if not line or line[0] in '#@': continue
    a=line.split(';'); n,syn,cu,meth,comp,outg,ref,srcc=a[0].replace('ё','е'),[x for x in a[1].split('/') if x],a[2],a[3],a[4],a[5],a[6],a[7]
    ing=[]
    for part in re.split(r',(?=[^\d\s])',comp):
        nm,g=part.rsplit(':',1); nm=nm.strip().replace('ё','е'); g=float(g)
        if nm!='вода' and nm not in items: miss.add(nm); continue
        ing.append((nm,g))
    raw=sum(g for _,g in ing); K=P_=F=C=0; cooked=0; liq=any(re.match(r'вода|молоко|бульон|кефир|сливки|кокосовое молоко',nm) for nm,_ in ing)
    for nm,g in ing:
        EV={'soup':.85,'boil':.9,'stew':.6,'bake':.7}
        if nm=='вода': cooked+=g*EV.get(meth,1); continue
        it=items[nm]; gr=cook.group(it['cat'],nm); fr=1.0; y=1.0
        if nm in cook.WATER: y=cook.WATER[nm] if (meth!='soup' and not liq) else 1.0
        elif liq and re.match(r'молоко|кефир|сливки|бульон|кокосовое молоко',nm) and meth in EV: y=EV[meth]
        elif 'фарш' in nm and meth in('fry','bake','stew','grill'): y=.82  # СР: потери при тепловой обработке изделий из котлетной массы ~18%
        elif meth in('fry','bake','grill','stew','steam','boil') and gr in('meat','poultry','fish','veg','egg') and not re.search(r'отварн|вареный|вареная|вареное|соленая|соленые|консерв|копчен|жарен',nm):
            y=cook.YIELD[gr].get(meth,1.0); fr=cook.FATRET.get(meth,1) if gr in('meat','poultry') else 1
        elif meth=='bake' and it['cat'] in('grain','bread'): y=.85
        K+=it['k']*g/100-(it['f']*g/100*(1-fr))*9; P_+=it['p']*g/100; F+=it['f']*g/100*fr; C+=it['c']*g/100; cooked+=g*y
    if outg: cooked=float(outg)
    k100,p100,f100,c100=K/cooked*100,P_/cooked*100,F/cooked*100,C/cooked*100
    rec=dict(n=n,cu=cu,m=meth,ing=ing,raw=raw,cooked=round(cooked),calc=[round(k100),round(p100,1),round(f100,1),round(c100,1)],src=srcc)
    if ref:
        rk,rp,rf_,rc=map(float,ref.split('/')); rec['ref']=[rk,rp,rf_,rc]; v=(rk,rp,rf_,rc); rec['ds']='ru-ref'
    else: v=(k100,p100,f100,c100); rec['ds']='recipe'
    old=items.get(n)
    # аудит v1.12: расчёт по рецептуре без справочного значения расходится со справочным (data_base, calorizator/Скурихин/USDA) >15% — верим справочному
    if not ref and old and old['k'] and abs(k100-old['k'])/old['k']>0.15 and n not in ('макароны','пшенка'):  # эти сверены в tests/ref.test.js
        v=(old['k'],old['p'],old['f'],old['c']); rec['ref']=list(v); rec['ds']='ru-ref'; rec['audit']='calc %d → ref %d'%(round(k100),old['k'])
    rec['old']=[old['k'],old['p'],old['f'],old['c']] if old else None
    if old:
        old.update(k=round(v[0]),p=round(v[1],1),f=round(v[2],1),c=round(v[3],1)); old['s']=list(dict.fromkeys(old['s']+[x.replace('ё','е') for x in syn])); old['cat']=old['cat'] if old['cat'] in('dish','bread','grain','egg') else 'dish'
    else:
        add(n,syn,v[0],v[1],v[2],v[3],None,300 if meth=='soup' else 200 if re.search(r'каш|гречк|рис|пшен|перлов|овсян|манка|булгур|киноа|кускус|макарон|чечевиц|нут|фасол|горох',n) else 250 if meth in('boil','stew') else 200,'dish','base')
    items[n]['ds']=rec['ds']; DISH.append(rec)
if miss: print('НЕТ ИНГРЕДИЕНТОВ:',sorted(miss))
json.dump(DISH,open('tools/dishes_built.json','w'),ensure_ascii=False)
json.dump(DCOOK,open('tools/derived_cook.json','w'),ensure_ascii=False)
base=[items[n] for n in list(order) if items[n]['src']=='base']
for x in base:
    n=x['n'];k,p,f,c=x['k'],x['p'],x['f'],x['c']
    if x['cat']=='grain' and x.get('po')==200: add(n+' с маслом',[n+' со сливочным маслом'],None,p,f+4,c,None,200,'grain','derived',n); add(n+' с овощами',[],None,p*0.8,f+1.5,c*0.8,None,250,'grain','derived',n); add(n+' с сыром',[],None,p+3,f+4,c,None,220,'grain','derived',n)
    if x['cat']=='grain' and x.get('po')==250: add(n+' с сахаром',[n+' сладкая'],None,p,f,c+5,None,250,'grain','derived',n); add(n+' с маслом',[],None,p,f+3,c,None,250,'grain','derived',n); add(n+' с ягодами',[n+' с фруктами'],None,p,f,c+4,None,280,'grain','derived',n); add(n+' с медом',[],None,p,f,c+5,None,260,'grain','derived',n)
    if x['cat'] in('dish','bread') and (re.match(r'(суп|борщ|щи|солянка|уха|рассольник|харчо)',n) or re.match(r'(пельмени|вареники|блины|сырники|оладьи|драники|манты|голубцы|котлета|запеканка)',n)) and 'сметан' not in n:
        add(n+' со сметаной',[n+' с сметаной'],None,p+0.3,f+2,c+0.3,x.get('pc'),x.get('po'),x['cat'],'derived',n)
    if x['cat'] in('dish',) and re.match(r'(пельмени|вареники|манты|хинкали|котлета|отбивная|шашлык|курица|пюре|плов)',n):
        add(n+' с майонезом',[],None,p,f+5,c+0.3,x.get('pc'),x.get('po'),x['cat'],'derived',n); add(n+' с кетчупом',[],None,p,f,c+2,x.get('pc'),x.get('po'),x['cat'],'derived',n)
    if x['cat']=='bread' and x.get('pc') and x['k']<300: add(n+' с маслом',[],None,p,f+12,c,x['pc'],x.get('po'),'bread','derived',n); add(n+' с сыром',[],None,p+6,f+7,c*0.8,x['pc'],x.get('po'),'bread','derived',n)
    if x['cat'] in('drinkcalc','more2') and ('кофе' in n or n in('капучино','латте','раф','какао','чай','флэт уайт')) and 'сахар' not in n:
        add(n+' с сахаром',[],None,p,f,c+5,None,x.get('po'),'drink','derived',n)
        if 'молок' not in n: add(n+' с молоком',[],None,p+0.4,f+0.4,c+0.6,None,x.get('po'),'drink','derived',n)
        add(n+' на растительном молоке',[n+' на овсяном молоке',n+' на миндальном молоке'],None,p*0.5,f,c,None,x.get('po'),'drink','derived',n)
        add(n+' с сиропом',[],None,p,f,c+6,None,x.get('po'),'drink','derived',n)
    if x['cat']=='nut' and x.get('pc')==1: add(n+' жареный' if not n.endswith('и') else n+' жареные',['жареный '+n],None,p,f+2,c,None,30,'nut','derived',n); add(n+' соленый' if not n.endswith('и') else n+' соленые',['соленый '+n],None,p,f,c,None,30,'nut','derived',n)
    if x['cat']=='egg' and n in('омлет','яичница'): add(n+' с помидорами',[],None,p*0.8,f*0.8,c+2,None,200,'egg','derived',n); add(n+' с овощами',[],None,p*0.75,f*0.75,c+2.5,None,200,'egg','derived',n); add(n+' на молоке',[],None,p*0.9,f*0.9,c+1.5,None,170,'egg','derived',n)
for n,r in RU.items():  # российские справочные значения — приоритет (в т.ч. над производными по жирности)
    if n in items: items[n].update(k=round(r['k']),p=r['p'],f=r['f'],c=r['c']); items[n]['ds']='ru-ref'
    else: add(n,r['s'],r['k'],r['p'],r['f'],r['c'],None,{'bread':30,'meat':50,'dairy':10}.get(r['cat'],100),r['cat'] or 'more','base'); items[n]['ds']='ru-ref'
    items[n]['rs']=r['src']
# Обобщённое «свинина/говядина/баранина/курица» без способа = готовое мясо среднего отруба (люди взвешивают готовое).
# Сырое значение остаётся ингредиентом рецептур (посчитано выше) и доступно как «… сырая». USDA SR Legacy:
GEN={'свинина':(201,27.5,9.2,'f','USDA SR 167855 pork composite (leg, loin, shoulder) lean, cooked',['свиная вырезка','свиная шея','свиная корейка']),
 'говядина':(230,28.4,12.4,'f','USDA SR 170609 beef composite lean+fat 0" trim, cooked',['говяжья вырезка','говядина жареная']),
 'баранина':(206,28.2,9.5,'f','USDA SR 174308 lamb composite lean, cooked',['баранина жареная']),
 'курица':(219,24.7,12.6,'f','USDA SR 171051 chicken meat+skin, stewed',['куриная грудка отварная','курица жареная'])}
for n in [x for x in items if x.startswith('трайфл')]: items[n]['po']=150; items[n]['pc']=150  # кафе/магазин: стаканчик ~150 г
# пицца: вес целой по диаметру (pz {см: г}); Den's Pizza — с сайта dens-pizza.ru (2026-10-19), прочие — 520 г на 30 см (Den's «Пепперони»), масштаб по площади в parser.js
PZ={"пицца пепперони (Den's Pizza)": {22: 310, 30: 520, 38: 850}, "пицца маргарита (Den's Pizza)": {22: 350, 30: 560, 38: 780}, "пицца с ветчиной и сыром (Den's Pizza)": {22: 320, 30: 550, 38: 940}, "пицца сырная (Den's Pizza)": {22: 330, 30: 450, 38: 920}, "пицца двойная пепперони (Den's Pizza)": {22: 340, 30: 550, 38: 800}, "пицца четыре сыра (Den's Pizza)": {22: 330, 30: 560, 38: 900}, "пицца мясная (Den's Pizza)": {22: 400, 30: 630, 38: 1000}, "пицца с ананасами и копченой курочкой (Den's Pizza)": {22: 350, 30: 590, 38: 1000}, "пицца бургер (Den's Pizza)": {22: 390, 30: 700, 38: 1150}, "пицца овощная (Den's Pizza)": {22: 370, 30: 600, 38: 960}, "пицца трюфельная пепперони (Den's Pizza)": {22: 300, 30: 510}}
for n,z in PZ.items():
    if n in items: items[n]['pz']=z; items[n]['rs']='dens-pizza.ru'
for n in items:
    if n.startswith('пицца') and items[n]['cat'] in ('dish','more','f','') or n in('пицца','пицца маргарита','пицца пепперони'): items[n]['po']=130
# реалистичные штучные/порционные веса (аудит v1.11.3): pc — 1 шт, po — порция по умолчанию
PORT={'роллы филадельфия':(30,240,1),'суши':(30,200,1),'беляш':(110,110,0),'наггетсы':(18,110,1)}
for n,(pc_,po_,pl_) in PORT.items():
    if n in items: items[n]['pc']=pc_; items[n]['po']=po_; items[n]['pl']=pl_
if 'пирожок с картошкой' in items: items['пирожок с картошкой']['s']=list(dict.fromkeys(items['пирожок с картошкой']['s']+['пирожок','пирожки']))
COOKED={'свиная вырезка готовая':(143,26.17,3.51,'USDA SR 168250 pork tenderloin lean, cooked, roasted')}
for n,(k,p_,f_,g,src,amb) in GEN.items(): COOKED[n+' готов'+('ая' if g=='f' else 'ый')]=(k,p_,f_,src)
for n,(k,p_,f_,src) in COOKED.items():
    if n in items: items[n].update(k=k,p=p_,f=f_,c=0); items[n]['ds']='usda'; items[n]['rs']=src
for n,(k,p_,f_,g,src,amb) in GEN.items():
    if n not in items: continue
    x=items[n]; rn=n+(' сырая' if g=='f' else ' сырой')
    if rn not in items:
        add(rn,['сырая '+n,n+' сырое мясо'],x['k'],x['p'],x['f'],x['c'],x.get('pc'),x.get('po'),x['cat'],'derived',n); items[rn]['ds']=x.get('ds')
    x.update(k=k,p=p_,f=f_,c=0); x['ds']='usda'; x['rs']=src; x['amb']=[a for a in amb if a in items]
OFFRU=json.load(open('tools/off_ru.json',encoding='utf8'))
for x in OFFRU:  # популярные российские упакованные продукты (Open Food Facts, страна: Россия; данные с упаковки)
    if x['n'] in items: continue
    add(x['n'],[],x['k'],x['p'],x['f'],x['c'],None,100,x['cat'],'offru'); items[x['n']]['ds']='off-ru'; items[x['n']]['code']=x['code']
out=[items[n] for n in order]
for x in out:
    for kk in('pc','po'):
        if x.get(kk) is None: x.pop(kk,None)
        else: x[kk]=round(x[kk])
    if not x['s']: del x['s']
    if not x.get('pl'): x.pop('pl',None)
    if 'rf' in x: x['rf']=round(x['rf'])
js='// Встроенная база КБЖУ на 100 г. Источники: таблицы хим. состава (Скурихин), USDA FoodData Central (public domain), типовые рецептуры блюд. Сгенерировано tools/build_db.py\nself.FOODS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('db.js','w',encoding='utf8').write(js)
json.dump(DER,open('tools/derived.json','w'),ensure_ascii=False)
print(len(out),'items',sum(1 for x in out if x['src']=='base'),'base', len(js)//1024,'KB')
