# Аудит базы: старые (v1.7.1) vs новые значения, USDA SR Legacy, Атуотер, OFF Россия (медиана), причины изменений → audit.csv
import json,re,csv,statistics,subprocess
def load(p):
    s=open(p,encoding='utf8').read(); i=s.index('self.FOODS='); j=s.index('[',i); return json.loads(s[j:s.rindex(']')+1])
old={f['n']:f for f in load('/tmp/db_old.js')}; new=load('db.js')
M=open('micro.js',encoding='utf8').read(); MSRC=json.loads(re.search(r'self.MSRC=(\{.*?\});',M).group(1))
ids=json.load(open('tools/usda_ids.json')); 
for x in json.load(open('tools/extra_resolved.json',encoding='utf8')):
    if 'id' in x: ids[x['n']]=x['id']
need=set(map(str,ids.values())); UK={}
for r in csv.DictReader(open('/workspace/usda/FoodData_Central_sr_legacy_food_csv_2018-04/food_nutrient.csv')):
    if r['fdc_id'] in need and r['nutrient_id'] in('1008','1003','1004','1005'): UK.setdefault(r['fdc_id'],{})[r['nutrient_id']]=float(r['amount'])
DISH={d['n']:d for d in json.load(open('tools/dishes_built.json',encoding='utf8'))}
RU={}
for l in open('tools/ru_ref.txt',encoding='utf8'):
    if l.strip() and l[0]!='#': a=l.rstrip('\n').split(';'); RU[a[0]]=a[7]
DC=json.load(open('tools/derived_cook.json',encoding='utf8'))
OFF=json.load(open('/workspace/off/ru_good.json',encoding='utf8'))
def offmed(n):
    w=n.split(' ')[0].lower()
    if len(w)<4: return ''
    ks=[g['k'] for g in OFF if g['n'].lower().startswith(w)]
    return round(statistics.median(ks)) if len(ks)>=3 else ''
rows=[]; ch=0; big=[]
for f in new:
    if f['src']=='offru': continue
    n=f['n']; o=old.get(n); at=round(4*f['p']+9*f['f']+4*f['c']); flags=[]
    uid=ids.get(n); u=UK.get(str(uid),{}) if uid else {}
    uk=round(u['1008']) if '1008' in u else ''
    alc=re.search(r'водка|коньяк|ром$|вино|шампанск|коктейль алк|сидр|ликер|пиво|по-ирландски|виски|джин|текила|мартини|настойк|глинтвейн|саке',n)
    if f['k']>20 and abs(f['k']-at)/max(f['k'],at)>.12 and not alc: flags.append('атуотер>12%')
    cooked=uk!='' and uk>250 and f['k']<180  # USDA-id сухого продукта используется только для микро (масштаб по ккал)
    if uk!='' and f['k']>20 and abs(f['k']-uk)/max(f['k'],uk)>.2 and not cooked and f['src']!='derived': flags.append('≠USDA>20%')
    if f.get('cat')=='grain' and not re.search(r'сух|хлоп|мука|мюсли|отруб|крахмал|дрожж|чипс|сырой|попкорн',n) and f['k']>200: flags.append('крупа: проверь сух/вар')
    if f['p']+f['f']+f['c']>101 or f['k']>902: flags.append('выброс')
    reason=''
    if alc and not reason: pass
    if n in RU: reason='российский справочник: '+RU[n]
    elif n in DISH: d=DISH[n]; reason=('рецептура ('+d['src']+'), расчёт '+str(d['calc'][0])+' ккал; принято справочное' if d.get('ref') else 'пересчёт по рецептуре ('+d['src']+'), выход '+str(d['cooked'])+' г из '+str(round(d['raw']))+' г')
    elif n in DC: reason=f"коэф. приготовления USDA: выход {DC[n]['y']}, масло +{DC[n]['oil']} г"
    elif not o: reason='новый продукт (USDA SR Legacy)' if uid else 'новый'
    if not reason and alc: reason='алкоголь 7 ккал/г — Атуотер по БЖУ неприменим'
    if not reason and '≠USDA>20%' in flags: reason='оставлено: значение из исходной базы (Скурихин/маркировка); USDA — другой образец/категория'
    if not reason and 'атуотер>12%' in flags: reason='клетчатка/органические кислоты: общие коэффициенты Атуотера дают погрешность; значение USDA'
    if o:
        dk=f['k']-o['k']; changed=any(abs(f[x]-o[x])>(1 if x=='k' else .25) for x in ('k','p','f','c'))
        if changed: ch+=1; big.append((abs(dk)/max(1,o['k']),n,o['k'],f['k'],reason))
    else: changed=False
    if not (changed or flags or not o or n in RU or n in DISH): continue
    rows.append([n,f.get('cat',''),f['src'],MSRC.get(n,''),*(o and [o['k'],o['p'],o['f'],o['c']] or ['','','','']),f['k'],f['p'],f['f'],f['c'],uk,offmed(n),at,' '.join(flags),'изменено' if changed else ('новый' if not o else 'проверено'),reason])
with open('audit.csv','w',newline='',encoding='utf-8-sig') as fh:
    w=csv.writer(fh,delimiter=';'); w.writerow(['продукт','категория','тип','микро-источник','старые ккал','старые Б','старые Ж','старые У','новые ккал','новые Б','новые Ж','новые У','USDA ккал','OFF Россия медиана ккал','Атуотер 4Б+9Ж+4У','флаги','статус','причина'])
    w.writerows(rows)
big.sort(reverse=True)
print('строк',len(rows),'изменено',ch,'новых',sum(1 for r in rows if r[-2]=='новый'),'флагов',sum(1 for r in rows if r[-3]))
for b in big[:25]: print(f"{b[1]}: {b[2]}→{b[3]} ({round(b[0]*100)}%) — {b[4]}")
from collections import Counter; print(Counter(fl for r in rows for fl in r[-3].split(' ') if fl))
