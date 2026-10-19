# v1.17.0: обобщённые блюда из медиан сетей/магазинов (/tmp/kc — снимок kbju_chains).
# Блюдо попадает в базу, только если ≥2 независимых заведения (разные сети/магазины) дают согласованные значения
# (ккал/100 г в пределах ±25% от медианы), и КБЖУ сходятся по Этуотеру (±20%). Ничего не придумываем: значения = медианы.
# Порция по умолчанию = медиана порций сетей (вес одной позиции меню); у магазинов вес упаковки берём, только если сетевых нет.
import json,glob,re,collections,statistics as st,sys
SRC=sys.argv[1] if len(sys.argv)>1 else '/tmp/kc'
FW=set(json.load(open('/tmp/foodwords.json')))
DISHW=set('''салат суп борщ щи солянка уха рассольник харчо том ям лагман окрошка крем-суп бульон пицца ролл роллы суши сашими гункан поке боул бургер чизбургер гамбургер шаурма шаверма донер буррито тако кесадилья
сэндвич сендвич бутерброд панини тост клаб хот-дог хотдог блин блины блинчик блинчики оладьи сырники сырник омлет яичница скрэмбл каша гречка плов паста спагетти лазанья ризотто карбонара болоньезе
пельмени вареники манты хинкали голубцы котлета котлеты биточки тефтели фрикадельки зразы шницель отбивная стейк шашлык люля-кебаб кебаб гуляш бефстроганов жаркое рагу азу чахохбили сациви
наггетсы стрипсы крылья крылышки картофель пюре фри драники запеканка пирог пирожок пирожки беляш чебурек хачапури самса кулебяка ватрушка круассан слойка пончик эклер торт пирожное чизкейк тирамису
медовик наполеон маффин кекс брауни штрудель трайфл десерт мороженое пудинг панна-котта вок удон рамен фо собa лапша гедза димсамы спринг-ролл тартар карпаччо жульен фалафель хумус шакшука
сырок творожник смузи коктейль милкшейк морс компот лимонад кофе капучино латте раф какао чай'''.split())
STOP=re.compile(r'\b(набор|сет|комбо|ланч|бизнес|меню|упак|короб|бокс|пакет|соус|кетчуп|майонез|горчиц|добавк|топпинг|сироп|допол|приборы|салфет|напиток|вода|кола|пепси|спрайт|фанта|сок|пиво|вино|чай|кофе|капучино|латте|раф|какао|американо|эспрессо|морс|лимонад|компот|коктейль|смузи|милкшейк|айс|фраппе|детск|подар|сертифик|акци)\w*')
def nrm(s):
    s=s.lower().replace('ё','е').replace('запеченый','запеченный').replace('копчённ','копчен'); s=re.sub(r'\(.*?\)|«.*?»|".*?"','',s)
    s=re.sub(r'\d+([.,]\d+)?\s*(г|гр|мл|л|кг|см|шт|%)\b','',s); s=re.sub(r'[^а-я -]',' ',s); s=re.sub(r'(^| )-+|-+( |$)',' ',s)
    s=re.sub(r'\b(от шефа|фирменн\w*|классическ\w*|домашн\w*|хит|новинка|большой|большая|большое|малый|маленьк\w*|средн\w*|порция|мини|вкусвилл|новый|новая|авторск\w*|по-?домашнему|традиционн\w*|оригинальн\w*|премиум|выгодн\w*|любим\w*|фермерск\w*)\b','',s)
    return re.sub(r'\s+',' ',s).strip()
def dishlike(k):
    w=k.split()
    if not 1<=len(w)<=5 or STOP.search(k): return False
    if not any(x in DISHW for x in w): return False
    if len([x for x in w if not re.match(r'(отварн|вар[её]н|жарен|туш[её]н|запеч[её]нн|рассыпчат|гриль|пар\w*|на|с|зелень\w*|укроп\w*|маслом|сливочн\w*)',x)])<=1 and not re.search(r'пицц|ролл|суши|бургер|шаурм|пельмен|вареник|хинкали|манты|плов|котлет|блин|омлет|сырник|салат|суп|паст',k): return False  # «гречка отварная» = продукт + способ (производные в базе)
    if re.search(r' (с|со|и) ',k) and re.search(r'гречк|рис\b|рисом|пюре|картоф|овощ|макарон|спагетти|булгур|кускус|фри\b|киноа|гарнир',k) and re.search(r'котлет|куриц|куриц|говядин|свинин|рыб|шницел|тефтел|биточ|стейк|грудк|филе|печен|гуляш|бефстроганов|сосиск|индейк|лосос|семг|треск|минта',k): return False  # «котлета с гречкой» — это два блюда, парсер делит
    return sum(1 for x in w if x in FW or x in DISHW or x in('с','и','в','на','по','из','со','под','без'))>=len(w)-(1 if len(w)>=2 else 0)  # все слова — пищевые/служебные (без брендов и названий-выдумок)
