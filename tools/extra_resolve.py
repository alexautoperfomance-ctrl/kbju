import csv,re,json
D='/workspace/usda/FoodData_Central_sr_legacy_food_csv_2018-04/'
foods={r['fdc_id']:r['description'] for r in csv.DictReader(open(D+'food.csv'))}
tok=lambda s:set(re.findall(r"[a-z0-9%'\"/.\-&]+",s.lower().replace(',',' ').replace('(',' ').replace(')',' ')))
FT={k:tok(v) for k,v in foods.items()}
BAD=re.compile(r'added solution|enhanced|imported|school lunch|with salt|lifeway',re.I)
def find(q):
    if q.startswith('#'): return q[1:]
    qt=tok(q); c=[k for k,t in FT.items() if qt<=t]
    return min(c,key=lambda k:(bool(BAD.search(foods[k])),len(FT[k]-qt),len(foods[k]))) if c else None
rows=[];miss=[];need=set()
for l in open('tools/extra.txt',encoding='utf8'):
    l=l.strip()
    if not l or l[0] in '#@': continue
    a=l.split(';'); r=dict(n=a[0],s=a[1],q=a[2],cat=a[3],g=a[4],pc=a[5],rf=a[6],po=a[7])
    if not r['q'].startswith('~'):
        r['id']=find(r['q'])
        if not r['id']: miss.append(r['n']); continue
        need.add(r['id'])
    rows.append(r)
N={}
for x in csv.DictReader(open(D+'food_nutrient.csv')):
    if x['fdc_id'] in need and x['nutrient_id'] in('1008','1003','1004','1005'): N.setdefault(x['fdc_id'],{})[x['nutrient_id']]=float(x['amount'] or 0)
P={}
for x in csv.DictReader(open(D+'food_portion.csv')):
    if x['fdc_id'] in need and re.search(r'without refuse|^fruit|medium|^whole|^nut|^kernel|^large',x['modifier']): P.setdefault(x['fdc_id'],[]).append((x['modifier'],float(x['gram_weight'])/max(1,float(x['amount'] or 1))))
for r in rows:
    if 'id' in r:
        n=N.get(r['id'],{}); r['k'],r['p'],r['f'],r['c']=n.get('1008',0),n.get('1003',0),n.get('1004',0),n.get('1005',0); r['desc']=foods[r['id']]
        if not r['pc'] and r['cat']=='fruit' and r['id'] in P: r['pc']=str(round(P[r['id']][0][1]))
    else:
        v,an=r['q'][1:].split('@'); r['k'],r['p'],r['f'],r['c']=map(float,v.split(',')); r['analog']=an
json.dump(rows,open('tools/extra_resolved.json','w'),ensure_ascii=False,indent=0)
print(len(rows),'resolved; miss:',miss)
