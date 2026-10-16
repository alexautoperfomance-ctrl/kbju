# Сборка встроенной базы: значения на 100 г (Скурихин/таблицы хим. состава + USDA FDC, вручную), плюс
# производные варианты (способы приготовления по коэффициентам потерь воды/жира, жирность молочки).
import json,re
items={}; order=[]
def add(name,syn,k,p,f,c,pc=None,por=None,cat='',src='base',base=None):
    name=name.replace('ё','е').strip()
    if src=='derived' and base and base in items and name.startswith(base+' '):
        suf=name[len(base):]; syn=list(syn)+[x+suf for x in items[base]['s'][:4]]
    if name in items: return
    if k is None: k=round(4*p+9*f+4*c)
    items[name]=dict(n=name,s=[x.replace('ё','е').strip() for x in syn if x.strip()],k=round(k),p=round(p,1),f=round(f,1),c=round(c,1),pc=pc,po=por,cat=cat,src=src); order.append(name)
ADJ={'m':['отварной','жареный','тушеный','запеченный'],'f':['отварная','жареная','тушеная','запеченная'],
     'n':['отварное','жареное','тушеное','запеченное'],'p':['отварные','жареные','тушеные','запеченные']}
VAR={'m':'вареный','f':'вареная','n':'вареное','p':'вареные'}
COOK=[(1.3,0,0),(1.25,6,0),(1.2,3,0),(1.3,2,0)]  # множитель (потеря воды), +жир, +углеводы
VEGC=[(1.0,0,0),(1.0,3,0.5),(1.0,7,1),(1.15,1.5,0)]
cat='';rows=[]
for line in open('tools/data_base.txt',encoding='utf8'):
    line=line.strip()
    if not line or line.startswith('#'): continue
    if line.startswith('@'): cat=line[1:]; continue
    a=line.split(';'); n,syn=a[0],a[1].split('/') if a[1] else []
    k,p,f,c=map(float,a[2:6]); pc=float(a[6]) if a[6] else None; po=float(a[7]) if a[7] else None; g=a[8]
    add(n,syn,k,p,f,c,pc,po,cat); items[n.replace('ё','е')]['pl']=1 if g=='p' else 0; rows.append((n,syn,k,p,f,c,pc,po,g,cat))
for (n,syn,k,p,f,c,pc,po,g,cat) in rows:
    if cat in('meat','fish','veg') and n not in('свиное сало','бекон','креветки','мидии','кальмар','лук зеленый','укроп','петрушка','кинза','салат листовой','авокадо','оливки','огурцы соленые','капуста квашеная','томаты консервированные','имбирь','чеснок','шпинат','лимон'):
        tab=COOK if cat!='veg' else VEGC
        for i,(m,df,dc) in enumerate(tab):
            adj=ADJ[g][i]; syns=[adj+' '+n]+[s+' '+adj for s in syn[:3]]
            if i==0: syns+= [n+' '+VAR[g],VAR[g]+' '+n]
            add(n+' '+adj,syns,None,p*m,f*m+df,c*m+dc,pc,po,cat,'derived',n)
        g2={'m':'на гриле','f':'на гриле','n':'на гриле','p':'на гриле'}
        add(n+' на гриле',[s+' на гриле' for s in syn[:2]]+[n+' гриль'],None,p*1.3,f*1.3,c*1.3,pc,po,cat,'derived',n)
        add(n+' на пару',[s+' на пару' for s in syn[:2]],None,p*1.2,f*1.2,c*1.2,pc,po,cat,'derived',n)
        if cat=='fish': add(n+' копченая' if g=='f' else n+(' копченые' if g=='p' else ' копченый'),[],None,p*1.3,f*1.25,c,pc,po,cat,'derived',n)
        if cat=='fish': add(n+(' соленая' if g=='f' else ' соленый'),[],None,p*1.1,f*1.05,0,pc,po,cat,'derived',n)
        if cat=='meat' and n in('говядина','свинина','баранина','курица','индейка','кролик','утка'):
            add(n+' в соусе',[],None,p*1.0,f*1.0+4,3,None,250,cat,'derived',n)
    if cat=='fruit' and n not in('лимон','лайм','кокос','помело'):
        add('сок '+n,['свежевыжатый '+n,'фреш '+n],k*0.95,p*0.5,f*0.2,c*1.0,None,200,'drink','derived',n)
        add('компот из '+n,[],k*0.55+15,0.2,0,(k*0.55+15)/4,None,250,'drink','derived',n)
        add('варенье из '+n,['джем '+n],270,0.4,0.2,67,None,20,'sweet','derived',n)
        add(n+' сушеный',['сушеный '+n,'сухофрукты '+n],k*4.2,p*4,f*3,c*4.2,None,30,'nut','derived',n)
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
out=[items[n] for n in order]
for x in out:
    for kk in('pc','po'):
        if x.get(kk) is None: x.pop(kk,None)
        else: x[kk]=round(x[kk])
    if not x['s']: del x['s']
    if not x.get('pl'): x.pop('pl',None)
js='// Встроенная база КБЖУ на 100 г. Источники: таблицы хим. состава (Скурихин), USDA FoodData Central (public domain), типовые рецептуры блюд. Сгенерировано tools/build_db.py\nself.FOODS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('db.js','w',encoding='utf8').write(js)
print(len(out),'items',sum(1 for x in out if x['src']=='base'),'base', len(js)//1024,'KB')