R=collections.defaultdict(list)  # key -> [(venue, k,p,f,c, portion_g or None, kind)]
for f in glob.glob(SRC+'/chains/*.json'):
    d=json.load(open(f)); slug=d['chain']['slug']
    for it in d['items']:
        if re.search(r'\d(?!\s*([.,]\d+)?\s*(г|гр|мл|л|кг|см|шт|%))|\b(два|две|три|четыре|пять|шесть|двух|трех|трёх|четырех|четырёх|пяти|одн\w+)\b',it['name'].lower()): continue  # «из 3 яиц», «4 сыра» — после очистки имя искажается
        k=nrm(it['name'])
        if not dishlike(k): continue
        v=(it.get('variants') or [{}])[0]; p=v.get('per100') or {}
        if v.get('quality_flag') or None in (p.get('kcal'),p.get('p'),p.get('f'),p.get('c')): continue
        R[k].append((slug,p['kcal'],p['p'],p['f'],p['c'],v.get('weight_g'),'c'))
READY=re.compile(r'готов|кулинар|салат|суп|выпечк|десерт|пирог|блюд|закуск|гарнир|завтрак|обед|пицц|ролл|суши|сэндвич|шаурм|пельмен|вареник|котлет|кафе|кухня')
for f in glob.glob(SRC+'/products/*-[0-9][0-9][0-9].json'):
    d=json.load(open(f)); stv='S:'+d['store'].split('-')[0]
    for it in d['items']:
        if not READY.search((it.get('category') or '').lower()): continue
        if re.search(r'\d(?!\s*([.,]\d+)?\s*(г|гр|мл|л|кг|см|шт|%))|\b(два|две|три|четыре|пять|шесть|двух|трех|трёх|четырех|четырёх|пяти|одн\w+)\b',it['name'].lower()): continue
        k=nrm(it['name']); p=it.get('per100') or {}
        if not dishlike(k) or it.get('quality_flag') or None in (p.get('kcal'),p.get('p'),p.get('f'),p.get('c')): continue
        R[k].append((stv,p['kcal'],p['p'],p['f'],p['c'],it.get('weight_g'),'s'))
# варианты порядка слов («салат греческий» = «греческий салат») — одно блюдо; имя — самое частое написание
G=collections.defaultdict(list); NM=collections.defaultdict(collections.Counter)
for k,rows in R.items():
    g=' '.join(sorted(w[:6] for w in k.split() if w not in('с','со'))); G[g]+=rows; NM[g][k]+=len({r[0] for r in rows})  # «чизкейк клубника» = «чизкейк с клубникой»
R={NM[g].most_common(1)[0][0]:rows for g,rows in G.items()}
out=[]; rej=collections.Counter()
for k,rows in R.items():
    by={}
    for r in rows: by.setdefault(r[0],[]).append(r)
    ven=[]  # одно значение на заведение (медиана его позиций)
    for v,rs in by.items():
        ven.append((v,st.median(r[1] for r in rs),st.median(r[2] for r in rs),st.median(r[3] for r in rs),st.median(r[4] for r in rs),[r[5] for r in rs if r[5]],rs[0][6]))
    if len(ven)<2: rej['1 venue']+=1; continue
    mk=st.median(v[1] for v in ven)
    if mk<=0: continue
    ok=[v for v in ven if abs(v[1]-mk)/mk<=0.25]
    if len(ok)<2: rej['disagree']+=1; continue
    if len({(round(v[1]),round(v[2]),round(v[3]),round(v[4])) for v in ok})<2: rej['same values (one source copied)']+=1; continue
    K,P,F,C=(round(st.median(v[i] for v in ok),1) for i in (1,2,3,4))
    if K<15 or abs(4*P+9*F+4*C-K)/K>0.2: rej['atwater']+=1; continue
    cw=[w for v in ok if v[6]=='c' for w in v[5] if 30<=w<=800]; sw=[w for v in ok if v[6]=='s' for w in v[5] if 50<=w<=600]
    po=round(st.median(cw)) if cw else round(st.median(sw)) if sw else None
    out.append(dict(n=k,k=round(K),p=P,f=F,c=C,po=po,pos='chain' if cw else 'store' if sw else None,v=len(ok),vs=sorted(v[0] for v in ok)))
out.sort(key=lambda x:(-x['v'],x['n']))
json.dump(out,open('tools/dishes_chain.json','w'),ensure_ascii=False,indent=0)
print(len(R),'keys →',len(out),'dishes',dict(rej))
